/**
 * Poll deck (Uzbek Latin).
 *
 * Eight poll types rotate: preference, multi-answer, self-assessment,
 * this-or-that, struggle, stage, feedback and a data quiz. Every poll is
 * anonymous (channel polls always are) and the publisher only ever reads
 * `stopPoll` aggregates, so no individual vote is stored.
 *
 * Limits are Telegram's: question ≤ 300 chars, option ≤ 100, 2–10 options,
 * explanation ≤ 200. `validatePoll()` is asserted over the whole deck.
 * Proofread list: docs/CHANNEL.md.
 */

export type PollType = "pref" | "multi" | "self_assess" | "this_or_that" | "struggle" | "stage" | "feedback" | "quiz_data";

export const POLL_TYPES: readonly PollType[] = [
  "pref",
  "multi",
  "self_assess",
  "this_or_that",
  "struggle",
  "stage",
  "feedback",
  "quiz_data",
] as const;

export interface PollOption {
  /** Stable key — this is what preferences are learned from. */
  key: string;
  text: string;
}

export interface PollSpec {
  key: string;
  type: PollType;
  /** Preference topic this poll informs, e.g. "country:canada". */
  topic: string;
  question: string;
  options: PollOption[];
  multiple?: boolean;
  /** quiz_data only — 0-based index into options. */
  correctIndex?: number;
  explanation?: string;
}

export const POLL_COOLDOWN_DAYS = 28;

export const POLL_LIMITS = {
  questionMax: 300,
  optionMax: 100,
  optionsMin: 2,
  optionsMax: 10,
  explanationMax: 200,
} as const;

/** Every rule Telegram enforces, so a bad entry fails the test, not the send. */
export function validatePoll(spec: PollSpec): string[] {
  const problems: string[] = [];
  if (!spec.key.trim()) problems.push("empty key");
  if (!spec.question.trim()) problems.push("empty question");
  if (spec.question.length > POLL_LIMITS.questionMax) problems.push(`question longer than ${POLL_LIMITS.questionMax}`);
  if (spec.options.length < POLL_LIMITS.optionsMin) problems.push("fewer than 2 options");
  if (spec.options.length > POLL_LIMITS.optionsMax) problems.push("more than 10 options");
  const seen = new Set<string>();
  for (const opt of spec.options) {
    if (!opt.text.trim()) problems.push(`empty option text (${opt.key})`);
    if (opt.text.length > POLL_LIMITS.optionMax) problems.push(`option longer than ${POLL_LIMITS.optionMax} (${opt.key})`);
    if (seen.has(opt.key)) problems.push(`duplicate option key ${opt.key}`);
    seen.add(opt.key);
  }
  if (spec.type === "quiz_data") {
    if (typeof spec.correctIndex !== "number" || !Number.isInteger(spec.correctIndex) || spec.correctIndex < 0 || spec.correctIndex >= spec.options.length) {
      problems.push("quiz needs a valid correctIndex");
    }
    if (!spec.explanation?.trim()) problems.push("quiz needs an explanation");
    else if (spec.explanation.length > POLL_LIMITS.explanationMax) problems.push(`explanation longer than ${POLL_LIMITS.explanationMax}`);
  } else if (spec.correctIndex !== undefined) {
    problems.push("only quiz_data polls may set correctIndex");
  }
  if (spec.multiple && spec.type !== "multi") problems.push("only multi polls may allow several answers");
  return problems;
}

