import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import type { AuthenticatedRequest } from "@/lib/auth/authenticate";
import { createOrder } from "@/services/orders/service";

export async function checkout(
  userId: string,
  customerEmail: string | undefined,
  customerName: string,
  shippingAddress: string,
  supabase: AuthenticatedRequest["supabase"],
) {
  const order = await createOrder(
    userId,
    customerEmail,
    customerName,
    shippingAddress,
    supabase,
  );

  let emailStatus: "sent" | "not_configured" | "failed";
  try {
    emailStatus = await sendOrderConfirmation({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      createdAt: order.createdAt,
      total: order.total.amount,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
        lineTotal: item.lineTotal,
      })),
    });
  } catch (error) {
    console.error("Order confirmation email failed", {
      orderId: order.id,
      error,
    });
    emailStatus = "failed";
  }

  return {
    order,
    email: {
      status: emailStatus,
      ...(emailStatus === "not_configured"
        ? { message: "SMTP is not configured; order confirmation was not sent." }
        : emailStatus === "failed"
          ? { message: "Order placed, but the confirmation email could not be sent." }
          : {}),
    },
  };
}
