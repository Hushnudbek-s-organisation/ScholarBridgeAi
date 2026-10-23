#!/usr/bin/env python3
"""Parse the raw 6-column cells extracted by extract_pdf.py into structured records.

Input : raw_cells.json  (from extract_pdf.py)
Output: parsed.json     (list of dicts, one per PDF row, 300 rows incl. 3 duplicates)
"""
import json
import re
import sys
from pathlib import Path


# Country -> ISO2 (used for flag emoji + country_code). Names as they appear in the PDF.
COUNTRY_ISO = {
    "Argentina": "AR", "Australia": "AU", "Austria": "AT", "Belgium": "BE", "Brazil": "BR",
    "Canada": "CA", "Chile": "CL", "China": "CN", "Colombia": "CO", "Czech Republic": "CZ",
    "Czechia": "CZ", "Denmark": "DK", "Finland": "FI", "France": "FR", "Germany": "DE",
    "Hong Kong SAR": "HK", "Hong Kong": "HK", "India": "IN", "Indonesia": "ID", "Ireland": "IE",
    "Israel": "IL", "Italy": "IT", "Japan": "JP", "Kazakhstan": "KZ", "Lebanon": "LB",
    "Macau SAR": "MO", "Macau": "MO", "Malaysia": "MY", "Mexico": "MX", "Netherlands": "NL",
    "New Zealand": "NZ", "Norway": "NO", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
    "Russia": "RU", "Saudi Arabia": "SA", "Singapore": "SG", "South Africa": "ZA",
    "South Korea": "KR", "Spain": "ES", "Sweden": "SE", "Switzerland": "CH", "Taiwan": "TW",
    "Thailand": "TH", "Türkiye": "TR", "Turkey": "TR", "Türkiye (Turkey)": "TR",
    "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US", "USA": "US",
    "Hungary": "HU", "Greece": "GR", "Egypt": "EG", "Pakistan": "PK", "Philippines": "PH",
    "Vietnam": "VN", "Peru": "PE", "Uruguay": "UY", "Estonia": "EE", "Lithuania": "LT",
    "Slovenia": "SI", "Iran": "IR", "Jordan": "JO", "Oman": "OM", "Bahrain": "BH", "Kuwait": "KW",
    "Uzbekistan": "UZ", "Cyprus": "CY", "Romania": "RO", "Bulgaria": "BG", "Croatia": "HR",
    "Serbia": "RS", "Ukraine": "UA", "Belarus": "BY", "Luxembourg": "LU", "Iceland": "IS",
}

# IANA timezone by the abbreviation shown in the PDF (fallback: country mapping below)
TZ_BY_ABBR = {
    "EST/PST": "America/New_York", "EST": "America/New_York", "GMT/BST": "Europe/London",
    "CET": None, "SGT": "Asia/Singapore", "AEST": "Australia/Sydney", "CST": None,
    "HKT": "Asia/Hong_Kong", "KST": "Asia/Seoul", "JST": "Asia/Tokyo", "MYT": "Asia/Kuala_Lumpur",
    "NZST": "Pacific/Auckland", "ART": "America/Argentina/Buenos_Aires", "GMT/IST": "Europe/Dublin",
    "BRT": "America/Sao_Paulo", "CLT": "America/Santiago", "MSK": "Europe/Moscow",
    "AST": None, "EET": None, "WET": "Europe/Lisbon", "IST": None, "WIB": "Asia/Jakarta",
    "ALMT": "Asia/Almaty", "SAST": "Africa/Johannesburg", "COT": "America/Bogota",
    "GST": "Asia/Dubai", "ICT": "Asia/Bangkok", "TRT": "Europe/Istanbul",
}
TZ_BY_COUNTRY = {
    "AR": "America/Argentina/Buenos_Aires", "AU": "Australia/Sydney", "AT": "Europe/Vienna",
    "BE": "Europe/Brussels", "BR": "America/Sao_Paulo", "CA": "America/Toronto", "CL": "America/Santiago",
    "CN": "Asia/Shanghai", "CO": "America/Bogota", "CZ": "Europe/Prague", "DK": "Europe/Copenhagen",
    "FI": "Europe/Helsinki", "FR": "Europe/Paris", "DE": "Europe/Berlin", "HK": "Asia/Hong_Kong",
    "IN": "Asia/Kolkata", "ID": "Asia/Jakarta", "IE": "Europe/Dublin", "IL": "Asia/Jerusalem",
    "IT": "Europe/Rome", "JP": "Asia/Tokyo", "KZ": "Asia/Almaty", "LB": "Asia/Beirut", "MO": "Asia/Macau",
    "MY": "Asia/Kuala_Lumpur", "MX": "America/Mexico_City", "NL": "Europe/Amsterdam", "NZ": "Pacific/Auckland",
    "NO": "Europe/Oslo", "PL": "Europe/Warsaw", "PT": "Europe/Lisbon", "QA": "Asia/Qatar", "RU": "Europe/Moscow",
    "SA": "Asia/Riyadh", "SG": "Asia/Singapore", "ZA": "Africa/Johannesburg", "KR": "Asia/Seoul",
    "ES": "Europe/Madrid", "SE": "Europe/Stockholm", "CH": "Europe/Zurich", "TW": "Asia/Taipei",
    "TH": "Asia/Bangkok", "TR": "Europe/Istanbul", "AE": "Asia/Dubai", "GB": "Europe/London",
    "US": "America/New_York", "HU": "Europe/Budapest", "GR": "Europe/Athens", "EG": "Africa/Cairo",
}


