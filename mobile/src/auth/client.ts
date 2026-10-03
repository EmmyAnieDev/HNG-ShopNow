import "react-native-url-polyfill/auto";

import { makeRedirectUri } from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { createClient, type Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env.",
    );
  }
  return supabase;
}

export async function signInWithGoogle(): Promise<Session> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error(
      "Google sign-in cannot return to ShopNow in Expo Go. Install the ShopNow development build and try again.",
    );
  }

  const client = requireSupabase();
  const redirectTo = makeRedirectUri({
    native: "shopnow://auth/callback",
    scheme: "shopnow",
    path: "auth/callback",
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Supabase did not provide a Google sign-in URL.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    throw new Error(result.type === "cancel" ? "Google sign-in was cancelled." : "Google sign-in did not finish.");
  }

  const callback = new URL(result.url);
  if (
    callback.protocol !== new URL(redirectTo).protocol ||
    callback.host !== new URL(redirectTo).host ||
    callback.pathname !== new URL(redirectTo).pathname
  ) {
    throw new Error(
      `Google sign-in returned to ${callback.origin}${callback.pathname}, not the Expo app callback. Add ${redirectTo} to the Supabase Auth redirect allow list.`,
    );
  }

  const code = callback.searchParams.get("code");
  if (code) {
    const { data: sessionData, error: exchangeError } =
      await client.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    if (sessionData.session) return sessionData.session;
  }

  const tokenHash = callback.searchParams.get("token_hash");
  const type = callback.searchParams.get("type");
  if (tokenHash && type) {
    const { data: verification, error: verifyError } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
    });
    if (verifyError) throw verifyError;
    if (verification.session) return verification.session;
  }

  throw new Error("Google sign-in returned without a session. Check the Supabase redirect URL configuration.");
}
