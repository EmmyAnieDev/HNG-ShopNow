# ShopNow Mobile

Expo + React Native + TypeScript client for the Stage 2 ShopNow REST API.

## Configure and run

1. Create `mobile/.env` from `.env.example`.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the
   same public Supabase project values used by the website. Set
   `EXPO_PUBLIC_API_URL` to the deployed website origin or a reachable local
   development server origin. Do not add service-role or SMTP credentials.
3. From the repository root run `pnpm install`.
4. For browsing and password sign-in, Expo Go can run the app with
   `pnpm --dir mobile start`. The phone and Mac need to be on the same network.
   For Google OAuth, build and install the ShopNow development build as described
   below; Expo Go does not support this custom-scheme OAuth callback.
5. Use the deployed API by default; a local API must use the Mac's LAN IP (for
   example, `http://192.168.1.20:3000`), not `localhost`.

Password login and Google sign-in use the existing Supabase Auth project.
Google OAuth uses Expo AuthSession's `makeRedirectUri` and the system browser.
Its native callback is `shopnow://auth/callback`. Expo Go cannot register a
custom native scheme, so Expo's supported OAuth flow requires a development
build; the app deliberately explains this rather than redirecting to the
website's Site URL.

In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs,
keep the website callback `https://shopnow-stage-2.vercel.app/auth/callback`
and add this exact mobile callback:

```text
shopnow://auth/callback
```

Google Cloud's authorized redirect URI remains the Supabase callback shown in
the Supabase Google provider settings (`https://<project-ref>.supabase.co/auth/v1/callback`);
do not replace it with the Expo URL. Supabase's Site URL remains the website.

### Google OAuth on a physical phone

1. Add `shopnow://auth/callback` to Supabase's **Authentication → URL
   Configuration → Redirect URLs**. Keep the website callback and website Site
   URL unchanged. Remove `exp://**/--/auth/callback` if you added it previously.
2. Build the native development app (requires an Expo/EAS account):

   ```sh
   cd mobile
   pnpm dlx eas-cli login
   pnpm dlx eas-cli init
   pnpm build:dev:android
   # or: pnpm build:dev:ios
   ```

3. Install the EAS build on the physical phone. iOS internal distribution
   requires the device to be registered with the Apple developer account.
4. Start Metro for the development client from the repository root:

   ```sh
   pnpm --dir mobile exec expo start --dev-client --lan
   ```

5. Open the installed ShopNow development app, connect it to the Metro server,
   and tap **Sign in → Continue with Google**. Complete authentication in the
   system browser. It should return to ShopNow; verify the account email and
   open **Bag** to confirm the server cart loads.

Expo Go may still be used for browsing and password sign-in, but Google OAuth
cannot complete its return-to-app step there. A development build is required.

The cart is loaded from and mutated through `/api/cart*`; local component state
is only a view cache. It refreshes when the app resumes, when the cart tab opens,
after mutations, and periodically while the cart is visible.

## Checks

- `pnpm --dir mobile typecheck`
- `pnpm --dir mobile export`

End-to-end auth and cross-client cart/checkout tests require a physical device
and a working Supabase project.
