"use client";

import React, { useEffect, useState } from "react";
import {
  Gift,
  Copy,
  Check,
  Link2,
  Crown,
  Users,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { absolutizeLink } from "@/lib/clientUrl";

interface ReferralProgramCardProps {
  activeProfile: StudentProfile;
}

/**
 * The reward rules come from the SERVER (`/api/referral` → `rules`), which
 * reads them from app_config. They used to be constants here (`MILESTONE = 5`,
 * "every 5 friends → +30 days") while the engine used its own hardcoded 5 — so
 * the moment an admin changed the setting the card would have lied.
 */
interface ReferralRules {
  premiumMultiple: number;
  premiumDays: number;
  referrerPoints: number;
  referredPoints: number;
  activationCompleteness: number;
}

interface ReferralStatus {
  code: string;
  link: string;
  referralPoints: number;
  nextMilestone: number;
  toNextGrant: number;
  rules: ReferralRules;
  isPremium: boolean;
  premiumUntil: string | null;
  referredBy: number | null;
  referredUsers: {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    completeness: number;
  }[];
}

export function ReferralProgramCard({ activeProfile }: ReferralProgramCardProps) {
  const t = useTranslations("rewards");
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/referral?profileId=${activeProfile.id}`);
        const data = await res.json();
        if (!cancelled && res.ok && data.code) setStatus({ ...data, link: absolutizeLink(String(data.link ?? "")) });
      } catch (err) {
        console.error("Failed to load referral status:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile.id]);

  const copy = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.link);
    } catch {
      const el = document.createElement("textarea");
      el.value = status.link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("refLoading")}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-xs text-slate-500">
        {t("refLoadFailed")}
      </div>
    );
  }

  const rules = status.rules;
  const progressPct = Math.min(
    100,
    Math.round(((status.referralPoints % rules.premiumMultiple) / rules.premiumMultiple) * 100)
  );
  const toNext = status.toNextGrant;
  const activeCount = status.referredUsers.filter((u) => u.isActive).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold">{t("refTitle")}</h3>
            <p className="text-[11px] text-white/80">{t("refSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Premium badge */}
        {status.isPremium && status.premiumUntil ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <Crown className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-700">
              {t("refPremiumActive", { date: new Date(status.premiumUntil).toLocaleDateString() })}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Crown className="h-4 w-4 text-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-500">
              {t("refToNext", { count: toNext })}
            </p>
          </div>
        )}

        {/* Points + progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-slate-700">
              {t("refProgressLabel", { points: status.referralPoints })}
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              {t("refActiveCount", { count: activeCount })}
            </p>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {t("refRule", { multiple: rules.premiumMultiple, days: rules.premiumDays })}
          </p>
        </div>

        {/* Referral link */}
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">
            {t("refYourLink")}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-mono text-[11px] font-bold text-slate-700">
                {status.link}
              </span>
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {t("refHow")}
          </p>
        </div>

        {/* Referred users */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              {t("refInvited", { count: status.referredUsers.length })}
            </p>
          </div>
          {status.referredUsers.length === 0 ? (
            <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-3">
              {t("refNone")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {status.referredUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-700">{u.name}</p>
                    <p className="truncate text-[10px] text-slate-400">{u.email}</p>
                  </div>
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Check className="h-3 w-3" /> {t("refStatusActive")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {t("refStatusPending")} · {u.completeness}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
