# Official-source review — 2 November 2026

## Status: PARTIAL, first live batch applied

This is **not** completion of the request to verify all 1,170 downgraded programs, their 1,170 requirements, 324 rankings, five cleared QS summaries, and ten archived cycles. No blanket restoration of verification flags was performed.

Live migration: `official_source_review_20261102_batch_01`, applied successfully to the connected ScholarBridge project. Source notes and exact target IDs: [`data/official-review/2026-11-02-batch-01.json`](../data/official-review/2026-11-02-batch-01.json). SQL: [`supabase/official_source_review_2026-11-02_batch_01.sql`](../supabase/official_source_review_2026-11-02_batch_01.sql).

| Original downgraded scope | Reviewed and applied this batch | Still awaiting review |
|---|---:|---:|
| Programs | 20 | 1,150 |
| Program requirements | 20 | 1,150 |
| Rankings | 11 | 313 |
| Five cleared numeric QS summary claims | No numeric summary restored | See exceptions below |
| Ten archived cycles | No new source verification; no lifecycle changes | 10 historical source checks |

Global live counts after application: programs **3,460 verified / 1,150 unverified**; requirements **3,460 / 1,150**; rankings **593 / 313**. These totals include previously verified records that were not independently re-reviewed in this batch.

## Method

Manually read the official university or publisher pages using page retrieval, distinguish the **2026 edition** from current 2027 profile banners, and record access date, URL, scope and a reviewer summary. The evidence manifest contains summaries, **not archived copies** of whole pages. Search-index snippets, old repository fixtures, homepages alone, and inaccessible PDF URLs did not qualify records for promotion.

Shared admission and tuition policies were applied only where the source explicitly covers the same institution and degree level. Unsupported minima were removed rather than replaced with competitive averages. A NULL threshold means unknown/not established, not zero, and does not mean English proficiency is unnecessary.

## Princeton: 20 undergraduate concentrations

