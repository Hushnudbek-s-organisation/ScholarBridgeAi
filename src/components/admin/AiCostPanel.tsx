"use client";

/**
 * Admin → AI → Cost, budgets & quotas.
 *
 *  - Spend report: known USD vs. requests without a price (never shown as $0),
 *    per provider and task, unpriced models in use, error categories.
 *  - Budgets: platform daily / monthly USD, per-provider daily caps, warning %.
 *  - Model prices: the admin enters USD per 1M tokens. Nothing is shipped.
 *  - Quotas and voice: per-plan request/token allowances and Live sessions,
 *    the Live kill switch and the session cap.
 *
 * Every save goes through PUT /api/admin/config, which validates the value on
 * the server (lib/configPortability). The client checks only to give quicker
 * feedback; the server's message is what the admin sees when it rejects.
 */
import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";

interface ConfigRow {
  key: string;
  value: string;
  description?: string | null;
}

interface CostReport {
  windowDays: number;
  generatedAt: string;
  totals: {
    requests: number;
    failed: number;
    fallbacks: number;
    retried: number;
    promptTokens: number;
    cachedPromptTokens: number;
    completionTokens: number;
    knownCostUsd: number;
    unknownCostRequests: number;
    knownCostCoveragePct: number | null;
  };
  byProvider: { provider: string; requests: number; failed: number; knownCostUsd: number; unknownCostRequests: number }[];
  byTask: { task: string; requests: number; failed: number; knownCostUsd: number }[];
  unpricedModels: { provider: string; model: string; requests: number }[];
  errors: { category: string; requests: number }[];
  budget: {
    limits: { dailyUsd: number | null; monthlyUsd: number | null; providerDailyUsd: Record<string, number>; warnPercent: number };
    spend: { dayUsd: number; monthUsd: number; dayByProviderUsd: Record<string, number> };
    usage: {
      daily: { spendUsd: number; limitUsd: number | null; percent: number | null };
      monthly: { spendUsd: number; limitUsd: number | null; percent: number | null };
    };
  };
}

const QUOTA_FIELDS: { key: string; label: string; hint: string; max: number }[] = [
  { key: "ai_free_requests_per_day", label: "Free — AI requests / day", hint: "0 = no AI on the free plan", max: 100000 },
  { key: "ai_free_tokens_per_day", label: "Free — tokens / day", hint: "Prompt + completion tokens", max: 100000000 },
  { key: "ai_premium_requests_per_day", label: "Premium — AI requests / day", hint: "Admins are not limited", max: 100000 },
  { key: "ai_premium_tokens_per_day", label: "Premium — tokens / day", hint: "Prompt + completion tokens", max: 100000000 },
  { key: "ai_free_live_sessions_per_day", label: "Free — Live voice sessions / day", hint: "One session = one Live connection", max: 1000 },
  { key: "ai_premium_live_sessions_per_day", label: "Premium — Live voice sessions / day", hint: "One session = one Live connection", max: 1000 },
  { key: "ai_live_global_sessions_per_day", label: "Platform — Live sessions / day (all accounts)", hint: "Hard daily cap; 0 = Live off for everyone", max: 100000 },
  { key: "ai_live_session_max_minutes", label: "Live session length cap (minutes)", hint: "Browser ends the session at this length", max: 120 },
];

const BUDGET_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "ai_budget_daily_usd", label: "Platform budget — per UTC day (USD)", hint: "Empty = no limit · 0 = stop all paid AI today" },
  { key: "ai_budget_monthly_usd", label: "Platform budget — per UTC month (USD)", hint: "Empty = no limit · 0 = stop all paid AI this month" },
  { key: "ai_budget_warn_percent", label: "Warn at (% of a limit)", hint: "1–100" },
];

const PRICING_TEMPLATE = `{
  "groq": {
    "<model-id>": { "inputPerMTok": 0.0, "outputPerMTok": 0.0 }
  }
}`;

function fmtUsd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function fmtInt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toLocaleString("en-US");
}

/** Client-side hints only; the server validates everything on save. */
function localPricingError(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "Not valid JSON.";
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "Top level must be an object keyed by provider.";
  for (const models of Object.values(parsed as Record<string, unknown>)) {
    if (!models || typeof models !== "object" || Array.isArray(models)) return "Each provider must map model ids to prices.";
    for (const p of Object.values(models as Record<string, unknown>)) {
      const price = p as Record<string, unknown> | null;
      if (!price || typeof price.inputPerMTok !== "number" || typeof price.outputPerMTok !== "number") {
        return "Each price needs numeric inputPerMTok and outputPerMTok.";
      }
    }
  }
  return null;
}

