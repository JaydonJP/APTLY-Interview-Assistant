/**
 * APTLY — Status Badge Component
 */

import { cn } from "@/lib/utils";
import type { InterviewStatus } from "@/types/interview";

interface StatusBadgeProps {
  status: InterviewStatus | "pending" | "processing" | "completed" | "failed" | string;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  created: { label: "Created", className: "bg-slate-800 text-slate-300 border border-slate-700" },
  ready: { label: "Ready", className: "bg-cyan-950 text-cyan-300 border border-cyan-500/40" },
  running: { label: "Live In Progress", className: "bg-emerald-950 text-emerald-300 border border-emerald-500/40" },
  question_active: { label: "Question Active", className: "bg-indigo-950 text-indigo-300 border border-indigo-500/40" },
  answering: { label: "Recording Answer", className: "bg-red-950 text-red-300 border border-red-500/40 animate-pulse" },
  answer_submitted: { label: "Answer Submitted", className: "bg-blue-950 text-blue-300 border border-blue-500/40" },
  processing: { label: "Processing", className: "bg-purple-950 text-purple-300 border border-purple-500/40" },
  completed: { label: "Completed", className: "bg-emerald-950 text-emerald-300 border border-emerald-500/40" },
  failed: { label: "Failed", className: "bg-rose-950 text-rose-300 border border-rose-500/40" },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: label || status,
    className: "bg-slate-800 text-slate-300 border border-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm",
        config.className,
        className,
      )}
    >
      {label || config.label}
    </span>
  );
}
