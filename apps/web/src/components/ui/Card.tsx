"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  id?: string;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, id, className, padding = "md" }: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      id={id}
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm transition-all",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  description,
  action,
  children,
  className,
}: CardHeaderProps) {
  if (children) {
    return <div className={cn("flex flex-col space-y-1.5", className)}>{children}</div>;
  }

  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      <div>
        {title && <h2 className="font-semibold text-slate-100">{title}</h2>}
        {description && (
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "font-semibold leading-none tracking-tight text-slate-100",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-slate-400", className)}>{children}</p>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("pt-0", className)}>{children}</div>;
}
