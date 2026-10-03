"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import { formatMoney } from "@/components/format";

type OrderSummary = {
  id: string;
  orderNumber: string;
  total: { amount: number };
  status: string;
  createdAt: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiRequest<OrderSummary[]>("/api/orders")
      .then(setOrders)
      .catch((reason: unknown) => setError(
        reason instanceof ApiClientError && reason.status === 401
          ? "Sign in to view your orders."
          : reason instanceof Error ? reason.message : "Orders could not be loaded.",
      ))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="container content-section">
      <span className="eyebrow">Your account</span>
      <h1 className="page-title">Your orders</h1>
      {loading ? <div className="loading">Loading orders…</div> : error ? (
        <div className="empty-state"><p className="error-message" role="alert">{error}</p>{error.startsWith("Sign in") && <Link className="primary-link" href="/auth">Sign in</Link>}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state"><p>No orders yet.</p><Link className="primary-link" href="/#shop">Find something lovely</Link></div>
      ) : (
        <div className="order-card">
          {orders.map((order) => (
            <Link className="order-row" href={`/orders/${order.id}`} key={order.id}>
              <span><strong>{order.orderNumber}</strong><br /><small>{new Date(order.createdAt).toLocaleDateString()}</small></span>
              <span className="status-pill">{order.status}</span>
              <span>{formatMoney(order.total.amount)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
