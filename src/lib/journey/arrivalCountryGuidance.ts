/**
 * Country-aware arrival guidance.
 *
 * WHY THIS IS A SEPARATE MODULE
 * `src/lib/journey/arrival.ts` is the generic checklist engine, and
 * `scripts/check-arrival.ts` asserts — by design — that it contains no
 * country-specific claim:
 *
 *     !/Germany|United States|United Kingdom|Uzbekistan|Россия|German law|USCIS|Home Office/i
 *
 * Holding that line is right: the generic checklist must never present a
 * national rule as if it applied to everybody. But a student flying to Munich
 * needs to know about the 14-day registration window, and "ask locally" is not
 * help. So the concrete rules live here, in their own file, each one carrying
 * the official source that states it. The generic engine stays generic; the
 * country file stays accountable.
 *
 * PROVENANCE: every entry has `sourceUrl` pointing at the authority that
 * publishes the rule. Nothing here is inferred — if a rule cannot be sourced it
 * is not in this file. `window` maps to the same d7/d30/d90/year1 buckets the
 * generic plan uses, so the UI can merge the two without a second taxonomy.
 */

import type { ArrivalWindow } from "./arrival";

export interface CountryArrivalTip {
  /** Stable key — used for React keys and analytics, never persisted. */
  key: string;
  /** Which arrival window this belongs to. */
  window: ArrivalWindow;
  /** Required. The authority that publishes this rule. */
  sourceUrl: string;
  /** Localised guidance text. */
  text: Record<"en" | "uz" | "ru", string>;
  /** Short label for the publishing authority, localised. */
  sourceLabel: Record<"en" | "uz" | "ru", string>;
}

export interface CountryArrivalGuidance {
  /** ISO country name as stored in the catalogue. */
  country: string;
  flag: string;
  tips: CountryArrivalTip[];
}

/**
 * Germany — residence registration, health insurance, residence permit.
 * Sources: Federal Ministry of the Interior / make-it-in-germany.de (the
 * Federal Government's own information portal) and the German Missions.
 */
