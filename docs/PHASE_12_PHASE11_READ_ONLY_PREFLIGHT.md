# Phase 11 SQL — Phase 12 read-only preflight report

**Review date:** 2026-10-22
**Migration reviewed:** `supabase/catalog_and_integrity_2026_patch.sql` (51,855 bytes)
**Status:** Static review only; target-data preflight was not possible in this workspace.

## Target identity and execution status

The `DATABASE_URL`, `SUPABASE_DB_URL`, `STAGING_DATABASE_URL`, and `TEST_DATABASE_URL` environment variables were unset. The only `.env*` file present was `.env.example`. No staging/test snapshot or connection descriptor was available to verify as isolated. No migration connection or read-only target query was attempted.

**The Phase 11 migration and all of its statements remain not executed.** No equivalent migration write was run. The local embedded PostgreSQL instances used for integration and HTTP security verification were isolated test databases; they were not used for migration preflight, and the Phase 11 SQL was not applied to them.

## Static statement and schema review

- The SQL has exactly one outer `BEGIN;` at line 8 and one terminal `COMMIT;` at line 678. No nested transaction delimiter was found.
- `universities`, `programs`, `application_cycles`, `sources`, `university_rankings`, `university_sources`, and `scholarships` were compared with `src/db/schema.ts` and `supabase/full_schema.sql`.
- Existing date/verification fields used by the patch are represented as expected: `application_cycles.deadline` is `date`; scholarship `deadline` is `text`, while `deadline_date`, opening/range dates are `date`; the scholarship/program/cycle verification timestamps are `last_verified_at` (timestamp). No `scholarship_cycles` table is used.
- The migration adds provenance/effective-period columns with `ADD COLUMN IF NOT EXISTS`; those are additive SQL-side fields not represented in the current Drizzle table declarations. Their target presence/type still needs to be checked on staging before execution.
- `application_cycles.program_id` is nullable and paired with `university_id`; the shipped schema has the composite `(program_id, university_id)` foreign key to `(programs.id, programs.university_id)`. Any future cycle work must preserve that association.
- Ranking labels retain the QS display text (including `=22`); the ranking field is an integer rank. `annual_tuition_usd` and other legacy USD mirrors are intentionally not overwritten by the TUM fee section, which records programme/semester-specific EUR evidence instead.

## Actual baseline and affected counts

**Unavailable.** No non-production target was configured, so no production-like baseline counts, duplicate counts, or affected-row counts can truthfully be reported. Counts from the throwaway application-test databases are not a Phase 11 target baseline and were not substituted.

The existing SQL contains read-only preview sections for the Phase 9 programme/cycle downgrades, Phase 10 ranking identity matches, TUM placeholder descriptions, regional-university candidates, and Phase 11 scholarship/cycle corrections and inserts (`PREFLIGHT 11A`–`11E`). These previews have not been executed against a target.

The operator must collect, at minimum, the following from an independently confirmed staging/test database before review:

1. Total rows in `universities`, `programs`, `scholarships`, and `application_cycles`.
2. Verified program counts, including rows where `official_url` or `source_url` is null, empty, root-only, or resolves to the university homepage; and rows with the Phase 9 bulk timestamp.
3. Exact Phase 9 program and cycle downgrade previews, with IDs and original verification fields; separately count cycles on the `2027-03-01` placeholder with the migration's full timestamp/source predicates.
4. The five ranking alias match sets and their per-fact `matching_university_rows`, plus current rank/year/source values. Review duplicate identities, not only counts.
5. Every TUM row matching the TUM identity aliases, whether or not its description matches the two update patterns; include IDs, canonical names, current description and tuition fields. Count all affected ranking, source-link, and description writes.
6. For each regional university, count matches across `name`, `canonical_name`, and `short_name`, and list the matching IDs before evaluating insertion eligibility.
7. Run `PREFLIGHT 11A`–`11E` unmodified and record exact title match counts, candidate counts, duplicate IDs, scholarship field values, and forum-thread IDs/body previews. Also count cycles/records related to any affected university/program identity using the actual foreign-key associations.
8. Record post-review affected-row estimates for every `UPDATE` and `INSERT`; compare them with the actual target output, not with this report.

