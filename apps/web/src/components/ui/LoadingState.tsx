"use client";

import { useEffect, useState } from "react";
import { Sparkles, Flame, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_TIPS = [
  {
    title: "Two-Beat Pause Drill",
    text: "Before each answer, take two silent beats instead of using filler words. Begin directly with your headline.",
  },
  {
    title: "60-Second Trade-off Drill",
    text: "State your architectural decision in 15s, explain the primary benefit in 20s, and detail failure modes in 25s.",
  },
  {
    title: "90-Second Pacing Band",
    text: "Aim for a steady 130–160 WPM cadence. Mark one breath every sentence and keep the headline first.",
  },
  {
    title: "Headline-First Structure",
    text: "Lead with the quantified result before walking through the implementation details.",
  },
];

interface LoadingStateProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
  showTips?: boolean;
}

export function LoadingState({
  className,
  message = "Loading...",
  size = "md",
  showTips = true,
}: LoadingStateProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!showTips) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % QUICK_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [showTips]);

  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  const currentTip = QUICK_TIPS[tipIndex];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
      role="status"
      aria-label={message}
    >
      <div
        className={cn(
          "rounded-full border-white/10 border-t-violet-400 animate-spin",
          sizeClasses[size],
        )}
      />
      {message && (
        <p className="text-sm font-medium text-slate-300">{message}</p>
      )}

      {showTips && (
        <div className="mt-6 max-w-md mx-auto rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-slate-900/60 to-amber-950/20 p-4 text-left backdrop-blur-md transition-all">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Lightbulb className="h-4 w-4 text-amber-400 animate-pulse" />
            <span>QUICK DRILL TIP · {currentTip.title}</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
            {currentTip.text}
          </p>
        </div>
      )}
    </div>
  );
}
