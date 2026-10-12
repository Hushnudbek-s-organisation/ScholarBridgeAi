"use client";

/**
 * AFTER ADMISSION phase panels:
 *   - Offers & Decisions          (spec §23)
 *   - Post-Admission Funding      (spec §24)
 *   - Recommendation Manager      (spec §19)
 *   - My Funding Plan             (spec §9)
 *   - External Learning Providers (spec §32 — architecture only, no partner)
 *
 * SPEC §23/§24: an offer is the point where the journey turns from "can I get
 * in" to "can I afford it and when do I have to answer". Everything on this page
 * is the student's own record; the panels only ever state what the student (or
 * an admin-published source) entered.
 */
import React, { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Mail, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { getJson, sendJson, useResource } from "./useResource";
import {
  Button,
  Empty,
  ErrorNote,
  Field,
  JourneyCard,
  Loading,
  Pill,
  ProgressBar,
  SourceTag,
  inputClass,
} from "./ui";
import { AppNote } from "@/components/AppNote";

// ===========================================================================
// OFFERS & DECISIONS (spec §23) + POST-ADMISSION FUNDING (spec §24)
// ===========================================================================

interface OfferFunding {
  tuition: number;
  scholarship: number;
  aid: number;
  deposit: number;
  depositDueDate: string | null;
  payableNow: { amount: number; dueDate: string | null; payee: string };
  explanation: string[];
}
interface OfferRow {
  id: number;
  applicationId: number;
  status: string;
  decidedAt: string | null;
  responseDeadline: string | null;
  offerLetterUrl: string | null;
  offerLetterName: string | null;
  conditions: string | null;
  depositAmount: number | null;
  depositDueDate: string | null;
  tuitionCommitment: number | null;
  notes: string | null;
  application: { id: number; universityName: string; programName: string; intakeTerm: string | null } | null;
  funding: OfferFunding;
}
interface OffersData {
  offers: OfferRow[];
  summary: { total: number; pending: number; accepted: number; rejected: number };
}

const OFFER_STATUSES = ["pending", "accepted", "rejected", "waitlisted", "deferred"];

export function OffersPanel({ profileId, onNavigateTab }: { profileId: number; onNavigateTab: (t: string) => void }) {
  const t = useTranslations("journey");
  const { data, loading, error, reload } = useResource<OffersData>(
    useCallback(() => getJson<OffersData>(`/api/offers?profileId=${profileId}`, t("opLoadError")), [profileId, t]),
    [profileId],
    { initial: { offers: [], summary: { total: 0, pending: 0, accepted: 0, rejected: 0 } }, errorFallback: t("opLoadError") }
  );
  const [busy, setBusy] = useState(false);

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      await sendJson("/api/offers", { method: "PATCH", body: JSON.stringify({ profileId, ...payload }) }, t("opUpdateError"));
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("opUpdateError"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/offers?profileId=${profileId}&id=${id}`, { method: "DELETE" });
    await reload();
  };

  if (loading && data.offers.length === 0) return <Loading label={t("opLoading")} />;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("opTitle")}
        subtitle={t("opSubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="slate">{data.summary.total}</Pill>
            {data.summary.pending > 0 && <Pill tone="warn">{data.summary.pending} awaiting</Pill>}
            {data.summary.accepted > 0 && <Pill tone="good">{data.summary.accepted} accepted</Pill>}
          </div>
        }
      >
        {error && <ErrorNote message={error} />}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("opCreatedNote")}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => onNavigateTab("applications")}>{t("opGoApplications")}</Button>
      </JourneyCard>

      {data.offers.length === 0 ? (
        <Empty title={t("opEmptyTitle")} hint={t("opEmptyHint")} />
      ) : (
        data.offers.map((o) => (
          <JourneyCard
            key={o.id}
            title={o.application?.universityName ?? t("opOfferFallback")}
            subtitle={o.application?.programName ?? undefined}
            action={
              <div className="flex items-center gap-2">
                <select
                  className={`${inputClass} w-auto`}
                  value={o.status}
                  disabled={busy}
                  onChange={(e) => void patch({ id: o.id, status: e.target.value, decidedAt: o.status === "pending" ? new Date().toISOString().slice(0, 10) : o.decidedAt })}
                >
                  {OFFER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="danger" onClick={() => void remove(o.id)} aria-label={t("opDeleteOffer")}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            }
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label={t("opDecidedOn")}>
                    <input type="date" className={inputClass} defaultValue={o.decidedAt ?? ""} onChange={(e) => void patch({ id: o.id, decidedAt: e.target.value })} />
                  </Field>
                  <Field label={t("opRespondBy")}>
                    <input type="date" className={inputClass} defaultValue={o.responseDeadline ?? ""} onChange={(e) => void patch({ id: o.id, responseDeadline: e.target.value })} />
                  </Field>
                  <Field label={t("opDepositDue")}>
                    <input type="date" className={inputClass} defaultValue={o.depositDueDate ?? ""} onChange={(e) => void patch({ id: o.id, depositDueDate: e.target.value })} />
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label={t("opDepositAmount")}>
                    <input
                      type="number"
                      className={inputClass}
                      defaultValue={o.depositAmount ?? ""}
                      onBlur={(e) => void patch({ id: o.id, depositAmount: e.target.value === "" ? 0 : Number(e.target.value) })}
                    />
                  </Field>
                  <Field label={t("opTuitionCommitment")} hint={t("opTuitionHint")}>
                    <input
                      type="number"
                      className={inputClass}
                      defaultValue={o.tuitionCommitment ?? ""}
                      onBlur={(e) => void patch({ id: o.id, tuitionCommitment: e.target.value === "" ? 0 : Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <Field label={t("opOfferLetter")}>
                  <input
                    className={inputClass}
                    placeholder={t("opOfferLetterPlaceholder")}
                    defaultValue={o.offerLetterUrl ?? ""}
                    onBlur={(e) => void patch({ id: o.id, offerLetterUrl: e.target.value })}
                  />
                </Field>
                <Field label={t("opConditions")} hint={t("opConditionsHint")}>
                  <textarea
                    className={`${inputClass} h-20`}
                    defaultValue={o.conditions ?? ""}
                    onBlur={(e) => void patch({ id: o.id, conditions: e.target.value })}
                  />
                </Field>
                {o.offerLetterUrl && (
                  <SourceTag url={o.offerLetterUrl} name={o.offerLetterName ?? t("opOfficialLetter")} lastVerified={o.decidedAt} />
                )}
              </div>

              {/* SPEC §24: explicit, itemised funding — never "full funding". */}
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("opFundingTitle")}</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <Line label={t("lineTuition")} value={o.funding.tuition} />
                  <Line label={t("fundScholarship")} value={o.funding.scholarship} tone="good" />
                  <Line label={t("fundAid")} value={o.funding.aid} tone="good" />
                  <Line label={t("lineDepositNow")} value={o.funding.payableNow.amount} tone="warn" />
                </dl>
                {o.funding.payableNow.dueDate && <p className="mt-1 text-xs text-slate-500">Due {o.funding.payableNow.dueDate} to {o.funding.payableNow.payee}.</p>}
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-500 dark:text-slate-400">
                  {o.funding.explanation.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {o.status === "accepted" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => onNavigateTab("funding")}>{t("opManageFunding")}</Button>
                    <Button size="sm" variant="outline" onClick={() => onNavigateTab("visa")}>{t("opStartVisa")}</Button>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-400">{t("opFundingLocked")}</p>
                )}
              </div>
            </div>
          </JourneyCard>
        ))
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="money" className="mt-2" />
    </div>
  );
}

function Line({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "good" | "warn" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
      <dd
        className={`font-bold tabular-nums ${
          tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
        }`}
      >
        ${Number(value ?? 0).toLocaleString()}
      </dd>
    </div>
  );
}

// ===========================================================================
// RECOMMENDATION MANAGER (spec §19)
// ===========================================================================

interface RecRow {
  id: number;
  applicationId: number;
  recommenderName: string;
  recommenderEmail: string | null;
  relationship: string | null;
  recommenderType: string | null;
  status: string;
  dueDate: string | null;
  instructions: string | null;
  isPrivate: boolean;
  application: { id: number; universityName: string; programName: string; deadline: string | null } | null;
}
interface RecData {
  statuses: readonly string[];
  types: readonly string[];
  requests: RecRow[];
  summary: { total: number; submitted: number; outstanding: number; notRequested: number };
  instructionsTemplate: string;
}

const REC_STATUSES = ["not_requested", "requested", "opened", "submitted"];

export function RecommendationManagerPanel({ profileId }: { profileId: number }) {
  const t = useTranslations("journey");
  const { data, loading, error, reload } = useResource<RecData>(
    useCallback(() => getJson<RecData>(`/api/recommendations?profileId=${profileId}`, t("rmLoadError")), [profileId, t]),
    [profileId],
    { initial: { statuses: REC_STATUSES, types: ["academic", "professional", "personal", "research"], requests: [], summary: { total: 0, submitted: 0, outstanding: 0, notRequested: 0 }, instructionsTemplate: "" }, errorFallback: t("rmLoadError") }
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ applicationId: "", recommenderName: "", recommenderEmail: "", relationship: "", dueDate: "" });

  const applications = [...new Map(data.requests.map((r) => [r.applicationId, r.application])).entries()].filter(
    (e): e is [number, NonNullable<RecRow["application"]>] => e[1] != null
  );

  const add = async () => {
    if (!form.applicationId || !form.recommenderName.trim()) return;
    setBusy(true);
    try {
      await sendJson(
        "/api/recommendations",
        { method: "POST", body: JSON.stringify({ profileId, ...form, applicationId: Number(form.applicationId) }) },
        t("rmAddError")
      );
      setForm({ applicationId: "", recommenderName: "", recommenderEmail: "", relationship: "", dueDate: "" });
      setAdding(false);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("rmAddError"));
    } finally {
      setBusy(false);
    }
  };

  const patch = async (payload: Record<string, unknown>) => {
    await sendJson("/api/recommendations", { method: "PATCH", body: JSON.stringify({ profileId, ...payload }) }, t("dvUpdateError"));
    await reload();
  };

  const remove = async (id: number) => {
    await fetch(`/api/recommendations?profileId=${profileId}&id=${id}`, { method: "DELETE" });
    await reload();
  };

  if (loading && data.requests.length === 0) return <Loading label={t("rmLoading")} />;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("rmTitle")}
        subtitle={t("rmSubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="slate">{data.summary.total}</Pill>
            {data.summary.outstanding > 0 && <Pill tone="warn">{data.summary.outstanding} outstanding</Pill>}
            {data.summary.submitted > 0 && <Pill tone="good">{data.summary.submitted} submitted</Pill>}
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />{t("rmAdd")}</Button>
          </div>
        }
      >
        {error && <ErrorNote message={error} />}

        {adding && (
          <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-700">
            <Field label={t("secApplication")}>
              <select className={inputClass} value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })}>
                <option value="">{t("rmChoose")}</option>
                {applications.map(([id, a]) => (
                  <option key={id} value={id}>
                    {a.universityName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("rmFieldName")}>
              <input className={inputClass} value={form.recommenderName} onChange={(e) => setForm({ ...form, recommenderName: e.target.value })} />
            </Field>
            <Field label={t("rmFieldEmail")}>
              <input type="email" className={inputClass} value={form.recommenderEmail} onChange={(e) => setForm({ ...form, recommenderEmail: e.target.value })} />
            </Field>
            <Field label={t("rmFieldRelationship")}>
              <input className={inputClass} placeholder={t("rmRelationshipPlaceholder")} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
            </Field>
            <Field label={t("rmFieldDue")} hint={t("rmDueHint")}>
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-5">
              <Button onClick={add} disabled={busy || !form.applicationId || !form.recommenderName.trim()}>{t("rmSave")}</Button>
            </div>
          </div>
        )}

        <p className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          SPEC §19 — recommendation content stays private. Nobody, including a parent, can read these rows without your explicit
          permission, and you can withdraw it at any time.
        </p>
      </JourneyCard>

      {data.requests.length === 0 ? (
        <Empty title={t("rmEmptyTitle")} hint={t("rmEmptyHint")} />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {data.requests.map((r) => (
            <div key={r.id} className="sb-card-hover rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.recommenderName}</p>
                  <p className="text-[11px] text-slate-500">
                    {r.application?.universityName ?? t("secApplication")}
                    {r.relationship && ` · ${r.relationship}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <select className={`${inputClass} w-auto`} value={r.status} onChange={(e) => void patch({ id: r.id, status: e.target.value })}>
                    {REC_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="danger" onClick={() => void remove(r.id)} aria-label={`Remove ${r.recommenderName}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label={t("rmFieldDue")}>
                  <input type="date" className={inputClass} defaultValue={r.dueDate ?? ""} onChange={(e) => void patch({ id: r.id, dueDate: e.target.value })} />
                </Field>
                <Field label={t("rmFieldEmail")}>
                  <input type="email" className={inputClass} defaultValue={r.recommenderEmail ?? ""} onBlur={(e) => void patch({ id: r.id, recommenderEmail: e.target.value })} />
                </Field>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {r.recommenderEmail && (
                  <a
                    href={`mailto:${r.recommenderEmail}?subject=${encodeURIComponent(`Recommendation request — ${r.application?.universityName ?? "my application"}`)}&body=${encodeURIComponent(r.instructions ?? data.instructionsTemplate)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    <Mail className="h-3.5 w-3.5" />{t("rmEmailDraft")}</a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(r.instructions ?? data.instructionsTemplate);
                    setCopied(r.id);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" /> {copied === r.id ? t("rmCopied") : t("rmCopyMessage")}
                </button>
                <Button size="sm" variant="ghost" onClick={() => void patch({ id: r.id, status: "submitted" })}>
                  <Check className="h-3 w-3" />{t("rmMarkSubmitted")}</Button>
              </div>

              <Field label={t("rmWhatToAsk")} hint={t("rmWhatToAskHint")}>
                <textarea
                  className={`${inputClass} mt-1 h-20 text-xs`}
                  defaultValue={r.instructions ?? ""}
                  placeholder={data.instructionsTemplate}
                  onBlur={(e) => void patch({ id: r.id, instructions: e.target.value })}
                />
              </Field>
            </div>
          ))}
        </div>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="ai" className="mt-2" />
    </div>
  );
}

// ===========================================================================
// MY FUNDING PLAN (spec §9)
// ===========================================================================

interface FundingLine {
  key: string;
  label: string;
  cost: number;
  covered: number;
  gap: number;
}
interface FundingData {
  costLines: { key: string; label: string }[];
  kindLabels: Record<string, string>;
  application: { id: number; universityName: string; programName: string } | null;
  university: { id: number; name: string; country: string; city: string; sourceUrl: string | null; lastVerifiedAt: string | null } | null;
  annualCost: number;
  estimatedLines: string[];
  plan: {
    annualCost: number;
    currency: string;
    scholarshipTotal: number;
    ownContributionTotal: number;
    securedTotal: number;
    projectedTotal: number;
    fundingGap: number;
    securedGap: number;
    isCovered: boolean;
    byLine: FundingLine[];
    openActions: { name: string; kind: string; amountUsd: number; status: string }[];
  };
  items: { id: number; kind: string; kindLabel: string; name: string; amountUsd: number; status: string; covers: string | null; notes: string | null }[];
  gapActions: { gap: number; scholarships: { id: number; title: string; provider: string; amountUsdValue: number; tuitionCoverage: string; deadlineDate: string | null }[]; tab: string; cta: string };
}

const FUNDING_KINDS = ["scholarship", "aid", "family", "savings", "loan", "other"];
const FUNDING_STATUSES = ["planned", "applied", "awarded", "confirmed", "declined"];

export function FinancialPlanPanel({ profileId, onNavigateTab }: { profileId: number; onNavigateTab: (t: string) => void }) {
  const t = useTranslations("journey");
  const { data, loading, error, reload } = useResource<FundingData>(
    useCallback(() => getJson<FundingData>(`/api/funding?profileId=${profileId}`, t("fpLoadError")), [profileId, t]),
    [profileId],
    {
      initial: {
        costLines: [],
        kindLabels: {},
        application: null,
        university: null,
        annualCost: 0,
        estimatedLines: [],
        plan: {
          annualCost: 0,
          currency: "USD",
          scholarshipTotal: 0,
          ownContributionTotal: 0,
          securedTotal: 0,
          projectedTotal: 0,
          fundingGap: 0,
          securedGap: 0,
          isCovered: false,
          byLine: [],
          openActions: [],
        },
        items: [],
        gapActions: { gap: 0, scholarships: [], tab: "scholarships", cta: "" },
      },
      errorFallback: t("fpLoadError"),
    }
  );
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ kind: "scholarship", name: "", amountUsd: "", status: "planned", covers: [] as string[], notes: "" });

  const add = async () => {
    if (!form.name.trim() || !form.amountUsd) return;
    setBusy(true);
    try {
      await sendJson(
        "/api/funding",
        { method: "POST", body: JSON.stringify({ profileId, ...form, amountUsd: Number(form.amountUsd), applicationId: data.application?.id ?? null }) },
        t("tpSaveError")
      );
      setForm({ kind: "scholarship", name: "", amountUsd: "", status: "planned", covers: [], notes: "" });
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("tpSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const patch = async (payload: Record<string, unknown>) => {
    await sendJson("/api/funding", { method: "PATCH", body: JSON.stringify({ profileId, ...payload }) }, t("dvUpdateError"));
    await reload();
  };

  const remove = async (id: number) => {
    await fetch(`/api/funding?profileId=${profileId}&id=${id}`, { method: "DELETE" });
    await reload();
  };

  if (loading) return <Loading label={t("fpLoading")} />;

  const pct = data.annualCost > 0 ? Math.round((data.plan.securedTotal / data.annualCost) * 100) : 0;

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("fpTitle")}
        subtitle={data.application ? `${data.application.universityName}${data.application.programName ? ` · ${data.application.programName}` : ""}` : t("fpNoApplication")}
        action={
          <div className="text-right">
            <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">${data.annualCost.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">{t("fpPerYear")}</p>
          </div>
        }
      >
        {error && <ErrorNote message={error} />}

        {data.university && (
          <p className="mb-3 text-[11px] text-slate-500">
            Published costs for {data.university.name}, {data.university.city}, {data.university.country} ·{" "}
            <SourceTag url={data.university.sourceUrl} name={t("fpUnivSource")} lastVerified={data.university.lastVerifiedAt} />
          </p>
        )}
        {data.estimatedLines.length > 0 && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            These lines are our standard estimates, not published figures: {data.estimatedLines.join(", ")}. Replace them with the real
            number when your university publishes one.
          </p>
        )}

        <div className="mb-3">
          <ProgressBar pct={pct} size="lg" tone={data.plan.isCovered ? "good" : "warn"} label={`${pct}% of the yearly cost is secured`} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("fpSecured")} value={data.plan.securedTotal} tone="good" hint={t("fpSecuredHint")} />
          <Metric label={t("fpStillPossible")} value={data.plan.projectedTotal} tone="brand" hint={t("fpStillPossibleHint")} />
          <Metric label={t("fpGapNothing")} value={data.plan.fundingGap} tone={data.plan.fundingGap > 0 ? "bad" : "good"} />
          <Metric label={t("fpGapSecured")} value={data.plan.securedGap} tone={data.plan.securedGap > 0 ? "warn" : "good"} />
        </div>
      </JourneyCard>

      <JourneyCard title={t("fpMoneyTitle")} subtitle={t("fpMoneySubtitle")}>
        <div className="space-y-2">
          {data.plan.byLine.map((l) => (
            <div key={l.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {l.label}
                  {data.estimatedLines.includes(l.label) && <span className="ml-1 font-normal text-slate-400">{t("fpEstimated")}</span>}
                </span>
                <span className="tabular-nums text-slate-500">
                  ${l.covered.toLocaleString()} / ${l.cost.toLocaleString()}
                  {l.gap > 0 && <span className="ml-1 font-bold text-rose-500">−${l.gap.toLocaleString()}</span>}
                </span>
              </div>
              <div className="mt-1">
                <ProgressBar pct={l.cost > 0 ? (l.covered / l.cost) * 100 : 0} size="sm" tone={l.gap === 0 ? "good" : "warn"} />
              </div>
            </div>
          ))}
        </div>
      </JourneyCard>

      <JourneyCard title={t("fpAddFundingTitle")} subtitle={t("fpAddFundingSubtitle")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={t("fpFieldKind")}>
            <select className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {FUNDING_KINDS.map((k) => (
                <option key={k} value={k}>
                  {data.kindLabels[k] ?? k}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("rmFieldName")}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("fpNamePlaceholder")} />
          </Field>
          <Field label={t("fpFieldAmount")}>
            <input className={inputClass} type="number" value={form.amountUsd} onChange={(e) => setForm({ ...form, amountUsd: e.target.value })} />
          </Field>
          <Field label={t("fpFieldStatus")}>
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {FUNDING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("fpFieldCovers")}>
            <select
              className={inputClass}
              value={form.covers[0] ?? ""}
              onChange={(e) => setForm({ ...form, covers: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">{t("fpEverything")}</option>
              {(data.costLines.length ? data.costLines : [{ key: "tuition", label: t("lineTuition") }]).map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label} only
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button className="mt-3" onClick={add} disabled={busy || !form.name.trim() || !form.amountUsd}>
          <Plus className="h-3.5 w-3.5" />{t("fpAdd")}</Button>
      </JourneyCard>

      {data.items.length > 0 && (
        <JourneyCard title={t("fpItemsTitle")}>
          <ul className="space-y-2">
            {data.items.map((i) => (
              <li key={i.id} className="sb-card-hover flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{i.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {i.kindLabel} · ${i.amountUsd.toLocaleString()} · {i.status}
                  </p>
                </div>
                <select className={`${inputClass} w-auto`} value={i.status} onChange={(e) => void patch({ id: i.id, status: e.target.value })}>
                  {FUNDING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="danger" onClick={() => void remove(i.id)} aria-label={`Delete ${i.name}`}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}

      {data.gapActions.gap > 0 && (
        <JourneyCard title={t("fpGapTitle")}>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            You are short <strong className="tabular-nums">${data.gapActions.gap.toLocaleString()}</strong> for a year.
          </p>
          {data.gapActions.scholarships.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {data.gapActions.scholarships.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{s.title}</span>
                  <Pill tone="brand">${s.amountUsdValue.toLocaleString()}</Pill>
                  <Pill tone="slate">tuition coverage: {s.tuitionCoverage}</Pill>
                  {s.deadlineDate && <span className="text-slate-400">closes {s.deadlineDate}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{t("fpNoScholarshipCloses")}</p>
          )}
          <Button size="sm" className="mt-3" onClick={() => onNavigateTab(data.gapActions.tab)}>
            {data.gapActions.cta}
          </Button>
        </JourneyCard>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="money" className="mt-2" />
    </div>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone: "good" | "warn" | "bad" | "brand" }) {
  const tones = {
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-rose-600 dark:text-rose-400",
    brand: "text-indigo-600 dark:text-indigo-400",
  } as const;
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-lg font-extrabold tabular-nums ${tones[tone]}`}>${value.toLocaleString()}</p>
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ===========================================================================
// EXTERNAL LEARNING PROVIDERS (spec §32) — architecture only
// ===========================================================================

interface LearningReading {
  metric: string;
  value: number | null;
  measuredAt: string | null;
  sourceName: string;
  lastVerifiedAt: string | null;
}
interface LearningData {
  connected: boolean;
  providers: { providerKey: string; name: string; kind: string; status: string; linked: boolean; externalUserRef: string | null; lastSyncedAt: string | null; metrics: LearningReading[] }[];
  suggestedTargets: { metric: string; value: number; sourceName: string }[];
  metrics: { key: string; label: string; unit?: string }[];
  adapters: { providerKey: string; displayName: string }[];
  notice: string;
}

export function LearningProvidersPanel({ profileId }: { profileId: number }) {
  const t = useTranslations("journey");
  const { data, loading, error } = useResource<LearningData>(
    useCallback(() => getJson<LearningData>(`/api/learning/providers?profileId=${profileId}`, t("lpLoadError")), [profileId, t]),
    [profileId],
    {
      initial: { connected: false, providers: [], suggestedTargets: [], metrics: [], adapters: [], notice: "" },
      errorFallback: t("lpLoadError"),
    }
  );

  return (
    <div className="space-y-4">
      <JourneyCard
        title={t("lpTitle")}
        subtitle={t("lpSubtitle")}
      >
        {error && <ErrorNote message={error} />}
        {loading ? (
          <Loading label={t("lpLoading")} />
        ) : (
          <>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {data.notice}
            </p>
            {data.providers.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {data.providers.map((p) => (
                  <li key={p.providerKey} className="sb-card-hover rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
                      <Pill tone={p.linked ? "good" : "slate"}>{p.status}</Pill>
                    </div>
                    {p.metrics.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                        {p.metrics.map((m) => (
                          <li key={`${p.providerKey}-${m.metric}-${m.measuredAt ?? ""}`}>
                            {m.metric}: {m.value ?? t("uiNotSpecified")} {m.measuredAt ? `· ${m.measuredAt}` : ""} · source: {m.sourceName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title={t("lpNoProvider")}
                hint={t("lpNoProviderHint")}
              />
            )}
          </>
        )}
      </JourneyCard>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="thirdParty" className="mt-2" />
    </div>
  );
}
