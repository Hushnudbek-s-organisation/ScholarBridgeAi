"use client";

/**
 * SIDE-BY-SIDE OFFER & NET-COST DECISION MATRIX (Phase 3.2).
 *
 * Appears as soon as a student holds two or more recorded offers. Every cell is
 * either a number the student themselves recorded, a cost the university
 * published (currency-resolved), or an explicit "not recorded" — the matrix
 * never fills a gap with an assumption, and it never ranks the offers or says
 * which one to accept. "Non-USD figures are never converted" is the same rule
 * the rest of the app follows: a EUR tuition simply does not appear as US$.
 */
import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { formatMoney } from "@/lib/format";

export interface MatrixOffer {
  id: number;
  status: string;
  universityName?: string | null;
  responseDeadline?: string | null;
  depositAmount?: number | null;
  depositDueDate?: string | null;
  tuitionCommitment?: number | null;
  postStudyWorkVisaYears?: number | null;
  scholarshipAwardedUsd?: number | null;
  funding?: {
    tuition: number;
    secured: number;
    netAnnualUsd: number;
    deposit: number;
    depositDueDate: string | null;
    payableNow: { amount: number; dueDate: string | null; payee: string };
  } | null;
}

const CELL = "border-t border-slate-200 px-3 py-2 text-[12px] dark:border-slate-700";
const HEAD =
  "border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";

export function OfferComparisonMatrix({ offers, className = "" }: { offers: MatrixOffer[]; className?: string }) {
  const t = useTranslations("offerMatrix");

  // Two offers is the point where comparison becomes a decision; one offer is
  // just an offer card, so this renders nothing until then.
  const rows = useMemo(() => offers.filter((o) => o.status !== "rejected"), [offers]);
  if (rows.length < 2) return null;

  const dash = t("notRecorded");
  const money = (value: number | null | undefined) =>
    value == null || !Number.isFinite(Number(value)) ? dash : formatMoney(Number(value), "USD");
  const date = (value: string | null | undefined) => (value ? String(value).slice(0, 10) : dash);
  const years = (value: number | null | undefined) =>
    value == null || !Number.isFinite(Number(value)) ? dash : t("years", { count: Number(value) });

  const statusLabel = (status: string) =>
    status === "accepted" || status === "rejected" || status === "waitlisted" || status === "pending" || status === "deferred"
      ? t(`status${status.charAt(0).toUpperCase()}${status.slice(1)}`)
      : status;

  const fields: { label: string; render: (o: MatrixOffer) => string }[] = [
    { label: t("tuition"), render: (o) => money(o.funding?.tuition ?? o.tuitionCommitment) },
    { label: t("confirmedFunding"), render: (o) => money(o.scholarshipAwardedUsd ?? o.funding?.secured) },
    { label: t("netAnnual"), render: (o) => money(o.funding?.netAnnualUsd) },
    { label: t("deposit"), render: (o) => money(o.funding?.deposit ?? o.depositAmount) },
    { label: t("depositDue"), render: (o) => date(o.funding?.depositDueDate ?? o.depositDueDate) },
    { label: t("payableNow"), render: (o) => money(o.funding?.payableNow.amount) },
    { label: t("responseDeadline"), render: (o) => date(o.responseDeadline) },
    { label: t("postStudyWork"), render: (o) => years(o.postStudyWorkVisaYears) },
  ];

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${className}`}
      aria-label={t("title")}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-100">
        <Scale className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        {t("title")}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t("subtitle")}</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="sr-only">{t("title")}</caption>
          <thead>
            <tr>
              <th scope="col" className={HEAD}>{t("field")}</th>
              {rows.map((o) => (
                <th key={o.id} scope="col" className={HEAD}>
                  <span className="block text-[12px] font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100">
                    {o.universityName ?? `#${o.id}`}
                  </span>
                  <span className="block font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">
                    {statusLabel(o.status)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.label}>
                <th scope="row" className={`${CELL} text-left font-bold text-slate-700 dark:text-slate-200`}>
                  {field.label}
                </th>
                {rows.map((o) => (
                  <td key={o.id} className={`${CELL} tabular-nums text-slate-800 dark:text-slate-100`}>
                    {field.render(o)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {t("honesty")}
      </p>
    </section>
  );
}