def flag_emoji(iso2: str) -> str:
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in iso2.upper())


def money(s):
    """'$64,310' -> 64310 ; '$0' -> 0 ; None if not parseable."""
    if s is None:
        return None
    m = re.search(r"\$?\s*([\d][\d,]*)(?:\.\d+)?", s)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def num(s):
    if s is None:
        return None
    s = s.strip()
    if s.upper().startswith("NULL") or s == "":
        return None
    m = re.match(r"(\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else None


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def parse_col0(txt):
    flat = clean(txt)
    m = re.match(r"#(\d+)\s+(.*?)\s*Amal:\s*(UPDATE|INSERT)\s*\|\s*Rank:\s*(\S+)\s*(.*)$", flat)
    if not m:
        raise ValueError(f"col0 unparsable: {flat!r}")
    rank, name, action, rank_val, rest = m.groups()
    dup_note = None
    dm = re.search(r"\[\s*⚠?\s*(#\d+\s*dublikati)\s*\]", name)
    if dm:
        dup_note = dm.group(1)
        name = name[: dm.start()].strip()
    name = name.replace("[⚠", "").strip()
    tm = re.match(r"(Public|Private|Public/Private|State|Federal|National)[^(]*\((\d{4})\)\s*\|\s*(.*)$", rest)
    utype = founded = degrees = None
    if tm:
        utype, founded, degrees = tm.group(1), int(tm.group(2)), clean(tm.group(3))
    else:
        tm2 = re.match(r"(\w+)\s*\((\d{4})\)", rest)
        if tm2:
            utype, founded = tm2.group(1), int(tm2.group(2))
        degrees = rest
    return {
        "rank": int(rank), "name": name, "action": action, "dup_note": dup_note,
        "university_type": utype, "founded_year": founded, "degrees": degrees,
    }


def parse_col1(txt):
    flat = clean(txt)
    # strip leading flag glyphs (private-use or regional-indicator chars)
    flat = re.sub(r"^[^\w]+", "", flat)
    m = re.match(r"(.*?)\s*—\s*(.*?)\s*PSW Viza:\s*([\d.]+)\s*yil\s*\|\s*TZ:\s*(.*?)\s*Sayt:\s*(.*)$", flat)
    if not m:
        raise ValueError(f"col1 unparsable: {flat!r}")
    country, city, psw, tz, site = m.groups()
    site = re.sub(r"\s+", "", site)  # URLs wrap across lines in the PDF
    country = clean(country)
    iso = COUNTRY_ISO.get(country)
    return {
        "country": country, "city": clean(city), "psw_years": float(psw), "tz_abbr": clean(tz),
        "timezone": (TZ_BY_COUNTRY.get(iso) if iso else None) or TZ_BY_ABBR.get(clean(tz)),
        "website": site.rstrip("/"), "iso2": iso, "flag": flag_emoji(iso) if iso else "🌐",
    }


def parse_col2(txt):
    flat = clean(txt)
    m = re.match(r"Tuition:\s*(.*?)\s*Living:\s*(.*?)\s*\|\s*Housing:\s*(.*?)\s*App Fee:\s*(.*?)\s*\(Books:\s*(.*?)\)\s*$", flat)
    if not m:
        raise ValueError(f"col2 unparsable: {flat!r}")
    tuition_txt, living, housing, fee, books = m.groups()
    avg = re.search(r"Avg:\s*\$?([\d,]+)", tuition_txt)
    if avg:
        tuition = int(avg.group(1).replace(",", ""))
    else:
        tuition = money(tuition_txt)
    rng = re.match(r"\$?([\d,]+)\s*(?:–|-|to)\s*\$?([\d,]+)", tuition_txt)
    return {
        "tuition_text": tuition_txt, "tuition": tuition,
        "tuition_min": int(rng.group(1).replace(",", "")) if rng else None,
        "tuition_max": int(rng.group(2).replace(",", "")) if rng else None,
        "living": money(living), "housing": money(housing), "app_fee": money(fee), "books": money(books),
    }


def parse_col3(txt):
    flat = clean(txt)
    out = {}
    m = re.search(r"Acc:\s*(\d+(?:\.\d+)?)%", flat)
    out["acceptance_rate_pct"] = float(m.group(1)) if m else None
    m = re.search(r"GPA:\s*([\d.]+|NULL)", flat)
    out["gpa"] = num(m.group(1)) if m else None
    m = re.search(r"SAT:\s*(.*?)\s*IELTS:", flat)
    sat_txt = m.group(1) if m else ""
    sm = re.match(r"(\d{3,4})", sat_txt)
    out["sat"] = int(sm.group(1)) if sm else None
    # drop the stray acceptance-rate decimal ("0.04") that the PDF renders on its own line
    out["sat_note"] = clean(re.sub(r"\b[01]\.\d+\b|^NULL\b", "", sat_txt)) or None
    m = re.search(r"IELTS:\s*([\d.]+|NULL)", flat)
    out["ielts"] = num(m.group(1)) if m else None
    m = re.search(r"TOEFL:\s*(\d+|NULL)", flat)
    out["toefl"] = int(m.group(1)) if m and m.group(1) != "NULL" else None
    m = re.search(r"DET:\s*(\d+|NULL)", flat)
    out["det"] = int(m.group(1)) if m and m.group(1) != "NULL" else None
    m = re.search(r"A-Lvl:\s*(.*?)\s*\|\s*IB:", flat)
    al = clean(m.group(1)) if m else None
    out["a_level"] = None if (al is None or al.upper() == "NULL") else al
    m = re.search(r"IB:\s*(.*?)\s*(?:\||PS:)", flat)
    ib = clean(m.group(1)) if m else None
    out["ib"] = None if (ib is None or ib.upper() == "NULL") else ib
    for key, tag in (("ps", "PS"), ("rec", "Rec"), ("int", "Int"), ("port", "Port")):
        m = re.search(tag + r":([TF])", flat)
        out[key] = (m.group(1) == "T") if m else None
    # 'Other:' text is split across lines in the PDF ("| Other: PTE" then flags then "62+/C1; ...")
    lines = [clean(l) for l in txt.split("\n") if clean(l)]
    other_parts = []
    grab = False
    for l in lines:
        if "Other:" in l:
            other_parts.append(l.split("Other:", 1)[1])
            grab = True
            continue
        if grab and not re.match(r"PS:[TF]", l):
            other_parts.append(l)
    other = clean(" ".join(other_parts)).strip("| ")
    out["other"] = other or None
    return out


INTAKE_RE = re.compile(
    r"^(?P<deadline>.*?)\s*"
    r"(?P<intake>(?:Fall / Sem 1|Sem 1 \(Feb/Mar\)|Fall & Spring|Winter & Summer|October Entry|August Intake|Spring / Sem 2|Rolling))\s*"
    r"\((?P<apptype>[^)]*)\)\s*Fokus:\s*(?P<focus>.*)$"
)


def parse_col4(txt):
    flat = clean(txt)
    m = INTAKE_RE.match(flat)
    if not m:
        raise ValueError(f"col4 unparsable: {flat!r}")
    d = m.groupdict()
    d["deadline"] = clean(d["deadline"]).replace("- ", "-")
    d["intake"] = clean(d["intake"])
    d["apptype"] = clean(d["apptype"])
    d["focus"] = clean(d["focus"])
    return d


def parse_col5(txt):
    lines = [clean(l) for l in txt.split("\n") if clean(l)]
    flat = clean(txt)
    m = re.search(r"\b(Yes|Limited|Very Limited|No)\s*\(([^)]*)\)\s*Max:\s*(.*)$", flat)
    if not m:
        raise ValueError(f"col5 unparsable: {flat!r}")
    avail, stype, mx = m.groups()
    name = flat[: m.start()].strip()
    return {"sch_name": name, "sch_avail": avail, "sch_type": clean(stype), "sch_max": clean(mx)}


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/top300/raw_cells.json")
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/top300/parsed.json")
    rows = json.load(open(src))
    parsed = []
    errors = []
    for r in rows:
        c = r["cells"]
        try:
            rec = {"page": r["page"]}
            rec.update(parse_col0(c[0]))
            rec.update(parse_col1(c[1]))
            rec.update(parse_col2(c[2]))
            rec.update(parse_col3(c[3]))
            rec.update(parse_col4(c[4]))
            rec.update(parse_col5(c[5]))
            parsed.append(rec)
        except Exception as e:  # noqa: BLE001
            errors.append((c[0].split("\n")[0], str(e)))

    out.write_text(json.dumps(parsed, ensure_ascii=False, indent=1))
    print(f"parsed {len(parsed)} rows, {len(errors)} errors -> {out}")
    for e in errors:
        print("ERR", e)


if __name__ == "__main__":
    main()
