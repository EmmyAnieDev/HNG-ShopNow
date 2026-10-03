import { authenticate, isAuthFailure } from "@/lib/auth/authenticate";
import { handleApiError, readJson, success } from "@/lib/http/response";
import { updateCartItemSchema, uuidSchema } from "@/lib/validation/schemas";
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/services/cart/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate(request);
    if (isAuthFailure(auth)) return auth;
    const { id } = await context.params;
    const itemId = uuidSchema.parse(id);
    const input = updateCartItemSchema.parse(await readJson(request));
    await updateCartItem(auth.supabase, itemId, input.quantity);
    return success(await getCart(auth.user.id, auth.supabase));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate(request);
    if (isAuthFailure(auth)) return auth;
    const { id } = await context.params;
    await removeCartItem(auth.supabase, uuidSchema.parse(id));
    return success(await getCart(auth.user.id, auth.supabase));
  } catch (error) {
    return handleApiError(error);
  }
}
