"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { Lock, Crown } from "lucide-react";
import type { FeatureKey } from "@/lib/entitlements";

interface PremiumGateProps {
  profileId: number | null;
  /** The entitlement this section needs — the same key its APIs check with premiumGate. */
  feature: FeatureKey;
  title?: string;
  description?: string;
  onUpgrade: () => void;
  children: ReactNode;
}

/**
 * Wraps a premium-only section. Access comes from /api/premium/status, which
 * answers per feature with the same rule the APIs enforce server-side (plan,
 * admin role and the admin's feature_<name> overrides). When locked, the
 * section is NOT mounted: its APIs would refuse a free account anyway, and a
 * blurred copy of the real section only invites a DevTools "unlock".
 */
export function PremiumGate({ profileId, feature, title, description, onUpgrade, children }: PremiumGateProps) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setIsPremium(false);
      return;
    }
    fetch(`/api/premium/status?profileId=${profileId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const allowed = data?.features?.[feature];
        setIsPremium(typeof allowed === "boolean" ? allowed : !!data?.isPremium);
      })
      .catch(() => {
        if (!cancelled) setIsPremium(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, feature]);

  if (isPremium === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs font-semibold text-slate-400 shadow-xs">
        Checking premium access…
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none min-h-[420px] rounded-2xl border border-slate-200 bg-white p-6 space-y-4 opacity-40">
        <div className="h-6 w-1/3 rounded-lg bg-slate-200" />
        <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-xl bg-slate-100" />
          <div className="h-28 rounded-xl bg-slate-100" />
        </div>
        <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
        <div className="h-4 w-3/5 rounded-lg bg-slate-100" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur rounded-3xl border border-amber-300 shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {title || "This is Premium"}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {description || "You need an active Premium subscription to access this section."}
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-xl shadow-md transition-all"
          >
            Pro ga o&apos;tish
          </button>
          <p className="text-[11px] text-slate-400">
            SOP AI, cheksiz saqlash, viza mashqi, ota-ona paneli, to&apos;liq kurslar
          </p>
        </div>
      </div>
    </div>
  );
}
