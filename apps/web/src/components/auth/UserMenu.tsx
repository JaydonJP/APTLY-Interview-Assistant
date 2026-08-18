"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  LayoutDashboard,
  History,
  Shield,
} from "lucide-react";
import { useAuth } from "./AuthContext";

export function UserMenu() {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-800/50" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => openAuthModal("login")}
          className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => openAuthModal("signup")}
          className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sign Up</span>
        </button>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Candidate";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
          {initials || <UserIcon className="w-3.5 h-3.5" />}
        </div>
        <span className="max-w-[120px] truncate font-medium text-zinc-200 hidden sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info banner */}
          <div className="px-4 py-3 border-b border-zinc-800/60">
            <p className="text-xs font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {user.email}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                Supabase Authenticated
              </span>
            </div>
          </div>

          {/* Menu links */}
          <div className="py-1.5 px-1.5 space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-900/90 transition-colors"
            >
              <History className="w-4 h-4 text-zinc-400" />
              <span>Practice History</span>
            </Link>
          </div>

          {/* Sign out */}
          <div className="pt-1 px-1.5 border-t border-zinc-800/60">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
