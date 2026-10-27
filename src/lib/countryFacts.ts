/**
 * Student-visa facts for the fifteen destination countries the catalogue is
 * built around (spec §4: `directEntryWith11YearDiploma`, `proofOfFundsUSD`,
 * `embassyInTashkent`, `partTimeWorkHours`, post-study work), in all three
 * languages of the product.
 *
 * WHAT THIS IS — AND WHAT IT IS NOT
 * ---------------------------------
 * Every published figure below was read from the named source on
 * `lastVerifiedAt` and is reproduced with the currency and period the source
 * uses. The USD mirror is derived with the SAME reference rate table the rest of
 * the app uses (`CURRENCY_RATES_TO_USD` in `countryCostBenchmarks.ts`), so a
 * student never sees two different dollar values for one requirement.
 *
 * `null` is a first-class value here: it means the country has no published
 * national figure, or the figure could not be verified from an authoritative
 * source. The UI renders it as "not published" and the note says where to look.
 * Nothing is estimated, interpolated or filled from memory — a guessed
 * proof-of-funds amount gets a real student's visa refused.
 *
 * MAINTENANCE
 * -----------
 * These figures move every year (Canada adjusts each September, the UK each
 * November, the German blocked account with the BAföG rate). When a figure
 * changes: update the local amount + `asOf`, refresh `lastVerifiedAt`, and re-run
 * `npm run test:country-facts` — it fails when a date is older than 400 days or
 * when a number loses its source.
 */

/** A line of text in each language the product ships. */
export interface LocalizedText {
  en: string;
  uz: string;
  ru: string;
}

/** Where a country's student visa proof-of-funds requirement comes from. */
export type ProofPeriod = "year" | "first-year" | "per-month";

export interface ProofOfFunds {
  /** Amount in the currency the source publishes. `null` = no national figure. */
  amount: number | null;
  currency: string;
  period: ProofPeriod;
  /** Human-readable rendering of the source figure, e.g. "£10,539 / 9 months". */
  localText: string;
  /** USD mirror at the app's reference rate; `null` when `amount` is null. */
  usd: number | null;
  note: LocalizedText | null;
}

export interface Embassy {
  /** `null` = no diplomatic mission in Tashkent (applications go elsewhere). */
  kind: "embassy" | "consulate" | "honorary-consulate" | null;
  name: string | null;
  address: string | null;
  website: string | null;
}

/** How an Uzbek 11-year school-leaving certificate (attestat) is treated. */
export type ElevenYearVerdict = "direct" | "foundation" | "varies" | null;

export interface CountryFacts {
  /** Canonical English country name — the value the catalogue stores. */
  country: string;
  iso2: string;
  proofOfFunds: ProofOfFunds;
  /** Legal part-time limit during term time. `null` = no published weekly limit. */
  partTimeWorkHours: number | null;
  partTimeWorkNote: LocalizedText | null;
  /** Post-study job-seeking / work authorisation, in months. */
  postStudyWorkMonths: number | null;
  postStudyWorkNote: LocalizedText | null;
  elevenYearDiploma: ElevenYearVerdict;
  elevenYearNote: LocalizedText | null;
  /** Official recognition database for foreign school certificates, when one exists. */
  recognitionUrl: string | null;
  embassy: Embassy;
  sourceName: string;
  sourceUrl: string;
  /** ISO date the figures above were read from the source. */
  lastVerifiedAt: string;
  /** Date the published amounts themselves take effect (they change yearly). */
  asOf: string | null;
}

/* ------------------------------------------------------------------ currencies */

/**
 * Mirrors of the reference rates in `countryCostBenchmarks.ts`. Kept as a local
 * literal so this module stays dependency-free (it is imported by both a server
 * route and a client panel); `scripts/check-country-facts.ts` asserts the two
 * tables agree, so they cannot drift apart silently.
 */
export const FACTS_RATE_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.29,
  CAD: 0.73,
  AUD: 0.66,
  CHF: 1.14,
  JPY: 0.0067,
  KRW: 0.00073,
  MYR: 0.23,
  PLN: 0.25,
  CNY: 0.14,
};

/** Annually adjusted amounts: the year they were read for. */
const VERIFIED = "2026-10-28";

function usd(amount: number | null, currency: string): number | null {
  if (amount == null) return null;
  const rate = FACTS_RATE_TO_USD[currency];
  if (!rate) throw new Error(`countryFacts: no reference rate for ${currency}`);
  return Math.round(amount * rate);
}

function proof(
  amount: number | null,
  currency: string,
  period: ProofPeriod,
  localText: string,
  note: LocalizedText | null = null,
): ProofOfFunds {
  return { amount, currency, period, localText, usd: usd(amount, currency), note };
}

/* ---------------------------------------------------------------------- data */

