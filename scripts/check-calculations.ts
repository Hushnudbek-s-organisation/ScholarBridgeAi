import { completionSummary, percentage, summarizeStatuses } from "../src/lib/calculations";
import { summarizeApplications } from "../src/lib/journey/applicationSummary";

let passed = 0;
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

console.log("Shared backend calculations");
equal(percentage(1, 3), 33, "rounds a normal ratio");
equal(percentage(9, 3), 100, "clamps above 100");
equal(percentage(-2, 3), 0, "clamps negative progress");
equal(percentage(2, 0), 0, "empty denominator is 0, not NaN or complete");
equal(percentage(Number.NaN, 2), 0, "invalid input is safe");
equal(
  completionSummary(3, 5),
  { done: 3, total: 5, remaining: 2, pct: 60, complete: false },
  "returns one canonical summary"
);
equal(completionSummary(0, 0).complete, false, "empty work is never falsely complete");
equal(completionSummary(9, 4).done, 4, "done cannot exceed total");
equal(completionSummary(4, 4).complete, true, "real finished work is complete");
equal(
  summarizeStatuses(
    [{ status: "done" }, { status: "pending" }, { status: "not_required" }],
    (row) => row.status === "done" || row.status === "not_required"
  ).pct,
  67,
  "status semantics are supplied once by the domain caller"
);
equal(
  summarizeApplications(
    [
      { id: 1, submittedAt: null },
      { id: 2, submittedAt: "2026-10-01" },
      { id: 3, submittedAt: "2026-10-02" },
    ],
    [
      { applicationId: 2, status: "pending" },
      { applicationId: 3, status: "accepted" },
      { applicationId: 3, status: "accepted" },
    ]
  ),
  { total: 3, preparing: 1, submitted: 2, decision: 1 },
  "application decisions are deduplicated and pending is not a decision"
);

console.log(`\ncalculation test passed (${passed} assertions)`);
