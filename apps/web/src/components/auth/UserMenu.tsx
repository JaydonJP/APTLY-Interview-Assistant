"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  History,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "./AuthContext";

export function UserMenu() {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.05]" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="min-h-9 rounded-lg px-3 text-xs font-medium text-zinc-500 transition hover:text-zinc-200"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => openAuthModal("signup")}
          className="hidden min-h-9 rounded-lg border border-white/[0.09] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/[0.16] sm:block"
        >
          Create account
        </button>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Candidate";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 text-xs text-zinc-400 transition hover:border-white/[0.14] hover:text-zinc-200"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.07] text-[0.6rem] font-semibold text-zinc-300">
          {initials || <User className="h-3 w-3" />}
        </span>
        <span className="hidden max-w-24 truncate sm:block">{displayName}</span>
        <ChevronDown className={`h-3 w-3 text-zinc-600 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.09] bg-[#0d0f13] p-1.5 shadow-[0_1.5rem_5rem_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-white/[0.065] px-3 py-3">
            <p className="truncate text-xs font-medium text-zinc-200">{displayName}</p>
            <p className="mt-1 truncate text-[0.68rem] text-zinc-600">{user.email}</p>
          </div>
          <div className="py-1.5">
            <MenuLink href="/dashboard" icon={<User className="h-3.5 w-3.5" />} onClick={() => setOpen(false)}>
              Practice
            </MenuLink>
            <MenuLink href="/progress" icon={<BarChart3 className="h-3.5 w-3.5" />} onClick={() => setOpen(false)}>
              Progress
            </MenuLink>
            <MenuLink href="/history" icon={<History className="h-3.5 w-3.5" />} onClick={() => setOpen(false)}>
              Session history
            </MenuLink>
          </div>
          <div className="border-t border-white/[0.065] pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-zinc-600 transition hover:bg-red-300/[0.05] hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/[0.035] hover:text-zinc-200"
    >
      {icon}
      {children}
    </Link>
  );
}
