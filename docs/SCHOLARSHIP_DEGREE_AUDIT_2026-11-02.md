# Scholarship degree filter audit — 2026-11-02

## Live Supabase findings (read-only)

Project: `zkdguzbdopfedkffsatk`; table: `public.scholarships`.

- 833 stored rows: 626 active / verified, 207 inactive / retired.
- All 626 active rows have a recognized degree in their stored JSON list.
- Exact matching reproduced the reported bug precisely:

| Degree | Old exact match | Alias-aware match |
| --- | ---: | ---: |
| Bachelor | 65 | 366 |
| Master | 72 | 333 |
| PhD | 251 | 251 |

These categories overlap: one scholarship can fund several degrees. Their
counts must not be summed to infer the total catalogue size.

The imports use `Bachelor's`, `Undergraduate` and `Master's` alongside
`Bachelor` and `Master`. Both API selection and facet counts used exact labels.

## Recent additions

The latest ID range, 1014–1090 (77 active records), uses undergraduate aliases.
Their `last_verified_at` is `2026-11-01 18:52:01.02771`, but all 77 have NULL
`last_updated_at`. This metadata gap does not affect catalogue visibility or
degree filtering; no update dates were invented during this repair.

All active rows have nonempty source URLs, descriptions, requirements and
English requirements. The latest 77 additionally have nonempty coverage,
funding, tuition coverage, deadline text, degree and major fields. This is a
structural/data-integration audit, **not** a fresh independent verification of
provider pages, award validity or eligibility claims. A database `verified`
flag alone is not new evidence of those claims.

## Repair

`parseScholarshipDegreeLevels` now uses the existing shared degree alias
vocabulary. Filters, API facet counts and browser grouping already consume
this parser, so they now agree without modifying source records or SQL imports.
Aliases are deduplicated per record: `["Bachelor's", "Undergraduate"]`
contributes one Bachelor count, not two. Unknown labels such as `Postdoc`
remain unknown; they do not become PhD or match all degrees. Empty/malformed
lists still cannot satisfy a degree filter. Inactive/unverified visibility
rules are unchanged.

## Validation

- `npm run test:scholarship-degrees`: parser edge cases and an offline fixture
  of the audited active degree distribution reproduce 65/72/251 before and
  366/333/251 after the fix; all 626 rows are retained in unfiltered results.
- `npm run test:ranking`: 42 checks passed.
- `npx eslint src/lib/scholarshipFilters.ts scripts/check-scholarship-degrees.ts`: passed.
- `npm run typecheck`: passed.
- Degree regression added to CI.

At the end of the initial code-only audit, no live Supabase data had changed.

## Follow-up: live Supabase repair requested by the user

Applied transactionally via `align_scholarship_formats_20261102`:
`supabase/scholarship_format_alignment_2026-11-02.sql` records the operation.

| Repair | Rows |
| --- | ---: |
| Degree aliases normalized and deduplicated | 444 |
| Unsupported coverage labels mapped to website vocabulary | 62 |
| Selection labels incorrectly stored as award valuation basis | 83 |
| Award period `degree` normalized to `total` | 4 |
| Previously NULL update timestamp filled by a real modification | 77 |

These sets overlap: **444 distinct rows changed**. An immutable full
before-image of each is retained in
`scholarbridge_maintenance.scholarship_format_backup_20261102`.
Schema and table access are revoked from `anon` and `authenticated`, with RLS
enabled. Live privilege checks confirmed both roles cannot read the backup.

Coverage mapping preserves clear aliases (`Full Ride` → `Full Funding`, full
tuition with living support → `Full Tuition + Stipend`, tuition credit/subsidy
→ `Partial Tuition`). Ambiguous grant/support labels use `Unspecified` instead
of guessing full coverage. Original wording is retained in notes and backup.

`merit`, `merit_based` and `need_and_merit` describe selection, not whether an
amount is fixed or a range. The invalid valuation labels now use the site's
non-fixed `variable` fallback; notes explicitly explain this is not new
provider evidence. Existing merit/need booleans and all monetary values are
unchanged. An exact fixed/range classification still needs source review.

Post-write live checks confirmed:

- 626 active rows; Bachelor **366**, Master **333**, PhD **251** even with exact
  label matching (so the existing production filter benefits after cache expiry).
- No unsupported coverage, basis or period values, and no missing update times.
- Twelve structural audit checks in `supabase/scholarship_format_audit.sql`
  pass, allowing legitimately absent optional rounds.
- Every active scholarship has a linked source record, including the recent 77.
- Comparing full before-images found **zero changes** outside the six allowed
  fields: degree levels, coverage type, award basis, award period, notes and
  last updated time. Awards, dates, verification flags, active flags, URLs,
  eligibility criteria and all other fields were preserved.

This fixes data integration, not the factual accuracy of all imported awards.
In particular, generic/template-like descriptions, cycle dates and award
amounts in the recent batch still require independent official-source review.
No new provider verification is claimed. The application catalogue cache can
retain the previous snapshot for its default five-minute TTL after a direct
Supabase write. Deploying the accompanying code fix remains recommended to
handle future imports with aliases without losing filter results.
