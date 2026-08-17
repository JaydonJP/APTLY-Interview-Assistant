/**
 * APTLY — Status Badge Component
 */

import { cn } from "@/lib/utils";
import type { InterviewStatus } from "@/types/interview";

interface StatusBadgeProps {
  status: InterviewStatus | "pending" | "processing" | "completed" | "failed";
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  created: { label: "Created", className: "bg-slate-100 text-slate-600" },
  configured: { label: "Ready", className: "bg-blue-50 text-blue-700" },
  pending: { label: "Pending", className: "bg-yellow-50 text-yellow-700" },
  active: {
    label: "In Progress",
    className: "bg-green-50 text-green-700",
  },
  processing: {
    label: "Processing",
    className: "bg-purple-50 text-purple-700",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700",
  },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
