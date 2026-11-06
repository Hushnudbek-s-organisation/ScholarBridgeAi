export interface MarqueeUniversityItem {
  /**
   * Official position in the QS World University Rankings 2026 — the table the
   * catalogue itself was corrected against (`data/qs2026_top1500.csv`,
   * `docs/QS2026_RANK_VERIFICATION_2026-10-23.md`). The badge is rendered from
   * this number; `scripts/check-landing-ranks.ts` fails the build if it ever
   * drifts from that file.
   */
  qsRank: number;
  /** The name exactly as the official QS table spells it (gate lookup key). */
  qsName: string;
  name: string;
  country: string;
  landmark: string;
  url: string;
}

/** Row 1: QS #1–#8, continuously scrolling right. */
export const MARQUEE_ROW_1: MarqueeUniversityItem[] = [
  {
    qsRank: 1,
    qsName: "Massachusetts Institute of Technology (MIT)",
    name: "MIT (Massachusetts Institute of Technology)",
    country: "🇺🇸 USA",
    landmark: "Great Dome, Cambridge MA",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Great_Dome%2C_MIT_-_IMG_8390.JPG",
  },
  {
    qsRank: 2,
    qsName: "Imperial College London",
    name: "Imperial College London",
    country: "🇬🇧 UK",
    landmark: "Queen's Tower, South Kensington",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Queen%27s_Tower%2C_Imperial_College_London.jpg",
  },
  {
    qsRank: 3,
    qsName: "Stanford University",
    name: "Stanford University",
    country: "🇺🇸 USA",
    landmark: "Main Quad, Palo Alto",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Stanford_University_-_Main_Quad_12.JPG",
  },
  {
    qsRank: 4,
    qsName: "University of Oxford",
    name: "University of Oxford",
    country: "🇬🇧 UK",
    landmark: "Radcliffe Camera & Bodleian",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Radcliffe_Camera%2C_Oxford.jpg",
  },
  {
    qsRank: 5,
    qsName: "Harvard University",
    name: "Harvard University",
    country: "🇺🇸 USA",
    landmark: "Harvard Yard, Cambridge MA",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0e/HarvardYard.jpg",
  },
  {
    qsRank: 6,
    qsName: "University of Cambridge",
    name: "University of Cambridge",
    country: "🇬🇧 UK",
    landmark: "King's College Front Court",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Cambridge_-_King%27s_College_-_Front_court.jpg",
  },
  {
    qsRank: 7,
    qsName: "ETH Zurich (Swiss Federal Institute of Technology)",
    name: "ETH Zurich",
    country: "🇨🇭 Switzerland",
    landmark: "ETH Hauptgebäude & Polyterrasse",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7c/ETH_Z%C3%BCrich_2015.jpg",
  },
  {
    qsRank: 8,
    qsName: "National University of Singapore (NUS)",
    name: "National University of Singapore (NUS)",
    country: "🇸🇬 Singapore",
    landmark: "University Hall, Kent Ridge",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1f/University_Hall%2C_National_University_of_Singapore_-_20070125.jpg",
  },
];

