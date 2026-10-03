import { authenticate, isAuthFailure } from "@/lib/auth/authenticate";
import { handleApiError, readJson, success } from "@/lib/http/response";
import { addCartItemSchema } from "@/lib/validation/schemas";
import { addCartItem } from "@/services/cart/service";

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if (isAuthFailure(auth)) return auth;
    const input = addCartItemSchema.parse(await readJson(request));
    return success(
      await addCartItem(auth.user.id, auth.supabase, input.productId, input.quantity),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
