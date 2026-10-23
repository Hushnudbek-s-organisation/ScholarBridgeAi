#!/usr/bin/env python3
"""Parse section 4 of the "EdTech Audit + 13 Davlat Top-10 (130 Uni) + Global Top 300"
master guide: the 13-country Top-10 registry (130 rows).

Row layout differs slightly from the Top-300 registry handled by parse_rows.py:
  col0 : "[South Korea #1] Name  Amal: UPSERT | world_ranking: NULL  Public (1946) | BSc/BA/MSc/PhD"
  col1 : "<flag> Country — City  PSW Viza: 2 yil | TZ: KST (UTC+9)  Sayt: en.snu.ac.kr"
  col2 : "Tuition: $7,000/yr Living: $13,000/yr | Housing: $8,000/yr App Fee: $90 USD"   (no Books)
  col3 : "Acc: 15% (0.15) | GPA: 3.7 | SAT: NULL (Opt/1450+)  IELTS: 7.0 | TOEFL: 94 | DET: 120 |
          <other requirements>  PS:T Rec:T Int:T Port:F"                                  (no A-Level / IB)
  col4 : "<deadline text>  Intake: Fall & Spring  Valyuta: USD/year"
  col5 : "<scholarship name>  Turi: Yes, Merit/Need-based  Max: Full Ride (...)"

Usage: parse_rows_13c.py raw_cells_13c.json parsed_13c.json
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from parse_rows import COUNTRY_ISO, TZ_BY_ABBR, TZ_BY_COUNTRY, clean, flag_emoji, money, num  # noqa: E402


def parse_col0(txt):
    flat = clean(txt)
    m = re.match(r"\[(?P<group>[^\]#]+?)\s*#(?P<rank>\d+)\]\s*(?P<name>.*?)\s*Amal:\s*(?P<action>UPSERT|UPDATE|INSERT)\s*\|\s*world_ranking:\s*\S+\s*(?P<rest>.*)$", flat)
    if not m:
        raise ValueError(f"col0 unparsable: {flat!r}")
    rest = m.group("rest")
    tm = re.match(r"(Public|Private|State|Federal|National|Public/Private)[^(]*\((\d{4})\)\s*\|?\s*(.*)$", rest)
    utype = founded = degrees = None
    if tm:
        utype, founded, degrees = tm.group(1), int(tm.group(2)), clean(tm.group(3)) or None
    return {
        "group": clean(m.group("group")), "group_rank": int(m.group("rank")), "name": clean(m.group("name")),
        "action": m.group("action"), "university_type": utype, "founded_year": founded, "degrees": degrees,
    }


def parse_col1(txt):
    flat = re.sub(r"^[^\w]+", "", clean(txt))
    m = re.match(r"(.*?)\s*—\s*(.*?)\s*PSW Viza:\s*([\d.]+)\s*yil\s*\|\s*TZ:\s*(.*?)\s*Sayt:\s*(.*)$", flat)
    if not m:
        raise ValueError(f"col1 unparsable: {flat!r}")
    country, city, psw, tz, site = m.groups()
    country = clean(country)
    iso = COUNTRY_ISO.get(country)
    tz_abbr = clean(re.sub(r"\(UTC[^)]*\)", "", tz))
    return {
        "country": country, "city": clean(city), "psw_years": float(psw), "tz_abbr": tz_abbr,
        "timezone": (TZ_BY_COUNTRY.get(iso) if iso else None) or TZ_BY_ABBR.get(tz_abbr),
        "website": re.sub(r"\s+", "", site).rstrip("/"), "iso2": iso, "flag": flag_emoji(iso) if iso else "🌐",
    }


def parse_col2(txt):
    flat = clean(txt)
    m = re.match(r"Tuition:\s*(.*?)\s*Living:\s*(.*?)\s*\|\s*Housing:\s*(.*?)\s*App Fee:\s*(.*?)$", flat)
    if not m:
        raise ValueError(f"col2 unparsable: {flat!r}")
    tuition_txt, living, housing, fee = m.groups()
    avg = re.search(r"Avg:\s*\$?([\d,]+)", tuition_txt)
    rng = re.match(r"\$?([\d,]+)\s*(?:–|-|to)\s*\$?([\d,]+)", tuition_txt)
    tuition = int(avg.group(1).replace(",", "")) if avg else money(tuition_txt)
    if rng and not avg:
        lo, hi = int(rng.group(1).replace(",", "")), int(rng.group(2).replace(",", ""))
        tuition = (lo + hi) // 2
    return {
        "tuition_text": tuition_txt, "tuition": tuition,
        "tuition_min": int(rng.group(1).replace(",", "")) if rng else None,
        "tuition_max": int(rng.group(2).replace(",", "")) if rng else None,
        "living": money(living), "housing": money(housing), "app_fee": money(fee),
    }


FLAGS_RE = re.compile(r"PS:([TF])\s*Rec:([TF])\s*Int:([TF])\s*Port:([TF])")


def parse_col3(txt):
    lines = [clean(l) for l in txt.split("\n") if clean(l)]
    # The flags line is rendered on its own baseline and lands in the middle of the "other" text.
    flags = None
    kept = []
    for l in lines:
        fm = FLAGS_RE.search(l)
        if fm:
            flags = fm.groups()
            l = clean(FLAGS_RE.sub("", l))
            if not l:
                continue
        kept.append(l)
    flat = clean(" ".join(kept))
    # drop the stray acceptance-rate decimal rendered on its own line ("0.15")
    flat = re.sub(r"\(\s*\)", "", flat)
    out = {}
    m = re.search(r"Acc:\s*(\d+(?:\.\d+)?)%", flat)
    out["acceptance_rate_pct"] = float(m.group(1)) if m else None
    m = re.search(r"GPA:\s*([\d.]+|NULL)", flat)
    out["gpa"] = num(m.group(1)) if m else None
    m = re.search(r"SAT:\s*(.*?)\s*IELTS:", flat)
    sat_txt = clean(re.sub(r"\b[01]\.\d+\b", "", m.group(1))) if m else ""
    sm = re.match(r"(\d{3,4})", sat_txt)
    out["sat"] = int(sm.group(1)) if sm else None
    out["sat_note"] = clean(re.sub(r"^NULL\b", "", sat_txt)) or None
    m = re.search(r"IELTS:\s*([\d.]+|NULL)", flat)
    out["ielts"] = num(m.group(1)) if m else None
    m = re.search(r"TOEFL:\s*(\d+|NULL)", flat)
    out["toefl"] = int(m.group(1)) if m and m.group(1) != "NULL" else None
    m = re.search(r"DET:\s*(\d+|NULL)\s*\|?\s*(.*)$", flat)
    out["det"] = int(m.group(1)) if m and m.group(1) != "NULL" else None
    other = clean(m.group(2)) if m else None
    out["other"] = re.sub(r"\s+-\s+", "-", other).replace("- ", "-") if other else None
    if flags is None:
        raise ValueError(f"col3 flags missing: {flat!r}")
    out["ps"], out["rec"], out["int"], out["port"] = (f == "T" for f in flags)
    return out


def parse_col4(txt):
    flat = clean(txt)
    m = re.match(r"^(?P<deadline>.*?)\s*Intake:\s*(?P<intake>.*?)\s*Valyuta:\s*(?P<currency>\S+)\s*$", flat)
    if not m:
        raise ValueError(f"col4 unparsable: {flat!r}")
    d = m.groupdict()
    d["deadline"] = clean(d["deadline"]).replace("- ", "-")
    d["intake"] = clean(d["intake"])
    return d


def parse_col5(txt):
    flat = clean(txt).replace("- ", "-")
    m = re.match(r"^(?P<name>.*?)\s*Turi:\s*(?P<turi>.*?)\s*Max:\s*(?P<max>.*)$", flat)
    if not m:
        raise ValueError(f"col5 unparsable: {flat!r}")
    turi = clean(m.group("turi"))
    am = re.match(r"(Yes|Limited|Very Limited|No)\s*[,;]?\s*(.*)$", turi)
    avail, stype = (am.group(1), clean(am.group(2))) if am else (None, turi)
    return {"sch_name": clean(m.group("name")), "sch_avail": avail, "sch_type": stype or None,
            "sch_max": clean(m.group("max"))}


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/uz/raw_cells_13c.json")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/uz/parsed_13c.json")
    rows = json.load(open(src))
    parsed, errors = [], []
    for r in rows:
        c = r["cells"]
        try:
            rec = {"page": r["page"]}
            for i, fn in enumerate((parse_col0, parse_col1, parse_col2, parse_col3, parse_col4, parse_col5)):
                rec.update(fn(c[i]))
            parsed.append(rec)
        except Exception as e:  # noqa: BLE001
            errors.append((c[0].split("\n")[0], str(e)))
    out.write_text(json.dumps(parsed, ensure_ascii=False, indent=1))
    print(f"parsed {len(parsed)} rows, {len(errors)} errors -> {out}")
    for e in errors:
        print("ERR", e)


if __name__ == "__main__":
    main()
