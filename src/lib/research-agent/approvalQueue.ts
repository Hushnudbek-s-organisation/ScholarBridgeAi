/**
 * Research-agent diff & approval queue (spec §5.4).
 *
 * WHY THIS EXISTS
 * ---------------
 * The agent already produced a field-by-field diff (`oldValue → newValue` with
 * the source URL and the reason), but the diff was inert: an operator either
 * trusted a whole run or re-ran it, and "review required" rows — the cases the
 * validator could not confirm — had no path into the database at all.
 *
 * This module turns a run report into a reviewable queue:
 *
 *   1. every proposed university-field change becomes one item with a stable id
 *      (`<entity>.<field>`), so the same proposal keeps its identity across
 *      re-runs and a decision is never re-asked;
 *   2. approving an item is a pure state change — the proposed value is copied,
 *      never edited, so an approval can never smuggle in a value the source did
 *      not state;
 *   3. only `approved` items produce the field allow-list handed to the next
 *      (writing) run, so nothing reaches a catalogue row that a human did not
 *      look at. Rejected items are remembered and skipped.
 *
 * Pure: no DB, no clock, no model. Asserted in `scripts/check-growth.ts`.
 */

import type { AuditReport, FieldDecision, WriteAction } from "./types";

export type QueueDecision = "pending" | "approved" | "rejected";

export interface QueueItem {
  /** Stable identity: `<entity>.<field>` (entity omitted for university rows). */
  id: string;
  universityId: number;
  universityName: string;
  entity: string;
  field: string;
  action: WriteAction;
  /** What the catalogue holds now — `null` means "not recorded", never zero. */
  currentValue: unknown;
  /** What the source states. Copied verbatim on approval. */
  proposedValue: unknown;
  currency?: string;
  period?: string;
  reason: string;
  sourceUrl: string;
  sourceTitle?: string;
  confidence?: number;
  /** `review` rows are proposals the validator could not confirm. */
  needsReview: boolean;
  decision: QueueDecision;
}

export function queueItemId(entity: string, field: string): string {
  return entity ? `${entity}.${field}` : field;
}

/** One queue item per proposed change in the report (idempotent by id). */
export function buildApprovalQueue(report: AuditReport): QueueItem[] {
  const items: QueueItem[] = [];
  const seen = new Set<string>();
  const push = (decision: FieldDecision, needsReview: boolean) => {
    const entity = decision.entity ?? "university";
    const id = queueItemId(entity, decision.field);
    if (seen.has(id)) return;
    seen.add(id);
    items.push({
      id,
      universityId: report.universityId,
      universityName: report.universityName,
      entity,
      field: decision.field,
      action: decision.action,
      currentValue: decision.dbValue ?? null,
      proposedValue: decision.newValue ?? null,
      currency: decision.currency,
      period: decision.period,
      reason: decision.reason,
      sourceUrl: decision.sourceUrl,
      sourceTitle: decision.sourceTitle,
      confidence: decision.confidence,
      needsReview,
      decision: "pending",
    });
  };

  for (const decision of report.updatedFields) push(decision, false);
  for (const entry of report.reviewRequired) {
    // Only structured review rows can be queued; a bare string is a reason with
    // no proposed value, and inventing one would be fabrication.
    if (typeof entry !== "string") push(entry, true);
  }
  return items;
}

/** Merge a fresh run into an existing queue without re-asking answered items. */
export function mergeQueues(existing: QueueItem[], incoming: QueueItem[]): QueueItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  const merged: QueueItem[] = [];
  for (const item of incoming) {
    const previous = byId.get(item.id);
    if (previous) {
      // A decision survives a re-run; the newest proposal text is kept.
      merged.push({ ...item, decision: previous.decision });
      byId.delete(item.id);
    } else {
      merged.push(item);
    }
  }
  // Items that the new run no longer proposes stay visible as decided history.
  for (const leftover of byId.values()) merged.push(leftover);
  return merged;
}

export function decideQueueItem(
  items: QueueItem[],
  id: string,
  decision: QueueDecision,
): QueueItem[] {
  return items.map((item) => (item.id === id ? { ...item, decision } : item));
}

export function queueSummary(items: QueueItem[]): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  needsReview: number;
  readyToApply: boolean;
} {
  const pending = items.filter((i) => i.decision === "pending").length;
  const approved = items.filter((i) => i.decision === "approved").length;
  const rejected = items.filter((i) => i.decision === "rejected").length;
  const needsReview = items.filter((i) => i.needsReview).length;
  return {
    total: items.length,
    pending,
    approved,
    rejected,
    needsReview,
    // Nothing is applied while an operator has unanswered proposals on screen.
    readyToApply: items.length > 0 && pending === 0 && approved > 0,
  };
}

/**
 * The field allow-list for the next writing run. Keys are `entity.field`, the
 * same identity the queue uses, so the two can never drift apart.
 */
export function approvedFieldKeys(items: QueueItem[]): string[] {
  return items.filter((i) => i.decision === "approved").map((i) => i.id);
}

/** True when a decision allows the given field to be written, if gated. */
export function fieldIsApproved(allowList: string[] | null | undefined, entity: string, field: string): boolean {
  if (!allowList || allowList.length === 0) return false;
  const id = queueItemId(entity, field);
  return allowList.includes(id) || allowList.includes(field);
}
