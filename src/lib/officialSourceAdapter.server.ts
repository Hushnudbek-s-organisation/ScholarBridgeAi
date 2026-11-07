/**
 * Production wiring for the official-source re-verification adapter.
 *
 * Loads ONLY important typed facts that have an official source link, builds a
 * concrete `OfficialSourceAdapter`, and persists each check (result + verified
 * fact + source) into `official_source_checks`. Everything is best-effort: if
 * the reviewable migration has NOT been applied yet, the returned adapter
 * reports a clear `migration_pending` failure for every scope and NEVER allows
 * a verified date to move. There is no silent "success" and no in-memory
 * fallback that could claim verification without evidence.
 *
 * Never reads or logs tokens, passwords, service-role keys or document bodies.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createOfficialSourceAdapter, type OfficialSourceCheckResult, type OfficialSourceTarget } from "./officialSourceAdapter";
import type { OfficialSourceAdapter } from "./refreshModes";
import { logSafe } from "./observability";

const MAX_TARGETS = 200;

interface FactRow {
  id: string;
  version:string;applicant_scope:string|null;unit:string|null;currency:string|null;period:string|null;value_type:string;
  entity_type: string;
  entity_id: number;
  field_key: string;
  expected_value: string;
  source_url: string;
  admission_cycle: string | null;
  program_name: string | null;
  degree_level: string | null;
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function loadOfficialSourceTargets(scope: string): Promise<OfficialSourceTarget[]> {
  const [facts, officialDomains] = await Promise.all([
    db.execute(sql`
      SELECT f.id,f.version::text,applicant_scope,unit,currency,period,value_type, entity_type, entity_id, field_key,
             COALESCE(value_text, value_numeric::text, '') AS expected_value,
             source_url, admission_cycle, program_name, degree_level
      FROM public.catalogue_facts f
      WHERE is_active
        AND source_url IS NOT NULL
        AND entity_type IN ('university','scholarship','program')
        AND (${scope} = 'all' OR (${scope}='scholarships' AND entity_type='scholarship') OR (${scope}='universities' AND entity_type IN ('university','program')))
        AND verification_status IN ('verified','review_needed','unverified','failed_verification')
        AND COALESCE(value_text, value_numeric::text, '') <> ''
      AND EXISTS (SELECT 1 FROM public.sources s WHERE s.is_official AND lower(regexp_replace(s.domain,'^www[.]',''))=lower(regexp_replace(split_part(split_part(f.source_url,'://',2),'/',1),'^www[.]','')))
      ORDER BY (SELECT max(c.checked_at) FROM public.official_source_checks c WHERE c.fact_id=f.id) ASC NULLS FIRST, f.id
      LIMIT ${MAX_TARGETS}
    `),
    db.execute(sql`SELECT DISTINCT lower(btrim(domain)) AS domain FROM public.sources WHERE is_official = true AND domain IS NOT NULL`),
  ]);
  const domains = new Set(
    ((officialDomains as unknown as { rows?: { domain: string }[] }).rows ?? [])
      .map((r) => String(r.domain ?? "").replace(/^www\./, ""))
      .filter(Boolean),
  );
  const rows = ((facts as unknown as { rows?: FactRow[] }).rows ?? []) as FactRow[];
  const out: OfficialSourceTarget[] = [];
  for (const row of rows) {
    const host = hostOf(row.source_url);
    // An official source link is required. If the link host is not a known
    // official domain, the fact goes to the review queue instead of being
    // "verified" against a third-party page.
    if (!host || !domains.has(host)) continue;
    if (scope === "scholarships" && row.entity_type !== "scholarship") continue;
    if (scope === "universities" && !["university","program"].includes(row.entity_type)) continue;
    out.push({
      factId: row.id,
      expectedVersion:row.version,applicantScope:row.applicant_scope,unit:row.unit,currency:row.currency,period:row.period,valueType:row.value_type,
      entityType: row.entity_type as "university" | "scholarship" | "program",
      entityId: Number(row.entity_id),
      fieldKey: String(row.field_key),
      expectedValue: String(row.expected_value),
      sourceUrl: row.source_url,
      officialDomain: host,
      admissionCycle: row.admission_cycle,
      programName: row.program_name,
      degreeLevel: row.degree_level,
    });
  }
  return out;
}

/** A successful persisted check and the exact fact change commit together or neither does. */
export async function persistOfficialSourceCheck(result:OfficialSourceCheckResult):Promise<void>{
  const committed=await db.transaction(async tx=>{
    const check={...result,factApplied:false};
    if(check.verificationSucceeded&&check.officialPageReRead&&check.evidencePresent){
      if(!check.factId||!check.expectedVersion||!check.verifiedFact){
        check.verificationSucceeded=false;check.reason="Exact fact version/snapshot missing; no fact was changed";
      }else{
        const applied=await tx.execute(sql`UPDATE public.catalogue_facts SET verified_at=${check.checkedAt}::timestamptz,verification_status='verified'
          WHERE id=${check.factId}::uuid AND version=${check.expectedVersion}::bigint AND is_active
          AND entity_type=${check.entityType} AND entity_id=${check.entityId} AND field_key=${check.fieldKey}
          AND source_url=${check.sourceUrl}
          AND admission_cycle IS NOT DISTINCT FROM ${check.admissionCycle??null}
          AND program_name IS NOT DISTINCT FROM ${check.programName??null}
          AND degree_level IS NOT DISTINCT FROM ${check.degreeLevel??null}
          AND applicant_scope IS NOT DISTINCT FROM ${check.applicantScope??null}
          AND unit IS NOT DISTINCT FROM ${check.unit??null} AND currency IS NOT DISTINCT FROM ${check.currency??null}
          AND period IS NOT DISTINCT FROM ${check.period??null} AND value_type IS NOT DISTINCT FROM ${check.valueType??null}
          AND ${check.verifiedFact}=field_key||'='||COALESCE(value_text,value_numeric::text,'')
          RETURNING id`);
        check.factApplied=applied.rows.length===1;
        if(!check.factApplied){check.verificationSucceeded=false;check.reason="Stale, inactive or scope/value/version mismatch; no fact was changed";}
      }
    }
    await tx.execute(sql`INSERT INTO public.official_source_checks(
      fact_id,admission_cycle,program_name,degree_level,applicant_scope,expected_version,fact_applied,
      entity_type,entity_id,field_key,source_url,verified_fact,evidence_excerpt,http_status,
      official_page_re_read,verification_succeeded,evidence_present,reason,checked_at)
      VALUES(${check.factId??null}::uuid,${check.admissionCycle??null},${check.programName??null},${check.degreeLevel??null},${check.applicantScope??null},${check.expectedVersion??null}::bigint,${check.factApplied},
      ${check.entityType},${check.entityId},${check.fieldKey},${check.sourceUrl},${check.verifiedFact},${check.evidenceExcerpt},${check.httpStatus},
      ${check.officialPageReRead},${check.verificationSucceeded},${check.evidencePresent},${check.reason},${check.checkedAt}::timestamptz)`);
    if(check.factApplied)await tx.execute(sql`INSERT INTO public.cache_revisions(scope,revision,reason,updated_at) VALUES('catalogue',2,'exact official fact refresh',now()) ON CONFLICT(scope) DO UPDATE SET revision=cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=now()`);
    return check;
  });
  Object.assign(result,committed);
}

