/**
 * Parent Dashboard summary (Phase 4).
 *
 * A parent wants three things: is my child safe on track, what will it cost,
 * and what do THEY need to do. They do not need — and must not see — the
 * essay drafts, the GPA anxiety, the rejection list or the private messages.
 *
 * So this module is a whitelist, not a filter. Every field that reaches a parent
 * is produced here by name; nothing is passed through by omission. If a new
 * field is added to the student record it does not appear on the parent view
 * until someone deliberately adds it.
 *
 * Pure module — asserted in `scripts/check-parent.ts`.
 */

export interface ParentSource {
  studentFirstName: string;
  degreeLevel?: string | null;
  targetMajor?: string | null;
  targetCountries?: string | null;
  graduationYear?: number | null;
  /** Readiness metrics the student has already chosen to surface. */
  profileCompletenessPct?: number | null;
  applicationCount?: number | null;
  submittedCount?: number | null;
  decisionsCount?: number | null;
  acceptedCount?: number | null;
  documentReadinessPct?: number | null;
  /** Nearest deadline, already reduced to a label + days. */
  nextDeadlineLabel?: string | null;
  nextDeadlineDays?: number | null;
  criticalDeadlineCount?: number | null;
  /** Money, in whole numbers. */
  annualCostUsd?: number | null;
  fundingGapAnnualUsd?: number | null;
  scholarshipCount?: number | null;
  /** Things only a parent can usually supply. */
  needsFinancialDocuments?: boolean | null;
  needsBankStatement?: boolean | null;
  openTaskCount?: number | null;
}

export interface ParentAction {
  title: string;
  why: string;
  /** What the parent literally does. */
  step: string;
}

export interface ParentSummary {
  headline: string;
  status: "on_track" | "needs_attention" | "urgent" | "getting_started";
  statusLabel: string;
  /** One paragraph, plain language, no jargon. */
  overview: string;
  progress: { label: string; value: string; pct: number | null }[];
  money: { label: string; value: string; note?: string }[];
  /** What the parent can actually do this week. */
  parentActions: ParentAction[];
  /** Explicit statement of what is NOT shared. */
  privacyNote: string;
}

const money = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

