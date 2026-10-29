#!/usr/bin/env python3
"""Build the channel's EN→UZ/RU term list from the academic dictionary PDF.

The source is the 606-page *ScholarBridgeAI — Ma'lumotlar bazasi va akademik
atamalar katta tarjima lug'ati (kengaytirilgan nashr)* (12 467 units). The PDF
draws every table row with two thin rules, so column edges and row bands come
straight from the vector geometry instead of being guessed from whitespace.

Two stages, in one file:

  1. **read** — per page: collect the row rules (`rects`), split the page into
     columns and row bands, and dump every cell with the table's header text.
  2. **clean** — keep one record per English headword, cut each gloss down to a
     short phrase, drop cells that merely repeat the English source, and index
     slash alternatives (`Program / Programme` → `programme`) as aliases.

Usage
-----
    python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pdfplumber
    /tmp/venv/bin/python scripts/import/lexicon/extract_pdf.py \\
        --pdf "/path/to/scholarbridgeai_database_tarjima_lugati.pdf" \\
        --out src/lib/channel/lexicon/lexicon.uz.json

The output is committed; regenerating it is only needed when the source
dictionary changes. `--raw` keeps the intermediate dump for inspection.

Why not translate sentences with this file? The dictionary is a *term* list:
9 000+ headwords, 53 requirement phrases and 10 full sentences. It is the
vocabulary the fact reader uses, not a sentence translator — see
`src/lib/channel/templates/lexicon.ts`.
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from multiprocessing import Pool

CYR = re.compile(r"[\u0400-\u04FF]")
LAT = re.compile(r"[A-Za-z]")
SKIP_HEAD = ("bo'lim", "jami", "jadvallar", "yozuvlar", "harf:")


# ---------------------------------------------------------------------------
# Stage 1 — read the tables
# ---------------------------------------------------------------------------
def _grid(page):
    rules, xs = [], set()
    for rect in page.rects:
        if rect["width"] > 500 and rect["height"] > 500:  # page background
            continue
        if rect["height"] < 5 and rect["width"] > 20:  # a row rule
            rules.append(rect["top"])
            xs.add(rect["x0"])
            xs.add(rect["x1"])
    return sorted({round(x, 1) for x in xs}), sorted({round(t, 1) for t in rules})


def _page_rows(page):
    lefts, tops = _grid(page)
    if len(lefts) < 3 or len(tops) < 4:  # a prose page, not a table
        return [], ""
    words = page.extract_words()
    header = " ".join(w["text"] for w in sorted(
        (w for w in words if w["top"] < tops[0] - 1), key=lambda w: (round(w["top"]), w["x0"])
    ))
    cols = lefts[:-1]
    cells = defaultdict(lambda: defaultdict(list))
    for word in words:
        if word["top"] < tops[0] - 1 or word["top"] > tops[-1] + 2:
            continue
        ci = None
        for i, left in enumerate(cols):
            if word["x0"] >= left - 3:
                ci = i
        if ci is None:
            continue
        ri = 0
        for i, top in enumerate(tops):
            if word["top"] >= top - 3:
                ri = i
        cells[ri][ci].append(word["text"])
    rows = []
    for ri in sorted(cells):
        row = [" ".join(cells[ri].get(ci, [])) for ci in range(len(cols))]
        if any(cell.strip() for cell in row):
            rows.append(row)
    return rows, header


def _read_page(args):
    pdf_path, number = args
    import pdfplumber

    with pdfplumber.open(pdf_path) as pdf:
        rows, header = _page_rows(pdf.pages[number])
    return number, header, rows


# ---------------------------------------------------------------------------
# Stage 2 — clean into terms
# ---------------------------------------------------------------------------
def norm(text):
    text = text.replace("\u00ad", "").replace("`", "'").replace("‘", "'").replace("ʻ", "'")
    return re.sub(r"\s+", " ", text).strip(" |")


def untranslated(gloss, en):
    """True when the cell just repeats the English source (`GPA` → `GPA`)."""
    if CYR.search(gloss):
        return False
    mine = [w for w in re.findall(r"[a-z']+", gloss.lower()) if len(w) > 2]
    theirs = set(re.findall(r"[a-z']+", en.lower()))
    if not mine:
        return True
    return sum(1 for w in mine if w in theirs) / len(mine) >= 0.8


def short_gloss(uz):
    """`1) A / B (mas.: …)` → `A / B` — one phrase, no numbered senses."""
    text = re.sub(r"^\d\)\s*", "", uz)
    text = re.split(r"\s*\(", text, maxsplit=1)[0]
    text = re.split(r"\s*;\s*", text, maxsplit=1)[0]
    text = re.split(r"\s+—\s+", text, maxsplit=1)[0]
    text = " / ".join(part.strip() for part in text.split(" / ")[:2])
    text = re.sub(r"^[\"'`‘“]+", "", text)
    text = re.sub(r"[\"'`’”]+$", "", text)
    return norm(text).strip(" .,;:")[:120]


def keys_for(en):
    """The headword plus each slash alternative of a short headword."""
    keys = {en.lower()}
    if len(en.split()) > 6:  # a sentence row, not a headword
        return list(keys)
    for part in re.split(r"\s*/\s*", en):
        part = part.strip().lower()
        if len(part) >= 2 and len(part.split()) <= 4:
            keys.add(part)
    return [k for k in keys if k]


def clean(raw_rows):
    terms, aliases = {}, 0
    for row in raw_rows:
        cells = [norm(c) for c in row["cells"]]
        if len(cells) < 3:
            continue
        en, uz, ru = cells[0], cells[-2], cells[-1]
        if not en or not LAT.search(en) or len(en) > 140:
            continue
        if any(bit in en.lower() for bit in SKIP_HEAD):
            continue
        if not uz or not LAT.search(uz) or untranslated(uz, en):
            continue
        gloss = short_gloss(uz)
        if not gloss or gloss.lower() == en.lower() or untranslated(gloss, en):
            continue
        record = {"en": en, "uz": gloss}
        if CYR.search(ru or ""):
            record["ru"] = norm(ru)[:120]
        for key in keys_for(en):
            if key in terms:
                continue
            terms[key] = record
            if key != en.lower():
                aliases += 1
    return terms, aliases


# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, help="path to the dictionary PDF")
    parser.add_argument("--out", required=True, help="where to write the JSON asset")
    parser.add_argument("--raw", help="optional path for the intermediate JSONL dump")
    parser.add_argument("--pages", type=int, default=606)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    with Pool(args.workers) as pool:
        pages = pool.map(_read_page, [(args.pdf, n) for n in range(args.pages)])

    raw_rows = []
    for number, header, rows in pages:
        for cells in rows:
            raw_rows.append({"page": number, "header": header, "cells": cells})
    if args.raw:
        with open(args.raw, "w", encoding="utf8") as fh:
            for row in raw_rows:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    terms, aliases = clean(raw_rows)
    payload = {
        "meta": {
            "source": "ScholarBridgeAI — Ma'lumotlar bazasi va akademik atamalar katta tarjima lug'ati (kengaytirilgan nashr)",
            "pages": args.pages,
            "rawRows": len(raw_rows),
            "terms": len(terms),
            "aliases": aliases,
            "note": "EN→UZ/RU terminlar, qisqa ma'no. To'liq izoh manba PDFda.",
        },
        "terms": dict(sorted(terms.items())),
    }
    with open(args.out, "w", encoding="utf8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(terms)} terms ({aliases} aliases) from {len(raw_rows)} rows → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
