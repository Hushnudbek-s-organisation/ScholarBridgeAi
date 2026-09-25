"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Compass, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface OppItem {
  id: number;
  type: string;
  title: string;
  provider: string;
  country: string | null;
  fields: string;
  level: string;
  deadlineDate: string | null;
  url: string;
  isVerified: boolean;
  match: number | null;
  reasons: string[];
  flags: string[];
}

interface OppData {
  count: number;
  counts: Record<string, number>;
  items: OppItem[];
  scoredFor: string | null;
}

const TYPES = ["competition", "research", "internship", "summer_school"] as const;

function parseFields(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * #26/#27/#28 — Personalized opportunities feed: competitions, research,
 * internships and summer schools matched to the signed-in profile.
 * The catalog is curated and admin-managed — never scraped.
 */
export function OpportunitiesPanel() {
  const t = useTranslations("opportunities");
  const [data, setData] = useState<OppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  // setState only inside promise callbacks — never synchronously in the
  // effect body (loading starts as `true` in state).
  useEffect(() => {
    let live = true;
    const qs = type ? `?type=${type}` : "";
    fetch(`/api/opportunities${qs}`, { cache: "no-store" })
      .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(new Error(b?.error ?? `HTTP ${r.status}`)))))
      .then((b) => {
        if (live) setData(b);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [type]);

  const typeLabel = (k: string) =>
    k === "competition" ? t("competition") : k === "research" ? t("research") : k === "internship" ? t("internship") : t("summerSchool");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <Compass className="h-3.5 w-3.5" /> {t("title")}
        </h3>
        <p className="mt-1 max-w-2xl text-[11px] text-slate-500">
          {t("subtitle")}
          {data?.scoredFor ? ` · ${t("scoredFor")}: ${data.scoredFor}` : ""}
        </p>
      </div>

      {/* NEW FOR YOU — counts by type */}
      {data && (
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPES.map((k) => (
            <button
              key={k}
              onClick={() => setType(type === k ? null : k)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                type === k ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="text-lg font-black text-slate-800">{data.counts[k] ?? 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{typeLabel(k)}</div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      {loading && !data && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </div>
      )}

      {data && (
        <div className="mt-3 space-y-2">
          {data.items.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              {t("noResults")}
            </p>
          )}
          {data.items.map((o) => (
            <div key={o.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800">{o.title}</span>
                  {o.isVerified && (
                    <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">✓ {t("verified")}</span>
                  )}
                  <p className="text-[10px] text-slate-500">
                    {[o.provider, o.country || "International", o.level].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {o.match != null && (
                    <span className="text-sm font-black text-indigo-700">{o.match}%</span>
                  )}
                  {o.url && (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3 w-3" /> {t("view")}
                    </a>
                  )}
                </div>
              </div>
              {parseFields(o.fields).length > 0 && (
                <p className="mt-1 text-[10px] text-slate-500">
                  {t("fields")}: {parseFields(o.fields).join(", ")}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-slate-400">
                {o.deadlineDate ? `${t("deadline")}: ${o.deadlineDate}` : t("recurring")}
              </p>
              {o.reasons.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {o.reasons.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-[10px] text-emerald-700">
                      + {r}
                    </li>
                  ))}
                </ul>
              )}
              {o.flags.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {o.flags.slice(0, 3).map((r, i) => (
                    <li key={i} className="flex items-start gap-1 text-[10px] text-amber-700">
                      <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