export function buildParentSummary(src: ParentSource): ParentSummary {
  const name = src.studentFirstName?.trim() || "Your child";
  const apps = Number(src.applicationCount) || 0;
  const submitted = Number(src.submittedCount) || 0;
  const critical = Number(src.criticalDeadlineCount) || 0;
  const completeness = Number(src.profileCompletenessPct) || 0;

  // --- Status: the one word a parent reads first ---------------------------
  let status: ParentSummary["status"];
  if (critical > 0) status = "urgent";
  else if (apps === 0) status = "getting_started";
  else if (completeness < 60 || submitted < apps * 0.5) status = "needs_attention";
  else status = "on_track";

  const statusLabel: Record<ParentSummary["status"], string> = {
    urgent: "Needs action now",
    needs_attention: "Needs some attention",
    on_track: "On track",
    getting_started: "Getting started",
  };

  const headline =
    status === "urgent"
      ? `${name} has ${critical} deadline${critical === 1 ? "" : "s"} closing within two weeks.`
      : status === "getting_started"
        ? `${name} is still building the application list.`
        : status === "needs_attention"
          ? `${name} is making progress but part of the file is incomplete.`
          : `${name} is on track with their applications.`;

  // --- Overview: plain language, no admissions jargon ----------------------
  const bits: string[] = [];
  if (src.targetMajor || src.degreeLevel) {
    bits.push(
      `They are applying to study ${src.targetMajor || "their subject"}${src.degreeLevel ? ` at ${src.degreeLevel} level` : ""}${src.targetCountries ? ` in ${src.targetCountries}` : ""}.`
    );
  }
  if (apps > 0) {
    bits.push(
      `${apps} application${apps === 1 ? "" : "s"} ${submitted > 0 ? `and ${submitted} already submitted` : "in progress"}.`
    );
  }
  if (Number(src.acceptedCount) > 0) {
    bits.push(`${src.acceptedCount} offer${Number(src.acceptedCount) === 1 ? "" : "s"} received so far.`);
  }
  if (src.nextDeadlineLabel && src.nextDeadlineDays != null) {
    bits.push(
      src.nextDeadlineDays < 0
        ? `The most recent date (${src.nextDeadlineLabel}) has passed.`
        : `The next date to know is ${src.nextDeadlineLabel}, in ${src.nextDeadlineDays} day${src.nextDeadlineDays === 1 ? "" : "s"}.`
    );
  }
  const overview = bits.join(" ") || "Nothing has been shared yet.";

  // --- Progress ------------------------------------------------------------
  const progress: ParentSummary["progress"] = [];
  if (apps > 0) {
    progress.push({
      label: "Applications submitted",
      value: `${submitted} of ${apps}`,
      pct: Math.round((submitted / apps) * 100),
    });
  }
  if (src.documentReadinessPct != null) {
    progress.push({
      label: "Documents ready",
      value: `${Math.round(src.documentReadinessPct)}%`,
      pct: Math.round(src.documentReadinessPct),
    });
  }
  if (completeness > 0) {
    progress.push({ label: "Profile filled in", value: `${Math.round(completeness)}%`, pct: Math.round(completeness) });
  }

  // --- Money ---------------------------------------------------------------
  const moneyRows: ParentSummary["money"] = [];
  if (Number(src.annualCostUsd) > 0) {
    moneyRows.push({
      label: "Estimated cost per year",
      value: money(Number(src.annualCostUsd)),
      note: "Includes tuition, living costs, insurance and travel.",
    });
  }
  if (Number(src.fundingGapAnnualUsd) > 0) {
    moneyRows.push({
      label: "Still to be funded each year",
      value: money(Number(src.fundingGapAnnualUsd)),
      note: "After the scholarships currently planned.",
    });
  }
  if (Number(src.scholarshipCount) > 0) {
    moneyRows.push({
      label: "Scholarships being applied for",
      value: String(src.scholarshipCount),
    });
  }

  // --- What the parent can actually do -------------------------------------
  const parentActions: ParentAction[] = [];
  if (src.needsFinancialDocuments || src.needsBankStatement) {
    parentActions.push({
      title: "Prepare the financial documents",
      why:
        "Embassies ask for proof of funds, and banks take days or weeks to issue a stamped statement. This is the step that most often delays a visa.",
      step:
        "Ask your bank for a stamped balance certificate showing the required amount, in the student's name or yours, and upload it to the document checklist.",
    });
  }
  if (status === "urgent") {
    parentActions.push({
      title: "Help protect the nearest deadline",
      why: `${critical} deadline${critical === 1 ? "" : "s"} close within 14 days and applications take longer than students expect.`,
      step: "Ask what is blocking the next submission and clear it — a fee payment, a signed form, or an hour of quiet to write.",
    });
  }
  if (Number(src.openTaskCount) > 6) {
    parentActions.push({
      title: "Check in on the workload",
      why: `${src.openTaskCount} open tasks. Most of this is normal, but a long list is also a sign something is stuck.`,
      step: "Ask which three tasks matter this week, and leave the rest alone.",
    });
  }
  if (parentActions.length === 0) {
    parentActions.push({
      title: "Nothing is needed from you right now",
      why: "The plan is moving. The most useful thing a parent can do at this stage is not add pressure.",
      step: "Ask about the subject they are excited by, not about the ranking of the university.",
    });
  }

  return {
    headline,
    status,
    statusLabel: statusLabel[status],
    overview,
    progress,
    money: moneyRows,
    parentActions,
    // Say plainly what is withheld, so nobody wonders.
    privacyNote:
      "This view is read-only and shared by your child on purpose. It never includes passwords, essay drafts, test scores, rejection details or private messages.",
  };
}

/**
 * Generate the one-time share token payload. The token itself must come from a
 * CSPRNG in the route — never from Math.random(), which is not secret.
 */
export function parentShareLink(baseUrl: string, token: string): string {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return `${base}/parent/${encodeURIComponent(token)}`;
}