Program IDs **230–249**, requirement IDs **1901–1920**, university ID **13**. Each program name was matched to the official [Degrees & Departments](https://admission.princeton.edu/academics/degrees-departments) list (both page chunks). The university explicitly says applicants apply to Princeton, not individual departments. Therefore the shared first-year checklist applies to these undergraduate concentrations, not to graduate admissions.

Changes:

- Correct annual undergraduate tuition from **USD 59,710 to USD 68,140 for 2026–27**, based on [Fees & Payment Options](https://admission.princeton.edu/cost-aid/fees-payment-options). Both legacy and canonical amount columns were synchronized. This is tuition before aid, **not** the USD 94,624 total attendance budget. The description expressly does not establish 2027–28 tuition.
- Replace generic lab/industry marketing copy with supported concentration, admission-route and dated tuition information.
- Rename program 247 to **Public Policy (Princeton School of Public and International Affairs)**, preserving its ID.
- Remove unsupported IELTS 7, TOEFL 100, DET 125, SAT 1510, ACT 34 and GPA 3.9 minima, including legacy `minimum_value`, `value_text`, `programs.min_ielts` and `programs.min_sat` claims.
- Remove unsupported fixed IB, A-level and AP grade/points requirements. [Before You Apply](https://admission.princeton.edu/apply/before-you-apply) explicitly distinguishes recommended preparation from mandatory prerequisites.
- Record actual [first-year checklist](https://admission.princeton.edu/apply/application-checklist): Common Application, Princeton questions, fee/waiver, graded paper, transcript, school report, counselor recommendation, two teacher recommendations and midyear report. CV/resume is not presented as mandatory.
- Correct **interviews to optional** and architecture arts supplement/portfolio to **optional**, not required.
- Preserve conditional English testing and the published waiver, rather than imposing a fabricated numeric cutoff.
- Record [test policy](https://admission.princeton.edu/apply/standardized-testing): SAT/ACT optional for fall 2026 and fall 2027 entry, required from fall 2028; no minimum admission score. Application-cycle years and entry years are explicitly distinguished in the text.
- Set verified status and dated specific sources; link seven distinct program/admissions/tuition sources per program (140 target evidence links, with duplicate prevention).

**Excluded:** graduate program IDs **250–255** (four PhDs, MPA and Master of Finance). Their tuition and requirements must be researched independently. Do not copy undergraduate policy onto them.

## Rankings: exact edition and bands retained

| Record | University | 2026 publisher | Verified result |
|---:|---|---|---|
| 603 | KazNU | QS | 166 |
| 604 | Warsaw | QS | 271 |
| 605 | Charles | QS | =265 |
| 606 | METU | QS | 269 |
| 607 | Warsaw | THE | **601–800**, not 291–341 |
| 608 | KazNU | THE | **1201–1500**, not 186 |
| 609 | METU | THE | **351–400**, not 289–339 |
| 617 | Nazarbayev | THE | **401–500**, not 498–548 |
| 618 | Charles | THE | **401–500**, not 285–335 |
| 740 | Semmelweis | THE | **251–300**, not 271–321 |
| 601 | École des Ponts | QS | **No standalone position**; participation through IP Paris |

Each ranking now has its actual reviewed source and verification date. Exact source URLs are in the manifest and live `sources` links. For THE bands, numeric `rank` is the existing schema's sortable **lower bound**, and `rank_label` retains the full band. It must not be interpreted as an exact position. Unreviewed numeric score values were cleared.

The [official Ponts foundation announcement](https://www.fondationdesponts.fr/classement-qs-ranking-2026/) explicitly identifies **205 as the 2025 standalone rank** and describes the school's participation through IP Paris in 2026. Record 601 is verified with `rank=NULL` and an explanatory label. **IP Paris's 41st place was not copied onto Ponts.** Its university summary remains NULL, correctly avoiding a false standalone QS 2026 position.

## Remaining exceptions and work

- **KAIST:** publisher release-summary search index mentions exclusion from QS 2026, but the fetched page returned maintenance. Do not restore cleared 53 to the summary. A separate pre-existing ranking record (ID 37) still carries a verified 53 and needs explicit review/correction; it was outside this batch. Existing verified status is not independent proof of accuracy.
- **Nazarbayev QS:** THE confirmation does not substantiate the old QS 478 claim. QS needs separate edition-specific evidence.
- **Corvinus QS:** current profile header says 1001–1200, but a header without a verified 2026 history entry is insufficient. Do not confuse an older ranking or contributor status with QS World 2026 inclusion.
- **Semmelweis QS:** THE 251–300 is not a QS World position. Subject rankings are not an overall university ranking.
- **École des Ponts:** the standalone 2026 numeric summary should remain absent for the confirmed reason above; verification does not require inventing a rank.
- **WIUT and Inha Tashkent:** do not assign parent-university positions to a branch/campus record without publisher evidence covering that identity.
- **All 1,150 remaining programs and requirements:** need program existence/level, international tuition and year, department-specific requirements or explicitly applicable university policies checked. Unknown values must stay unknown.
- **Archived cycles 3031, 3046, 3050, 3058, 3069, 3073, 3099, 3118, 3125, 3136:** this batch changed neither dates nor flags. Historical fact verification must not reopen an expired round.

## Safety and checks

- Transactional identity guards enforce ID, institution name, undergraduate level, requirement ID/year, publisher, ranking edition and year.
- Full before/after images stored in private/RLS-protected `scholarbridge_maintenance.official_review_backup_20261102_01`: **20 programs + 20 requirements + 11 rankings + 2 existing source metadata rows = 53** live backup rows.
- Eighteen dated evidence records stored privately; public source links retained for user-facing provenance.
- Replay only updates a target that still equals its before-image; divergent later edits cause an exception. Test verifies idempotence and rollback.
- `npm run test:official-source-review`: **PASS** against isolated PostgreSQL; covers all expected ranking outcomes, alias-column cleanup, optional interview/portfolio, 140 provenance links, private backup access, stale replay protection, and graduate/archived-cycle sentinels.
- `npm run test:catalogue-migrations`, `npm run test:catalog-evidence`, `npm run typecheck`, targeted ESLint and `git diff --check`: **PASS**. New isolated test registered in npm and GitHub CI. These are software checks, not substitutes for factual source reading.
- Live post-application SELECT confirmed global status counts, backup/evidence counts, all eleven ranking values and linked URLs. Migration postconditions checked all twenty target program amounts and requirements/flags before committing.
- An attempted repeat of the outside-scope checksum SELECT was blocked by Arena's duplicate-operation guard, which described the SELECT as an already-completed write. **No rewrite/retry bypass was attempted.** Outside-scope post-write checksums therefore remain unconfirmed. The SQL has no update of university summaries or application cycles, and isolated tests exercise that boundary; do not claim a live before/after hash comparison passed.

Before-application outside-scope hashes (for an independently authorized future read, not proof of a completed comparison):

| Scope | Rows | MD5 of ordered complete row JSON |
|---|---:|---|
| Programs excluding 230–249 | 4,590 | `768f71c618eb3afea4a54615ec8b7d05` |
| Requirements excluding 1901–1920 | 4,590 | `520e26d6ce58d8441f62e3d7a325a13c` |
| Rankings excluding the eleven targets | 895 | `1510f974024733b8e2d2934fde24e886` |
| All cycles | 3,092 | `7163843e55b52fb3e684c92eb0e99fa3` |
| All universities | 356 | `a24313d73dab234b2d57a11343f4b2bd` |

Database migration is live. Repository application/CI changes from this and earlier work are saved locally; no application deployment or GitHub push was performed in this batch.