/**
 * Returns the adapter used by `runRefresh` when a caller does not inject one.
 * The adapter itself performs the DB work lazily, so a missing migration is
 * surfaced as an honest failed check rather than a module-load 500.
 */
export function getServerOfficialSourceAdapter(): OfficialSourceAdapter {
  return async (scope) => {
    let targets: OfficialSourceTarget[];
    try {
      targets = await loadOfficialSourceTargets(scope);
    } catch (err) {
      // Migration not applied / table missing: clear, safe failure. No page is
      // fetched, no verified date changes, and no value is overwritten.
      const code = (err as {cause?:{code?:string};code?:string}).cause?.code ?? (err as {code?:string}).code;
      const message = code === "28P01" || code === "28000"
        ? "Database authentication failed; verification and structural checks did not run"
        : code === "42P01" || code === "42703"
          ? "official_source_checks/catalogue_facts migration is not applied — no verified dates were changed"
          : "Verification store unavailable — no verified dates were changed";
      // Only a classified, secret-free reason is logged; the raw DB error may
      // contain a connection string or a query with values.
      logSafe("official_source.unavailable", { scope, reason: message, errorClass: code && /^[A-Z0-9]{5}$/.test(code) ? code : "unclassified" });
      return [{
        entityType: "university",
        entityId: 0,
        sourceUrl: "",
        officialPageReRead: false,
        verificationSucceeded: false,
        evidencePresent: false,
        reason: message,
      } as OfficialSourceCheckResult];
    }
    return createOfficialSourceAdapter({ targets, persist:persistOfficialSourceCheck })(scope);
  };
}
