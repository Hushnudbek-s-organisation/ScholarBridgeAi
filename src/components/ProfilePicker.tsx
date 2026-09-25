"use client";

import React, { useState } from "react";
import { ShieldCheck, X, LogIn, Loader2, Plus } from "lucide-react";
import { StudentProfile } from "./Navbar";

interface ProfilePickerProps {
  open: boolean;
  /** Only the profiles THIS browser created / signed in with. */
  deviceProfiles: StudentProfile[];
  currentId: number | null;
  onClose: () => void;
  onSelect: (profile: StudentProfile) => void;
  onAddNew: () => void;
}

/**
 * Sign-in window. Shows only accounts used on this device and the standard
 * email + password sign-in form, which works for both students and admins.
 */
export function ProfilePicker({
  open,
  deviceProfiles,
  currentId,
  onClose,
  onSelect,
  onAddNew,
}: ProfilePickerProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setSignInError("Enter both email and password");
      return;
    }

    setSignInBusy(true);
    setSignInError("");
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Sign-in failed");
      }
      onSelect(data.profile as StudentProfile);
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSignInBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold">Sign in</h2>
            <p className="text-xs text-indigo-100 mt-0.5">
              Your accounts on this device — private and secure
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-5">
          {/* ===== Accounts used on THIS device ===== */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
              My accounts on this device ({deviceProfiles.length})
            </p>
            {deviceProfiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
                <p className="text-xs text-slate-400">
                  No accounts on this device yet — create one or sign in below.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {deviceProfiles.map((p) => {
                  const isCurrent = p.id === currentId;
                  const isAdmin = !!p.isAdmin;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelect(p)}
                      disabled={isCurrent}
                      className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        isCurrent
                          ? "border-indigo-300 bg-indigo-50/60 cursor-default"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
                      }`}
                    >
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
                          isAdmin ? "bg-slate-900 text-amber-300" : "bg-indigo-100 text-indigo-600"
                        }`}
                      >
                        {p.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-slate-800">{p.name}</span>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0">
                              <ShieldCheck className="h-2.5 w-2.5 text-amber-300" /> ADMIN
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-400">
                          {p.email} · {p.targetMajor}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-indigo-600 shrink-0">ACTIVE</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== Email + password sign-in (any device; students and admins) ===== */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <LogIn className="h-3.5 w-3.5 text-indigo-500" />
              <p className="text-xs font-extrabold text-slate-800">My account</p>
              <span className="inline-flex items-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white ml-auto">
                ANY DEVICE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Sign in with the email + password you chose when creating the
              account — works even from a new phone or browser.
            </p>

            <form onSubmit={handleSignIn} className="space-y-2.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="email"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="current-password"
                required
              />
              {signInError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {signInError}
                </div>
              )}
              <button
                type="submit"
                disabled={signInBusy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {signInBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                Sign in
              </button>
            </form>
          </div>

          <button
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Create a new account
          </button>
        </div>
      </div>
    </div>
  );
}
