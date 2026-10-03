import { ServiceError } from "@/lib/http/service-error";
import type { AuthenticatedRequest } from "@/lib/auth/authenticate";
import type { ProductRecord } from "@/types/database";

type CartProduct = Pick<ProductRecord, "id" | "name" | "image_url" | "price_cents">;

export async function getCart(userId: string, supabase: AuthenticatedRequest["supabase"]) {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (cartError) throw cartError;
  if (!cart) return { items: [], subtotal: 0, totalQuantity: 0, currency: "USD" };

  const { data: cartItems, error: itemsError } = await supabase
    .from("cart_items")
    .select("id,product_id,quantity")
    .eq("cart_id", cart.id)
    .order("created_at");
  if (itemsError) throw itemsError;

  const ids = (cartItems ?? []).map((item) => item.product_id);
  const { data: products, error: productsError } = ids.length
    ? await supabase
        .from("products")
        .select("id,name,image_url,price_cents")
        .in("id", ids)
        .eq("active", true)
    : { data: [], error: null };
  if (productsError) throw productsError;
  const productById = new Map<string, CartProduct>(
    (products ?? []).map((product) => [product.id, product]),
  );
  const items = (cartItems ?? []).map((item) => {
    const product = productById.get(item.product_id);
    return {
      id: item.id,
      quantity: item.quantity,
      product: product
        ? {
            id: product.id,
            name: product.name,
            imageUrl: product.image_url,
            price: { amount: product.price_cents / 100, currency: "USD" as const },
          }
        : null,
      lineTotal: product ? (product.price_cents * item.quantity) / 100 : null,
    };
  });
  const validItems = items.filter((item) => item.product !== null);
  return {
    items,
    subtotal:
      Math.round(
        validItems.reduce(
          (sum, item) => sum + Math.round((item.lineTotal ?? 0) * 100),
          0,
        ),
      ) / 100,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    currency: "USD",
  };
}

export async function addCartItem(
  userId: string,
  supabase: AuthenticatedRequest["supabase"],
  productId: string,
  quantity: number,
) {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (cartError || !cart) {
    if (cartError?.code === "PGRST116") {
      throw new ServiceError("NOT_FOUND", "Cart not found", 404);
    }
    throw cartError ?? new Error("Cart not found");
  }

  const { error } = await supabase.rpc("add_cart_item", {
    p_cart_id: cart.id,
    p_product_id: productId,
    p_quantity: quantity,
  });
  if (error) {
    if (error.code === "P0002") {
      throw new ServiceError("NOT_FOUND", "Product not found", 404);
    }
    if (error.code === "22023") {
      throw new ServiceError("INVALID_REQUEST", "Quantity is outside the allowed range", 400);
    }
    if (error.code === "23505") {
      throw new ServiceError("CONFLICT", "Cart item could not be added", 409);
    }
    throw error;
  }
  return getCart(userId, supabase);
}

export async function updateCartItem(
  supabase: AuthenticatedRequest["supabase"],
  itemId: string,
  quantity: number,
) {
  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ServiceError("NOT_FOUND", "Cart item not found", 404);
}

export async function removeCartItem(
  supabase: AuthenticatedRequest["supabase"],
  itemId: string,
) {
  const { data, error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ServiceError("NOT_FOUND", "Cart item not found", 404);
}
