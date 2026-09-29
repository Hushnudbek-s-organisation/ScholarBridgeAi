/**
 * Next Steps (spec §3): the 3–5 highest-priority things to do, each with a
 * [Continue] button.
 *
 * This EXTENDS the existing `src/lib/nextActions.ts` idea (deterministic
 * ordering, an overdue deadline outranks "join a club") but reads the richer
 * journey inputs. It stays PURE — no DB, no AI, no clock — so the ordering is
 * assertable in `scripts/check-journey.ts` and the dashboard still gives real
 * advice when no AI provider is configured.
 *
 * A step is a real, checkable fact ("your recommendation letter is not
 * requested yet"), never a vague nudge, and never a probability claim.
 */

export type StepUrgency = "critical" | "high" | "medium" | "low";

export interface NextStep {
  id: string;
  title: string;
  /** One sentence the student can act on right now. */
  detail: string;
  urgency: StepUrgency;
  /** 🔴 / 🟡 / 🟢 / ⚪ — what the dashboard shows in front of the title. */
  dot: string;
  dueInDays: number | null;
  /** Where the [Continue] button goes. */
  tab: string;
  /** Internal ordering key — higher wins. Never shown. */
  score: number;
}

export interface DeadlineInput {
  id: string;
  title: string;
  daysRemaining: number | null;
  tab?: string;
}

export interface NextStepsInput {
  journey: { current: string; stillNeeded: { text: string; tab: string }[] };
  readiness: { weakest: { key: string; label: string; pct: number; gaps: string[]; tab: string }[] };
  appRows: { id: number; universityName: string; deadline: string | null; submitted: boolean; status: string }[];
  openRequirements: number;
  deadlines: DeadlineInput[];
  gaps: { testType: string; state: string; current: number | null; required: number; message: string }[];
  recommendations: { submitted: number; outstanding: number };
  documents: { ready: number; total: number; expiring: number };
  tests: { ielts: number | null; target: number | null; belowTarget: boolean };
  funding: { gap: number; covered: boolean } | null;
  profileComplete: boolean;
  savedUniversities: number;
  visaStage: boolean;
}

function urgencyOf(days: number | null): { urgency: StepUrgency; dot: string } {
  if (days == null) return { urgency: "low", dot: "⚪" };
  if (days < 0) return { urgency: "critical", dot: "🔴" };
  if (days <= 7) return { urgency: "critical", dot: "🔴" };
  if (days <= 21) return { urgency: "high", dot: "🟡" };
  return { urgency: "medium", dot: "🟢" };
}

/**
 * Base score for a step, before the deadline modifier.
 * Overdue work is worth 100; a week is worth 80; a month is worth 55.
 */
function baseScore(days: number | null): number {
  if (days == null) return 30;
  if (days < 0) return 100 + Math.min(40, Math.abs(days));
  if (days === 0) return 95;
  if (days <= 7) return 80;
  if (days <= 14) return 65;
  if (days <= 30) return 55;
  if (days <= 60) return 40;
  return 25;
}

