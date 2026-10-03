import { authenticate, isAuthFailure } from "@/lib/auth/authenticate";
import { handleApiError, readJson, success } from "@/lib/http/response";
import { checkoutSchema } from "@/lib/validation/schemas";
import { checkout } from "@/services/checkout/service";

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if (isAuthFailure(auth)) return auth;
    const input = checkoutSchema.parse(await readJson(request));
    return success(
      await checkout(
        auth.user.id,
        auth.user.email,
        input.customerName,
        input.shippingAddress,
        auth.supabase,
      ),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
