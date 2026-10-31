/**
 * `eligible_majors` → Uzbek, from a hand-written list — not from the dictionary.
 *
 * Why not `translateFragment()` (the PDF dictionary)? Because a dictionary gloss
 * is written for a translator, not for a post: it carries every sense separated
 * by slashes. Run over real data it produced lines like
 * `Kommunikatsiya / aloqa va media fanlari va Jurnalistika / Kommunikatsiya`
 * and, worse, `Clinical Tibbiyot` — half English, exactly what the channel must
 * never print (docs/CHANNEL.md §4b-3). The dictionary is the right tool for a
 * requirement list it has heard of; a field name needs one reviewed word.
 *
 * Rules:
 *  - a known name becomes the one Uzbek phrase an applicant would say;
 *  - `All Majors` / `All fields` / `Any discipline` becomes `barcha yo'nalishlar`;
 *  - anything else is **dropped**. Many rows store a whole English sentence in
 *    this column ("Most full-time undergraduate degrees at Monash campuses…");
 *    printing it would be English, translating it word by word would be
 *    invented, so the bullet simply does not appear. Silence beats a guess.
 *
 * Every entry is admin-editable indirectly: the same words are in the bundled
 * dictionary, and `translation_lexicon` rows win over it elsewhere. This table is
 * the *post* vocabulary, so it lives in code, is reviewed in one place, and is
 * covered by `scripts/check-channel.ts`.
 */

/** The one phrase for "the scholarship is not restricted by field". */
export const ANY_FIELD_UZ = "barcha yo'nalishlar";

/** Field names → the phrase a post prints. Lower-case keys. */
const FIELD_UZ: Record<string, string> = {
  // ── broad groups ───────────────────────────────────────────────────────────
  "natural sciences": "tabiiy fanlar",
  "natural science": "tabiiy fanlar",
  "exact sciences": "aniq fanlar",
  "humanities": "gumanitar fanlar",
  "arts and humanities": "san'at va gumanitar fanlar",
  "human and social sciences": "gumanitar va ijtimoiy fanlar",
  "social sciences": "ijtimoiy fanlar",
  "social studies": "ijtimoiy tadqiqotlar",
  "social science": "ijtimoiy fanlar",
  "science and technology": "fan va texnologiya",
  "engineering and technology": "muhandislik va texnologiya",
  "engineering sciences": "muhandislik fanlari",
  "life sciences": "hayot haqidagi fanlar",
  "biosciences": "biotexnologiya fanlari",
  "stem": "STEM (fan, texnologiya, muhandislik, matematika)",
  "stem education": "STEM ta'limi",
  "high technology": "yuqori texnologiyalar",
  "materials": "materialshunoslik",
  "materials science": "materialshunoslik",

  // ── exact and natural sciences ─────────────────────────────────────────────
  "physics": "fizika",
  "theoretical physics": "nazariy fizika",
  "geophysics": "geofizika",
  "biophysics": "biofizika",
  "chemistry": "kimyo",
  "biochemistry": "biokimyo",
  "chemical biology": "kimyoviy biologiya",
  "mathematics": "matematika",
  "applied mathematics": "amaliy matematika",
  "statistics": "statistika",
  "biology": "biologiya",
  "microbiology": "mikrobiologiya",
  "molecular biology": "molekulyar biologiya",
  "human evolutionary biology": "inson evolyutsion biologiyasi",
  "biomedical sciences": "biomedikal fanlar",
  "earth sciences": "yer haqidagi fanlar",
  "environmental sciences": "atrof-muhit fanlari",
  "ecology": "ekologiya",
  "geology": "geologiya",
  "geography": "geografiya",
  "astronomy": "astronomiya",
  "astrophysics": "astrofizika",
  "neuroscience": "neyrobiologiya",

  // ── engineering and technology ─────────────────────────────────────────────
  "engineering": "muhandislik",
  "mechanical engineering": "mashinasozlik muhandisligi",
  "mechanical": "mashinasozlik",
  "electrical engineering": "elektrotexnika muhandisligi",
  "electrical": "elektrotexnika",
  "electronic engineering": "elektronika muhandisligi",
  "electronics": "elektronika",
  "electronic information": "elektron axborot texnologiyalari",
  "civil engineering": "qurilish muhandisligi",
  "civil": "qurilish muhandisligi",
  "chemical engineering": "kimyoviy muhandislik",
  "chemical and materials engineering": "kimyoviy va materiallar muhandisligi",
  "aerospace engineering": "aerokosmik muhandislik",
  "oil and gas engineering": "neft va gaz muhandisligi",
  "automotive engineering": "avtomobilsozlik muhandisligi",
  "industrial engineering": "sanoat muhandisligi",
  "urbanism and civil engineering": "shaharsozlik va qurilish muhandisligi",
  "computer science": "kompyuter fanlari",
  "computer and data science": "kompyuter va ma'lumotlar haqidagi fan",
  "informatics": "informatika",
  "information technologies": "axborot texnologiyalari",
  "information technology": "axborot texnologiyalari",
  "information systems": "axborot tizimlari",
  "data science": "ma'lumotlar haqidagi fan",
  "cyber security": "kiberxavfsizlik",
  "cybersecurity": "kiberxavfsizlik",
  "artificial intelligence": "sun'iy intellekt",
  "ai and robotics": "sun'iy intellekt va robototexnika",
  "robotics": "robototexnika",
  "microelectronics": "mikroelektronika",
  "semiconductor": "yarimo'tkazgichlar",
  "telecommunications": "telekommunikatsiya",
  "energy": "energetika",
  "renewable energy": "qayta tiklanuvchi energiya",
  "architecture": "arxitektura",
  "design": "dizayn",
  "technology policy and management": "texnologiya siyosati va menejmenti",
  "public management and policy analysis": "davlat boshqaruvi va siyosat tahlili",

  // ── economics, business, law ───────────────────────────────────────────────
  "economics": "iqtisodiyot",
  "economics and business": "iqtisodiyot va biznes",
  "economics and data science": "iqtisodiyot va ma'lumotlar haqidagi fan",
  "economics and econometrics": "iqtisodiyot va ekonometrika",
  "business": "biznes",
  "business and management": "biznes va menejment",
  "management": "menejment",
  "management science": "menejment fanlari",
  "finance": "moliya",
  "accounting": "buxgalteriya hisobi",
  "marketing": "marketing",
  "public policy": "davlat siyosati",
  "public and economic policy": "davlat va iqtisodiy siyosat",
  "public administration": "davlat boshqaruvi",
  "international relations": "xalqaro munosabatlar",
  "international studies": "xalqaro tadqiqotlar",
  "law": "huquqshunoslik",
  "international law": "xalqaro huquq",
  "security, intelligence and criminology": "xavfsizlik, razvedka va kriminologiya",

  // ── medicine and health ────────────────────────────────────────────────────
  "medicine": "tibbiyot",
  "doctor of medicine": "tibbiyot doktori",
  "medicine and health": "tibbiyot va sog'liqni saqlash",
  "medicine and health sciences": "tibbiyot va sog'liqni saqlash fanlari",
  "clinical medicine and public health": "klinik tibbiyot va jamoat salomatligi",
  "public health": "jamoat salomatligi",
  "pharmacy": "farmatsiya",
  "pharmaceutical sciences": "farmatsevtika fanlari",
  "nursing": "hamshiralik ishi",
  "dentistry": "stomatologiya",
  "veterinary medicine": "veterinariya",
  "psychology": "psixologiya",
  "psychological sciences": "psixologiya fanlari",
  "sports sciences": "sport fanlari",

  // ── humanities and arts ────────────────────────────────────────────────────
  "history": "tarix",
  "philosophy": "falsafa",
  "sociology": "sotsiologiya",
  "anthropology": "antropologiya",
  "political science": "siyosatshunoslik",
  "linguistics": "tilshunoslik",
  "journalism": "jurnalistika",
  "communications and journalism": "kommunikatsiya va jurnalistika",
  "media studies": "media tadqiqotlari",
  "literature": "adabiyot",
  "education": "pedagogika",
  "education and psychology": "pedagogika va psixologiya",
  "pedagogy": "pedagogika",
  "arts": "san'at",
  "fine arts": "tasviriy san'at",
  "music": "musiqa",
  "theatre": "teatr san'ati",
  "development studies": "taraqqiyot tadqiqotlari",
  "international development": "xalqaro taraqqiyot",
  "agriculture": "qishloq xo'jaligi",
  "agribusiness": "agrobiznes",
  "tourism": "turizm",
  "hospitality management": "mehmondo'stlik menejmenti",
  "russian language": "rus tili",
  "russian language and culture": "rus tili va madaniyati",
  "chinese language": "xitoy tili",
  "chinese language study": "xitoy tilini o'rganish",
  "chinese philosophy": "xitoy falsafasi",
  "international chinese language education": "xitoy tilini o'qitish",
  "mba": "MBA",
  "bcl": "BCL",
};

