#!/usr/bin/env python3
"""Generate the SQL that fills the gaps left for the 110 newly inserted universities:
derived per-row attributes (english-taught heuristic, programme duration/language)
and one application-cycle row per parsed deadline.

Reads parsed.json, writes:
  out/20_alter_staging.sql   -- adds columns to _pdf_top300 + fills them
  out/21_cycles_staging.sql  -- creates _pdf_cycles (pdf_rank, seq, app_type, deadline, kind, note)
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

parsed = json.load(open(sys.argv[1]))
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

TODAY = date(2026, 10, 23)
MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}

LOCAL_LANG_TOKENS = ["german c1", "french b", "french c1", "spanish b", "italian b", "portuguese", "russian",
                     "catalan", "czech", "dutch", "danish", "swedish", "norwegian", "finnish", "hsk", "topik",
                     "japanese n1", "bahasa"]
THREE_YEAR = {"GB", "IE", "AU", "NZ", "NL", "BE", "FR", "DE", "IT", "ES", "PT", "CH", "AT", "DK", "SE", "NO", "FI",
              "PL", "CZ", "ZA", "HU", "TR", "IL", "AR", "BR", "CL", "CO", "MX", "RU", "KZ"}
ADMIN_FEE_COUNTRIES = {"DE", "FR", "NO", "DK", "AT", "CH"}

APP_TYPE = {
    "RD": "Regular Decision", "EA": "Early Action", "ED": "Early Decision", "ED I": "Early Decision I",
    "ED II": "Early Decision II", "REA": "Restrictive Early Action", "SCEA": "Single-Choice Early Action",
    "UCAS": "UCAS Main", "MAIN ROUND": "Main Round", "PRIORITY": "Priority", "EARLY": "Early",
    "REGULAR": "Regular Decision", "MERIT SCHOLARSHIP": "Merit Scholarship Deadline",
}


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, date):
        return "'" + v.isoformat() + "'"
    return "'" + str(v).replace("'", "''") + "'"


def next_occurrence(month, day):
    """Next calendar occurrence of month/day on or after TODAY."""
    try:
        d = date(TODAY.year, month, day)
    except ValueError:
        d = date(TODAY.year, month, 28)
    if d < TODAY:
        d = date(TODAY.year + 1, month, day)
    return d


INTAKE_WORDS = {"fall": "Fall intake", "spring": "Spring intake", "winter": "Winter semester", "summer": "Summer semester",
                "autumn": "Autumn intake", "semester 1": "Semester 1", "feb": "February intake", "sep": "September intake",
                "feb intake": "February intake", "august intake": "August intake", "for august": "August intake",
                "for september": "September intake", "for fall": "Fall intake", "for autumn": "Autumn intake",
                "for february intake": "February intake", "for most programs": None, "priority for fall": "Fall intake",
                "priority for autumn": "Autumn intake", "for winter": "Winter semester", "for summer": "Summer semester",
                "early": None, "regular": None}


def parse_deadlines(text, default_type):
    """Return list of (app_type, intake_note|None, deadline_date|None, kind, note)."""
    t = text.strip()
    rolling = bool(re.match(r"rolling", t, re.I))
    found = []
    # ISO dates in the PDF (e.g. '2025-01-15') carry an obviously stale year -> keep month/day only
    for m in re.finditer(r"\b(\d{4})-(\d{2})-(\d{2})\b", t):
        found.append((next_occurrence(int(m.group(2)), int(m.group(3))), default_type, None))
    for m in re.finditer(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b(?:\s*\(([^)]*)\))?", t):
        mon = MONTHS[m.group(1)[:3].lower()]
        d = next_occurrence(mon, int(m.group(2)))
        label = (m.group(3) or "").strip()
        key = label.lower()
        app = APP_TYPE.get(label.upper())
        intake = None
        if app is None and key in INTAKE_WORDS:
            intake = INTAKE_WORDS[key]
            app = "Priority" if key.startswith("priority") else default_type
        elif app is None and label:
            app = label
        if rolling:
            app = "Priority" if "priority" in t.lower() else "Rolling"
        found.append((d, app or default_type, intake))
    if found:
        return [(app, intake, d, "rolling" if rolling else "exact", t) for d, app, intake in found]
    return [(default_type, None, None, "rolling" if rolling else "estimated", t)]


alter_rows = []
cycle_rows = []
for r in parsed:
    other = (r["other"] or "").lower()
    english = not any(tok in other for tok in LOCAL_LANG_TOKENS)
    duration = 3 if r["iso2"] in THREE_YEAR else 4
    lang = "English" if english else "English / local language (see requirements)"
    admin_fee = r["iso2"] in ADMIN_FEE_COUNTRIES
    alter_rows.append((r["rank"], english, duration, lang, admin_fee))
    for i, (app, intake, d, kind, note) in enumerate(parse_deadlines(r["deadline"], r["apptype"]), start=1):
        cycle_rows.append((r["rank"], i, app, intake, d, kind, note))

sql1 = """
ALTER TABLE public._pdf_top300
  ADD COLUMN IF NOT EXISTS english boolean,
  ADD COLUMN IF NOT EXISTS duration int,
  ADD COLUMN IF NOT EXISTS lang text,
  ADD COLUMN IF NOT EXISTS admin_fee boolean;
UPDATE public._pdf_top300 p SET english = v.english, duration = v.duration, lang = v.lang, admin_fee = v.admin_fee
FROM (VALUES
""" + ",\n".join(f"({q(a)}, {q(b)}, {q(c)}, {q(d)}, {q(e)})" for a, b, c, d, e in alter_rows) + """
) AS v(pdf_rank, english, duration, lang, admin_fee)
WHERE p.pdf_rank = v.pdf_rank;
"""
(out / "20_alter_staging.sql").write_text(sql1)

sql2 = """
DROP TABLE IF EXISTS public._pdf_cycles;
CREATE TABLE public._pdf_cycles (pdf_rank int, seq int, app_type text, intake_note text, deadline date, kind text, note text, PRIMARY KEY (pdf_rank, seq));
INSERT INTO public._pdf_cycles (pdf_rank, seq, app_type, intake_note, deadline, kind, note) VALUES
""" + ",\n".join(f"({q(a)}, {q(b)}, {q(c)}, {q(g)}, {q(d)}, {q(e)}, {q(f)})" for a, b, c, g, d, e, f in cycle_rows) + ";\n"
(out / "21_cycles_staging.sql").write_text(sql2)
print(f"alter rows: {len(alter_rows)}, cycle rows: {len(cycle_rows)}")
import collections
print(collections.Counter(k for _, _, _, _, _, k, _ in cycle_rows))
print(collections.Counter(a for _, _, a, _, _, _, _ in cycle_rows).most_common(25))
print(collections.Counter(a for _, _, _, a, _, _, _ in cycle_rows).most_common(25))
print("english true:", sum(1 for x in alter_rows if x[1]), "/", len(alter_rows))