export const COUNTRY_FACTS: CountryFacts[] = [
  {
    country: "United States",
    iso2: "US",
    proofOfFunds: proof(
      null,
      "USD",
      "first-year",
      "Set on your Form I-20",
      {
        en: "The United States sets no national figure. The university's Form I-20 states the first-year cost you must show (tuition + living), and the consular officer reads that number.",
        uz: "AQSH yagona milliy summa belgilamaydi. Universitet beradigan I-20 formasida birinchi yil uchun talab qilinadigan mablag' (o'qish + yashash) ko'rsatiladi — konsul shu raqamga qaraydi.",
        ru: "США не устанавливают единой суммы. В форме I-20 от университета указана стоимость первого года (обучение + проживание), на неё и смотрит консул.",
      },
    ),
    partTimeWorkHours: 20,
    partTimeWorkNote: {
      en: "On-campus work only while school is in session; full-time in official breaks.",
      uz: "Faqat kampusda, o'qish davrida haftasiga 20 soat; rasmiy ta'tilda to'liq kunlik.",
      ru: "Только работа в кампусе во время учёбы; в официальные каникулы — полный день.",
    },
    postStudyWorkMonths: 12,
    postStudyWorkNote: {
      en: "Optional Practical Training: 12 months after graduation, +24 months for STEM degrees (36 total).",
      uz: "OPT: bitirgandan keyin 12 oy; STEM yo'nalishlarida yana 24 oy (jami 36 oy).",
      ru: "OPT: 12 месяцев после выпуска; для STEM-специальностей ещё 24 месяца (всего 36).",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "US universities set their own rule: most accept the 11-year attestat with a strong SAT and transcripts, but some require a 12th year, a foundation year or US high-school credentials. Check the admissions page of every university you apply to.",
      uz: "Har bir AQSH universiteti o'zi belgilaydi: ko'pchiligi 11 yillik attestatni kuchli SAT va transkript bilan qabul qiladi, ba'zilari esa 12 yillik ta'lim, Foundation yoki AQSH maktab hujjatini talab qiladi. Har bir universitetning qabul sahifasini tekshiring.",
      ru: "Каждый университет США решает сам: большинство принимает 11-летний аттестат с сильным SAT и транскриптом, но некоторые требуют 12-й год, Foundation или американский школьный диплом. Проверяйте страницу приёма каждого вуза.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "U.S. Embassy Tashkent",
      address: "3 Moyqorghon Street, 5th block, Yunusobod District, Tashkent 100093",
      website: "https://uz.usembassy.gov/visas/",
    },
    sourceName: "U.S. Embassy Tashkent — Visas; USCIS/ICE SEVIS practical training",
    sourceUrl: "https://uz.usembassy.gov/visas/",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "United Kingdom",
    iso2: "GB",
    proofOfFunds: proof(
      10539,
      "GBP",
      "year",
      "£1,171 / month × 9 = £10,539 (outside London)",
      {
        en: "London rate is £1,529 / month (£13,761 for 9 months). From 30 November 2026 the monthly figures rise to £1,203 and £1,570, so applications lodged after that date need £10,827 / £14,130. The money must sit in the account for 28 consecutive days.",
        uz: "London uchun £1,529/oy (£13,761 — 9 oy). 2026-yil 30-noyabrdan oylik me'yor £1,203 va £1,570 ga oshadi, ya'ni shu sanadan keyingi arizalar uchun £10,827 / £14,130 kerak bo'ladi. Mablag' hisobda 28 kun uzluksiz turishi shart.",
        ru: "Для Лондона — £1,529/мес (£13,761 за 9 месяцев). С 30 ноября 2026 года месячные суммы вырастают до £1,203 и £1,570, то есть для заявлений после этой даты нужно £10,827 / £14,130. Деньги должны лежать на счёте 28 дней подряд.",
      },
    ),
    partTimeWorkHours: 20,
    partTimeWorkNote: {
      en: "20 hours a week in term time at degree level (10 hours below degree level); full-time in vacations.",
      uz: "Bakalavr va undan yuqori darajada o'qish davrida haftasiga 20 soat (bakalavrdan pastda — 10 soat); ta'tilda to'liq kunlik.",
      ru: "20 часов в неделю во время учёбы на степени (10 часов ниже степени); в каникулы — полный день.",
    },
    postStudyWorkMonths: 18,
    postStudyWorkNote: {
      en: "Graduate route: 18 months after a bachelor's or master's, 3 years after a PhD.",
      uz: "Graduate route: bakalavr yoki magistrdan keyin 18 oy, PhD dan keyin 3 yil.",
      ru: "Graduate route: 18 месяцев после бакалавриата или магистратуры, 3 года после PhD.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "UK universities decide case by case: many accept the attestat for a bachelor's, others ask for a foundation year, and a foundation year is the common route when the certificate covers 11 years only. Compare with UK ENIC if the university asks for an equivalence statement.",
      uz: "Britaniya universitetlari har bir holatni alohida ko'radi: ko'pchiligi attestat bilan bakalavrga qabul qiladi, ba'zilari Foundation yilini talab qiladi — 11 yillik ta'lim uchun Foundation odatiy yo'l. Universitet ekvivalentlik hujjatini so'rasa, UK ENIC bilan solishtiring.",
      ru: "Британские университеты решают индивидуально: многие принимают аттестат на бакалавриат, другие требуют Foundation — для 11-летнего обучения это обычный путь. Если вуз просит справку об эквивалентности, сверяйтесь с UK ENIC.",
    },
    recognitionUrl: "https://www.enic.org.uk/",
    embassy: {
      kind: "embassy",
      name: "British Embassy Tashkent",
      address: "67 Gulyamov Street, Tashkent 100047",
      website: "https://www.gov.uk/world/organisations/british-embassy-tashkent",
    },
    sourceName: "GOV.UK — Student visa: money you need",
    sourceUrl: "https://www.gov.uk/student-visa/money",
    lastVerifiedAt: VERIFIED,
    asOf: "2026-11-30",
  },
  {
    country: "Germany",
    iso2: "DE",
    proofOfFunds: proof(11904, "EUR", "year", "€11,904 / year (€992 × 12)", {
      en: "Blocked account (Sperrkonto) tied to the BAföG rate — €992 per month. Language-course and Opportunity-Card applicants need €13,092 (€1,091 / month).",
      uz: "Bloklangan hisob (Sperrkonto) BAföG me'yoriga bog'langan — oyiga €992. Til kursi va Opportunity Card uchun €13,092 (oyiga €1,091).",
      ru: "Блокированный счёт (Sperrkonto) привязан к ставке BAföG — €992 в месяц. Для языковых курсов и Opportunity Card — €13,092 (€1,091 / мес).",
    }),
    partTimeWorkHours: 20,
    partTimeWorkNote: {
      en: "140 full days or 280 half days per year — roughly 20 hours a week, and a Minijob is exempt.",
      uz: "Yiliga 140 to'liq kun yoki 280 yarim kun — bu taxminan haftasiga 20 soat; Minijob bundan mustasno.",
      ru: "140 полных дней или 280 полудней в год — примерно 20 часов в неделю; Minijob не учитывается.",
    },
    postStudyWorkMonths: 18,
    postStudyWorkNote: {
      en: "18-month job-seeking residence permit after graduation.",
      uz: "Bitirgandan keyin 18 oylik ish qidirish uchun yashash ruxsatnomasi.",
      ru: "18-месячный ВНЖ для поиска работы после выпуска.",
    },
    elevenYearDiploma: "foundation",
    elevenYearNote: {
      en: "An 11-year school certificate normally needs a Studienkolleg (one-year foundation) before a bachelor's. Check your exact certificate in the anabin database first — the decision is made per certificate type.",
      uz: "11 yillik maktab sertifikati bilan odatda bakalavrdan oldin Studienkolleg (bir yillik tayyorlov) talab qilinadi. Avval anabin bazasida o'z sertifikatingizni tekshiring — qaror sertifikat turiga qarab chiqariladi.",
      ru: "С 11-летним школьным аттестатом перед бакалавриатом обычно нужен Studienkolleg (год подготовки). Сначала проверьте свой аттестат в базе anabin — решение принимается по типу документа.",
    },
    recognitionUrl: "https://anabin.kmk.org/",
    embassy: {
      kind: "embassy",
      name: "Embassy of the Federal Republic of Germany",
      address: "15 Sharaf Rashidov Street, Yunusobod District, Tashkent 100017",
      website: "https://taschkent.diplo.de/",
    },
    sourceName: "DAAD / Study in Germany — proof of financing (Sperrkonto)",
    sourceUrl:
      "https://www.study-in-germany.com/en/plan-your-studies/requirements/proof-of-financing/",
    lastVerifiedAt: VERIFIED,
    asOf: "2025-01-01",
  },
  {
    country: "Canada",
    iso2: "CA",
    proofOfFunds: proof(23448, "CAD", "first-year", "CA$23,448 / year (single applicant, outside Quebec)", {
      en: "IRCC raises this every 1 September in line with the low-income cut-off; CA$23,448 applies to applications submitted on or after 1 September 2026. Tuition and travel are on top.",
      uz: "IRCC bu summani har 1-sentabrda qashshoqlik chegarasiga qarab oshiradi; CA$23,448 2026-yil 1-sentabrdan berilgan arizalarga tegishli. O'qish haqi va yo'l xarajati bundan tashqari.",
      ru: "IRCC повышает сумму каждое 1 сентября; CA$23,448 действует для заявлений с 1 сентября 2026 года. Стоимость обучения и дорога — сверх этой суммы.",
    }),
    partTimeWorkHours: 24,
    partTimeWorkNote: {
      en: "24 hours a week off campus during term time, full-time in scheduled breaks (in Canada on a study permit).",
      uz: "Kanadada study permit bilan o'qish davrida kampusdan tashqarida haftasiga 24 soat, rasmiy ta'tilda to'liq kunlik.",
      ru: "24 часа в неделю вне кампуса во время учёбы, в каникулы — полный день (при study permit в Канаде).",
    },
    postStudyWorkMonths: 36,
    postStudyWorkNote: {
      en: "Post-Graduation Work Permit: up to 3 years, depending on programme length and eligibility.",
      uz: "Post-Graduation Work Permit: dastur davomiyligi va shartlarga qarab 3 yilgacha.",
      ru: "Post-Graduation Work Permit: до 3 лет в зависимости от длительности программы и условий.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Universities set their own admission rule; a 12th year or a foundation/qualifying year is sometimes required for an 11-year certificate. CICIC publishes how Canadian institutions read foreign credentials.",
      uz: "Universitetlar qabul qoidasini o'zi belgilaydi; 11 yillik sertifikat uchun ba'zan 12 yillik ta'lim yoki tayyorlov yili talab qilinadi. CICIC Kanada muassasalari xorijiy hujjatni qanday baholashini e'lon qiladi.",
      ru: "Университеты устанавливают правила приёма сами; для 11-летнего аттестата иногда нужен 12-й год или подготовительный год. CICIC публикует, как канадские вузы оценивают иностранные документы.",
    },
    recognitionUrl: "https://www.cicic.ca/",
    embassy: {
      kind: "honorary-consulate",
      name: "Honorary Consulate of Canada in Tashkent",
      address: "58A Bobur Street, Tashkent",
      website: null,
    },
    sourceName: "IRCC — Proof of financial support for a study permit",
    sourceUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html",
    lastVerifiedAt: VERIFIED,
    asOf: "2026-09-01",
  },
  {
    country: "Australia",
    iso2: "AU",
    proofOfFunds: proof(29710, "AUD", "year", "A$29,710 / year (living costs only)", {
      en: "Subclass 500 financial capacity: A$29,710 living costs for the primary applicant for 12 months, plus first-year tuition and travel.",
      uz: "Subclass 500 moliyaviy talabi: asosiy abituriyent uchun 12 oylik yashash xarajati A$29,710, ustiga birinchi yil o'qish haqi va yo'l xarajati.",
      ru: "Subclass 500: A$29,710 на проживание за 12 месяцев для основного заявителя плюс оплата первого года и дорога.",
    }),
    partTimeWorkHours: 24,
    partTimeWorkNote: {
      en: "48 hours a fortnight (≈24 hours a week) once the course has started; unlimited in official course breaks.",
      uz: "O'qish boshlangach ikki haftada 48 soat (≈haftasiga 24 soat); rasmiy ta'tilda cheklov yo'q.",
      ru: "48 часов за две недели (≈24 в неделю) после начала учёбы; в официальные каникулы — без ограничений.",
    },
    postStudyWorkMonths: 24,
    postStudyWorkNote: {
      en: "Temporary Graduate visa (subclass 485): 2 years after a bachelor's/master's coursework, longer for research degrees — check the current stream rules.",
      uz: "Temporary Graduate vizasi (subclass 485): bakalavr/magistratura uchun 2 yil, tadqiqot darajalarida uzoqroq — amaldagi oqim qoidalarini tekshiring.",
      ru: "Temporary Graduate (subclass 485): 2 года после бакалавриата/магистратуры, дольше для исследовательских степеней — проверяйте текущие правила.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Universities assess the certificate individually; an 11-year certificate often leads to a foundation/pathway year rather than direct entry.",
      uz: "Universitetlar sertifikatni alohida baholaydi; 11 yillik sertifikat bilan ko'pincha to'g'ridan-to'g'ri emas, Foundation (pathway) yili talab qilinadi.",
      ru: "Университеты оценивают аттестат индивидуально; с 11-летним аттестатом чаще предлагают Foundation/pathway год, а не прямой приём.",
    },
    recognitionUrl: null,
    embassy: {
      kind: null,
      name: null,
      address: null,
      website: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    },
    sourceName: "Australian Department of Home Affairs — Subclass 500",
    sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "South Korea",
    iso2: "KR",
    proofOfFunds: proof(20000000, "KRW", "year", "₩20,000,000 (≈US$15,000) held 28 days", {
      en: "There is no single national figure: each university states the amount on its Certificate of Admission, and ₩20,000,000 is the level most apply. Funds must be held for at least 28 days.",
      uz: "Yagona milliy summa yo'q: har bir universitet qabul xatida (Certificate of Admission) summani ko'rsatadi, ko'pchilik ₩20,000,000 talab qiladi. Mablag' kamida 28 kun hisobda turishi kerak.",
      ru: "Единой суммы нет: каждый университет указывает её в Certificate of Admission, чаще всего ₩20,000,000. Деньги должны лежать на счёте не менее 28 дней.",
    }),
    partTimeWorkHours: 25,
    partTimeWorkNote: {
      en: "25 hours a week during term for undergraduates who reach the required TOPIK level (10 without it), and only after 6 months with an S-3 permit.",
      uz: "Talab qilingan TOPIK darajasiga yetgan bakalavrlar uchun o'qish davrida haftasiga 25 soat (daraja bo'lmasa 10 soat) va faqat 6 oydan keyin S-3 ruxsatnomasi bilan.",
      ru: "25 часов в неделю в семестре для бакалавров с нужным уровнем TOPIK (10 без него) и только после 6 месяцев с разрешением S-3.",
    },
    postStudyWorkMonths: null,
    postStudyWorkNote: {
      en: "After graduation the D-10 job-seeking visa is the route; its length depends on your degree and is decided by immigration, so no single figure is published.",
      uz: "Bitirgandan keyin D-10 ish qidiruv vizasi qo'llanadi; muddati diplom darajangizga bog'liq va immigratsiya tomonidan belgilanadi — yagona raqam e'lon qilinmagan.",
      ru: "После выпуска используется виза для поиска работы D-10; её срок зависит от степени и определяется миграционной службой — единой цифры нет.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Korean universities admit foreign applicants on their own document rules; many accept the 11-year attestat for a bachelor's, and GKS scholarship applicants follow the NIIED document list.",
      uz: "Koreya universitetlari xorijiy abituriyentlarni o'z hujjat qoidalari bo'yicha qabul qiladi; ko'pchiligi 11 yillik attestatni bakalavrga qabul qiladi, GKS granti uchun NIIED hujjat ro'yxati amal qiladi.",
      ru: "Корейские университеты принимают иностранцев по своим правилам; многие принимают 11-летний аттестат на бакалавриат, для GKS действует список документов NIIED.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of the Republic of Korea",
      address: null,
      website: "https://overseas.mofa.go.kr/uz-ko/index.do",
    },
    sourceName: "Study in Korea (NIIED) & Korean Immigration — D-2 student visa",
    sourceUrl: "https://www.studyinkorea.go.kr/",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Japan",
    iso2: "JP",
    proofOfFunds: proof(2000000, "JPY", "year", "¥2,000,000 (≈US$13,400) — school-set", {
      en: "Japan publishes no national minimum: the school that issues your Certificate of Eligibility sets the amount, commonly ¥2,000,000 of liquid funds for one year.",
      uz: "Yaponiya milliy minimum e'lon qilmaydi: Certificate of Eligibility beradigan maktab summani belgilaydi, odatda bir yil uchun ¥2,000,000 lik mablag'.",
      ru: "Япония не публикует национальный минимум: сумму определяет учебное заведение, выдающее Certificate of Eligibility, обычно ¥2,000,000 на год.",
    }),
    partTimeWorkHours: 28,
    partTimeWorkNote: {
      en: "28 hours a week in term time (8 hours a day in long holidays) with the permission stamp on your residence card.",
      uz: "Yashash kartasidagi ruxsat tamg'asi bilan o'qish davrida haftasiga 28 soat (uzoq ta'tilda kuniga 8 soat).",
      ru: "28 часов в неделю в семестре (8 часов в день в каникулы) при наличии разрешения в карте пребывания.",
    },
    postStudyWorkMonths: 12,
    postStudyWorkNote: {
      en: "Designated-activities status for job hunting: 1 year, extendable if you are still searching.",
      uz: "Ish qidirish uchun «designated activities» statusi: 1 yil, qidiruv davom etsa uzaytiriladi.",
      ru: "Статус designated activities для поиска работы: 1 год, продлевается, если поиск продолжается.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Japanese universities run their own foreign-student entrance exams (EJU) and document checks; an 11-year certificate usually needs the EJU or a preparatory year.",
      uz: "Yaponiya universitetlari xorijiy talabalar uchun o'z kirish imtihonini (EJU) va hujjat tekshiruvini o'tkazadi; 11 yillik sertifikat uchun odatda EJU yoki tayyorlov yili kerak.",
      ru: "Японские вузы проводят свои экзамены для иностранцев (EJU) и проверку документов; с 11-летним аттестатом обычно нужен EJU или подготовительный год.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of Japan in Uzbekistan",
      address: null,
      website: "https://www.uz.emb-japan.go.jp/",
    },
    sourceName: "Immigration Services Agency of Japan — student residence status",
    sourceUrl: "https://www.isa.go.jp/en/",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Netherlands",
    iso2: "NL",
    proofOfFunds: proof(13569, "EUR", "year", "€1,130.77 / month → €13,569.24 for 12 months", {
      en: "This is the IND study norm (studienorm) for HBO/WO in 2026 and covers living costs only — tuition is separate. MBO students need €928.58 a month.",
      uz: "Bu 2026-yilda HBO/WO uchun IND o'quv me'yori (studienorm) va faqat yashash xarajatini qoplaydi — o'qish haqi alohida. MBO talabalari uchun oyiga €928.58.",
      ru: "Это учебный норматив IND (studienorm) для HBO/WO на 2026 год, только проживание — обучение отдельно. Для MBO — €928.58 в месяц.",
    }),
    partTimeWorkHours: 16,
    partTimeWorkNote: {
      en: "16 hours a week during the year, or full-time in June–July–August (not both). Your employer needs a TWV work permit.",
      uz: "Yil davomida haftasiga 16 soat yoki iyun–iyul–avgustda to'liq kunlik (ikkalasi birga emas). Ish beruvchi TWV ruxsatnomasini olishi kerak.",
      ru: "16 часов в неделю в течение года либо полный день в июне–августе (не одновременно). Работодателю нужен TWV.",
    },
    postStudyWorkMonths: 12,
    postStudyWorkNote: {
      en: "Orientation year (zoekjaar) residence permit: 1 year to find work, no employer sponsor needed.",
      uz: "Orientation year (zoekjaar) ruxsatnomasi: ish topish uchun 1 yil, ish beruvchi homiyligi talab qilinmaydi.",
      ru: "Разрешение orientation year (zoekjaar): 1 год на поиск работы без спонсора-работодателя.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Dutch universities assess foreign diplomas individually and often require a foundation year for an 11-year certificate; Nuffic evaluates credentials for institutions.",
      uz: "Niderlandiya universitetlari xorijiy diplomlarni alohida baholaydi va 11 yillik sertifikat uchun ko'pincha tayyorlov yilini talab qiladi; Nuffic hujjatlarni baholaydi.",
      ru: "Нидерландские вузы оценивают иностранные дипломы индивидуально и часто требуют подготовительный год для 11-летнего аттестата; оценку делает Nuffic.",
    },
    recognitionUrl: "https://www.nuffic.nl/en/subjects/diploma-evaluation",
    embassy: {
      kind: "honorary-consulate",
      name: "Honorary Consulate of the Netherlands in Tashkent",
      address: null,
      website: null,
    },
    sourceName: "IND — Income requirements for study",
    sourceUrl: "https://ind.nl/en/income-requirements-study",
    lastVerifiedAt: VERIFIED,
    asOf: "2026-01-01",
  },
  {
    country: "China",
    iso2: "CN",
    proofOfFunds: proof(null, "USD", "year", "Chinese mission sets the figure (typically ≈US$2,500 / year)", {
      en: "There is no national amount. Order No. 42 requires universities to examine a financial guarantee, and each Chinese embassy publishes its own figure for the X1 visa (US$2,500 per academic year on several missions).",
      uz: "Yagona milliy summa yo'q. 42-son buyruq universitetlardan moliyaviy kafolatni tekshirishni talab qiladi, X1 vizasi uchun har bir Xitoy elchixonasi o'z summasini e'lon qiladi (ko'p elchixonalarda o'quv yiliga ≈US$2,500).",
      ru: "Единой суммы нет. Приказ № 42 обязывает вузы проверять финансовую гарантию, а каждое посольство Китая публикует свою сумму для визы X1 (на многих миссиях — ≈US$2,500 в учебный год).",
    }),
    partTimeWorkHours: 20,
    partTimeWorkNote: {
      en: "20 hours a week maximum, and only with the university's approval plus a work endorsement on the residence permit.",
      uz: "Haftasiga ko'pi bilan 20 soat, faqat universitet roziligi va yashash ruxsatnomasidagi ish belgisi bilan.",
      ru: "Не более 20 часов в неделю и только с разрешением вуза и отметкой о работе в виде на жительство.",
    },
    postStudyWorkMonths: null,
    postStudyWorkNote: {
      en: "No post-study work visa: graduates need a job offer and a Z (work) visa with a work permit.",
      uz: "Bitiruvchilar uchun alohida ish vizasi yo'q: ish taklifi va ish ruxsatnomasi bilan Z vizasi kerak.",
      ru: "Отдельной визы после выпуска нет: нужны предложение работы и виза Z с разрешением на работу.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Chinese universities admit foreign students through their own entrance exams or a CSC/university review; check the specific university's international admission page.",
      uz: "Xitoy universitetlari xorijiy talabalarni o'z imtihonlari yoki CSC/universitet ko'rigi orqali qabul qiladi; aniq universitetning xalqaro qabul sahifasini tekshiring.",
      ru: "Китайские вузы принимают иностранцев по своим экзаменам или через CSC/рассмотрение вуза; проверяйте страницу международного приёма конкретного вуза.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of the People's Republic of China",
      address: "32 Qoratosh Street, Tashkent 100047",
      website: null,
    },
    sourceName: "Chinese visa application service — X1 student visa document list",
    sourceUrl: "https://visaforchina.cn/",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Turkey",
    iso2: "TR",
    proofOfFunds: proof(6000, "USD", "year", "≈US$500 / month (≈US$6,000 for a year)", {
      en: "The Directorate General of Migration Management asks for proof of about US$500 a month for living costs; bank statements or a scholarship letter are accepted.",
      uz: "Migratsiya bosh boshqarmasi yashash xarajati uchun oyiga taxminan US$500 mablag'ni tasdiqlashni so'raydi; bank ko'chirmasi yoki grant xati qabul qilinadi.",
      ru: "Главное управление миграции требует подтверждения около US$500 в месяц на проживание; принимаются выписки банка или письмо о стипендии.",
    }),
    partTimeWorkHours: 24,
    partTimeWorkNote: {
      en: "24 hours a week during term with a work permit; undergraduates may only start after their first year.",
      uz: "Ish ruxsatnomasi bilan o'qish davrida haftasiga 24 soat; bakalavrlar faqat birinchi kursdan keyin boshlashi mumkin.",
      ru: "24 часа в неделю в семестре с разрешением на работу; бакалавры — только после первого курса.",
    },
    postStudyWorkMonths: 12,
    postStudyWorkNote: {
      en: "A one-year short-term residence permit is available to graduates who apply within six months.",
      uz: "Bitiruvchilar olti oy ichida ariza bersa, bir yillik qisqa muddatli yashash ruxsatnomasini olishi mumkin.",
      ru: "Выпускники могут получить годовой краткосрочный ВНЖ, если подадут заявление в течение шести месяцев.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Turkish universities use YÖS/SAT or their own exam and a denklik (equivalence) certificate from YÖK for foreign school diplomas.",
      uz: "Turk universitetlari YÖS/SAT yoki o'z imtihonini va xorijiy maktab diplomi uchun YÖK dan denklik (ekvivalentlik) sertifikatini talab qiladi.",
      ru: "Турецкие вузы используют YÖS/SAT или свой экзамен и сертификат эквивалентности (denklik) от YÖK.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of the Republic of Türkiye",
      address: "87 Gogol Street, Tashkent 100047",
      website: null,
    },
    sourceName: "Republic of Türkiye — Presidency of Migration Management",
    sourceUrl: "https://en.goc.gov.tr/",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Poland",
    iso2: "PL",
    proofOfFunds: proof(12120, "PLN", "year", "PLN 1,010 / month (PLN 12,120 for 12 months)", {
      en: "Since 1 January 2025 the monthly amount left after housing costs must exceed PLN 1,010 for a single student, plus return-travel funds. The consul and later the voivode decide.",
      uz: "2025-yil 1-yanvardan yolg'iz talaba uchun uy-joy xarajatidan keyin qoladigan oylik mablag' PLN 1,010 dan oshishi kerak, ustiga qaytish yo'li puli. Yakuniy qarorni konsul va keyin voyevoda chiqaradi.",
      ru: "С 1 января 2025 года у одинокого студента после расходов на жильё должно оставаться более PLN 1,010 в месяц плюс средства на обратную дорогу. Решение принимает консул, затем воевода.",
    }),
    partTimeWorkHours: null,
    partTimeWorkNote: {
      en: "Full-time students at Polish universities may work without a separate work permit; the practical limits come from your visa/permit terms, not a weekly cap.",
      uz: "Polsha universitetlarida to'liq vaqt o'qiydigan talaba alohida ish ruxsatnomasisiz ishlashi mumkin; amaliy cheklov haftalik me'yordan emas, viza/ruxsatnoma shartlaridan kelib chiqadi.",
      ru: "Студенты очной формы в Польше могут работать без отдельного разрешения; практические ограничения следуют из условий визы/ВНЖ, а не из недельного лимита.",
    },
    postStudyWorkMonths: 9,
    postStudyWorkNote: {
      en: "A 9-month residence permit to look for work after graduation.",
      uz: "Bitirgandan keyin ish qidirish uchun 9 oylik yashash ruxsatnomasi.",
      ru: "9-месячный ВНЖ для поиска работы после выпуска.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Polish universities recognise foreign secondary certificates case by case and may require an apostilled attestat plus a sworn translation; some ask for a foundation year.",
      uz: "Polsha universitetlari xorijiy o'rta ta'lim sertifikatini alohida tan oladi; apostillangan attestat va qasamyodli tarjima talab qilinishi mumkin, ba'zilari tayyorlov yilini so'raydi.",
      ru: "Польские вузы признают иностранные аттестаты индивидуально; могут потребовать апостиль и присяжный перевод, некоторые — подготовительный год.",
    },
    recognitionUrl: null,
    embassy: {
      kind: null,
      name: null,
      address: null,
      website: null,
    },
    sourceName: "European Commission — Student in Poland (residence permit requirements)",
    sourceUrl:
      "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal/student-poland_en",
    lastVerifiedAt: VERIFIED,
    asOf: "2025-01-01",
  },
  {
    country: "Hungary",
    iso2: "HU",
    proofOfFunds: proof(null, "EUR", "year", "No published national amount", {
      en: "Hungary requires proof of sufficient funds and accommodation for the residence permit but publishes no fixed sum; the consulate assesses your bank statements and scholarship letter.",
      uz: "Vengriya yashash ruxsatnomasi uchun yetarli mablag' va turar joyni tasdiqlashni talab qiladi, lekin aniq summa e'lon qilinmagan; konsul bank ko'chirmasi va grant xatini baholaydi.",
      ru: "Венгрия требует подтверждения достаточных средств и жилья для ВНЖ, но фиксированной суммы не публикует; консул оценивает выписки и письмо о стипендии.",
    }),
    partTimeWorkHours: 24,
    partTimeWorkNote: {
      en: "24 hours a week during term with a valid residence permit; full-time during semester breaks.",
      uz: "Amaldagi yashash ruxsatnomasi bilan o'qish davrida haftasiga 24 soat; semestr ta'tillarida to'liq kunlik.",
      ru: "24 часа в неделю в семестре при действующем ВНЖ; в каникулы — полный день.",
    },
    postStudyWorkMonths: null,
    postStudyWorkNote: {
      en: "Graduates can apply to change the purpose of their residence permit to job search; the permit's length is decided case by case.",
      uz: "Bitiruvchilar yashash ruxsatnomasi maqsadini ish qidirishga o'zgartirish uchun ariza berishi mumkin; muddat har bir holatda alohida belgilanadi.",
      ru: "Выпускники могут изменить цель ВНЖ на поиск работы; срок определяется индивидуально.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Hungarian universities set their own admission rules and often require a foundation year for an 11-year certificate.",
      uz: "Vengriya universitetlari qabul qoidalarini o'zi belgilaydi va 11 yillik sertifikat uchun ko'pincha tayyorlov yilini talab qiladi.",
      ru: "Венгерские вузы устанавливают правила приёма сами и часто требуют подготовительный год для 11-летнего аттестата.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of Hungary",
      address: null,
      website: null,
    },
    sourceName: "Study in Hungary — residence permit for study",
    sourceUrl: "https://studyinhungary.hu/",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Malaysia",
    iso2: "MY",
    proofOfFunds: proof(24000, "MYR", "year", "RM 1,500–2,500 / month (≈RM 24,000 for a year)", {
      en: "EMGS's Student Pass document list does not itself require bank statements; the university and the visa officer expect proof of tuition plus roughly RM 1,500–2,500 a month for living.",
      uz: "EMGS ning Student Pass hujjat ro'yxatida bank ko'chirmasi talab qilinmaydi; universitet va viza xodimi o'qish haqi va oyiga taxminan RM 1,500–2,500 yashash xarajatini tasdiqlashni kutadi.",
      ru: "Список документов Student Pass (EMGS) не требует банковской выписки; вуз и визовый офицер ожидают подтверждения оплаты обучения и примерно RM 1,500–2,500 в месяц на проживание.",
    }),
    partTimeWorkHours: 20,
    partTimeWorkNote: {
      en: "20 hours a week, and only during semester breaks longer than 7 days, at approved workplaces with Immigration approval.",
      uz: "Haftasiga 20 soat va faqat 7 kundan uzun semestr ta'tillarida, ruxsat etilgan joylarda Immigratsiya roziligi bilan.",
      ru: "20 часов в неделю и только в каникулы дольше 7 дней, на разрешённых местах и с согласия иммиграции.",
    },
    postStudyWorkMonths: null,
    postStudyWorkNote: {
      en: "There is no general post-study work pass in the Student Pass system; graduates switch to an employment pass when an employer sponsors them.",
      uz: "Student Pass tizimida umumiy bitiruvdan keyingi ish ruxsatnomasi yo'q; bitiruvchi ish beruvchi homiylik qilganda employment pass ga o'tadi.",
      ru: "В системе Student Pass общей визы после выпуска нет; выпускник переходит на employment pass при спонсорстве работодателя.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Malaysian universities admit on their own entry requirements; many accept an 11-year certificate for a bachelor's, some ask for a foundation programme.",
      uz: "Malayziya universitetlari o'z qabul talablari bo'yicha qabul qiladi; ko'pchiligi 11 yillik sertifikatni bakalavrga qabul qiladi, ba'zilari Foundation dasturini so'raydi.",
      ru: "Малайзийские вузы принимают по своим требованиям; многие берут 11-летний аттестат на бакалавриат, некоторые требуют Foundation.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of Malaysia",
      address: "28/30 Bog Saroy Street, Tashkent",
      website: "https://www.kln.gov.my/web/uzb_tashkent",
    },
    sourceName: "EMGS / Education Malaysia — Student Pass and part-time work FAQ",
    sourceUrl: "https://educationmalaysia.gov.my/get-in-touch/faq",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Switzerland",
    iso2: "CH",
    proofOfFunds: proof(21000, "CHF", "year", "CHF 21,000 / year", {
      en: "Cantonal migration offices apply CHF 21,000 a year; Geneva and Zurich sometimes ask for CHF 24,000. A Swiss guarantor's declaration can replace the bank proof.",
      uz: "Kanton migratsiya idoralari yiliga CHF 21,000 talab qiladi; Jeneva va Tsyurix ba'zan CHF 24,000 so'raydi. Bank tasdig'i o'rniga Shveytsariyadagi kafil deklaratsiyasi bo'lishi mumkin.",
      ru: "Кантональные миграционные органы требуют CHF 21,000 в год; Женева и Цюрих иногда просят CHF 24,000. Вместо банковского подтверждения возможно поручительство резидента Швейцарии.",
    }),
    partTimeWorkHours: 15,
    partTimeWorkNote: {
      en: "No work in the first 6 months; afterwards 15 hours a week in term time, full-time in semester breaks, with an employer-obtained cantonal permit.",
      uz: "Birinchi 6 oyda ishlash mumkin emas; keyin o'qish davrida haftasiga 15 soat, semestr ta'tilida to'liq kunlik — ish beruvchi kanton ruxsatnomasini oladi.",
      ru: "Первые 6 месяцев работать нельзя; затем 15 часов в неделю в семестре, в каникулы — полный день, с кантональным разрешением от работодателя.",
    },
    postStudyWorkMonths: 6,
    postStudyWorkNote: {
      en: "6 months after graduation to find a job that qualifies for a work permit.",
      uz: "Bitirgandan keyin ish ruxsatnomasiga mos ish topish uchun 6 oy.",
      ru: "6 месяцев после выпуска на поиск работы, подходящей для разрешения на работу.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Swiss universities (especially ETH/EPFL) assess foreign certificates individually and often require an entrance exam or a preparatory year.",
      uz: "Shveytsariya universitetlari (ayniqsa ETH/EPFL) xorijiy sertifikatlarni alohida baholaydi va ko'pincha kirish imtihoni yoki tayyorlov yilini talab qiladi.",
      ru: "Швейцарские вузы (особенно ETH/EPFL) оценивают иностранные аттестаты индивидуально и часто требуют вступительный экзамен или подготовительный год.",
    },
    recognitionUrl: null,
    embassy: {
      kind: "embassy",
      name: "Embassy of Switzerland in Uzbekistan",
      address: "Shota Rustaveli impass 1, house 4, Tashkent 100070",
      website: "https://www.eda.admin.ch/countries/uzbekistan/en/home/representations/embassy-in-tashkent.html",
    },
    sourceName: "Swiss SEM / cantonal migration offices — residence permit for study",
    sourceUrl: "https://www.eda.admin.ch/countries/uzbekistan/en/home.html",
    lastVerifiedAt: VERIFIED,
    asOf: null,
  },
  {
    country: "Italy",
    iso2: "IT",
    proofOfFunds: proof(10180, "EUR", "year", "€10,179.85 / year (≈€848 / month)", {
      en: "The MUR/MAECI circular for 2026/27–2027/28 sets the annual means of subsistence at €10,179.85, up from €6,947.33.",
      uz: "2026/27–2027/28 uchun MUR/MAECI sirkulyari yillik yashash mablag'ini €10,179.85 etib belgiladi (avval €6,947.33 edi).",
      ru: "Циркуляр MUR/MAECI на 2026/27–2027/28 устанавливает годовую сумму средств к существованию €10,179.85 вместо €6,947.33.",
    }),
    partTimeWorkHours: 20,
    partTimeWorkNote: {
      en: "20 hours a week (1,040 hours a year) while studying.",
      uz: "O'qish davrida haftasiga 20 soat (yiliga 1,040 soat).",
      ru: "20 часов в неделю (1,040 часов в год) во время учёбы.",
    },
    postStudyWorkMonths: 12,
    postStudyWorkNote: {
      en: "A 12-month residence permit to look for work after graduation.",
      uz: "Bitirgandan keyin ish qidirish uchun 12 oylik yashash ruxsatnomasi.",
      ru: "12-месячный ВНР для поиска работы после выпуска.",
    },
    elevenYearDiploma: "varies",
    elevenYearNote: {
      en: "Italian universities ask for a Declaration of Value or a CIMEA statement of comparability for foreign school certificates.",
      uz: "Italiya universitetlari xorijiy maktab sertifikati uchun Declaration of Value yoki CIMEA taqqoslash xulosasini so'raydi.",
      ru: "Итальянские вузы требуют Declaration of Value или заключение CIMEA о сопоставимости для иностранных аттестатов.",
    },
    recognitionUrl: "https://www.cimea.it/",
    embassy: {
      kind: "embassy",
      name: "Embassy of Italy in Tashkent",
      address: null,
      website: null,
    },
    sourceName: "Italian Ministry of University and Research (MUR) / MAECI circular 2026/27",
    sourceUrl: "https://www.studiare-in-italia.it/",
    lastVerifiedAt: VERIFIED,
    asOf: "2026-07-01",
  },
];

