import { invalidateCatalogCache } from "@/lib/catalogCache";
import { boundedPageInteger } from "@/lib/pagination";
import { db } from "@/db";
import { refreshJobs, scholarships, universities } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { computeScholarshipStatus } from "@/lib/scholarshipStatus";
import { notifyScholarshipOpened } from "@/lib/notificationSweep";
import { mayRefreshVerifiedDate } from "@/lib/evidencePolicy";
import {
  DEFAULT_REFRESH_MODE,
  type OfficialSourceAdapter,
  type RefreshMode,
} from "@/lib/refreshModes";
import type { OfficialSourceCheckResult } from "@/lib/officialSourceAdapter";
import { newJobId, logSafe, safeErrorMessage } from "@/lib/observability";

/**
 * Data-refresh pipeline (spec §5, §9).
 *
 * Two explicit modes:
 *  1. status_from_existing_dates — recompute lifecycle state from dates already
 *     in the database. This is NOT an official page re-read and never refreshes
 *     last_verified_at.
 *  2. official_source_reverification — an official source adapter actually
 *     re-reads pages. Only a successful, evidence-backed check may refresh a
 *     verified date. A failed check is logged and leaves the date untouched.
 *
 * The HTTP admin route never accepts an adapter from the request body. When
 * `official_source_reverification` is requested, `runRefresh` constructs the
 * SSRF-safe SERVER adapter itself (see officialSourceAdapter.server.ts), which
 * actually fetches official pages, verifies one specific fact per row, and
 * persists the result + verified fact + source. A missing migration yields a
 * clear failed check, never a silently "verified" date.
 */

export interface RefreshResult {
  processed: number;
  changed: number;
  discovered: number;
  errors: string[];
  mode: RefreshMode;
  sourcePagesRead: number;
  verifiedDatesUpdated: number;
  failedVerification: boolean;
  /** Per-fact evidence results, shown in the admin refresh center. */
  sourceChecks: OfficialSourceCheckResult[];
}

export interface RunRefreshOptions {
  mode?: RefreshMode;
  /** Injectable for tests; never accepted from an HTTP request body. */
  officialSourceAdapter?: OfficialSourceAdapter;
}

/** Best-effort: mode columns are added by the reviewable migration. */
async function recordJobExtras(
  jobId: number,
  result: Pick<RefreshResult, "mode" | "sourcePagesRead" | "verifiedDatesUpdated" | "failedVerification">
): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE public.refresh_jobs
      SET mode = ${result.mode},
          source_pages_read = ${result.sourcePagesRead},
          verified_dates_updated = ${result.verifiedDatesUpdated},
          failed_verification = ${result.failedVerification}
      WHERE id = ${jobId}
    `);
  } catch {
    // The base refresh_jobs schema predates the migration; keep the legacy
    // job log working until that migration is explicitly approved and applied.
  }
}

export async function createRefreshJob(jobType: string, trigger = "manual", mode: RefreshMode = DEFAULT_REFRESH_MODE) {
  const [job] = await db
    .insert(refreshJobs)
    .values({ jobType, trigger, status: "pending" })
    .returning();
  await recordJobExtras(job.id, {
    mode,
    sourcePagesRead: 0,
    verifiedDatesUpdated: 0,
    failedVerification: false,
  });
  return job;
}

export async function startRefreshJob(jobId: number) {
  await db.update(refreshJobs).set({ status: "running", startedAt: new Date() }).where(eq(refreshJobs.id, jobId));
}

export async function finishRefreshJob(jobId: number, result: RefreshResult, error?: string) {
  await db
    .update(refreshJobs)
    .set({
      status: error ? "failed" : "success",
      itemsProcessed: result.processed,
      itemsChanged: result.changed,
      error: error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(refreshJobs.id, jobId));
  await recordJobExtras(jobId, result);
}

function emptyResult(mode: RefreshMode): RefreshResult {
  return {
    processed: 0,
    changed: 0,
    discovered: 0,
    errors: [],
    mode,
    sourcePagesRead: 0,
    verifiedDatesUpdated: 0,
    failedVerification: false,
    sourceChecks: [],
  };
}

/** Status recomputation from existing dates; never claims an official re-read. */
async function recomputeStatusFromDates(
  scope: "all" | "scholarships" | "universities",
  result: RefreshResult
): Promise<void> {
  if (scope === "scholarships" || scope === "all") {
    const rows = await db.select().from(scholarships);
    result.processed += rows.length;
    for (const s of rows) {
      const status = computeScholarshipStatus(s);
      if (s.applicationStatus !== status) {
        await db
          .update(scholarships)
          .set({ applicationStatus: status, lastUpdatedAt: new Date() })
          .where(eq(scholarships.id, s.id));
        result.changed += 1;
        // Applications just opened → everyone who saved it (bell + Telegram).
        if (status === "open") {
          await notifyScholarshipOpened(s).catch((err) => console.warn("scholarship_opened notify failed:", err));
        }
      }
    }
  }

  if (scope === "universities" || scope === "all") {
    const rows = await db.select().from(universities);
    result.processed += rows.length;
    const oldThreshold = new Date(Date.now() - 180 * 86400000);
    for (const u of rows) {
      if (!u.lastVerifiedAt || u.lastVerifiedAt < oldThreshold) {
        if (u.verificationStatus !== "needs_verification") {
          await db
            .update(universities)
            .set({ verificationStatus: "needs_verification" })
            .where(eq(universities.id, u.id));
          result.changed += 1;
        }
      }
    }
  }
  // Intentionally no last_verified_at / verificationStatus="verified" write here.
}

/** Real official-page re-read; verified dates move only with evidence. */
async function reverifyOfficialSources(
  scope: "all" | "scholarships" | "universities",
  adapter: OfficialSourceAdapter | undefined,
  result: RefreshResult
): Promise<void> {
  if (!adapter) {
    result.errors.push("Official source adapter is not configured; no verified dates were changed.");
    result.failedVerification = true;
    return;
  }

  const checks = await adapter(scope);
  result.processed = checks.length;
  result.sourceChecks = checks as OfficialSourceCheckResult[];
  result.sourcePagesRead=new Set(checks.filter(check=>check.officialPageReRead).map(check=>check.sourceUrl)).size;
  for (const check of checks) {
    const allowed = mayRefreshVerifiedDate({
      officialPageReRead: check.officialPageReRead,
      verificationSucceeded: check.verificationSucceeded,
      evidencePresent: check.evidencePresent,
    });
    if (!allowed) {
      result.failedVerification = true;
      result.errors.push(
        `Official verification failed or was incomplete for ${check.entityType}#${check.entityId}; verified date unchanged.`
      );
      continue;
    }
    const field=check as OfficialSourceCheckResult;
    if(!field.factApplied){
      try{await (await import("./officialSourceAdapter.server")).persistOfficialSourceCheck(field);}
      catch{result.failedVerification=true;result.errors.push("Exact fact/check transaction failed; no success was reported.");continue;}
    }
    if(!field.factApplied||!field.verificationSucceeded){result.failedVerification=true;result.errors.push(field.reason??"Exact fact was not applied.");continue;}
    result.verifiedDatesUpdated+=1;
    result.changed+=1;
  }
}

