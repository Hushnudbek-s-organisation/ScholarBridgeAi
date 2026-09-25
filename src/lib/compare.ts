/**
 * University Comparison Tables (Phase 3).
 *
 * A comparison is only useful if it says which column WINS and flags what is
 * missing. A table of ten numbers where half are null invites a student to
 * guess — and they guess from the column that happens to be filled in.
 *
 * Pure module — asserted in `scripts/check-compare.ts`.
 */

export interface CompareUniversity {
  id: number;
  name: string;
  country?: string | null;
  city?: string | null;
  worldRanking?: number | null;
  acceptanceRate?: number | null;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  minGpa?: number | null;
  minIelts?: number | null;
  minSat?: number | null;
  postStudyWorkVisaYears?: number | null;
  internationalStudentsPercentage?: number | null;
  programMajor?: string | null;
}

export interface CompareContext {
  gpa4?: number | null;
  ielts?: number | null;
  sat?: number | null;
  budgetAnnualUsd?: number | null;
}

export type Winner = number | null; // university id, or null when tied/unknown

export interface CompareRow {
  key: string;
  label: string;
  /** Rendered value per university id; null renders as "not published". */
  values: Record<number, string | null>;
  /** Which university wins this row, and why. */
  winner: Winner;
  winnerReason?: string;
  /** True when every cell is unknown — the row says nothing. */
  allUnknown: boolean;
}

export interface CompareResult {
  rows: CompareRow[];
  /** Per-university tally of rows won. */
  scores: Record<number, { wins: number; known: number; unknown: number }>;
  /** Overall verdict, honest when the data cannot separate them. */
  verdict: string;
  /** Rows where a university has no published figure at all. */
  dataGaps: { universityId: number; name: string; missing: string[] }[];
}

const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

