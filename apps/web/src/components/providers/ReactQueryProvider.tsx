/**
 * APTLY — React Query Provider
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { createQueryClient } from "@/lib/query-client";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Create QueryClient instance per component tree (SSR-safe)
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
