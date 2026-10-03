import { ServiceError } from "@/lib/http/service-error";
import type { AuthenticatedRequest } from "@/lib/auth/authenticate";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type OrderItem = {
  id: string;
  productName: string;
  unitPrice: { amount: number; currency: "USD" };
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  total: { amount: number; currency: "USD" };
  status: string;
  createdAt: string;
  items: OrderItem[];
};

async function getOrderItemMap(
  supabase: AuthenticatedRequest["supabase"],
  orderIds: string[],
) {
  if (!orderIds.length) return new Map<string, OrderItem[]>();
  const { data, error } = await supabase
    .from("order_items")
    .select("id,order_id,product_name,unit_price_cents,quantity,line_total_cents")
    .in("order_id", orderIds);
  if (error) throw error;
  const grouped = new Map<string, OrderItem[]>();
  for (const item of data ?? []) {
    const current = grouped.get(item.order_id) ?? [];
    current.push({
      id: item.id,
      productName: item.product_name,
      unitPrice: { amount: item.unit_price_cents / 100, currency: "USD" },
      quantity: item.quantity,
      lineTotal: item.line_total_cents / 100,
    });
    grouped.set(item.order_id, current);
  }
  return grouped;
}

function serializeOrder(
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    shipping_address: string;
    total_cents: number;
    status: string;
    created_at: string;
  },
  items: OrderItem[],
): Order {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    shippingAddress: order.shipping_address,
    total: { amount: order.total_cents / 100, currency: "USD" },
    status: order.status,
    createdAt: order.created_at,
    items,
  };
}

export async function listOrders(supabase: AuthenticatedRequest["supabase"]) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_email,shipping_address,total_cents,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const items = await getOrderItemMap(supabase, (data ?? []).map((order) => order.id));
  return (data ?? []).map((order) => serializeOrder(order, items.get(order.id) ?? []));
}

export async function getOrder(
  supabase: AuthenticatedRequest["supabase"],
  id: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_email,shipping_address,total_cents,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ServiceError("NOT_FOUND", "Order not found", 404);
  const items = await getOrderItemMap(supabase, [id]);
  return serializeOrder(data, items.get(id) ?? []);
}

export async function createOrder(
  userId: string,
  customerEmail: string | undefined,
  customerName: string,
  shippingAddress: string,
  supabase: AuthenticatedRequest["supabase"],
) {
  if (!customerEmail) {
    throw new ServiceError("INVALID_REQUEST", "Your account needs a verified email address", 400);
  }

  const admin = createAdminSupabaseClient();
  const { data: orderId, error } = await admin.rpc("create_order_from_cart", {
    p_user_id: userId,
    p_customer_name: customerName,
    p_shipping_address: shippingAddress,
  });
  if (error) {
    if (error.message.includes("CART_EMPTY")) {
      throw new ServiceError("CONFLICT", "Your cart is empty", 409);
    }
    if (error.message.includes("PRODUCTS_UNAVAILABLE")) {
      throw new ServiceError("CONFLICT", "One or more cart products are unavailable", 409);
    }
    if (error.message.includes("CART_NOT_FOUND")) {
      throw new ServiceError("NOT_FOUND", "Cart not found", 404);
    }
    if (error.message.includes("CUSTOMER_EMAIL_MISSING")) {
      throw new ServiceError("INVALID_REQUEST", "Your account needs a verified email address", 400);
    }
    if (error.message.includes("INVALID_CHECKOUT_DETAILS")) {
      throw new ServiceError("INVALID_REQUEST", "Checkout details are invalid", 400);
    }
    throw error;
  }
  return getOrder(supabase, orderId);
}
