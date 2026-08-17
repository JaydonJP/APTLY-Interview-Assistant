/**
 * APTLY — Navbar Component
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart2, Home, PlusCircle, ShieldCheck } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/interview/new", label: "New Interview", icon: PlusCircle },
  { href: "/progress", label: "Progress", icon: BarChart2 },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#080a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-[82rem] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 font-bold tracking-tight transition-opacity hover:opacity-80"
          aria-label="APTLY — home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-400/15 text-xs text-violet-100 shadow-[0_0_1.5rem_rgba(139,124,255,0.2)]">A</span>
          <span className="text-sm tracking-[0.2em] text-slate-100">APTLY</span>
        </Link>

        {/* Navigation */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-1" role="list">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  id={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname?.startsWith(href)
                      ? "bg-white/8 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                  aria-current={pathname?.startsWith(href) ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Private by design</span>
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
