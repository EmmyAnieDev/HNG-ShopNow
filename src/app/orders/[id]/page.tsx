"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import { formatMoney } from "@/components/format";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  total: { amount: number };
  status: string;
  createdAt: string;
  items: Array<{ id: string; productName: string; unitPrice: { amount: number }; quantity: number; lineTotal: number }>;
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setEmailStatus(new URLSearchParams(window.location.search).get("email"));
    void params.then(({ id }) =>
      apiRequest<Order>(`/api/orders/${encodeURIComponent(id)}`)
        .then((data) => { if (active) setOrder(data); })
        .catch((reason: unknown) => {
          if (active) setError(
            reason instanceof ApiClientError && reason.status === 401
              ? "Sign in to view this order."
              : reason instanceof Error ? reason.message : "Order could not be loaded.",
          );
        }),
    );
    return () => { active = false; };
  }, [params]);

  if (error) return <section className="container content-section"><p className="error-message" role="alert">{error}</p><Link className="continue-link" href="/auth">Sign in</Link></section>;
  if (!order) return <section className="container content-section"><div className="loading">Loading your order…</div></section>;

  return (
    <section className="container content-section">
      <span className="eyebrow">{emailStatus ? "Order confirmed" : "Order details"}</span>
      <h1 className="page-title">{emailStatus ? "Thank you, " + order.customerName.split(" ")[0] + "." : order.orderNumber}</h1>
      <p className="form-intro">Order <strong>{order.orderNumber}</strong> was placed {new Date(order.createdAt).toLocaleString()}.</p>
      {emailStatus === "not_configured" && <p className="error-message" role="status">Your order is saved. Confirmation email is not configured yet.</p>}
      {emailStatus === "failed" && <p className="error-message" role="status">Your order is saved, but the confirmation email could not be sent.</p>}
      <div className="order-card">
        {order.items.map((item) => (
          <div className="order-row" key={item.id}>
            <span>{item.productName} × {item.quantity}<br /><small>{formatMoney(item.unitPrice.amount)} each</small></span>
            <strong>{formatMoney(item.lineTotal)}</strong>
          </div>
        ))}
        <div className="summary-total"><span>Total</span><span>{formatMoney(order.total.amount)}</span></div>
        <p className="form-intro">Delivering to {order.customerName}<br />{order.shippingAddress}<br />Confirmation: {order.customerEmail}</p>
      </div>
      <Link className="primary-link" href="/">Continue shopping</Link>
    </section>
  );
}