/** Values that mean "no field restriction". */
const ANY_FIELD = /^(?:all|any)\b(?:\s+(?:majors?|fields?|disciplines?|areas?|subjects?|programmes?|programs?))?.*$/i;

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => String(v).trim()).filter(Boolean) : [];
  } catch {
    return String(raw)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'([]+|[\s"')].]+$/g, "")
    .trim();
}

/** One stored name → Uzbek, or null when it is not a name we can say. */
function fieldUz(name: string): string | null {
  const key = normalise(name);
  if (!key) return null;
  if (ANY_FIELD.test(key)) return ANY_FIELD_UZ;
  const direct = FIELD_UZ[key];
  if (direct) return direct;
  // "Economics, business and management" → translate the parts, keep the shape.
  if (key.includes(",")) {
    const parts = key.split(",").map((p) => p.trim()).filter(Boolean);
    const mapped = parts.map((p) => fieldUz(p));
    if (mapped.every((p): p is string => p !== null)) return mapped.join(", ");
  }
  const andParts = key.split(/\s+and\s+/);
  if (andParts.length === 2) {
    const mapped = andParts.map((p) => fieldUz(p));
    if (mapped.every((p): p is string => p !== null)) return mapped.join(" va ");
  }
  return null;
}

/**
 * `["Computer Science","Physics"]` → `kompyuter fanlari, fizika`.
 *
 * Returns null when nothing survives — the caller drops the line rather than
 * printing a stored English sentence.
 */
export function majorListUz(raw: string | null | undefined, max = 3): string | null {
  const list = parseList(raw);
  if (!list.length) return null;
  if (list.some((m) => ANY_FIELD.test(m.trim()))) return ANY_FIELD_UZ;
  const mapped: string[] = [];
  for (const name of list) {
    // A sentence in this column is prose, not a field name.
    if (name.length > 60) continue;
    const uz = fieldUz(name);
    if (uz && !mapped.includes(uz)) mapped.push(uz);
  }
  if (!mapped.length) return null;
  const shown = mapped.slice(0, max);
  const suffix = mapped.length > shown.length ? " va boshqalar" : "";
  return shown.join(", ") + suffix;
}

/** Exposed for the checks: how many names the curated list knows. */
export function fieldVocabularySize(): number {
  return Object.keys(FIELD_UZ).length;
}
