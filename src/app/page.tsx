"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { apiRequest } from "@/lib/api/client";
import type { Product } from "@/services/products/service";

type ProductList = { items: Product[] };

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<ProductList>("/api/products?page=1&pageSize=8")
      .then((result) => setProducts(result.items))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Products could not be loaded"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">A little more considered</span>
            <h1>Everyday things,<br />made special.</h1>
            <p>Thoughtful finds for your home, wardrobe, and the little rituals that make a day.</p>
            <Link className="primary-link" href="#shop">Explore the collection <ArrowRight size={16} /></Link>
          </div>
          <div className="hero-art" aria-hidden="true" />
        </div>
      </section>

      <section className="container shop-section" id="shop">
        <div className="section-heading">
          <div>
            <span className="eyebrow">The collection</span>
            <h2>Good things, picked for you</h2>
          </div>
          <p className="section-note">Small details. Better everyday.</p>
        </div>
        {loading && <div className="loading">Finding good things…</div>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <div className="empty-state">No products are available yet.</div>
        )}
        <div className="product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </>
  );
}
