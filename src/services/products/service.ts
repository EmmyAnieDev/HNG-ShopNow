import { ServiceError } from "@/lib/http/service-error";
import { createPublicSupabaseClient } from "@/lib/supabase/server";
import type { ProductRecord } from "@/types/database";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: { amount: number; currency: "USD" };
  category: string;
};

function toProduct(record: ProductRecord): Product {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    imageUrl: record.image_url,
    price: { amount: record.price_cents / 100, currency: "USD" },
    category: record.category,
  };
}

export async function listProducts(options: {
  page: number;
  pageSize: number;
  category?: string;
  search?: string;
}) {
  const supabase = createPublicSupabaseClient();
  const from = (options.page - 1) * options.pageSize;
  let query = supabase
    .from("products")
    .select("id,name,slug,description,image_url,price_cents,category,active,created_at,updated_at", {
      count: "exact",
    })
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);

  if (options.category) query = query.eq("category", options.category);
  if (options.search) query = query.ilike("name", `%${options.search}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return {
    items: (data ?? []).map(toProduct),
    page: options.page,
    pageSize: options.pageSize,
    total: count ?? 0,
  };
}

export async function getProduct(id: string): Promise<Product> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,image_url,price_cents,category,active,created_at,updated_at")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ServiceError("NOT_FOUND", "Product not found", 404);
  return toProduct(data);
}
