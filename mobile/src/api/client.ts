import type { Cart, CheckoutResult, Order, Product } from "./types";

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const configuredOrigin = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const apiRoot = configuredOrigin
  ? configuredOrigin.endsWith("/api")
    ? configuredOrigin
    : `${configuredOrigin}/api`
  : "https://shopnow-stage-2.vercel.app/api";

async function request<T>(
  path: string,
  accessToken?: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${apiRoot}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Could not reach ShopNow. Check your connection and API URL.", 0, "NETWORK_ERROR");
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("ShopNow returned an invalid response.", response.status, "INVALID_RESPONSE");
  }

  if (!response.ok || envelope.error || envelope.data === null) {
    throw new ApiError(
      envelope.error?.message ?? "The request could not be completed.",
      response.status,
      envelope.error?.code ?? "UNKNOWN_ERROR",
    );
  }
  return envelope.data;
}

export const shopApi = {
  listProducts: (page = 1, pageSize = 50) =>
    request<{ items: Product[]; page: number; pageSize: number; total: number }>(
      `/products?page=${page}&pageSize=${pageSize}`,
    ),
  getProduct: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
  getCart: (token: string) => request<Cart>("/cart", token),
  addCartItem: (token: string, productId: string, quantity = 1) =>
    request<Cart>("/cart/items", token, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),
  updateCartItem: (token: string, id: string, quantity: number) =>
    request<Cart>(`/cart/items/${encodeURIComponent(id)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (token: string, id: string) =>
    request<Cart>(`/cart/items/${encodeURIComponent(id)}`, token, { method: "DELETE" }),
  listOrders: (token: string) => request<Order[]>("/orders", token),
  getOrder: (token: string, id: string) =>
    request<Order>(`/orders/${encodeURIComponent(id)}`, token),
  checkout: (token: string, customerName: string, shippingAddress: string) =>
    request<CheckoutResult>("/checkout", token, {
      method: "POST",
      body: JSON.stringify({ customerName, shippingAddress }),
    }),
};
