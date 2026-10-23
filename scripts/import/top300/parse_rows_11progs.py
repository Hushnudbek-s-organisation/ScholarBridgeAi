#!/usr/bin/env python3
"""Parse the 4-column registry of "Top Universities — 11 Programs/Uni + QS Ranking
+ Campus Images" into structured records.

Input : raw_cells.json produced by extract_pdf_11progs.py (430 rows)
Output: parsed.json — one record per table row with
  section ('sec4' | 'top200' | 'top300'), group, group_rank, global_rank, name,
  action, qs_rank, country, city, university_type, founded_year, psw_years,
  website, image_file, tuition/tuition_text/tuition_min/tuition_max, living,
  housing, app_fee, acceptance_rate_pct, gpa, sat, sat_note, ielts, toefl, det,
  other, ps, rec, int, port, programs[11], program_profile, deadline, intake,
  timezone, fokus, scholarship{name,avail,type,max}, notes

Usage: parse_rows_11progs.py raw_cells.json parsed.json
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from parse_rows import COUNTRY_ISO, clean, flag_emoji, num  # noqa: E402


def money_usd(text):
    """'64,310' -> 64310.0 ; '7,000' -> 7000.0 (num() stops at the comma)."""
    return num(text.replace(",", "")) if text else None

GLOBAL_RANK = re.compile(r"(?:^#(?P<global_rank>\d+)\s|\bglobal_rank\b)?")


def parse_col0(txt):
    flat = clean(txt)
    out = {}
    m = re.match(r"^(?:\[(?P<group>[^\]#]+?)\s*#(?P<group_rank>\d+)\]|#(?P<global_rank>\d+))\s*"
                 r"(?P<name>.*?)\s*QS Global Rank:\s*#(?P<qs>\d+)", flat)
    if not m:
        raise ValueError(f"col0 header unparsable: {flat!r}")
    out["group"] = clean(m.group("group")) or None
    out["group_rank"] = int(m.group("group_rank")) if m.group("group_rank") else None
    out["global_rank"] = int(m.group("global_rank")) if m.group("global_rank") else None
    out["name"] = clean(m.group("name"))
    out["qs_rank"] = int(m.group("qs"))

    tail = flat[m.end():]
    # "( ) | UPDATE world_ranking: 1" or "( world_ranking: ) | UPDATE 1"
    act = re.search(r"\|\s*(UPDATE|INSERT|UPSERT)", tail)
    out["action"] = act.group(1) if act else "UPSERT"
    region = flat[flat.index("world_ranking:"):] if "world_ranking:" in flat else tail
    wr = re.search(r"(?<!\d)(\d{1,4})(?!\d)", region[region.index("world_ranking:") + len("world_ranking:"):])
    out["wr"] = int(wr.group(1)) if wr else None

    # "<flag> Country (City) | Public, 1946 | PSW: 2y"
    block_end = region.find("Sayt:")
    block = region[:block_end] if block_end > 0 else region
    # drop "world_ranking: [)] [| UPDATE] 138" — the rank integer(s) before the country
    block = block[block.index("world_ranking:") + len("world_ranking:"):]
    ints = re.search(r"(?<!\d)\d{1,4}(?!\d)", block)
    if ints:
        block = block[ints.end():]
    m2 = re.search(r"([^|()]+?)\s*\((.*)\)\s*\|\s*([^|,]+?)\s*(?:,\s*(\d{3,4}))?\s*\|?\s*PSW:\s*([\d.]+)\s*y", block)
    if not m2:
        raise ValueError(f"country block unparsable: {block!r}")
    country = re.sub(r"[^\w\s.&'\-]", "", m2.group(1), flags=re.UNICODE).strip()
    out["country"] = clean(country)
    out["city"] = clean(m2.group(2))
    out["university_type"] = clean(m2.group(3))
    out["founded_year"] = int(m2.group(4)) if m2.group(4) else None
    out["psw_years"] = float(m2.group(5))

    web = re.search(r"Sayt:\s*([^\s|]+)", flat)
    out["website"] = clean(web.group(1)) if web else None
    # the campus-image file name wraps across lines ("..._SNU_" / "Campus.jpg")
    img = flat.split("Img:")
    out["image_file"] = re.sub(r"\s+", "", img[-1]) or None if len(img) > 1 else None
    if out["website"] and not out["website"].startswith("http"):
        out["website"] = "https://" + out["website"].lstrip("/")
    return out


def parse_col1(txt):
    flat = clean(txt)
    out = {}
    t = re.search(r"Tuition:\s*(?P<val>.+?)(?:\s+Living:|\s*$)", flat)
    if t:
        raw = t.group("val")
        out["tuition_text"] = clean(raw).rstrip("| ").strip()
        avg = re.search(r"Avg:\s*\$([\d,]+)", raw)
        rng = re.search(r"\$([\d,]+)\s*[–-]\s*\$([\d,]+)", raw)
        single = re.search(r"\$([\d,]+)", raw)
        if rng:
            out["tuition_min"] = money_usd(rng.group(1))
            out["tuition_max"] = money_usd(rng.group(2))
            out["tuition"] = money_usd(avg.group(1)) if avg else None
        else:
            out["tuition"] = money_usd(single.group(1)) if single else None
            out["tuition_min"] = out["tuition_max"] = None
    for key, pat in (("living", r"Living:\s*\$?([\d,]+)"), ("housing", r"Housing:\s*\$?([\d,]+)"),
                     ("app_fee", r"(?:App Fee|Fee):\s*\$?([\d,]+)")):
        m = re.search(pat, flat)
        out[key] = money_usd(m.group(1)) if m else None

    m = re.search(r"Acc:\s*([\d.]+)%", flat)
    out["acceptance_rate_pct"] = float(m.group(1)) if m else None

    def grab(label, pattern):
        mm = re.search(label + r":\s*" + pattern, flat, re.I)
        return mm

    mm = grab("GPA", r"([\d.]+)")
    out["gpa"] = float(mm.group(1)) if mm else None
    mm = grab("SAT", r"(.+?)(?:\s+IELTS:|$)")
    sat_raw = clean(mm.group(1)) if mm else None
    out["sat"] = None
    out["sat_note"] = None
    if sat_raw:
        if re.match(r"^(\d{3,4})", sat_raw):
            out["sat"] = int(re.match(r"^(\d{3,4})", sat_raw).group(1))
            rest = clean(re.sub(r"^\d{3,4}", "", sat_raw))
            out["sat_note"] = rest or None
        else:
            out["sat_note"] = re.sub(r"^NULL\s*", "", sat_raw) or None
    mm = re.search(r"IELTS:\s*([\d.]+)", flat)
    out["ielts"] = float(mm.group(1)) if mm else None
    mm = re.search(r"TOEFL:?\s*(\d+)", flat)
    out["toefl"] = int(mm.group(1)) if mm else None
    mm = re.search(r"DET:?\s*(\d+)", flat)
    out["det"] = int(mm.group(1)) if mm else None
    flags = dict(re.findall(r"\b(PS|Rec|Int|Port):([TF])", flat))
    out["ps"] = flags.get("PS") == "T"
    out["rec"] = flags.get("Rec") == "T"
    out["int"] = flags.get("Int") == "T"
    out["port"] = flags.get("Port") == "T"
    return out


PROG_RE = re.compile(r"(\d{1,2})\)\s*(.+?)(?=,?\s*\d{1,2}\)\s|;|$)")


def parse_col2(txt):
    flat = clean(txt)
    m = re.match(r"\[(?P<profile>[^\]]+?)\s*—\s*11 Dastur[^\]]*\]\s*:?\s*(?P<rest>.*)$", flat)
    body = m.group("rest") if m else flat
    profile = clean(m.group("profile")) if m else None
    items = [(int(n), clean(t)) for n, t in PROG_RE.findall(body)]
    items = [(n, re.sub(r"^(?:;\s*)+", "", t)) for n, t in items]
    return {"program_profile": profile, "programs": [t for _, t in sorted(items)]}


def split_intake(text):
    """'Mar (Fall), Sep (Spring) (Fall & Spring, KST (UTC+9))'
    -> ('Mar (Fall), Sep (Spring)', 'Fall & Spring', 'KST (UTC+9)')."""
    if not text:
        return None, None, None
    depth, spans, start = 0, [], None
    for i, ch in enumerate(text):
        if ch == "(":
            if depth == 0:
                start = i
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0 and start is not None:
                spans.append((start, i))
    if not spans:
        return clean(text), None, None
    a, b = spans[-1]
    inner = clean(text[a + 1:b])
    deadline = clean(text[:a])
    if "," in inner:
        parts = [x.strip() for x in inner.rsplit(",", 1)]
        intake, tz = parts[0], parts[1]
        if not re.match(r"^[A-Z]{2,5}\b", tz):
            intake, tz = inner, None
    else:
        intake, tz = inner, None
    return deadline or None, intake, tz


def parse_col3(txt):
    flat = clean(txt)
    out = {}
    m = re.search(r"Muddat:\s*(.*?)(?=Fokus:|Grant:|$)", flat)
    dl = clean(m.group(1)) if m else None
    out["deadline"], out["intake"], out["timezone"] = split_intake(dl)
    m = re.search(r"Fokus:\s*(.*?)(?=Grant:|$)", flat)
    out["fokus"] = clean(m.group(1)) if m else None
    m = re.search(r"Grant:\s*(.*?)(?=Max Qoplama:|Maxsus:|$)", flat)
    grant = clean(m.group(1)) if m else None
    out["scholarship_name"] = None
    out["sch_avail"] = None
    out["sch_type"] = None
    if grant:
        gm = re.match(r"(?P<name>.*?)\s*\((?P<avail>Yes|Limited|Very Limited)\s*,\s*(?P<type>[^)]+)\)\s*$", grant)
        if gm:
            out["scholarship_name"] = clean(gm.group("name"))
            out["sch_avail"] = gm.group("avail")
            out["sch_type"] = clean(gm.group("type"))
        else:
            out["scholarship_name"] = grant
    m = re.search(r"Max Qoplama:\s*(.*?)(?=Maxsus:|$)", flat)
    out["sch_max"] = clean(m.group(1)) if m else None
    m = re.search(r"Maxsus:\s*(.*)$", flat)
    out["other"] = clean(m.group(1)) if m else None
    return out


def main():
    raw = json.load(open(sys.argv[1]))
    out_path = Path(sys.argv[2])
    records, errors = [], []
    for r in raw:
        try:
            c0, c1, c2, c3 = r["cells"]
            rec = {"page": r["page"]}
            rec.update(parse_col0(c0))
            rec.update(parse_col1(c1))
            rec.update(parse_col2(c2))
            rec.update(parse_col3(c3))
            rec["section"] = "sec4" if rec["group"] else ("top200" if rec["global_rank"] <= 200 else "top300")
            iso = COUNTRY_ISO.get(rec["country"], "")
            rec["iso2"] = iso
            rec["flag"] = flag_emoji(iso) if iso else None
            records.append(rec)
        except Exception as exc:  # noqa: BLE001
            errors.append({"page": r["page"], "error": str(exc), "cells": r["cells"][:1]})
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=1))
    print(f"parsed {len(records)} rows, {len(errors)} errors -> {out_path}")
    for e in errors[:10]:
        print("  ERR", e["page"], e["error"][:160])


if __name__ == "__main__":
    main()
