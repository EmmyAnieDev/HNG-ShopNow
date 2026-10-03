export type Price = {
  amount: number;
  currency: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  price: Price;
  category: string;
};

export type Cart = {
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
  currency: string;
};

export type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
    price: Price;
  } | null;
  lineTotal: number | null;
};

export type OrderItem = {
  id: string;
  productName: string;
  unitPrice: Price;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  total: Price;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

export type CheckoutResult = {
  order: Order;
  email: { status: "sent" | "not_configured" | "failed" };
};
