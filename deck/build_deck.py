"""Build the ScholarBridgeAI pitch deck (.pptx)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pptx import Presentation
from pptx.util import Inches

import slides_a as A
import slides_b as B
from deck_lib import SH, SW

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "ScholarBridgeAI_Pitch_Deck_UZ.pptx")


def main():
    prs = Presentation()
    prs.slide_width = Inches(SW)
    prs.slide_height = Inches(SH)

    A.cover(prs)
    A.problem(prs)
    A.solution(prs)
    A.journey(prs)
    A.catalogue(prs)
    A.trust(prs)
    A.ai(prs)
    A.telegram(prs)
    B.business(prs)
    B.market(prs)
    B.traction(prs)
    B.competition(prs)
    B.gtm(prs)
    B.roadmap(prs)
    B.whyus(prs)
    B.ask(prs)

    prs.core_properties.title = "ScholarBridgeAI — Pitch Deck 2026"
    prs.core_properties.author = "ScholarBridgeAI"
    prs.core_properties.subject = ("AI asosidagi chet elda ta'lim platformasi — "
                                   "O'zbekiston va Markaziy Osiyo")
    prs.core_properties.keywords = "pitch deck, edtech, AI, Uzbekistan"

    prs.save(OUT)
    print("saved", OUT, os.path.getsize(OUT) // 1024, "KB",
          len(prs.slides.__iter__.__self__._sldIdLst), "slides")


if __name__ == "__main__":
    main()
