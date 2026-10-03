create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  image_url text not null,
  price_cents integer not null check (price_cents > 0 and price_cents <= 100000000),
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_number text not null unique default (
    'SN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  customer_name text not null,
  customer_email text not null,
  shipping_address text not null,
  total_cents integer not null check (total_cents > 0),
  status text not null default 'placed' check (status in ('placed', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_cents integer not null check (line_total_cents > 0),
  created_at timestamptz not null default now()
);

create index products_category_active_idx on public.products (category, active);
create index cart_items_cart_id_idx on public.cart_items (cart_id);
create index cart_items_product_id_idx on public.cart_items (product_id);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  insert into public.carts (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Profiles are readable by their owner" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles are editable by their owner" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Active products are public" on public.products
for select to anon, authenticated using (active = true);

create policy "Carts are private to their owner" on public.carts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Cart items are private to their owner" on public.cart_items
for select to authenticated using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
);
create policy "Cart owners can add items" on public.cart_items
for insert to authenticated with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
);
create policy "Cart owners can update items" on public.cart_items
for update to authenticated using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
);
create policy "Cart owners can delete items" on public.cart_items
for delete to authenticated using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
);

create policy "Orders are private to their owner" on public.orders
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Order items are private to their owner" on public.order_items
for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
);

create or replace function public.add_cart_item(
  p_cart_id uuid,
  p_product_id uuid,
  p_quantity integer
)
returns void
language plpgsql
set search_path = public
as $$
declare
  current_quantity integer;
begin
  if p_quantity < 1 or p_quantity > 99 then
    raise exception 'INVALID_QUANTITY' using errcode = '22023';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and active) then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select quantity into current_quantity
  from public.cart_items
  where cart_id = p_cart_id and product_id = p_product_id
  for update;

  if current_quantity is null then
    insert into public.cart_items (cart_id, product_id, quantity)
    values (p_cart_id, p_product_id, p_quantity)
    on conflict (cart_id, product_id)
    do update set quantity = least(99, public.cart_items.quantity + excluded.quantity);
  else
    update public.cart_items
    set quantity = least(99, current_quantity + p_quantity)
    where cart_id = p_cart_id and product_id = p_product_id;
  end if;
end;
$$;

create or replace function public.create_order_from_cart(
  p_user_id uuid,
  p_customer_name text,
  p_shipping_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_cart_id uuid;
  order_id uuid;
  customer_email text;
  order_total bigint;
begin
  if length(trim(p_customer_name)) not between 1 and 120
     or length(trim(p_shipping_address)) not between 5 and 500 then
    raise exception 'INVALID_CHECKOUT_DETAILS' using errcode = '22023';
  end if;

  select id into target_cart_id from public.carts
  where user_id = p_user_id for update;
  if target_cart_id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.cart_items where cart_id = target_cart_id) then
    raise exception 'CART_EMPTY' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = target_cart_id and not p.active
  ) then
    raise exception 'PRODUCTS_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select sum(p.price_cents::bigint * ci.quantity)
  into order_total
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = target_cart_id and p.active;
  if order_total is null or order_total < 1 or order_total > 2147483647 then
    raise exception 'ORDER_TOTAL_OUT_OF_RANGE' using errcode = '22003';
  end if;

  select email into customer_email from public.profiles where id = p_user_id;
  if customer_email is null or customer_email = '' then
    raise exception 'CUSTOMER_EMAIL_MISSING' using errcode = 'P0001';
  end if;

  insert into public.orders (
    user_id, customer_name, customer_email, shipping_address, total_cents
  )
  values (
    p_user_id, trim(p_customer_name), customer_email, trim(p_shipping_address), order_total::integer
  )
  returning id into order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents
  )
  select order_id, p.id, p.name, p.price_cents, ci.quantity, p.price_cents * ci.quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = target_cart_id;

  delete from public.cart_items where cart_id = target_cart_id;
  return order_id;
end;
$$;

revoke all on function public.add_cart_item(uuid, uuid, integer) from public, anon;
grant execute on function public.add_cart_item(uuid, uuid, integer) to authenticated;
revoke all on function public.create_order_from_cart(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_order_from_cart(uuid, text, text) to service_role;

grant select on public.products to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.carts, public.cart_items, public.orders, public.order_items to authenticated;
grant insert, update, delete on public.cart_items to authenticated;