/** Row 2: QS #9–#21, continuously scrolling left. */
export const MARQUEE_ROW_2: MarqueeUniversityItem[] = [
  {
    qsRank: 9,
    qsName: "UCL (University College London)",
    name: "UCL (University College London)",
    country: "🇬🇧 UK",
    landmark: "Wilkins Portico Building, London",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/14/UCL_Portico_Building.jpg",
  },
  {
    qsRank: 12,
    qsName: "Nanyang Technological University, Singapore (NTU Singapore)",
    name: "NTU Singapore",
    country: "🇸🇬 Singapore",
    landmark: "The Hive Learning Hub",
    url: "https://upload.wikimedia.org/wikipedia/commons/9/90/The_Hive%2C_NTU_%28I%29.jpg",
  },
  {
    qsRank: 13,
    qsName: "University of Chicago",
    name: "University of Chicago",
    country: "🇺🇸 USA",
    landmark: "Harper Memorial Library",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/University_of_Chicago%2C_Harper_Library.jpg",
  },
  {
    qsRank: 16,
    qsName: "Cornell University",
    name: "Cornell University",
    country: "🇺🇸 USA",
    landmark: "McGraw Tower & Uris Library",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Cornell_University_-_McGraw_Tower_%28Uris_Library%29.jpg",
  },
  {
    qsRank: 17,
    qsName: "Tsinghua University",
    name: "Tsinghua University",
    country: "🇨🇳 China",
    landmark: "Old Gate of Tsinghua, Beijing",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d5/TsinghuaUniversityGate.JPG",
  },
  {
    qsRank: 17,
    qsName: "University of California, Berkeley (UCB)",
    name: "UC Berkeley",
    country: "🇺🇸 USA",
    landmark: "Sather Gate & Campanile",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Sather_Gate_at_University_of_California%2C_Berkeley%2C_California_LCCN2013633500_%28edited%29.jpg",
  },
  {
    qsRank: 19,
    qsName: "The University of Melbourne",
    name: "The University of Melbourne",
    country: "🇦🇺 Australia",
    landmark: "Old Quad Colonnade",
    url: "https://upload.wikimedia.org/wikipedia/commons/5/53/Old_Quad_colonnade_University_of_Melbourne_2018.jpg",
  },
  {
    qsRank: 21,
    qsName: "Yale University",
    name: "Yale University",
    country: "🇺🇸 USA",
    landmark: "Sterling Memorial Library Walk",
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Yale_University_Library_Walk.jpg",
  },
];

/** Row 3: QS #22–#38, continuously scrolling right. */
export const MARQUEE_ROW_3: MarqueeUniversityItem[] = [
  {
    qsRank: 22,
    qsName: "École Polytechnique Fédérale de Lausanne",
    name: "EPFL Lausanne",
    country: "🇨🇭 Switzerland",
    landmark: "Rolex Learning Center",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ec/EPFL_Rolex_Learning_Center.jpg",
  },
  {
    qsRank: 22,
    qsName: "Technical University of Munich",
    name: "Technical University of Munich (TUM)",
    country: "🇩🇪 Germany",
    landmark: "TUM Main Campus Munich",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Technische_Universit%C3%A4t_M%C3%BCnchen.jpg",
  },
  {
    qsRank: 25,
    qsName: "Princeton University",
    name: "Princeton University",
    country: "🇺🇸 USA",
    landmark: "Historic Nassau Hall",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/04/Nassau_Hall_Princeton.JPG",
  },
  {
    qsRank: 25,
    qsName: "The University of Sydney",
    name: "The University of Sydney",
    country: "🇦🇺 Australia",
    landmark: "Main Sandstone Quadrangle",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ee/University_of_Sydney%27s_Main_Quadrangle.jpg",
  },
  {
    qsRank: 29,
    qsName: "University of Toronto",
    name: "University of Toronto",
    country: "🇨🇦 Canada",
    landmark: "University College Quad",
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c8/University_College%2C_University_of_Toronto%2C_Canada.jpg",
  },
  {
    qsRank: 36,
    qsName: "The University of Tokyo",
    name: "The University of Tokyo (UTokyo)",
    country: "🇯🇵 Japan",
    landmark: "Yasuda Auditorium, Hongo",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/de/Yasuda_Auditorium.jpg",
  },
  {
    qsRank: 38,
    qsName: "Columbia University",
    name: "Columbia University",
    country: "🇺🇸 USA",
    landmark: "Low Memorial Library, NYC",
    url: "https://upload.wikimedia.org/wikipedia/commons/a/af/Low_Memorial_Library_Columbia_University_NYC.jpg",
  },
  {
    // KAIST has no position in the QS 2026 edition (it was removed from the
    // table), so the card states SNU's own rank instead of a range covering a
    // university the edition does not rank.
    qsRank: 38,
    qsName: "Seoul National University",
    name: "Seoul National University (SNU)",
    country: "🇰🇷 South Korea",
    landmark: "Main Gate, Gwanak campus",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/da/SNU_gate.jpg",
  },
];
