/**
 * APTLY — Loading State Component
 */

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  className,
  message = "Loading...",
  size = "md",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        className,
      )}
      role="status"
      aria-label={message}
    >
      <div
        className={cn(
          "rounded-full border-white/10 border-t-violet-300 animate-spin",
          sizeClasses[size],
        )}
      />
      {message && (
        <p className="text-sm font-medium text-slate-400">{message}</p>
      )}
    </div>
  );
}
