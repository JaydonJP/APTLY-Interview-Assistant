import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  href?: string;
  compact?: boolean;
  className?: string;
}

export function BrandMark({
  href = "/dashboard",
  compact = false,
  className,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label="APTLY home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span
        className="relative flex h-7 w-7 items-center justify-center"
        aria-hidden="true"
      >
        <span className="absolute inset-0 rotate-45 rounded-[0.42rem] border border-violet-300/35 bg-violet-300/10 transition-transform duration-300 group-hover:rotate-[55deg]" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-violet-200 shadow-[0_0_0.85rem_rgba(184,175,255,0.7)]" />
      </span>
      {!compact && (
        <span className="text-[0.72rem] font-semibold tracking-[0.24em] text-stone-100">
          APTLY
        </span>
      )}
    </Link>
  );
}
