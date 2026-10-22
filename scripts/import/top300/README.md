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
