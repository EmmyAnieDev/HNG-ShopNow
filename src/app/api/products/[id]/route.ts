import { handleApiError, success } from "@/lib/http/response";
import { uuidSchema } from "@/lib/validation/schemas";
import { getProduct } from "@/services/products/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return success(await getProduct(uuidSchema.parse(id)));
  } catch (error) {
    return handleApiError(error);
  }
}
