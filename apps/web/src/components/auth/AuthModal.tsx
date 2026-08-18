"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";

export function AuthModal() {
  const { isAuthModalOpen, authModalView, closeAuthModal, openAuthModal } =
    useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const isSignUp = authModalView === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          setSuccessMsg("Account created and logged in successfully!");
          setTimeout(() => {
            closeAuthModal();
          }, 1200);
        } else {
          setSuccessMsg(
            "Account created! Please check your email inbox to confirm your registration or sign in.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        setSuccessMsg("Welcome back! Signed in successfully.");
        setTimeout(() => {
          closeAuthModal();
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header background accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          aria-label="Close auth dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
              APTLY Cloud Workspace
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isSignUp ? "Create Your Account" : "Sign In to APTLY"}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {isSignUp
              ? "Practice realistic role interviews and save your progress."
              : "Access your interview history, speech scores, and coaching drills."}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            </div>
            {isSignUp && (
              <span className="text-[11px] text-zinc-500 mt-1 block">
                At least 6 characters required
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch mode footer */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col items-center gap-3">
          <div className="text-xs text-zinc-400">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <button
              type="button"
              onClick={() => openAuthModal(isSignUp ? "login" : "signup")}
              className="text-emerald-400 hover:text-emerald-300 font-medium ml-1 transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up free"}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
            <span>Encrypted with Supabase Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}
