"use client";

/**
 * After arrival — first 7 / 30 / 90 days and the first study year
 * (product journey §14.3–14.4).
 *
 * Rendered inside the existing Departure pane (one place for "after the
 * visa"), never its own sidebar section. The checklist is GENERIC guidance —
 * every item says so — and the whole plan unlocks only once an offer is
 * accepted, so a pre-departure student never gets a fake "new life" checklist.
 *
 * Completion state persists via `POST /api/journey/arrival` (journey DDL
 * table `arrival_checklist_items`). Journey-panel rules apply: relative /api
 * fetches, shared useResource loader, no secrets, no premium branching.
 */
import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, ExternalLink, Info, Lock } from "lucide-react";
import { ARRIVAL_WINDOWS, type ArrivalWindow } from "@/lib/journey/arrival";
import { getJson, sendJson, useResource } from "./useResource";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar } from "./ui";

interface ArrivalItemView {
  key: string;
  tab: string | null;
  requires: string | null;
  guidanceOnly: boolean;
  status: "pending" | "done";
  completedAt: string | null;
}

interface ArrivalState {
  unlocked: boolean;
  windows: { window: ArrivalWindow; items: ArrivalItemView[] }[];
}

const EMPTY: ArrivalState = { unlocked: false, windows: [] };

export function ArrivalPlanPanel({
  profileId,
  onNavigateTab,
}: {
  profileId: number | null;
  onNavigateTab?: (tab: string) => void;
}) {
  const t = useTranslations("arrival");
  const [busy, setBusy] = useState<string | null>(null);

  const resource = useResource<ArrivalState>(
    async () => {
      if (!profileId) return EMPTY;
      return getJson<ArrivalState>(`/api/journey/arrival?profileId=${profileId}`, t("loadError"));
    },
    [profileId],
    { initial: EMPTY, errorFallback: "…" }
  );

  const toggle = useCallback(
    async (item: ArrivalItemView) => {
      if (!profileId) return;
      setBusy(item.key);
      try {
        const next = item.status === "done" ? "pending" : "done";
        await sendJson(
          "/api/journey/arrival",
          {
            method: "POST",
            body: JSON.stringify({ profileId, itemKey: item.key, status: next }),
          },
          t("saveError")
        );
        resource.setData((prev) => ({
          ...prev,
          windows: prev.windows.map((w) => ({
            ...w,
            items: w.items.map((i) =>
              i.key === item.key ? { ...i, status: next as ArrivalItemView["status"] } : i
            ),
          })),
        }));
      } catch {
        /* keep the previous state — the item stays ticked exactly as before */
      } finally {
        setBusy(null);
      }
    },
    [profileId, resource, t]
  );

  const total = resource.data.windows.reduce((n, w) => n + w.items.length, 0);
  const done = resource.data.windows.reduce(
    (n, w) => n + w.items.filter((i) => i.status === "done").length,
    0
  );

  return (
    <div className="space-y-4">
      <JourneyCard title={t("title")} subtitle={t("subtitle")}>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{t("guidanceNote")}</span>
        </div>
      </JourneyCard>

      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Empty title={t("loadError")} hint={resource.error} />
      ) : !resource.data.unlocked ? (
        <JourneyCard title={t("lockedTitle")}>
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-slate-600">{t("lockedBody")}</p>
              {onNavigateTab && (
                <div className="mt-3">
                  <Button variant="outline" onClick={() => onNavigateTab("offers")}>
                    {t("lockedCta")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </JourneyCard>
      ) : (
        <>
          <JourneyCard title={t("progressTitle")}>
            <ProgressBar pct={total ? Math.round((done / total) * 100) : 0} tone="good" label={t("progressLabel", { done, total })} />
          </JourneyCard>

          {resource.data.windows.map((w) => (
            <JourneyCard
              key={w.window}
              title={t(`windows.${w.window}`)}
              subtitle={t(`windowsHelp.${w.window}`)}
            >
              {w.items.length === 0 ? (
                <Empty title={t("emptyWindow")} />
              ) : (
                <ul className="space-y-2">
                  {w.items.map((item) => {
                    const doneFlag = item.status === "done";
                    return (
                      <li
                        key={item.key}
                        className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                          doneFlag
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={doneFlag}
                          aria-label={t(doneFlag ? "markPending" : "markDone")}
                          onClick={() => toggle(item)}
                          disabled={busy === item.key}
                          className="mt-0.5 shrink-0 text-slate-500 hover:text-emerald-600 disabled:opacity-50"
                        >
                          {doneFlag ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${doneFlag ? "text-slate-500 line-through" : "text-slate-800"}`}>
                            {t(`items.${item.key}`)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {item.guidanceOnly && <Pill tone="slate">{t("guidanceBadge")}</Pill>}
                            {item.requires && <Pill tone="warn">{t(`conditional.${item.requires}`)}</Pill>}
                            {item.tab && onNavigateTab && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab(item.tab!)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                              >
                                {t("openSection")} <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </JourneyCard>
          ))}
        </>
      )}
    </div>
  );
}
