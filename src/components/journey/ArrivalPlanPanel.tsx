"use client";

/**
 * After arrival — first 7 / 30 / 90 days and the first study year
 * (product journey §14.3–14.4).
 *
 * Rendered inside the existing Departure pane (one place for "after the
 * visa"), never its own sidebar section. The checklist is GENERIC guidance —
 * every item says so — and it is visible from the start: an accepted offer
 * switches the header from preview to live, it does not gate the content.
 * Country-specific rules live in a separate sourced block
 * (`arrivalCountryGuidance.ts`) so the generic list never presents a national
 * requirement as universal.
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
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar } from "./ui";

interface ArrivalItemView {
  key: string;
  tab: string | null;
  requires: string | null;
  guidanceOnly: boolean;
  status: "pending" | "done";
  completedAt: string | null;
}

interface CompletionView {
  done: number;
  total: number;
  remaining: number;
  pct: number;
  complete: boolean;
}

interface CountryTip {
  key: string;
  window: ArrivalWindow;
  text: Record<string, string>;
  sourceUrl: string;
  sourceLabel: Record<string, string>;
}

interface ArrivalState {
  unlocked: boolean;
  progress: CompletionView;
  windows: { window: ArrivalWindow; items: ArrivalItemView[]; progress: CompletionView }[];
  /** Sourced country rules for the first-choice destination; null = none held. */
  countryGuidance: { country: string; flag: string; tips: CountryTip[] } | null;
}

const EMPTY_PROGRESS: CompletionView = { done: 0, total: 0, remaining: 0, pct: 0, complete: false };
const EMPTY: ArrivalState = { unlocked: false, progress: EMPTY_PROGRESS, windows: [], countryGuidance: null };

export function ArrivalPlanPanel({
  profileId,
  onNavigateTab,
}: {
  profileId: number | null;
  onNavigateTab?: (tab: string) => void;
}) {
  const t = useTranslations("arrival");
  const { locale } = useLocaleContext();
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
        // Re-read the server projection: status, per-window progress and total
        // progress are one atomic backend calculation, never three client rules.
        await resource.reload();
      } catch {
        /* keep the previous state — the item stays ticked exactly as before */
      } finally {
        setBusy(null);
      }
    },
    [profileId, resource, t]
  );

  const { done, total, pct } = resource.data.progress;

  return (
    <div className="space-y-4">
      <JourneyCard title={t("title")} subtitle={t("subtitle")}>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{t("guidanceNote")}</span>
        </div>
      </JourneyCard>

      {/*
        Country-specific rules, each one linked to the authority that publishes
        it. Kept visually separate from the generic checklist above, because the
        two carry different weight: the checklist is advice, these are national
        requirements with a source you can check.
      */}
      {resource.data?.countryGuidance && (
        <JourneyCard
          title={`${resource.data.countryGuidance.flag} ${t("countryTitle", { country: resource.data.countryGuidance.country })}`}
          subtitle={t("countrySubtitle")}
        >
          <ul className="space-y-3">
            {resource.data.countryGuidance.tips.map((tip) => (
              <li key={tip.key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="slate">{t(`windows.${tip.window}`)}</Pill>
                  <Pill tone="info">{t("countrySourceBadge")}</Pill>
                </div>
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {tip.text[locale] ?? tip.text.en}
                </p>
                <a
                  href={tip.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  {tip.sourceLabel[locale] ?? tip.sourceLabel.en}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}

      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Empty title={t("loadError")} hint={resource.error} />
      ) : (
        <>
          {/*
            Pre-acceptance mode. This used to be a wall: `unlocked === false`
            replaced the whole page with a lock, so a student could not read the
            first-7-days checklist until an offer had already been accepted —
            exactly when it is too late to plan around it. The items are now
            always visible and always tickable; the banner only marks them as a
            preview, and the progress card says so too.
          */}
          {!resource.data.unlocked && (
            <JourneyCard title={t("lockedTitle")}>
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{t("lockedBody")}</p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("previewHint")}</p>
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
          )}

          <JourneyCard title={t("progressTitle")}>
            <ProgressBar pct={pct} tone="good" label={t("progressLabel", { done, total })} />
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
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={doneFlag}
                          aria-label={t(doneFlag ? "markPendingItem" : "markDoneItem", { item: t(`items.${item.key}`) })}
                          onClick={() => toggle(item)}
                          disabled={busy === item.key}
                          className="mt-0.5 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
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
                                aria-label={t("openItemSection", { item: t(`items.${item.key}`) })}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
