"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function ShopHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email ?? null);
      if (!data.session) {
        setQuantity(0);
        return;
      }
      const cart = await apiRequest<{ totalQuantity: number }>("/api/cart");
      setQuantity(cart.totalQuantity);
    } catch (error) {
      setQuantity(0);
      console.error("Unable to refresh account or cart state", error);
    }
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void refreshCartCount();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshCartCount();
    });
    const onCartUpdated = () => void refreshCartCount();
    window.addEventListener("shopnow:cart-updated", onCartUpdated);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("shopnow:cart-updated", onCartUpdated);
    };
  }, [refreshCartCount]);

  async function signOut() {
    try {
      const { error } = await createBrowserSupabaseClient().auth.signOut();
      if (error) throw error;
      setEmail(null);
      setQuantity(0);
      router.replace("/");
    } catch (error) {
      console.error("Sign out failed", error);
    }
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="ShopNow home">
          <span className="brand-mark"><Store size={19} strokeWidth={2.2} /></span>
          <span>shopnow<span className="brand-period">.</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/#shop">Shop</Link>
          {email && <Link href="/orders">Orders</Link>}
        </nav>
        <div className="header-actions">
          {email ? (
            <>
              <span className="header-email">{email}</span>
              <button className="header-link" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <Link className="header-link" href="/auth">Sign in</Link>
          )}
          <Link href="/cart" className="cart-link" aria-label={`Cart, ${quantity} items`}>
            <ShoppingBag size={19} />
            <span>Bag</span>
            <span className="cart-count">{quantity}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
