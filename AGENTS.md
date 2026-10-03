# ShopNow Project Guide

## Project overview
ShopNow is an API-first e-commerce application. The Next.js web client is one consumer of a versionable JSON REST API; future mobile clients must use the same API and Supabase Auth project.

## Architecture
- `src/app/api` contains thin Next.js route handlers for HTTP parsing, authentication, validation, and response mapping.
- `src/services` contains business rules and orchestration. Keep pricing and checkout decisions out of React and route handlers.
- `src/lib/supabase` owns browser, authenticated-user, and server-only service-role clients.
- `src/lib/auth`, `src/lib/email`, and `src/lib/http` contain authentication, email delivery, and HTTP contract helpers.
- `src/components` and `src/app` pages render UI and call `/api/*`; they must not access database tables directly.
- `supabase/migrations` contains the relational schema, RLS policies, atomic database functions, and seed data.

## API-first requirement
- Treat REST endpoints as a first-class product for web and mobile clients.
- Use JSON request and response bodies. Success envelopes are `{ "data": ..., "error": null }`; errors are `{ "data": null, "error": { "code": "...", "message": "..." } }`.
- Use standard HTTP methods/status codes, validate untrusted input, and do not expose internal database fields, stack traces, or secrets.
- Authenticate private endpoints with a Supabase access token in `Authorization: Bearer <token>`. Never accept a user ID or ownership assertion from a client.
- Document public contracts and authentication requirements in `API.md`.

## Technology
- Next.js App Router, TypeScript, Tailwind CSS, pnpm, Supabase PostgreSQL/Auth, and Nodemailer.
- Do not introduce another database or authentication provider, or Mailgun.

## Directory structure
See the top-level folders and the architecture section above. Keep route handlers thin and infrastructure concerns out of UI components.

## Coding conventions
- Prefer small typed modules, explicit return shapes, and server-side validation.
- Keep client components limited to interaction and rendering; call the REST API for application data and mutations.
- Do not use `any`, silently swallow failures, or add secrets to source control.

## API conventions
- Use shared response helpers and stable error codes.
- Return `401` for missing/invalid authentication, `404` for absent resources, `409` for conflicts, `400` for invalid input, and `500` for unexpected server errors.
- Products are public; cart, orders, and checkout require an authenticated user.

## Database conventions
- Use Supabase PostgreSQL migrations for schema changes and seed/demo catalog data.
- Use UUID primary keys, foreign keys, constraints, timestamps, and indexes.
- Enable RLS. Users may access only their own profile/cart/cart items/orders/order items; products are publicly readable.
- Snapshot product names and prices into order items. Compute totals on the server/database, never from client-submitted prices.
- Use an atomic PostgreSQL function/transaction for order creation and cart clearing.

## Authentication rules
- Supabase Auth is the only identity provider. Google OAuth must be configured as a Supabase Auth provider; do not implement OAuth manually.
- Browser sessions use Supabase Auth. Web API calls and mobile clients send the Supabase access token as a bearer token.
- Derive identity from a verified Supabase token. Service-role credentials are server-only and may not be used to bypass ownership checks.

## Security rules
- Keep `SUPABASE_SERVICE_ROLE_KEY` and all SMTP values server-only. Never log credentials or return raw provider/database errors to clients.
- Validate all request bodies, query parameters, and path identifiers.
- Apply RLS even when application code already filters by user.
- Do not commit `.env`, `.env.local`, or real credentials.

## Testing and validation
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` for code changes.
- Test APIs with an isolated configured Supabase project and verify both authorized and unauthorized behavior.
- When external Supabase, Google OAuth, SMTP, or Vercel configuration is unavailable, report the exact manual setup and distinguish unverified integration checks from passing local checks.

## Dependency rules
- Use pnpm. Add a dependency only when it is needed for a project requirement and prefer existing packages.
- Do not add alternate databases, auth providers, or email delivery providers.