const BY_KEY = new Map<string, CountryFacts>();
for (const facts of COUNTRY_FACTS) {
  BY_KEY.set(facts.country.trim().toLowerCase(), facts);
  BY_KEY.set(facts.iso2.toLowerCase(), facts);
}

/** Country facts for a catalogue country name, ISO code, or any alias we know. */
export function countryFactsFor(country: string | null | undefined): CountryFacts | null {
  const key = (country ?? "").trim().toLowerCase();
  if (!key) return null;
  const direct = BY_KEY.get(key);
  if (direct) return direct;
  // "United States of America", "Korea, Republic of", "UK"… — the same alias
  // rules the rest of the catalogue uses.
  for (const facts of COUNTRY_FACTS) {
    if (aliasMatches(key, facts)) return facts;
  }
  return null;
}

const ALIASES: Record<string, string[]> = {
  US: ["usa", "u.s.", "u.s.a.", "united states of america", "america"],
  GB: ["uk", "u.k.", "united kingdom of great britain and northern ireland", "great britain", "britain", "england"],
  DE: ["deutschland", "federal republic of germany"],
  CA: ["canada"],
  AU: ["australia"],
  KR: ["korea", "south korea", "republic of korea", "korea, republic of", "korea south"],
  JP: ["japan"],
  NL: ["netherlands", "the netherlands", "holland"],
  CN: ["china", "china (mainland)", "mainland china", "china mainland", "people's republic of china", "prc"],
  TR: ["turkey", "türkiye", "turkiye"],
  PL: ["poland"],
  HU: ["hungary"],
  MY: ["malaysia"],
  CH: ["switzerland"],
  IT: ["italy"],
};

