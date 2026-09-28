"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Compass,
  Crown,
  Flag,
  Headset,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

interface Overview {
  people: { users: number | null; newUsers: number | null; premium: number | null };
  attention: { pendingStories: number | null; openReports: number | null; newConsulting: number | null; unverifiedUnis: number | null; unverifiedSchs: number | null };
  catalog: { universities: number | null; scholarships: number | null; opportunities: number | null; stories: number | null };
  growth: { activeGoals: number | null; answers: number | null; appliedSch: number | null; checklistTicks: number | null };
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));

/**
 * Admin home: "what needs me today" first (moderation queues with a direct
 * button), then headline numbers. Every tile links to the section that
 * handles it, so the owner never has to hunt through tabs.
 */
export function AdminOverview({ onOpen }: { onOpen: (section: string) => void }) {
  const t = useTranslations("admin");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (error) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
        {error}
        <button onClick={() => void load()} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 font-bold">
          {t("retry")}
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </p>
    );
  }

  const attention = [
    { id: "stories", n: data.attention.pendingStories, label: t("attStories"), icon: MessageSquareQuote },
    { id: "reports", n: data.attention.openReports, label: t("attReports"), icon: Flag },
    { id: "consulting", n: data.attention.newConsulting, label: t("attConsulting"), icon: Headset },
    { id: "verify", n: (data.attention.unverifiedUnis ?? 0) + (data.attention.unverifiedSchs ?? 0), label: t("attVerify"), icon: BadgeCheck },
  ];
  const pending = attention.filter((a) => (a.n ?? 0) > 0);

  const tile = (label: string, value: number | null, Icon: React.ComponentType<{ className?: string }>, section?: string, tone = "text-slate-900") => (
    <button
      key={label}
      onClick={section ? () => onOpen(section) : undefined}
      disabled={!section}
      className="group rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors enabled:hover:border-indigo-200 enabled:hover:bg-indigo-50/40 sm:p-4"
    >
      <span className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-300 group-enabled:group-hover:text-indigo-400" />
      </span>
      <span className={`mt-1 block text-2xl font-black ${tone}`}>{fmt(value)}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> {t("needsAttention")}
          </h3>
          <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100">
            <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {t("allClear")}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {pending.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => onOpen(a.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-semibold text-amber-900">
                      <b className="text-lg font-black">{fmt(a.n)}</b> {a.label}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-extrabold text-slate-900">{t("people")}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tile(t("users"), data.people.users, Users, "analytics")}
          {tile(t("newUsers"), data.people.newUsers, UserPlus, "analytics", "text-indigo-600")}
          {tile(t("premiumUsers"), data.people.premium, Crown, "premium", "text-amber-600")}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-extrabold text-slate-900">{t("catalog")}</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tile(t("universities"), data.catalog.universities, Building2, "universities")}
          {tile(t("scholarships"), data.catalog.scholarships, Award, "scholarships")}
          {tile(t("opportunities"), data.catalog.opportunities, Compass, "opportunities")}
          {tile(t("storiesLive"), data.catalog.stories, MessageSquareQuote, "stories")}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
          <Sparkles className="h-4 w-4 text-violet-500" /> {t("growthUsage")}
        </h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tile(t("activeGoals"), data.growth.activeGoals, Flag, "goalLibrary", "text-amber-600")}
          {tile(t("vaultAnswers"), data.growth.answers, MessageSquareQuote, "vaultPrompts", "text-sky-600")}
          {tile(t("appliedSch"), data.growth.appliedSch, Award, "scholarships", "text-emerald-600")}
          {tile(t("checklistTicks"), data.growth.checklistTicks, CheckCircle2, "checklist", "text-violet-600")}
        </div>
      </section>
    </div>
  );
}
