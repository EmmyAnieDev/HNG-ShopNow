# ShopNow Mobile Guide

## Architecture
- This Expo / React Native TypeScript app is a client of the Stage 2 ShopNow API.
- `src/api` owns the reusable typed REST client and API contracts.
- `src/auth` owns Supabase Auth session persistence and sign-in helpers.
- `App.tsx` owns mobile presentation and calls API/auth modules; do not access Supabase database tables from the app.

## API usage
- Use the existing Stage 2 endpoints documented in `../API.md`, with `EXPO_PUBLIC_API_URL` as the origin (the client appends `/api`).
- Send the Supabase Auth access token as `Authorization: Bearer <token>` for private API requests.
- Keep the standard `{ data, error }` response contract and surface API failures to the user.
- Do not recreate server business rules, pricing, order totals, or checkout behavior in the app.

## Authentication
- Authenticate users against the same Supabase project as the website using its public URL and anon key.
- Persist mobile sessions with Expo SecureStore. Never embed service-role keys, SMTP credentials, or any server-only secret.
- Support password authentication and Supabase Google OAuth; no separate identity provider or account store.
- Google OAuth requires an Expo development build with the registered `shopnow://auth/callback` scheme; Expo Go cannot register the native callback.

## Cart synchronization
- The API-backed Supabase cart is the only source of truth. Local state may render the latest API response but must not be treated as persisted cart data.
- Refresh `GET /api/cart` on app foreground and whenever the cart screen is opened or revisited.
- After any cart mutation, use the cart returned by the API or fetch the cart again.

## Development rules
- Keep this app in `mobile/`; avoid changing the Stage 2 backend unless a documented API is genuinely missing.
- Use TypeScript, small reusable components, accessible controls, and explicit loading/error states.
- Configure public Expo values in an ignored `mobile/.env`; never copy root `.env.local` into the mobile bundle.
- Run the mobile TypeScript check and Expo export before considering changes complete.
- Test on a physical phone. `localhost` on a phone is the phone itself; use the reachable deployed API or the Mac's LAN IP.
