import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "EMAIL_DELIVERY_FAILED";

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function failure(
  code: ApiErrorCode,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { data: null, error: { code, message } },
    { status },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ZodError([
      {
        code: "custom",
        message: "Request body must be valid JSON",
        path: [],
      },
    ]);
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return failure("INVALID_REQUEST", error.issues[0]?.message ?? "Invalid request", 400);
  }
  if (
    error instanceof Error &&
    error.name === "ServiceError" &&
    "status" in error &&
    "code" in error
  ) {
    const serviceError = error as Error & { status: number; code: ApiErrorCode };
    return failure(serviceError.code, serviceError.message, serviceError.status);
  }
  console.error("Unexpected API error", error);
  return failure("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
