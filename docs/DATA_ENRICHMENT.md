# Data enrichment — Phase 4

What this phase actually delivered, and — just as important — what the
repository's own data cannot deliver, so nobody fills the difference with
invented numbers.

Everything below is guarded by two new gates:

```bash
npm run test:country-facts    # 10 assertions: shape, rates, sources, freshness, honesty, wiring
npm run check:catalog-gaps    # 8 assertions: what the audit asks for and what we can supply
```

Both run in CI (`Student-visa facts and catalogue gap gates`).

## 1. Student-visa facts for fifteen destinations

`src/lib/countryFacts.ts` holds one sourced, dated record per destination:
the student-visa proof-of-funds requirement, the term-time part-time limit, the
post-study work period, how an Uzbek 11-year school certificate is treated, the
country's diplomatic mission in Tashkent, and the official recognition database
where one exists.

The fifteen countries are the ones the catalogue is built around: United States,
United Kingdom, Germany, Canada, Australia, South Korea, Japan, Netherlands,
China, Turkey, Poland, Hungary, Malaysia, Switzerland, Italy.

**Rules the file follows**

| Rule | Why |
| --- | --- |
| every published number has `sourceName`, an https `sourceUrl` and `lastVerifiedAt` | a figure without a source is a rumour |
| the USD mirror is `amount × CURRENCY_RATES_TO_USD` from `countryCostBenchmarks.ts` | the app must never hold two different euro rates |
| `null` means "no national figure published" or "not verifiable" | the German and British amounts are official; the American and Japanese ones are set by the university, so they are `null` with a note |
| a figure verified more than 400 days ago fails the gate | these amounts change every year |
| notes exist in `en`, `uz`, `ru` and must actually differ | a pasted English paragraph is not a translation |

Current published amounts (as verified on 2026-10-28):

| Country | Requirement | Local figure | USD mirror |
| --- | --- | --- | --- |
| United States | set by the university on Form I-20 | — | — |
| United Kingdom | £1,171/month × 9 (outside London) | £10,539 | $13,595 |
| Germany | blocked account (Sperrkonto) | €11,904/year | $12,856 |
| Canada | IRCC living costs, single applicant | CA$23,448 | $17,117 |
| Australia | Subclass 500 living costs | A$29,710 | $19,609 |
| South Korea | university-set, commonly | ₩20,000,000 | $14,600 |
| Japan | school-set, commonly | ¥2,000,000 | $13,400 |
| Netherlands | IND study norm | €13,569/year | $14,655 |
| China | set by the Chinese mission | — | — |
| Turkey | DGMM monthly expectation | ≈US$6,000/year | $6,000 |
| Poland | monthly funds after housing (PLN 1,010) | PLN 12,120/year | $3,030 |
| Hungary | no fixed sum published | — | — |
| Malaysia | tuition + monthly living estimate | RM 24,000/year | $5,520 |
| Switzerland | cantonal requirement | CHF 21,000/year | $23,940 |
| Italy | MUR/MAECI circular 2026/27 | €10,179.85/year | $10,994 |

The UK row also carries the 30 November 2026 increase (£1,203 / £1,570 a month)
in its note, because a student applying in December must not read the November
figure.

### Where a student sees it

`GET /api/countries/compare?locale=uz` now returns a `facts` map next to the
comparison rows, and `CountryComparePanel` renders a **Student visa & work rules**
block under the comparison table: the proof-of-funds figure, the part-time limit,
the post-study period, the 11-year-certificate verdict, the mission in Tashkent,
the source link and the verification date. Everything unpublished says so.

## 2. The catalogue gap audit — and why most of it is administrator work

`data/universities_missing_rank_image_programs_2026-10-23.csv` audits 364
institutions and flags 76 of them. It records **that** a value is missing; it
does not contain the value. So `scripts/check-catalog-gaps.ts` asks the only
useful question — can any file in this repository close the gap, with an exact
match?

| Gap | Rows flagged | Closable from repository data | Where |
| --- | --- | --- | --- |
| rank | 8 | 4 | `data/top_universities_11progs_qs_pdf_2026.json` (Nazarbayev 530, École des Ponts 205, Corvinus 1001, Semmelweis 680) |
| image | 71 | 0 | no file in the repository holds image URLs for ids 201–364 |
| programmes | 4 | 0 | `data/programs_enriched_full.csv` has no rows for CTU / WIUT / IUT / NewUU |

Three findings worth keeping:

* **KAIST is a conflict, not a gap.** The campus export says rank 37, the app's
  Top-200 table says 53 — two different QS editions. Publishing either one would
  endorse an edition on the student's behalf, so the resolver returns `null` and
  the report shows `rank CONFLICT: 37 vs 53`. An administrator decides.
* **An unranked institution never borrows a rank.** WIUT, IUT and New Uzbekistan
  University are not in QS; a loose/fuzzy match once paired "New Uzbekistan
  University" with UNSW (rank 19). The resolver compares exact normalized names
  only, so those three stay `null`.
* **A PDF-extraction file name is not an image.** The extraction carries values
  such as `KAIST_from_across_Gapcheon.jpg`; they are not URLs and never reach an
  `<img src>`. Until real URLs are entered from the official pages, the card
  keeps its initials/gradient fallback.

The remaining 74 institutions are listed by the gate as administrator work, in
the order an operator would work through them.

## 3. QS benchmark provenance

`QsUniversityBenchmark` now carries `isEstimated: true` and an `estimateBasis`
on **every** row — the compiled bands and the rank-derived fallback alike. These
are percentile bands compiled from Common Data Sets and admissions statistics,
not figures a university publishes as an official acceptance rate, so no
consumer may present them as verified. `scripts/check-chancing.ts` asserts both
facts (`every QS benchmark carries its estimate provenance`).

## 4. Verified, already present (no change made)

* **Scholarship ↔ university links.** `GET /api/universities/[id]` already ranks
  relevant scholarships by three signals — an explicit `universityId` link, a
  provider-name match, and same-country awards — then verified rows, then the
  largest published amount. The legacy `university_scholarships` table is unused
  by that path; nothing needed adding.
* **Samples library.** `src/lib/samples` already ships 57 exemplars (4 SOPs, 4
  visa transcripts, LORs, CVs, document templates) with paragraph roles
  annotated in en/uz/ru. Per the standing product rule — stories are
  administrator-typed and administrator-approved, never auto-generated — no new
  Uzbek “story” content was written here. Fabricating testimonials or applicant
  stories to make the library look fuller is exactly what the rule forbids.
* **`countryCostBenchmarks.ts`** already holds the per-country living, insurance,
  visa-fee and programme-length benchmarks this phase builds on.

## 5. Maintaining the facts

1. Re-read the source page; update `proofOfFunds.amount` / `currency` /
   `localText` and, if the rule changed, the note in all three languages.
2. Set `lastVerifiedAt` to the day you read it and `asOf` to the date the new
   rule takes effect.
3. Run `npm run test:country-facts`. The gate fails on a stale date, a missing
   source, a rate that drifted from `countryCostBenchmarks.ts`, or a note that is
   only translated in one language.
