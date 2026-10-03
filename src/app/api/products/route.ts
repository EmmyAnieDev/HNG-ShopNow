import { z } from "zod";
import { handleApiError, success } from "@/lib/http/response";
import { listProducts } from "@/services/products/service";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const options = querySchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    return success(await listProducts(options));
  } catch (error) {
    return handleApiError(error);
  }
}
