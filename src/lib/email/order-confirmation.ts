import nodemailer from "nodemailer";

export type OrderEmail = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  total: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendOrderConfirmation(order: OrderEmail): Promise<"sent" | "not_configured"> {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!host || !portValue || !user || !password || !from) return "not_configured";

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.productName)}</td><td>${item.quantity}</td><td>${formatMoney(item.unitPrice)}</td><td>${formatMoney(item.lineTotal)}</td></tr>`,
    )
    .join("");
  await transporter.sendMail({
    from,
    to: order.customerEmail,
    subject: `Your ShopNow order ${order.orderNumber}`,
    text: [
      `Hi ${order.customerName},`,
      `Thank you for your order ${order.orderNumber}.`,
      ...order.items.map(
        (item) => `${item.productName} x ${item.quantity} — ${formatMoney(item.lineTotal)}`,
      ),
      `Total: ${formatMoney(order.total)}`,
      `Order date: ${new Date(order.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
    ].join("\n"),
    html: `<h1>Thanks for your order, ${escapeHtml(order.customerName)}!</h1><p>Order <strong>${escapeHtml(order.orderNumber)}</strong> is confirmed.</p><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Total: ${formatMoney(order.total)}</strong></p><p>Order date: ${new Date(order.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>`,
  });
  return "sent";
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