/** Fetch settings + report. Pure I/O: the caller decides what to store. */
async function fetchCostData(days: number): Promise<{
  config: Record<string, string>;
  report: CostReport | null;
  reportError: string | null;
}> {
  const [cfgRes, repRes] = await Promise.all([
    fetch("/api/admin/config", { cache: "no-store" }),
    fetch(`/api/admin/ai-costs?days=${days}`, { cache: "no-store" }),
  ]);
  const cfgData = await cfgRes.json().catch(() => ({}));
  if (!cfgRes.ok) throw new Error(cfgData?.error || "Could not load settings.");
  const map: Record<string, string> = {};
  for (const row of (cfgData.config ?? []) as ConfigRow[]) map[row.key] = row.value;
  const repData = await repRes.json().catch(() => null);
  const ok = repRes.ok && repData;
  return {
    config: map,
    report: ok ? (repData as CostReport) : null,
    reportError: ok ? null : "The spend report could not be loaded. Settings are still editable.",
  };
}

export function AiCostPanel() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [report, setReport] = useState<CostReport | null>(null);
  const [days, setDays] = useState(30);
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});

  // All state updates happen after the fetch resolves; a stale response from a
  // previous window is ignored.
  useEffect(() => {
    let cancelled = false;
    fetchCostData(days)
      .then((r) => {
        if (cancelled) return;
        setConfig(r.config);
        setDrafts(r.config);
        setReport(r.report);
        setLoadError(r.reportError);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadToken]);

  const load = useCallback(() => setReloadToken((t) => t + 1), []);

  /** Save one key. Returns true on success; the server's error text is shown on failure. */
  const save = async (keys: string[], groupId: string, clientCheck?: () => string | null): Promise<boolean> => {
    const problem = clientCheck?.() ?? null;
    if (problem) {
      setMessages((m) => ({ ...m, [groupId]: { ok: false, text: problem } }));
      return false;
    }
    setBusy(groupId);
    setMessages((m) => ({ ...m, [groupId]: { ok: true, text: "" } }));
    try {
      for (const key of keys) {
        const value = drafts[key] ?? "";
        if ((config[key] ?? "") === value) continue;
        const res = await fetch("/api/admin/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessages((m) => ({ ...m, [groupId]: { ok: false, text: data?.error || `${key}: save failed` } }));
          return false;
        }
      }
      setMessages((m) => ({ ...m, [groupId]: { ok: true, text: "Saved. Takes effect within about 30 seconds on every server." } }));
      load();
      return true;
    } catch {
      setMessages((m) => ({ ...m, [groupId]: { ok: false, text: "Network error — nothing was saved past the last successful key." } }));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const setDraft = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));

  if (loading && !Object.keys(config).length) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading AI cost settings…
      </div>
    );
  }

  const budgetLine = (label: string, b: { spendUsd: number; limitUsd: number | null; percent: number | null }) => {
    const over = b.limitUsd !== null && b.spendUsd >= b.limitUsd;
    const warn = !over && b.percent !== null && b.percent >= (report?.budget.limits.warnPercent ?? 80);
    const tone = over ? "text-red-700 bg-red-50 border-red-200" : warn ? "text-amber-800 bg-amber-50 border-amber-200" : "text-slate-700 bg-slate-50 border-slate-200";
    return (
      <div className={`rounded-xl border p-3 ${tone}`}>
        <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-70">{label}</p>
        <p className="mt-1 text-sm font-extrabold">
          {fmtUsd(b.spendUsd)} <span className="text-xs font-semibold opacity-70">/ {b.limitUsd === null ? "no limit" : fmtUsd(b.limitUsd)}</span>
        </p>
        <p className="text-[11px] font-semibold">
          {over ? "Paid AI is blocked in this window." : warn ? "Near the limit — warning." : b.percent === null ? "Not limited." : `${b.percent}% used`}
        </p>
      </div>
    );
  };

  const msg = (group: string) =>
    messages[group]?.text ? (
      <p role="status" className={`mt-2 flex items-start gap-1.5 text-xs font-semibold ${messages[group].ok ? "text-emerald-700" : "text-red-700"}`}>
        {messages[group].ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <span>{messages[group].text}</span>
      </p>
    ) : null;

  return (
    <div className="space-y-6">
      {/* ---------------- Spend report ---------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Spend & budgets</h3>
            <p className="text-xs text-slate-500">
              USD is shown only for requests whose cost is known (provider-reported or priced). Requests without a price are counted separately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Report window"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold"
            >
              {[7, 30, 90].map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {loadError && <p className="mb-3 text-xs font-semibold text-red-700">{loadError}</p>}

        {report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {budgetLine("Today (UTC)", report.budget.usage.daily)}
              {budgetLine("This month (UTC)", report.budget.usage.monthly)}
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Known cost, {report.windowDays}d</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">{fmtUsd(report.totals.knownCostUsd)}</p>
                <p className="text-[11px] text-slate-500">
                  Coverage {report.totals.knownCostCoveragePct === null ? "—" : `${report.totals.knownCostCoveragePct}%`} of successful requests
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Requests, {report.windowDays}d</p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">{fmtInt(report.totals.requests)}</p>
                <p className="text-[11px] text-slate-500">
                  {fmtInt(report.totals.failed)} failed · {fmtInt(report.totals.fallbacks)} fallback · {fmtInt(report.totals.retried)} retried
                </p>
              </div>
            </div>

            {report.totals.unknownCostRequests > 0 && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                {fmtInt(report.totals.unknownCostRequests)} successful request(s) have no known cost. Add a price for each model below to include them in the USD total.
              </p>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">By provider</p>
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1">Provider</th>
                      <th className="py-1 text-right">Requests</th>
                      <th className="py-1 text-right">Failed</th>
                      <th className="py-1 text-right">Known USD</th>
                      <th className="py-1 text-right">No price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byProvider.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-slate-400">No AI requests in this window.</td>
                      </tr>
                    )}
                    {report.byProvider.map((r) => (
                      <tr key={r.provider} className="border-t border-slate-100">
                        <td className="py-1 font-semibold text-slate-700">{r.provider}</td>
                        <td className="py-1 text-right">{fmtInt(r.requests)}</td>
                        <td className="py-1 text-right">{fmtInt(r.failed)}</td>
                        <td className="py-1 text-right">{fmtUsd(r.knownCostUsd)}</td>
                        <td className="py-1 text-right">{fmtInt(r.unknownCostRequests)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Models in use with no price</p>
                {report.unpricedModels.length === 0 ? (
                  <p className="text-xs text-slate-400">Every model in use has a price (or no successful requests).</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {report.unpricedModels.map((m) => (
                      <li key={`${m.provider}/${m.model}`} className="flex justify-between gap-2 border-t border-slate-100 pt-1">
                        <span className="truncate font-mono text-slate-700">
                          {m.provider} / {m.model || "(model not recorded)"}
                        </span>
                        <span className="shrink-0 text-slate-500">{fmtInt(m.requests)} req</span>
                      </li>
                    ))}
                  </ul>
                )}
                {report.errors.length > 0 && (
                  <>
                    <p className="mb-1 mt-4 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Failure categories</p>
                    <ul className="space-y-1 text-xs">
                      {report.errors.map((e) => (
                        <li key={e.category} className="flex justify-between border-t border-slate-100 pt-1">
                          <span className="font-mono text-slate-700">{e.category}</span>
                          <span className="text-slate-500">{fmtInt(e.requests)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* ---------------- Budgets ---------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900">Platform budgets</h3>
        <p className="mb-4 text-xs text-slate-500">
          Checked on the server before every paid AI call — including retries and fallbacks. When a limit is reached, students see a neutral &quot;temporarily paused&quot; message and no provider is called. The default values are placeholders: set your own before launch.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {BUDGET_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-extrabold text-slate-700">{f.label}</span>
              <input
                value={drafts[f.key] ?? ""}
                onChange={(e) => setDraft(f.key, e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                aria-describedby={`${f.key}-hint`}
              />
              <span id={`${f.key}-hint`} className="mt-1 block text-[11px] text-slate-500">{f.hint}</span>
            </label>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-extrabold text-slate-700">Per-provider daily caps (JSON, USD)</span>
          <textarea
            value={drafts["ai_budget_provider_daily_usd"] ?? ""}
            onChange={(e) => setDraft("ai_budget_provider_daily_usd", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            placeholder='{"groq": 3, "openrouter": 5}'
          />
          <span className="mt-1 block text-[11px] text-slate-500">Empty = none. A provider at its cap is skipped; its requests fail with the neutral message.</span>
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void save(
                [...BUDGET_FIELDS.map((f) => f.key), "ai_budget_provider_daily_usd"],
                "budgets",
                () => {
                  const w = Number(drafts["ai_budget_warn_percent"]);
                  if (!(Number.isInteger(w) && w >= 1 && w <= 100)) return "Warn percentage must be a whole number from 1 to 100.";
                  return null;
                },
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === "budgets" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save budgets
          </button>
          {msg("budgets")}
        </div>
      </section>

      {/* ---------------- Model prices ---------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900">Model prices (USD per 1M tokens)</h3>
        <p className="mb-3 text-xs text-slate-500">
          Enter the prices from your provider&apos;s current price list. No price is built into the app, so until you add one the cost of that model is shown as <em>no price configured</em>. Cached-input price is optional (defaults to the input price). OpenRouter reports its billed cost itself, so those requests need no price here.
        </p>
        <textarea
          value={drafts["ai_model_pricing"] ?? ""}
          onChange={(e) => setDraft("ai_model_pricing", e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          placeholder={PRICING_TEMPLATE}
          aria-label="Model price table (JSON)"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void save(["ai_model_pricing"], "pricing", () => localPricingError(drafts["ai_model_pricing"] ?? ""))
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === "pricing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save prices
          </button>
          {msg("pricing")}
        </div>
      </section>

      {/* ---------------- Quotas & voice ---------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900">Quotas & voice</h3>
        <p className="mb-4 text-xs text-slate-500">
          Per account, rolling 24 hours. Request quotas are enforced race-safely; token quotas count finished requests. Free and Premium limits are separate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUOTA_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-extrabold text-slate-700">{f.label}</span>
              <input
                value={drafts[f.key] ?? ""}
                onChange={(e) => setDraft(f.key, e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                aria-describedby={`${f.key}-hint`}
              />
              <span id={`${f.key}-hint`} className="mt-1 block text-[11px] text-slate-500">{f.hint} · max {f.max.toLocaleString("en-US")}</span>
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-extrabold text-slate-700">
          <input
            type="checkbox"
            checked={(drafts["ai_live_voice_enabled"] ?? "true") === "true"}
            onChange={(e) => setDraft("ai_live_voice_enabled", e.target.checked ? "true" : "false")}
          />
          Gemini Live voice practice enabled (off = students use browser speech and text)
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void save(
                [...QUOTA_FIELDS.map((f) => f.key), "ai_live_voice_enabled"],
                "quotas",
                () => {
                  for (const f of QUOTA_FIELDS) {
                    const v = (drafts[f.key] ?? "").trim();
                    const n = Number(v);
                    if (!/^\d+$/.test(v) || n < 0 || n > f.max) return `${f.label}: enter a whole number from 0 to ${f.max.toLocaleString("en-US")}.`;
                  }
                  return null;
                },
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === "quotas" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save quotas & voice
          </button>
          {msg("quotas")}
        </div>
      </section>
    </div>
  );
}

/** Premium price fields — rendered inside the Premium tab (Admin → Premium). */
const PRICE_FIELDS: { price: string; days: string; label: string }[] = [
  { price: "payment_premium_price_uzs", days: "payment_premium_days", label: "Monthly" },
  { price: "payment_premium_season_price_uzs", days: "payment_premium_season_days", label: "Application season (3 months)" },
  { price: "payment_premium_yearly_price_uzs", days: "payment_premium_yearly_days", label: "Yearly" },
];

export function PremiumPricePanel() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const map: Record<string, string> = {};
        for (const row of (data.config ?? []) as ConfigRow[]) map[row.key] = row.value;
        setConfig(map);
        setDrafts(map);
      })
      .catch(() => {
        // Leave the fields empty; the save button stays disabled until loaded.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const load = () => setReloadToken((t) => t + 1);

  const save = async () => {
    const keys = PRICE_FIELDS.flatMap((p) => [p.price, p.days]);
    for (const k of keys) {
      const v = (drafts[k] ?? "").trim();
      if (!/^\d+$/.test(v) || Number(v) < 1) {
        setMessage({ ok: false, text: `${k}: enter a whole number greater than 0.` });
        return;
      }
    }
    setBusy(true);
    setMessage(null);
    try {
      for (const key of keys) {
        if ((config[key] ?? "") === (drafts[key] ?? "")) continue;
        const res = await fetch("/api/admin/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: drafts[key] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage({ ok: false, text: data?.error || `${key}: save failed` });
          return;
        }
      }
      setMessage({ ok: true, text: "Saved. New checkouts use these prices. Active subscriptions keep their current period." });
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <h3 className="text-sm font-extrabold text-slate-900">Premium prices</h3>
      <p className="mb-4 text-xs text-slate-500">
        Currency: <strong>UZS</strong> (Payme and Click settle in UZS only). Changing a price does not charge anyone and does not change existing subscriptions.
      </p>
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {PRICE_FIELDS.map((p) => (
            <div key={p.price} className="grid items-end gap-3 sm:grid-cols-[1fr_9rem_7rem]">
              <p className="text-xs font-extrabold text-slate-700 sm:pb-2">{p.label}</p>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Price (UZS)</span>
                <input
                  value={drafts[p.price] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.price]: e.target.value }))}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Days</span>
                <input
                  value={drafts[p.days] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.days]: e.target.value }))}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void save()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save prices
        </button>
        {message && (
          <p role="status" className={`text-xs font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
