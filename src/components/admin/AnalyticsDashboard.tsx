"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  Bot,
  Building2,
  Clock,
  Crown,
  Download,
  Eye,
  Flag,
  Gauge,
  Globe,
  GraduationCap,
  Headset,
  Layers,
  Loader2,
  MessageSquare,
  Monitor,
  MousePointerClick,
  Percent,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import type { AnalyticsOverview } from "@/lib/analytics";
import { StatCard } from "./analytics/StatCard";
import {
  AreaChart,
  BarLineChart,
  ChartEmpty,
  HBarList,
  MiniStat,
  Panel,
  compactNumber,
  formatMoney,
  formatNumber,
  type ChartPoint,
} from "./analytics/charts";

interface AnalyticsDashboardProps {
  adminProfileId: number;
}

const RANGES = [
  { days: 7, label: "7 kun" },
  { days: 30, label: "30 kun" },
  { days: 90, label: "90 kun" },
];

/** In-app section ids → readable names (Uzbek, like the sidebar). */
const SCREEN_LABELS: Record<string, string> = {
  landing: "Landing (bosh sahifa)",
  onboarding: "Ro'yxatdan o'tish (wizard)",
  dashboard: "Dashboard",
  universities: "Universitetlar",
  scholarships: "Grantlar",
  tracker: "Ariza trekeri",
  sop: "AI SOP studio",
  tasks: "Vazifalar / Roadmap",
  deadlines: "Dedlayn markazi",
  chat: "AI Mentor chat",
  forum: "Forum",
  courses: "Video kurslar",
  payments: "To'lovlar / Premium",
  rewards: "Mukofotlar",
  consulting: "Konsalting",
  admin: "Admin panel",
};

const screenLabel = (screen: string): string =>
  SCREEN_LABELS[screen] ?? screen.charAt(0).toUpperCase() + screen.slice(1);

const DEVICE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  desktop: { label: "Desktop / Kompyuter", icon: <Monitor className="h-3.5 w-3.5" /> },
  mobile: { label: "Mobil telefon", icon: <Smartphone className="h-3.5 w-3.5" /> },
  tablet: { label: "Planshet", icon: <Tablet className="h-3.5 w-3.5" /> },
  bot: { label: "Bot / krawler", icon: <Bot className="h-3.5 w-3.5" /> },
};

const MONTHS_UZ = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