export const POLL_DECK: readonly PollSpec[] = [
  // --- pref: which content the audience wants next -------------------------
  {
    key: "pref_country_1",
    type: "pref",
    topic: "country:mixed",
    question: "Keyingi postlar qaysi davlat haqida bo'lsin?",
    options: [
      { key: "canada", text: "Kanada" },
      { key: "germany", text: "Germaniya" },
      { key: "usa", text: "AQSh" },
      { key: "south_korea", text: "Janubiy Koreya" },
    ],
  },
  {
    key: "pref_field_1",
    type: "pref",
    topic: "field:mixed",
    question: "Qaysi yo'nalish bo'yicha imkoniyatlar kerak?",
    options: [
      { key: "engineering", text: "IT va injiniring" },
      { key: "medicine", text: "Tibbiyot va biologiya" },
      { key: "business", text: "Biznes va iqtisod" },
      { key: "social", text: "Ijtimoiy fanlar" },
    ],
  },
  {
    key: "pref_degree_1",
    type: "pref",
    topic: "degree:mixed",
    question: "Qaysi daraja uchun ko'proq e'lon kerak?",
    options: [
      { key: "bachelor", text: "Bakalavr" },
      { key: "master", text: "Magistratura" },
      { key: "phd", text: "Doktorantura (PhD)" },
    ],
  },
  {
    key: "pref_region_1",
    type: "pref",
    topic: "region:mixed",
    question: "Qaysi mintaqa sizga qiziqroq?",
    options: [
      { key: "europe", text: "Yevropa" },
      { key: "north_america", text: "Shimoliy Amerika" },
      { key: "asia", text: "Osiyo" },
      { key: "middle_east", text: "Yaqin Sharq" },
    ],
  },
  {
    key: "pref_funding_1",
    type: "pref",
    topic: "funding:mixed",
    question: "Moliyalashtirish turi muhimmi?",
    options: [
      { key: "full", text: "Faqat to'liq moliyalashtirish" },
      { key: "partial_ok", text: "Qisman bo'lsa ham bo'ladi" },
      { key: "stipend", text: "Stipendiya muhimroq" },
    ],
  },

  // --- multi: several answers allowed --------------------------------------
  {
    key: "multi_topic_1",
    type: "multi",
    topic: "content:mixed",
    question: "Qaysi mavzuda ko'proq post ko'rishni xohlaysiz?",
    multiple: true,
    options: [
      { key: "deadlines", text: "Muddatlar va eslatmalar" },
      { key: "tips", text: "Maslahatlar" },
      { key: "grants", text: "Grant va stipendiyalar" },
      { key: "universities", text: "Universitetlar haqida" },
      { key: "visa", text: "Viza va hujjatlar" },
    ],
  },
  {
    key: "multi_docs_1",
    type: "multi",
    topic: "docs:mixed",
    question: "Qaysi hujjatda yordam kerak?",
    multiple: true,
    options: [
      { key: "transcript", text: "Transkript" },
      { key: "motivation", text: "Motivatsion xat" },
      { key: "cv", text: "Rezyume" },
      { key: "recommendation", text: "Tavsiyanoma" },
    ],
  },
  {
    key: "multi_language_1",
    type: "multi",
    topic: "language:mixed",
    question: "Qaysi tilda imtihon topshirishni rejalashtiryapsiz?",
    multiple: true,
    options: [
      { key: "ielts", text: "IELTS" },
      { key: "toefl", text: "TOEFL" },
      { key: "duolingo", text: "Duolingo English Test" },
      { key: "none", text: "Hali qaror qilmadim" },
    ],
  },

  // --- self_assess: the reader rates themselves ----------------------------
  {
    key: "self_english_1",
    type: "self_assess",
    topic: "level:english",
    question: "Ingliz tili darajangizni qanday baholaysiz?",
    options: [
      { key: "a2", text: "A2 — boshlang'ich" },
      { key: "b1", text: "B1 — o'rta" },
      { key: "b2", text: "B2 — o'rtadan yuqori" },
      { key: "c1", text: "C1 — yuqori" },
    ],
  },
  {
    key: "self_ready_1",
    type: "self_assess",
    topic: "level:readiness",
    question: "Ariza topshirishga qanchalik tayyorsiz?",
    options: [
      { key: "not_started", text: "Hali boshlaganim yo'q" },
      { key: "documents", text: "Hujjat yig'yapman" },
      { key: "ready_to_send", text: "Yuborishga tayyorman" },
    ],
  },
  {
    key: "self_budget_1",
    type: "self_assess",
    topic: "budget:level",
    question: "Yillik byudjetingiz qanday?",
    options: [
      { key: "under_2k", text: "2 000 USD gacha" },
      { key: "2k_5k", text: "2 000–5 000 USD" },
      { key: "5k_10k", text: "5 000–10 000 USD" },
      { key: "over_10k", text: "10 000 USD dan ko'p" },
      { key: "need_full", text: "Faqat to'liq grant" },
    ],
  },

  // --- this_or_that: quick preference signal -------------------------------
  {
    key: "tt_city_1",
    type: "this_or_that",
    topic: "pref:city",
    question: "Sizga qaysi muhit yaqinroq?",
    options: [
      { key: "big_city", text: "Katta shahar" },
      { key: "small_city", text: "Kichik shahar" },
    ],
  },
  {
    key: "tt_funding_1",
    type: "this_or_that",
    topic: "pref:funding_style",
    question: "Qaysi biri muhimroq?",
    options: [
      { key: "tuition", text: "Kontrakt to'liq qoplanishi" },
      { key: "stipend", text: "Oylik stipendiya" },
    ],
  },
  {
    key: "tt_timeline_1",
    type: "this_or_that",
    topic: "pref:timeline",
    question: "Qaysi yo'l sizga mos?",
    options: [
      { key: "fast", text: "Tezroq boshlash" },
      { key: "planned", text: "Bir yil tayyorgarlik" },
    ],
  },
  {
    key: "tt_country_1",
    type: "this_or_that",
    topic: "pref:region_style",
    question: "Qaysi biri qiziqroq?",
    options: [
      { key: "europe", text: "Yevropa" },
      { key: "asia", text: "Osiyo" },
    ],
  },

  // --- struggle: what is actually hard -------------------------------------
  {
    key: "struggle_main_1",
    type: "struggle",
    topic: "struggle:mixed",
    question: "Ariza jarayonida eng qiyin narsa nima?",
    options: [
      { key: "documents", text: "Hujjatlarni yig'ish" },
      { key: "motivation", text: "Motivatsion xat" },
      { key: "language", text: "Til imtihoni" },
      { key: "deadlines", text: "Muddatlarni kuzatish" },
      { key: "recommendation", text: "Tavsiyanoma" },
    ],
  },
  {
    key: "struggle_deadline_1",
    type: "struggle",
    topic: "struggle:deadline",
    question: "Muddatni o'tkazib yuborishning asosiy sababi nima bo'ladi?",
    options: [
      { key: "forgot", text: "Eslatma yo'qligi" },
      { key: "documents_late", text: "Hujjat kechikishi" },
      { key: "site_hard", text: "Saytda topish qiyinligi" },
      { key: "money", text: "To'lov masalasi" },
    ],
  },
  {
    key: "struggle_info_1",
    type: "struggle",
    topic: "struggle:trust",
    question: "E'lon haqida qaysi ma'lumot yetishmaydi?",
    options: [
      { key: "requirements", text: "Talablar" },
      { key: "coverage", text: "Nima qoplanadi" },
      { key: "process", text: "Ariza jarayoni" },
      { key: "timeline", text: "Natija qachon chiqadi" },
    ],
  },

  // --- stage: where the audience is ---------------------------------------
  {
    key: "stage_audience_1",
    type: "stage",
    topic: "stage:audience",
    question: "Hozir qaysi bosqichdasiz?",
    options: [
      { key: "school", text: "Maktabda (9–11 sinf)" },
      { key: "bachelor", text: "Bakalavrda o'qiyman" },
      { key: "graduated", text: "Bitirganman, magistraturaga tayyorgarlik" },
      { key: "working", text: "Ishlayapman" },
    ],
  },
  {
    key: "stage_plan_1",
    type: "stage",
    topic: "stage:plan",
    question: "Qachon o'qishni boshlashni rejalashtiryapsiz?",
    options: [
      { key: "this_year", text: "Shu yil" },
      { key: "next_year", text: "Keyingi yil" },
      { key: "later", text: "Ikki yildan keyin" },
      { key: "unsure", text: "Hali aniq emas" },
    ],
  },

  // --- feedback: how the channel is doing ---------------------------------
  {
    key: "feedback_useful_1",
    type: "feedback",
    topic: "feedback:usefulness",
    question: "Postlar foydalimi?",
    options: [
      { key: "useful", text: "Ha, foydali" },
      { key: "more_deadlines", text: "Ko'proq muddat kerak" },
      { key: "more_tips", text: "Ko'proq maslahat kerak" },
      { key: "less", text: "Kamroq post kerak" },
    ],
  },
  {
    key: "feedback_format_1",
    type: "feedback",
    topic: "feedback:format",
    question: "Qaysi format o'qishga qulay?",
    options: [
      { key: "short", text: "Qisqa post" },
      { key: "detailed", text: "Batafsil post" },
      { key: "lists", text: "Ro'yxat ko'rinishida" },
    ],
  },

  // --- quiz_data: a quiz about the data we publish -------------------------
  {
    key: "quiz_deadline_passed_1",
    type: "quiz_data",
    topic: "quiz:deadline",
    question: "Ariza muddati o'tib ketgan bo'lsa, ariza odatda qabul qilinadimi?",
    options: [
      { key: "yes", text: "Ha, har doim" },
      { key: "no", text: "Yo'q, odatda qabul qilinmaydi" },
      { key: "paid", text: "Faqat qo'shimcha to'lov bilan" },
    ],
    correctIndex: 1,
    explanation: "Muddat o'tgach arizalar odatda ko'rib chiqilmaydi — keyingi qabul davrini ko'ring.",
  },
  {
    key: "quiz_tuition_1",
    type: "quiz_data",
    topic: "quiz:coverage",
    question: "Kontrakt qoplamasi nimaga tegishli?",
    options: [
      { key: "tuition", text: "O'qish to'loviga" },
      { key: "living", text: "Yashash xarajatlariga" },
      { key: "visa", text: "Viza to'loviga" },
    ],
    correctIndex: 0,
    explanation: "Kontrakt qoplamasi o'qish to'lovini, stipendiya esa yashash xarajatlarini qoplaydi.",
  },
  {
    key: "quiz_ielts_validity_1",
    type: "quiz_data",
    topic: "quiz:language",
    question: "Til sertifikati odatda qancha vaqt amal qiladi?",
    options: [
      { key: "1y", text: "1 yil" },
      { key: "2y", text: "2 yil" },
      { key: "5y", text: "5 yil" },
    ],
    correctIndex: 1,
    explanation: "Odatda 2 yil. Aniq talabni har bir dasturning rasmiy sahifasida tekshiring.",
  },
  {
    key: "quiz_recommendation_1",
    type: "quiz_data",
    topic: "quiz:documents",
    question: "Tavsiyanomani kim yozishi ma'qul?",
    options: [
      { key: "teacher", text: "Sizni o'qitgan yoki birga ishlagan odam" },
      { key: "relative", text: "Yaqin qarindosh" },
      { key: "self", text: "O'zingiz yozib, imzo qo'ydirish" },
    ],
    correctIndex: 0,
    explanation: "Tavsiyanoma sizni ishda yoki o'qishda kuzatgan odamdan bo'lishi kerak.",
  },
  {
    key: "quiz_full_funding_1",
    type: "quiz_data",
    topic: "quiz:funding",
    question: "To'liq moliyalashtirish nimani anglatadi?",
    options: [
      { key: "tuition_full", text: "O'qish kontrakti to'liq qoplanadi" },
      { key: "everything", text: "Barcha xarajatlar har doim qoplanadi" },
      { key: "fee_only", text: "Faqat ariza to'lovi qoplanadi" },
    ],
    correctIndex: 0,
    explanation: "Odatda kontrakt to'liq qoplanadi; stipendiya va boshqa xarajatlar e'londa alohida ko'rsatiladi.",
  },
];

/** Stable key list (the test asserts the deck covers every type). */
export function pollKeys(): string[] {
  return POLL_DECK.map((p) => p.key);
}

export function pollTypeCounts(): Record<PollType, number> {
  const counts = Object.fromEntries(POLL_TYPES.map((t) => [t, 0])) as Record<PollType, number>;
  for (const poll of POLL_DECK) counts[poll.type]++;
  return counts;
}
