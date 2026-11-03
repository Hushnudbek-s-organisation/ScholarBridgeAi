# University / programme evidence repair — 2026-11-02

Follow-up to `UNIVERSITY_PROGRAM_AUDIT_2026-11-02.md`, authorized by the user's
request to fix the findings. Applied to Supabase project `zkdguzbdopfedkffsatk`
via transactional migration `repair_catalogue_evidence_20261102`.
Reproducible SQL: `supabase/catalogue_evidence_repair_2026-11-02.sql`.

## Applied production changes

| Entity | Rows | Change |
| --- | ---: | --- |
| Universities | 5 | Clear unsupported QS position and edition only |
| Ranking records | 324 | `verified` → `unverified`; preserve recorded values for review |
| Programmes | 1,170 | `verified` → `unverified`, `is_verified=false` |
| Programme requirements | 1,170 | Same downgrade; preserve original requirements |
| Application cycles | 10 | `is_active=false`; preserve dates and historical verification |

The five university IDs are **37, 208, 298, 341, 342**: KAIST, Nazarbayev,
École des Ponts ParisTech, Corvinus and Semmelweis. A full 356-ID comparison
against the audited reference fixture found Nazarbayev in addition to the four
examples from the initial audit. All other ID/rank/edition pairs already
agreed. Post-write live ID/rank/edition MD5 is
`1ca9a6f4f297d10cc66a0cc71179c97c`, exactly equal to the committed audited
reference. The name-inclusive digest is not used as evidence of a rank match.

The 324 downgraded ranking rows lacked a source link or a verification date.
This includes the 149 THE rows whose numbers coincided with QS + 20; they are
no longer asserted to be publisher-verified. No replacement positions, links
or verification timestamps were invented.

The 1,170 programme records and their 1,170 requirements cited only a university
homepage. They remain discoverable but are no longer asserted to have
programme-specific verification. Names, fees, durations, URLs and requirement
values are retained in storage for a later independent source review. A
non-homepage URL is a necessary evidence condition, not proof that all other
3,440 programme records are factually correct. The 1,612 `/academics/` paths
identified during the audit still require real page-level verification; their
path alone is not grounds to invent a new URL or declare the programme false.

The ten archived deadlines had passed in their recorded `America/New_York`
timezone, not just in the user's timezone. The archive operation checks the
actual database clock in the recorded timezone and is limited to the audited
pre-2026-11-02 dates. No deadline was extended or rolled into a new year.

## Safety and verification

- Full immutable before-images plus repair reasons are stored in
  `scholarbridge_maintenance.catalogue_evidence_backup_20261102`.
- The backup is outside the public schema, RLS is enabled, and access is revoked
  from `anon` and `authenticated`. Live privilege checks confirm no client read.
- Every affected row still exists. Comparing before-images found **zero changes
  outside the specifically permitted fields** for each entity.
- All **356 universities**, **4,610 programmes**, **4,610 requirement records**,
  **906 ranking records** and **3,092 historical cycles** are retained.
- Currently verified: **3,440 programmes**, **3,440 requirement records** and
  **582 ranking records**. Active cycles: **3,082**, of which **979 verified**.
- Three validated database CHECK constraints prevent verified rankings without
  a source/date and verified programmes/requirements without specific source
  URLs, verification dates and their verification flag. A URL path is not a
  replacement for manual verification. Future publishers must satisfy these
  checks; do not bypass them by manufacturing timestamps or URLs.
- Follow-up migration `sync_catalogue_verification_flags_20261102`
  (`supabase/catalogue_verification_flags_2026-11-02.sql`) corrects unsafe legacy
  defaults: raw programme inserts now default to `unverified`, and requirement
  booleans default to false. Three BEFORE triggers keep redundant
  `is_verified` (and cycle `is_estimated`) flags synchronized with canonical
  `verification_status`, including writes through legacy importers. They never
  promote a record from unverified to verified on their own.
- Live post-checks: zero unsupported verified rankings, zero homepage-only
  verified programmes or requirements, zero audited expired active verified
  cycles. Raw values and historical source records were not rewritten.

## Application fixes (deployment required)

- Shared `catalogEvidence.ts` evidence boundary rejects a homepage-only or
  explicitly unverified programme/requirement as a verified fact.
- The pure recommendation engine masks unverified tuition and duration before
  scoring and publishing them. Discovery identities stay visible; affordability
  remains unknown rather than pretending a quarantined price is $0.
- Recommendation API excludes unverified requirements and inactive cycles.
- University details exclude inactive programmes and cycles, and apply the
  evidence guard to prices, durations and requirements.
- Chancing excludes unverified requirements, masks unsupported programme prices
  and durations, and excludes inactive programmes. It also does not label a
  non-USD tuition figure as USD.
- Application-requirement generation selects only active programmes and
  verified, specific-source requirement records.
- Deadline-feed API now requires active cycles as well as verified future dates.
- `test:deadlines` now checks date ordering, not the incorrect assumption that
  a historically verified deadline can never be in the past.

## Regression protection

- `test:catalogue-migrations` passes against isolated PostgreSQL with fictional
  records: transactional repair, replay/idempotency, private backups, preserved
  amounts/dates, rejection of unsupported verification, flag triggers and safe
  defaults. No production test records were created.
- `test:catalog-evidence` covers URLs, quarantine masking, unknown affordability,
  immutable originals, requirement filtering and archived-cycle read boundaries.
- `test:recommend`: **91 passed**, including isolated real-Postgres API checks
  for quarantined requirements/prices and inactive cycles. The earlier sandbox
  `libpq.so.5` problem was fixed by running the installed package's supported
  symlink hydration (`npm rebuild @embedded-postgres/linux-x64`). No dependency
  versions changed and no database credentials were requested.
- University list/cost/rank-year/reference/hub suites and deadline-day tests pass.
- Chancing: **28 passed**; journey: **115 assertions passed**.
- Scholarship degree regression still passes.
- Typecheck and the full zero-baseline lint gate pass.
- `audit:catalogue-evidence` adds a strictly read-only repeatable-read live gate
  for evidence, references, flags and **live** QS-vs-reference comparisons. It
  never overwrites fixtures or repairs data. Added to the existing Supabase
  workflow and its mirror, using the workflow's existing connection secret when
  configured; absence of a secret keeps the existing skip behavior.

## Remaining factual work / rollout

This repair removes unsupported certainty; it does **not** freshly verify
1,170 university programme pages or the quarantined rankings. Reinstating
`verified` requires independent evidence from the actual programme/publisher
edition, not a homepage link or the old import. The preserved before-images
form the review queue. Integer legacy fee rounding and alias degree columns
were not overwritten: the application already reads the canonical numeric fee
and recognizes the aliases.

Supabase changes are live. Application guards, CI and audit tooling are saved
on the working branch and need deployment. Existing catalogue caches may serve
a previous snapshot for the default five-minute TTL. Deploying the new code is
particularly important: the old recommendation endpoint did not filter
unverified requirement rows, even when the database flag was already correct.
