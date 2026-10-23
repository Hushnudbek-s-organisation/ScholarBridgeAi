#!/usr/bin/env python3
"""Extract the "Top Universities — 11 Programs/Uni + QS Ranking + Campus Images"
registry (4-column table) from the master PDF.

Sections of the PDF (113 pages):
  4-BO'LIM  pages   5-37 : 13 countries x Top-10  -> 130 rows, cells start "[Country #N]"
  5-BO'LIM  pages  38-87 : Global Top 1-200       -> 200 rows, cells start "#N"
  6-BO'LIM  pages  88-113: Global Top 201-300     -> 100 rows, cells start "#N"

The table has no vertical rules, so column boundaries come from the horizontal
separator rects (each cell of a row has its own rect at the same top):

  col0 31.5-203.2   University / QS Global Rank / Flag / Country (City) / Type,
                    founded / PSW / Sayt / Img (campus image file)
  col1 203.2-366.7  Tuition / Living / Housing / App fee + Acc / GPA / SAT /
                    IELTS (TOEFL / DET) / PS:T Rec:T Int:T Port:T
  col2 366.7-632.2  11 programs (6 Bachelor + 5 Master)
  col3 632.2-811.5  Muddat / Intake / Fokus / Grant / Max Qoplama / Maxsus

Usage: extract_pdf_11progs.py <pdf> raw_cells.json [first_page] [last_page]
"""
import json
import logging
import re
import sys
from pathlib import Path

import pdfplumber

logging.getLogger("pdfminer").setLevel(logging.ERROR)

PDF = sys.argv[1]
OUT = Path(sys.argv[2])
FIRST_PAGE = int(sys.argv[3]) if len(sys.argv) > 3 else 5
LAST_PAGE = int(sys.argv[4]) if len(sys.argv) > 4 else 113
OUT.parent.mkdir(parents=True, exist_ok=True)

COL_BOUNDS = [31.5, 203.2, 366.7, 632.2, 811.5]
NAVY = (0.0588, 0.1608, 0.2588)
ROW_START = re.compile(r"^(#\d+\b|\[[^\]]*#\d+\])")


def col_index(x_center: float):
    for i in range(len(COL_BOUNDS) - 1):
        if COL_BOUNDS[i] <= x_center < COL_BOUNDS[i + 1]:
            return i
    return None


def words_to_lines(words, y_tol=2.0):
    words = sorted(words, key=lambda w: (round(w["top"]), w["x0"]))
    lines = []
    for w in words:
        if lines and abs(lines[-1]["top"] - w["top"]) <= y_tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"top": w["top"], "words": [w]})
    return [" ".join(x["text"] for x in sorted(ln["words"], key=lambda w: w["x0"])) for ln in lines]


rows = []
with pdfplumber.open(PDF) as pdf:
    for pno in range(FIRST_PAGE, min(LAST_PAGE, len(pdf.pages)) + 1):
        page = pdf.pages[pno - 1]
        seps = sorted({round(r["top"], 1) for r in page.rects
                       if r["x1"] - r["x0"] < 800 and r.get("non_stroking_color") in ((0.0, 0.0, 0.0), NAVY)})
        if not seps:
            continue
        words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5, y_tolerance=2)
        bands = [(seps[i], seps[i + 1] if i + 1 < len(seps) else page.height) for i in range(len(seps))]
        for (top, bottom) in bands:
            cells = [[] for _ in range(4)]
            for w in words:
                yc = (w["top"] + w["bottom"]) / 2
                if not (top <= yc < bottom):
                    continue
                ci = col_index((w["x0"] + w["x1"]) / 2)
                if ci is None:
                    continue
                cells[ci].append(w)
            texts = ["\n".join(words_to_lines(c)) for c in cells]
            if not ROW_START.match(texts[0].strip()):
                continue
            rows.append({"page": pno, "cells": texts})

OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
print(f"extracted {len(rows)} table rows -> {OUT}")
