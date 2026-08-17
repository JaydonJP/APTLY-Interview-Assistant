/**
 * APTLY — useHealthCheck Hook
 *
 * Polls the /api/v1/health endpoint and returns the current health status.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { HealthResponse } from "@/types/api";

export const healthQueryKey = ["health"] as const;

export function useHealthCheck() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: () => apiClient.get<HealthResponse>("/api/v1/health"),
    refetchInterval: 30_000, // Poll every 30 seconds
    retry: 1,
  });
}
