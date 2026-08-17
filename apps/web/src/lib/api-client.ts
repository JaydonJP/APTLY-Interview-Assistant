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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getMediaUrl(storageKey: string): string {
  return `${API_BASE_URL}/api/v1/storage/media/${storageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function getLearnerId(): string {
  if (typeof window === "undefined") return "anonymous";
  const key = "aptly_learner_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  window.localStorage.setItem(key, generated);
  return generated;
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
    const data = (await response.json()) as ErrorResponse;
    return data.error;
  } catch {
    return {
      code: "UNKNOWN_ERROR",
      message: response.statusText || "An unknown error occurred",
      request_id: response.headers.get("x-request-id") ?? "",
    };
  }
}

interface RequestOptions extends RequestInit {
  requestId?: string;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { requestId, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set("Content-Type", "application/json");
  if (requestId) {
    headers.set("X-Request-ID", requestId);
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
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      body: formData,
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

  postBlob: async (path: string, body?: unknown): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw new ApiError(error.code, error.message, error.request_id, response.status);
    }
    return response.blob();
  },
};
