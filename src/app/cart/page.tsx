"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatMoney } from "@/components/format";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { subscribeToCartChanges } from "@/lib/supabase/cart-realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Cart = {
  items: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      imageUrl: string;
      price: { amount: number; currency: string };
    } | null;
    lineTotal: number | null;
  }>;
  subtotal: number;
  totalQuantity: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setError("");
    try {
      setCart(await apiRequest<Cart>("/api/cart"));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError && reason.status === 401
          ? "Sign in to see your saved bag."
          : reason instanceof Error
            ? reason.message
            : "Your bag could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void refresh();
    let active = true;
    let stopCartSubscription: (() => void) | undefined;
    let observedUserId: string | null | undefined;
    let authStateTimer: number | undefined;
    let subscribedUserId: string | null = null;
    const listenToUserCart = (userId: string | null) => {
      if (subscribedUserId === userId) return;
      stopCartSubscription?.();
      stopCartSubscription = undefined;
      subscribedUserId = userId;
      if (userId) {
        stopCartSubscription = subscribeToCartChanges(
          supabase,
          userId,
          () => void refresh(),
        );
      }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      observedUserId = session?.user.id ?? null;
      window.clearTimeout(authStateTimer);
      authStateTimer = window.setTimeout(() => {
        if (!active) return;
        listenToUserCart(observedUserId ?? null);
        void refresh();
      }, 0);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && observedUserId === undefined) {
        observedUserId = data.session?.user.id ?? null;
        listenToUserCart(observedUserId);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(authStateTimer);
      listener.subscription.unsubscribe();
      stopCartSubscription?.();
    };
  }, []);

  async function changeQuantity(itemId: string, quantity: number) {
    setError("");
    try {
      if (quantity === 0) {
        setCart(await apiRequest<Cart>(`/api/cart/items/${itemId}`, { method: "DELETE" }));
      } else {
        setCart(await apiRequest<Cart>(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        }));
      }
      window.dispatchEvent(new Event("shopnow:cart-updated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The bag could not be updated.");
    }
  }

  return (
    <section className="container content-section">
      <span className="eyebrow">Your selection</span>
      <h1 className="page-title">Your bag</h1>
      {loading ? <div className="loading">Loading your bag…</div> : error ? (
        <div className="empty-state">
          <p className="error-message" role="alert">{error}</p>
          {error.startsWith("Sign in") ? <Link className="primary-link" href="/auth">Sign in</Link> : <button className="text-button" onClick={() => { setLoading(true); void refresh(); }}>Try again</button>}
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="empty-state">
          <p>Your bag is waiting for something lovely.</p>
          <Link className="primary-link" href="/#shop">Continue shopping</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-list">
              {cart.items.map((item) => (
                <article className="cart-row" key={item.id}>
                  <div className="cart-thumb">
                    {item.product && <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="95px" className="product-image" />}
                  </div>
                  <div>
                    <p className="cart-product-name">{item.product?.name ?? "Unavailable product"}</p>
                    <p className="cart-product-price">{item.product ? formatMoney(item.product.price.amount) : "No longer available"}</p>
                    <div className="quantity-control">
                      <button aria-label="Decrease quantity" onClick={() => void changeQuantity(item.id, item.quantity - 1)}><Minus size={13} /></button>
                      <span>{item.quantity}</span>
                      <button aria-label="Increase quantity" disabled={item.quantity >= 99} onClick={() => void changeQuantity(item.id, item.quantity + 1)}><Plus size={13} /></button>
                    </div>
                    <button className="remove-button" onClick={() => void changeQuantity(item.id, 0)}>Remove</button>
                  </div>
                  <span className="cart-line-total">{item.lineTotal === null ? "—" : formatMoney(item.lineTotal)}</span>
                </article>
              ))}
            </div>
            {error && <p className="error-message" role="alert">{error}</p>}
            <Link className="continue-link" href="/#shop">Continue shopping</Link>
          </div>
          <aside className="summary-card">
            <h2>Order summary</h2>
            <div className="summary-line"><span>Subtotal ({cart.totalQuantity} items)</span><span>{formatMoney(cart.subtotal)}</span></div>
            <div className="summary-line"><span>Shipping</span><span>Calculated at checkout</span></div>
            <div className="summary-total"><span>Total</span><span>{formatMoney(cart.subtotal)}</span></div>
            <Link className="primary-button" href="/checkout">Continue to checkout</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