export async function runRefresh(
  scope: "all" | "scholarships" | "universities",
  options: RunRefreshOptions = {}
): Promise<RefreshResult> {
  const mode = options.mode ?? DEFAULT_REFRESH_MODE;
  const job = await createRefreshJob(`${scope}:${mode}`, "manual", mode);
  await startRefreshJob(job.id);

  const result = emptyResult(mode);

  const requestId = newJobId("refresh");
  logSafe("refresh.started", { requestId, jobId: job.id, mode, scope });
  try {
    if (mode === "status_from_existing_dates") {
      await recomputeStatusFromDates(scope, result);
    } else {
      // Build the real SSRF-safe server adapter. No adapter is ever taken from
      // the HTTP body. If the migration is missing, the adapter returns a clear
      // failed check, so `failedVerification` is set and no date moves.
      let adapter = options.officialSourceAdapter;
      if (!adapter) {
        const { getServerOfficialSourceAdapter } = await import("@/lib/officialSourceAdapter.server");
        adapter = getServerOfficialSourceAdapter();
      }
      await reverifyOfficialSources(scope, adapter, result);
    }
    // A failed verification is a completed job with an honest log, not a
    // silent "success" that refreshed a date.
    await finishRefreshJob(job.id, result, result.failedVerification && result.verifiedDatesUpdated === 0 ? result.errors.join("; ") : undefined);
    logSafe("refresh.finished", {
      requestId, jobId: job.id, mode, processed: result.processed,
      sourcePagesRead: result.sourcePagesRead, verifiedDatesUpdated: result.verifiedDatesUpdated,
      failedChecks: result.sourceChecks.filter((c) => !c.verificationSucceeded).length,
      failedVerification: result.failedVerification,
    });
  } catch (err: unknown) {
    // Only a safe, classified message reaches the log and the job record —
    // never a raw DB error that could carry a connection string.
    const message = safeErrorMessage(err);
    result.errors.push(message);
    result.failedVerification = true;
    logSafe("refresh.error", { requestId, jobId: job.id, mode, reason: message });
    await finishRefreshJob(job.id, result, message);
  } finally {
    if (result.changed > 0) await invalidateCatalogCache(scope === "all" ? "all" : scope);
  }

  return result;
}

/**
 * List recent jobs for the admin refresh center. The four reviewable-migration
 * columns (mode / source_pages_read / verified_dates_updated /
 * failed_verification) are read with raw SQL because the base Drizzle schema
 * predates them. If the migration has NOT been applied, we fall back to the
 * plain rows and fill honest defaults — the UI still shows WHY a re-verification
 * is unavailable instead of silently hiding the mode.
 */
export async function listRefreshJobs(limit = 30) {
  const bounded = boundedPageInteger(limit, 30, 1, 100);
  try {
    const result = await db.execute(sql`
      SELECT id, job_type, status, trigger, items_processed, items_changed,
             error, started_at, finished_at, created_at,
             mode, source_pages_read, verified_dates_updated, failed_verification
      FROM public.refresh_jobs
      ORDER BY created_at DESC
      LIMIT ${bounded}
    `);
    const rows = (result as unknown as { rows?: Record<string, unknown>[] }).rows ?? [];
    if (rows.length) return rows;
  } catch {
    // Migration not applied — fall through to the base schema.
  }
  const rows = await db.select().from(refreshJobs).orderBy(desc(refreshJobs.createdAt)).limit(bounded);
  return rows.map((row) => ({
    ...row,
    mode: "status_from_existing_dates",
    source_pages_read: 0,
    verified_dates_updated: 0,
    failed_verification: false,
  }));
}
