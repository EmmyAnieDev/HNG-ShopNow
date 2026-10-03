import { authenticate, isAuthFailure } from "@/lib/auth/authenticate";
import { handleApiError, success } from "@/lib/http/response";
import { uuidSchema } from "@/lib/validation/schemas";
import { getOrder } from "@/services/orders/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate(request);
    if (isAuthFailure(auth)) return auth;
    const { id } = await context.params;
    return success(await getOrder(auth.supabase, uuidSchema.parse(id)));
  } catch (error) {
    return handleApiError(error);
  }
}
