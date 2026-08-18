"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/UserMenu";
import { BrandMark } from "./BrandMark";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Practice" },
  { href: "/progress", label: "Progress" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.065] bg-[#08090b]/86 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] w-[min(100%-2rem,78rem)] items-center justify-between gap-5">
        <div className="flex items-center gap-8">
          <BrandMark />
          <nav aria-label="Primary navigation" className="hidden sm:block">
            <ul className="flex items-center gap-1" role="list">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "text-stone-100"
                          : "text-zinc-500 hover:text-zinc-200",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/interview/new"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 text-xs font-semibold text-violet-100 transition hover:border-violet-300/35 hover:bg-violet-300/15"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New rep</span>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
