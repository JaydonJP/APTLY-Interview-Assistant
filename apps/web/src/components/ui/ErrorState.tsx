/**
 * APTLY — Error State Component
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 px-4 text-center",
        className,
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-300/20 bg-red-400/10">
        <AlertCircle className="h-6 w-6 text-red-300" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="max-w-sm text-sm text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button
          id="error-retry-button"
          onClick={onRetry}
          className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
