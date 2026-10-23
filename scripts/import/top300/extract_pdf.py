#!/usr/bin/env python3
"""Extract the Top-300 university registry table from the Supabase master-prompt PDF.

The PDF (sections 3 and 4, pages 8-59) is a 6-column table. pdfplumber's generic
table finder fails because the table has no vertical rules, so we use the known
column boundaries (taken from the horizontal separator rects) and bucket every
word into (row-band, column) cells, then rebuild the text lines per cell.

Output: raw_cells.json  — list of {page, cells: [6 strings]} entries (one per
table row), later parsed into structured data by parse_rows.py.
"""
import json
import logging
import re
import sys
from pathlib import Path

import pdfplumber

logging.getLogger("pdfminer").setLevel(logging.ERROR)

PDF = sys.argv[1] if len(sys.argv) > 1 else "/tmp/arena-coding-uploads/top_300_universities_supabase_prompt.pdf"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/top300/raw_cells.json")
# optional: first/last page (1-based). Defaults cover the original Top-300 PDF (pages 8-59);
# the "13 countries + Top 300" master guide uses 5-79.
FIRST_PAGE = int(sys.argv[3]) if len(sys.argv) > 3 else 8
LAST_PAGE = int(sys.argv[4]) if len(sys.argv) > 4 else 59
OUT.parent.mkdir(parents=True, exist_ok=True)

COL_BOUNDS = [31.5, 164.2, 273.0, 390.0, 585.0, 687.0, 811.5]
NAVY = (0.0588, 0.1608, 0.2588)
# rows start with "#12 Name" (Top 300 registry) or "[South Korea #3] Name" (13-country registry)
ROW_START = re.compile(r"^(#\d+\b|\[[^\]]*#\d+\])")


def col_index(x_center: float):
    for i in range(len(COL_BOUNDS) - 1):
        if COL_BOUNDS[i] <= x_center < COL_BOUNDS[i + 1]:
            return i
    return None


def words_to_lines(words, y_tol=2.0):
    """Group words into text lines by their vertical position."""
    words = sorted(words, key=lambda w: (round(w["top"]), w["x0"]))
    lines = []
    for w in words:
        if lines and abs(lines[-1]["top"] - w["top"]) <= y_tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"top": w["top"], "words": [w]})
    out = []
    for ln in lines:
        ws = sorted(ln["words"], key=lambda w: w["x0"])
        out.append(" ".join(w["text"] for w in ws))
    return out


rows = []
with pdfplumber.open(PDF) as pdf:
    for pno in range(FIRST_PAGE, min(LAST_PAGE, len(pdf.pages)) + 1):
        page = pdf.pages[pno - 1]
        # black horizontal separators (one per column cell, same top) -> row boundaries
        # black rects = row separators; navy rects = bottom edge of a table header
        # (the first data row starts right below it)
        seps = sorted({round(r["top"], 1) for r in page.rects
                       if r["x1"] - r["x0"] < 800 and r.get("non_stroking_color") in ((0.0, 0.0, 0.0), NAVY)})
        if not seps:
            continue
        words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2)
        bands = []
        for i, top in enumerate(seps):
            bottom = seps[i + 1] if i + 1 < len(seps) else page.height
            bands.append((top, bottom))
        for (top, bottom) in bands:
            cells = [[] for _ in range(6)]
            for w in words:
                yc = (w["top"] + w["bottom"]) / 2
                if not (top <= yc < bottom):
                    continue
                xc = (w["x0"] + w["x1"]) / 2
                ci = col_index(xc)
                if ci is None:
                    continue
                cells[ci].append(w)
            texts = ["\n".join(words_to_lines(c)) for c in cells]
            if not ROW_START.match(texts[0].strip()):
                continue  # header band or trailing section text
            rows.append({"page": pno, "cells": texts})

OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
print(f"extracted {len(rows)} table rows -> {OUT}")
