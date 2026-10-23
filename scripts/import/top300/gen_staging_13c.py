#!/usr/bin/env python3
"""Build the staging SQL for the 13-country Top-10 registry (130 rows).

Matching to public.universities is done here (domain match first, then name
similarity within the same country) and written into the staging table as
`uni_id` (NULL = new university). Manual overrides fix the known false
positives / renames.

Usage: gen_staging_13c.py parsed_13c.json db_unis.json out_dir/
  db_unis.json : [[id, name, country, city, domain], ...] exported from the DB
Writes out_dir/30_create_13c.sql and out_dir/3N_insert_13c.sql batches.
"""
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

parsed = json.load(open(sys.argv[1]))
db = json.load(open(sys.argv[2]))
out = Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

# (group, group_rank) -> university id | None.  Reviewed by hand (see docs/TOP300_PDF_IMPORT_2026-10-23.md §7).
MANUAL = {
    ("Poland", 8): None,      # University of Wrocław is NOT University of Warsaw (name similarity false positive)
    ("Japan", 3): 38,         # Institute of Science Tokyo = renamed Tokyo Institute of Technology
}
COUNTRY_ALIAS = {"Türkiye": "Turkey", "Czech Republic": "Czechia"}


def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " and ").replace("–", "-")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\b(the|of|at|de|di|du|la|le|des|und|and|in)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def core_domain(url):
    d = re.sub(r"/.*$", "", (url or "").lower()).replace("www.", "")
    parts = d.split(".")
    if len(parts) >= 3 and parts[-2] in ("ac", "edu", "co", "com", "gov", "org", "or") and len(parts[-1]) == 2:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


by_domain = {}
for u in db:
    by_domain.setdefault(core_domain(u[4]), []).append(u)


def match(r):
    key = (r["group"], r["group_rank"])
    if key in MANUAL:
        return MANUAL[key], "manual"
    country = COUNTRY_ALIAS.get(r["country"], r["country"])
    dm = [u for u in by_domain.get(core_domain(r["website"]), []) if u[2] == country]
    if len(dm) == 1:
        return dm[0][0], "domain"
    best, best_score = None, 0.0
    for u in (u for u in db if u[2] == country):
        a, b = re.sub(r"\(.*?\)", "", r["name"]), re.sub(r"\(.*?\)", "", u[1])
        sim = max(SequenceMatcher(None, norm(r["name"]), norm(u[1])).ratio(), SequenceMatcher(None, norm(a), norm(b)).ratio())
        if sim > best_score:
            best, best_score = u, sim
    if best_score >= 0.85:
        return best[0], f"name {best_score:.2f}"
    return None, "new"


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


COLS = ["grp", "grp_rank", "uni_id", "match_note", "name", "country", "city", "iso2", "flag", "utype", "founded",
        "psw", "tz", "website", "tuition", "tuition_min", "tuition_max", "living", "housing", "app_fee",
        "acc_pct", "gpa", "sat", "sat_note", "ielts", "toefl", "det", "ps", "rec", "intv", "port", "other_req",
        "deadline_text", "intake", "sch_name", "sch_avail", "sch_type", "sch_max"]

create = """
DROP TABLE IF EXISTS public._pdf_13c;
CREATE TABLE public._pdf_13c (
  grp text, grp_rank int, uni_id int, match_note text, name text, country text, city text, iso2 text, flag text,
  utype text, founded int, psw numeric, tz text, website text, tuition int, tuition_min int, tuition_max int,
  living int, housing int, app_fee int, acc_pct numeric, gpa numeric, sat int, sat_note text, ielts numeric,
  toefl int, det int, ps boolean, rec boolean, intv boolean, port boolean, other_req text,
  deadline_text text, intake text, sch_name text, sch_avail text, sch_type text, sch_max text,
  PRIMARY KEY (grp, grp_rank)
);
"""
(out / "30_create_13c.sql").write_text(create)

rows, stats = [], {"matched": 0, "new": 0}
for r in parsed:
    uid, note = match(r)
    stats["matched" if uid else "new"] += 1
    vals = [r["group"], r["group_rank"], uid, note, r["name"], r["country"], r["city"], r["iso2"], r["flag"],
            r["university_type"], r["founded_year"], r["psw_years"], r["timezone"], r["website"], r["tuition"],
            r["tuition_min"], r["tuition_max"], r["living"], r["housing"], r["app_fee"], r["acceptance_rate_pct"],
            r["gpa"], r["sat"], r["sat_note"], r["ielts"], r["toefl"], r["det"], r["ps"], r["rec"], r["int"], r["port"],
            r["other"], r["deadline"], r["intake"], r["sch_name"], r["sch_avail"], r["sch_type"], r["sch_max"]]
    rows.append("(" + ", ".join(q(v) for v in vals) + ")")

BATCH = 33
for i in range(0, len(rows), BATCH):
    sql = f"INSERT INTO public._pdf_13c ({', '.join(COLS)}) VALUES\n" + ",\n".join(rows[i:i + BATCH]) + ";"
    (out / f"3{i // BATCH + 1}_insert_13c.sql").write_text(sql)
print(f"rows={len(rows)} matched={stats['matched']} new={stats['new']} batches={(len(rows) + BATCH - 1) // BATCH}")
