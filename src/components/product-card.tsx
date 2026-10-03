"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { formatMoney } from "@/components/format";
import type { Product } from "@/services/products/service";

export function ProductCard({ product }: { product: Product }) {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);

  async function addToBag() {
    setBusy(true);
    setMessage("");
    try {
      await apiRequest("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      window.dispatchEvent(new Event("shopnow:cart-updated"));
      setMessageType("success");
      setMessage("Added to bag");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof ApiClientError && error.status === 401
          ? "Sign in to add items"
          : error instanceof Error
            ? error.message
            : "Could not add item",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="product-card">
      <Link href={`/products/${product.id}`} className="product-image-wrap">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="product-image"
        />
        <span className="product-category">{product.category}</span>
      </Link>
      <div className="product-card-info">
        <div>
          <Link href={`/products/${product.id}`} className="product-name">{product.name}</Link>
          <p className="product-price">{formatMoney(product.price.amount)}</p>
        </div>
        <button
          className="add-button"
          onClick={addToBag}
          disabled={busy}
          aria-label={`Add ${product.name} to bag`}
        >
          <Plus size={19} />
        </button>
      </div>
      {message && (
        <p
          className={`card-message ${messageType === "error" ? "card-message-error" : ""}`}
          role={messageType === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </article>
  );
}
