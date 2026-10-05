/**
 * The profile report's built-in fallback — used only when the AI provider is
 * not configured or fails, and clearly flagged as such by the dashboard.
 *
 * It is grounded in the same engines the rest of the app uses (readiness from
 * `profileStrength`, universities from `calculateUniversityMatch`,
 * scholarships from `calculateScholarshipMatch`), so it can never disagree
 * with the Explorer, the Chancing pane or the Scholarships hub. It contains NO
 * invented statistics: no percentiles, no acceptance rates, no "chance"
 * figures and no hardcoded university names.
 *
 * Long-form report prose lives here rather than in the i18n catalog for the
 * same reason the AI reply does: it is document text, not UI chrome. The three
 * templates mirror each other section by section.
 */

export interface ReportMatchFact {
  name: string;
  country: string;
  score: number;
  category: string;
  /** The highest-weighted verified reason from the fit engine. */
  reason?: string | null;
  /** The highest-weighted verified issue from the fit engine. */
  issue?: string | null;
}

export interface ReportScholarshipFact {
  title: string;
  provider: string;
  coverageType: string;
  /** ISO date when the catalogue knows one, otherwise null (never guessed). */
  deadlineDate: string | null;
}

export interface ReportFacts {
  name: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: number;
  gpaScale: number;
  ieltsScore: number | null;
  budgetAnnualUsd: number | null;
  needScholarship: boolean;
  workExperienceYears: number;
  researchPublications: number;
  extracurriculars: string | null;
  readiness: { overall: number; completeness: number; sections: { key: string; score: number }[] };
  reached: ReportMatchFact[];
  matched: ReportMatchFact[];
  safety: ReportMatchFact[];
  scholarships: ReportScholarshipFact[];
}

const SECTION_NAMES: Record<string, Record<string, string>> = {
  en: {
    academics: "Academics",
    tests: "Tests",
    english: "English",
    extracurriculars: "Extracurriculars",
    leadership: "Leadership",
    research: "Research",
    awards: "Awards",
    essays: "Essays",
    financial: "Financial",
  },
  uz: {
    academics: "Akademik ko‘rsatkichlar",
    tests: "Testlar",
    english: "Ingliz tili",
    extracurriculars: "Darsdan tashqari faoliyat",
    leadership: "Liderlik",
    research: "Tadqiqot",
    awards: "Mukofotlar",
    essays: "Insholar",
    financial: "Moliyaviy tayyorlik",
  },
  ru: {
    academics: "Академические показатели",
    tests: "Тесты",
    english: "Английский язык",
    extracurriculars: "Внеучебная активность",
    leadership: "Лидерство",
    research: "Исследования",
    awards: "Награды",
    essays: "Эссе",
    financial: "Финансовая готовность",
  },
};

function sectionName(locale: string, key: string): string {
  return SECTION_NAMES[locale]?.[key] ?? SECTION_NAMES.en[key] ?? key;
}

function money(locale: string, value: number | null): string {
  if (value == null) {
    return locale === "uz" ? "ko‘rsatilmagan" : locale === "ru" ? "не указан" : "not specified";
  }
  return `$${value.toLocaleString("en-US")}`;
}

function uniLine(locale: string, rows: ReportMatchFact[]): string {
  if (!rows.length) {
    return locale === "uz"
      ? "- Hozircha bu toifada mos universitet yo‘q."
      : locale === "ru"
        ? "- Пока в этой категории нет подходящих университетов."
        : "- No matching universities in this tier yet.";
  }
  return rows
    .map((r) => {
      const base = `- **${r.name}** (${r.country}) — ${r.score}% ${locale === "uz" ? "moslik" : locale === "ru" ? "соответствие" : "fit"}`;
      const detail = r.issue || r.reason;
      return detail ? `${base}: ${detail}` : base;
    })
    .join("\n");
}

function scholarshipLines(locale: string, rows: ReportScholarshipFact[]): string {
  if (!rows.length) {
    return locale === "uz"
      ? "- Katalogda hozircha mos grant topilmadi — filtrlarni kengaytirib ko‘ring."
      : locale === "ru"
        ? "- В каталоге пока не найдено подходящих стипендий — попробуйте расширить фильтры."
        : "- No matching scholarships in the catalogue yet — try widening the filters.";
  }
  return rows
    .map((s) => {
      const deadline =
        s.deadlineDate ??
        (locale === "uz"
          ? "e’lon qilinmagan — rasmiy sahifasini tekshiring"
          : locale === "ru"
            ? "не опубликован — проверьте официальную страницу"
            : "not published — check the official page");
      return `- **${s.title}** — ${s.provider} (${s.coverageType}); ${locale === "uz" ? "muddat" : locale === "ru" ? "срок" : "deadline"}: ${deadline}`;
    })
    .join("\n");
}

