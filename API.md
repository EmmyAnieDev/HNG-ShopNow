# ShopNow REST API

Base URL: `https://<your-domain>/api` (local: `http://localhost:3000/api`).
All endpoints return JSON. Product prices and monetary totals are decimal USD values.

## Response and authentication conventions

Successful responses use `{ "data": <value>, "error": null }`. Errors use
`{ "data": null, "error": { "code": "…", "message": "…" } }`.
Private endpoints require a Supabase Auth access token:

```http
Authorization: Bearer <supabase_access_token>
```

The token is obtained from Supabase Auth sign-in (email/password or Google).
The API verifies it with Supabase Auth; user and ownership IDs are never accepted
from request bodies. Products are public. Carts, checkout, and orders are private.

## Products

### `GET /api/products`

Public. Optional query parameters: `page` (default `1`), `pageSize` (default `12`,
maximum `50`), `category`, and `search` (product-name substring).

```http
GET /api/products?page=1&pageSize=12&category=Home
```

```json
{
  "data": {
    "items": [{
      "id": "00000000-0000-4000-8000-000000000001",
      "name": "Everyday Ceramic Mug",
      "slug": "everyday-ceramic-mug",
      "description": "A thoughtfully weighted stoneware mug.",
      "imageUrl": "https://images.unsplash.com/…",
      "price": { "amount": 24, "currency": "USD" },
      "category": "Home"
    }],
    "page": 1,
    "pageSize": 12,
    "total": 1
  },
  "error": null
}
```

### `GET /api/products/:id`

Public. `:id` must be a product UUID.

```http
GET /api/products/00000000-0000-4000-8000-000000000001
```

Returns the product object shown above. Missing/inactive product: `404 NOT_FOUND`.

## Cart

All cart endpoints require authentication. Cart responses contain:
`items` (each has `id`, `quantity`, `product`, and `lineTotal`), `subtotal`,
`totalQuantity`, and `currency`. A removed/inactive catalog product is represented
with `product: null` and `lineTotal: null` so the client can remove it.

### `GET /api/cart`

Returns the caller's cart. An empty cart returns an empty `items` array and zero
totals. Missing/invalid token: `401 UNAUTHORIZED`.

### `POST /api/cart/items`

Adds quantity to the product's existing cart quantity.

```http
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "productId": "00000000-0000-4000-8000-000000000001", "quantity": 1 }
```

`quantity` is an integer from 1 to 99. Returns the updated cart with `201`.
Invalid body: `400 INVALID_REQUEST`; unknown/inactive product: `404 NOT_FOUND`.

### `PATCH /api/cart/items/:id`

Replaces the quantity for an item belonging to the caller's cart.

```json
{ "quantity": 2 }
```

Returns the updated cart with `200`. Quantity must be an integer from 1 to 99.
Unknown or another user's item: `404 NOT_FOUND`.

### `DELETE /api/cart/items/:id`

Deletes an item belonging to the caller's cart and returns the updated cart with
`200`. Unknown or another user's item: `404 NOT_FOUND`.

### Cross-client cart updates

Web and mobile clients can subscribe to Supabase Realtime Postgres Changes on
`public.cart_items` using the same authenticated Supabase session. The
`cart_items` table must be included in the `supabase_realtime` publication; apply
`supabase/migrations/202610030001_enable_cart_realtime.sql` to enable it.
Keep the existing owner-scoped select RLS policy enabled.

Treat a Realtime event only as a signal to refetch `GET /api/cart`. The REST API
remains the cart source of truth; clients should not reconstruct cart state from
Realtime row payloads.

## Orders

All order endpoints require authentication. Orders include a historical item
snapshot (`productName`, `unitPrice`, `quantity`, and `lineTotal`); historical
prices do not depend on the current catalog.

### `GET /api/orders`

Returns the caller's orders, newest first:

```http
GET /api/orders
Authorization: Bearer <token>
```

### `GET /api/orders/:id`

Returns one order owned by the caller. Another user's or unknown order returns
`404 NOT_FOUND`.

```http
GET /api/orders/00000000-0000-4000-8000-000000000002
Authorization: Bearer <token>
```

## Checkout

### `POST /api/checkout`

Requires authentication. The server reads current product prices and quantities
from the caller's Supabase cart, calculates the total in PostgreSQL, creates the
order and price snapshots, and clears the cart in one transaction. No client
price, order total, user ID, or ownership field is accepted.

```http
POST /api/checkout
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "customerName": "Alex Morgan",
  "shippingAddress": "42 Example Street, London, N1 1AA"
}
```

Returns `201`:

```json
{
  "data": {
    "order": {
      "id": "00000000-0000-4000-8000-000000000002",
      "orderNumber": "SN-ABC1234567",
      "customerName": "Alex Morgan",
      "customerEmail": "alex@example.com",
      "shippingAddress": "42 Example Street, London, N1 1AA",
      "total": { "amount": 24, "currency": "USD" },
      "status": "placed",
      "createdAt": "2026-10-02T14:10:00.000Z",
      "items": [{
        "id": "00000000-0000-4000-8000-000000000003",
        "productName": "Everyday Ceramic Mug",
        "unitPrice": { "amount": 24, "currency": "USD" },
        "quantity": 1,
        "lineTotal": 24
      }]
    },
    "email": { "status": "sent" }
  },
  "error": null
}
```

Email status is `sent`, `not_configured`, or `failed`. A mail delivery failure
does not undo a successfully placed order; the response explicitly reports the
email status. Empty cart or unavailable items: `409 CONFLICT`; invalid checkout
details: `400 INVALID_REQUEST`.

## Common errors

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | Malformed JSON, validation failure, or invalid input |
| `401` | `UNAUTHORIZED` | Missing, invalid, or expired bearer token |
| `404` | `NOT_FOUND` | Resource not found or not owned by the caller |
| `409` | `CONFLICT` | Empty cart or checkout conflict |
| `500` | `INTERNAL_ERROR` | Unexpected server-side failure |

Errors never contain stack traces or raw database/provider diagnostics.

## Supabase setup

1. Create a Supabase project and configure the Google provider in Supabase Auth.
2. Add `${APP_URL}/auth/callback` to Supabase Auth's allowed redirect URLs.
3. Apply `supabase/migrations/202610020001_initial_shop_schema.sql`, then run
   `supabase/seed.sql` in the Supabase SQL editor.
4. Set the Supabase URL, anon key, and server-only service-role key as described
   in `.env.example`.
5. Configure the project's Google OAuth client ID and secret in Supabase Auth;
   register the callback URI displayed by Supabase in Google Cloud Console.
6. Set SMTP environment variables to enable confirmation messages.
