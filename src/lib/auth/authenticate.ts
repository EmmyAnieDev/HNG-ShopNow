import type { User } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { failure } from "@/lib/http/response";
import { createUserSupabaseClient } from "@/lib/supabase/server";

export type AuthenticatedRequest = {
  user: User;
  supabase: ReturnType<typeof createUserSupabaseClient>;
};

export async function authenticate(
  request: Request,
): Promise<AuthenticatedRequest | NextResponse> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return failure("UNAUTHORIZED", "A valid bearer token is required", 401);

  try {
    const supabase = createUserSupabaseClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return failure("UNAUTHORIZED", "The access token is invalid or expired", 401);
    }
    return { user: data.user, supabase };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Supabase URL")) throw error;
    return failure("UNAUTHORIZED", "The access token is invalid or expired", 401);
  }
}

export function isAuthFailure(
  result: AuthenticatedRequest | NextResponse,
): result is NextResponse {
  return "status" in result;
}
