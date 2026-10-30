/**
 * ScholarBridge — Runtime Database Content Localization Engine.
 *
 * Translates catalog content sourced from the database (universities, programs,
 * requirements, application cycles, scholarships, statuses, opportunities,
 * seeded tasks) into uz / ru AT RESPONSE TIME, with ZERO database changes:
 * the database rows stay canonical English — the single source of truth and
 * the language all filters / matching / comparisons operate on. Only the
 * outgoing payload (or the final SSR projection) is localized, per request.
 *
 * Deterministic + compositional. No machine translation, no network calls.
 * Three translation layers, applied in order:
 *
 *   1. DICTIONARY LAYER   — exact-match dictionaries (cities, countries via
 *                           `src/i18n/messages` `countryNames`, study fields,
 *                           badge/highlight texts, coverage types, statuses).
 *   2. PATTERN LAYER      — regex templates that reconstruct known formulaic
 *                           database texts (university description templates,
 *                           program-name composition "BSc in X", program
 *                           description templates, requirement phrases).
 *   3. WORD/CLAUSE LAYER  — compound splitting on " & " / " / " / ", " / " and "
 *                           and clause-wise phrase maps for free-text bodies
 *                           such as scholarship requirements.
 *
 * English passthrough: when `locale === "en"` every function returns the input
 * value unchanged (same reference for objects), which keeps the whole test
 * suite (render / match / dataset / compare / telegram-integration) byte-
 * identical to the untranslated behaviour.
 *
 * Data honesty: NULL stays NULL everywhere. Unknown strings are returned
 * verbatim — never machine-mangled — so canonical English data is always the
 * graceful fallback.
 *
 * This module is intentionally self-contained (inline translation tables):
 * the platform UI dictionaries in `src/i18n/messages` are NOT modified, so all
 * i18n parity checks (key parity across locales, telegram parity) stay green.
 */

import type { Locale } from "@/i18n/config";
import { localizeUniversityNarrative, reconcileEmbeddedRank } from "@/lib/universityProse";
import { dictionaries } from "@/i18n/messages.server";
import { countryTranslationKey } from "@/lib/countries";
import { memoizedLocalize, memoizedText, type LocalizedFields } from "@/lib/localizeMemo";

/* ============================================================================
 * 0. UTILITIES
 * ========================================================================== */

/** Non-English locales — every dictionary below is keyed by these. */
export type TargetLocale = "uz" | "ru";

function targetLocale(locale: Locale): TargetLocale | null {
  return locale === "en" ? null : (locale as TargetLocale);
}

/** Deep-clone-free helpers keep `en` returning the exact input reference. */
function passthrough<T>(value: T): T {
  return value;
}

/** Normalize a string for dictionary lookup (trim + collapse spaces + case). */
function keyOf(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** JSON-array columns (degreeLevels, eligibleMajors, highlights) stay strings
 *  in most payloads — parse → map → re-stringify, or return the input verbatim
 *  when the value is not a JSON array. */
function mapJsonStringArray<T extends string | null | undefined>(
  value: T,
  mapOne: (item: string) => string
): T {
  if (typeof value !== "string" || value.length === 0) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map((item) => (typeof item === "string" ? mapOne(item) : item))) as T;
    }
    return value;
  } catch {
    return value;
  }
}

/* ============================================================================
 * 1. DICTIONARY LAYER — COUNTRIES (via i18n `countryNames` + inline extras)
 * ========================================================================== */

/** Country names present in catalog data but outside the 38-key `countryNames`
 *  set. `countryTranslationKey` handles the rest through its alias table. */
const EXTRA_COUNTRY_NAMES: Record<string, Record<TargetLocale, string>> = {
  // Uzbekistan is a home market, not a QS destination, so it has no entry in
  // QS_TOP_200_COUNTRIES and therefore no `countryNames` key; without this it
  // renders in English on every Uzbek-owned award.
  Uzbekistan: { uz: "Oʻzbekiston", ru: "Узбекистан" },
  Hungary: { uz: "Vengriya", ru: "Венгрия" },
  Poland: { uz: "Polsha", ru: "Польша" },
  Turkey: { uz: "Turkiya", ru: "Турция" },
  "Türkiye": { uz: "Turkiya", ru: "Турция" },
  Estonia: { uz: "Estoniya", ru: "Эстония" },
  Latvia: { uz: "Latviya", ru: "Латвия" },
  Lithuania: { uz: "Litva", ru: "Литва" },
  Iceland: { uz: "Islandiya", ru: "Исландия" },
  Thailand: { uz: "Tailand", ru: "Таиланд" },
  Colombia: { uz: "Kolumbiya", ru: "Колумбия" },
  Peru: { uz: "Peru", ru: "Перу" },
  Chile: { uz: "Chili", ru: "Чили" },
  Argentina: { uz: "Argentina", ru: "Аргентина" },
  Malaysia: { uz: "Malayziya", ru: "Малайзия" },
  Philippines: { uz: "Filippin", ru: "Филиппины" },
  Pakistan: { uz: "Pokiston", ru: "Пакистан" },
  Bangladesh: { uz: "Bangladesh", ru: "Бангладеш" },
  Nigeria: { uz: "Nigeriya", ru: "Нигерия" },
  Ghana: { uz: "Gana", ru: "Гана" },
  Kenya: { uz: "Keniya", ru: "Кения" },
  Morocco: { uz: "Marokash", ru: "Марокко" },
  Tunisia: { uz: "Tunis", ru: "Тунис" },
  "New Zealand": { uz: "Yangi Zelandiya", ru: "Новая Зеландия" },
  "Saudi Arabia": { uz: "Saudiya Arabistoni", ru: "Саудовская Аравия" },
  "United Arab Emirates": { uz: "BAA", ru: "ОАЭ" },
  "Sri Lanka": { uz: "Shri-Lanka", ru: "Шри-Ланка" },
  Vietnam: { uz: "Vyetnam", ru: "Вьетнам" },
  Indonesia: { uz: "Indoneziya", ru: "Индонезия" },
};

/**
 * Localize a country display name. `en` (or empty) returns the input verbatim.
 * Resolution order: `countryNames` dictionary (via alias key) → inline extras
 * → input verbatim. Works on already-localized values (idempotent), because the
 * alias table in `countries.ts` recognizes uz/ru names as well.
 */
export function localizeCountry(country: string | null | undefined, locale: Locale): string {
  if (locale === "en" || country == null || country === "") {
    return country ?? "";
  }
  const tl = targetLocale(locale);
  if (!tl) return country;
  const key = countryTranslationKey(country);
  if (key) {
    const names = dictionaries[locale].countryNames as Record<string, string | undefined>;
    const translated = names[key];
    if (translated) return translated;
  }
  const extra = EXTRA_COUNTRY_NAMES[country.trim()];
  if (extra) return extra[tl];
  return country;
}

/* ============================================================================
 * 2. DICTIONARY LAYER — CITIES
 * ========================================================================== */

const CITY_NAMES: Record<string, Record<TargetLocale, string>> = {
  London: { uz: "London", ru: "Лондон" },
  Cambridge: { uz: "Kembrij", ru: "Кембридж" },
  Oxford: { uz: "Oksford", ru: "Оксфорд" },
  Manchester: { uz: "Manchester", ru: "Манчестер" },
  Edinburgh: { uz: "Edinburg", ru: "Эдинбург" },
  Dublin: { uz: "Dublin", ru: "Дублин" },
  Munich: { uz: "Myunxen", ru: "Мюнхен" },
  Berlin: { uz: "Berlin", ru: "Берлин" },
  Aachen: { uz: "Aaxen", ru: "Ахен" },
  Vienna: { uz: "Vena", ru: "Вена" },
  Zurich: { uz: "Syurix", ru: "Цюрих" },
  Geneva: { uz: "Jeneva", ru: "Женева" },
  Lausanne: { uz: "Lozanna", ru: "Лозанна" },
  Moscow: { uz: "Moskva", ru: "Москва" },
  Rome: { uz: "Rim", ru: "Рим" },
  Milan: { uz: "Milan", ru: "Милан" },
  Paris: { uz: "Parij", ru: "Париж" },
  Amsterdam: { uz: "Amsterdam", ru: "Амстердам" },
  Delft: { uz: "Delft", ru: "Делфт" },
  Rotterdam: { uz: "Rotterdam", ru: "Роттердам" },
  Brussels: { uz: "Bryussel", ru: "Брюссель" },
  Warsaw: { uz: "Varshava", ru: "Варшава" },
  Prague: { uz: "Praga", ru: "Прага" },
  Budapest: { uz: "Budapesht", ru: "Будапешт" },
  Stockholm: { uz: "Stokgolm", ru: "Стокгольм" },
  Copenhagen: { uz: "Kopengagen", ru: "Копенгаген" },
  Helsinki: { uz: "Xelsinki", ru: "Хельсинки" },
  Oslo: { uz: "Oslo", ru: "Осло" },
  Tallinn: { uz: "Tallin", ru: "Таллин" },
  Riga: { uz: "Riga", ru: "Рига" },
  Vilnius: { uz: "Vilnyus", ru: "Вильнюс" },
  Barcelona: { uz: "Barselona", ru: "Барселона" },
  Madrid: { uz: "Madrid", ru: "Мадрид" },
  Lisbon: { uz: "Lissabon", ru: "Лиссабон" },
  Athens: { uz: "Afina", ru: "Афины" },
  Istanbul: { uz: "Istanbul", ru: "Стамбул" },
  Ankara: { uz: "Anqara", ru: "Анкара" },
  Tashkent: { uz: "Toshkent", ru: "Ташкент" },
  Samarkand: { uz: "Samarqand", ru: "Самарканд" },
  Beijing: { uz: "Pekin", ru: "Пекин" },
  Shanghai: { uz: "Shanxay", ru: "Шанхай" },
  Shenzhen: { uz: "Shenchjen", ru: "Шэньчжэнь" },
  "Hong Kong": { uz: "Gonkong", ru: "Гонконг" },
  Tokyo: { uz: "Tokio", ru: "Токио" },
  Kyoto: { uz: "Kioto", ru: "Киото" },
  Osaka: { uz: "Osaka", ru: "Осака" },
  "Seoul": { uz: "Seul", ru: "Сеул" },
  "Daejeon": { uz: "Tejon", ru: "Тэджон" },
  Singapore: { uz: "Singapur", ru: "Сингапур" },
  "New Delhi": { uz: "Yangi Dehli", ru: "Нью-Дели" },
  Delhi: { uz: "Dehli", ru: "Дели" },
  Mumbai: { uz: "Mumbay", ru: "Мумбаи" },
  Bengaluru: { uz: "Bengaluru", ru: "Бангалор" },
  Bangalore: { uz: "Bengaluru", ru: "Бангалор" },
  Cairo: { uz: "Qohira", ru: "Каир" },
  Doha: { uz: "Doha", ru: "Доха" },
  Dubai: { uz: "Dubay", ru: "Дубай" },
  Toronto: { uz: "Toronto", ru: "Торонто" },
  Vancouver: { uz: "Vankuver", ru: "Ванкувер" },
  Montreal: { uz: "Montreal", ru: "Монреаль" },
  "New York": { uz: "Nyu-York", ru: "Нью-Йорк" },
  Boston: { uz: "Boston", ru: "Бостон" },
  Stanford: { uz: "Stenford", ru: "Стэнфорд" },
  Berkeley: { uz: "Berkli", ru: "Беркли" },
  Pasadena: { uz: "Pasadena", ru: "Пасадена" },
  "Los Angeles": { uz: "Los-Anjeles", ru: "Лос-Анджелес" },
  "San Francisco": { uz: "San-Fransisko", ru: "Сан-Франциско" },
  Chicago: { uz: "Chikago", ru: "Чикаго" },
  Ithaca: { uz: "Itaka", ru: "Итака" },
  Princeton: { uz: "Prinston", ru: "Принстон" },
  "Ann Arbor": { uz: "Ann-Arbor", ru: "Анн-Арбор" },
  "Urbana-Champaign": { uz: "Urbana-Shampeyn", ru: "Урбана-Шампейн" },
  Melbourne: { uz: "Melburn", ru: "Мельбурн" },
  Sydney: { uz: "Sidney", ru: "Сидней" },
  Brisbane: { uz: "Brisben", ru: "Брисбен" },
  Auckland: { uz: "Oklend", ru: "Окленд" },
  Kyiv: { uz: "Kiyev", ru: "Киев" },
  "St. Petersburg": { uz: "Sankt-Peterburg", ru: "Санкт-Петербург" },
  "São Paulo": { uz: "San-Paulu", ru: "Сан-Паулу" },
  "Mexico City": { uz: "Mexiko", ru: "Мехико" },
  Bogotá: { uz: "Bogota", ru: "Богота" },
  "Buenos Aires": { uz: "Buenos-Ayres", ru: "Буэнос-Айрес" },
  Santiago: { uz: "Santiago", ru: "Сантьяго" },
  Bangkok: { uz: "Bangkok", ru: "Бангкок" },
  "Kuala Lumpur": { uz: "Kuala-Lumpur", ru: "Куала-Лумпур" },
  Jakarta: { uz: "Jakarta", ru: "Джакарта" },
  Islamabad: { uz: "Islomobod", ru: "Исламабад" },
  "Colombo": { uz: "Kolombo", ru: "Коломбо" },
  Riyadh: { uz: "Riyod", ru: "Эр-Рияд" },
  "Tel Aviv": { uz: "Tel-Aviv", ru: "Тель-Авив" },
};

/**
 * Localize a city display name. Handles US state suffixes ("New York, NY")
 * by translating the city part only. `en` returns the input verbatim.
 */
export function localizeCity(city: string | null | undefined, locale: Locale): string {
  if (locale === "en" || city == null || city === "") {
    return city ?? "";
  }
  const tl = targetLocale(locale);
  if (!tl) return city;
  const trimmed = city.trim();
  const direct = CITY_NAMES[keyOf(trimmed)] ?? CITY_NAMES[trimmed];
  if (direct) return direct[tl];
  // "City, ST" — translate the city, keep the US state abbreviation as-is.
  const commaIdx = trimmed.indexOf(", ");
  if (commaIdx > 0) {
    const head = trimmed.slice(0, commaIdx);
    const tail = trimmed.slice(commaIdx);
    const headTranslated = CITY_NAMES[keyOf(head)] ?? CITY_NAMES[head];
    if (headTranslated) return headTranslated[tl] + tail;
  }
  return city;
}

/* ============================================================================
 * 3. DICTIONARY LAYER — STUDY FIELDS / MAJORS / DEGREE LEVELS / COVERAGE
 * ========================================================================== */

/** Exact-match field/major dictionary. Keys: canonical English field names
 *  from `src/lib/studyFields.ts` + catalog extras (seeds, enriched DB). */
const FIELD_NAMES: Record<string, Record<TargetLocale, string>> = {
  All: { uz: "Barcha yo'nalishlar", ru: "Все направления" },
  Medicine: { uz: "Tibbiyot", ru: "Медицина" },
  "Medicine (MBBS/MD)": { uz: "Tibbiyot (MBBS/MD)", ru: "Медицина (MBBS/MD)" },
  Dentistry: { uz: "Stomatologiya", ru: "Стоматология" },
  Pharmacy: { uz: "Farmatsevtika", ru: "Фармацевтика" },
  Nursing: { uz: "Hamshiralik ishi", ru: "Сестринское дело" },
  "Public Health": { uz: "Jamoat salomatligi", ru: "Общественное здравоохранение" },
  Psychology: { uz: "Psixologiya", ru: "Психология" },
  Law: { uz: "Huquqshunoslik", ru: "Юриспруденция" },
  "International Law": { uz: "Xalqaro huquq", ru: "Международное право" },
  Economics: { uz: "Iqtisodiyot", ru: "Экономика" },
  Finance: { uz: "Moliya", ru: "Финансы" },
  "Business Administration": { uz: "Biznes boshqaruvi", ru: "Менеджмент" },
  Management: { uz: "Menejment", ru: "Менеджмент" },
  Marketing: { uz: "Marketing", ru: "Маркетинг" },
  Accounting: { uz: "Buxgalteriya", ru: "Бухгалтерский учёт" },
  Entrepreneurship: { uz: "Tadbirkorlik", ru: "Предпринимательство" },
  "Civil Engineering": { uz: "Qurilish muhandisligi", ru: "Строительное дело" },
  "Mechanical Engineering": { uz: "Mexanika muhandisligi", ru: "Машиностроение" },
  "Electrical Engineering": { uz: "Elektrotexnika", ru: "Электротехника" },
  "Chemical Engineering": { uz: "Kimyo muhandisligi", ru: "Химическая технология" },
  "Industrial Engineering": { uz: "Sanoat muhandisligi", ru: "Промышленная инженерия" },
  "Materials Science": { uz: "Materialshunoslik", ru: "Наука о материалах" },
  "Aerospace Engineering": { uz: "Aerokosmik muhandislik", ru: "Аэрокосмическая инженерия" },
  "Biomedical Engineering": { uz: "Biomeditsina muhandisligi", ru: "Биомедицинская инженерия" },
  Architecture: { uz: "Arxitektura", ru: "Архитектура" },
  "Urban Planning": { uz: "Shaharsozlik", ru: "Градостроительство" },
  "Environmental Science": { uz: "Ekologiya va atrof-muhit", ru: "Экология и охрана окружающей среды" },
  "Climate Science": { uz: "Iqlimshunoslik", ru: "Климатология" },
  Physics: { uz: "Fizika", ru: "Физика" },
  Mathematics: { uz: "Matematika", ru: "Математика" },
  Chemistry: { uz: "Kimyo", ru: "Химия" },
  Biology: { uz: "Biologiya", ru: "Биология" },
  "Biotechnology": { uz: "Biotexnologiya", ru: "Биотехнологии" },
  "Genetics": { uz: "Genetika", ru: "Генетика" },
  Neuroscience: { uz: "Neyrofan", ru: "Нейронаука" },
  "Veterinary Science": { uz: "Veterinariya", ru: "Ветеринария" },
  Agriculture: { uz: "Qishloq xo'jaligi", ru: "Сельское хозяйство" },
  "Food Science": { uz: "Oziq-ovqat texnologiyasi", ru: "Технология пищевых продуктов" },
  Education: { uz: "Pedagogika", ru: "Педагогика" },
  "Early Childhood Education": { uz: "Maktabgacha ta'lim", ru: "Дошкольное образование" },
  Linguistics: { uz: "Tilshunoslik", ru: "Лингвистика" },
  "Linguistics / Translation Studies": { uz: "Tilshunoslik / Tarjima", ru: "Лингвистика / Переводоведение" },
  "Journalism / Media Studies": { uz: "Jurnalistika / Media", ru: "Журналистика / Медиа" },
  "Journalism / Communication Studies": { uz: "Jurnalistika / Kommunikatsiya", ru: "Журналистика / Коммуникации" },
  "Political Science": { uz: "Siyosatshunoslik", ru: "Политология" },
  "International Relations": { uz: "Xalqaro munosabatlar", ru: "Международные отношения" },
  "Public Policy": { uz: "Davlat siyosati", ru: "Государственная политика" },
  "Public Policy / Urban Studies": { uz: "Davlat siyosati / Shaharshunoslik", ru: "Госполитика / Урбанистика" },
  Sociology: { uz: "Sotsiologiya", ru: "Социология" },
  Anthropology: { uz: "Antropologiya", ru: "Антропология" },
  History: { uz: "Tarix", ru: "История" },
  Philosophy: { uz: "Falsafa", ru: "Философия" },
  "Theology / Religious Studies": { uz: "Ilohiyot / Diniy ta'limotlar", ru: "Богословие / Религиоведение" },
  "Fine Arts": { uz: "Tasviriy san'at", ru: "Изобразительное искусство" },
  "Performing Arts / Music": { uz: "Sahnalik san'ati / Musiqa", ru: "Сценическое искусство / Музыка" },
  Design: { uz: "Dizayn", ru: "Дизайн" },
  "Graphic Design": { uz: "Grafik dizayn", ru: "Графический дизайн" },
  "Interior Design": { uz: "Interyer dizayni", ru: "Дизайн интерьера" },
  "Fashion Design": { uz: "Moda dizayni", ru: "Дизайн одежды" },
  Hospitality: { uz: "Mehmondo'stlik", ru: "Гостиничное дело" },
  "Tourism / Hospitality Management": { uz: "Turizm / Mehmondo'stlik", ru: "Туризм / Гостиничный менеджмент" },
  "Aviation / Aerospace Management": { uz: "Aviatsiya / Aerokosmik menejment", ru: "Авиация / Аэрокосмический менеджмент" },
  "Maritime / Logistics": { uz: "Dengizchilik / Logistika", ru: "Судоходство / Логистика" },
  "Logistics / Supply Chain Management": { uz: "Logistika / Ta'minot zanjiri", ru: "Логистика / Управление цепочками поставок" },
  "Data Science / Analytics": { uz: "Ma'lumotlar fani / Analitika", ru: "Наука о данных / Аналитика" },
  "Cybersecurity": { uz: "Kiberxavfsizlik", ru: "Кибербезопасность" },
  "Robotics / Mechatronics": { uz: "Robototexnika / Mexatronika", ru: "Робототехника / Мехатроника" },
  "Game Development / Interactive Media": { uz: "O'yin ishlab chiqish / Interaktiv media", ru: "Разработка игр / Интерактивные медиа" },
  "Film / Television Production": { uz: "Kino / Televidenie ishlab chiqarish", ru: "Кино / Телепроизводство" },
  "Creative Writing": { uz: "Ijodiy yozuvchilik", ru: "Творческое письмо" },
  "Sports Science / Kinesiology": { uz: "Sport fani / Kinesiologiya", ru: "Спортология / Кинезиология" },
  "Astronomy / Astrophysics": { uz: "Astronomiya / Astrofizika", ru: "Астрономия / Астрофизика" },
  "Energy Systems / Renewable Energy": { uz: "Energiya tizimlari / Qayta tiklanuvchi energiya", ru: "Энергосистемы / ВИЭ" },
  "Renewable Energy": { uz: "Qayta tiklanuvchi energiya", ru: "Возобновляемая энергетика" },
  "Nuclear Engineering": { uz: "Yadro muhandisligi", ru: "Ядерная инженерия" },
  "Petroleum / Mining Engineering": { uz: "Neft-gaz / Konchilik muhandisligi", ru: "Нефтегазовая / Горная инженерия" },
  "Software Engineering": { uz: "Dasturiy injiniring", ru: "Программная инженерия" },
  "Computer Engineering": { uz: "Kompyuter muhandisligi", ru: "Компьютерная инженерия" },
  "Computer Science": { uz: "Kompyuter fanlari", ru: "Информатика" },
  "Information Technology / Information Systems": { uz: "Axborot texnologiyalari / Axborot tizimlari", ru: "Информационные технологии / Информационные системы" },
  "Artificial Intelligence / Machine Learning": { uz: "Sun'iy intellekt / Mashinali o'qitish", ru: "Искусственный интеллект / Машинное обучение" },
  "Artificial Intelligence": { uz: "Sun'iy intellekt", ru: "Искусственный интеллект" },
  Engineering: { uz: "Muhandislik", ru: "Инженерия" },
  "Natural Sciences": { uz: "Tabiiy fanlar", ru: "Естественные науки" },
  "AI & Data Science": { uz: "SI va ma'lumotlar fani", ru: "ИИ и наука о данных" },
  "Mathematics / Computer Science": { uz: "Matematika / Informatika", ru: "Математика / Информатика" },
  "Business Analytics": { uz: "Biznes analitikasi", ru: "Бизнес-аналитика" },
  "Systems Engineering": { uz: "Tizimlar muhandisligi", ru: "Системная инженерия" },
  "Chemistry / Materials": { uz: "Kimyo / Materiallar", ru: "Химия / Материалы" },
  // Gaps found by comparing the dictionary with data/programs_enriched_full.csv
  // (2026-10-27): these field labels were reaching students in English.
  "Information Systems": { uz: "Axborot tizimlari", ru: "Информационные системы" },
  Interdisciplinary: { uz: "Fanlararo yo'nalish", ru: "Междисциплинарное направление" },
  Arts: { uz: "San'at", ru: "Искусство" },
  Humanities: { uz: "Gumanitar fanlar", ru: "Гуманитарные науки" },
  Veterinary: { uz: "Veterinariya", ru: "Ветеринария" },
  "Veterinary Medicine": { uz: "Veterinariya meditsinasi", ru: "Ветеринарная медицина" },
  // Phase T (2026-10-30): every one of the 67 distinct `programs.field` values
  // in the live database, checked one by one against the real data. The labels
  // below replaced machine-hybrid output ("Life fanlari", "Applied matematika",
  // "Information fan", "Earth fanlari", "Financial muhandislik").
  Multidisciplinary: { uz: "Ko'p fanli yo'nalish", ru: "Мультидисциплинарное направление" },
  "Life Sciences": { uz: "Hayot haqidagi fanlar", ru: "Науки о жизни" },
  Sciences: { uz: "Tabiiy fanlar", ru: "Естественные науки" },
  Science: { uz: "Fan", ru: "Наука" },
  "Information Science": { uz: "Axborot fani", ru: "Информационная наука" },
  "Earth Sciences": { uz: "Yer haqidagi fanlar", ru: "Науки о Земле" },
  "Applied Mathematics": { uz: "Amaliy matematika", ru: "Прикладная математика" },
  "Sports Science": { uz: "Sport fani", ru: "Спортология" },
  "Financial Engineering": { uz: "Moliyaviy injiniring", ru: "Финансовая инженерия" },
  "Health Sciences": { uz: "Salomatlik fanlari", ru: "Науки о здоровье" },
  "Social Sciences": { uz: "Ijtimoiy fanlar", ru: "Общественные науки" },
  "Computer Science & IT": { uz: "Kompyuter fanlari va AT", ru: "Информатика и ИТ" },
  "Engineering & Technology": { uz: "Muhandislik va texnologiya", ru: "Инженерия и технологии" },
  "AI & Machine Learning": { uz: "Sun'iy intellekt va mashinali o'qitish", ru: "ИИ и машинное обучение" },
  "Electrical Engineering & CS": {
    uz: "Elektrotexnika va kompyuter fanlari",
    ru: "Электротехника и информатика",
  },
  "Business & Information Systems": {
    uz: "Biznes va axborot tizimlari",
    ru: "Бизнес и информационные системы",
  },
  "Social Sciences & Law": { uz: "Ijtimoiy fanlar va huquq", ru: "Общественные науки и право" },
  "Economics & Data Science": { uz: "Iqtisodiyot va ma'lumotlar fani", ru: "Экономика и наука о данных" },
  "Finance & Economics": { uz: "Moliya va iqtisodiyot", ru: "Финансы и экономика" },
  "Medicine & Life Sciences": { uz: "Tibbiyot va hayot haqidagi fanlar", ru: "Медицина и науки о жизни" },
  "Logistics & Supply Chain": { uz: "Logistika va ta'minot zanjiri", ru: "Логистика и цепочки поставок" },
  "Mathematics & Statistics": { uz: "Matematika va statistika", ru: "Математика и статистика" },
  "Economics & Finance": { uz: "Iqtisodiyot va moliya", ru: "Экономика и финансы" },
  "Business & Management": { uz: "Biznes va menejment", ru: "Бизнес и менеджмент" },
  "Business Economics": { uz: "Biznes iqtisodiyoti", ru: "Экономика бизнеса" },
  "Business Studies": { uz: "Biznes ta'limoti", ru: "Бизнес-исследования" },
  "Business Informatics": { uz: "Biznes informatika", ru: "Бизнес-информатика" },
  "Business Engineering": { uz: "Biznes injiniringi", ru: "Бизнес-инжиниринг" },
  "Media Studies": { uz: "Media ta'limoti", ru: "Медиаисследования" },
  "Music and Musicology": { uz: "Musiqa va musiqashunoslik", ru: "Музыка и музыковедение" },
  "Environmental Engineering": { uz: "Ekologik muhandislik", ru: "Экологическая инженерия" },
  "Architectural Engineering": { uz: "Arxitektura muhandisligi", ru: "Архитектурная инженерия" },
  "Transport Management": { uz: "Transport menejmenti", ru: "Управление транспортом" },
  "Maritime and Air Transport Management": {
    uz: "Dengiz va havo transporti menejmenti",
    ru: "Управление морским и воздушным транспортом",
  },
  "Land Economy": { uz: "Yer iqtisodiyoti", ru: "Экономика землепользования" },
  Drama: { uz: "Dramaturgiya", ru: "Драматургия" },
  Nanobiology: { uz: "Nanobiologiya", ru: "Нанобиология" },
  Bioinformatics: { uz: "Bioinformatika", ru: "Биоинформатика" },
  "Biomedical Sciences": { uz: "Biomeditsina fanlari", ru: "Биомедицинские науки" },
  "Viticulture and Oenology": { uz: "Vitischilik va vinochilik", ru: "Виноградарство и виноделие" },
  Animation: { uz: "Animatsiya", ru: "Анимация" },
  "Public and International Affairs": {
    uz: "Jamoat va xalqaro ishlar",
    ru: "Общественные и международные отношения",
  },
  "STEM Education": { uz: "STEM ta'limi", ru: "STEM-образование" },
  "Information Technology": { uz: "Axborot texnologiyalari", ru: "Информационные технологии" },
  "Logistics Management": { uz: "Logistika menejmenti", ru: "Управление логистикой" },
  // Multi-word live titles that the word layer would have turned into a hybrid.
  "Marine Biology": { uz: "Dengiz biologiyasi", ru: "Морская биология" },
  "Marine Science": { uz: "Dengiz fanlari", ru: "Морские науки" },
  "Life Science": { uz: "Hayot fanlari", ru: "Науки о жизни" },
  "Life Science and Technology": { uz: "Hayot fanlari va texnologiya", ru: "Науки о жизни и технологии" },
  "Financial Analysis": { uz: "Moliyaviy tahlil", ru: "Финансовый анализ" },
  "Fund Management": { uz: "Fond menejmenti", ru: "Управление фондом" },
  "Management Science": { uz: "Menejment fani", ru: "Наука управления" },
  "Environmental Law": { uz: "Ekologik huquq", ru: "Экологическое право" },
  "Scots and English Law": { uz: "Shotlandiya va Angliya huquqi", ru: "Шотландское и английское право" },
  "Civil Environmental and Architectural Engineering": {
    uz: "Qurilish, ekologiya va arxitektura muhandisligi",
    ru: "Строительная, экологическая и архитектурная инженерия",
  },
  "East Asian Studies": { uz: "Sharqiy Osiyo tadqiqotlari", ru: "Исследования Восточной Азии" },
  "Mathematical Sciences": { uz: "Matematik fanlar", ru: "Математические науки" },
  "Physics/Chemistry/Math": { uz: "Fizika/Kimyo/Matematika", ru: "Физика/Химия/Математика" },
  "Computational Mathematics and Cybernetics": {
    uz: "Hisoblash matematikasi va kibernetika",
    ru: "Вычислительная математика и кибернетика",
  },
  // Foreign-language titles the catalogue carries verbatim (Spanish/Portuguese).
  "Economía": { uz: "Iqtisodiyot", ru: "Экономика" },
  "Psicología": { uz: "Psixologiya", ru: "Психология" },
  "Computación": { uz: "Hisoblash texnikasi", ru: "Вычислительная техника" },
  "Administración de Empresas": { uz: "Biznes boshqaruvi", ru: "Управление бизнесом" },
  "Administração": { uz: "Boshqaruv", ru: "Управление" },
  "Agronomía": { uz: "Agronomiya", ru: "Агрономия" },
  "Abogacía": { uz: "Huquqshunoslik", ru: "Право" },
  "Medicina": { uz: "Tibbiyot", ru: "Медицина" },
  "Ingeniería Civil": { uz: "Qurilish muhandisligi", ru: "Строительная инженерия" },
};

