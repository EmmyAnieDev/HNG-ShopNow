"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await createBrowserSupabaseClient().auth.getSession();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || envelope.error || envelope.data === null) {
    throw new ApiClientError(
      envelope.error?.message ?? "The request could not be completed",
      response.status,
      envelope.error?.code ?? "UNKNOWN_ERROR",
    );
  }
  return envelope.data;
}

