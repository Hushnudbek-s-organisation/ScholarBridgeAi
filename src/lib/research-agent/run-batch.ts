/**
 * Batch runner (spec §17) — sequential, rate-limited, per-university audit.
 */
import { withResearchLease, ResearchLeaseLostError, type ResearchLease } from "./writeFence";
import { runUniversity } from "./run-university";
import { AGENT_CONFIG } from "./config";
import { sleep } from "./fetch";
import type { AuditReport, RunRequest } from "./types";

export interface RunBatchCallbacks {
  lease?: ResearchLease;
  /** Called after each university finishes, including when it produced errors. */
  onUniversityComplete?: (report: AuditReport) => void | Promise<void>;
  /** Called when a university throws before an audit report can be produced. */
  onUniversityError?: (universityId: number, error: string) => void | Promise<void>;
}

export async function runBatch(
  request: RunRequest,
  progress: (universityId: number, message: string) => void,
  isCancelled: () => boolean = () => false,
  callbacks: RunBatchCallbacks = {}
): Promise<{ reports: AuditReport[]; errors: string[] }> {
  const reports: AuditReport[] = [];
  const errors: string[] = [];

  for (const id of request.universityIds) {
    if (isCancelled()) {
      errors.push("Cancelled by user");
      break;
    }
    progress(id, `Starting university #${id}...`);
    try {
      const execute=()=>runUniversity(id, request.scopes, request.dryRun ?? false, (m) => progress(id, m), request.maxPages);
      const report = await (callbacks.lease?withResearchLease(callbacks.lease,execute):execute());
      reports.push(report);
      // Every university result is handed to the caller so it can be persisted
      // in the durable batch report, not just the last one.
      await callbacks.onUniversityComplete?.(report);
    } catch (err: any) {
      if(err instanceof ResearchLeaseLostError)throw err;
      const message = `#${id}: ${err?.message || err}`;
      errors.push(message);
      await callbacks.onUniversityError?.(id, message);
    }
    // Sequential + rate limit (spec §17, §21)
    if (id !== request.universityIds[request.universityIds.length - 1] && !isCancelled()) await sleep(AGENT_CONFIG.batchDelayMs);
  }

  return { reports, errors };
}