const GERMANY: CountryArrivalGuidance = {
  country: "Germany",
  flag: "🇩🇪",
  tips: [
    {
      key: "de_residence_registration",
      window: "d7",
      sourceUrl: "https://www.make-it-in-germany.com/en/living-in-germany/arrival/registration",
      sourceLabel: { en: "make-it-in-germany.de", uz: "make-it-in-germany.de", ru: "make-it-in-germany.de" },
      text: {
        en: "Register your address (Anmeldung / Einwohnermeldeamt) at the local registration office. German law requires it within two weeks of moving in — you need the completed and signed landlord confirmation (Wohnungsgeberbestätigung) plus your passport.",
        uz: "Manzilingizni mahalliy ro‘yxatga olish idorasida ro‘yxatdan o‘tkazing (Anmeldung / Einwohnermeldeamt). Germaniya qonuni ko‘chib kelganidan keyin ikki hafta ichida talab qiladi — uy egasining imzolangan tasdiqnomasi (Wohnungsgeberbestätigung) va pasportingiz kerak bo‘ladi.",
        ru: "Зарегистрируйте адрес (Anmeldung / Einwohnermeldeamt) в местном бюро регистрации. Закон Германии требует сделать это в течение двух недель после переезда — нужны подписанное подтверждение арендодателя (Wohnungsgeberbestätigung) и паспорт.",
      },
    },
    {
      key: "de_health_insurance",
      window: "d30",
      sourceUrl: "https://www.make-it-in-germany.com/en/living-in-germany/health-insurance",
      sourceLabel: { en: "make-it-in-germany.de", uz: "make-it-in-germany.de", ru: "make-it-in-germany.de" },
      text: {
        en: "Enrol in statutory health insurance (GKV) — public universities require proof of cover to matriculate. Student rates are cheaper than the standard rate; bring your enrolment certificate.",
        uz: "Majburiy tibbiy sug‘urtaga (GKV) kirish: davlat universitetlari qabulni rasmiylashtirish uchun sug‘urta dalolatnomasini talab qiladi. Talaba tariflari standart tarifdan arzon; o‘qishga qabul haqidagi ma’lumotnomani olib boring.",
        ru: "Оформите обязательное медицинское страхование (GKV) — государственные вузы требуют подтверждение для зачисления. Студенческий тариф дешевле стандартного; возьмите справку о зачислении.",
      },
    },
    {
      key: "de_residence_permit",
      window: "d90",
      sourceUrl: "https://www.make-it-in-germany.com/en/visa-residence/types/studying",
      sourceLabel: { en: "make-it-in-germany.de", uz: "make-it-in-germany.de", ru: "make-it-in-germany.de" },
      text: {
        en: "Convert your entry visa into a residence permit for study purposes at the local foreigners authority (Ausländerbehörde). Apply before the visa expires and book the appointment early — slots are scarce at the start of term.",
        uz: "Kirish vizasini mahalliy chet elliklar idorasida (Ausländerbehörde) o‘qish maqsadidagi yashash ruxsatnomasiga almashtiring. Viza muddati tugashidan oldin ariza bering va uchrashuvni oldindan band qiling — semestr boshida navbat qiyin.",
        ru: "Замените въездную визу на вид на жительство для учёбы в местном ведомстве по делам иностранцев (Ausländerbehörde). Подайте до истечения визы и заранее запишитесь на приём — в начале семестра слотов мало.",
      },
    },
    {
      key: "de_blocked_account",
      window: "d30",
      sourceUrl: "https://www.make-it-in-germany.com/en/visa-residence/types/studying",
      sourceLabel: { en: "make-it-in-germany.de", uz: "make-it-in-germany.de", ru: "make-it-in-germany.de" },
      text: {
        en: "Release your blocked account (Sperrkonto) monthly instalments and open a local current account — most employers and landlords will not accept a foreign IBAN.",
        uz: "Bloklangan hisobingizning (Sperrkonto) oylik bo‘lib to‘lashlarini oching va mahalliy joriy hisob oching — ko‘p ish beruvchi va uy egalari xorijiy IBANni qabul qilmaydi.",
        ru: "Снимайте ежемесячные транши с блокированного счёта (Sperrkonto) и откройте местный текущий счёт — многие работодатели и арендодатели не принимают иностранный IBAN.",
      },
    },
  ],
};

/**
 * South Korea — Alien Registration Card, NHIS, ARC-linked banking.
 * Sources: Korea Immigration Service (HiKorea) and the National Health
 * Insurance Service.
 */
