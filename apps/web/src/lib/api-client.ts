/**
 * APTLY — Typed API Client
 *
 * Thin fetch wrapper that:
 * - Uses base URL from environment
 * - Forwards X-Request-ID
 * - Parses standard error responses
 * - Provides typed helpers for GET/POST/PUT/DELETE
 */

import type { ErrorResponse } from "@/types/api";
import { supabase } from "./supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getMediaUrl(storageKey: string): string {
  return `${API_BASE_URL}/api/v1/storage/media/${storageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorResponse(
  response: Response,
): Promise<ErrorResponse["error"]> {
  try {
    const data = (await response.json()) as any;
    if (data && typeof data === "object") {
      if (data.error && typeof data.error === "object") {
        return {
          code: data.error.code || "API_ERROR",
          message: data.error.message || response.statusText || "Request failed",
          request_id: data.error.request_id || response.headers.get("x-request-id") || "",
        };
      }
      if (data.detail) {
        const detailMsg =
          typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        return {
          code: `HTTP_${response.status}`,
          message: detailMsg,
          request_id: response.headers.get("x-request-id") || "",
        };
      }
      if (data.message) {
        return {
          code: data.code || `HTTP_${response.status}`,
          message: data.message,
          request_id: response.headers.get("x-request-id") || "",
        };
      }
    }
  } catch {
    // Fallback to response status text
  }
  return {
    code: `HTTP_${response.status || "UNKNOWN"}`,
    message: response.statusText || "An unknown error occurred",
    request_id: response.headers.get("x-request-id") ?? "",
  };
}

interface RequestOptions extends RequestInit {
  requestId?: string;
  token?: string;
}

async function getAuthHeader(): Promise<string | null> {
  try {
    const sessionPromise = supabase.auth.getSession();
    // Race against a 1-second timeout so Supabase never blocks API calls
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    if (result && typeof result === "object" && "data" in result) {
      const token = (result as { data: { session?: { access_token?: string } } }).data?.session?.access_token;
      if (token) return `Bearer ${token}`;
    }
  } catch {
    // Ignore Supabase errors — API works without auth in dev/mock mode
  }
  return null;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { requestId, token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  if (requestId) {
    headers.set("X-Request-ID", requestId);
  }

  const authHeader = token ? `Bearer ${token}` : await getAuthHeader();
  if (authHeader && !headers.has("Authorization")) {
    headers.set("Authorization", authHeader);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new ApiError(
      error.code,
      error.message,
      error.request_id,
      response.status,
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...options }),

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const headers = new Headers();
    const authHeader = await getAuthHeader();
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw new ApiError(
        error.code,
        error.message,
        error.request_id,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  },
};

