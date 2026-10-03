import { authenticate, isAuthFailure } from "@/lib/auth/authenticate";
import { handleApiError, success } from "@/lib/http/response";
import { getCart } from "@/services/cart/service";

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    if (isAuthFailure(auth)) return auth;
    return success(await getCart(auth.user.id, auth.supabase));
  } catch (error) {
    return handleApiError(error);
  }
}
