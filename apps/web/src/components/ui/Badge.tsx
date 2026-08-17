"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary" | "purple" | "cyan";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variantStyles = {
    default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    outline: "border-slate-700 text-slate-300 bg-slate-900/40",
    destructive: "bg-red-500/10 text-red-400 border-red-500/20",
    secondary: "bg-slate-800 text-slate-200 border-slate-700",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