const SOUTH_KOREA: CountryArrivalGuidance = {
  country: "South Korea",
  flag: "🇰🇷",
  tips: [
    {
      key: "kr_arc",
      window: "d90",
      sourceUrl: "https://www.hikorea.go.kr/Main.pt",
      sourceLabel: { en: "HiKorea (Korea Immigration Service)", uz: "HiKorea (Koreya migratsiya xizmati)", ru: "HiKorea (иммиграционная служба Кореи)" },
      text: {
        en: "Apply for your Alien Registration Card (ARC) at the local immigration office. For the D-2 student visa the application must be filed within 90 days of entry; the ARC becomes your ID for almost everything else, so book it first.",
        uz: "Mahalliy migratsiya idorasida Chet ellik ro‘yxatga olish kartasiga (ARC) ariza bering. D-2 talaba vizasi uchun ariza kirgandan keyin 90 kun ichida topshirilishi kerak; ARC deyarli hamma narsa uchun shaxsni tasdiqlovchi hujjat bo‘ladi, shuning uchun birinchi navbatda band qiling.",
        ru: "Подайте заявление на карту иностранца (ARC) в местном иммиграционном офисе. Для студенческой визы D-2 заявление подаётся в течение 90 дней после въезда; ARC станет вашим удостоверением почти для всего, поэтому запишитесь первым делом.",
      },
    },
    {
      key: "kr_nhis",
      window: "d90",
      sourceUrl: "https://www.nhis.or.kr/english/index.do",
      sourceLabel: { en: "National Health Insurance Service", uz: "Milliy tibbiy sug‘urta xizmati", ru: "Национальная служба медстрахования" },
      text: {
        en: "Once your ARC is issued you are enrolled in the National Health Insurance Service (NHIS) as a foreign student. Premiums are billed monthly against the ARC; check that your university's international office has your correct address.",
        uz: "ARC berilgach, chet ellik talaba sifatida Milliy tibbiy sug‘urta xizmatiga (NHIS) kiritilasiz. To‘lovlar ARC bo‘yicha har oy hisoblanadi; universitetning xalqaro bo‘limida manzilingiz to‘g‘ri kiritilganini tekshiring.",
        ru: "После выдачи ARC вы автоматически зачисляетесь в Национальную службу медстрахования (NHIS) как иностранный студент. Взносы начисляются ежемесячно по ARC; проверьте, что в международном офисе вуза указан верный адрес.",
      },
    },
    {
      key: "kr_arc_banking",
      window: "d30",
      sourceUrl: "https://www.hikorea.go.kr/Main.pt",
      sourceLabel: { en: "HiKorea (Korea Immigration Service)", uz: "HiKorea (Koreya migratsiya xizmati)", ru: "HiKorea (иммиграционная служба Кореи)" },
      text: {
        en: "Most Korean banks require the ARC before opening an account or a phone contract. Use the university's international-student desk in the first weeks — they usually run a same-day onboarding session.",
        uz: "Ko‘p Koreya banklari hisob ochish yoki telefon shartnomasi uchun ARCni talab qiladi. Dastlabki haftalarda universitetning xalqaro talabalar bo‘limidan foydalaning — odatda bir kunda rasmiylashtirish sessiyasi bo‘ladi.",
        ru: "Большинство корейских банков требуют ARC для открытия счёта или оформления телефона. В первые недели обратитесь в отдел по работе с иностранными студентами — обычно там проводят оформление за один день.",
      },
    },
    {
      key: "kr_reentry",
      window: "year1",
      sourceUrl: "https://www.hikorea.go.kr/Main.pt",
      sourceLabel: { en: "HiKorea (Korea Immigration Service)", uz: "HiKorea (Koreya migratsiya xizmati)", ru: "HiKorea (иммиграционная служба Кореи)" },
      text: {
        en: "Check whether your D-2 status needs a re-entry permit before you travel home during the holidays, and keep your ARC valid for the whole of your enrolment.",
        uz: "Ta’til paytida uyga ketishdan oldin D-2 maqomingiz qayta kirish ruxsatnomasini talab qilishini tekshiring va ARC o‘qish davomida amal qilishini saqlang.",
        ru: "Перед поездкой домой на каникулы проверьте, нужно ли для статуса D-2 разрешение на повторный въезд, и следите за сроком действия ARC.",
      },
    },
  ],
};

/**
 * United Kingdom — eVisa / BRP, GP registration, NI number.
 * Sources: GOV.UK (the only authority that states these rules).
 */
