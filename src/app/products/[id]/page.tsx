"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { formatMoney } from "@/components/format";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { Product } from "@/services/products/service";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void params.then(({ id }) =>
      apiRequest<Product>(`/api/products/${encodeURIComponent(id)}`)
        .then((result) => { if (active) setProduct(result); })
        .catch((error: unknown) => {
          if (active) setMessage(error instanceof Error ? error.message : "Product could not be loaded");
        }),
    );
    return () => { active = false; };
  }, [params]);

  async function addToBag() {
    if (!product) return;
    setBusy(true);
    setMessage("");
    try {
      await apiRequest("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      window.dispatchEvent(new Event("shopnow:cart-updated"));
      setMessage("Added to your bag.");
    } catch (error) {
      setMessage(
        error instanceof ApiClientError && error.status === 401
          ? "Please sign in before adding items to your bag."
          : error instanceof Error
            ? error.message
            : "The item could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container content-section">
      <Link href="/" className="breadcrumbs"><ArrowLeft size={14} /> &nbsp; Back to the collection</Link>
      {product ? (
        <div className="detail-layout">
          <div className="detail-image">
            <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="product-image" priority />
          </div>
          <div className="detail-copy">
            <span className="eyebrow">{product.category}</span>
            <h1>{product.name}</h1>
            <p className="detail-price">{formatMoney(product.price.amount)}</p>
            <p className="detail-description">{product.description}</p>
            <button className="primary-button" onClick={addToBag} disabled={busy}>
              <Plus size={17} /> Add to bag
            </button>
            {message && <p className="error-message" role="status">{message}</p>}
          </div>
        </div>
      ) : (
        <div className={message ? "error-message" : "loading"} role={message ? "alert" : undefined}>
          {message || "Loading product…"}
        </div>
      )}
    </section>
  );
}
