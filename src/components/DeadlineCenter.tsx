"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Award, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, ExternalLink, FileText, FlaskConical, GraduationCap, RefreshCw } from "lucide-react";
import { AppNote } from "@/components/AppNote";
import { AwardCoverageNote } from "@/components/AwardCoverageNote";
import { getJson, sendJson, useResource } from "@/components/journey/useResource";
import { Button } from "@/components/ui/Button";
import { ShowMoreToggle } from "@/components/ui/hubs";
import { Empty, ErrorNote, Field, inputClass, JourneyCard, Loading, Pill } from "@/components/ui/journey";

const SmartTimelineCalendar = dynamic(() => import("./SmartTimelineCalendar").then((module) => module.SmartTimelineCalendar));

interface DeadlineItem {
  id: string;
  type: "scholarship" | "university" | "milestone" | "application" | "test";
  title: string;
  subtitle: string;
  date: string | null;
  status: string;
  daysRemaining: number | null;
  source: string | null;
  saved: boolean;
  taskId?: number;
  testType?: string;
  testLocation?: string | null;
  testRegistered?: boolean;
  testDateKind?: "booking" | "planned_exam" | "preparation_target";
  recommended?: boolean | null;
  verificationStatus?: string | null;
  coverageState?: "applicable" | "not_applicable" | "unknown";
}

type Scope = "mine" | "catalogue";
type Group = "upcoming" | "late" | "undated" | "done";
type Kind = DeadlineItem["type"];
type Period = "all" | "7" | "30";

const EMPTY = { items: [] as DeadlineItem[] };
const PREVIEW_LIMIT = 6;
const GROUPS: Group[] = ["upcoming", "late", "undated", "done"];
const KINDS: Kind[] = ["application", "scholarship", "test", "milestone", "university"];

const TYPE_ICONS = {
  scholarship: Award,
  university: GraduationCap,
  milestone: CheckSquare,
  application: FileText,
  test: FlaskConical,
};

const TYPE_PAGES = {
  scholarship: "scholarships/browse",
  university: "universities/search",
  milestone: "tasks/tasks",
  application: "applications/tracker",
  test: "study-plan/tests",
};

const STATUS_TRANSLATIONS = {
  OPEN: "open",
  CLOSED: "closed",
  UPCOMING: "upcoming",
  ROLLING: "rolling",
  "DATE NOT ANNOUNCED": "dateNotAnnounced",
  "NO DEADLINE ON FILE": "noDeadlineOnFile",
  UNKNOWN: "unknown",
  PENDING: "pending",
  COMPLETED: "completed",
  REGISTERED: "registered",
  NOT_STARTED: "notStarted",
  PREPARING: "preparing",
  ESSAY: "essay",
  DOCUMENTS: "documents",
  RECOMMENDATIONS: "recommendations",
  FEE_PAID: "feePaid",
  SUBMITTED: "submitted",
  INTERVIEW: "interview",
  DECISION: "decision",
  WITHDRAWN: "withdrawn",
} as const;

function isPersonal(item: DeadlineItem) {
  return item.saved || item.type === "application" || item.type === "milestone" || item.type === "test";
}

function groupFor(item: DeadlineItem): Group {
  if (item.status === "COMPLETED" || (item.type === "application" && ["SUBMITTED", "INTERVIEW", "DECISION"].includes(item.status))) return "done";
  if (item.daysRemaining === null) return "undated";
  return item.daysRemaining < 0 || item.status === "CLOSED" ? "late" : "upcoming";
}

function safeHttpsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function DeadlineMonth({ items, today, titleFor, onSelect }: {
  items: DeadlineItem[];
  today: Date;
  titleFor: (item: DeadlineItem) => string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("deadlineCenter");
  const locale = useLocale();
  const [month, setMonth] = useState(() => utcDate(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const year = month.getUTCFullYear();
  const index = month.getUTCMonth();
  const offset = (month.getUTCDay() + 6) % 7;
  const daysInMonth = utcDate(year, index + 1, 0).getUTCDate();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const dayFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const itemsByDate = new Map<string, DeadlineItem[]>();
  for (const item of items) {
    if (!item.date) continue;
    const bucket = itemsByDate.get(item.date);
    if (bucket) bucket.push(item);
    else itemsByDate.set(item.date, [item]);
  }
  const selectedItems = selected ? itemsByDate.get(selected) ?? [] : [];
  const todayIso = today.toISOString().slice(0, 10);

  function moveMonth(amount: number) {
    setMonth(utcDate(year, index + amount, 1));
    setSelected(null);
  }

  return (
    <div className="max-w-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="icon" variant="outline" className="min-h-11 min-w-11" aria-label={t("calendarPrevious")} onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden /></Button>
        <p className="text-sm font-bold" aria-live="polite">{monthFormatter.format(month)}</p>
        <Button type="button" size="icon" variant="outline" className="min-h-11 min-w-11" aria-label={t("calendarNext")} onClick={() => moveMonth(1)}><ChevronRight aria-hidden /></Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {Array.from({ length: 7 }, (_, day) => <span key={day} className="px-0.5 text-center text-[0.7rem] text-slate-600 dark:text-slate-300">{weekdayFormatter.format(utcDate(2024, 0, day + 1))}</span>)}
        {Array.from({ length: offset }, (_, day) => <span key={`offset-${day}`} aria-hidden />)}
        {Array.from({ length: daysInMonth }, (_, position) => {
          const day = position + 1;
          const date = utcDate(year, index, day);
          const iso = date.toISOString().slice(0, 10);
          const count = itemsByDate.get(iso)?.length ?? 0;
          const current = iso === todayIso;
          return count ? (
            <Button
              key={day}
              type="button"
              variant={selected === iso ? "primary" : "outline"}
              className="relative min-h-11 min-w-0 px-0 py-0 text-xs sm:text-sm"
              aria-pressed={selected === iso}
              aria-current={current ? "date" : undefined}
              aria-label={t("calendarDay", { date: dayFormatter.format(date), count })}
              onClick={() => setSelected(iso)}
            >
              {day}<span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-current" />
            </Button>
          ) : <span key={day} className={`grid min-h-11 place-items-center rounded-control text-xs sm:text-sm ${current ? "bg-indigo-100 font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" : "text-slate-600 dark:text-slate-300"}`} aria-current={current ? "date" : undefined}>{day}</span>;
        })}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300" role="status">{selectedItems.length && selected ? t("calendarDay", { date: dayFormatter.format(new Date(selected)), count: selectedItems.length }) : t("calendarHint")}</p>
      {selectedItems.length > 0 && <ul className="space-y-1">{selectedItems.map((item) => (
        <li key={item.id}><Button type="button" variant="ghost" className="min-h-11 justify-start whitespace-normal text-left" onClick={() => onSelect(item.id)}>{titleFor(item)}</Button></li>
      ))}</ul>}
    </div>
  );
}

export function DeadlineCenter({ profileId, onNavigateTab }: { profileId: number | null; onNavigateTab?: (id: string) => void }) {
  const t = useTranslations("deadlineCenter");
  const tc = useTranslations("common");
  const tj = useTranslations("journey");
  const locale = useLocale();
  const { data, loading, error, reload, setData } = useResource(
    useCallback(() => getJson<typeof EMPTY>(`/api/deadlines?profileId=${profileId}`, t("loadFailed")), [profileId, t]),
    [profileId, locale],
    { initial: EMPTY, enabled: profileId !== null, errorFallback: t("loadFailed") }
  );
  const [chosenScope, setChosenScope] = useState<Scope | null>(null);
  const [group, setGroup] = useState<Group>("upcoming");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [period, setPeriod] = useState<Period>("all");
  const [expanded, setExpanded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();
  const calendarId = useId();
  const timelineId = useId();

  const { items } = data;
  const selected = items.find((item) => item.id === selectedId);
  const showDetail = !!selected;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!showDetail || !dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [showDetail]);

  if (!profileId) return <JourneyCard title={t("title")}><p className="text-sm text-slate-600 dark:text-slate-300">{t("noProfile")}</p></JourneyCard>;
  if (loading && !items.length) return <Loading label={t("loading")} />;
  if (error && !items.length) {
    return <JourneyCard title={t("title")}><ErrorNote message={t("loadFailed")} /><Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void reload()}>{t("refresh")}</Button></JourneyCard>;
  }

  const scope = chosenScope ?? (items.some(isPersonal) ? "mine" : "catalogue");
  const scoped = items.filter((item) => (scope === "mine") === isPersonal(item) && (kind === "all" || item.type === kind));
  const buckets: Record<Group, DeadlineItem[]> = { upcoming: [], late: [], undated: [], done: [] };
  for (const item of scoped) buckets[groupFor(item)].push(item);
  buckets.upcoming.sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity));
  function newestFirst(a: DeadlineItem, b: DeadlineItem) {
    return (b.daysRemaining ?? -Infinity) - (a.daysRemaining ?? -Infinity) || 0;
  }
  buckets.late.sort(newestFirst);
  buckets.done.sort(newestFirst);
  const next = buckets.upcoming[0];
  const visibleUpcoming = period === "all" ? buckets.upcoming : buckets.upcoming.filter((item) => item.daysRemaining !== null && item.daysRemaining <= Number(period));
  const visible = group === "upcoming" ? visibleUpcoming : buckets[group];
  const pageItems = expanded ? visible : visible.slice(0, PREVIEW_LIMIT);
  const hasFilters = kind !== "all" || (group === "upcoming" && period !== "all");
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  function titleFor(item: DeadlineItem) {
    if (item.type !== "test" || !item.testType) return item.title;
    const test = tj.has(`tpTestType.${item.testType}`) ? tj(`tpTestType.${item.testType}`) : item.testType.toUpperCase();
    if (item.testDateKind === "preparation_target") return t("testPreparationTarget", { test });
    if (item.testDateKind === "planned_exam") return t("testExamDate", { test });
    return item.testLocation ? t("testAtLocation", { test, location: item.testLocation }) : t("testTitle", { test });
  }

  function statusFor(item: DeadlineItem) {
    return t(`statuses.${STATUS_TRANSLATIONS[item.status as keyof typeof STATUS_TRANSLATIONS] ?? "other"}`);
  }

  function countdownFor(item: DeadlineItem) {
    const days = item.daysRemaining;
    if (item.status === "CLOSED" || groupFor(item) === "done") return statusFor(item);
    if (days === null) return null;
    if (days === 0) return t("today");
    if (days === 1) return t("tomorrow");
    return days < 0 ? t("daysOverdue", { days: Math.abs(days) }) : t("daysLeft", { days });
  }

  function dateFor(item: DeadlineItem) {
    return item.date ? <time dateTime={item.date}>{formatter.format(new Date(item.date))}</time> : t("dateTba");
  }

  function openDetails(id: string) {
    setActionError("");
    setSelectedId(id);
  }

  function closeDetails() {
    dialogRef.current?.close();
    setSelectedId(null);
  }

  async function toggleTask(item: DeadlineItem, currentProfile: number) {
    if (item.type !== "milestone" || !item.taskId || savingTask) return;
    setSavingTask(true);
    setActionError("");
    setNotice("");
    try {
      const { task } = await sendJson<{ task: { isCompleted: boolean } }>("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: item.taskId, isCompleted: item.status !== "COMPLETED" }),
      }, t("taskSaveFailed"));
      if (typeof task?.isCompleted !== "boolean") throw new Error(t("taskSaveFailed"));
      closeDetails();
      setData((previous) => ({
        items: previous.items.map((row) => row.id === item.id ? { ...row, status: task.isCompleted ? "COMPLETED" : "PENDING" } : row),
      }));
      setNotice(t(task.isCompleted ? "taskCompleted" : "taskReopened"));
      window.dispatchEvent(new CustomEvent("scholarbridge:tasks-updated", { detail: { profileId: currentProfile } }));
      requestAnimationFrame(() => controlsRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus());
    } catch {
      setActionError(t("taskSaveFailed"));
    } finally {
      setSavingTask(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={t("loadFailed")} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t("scopeLabel")} className="flex flex-wrap gap-2">
          {(["mine", "catalogue"] as const).map((value) => (
            <Button key={value} type="button" variant={scope === value ? "primary" : "outline"} className="min-h-11 whitespace-normal" aria-pressed={scope === value} onClick={() => { setChosenScope(value); setGroup("upcoming"); setExpanded(false); setNotice(""); }}>{t(`scope.${value}`)}</Button>
          ))}
        </div>
        <Button type="button" variant="ghost" className="min-h-11" disabled={loading} onClick={() => void reload()}><RefreshCw className="size-4" aria-hidden />{t("refresh")}</Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <JourneyCard title={t("nextDeadline")} tone="accent">
          {next ? (
            <div className="space-y-2">
              <h3 className="break-words text-lg font-extrabold text-slate-900 dark:text-slate-100">{titleFor(next)}</h3>
              <p className="text-sm text-slate-700 dark:text-slate-200">{dateFor(next)} · <strong>{countdownFor(next)}</strong></p>
              {next.type === "scholarship" && next.verificationStatus !== "verified" && <p><Pill tone="warn">{t("unverifiedDeadline")}</Pill></p>}
              <Button type="button" className="min-h-11" onClick={() => openDetails(next.id)}>{t("details")}</Button>
            </div>
          ) : <p className="text-sm text-slate-600 dark:text-slate-300">{t("emptyGroups.upcoming")}</p>}
        </JourneyCard>
        <JourneyCard title={t(`summary.${scope}`)}>
          <dl className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {([
              [t("today"), buckets.upcoming.filter((item) => item.daysRemaining === 0).length],
              [t("withinWeek"), buckets.upcoming.filter((item) => item.daysRemaining !== null && item.daysRemaining <= 7).length],
              [t("groups.late"), buckets.late.length],
            ] as const).map(([label, count]) => (
              <div key={label} className="min-w-0 rounded-surface bg-slate-50 p-2 dark:bg-slate-800">
                <dt className="break-words text-xs text-slate-600 dark:text-slate-300">{label}</dt>
                <dd className="text-xl font-extrabold tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </JourneyCard>
      </div>

      <JourneyCard title={t("listTitle")} action={<p className="text-sm text-slate-600 dark:text-slate-300" role="status">{t("results", { count: visible.length })}</p>}>
        <div className="grid max-w-lg grid-cols-2 gap-2">
          <Field label={t("periodLabel")}>
            <select className={`${inputClass} min-h-11 min-w-0 disabled:opacity-60`} value={period} disabled={group !== "upcoming"} onChange={(event) => { setPeriod(event.target.value as Period); setExpanded(false); }}>
              <option value="all">{t("periodAny")}</option>
              <option value="7">{t("periodDays", { days: 7 })}</option>
              <option value="30">{t("periodDays", { days: 30 })}</option>
            </select>
          </Field>
          <Field label={t("kindLabel")}>
            <select className={`${inputClass} min-h-11 min-w-0`} value={kind} onChange={(event) => { setKind(event.target.value as Kind | "all"); setExpanded(false); }}>
              <option value="all">{t("kindAny")}</option>
              {KINDS.map((key) => <option key={key} value={key}>{t(`types.${key}`)}</option>)}
            </select>
          </Field>
        </div>
        <div ref={controlsRef} role="group" aria-label={t("groupLabel")} className="my-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {GROUPS.map((value) => (
            <Button
              key={value}
              type="button"
              variant={group === value ? "primary" : "outline"}
              aria-pressed={group === value}
              className="min-h-11 min-w-0 gap-1.5 whitespace-normal break-words px-1.5"
              onClick={() => { setGroup(value); setExpanded(false); setNotice(""); }}
            >
              <span className="min-w-0">{t(`groups.${value}`)}</span>
              <span className="shrink-0 tabular-nums">{value === "upcoming" ? visibleUpcoming.length : buckets[value].length}</span>
            </Button>
          ))}
        </div>
        {notice && <p className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">{notice}</p>}
        <div data-deadline-list>
          {pageItems.length > 0 ? (
            <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {pageItems.map((item) => {
                const title = titleFor(item);
                const countdown = countdownFor(item);
                const hot = item.daysRemaining !== null && item.daysRemaining <= 2 && groupFor(item) !== "done";
                const Icon = TYPE_ICONS[item.type];
                return (
                  <li key={item.id} data-deadline-kind={item.type} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 md:grid-cols-[8rem_minmax(0,1fr)_auto]">
                    <div className="order-2 text-sm md:order-1">
                      <p className="font-semibold">{dateFor(item)}</p>
                      {countdown && <p className={`text-xs ${hot ? "font-semibold text-rose-700 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>{countdown}</p>}
                    </div>
                    <div className="order-1 col-span-2 min-w-0 md:order-2 md:col-span-1">
                      <h3 className="break-words text-sm font-bold">{title}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Pill tone="slate"><Icon className="size-3.5 shrink-0" aria-hidden />{t(`types.${item.type}`)}</Pill>
                        {item.type === "scholarship" && item.saved && item.verificationStatus !== "verified" && <Pill tone="warn">{t("unverifiedDeadline")}</Pill>}
                        {item.type !== "test" && item.subtitle && <span className="min-w-0 break-words text-xs text-slate-600 dark:text-slate-300">{item.subtitle}</span>}
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="order-3 min-h-11" aria-label={t("detailsFor", { title })} onClick={() => openDetails(item.id)}>{t("details")}</Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              <Empty title={hasFilters ? t("emptyFiltered") : t(`emptyGroups.${group}`)} />
              {hasFilters && <div className="mt-2 text-center"><Button type="button" variant="outline" className="min-h-11" onClick={() => { setKind("all"); setPeriod("all"); setExpanded(false); }}>{t("resetFilters")}</Button></div>}
              {!hasFilters && scope === "mine" && !items.some(isPersonal) && <div className="mt-2 text-center"><Button type="button" variant="outline" className="min-h-11" onClick={() => { setChosenScope("catalogue"); setGroup("upcoming"); }}>{t("scope.catalogue")}</Button></div>}
            </>
          )}
          {visible.length > PREVIEW_LIMIT && <ShowMoreToggle className="mt-3" totalCount={visible.length} visibleCount={pageItems.length} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />}
        </div>
      </JourneyCard>

      <div className="rounded-overlay border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
        <Button type="button" variant="ghost" className="min-h-12 w-full justify-start px-0" aria-expanded={calendarOpen} aria-controls={calendarId} onClick={() => setCalendarOpen((value) => !value)}><CalendarDays className="size-4 text-indigo-600 dark:text-indigo-300" aria-hidden /> {t("monthCalendar")}</Button>
        <div id={calendarId} hidden={!calendarOpen}>
          {calendarOpen && (
            <div className="space-y-3 border-t border-slate-200 py-3 dark:border-slate-700">
              <DeadlineMonth items={scoped} today={new Date()} titleFor={titleFor} onSelect={openDetails} />
              <Button type="button" variant="outline" className="min-h-11 whitespace-normal" aria-expanded={timelineOpen} aria-controls={timelineId} onClick={() => setTimelineOpen((value) => !value)}>{t("backwardsPlan")}</Button>
              <div id={timelineId} hidden={!timelineOpen}>
                {timelineOpen && <SmartTimelineCalendar profileId={profileId} deadlineItems={items} onTasksSynced={() => void reload()} onNavigateTab={onNavigateTab} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <dialog
          ref={dialogRef}
          aria-labelledby={dialogTitleId}
          className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-overlay border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-950/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-6"
          onCancel={(event) => { event.preventDefault(); if (!savingTask) closeDetails(); }}
        >
          <header className="flex flex-wrap items-start justify-between gap-2">
            <h2 id={dialogTitleId} className="min-w-0 break-words text-lg font-extrabold">{titleFor(selected)}</h2>
            <Button type="button" variant="ghost" className="min-h-11" onClick={closeDetails} disabled={savingTask}>{tc("close")}</Button>
          </header>
          <div className="my-3 space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2"><Pill tone="brand">{t(`types.${selected.type}`)}</Pill><Pill tone={groupFor(selected) === "done" ? "good" : "slate"}>{statusFor(selected)}</Pill></p>
            <p className="font-semibold">{dateFor(selected)}{countdownFor(selected) && <> · {countdownFor(selected)}</>}</p>
            {selected.type === "scholarship" && <AwardCoverageNote state={selected.coverageState} />}
            {selected.type === "scholarship" && selected.saved && selected.verificationStatus !== "verified" && <p><Pill tone="warn">{t("unverifiedDeadline")}</Pill></p>}
            {selected.subtitle && selected.type !== "test" && <p className="break-words text-slate-600 dark:text-slate-300">{selected.subtitle}</p>}
          </div>
          {actionError && <ErrorNote message={actionError} />}
          <div className="flex flex-wrap items-center gap-2">
            {!!selected.taskId && <Button type="button" className="min-h-11 whitespace-normal" disabled={savingTask} onClick={() => void toggleTask(selected, profileId)}>{t(selected.status === "COMPLETED" ? "taskReopen" : "taskComplete")}</Button>}
            {onNavigateTab && <Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={savingTask} onClick={() => { closeDetails(); onNavigateTab(TYPE_PAGES[selected.type]); }}>{t(`navigate.${selected.type}`)}</Button>}
            {safeHttpsUrl(selected.source) && <a href={safeHttpsUrl(selected.source)!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-indigo-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300"><ExternalLink className="size-4" aria-hidden /> {t("openReference")}</a>}
          </div>
        </dialog>
      )}
      <AppNote kind="planning" className="mt-2" />
    </div>
  );
}