export function compareUniversities(
  unis: CompareUniversity[],
  ctx: CompareContext = {}
): CompareResult {
  const rows: CompareRow[] = [];
  const list = unis.slice(0, 6); // more than six columns is unreadable

  const addRow = (
    key: string,
    label: string,
    pick: (u: CompareUniversity) => number | string | null | undefined,
    opts: { better: "low" | "high"; format: (v: number | string) => string; reason: (winner: CompareUniversity) => string }
  ) => {
    const values: Record<number, string | null> = {};
    const numeric: { u: CompareUniversity; num: number }[] = [];

    for (const u of list) {
      const raw = pick(u);
      if (raw == null || raw === "") {
        values[u.id] = null;
        continue;
      }
      const num = typeof raw === "number" ? raw : Number(raw);
      values[u.id] = Number.isFinite(num) ? opts.format(num) : String(raw);
      if (Number.isFinite(num)) numeric.push({ u, num });
    }

    const known = numeric.length;
    // Two rules keep this honest:
    //  - a "winner" out of one known cell is not a comparison;
    //  - a tie is a tie. Naming the first row that happened to match would
    //    hand a university a win it did not earn.
    let winner: Winner = null;
    let best: CompareUniversity | null = null;
    if (known >= 2) {
      const bestVal = numeric.reduce(
        (acc, cur) => (opts.better === "low" ? Math.min(acc, cur.num) : Math.max(acc, cur.num)),
        numeric[0].num
      );
      const tied = numeric.filter((n) => n.num === bestVal);
      if (tied.length === 1) {
        best = tied[0].u;
        winner = best.id;
      }
    }
    rows.push({
      key,
      label,
      values,
      winner,
      winnerReason: winner && best ? opts.reason(best) : undefined,
      allUnknown: known === 0,
    });
  };

  addRow("ranking", "World ranking", (u) => u.worldRanking, {
    better: "low",
    format: (v) => `#${v}`,
    reason: (w) => `${w.name} ranks highest.`,
  });
  addRow("acceptanceRate", "Acceptance rate", (u) => u.acceptanceRate, {
    better: "high",
    format: (v) => `${Math.round(v as number)}%`,
    reason: (w) => `${w.name} admits the largest share of applicants.`,
  });
  addRow("tuition", "Annual tuition", (u) => u.annualTuitionUsd, {
    better: "low",
    format: (v) => usd(v as number),
    reason: (w) => `${w.name} is cheapest at ${usd(Number(w.annualTuitionUsd))}/year.`,
  });
  addRow("living", "Annual living cost", (u) => u.annualLivingEstUsd, {
    better: "low",
    format: (v) => usd(v as number),
    reason: (w) => `${w.name} has the lowest living costs.`,
  });
  addRow("postStudy", "Post-study work visa", (u) => u.postStudyWorkVisaYears, {
    better: "high",
    format: (v) => `${v} year${v === 1 ? "" : "s"}`,
    reason: (w) => `${w.name} offers the longest stay after graduation.`,
  });
  addRow("international", "International students", (u) => u.internationalStudentsPercentage, {
    better: "high",
    format: (v) => `${Math.round(v as number)}%`,
    reason: (w) => `${w.name} has the largest international community.`,
  });

  // --- Text rows: no winner, just the facts --------------------------------
  for (const [key, label, pick] of [
    ["country", "Country", (u: CompareUniversity) => u.country],
    ["city", "City", (u: CompareUniversity) => u.city],
    ["major", "Programme", (u: CompareUniversity) => u.programMajor],
  ] as const) {
    const values: Record<number, string | null> = {};
    for (const u of list) {
      const raw = pick(u);
      values[u.id] = raw == null || String(raw).trim() === "" ? null : String(raw);
    }
    rows.push({
      key,
      label,
      values,
      winner: null,
      allUnknown: Object.values(values).every((v) => v === null),
    });
  }

  // --- Requirements, checked against THIS student --------------------------
  if (ctx.gpa4 != null) {
    const values: Record<number, string | null> = {};
    const margins: { u: CompareUniversity; margin: number }[] = [];
    for (const u of list) {
      if (u.minGpa == null) {
        values[u.id] = null;
        continue;
      }
      const margin = ctx.gpa4 - u.minGpa;
      values[u.id] = margin >= 0 ? `Meets it (+${margin.toFixed(2)})` : `Below by ${Math.abs(margin).toFixed(2)}`;
      margins.push({ u, margin });
    }
    // No winner on a tie, and none from a single published minimum.
    let gpaWinner: Winner = null;
    if (margins.length >= 2) {
      const bestMargin = Math.max(...margins.map((m) => m.margin));
      const tied = margins.filter((m) => m.margin === bestMargin);
      if (tied.length === 1) gpaWinner = tied[0].u.id;
    }
    rows.push({
      key: "gpaFit",
      label: "Your GPA vs minimum",
      values,
      winner: gpaWinner,
      winnerReason: gpaWinner !== null ? "Largest margin above the published minimum." : undefined,
      allUnknown: Object.values(values).every((v) => v === null),
    });
  }

  if (ctx.budgetAnnualUsd != null && ctx.budgetAnnualUsd > 0) {
    const values: Record<number, string | null> = {};
    for (const u of list) {
      const total = (u.annualTuitionUsd ?? 0) + (u.annualLivingEstUsd ?? 0);
      values[u.id] =
        total === 0
          ? null
          : total <= ctx.budgetAnnualUsd
            ? `Within budget (${usd(ctx.budgetAnnualUsd - total)} spare)`
            : `${usd(total - ctx.budgetAnnualUsd)} over budget`;
    }
    rows.push({
      key: "budgetFit",
      label: `Your budget (${usd(ctx.budgetAnnualUsd)})`,
      values,
      winner: null,
      allUnknown: Object.values(values).every((v) => v === null),
    });
  }

  // --- Tallies --------------------------------------------------------------
  const scores: CompareResult["scores"] = {};
  for (const u of list) scores[u.id] = { wins: 0, known: 0, unknown: 0 };
  for (const row of rows) {
    if (row.winner !== null && scores[row.winner]) scores[row.winner].wins += 1;
    for (const u of list) {
      if (row.values[u.id] === null) scores[u.id].unknown += 1;
      else scores[u.id].known += 1;
    }
  }

  const dataGaps = list
    .map((u) => ({
      universityId: u.id,
      name: u.name,
      missing: rows.filter((r) => r.values[u.id] === null).map((r) => r.label),
    }))
    .filter((g) => g.missing.length > 0);

  // --- Verdict --------------------------------------------------------------
  const ranked = list
    .map((u) => ({ u, wins: scores[u.id].wins }))
    .sort((a, b) => b.wins - a.wins || a.u.name.localeCompare(b.u.name));
  const top = ranked[0];
  const runnerUp = ranked[1];

  let verdict: string;
  if (list.length === 0) {
    verdict = "Add universities to compare them.";
  } else if (list.length === 1) {
    verdict = `Only ${list[0].name} is selected — pick at least two to compare.`;
  } else if (!runnerUp || top.wins === runnerUp.wins) {
    verdict =
      "The published data does not separate these universities. Decide on the programme and the fit, not on the ranking.";
  } else if (top.wins <= 1) {
    verdict = `${top.u.name} edges ahead on ${top.wins} measure${top.wins === 1 ? "" : "s"}, but the gap is small enough that programme fit should decide.`;
  } else {
    verdict = `${top.u.name} wins ${top.wins} of the ${rows.filter((r) => r.winner !== null).length} comparable measures.`;
  }

  return { rows: rows.filter((r) => !r.allUnknown), scores, verdict, dataGaps };
}
