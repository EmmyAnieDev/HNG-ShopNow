"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import { formatMoney } from "@/components/format";

type CartSummary = { items: Array<{ id: string }>; subtotal: number; totalQuantity: number };
type CheckoutResult = {
  order: { id: string; orderNumber: string; total: { amount: number } };
  email: { status: "sent" | "not_configured" | "failed" };
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest<CartSummary>("/api/cart")
      .then(setCart)
      .catch((reason: unknown) => {
        setError(
          reason instanceof ApiClientError && reason.status === 401
            ? "Sign in before checking out."
            : reason instanceof Error
              ? reason.message
              : "Your bag could not be loaded.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<CheckoutResult>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ customerName: name, shippingAddress: address }),
      });
      window.dispatchEvent(new Event("shopnow:cart-updated"));
      router.replace(`/orders/${result.order.id}?email=${result.email.status}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your order could not be placed.");
      setBusy(false);
    }
  }

  return (
    <section className="container content-section">
      <span className="eyebrow">Almost yours</span>
      <h1 className="page-title">Checkout</h1>
      {loading ? <div className="loading">Preparing checkout…</div> : error && !cart ? (
        <div className="empty-state">
          <p className="error-message" role="alert">{error}</p>
          {error.includes("Sign in") ? <Link className="primary-link" href="/auth">Sign in</Link> : <Link className="continue-link" href="/cart">Back to bag</Link>}
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="empty-state"><p>Your bag is empty.</p><Link className="primary-link" href="/#shop">Continue shopping</Link></div>
      ) : (
        <div className="checkout-layout">
          <form className="form-card" style={{ width: "100%", margin: 0 }} onSubmit={placeOrder}>
            <h2>Delivery details</h2>
            <p className="form-intro">Your account email will be used for the order confirmation.</p>
            <label className="form-label" htmlFor="customer-name">Full name</label>
            <input className="form-input" id="customer-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="name" />
            <label className="form-label" htmlFor="shipping-address">Shipping address</label>
            <textarea className="form-input" id="shipping-address" value={address} onChange={(event) => setAddress(event.target.value)} required minLength={5} maxLength={500} autoComplete="street-address" />
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Placing order…" : "Place order"}
            </button>
          </form>
          <aside className="summary-card">
            <h2>Order summary</h2>
            <div className="summary-line"><span>Items</span><span>{cart.totalQuantity}</span></div>
            <div className="summary-line"><span>Subtotal</span><span>{formatMoney(cart.subtotal)}</span></div>
            <div className="summary-line"><span>Shipping</span><span>Included</span></div>
            <div className="summary-total"><span>Total</span><span>{formatMoney(cart.subtotal)}</span></div>
            <p className="form-intro">Prices are verified securely when you place your order.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