## Ambiguity and migration hazards found statically

- **Ranking aliases can affect more than one university row.** The Phase 10 preview reports `matching_university_rows`, but the subsequent ranking upsert and legacy-field update are not gated on exactly one matching university. If the preview returns more than one row for a fact, multiple institution records may be changed. Resolve the identity manually or add a uniqueness guard before any execution.
- **TUM fee-link/description matching is not count-guarded.** The `tum` CTE and description update use alias predicates and can match multiple university rows. The current description preview filters to the two placeholder patterns and therefore does not show all TUM-alias rows. The preview should list every alias match and its proposed action; ambiguous target rows need an explicit resolution or a strict single-match predicate before execution.
- **Regional candidate preview reports `already_present` as a boolean, not the number/IDs of alias matches.** The insert skips a candidate if any alias exists and has a canonical-name uniqueness conflict fallback, which reduces duplicate insertion risk, but does not make existing alias ambiguity visible. The operator should list matching IDs and resolve collisions before approving additions.
- **Scholarship title-based updates are guarded by an exact normalized-title uniqueness count**, and the identity inserts use broad `LIKE` patterns whose multiple matches suppress insertion. This is conservative for writes but can leave a candidate unresolved; inspect all returned duplicate IDs and dependent `saved_scholarships` rows before any manual correction.
- The `sources` upsert for QS/TUM uses a unique URL conflict key and updates metadata/verification flags on that shared source row. Review existing rows and all dependent `university_rankings`/`university_sources` references before approving those changes.
- `ON CONFLICT DO NOTHING` on regional university inserts is repeat-safe only for actual database constraints; it is not a substitute for alias-level duplicate review.
- Recovery comments require exports of original rows before commit. Because the patch is one transaction, `ROLLBACK` before commit is available; after commit recovery must use the reviewed export. The SQL itself does not automatically produce a durable recovery export.

## Read-only preflight query outline for an approved staging/test target

Do not run these until the operator has positively identified the database as isolated staging/test data. Use a read-only session. The exact migration preview predicates in `supabase/catalog_and_integrity_2026_patch.sql` remain authoritative for affected counts.

```sql
-- Confirm target identity (record the output; do not rely on a local env name).
SELECT current_database(), current_user, inet_server_addr(), inet_server_port();

-- Baseline table counts (only after confirming those relations exist).
SELECT 'universities' AS relation, count(*) FROM public.universities
UNION ALL SELECT 'programs', count(*) FROM public.programs
UNION ALL SELECT 'scholarships', count(*) FROM public.scholarships
UNION ALL SELECT 'application_cycles', count(*) FROM public.application_cycles;

-- Program verification and suspect URL classes; compare with the exact Phase 9
-- update predicate in the migration before treating any count as affected.
SELECT p.verification_status, count(*) AS rows,
       count(*) FILTER (WHERE p.official_url IS NULL OR btrim(p.official_url) = '') AS null_or_empty_official_url,
       count(*) FILTER (WHERE p.source_url IS NULL OR btrim(p.source_url) = '') AS null_or_empty_source_url
FROM public.programs AS p
GROUP BY p.verification_status
ORDER BY p.verification_status;

-- Duplicate/ambiguity discovery must additionally use each exact alias list
-- and full predicate in the migration's Phase 10/11 preview CTEs.
```

The last two generic diagnostic queries are only inventory starting points; they do not replace the migration's exact previews. Do not use approximate predicates to estimate affected rows.

## Recommendation

**NO-GO for execution at this time.** This is not a claim that the patch is unsafe; it is a finding that the target and its actual counts/duplicates have not been reviewed, and the static ambiguity points above require explicit staging output and likely count guards or manual identity resolution. Do not run the SQL against production or any live database without separate explicit authorization and a reviewed staging preflight.
