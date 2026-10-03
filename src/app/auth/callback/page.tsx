"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const supabase = createBrowserSupabaseClient();
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          return;
        }

        const providerError =
          query.get("error_description") ?? query.get("error");
        throw new Error(
          providerError
            ? providerError
            : "Please sign in again to continue.",
        );
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Sign-in could not be completed.");
        }
      }
    }

    void finishSignIn();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <section className="container content-section">
      <div className={message ? "error-message" : "loading"} role={message ? "alert" : undefined}>
        {message || "Finishing sign in…"}
      </div>
      {message && <Link className="continue-link" href="/auth">Return to sign in</Link>}
    </section>
  );
}