const UNITED_KINGDOM: CountryArrivalGuidance = {
  country: "United Kingdom",
  flag: "🇬🇧",
  tips: [
    {
      key: "uk_evisa",
      window: "d7",
      sourceUrl: "https://www.gov.uk/evisa",
      sourceLabel: { en: "GOV.UK", uz: "GOV.UK", ru: "GOV.UK" },
      text: {
        en: "Set up your UKVI online immigration account and check your eVisa is linked to your current passport. Biometric Residence Permits (BRPs) are being retired in favour of the eVisa, so verify what your decision letter actually says before you travel.",
        uz: "UKVI onlayn immigratsiya hisobingizni yarating va eVisa hozirgi pasportingizga bog‘langanini tekshiring. Biometrik yashash ruxsatnomalari (BRP) o‘rnini eVisa egallamoqda, shuning uchun yo‘lga chiqishdan oldin qaror xatida nima yozilganini tekshiring.",
        ru: "Создайте онлайн-аккаунт UKVI и проверьте, что eVisa привязана к текущему паспорту. Биометрические карты (BRP) заменяются на eVisa, поэтому до поездки уточните, что именно указано в письме о решении.",
      },
    },
    {
      key: "uk_gp",
      window: "d30",
      sourceUrl: "https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/",
      sourceLabel: { en: "NHS", uz: "NHS", ru: "NHS" },
      text: {
        en: "Register with a GP surgery near your accommodation — do this even if you feel healthy, because non-emergency care and referrals both start with a GP. Registration is free and does not require proof of immigration status.",
        uz: "Yashash joyingiz yaqinidagi GP (oilaviy shifokor) amaliyotiga ro‘yxatdan o‘ting — o‘zingizni yaxshi his qilsangiz ham buni qiling, chunki shoshilinch bo‘lmagan yordam va yo‘llanmalar GP dan boshlanadi. Ro‘yxatdan o‘tish bepul va immigratsiya maqomini tasdiqlashni talab qilmaydi.",
        ru: "Запишитесь к терапевту (GP) рядом с жильём — даже если чувствуете себя здоровым: неотложная помощь и направления начинаются с GP. Регистрация бесплатна и не требует подтверждения иммиграционного статуса.",
      },
    },
    {
      key: "uk_ni_number",
      window: "d90",
      sourceUrl: "https://www.gov.uk/apply-national-insurance-number",
      sourceLabel: { en: "GOV.UK", uz: "GOV.UK", ru: "GOV.UK" },
      text: {
        en: "Apply for a National Insurance number if you will work part-time or take a placement. You cannot be paid legally without one, and the application takes several weeks.",
        uz: "Agar yarim kunlik ishlasangiz yoki amaliyot o‘tasangiz, Milliy sug‘urta raqamiga (NI) ariza bering. Usiz qonuniy to‘lov olib bo‘lmaydi va ariza bir necha hafta oladi.",
        ru: "Подайте заявку на номер национального страхования (NI), если планируете подработку или стажировку. Без него законно платить вам нельзя, а рассмотрение занимает несколько недель.",
      },
    },
    {
      key: "uk_bank_police",
      window: "d30",
      sourceUrl: "https://www.gov.uk/register-with-the-police",
      sourceLabel: { en: "GOV.UK", uz: "GOV.UK", ru: "GOV.UK" },
      text: {
        en: "Open a UK bank account (you will usually need proof of address and your eVisa share code), and check your visa conditions for a police registration requirement.",
        uz: "Britaniya bank hisobini oching (odatda manzil tasdiqnomasi va eVisa share code kerak bo‘ladi) va viza shartlarida politsiyada ro‘yxatdan o‘tish talabi borligini tekshiring.",
        ru: "Откройте британский банковский счёт (обычно нужны подтверждение адреса и share code из eVisa) и проверьте в условиях визы, требуется ли регистрация в полиции.",
      },
    },
  ],
};

/**
 * United States — SEVIS check-in with the DSO, SSN, banking, health insurance.
 * Sources: Study in the States (US Department of Homeland Security) and the
 * Social Security Administration.
 */
