# Supabase schema review: universities, programs, admissions, and funding

**Status:** design and guarded SQL prepared; not applied. No Supabase connection or live schema/data inspection was performed in this work session. Treat the live database as unknown until the read-only audit outputs have been reviewed.

## Decisions

1. **One canonical program relation:** PostgreSQL table `public.programs`. The Drizzle export remains named `universityPrograms` for app compatibility, but it maps to `programs`. New code/imports must write program rows there only. Do not dual-write into `university_programs`.
2. **No automatic legacy-table rename or merge:** if `university_programs` exists, inspect its rows and every referencing FK before choosing a migration. The guarded migration intentionally stops when that relation competes with or substitutes for `programs`.
3. **Unknown is NULL, not a made-up fact:** unknown city, rank, tuition, requirement, award amount, or deadline must not be converted to zero or fabricated text. Legacy `amount_usd_value` is nullable; use the generic amount/currency/period/basis fields when the official award is not a fixed USD amount.
4. **Relationships follow ownership:** a program belongs to one university; requirements belong to one program; an application cycle may be university-wide or program-specific; a scholarship may be university-specific or global; saved rows belong to a student and one catalog entity.
5. **Evidence is first-class:** `sources` stores a source URL once; link tables relate it to university/program/scholarship facts. Existing `source_url` columns are retained for compatibility, not treated as a substitute for a source record and provenance link.
6. The earlier content-import scope remains separate: five QS 2027 universities, their undergraduate programs, and funding relevant to Uzbek undergraduate applicants. This schema work is not a completed data import.

## Canonical entity map

```text
universities 1 ─── * programs 1 ─── * program_requirements
      │                  │
      │                  └────────── * application_cycles (optional program)
      ├── * application_cycles (university-wide cycle has program_id NULL)
      ├── * university_rankings
      ├── * scholarships (scholarship.university_id may be NULL for global)
      └── * university_sources * ─── 1 sources
                         programs * ─── * sources (program_sources)
                      scholarships * ─── * sources (scholarship_sources)

student_profiles 1 ─── * saved_universities / saved_programs / saved_scholarships
```

`application_cycles` keeps `university_id` as the owner and has nullable `program_id`. The database composite FK `(program_id, university_id) → programs(id, university_id)` prevents a cycle from pointing to a program at a different university. NULL `program_id` means the deadline applies to the institution generally.

## Recommended creation/migration order

For a new database, create in dependency order; for an existing database, inspect before altering:

1. Existing base/auth tables: `student_profiles`, `universities`, `scholarships`.
2. `sources` (so evidence FKs can be made immediately).
3. Canonical `programs` (FK → `universities`).
4. `program_requirements` and `application_cycles` (FKs → programs/universities/sources).
5. `university_rankings` (FK → universities/sources).
6. Source-link tables: `university_sources`, `program_sources`, `scholarship_sources`.
7. Saved tables: saved universities/programs/scholarships (FKs → profile + catalog entity).
8. Indexes and uniqueness constraints, only after conflict checks.

The SQL migration provided follows that dependency logic for the reviewed catalog subset. It deliberately refuses automatic data consolidation and is not a blanket replacement for all application migrations.

## Identity and uniqueness rules

- University identity is `canonical_name`, normalized with `lower(btrim(...))`; blank canonical names are not indexed. Display `name` remains the user-facing name. Do not use QS rank as identity.
- Program identity is `(university_id, normalized name, normalized degree_level)`. This allows a university to offer the same named subject at different degree levels while preventing case/whitespace duplicates in one destination table.
- Requirement identity is `(program_id, academic_year)` when academic year is known. More than one year-specific requirements row is valid; repeated same-year rows require reviewed consolidation.
- Saved identity is `(profile_id, target_id)` for each saved entity type. This prevents duplicate saved records; existing duplicates must be reviewed, never silently discarded.
- Ranking identity is `(university_id, provider, ranking edition/name, year)`. Rank is nullable for unranked values; never encode “unranked” as zero.
- Source URL is unique in `sources`. Keep source type/official/verified fields factual; verification should not be inferred just because a URL exists.
- Application cycles intentionally do not yet have a unique key: intake, round, cycle year and program scope can all distinguish valid rows. Inspect existing records and the app’s write path before adding a unique constraint.

## Fact modeling notes

### Universities and rankings

Institution-level `world_ranking` remains a legacy summary for compatibility. Detailed rank values belong in `university_rankings` so multiple providers and years do not overwrite each other. Tuition/living cost fields should include amount, currency and period. A provider-specific ranking year belongs on the ranking fact; `qs_rank_year` is only retained as a legacy summary field.

### Programs and requirements

`programs` is the only program catalogue. It holds university, name, degree, field, delivery/language, duration, tuition and canonical official/application URLs. Do not duplicate one program into `programs` and `university_programs`.

`program_requirements` currently preserves the app’s wide compatibility layout (IELTS/TOEFL/DET/SAT/ACT/GPA plus written requirements) and adds academic year and verification/source fields. A later, coordinated API migration could normalize repeatable test requirements into typed rows, but that is not safe to do only at the database layer while consumers still expect these columns.