/** Build the fallback report in the profile's language. */
export function buildProfileReport(locale: string, f: ReportFacts): string {
  const loc = locale === "uz" || locale === "ru" ? locale : "en";
  const sections = f.readiness.sections
    .filter((s) => s.score > 0)
    .map((s) => `${sectionName(loc, s.key)} ${s.score}`)
    .join(" · ");

  const strengths = f.readiness.sections
    .filter((s) => s.score >= 70)
    .map((s) => `- **${sectionName(loc, s.key)}: ${s.score}/100**`)
    .join("\n");
  const gaps = f.readiness.sections
    .filter((s) => s.score < 55)
    .map((s) => `- **${sectionName(loc, s.key)}: ${s.score}/100**`)
    .join("\n");

  const factLines = [
    f.ieltsScore ? `IELTS ${f.ieltsScore}` : null,
    f.workExperienceYears > 0 ? `${f.workExperienceYears} ${loc === "uz" ? "yil ish tajribasi" : loc === "ru" ? "лет опыта" : "years of experience"}` : null,
    f.researchPublications > 0 ? `${f.researchPublications} ${loc === "uz" ? "nashr" : loc === "ru" ? "публикаций" : "publications"}` : null,
  ].filter(Boolean).join(" · ");

  const t = {
    en: {
      title: "Profile Readiness Report (built-in summary)",
      score: `**Readiness score: ${f.readiness.overall}/100** · profile completeness ${f.readiness.completeness}%. This is a readiness measure from your saved profile — it is not a chance of admission, and ScholarBridge does not estimate admission probability without a validated methodology.`,
      bySection: `Readiness by section: ${sections || "not enough data yet"}`,
      strengths: "### Strengths",
      strengthsEmpty: "- Your profile is still thin — filling in the sections above is the fastest way to strengthen it.",
      gaps: "### Gaps to work on first",
      gapsEmpty: "- No critical gaps detected in the readiness sections.",
      strategy: "### University strategy (from the live fit engine)",
      strategyNote: "Categories come from ScholarBridge's requirements-fit engine, not from acceptance odds.",
      reach: "**Reach** (fit is a stretch today)",
      match: "**Match**",
      safety: "**Safety**",
      funding: "### Funding from the catalogue",
      fundingNote: "Only scholarships already in the verified catalogue are listed. Amounts and deadlines change — always confirm on the official page.",
      plan: "### Suggested next steps",
      planLines: [
        "- Fill the profile sections with the lowest scores first; they move the readiness number the most.",
        "- Confirm each shortlisted university's requirements on its official page before applying.",
        "- Prepare transcripts, two academic references and a statement of purpose draft.",
        "- Track every deadline inside the app so nothing depends on memory.",
      ].join("\n"),
      student: `Profile: ${f.name} · ${f.degreeLevel} in ${f.targetMajor} · GPA ${f.gpa}/${f.gpaScale}${factLines ? ` · ${factLines}` : ""}`,
      budget: `Annual budget: ${money("en", f.budgetAnnualUsd)}${f.needScholarship ? " · scholarship needed" : ""}`,
    },
    uz: {
      title: "Profil tayyorligi hisoboti (ichki xulosa)",
      score: `**Tayyorlik balli: ${f.readiness.overall}/100** · profil to‘liqligi ${f.readiness.completeness}%. Bu saqlangan profilingiz asosidagi tayyorlik o‘lchovi — qabul qilinish ehtimoli emas; ScholarBridge tasdiqlangan metodologiyasiz qabul ehtimolini hisoblamaydi.`,
      bySection: `Bo‘limlar bo‘yicha tayyorlik: ${sections || "hali ma’lumot yetarli emas"}`,
      strengths: "### Kuchli tomonlar",
      strengthsEmpty: "- Profilingiz hali to‘liq emas — yuqoridagi bo‘limlarni to‘ldirish eng tez natija beradi.",
      gaps: "### Avval hal qilinadigan kamchiliklar",
      gapsEmpty: "- Tayyorlik bo‘limlarida jiddiy kamchilik topilmadi.",
      strategy: "### Universitet strategiyasi (jonli moslik dvigateli)",
      strategyNote: "Toifalar ScholarBridge moslik dvigateli asosida — qabul ehtimoli emas.",
      reach: "**Reach** (bugungi holatda moslik yetarli emas)",
      match: "**Match**",
      safety: "**Safety**",
      funding: "### Katalogdagi moliyaviy imkoniyatlar",
      fundingNote: "Faqat tekshirilgan katalogdagi grantlar keltiriladi. Summalar va muddatlar o‘zgaradi — har doim rasmiy sahifada tasdiqlang.",
      plan: "### Keyingi qadamlar",
      planLines: [
        "- Eng past balli bo‘limlardan boshlang — ular tayyorlik ballini eng ko‘p oshiradi.",
        "- Ariza topshirishdan oldin har bir universitet talabini rasmiy sahifasida tasdiqlang.",
        "- Transkript, ikkita akademik tavsiyanoma va motivatsion xat loyihasini tayyorlang.",
        "- Har bir muddatni ilovada kuzatib boring — hech narsa xotiraga bog‘liq bo‘lmasin.",
      ].join("\n"),
      student: `Profil: ${f.name} · ${f.targetMajor} bo‘yicha ${f.degreeLevel} · GPA ${f.gpa}/${f.gpaScale}${factLines ? ` · ${factLines}` : ""}`,
      budget: `Yillik byudjet: ${money("uz", f.budgetAnnualUsd)}${f.needScholarship ? " · grant zarur" : ""}`,
    },
    ru: {
      title: "Отчёт о готовности профиля (встроенная сводка)",
      score: `**Балл готовности: ${f.readiness.overall}/100** · заполненность профиля ${f.readiness.completeness}%. Это оценка готовности по сохранённому профилю — не вероятность поступления; ScholarBridge не оценивает вероятность без проверенной методологии.`,
      bySection: `Готовность по разделам: ${sections || "пока недостаточно данных"}`,
      strengths: "### Сильные стороны",
      strengthsEmpty: "- Профиль ещё неполный — быстрее всего усилить его, заполнив разделы выше.",
      gaps: "### Что исправить в первую очередь",
      gapsEmpty: "- В разделах готовности критичных пробелов не обнаружено.",
      strategy: "### Стратегия по университетам (живой движок соответствия)",
      strategyNote: "Категории рассчитаны движком соответствия требованиям, а не шансами на зачисление.",
      reach: "**Reach** (соответствия пока недостаточно)",
      match: "**Match**",
      safety: "**Safety**",
      funding: "### Финансирование из каталога",
      fundingNote: "Перечислены только стипендии из проверяемого каталога. Суммы и сроки меняются — всегда подтверждайте на официальной странице.",
      plan: "### Рекомендуемые следующие шаги",
      planLines: [
        "- Сначала заполните разделы с наименьшими баллами — они сильнее всего поднимают готовность.",
        "- Перед подачей подтвердите требования каждого университета на его официальном сайте.",
        "- Подготовьте транскрипты, две академические рекомендации и черновик мотивационного письма.",
        "- Отслеживайте все сроки в приложении, чтобы ничего не зависело от памяти.",
      ].join("\n"),
      student: `Профиль: ${f.name} · ${f.degreeLevel} по направлению ${f.targetMajor} · GPA ${f.gpa}/${f.gpaScale}${factLines ? ` · ${factLines}` : ""}`,
      budget: `Годовой бюджет: ${money("ru", f.budgetAnnualUsd)}${f.needScholarship ? " · нужна стипендия" : ""}`,
    },
  }[loc];

  return [
    `### ${t.title}`,
    t.student,
    t.budget,
    "",
    t.score,
    t.bySection,
    "",
    t.strengths,
    strengths || t.strengthsEmpty,
    "",
    t.gaps,
    gaps || t.gapsEmpty,
    "",
    t.strategy,
    t.strategyNote,
    t.reach,
    uniLine(loc, f.reached),
    t.match,
    uniLine(loc, f.matched),
    t.safety,
    uniLine(loc, f.safety),
    "",
    t.funding,
    scholarshipLines(loc, f.scholarships),
    t.fundingNote,
    "",
    t.plan,
    t.planLines,
  ].join("\n");
}
