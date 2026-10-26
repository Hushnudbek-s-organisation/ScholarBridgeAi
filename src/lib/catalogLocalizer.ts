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
import { dictionaries } from "@/i18n/messages";
import { countryTranslationKey } from "@/lib/countries";

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
  Cambridge: { uz: "Kembridge", ru: "Кембридж" },
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
  "Climate Science": { uz: "Ilimshunoslik (klimat)", ru: "Климатология" },
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
  "Theology / Religious Studies": { uz: "Ilоhiyat / Diniy ta'limotlar", ru: "Богословие / Религиоведение" },
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
];

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
        .join(sep === " and " ? (tl === "uz" ? " va " : " и ") : sep);
    }
  }
  // Word/alias layer on the full remaining string.
  let out = trimmed;
  for (const [pattern, translations] of FIELD_WORD_ALIASES) {
    if (pattern.test(out)) {
      out = out.replace(pattern, translations[tl]);
    }
  }
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

/** University type display (canonical filter values "Public"/"Private" kept). */
const UNIVERSITY_TYPE_NAMES: Record<string, Record<TargetLocale, string>> = {
  Public: { uz: "Davlat", ru: "Государственный" },
  Private: { uz: "Xususiy", ru: "Частный" },
};

export function localizeUniversityType(type: string | null | undefined, locale: Locale): string {
  if (locale === "en" || type == null || type === "") return type ?? "";
  const tl = targetLocale(locale);
  if (!tl) return type;
  const hit = UNIVERSITY_TYPE_NAMES[type] ?? UNIVERSITY_TYPE_NAMES[keyOf(type)];
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

export function localizeUniversityDescription(text: string | null | undefined, locale: Locale): string {
  if (locale === "en" || text == null || text === "") return text ?? "";
  const tl = targetLocale(locale);
  if (!tl) return text;
  const exact = UNIVERSITY_DESCRIPTIONS[text.trim()];
  if (exact) return exact[tl];
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

  const location = text.match(/^Located in ([^,]+),\s*([^(]+?)(?:\s*\(Founded (\d+)\))?$/i);
  if (location) {
    const city = localizeCity(location[1].trim(), locale);
    const country = localizeCountry(location[2].trim(), locale);
    const year = location[3];
    if (tl === "uz") {
      return `${city}, ${country}da joylashgan${year ? ` (${year}-yilda tashkil etilgan)` : ""}`;
    }
    return `Расположен в г. ${city}, ${country}${year ? ` (основан в ${year} г.)` : ""}`;
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
export function localizeHighlightItem<T>(item: T, locale: Locale): T {
  if (locale === "en") return item;
  const tl = targetLocale(locale);
  if (!tl) return item;
  if (typeof item === "string") {
    const exact = HIGHLIGHT_BADGES[item.trim()];
    if (exact) return exact[tl] as unknown as T;
    const dynamic = localizeDynamicHighlight(item, locale, tl);
    if (dynamic) return dynamic as unknown as T;
    // Pattern layer for unknown badges — phrase substitutions.
    let out: string = item;
    for (const [pattern, translations] of HIGHLIGHT_PHRASES) {
      if (pattern.test(out)) out = out.replace(new RegExp(pattern.source, pattern.flags), translations[tl]);
    }
    return out as unknown as T;
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
          for (const [pattern, translations] of HIGHLIGHT_PHRASES) {
            if (pattern.test(out)) out = out.replace(new RegExp(pattern.source, pattern.flags), translations[tl]);
          }
          newText = out;
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
export function localizeHighlights<T extends string | unknown[] | null | undefined>(highlights: T, locale: Locale): T {
  if (locale === "en") return highlights;
  const tl = targetLocale(locale);
  if (!tl) return highlights;
  if (typeof highlights === "string") {
    return mapJsonStringArray(highlights, (item) => localizeHighlightItem(item, locale)) as T;
  }
  if (Array.isArray(highlights)) {
    return highlights.map((item) => localizeHighlightItem(item, locale)) as T;
  }
  return highlights;
}

/* ============================================================================
 * 7. PATTERN LAYER — PROGRAM NAMES
 * ========================================================================== */

/** Degree prefix table — capture groups are positional (ES2017 target):
 *  1: prefix token, 2: optional "in", 3: field. */
const DEGREE_PREFIX_PARSERS: Array<{ re: RegExp; kind: "bsc" | "ba" | "beng" | "msc" | "ma" | "meng" | "phd" | "other" }> = [
  { re: /^(BSc|Bachelor of Science|BS)\s+(?:in\s+)?(.+)$/i, kind: "bsc" },
  { re: /^(BA|Bachelor of Arts)\s+(?:in\s+)?(.+)$/i, kind: "ba" },
  { re: /^(BEng|Bachelor of Engineering|BE)\s+(?:in\s+)?(.+)$/i, kind: "beng" },
  { re: /^(MSc|Master of Science|MS)\s+(?:in\s+)?(.+)$/i, kind: "msc" },
  { re: /^(MA|Master of Arts)\s+(?:in\s+)?(.+)$/i, kind: "ma" },
  { re: /^(MEng|Master of Engineering)\s+(?:in\s+)?(.+)$/i, kind: "meng" },
  { re: /^(PhD|Doctor of Philosophy|DPhil)\s+(?:in\s+)?(.+)$/i, kind: "phd" },
];

const DEGREE_PREFIX_LABELS: Record<string, Record<TargetLocale, string>> = {
  bsc: { uz: "bakalavr (BSc)", ru: "бакалавр наук (BSc)" },
  ba: { uz: "bakalavr (BA)", ru: "бакалавр гуманитарных наук (BA)" },
  beng: { uz: "muhandislik bakalavri (BEng)", ru: "бакалавр инженерии (BEng)" },
  msc: { uz: "magistr (MSc)", ru: "магистр наук (MSc)" },
  ma: { uz: "magistr (MA)", ru: "магистр гуманитарных наук (MA)" },
  meng: { uz: "muhandislik magistri (MEng)", ru: "магистр инженерии (MEng)" },
  phd: { uz: "doktorantura (PhD)", ru: "докторантура (PhD)" },
};

const PROGRAM_NAME_FULL: Record<string, Record<TargetLocale, string>> = {
  MBA: { uz: "Biznes boshqaruvi magistri (MBA)", ru: "Магистр делового администрирования (MBA)" },
  "Master of Business Administration": { uz: "Biznes boshqaruvi magistri (MBA)", ru: "Магистр делового администрирования (MBA)" },
  "Master of Business Administration (MBA)": { uz: "Biznes boshqaruvi magistri (MBA)", ru: "Магистр делового администрирования (MBA)" },
};

/**
 * Localize a program name with the spec's compositional rule:
 *   uz: "{Field} bo'yicha bakalavr (BSc)" / "{Field} bo'yicha magistr (MSc)"
 *   ru: "Бакалавр наук (BSc) — {Field}" / "Магистр наук (MSc) — {Field}"
 * `en` returns the input verbatim.
 */
export function localizeProgramName(name: string | null | undefined, locale: Locale): string {
  if (locale === "en" || name == null || name === "") return name ?? "";
  const tl = targetLocale(locale);
  if (!tl) return name;
  const trimmed = name.trim();
  const full = PROGRAM_NAME_FULL[trimmed];
  if (full) return full[tl];
  for (const { re, kind } of DEGREE_PREFIX_PARSERS) {
    const m = trimmed.match(re);
    if (m) {
      const field = localizeMajorOrField(m[2], locale);
      const prefix = DEGREE_PREFIX_LABELS[kind][tl];
      if (tl === "uz") return `${field} bo'yicha ${prefix}`;
      return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} — ${field}`;
    }
  }
  // "Bachelor in X" / "Master in X" without a degree token.
  const simple = trimmed.match(/^(Bachelor|Master|Doctor)\s+(?:in\s+)?(.+)$/i);
  if (simple) {
    const field = localizeMajorOrField(simple[2], locale);
    const base = simple[1].toLowerCase();
    if (tl === "uz") {
      const prefix = base === "bachelor" ? "bakalavr" : base === "master" ? "magistr" : "doktorantura (PhD)";
      return `${field} bo'yicha ${prefix}`;
    }
    const prefix = base === "bachelor" ? "Бакалавриат" : base === "master" ? "Магистратура" : "Докторантура (PhD)";
    return `${prefix} — ${field}`;
  }
  // Unknown programme titles may be official names or distinctive wording.
  // Do not token-translate them: keep the canonical name verbatim unless the
  // deterministic degree-prefix parser above can safely reconstruct it.
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

/** Localize the display fields of a university row. `en` returns `uni` itself. */
export function localizeUniversityRow<T extends UniversityRowLike>(uni: T, locale: Locale): T {
  if (locale === "en") return passthrough(uni);
  const tl = targetLocale(locale);
  if (!tl) return uni;
  return {
    ...uni,
    city: typeof uni.city === "string" ? localizeCity(uni.city, locale) : uni.city,
    country: typeof uni.country === "string" ? localizeCountry(uni.country, locale) : uni.country,
    universityType: typeof uni.universityType === "string" ? localizeUniversityType(uni.universityType, locale) : uni.universityType,
    programMajor: typeof uni.programMajor === "string" ? localizeMajorOrField(uni.programMajor, locale) : uni.programMajor,
    description: typeof uni.description === "string" ? localizeUniversityDescription(uni.description, locale) : uni.description,
    highlights: localizeHighlights(uni.highlights as Str, locale),
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

/** Localize a scholarship row (title/provider/country/coverage/levels/majors
 *  /description/requirements/status labels). `en` returns `s` itself. */
export function localizeScholarshipRow<T extends ScholarshipRowLike>(s: T, locale: Locale): T {
  if (locale === "en") return passthrough(s);
  const tl = targetLocale(locale);
  if (!tl) return s;
  return {
    ...s,
    // Preserve canonical institution/award nomenclature alongside the
    // translated display field, so a student can still recognize official
    // names and source-page wording.
    officialTitle: s.title ?? null,
    title: typeof s.title === "string" ? localizeScholarshipTitle(s.title, locale) : s.title,
    provider: typeof s.provider === "string" ? localizeScholarshipProvider(s.provider, locale) : s.provider,
    country: typeof s.country === "string" ? localizeCountry(s.country, locale) : s.country,
    coverageType: typeof s.coverageType === "string" ? localizeCoverageType(s.coverageType, locale) : s.coverageType,
    degreeLevels: mapJsonStringArray(s.degreeLevels as Str, (item) => localizeDegreeLevel(item, locale)),
    eligibleMajors: mapJsonStringArray(s.eligibleMajors as Str, (item) => localizeMajorOrField(item, locale)),
    description: typeof s.description === "string" ? localizeScholarshipDescription(s.description, locale) : s.description,
    requirements: typeof s.requirements === "string" ? localizeScholarshipRequirements(s.requirements, locale) : s.requirements,
    statusLabel: typeof s.statusLabel === "string" ? localizeStatusValue(s.statusLabel, locale) : s.statusLabel,
  };
}

/** Status values ("OPEN"/"CLOSED"/"deadline-*") — display localization. */
const STATUS_VALUES: Record<string, Record<TargetLocale, string>> = {
  OPEN: { uz: "OCHIQ", ru: "ОТКРЫТА" },
  CLOSED: { uz: "YOPILGAN", ru: "ЗАКРЫТА" },
  "deadline-overdue": { uz: "muddat o'tib ketgan", ru: "срок просрочен" },
  "deadline-soon": { uz: "muddat yaqinlashmoqda", ru: "срок скоро истекает" },
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

/** Localize a program row (with nested requirement entries). */
export function localizeProgramRow<T extends ProgramRowLike>(p: T, locale: Locale): T {
  if (locale === "en") return passthrough(p);
  const tl = targetLocale(locale);
  if (!tl) return p;
  const requirements = Array.isArray(p.requirements)
    ? p.requirements.map((req) => localizeRequirementRow(req, locale))
    : p.requirements;
  return {
    ...p,
    // Keep the original catalogue/programme name available as well as the
    // localized display form; official application links may use it verbatim.
    officialName: p.name ?? null,
    name: typeof p.name === "string" ? localizeProgramName(p.name, locale) : p.name,
    field: typeof p.field === "string" ? localizeMajorOrField(p.field, locale) : p.field,
    degree: typeof p.degree === "string" ? localizeDegreeLevel(p.degree, locale) : p.degree,
    studyMode: typeof p.studyMode === "string" ? localizeStudyMode(p.studyMode, locale) : p.studyMode,
    language: typeof p.language === "string" ? localizeProgramLanguage(p.language, locale) : p.language,
    description: typeof p.description === "string" ? localizeProgramDescription(p.description, locale) : p.description,
    requirements,
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
export function localizeOpportunityRow<T extends OpportunityRowLike>(o: T, locale: Locale): T {
  if (locale === "en") return passthrough(o);
  const tl = targetLocale(locale);
  if (!tl) return o;
  const fields = Array.isArray(o.fields)
    ? o.fields.map((f) => (typeof f === "string" ? localizeMajorOrField(f, locale) : f))
    : mapJsonStringArray(o.fields as Str, (item) => localizeMajorOrField(item, locale));
  return {
    ...o,
    title: typeof o.title === "string" ? localizeOpportunityTitle(o.title, locale) : o.title,
    country: typeof o.country === "string" ? localizeCountry(o.country, locale) : o.country,
    fields,
    description: typeof o.description === "string" ? localizeOpportunityDescription(o.description, locale) : o.description,
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
  const university = payload.university ? (localizeUniversityRow(payload.university as UniversityRowLike, locale) as unknown) : payload.university;
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
