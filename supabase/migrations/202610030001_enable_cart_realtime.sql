do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cart_items'
  ) then
    if not exists (
      select 1
      from pg_publication
      where pubname = 'supabase_realtime'
    ) then
      raise exception 'Supabase Realtime publication is missing';
    end if;

    alter publication supabase_realtime add table public.cart_items;
  end if;
end
$$;