/** Word/alias layer — small tokens that appear inside compound field names. */
const FIELD_WORD_ALIASES: Array<[RegExp, Record<TargetLocale, string>]> = [
  [/\bcomputer science\b/i, { uz: "kompyuter fanlari", ru: "информатика" }],
  [/\binformatics\b/i, { uz: "informatika", ru: "информатика" }],
  [/\bsoftware\b/i, { uz: "dasturiy ta'minot", ru: "программное обеспечение" }],
  [/\bdata science\b/i, { uz: "ma'lumotlar fani", ru: "наука о данных" }],
  [/\bdata engineering\b/i, { uz: "ma'lumotlar muhandisligi", ru: "инженерия данных" }],
  [/\bartificial intelligence\b/i, { uz: "sun'iy intellekt", ru: "искусственный интеллект" }],
  [/\bmachine learning\b/i, { uz: "mashinali o'qitish", ru: "машинное обучение" }],
  [/\bcybersecurity\b/i, { uz: "kiberxavfsizlik", ru: "кибербезопасность" }],
  [/\brobotics\b/i, { uz: "robototexnika", ru: "робототехника" }],
  [/\bmechatronics\b/i, { uz: "mexatronika", ru: "мехатроника" }],
  [/\belectrical engineering\b/i, { uz: "elektrotexnika", ru: "электротехника" }],
  [/\bmechanical engineering\b/i, { uz: "mexanika muhandisligi", ru: "машиностроение" }],
  [/\bcivil engineering\b/i, { uz: "qurilish muhandisligi", ru: "строительное дело" }],
  [/\bchemical engineering\b/i, { uz: "kimyo muhandisligi", ru: "химическая технология" }],
  [/\bbiomedical engineering\b/i, { uz: "biomeditsina muhandisligi", ru: "биомедицинская инженерия" }],
  [/\bbioengineering\b/i, { uz: "bioinjiniring", ru: "биоинженерия" }],
  [/\bengineering\b/i, { uz: "muhandislik", ru: "инженерия" }],
  [/\bbiotechnology\b/i, { uz: "biotexnologiya", ru: "биотехнологии" }],
  [/\bbiology\b/i, { uz: "biologiya", ru: "биология" }],
  [/\bphysics\b/i, { uz: "fizika", ru: "физика" }],
  [/\bmathematics\b/i, { uz: "matematika", ru: "математика" }],
  [/\bstatistics\b/i, { uz: "statistika", ru: "статистика" }],
  [/\bchemistry\b/i, { uz: "kimyo", ru: "химия" }],
  [/\bmedicine\b/i, { uz: "tibbiyot", ru: "медицина" }],
  [/\bnursing\b/i, { uz: "hamshiralik ishi", ru: "сестринское дело" }],
  [/\bpharmacy\b/i, { uz: "farmatsevtika", ru: "фармацевтика" }],
  [/\bpublic health\b/i, { uz: "jamoat salomatligi", ru: "общественное здравоохранение" }],
  [/\bpsychology\b/i, { uz: "psixologiya", ru: "психология" }],
  [/\blaw\b/i, { uz: "huquq", ru: "право" }],
  [/\beconomics\b/i, { uz: "iqtisodiyot", ru: "экономика" }],
  [/\bfinance\b/i, { uz: "moliya", ru: "финансы" }],
  [/\baccounting\b/i, { uz: "buxgalteriya", ru: "бухгалтерский учёт" }],
  [/\bmarketing\b/i, { uz: "marketing", ru: "маркетинг" }],
  [/\bmanagement\b/i, { uz: "menejment", ru: "менеджмент" }],
  [/\bbusiness\b/i, { uz: "biznes", ru: "бизнес" }],
  [/\bentrepreneurship\b/i, { uz: "tadbirkorlik", ru: "предпринимательство" }],
  [/\barchitecture\b/i, { uz: "arxitektura", ru: "архитектура" }],
  [/\burban planning\b/i, { uz: "shaharsozlik", ru: "градостроительство" }],
  [/\benvironmental\b/i, { uz: "ekologik", ru: "экологический" }],
  [/\becology\b/i, { uz: "ekologiya", ru: "экология" }],
  [/\bjournalism\b/i, { uz: "jurnalistika", ru: "журналистика" }],
  [/\bmedia\b/i, { uz: "media", ru: "медиа" }],
  [/\bdesign\b/i, { uz: "dizayn", ru: "дизайн" }],
  [/\beducation\b/i, { uz: "pedagogika", ru: "педагогика" }],
  [/\bteaching\b/i, { uz: "o'qitish", ru: "преподавание" }],
  [/\bphilosophy\b/i, { uz: "falsafa", ru: "философия" }],
  [/\bhistory\b/i, { uz: "tarix", ru: "история" }],
  [/\bsociology\b/i, { uz: "sotsiologiya", ru: "социология" }],
  [/\bpolitical science\b/i, { uz: "siyosatshunoslik", ru: "политология" }],
  [/\binternational relations\b/i, { uz: "xalqaro munosabatlar", ru: "международные отношения" }],
  [/\bpublic policy\b/i, { uz: "davlat siyosati", ru: "государственная политика" }],
  [/\bneuroscience\b/i, { uz: "neyrofan", ru: "нейронаука" }],
  [/\bgenetics\b/i, { uz: "genetika", ru: "генетика" }],
  [/\baerospace\b/i, { uz: "aerokosmik", ru: "аэрокосмический" }],
  [/\bmaterials\b/i, { uz: "materiallar", ru: "материалы" }],
  [/\bindustrial\b/i, { uz: "sanoat", ru: "промышленный" }],
  [/\blogistics\b/i, { uz: "logistika", ru: "логистика" }],
  [/\bsupply chain\b/i, { uz: "ta'minot zanjiri", ru: "цепочка поставок" }],
  [/\bhospitality\b/i, { uz: "mehmondo'stlik", ru: "гостиничное дело" }],
  [/\btourism\b/i, { uz: "turizm", ru: "туризм" }],
  [/\barchitecture and\b/i, { uz: "arxitektura va", ru: "архитектура и" }],
  [/\band architecture\b/i, { uz: "va arxitektura", ru: "и архитектура" }],
  [/\bcomputing\b/i, { uz: "hisoblash texnikasi", ru: "вычислительная техника" }],
  [/\bhealth\b/i, { uz: "salomatlik", ru: "здравоохранение" }],
  [/\bcommunication\b/i, { uz: "kommunikatsiya", ru: "коммуникации" }],
  [/\bstudies\b/i, { uz: "ta'limotlar", ru: "исследования" }],
  [/\bscience\b/i, { uz: "fan", ru: "наука" }],
  [/\bsciences\b/i, { uz: "fanlari", ru: "науки" }],
  // Phase T (2026-10-30): the words that were still reaching students in
  // English inside otherwise-translated field and programme names — "Marine
  // biologiya", "Financial matematika", "Nanoelectronic Systems".
  [/\bmultidisciplinary\b/i, { uz: "ko'p fanli", ru: "мультидисциплинарный" }],
  [/\binterdisciplinary\b/i, { uz: "fanlararo", ru: "междисциплинарный" }],
  [/\bmarine\b/i, { uz: "dengiz", ru: "морской" }],
  [/\bmaritime\b/i, { uz: "dengiz", ru: "морской" }],
  [/\bapplied\b/i, { uz: "amaliy", ru: "прикладной" }],
  [/\bfinancial\b/i, { uz: "moliyaviy", ru: "финансовый" }],
  [/\bnanoelectronic\b/i, { uz: "nanoelektronik", ru: "наноэлектронный" }],
  [/\bsystems\b/i, { uz: "tizimlari", ru: "системы" }],
  [/\banalysis\b/i, { uz: "tahlili", ru: "анализ" }],
  [/\bfund\b/i, { uz: "fond", ru: "фонд" }],
  [/\btechnology\b/i, { uz: "texnologiya", ru: "технологии" }],
  [/\btechnologies\b/i, { uz: "texnologiyalari", ru: "технологии" }],
  [/\binformation\b/i, { uz: "axborot", ru: "информационный" }],
  [/\bearth\b/i, { uz: "yer", ru: "земли" }],
  [/\blife\b/i, { uz: "hayot", ru: "жизни" }],
  [/\bfood\b/i, { uz: "oziq-ovqat", ru: "пищевой" }],
  [/\bsports?\b/i, { uz: "sport", ru: "спортивный" }],
  [/\bfilm\b/i, { uz: "kino", ru: "кино" }],
  [/\btelevision\b/i, { uz: "televideniye", ru: "телевидение" }],
  [/\bmusicology\b/i, { uz: "musiqashunoslik", ru: "музыковедение" }],
  [/\bmusic\b/i, { uz: "musiqa", ru: "музыка" }],
  [/\bdrama\b/i, { uz: "dramaturgiya", ru: "драматургия" }],
  [/\bgovernment\b/i, { uz: "davlat boshqaruvi", ru: "государственное управление" }],
  [/\binternational\b/i, { uz: "xalqaro", ru: "международный" }],
  [/\bglobal\b/i, { uz: "global", ru: "глобальный" }],
  [/\bpublic\b/i, { uz: "jamoat", ru: "общественный" }],
  [/\baffairs\b/i, { uz: "ishlar", ru: "отношения" }],
  [/\badministration\b/i, { uz: "boshqaruv", ru: "администрирование" }],
  [/\bsocial\b/i, { uz: "ijtimoiy", ru: "общественный" }],
  [/\brelations\b/i, { uz: "munosabatlar", ru: "отношения" }],
  [/\bpolitical\b/i, { uz: "siyosiy", ru: "политический" }],
  [/\beconomy\b/i, { uz: "iqtisodiyot", ru: "экономика" }],
  [/\bcommerce\b/i, { uz: "tijorat", ru: "торговля" }],
  [/\banimation\b/i, { uz: "animatsiya", ru: "анимация" }],
  [/\bbiomolecular\b/i, { uz: "biomolekulyar", ru: "биомолекулярный" }],
  [/\bbiological\b/i, { uz: "biologik", ru: "биологический" }],
  [/\bprocess\b/i, { uz: "jarayonlar", ru: "процессы" }],
  [/\bcomputational\b/i, { uz: "hisoblash", ru: "вычислительный" }],
  [/\bcybernetics\b/i, { uz: "kibernetika", ru: "кибернетика" }],
  [/\bnanobiology\b/i, { uz: "nanobiologiya", ru: "нанобиология" }],
  [/\bbioinformatics\b/i, { uz: "bioinformatika", ru: "биоинформатика" }],
  [/\bbiomedical\b/i, { uz: "biomeditsina", ru: "биомедицинский" }],
  [/\bmolecular\b/i, { uz: "molekulyar", ru: "молекулярный" }],
  [/\bmath\b/i, { uz: "matematika", ru: "математика" }],
  [/\bland economy\b/i, { uz: "yer iqtisodiyoti", ru: "экономика землепользования" }],
  [/\bsciences and technology\b/i, { uz: "fanlar va texnologiya", ru: "науки и технологии" }],
  [/\barts\b/i, { uz: "san'at", ru: "искусство" }],
  [/\bhumanities\b/i, { uz: "gumanitar fanlar", ru: "гуманитарные науки" }],
  [/\blanguages\b/i, { uz: "tillar", ru: "языки" }],
  [/\blanguage\b/i, { uz: "til", ru: "язык" }],
  [/\blinguistics\b/i, { uz: "tilshunoslik", ru: "лингвистика" }],
  [/\btranslation\b/i, { uz: "tarjima", ru: "перевод" }],
  [/\bliterature\b/i, { uz: "adabiyot", ru: "литература" }],
  [/\btheology\b/i, { uz: "ilohiyot", ru: "богословие" }],
  [/\breligion\b/i, { uz: "din", ru: "религия" }],
  [/\barchaeology\b/i, { uz: "arxeologiya", ru: "археология" }],
  [/\bgeography\b/i, { uz: "geografiya", ru: "география" }],
  [/\bgeology\b/i, { uz: "geologiya", ru: "геология" }],
  [/\boceanography\b/i, { uz: "okeanografiya", ru: "океанография" }],
  [/\bmeteorology\b/i, { uz: "meteorologiya", ru: "метеорология" }],
  [/\bmicrobiology\b/i, { uz: "mikrobiologiya", ru: "микробиология" }],
  [/\bbiochemistry\b/i, { uz: "biokimyo", ru: "биохимия" }],
  [/\bzoology\b/i, { uz: "zoologiya", ru: "зоология" }],
  [/\bbotany\b/i, { uz: "botanika", ru: "ботаника" }],
  [/\bsustainability\b/i, { uz: "barqarorlik", ru: "устойчивое развитие" }],
  [/\bplanning\b/i, { uz: "rejalashtirish", ru: "планирование" }],
  [/\btransport\b/i, { uz: "transport", ru: "транспорт" }],
  [/\baviation\b/i, { uz: "aviatsiya", ru: "авиация" }],
  [/\belectronics\b/i, { uz: "elektronika", ru: "электроника" }],
  [/\bcommunications?\b/i, { uz: "kommunikatsiya", ru: "коммуникации" }],
  [/\bnetworks?\b/i, { uz: "tarmoqlari", ru: "сети" }],
  [/\bsecurity\b/i, { uz: "xavfsizlik", ru: "безопасность" }],
  [/\bethics\b/i, { uz: "etika", ru: "этика" }],
  [/\bgovernance\b/i, { uz: "boshqaruv", ru: "управление" }],
  [/\bactuarial\b/i, { uz: "aktuariylik", ru: "актуарный" }],
  [/\binsurance\b/i, { uz: "sug'urta", ru: "страхование" }],
  [/\bbanking\b/i, { uz: "bank ishi", ru: "банковское дело" }],
  [/\btaxation\b/i, { uz: "soliqqa tortish", ru: "налогообложение" }],
  [/\breal estate\b/i, { uz: "ko'chmas mulk", ru: "недвижимость" }],
  [/\bretail\b/i, { uz: "chakana savdo", ru: "розничная торговля" }],
  [/\bphotography\b/i, { uz: "fotografiya", ru: "фотография" }],
  [/\bpainting\b/i, { uz: "rangtasvir", ru: "живопись" }],
  [/\bsculpture\b/i, { uz: "haykaltaroshlik", ru: "скульптура" }],
  [/\bceramics\b/i, { uz: "kulolchilik", ru: "керамика" }],
  [/\btextile\b/i, { uz: "to'qimachilik", ru: "текстиль" }],
  [/\bmanufacturing\b/i, { uz: "ishlab chiqarish", ru: "производство" }],
  [/\bquality\b/i, { uz: "sifat", ru: "качество" }],
  [/\bproject\b/i, { uz: "loyiha", ru: "проект" }],
  [/\bhuman\b/i, { uz: "inson", ru: "человек" }],
  [/\bdevelopment\b/i, { uz: "rivojlanish", ru: "развитие" }],
  [/\benvironment\b/i, { uz: "atrof-muhit", ru: "окружающая среда" }],
  [/\bconservation\b/i, { uz: "muhofaza", ru: "охрана" }],
  [/\bforestry\b/i, { uz: "o'rmonchilik", ru: "лесное хозяйство" }],
  [/\bhorticulture\b/i, { uz: "bog'dorchilik", ru: "садоводство" }],
  [/\bagronomy\b/i, { uz: "agronomiya", ru: "агрономия" }],
  [/\bviticul?ture\b/i, { uz: "vitischilik", ru: "виноградарство" }],
  [/\boenology\b/i, { uz: "vinochilik", ru: "виноделие" }],
  [/\banimal\b/i, { uz: "hayvon", ru: "животных" }],
  [/\bnutrition\b/i, { uz: "oziqlanish", ru: "питание" }],
  [/\bphysiotherapy\b/i, { uz: "fizioterapiya", ru: "физиотерапия" }],
  [/\bmidwifery\b/i, { uz: "doyalik", ru: "акушерство" }],
  [/\bradiograph(y|ic)\b/i, { uz: "radiografiya", ru: "радиография" }],
  [/\boptometry\b/i, { uz: "optometriya", ru: "оптометрия" }],
  [/\bdental\b/i, { uz: "stomatologiya", ru: "стоматология" }],
  [/\bsurgery\b/i, { uz: "jarrohlik", ru: "хирургия" }],
  [/\bpaediatrics\b/i, { uz: "pediatriya", ru: "педиатрия" }],
  [/\bcardiology\b/i, { uz: "kardiologiya", ru: "кардиология" }],
  [/\boncology\b/i, { uz: "onkologiya", ru: "онкология" }],
  [/\bimmunology\b/i, { uz: "immunologiya", ru: "иммунология" }],
  [/\bpharmacology\b/i, { uz: "farmakologiya", ru: "фармакология" }],
  [/\bepidemiology\b/i, { uz: "epidemiologiya", ru: "эпидемиология" }],
  [/\bleadership\b/i, { uz: "yetakchilik", ru: "лидерство" }],
  [/\bmathematical\b/i, { uz: "matematik", ru: "математические" }],
  [/\beast asia(n)?\b/i, { uz: "Sharqiy Osiyo", ru: "Восточная Азия" }],
  [/\bcivil\b/i, { uz: "qurilish", ru: "строительный" }],
  [/\barctic\b/i, { uz: "Arktika", ru: "Арктика" }],
  [/\barchitectural\b/i, { uz: "arxitektura", ru: "архитектурный" }],
  [/\bstudies?\b/i, { uz: "ta'limoti", ru: "исследования" }],
];

/**
 * Every English word the alias layer knows how to translate, paired with what
 * it becomes. If one of these is still present after the alias pass, the label
 * was only PARTLY translated — and a half-translated label ("Applied
 * matematika", "Life fanlari", "Financial muhandislik") reads worse than the
 * original. `localizeMajorOrField` therefore falls back to the original label
 * instead of shipping the hybrid: clean or verbatim, never mangled.
 */
const ALIAS_WORDS: Array<{ words: string[]; translation: Record<TargetLocale, string> }> =
  FIELD_WORD_ALIASES.map(([re, translation]) => ({
    words: re.source
      .replace(/\\b/g, " ")
      .replace(/\\/g, " ")
      .trim()
      .split(/\s+/)
      .filter((word) => /^[a-z]+$/.test(word)),
    translation,
  }));

/**
 * English words that have no deterministic Uzbek/Russian equivalent in this
 * engine (institution names, degree plumbing). A label that still contains one
 * cannot be finished, so it is shown in the source language instead of being
 * half-replaced.
 */
const UNTRANSLATABLE_ENGLISH = new Set([
  "program",
  "programme",
  "programs",
  "school",
  "college",
  "university",
  "institute",
  "faculty",
  "academy",
  "campus",
  "graduate",
  "undergraduate",
  "degree",
  "course",
  "honours",
  "honors",
  "diploma",
  "certificate",
  "foundation",
  "executive",
  "advanced",
  "professional",
  "integrated",
  "joint",
  "dual",
  "online",
  "full-time",
  "part-time",
]);

