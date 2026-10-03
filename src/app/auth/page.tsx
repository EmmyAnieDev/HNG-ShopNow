"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name.trim() } },
          });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Check your inbox to confirm your email, then sign in.");
        return;
      }
      router.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setMessage("");
    setBusy(true);
    try {
      const { error } = await createBrowserSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  return (
    <section className="container">
      <div className="form-card">
        <span className="eyebrow">Welcome to ShopNow</span>
        <h1>{mode === "signin" ? "Good to see you." : "Make yourself at home."}</h1>
        <p className="form-intro">
          {mode === "signin" ? "Sign in to pick up where you left off." : "Create an account to save your bag and orders."}
        </p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="form-label" htmlFor="name">Your name</label>
              <input className="form-input" id="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="name" />
            </>
          )}
          <label className="form-label" htmlFor="email">Email address</label>
          <input className="form-input" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <label className="form-label" htmlFor="password">Password</label>
          <input className="form-input" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          {message && <p className="error-message" role="alert">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="divider">or</div>
        <button className="secondary-button" onClick={signInWithGoogle} disabled={busy}>Continue with Google</button>
        <button className="text-button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        <Link className="text-button" href="/">Continue shopping</Link>
      </div>
    </section>
  );
}