const UNITED_STATES: CountryArrivalGuidance = {
  country: "United States",
  flag: "🇺🇸",
  tips: [
    {
      key: "us_sevis_checkin",
      window: "d7",
      sourceUrl: "https://studyinthestates.dhs.gov/students/check-in-with-your-designated-school-official",
      sourceLabel: { en: "Study in the States (DHS)", uz: "Study in the States (DHS)", ru: "Study in the States (DHS)" },
      text: {
        en: "Check in with your Designated School Official (DSO) at the international student office. Your record must be activated in SEVIS for your F-1 status to be in good standing — it is the first thing to do, before banking or a phone line.",
        uz: "Xalqaro talabalar bo‘limidagi mas’ul maktab amaldori (DSO) bilan ro‘yxatdan o‘ting. F-1 maqomingiz yaxshi holatda bo‘lishi uchun yozuvingiz SEVISda faollashtirilishi kerak — bu bank yoki telefon liniyasidan oldin qilinadigan birinchi ish.",
        ru: "Отметьтесь у назначенного сотрудника школы (DSO) в международном офисе. Запись должна быть активирована в SEVIS, чтобы статус F-1 был в порядке, — это делается раньше банка и телефона.",
      },
    },
    {
      key: "us_health_insurance",
      window: "d30",
      sourceUrl: "https://studyinthestates.dhs.gov/students/health-insurance",
      sourceLabel: { en: "Study in the States (DHS)", uz: "Study in the States (DHS)", ru: "Study in the States (DHS)" },
      text: {
        en: "Confirm your health insurance: most universities auto-enrol students in a plan and let you waive it only if you prove equivalent cover. Medical costs without insurance are the single largest avoidable risk in year one.",
        uz: "Tibbiy sug‘urtangizni tasdiqlang: ko‘p universitetlar talabalarni avtomatik rejaga kiritadi va faqat teng sug‘urta mavjudligini isbotlasangiz voz kechishga ruxsat beradi. Sug‘urtasiz tibbiy xarajatlar birinchi yildagi eng katta oldini olish mumkin bo‘lgan xavfdir.",
        ru: "Подтвердите медстраховку: многие вузы автоматически включают студентов в план и позволяют отказаться только при доказанном эквивалентном покрытии. Медицинские расходы без страховки — главный устранимый риск первого года.",
      },
    },
    {
      key: "us_ssn_bank",
      window: "d90",
      sourceUrl: "https://www.ssa.gov/ssnumber/",
      sourceLabel: { en: "Social Security Administration", uz: "Ijtimoiy ta’minot boshqarmasi", ru: "Управление социального обеспечения" },
      text: {
        en: "Apply for a Social Security number if you have on-campus employment or an authorised internship — the SSA requires proof of work eligibility plus your I-20 and passport. Open a US bank account with your passport and I-20 in the meantime.",
        uz: "Agar kampusda ishlasangiz yoki ruxsat etilgan amaliyot o‘tasangiz, Ijtimoiy ta’minot raqamiga (SSN) ariza bering — SSA ishlash huquqini tasdiqlovchi hujjat, I-20 va pasportni talab qiladi. Shu orada pasport va I-20 bilan AQSh bank hisobini oching.",
        ru: "Подайте заявку на номер социального страхования (SSN), если работаете в кампусе или проходите разрешённую стажировку: SSA требует подтверждение права на работу, I-20 и паспорт. Пока откройте счёт в банке США по паспорту и I-20.",
      },
    },
    {
      key: "us_tax_forms",
      window: "year1",
      sourceUrl: "https://www.irs.gov/individuals/international-taxpayers",
      sourceLabel: { en: "IRS", uz: "IRS", ru: "IRS" },
      text: {
        en: "Even with no income you may need to file an information return each year as a non-resident. Put the deadline in your calendar in your first semester, not your last.",
        uz: "Daromadingiz bo‘lmasa ham, norezident sifatida har yili ma’lumot deklaratsiyasini topshirishingiz kerak bo‘lishi mumkin. Muddatni oxirgi semestrda emas, birinchi semestrda taqvimga qo‘ying.",
        ru: "Даже без дохода вам может требоваться ежегодная информационная декларация как нерезиденту. Поставьте срок в календарь в первом семестре, а не в последнем.",
      },
    },
  ],
};

export const COUNTRY_ARRIVAL_GUIDANCE: CountryArrivalGuidance[] = [
  GERMANY,
  SOUTH_KOREA,
  UNITED_KINGDOM,
  UNITED_STATES,
];

/**
 * Guidance for one of the student's preferred countries, matched loosely on
 * the country name so "UK", "England" and "United Kingdom" all resolve.
 * Returns null when we hold no sourced guidance for that country — better a
 * missing block than a guessed rule.
 */
export function countryArrivalGuidance(country: string | null | undefined): CountryArrivalGuidance | null {
  const needle = String(country ?? "").trim().toLowerCase();
  if (!needle) return null;
  const aliases: Record<string, string> = {
    uk: "united kingdom",
    england: "united kingdom",
    scotland: "united kingdom",
    wales: "united kingdom",
    "great britain": "united kingdom",
    britain: "united kingdom",
    usa: "united states",
    us: "united states",
    "united states of america": "united states",
    america: "united states",
    deutschland: "germany",
    korea: "south korea",
    "korea, republic of": "south korea",
    "republic of korea": "south korea",
  };
  const normalized = aliases[needle] ?? needle;
  return (
    COUNTRY_ARRIVAL_GUIDANCE.find(
      (g) => g.country.toLowerCase() === normalized || g.country.toLowerCase().includes(normalized)
    ) ?? null
  );
}