### Application cycles

Store the cycle year/intake/round, opening/deadline dates, timezone, fee/currency, application URL, verification and source. `source_id` is the normalized optional FK; `source_url` remains a compatibility column. Keep exact dates null if not officially published. A single cycle may be general to a university or specific to one program.

### Scholarships and other funding

`scholarships.university_id` is nullable for country/global awards; a non-null value ties an award to one institution. Use eligibility fields independently from provider/host country. Award amount is represented by `award_amount`, `award_currency`, `award_period`, and `award_basis`; `amount_usd_value` is only a legacy numeric USD value when a defensible fixed USD amount exists. Need-based packages and full-tuition awards may have no single amount, so do not insert `0` or an estimated conversion. A deadline may be null when unpublished; `deadline_type` and lifecycle dates carry structured timing.

The current schema still contains some legacy fields (for example the `source_reliability` score). New scholarship defaults now use an unspecified coverage and empty eligibility arrays, and minimum GPA/IELTS no longer receive invented defaults. Existing rows that were previously populated by defaults still need a source-by-source review; this migration does not rewrite them. Avoid treating any default as verified fact. A follow-up cleanup should retire arbitrary reliability scores in favor of source type, official status, verification status, and access/verification timestamps.

### Saved/user records and deletes

Saved records cascade when their student or catalog item is deleted; scholarship-to-university and source-to-fact references use `SET NULL` where the fact/source can still stand independently. Program deletion cascades to program requirements, saved programs and program-specific cycles. Before deleting or merging any catalog entity, inspect referencing FKs and preserve user-created notes/state as required.

## Adding a university safely

1. Validate the canonical identity (official name, country, official URL); check existing universities case-insensitively before insert.
2. Insert the university and a source record for the official source. Attach it using `university_sources`; fill optional rank/cost fields only when evidenced.
3. Add rankings as separate provider/year rows with their own source reference.
4. Add each real degree program once to `programs`, using the owning `university_id`; let the unique index reject duplicates. Do not create a matching row in `university_programs`.
5. Add program sources and at most one requirements row per verified academic year. Unknown thresholds stay NULL.
6. Add institution-level or program-level cycles. For program-specific cycles, `program_id` and `university_id` must match; the composite FK enforces this.
7. Add scholarships with optional `university_id`, accurate eligible countries/degree levels, variable award fields and official sources. Do not represent need-based aid as one fixed award unless the provider publishes that value.
8. User saves are created separately in the relevant `saved_*` table; pair uniqueness prevents duplicates.

Prefer a transaction for a related insert workflow. Keep provenance and verification status on the underlying fact; do not mark imported values verified by default.

## Read-only audit and guarded migration files

- `supabase/university_schema_preflight.sql` — safe catalog audit: relation existence, columns/types/defaults/nullability, constraints and estimated row counts. It performs no writes.
- `supabase/university_schema_data_audit.sql` — read-only dynamic checks for duplicate identities and orphan references. It returns conflicting rows as XML and skips checks whose table/columns are absent.
- `supabase/university_schema_v2.sql` — transactional, guarded migration. It creates/adds fields/indexes/FKs for the canonical subset, but stops if a competing program table exists or if rows conflict with required uniqueness/FK rules. It does not rename, merge, drop, or delete records.
- `supabase/fix_align_schema.sql`, `supabase/add_university_discovery.sql`, and `supabase/add_application_system.sql` — intentionally neutralized divergent legacy files; running any only returns a deprecation status and makes no changes.

### Mandatory operator sequence

1. Run the two audit files on the live Supabase project and save all result sets.
2. Inspect exact columns, relation counts, all FKs, duplicates, orphan records, and both program relations if present. Export/back up affected rows.
3. Reconcile conflicts by a separately reviewed, reversible plan. Do not run `step3_restore_all.sql` as a repair; it contains destructive drops.
4. Apply the guarded migration only in staging first. Compare post-migration catalog/FK results and test all reads/writes.
5. Only after approval, apply to production, then run the audit again.

This repository work did **not** execute SQL against Supabase. The live schema/data remain unconfirmed.

## Implemented in the app in this branch

- Drizzle now models application-cycle `programId` and `sourceId`, with a composite university/program FK.
- Added database uniqueness definitions for program identity, requirements per known year, and duplicate saved pairs; added supporting indexes.
- Made scholarship legacy USD amount and free-text deadline nullable, and removed the admin API’s false zero for a missing award amount.
- Made university admin POST/PATCH field handling preserve null/unknown values instead of replacing missing facts with zero or made-up values.
- The research-agent persistence helpers now support program-specific cycles and source IDs, avoid zero/default scholarship award amounts or invented eligibility, and link known scholarship evidence records.
- Divergent discovery/application SQL files are neutralized; the reviewed v2 migration targets only `programs`. Optional saved-program setup now uses an FK to `programs` and requires the canonical relation to exist.

`npm run typecheck`, `npm run test:journey`, and `npm run test:opportunities` pass. `npm run test:integration` could not start its embedded Postgres because this environment lacks `libpq.so.5`. No SQL integration or Supabase tests were run because there is no confirmed live schema/connection.
