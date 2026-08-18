/**
 * APTLY — Typed API Client
 *
 * Thin fetch wrapper that:
 * - Uses base URL from environment
 * - Forwards X-Request-ID and X-Candidate-ID for session privacy
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

/**
 * Gets or initializes a persistent client session candidate ID for guest privacy.
 */
export function getCandidateId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("aptly_candidate_id");
    if (!id) {
      id = `cand_${crypto.randomUUID()}`;
      localStorage.setItem("aptly_candidate_id", id);
    }
    return id;
  } catch {
    return "";
  }
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
    const data = (await response.json()) as unknown;
    if (data && typeof data === "object") {
      const payload = data as Record<string, unknown>;
      const errorPayload = payload.error;
      if (errorPayload && typeof errorPayload === "object") {
        const error = errorPayload as Record<string, unknown>;
        return {
          code: typeof error.code === "string" ? error.code : "API_ERROR",
          message: typeof error.message === "string" ? error.message : response.statusText || "Request failed",
          request_id: typeof error.request_id === "string" ? error.request_id : response.headers.get("x-request-id") || "",
        };
      }
      if (payload.detail) {
        const detailMsg =
          typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
        return {
          code: `HTTP_${response.status}`,
          message: detailMsg,
          request_id: response.headers.get("x-request-id") || "",
        };
      }
      if (typeof payload.message === "string") {
        return {
          code: typeof payload.code === "string" ? payload.code : `HTTP_${response.status}`,
          message: payload.message,
          request_id: response.headers.get("x-request-id") || "",
        };
      }
    }
  } catch {
    // Fallback
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
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    if (result && typeof result === "object" && "data" in result) {
      const token = (result as { data: { session?: { access_token?: string } } }).data?.session?.access_token;
      if (token) return `Bearer ${token}`;
    }
  } catch {
    // Ignore Supabase errors
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

  const candidateId = getCandidateId();
  if (candidateId) {
    headers.set("X-Candidate-ID", candidateId);
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
    const candidateId = getCandidateId();
    if (candidateId) {
      headers.set("X-Candidate-ID", candidateId);
    }
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
