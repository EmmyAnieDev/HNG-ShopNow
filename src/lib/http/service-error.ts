import { failure, type ApiErrorCode } from "@/lib/http/response";
import type { NextResponse } from "next/server";

export class ServiceError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function serviceErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ServiceError)) return null;
  return failure(error.code, error.message, error.status);
}
