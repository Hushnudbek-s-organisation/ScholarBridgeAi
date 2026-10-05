/**
 * Deterministic "which linked source is the best one to show?" picker.
 *
 * Used by `/api/universities` and `/api/scholarships` when mapping
 * `*_sources` links onto the row returned to the client.
 *
 * Rules (no guessing, stable answers):
 *   1. the source with the most recent `accessedAt` wins;
 *   2. sources without a date are only used when nothing dated exists;
 *   3. ties (same date, or two undated rows) break on the LOWEST source id,
 *      so the same database contents always produce the same response.
 *
 * A single implementation also keeps the two list endpoints from drifting
 * apart — they previously carried two copies of a loop with an unreachable
 * branch and order-dependent results.
 */
export interface PickableSource {
  id: number;
  url: string;
  title: string;
  accessedAt: Date | null;
}

export function pickBestSource<T extends PickableSource>(
  links: { sourceId: number | null }[],
  byId: Map<number, T>,
): T | null {
  let best: T | null = null;
  let bestId = Number.POSITIVE_INFINITY;
  for (const link of links) {
    if (link.sourceId == null) continue;
    const src = byId.get(link.sourceId);
    if (!src) continue;
    if (!best) {
      best = src;
      bestId = link.sourceId;
      continue;
    }
    const candidateAt = src.accessedAt ? src.accessedAt.getTime() : null;
    const bestAt = best.accessedAt ? best.accessedAt.getTime() : null;
    if (candidateAt != null && (bestAt == null || candidateAt > bestAt)) {
      best = src;
      bestId = link.sourceId;
      continue;
    }
    if (candidateAt == null && bestAt == null && link.sourceId < bestId) {
      best = src;
      bestId = link.sourceId;
    }
  }
  return best;
}
