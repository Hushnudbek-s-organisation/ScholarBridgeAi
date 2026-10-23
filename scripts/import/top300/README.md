# Top 300 Universities — PDF → Supabase import toolkit

Scripts used on 2026-10-23 to load `top_300_universities_supabase_prompt.pdf`
(59 pages, 6-column registry table on pages 8–59) into the live Supabase project.
They are kept so the import can be audited or re-run against a fresh PDF revision.

| Step | Script | Output |
| --- | --- | --- |
| 1 | `extract_pdf.py <pdf> raw_cells.json` | one entry per table row with the 6 raw cell texts (uses the separator rects of the PDF, not pdfplumber's table finder — the table has no vertical rules) |
| 2 | `parse_rows.py raw_cells.json parsed.json` | 300 structured records (tuition/living/housing/fee, acceptance %, GPA/IELTS/TOEFL/DET/SAT, A-Level/IB, PS/Rec/Int/Port flags, deadlines, intake, scholarship name/type/max, ISO country + flag) |
| 3 | `gen_staging_sql.py parsed.json matches.txt out/` | `CREATE TABLE public._pdf_top300` + INSERT batches. `matches.txt` is the verified `pdf_rank:university_id:note` mapping |
| 4 | `gen_fill_sql.py parsed.json out/` | `_pdf_cycles` staging (one row per parsed deadline, "next occurrence" year rule) + derived columns (english-taught heuristic, programme duration, admin-fee countries) |

The parsed registry is committed as `data/top300_universities_pdf_2026.json`.

Python deps: `pip install pypdf pdfplumber` (Python 3.11).

## What was written to the database

* `universities` — all 297 unique PDF rows (3 PDF duplicates merged: #18/#22 Princeton,
  #92/#115 USP, #110/#129 Newcastle). 187 matched existing rows by name, 110 were new.
  Numeric fields follow the PDF; `world_ranking` of the existing QS-ranked rows was kept
  (app sorts by it), new rows are `NULL`. `acceptance_rate` is stored in percent (app convention).
* `scholarships` — one headline scholarship per university where none existed
  (notes: `Imported from the Top 300 Universities dataset (PDF 2026) …`).
* `university_scholarships` — new table (DDL in `supabase/top300_pdf_import.sql`), 297 rows,
  every row linked to a `scholarships` row.
* `programs` + `program_requirements` + `program_sources` + `application_cycles` +
  `sources` + `university_sources` — generic *Undergraduate Degree Programs* record set for the
  114 PDF universities that had no programme data (130 + 4 cycles: one per parsed deadline;
  deadlines the PDF gives only as "Varies; typically Jan–Feb" are stored with
  `is_estimated = true`, `deadline = NULL`, and the original text in `notes`).

Staging tables `_pdf_top300` / `_pdf_cycles` were dropped afterwards.

## Second PDF — 13-country Top-10 guide (130 universities)

`uzbek_global_universities_supabase_master_guide.pdf` (79 pages) repeats the Top 300 registry in
sections 5–6 (byte-identical, verified with 0 field diffs) and adds **section 4: 13 countries × Top-10**
on pages 5–28 (the Top 300 registry follows on pages 29–79). Same 6-column layout, but rows start with `[Country #N]`, there is no Books / A-Level /
IB column and the deadline cell carries scholarship labels (TB, SH, EYUF, MEXT, RF Quota …).

| Step | Script | Output |
| --- | --- | --- |
| 1 | `extract_pdf.py <pdf> raw_cells.json 5 79` (optional first/last page) → keep rows whose first cell starts with `[` | raw cells of the 130 section-4 rows |
| 2 | `parse_rows_13c.py raw_cells_13c.json parsed_13c.json` | 130 records (`group`, `group_rank`, `action`, admission numbers, scholarship name/type/max, deadlines, ISO2 + flag) |
| 3 | `gen_staging_13c.py parsed_13c.json db_unis.json out/` | `CREATE TABLE public._pdf_13c` + INSERT batches; `uni_id` = matched `universities.id` (domain match, then name similarity within the country; `MANUAL` overrides) or `NULL` for new rows. `db_unis.json` = `[[id, name, country, city, domain], …]` exported from the DB |
| 4 | `gen_fill_13c.py parsed_13c.json out/` | `_pdf_13c_cycles` staging (one row per parsed deadline, reuses `gen_fill_sql.parse_deadlines`) |

The parsed registry is committed as `data/uzbek_13_countries_top10_pdf_2026.json`; the Uzbek report
with the matching table and every count is `docs/UZBEK_13_COUNTRIES_PDF_IMPORT_2026-10-23.md`.

Written to the database (2026-10-23): 38 new `universities` (ids 327–364), 92 existing rows enriched
(8 of them former placeholders), 68 `scholarships` updated + 62 university scholarships + 10 national
programmes inserted, 130 `university_scholarships` upserted (358 total), and the generic undergraduate
record set (programs / requirements / cycles / sources) for the 46 universities that had none.

The `_pdf_13c` / `_pdf_13c_cycles` staging tables could **not** be dropped through the connector
(the provider's security filter blocked the statement); `supabase/uzbek_13c_pdf_import.sql` has the
cleanup lines to run manually.