export function computeNextActions(input: NextStepsInput, limit = 5): NextStep[] {
  const steps: NextStep[] = [];
  const add = (s: Omit<NextStep, "urgency" | "dot"> & { urgency?: StepUrgency; dot?: string }) => {
    const { urgency, dot } = urgencyOf(s.dueInDays);
    steps.push({ ...s, urgency: s.urgency ?? urgency, dot: s.dot ?? dot });
  };

  // ---- 1. Deadlines. The nearest one always leads. -----------------------
  const soonest = input.deadlines
    .filter((d) => d.daysRemaining == null || d.daysRemaining <= 60)
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999))[0];
  if (soonest) {
    const days = soonest.daysRemaining;
    add({
      id: `deadline-${soonest.id}`,
      title: soonest.title,
      detail:
        days == null
          ? "No date recorded yet — confirm the real deadline on the official site."
          : days < 0
            ? `This deadline passed ${Math.abs(days)} day(s) ago.`
            : days === 0
              ? "Due today."
              : `${days} day${days === 1 ? "" : "s"} left.`,
      dueInDays: days,
      tab: soonest.tab ?? "deadlines",
      score: baseScore(days) + 25, // a hard date outranks every soft task
    });
  }

  // ---- 2. Unfinished application requirements ----------------------------
  if (input.openRequirements > 0) {
    const firstOpen = input.appRows.find((a) => !a.submitted);
    const days = soonest?.daysRemaining ?? null;
    add({
      id: "requirements-open",
      title: `${input.openRequirements} required item${input.openRequirements === 1 ? "" : "s"} still missing`,
      detail: firstOpen
        ? `Open the workspace for ${firstOpen.universityName || "your application"} to see exactly what is left.`
        : "Open any application workspace to see what is left.",
      dueInDays: days,
      tab: "workspace",
      score: baseScore(days) + 15,
    });
  }

  // ---- 3. Recommendations ------------------------------------------------
  if (input.recommendations.outstanding > 0) {
    const days = soonest?.daysRemaining ?? null;
    add({
      id: "recommendations",
      title:
        input.recommendations.outstanding === 1
          ? "Recommendation letter not requested"
          : `${input.recommendations.outstanding} recommendation letters not requested`,
      detail: "Teachers need time — a letter requested today still takes a week.",
      dueInDays: days == null ? 14 : Math.min(days, 14),
      tab: "recommendations",
      score: baseScore(days == null ? 14 : days) + 10,
    });
  }

  // ---- 4. English / standardized test gap --------------------------------
  const below = input.gaps.find((g) => g.state === "below");
  const noScore = input.gaps.find((g) => g.state === "no_score");
  if (below) {
    add({
      id: `test-${below.testType}`,
      title: `${labelFor(below.testType)} target not reached`,
      detail: `${below.message} Set a target date in the Test Planner.`,
      dueInDays: null,
      tab: "tests",
      score: 62,
    });
  } else if (noScore) {
    add({
      id: `test-${noScore.testType}`,
      title: `No ${labelFor(noScore.testType)} score recorded`,
      detail: noScore.message,
      dueInDays: null,
      tab: "tests",
      score: 58,
    });
  } else if (input.tests.target != null && input.tests.ielts != null && input.tests.ielts < input.tests.target) {
    add({
      id: "test-personal-target",
      title: `${labelFor("ielts")} target not reached`,
      detail: `Current ${input.tests.ielts}, your own target ${input.tests.target}.`,
      dueInDays: null,
      tab: "tests",
      score: 56,
    });
  }

  // ---- 5. Documents that expire ------------------------------------------
  if (input.documents.expiring > 0) {
    add({
      id: "documents-expiring",
      title:
        input.documents.expiring === 1
          ? "1 document expires soon"
          : `${input.documents.expiring} documents expire soon`,
      detail: "A passport or test certificate that expires can fail a whole application.",
      dueInDays: null,
      tab: "documents",
      score: 54,
    });
  } else if (input.documents.total > 0 && input.documents.ready < input.documents.total) {
    add({
      id: "documents-missing",
      title: `${input.documents.total - input.documents.ready} document(s) missing from your vault`,
      detail: "Upload once, reuse across every application.",
      dueInDays: null,
      tab: "documents",
      score: 44,
    });
  }

  // ---- 6. Funding gap ----------------------------------------------------
  if (input.funding && !input.funding.covered && input.funding.gap > 0) {
    add({
      id: "funding-gap",
      title: `Funding gap: $${input.funding.gap.toLocaleString()}`,
      detail: "Find scholarships that close the remaining gap.",
      dueInDays: null,
      tab: "scholarships",
      score: 60,
    });
  }

  // ---- 7. Profile completeness -------------------------------------------
  if (!input.profileComplete) {
    add({
      id: "profile",
      title: "Finish your profile",
      detail: "Everything personalised — matches, requirements, funding — depends on it.",
      dueInDays: null,
      tab: "profile",
      score: 48,
    });
  }

  // ---- 8. Weakest readiness area -----------------------------------------
  const weakest = input.readiness.weakest.find((w) => w.pct < 70);
  if (weakest) {
    add({
      id: `readiness-${weakest.key}`,
      title: `${weakest.label} readiness ${weakest.pct}%`,
      detail: weakest.gaps[0] ?? `Strengthen your ${weakest.label.toLowerCase()} profile.`,
      dueInDays: null,
      tab: weakest.tab,
      score: 34 + weakest.pct / 10,
    });
  }

  // ---- 9. Journey-specific step for the current stage --------------------
  for (const need of input.journey.stillNeeded) {
    add({
      id: `stage-${input.journey.current}-${need.text.slice(0, 24)}`,
      title: need.text,
      detail: `Next step in your ${labelFor(input.journey.current)} stage.`,
      dueInDays: null,
      tab: need.tab || stageTab(input.journey.current),
      score: 40,
    });
  }

  // ---- 10. Nothing at all → give a first action --------------------------
  if (steps.length === 0) {
    add({
      id: "start",
      title: "Start your study plan",
      detail: "Tell us the major, the country and the year — we build the ten phases for you.",
      dueInDays: null,
      tab: "study-plan",
      score: 20,
    });
  }

  const seen = new Set<string>();
  return steps
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      const key = s.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function labelFor(testType: string): string {
  switch (testType) {
    case "ielts":
      return "IELTS";
    case "toefl":
      return "TOEFL";
    case "sat":
      return "SAT";
    case "act":
      return "ACT";
    case "duolingo":
      return "Duolingo English Test";
    default:
      return testType.toUpperCase();
  }
}

function stageTab(stage: string): string {
  switch (stage) {
    case "discover":
      return "universities";
    case "match":
      return "chancing";
    case "prepare":
      return "documents";
    case "apply":
      return "applications";
    case "accepted":
      return "offers";
    case "fund":
      return "funding";
    case "visa":
      return "visa";
    case "depart":
      return "departure";
    default:
      return "dashboard";
  }
}
