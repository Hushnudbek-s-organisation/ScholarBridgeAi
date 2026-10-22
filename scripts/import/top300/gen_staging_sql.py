#!/usr/bin/env python3
"""Generate SQL that loads the parsed PDF registry into a staging table
(public._pdf_top300) so the comparison / upsert can be done in SQL.

Usage: gen_staging_sql.py parsed.json matches.txt out_dir
  matches.txt : "pdf_rank:university_id:note,..." mapping (verified manually)
Writes out_dir/00_create.sql and out_dir/NN_insert.sql batches.
"""
import json
import sys
from pathlib import Path

parsed = json.load(open(sys.argv[1]))
matches = {}
for tok in open(sys.argv[2]).read().strip().split(","):
    r, mid, note = tok.split(":", 2)
    matches[int(r)] = (int(mid), note)
out = Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

DUP_OF = {22: 18, 115: 92, 129: 110}  # PDF duplicates -> canonical rank


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


COLS = [
    "pdf_rank", "uni_id", "is_dup", "name", "country", "city", "iso2", "flag", "utype", "founded",
    "psw", "tz", "website", "tuition", "tuition_min", "tuition_max", "living", "housing", "app_fee", "books",
    "acc_pct", "gpa", "sat", "sat_note", "ielts", "toefl", "det", "a_level", "ib",
    "ps", "rec", "intv", "port", "other_req", "deadline_text", "intake", "apptype", "focus",
    "sch_name", "sch_avail", "sch_type", "sch_max", "action",
]

create = """
DROP TABLE IF EXISTS public._pdf_top300;
CREATE TABLE public._pdf_top300 (
  pdf_rank int PRIMARY KEY, uni_id int, is_dup boolean NOT NULL DEFAULT false,
  name text, country text, city text, iso2 text, flag text, utype text, founded int,
  psw numeric, tz text, website text, tuition int, tuition_min int, tuition_max int,
  living int, housing int, app_fee int, books int,
  acc_pct numeric, gpa numeric, sat int, sat_note text, ielts numeric, toefl int, det int, a_level text, ib text,
  ps boolean, rec boolean, intv boolean, port boolean, other_req text,
  deadline_text text, intake text, apptype text, focus text,
  sch_name text, sch_avail text, sch_type text, sch_max text, action text
);
"""
(out / "00_create.sql").write_text(create)

rows = []
for r in parsed:
    rank = r["rank"]
    is_dup = rank in DUP_OF
    mid = matches.get(rank, matches.get(DUP_OF.get(rank, -1), (None, ""))) [0]
    vals = [
        rank, mid, is_dup, r["name"], r["country"], r["city"], r["iso2"], r["flag"], r["university_type"], r["founded_year"],
        r["psw_years"], r["timezone"], r["website"], r["tuition"], r["tuition_min"], r["tuition_max"], r["living"], r["housing"], r["app_fee"], r["books"],
        r["acceptance_rate_pct"], r["gpa"], r["sat"], r["sat_note"], r["ielts"], r["toefl"], r["det"], r["a_level"], r["ib"],
        r["ps"], r["rec"], r["int"], r["port"], r["other"], r["deadline"], r["intake"], r["apptype"], r["focus"],
        r["sch_name"], r["sch_avail"], r["sch_type"], r["sch_max"], r["action"],
    ]
    rows.append("(" + ", ".join(q(v) for v in vals) + ")")

BATCH = 30
for i in range(0, len(rows), BATCH):
    sql = f"INSERT INTO public._pdf_top300 ({', '.join(COLS)}) VALUES\n" + ",\n".join(rows[i:i + BATCH]) + ";"
    (out / f"{i // BATCH + 1:02d}_insert.sql").write_text(sql)
print(f"wrote {len(rows)} rows in {(len(rows) + BATCH - 1) // BATCH} batches to {out}")
