import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { CatalogueFact, EntityType } from "./evidencePolicy";
import { fromCatalogueFact,databaseVerificationISO } from "./typedEvidence";
import { presentFact } from "./factPresentation";
let migrationCooldown = 0;
/** The exact production query is exported for disposable-PG EXPLAIN proofs. */
export function catalogueFactsQuery(entity:EntityType,ids:number[]){
  return sql`SELECT f.*, EXISTS(SELECT 1 FROM public.sources s WHERE s.is_official AND lower(regexp_replace(s.domain,'^www[.]','')) = lower(regexp_replace(split_part(split_part(f.source_url,'://',2),'/',1),'^www[.]',''))) AS publisher_official FROM public.catalogue_facts f WHERE f.is_active AND f.entity_type=${entity} AND f.entity_id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`,`,
      )}) ORDER BY f.entity_id,f.field_key,f.id`;
}

export async function loadCatalogueFacts(
  entity: EntityType,
  ids: number[],
  executor:Pick<typeof db,"execute">=db,
): Promise<Map<number, CatalogueFact[]>> {
  if (!ids.length || Date.now() < migrationCooldown) return new Map();
  try {
    const out = new Map<number, CatalogueFact[]>();
    const unique=[...new Set(ids)];
    // Keep prepared statements below PostgreSQL's bind limit. A single entity
    // and all its scoped facts always belong to the same query/snapshot.
    for(let offset=0;offset<unique.length;offset+=500){
    const batch=unique.slice(offset,offset+500);
    const r = await executor.execute(
      catalogueFactsQuery(entity,batch),
    );
    for (const row of r.rows as Record<string, unknown>[]) {
      const fact: CatalogueFact = {
        applicantScope: row.applicant_scope as string|null,
        entityType: entity,
        entityId: Number(row.entity_id),
        fieldKey: String(row.field_key),
        valueNumeric:
          row.value_numeric == null ? null : Number(row.value_numeric),
        valueText: row.value_text as string | null,
        unit: row.unit as string | null,
        currency: row.currency as string | null,
        period: row.period as string | null,
        degreeLevel: row.degree_level as string | null,
        programName: row.program_name as string | null,
        admissionCycle: row.admission_cycle as string | null,
        sourceUrl: row.source_url as string | null,
        verifiedAt: databaseVerificationISO(row.verified_at),
        verificationStatus:
          row.verification_status as CatalogueFact["verificationStatus"],
        valueType: row.value_type as CatalogueFact["valueType"],
        notes: row.notes as string | null,
        publisherOfficial: row.publisher_official === true,
      };
      const list = out.get(fact.entityId) ?? [];
      list.push(fact);
      out.set(fact.entityId, list);
    }
    }
    return out;
  } catch (e) {
    const code =
      (e as { cause?: { code?: string }; code?: string }).cause?.code ??
      (e as { code?: string }).code;
    if (code === "42P01" || code === "42703") {
      migrationCooldown = Date.now() + 30000;
      // An enclosing transaction needs to roll back its savepoint before
      // continuing; swallowing a missing-table error would poison that tx.
      if(executor!==db)throw e;
      console.warn(
        "catalogue facts migration pending: bounded legacy discovery fallback, no official eligibility",
      );
      return new Map();
    }
    throw e;
  }
}
export function presentedCatalogueFacts(facts: CatalogueFact[]) {
  return facts.map((f) => ({
    ...presentFact(fromCatalogueFact(f), f.fieldKey.replaceAll("_", " ")),
    fieldKey: f.fieldKey,
  }));
}
