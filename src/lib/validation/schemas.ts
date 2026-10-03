import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const addCartItemSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  shippingAddress: z.string().trim().min(5).max(500),
});

