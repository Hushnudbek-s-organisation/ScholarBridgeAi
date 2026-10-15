"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Lock, Crown } from "lucide-react";
import type { FeatureKey } from "@/lib/entitlements";
import { useAdminMode } from "@/components/AdminModeContext";

interface PremiumGateProps {
  profileId: number | null;
  /** The entitlement this section needs — the same key its APIs check with premiumGate. */
  feature: FeatureKey;
  title?: string;
  description?: string;
  onUpgrade: () => void;
  children?: ReactNode;
  /**
   * Pillar 8 — an admin session is never gated. When true the children render
   * immediately: no fetch, no "checking" flash, no lock overlay, so the
   * operator can inspect every section of their own product.
   */
  isAdmin?: boolean;
}

/**
 * Key the stateful gate by profile + feature so a profile switch cannot reuse
 * old access. Admin mode (Pillar 8) short-circuits the gate entirely: the
 * operator sees the section with no fetch and no lock overlay, while
 * "Preview as Free/Pro" re-enables the normal behaviour.
 */
export function PremiumGate(props: PremiumGateProps) {
  const { unlocked } = useAdminMode();
  if (props.isAdmin || unlocked) return <>{props.children}</>;
  return <FeatureGateContent key={`${props.profileId ?? "none"}:${props.feature}`} {...props} />;
}

/**
 * Access comes from /api/premium/status, which answers per feature with the
 * same rule the APIs enforce server-side (plan, admin role and the admin's
 * feature_<name> overrides). When locked, the section is NOT mounted: its APIs
 * would refuse a free account anyway, and a blurred copy of the real section
 * only invites a DevTools "unlock".
 */
function FeatureGateContent({ profileId, feature, title, description, onUpgrade, children }: PremiumGateProps) {
  const t = useTranslations("premiumGate");
  const [isPremium, setIsPremium] = useState<boolean | null>(profileId ? null : false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    fetch(`/api/premium/status?profileId=${profileId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        // Unknown/missing feature data fails closed; the server remains the source of truth.
        // `plan === "admin"` unlocks even before the per-feature map is read,
        // so an admin session can never be shown a lock overlay.
        setIsPremium(data?.plan === "admin" || data?.features?.[feature] === true);
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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-700 shadow-xs" role="status" aria-live="polite">
        {t("checking")}
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none min-h-[420px] select-none space-y-4 rounded-2xl border border-slate-200 bg-white p-6 opacity-40">
        <div className="h-6 w-1/3 rounded-lg bg-slate-200" />
        <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-xl bg-slate-100" />
          <div className="h-28 rounded-xl bg-slate-100" />
        </div>
        <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
        <div className="h-4 w-3/5 rounded-lg bg-slate-100" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-amber-300 bg-white/95 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
            <Lock className="h-8 w-8 text-white sb-ink-on-warm" aria-hidden="true" />
          </div>
          <div>
            <h2 className="flex items-center justify-center gap-2 text-xl font-extrabold text-slate-900">
              <Crown className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              {title || t("title")}
            </h2>
            <p className="mt-2 break-words text-sm text-slate-700">{description || t("description")}</p>
          </div>
          <button
            type="button"
            onClick={onUpgrade}
            className="min-h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 font-bold text-slate-950 sb-ink-on-warm shadow-md transition-colors hover:from-amber-600 hover:to-yellow-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            {t("viewPlans")}
          </button>
          <p className="break-words text-xs text-slate-600">{t("accessNote")}</p>
        </div>
      </div>
    </div>
  );
}