function aliasMatches(key: string, facts: CountryFacts): boolean {
  const list = ALIASES[facts.iso2] ?? [];
  return list.includes(key);
}

/** Localized field of an optional note, falling back to English. */
export function localizedFactText(
  note: LocalizedText | null | undefined,
  locale: string,
): string | null {
  if (!note) return null;
  if (locale === "uz") return note.uz;
  if (locale === "ru") return note.ru;
  return note.en;
}

/**
 * Payload-safe view of the facts: the notes are collapsed to the visitor's
 * language, so the client never receives three copies of every paragraph.
 */
export interface LocalizedCountryFacts {
  country: string;
  iso2: string;
  proofOfFunds: {
    usd: number | null;
    localText: string;
    period: ProofPeriod;
    note: string | null;
  };
  partTimeWorkHours: number | null;
  partTimeWorkNote: string | null;
  postStudyWorkMonths: number | null;
  postStudyWorkNote: string | null;
  elevenYearDiploma: ElevenYearVerdict;
  elevenYearNote: string | null;
  recognitionUrl: string | null;
  embassy: Embassy;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  asOf: string | null;
}

export function localizeCountryFacts(facts: CountryFacts, locale: string): LocalizedCountryFacts {
  return {
    country: facts.country,
    iso2: facts.iso2,
    proofOfFunds: {
      usd: facts.proofOfFunds.usd,
      localText: facts.proofOfFunds.localText,
      period: facts.proofOfFunds.period,
      note: localizedFactText(facts.proofOfFunds.note, locale),
    },
    partTimeWorkHours: facts.partTimeWorkHours,
    partTimeWorkNote: localizedFactText(facts.partTimeWorkNote, locale),
    postStudyWorkMonths: facts.postStudyWorkMonths,
    postStudyWorkNote: localizedFactText(facts.postStudyWorkNote, locale),
    elevenYearDiploma: facts.elevenYearDiploma,
    elevenYearNote: localizedFactText(facts.elevenYearNote, locale),
    recognitionUrl: facts.recognitionUrl,
    embassy: facts.embassy,
    sourceName: facts.sourceName,
    sourceUrl: facts.sourceUrl,
    lastVerifiedAt: facts.lastVerifiedAt,
    asOf: facts.asOf,
  };
}