/** "2026-09-12" → "12.09" (axis) / "12-sentabr" (tooltip). */
function shortDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}
function longDay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}-${MONTHS_UZ[Number(m) - 1] ?? m}, ${y}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daqiqa oldin`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return fmtDateTime(iso);
}

/**
 * Admin analytics dashboard — full platform statistics:
 * traffic (visitors/views), users, revenue, content inventory, engagement and
 * the latest activity. Read-only: it only calls GET /api/admin/analytics.
 */
export function AnalyticsDashboard({ adminProfileId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const load = useCallback(
    async (fresh: boolean) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ adminProfileId: String(adminProfileId), days: String(days) });
        if (fresh) params.set("fresh", "1");
        const res = await fetch(`/api/admin/analytics?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Statistikani yuklab bo'lmadi");
        setData(json as AnalyticsOverview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Statistikani yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    },
    [adminProfileId, days]
  );

  useEffect(() => {
    // Initial load (and whenever the range changes).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, [load]);

  const trafficChart: ChartPoint[] = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        label: shortDay(p.date),
        title: longDay(p.date),
        value: p.views,
        secondary: p.visitors,
      })),
    [data]
  );

  const signupChart: ChartPoint[] = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        label: shortDay(p.date),
        title: longDay(p.date),
        value: p.signups,
      })),
    [data]
  );

  const mainCurrency = data?.revenue.byCurrency[0]?.currency ?? "UZS";
  const t = data?.traffic;
  const u = data?.users;
  const r = data?.revenue;
  const c = data?.content;
  const e = data?.engagement;

  const totals = useMemo(() => {
    const series = data?.series ?? [];
    return {
      views: series.reduce((sum, p) => sum + p.views, 0),
      visitorsPeak: series.reduce((max, p) => Math.max(max, p.visitors), 0),
      bestDay: series.reduce<ChartPoint | null>((best, p) => (!best || p.views > best.value ? { label: shortDay(p.date), title: longDay(p.date), value: p.views } : best), null),
      signups: series.reduce((sum, p) => sum + p.signups, 0),
    };
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [];
    rows.push(["ScholarBridgeAI — Analytics", `${data.range.days} kun`, fmtDateTime(data.range.generatedAt)]);
    rows.push([]);
    rows.push(["Summary", "Value"]);
    rows.push(["Unique visitors", String(data.traffic.visitors)]);
    rows.push(["Views", String(data.traffic.views)]);
    rows.push(["New visitors", String(data.traffic.newVisitors)]);
    rows.push(["Signups (events)", String(data.traffic.signups)]);
    rows.push(["Total users", String(data.users.total)]);
    rows.push(["New users", String(data.users.newInWindow)]);
    rows.push(["Premium users", String(data.users.premium)]);
    rows.push(["Active subscribers", String(data.users.activeSubscribers)]);
    rows.push([`Paid revenue (${mainCurrency})`, String(data.revenue.paidTotalInWindow)]);
    rows.push([]);
    rows.push(["Date", "Views", "Visitors", "New visitors", "Signups"]);
    for (const p of data.series) rows.push([p.date, String(p.views), String(p.visitors), String(p.newVisitors), String(p.signups)]);
    rows.push([]);
    rows.push(["Top page", "Views", "Visitors"]);
    for (const p of data.topPages) rows.push([p.path, String(p.views), String(p.visitors)]);
    rows.push([]);
    rows.push(["Top section", "Views", "Visitors"]);
    for (const s of data.topScreens) rows.push([screenLabel(s.screen), String(s.views), String(s.visitors)]);
    rows.push([]);
    rows.push(["Referrer", "Views", "Visitors"]);
    for (const ref of data.topReferrers) rows.push([ref.referrer, String(ref.views), String(ref.visitors)]);
    rows.push([]);
    rows.push(["Device", "Views", "Visitors"]);
    for (const d of data.devices) rows.push([d.device, String(d.views), String(d.visitors)]);

    const csv = rows
      .map((row) => row.map((cell) => (/[";\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scholarbridge-analytics-${data.range.days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const rangeLabel = `${data?.range.from.slice(0, 10) ?? ""} → ${data?.range.to.slice(0, 10) ?? ""}`;

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------- Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-slate-800">Platform Statistics</h2>
            <p className="text-xs text-slate-500">
              Tashriflar, foydalanuvchilar, to&apos;lovlar va kontent — hammasi bir joyda
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {RANGES.map((range) => (
                <button
                  key={range.days}
                  onClick={() => setDays(range.days)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    days === range.days ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button
              onClick={exportCsv}
              disabled={!data}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="CSV fayl sifatida yuklab olish"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              onClick={() => void load(true)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Yangilash
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {data ? `Davrlar: ${rangeLabel}` : "—"}
          </span>
          {t?.trackingSince ? (
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Kuzatuv {t.trackingSince.slice(0, 10)} dan beri
            </span>
          ) : null}
          {data ? (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Yangilandi: {fmtDateTime(data.range.generatedAt)}
            </span>
          ) : null}
        </div>
      </div>

      {/* -------------------------------------------------------------- Warnings */}
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {!t?.trackingAvailable && !loading ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Tashriflar jadvali (<code className="font-mono">site_visits</code>) hali yaratilmagan — shu sababli visitor
            ko&apos;rsatkichlari 0. Supabase SQL Editor&apos;da <code className="font-mono">supabase/add_analytics.sql</code>{" "}
            faylini ishga tushiring.
          </span>
        </div>
      ) : null}

      {data?.warnings?.length ? (
        <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
          <summary className="cursor-pointer font-bold text-slate-600">
            {data.warnings.length} ta metrika yuklanmadi (batafsil)
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-[10px]">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* ------------------------------------------------------------------ KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Unique visitors"
          uz="Noyob tashriflar (odam soni)"
          value={t?.visitors ?? null}
          delta={t?.visitorsDelta}
          hint={`Bugun: ${formatNumber(t?.visitorsToday ?? 0)} · Kecha: ${formatNumber(t?.visitorsYesterday ?? 0)}`}
          accent="bg-indigo-50 text-indigo-600"
          loading={loading && !data}
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Views"
          uz="Ko'rishlar (sahifa + bo'limlar)"
          value={t?.views ?? null}
          delta={t?.viewsDelta}
          hint={`Bugun: ${formatNumber(t?.viewsToday ?? 0)} · Jami: ${formatNumber(t?.totalViewsAllTime ?? 0)}`}
          accent="bg-sky-50 text-sky-600"
          loading={loading && !data}
        />
        <StatCard
          icon={<UserPlus className="h-5 w-5" />}
          label="New users"
          uz="Yangi ro'yxatdan o'tganlar"
          value={u?.newInWindow ?? null}
          delta={u?.newInWindowDelta}
          hint={`Bugun: ${formatNumber(u?.newToday ?? 0)} · Jami: ${formatNumber(u?.total ?? 0)}`}
          accent="bg-emerald-50 text-emerald-600"
          loading={loading && !data}
        />
        <StatCard
          icon={<Globe className="h-5 w-5" />}
          label="Total users"
          uz="Barcha foydalanuvchilar"
          value={u?.total ?? null}
          delta={u?.totalDelta}
          hint={`Premium: ${formatNumber(u?.premium ?? 0)} · Obuna: ${formatNumber(u?.activeSubscribers ?? 0)}`}
          accent="bg-slate-100 text-slate-700"
          loading={loading && !data}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Crown className="h-5 w-5" />}
          label="Premium users"
          uz="Premium foydalanuvchilar"
          value={u?.premium ?? null}
          hint={`Faol obunalar: ${formatNumber(u?.activeSubscribers ?? 0)}`}
          accent="bg-amber-50 text-amber-600"
          loading={loading && !data}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Revenue"
          uz={`To'lovlar (${mainCurrency})`}
          value={`${compactNumber(r?.paidTotalInWindow ?? 0)} ${mainCurrency}`}
          delta={r?.revenueDelta}
          hint={`${formatNumber(r?.paidInWindow ?? 0)} ta to'lov · Jami: ${compactNumber(r?.paidTotal ?? 0)}`}
          accent="bg-emerald-50 text-emerald-600"
          raw
          loading={loading && !data}
        />
        <StatCard
          icon={<Percent className="h-5 w-5" />}
          label="Conversion"
          uz="Tashrif → ro'yxatdan o'tish"
          value={`${(t?.conversionRate ?? 0).toLocaleString("en-US")}%`}
          hint={`${formatNumber(t?.signups ?? 0)} signup / ${formatNumber(t?.visitors ?? 0)} visitor`}
          accent="bg-violet-50 text-violet-600"
          raw
          loading={loading && !data}
        />
        <StatCard
          icon={<Gauge className="h-5 w-5" />}
          label="Engagement"
          uz="Har bir tashrifchi o'rtacha"
          value={`${(t?.viewsPerVisitor ?? 0).toLocaleString("en-US")} views`}
          hint={`Yangi: ${formatNumber(t?.newVisitors ?? 0)} · Qaytgan: ${formatNumber(t?.returningVisitors ?? 0)}`}
          accent="bg-rose-50 text-rose-600"
          raw
          loading={loading && !data}
        />
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Statistika yuklanmoqda…
        </div>
      ) : null}

      {/* --------------------------------------------------------------- Charts */}
      <Panel
        title={`Traffic — oxirgi ${days} kun`}
        subtitle="Ustunlar: ko'rishlar · Chiziq: noyob tashriflar (har bir ustun ustiga sichqoncha olib borsangiz sana ko'rinadi)"
        action={
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> Views
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Visitors
            </span>
          </div>
        }
      >
        {trafficChart.some((p) => p.value > 0 || (p.secondary ?? 0) > 0) ? (
          <BarLineChart points={trafficChart} />
        ) : (
          <ChartEmpty label="Bu davrda tashriflar qayd etilmagan" />
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Eng yuqori kun" value={totals.bestDay ? `${formatNumber(totals.bestDay.value)} views` : "—"} hint={totals.bestDay?.title} tone="indigo" />
          <MiniStat label="Jami views" value={formatNumber(totals.views)} tone="slate" />
          <MiniStat label="Bugun views" value={formatNumber(t?.viewsToday ?? 0)} hint={`Kecha: ${formatNumber(t?.viewsYesterday ?? 0)}`} tone="emerald" />
          <MiniStat label="Kiritilgan foydalanuvchi" value={formatNumber(t?.signedInVisitors ?? 0)} hint="profil bilan kirganlar" tone="sky" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Signups — yangi foydalanuvchilar"
          subtitle="Har kuni ro'yxatdan o'tganlar soni"
          className="lg:col-span-2"
        >
          {signupChart.some((p) => p.value > 0) ? (
            <AreaChart points={signupChart} />
          ) : (
            <ChartEmpty label="Bu davrda yangi foydalanuvchi yo'q" />
          )}
        </Panel>

        <Panel title="Qurilmalar" subtitle="Tashriflar qaysi qurilmadan">
          {data?.devices.length ? (
            <ul className="space-y-3">
              {data.devices.map((d) => {
                const meta = DEVICE_META[d.device] ?? { label: d.device, icon: <Monitor className="h-3.5 w-3.5" /> };
                const share = t?.views ? Math.round((d.views / t.views) * 100) : 0;
                return (
                  <li key={d.device}>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-slate-400">{meta.icon}</span>
                        {meta.label}
                      </span>
                      <span className="text-slate-900">{share}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(2, share)}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                      {formatNumber(d.views)} views · {formatNumber(d.visitors)} visitors
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ChartEmpty label="Ma'lumot yo'q" />
          )}
        </Panel>
      </div>

      {/* ------------------------------------------------------ Where they look */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top bo'limlar" subtitle="Foydalanuvchilar qaysi bo'limga ko'p kirgan">
          <HBarList
            items={(data?.topScreens ?? []).map((s) => ({ label: screenLabel(s.screen), value: s.views, hint: `· ${formatNumber(s.visitors)} odam` }))}
            color="bg-violet-500"
            emptyLabel="Hozircha bo'lim tashriflari yo'q"
          />
        </Panel>
        <Panel title="Top sahifalar" subtitle="URL bo'yicha kirishlar">
          <HBarList
            items={(data?.topPages ?? []).map((p) => ({ label: p.path, value: p.views, hint: `· ${formatNumber(p.visitors)} odam` }))}
            emptyLabel="Hozircha sahifa tashriflari yo'q"
          />
        </Panel>
        <Panel title="Qayerdan kelgan" subtitle="Trafik manbalari (referrer)">
          <HBarList
            items={(data?.topReferrers ?? []).map((ref) => ({
              label: ref.referrer === "direct" ? "Direct / havola orqali" : ref.referrer === "internal" ? "Sayt ichidan" : ref.referrer,
              value: ref.views,
              hint: `· ${formatNumber(ref.visitors)} odam`,
            }))}
            color="bg-emerald-500"
            emptyLabel="Manbalar hali qayd etilmagan"
          />
        </Panel>
      </div>

      {/* ------------------------------------------------------- Users & money */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Foydalanuvchilar"
          subtitle="Registratsiya, onboarding va premium holati"
          action={<Users className="h-4 w-4 text-slate-300" />}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniStat label="Jami" value={formatNumber(u?.total ?? 0)} tone="indigo" />
            <MiniStat label={`Yangi (${days} kun)`} value={formatNumber(u?.newInWindow ?? 0)} hint={`oldingi: ${formatNumber(u?.prevNewInWindow ?? 0)}`} tone="emerald" />
            <MiniStat label="Shu oyda" value={formatNumber(u?.newThisMonth ?? 0)} tone="emerald" />
            <MiniStat label="Bugun" value={formatNumber(u?.newToday ?? 0)} hint={`kecha: ${formatNumber(u?.newYesterday ?? 0)}`} tone="slate" />
            <MiniStat label="Premium" value={formatNumber(u?.premium ?? 0)} tone="amber" />
            <MiniStat label="Faol obuna" value={formatNumber(u?.activeSubscribers ?? 0)} tone="amber" />
            <MiniStat label="Onboarding tugagan" value={formatNumber(u?.onboardingCompleted ?? 0)} hint={`${u?.total ? Math.round(((u?.onboardingCompleted ?? 0) / u.total) * 100) : 0}%`} tone="sky" />
            <MiniStat label="Onboarding boshlagan" value={formatNumber(u?.onboardingStarted ?? 0)} tone="sky" />
            <MiniStat label="Referral orqali" value={formatNumber(u?.referredUsers ?? 0)} tone="violet" />
            <MiniStat label="Saqlangan tanlovlar" value={formatNumber(u?.usersWithSavedItems ?? 0)} hint="universitet saqlaganlar" tone="slate" />
            <MiniStat label="Adminlar" value={formatNumber(u?.admins ?? 0)} tone="slate" />
            <MiniStat label="Qaytgan tashriflar" value={formatNumber(t?.returningVisitors ?? 0)} tone="indigo" />
          </div>
          {u?.byLocale.length ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Til bo&apos;yicha</p>
              <div className="flex flex-wrap gap-2">
                {u.byLocale.map((l) => (
                  <span key={l.locale} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                    {l.locale.toUpperCase()} · {formatNumber(l.count)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel title="To'lovlar va obuna" subtitle="Daromad, providerlar va valyutalar" action={<Wallet className="h-4 w-4 text-slate-300" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniStat label={`Daromad (${days} kun)`} value={compactNumber(r?.paidTotalInWindow ?? 0)} hint={mainCurrency} tone="emerald" />
            <MiniStat label="Jami daromad" value={compactNumber(r?.paidTotal ?? 0)} hint={`${formatNumber(r?.paidCount ?? 0)} to'lov`} tone="emerald" />
            <MiniStat label="O'rtacha chek" value={compactNumber(r?.avgPayment ?? 0)} hint={mainCurrency} tone="slate" />
            <MiniStat label="Kutilmoqda" value={formatNumber(r?.pendingCount ?? 0)} hint="pending to'lovlar" tone="amber" />
            <MiniStat label="Bekor qilingan" value={formatNumber(r?.cancelledCount ?? 0)} tone="rose" />
            <MiniStat label="Qaytarilgan" value={formatNumber(r?.refundedCount ?? 0)} tone="rose" />
            <MiniStat label="Obunalar" value={formatNumber(r?.subscriptionCount ?? 0)} tone="indigo" />
            <MiniStat label="7 kunda tugaydi" value={formatNumber(r?.expiringSoon ?? 0)} hint="yangilash kerak" tone="amber" />
            <MiniStat label="AI xarajati" value={`$${(e?.aiCost ?? 0).toLocaleString("en-US")}`} hint={`${formatNumber(e?.aiRequests ?? 0)} so'rov`} tone="sky" />
          </div>
          {r?.byProvider.length || r?.byCurrency.length ? (
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Provider</p>
                <ul className="space-y-1">
                  {(r?.byProvider ?? []).map((p) => (
                    <li key={p.provider} className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span className="capitalize">{p.provider}</span>
                      <span>{formatMoney(p.total, mainCurrency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Valyuta</p>
                <ul className="space-y-1">
                  {(r?.byCurrency ?? []).map((cur) => (
                    <li key={cur.currency} className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>{cur.currency}</span>
                      <span>
                        {formatNumber(cur.count)} · {compactNumber(cur.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      {/* ------------------------------------------------- Content & engagement */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Kontent inventari" subtitle="Bazada qancha ma'lumot bor" action={<Layers className="h-4 w-4 text-slate-300" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniStat label="Universitetlar" value={formatNumber(c?.universities ?? 0)} hint={`${formatNumber(c?.countries ?? 0)} davlat`} tone="indigo" />
            <MiniStat label="Dasturlar (programs)" value={formatNumber(c?.programs ?? 0)} tone="indigo" />
            <MiniStat label="Grantlar" value={formatNumber(c?.scholarships ?? 0)} hint={`${formatNumber(c?.openScholarships ?? 0)} ochiq`} tone="emerald" />
            <MiniStat label="30 kundagi dedlayn" value={formatNumber(c?.deadlinesSoon ?? 0)} tone="amber" />
            <MiniStat label="Kurslar" value={formatNumber(c?.courses ?? 0)} hint={`${formatNumber(c?.lessons ?? 0)} dars`} tone="sky" />
            <MiniStat label="O'qituvchilar" value={formatNumber(c?.instructors ?? 0)} tone="sky" />
            <MiniStat label="Forum mavzulari" value={formatNumber(c?.forumThreads ?? 0)} hint={`${formatNumber(c?.forumReplies ?? 0)} javob`} tone="violet" />
            <MiniStat label="Konsalting so'rovlari" value={formatNumber(c?.consultingRequests ?? 0)} hint={`${formatNumber(c?.newConsulting ?? 0)} yangi`} tone="rose" />
            <MiniStat label="Saqlangan universitet" value={formatNumber(c?.savedUniversities ?? 0)} tone="slate" />
          </div>
          {c?.topCountries.length ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Top davlatlar (universitetlar)</p>
              <HBarList
                items={c.topCountries.map((tc) => ({ label: tc.country, value: tc.count }))}
                color="bg-sky-500"
                valueLabel="ta"
              />
            </div>
          ) : null}
        </Panel>

        <Panel title="Faollik (engagement)" subtitle="AI, kurslar, gamifikatsiya va tizim holati" action={<Zap className="h-4 w-4 text-slate-300" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniStat label={`AI so'rovlari (${days} kun)`} value={formatNumber(e?.aiRequestsInWindow ?? 0)} hint={`jami: ${formatNumber(e?.aiRequests ?? 0)}`} tone="violet" />
            <MiniStat label="AI foydalanuvchilari" value={formatNumber(e?.aiUsers ?? 0)} tone="violet" />
            <MiniStat label="AI xatolari" value={formatNumber(e?.aiFailures ?? 0)} tone={e?.aiFailures ? "rose" : "slate"} />
            <MiniStat label="Tokenlar" value={compactNumber((e?.aiPromptTokens ?? 0) + (e?.aiCompletionTokens ?? 0))} hint="prompt + completion" tone="sky" />
            <MiniStat label="Kursga yozilgan" value={formatNumber(e?.enrollments ?? 0)} hint={`${formatNumber(e?.enrolledUsers ?? 0)} foydalanuvchi`} tone="indigo" />
            <MiniStat label="Kurs tugallagan" value={formatNumber(e?.courseCompletions ?? 0)} tone="emerald" />
            <MiniStat label="Sertifikatlar" value={formatNumber(e?.certificates ?? 0)} tone="emerald" />
            <MiniStat label="Quiz urinishlari" value={formatNumber(e?.quizAttempts ?? 0)} hint={`${formatNumber(e?.quizPassed ?? 0)} muvaffaqiyatli`} tone="amber" />
            <MiniStat label="Ballar berilgan" value={compactNumber(e?.pointsAwarded ?? 0)} tone="amber" />
            <MiniStat label="Badge'lar" value={formatNumber(e?.badgesAwarded ?? 0)} hint={`${formatNumber(e?.badgeKinds ?? 0)} xil`} tone="rose" />
            <MiniStat label="Referrallar" value={formatNumber(e?.referralsTotal ?? 0)} hint={`${formatNumber(e?.referralsCompleted ?? 0)} yakunlangan`} tone="violet" />
            <MiniStat label="Bildirishnomalar" value={formatNumber(e?.notifications ?? 0)} tone="slate" />
          </div>
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">AI vazifalari</p>
              {e?.aiByTask.length ? (
                <ul className="space-y-1">
                  {e.aiByTask.map((task) => (
                    <li key={task.taskType} className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span className="truncate">{task.taskType}</span>
                      <span className="ml-2 shrink-0">{formatNumber(task.count)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400">AI so&apos;rovlari hali qayd etilmagan</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Tizim holati</p>
              <ul className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Refresh jobs
                  </span>
                  <span>{formatNumber(e?.refreshJobs ?? 0)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertCircle className={`h-3.5 w-3.5 ${e?.failedRefreshJobs ? "text-rose-500" : "text-slate-300"}`} /> Muvaffaqiyatsiz
                  </span>
                  <span>{formatNumber(e?.failedRefreshJobs ?? 0)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> Oxirgi refresh
                  </span>
                  <span>{e?.lastRefreshAt ? timeAgo(e.lastRefreshAt) : "—"}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-amber-500" /> Ochiq shikoyatlar
                  </span>
                  <span>{formatNumber(c?.openReports ?? 0)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-slate-400" /> Tekshirilmagan ma&apos;lumot
                  </span>
                  <span>{formatNumber((c?.unverifiedUniversities ?? 0) + (c?.unverifiedScholarships ?? 0))}</span>
                </li>
              </ul>
            </div>
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------- Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="So'nggi ro'yxatdan o'tganlar" subtitle="Eng yangi foydalanuvchilar" action={<UserPlus className="h-4 w-4 text-slate-300" />}>
          {data?.recentSignups.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recentSignups.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[11px] font-extrabold text-emerald-600">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {s.name}
                      {s.isPremium ? <Crown className="ml-1 inline h-3 w-3 text-amber-500" /> : null}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{s.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{s.locale}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{timeAgo(s.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ChartEmpty label="Hozircha foydalanuvchi yo'q" />
          )}
        </Panel>

        <Panel title="So'nggi tashriflar" subtitle="Real vaqtdagi harakat (anonim)" action={<MousePointerClick className="h-4 w-4 text-slate-300" />}>
          {data?.recentVisits.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recentVisits.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {DEVICE_META[v.device]?.icon ?? <Eye className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {v.screen ? screenLabel(v.screen) : v.path}
                      {v.profileId ? <span className="ml-1 text-[10px] font-bold text-emerald-600">· profil #{v.profileId}</span> : null}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {v.path} · {v.referrer === "direct" ? "direct" : v.referrer ?? "—"} · <span className="font-mono">{v.visitorId}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">{timeAgo(v.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ChartEmpty label="Tashriflar hali qayd etilmagan — saytga kirib ko'ring" />
          )}
        </Panel>
      </div>

      {/* ------------------------------------------------------------ Funnel row */}
      <Panel title="Funnel — tashrifdan foydalanuvchigacha" subtitle={`${days} kunlik kesim`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Tashriflar (views)", value: t?.views ?? 0, icon: <Eye className="h-4 w-4" />, tone: "text-sky-600 bg-sky-50" },
            { label: "Noyob odam", value: t?.visitors ?? 0, icon: <Users className="h-4 w-4" />, tone: "text-indigo-600 bg-indigo-50" },
            { label: "Onboarding boshlagan", value: u?.onboardingStarted ?? 0, icon: <Sparkles className="h-4 w-4" />, tone: "text-violet-600 bg-violet-50" },
            { label: "Ro'yxatdan o'tgan", value: u?.newInWindow ?? 0, icon: <UserPlus className="h-4 w-4" />, tone: "text-emerald-600 bg-emerald-50" },
            { label: "Premium / to'lagan", value: (u?.premium ?? 0) + (r?.paidInWindow ?? 0), icon: <Crown className="h-4 w-4" />, tone: "text-amber-600 bg-amber-50" },
          ].map((step, idx, arr) => (
            <div key={step.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${step.tone}`}>{step.icon}</div>
              <p className="text-xl font-extrabold leading-none text-slate-900">{formatNumber(step.value)}</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{step.label}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                {idx === 0
                  ? "100%"
                  : `${arr[0].value ? Math.round((step.value / arr[0].value) * 100) : 0}% konversiya`}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ---------------------------------------------------------- Icon legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] font-semibold text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3 w-3" /> Universitetlar: {formatNumber(c?.universities ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Award className="h-3 w-3" /> Grantlar: {formatNumber(c?.scholarships ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Video className="h-3 w-3" /> Kurslar: {formatNumber(c?.courses ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3 w-3" /> Darslar: {formatNumber(c?.lessons ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> Forum: {formatNumber(c?.forumThreads ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Headset className="h-3 w-3" /> Konsalting: {formatNumber(c?.consultingRequests ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Bot className="h-3 w-3" /> AI: {formatNumber(e?.aiRequests ?? 0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> Jami views: {formatNumber(t?.totalViewsAllTime ?? 0)}
        </span>
      </div>
    </div>
  );
}
