#!/usr/bin/env python3
"""Deadline staging for the 13-country registry: one row per parsed deadline.

Usage: gen_fill_13c.py parsed_13c.json out_dir/   -> out_dir/40_cycles_13c.sql
Reuses the "next occurrence" date logic of gen_fill_sql.parse_deadlines and adds
the labels used by this registry (TB = Türkiye Bursları, SH = Stipendium Hungaricum,
EYUF = El-Yurt Umidi, Self/Direct = self-funded / direct application, ...).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen_fill_sql as base  # noqa: E402

base.APP_TYPE.update({
    "TB": "Türkiye Bursları (government scholarship)", "SH": "Stipendium Hungaricum", "STIPENDIUM HUNGARICUM": "Stipendium Hungaricum",
    "EYUF": "El-Yurt Umidi (EYUF)", "SELF": "Self-funded applicants", "DIRECT": "Direct application", "YÖS": "TR-YÖS applicants",
    "THINK BIG": "Think Big scholarship", "SCHOLARSHIP": "Scholarship deadline", "MERIT SCHOLARSHIP": "Merit scholarship deadline",
    "FALL": "Regular Decision", "SPRING": "Regular Decision", "CALL 1": "Call 1", "CALL 2": "Call 2", "DSU": "DSU regional grant",
    "ER.GO": "ER.GO regional grant", "EDISU": "EDISU regional grant", "PRE-ACCEPTANCE": "Pre-acceptance", "MEXT": "MEXT scholarship",
    "MEXT EMBASSY": "MEXT (embassy recommendation)", "PEAK": "UTokyo PEAK", "KYOTO IUP": "Kyoto iUP", "IUPE": "Osaka IUPE",
    "ISP": "Hokkaido ISP", "FGL APPLICATION": "Tohoku FGL", "RF QUOTA": "Russian Government Quota", "QUOTA": "Russian Government Quota",
    "SAT TRACK 1": "KFUPM SAT Track 1", "TRACK 2": "KFUPM Track 2", "INTERNATIONAL DEADLINE": "International deadline",
    "FOR FALL SCHOLARSHIP": "Scholarship deadline", "STUDY IN SAUDI WINDOW": "Study in Saudi window",
    "SAT/NUET TRACK": "SAT / NUET track", "KZ GOV GRANT": "Kazakhstan government grant", "GSEP MEXT TRACK": "GSEP (MEXT track)",
    "ROUND 1": "Round 1", "R2": "Round 2", "OLYMPIAD": "Olympiad track", "ADISURC": "ADISURC regional grant",
})
# 'Fall'/'Spring' etc. used as intake notes
base.INTAKE_WORDS.update({"for fall scholarship": "Fall intake", "for october entry": "October entry", "for september entry": "September entry",
                          "for october intake": "October intake", "october intake": "October intake", "oct": "October intake", "feb": "February intake",
                          "for fall": "Fall intake", "fall": "Fall intake", "spring": "Spring intake", "winter": "Winter semester", "summer": "Summer semester"})


def main():
    parsed = json.load(open(sys.argv[1]))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for r in parsed:
        for i, (app, intake, d, kind, note) in enumerate(base.parse_deadlines(r["deadline"], "Regular Decision"), start=1):
            rows.append((r["group"], r["group_rank"], i, app, intake, d, kind, note))
    q = base.q
    sql = """
DROP TABLE IF EXISTS public._pdf_13c_cycles;
CREATE TABLE public._pdf_13c_cycles (grp text, grp_rank int, seq int, app_type text, intake_note text, deadline date, kind text, note text, PRIMARY KEY (grp, grp_rank, seq));
REVOKE ALL ON TABLE public._pdf_13c_cycles FROM anon, authenticated;
INSERT INTO public._pdf_13c_cycles (grp, grp_rank, seq, app_type, intake_note, deadline, kind, note) VALUES
""" + ",\n".join(f"({q(a)}, {q(b)}, {q(c)}, {q(d)}, {q(e)}, {q(f)}, {q(g)}, {q(h)})" for a, b, c, d, e, f, g, h in rows) + ";\n"
    (out / "40_cycles_13c.sql").write_text(sql)
    import collections
    print(f"cycle rows: {len(rows)}", collections.Counter(k for *_, k, _ in rows))
    print(collections.Counter(a for _, _, _, a, *_ in rows).most_common(30))


if __name__ == "__main__":
    main()