/** True when `value` still contains an English word the alias layer can translate. */
function hasEnglishResidue(value: string, tl: TargetLocale): boolean {
  const tokens = new Set(value.toLowerCase().split(/[^a-z'-]+/).filter(Boolean));
  for (const token of tokens) if (UNTRANSLATABLE_ENGLISH.has(token)) return true;
  return ALIAS_WORDS.some(
    (alias) =>
      alias.translation[tl].toLowerCase() !== alias.words.join(" ") &&
      alias.words.some((word) => tokens.has(word))
  );
}

/**
 * Exposed for the catalogue-language gate: does this label still read as
 * English after localization? Used to assert that every live `programs.field`
 * value is fully translated rather than silently falling back.
 */
export function isUntranslatedLabel(original: string | null | undefined, locale: Locale): boolean {
  if (original == null || original.trim() === "") return false;
  if (locale === "en") return false;
  const localized = localizeMajorOrField(original, locale);
  return localized.trim() === original.trim() && hasEnglishResidue(original, locale);
}

/**
 * Localize a study-field / major / program-field name. Three layers:
 *   1. exact dictionary entry;
 *   2. degree-prefix-less full-string aliases;
 *   3. compound splitting on " & " / " / " / ", " / " and ", then word aliases.
 * `en` returns the input verbatim.
 */
export function localizeMajorOrField(field: string | null | undefined, locale: Locale): string {
  if (locale === "en" || field == null || field === "") {
    return field ?? "";
  }
  const tl = targetLocale(locale);
  if (!tl) return field;
  const trimmed = field.trim();
  const exact = FIELD_NAMES[trimmed] ?? FIELD_NAMES[keyOf(trimmed)];
  if (exact) return exact[tl];
  // Compound splitting on the spec separators.
  const separators = [" & ", " / ", ", ", " and "];
  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      return trimmed
        .split(sep)
        .map((part) => localizeMajorOrField(part, locale))
        .join(sep === " and " || sep === " & " ? (tl === "uz" ? " va " : " и ") : sep);
    }
  }
  // Word/alias layer on the full remaining string.
  let out = trimmed;
  for (const [pattern, translations] of FIELD_WORD_ALIASES) {
    if (pattern.test(out)) {
      out = out.replace(pattern, translations[tl]);
    }
  }
  // Anything still English means the alias pass only translated part of the
  // label. Ship the original rather than a hybrid.
  if (hasEnglishResidue(out, tl)) return trimmed;
  // Preserve the label's initial capital ("Bioengineering" → "Bioinjiniring").
  if (out && trimmed[0] === trimmed[0].toUpperCase() && trimmed[0] !== trimmed[0].toLowerCase()) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/** Degree-level display names. Canonical values stay "Master" / "PhD" / ... */
const DEGREE_LEVEL_NAMES: Record<string, Record<TargetLocale, string>> = {
  high_school: { uz: "O'rta maktab", ru: "Средняя школа" },
  "High School": { uz: "O'rta maktab", ru: "Средняя школа" },
  undergrad: { uz: "Bakalavriat", ru: "Бакалавриат" },
  Bachelor: { uz: "Bakalavriat", ru: "Бакалавриат" },
  grad: { uz: "Magistratura", ru: "Магистратура" },
  Master: { uz: "Magistratura", ru: "Магистратура" },
  phd: { uz: "Doktorantura (PhD)", ru: "Докторантура (PhD)" },
  PhD: { uz: "Doktorantura (PhD)", ru: "Докторантура (PhD)" },
  any: { uz: "Barcha bosqichlar", ru: "Любой уровень" },
  Any: { uz: "Barcha bosqichlar", ru: "Любой уровень" },
  "Bachelor's": { uz: "Bakalavriat", ru: "Бакалавриат" },
  "Master's": { uz: "Magistratura", ru: "Магистратура" },
  // Gaps found in data/programs_enriched_full.csv (`degree_level`, `degree`).
  Undergraduate: { uz: "Bakalavriat", ru: "Бакалавриат" },
  Postgraduate: { uz: "Magistratura", ru: "Магистратура" },
  Graduate: { uz: "Magistratura", ru: "Магистратура" },
  Doctoral: { uz: "Doktorantura (PhD)", ru: "Докторантура (PhD)" },
  Doctorate: { uz: "Doktorantura (PhD)", ru: "Докторантура (PhD)" },
  Diploma: { uz: "Diplom dasturi", ru: "Программа диплома" },
  Certificate: { uz: "Sertifikat dasturi", ru: "Программа сертификата" },
  Foundation: { uz: "Tayyorlov dasturi", ru: "Подготовительная программа" },
  "Language course": { uz: "Til kursi", ru: "Языковые курсы" },
};

export function localizeDegreeLevel(level: string | null | undefined, locale: Locale): string {
  if (locale === "en" || level == null || level === "") return level ?? "";
  const tl = targetLocale(locale);
  if (!tl) return level;
  const hit = DEGREE_LEVEL_NAMES[level] ?? DEGREE_LEVEL_NAMES[keyOf(level)];
  return hit ? hit[tl] : level;
}

/** Scholarship coverageType display names (canonical filter values unchanged). */
const COVERAGE_TYPE_NAMES: Record<string, Record<TargetLocale, string>> = {
  "Full Tuition + Stipend": { uz: "To'liq kontrakt + stipendiya", ru: "Полное обучение + стипендия" },
  "Full Tuition": { uz: "To'liq kontrakt", ru: "Полное обучение" },
  "Partial Tuition": { uz: "Qisman kontrakt", ru: "Частичное обучение" },
  "Full Funding": { uz: "To'liq moliyalashtirish", ru: "Полное финансирование" },
  "Partial Funding": { uz: "Qisman moliyalashtirish", ru: "Частичное финансирование" },
  "Tuition Waiver": { uz: "Kontrakt ozodligi", ru: "Льгота по оплате обучения" },
  "Living Stipend": { uz: "Yashash stipendiyasi", ru: "Стипендия на проживание" },
  Unspecified: { uz: "Ko'rsatilmagan", ru: "Не указано" },
};

export function localizeCoverageType(coverage: string | null | undefined, locale: Locale): string {
  if (locale === "en" || coverage == null || coverage === "") return coverage ?? "";
  const tl = targetLocale(locale);
  if (!tl) return coverage;
  const hit = COVERAGE_TYPE_NAMES[coverage] ?? COVERAGE_TYPE_NAMES[keyOf(coverage)];
  return hit ? hit[tl] : coverage;
}

/**
 * Funding type ("Merit-based", "Need-based", …) — the `scholarships.funding_type`
 * column the admin panel can fill. The column is optional and usually empty, so
 * an unknown value is returned verbatim rather than guessed.
 */
const FUNDING_TYPE_NAMES: Record<string, Record<TargetLocale, string>> = {
  "Merit-based": { uz: "Natijaga asoslangan (merit)", ru: "По заслугам (merit)" },
  "Merit based": { uz: "Natijaga asoslangan (merit)", ru: "По заслугам (merit)" },
  Merit: { uz: "Natijaga asoslangan (merit)", ru: "По заслугам (merit)" },
  "Need-based": { uz: "Ehtiyojga asoslangan", ru: "По потребности (need-based)" },
  "Need based": { uz: "Ehtiyojga asoslangan", ru: "По потребности (need-based)" },
  "Merit & Need": { uz: "Merit va ehtiyoj", ru: "Заслуги и потребность" },
  "Merit- and need-based": { uz: "Merit va ehtiyoj asosida", ru: "По заслугам и потребности" },
  "Need-based; varies": { uz: "Ehtiyojga asoslangan; farq qiladi", ru: "По потребности; варьируется" },
  "Full funding": { uz: "To'liq moliyalashtirish", ru: "Полное финансирование" },
  "Partial funding": { uz: "Qisman moliyalashtirish", ru: "Частичное финансирование" },
  "Tuition only": { uz: "Faqat kontrakt", ru: "Только обучение" },
  // Phase T: every short funding_type value that appears in the live catalogue
  // (45 Merit-based, 22 Fully Funded, 13 Full Funding, 12 Fully funded, …).
  "Fully Funded": { uz: "To'liq moliyalashtirilgan", ru: "Полностью финансируемая" },
  "Fully funded": { uz: "To'liq moliyalashtirilgan", ru: "Полностью финансируемая" },
  "Fully funded scholarship": { uz: "To'liq moliyalashtirilgan stipendiya", ru: "Полностью финансируемая стипендия" },
  "Full Funding": { uz: "To'liq moliyalashtirish", ru: "Полное финансирование" },
  Partial: { uz: "Qisman", ru: "Частичная" },
  "Stipend only": { uz: "Faqat stipendiya", ru: "Только стипендия" },
  "Government scholarship": { uz: "Hukumat stipendiyasi", ru: "Государственная стипендия" },
  "Merit-based tuition waiver": {
    uz: "Natijaga asoslangan kontrakt ozodligi",
    ru: "Освобождение от оплаты по заслугам",
  },
  "Merit-based tuition fee reduction": {
    uz: "Natijaga asoslangan kontrakt chegirmasi",
    ru: "Скидка на обучение по заслугам",
  },
  "Merit-based tuition discount": {
    uz: "Natijaga asoslangan kontrakt chegirmasi",
    ru: "Скидка на обучение по заслугам",
  },
  "Merit-based scholarship": { uz: "Natijaga asoslangan stipendiya", ru: "Стипендия по заслугам" },
  "Need and merit": { uz: "Ehtiyoj va natija", ru: "Потребность и заслуги" },
  "Tuition fee waiver": { uz: "Kontraktdan ozod qilish", ru: "Освобождение от оплаты обучения" },
};

export function localizeFundingType(type: string | null | undefined, locale: Locale): string {
  if (locale === "en" || type == null || type === "") return type ?? "";
  const tl = targetLocale(locale);
  if (!tl) return type;
  const hit = FUNDING_TYPE_NAMES[type] ?? FUNDING_TYPE_NAMES[keyOf(type)];
  return hit ? hit[tl] : type;
}

/** University type display (canonical filter values "Public"/"Private" kept). */
const UNIVERSITY_TYPE_NAMES: Record<string, Record<TargetLocale, string>> = {
  Public: { uz: "Davlat", ru: "Государственный" },
  Private: { uz: "Xususiy", ru: "Частный" },
};

export function localizeUniversityType(type: string | null | undefined, locale: Locale): string {
  if (locale === "en" || type == null || type === "") return type ?? "";
  const tl = targetLocale(locale);
  if (!tl) return type;
  // Case-insensitive: the column holds "Public"/"Private" in most rows and
  // lowercase "public"/"private" inside the generated descriptions.
  const canonical = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const hit = UNIVERSITY_TYPE_NAMES[type] ?? UNIVERSITY_TYPE_NAMES[canonical] ?? UNIVERSITY_TYPE_NAMES[keyOf(type)];
  return hit ? hit[tl] : type;
}

/* ============================================================================
 * 4. PATTERN LAYER — REQUIREMENTS TEXT
 * ========================================================================== */

/** Comma-separated requirement phrases (rows.requirements + requirement texts). */
const REQUIREMENT_PHRASES: Record<string, Record<TargetLocale, string>> = {
  "bachelor's degree": { uz: "bakalavr darajasi", ru: "степень бакалавра" },
  "bachelor degree": { uz: "bakalavr darajasi", ru: "степень бакалавра" },
  "master's degree": { uz: "magistr darajasi", ru: "степень магистра" },
  "undergraduate degree": { uz: "bakalavr darajasi", ru: "степень бакалавра" },
  "high school diploma": { uz: "o'rta maktab attestati", ru: "аттестат средней школы" },
  "strong leadership record": { uz: "kuchli liderlik tajribasi", ru: "сильный лидерский опыт" },
  "leadership experience": { uz: "liderlik tajribasi", ru: "лидерский опыт" },
  "leadership capacity": { uz: "liderlik qobiliyati", ru: "лидерские способности" },
  "3 recommendation letters": { uz: "3 ta tavsiyanoma xati", ru: "3 рекомендательных письма" },
  "2 reference letters": { uz: "2 ta tavsiyanoma xati", ru: "2 рекомендательных письма" },
  "recommendation letters": { uz: "tavsiyanoma xatlari", ru: "рекомендательные письма" },
  "essay of intent": { uz: "niyat xati (essay)", ru: "эссе о намерениях" },
  "motivation letter": { uz: "motivatsion xat", ru: "мотивационное письмо" },
  "personal statement": { uz: "shaxsiy bayonot", ru: "личное заявление" },
  "statement of purpose": { uz: "maqsad xati (SOP)", ru: "заявление о целях (SOP)" },
  "study plan": { uz: "o'quv rejasi", ru: "план обучения" },
  "research proposal": { uz: "ilmiy loyiha", ru: "исследовательское предложение" },
  "research proposal / study plan": { uz: "ilmiy loyiha / o'quv rejasi", ru: "исследовательское предложение / план обучения" },
  "cv in europass format": { uz: "Europass shaklidagi CV", ru: "CV в формате Europass" },
  "academic transcript": { uz: "akademik transkript", ru: "академическая справка" },
  "strong academic transcript": { uz: "kuchli akademik transkript", ru: "сильная академическая успеваемость" },
  "academic excellence": { uz: "akademik yutuqlar", ru: "академические успехи" },
  "outstanding intellectual ability": { uz: "ayniqsa aqliy qobiliyat", ru: "выдающиеся интеллектуальные способности" },
  "outstanding academic record": { uz: "ayniqsa yuqori akademik ko'rsatkichlar", ru: "выдающаяся академическая успеваемость" },
  "commitment to return to home country": { uz: "vatanga qaytish majburiyati", ru: "обязательство вернуться на родину" },
  "commitment to improving the lives of others": { uz: "boshqalar hayotini yaxshilashga sodiqlik", ru: "приверженность улучшению жизни других" },
  "work experience": { uz: "ish tajribasi", ru: "опыт работы" },
  "relevant professional experience": { uz: "tegishli professional tajriba", ru: "соответствующий профессиональный опыт" },
  "clear career plan": { uz: "aniq karyera rejasi", ru: "чёткий карьерный план" },
  "language proficiency": { uz: "til bilish darajasi", ru: "знание языка" },
  "english proficiency": { uz: "ingliz tili darajasi", ru: "владение английским языком" },
  "japanese language course": { uz: "yapon tili kursi", ru: "курс японского языка" },
  "school nomination required": { uz: "maktab nomzodini ko'rsatish talab qilinadi", ru: "требуется номинация школой" },
  "written exam": { uz: "yozma imtihon", ru: "письменный экзамен" },
  "interview": { uz: "suhbat", ru: "собеседование" },
  "video submission": { uz: "video taqdimoti", ru: "видеозапись" },
  "leadership essays": { uz: "liderlik esseyalari", ru: "эссе о лидерстве" },
  "financial documents": { uz: "moliyaviy hujjatlar", ru: "финансовые документы" },
  "passport copy": { uz: "pasport nusxasi", ru: "копия паспорта" },
  "application form": { uz: "ariza formasi", ru: "форма заявки" },
  "interview at the embassy": { uz: "elchixonada suhbat", ru: "собеседование в посольстве" },
  "embassy recommendation or university recommendation": {
    uz: "elchixona yoki universitet tavsiyanomasi",
    ru: "рекомендация посольства или университета",
  },
  "at least 2 years of relevant professional experience": {
    uz: "kamida 2 yillik tegishli professional tajriba",
    ru: "минимум 2 года соответствующего профессионального опыта",
  },
  "target country citizenship": { uz: "maqsadli davlat fuqaroligi", ru: "гражданство целевой страны" },
  "2+ years work experience": { uz: "2+ yillik ish tajribasi", ru: "2+ года опыта работы" },
  "undergraduate degree equivalent to uk upper second class": {
    uz: "bakalavr darajasi (UK Upper Second Class ekvivalenti)",
    ru: "степень бакалавра, эквивалентная UK Upper Second Class",
  },
  "acceptance from a uk university": { uz: "Buyuk Britaniya universitetidan qabul xati", ru: "зачисление в университет Великобритании" },
  "must apply to a full-time stanford graduate degree program concurrently": {
    uz: "Stanford universitetining kunduzgi magistratura dasturiga parallel ravishda ariza topshirish shart",
    ru: "необходимо одновременно подать заявку на очную магистерскую программу Стэнфорда",
  },
  "requires video submission and leadership essays": {
    uz: "video taqdimoti va liderlik esseyalari talab qilinadi",
    ru: "требуются видеозапись и эссе о лидерстве",
  },
  "match with cambridge program": { uz: "Cambridge dasturiga moslik", ru: "соответствие программе Кембриджа" },
  "application to u of t undergraduate program": {
    uz: "U of T bakalavriat dasturiga ariza",
    ru: "заявка на бакалавриат U of T",
  },
  "outstanding leadership traits": { uz: "ayniqsa liderlik xislatlari", ru: "выдающиеся лидерские качества" },
  "commitment to community service": { uz: "jamoat xizmatiga sodiqlik", ru: "приверженность общественной деятельности" },
};

/** Whole-row requirement string dictionary (seeded rows, exact match). */
const REQUIREMENT_FULL: Record<string, Record<TargetLocale, string>> = {
  // Unverified-award requirement placeholders.
  "Check the official programme page for current eligibility, coverage, required documents, and application dates.": {
    uz: "Joriy talablar, qamrov, kerakli hujjatlar va ariza muddatlari uchun rasmiy dastur sahifasini tekshiring.",
    ru: "Проверьте официальную страницу программы: актуальные требования, покрытие, документы и сроки подачи.",
  },
  "Confirm current eligibility, award details, country availability, and application dates with the official provider.": {
    uz: "Joriy talablar, grant shartlari, mamlakatlar ro'yxati va ariza muddatlarini rasmiy taqdim etuvchi bilan tasdiqlang.",
    ru: "Уточните актуальные требования, условия стипендии, доступные страны и сроки подачи у официального провайдера.",
  },
  "Bachelor's degree, strong leadership record, 3 recommendation letters, essay of intent, and commitment to return to home country.":
    {
      uz: "Bakalavr darajasi, kuchli liderlik tajribasi, 3 ta tavsiyanoma xati, niyat xati (essay) va vatanga qaytish majburiyati.",
      ru: "Степень бакалавра, сильный лидерский опыт, 3 рекомендательных письма, эссе о намерениях и обязательство вернуться на родину.",
    },
  "2+ years work experience, clear career plan, undergraduate degree equivalent to UK Upper Second Class, acceptance from a UK university.":
    {
      uz: "2+ yillik ish tajribasi, aniq karyera rejasi, bakalavr darajasi (UK Upper Second Class ekvivalenti), Buyuk Britaniya universitetidan qabul xati.",
      ru: "2+ года опыта работы, чёткий карьерный план, степень бакалавра (эквивалент UK Upper Second Class), зачисление в университет Великобритании.",
    },
  "At least 2 years of relevant professional experience, target country citizenship, academic excellence.":
    {
      uz: "Kamida 2 yillik tegishli professional tajriba, maqsadli davlat fuqaroligi, akademik yutuqlar.",
      ru: "Минимум 2 года соответствующего профессионального опыта, гражданство целевой страны, академические успехи.",
    },
  "Bachelor degree, strong academic transcript, motivation letter, CV in Europass format, 2 reference letters.":
    {
      uz: "Bakalavr darajasi, kuchli akademik transkript, motivatsion xat, Europass shaklidagi CV, 2 ta tavsiyanoma xati.",
      ru: "Степень бакалавра, сильная академическая успеваемость, мотивационное письмо, CV в формате Europass, 2 рекомендательных письма.",
    },
  "Must apply to a full-time Stanford graduate degree program concurrently. Requires video submission and leadership essays.":
    {
      uz: "Stanford universitetining kunduzgi magistratura dasturiga parallel ravishda ariza topshirish shart. Video taqdimoti va liderlik esseyalari talab qilinadi.",
      ru: "Необходимо одновременно подать заявку на очную магистерскую программу Стэнфорда. Требуются видеозапись и эссе о лидерстве.",
    },
  "Outstanding intellectual ability, leadership capacity, commitment to improving the lives of others, match with Cambridge program.":
    {
      uz: "Ayniqsa aqliy qobiliyat, liderlik qobiliyati, boshqalar hayotini yaxshilashga sodiqlik, Cambridge dasturiga moslik.",
      ru: "Выдающиеся интеллектуальные способности, лидерские способности, приверженность улучшению жизни других, соответствие программе Кембриджа.",
    },
  "Embassy recommendation or university recommendation, written exam & interview at Japanese embassy.":
    {
      uz: "Elchixona yoki universitet tavsiyanomasi, Yaponiya elchixonasida yozma imtihon va suhbat.",
      ru: "Рекомендация посольства или университета, письменный экзамен и собеседование в японском посольстве.",
    },
  "School nomination required, outstanding leadership traits, application to U of T undergraduate program.":
    {
      uz: "Maktab nomzodini ko'rsatish talab qilinadi, ayniqsa liderlik xislatlari, U of T bakalavriat dasturiga ariza.",
      ru: "Требуется номинация школой, выдающиеся лидерские качества, заявка на бакалавриат U of T.",
    },
};

/**
 * Requirement text localization: exact row → clause-wise phrase map → verbatim.
 * Splits on commas / "and" connectors so phrase-level matches compose.
 */
export function localizeRequirementText(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  return memoizedText("requirement-text", locale, text, () => translateRequirementText(text, locale));
}

/**
 * The description plus the fact the profile page needs: was it rendered in the
 * page language, or is it the source sentence shown as-is? Identity comparison
 * is the honest test — if the translator handed the input back unchanged, the
 * page must label it (see `SourceLanguageProse`) instead of passing English off
 * as a translation.
 */
export function universityDescriptionState(
  text: string | null | undefined,
  locale: Locale,
  qsRank: number | null = null
): { text: string; verbatim: boolean } {
  const source = reconcileEmbeddedRank(text ?? "", qsRank);
  if (locale === "en" || source.trim() === "") return { text: source, verbatim: false };
  const translated = localizeUniversityDescription(source, locale);
  return { text: translated, verbatim: translated.trim() === source.trim() };
}

/** The uncached translation — `memoizedText` remembers the result per input. */
function translateRequirementText(text: string, locale: Locale): string {
  // `text` is non-empty and `locale` is uz/ru here — the caller guarantees it.
  const tl = targetLocale(locale) ?? "uz";
  const full = REQUIREMENT_FULL[text.trim()];
  if (full) return full[tl];
  const trimmed = text.trim();
  const lower = keyOf(trimmed);
  const phrase = REQUIREMENT_PHRASES[lower];
  if (phrase) return phrase[tl];
  // Clause-wise composition: split on ", " and terminal connectors.
  if (trimmed.includes(", ")) {
    return trimmed
      .split(", ")
      .map((clause) => {
        const clauseLower = keyOf(clause);
        const hit = REQUIREMENT_PHRASES[clauseLower];
        return hit ? hit[tl] : clause;
      })
      .join(", ");
  }
  return text;

}


/* ============================================================================
 * 5. PATTERN LAYER — UNIVERSITY DESCRIPTIONS
 * ========================================================================== */

/** Spec template pattern 1 — enriched-DB "premier global research university". */
const UNI_TEMPLATE_1 =
  /premier global research university in (.+?), (.+?), (?:ranked (?:in the )?top ([\d.]+)|consistently ranked among the world's top ([\d.]+)),[\s\S]*$/i;

/** Seeded university descriptions — exact-match dictionary. */
const UNIVERSITY_DESCRIPTIONS: Record<string, Record<TargetLocale, string>> = {
  // Seeded "not verified yet" disclaimers. They are shown on every institution
  // record that has no source-verified description, so they are translated like
  // any other user-facing sentence — and they stay honest about the state.
  "Institution identity seed. Current programmes, tuition, admissions, and rankings are not source-verified.": {
    uz: "Muassasa identifikatori (boshlang'ich yozuv). Joriy dasturlar, kontrakt, qabul va reytinglar manba bilan tasdiqlanmagan.",
    ru: "Запись идентификации учреждения. Текущие программы, стоимость обучения, приём и рейтинги не подтверждены источником.",
  },
  "Institution record; current programme, cost, ranking, and admissions details are not source-verified.": {
    uz: "Muassasa yozuvi; joriy dasturlar, xarajatlar, reyting va qabul ma'lumotlari manba bilan tasdiqlanmagan.",
    ru: "Запись учреждения; текущие программы, стоимость, рейтинг и условия приёма не подтверждены источником.",
  },
  "World leader in technology, AI research, and engineering. MIT provides cutting-edge labs, startup incubators, and unmatched industry connections.":
    {
      uz: "Texnologiya, sun'iy intellekt tadqiqotlari va muhandislik bo'yicha jahon yetakchisi. MIT zamonaviy laboratoriyalar, startap inkubatorlari va tengsiz sanoat aloqalarini taqdim etadi.",
      ru: "Мировой лидер в технологиях, исследованиях ИИ и инженерии. MIT предлагает передовые лаборатории, стартап-инкубаторы и непревзойдённые связи с индустрией.",
    },
  "Historic university renowned for academic excellence, tutorial system, and world-class AI and machine learning departments.":
    {
      uz: "Akademik mukammallik, tutorial tizimi va jahon darajasidagi sun'iy intellekt va mashinali o'qitish kafedralari bilan mashhur tarixiy universitet.",
      ru: "Исторический университет, славящийся академическим превосходством, тьюторской системой и мировыми кафедрами ИИ и машинного обучения.",
    },
  "Europe's leading technical university with virtually free/low tuition, top European industry partnerships (BMW, Siemens, Google Munich), and English-taught Master's.":
    {
      uz: "Yevropaning yetakchi texnik universiteti: deyarli bepul/past kontrakt, yevropa sanoatining yetakchi hamkorlari (BMW, Siemens, Google Munich) va ingliz tilida o'qitiladigan magistratura dasturlari.",
      ru: "Ведущий технический университет Европы: практически бесплатное/недорогое обучение, ведущие европейские индустриальные партнёры (BMW, Siemens, Google Munich) и магистратура на английском.",
    },
  "Canada's top research university offering PGWP up to 3 years, direct pathways to Canadian Permanent Residency, and premier Vector Institute AI partnerships.":
    {
      uz: "Kanadaning yetakchi tadqiqot universiteti: 3 yilgacha PGWP vizasi, Kanada doimiy yashash huquqiga to'g'ridan-to'g'ri yo'llar va Vector Institute bilan sun'iy intellekt sohasidagi yetakchi hamkorlik.",
      ru: "Ведущий исследовательский университет Канады: PGWP до 3 лет, прямые пути к канадскому ПМЖ и партнёрства с Vector Institute в сфере ИИ.",
    },
  "Asia's premier university located in global financial and technological center with Service Obligation tuition subsidies for international students.":
    {
      uz: "Osiyoning yetakchi universiteti — global moliyaviy va texnologik markazda joylashgan, xalqaro talabalar uchun Service Obligation kontrakt subsidiyalari bilan.",
      ru: "Ведущий университет Азии — в глобальном финансовом и технологическом центре, с субсидиями на обучение по программе Service Obligation для иностранных студентов.",
    },
  "World-class STEM institution with affordable tuition fees, home to Einstein, and unparalleled research in robotics, quantum computing, and AI.":
    {
      uz: "Maqbul kontraktli jahon darajasidagi STEM muassasasi — Eynshteyn maskani, robototexnika, kvant hisoblash va sun'iy intellekt sohasidagi tengsiz tadqiqotlar bilan.",
      ru: "Ведущий мировой STEM-вуз с доступной стоимостью обучения, alma-матер Эйнштейна и непревзойдёнными исследованиями в робототехнике, квантовых вычислениях и ИИ.",
    },
  "Australia's top university located in one of the world's most liveable cities, offering generous post-study work rights and regional migration bonuses.":
    {
      uz: "Avstraliyaning yetakchi universiteti — dunyoning eng qulay shaharlaridan birida joylashgan, keng imtiyozli ish huquqlari va mintaqaviy migratsiya bonuslarini taklif etadi.",
      ru: "Ведущий университет Австралии — в одном из самых комфортных городов мира, с широкими правами на работу после учёбы и региональными миграционными бонусами.",
    },
  "Silicon Valley's powerhouse university. Unrivaled ecosystem for venture capital, technology commercialization, AI breakthrough labs, and founders.":
    {
      uz: "Silicon Valley'ning kuchli universiteti. Venchur kapital, texnologiyalarni tijoratlashtirish, sun'iy intellekt yutuq laboratoriyalari va asoschilar uchun tengsiz ekotizim.",
      ru: "Мощный университет Силиконовой долины. Непревзойдённая экосистема для венчурного капитала, коммерциализации технологий, прорывных ИИ-лабораторий и основателей.",
    },
  "Premier West Coast Canadian university surrounded by mountains and sea, renowned for sustainability, health tech, and AI co-op programs.":
    {
      uz: "Tog' va dengiz bilan o'ralgan Kanada G'arbiy sohilining yetakchi universiteti — barqarorlik, salomatlik texnologiyalari va sun'iy intellekt co-op dasturlari bilan mashhur.",
      ru: "Ведущий университет западного побережья Канады, окружённый горами и морем, известный проектами устойчивого развития, health tech и кооперативными программами ИИ.",
    },
  "Netherlands' largest technical university with outstanding English-taught Master's degrees, high graduate employability, and 1-year Orientation Year visa.":
    {
      uz: "Niderlandiyaning eng yirik texnik universiteti — a'lo ingliz tilidagi magistratura darajalari, yuqori ish bilan ta'minlanish va 1 yillik Orientation Year vizasi bilan.",
      ru: "Крупнейший технический университет Нидерландов — превосходные магистерские программы на английском, высокая трудоустроенность и виза Orientation Year на 1 год.",
    },
  "STEM and business focused top global university in central London, famous for algorithmic trading, bio-engineering, and deeptech ventures.":
    {
      uz: "London markazidagi STEM va biznesga ixtisoslashgan yetakchi global universitet — algoritmik savdo, bio-muhandislik va deeptech startaplari bilan mashhur.",
      ru: "Ведущий глобальный университет в центре Лондона с фокусом на STEM и бизнес, славящийся алгоритмическим трейдингом, биоинженерией и deeptech-стартапами.",
    },
  "Japan's flagship university offering fully English-taught degree tracks (PEAK and USTEP) with government MEXT full scholarships available.":
    {
      uz: "Yaponiyaning flagman universiteti — to'liq ingliz tilidagi daraja yo'nalishlari (PEAK va USTEP), davlat MEXT to'liq stipendiyalari mavjud.",
      ru: "Флагманский университет Японии — полностью англоязычные образовательные треки (PEAK и USTEP) с доступными полными государственными стипендиями MEXT.",
    },
};

export function localizeUniversityDescription(
  text: string | null | undefined,
  locale: Locale,
  qsRank: number | null = null
): string {
  // The stored sentence may carry an out-of-date QS number; the catalogue's
  // verified rank wins before anything is rendered or translated, so `en` is
  // corrected too and the memo key is the corrected sentence.
  const source = reconcileEmbeddedRank(text ?? "", qsRank);
  if (locale === "en" || source === "") return source;
  const tl = targetLocale(locale);
  if (!tl) return source;
  return memoizedText("university-description", locale, source, () => translateUniversityDescription(source, locale));
}

/** The uncached translation — `memoizedText` remembers the result per input. */
function translateUniversityDescription(text: string, locale: Locale): string {
  // `text` is non-empty and `locale` is uz/ru here — the caller guarantees it.
  const tl = targetLocale(locale) ?? "uz";
  const exact = UNIVERSITY_DESCRIPTIONS[text.trim()];
  if (exact) return exact[tl];
  // The two shapes the live catalogue actually stores (194 + 154 of 356 rows).
  // `localizeUniversityNarrative` returns the source text when it cannot render
  // every segment, which keeps the rule "clean or verbatim".
  const narrative = localizeUniversityNarrative(text, locale);
  if (!narrative.verbatim) return narrative.text;
  // Template 1 — "premier global research university in {city}, {country}, ...".
  const m = text.match(UNI_TEMPLATE_1);
  if (m) {
    const city = localizeCity(m[1], locale);
    const country = localizeCountry(m[2], locale);
    const rank = m[3] ?? m[4] ?? "";
    if (tl === "uz") {
      return `${city}, ${country} shahridagi nufuzli global tadqiqot universiteti — ${rank} o'rinlar qatorida; keng qamrovli global hamkorlik va akademik mukammallik markazi.`;
    }
    return `Престижный глобальный исследовательский университет в городе ${city}, ${country} — в топ-${rank}; центр всеобъемлющего глобального партнёрства и академического превосходства.`;
  }
  return text;

}


/* ============================================================================
 * 6. DICTIONARY + PATTERN LAYER — HIGHLIGHTS
 * ========================================================================== */

const HIGHLIGHT_BADGES: Record<string, Record<TargetLocale, string>> = {
  "18-Month Post-Study Job Seeker Visa": { uz: "O'qishdan keyingi 18 oylik ish qidiruv vizasi", ru: "18-месячная виза поиска работы после учёбы" },
  "2-Year UK Graduate Visa": { uz: "2 yillik Buyuk Britaniya Graduate vizasi", ru: "2-летняя виза выпускника Великобритании" },
  "3 to 4-Year Temporary Graduate Visa": { uz: "3-4 yillik vaqtinchalik Graduate vizasi", ru: "3–4-летняя временная виза выпускника" },
  "3-Year PGWP Work Visa": { uz: "3 yillik PGWP ish vizasi", ru: "3-летняя рабочая виза PGWP" },
  "3-Year Post-Graduation Work Permit (PGWP)": { uz: "3 yillik bitiruvdan keyingi ish ruxsatnomasi (PGWP)", ru: "3-летнее послевузовское разрешение на работу (PGWP)" },
  "3-Year STEM OPT": { uz: "3 yillik STEM OPT", ru: "3-летний STEM OPT" },
  "OPT STEM 3-Year Extension": { uz: "OPT STEM 3 yillik uzaytirish", ru: "3-летнее продление OPT STEM" },
  "Asia #1 University": { uz: "Osiyo #1 universiteti", ru: "Университет №1 в Азии" },
  "World #1 CS Program": { uz: "Dunyo #1 Informatika dasturi", ru: "Программа №1 в мире по информатике" },
  "Top 10 Global Ranking": { uz: "Global reytingda Top 10", ru: "Топ-10 мирового рейтинга" },
  "CSAIL Research Lab": { uz: "CSAIL tadqiqot laboratoriyasi", ru: "Исследовательская лаборатория CSAIL" },
  "Central London Tech Corridor": { uz: "Markaziy London texnologiya koridori", ru: "Технологический коридор центрального Лондона" },
  "Co-op Internship Options": { uz: "Co-op amaliyot imkoniyatlari", ru: "Варианты кооперативной практики" },
  "College Tutorial System": { uz: "Kollej tutorial tizimi", ru: "Тьюторская система колледжа" },
  "DAAD Eligible": { uz: "DAAD uchun mos", ru: "Подходит для DAAD" },
  "DeepMind Chair Hub": { uz: "DeepMind kafedra markazi", ru: "Центр кафедры DeepMind" },
  "Dutch Orientation Year Visa": { uz: "Gollandiya Orientation Year vizasi", ru: "Голландская виза Orientation Year" },
  "EU Tech Innovation Hub": { uz: "YE texnologik innovatsiya markazi", ru: "Технологический инновационный хаб ЕС" },
  "Excellence Scholarship & Opportunity Program": { uz: "Mukammallik stipendiyasi va imkoniyatlar dasturi", ru: "Программа стипендий и возможностей «Превосходство»" },
  "Express Entry PR Bonus Points": { uz: "Express Entry PR bonus ballari", ru: "Бонусные баллы ПМЖ Express Entry" },
  "Fast-track Japan PR": { uz: "Tezkor Yaponiya PR yo'li", ru: "Ускоренный путь к ПМЖ Японии" },
  "Generous Merit Scholarships": { uz: "Saxiy yutuqlar stipendiyalari", ru: "Щедрые стипендии за успехи" },
  "Generous Need-Blind Aid": { uz: "Saxiy ehtiyojga bog'liq bo'lmagan yordam", ru: "Щедрая помощь без учёта потребности" },
  "Global Fintech & Tech Hub": { uz: "Global fintex va texnologiya markazi", ru: "Глобальный финтех и тех-хаб" },
  "High English Proficiency Environment": { uz: "Ingliz tili muhiti yuqori darajada", ru: "Высокий уровень среды английского языка" },
  "High Quality of Life": { uz: "Yuqori hayot sifati", ru: "Высокое качество жизни" },
  "International Leader Award": { uz: "Xalqaro lider mukofoti", ru: "Международная награда лидеру" },
  "Knight-Hennessy Scholars Program": { uz: "Knight-Hennessy Scholars dasturi", ru: "Программа Knight-Hennessy Scholars" },
  "Low Tuition (~$5.2k)": { uz: "Past kontrakt (~$5,2 ming)", ru: "Низкая оплата (~$5,2 тыс.)" },
  "Low Tuition Fees (~$1.8k/yr)": { uz: "Past kontrakt (~yiliga $1,8 ming)", ru: "Низкая оплата (~$1,8 тыс./год)" },
  "Ultra Low Tuition Fees": { uz: "Juda past kontrakt", ru: "Очень низкая оплата обучения" },
  "MEXT Full Embassy Scholarship": { uz: "MEXT to'liq elchixona stipendiyasi", ru: "Полная стипендия посольства MEXT" },
  "MOE Tuition Grant Subsidy": { uz: "MOE kontrakt grant subsidiyasi", ru: "Субсидия гранта на обучение MOE" },
  "Melbourne Tech Hub": { uz: "Melburn texnologiya markazi", ru: "Технологический хаб Мельбурна" },
  "Pioneer AI Research": { uz: "Pioner sun'iy intellekt tadqiqotlari", ru: "Пионерские исследования ИИ" },
  "President's PhD Scholarships": { uz: "Prezident PhD stipendiyalari", ru: "Президентские стипендии PhD" },
  "Rhodes & Clarendon Scholarships": { uz: "Rhodes va Clarendon stipendiyalari", ru: "Стипендии Rhodes и Clarendon" },
  "Robotics Capital of the World": { uz: "Dunyo robototexnika poytaxti", ru: "Мировая столица робототехники" },
  "SINGA Scholarship Target": { uz: "SINGA stipendiyasi maqsadi", ru: "Цель стипендии SINGA" },
  "Scenic Campus": { uz: "Manzarali kampus", ru: "Живописный кампус" },
  "Silicon Valley Venture Access": { uz: "Silicon Valley venchur kirish imkoniyati", ru: "Доступ к венчурному капиталу Силиконовой долины" },
  "Strong FinTech Network": { uz: "Kuchli fintex tarmog'i", ru: "Сильная финтех-сеть" },
  "Strong Tech Ecosystem": { uz: "Kuchli texnologik ekotizim", ru: "Сильная технологическая экосистема" },
  "TU Delft Excellence Scholarship": { uz: "TU Delft mukammallik stipendiyasi", ru: "Стипендия «Превосходство» TU Delft" },
  "Vancouver Tech Hub": { uz: "Vankuver texnologiya markazi", ru: "Технологический хаб Ванкувера" },
  "Vector Institute AI Hub": { uz: "Vector Institute sun'iy intellekt markazi", ru: "ИИ-хаб Vector Institute" },
  "World-class Labs": { uz: "Jahon darajasidagi laboratoriyalar", ru: "Лаборатории мирового уровня" },
};

const HIGHLIGHT_TITLE_WORDS: Record<string, Record<TargetLocale, string>> = {
  ranking: { uz: "Reyting", ru: "Рейтинг" },
  rankingbadge: { uz: "Reyting", ru: "Рейтинг" },
  scholarship: { uz: "Stipendiya", ru: "Стипендия" },
  scholarshipbadge: { uz: "Stipendiya", ru: "Стипендия" },
  research: { uz: "Tadqiqot", ru: "Исследования" },
  researchexcellence: { uz: "Tadqiqot mukammalligi", ru: "Исследовательское превосходство" },
  academicleadership: { uz: "Akademik yetakchilik", ru: "Академическое лидерство" },
  location: { uz: "Joylashuv", ru: "Расположение" },
  locationperk: { uz: "Joylashuv afzalligi", ru: "Преимущество расположения" },
  career: { uz: "Karyera", ru: "Карьера" },
  careeradvantage: { uz: "Karyera afzalligi", ru: "Карьерное преимущество" },
  academicquality: { uz: "Akademik sifat", ru: "Академическое качество" },
  costadvantage: { uz: "Narx afzalligi", ru: "Преимущество по стоимости" },
  workvisa: { uz: "Ish vizasi", ru: "Рабочая виза" },
  innovation: { uz: "Innovatsiya", ru: "Инновации" },
  industrylink: { uz: "Sanoat aloqasi", ru: "Связь с индустрией" },
  globalpartnership: { uz: "Global hamkorlik", ru: "Глобальное партнёрство" },
  network: { uz: "Tarmoq", ru: "Сеть" },
};

const HIGHLIGHT_PHRASES: Array<[RegExp, Record<TargetLocale, string>]> = [
  [/\bfull-time\b/g, { uz: "kunduzgi", ru: "очная" }],
  [/\bpost-study\b/g, { uz: "o'qishdan keyingi", ru: "после учёбы" }],
  [/\bwork visa\b/gi, { uz: "ish vizasi", ru: "рабочая виза" }],
  [/\bwork permit\b/gi, { uz: "ish ruxsatnomasi", ru: "разрешение на работу" }],
  [/\bjob seeker\b/gi, { uz: "ish qidiruvchi", ru: "поиск работы" }],
  [/\bscholarship\b/gi, { uz: "stipendiya", ru: "стипендия" }],
  [/\bscholarships\b/gi, { uz: "stipendiyalar", ru: "стипендии" }],
  [/\btuition fees?\b/gi, { uz: "kontrakt to'lovi", ru: "оплата обучения" }],
  [/\bgraduate visa\b/gi, { uz: "graduate vizasi", ru: "виза выпускника" }],
  [/\bresearch lab\b/gi, { uz: "tadqiqot laboratoriyasi", ru: "исследовательская лаборатория" }],
  [/\bresearch\b/gi, { uz: "tadqiqot", ru: "исследование" }],
  [/\btech hub\b/gi, { uz: "texnologiya markazi", ru: "технологический хаб" }],
  [/\bventure access\b/gi, { uz: "venchur imkoniyati", ru: "доступ к венчурному капиталу" }],
  [/\bnetwork\b/gi, { uz: "tarmog'i", ru: "сеть" }],
  [/\becosystem\b/gi, { uz: "ekotizimi", ru: "экосистема" }],
  [/\bcapital of the world\b/gi, { uz: "jahon poytaxti", ru: "мировая столица" }],
  [/\blabs\b/gi, { uz: "laboratoriyalar", ru: "лаборатории" }],
  [/\bquality of life\b/gi, { uz: "hayot sifati", ru: "качество жизни" }],
  [/\bcampus\b/gi, { uz: "kampus", ru: "кампус" }],
  [/\bco-op\b/gi, { uz: "co-op", ru: "кооперативная" }],
  [/\binternship options\b/gi, { uz: "amaliyot imkoniyatlari", ru: "варианты стажировок" }],
  [/\benvironment\b/gi, { uz: "muhit", ru: "среда" }],
  [/\bproficiency\b/gi, { uz: "bilish darajasi", ru: "владение" }],
  [/\benglish\b/gi, { uz: "ingliz tili", ru: "английского языка" }],
  [/\binternational\b/gi, { uz: "xalqaro", ru: "международный" }],
  [/\bleader\b/gi, { uz: "lider", ru: "лидер" }],
  [/\baward\b/gi, { uz: "mukofot", ru: "награда" }],
  [/\bbonus points\b/gi, { uz: "bonus ballari", ru: "бонусные баллы" }],
  [/\bpoints\b/gi, { uz: "ballari", ru: "баллы" }],
  [/\bhigh\b/gi, { uz: "yuqori", ru: "высокий" }],
  [/\blow\b/gi, { uz: "past", ru: "низкий" }],
  [/\bworld-class\b/gi, { uz: "jahon darajasidagi", ru: "мирового уровня" }],
  [/\bglobal\b/gi, { uz: "global", ru: "глобальный" }],
  [/\bstrong\b/gi, { uz: "kuchli", ru: "сильный" }],
  [/\bgenerous\b/gi, { uz: "saxiy", ru: "щедрый" }],
  [/\binnovation\b/gi, { uz: "innovatsiya", ru: "инновация" }],
  [/\bpartnership\b/gi, { uz: "hamkorlik", ru: "партнёрство" }],
  [/\bprogram\b/gi, { uz: "dasturi", ru: "программа" }],
  [/\bhub\b/gi, { uz: "markazi", ru: "хаб" }],
  [/\bfast-track\b/gi, { uz: "tezkor", ru: "ускоренный" }],
  [/\byear\b/gi, { uz: "yillik", ru: "годовая" }],
  [/\byears\b/gi, { uz: "yillik", ru: "летняя" }],
  [/\bmonth\b/gi, { uz: "oylik", ru: "месячная" }],
  [/\bextension\b/gi, { uz: "uzaytirish", ru: "продление" }],
  [/\bsubsidy\b/gi, { uz: "subsidya", ru: "субсидия" }],
  [/\bgrant\b/gi, { uz: "grant", ru: "грант" }],
  [/\beligible\b/gi, { uz: "uchun mos", ru: "подходит" }],
  [/\btarget\b/gi, { uz: "maqsad", ru: "цель" }],
];

function localizeDynamicHighlight(text: string, locale: Locale, tl: TargetLocale): string | null {
  const ranking = text.match(/^QS World University Ranking #(\d+) globally$/i);
  if (ranking) {
    return tl === "uz"
      ? `QS jahon reytingida #${ranking[1]}-o'rin`
      : `№${ranking[1]} в мировом рейтинге QS`;
  }

  // "Located in Cambridge, MA, United States (Founded 1861)". The place has
  // three parts, not two: the old parser read "MA" as the country and glued a
  // locative onto it ("United Statesda"), and the city dictionary supplied a
  // misspelling ("Kembridge"). A labelled field avoids the grammar entirely.
  const location = text.match(/^Located in (.+?)(?:\s*\(Founded (\d{4})\))?$/i);
  if (location) {
    const parts = location[1].split(",").map((p) => p.trim()).filter(Boolean);
    const countryRaw = parts.length > 1 ? parts[parts.length - 1] : "";
    const cityRaw = parts.slice(0, Math.max(1, parts.length - 1)).join(", ");
    const city = localizeCity(cityRaw, locale) || cityRaw;
    const country = countryRaw ? localizeCountry(countryRaw, locale) || countryRaw : "";
    const place = [city, country].filter(Boolean).join(", ");
    const year = location[2];
    if (tl === "uz") {
      return `Joylashuvi: ${place}${year ? ` (${year}-yilda tashkil etilgan)` : ""}`;
    }
    return `Расположение: ${place}${year ? ` (основан в ${year} г.)` : ""}`;
  }

  // "Post-study work visa opportunity: 3 year(s)".
  const visa = text.match(/^Post-study work visa opportunity:\s*([\d.]+)\s*year\(s\)$/i);
  if (visa) {
    return tl === "uz"
      ? `O'qishdan keyin ishlash vizasi: ${visa[1]} yilgacha`
      : `Виза для работы после учёбы: до ${visa[1]} лет`;
  }

  // "Comprehensive undergraduate, master's, and doctoral research programs".
  if (/^Comprehensive undergraduate, master's, and doctoral research programs$/i.test(text)) {
    return tl === "uz"
      ? "Bakalavriat, magistratura va doktorantura bo'yicha keng qamrovli ilmiy dasturlar"
      : "Полный спектр программ: бакалавриат, магистратура и докторантура";
  }

  // "Uzbek applicants guide: United States Top-10 #1".
  const guide = text.match(/^Uzbek applicants guide:\s*(.+?)\s+Top-10\s+#?(\d+)$/i);
  if (guide) {
    const country = localizeCountry(guide[1].trim(), locale) || guide[1].trim();
    return tl === "uz"
      ? `O'zbekistonlik abituriyentlar uchun qo'llanma: ${country} Top-10 #${guide[2]}`
      : `Справочник для абитуриентов из Узбекистана: ${country} Top-10 #${guide[2]}`;
  }

  const international = text.match(/^(\d+(?:\.\d+)?)%\s+international student body$/i);
  if (international) {
    return tl === "uz"
      ? `${international[1]}% xalqaro talabalar ulushi`
      : `${international[1]}% иностранных студентов`;
  }
  return null;
}

const HIGHLIGHT_TITLE_MAP: Record<string, Record<TargetLocale, string>> = {
  Ranking: { uz: "Reyting", ru: "Рейтинг" },
  "Ranking Badge": { uz: "Reyting", ru: "Рейтинг" },
  Scholarship: { uz: "Stipendiya", ru: "Стипендия" },
  "Scholarship Badge": { uz: "Stipendiya", ru: "Стипендия" },
  Research: { uz: "Tadqiqot", ru: "Исследования" },
  "Research Excellence": { uz: "Tadqiqot mukammalligi", ru: "Исследовательское превосходство" },
  "Academic Leadership": { uz: "Akademik yetakchilik", ru: "Академическое лидерство" },
  Location: { uz: "Joylashuv", ru: "Расположение" },
  "Location Perk": { uz: "Joylashuv afzalligi", ru: "Преимущество расположения" },
  Career: { uz: "Karyera", ru: "Карьера" },
  "Career Advantage": { uz: "Karyera afzalligi", ru: "Карьерное преимущество" },
  "Academic Quality": { uz: "Akademik sifat", ru: "Академическое качество" },
  "Cost Advantage": { uz: "Narx afzalligi", ru: "Преимущество по стоимости" },
  "Work Visa": { uz: "Ish vizasi", ru: "Рабочая виза" },
  Innovation: { uz: "Innovatsiya", ru: "Инновации" },
  "Industry Link": { uz: "Sanoat aloqasi", ru: "Связь с индустрией" },
  "Global Partnership": { uz: "Global hamkorlik", ru: "Глобальное партнёрство" },
  Network: { uz: "Tarmoq", ru: "Сеть" },
};

/** Localize one highlight — `{title, text}` object or plain string badge. */
export function localizeHighlightItem<T>(item: T, locale: Locale, qsRank: number | null = null): T {
  // The ranking chip carries the same out-of-date number as the description, so
  // the catalogue's verified rank is applied before the (locale-aware) layers
  // below — and before the `en` shortcut, because the English page shows the
  // same chip.
  const reconciled: T =
    typeof item === "string"
      ? (reconcileEmbeddedRank(item, qsRank) as unknown as T)
      : item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"
        ? ({ ...(item as object), text: reconcileEmbeddedRank((item as unknown as { text: string }).text, qsRank) } as T)
        : item;
  item = reconciled;
  if (locale === "en") return item;
  const tl = targetLocale(locale);
  if (!tl) return item;
  if (typeof item === "string") {
    const exact = HIGHLIGHT_BADGES[item.trim()];
    if (exact) return exact[tl] as unknown as T;
    const dynamic = localizeDynamicHighlight(item, locale, tl);
    if (dynamic) return dynamic as unknown as T;
    // Pattern layer for unknown badges — phrase substitutions, all or nothing.
    // The layer only counts as a translation when the phrases account for the
    // WHOLE badge: if any English words are left over the original is returned
    // untouched, because "stipendiya: MIT Need-Based Aid - Full Ride (100%
    // Demonstrated Need: …) [Yes]" is worse than the English it replaced — the
    // page labels a source-language line, it cannot un-label a mangled one.
    let out: string = item;
    let residue: string = item;
    for (const [pattern, translations] of HIGHLIGHT_PHRASES) {
      if (item.search(pattern) === -1) continue;
      out = out.replace(new RegExp(pattern.source, pattern.flags), translations[tl]);
      residue = residue.replace(new RegExp(pattern.source, pattern.flags), "");
    }
    return (/[A-Za-z]/.test(residue) ? item : out) as unknown as T;
  }
  if (item && typeof item === "object") {
    const rec = item as { title?: string; text?: string };
    const title = rec.title;
    const text = rec.text;
    let newTitle = title;
    let newText = text;
    if (typeof title === "string") {
      const hit = HIGHLIGHT_TITLE_MAP[title.trim()] ?? HIGHLIGHT_TITLE_WORDS[keyOf(title.replace(/[^a-z]+/gi, ""))];
      if (hit) newTitle = hit[tl];
    }
    if (typeof text === "string") {
      const badge = HIGHLIGHT_BADGES[text.trim()];
      if (badge) {
        newText = badge[tl];
      } else {
        const dynamic = localizeDynamicHighlight(text, locale, tl);
        if (dynamic) {
          newText = dynamic;
        } else {
          let out = text;
          let residue = text;
          for (const [pattern, translations] of HIGHLIGHT_PHRASES) {
            if (text.search(pattern) === -1) continue;
            out = out.replace(new RegExp(pattern.source, pattern.flags), translations[tl]);
            residue = residue.replace(new RegExp(pattern.source, pattern.flags), "");
          }
          newText = /[A-Za-z]/.test(residue) ? text : out;
        }
      }
    }
    if (newTitle !== title || newText !== text) {
      return { ...item, title: newTitle, text: newText } as T;
    }
  }
  return item;
}

/**
 * Localize a `highlights` value: a JSON-array string (DB `text` column), a
 * parsed array, or NULL. NULL and unrecognized shapes pass through untouched.
 */
export function localizeHighlights<T extends string | unknown[] | null | undefined>(
  highlights: T,
  locale: Locale,
  qsRank: number | null = null
): T {
  const tl = targetLocale(locale);
  // `en` is normally a no-op, but a corrected rank still has to reach the chips
  // the English page prints — the same stale number is on it.
  if (!tl && qsRank == null) return highlights;
  if (typeof highlights === "string") {
    return mapJsonStringArray(highlights, (item) => localizeHighlightItem(item, locale, qsRank)) as T;
  }
  if (Array.isArray(highlights)) {
    return highlights.map((item) => localizeHighlightItem(item, locale, qsRank)) as T;
  }
  return highlights;
}

/* ============================================================================
 * 7. PATTERN LAYER — PROGRAM NAMES
 * ========================================================================== */

/**
 * Phase T (2026-10-30). The live catalogue has 1138 distinct programme titles
 * built from a small, stable grammar: a degree token (`BSc`, `LLM`, `Master of
 * Engineering`, `MB BChir`) followed by a field, usually with `in`/`of`, often
 * with a parenthetical that is a business school, an abbreviation, an honours
 * marker or a taught language. The parser below handles that grammar
 * compositionally; when a title does not decompose it returns the ORIGINAL
 * title verbatim rather than emitting a half-English hybrid.
 */

type DegreeKind =
  | "bsc"
  | "ba"
  | "beng"
  | "bba"
  | "bcom"
  | "bdes"
  | "bfa"
  | "bmus"
  | "btech"
  | "bvsc"
  | "bss"
  | "llb"
  | "mbbs"
  | "mbchir"
  | "bds"
  | "md"
  | "jd"
  | "dvm"
  | "pharmd"
  | "msc"
  | "ma"
  | "meng"
  | "mba"
  | "mpa"
  | "mph"
  | "mfa"
  | "med"
  | "mphil"
  | "mres"
  | "llm"
  | "mle"
  | "phd"
  | "edd"
  | "generic-bachelor"
  | "generic-master"
  | "generic-doctor";

/**
 * Degree tokens, LONGEST FIRST. Every token the live catalogue uses is listed
 * explicitly; the generic `Bachelor`/`Master`/`Doctor` entries catch the rest
 * (`Bachelor of Design in Animation`, `Master of Land Economy`).
 */
const DEGREE_TOKENS: Array<{ re: RegExp; kind: DegreeKind; subjectGroup?: number }> = [
  // Long forms that imply a specific degree.
  { re: /^Bachelor of Business Administration\b/i, kind: "bba" },
  { re: /^Bachelor of Science\b/i, kind: "bsc" },
  { re: /^Bachelor of Engineering\b/i, kind: "beng" },
  { re: /^Bachelor of Design\b/i, kind: "bdes" },
  { re: /^Bachelor of Fine Arts\b/i, kind: "bfa" },
  { re: /^Bachelor of Laws?\b/i, kind: "llb" },
  { re: /^Bachelor of Medicine\b/i, kind: "mbbs" },
  { re: /^Bachelor of Music\b/i, kind: "bmus" },
  { re: /^Bachelor of Technology\b/i, kind: "btech" },
  { re: /^Bachelor of Veterinary Science\b/i, kind: "bvsc" },
  { re: /^Bachelor of Business\b/i, kind: "bba" },
  { re: /^Master of Business Administration\b/i, kind: "mba" },
  { re: /^Master of Public Administration\b/i, kind: "mpa" },
  { re: /^Master of Public Health\b/i, kind: "mph" },
  { re: /^Master of Laws\b/i, kind: "llm" },
  { re: /^Master of Engineering\b/i, kind: "meng" },
  { re: /^Master of Science\b/i, kind: "msc" },
  { re: /^Master of Arts\b/i, kind: "ma" },
  { re: /^Master of Education\b/i, kind: "med" },
  { re: /^Master of Fine Arts\b/i, kind: "mfa" },
  { re: /^Master of Philosophy\b/i, kind: "mphil" },
  { re: /^Master of Research\b/i, kind: "mres" },
  { re: /^Master of Land Economy\b/i, kind: "mle" },
  { re: /^Master of (Business|Finance|Management|Information Technology|IT)\b/i, kind: "generic-master", subjectGroup: 1 },
  { re: /^Bachelor of (Finance|Commerce|Management)\b/i, kind: "generic-bachelor", subjectGroup: 1 },
  { re: /^Doctor of Philosophy\b/i, kind: "phd" },
  { re: /^Doctor of Medicine\b/i, kind: "md" },
  { re: /^Doctor of Education\b/i, kind: "edd" },
  { re: /^Doctor of Veterinary Medicine\b/i, kind: "dvm" },
  { re: /^Doctor of Pharmacy\b/i, kind: "pharmd" },
  // Generic long forms — the field follows (`Bachelor of Design in Animation`).
  { re: /^Bachelor\b/i, kind: "generic-bachelor" },
  { re: /^Master\b/i, kind: "generic-master" },
  { re: /^Doctor\b/i, kind: "generic-doctor" },
  // Abbreviations — longest first, word-boundary safe.
  { re: /^MB\s?BChir\b/i, kind: "mbchir" },
  { re: /^MBBS\b/i, kind: "mbbs" },
  { re: /^MPhil\b/i, kind: "mphil" },
  { re: /^MRes\b/i, kind: "mres" },
  { re: /^PharmD\b/i, kind: "pharmd" },
  { re: /^BTech\b/i, kind: "btech" },
  { re: /^BVSc\b/i, kind: "bvsc" },
  { re: /^BEng\b/i, kind: "beng" },
  { re: /^BDes\b/i, kind: "bdes" },
  { re: /^BMus\b/i, kind: "bmus" },
  { re: /^BCom\b/i, kind: "bcom" },
  { re: /^BBA\b/i, kind: "bba" },
  { re: /^BFA\b/i, kind: "bfa" },
  { re: /^BSS\b/i, kind: "bss" },
  { re: /^BSc\b/i, kind: "bsc" },
  { re: /^BDS\b/i, kind: "bds" },
  { re: /^LL\.?M\b/i, kind: "llm" },
  { re: /^LL\.?B\b/i, kind: "llb" },
  { re: /^MBA\b/i, kind: "mba" },
  { re: /^MPA\b/i, kind: "mpa" },
  { re: /^MPH\b/i, kind: "mph" },
  { re: /^MEng\b/i, kind: "meng" },
  { re: /^MEd\b/i, kind: "med" },
  { re: /^MFA\b/i, kind: "mfa" },
  { re: /^MSc\b/i, kind: "msc" },
  { re: /^MLE\b/i, kind: "mle" },
  { re: /^DPhil\b/i, kind: "phd" },
  { re: /^PhD\b/i, kind: "phd" },
  { re: /^EdD\b/i, kind: "edd" },
  { re: /^DVM\b/i, kind: "dvm" },
  { re: /^JD\b/, kind: "jd" },
  { re: /^MD\b/, kind: "md" },
  { re: /^MA\b/, kind: "ma" },
  { re: /^MS\b/, kind: "msc" },
  { re: /^BS\b/, kind: "bsc" },
  { re: /^BA\b/, kind: "ba" },
  // Foreign-language degree words the catalogue carries (`Licenciatura en
  // Economía`). The original token is kept inside the label, never dropped.
  { re: /^Licenciatura\b/i, kind: "generic-bachelor" },
  { re: /^Ingenier[ií]a\b/i, kind: "beng" },
];

/** Degree display labels — the acronym stays visible in every locale. */
const DEGREE_LABELS: Record<DegreeKind, Record<TargetLocale, string>> = {
  bsc: { uz: "bakalavr (BSc)", ru: "бакалавр наук (BSc)" },
  ba: { uz: "bakalavr (BA)", ru: "бакалавр гуманитарных наук (BA)" },
  beng: { uz: "muhandislik bakalavri (BEng)", ru: "бакалавр инженерии (BEng)" },
  bba: { uz: "biznes boshqaruvi bakalavri (BBA)", ru: "бакалавр бизнеса (BBA)" },
  bcom: { uz: "tijorat bakalavri (BCom)", ru: "бакалавр коммерции (BCom)" },
  bdes: { uz: "dizayn bakalavri (BDes)", ru: "бакалавр дизайна (BDes)" },
  bfa: { uz: "tasviriy san'at bakalavri (BFA)", ru: "бакалавр искусств (BFA)" },
  bmus: { uz: "musiqa bakalavri (BMus)", ru: "бакалавр музыки (BMus)" },
  btech: { uz: "texnologiya bakalavri (BTech)", ru: "бакалавр технологий (BTech)" },
  bvsc: { uz: "veterinariya bakalavri (BVSc)", ru: "бакалавр ветеринарии (BVSc)" },
  bss: { uz: "ijtimoiy fanlar bakalavri (BSS)", ru: "бакалавр социальных наук (BSS)" },
  llb: { uz: "huquq bakalavri (LLB)", ru: "бакалавр права (LLB)" },
  mbbs: { uz: "tibbiyot bakalavri (MBBS)", ru: "бакалавр медицины (MBBS)" },
  mbchir: { uz: "tibbiyot va jarrohlik bakalavri (MB BChir)", ru: "бакалавр медицины и хирургии (MB BChir)" },
  bds: { uz: "stomatologiya bakalavri (BDS)", ru: "бакалавр стоматологии (BDS)" },
  md: { uz: "tibbiyot doktori (MD)", ru: "доктор медицины (MD)" },
  jd: { uz: "huquq doktori (JD)", ru: "доктор права (JD)" },
  dvm: { uz: "veterinariya doktori (DVM)", ru: "доктор ветеринарии (DVM)" },
  pharmd: { uz: "farmatsiya doktori (PharmD)", ru: "доктор фармации (PharmD)" },
  msc: { uz: "magistr (MSc)", ru: "магистр наук (MSc)" },
  ma: { uz: "magistr (MA)", ru: "магистр гуманитарных наук (MA)" },
  meng: { uz: "muhandislik magistri (MEng)", ru: "магистр инженерии (MEng)" },
  mba: { uz: "biznes boshqaruvi magistri (MBA)", ru: "магистр делового администрирования (MBA)" },
  mpa: { uz: "davlat boshqaruvi magistri (MPA)", ru: "магистр государственного управления (MPA)" },
  mph: { uz: "jamoat salomatligi magistri (MPH)", ru: "магистр общественного здравоохранения (MPH)" },
  mfa: { uz: "tasviriy san'at magistri (MFA)", ru: "магистр искусств (MFA)" },
  med: { uz: "ta'lim magistri (MEd)", ru: "магистр образования (MEd)" },
  mphil: { uz: "falsafa magistri (MPhil)", ru: "магистр философии (MPhil)" },
  mres: { uz: "tadqiqot magistri (MRes)", ru: "магистр исследований (MRes)" },
  llm: { uz: "huquq magistri (LLM)", ru: "магистр права (LLM)" },
  mle: { uz: "yer iqtisodiyoti magistri (MLE)", ru: "магистр экономики землепользования (MLE)" },
  phd: { uz: "doktorantura (PhD)", ru: "докторантура (PhD)" },
  edd: { uz: "ta'lim doktori (EdD)", ru: "доктор образования (EdD)" },
  "generic-bachelor": { uz: "bakalavr", ru: "бакалавр" },
  "generic-master": { uz: "magistr", ru: "магистр" },
  "generic-doctor": { uz: "doktorantura", ru: "докторантура" },
};

/** `(English-taught)` and friends — the taught language, stated in the locale. */
const TAUGHT_LANGUAGE_TAGS: Array<{ re: RegExp; label: Record<TargetLocale, string> }> = [
  { re: /\((?:english[-\s]taught|taught in english)\)/i, label: { uz: "ingliz", ru: "английском" } },
  { re: /\((?:russian[-\s]taught|taught in russian)\)/i, label: { uz: "rus", ru: "русском" } },
  { re: /\((?:chinese[-\s]taught|taught in chinese)\)/i, label: { uz: "xitoy", ru: "китайском" } },
  { re: /\((?:german[-\s]taught|taught in german)\)/i, label: { uz: "nemis", ru: "немецком" } },
  { re: /\((?:french[-\s]taught|taught in french)\)/i, label: { uz: "fransuz", ru: "французском" } },
  { re: /\((?:spanish[-\s]taught|taught in spanish)\)/i, label: { uz: "ispan", ru: "испанском" } },
  { re: /\((?:korean[-\s]taught|taught in korean)\)/i, label: { uz: "koreys", ru: "корейском" } },
  { re: /\((?:japanese[-\s]taught|taught in japanese)\)/i, label: { uz: "yapon", ru: "японском" } },
];

/** Words that mark a parenthetical as an institution's proper name. */
const INSTITUTION_WORDS =
  /\b(school|college|university|institute|faculty|academy|campus|business\s+school|programme|program)\b/i;

/** `(Hons)` / `(Honours)` — a classification, not part of the field. */
const HONOURS_MARKER = /\((?:hons?|honours)\.?\)/i;

const PROGRAM_NAME_FULL: Record<string, Record<TargetLocale, string>> = {
  MBA: { uz: "Biznes boshqaruvi magistri (MBA)", ru: "Магистр делового администрирования (MBA)" },
  "Master of Business Administration": { uz: "Biznes boshqaruvi magistri (MBA)", ru: "Магистр делового администрирования (MBA)" },
  "Master of Business Administration (MBA)": { uz: "Biznes boshqaruvi magistri (MBA)", ru: "Магистр делового администрирования (MBA)" },
  "Master of Engineering": { uz: "Muhandislik magistri (MEng)", ru: "Магистр инженерии (MEng)" },
  "JD (Juris Doctor)": { uz: "Huquq doktori (JD)", ru: "Доктор права (JD)" },
};

/** Split a trailing `(…)` off a title. */
function splitTrailingQualifier(text: string): { base: string; qualifier: string | null } {
  const match = text.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return { base: text.trim(), qualifier: null };
  return { base: match[1].trim(), qualifier: match[2].trim() };
}

/**
 * True when a parenhetical can stand in for the field — i.e. the degree token
 * carried no field of its own and the parenthesis is not an institution name.
 */
function qualifierAsField(qualifier: string, locale: Locale): string | null {
  if (INSTITUTION_WORDS.test(qualifier)) return null;
  const localized = localizeMajorOrField(qualifier, locale);
  if (localized === qualifier) return null;
  return localized;
}

/** Code-style parentheticals (`CPES Program`, `TFT`) never become a field. */
function cleanQualifier(qualifier: string, kind: DegreeKind): string | null {
  const label = DEGREE_LABELS[kind];
  const bare = qualifier.replace(/\./g, "").replace(/\s+/g, "").toLowerCase();
  // `Doctor of Medicine (M.D.)` / `MBA (MBA)` — the parenthesis repeats the degree.
  if (label && (bare === "md" || bare === "mba") && /^\((?:MD|MBA)\)$/i.test(qualifier)) return null;
  const withoutProgram = qualifier.replace(/\s*(?:program|programme)$/i, "").trim();
  if (withoutProgram !== qualifier && /^[A-Z0-9&.\s-]+$/.test(withoutProgram)) return withoutProgram;
  return qualifier;
}

/** Does the degree label already say the field? (`MEng in Engineering`) */
function labelCoversField(label: string, field: string): boolean {
  // "MEng in Engineering", "LLB Law", "MBA Business Administration" — the
  // degree name already says the field, so repeating it reads as a mistake.
  // A longer field ("Scots and English Law") is real content and is kept.
  const words = field.trim().split(/\s+/);
  if (words.length > 2) return false;
  const tokens = label.toLowerCase().match(/[a-z\u0400-\u04FF']{5,}/g) ?? [];
  // EVERY word must already be named by the degree label — "Ekologik huquq"
  // shares "huquq" with "huquq magistri" but is still real content.
  return words.every((word) => tokens.some((token) => word.toLowerCase().includes(token)));
}

interface CompositionInput {
  kind: DegreeKind;
  field: string | null;
  qualifier: string | null;
  honours: boolean;
  taughtIn: Record<TargetLocale, string> | null;
  tl: TargetLocale;
}

function composeProgramName({ kind, field, qualifier, honours, taughtIn, tl }: CompositionInput): string {
  const label = DEGREE_LABELS[kind][tl];
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
  let out: string;
  if (!field) out = labelCap;
  else if (tl === "uz") out = `${field} bo'yicha ${label}`;
  else out = `${labelCap} — ${field}`;
  if (honours) out += tl === "uz" ? " (imtiyozli)" : " (с отличием)";
  if (taughtIn) out += tl === "uz" ? `, ${taughtIn.uz} tilida` : `, обучение на ${taughtIn.ru} языке`;
  if (qualifier) out += ` — ${qualifier}`;
  return out;
}

/**
 * Localize a program name with the spec's compositional rule:
 *   uz: "{Field} bo'yicha bakalavr (BSc)" / "{Field} bo'yicha magistr (MSc)"
 *   ru: "Бакалавр наук (BSc) — {Field}" / "Магистр наук (MSc) — {Field}"
 * `en` returns the input verbatim; an unparseable title is returned verbatim
 * rather than reconstructed from half-translated parts.
 */
export function localizeProgramName(name: string | null | undefined, locale: Locale): string {
  if (locale === "en" || name == null || name === "") return name ?? "";
  const tl = targetLocale(locale);
  if (!tl) return name;
  const trimmed = name.trim();
  const full = PROGRAM_NAME_FULL[trimmed];
  if (full) return full[tl];

  // 1. Markers that are classification, not content.
  let working = trimmed;
  let honours = false;
  if (HONOURS_MARKER.test(working)) {
    honours = true;
    working = working.replace(HONOURS_MARKER, " ").replace(/\s+/g, " ").trim();
  }
  let taughtIn: Record<TargetLocale, string> | null = null;
  for (const tag of TAUGHT_LANGUAGE_TAGS) {
    if (tag.re.test(working)) {
      taughtIn = tag.label;
      working = working.replace(tag.re, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }

  // 2. Trailing parenthetical.
  const { base, qualifier } = splitTrailingQualifier(working);

  // 2b. A title written in another language that is already a field label is a
  // field, not a degree. "Ingeniería Civil" matched the Spanish
  // `Ingeniería → BEng` token and came out as "Qurilish bo'yicha muhandislik
  // bakalavri (BEng)" — a bachelor's degree the catalogue never promised.
  if (/[^\x00-\x7F]/.test(base)) {
    const fieldHit = FIELD_NAMES[base] ?? FIELD_NAMES[keyOf(base)];
    if (fieldHit) {
      const translated = qualifier ? localizeMajorOrField(qualifier, locale) : "";
      const sameThing = translated && keyOf(translated) === keyOf(fieldHit[tl]);
      const tail = translated && !sameThing ? ` (${translated})` : qualifier && !translated ? ` (${qualifier})` : "";
      return `${fieldHit[tl]}${tail}`;
    }
  }

  // 3. Degree token, then the field after `of` / `in` / `en`.
  for (const { re, kind, subjectGroup } of DEGREE_TOKENS) {
    const match = base.match(re);
    if (!match) continue;
    const subject = subjectGroup != null ? match[subjectGroup] : null;
    let rest = base.slice(match[0].length);
    // "Master of Laws (LLM) in Environmental Law" — the parenthesis repeats the
    // token, the field follows it.
    rest = rest.replace(/^\s*\(([A-Za-z.]{2,8})\)\s*/, " ");
    // "LLB Bachelor of Laws" — the long form repeats the abbreviation.
    rest = rest.replace(/\b(?:Bachelor|Master|Doctor)\s+of\s+(?:[A-Z][a-z]+\s*)+$/i, " ");
    rest = rest.replace(/^\s*(?:of|in|en)\s+/i, "").replace(/\s+/g, " ").trim();

    let field: string | null = null;
    let keptQualifier = qualifier;
    if (rest) {
      if (isUntranslatedLabel(rest, locale)) return name; // clean or verbatim
      field = localizeMajorOrField(rest, locale);
    } else if (subject) {
      field = localizeMajorOrField(subject, locale);
    } else if (qualifier) {
      const fromQualifier = qualifierAsField(qualifier, locale);
      if (fromQualifier) {
        field = fromQualifier;
        keptQualifier = null;
      }
    }

    const label = DEGREE_LABELS[kind][tl];
    if (field && labelCoversField(label, field)) field = null;
    if (keptQualifier) keptQualifier = cleanQualifier(keptQualifier, kind);
    if (keptQualifier && field && keptQualifier === field) keptQualifier = null;
    return composeProgramName({ kind, field, qualifier: keptQualifier, honours, taughtIn, tl });
  }

  // 4. No degree token: `College - Field`, or a bare field name.
  const dash = base.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    const right = localizeMajorOrField(dash[2].trim(), locale);
    if (right !== dash[2].trim() && !isUntranslatedLabel(dash[2].trim(), locale)) {
      const tail = qualifier ? ` (${qualifier})` : "";
      return `${dash[1].trim()} — ${right}${tail}`;
    }
  }
  const bare = localizeMajorOrField(base, locale);
  if (bare !== base && !isUntranslatedLabel(base, locale)) {
    if (!qualifier) return bare;
    // A parenthesis that carries content ("Physics/Chemistry/Math") is
    // translated; an institution or a foreign-language original is kept.
    const inner = localizeMajorOrField(qualifier, locale);
    if (inner === bare) return bare; // "Medicina (Medicine)" → "Tibbiyot"
    const tail = inner !== qualifier && !INSTITUTION_WORDS.test(qualifier) ? inner : qualifier;
    return `${bare} (${tail})`;
  }
  // A foreign-language title whose parenthesis is the English field:
  // "Agronomía (Agriculture)" → "Qishloq xo'jaligi (Agronomía)".
  if (qualifier) {
    const inner = localizeMajorOrField(qualifier, locale);
    if (inner !== qualifier && !isUntranslatedLabel(qualifier, locale)) return `${inner} (${base})`;
  }
  return name;
}

/* ============================================================================
 * 8. PATTERN LAYER — PROGRAM DESCRIPTIONS
 * ========================================================================== */

/** Spec template pattern 2 — "…is a N-year full-time LEVEL program in FIELD…" */
const PROGRAM_TEMPLATE_2 =
  /^(.+?) at (.+?) \((.+?), (.+?)\) is a ([\d.]+)-year full-time (.+?) program in (.+?) taught in (.+?), combining rigorous core theory, (?:hands-on )?research laboratories, and global (?:industry|career) preparation\.$/i;

/** Full-string dictionary for seeded program descriptions. */
const PROGRAM_DESCRIPTIONS: Record<string, Record<TargetLocale, string>> = {
  "Foundational computing program blending software engineering, systems, AI theory, and mathematics. Graduates join top tech firms and research labs.":
    {
      uz: "Dasturiy injiniring, tizimlar, sun'iy intellekt nazariyasi va matematikani birlashtiruvchi asosiy hisoblash dasturi. Bitiruvchilar yetakchi texnologik kompaniyalar va tadqiqot laboratoriyalariga qabul qilinadi.",
      ru: "Базовая программа по вычислительной технике, объединяющая программную инженерию, системы, теорию ИИ и математику. Выпускники входят в ведущие технологические компании и исследовательские лаборатории.",
    },
  "Advanced AI program covering machine learning, deep learning, natural language processing, robotics, and computer vision. Strong industry ties with Google DeepMind and Swiss AI startups.":
    {
      uz: "Mashinali o'qitish, chuqur o'qitish, tabiiy tilni qayta ishlash, robototexnika va kompyuter ko'rishini qamrab oluvchi ilg'or sun'iy intellekt dasturi. Google DeepMind va shveytsariyalik AI startaplari bilan kuchli sanoat aloqalari.",
      ru: "Продвинутая программа по ИИ: машинное и глубокое обучение, обработка естественного языка, робототехника и компьютерное зрение. Прочные связи с Google DeepMind и швейцарскими ИИ-стартапами.",
    },
  "Full-Stack Engineering program teaches frontend (React), backend (Node, Java), databases, cloud (AWS), and DevOps. Includes two 6-month paid co-op internships.":
    {
      uz: "Full-Stack Engineering dasturi frontend (React), backend (Node, Java), ma'lumotlar bazalari, bulut (AWS) va DevOps'ni o'rgatadi. Ikkita 6 oylik haqli co-op amaliyoti mavjud.",
      ru: "Программа Full-Stack Engineering обучает фронтенду (React), бэкенду (Node, Java), базам данных, облаку (AWS) и DevOps. Включает две 6-месячные оплачиваемые кооперативные стажировки.",
    },
  "Pure and applied mathematics program with specializations in analysis, algebra, statistics, and financial mathematics. Prepares for quantitative finance and PhD research.":
    {
      uz: "Analiz, algebra, statistika va moliyaviy matematika ixtisosliklariga ega sof va amaliy matematika dasturi. Kvantitativ moliya va PhD tadqiqotlariga tayyorlaydi.",
      ru: "Программа по чистой и прикладной математике со специализациями по анализу, алгебре, статистике и финансовой математике. Готовит к количественным финансам и исследованиям PhD.",
    },
  "Three-year professional medical program (MD track) with clinical rotations from year two. Globally recognized, WHO-listed, USMLE-aligned curriculum.":
    {
      uz: "Uch yillik professional tibbiyot dasturi (MD yo'nalishi), ikkinchi yildan klinik rotatsiyalar bilan. Global tan olingan, WHO ro'yxatiga kiritilgan, USMLE mos o'quv dasturi.",
      ru: "Трёхлетняя профессиональная медицинская программа (MD) с клиническими ротациями со второго года. Признана во всём мире, в списке ВОЗ, соответствует USMLE.",
    },
};

export function localizeProgramDescription(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  return memoizedText("program-description", locale, text, () => translateProgramDescription(text, locale));
}

/** The uncached translation — `memoizedText` remembers the result per input. */
function translateProgramDescription(text: string, locale: Locale): string {
  // `text` is non-empty and `locale` is uz/ru here — the caller guarantees it.
  const tl = targetLocale(locale) ?? "uz";
  const exact = PROGRAM_DESCRIPTIONS[text.trim()];
  if (exact) return exact[tl];
  // Template pattern 2 — positional groups:
  // 1: program, 2: university, 3: city, 4: country, 5: duration, 6: level,
  // 7: field, 8: language.
  const m = text.match(PROGRAM_TEMPLATE_2);
  if (m) {
    const program = localizeProgramName(m[1], locale);
    const city = localizeCity(m[3], locale);
    const country = localizeCountry(m[4], locale);
    const level = localizeDegreeLevel(m[6], locale);
    const field = localizeMajorOrField(m[7], locale);
    if (tl === "uz") {
      return `${program} — ${city}, ${country}dagi (${m[2]}) ${m[5]} yillik kunduzgi ${level} dasturi. Qat'iy asosiy nazariya, amaliy tadqiqot laboratoriyalari va global sanoatga tayyorlovni birlashtiradi.`;
    }
    return `${program} — ${m[5]}-летняя очная программа ${level} в ${city}, ${country} (${m[2]}). Совмещает строгую базовую теорию, практические исследовательские лаборатории и глобальную подготовку к карьере.`;
  }
  return text;

}


/* ============================================================================
 * 9. PATTERN LAYER — SCHOLARSHIPS (title / description / requirement)
 * ========================================================================== */

/** Recognized brand prefixes that stay verbatim in every locale. */
const SCHOLARSHIP_BRANDS = [
  "Fulbright",
  "Chevening",
  "DAAD",
  "Erasmus Mundus",
  "Erasmus+",
  "Knight-Hennessy",
  "Gates Cambridge",
  "MEXT",
  "Lester B. Pearson",
  "Rhodes",
  "Schwarzman",
  "Yenching",
  "Stipendium Hungaricum",
  "Global Korea Scholarship",
  "GKS",
  "Türkiye Bursları",
  "El-Yurt Umidi",
  "El-yurt umidi",
  "Mastercard Foundation",
  "Aga Khan",
  "ADB",
  "Joint Japan/World Bank",
  "Orange Knowledge",
  "Hubert Humphrey",
  "Schwarzman Scholars",
  "Commonwealth",
  "Chinese Government Scholarship",
  "Korean Government Scholarship",
  "Romanian Government",
  "Türkiye Scholarships",
];

/** Generic title suffixes (after a brand, or standalone). */
const SCHOLARSHIP_TITLE_PARTS: Record<string, Record<TargetLocale, string>> = {
  Scholarship: { uz: "stipendiyasi", ru: "Стипендия" },
  "Scholarship Program": { uz: "stipendiya dasturi", ru: "программа стипендий" },
  "Scholars Program": { uz: "stipendiatlar dasturi", ru: "программа для стипендиатов" },
  "Foreign Student Program": { uz: "xorijiy talabalar dasturi", ru: "программа для иностранных студентов" },
  "Government Scholarship": { uz: "hukumat stipendiyasi", ru: "государственная стипендия" },
  "Joint Master Degrees": { uz: "qo'shma magistratura darajalari", ru: "совместные магистерские степени" },
  "Development-Related Postgraduate Courses (EPOS)": {
    uz: "rivojlanishga yo'naltirilgan magistratura kurslari (EPOS)",
    ru: "постдипломные курсы, связанные с развитием (EPOS)",
  },
  "International Scholarship": { uz: "xalqaro stipendiya", ru: "международная стипендия" },
  "Scholarships": { uz: "stipendiyalari", ru: "Стипендии" },
};

/** Exact seeded scholarship titles. */
const SCHOLARSHIP_TITLES: Record<string, Record<TargetLocale, string>> = {
  "Fulbright Foreign Student Program": {
    uz: "Fulbright — xorijiy talabalar dasturi",
    ru: "Фулбрайт — программа для иностранных студентов",
  },
  "Chevening Scholarship": { uz: "Chevening stipendiyasi", ru: "Стипендия Chevening" },
  "DAAD Development-Related Postgraduate Courses (EPOS)": {
    uz: "DAAD — rivojlanishga yo'naltirilgan magistratura kurslari (EPOS)",
    ru: "DAAD — постдипломные курсы, связанные с развитием (EPOS)",
  },
  "Erasmus Mundus Joint Master Degrees (EMJMD)": {
    uz: "Erasmus Mundus qo'shma magistratura darajalari (EMJMD)",
    ru: "Erasmus Mundus — совместные магистерские степени (EMJMD)",
  },
  "Knight-Hennessy Scholars Program": {
    uz: "Knight-Hennessy stipendiatlar dasturi",
    ru: "Программа для стипендиатов Knight-Hennessy",
  },
  "Gates Cambridge Scholarship": { uz: "Gates Cambridge stipendiyasi", ru: "Стипендия Gates Cambridge" },
  "MEXT Japanese Government Scholarship": {
    uz: "MEXT — Yaponiya hukumati stipendiyasi",
    ru: "MEXT — государственная стипендия Японии",
  },
  "Lester B. Pearson International Scholarship": {
    uz: "Lester B. Pearson xalqaro stipendiyasi",
    ru: "Международная стипендия Лестера Б. Пирсона",
  },
};

export function localizeScholarshipTitle(title: string | null | undefined, locale: Locale): string {
  if (locale === "en" || title == null || title === "") return title ?? "";
  const tl = targetLocale(locale);
  if (!tl) return title;
  const trimmed = title.trim();
  const exact = SCHOLARSHIP_TITLES[trimmed];
  if (exact) return exact[tl];
  // Brand + generic suffix composition — keep the brand verbatim.
  for (const brand of SCHOLARSHIP_BRANDS) {
    if (trimmed.startsWith(brand)) {
      const rest = trimmed.slice(brand.length).trim();
      if (!rest) return trimmed;
      const suffixKey = rest.replace(/^[—–-]\s*/, "");
      const suffix = SCHOLARSHIP_TITLE_PARTS[suffixKey] ?? SCHOLARSHIP_TITLE_PARTS[keyOf(suffixKey)];
      if (suffix) {
        return tl === "uz" ? `${brand} — ${suffix[tl]}` : `${brand} — ${suffix[tl]}`;
      }
      // Translate remaining generic words only.
      const generic = localizeScholarshipTitleGeneric(suffixKey, tl);
      return tl === "uz" ? `${brand} — ${generic}` : `${brand} — ${generic}`;
    }
  }
  return localizeScholarshipTitleGeneric(trimmed, tl);
}

function localizeScholarshipTitleGeneric(text: string, tl: TargetLocale): string {
  const hit = SCHOLARSHIP_TITLE_PARTS[text] ?? SCHOLARSHIP_TITLE_PARTS[keyOf(text)];
  if (hit) return hit[tl];
  const wordMap: Array<[RegExp, string, string]> = [
    [/\bInternational\b/g, "Xalqaro", "Международная"],
    [/\bExcellence\b/g, "A'lochilar", "Превосходства"],
    [/\bMerit\b/g, "Yutuqlar", "За успехи"],
    [/\bGovernment\b/g, "Hukumat", "Государственная"],
    [/\bDevelopment-Related\b/g, "Rivojlanishga yo'naltirilgan", "Связанная с развитием"],
    [/\bPostgraduate\b/g, "Magistratura", "Постдипломная"],
    [/\bJoint\b/g, "Qo'shma", "Совместная"],
    [/\bMaster\b/g, "Magistratura", "Магистерская"],
    [/\bScholars?\b/g, "Stipendiya", "Стипендия"],
    [/\bProgram\b/g, "dasturi", "программа"],
    [/\bStudent\b/g, "Talabalar", "студенческая"],
  ];
  let out = text;
  for (const [re, uz, ru] of wordMap) {
    out = out.replace(re, tl === "uz" ? uz : ru);
  }
  return out;
}

/** Exact seeded scholarship descriptions. */
const SCHOLARSHIP_DESCRIPTIONS: Record<string, Record<TargetLocale, string>> = {
  // Unverified-award disclaimers (used by the public catalogue boundary).
  "Current award details have not been reviewed against an official source.": {
    uz: "Joriy grant ma'lumotlari rasmiy manba bilan ko'rib chiqilmagan.",
    ru: "Текущие условия стипендии не сверены с официальным источником.",
  },
  "Current award terms and dates are not yet verified; consult the linked official programme page.": {
    uz: "Joriy shartlar va muddatlar hali tasdiqlanmagan; havola qilingan rasmiy dastur sahifasini tekshiring.",
    ru: "Текущие условия и даты ещё не подтверждены; проверьте официальную страницу программы по ссылке.",
  },
  "Covers full tuition, living stipend, roundtrip airfare, health insurance, and visa support for international graduate students studying in the USA.":
    {
      uz: "AQShda tahsil olayotgan xalqaro magistratura talabalari uchun to'liq kontrakt, yashash stipendiyasi, qatnov aviachiptasi, tibbiy sug'urta va viza yordamini qamrab oladi.",
      ru: "Покрывает полную стоимость обучения, стипендию на проживание, авиабилеты в обе стороны, медицинскую страховку и визовую поддержку для иностранных магистрантов в США.",
    },
  "Fully funded 1-year Master's scholarship in the UK for future global leaders and influencers, covering tuition, accommodation, and travel allowance.":
    {
      uz: "Buyuk Britaniyada kelajakdagi global liderlar uchun to'liq moliyalashtirilgan 1 yillik magistratura stipendiyasi — kontrakt, turar joy va yo'l xarajatlarini qamrab oladi.",
      ru: "Полностью финансируемая однолетняя магистерская стипендия в Великобритании для будущих глобальных лидеров: обучение, проживание и транспортные расходы.",
    },
  "Monthly stipend of €934 - €1,200, travel allowance, health insurance, and full tuition coverage for select Master's programs across German universities.":
    {
      uz: "Germaniya universitetlaridagi ayrim magistratura dasturlari uchun oylik stipendiya 934–1 200 evro, yo'l xarajatlari, tibbiy sug'urta va to'liq kontrakt qamrovi.",
      ru: "Ежемесячная стипендия 934–1 200 евро, транспортные расходы, медицинская страховка и полное покрытие обучения для отдельных магистерских программ в немецких вузах.",
    },
  "High-profile international study program across 2 to 3 different European countries with €1,400 monthly living allowance and zero tuition fees.":
    {
      uz: "2-3 ta turli Yevropa davlatlarini qamrab oluvchi nufuzli xalqaro o'quv dasturi — oylik 1 400 evro yashash stipendiyasi va nol kontrakt to'lovi.",
      ru: "Престижная международная программа обучения в 2–3 странах Европы с ежемесячной стипендией 1 400 евро и нулевой оплатой обучения.",
    },
  "Fully funds up to 3 years of graduate study at Stanford for students with transformative leadership potential, independence of thought, and civic mindset.":
    {
      uz: "Transformatsion liderlik salohiyati, mustaqil fikrlash va fuqarolik ongiga ega talabalar uchun Stenford universitetida 3 yilgacha magistratura o'qishini to'liq moliyalashtiradi.",
      ru: "Полностью финансирует до 3 лет аспирантуры в Стэнфорде для студентов с трансформационным лидерским потенциалом, независимостью мышления и гражданской позицией.",
    },
  "Full-cost scholarship for outstanding applicants from countries outside the UK to pursue a postgraduate degree at the University of Cambridge.":
    {
      uz: "Buyuk Britaniyadan tashqari davlatlardan a'lochilar uchun Cambridge universitetida magistratura darajasini olishga mo'ljallangan to'liq xarajatli stipendiya.",
      ru: "Полная стипендия для выдающихся абитуриентов из стран вне Великобритании на получение последипломной степени в Кембриджском университете.",
    },
  "Covers tuition fees, monthly living allowance (~144,000 JPY/month), roundtrip flight ticket, and 6-month preparatory Japanese language course.":
    {
      uz: "Kontrakt to'lovi, oylik yashash stipendiyasi (~144 000 yen/oy), qatnov aviachiptasi va 6 oylik tayyorgarlik yapon tili kursini qamrab oladi.",
      ru: "Покрывает оплату обучения, ежемесячную стипендию (~144 000 иен/мес), авиабилет в обе стороны и 6-месячный подготовительный курс японского языка.",
    },
  "University of Toronto's most prestigious scholarship for international high school students showing exceptional academic achievement and creativity.":
    {
      uz: "Toronto universitetining ayniqsa akademik yutuqlar va ijodkorlik namoyish etgan xalqaro o'rta maktab o'quvchilari uchun eng nufuzli stipendiyasi.",
      ru: "Самый престижный стипендия Торонтского университета для иностранных школьников с исключительными академическими успехами и креативностью.",
    },
};

/** Spec template pattern 3 — "Merit-based international scholarship…" */
const SCHOLARSHIP_TEMPLATE_3 =
  /^Merit-based international scholarship awarded to high-achieving applicants admitted to degree programs at (.+)\.$/i;

export function localizeScholarshipDescription(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  return memoizedText("scholarship-description", locale, text, () => translateScholarshipDescription(text, locale));
}

/** The uncached translation — `memoizedText` remembers the result per input. */
function translateScholarshipDescription(text: string, locale: Locale): string {
  // `text` is non-empty and `locale` is uz/ru here — the caller guarantees it.
  const tl = targetLocale(locale) ?? "uz";
  const exact = SCHOLARSHIP_DESCRIPTIONS[text.trim()];
  if (exact) return exact[tl];
  const m = text.match(SCHOLARSHIP_TEMPLATE_3);
  if (m) {
    const uni = m[1];
    if (tl === "uz") {
      return `Yutuqlarga asoslangan xalqaro stipendiya: ${uni} universitetining akademik dasturlariga qabul qilingan yuqori natijali abituriyentlarga beriladi.`;
    }
    return `Заслуженная международная стипендия для высокодостижимых абитуриентов, зачисленных на образовательные программы ${uni}.`;
  }
  return text;

}


export function localizeScholarshipRequirements(text: string | null | undefined, locale: Locale): string {
  return localizeRequirementText(text, locale);
}

/* ============================================================================
 * 9b. SOURCE-LANGUAGE PROSE — translate what we can, label what we cannot
 * ========================================================================== */

/**
 * Phase T (2026-10-30). 547 awards carry ~3000 English free-text strings in
 * `description`, `requirements`, `tuition_coverage` and
 * `english_requirements` — 446 of them distinct. A deterministic dictionary
 * cannot translate free prose, and machine translation is not allowed here.
 *
 * The rule the product owner chose: the text stays where it is, but an explicit
 * "source language: English" label sits directly above it, so a student never
 * mistakes English for a broken Uzbek translation. Everything that IS
 * translatable deterministically (test scores, the common coverage phrasings)
 * is translated first, and then needs no label at all.
 */

/** English function words — the fingerprint of an untranslated sentence. */
const ENGLISH_FUNCTION_WORDS = new Set([
  "the",
  "of",
  "and",
  "is",
  "are",
  "was",
  "were",
  "to",
  "for",
  "with",
  "by",
  "in",
  "on",
  "that",
  "this",
  "these",
  "which",
  "from",
  "at",
  "as",
  "be",
  "not",
  "or",
  "an",
  "its",
  "their",
  "they",
  "will",
  "can",
  "must",
  "should",
  "who",
  "when",
  "if",
  "also",
  "may",
  "has",
  "have",
  "does",
  "than",
  "there",
]);

/**
 * English words a *translation* never contains. They are what is left when the
 * dictionary gives up on a short value that has no function words at all
 * ("Merit-based tuition waiver", "Partial tuition fee reduction"): five words,
 * zero "the/of/and", and still plainly English on an Uzbek page.
 */
const ENGLISH_CONTENT_WORDS = new Set([
  "tuition", "fee", "fees", "waiver", "scholarship", "scholarships", "fellowship",
  "funding", "fund", "funds", "stipend", "award", "awards", "grant", "grants",
  "coverage", "covered", "covers", "deadline", "application", "applications",
  "applicant", "applicants", "university", "universities", "college", "colleges",
  "program", "programme", "programs", "programmes", "course", "courses",
  "degree", "degrees", "bachelor", "masters", "doctoral", "semester", "semesters",
  "credit", "credits", "academic", "faculty", "research", "study", "studies",
  "student", "students", "language", "english", "german", "french", "spanish",
  "score", "scores", "test", "tests", "requirement", "requirements", "merit",
  "merit-based", "need", "need-based", "based", "full", "partial", "percent",
  "monthly", "annual", "year", "years", "month", "months", "week", "weeks",
  "value", "awarded", "offered", "provided", "reduction", "reduced", "exemption",
  "exempted", "remission", "remitted", "subsidy", "subsidised", "subsidized",
  "eligible", "eligibility", "criteria", "selection", "selected", "nominat",
  "nomination", "nominated", "interview", "interviews", "documents", "document",
  "certificate", "certificates", "transcript", "transcripts", "recommendation",
  "recommendations", "statement", "essay", "essays", "portfolio", "admission",
  "admissions", "enrolment", "enrollment", "enrolled", "undergraduate",
  "postgraduate", "graduate", "international", "national", "nationality",
  "resident", "residence", "citizen", "citizens", "country", "countries",
  "institution", "institutions", "school", "schools", "deposit", "insurance",
  "allowance", "accommodation", "housing", "travel", "airfare", "book", "books",
]);

/**
 * True when a string reads as English rather than as a code, a score or a
 * proper name. `IELTS 6.5 / TOEFL 94 / DET 120` is NOT English prose — a test
 * score is the same string in every language — and neither is `Tibbiyot`.
 *
 * Two detections, because two kinds of English reach the page:
 *   · a sentence: six+ words with English function words ("No scholarship-level
 *     IELTS figure; English requirements follow each programme's admission
 *     rules");
 *   · a short value: no function word at all, but a word only English uses
 *     ("Merit-based tuition waiver"). Before this, such a value was rendered
 *     bare on an Uzbek page and nobody noticed.
 */
export function isEnglishProse(value: string | null | undefined): boolean {
  if (!value) return false;
  const words = value.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
  if (words.length === 0) return false;
  let hits = 0;
  for (const word of words) if (ENGLISH_FUNCTION_WORDS.has(word)) hits++;
  if (words.length >= 6 && hits >= 2) return true;
  // A single English content word is enough for a short value; for a long one
  // require two, so one leftover proper noun does not condemn a translation.
  let content = 0;
  for (const word of words) if (ENGLISH_CONTENT_WORDS.has(word)) content++;
  return words.length <= 8 ? content >= 1 : content >= 2;
}

/**
 * Should the rendered string carry the "source language: English" label?
 * True only when the localized output still reads as English prose — a
 * translated Uzbek/Russian string contains none of the English function words.
 */
export function needsSourceLanguageLabel(
  original: string | null | undefined,
  localized: string | null | undefined,
  locale: Locale
): boolean {
  if (locale === "en") return false;
  if (!original || !original.trim()) return false;
  return isEnglishProse(localized ?? "");
}

/** Value the caller renders, plus whether it needs the source-language label. */
export interface LocalizedProse {
  text: string;
  sourceLanguage: boolean;
}

/** Run one dictionary/pattern translator and report whether a label is needed. */
export function localizeProse(
  original: string | null | undefined,
  locale: Locale,
  translate: (value: string, locale: Locale) => string
): LocalizedProse {
  const source = original ?? "";
  if (!source.trim()) return { text: "", sourceLanguage: false };
  const text = locale === "en" ? source : translate(source, locale);
  return { text, sourceLanguage: needsSourceLanguageLabel(source, text, locale) };
}

/** Coverage phrasings that appear verbatim in the live catalogue, often. */
const TUITION_COVERAGE_EXACT: Record<string, Record<TargetLocale, string>> = {
  None: { uz: "Qoplammaydi", ru: "Не покрывается" },
  "Not specified": { uz: "Ko'rsatilmagan", ru: "Не указано" },
  "Full tuition": { uz: "To'liq kontrakt", ru: "Полное обучение" },
  "Full Tuition": { uz: "To'liq kontrakt", ru: "Полное обучение" },
  "Partial tuition": { uz: "Qisman kontrakt", ru: "Частичное обучение" },
  "Full tuition waiver": { uz: "To'liq kontraktdan ozod qilish", ru: "Полное освобождение от оплаты" },
  "Tuition-free education": { uz: "Kontraktsiz ta'lim", ru: "Бесплатное обучение" },
  "Tuition-free German university": { uz: "Kontraktsiz nemis universiteti", ru: "Бесплатный немецкий университет" },
  "Tuition-free German state university": {
    uz: "Kontraktsiz nemis davlat universiteti",
    ru: "Бесплатный немецкий государственный университет",
  },
  "100% Tuition Fee Waiver": { uz: "Kontraktdan 100% ozod qilish", ru: "100% освобождение от оплаты" },
  "100% Tuition Waiver": { uz: "Kontraktdan 100% ozod qilish", ru: "100% освобождение от оплаты" },
  "100% Tuition Fee Exemption": { uz: "Kontraktdan 100% ozod qilish", ru: "100% освобождение от оплаты" },
  "Partial tuition (fee discount)": { uz: "Qisman kontrakt (chegirma)", ru: "Частичное обучение (скидка)" },
};

/**
 * Tuition-coverage text. Exact rows and the percentage phrasings are
 * translated; free prose is returned verbatim for the caller to label.
 */
export function localizeTuitionCoverage(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  const trimmed = text.trim();
  const exact = TUITION_COVERAGE_EXACT[trimmed] ?? TUITION_COVERAGE_EXACT[keyOf(trimmed)];
  if (exact) return exact[tl];
  const words = trimmed.toLowerCase();
  // "Full tuition waiver", "Partial tuition + stipend".
  const simple = words.match(/^(full|partial)\s+tuition(?:\s+(?:fee\s+)?(?:waiver|exemption|discount|reduction))?$/);
  if (simple) {
    const full = simple[1] === "full";
    if (tl === "uz") return full ? "To'liq kontrakt" : "Qisman kontrakt";
    return full ? "Полное обучение" : "Частичное обучение";
  }
  // "100% of the annual tuition fee waived", "50% tuition waiver".
  const percent = words.match(/^(\d{1,3})\s*(?:%|per\s?cent|percent)\s+(?:of\s+)?(?:the\s+)?(?:annual\s+|programme\s+|program\s+)?tuition\s*(?:fee|fees)?\s*(?:waiver|exemption|discount|reduction|covered|paid)?$/);
  if (percent) {
    const value = percent[1];
    if (tl === "uz") return `Kontraktning ${value}% qismi qoplanadi`;
    return `Покрывается ${value}% стоимости обучения`;
  }
  return text;
}

/** English-language requirement phrasings that are safe to rebuild. */
export function localizeEnglishRequirement(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  const trimmed = text.trim();
  const equivalent = trimmed.match(/^IELTS\s+([\d.]+)\+?\s+or equivalent English test$/i);
  if (equivalent) {
    return tl === "uz"
      ? `IELTS ${equivalent[1]} yoki unga teng ingliz tili imtihoni`
      : `IELTS ${equivalent[1]} или эквивалентный экзамен по английскому`;
  }
  const simple = trimmed.match(/^IELTS\s+([\d.]+)\+?$/i);
  if (simple) return `IELTS ${simple[1]}+`;
  const noScore = trimmed.match(/^No (?:award|scholarship|scheme)[\s\S]*$/i);
  if (noScore) {
    // A sentence that explains *why* there is no score — the reason is content,
    // so the sentence is left to the label rather than truncated into a guess.
    return text;
  }
  return text;
}

/** Every prose a scholarship card can show, translated as far as determinism goes. */
export const SCHOLARSHIP_PROSE_TRANSLATORS = {
  description: localizeScholarshipDescription,
  requirements: localizeScholarshipRequirements,
  tuitionCoverage: localizeTuitionCoverage,
  englishRequirement: localizeEnglishRequirement,
} as const;

/* ============================================================================
 * 10. SEARCH EXPANSION — multilingual → English canonical keywords
 * ========================================================================== */

/** Token-level uz/ru → English canonical keyword map. */
const SEARCH_TERM_EXPANSIONS: Record<string, string[]> = {
  // Countries (uz Latin / cyrillic / Russian)
  germaniya: ["germany"], германия: ["germany"], deutschland: ["germany"],
  aqsh: ["united states", "usa", "america"], сша: ["united states", "usa"],
  amerika: ["united states", "america"], штатлар: ["united states"],
  anglia: ["united kingdom", "uk"], anglía: ["united kingdom", "uk"],
  "buyuk britaniya": ["united kingdom", "uk"], великобритания: ["united kingdom", "uk"],
  britaniya: ["united kingdom", "uk"], британия: ["united kingdom"],
  shotlandiya: ["scotland"], шотландия: ["scotland"],
  koreya: ["korea"], корея: ["korea"], "janubiy koreya": ["south korea", "korea"],
  "южная корея": ["south korea", "korea"], korea: ["korea"],
  yaponiya: ["japan"], япония: ["japan"], xitoy: ["china"], китай: ["china"],
  shveysariya: ["switzerland"], швейцария: ["switzerland"],
  kanada: ["canada"], канада: ["canada"],
  avstraliya: ["australia"], австралия: ["australia"],
  niderlandiya: ["netherlands", "holland"], нидерланды: ["netherlands"],
  gollandiya: ["netherlands", "holland"],
  avstriya: ["austria"], австрия: ["austria"],
  shvetsiya: ["sweden"], швеция: ["sweden"],
  norvegiya: ["norway"], норвегия: ["norway"],
  finlyandiya: ["finland"], финляндия: ["finland"],
  fransiya: ["france"], франция: ["france"],
  italiya: ["italy"], италия: ["italy"],
  ispaniya: ["spain"], испания: ["spain"],
  polsha: ["poland"], польша: ["poland"],
  chexiya: ["czechia", "czech"], чехия: ["czechia", "czech"],
  vengriya: ["hungary"], венгрия: ["hungary"],
  turkiya: ["turkey", "türkiye"], турция: ["turkey", "türkiye"],
  yevropa: ["europe", "european union"], европа: ["europe", "european union"],
  "yevropa ittifoqi": ["european union"], "европейский союз": ["european union"],
  hindiston: ["india"], индия: ["india"],
  singapur: ["singapore"], сингапур: ["singapore"],
  baa: ["emirates", "uae"], оаэ: ["emirates", "uae"],
  dubay: ["dubai", "emirates"], катар: ["qatar"],
  misr: ["egypt"], египет: ["egypt"],
  "o'zbekiston": ["uzbekistan"], uzbekiston: ["uzbekistan"], "узбекистан": ["uzbekistan"],
  malaysia: ["malaysia"], maleyziya: ["malaysia"],
  // Fields / majors
  kompyuter: ["computer", "computer science", "informatics", "software"],
  компьютер: ["computer", "computer science", "informatics"],
  informatika: ["informatics", "computer science"], информатика: ["informatics", "computer science"],
  dasturlash: ["programming", "software", "computer"], программирование: ["programming", "software"],
  "sun'iy intellekt": ["artificial intelligence", "ai", "machine learning"],
  "suniy intellekt": ["artificial intelligence", "ai", "machine learning"],
  "искусственный интеллект": ["artificial intelligence", "ai", "machine learning"],
  ai: ["artificial intelligence", "ai"],
  "машинное обучение": ["machine learning"], "mashinali o'qitish": ["machine learning"],
  muhandislik: ["engineering"], инженерия: ["engineering"],
  mexanika: ["mechanical"], механика: ["mechanical"],
  elektro: ["electrical"], электро: ["electrical"],
  qurilish: ["civil", "construction"], строительство: ["civil", "construction"],
  kimyo: ["chemistry", "chemical"], химия: ["chemistry", "chemical"],
  fizika: ["physics"], физика: ["physics"],
  matematika: ["mathematics", "math"], математика: ["mathematics", "math"],
  biologiya: ["biology"], биология: ["biology"],
  tibbiyot: ["medicine", "medical"], медицина: ["medicine", "medical"],
  meditsina: ["medicine", "medical"],
  farmatsiya: ["pharmacy"], фармация: ["pharmacy"],
  stomatologiya: ["dentistry"], стоматология: ["dentistry"],
  huquq: ["law", "legal"], право: ["law", "legal"], yurisprudentsiya: ["law"],
  iqtisodiyot: ["economics", "economy"], экономика: ["economics", "economy"],
  biznes: ["business", "mba"], бизнес: ["business", "mba"],
  menejment: ["management"], менеджмент: ["management"],
  moliya: ["finance", "financial"], финансы: ["finance", "financial"],
  marketing: ["marketing"],
  arxitektura: ["architecture"], архитектура: ["architecture"],
  dizayn: ["design"], дизайн: ["design"],
  psixologiya: ["psychology"], психология: ["psychology"],
  pedagogika: ["education", "teaching"], педагогика: ["education", "teaching"],
  jurnalistika: ["journalism"], журналистика: ["journalism"],
  siyosat: ["politics", "political"], политология: ["politics", "political"],
  "xalqaro munosabatlar": ["international relations"], "международные отношения": ["international relations"],
  ekologiya: ["ecology", "environmental"], экология: ["ecology", "environmental"],
  atrof: ["environmental", "environment"],
  robototexnika: ["robotics"], робототехника: ["robotics"],
  kiber: ["cybersecurity", "cyber"], кибер: ["cybersecurity", "cyber"],
  "ma'lumotlar": ["data"], maalumotlar: ["data"], "данные": ["data", "data science"],
  logistika: ["logistics"], логистика: ["logistics"],
  turizm: ["tourism", "hospitality"], туризм: ["tourism", "hospitality"],
  qishloq: ["agriculture"], сельское: ["agriculture"],
  // Coverage / scholarship words
  "to'liq": ["full", "fully"], toliq: ["full", "fully"], полное: ["full", "полностью"],
  полностью: ["full", "fully"], qisman: ["partial", "partial tuition"], частичное: ["partial"],
  kontrakt: ["tuition"], обучение: ["tuition"], контракт: ["tuition"],
  stipendiya: ["scholarship", "stipend"], стипендия: ["scholarship", "stipend"],
  grant: ["scholarship", "grant", "funding"], грант: ["scholarship", "grant", "funding"],
  moliyalashtirish: ["funding", "funded"], финансирование: ["funding", "funded"],
  // Degree levels
  bakalavr: ["bachelor", "undergrad", "undergraduate"], бакалавр: ["bachelor", "undergrad"],
  magistratura: ["master", "magistr", "graduate"], магистратура: ["master", "magistr"],
  magistr: ["master"], doktorantura: ["phd", "doctorate", "doctoral"], аспирантура: ["phd", "doctorate"],
  phd: ["phd", "doctorate"], doktorlik: ["phd", "doctorate"],
  // University type
  davlat: ["public"], государственный: ["public"], гос: ["public"],
  xususiy: ["private"], частный: ["private"],
};

/**
 * Expand a search term into canonical English keywords. Returns `[term,
 * ...expanded]` — always at least the normalized original — so the caller can
 * OR-match against canonical English rows.
 */
export function expandMultilingualSearchTerms(term: string): string[] {
  const original = term.trim();
  if (!original) return [];
  const lower = original.toLowerCase().replace(/[‘’ʼ`]/g, "'");
  const out: string[] = [lower];
  const push = (words: string[] | undefined): void => {
    if (!words) return;
    for (const w of words) {
      const n = w.toLowerCase();
      if (!out.includes(n)) out.push(n);
    }
  };
  push(SEARCH_TERM_EXPANSIONS[lower]);
  // Multi-word pass: every known phrase contained in the query.
  for (const [phrase, words] of Object.entries(SEARCH_TERM_EXPANSIONS)) {
    if (phrase.includes(" ") && lower.includes(phrase)) push(words);
  }
  // Single-token pass for multi-token queries ("almaniya stipendiya").
  const tokens = lower.split(/[\s,.]+/).filter(Boolean);
  if (tokens.length > 1) {
    for (const token of tokens) push(SEARCH_TERM_EXPANSIONS[token]);
  }
  return out;
}

/* ============================================================================
 * 11. ROW MAPPERS — full payload shapes
 * ========================================================================== */

type Str = string | null | undefined;

interface UniversityRowLike {
  name: string;
  city?: Str;
  country?: Str;
  universityType?: Str;
  programMajor?: Str;
  description?: Str;
  highlights?: Str;
  [key: string]: unknown;
}

/** The fields `localizeUniversityRow` translates (memo signature). */
const UNIVERSITY_LOCALIZED_FIELDS = [
  "city",
  "country",
  "universityType",
  "programMajor",
  "description",
  "highlights",
] as const;

function translateUniversityFields<T extends UniversityRowLike>(uni: T, locale: Locale): LocalizedFields {
  const out: LocalizedFields = {};
  if (typeof uni.city === "string") out.city = localizeCity(uni.city, locale);
  if (typeof uni.country === "string") out.country = localizeCountry(uni.country, locale);
  if (typeof uni.universityType === "string") out.universityType = localizeUniversityType(uni.universityType, locale);
  if (typeof uni.programMajor === "string") out.programMajor = localizeMajorOrField(uni.programMajor, locale);
  if (typeof uni.description === "string") out.description = localizeUniversityDescription(uni.description, locale);
  if (typeof uni.highlights === "string") out.highlights = localizeHighlights(uni.highlights, locale);
  return out;
}

/**
 * Localize the display fields of a university row. `en` returns `uni` itself.
 *
 * The translation is memoized on `locale + id + updatedAt + the localizable
 * fields` (`src/lib/localizeMemo.ts`) — the same catalogue row is localized on
 * every catalogue request, and the description/pattern work is the expensive
 * part. Per-request extras (match score, saved flag) are never cached: the
 * memo stores translated strings only and the caller always gets a new object.
 */
export function localizeUniversityRow<T extends UniversityRowLike>(uni: T, locale: Locale): T {
  if (locale === "en") return passthrough(uni);
  const tl = targetLocale(locale);
  if (!tl) return uni;
  // An array of highlights cannot be expressed as a translated string — take
  // the plain path rather than teaching the memo about shapes.
  const arrayHighlights = uni.highlights != null && typeof uni.highlights !== "string";
  const fields = arrayHighlights
    ? translateUniversityFields(uni, locale)
    : memoizedLocalize("university", locale, uni, UNIVERSITY_LOCALIZED_FIELDS, (row) =>
        translateUniversityFields(row as T, locale)
      );
  return {
    ...uni,
    ...fields,
    // Arrays/objects pass through the (uncached) translator untouched.
    ...(arrayHighlights ? { highlights: localizeHighlights(uni.highlights as Str, locale) } : {}),
  };
}

interface ScholarshipRowLike {
  title?: Str;
  provider?: Str;
  country?: Str;
  coverageType?: Str;
  degreeLevels?: Str;
  eligibleMajors?: Str;
  description?: Str;
  requirements?: Str;
  statusLabel?: Str;
  fundingType?: Str;
  expectedOpeningPeriod?: Str;
  [key: string]: unknown;
}

/** Scholarship provider display names — agencies translate, institutions stay. */
const PROVIDER_NAMES: Record<string, Record<TargetLocale, string>> = {
  "United States Department of State": { uz: "AQSh Davlat departamenti", ru: "Государственный департамент США" },
  "UK Foreign, Commonwealth & Development Office": {
    uz: "Buyuk Britaniya Tashqi ishlar, hamdo'stlik va taraqqiyot idorasi",
    ru: "Министерство иностранных дел, по делам Содружества и развития Великобритании",
  },
  "German Academic Exchange Service (DAAD)": {
    uz: "Germaniya akademik almashinuv xizmati (DAAD)",
    ru: "Германская служба академических обменов (DAAD)",
  },
  "European Commission / European Union": {
    uz: "Yevropa komissiyasi / Yevropa Ittifoqi",
    ru: "Европейская комиссия / Европейский Союз",
  },
  "Ministry of Education, Culture, Sports, Science (MEXT Japan)": {
    uz: "Ta'lim, madaniyat, sport, fan vazirligi (MEXT Japan)",
    ru: "Министерство образования, культуры, спорта, науки (MEXT Japan)",
  },
  "Bill & Melinda Gates Foundation / Cambridge": {
    uz: "Bill va Melinda Geyts jamg'armasi / Cambridge",
    ru: "Фонд Билла и Мелинды Гейтс / Кембридж",
  },
};

export function localizeScholarshipProvider(provider: string | null | undefined, locale: Locale): string {
  if (locale === "en" || provider == null || provider === "") return provider ?? "";
  const tl = targetLocale(locale);
  if (!tl) return provider;
  const hit = PROVIDER_NAMES[provider.trim()];
  return hit ? hit[tl] : provider;
}

/** The fields `localizeScholarshipRow` translates (memo signature). */
const SCHOLARSHIP_LOCALIZED_FIELDS = [
  "title",
  "provider",
  "country",
  "coverageType",
  "degreeLevels",
  "eligibleMajors",
  "description",
  "requirements",
  "statusLabel",
  "fundingType",
] as const;

function translateScholarshipFields<T extends ScholarshipRowLike>(s: T, locale: Locale): LocalizedFields {
  const out: LocalizedFields = {};
  if (typeof s.title === "string") out.title = localizeScholarshipTitle(s.title, locale);
  if (typeof s.provider === "string") out.provider = localizeScholarshipProvider(s.provider, locale);
  if (typeof s.country === "string") out.country = localizeCountry(s.country, locale);
  if (typeof s.coverageType === "string") out.coverageType = localizeCoverageType(s.coverageType, locale);
  if (typeof s.degreeLevels === "string") out.degreeLevels = mapJsonStringArray(s.degreeLevels, (item) => localizeDegreeLevel(item, locale));
  if (typeof s.eligibleMajors === "string") out.eligibleMajors = mapJsonStringArray(s.eligibleMajors, (item) => localizeMajorOrField(item, locale));
  if (typeof s.description === "string") out.description = localizeScholarshipDescription(s.description, locale);
  if (typeof s.requirements === "string") out.requirements = localizeScholarshipRequirements(s.requirements, locale);
  if (typeof s.statusLabel === "string") out.statusLabel = localizeStatusValue(s.statusLabel, locale);
  if (typeof s.fundingType === "string") out.fundingType = localizeFundingType(s.fundingType, locale);
  return out;
}

/**
 * Localize a scholarship row (title/provider/country/coverage/levels/majors
 * /description/requirements/status labels). `en` returns `s` itself.
 *
 * Memoized like the university row: a 300-record catalogue is localized on
 * every filter change, and the requirement/title patterns are the expensive
 * half. Only translated strings are cached.
 */
export function localizeScholarshipRow<T extends ScholarshipRowLike>(s: T, locale: Locale): T {
  if (locale === "en") return passthrough(s);
  const tl = targetLocale(locale);
  if (!tl) return s;
  const fields = memoizedLocalize("scholarship", locale, s, SCHOLARSHIP_LOCALIZED_FIELDS, (row) =>
    translateScholarshipFields(row as T, locale)
  );
  return {
    ...s,
    // Preserve canonical institution/award nomenclature alongside the
    // translated display field, so a student can still recognize official
    // names and source-page wording.
    officialTitle: s.title ?? null,
    ...fields,
  };
}

/** Status values ("OPEN"/"CLOSED"/"deadline-*") — display localization. */
const STATUS_VALUES: Record<string, Record<TargetLocale, string>> = {
  OPEN: { uz: "OCHIQ", ru: "ОТКРЫТА" },
  CLOSED: { uz: "YOPILGAN", ru: "ЗАКРЫТА" },
  "deadline-overdue": { uz: "muddat o'tib ketgan", ru: "срок просрочен" },
  "deadline-soon": { uz: "muddat yaqinlashmoqda", ru: "срок скоро истекает" },
  rolling: { uz: "Doimiy qabul", ru: "Приём круглый год" },
  upcoming: { uz: "Yaqinlashmoqda", ru: "Скоро откроется" },
  open: { uz: "Ochiq", ru: "Открыта" },
  closed: { uz: "Yopilgan", ru: "Закрыта" },
};

export function localizeStatusValue(value: string | null | undefined, locale: Locale): string {
  if (locale === "en" || value == null) return value ?? "";
  const tl = targetLocale(locale);
  if (!tl) return value;
  const hit = STATUS_VALUES[value] ?? STATUS_VALUES[keyOf(value)];
  return hit ? hit[tl] : value;
}

interface ProgramRowLike {
  name?: Str;
  field?: Str;
  degree?: Str;
  studyMode?: Str;
  language?: Str;
  description?: Str;
  requirements?: unknown;
  [key: string]: unknown;
}

/** The fields `localizeProgramRow` translates (memo signature). */
const PROGRAM_LOCALIZED_FIELDS = ["name", "field", "degree", "studyMode", "language", "description"] as const;

function translateProgramFields<T extends ProgramRowLike>(p: T, locale: Locale): LocalizedFields {
  const out: LocalizedFields = {};
  if (typeof p.name === "string") out.name = localizeProgramName(p.name, locale);
  if (typeof p.field === "string") out.field = localizeMajorOrField(p.field, locale);
  if (typeof p.degree === "string") out.degree = localizeDegreeLevel(p.degree, locale);
  if (typeof p.studyMode === "string") out.studyMode = localizeStudyMode(p.studyMode, locale);
  if (typeof p.language === "string") out.language = localizeProgramLanguage(p.language, locale);
  if (typeof p.description === "string") out.description = localizeProgramDescription(p.description, locale);
  return out;
}

/** Localize a program row (with nested requirement entries). Memoized on the
 *  program's identity, like the university and scholarship rows. */
export function localizeProgramRow<T extends ProgramRowLike>(p: T, locale: Locale): T {
  if (locale === "en") return passthrough(p);
  const tl = targetLocale(locale);
  if (!tl) return p;
  const fields = memoizedLocalize("program", locale, p, PROGRAM_LOCALIZED_FIELDS, (row) =>
    translateProgramFields(row as T, locale)
  );
  return {
    ...p,
    // Keep the original catalogue/programme name available as well as the
    // localized display form; official application links may use it verbatim.
    officialName: p.name ?? null,
    ...fields,
    // Nested requirement rows are translated (and memoized) one level down.
    requirements: Array.isArray(p.requirements)
      ? p.requirements.map((req) => localizeRequirementRow(req, locale))
      : p.requirements,
  };
}

const STUDY_MODE_NAMES: Record<string, Record<TargetLocale, string>> = {
  "Full-time": { uz: "Kunduzgi", ru: "Очная" },
  "Part-time": { uz: "Sirtqi", ru: "Заочная" },
  Online: { uz: "Onlayn", ru: "Онлайн" },
  Hybrid: { uz: "Gibrid", ru: "Гибридная" },
};

export function localizeStudyMode(mode: string | null | undefined, locale: Locale): string {
  if (locale === "en" || mode == null || mode === "") return mode ?? "";
  const tl = targetLocale(locale);
  if (!tl) return mode;
  const hit = STUDY_MODE_NAMES[mode] ?? STUDY_MODE_NAMES[keyOf(mode)];
  return hit ? hit[tl] : mode;
}

const PROGRAM_LANGUAGE_NAMES: Record<string, Record<TargetLocale, string>> = {
  English: { uz: "Ingliz tili", ru: "Английский" },
  German: { uz: "Nemis tili", ru: "Немецкий" },
  French: { uz: "Fransuz tili", ru: "Французский" },
  Japanese: { uz: "Yapon tili", ru: "Японский" },
  Korean: { uz: "Koreys tili", ru: "Корейский" },
  Dutch: { uz: "Golland tili", ru: "Голландский" },
  Italian: { uz: "Italyan tili", ru: "Итальянский" },
  Spanish: { uz: "Ispan tili", ru: "Испанский" },
  Turkish: { uz: "Turk tili", ru: "Турецкий" },
  Chinese: { uz: "Xitoy tili", ru: "Китайский" },
  Russian: { uz: "Rus tili", ru: "Русский" },
  Uzbek: { uz: "O'zbek tili", ru: "Узбекский" },
  Arabic: { uz: "Arab tili", ru: "Арабский" },
  Portuguese: { uz: "Portugal tili", ru: "Португальский" },
  Swedish: { uz: "Shved tili", ru: "Шведский" },
  Danish: { uz: "Daniya tili", ru: "Датский" },
  Norwegian: { uz: "Norveg tili", ru: "Норвежский" },
  Finnish: { uz: "Fin tili", ru: "Финский" },
  Icelandic: { uz: "Island tili", ru: "Исландский" },
  Latvian: { uz: "Latviya tili", ru: "Латышский" },
  Polish: { uz: "Polyak tili", ru: "Польский" },
  Czech: { uz: "Chex tili", ru: "Чешский" },
  Hungarian: { uz: "Vengr tili", ru: "Венгерский" },
  // Compound values used by the programme catalogue ("German/English").
  "German/English": { uz: "Nemis / Ingliz tili", ru: "Немецкий / Английский" },
  "English/German": { uz: "Ingliz / Nemis tili", ru: "Английский / Немецкий" },
  "French/English": { uz: "Fransuz / Ingliz tili", ru: "Французский / Английский" },
  "English/French": { uz: "Ingliz / Fransuz tili", ru: "Английский / Французский" },
  "Spanish/English": { uz: "Ispan / Ingliz tili", ru: "Испанский / Английский" },
  "English/Spanish": { uz: "Ingliz / Ispan tili", ru: "Английский / Испанский" },
  "Italian/English": { uz: "Italyan / Ingliz tili", ru: "Итальянский / Английский" },
  "Dutch/English": { uz: "Golland / Ingliz tili", ru: "Голландский / Английский" },
};

export function localizeProgramLanguage(language: string | null | undefined, locale: Locale): string {
  if (locale === "en" || language == null || language === "") return language ?? "";
  const tl = targetLocale(locale);
  if (!tl) return language;
  const hit = PROGRAM_LANGUAGE_NAMES[language] ?? PROGRAM_LANGUAGE_NAMES[keyOf(language)];
  return hit ? hit[tl] : language;
}

interface RequirementRowLike {
  requirementType?: Str;
  valueText?: Str;
  [key: string]: unknown;
}

export function localizeRequirementRow<T extends RequirementRowLike>(req: T, locale: Locale): T {
  if (locale === "en") return passthrough(req);
  const tl = targetLocale(locale);
  if (!tl) return req;
  return {
    ...req,
    valueText: typeof req.valueText === "string" ? localizeRequirementText(req.valueText, locale) : req.valueText,
  };
}

interface CycleRowLike {
  intake?: Str;
  applicationType?: Str;
  [key: string]: unknown;
}

const INTAKE_NAMES: Record<string, Record<TargetLocale, string>> = {
  Fall: { uz: "Kuz", ru: "Осень" },
  Winter: { uz: "Qish", ru: "Зима" },
  Spring: { uz: "Bahor", ru: "Весна" },
  Summer: { uz: "Yoz", ru: "Лето" },
  "Fall/Spring": { uz: "Kuz/Bahor", ru: "Осень/Весна" },
  Rolling: { uz: "Doimiy qabul", ru: "Приём круглый год" },
};

const APPLICATION_TYPE_NAMES: Record<string, Record<TargetLocale, string>> = {
  "Direct Application": { uz: "To'g'ridan-to'g'ri ariza", ru: "Прямая заявка" },
  "Common Application": { uz: "Umumiy ariza (Common App)", ru: "Единая заявка (Common App)" },
  "UCAS": { uz: "UCAS orqali", ru: "Через UCAS" },
  "University Portal": { uz: "Universitet portali", ru: "Портал университета" },
};

export function localizeApplicationCycleRow<T extends CycleRowLike>(cycle: T, locale: Locale): T {
  if (locale === "en") return passthrough(cycle);
  const tl = targetLocale(locale);
  if (!tl) return cycle;
  return {
    ...cycle,
    intake: typeof cycle.intake === "string" ? (INTAKE_NAMES[cycle.intake]?.[tl] ?? cycle.intake) : cycle.intake,
    applicationType:
      typeof cycle.applicationType === "string"
        ? (APPLICATION_TYPE_NAMES[cycle.applicationType]?.[tl] ?? cycle.applicationType)
        : cycle.applicationType,
  };
}

/** Seeded opportunity titles — exact dictionary (brands stay recognizable). */
const OPPORTUNITY_TITLES: Record<string, Record<TargetLocale, string>> = {
  "Google Summer of Code": { uz: "Google Summer of Code", ru: "Google Summer of Code" },
  "Google Summer of Code — docs and design roles": {
    uz: "Google Summer of Code — hujjatlar va dizayn yo'nalishlari",
    ru: "Google Summer of Code — направления документации и дизайна",
  },
  "Google Summer of Code (GSoC)": { uz: "Google Summer of Code (GSoC)", ru: "Google Summer of Code (GSoC)" },
  "Microsoft Imagine Cup": { uz: "Microsoft Imagine Cup", ru: "Microsoft Imagine Cup" },
  "iGEM Competition": { uz: "iGEM tanlovi", ru: "Конкурс iGEM" },
  "International Collegiate Programming Contest (ICPC)": {
    uz: "Xalqaro universitetlararo dasturlash musobaqasi (ICPC)",
    ru: "Международный студенческий конкурс по программированию (ICPC)",
  },
  "CERN Summer Student Programme": { uz: "CERN yozgi talabalar dasturi", ru: "Летняя студенческая программа ЦЕРН" },
  "DAAD WISE — Working Internships in Science and Engineering": {
    uz: "DAAD WISE — fan va muhandislikda ish amaliyoti",
    ru: "DAAD WISE — рабочие стажировки в науке и инженерии",
  },
  "MITACS Globalink Research Internship": { uz: "MITACS Globalink ilmiy amaliyoti", ru: "Научная стажировка MITACS Globalink" },
  "European Space Agency — ESA Academy Training Courses": {
    uz: "Yevropa kosmik agentligi — ESA Academy o'quv kurslari",
    ru: "Европейское космическое агентство — учебные курсы ESA Academy",
  },
  "Summer@EPFL": { uz: "Summer@EPFL", ru: "Summer@EPFL" },
  "Amgen Scholars Programme": { uz: "Amgen Scholars dasturi", ru: "Программа Amgen Scholars" },
  "Hult Prize": { uz: "Hult Prize", ru: "Hult Prize" },
  "Erasmus+ Traineeship (student mobility for traineeships)": {
    uz: "Erasmus+ stajirovkasi (stajirovkalar uchun talabalar mobilligi)",
    ru: "Стажировка Erasmus+ (студенческая мобильность)",
  },
  "Mitacs Accelerate": { uz: "Mitacs Accelerate", ru: "Mitacs Accelerate" },
  "DAAD Research Grants — Doctoral Programmes in Germany": {
    uz: "DAAD ilmiy grantlari — Germaniyada doktorantura dasturlari",
    ru: "Исследовательские гранты DAAD — докторские программы в Германии",
  },
  "Kaggle Competitions": { uz: "Kaggle musobaqalari", ru: "Соревнования Kaggle" },
  "TechGirls U.S. Department of State Summer Exchange Program": {
    uz: "TechGirls — AQSh Davlat departamenti yozgi almashinuv dasturi",
    ru: "TechGirls — летняя программа обмена Госдепартамента США",
  },
  "Global Undergraduate Exchange Program (Global UGRAD)": {
    uz: "Global bakalavr almashinuv dasturi (Global UGRAD)",
    ru: "Глобальная программа обмена для бакалавров (Global UGRAD)",
  },
  "University of Sussex & Cambridge International Summer Research Programme": {
    uz: "Sussex va Cambridge universitetlari xalqaro yozgi ilmiy dasturi",
    ru: "Международная летняя исследовательская программа Sussex и Cambridge",
  },
  "Max Planck Institute Summer Internship in Computer Science (MPG SIP)": {
    uz: "Max Planck instituti — informatika bo'yicha yozgi amaliyot (MPG SIP)",
    ru: "Летняя стажировка Института Макса Планка по информатике (MPG SIP)",
  },
  "EPFL Excellence in Engineering Research Internship Program (E3)": {
    uz: "EPFL muhandislik tadqiqotlari amaliyoti mukammallik dasturi (E3)",
    ru: "Программа стажировок в инженерных исследованиях EPFL (E3)",
  },
  "ETH Zurich Student Summer Research Fellowship (SSRF)": {
    uz: "ETH Zurich talabalar yozgi ilmiy fellowship dasturi (SSRF)",
    ru: "Летняя исследовательская феллоушип ETH Zurich (SSRF)",
  },
  "IST Austria (ISTA) ISTernship Summer Program": {
    uz: "IST Austria (ISTA) ISTernship yozgi dasturi",
    ru: "Летняя программа ISTernship IST Austria (ISTA)",
  },
  "OIST Research Internship Program": { uz: "OIST ilmiy amaliyot dasturi", ru: "Программа научных стажировок OIST" },
  "Amgen Scholars Asia Program (University of Tokyo & Kyoto University)": {
    uz: "Amgen Scholars Osiyo dasturi (Tokio va Kioto universitetlari)",
    ru: "Азиатская программа Amgen Scholars (Токийский и Киотский университеты)",
  },
  "Pioneer Academics Global Online Research Program": {
    uz: "Pioneer Academics global onlayn ilmiy dasturi",
    ru: "Глобальная онлайн-исследовательская программа Pioneer Academics",
  },
  "LaunchX Entrepreneurship Summer Program": { uz: "LaunchX tadbirkorlik yozgi dasturi", ru: "Летняя программа предпринимательства LaunchX" },
  "Yale Young Global Scholars (YYGS)": { uz: "Yale Young Global Scholars (YYGS)", ru: "Yale Young Global Scholars (YYGS)" },
  "Stanford Pre-Collegiate Summer Institutes": { uz: "Stanford Pre-Collegiate yozgi institutlari", ru: "Летние институты Stanford Pre-Collegiate" },
  "MLH Fellowship (Major League Hacking)": { uz: "MLH Fellowship (Major League Hacking)", ru: "MLH Fellowship (Major League Hacking)" },
  "UN Youth Volunteer & UNICEF Uzbekistan Youth Innovation Lab": {
    uz: "BMT Yoshlar ko'ngilliligi va UNICEF O'zbekiston yoshlar innovatsiya laboratoriyasi",
    ru: "Молодёжное волонтёрство ООН и Инновационная лаборатория молодёжи UNICEF Узбекистана",
  },
  "Harvard WorldMUN & Tashkent International Model United Nations (TIMUN)": {
    uz: "Harvard WorldMUN va Toshkent xalqaro namunaviy BMT (TIMUN)",
    ru: "Harvard WorldMUN и Ташкентская международная модель ООН (TIMUN)",
  },
  "Hult Prize Global Student Social Enterprise Challenge": {
    uz: "Hult Prize global talabalar ijtimoiy tadbirkorlik tanlovi",
    ru: "Глобальный студенческий конкурс социального предпринимательства Hult Prize",
  },
};

export function localizeOpportunityTitle(title: string | null | undefined, locale: Locale): string {
  if (locale === "en" || title == null || title === "") return title ?? "";
  const tl = targetLocale(locale);
  if (!tl) return title;
  const hit = OPPORTUNITY_TITLES[title.trim()];
  return hit ? hit[tl] : title;
}

interface OpportunityRowLike {
  title?: Str;
  provider?: Str;
  country?: Str;
  fields?: unknown;
  description?: Str;
  [key: string]: unknown;
}

/** Localize opportunity title/description/fields/country (provider stays
 *  verbatim). `en` returns the row itself. `fields` may be a JSON-list string
 *  (DB `text` column) or a parsed array. */
/** The fields `localizeOpportunityRow` translates (memo signature). */
const OPPORTUNITY_LOCALIZED_FIELDS = ["title", "country", "fields", "description"] as const;

function translateOpportunityFields<T extends OpportunityRowLike>(o: T, locale: Locale): LocalizedFields {
  const out: LocalizedFields = {};
  if (typeof o.title === "string") out.title = localizeOpportunityTitle(o.title, locale);
  if (typeof o.country === "string") out.country = localizeCountry(o.country, locale);
  if (typeof o.fields === "string") out.fields = mapJsonStringArray(o.fields, (item) => localizeMajorOrField(item, locale));
  if (typeof o.description === "string") out.description = localizeOpportunityDescription(o.description, locale);
  return out;
}

/** Localize an opportunity row. Memoized like the rest of the catalogue. */
export function localizeOpportunityRow<T extends OpportunityRowLike>(o: T, locale: Locale): T {
  if (locale === "en") return passthrough(o);
  const tl = targetLocale(locale);
  if (!tl) return o;
  // `fields` can arrive as a real array (already parsed by the route) — that
  // shape is translated directly instead of going through the string memo.
  if (Array.isArray(o.fields)) {
    return {
      ...o,
      title: typeof o.title === "string" ? localizeOpportunityTitle(o.title, locale) : o.title,
      country: typeof o.country === "string" ? localizeCountry(o.country, locale) : o.country,
      fields: o.fields.map((f) => (typeof f === "string" ? localizeMajorOrField(f, locale) : f)),
      description: typeof o.description === "string" ? localizeOpportunityDescription(o.description, locale) : o.description,
    };
  }
  return {
    ...o,
    ...memoizedLocalize("opportunity", locale, o, OPPORTUNITY_LOCALIZED_FIELDS, (row) =>
      translateOpportunityFields(row as T, locale)
    ),
  };
}

/** Seeded opportunity descriptions — exact dictionary (all 34 seed rows). */
const OPPORTUNITY_DESCRIPTIONS: Record<string, Record<TargetLocale, string>> = {
  "Paid open-source contribution programme: students work with a mentoring organisation for roughly three months on a defined coding project.":
    {
      uz: "Haqli ochiq kodga hissa qo'shish dasturi: talabalar taxminan uch oy davomida hamkor tashkilot bilan aniq kodlash loyihasi ustida ishlaydilar.",
      ru: "Оплачиваемая программа участия в open-source: студенты около трёх месяцев работают с наставнической организацией над определённым кодовым проектом.",
    },
  "The same programme also accepts non-code projects (documentation, design, accessibility) at participating mentoring organisations.":
    {
      uz: "Shu dastur, shuningdek, ishtirok etuvchi hamkor tashkilotlarda kodga oid bo'lmagan loyihalarni (hujjatlar, dizayn, qulaylik) ham qabul qiladi.",
      ru: "Та же программа принимает и некодовые проекты (документация, дизайн, доступность) в участвующих наставнических организациях.",
    },
  "Global student technology competition: teams build a project using AI or cloud services and pitch it in rounds, with mentorship and prizes.":
    {
      uz: "Global talabalar texnologiya tanlovi: jamoalar sun'iy intellekt yoki bulut xizmatlaridan foydalanib loyiha yaratadi va uni bosqichma-bosqich himoya qiladi, hamda mentorlik va sovg'alar mavjud.",
      ru: "Глобальный студенческий технологический конкурс: команды создают проект с использованием ИИ или облачных сервисов и защищают его в турах, с наставничеством и призами.",
    },
  "Team-based synthetic biology competition: students design, build and present a project at the annual Grand Jamboree.":
    {
      uz: "Jamoa asosidagi sintetik biologiya tanlovi: talabalar loyihani loyihalashtiradi, quradi va yillik Grand Jamboree'da taqdim etadi.",
      ru: "Командный конкурс по синтетической биологии: студенты проектируют, создают и представляют проект на ежегодном Grand Jamboree.",
    },
  "University programming contest run through regional and world finals; teams of three solve algorithmic problems under time pressure.":
    {
      uz: "Mintaqaviy va jahon final bosqichlari orqali o'tkaziladigan universitetlararo dasturlash musobaqasi; uch kishidan iborat jamoalar vaqt chegarasida algoritmik masalalarni yechadi.",
      ru: "Университетский конкурс по программированию с региональными и мировыми финалами; команды из трёх человек решают алгоритмические задачи на время.",
    },
  "Summer placement at CERN: lectures plus work with a research team on physics, computing or engineering projects.":
    {
      uz: "CERN'dagi yozgi amaliyot: ma'ruzalar va fizika, hisoblash texnikasi yoki muhandislik loyihalari bo'yicha tadqiqot jamoasi bilan ishlash.",
      ru: "Летняя стажировка в ЦЕРН: лекции и работа с исследовательской командой над проектами по физике, вычислениям или инженерии.",
    },
  "Scholarship for students from partner countries to complete a research internship with a German university group; application through the DAAD portal.":
    {
      uz: "Hamkor davlatlar talabalari uchun Germaniya universitet guruhi bilan ilmiy amaliyotni o'tashga mo'ljallangan stipendiya; ariza DAAD portali orqali topshiriladi.",
      ru: "Стипендия для студентов из стран-партнёров для прохождения исследовательской стажировки в немецкой университетской группе; заявка через портал DAAD.",
    },
  "Competitive research internship at a Canadian university, with a stipend; matching happens through the Mitacs portal each year.":
    {
      uz: "Kanada universitetida stipendiyali raqobatli ilmiy amaliyot; tanlov har yili Mitacs portali orqali amalga oshiriladi.",
      ru: "Конкурсная исследовательская стажировка в канадском университете со стипендией; подбор проходит через портал Mitacs ежегодно.",
    },
  "Short hands-on training courses and workshops for university students on space engineering, science and operations.":
    {
      uz: "Universitet talabalari uchun kosmik muhandislik, fan va operatsiyalar bo'yicha qisqa amaliy o'quv kurslari va seminarlar.",
      ru: "Короткие практические курсы и воркшопы для студентов по космической инженерии, науке и операциям.",
    },
  "Summer research internship in an EPFL laboratory with a stipend, aimed at students considering a research career.":
    {
      uz: "EPFL laboratoriyasida stipendiyali yozgi ilmiy amaliyot — ilmiy karierani ko'zlayotgan talabalar uchun mo'ljallangan.",
      ru: "Летняя исследовательская стажировка в лаборатории EPFL со стипендией для студентов, рассматривающих научную карьеру.",
    },
  "Summer research programme in the life sciences hosted by partner universities, with a stipend and a student symposium.":
    {
      uz: "Hamkor universitetlar tomonidan o'tkaziladigan hayot fanlari bo'yicha yozgi ilmiy dastur — stipendiya va talabalar simpoziumi bilan.",
      ru: "Летняя исследовательская программа по наукам о жизни в университетах-партнёрах со стипендией и студенческим симпозиумом.",
    },
  "Social-entrepreneurship competition: campus rounds lead to incubator support and a global final for the strongest student teams.":
    {
      uz: "Ijtimoiy tadbirkorlik tanlovi: kampus bosqichlari inkubator yordami va eng kuchli talabalar jamoalari uchun global finalga olib keladi.",
      ru: "Конкурс социального предпринимательства: кампусные туры ведут к поддержке инкубатора и глобальному финалу для сильнейших студенческих команд.",
    },
  "Funded traineeship abroad through the Erasmus+ programme: students arrange a host organisation and apply through their university's international office.":
    {
      uz: "Erasmus+ dasturi orqali xorijda moliyalashtirilgan stajirovka: talabalar qabul qiluvchi tashkilotni topadi va universitetining xalqaro bo'limi orqali ariza beradi.",
      ru: "Оплачиваемая стажировка за рубежом по программе Erasmus+: студенты сами находят принимающую организацию и подают заявку через международный офис университета.",
    },
  "Research internship for graduate students and postdocs, pairing an academic supervisor with an industry partner in Canada.":
    {
      uz: "Magistratura talabalari va doktorantlar uchun ilmiy amaliyot: Kanadada akademik rahbar va sanoat hamkorini birlashtiradi.",
      ru: "Исследовательская стажировка для магистрантов и постдоков с парой «академический руководитель — индустриальный партнёр» в Канаде.",
    },
  "Research grant for doctoral candidates to carry out a research project or full doctorate at a German university; see the DAAD scholarship database for the current call.":
    {
      uz: "Doktorantlar uchun Germaniya universitetida ilmiy loyiha yoki to'liq doktorantura o'tashga mo'ljallangan ilmiy grant; joriy tanlov uchun DAAD stipendiyalar bazasiga qarang.",
      ru: "Исследовательский грант для докторантов на проведение проекта или полной докторантуры в немецком вузе; текущий набор — в базе стипендий DAAD.",
    },
  "Continuous public machine-learning competitions: any student can enter, and a public leaderboard result is a portable, verifiable portfolio item.":
    {
      uz: "Doimiy ochiq mashinali o'qitish musobaqalari: istalgan talaba qatnasha oladi, ochiq reyter natijasi esa ko'chirilishi mumkin bo'lgan, tekshiriladigan portfolio elementi bo'ladi.",
      ru: "Постоянные открытые соревнования по машинному обучению: участвовать может любой студент, а результат в публичном лидерборде — переносимый и проверяемый элемент портфолио.",
    },
  "Fully funded U.S. Department of State summer exchange for young women in STEM from Uzbekistan and eligible countries, hosted at Virginia Tech with U.S. tech mentoring and a community action project.":
    {
      uz: "O'zbekiston va mos davlatlardan STEM sohasidagi yosh qizlar uchun AQSh Davlat departamenti tomonidan to'liq moliyalashtiriladigan yozgi almashinuv — Virginia Tech'da AQSh texnologik mentorligi va jamoat loyihasi bilan.",
      ru: "Полностью финансируемая летняя программа обмена Госдепартамента США для девушек в STEM из Узбекистана и подходящих стран в Virginia Tech с наставничеством и проектом для сообщества.",
    },
  "Fully funded one-semester non-degree academic scholarship at an accredited U.S. university for undergraduate students from Uzbekistan and partner nations, covering tuition, room and board, airfare, and stipend.":
    {
      uz: "O'zbekiston va hamkor davlatlar bakalavrlari uchun AQShdagi akkreditatsiyalangan universitetda bir semestrlik to'liq moliyalashtiriladigan darajasiz o'quv stipendiyasi — kontrakt, turar joy, ovqat, aviachipta va stipendiyani qamrab oladi.",
      ru: "Полностью финансируемая односеместровая академическая стипендия без выдачи степени в аккредитованном университете США для студентов бакалавриата из Узбекистана и стран-партнёров: обучение, проживание, питание, перелёт и стипендия.",
    },
  "Intensive UK summer research and academic immersion programme pairing international undergraduates with faculty research groups, laboratory workshops, and merit scholarship support.":
    {
      uz: "Buyuk Britaniyaning intensiv yozgi ilmiy va akademik sho'ng'in dasturi — xalqaro bakalavrlarni fakultet tadqiqot guruhlari, laboratoriya seminarlari va yutuqlar stipendiyasi bilan birlashtiradi.",
      ru: "Интенсивная британская летняя исследовательская и академическая программа: иностранных бакалавров объединяют с факультетскими исследовательскими группами, лабораторными воркшопами и стипендиальной поддержкой.",
    },
  "Paid 10-to-14-week research internship at the Max Planck Institutes in Saarbrücken, Kaiserslautern, and Bochum; all selected interns receive a monthly stipend, housing support, and round-trip travel.":
    {
      uz: "Max Planck institutlarida (Saarbrücken, Kaiserslautern, Bochum) 10-14 haftalik haqli ilmiy amaliyot; barcha tanlangan amaliyotchilar oylik stipendiya, turar joy yordami va qatnov yo'l xarajatlarini oladi.",
      ru: "Оплачиваемая 10–14-недельная исследовательская стажировка в институтах Макса Планка (Заарбрюкен, Кайзерслаутерн, Бохум); все отобранные стажёры получают ежемесячную стипендию, жильё и проезд.",
    },
  "Competitive 8-to-12-week summer laboratory fellowship in Lausanne for bachelor and master students worldwide, providing CHF 1,600 per month for living costs plus refunded travel expenses.":
    {
      uz: "Lozannada butun dunyo bakalavrlari va magistrlari uchun 8-12 haftalik raqobatli yozgi laboratoriya fellowship dasturi — oyiga 1 600 Shveytsariya franki yashash xarajatlari va qaytariladigan yo'l xarajatlari bilan.",
      ru: "Конкурсная 8–12-недельная летняя лабораторная стипендия в Лозанне для бакалавров и магистров со всего мира: 1 600 швейцарских франков в месяц на жизнь плюс компенсация дороги.",
    },
  "Two-month summer research fellowship in Zurich open to bachelor and master students globally, offering a CHF 4,000 living allowance, travel reimbursement, and direct mentorship in an ETH CS lab.":
    {
      uz: "Sürixda butun dunyo bakalavrlari va magistrlari uchun ikki oylik yozgi ilmiy fellowship — 4 000 Shveytsariya franki yashash yordami, yo'l xarajatlari qoplamasi va ETH informatika laboratoriyasida to'g'ridan-to'g'ri mentorlik bilan.",
      ru: "Двухлетняя (2 месяца) летняя исследовательская стипендия в Цюрихе для бакалавров и магистров со всего мира: 4 000 швейцарских франков, компенсация дороги и наставничество в лаборатории ETH.",
    },
  "Fully funded summer research internship near Vienna for bachelor and master students, providing a monthly EUR 1,150 stipend, travel allowance, subsidized campus housing, and an annual research symposium.":
    {
      uz: "Vena yaqinida bakalavrlar va magistrlar uchun to'liq moliyalashtirilgan yozgi ilmiy amaliyot — oylik 1 150 evro stipendiya, yo'l xarajatlari, subsidiyalangan kampus turar joyi va yillik ilmiy simpozium bilan.",
      ru: "Полностью финансируемая летняя исследовательская стажировка под Веной для бакалавров и магистров: ежемесячная стипендия 1 150 евро, дорога, субсидируемое жильё и ежегодный симпозиум.",
    },
  "Two-to-six-month funded research placement in Okinawa, Japan for final-year bachelor and master students, providing a daily tax-free allowance of JPY 2,400, furnished apartment, and round-trip airfare.":
    {
      uz: "Yaponiyaning Okinava shahrida bitiruvchi kurs bakalavrlari va magistrlari uchun 2-6 oylik moliyalashtirilgan ilmiy joylashuv — kundalik 2 400 yep soliqsiz yordam, jihozlangan kvartira va qatnov aviachiptasi bilan.",
      ru: "Финансируемое 2–6-месячное исследовательское размещение в Окинаве (Япония) для выпускных курсов бакалавриата и магистратуры: ежедневное необлагаемое пособие 2 400 иен, меблированная квартира и авиабилет.",
    },
  "Eight-week biomedical and biotechnology summer research fellowship hosted in Japan and Singapore for undergraduates from across Asia, including Uzbekistan, with full travel, accommodation, and stipend.":
    {
      uz: "Yaponiya va Singapurda o'tkaziladigan, O'zbekiston hamda Osiyoning boshqa davlatlari bakalavrlari uchun sakkiz haftalik biomeditsina va biotexnologiya yozgi ilmiy fellowship dasturi — to'liq sayohat, turar joy va stipendiya bilan.",
      ru: "Восьминедельная летняя исследовательская стипендия по биомедицине и биотехнологиям в Японии и Сингапуре для студентов бакалавриата со всей Азии, включая Узбекистан: дорога, проживание и стипендия.",
    },
  "Rigorous online undergraduate-level research mentorship with U.S. university professors culminating in a cited research paper and four transferable Oberlin College credits, with need-based scholarships.":
    {
      uz: "AQSh universitetlari professorlari bilan bakalavriat darajasidagi qat'iy onlayn ilmiy mentorlik — iqtibos keltirilgan ilmiy maqola va Oberlin College'ning to'rt kreditli o'tkaziladigan kreditlari bilan, ehtiyojga asoslangan stipendiyalar ham mavjud.",
      ru: "Серьёзное онлайн-наставничество уровня бакалавриата с профессорами университетов США, завершающееся цитируемой статьёй и четырьмя переносимыми кредитами Oberlin College, со стипендиями по потребности.",
    },
  "Co-founder startup incubator for ambitious high school entrepreneurs where teams build and launch a real revenue-generating venture over the summer, with need-based financial awards available.":
    {
      uz: "Ishtiyoqli o'rta maktab tadbirkorlari uchun ham-asoschi startap inkubatori — jamoalar yoz davomida haqiqiy daromad keltiruvchi tashabbusni quradi va ishga tushiradi, ehtiyojga asoslangan moliyaviy mukofotlar mavjud.",
      ru: "Инкубатор стартапов для амбициозных старшеклассников-предпринимателей, где команды за лето создают и запускают реальный приносящий доход бизнес, с финансовой поддержкой по потребности.",
    },
  "Two-week residential academic enrichment program in New Haven, Connecticut for high school students from 150+ countries, offering over USD 3 million in need-based tuition waivers annually.":
    {
      uz: "Konnektikut shtatining Nyu-Xeyven shahrida 150+ davlatdan o'rta maktab o'quvchilari uchun ikki haftalik yashash joyi bilan akademik rivojlantirish dasturi — har yili 3 million AQSh dollaridan ortiq ehtiyojga asoslangan kontrakt imtiyozlari bilan.",
      ru: "Двухнедельная академическая проживаемая программа в Нью-Хейвене (Коннектикут) для школьников из 150+ стран с ежегодными льготами по оплате обучения на сумму свыше 3 млн долларов.",
    },
  "Intensive single-subject enrichment courses taught by Stanford instructors for grades 8–11 worldwide, featuring live seminar discussions, hands-on projects, and need-based financial aid.":
    {
      uz: "Butun dunyo 8-11-sinf o'quvchilari uchun Stenford o'qituvchilari tomonidan o'tkaziladigan intensiv yagona fan boyicha rivojlantirish kurslari — jonli seminarlar, amaliy loyihalar va ehtiyojga asoslangan moliyaviy yordam bilan.",
      ru: "Интенсивные однопредметные курсы от инструкторов Стэнфорда для 8–11 классов по всему миру: живые семинары, практические проекты и финансовая помощь по потребности.",
    },
  "Global online open-source engineering mentorship where contributors work 12+ weeks with leading software organizations and earn a purchasing-power-adjusted stipend between USD 1,500 and USD 6,600.":
    {
      uz: "Global onlayn ochiq kod muhandislik mentorligi: ishtirokchilar 12+ hafta davomida yetakchi dasturiy ta'minot tashkilotlari bilan ishlaydi va xaridorlik qobiliyatiga moslashtirilgan 1 500-6 600 AQSh dollarigacha stipendiya oladi.",
      ru: "Глобальное онлайн-наставничество в open-source инженерии: участники 12+ недель работают с ведущими софтверными организациями и получают стипендию 1 500–6 600 долларов с поправкой на покупательную способность.",
    },
  "Remote 12-week software engineering and AI fellowship matching student developers with production open-source repositories maintained by Meta, Google, and AWS engineers, with educational stipends.":
    {
      uz: "Masofaviy 12 haftalik dasturiy injiniring va sun'iy intellekt fellowship dasturi: talaba dasturchilarni Meta, Google va AWS muhandislari saqlaydigan ishlab chiqarish ochiq kod omborlari bilan moslashtiradi, o'quv stipendiyalari bilan.",
      ru: "Дистанционная 12-недельная программа по программной инженерии и ИИ: студенческих разработчиков сопоставляют с продакшен-репозиториями, которые ведут инженеры Meta, Google и AWS, с учебными стипендиями.",
    },
  "National and international youth civic innovation and volunteering assignments across Tashkent, Samarkand, and Karakalpakstan focused on climate resilience, digital inclusion, and SDG leadership.":
    {
      uz: "Toshkent, Samarqand va Qoraqalpog'istonda iqlim chidamliligi, raqamli inkluzivlik va BMT BTY liderligiga qaratilgan milliy va xalqaro yoshlar fuqarolik innovatsiyasi va ko'ngillilik topshiriqlari.",
      ru: "Национальные и международные молодёжные гражданские инновационные и волонтёрские задания в Ташкенте, Самарканде и Каракалпакстане с фокусом на климатическую устойчивость, цифровую инклюзию и лидерство ЦУР.",
    },
  "Premier parliamentary diplomacy and crisis simulation circuit connecting Uzbek high school and university delegates with global peers, best-delegate gavel awards, and international conference fee waivers.":
    {
      uz: "O'zbekiston o'rta maktab va universitet delegatlarini global tengdoshlar bilan bog'laydigan nufuzli parlament diplomatiyasi va inqiroz simulyatsiyasi anjumani — eng yaxshi delegat gavel mukofotlari va xalqaro konferensiya to'lovlaridan ozodlik bilan.",
      ru: "Престижный симуляционный цепной турнир по парламентской дипломатии и кризисным симуляциям, соединяющий узбекских школьных и студенческих делегатов с мировыми коллегами, награды лучшему делегату и освобождение от сборов.",
    },
  "Year-long global social entrepreneurship competition — with active OnCampus qualifiers at Tashkent universities — where student teams pitch for USD 1,000,000 in seed capital to solve pressing UN SDG challenges.":
    {
      uz: "Yillik global ijtimoiy tadbirkorlik tanlovi — Toshkent universitetlarida faol OnCampus saralash bosqichlari bilan — talabalar jamoalari BMT BTD muhim masalalarini yechish uchun 1 000 000 AQSh dollarlik boshlang'ich kapital uchun kurashadi.",
      ru: "Годовой глобальный конкурс социального предпринимательства с отборочными турами OnCampus в университетах Ташкента: студенческие команды борются за 1 000 000 долларов стартового капитала для решения задач ЦУР ООН.",
    },
};

export function localizeOpportunityDescription(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  const exact = OPPORTUNITY_DESCRIPTIONS[text.trim()];
  return exact ? exact[tl] : text;
}

interface TaskRowLike {
  title?: Str;
  category?: Str;
  [key: string]: unknown;
}

/** Seeded application-task titles (exact dictionary — user-created tasks are
 *  returned verbatim because they are personal notes, not catalog copy). */
const TASK_TITLES: Record<string, Record<TargetLocale, string>> = {
  "Draft Statement of Purpose (SOP) tailored for TUM": {
    uz: "TUM uchun moslashtirilgan maqsad xati (SOP) loyihasini tayyorlash",
    ru: "Подготовить черновик заявления о целях (SOP) для TUM",
  },
  "Request Recommendation Letter from Dr. Vance (ML Professor)": {
    uz: "Dr. Vansdan (ML professori) tavsiyanoma xati so'rash",
    ru: "Запросить рекомендательное письмо у д-ра Вэнса (профессор ML)",
  },
  "Order WES Official Academic Transcript Evaluation": {
    uz: "WES rasmiy akademik transkript baholashini buyurtma qilish",
    ru: "Заказать официальную оценку транскрипта WES",
  },
  "Submit University of Toronto Online Application Portal": {
    uz: "Toronto universitetining onlayn ariza portaliga topshirish",
    ru: "Подать заявку через онлайн-портал Торонтского университета",
  },
};

const TASK_CATEGORY_NAMES: Record<string, Record<TargetLocale, string>> = {
  "SOP & Essays": { uz: "SOP va essealar", ru: "SOP и эссе" },
  LOR: { uz: "Tavsiyanoma xatlari (LOR)", ru: "Рекомендательные письма (LOR)" },
  "Document Prep": { uz: "Hujjatlar tayyorgarligi", ru: "Подготовка документов" },
  Exams: { uz: "Imtihonlar", ru: "Экзамены" },
  Applications: { uz: "Arizalar", ru: "Заявки" },
  Interviews: { uz: "Suhbatlar", ru: "Собеседования" },
  Financials: { uz: "Moliyaviy masalalar", ru: "Финансовые вопросы" },
  Other: { uz: "Boshqa", ru: "Прочее" },
};

/** Localize a seeded application-task row (title/category). `en` passthrough. */
export function localizeTaskRow<T extends TaskRowLike>(task: T, locale: Locale): T {
  if (locale === "en") return passthrough(task);
  const tl = targetLocale(locale);
  if (!tl) return task;
  const title = typeof task.title === "string" ? task.title : task.title;
  const category = typeof task.category === "string" ? task.category : task.category;
  const titleHit = typeof title === "string" ? TASK_TITLES[title.trim()] : undefined;
  const categoryHit = typeof category === "string" ? TASK_CATEGORY_NAMES[category.trim()] : undefined;
  if (!titleHit && !categoryHit) return task;
  return {
    ...task,
    title: titleHit ? titleHit[tl] : task.title,
    category: categoryHit ? categoryHit[tl] : task.category,
  };
}

/* ============================================================================
 * 12. [id]-DETAIL PAYLOAD LOCALIZATION (cachedBase or fresh — one pass)
 * ========================================================================== */

interface DetailPayloadLike {
  university?: { [key: string]: unknown } | null;
  programs?: Array<{ [key: string]: unknown }> | null;
  universityRequirements?: { other?: unknown; subject?: unknown; [key: string]: unknown } | null;
  applicationCycles?: Array<{ [key: string]: unknown }> | null;
  cycles?: Array<{ [key: string]: unknown }> | null;
  scholarships?: Array<{ [key: string]: unknown }> | null;
  match?: { [key: string]: unknown } | null;
  [key: string]: unknown;
}

/**
 * Localize a `GET /api/universities/[id]` payload as a copy. Covers both the
 * `cachedBase` path and the fresh-query path. The `match` block (reasons /
 * issues) is produced by `translateReasons` and passes through untouched;
 * `money`/`sources`/`campuses`/`images` are structural and stay verbatim.
 * `en` returns the same object reference (byte-identical).
 */
export function localizeDetailPayload<T extends DetailPayloadLike>(payload: T, locale: Locale): T {
  if (locale === "en") return passthrough(payload);
  const tl = targetLocale(locale);
  if (!tl) return payload;
  const rawUniversity = payload.university as UniversityRowLike | null | undefined;
  const localizedUniversity = rawUniversity
    ? (localizeUniversityRow(rawUniversity, locale) as unknown as { [key: string]: unknown })
    : payload.university;
  // The student has to be able to tell a translation from the source sentence:
  // 10 of the 356 descriptions cannot be rendered faithfully (the four
  // hand-written rows, and six whose funding headline is outside the
  // vocabulary) and stay English. The flag says so, so a view can label them
  // exactly as the profile page does.
  const descriptionSourceLanguage: "en" | null =
    rawUniversity && typeof rawUniversity.description === "string" && rawUniversity.description.trim() !== ""
      ? universityDescriptionState(rawUniversity.description, locale).verbatim
        ? "en"
        : null
      : null;
  const university = localizedUniversity
    ? { ...localizedUniversity, descriptionSourceLanguage }
    : payload.university;
  const programs = Array.isArray(payload.programs)
    ? payload.programs.map((p) => localizeProgramRow(p as ProgramRowLike, locale))
    : payload.programs;
  const reqs = payload.universityRequirements;
  const universityRequirements = reqs
    ? {
        ...reqs,
        other: Array.isArray(reqs.other)
          ? reqs.other.map((t) => (typeof t === "string" ? localizeRequirementText(t, locale) : t))
          : reqs.other,
        subject: Array.isArray(reqs.subject)
          ? reqs.subject.map((t) => (typeof t === "string" ? localizeRequirementText(t, locale) : t))
          : reqs.subject,
      }
    : payload.universityRequirements;
  const cycleList = payload.applicationCycles ?? payload.cycles;
  const cycles = Array.isArray(cycleList) ? cycleList.map((c) => localizeApplicationCycleRow(c as CycleRowLike, locale)) : cycleList;
  const scholarships = Array.isArray(payload.scholarships)
    ? payload.scholarships.map((s) => localizeScholarshipRow(s as ScholarshipRowLike, locale))
    : payload.scholarships;
  return { ...payload, university, programs, universityRequirements, applicationCycles: cycles, scholarships };
}
