# ShopNow

API-first shop built with Next.js App Router, TypeScript, Tailwind CSS, Supabase
PostgreSQL/Auth, and Nodemailer. The web frontend consumes the documented
`/api/*` JSON contract; a future mobile app can use the same REST endpoints and
Supabase bearer tokens.

## Local development

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and add a Supabase project URL, anon key,
   and server-only service-role key. Never expose the service-role key to a client.
3. Apply the SQL migration in `supabase/migrations`, then run `supabase/seed.sql`
   in the Supabase SQL editor to load the demo products.
4. Configure email/password and Google in Supabase Auth. Add
   `http://localhost:3000/auth/callback` to the allowed redirect URLs.
5. Run `pnpm dev`.

Email is explicitly reported as `not_configured` until SMTP is supplied. Use only
server-side `SMTP_*` variables for the Nodemailer transport.

## Project map

- `src/app/api`: JSON REST route handlers
- `src/services`: product, cart, order, and checkout business logic
- `src/lib`: Supabase clients, auth verification, email, validation, and response helpers
- `src/components`: reusable storefront UI, calling the REST API
- `supabase/migrations`: schema, constraints, RLS, and atomic checkout logic
- `supabase/seed.sql`: idempotent demo product data
- `API.md`: Stage 3 API contract and examples

## Validation

Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Integration checks for auth,
RLS, checkout transactions, and SMTP need a configured Supabase project and
SMTP account; the app does not contain fake credentials or mock external setup.

## Stage 3 mobile app

The Expo / React Native client lives in [`mobile/`](./mobile/). It uses the
same API and Supabase Auth project as this website; its server-backed cart
refreshes via Supabase Realtime notifications, app focus, and app resume. Apply
the cart Realtime migration in `supabase/migrations/` before expecting automatic
cross-client updates. Follow [`mobile/README.md`](./mobile/README.md) to configure
its public environment values and run it on a physical phone.

Deploy the Next.js application to Vercel after configuring the production
environment variables. Configure the deployed callback URL in Supabase Auth and
Google Cloud Console before enabling Google sign-in.
