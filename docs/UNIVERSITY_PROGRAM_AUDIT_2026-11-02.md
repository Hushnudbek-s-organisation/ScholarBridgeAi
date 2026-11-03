# Live university and programme audit — 2026-11-02

> Historical pre-repair findings. The authorized follow-up repair and current
> counts are documented in `UNIVERSITY_PROGRAM_REPAIR_2026-11-02.md`.

## Scope and method

Read-only Supabase audit of project `zkdguzbdopfedkffsatk` plus repository read-path
inspection and offline regression tests. No production data was changed in this
audit. This is not a fresh crawl of university websites; URL format validation
is not proof that a URL exists or supports the stored claim.

| Entity | Live rows |
| --- | ---: |
| Active universities | 356 (all marked verified) |
| Active programmes | 4,610 (all marked verified) |
| Programme requirement records | 4,610 |
| Active application cycles | 3,092 |
| University ranking records | 906 |

Cycles comprise 989 verified, 79 estimated and 2,024 unverified records. Those
flags are not equivalent and were not upgraded during the audit.

## Structural checks with no findings

- No missing university name, country or description; website/source URL
  formats valid; images, country codes and verification timestamps populated.
- No out-of-range university GPA/IELTS/SAT, percentages, negative costs or
  nonpositive ranks; highlights parse as JSON.
- No missing programme name, subject, degree, description, official/source URL;
  no negative programme tuition or implausible duration (all 0 < years <= 12).
- No orphan programme/university or requirement/programme references.
- No requirement score-range violations, programme verification-flag mismatch
  or requirement verification-flag mismatch.
- No exact normalized university-name, programme identity, requirement/year or
  ranking edition duplicates. Treating QS provider aliases as equal also found
  no duplicate provider/university/year groups.
- No cycle/programme university mismatch, reversed cycle dates, verification
  flag mismatch or academic-year/cycle-year mismatch.
- University canonical USD/year costs agree with legacy USD mirrors.
- Every active university has programmes and a linked source. Every active
  programme also has a linked source.
- Programme degree labels are Bachelor's (3,122), Master's (1,300),
  Doctoral / PhD (158) and PhD (30). Existing degree normalization understands
  these; the scholarship exact-label bug is not reproduced on this read path.

## Findings requiring attention

### 1. Ranking provenance gaps — high priority

**324 / 906** ranking records are marked `verified` but have NULL `source_id`.
**318** verified ranking records also have NULL `verified_at`.

Missing source links by group:

| Provider / edition | Missing links |
| --- | ---: |
| QS Quacquarelli Symonds / QS World University Rankings 2026 | 6 |
| QS / QS World University Rankings 2026 | 156 |
| THE / Times Higher Education World University Rankings 2026 | 162 |

In **149** unsourced THE rows, `rank = universities.world_ranking + 20`
exactly. This systematic relationship is a strong review signal, **not** proof
of official THE positions. Examples: Warsaw has stored QS 271 and THE 291
(label `291-341`); KazNU has QS 166 and THE 186. Do not invent source links or
verification timestamps to silence this audit. Independently substantiate the
publisher/edition/value or downgrade the claim after review.

### 2. Live QS data has drifted from the tested snapshot — high priority

The repository's QS gate passes against its 2026-10-30 fixture, not the live DB.
The 356-row ID/name/rank/edition snapshot fingerprints now differ:

- committed fixture MD5: `dd4b7f541d22ee02d86ccc051b55871d`
- live Supabase MD5: `18f255ea3b0fd2f51bd7e23ebd7d8e16`

Four inspected live rows have reacquired a QS 2026 claim that the repository's
reference edition (`data/qs2026_top1500.csv`) does not substantiate:

| ID | University | Live rank / edition | Committed snapshot |
| --- | --- | --- | --- |
| 37 | KAIST | 53 / 2026 | no rank or edition |
| 298 | École des Ponts ParisTech | 205 / 2026 | no rank or edition |
| 341 | Corvinus University of Budapest | 1001 / 2026 | no rank or edition |
| 342 | Semmelweis University | 251 / 2026 | no rank or edition |

Running the existing `auditCatalogueRanks` matcher on these four live values
returns `unverified-claim` for all four. This establishes disagreement with the
repository's reference, not a fresh internet verification of the publisher.
The full live catalogue still needs reconciliation against the correct
publisher edition, with missing entries left unknown rather than inferred.
Do not refresh the fixture to bless these changes without reconciliation.

### 3. Calendar-expired active application cycles — review

Ten verified active cycles have deadline **2026-11-01**, before this audit's
2026-11-02 calendar date. Institutions: Northwestern, Emory, Minnesota Twin
Cities, Florida, Rochester, Dartmouth, Vanderbilt, Virginia, Case Western and
Washington University in St. Louis. Cycle IDs: 3031, 3046, 3050, 3058, 3069,
3073, 3099, 3118, 3125, 3136.

A passed deadline does not make its historical source unverified. No deadline
was rolled forward, no row deleted, no verification downgraded. Check the
provider's deadline timezone before archiving. The deadline-feed API already
excludes calendar-past deadlines; university details retain cycle history, and
recommendations prefer an upcoming cycle where available. The existing
`test:deadlines` rule ('a verified deadline is never in the past') conflates
verification with timeliness and would flag these rows; this deserves a
separate lifecycle policy rather than changing a verified fact.

### 4. Programme evidence granularity — review, not automatic defects

**1,170** active programmes use a bare homepage as `source_url`. **1,612** have
an `official_url` containing `/academics/`. A syntactically valid URL or linked
source is not evidence that the programme, price or eligibility was read on
that page. Verify the actual programme pages before asserting their accuracy;
no fabricated replacement URLs were written.

### 5. Legacy programme columns — compatibility observations

- 4,452 raw legacy `degree` labels differ from canonical `degree_level` (e.g.
  `Bachelor's Degree` vs `Bachelor's`); these are recognized aliases, not 4,452
  wrong degrees.
- 1,738 `program_url` values differ from `official_url`; the latter is the
  canonical column the application reads. Different URLs are not by themselves
  broken links.
- 14 integer `tuition_amount` mirrors differ from numeric `annual_tuition`,
  inspected differences being fractional precision loss (e.g. 10447 vs 10447.5).
  The application maps tuition to numeric `annual_tuition`, so this is not a
  displayed tuition mismatch. Do not overwrite accurate decimals to match an
  integer legacy mirror.

## Tests and limitations

Passed offline suites:

- `test:university-list`: 15 checks
- `test:university-costs`: 12 checks
- `test:university-rank-year`: 14 checks
- `test:qs-catalogue-ranks`: 13 checks **against the committed snapshot**
- `test:recommend`: 66 pure checks passed; its isolated API section could not
  initialize embedded PostgreSQL because the sandbox could not load
  `libpq.so.5`. The suite exited nonzero; API validation was not completed.

Repeatable read-only SQL is in
`supabase/university_program_integrity_audit.sql`. Findings labelled `review`
are deliberately separate from structural errors. Optional fields were not
filled with guesses; no user/profile records were inspected.
