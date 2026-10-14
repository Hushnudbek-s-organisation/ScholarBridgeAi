import { analyzeEssay, type EssayFeedback } from "./essay";
import { parseListColumn, type ChancingProfile } from "./chancing";

export type SopLocale = "en" | "uz" | "ru";

export interface SopDraftContext {
  universityName: string;
  programName: string;
  personalHook?: string;
  careerGoals?: string;
  programEvidence?: string;
  experienceExample?: string;
  profileFacts: string[];
}

export interface SopProfileSource extends ChancingProfile {
  workExperienceYears?: number | null;
}

const cleanNote = (value: string | null | undefined, max = 280): string =>
  (value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Turn only student-recorded profile values into explicit facts for the SOP
 * prompt. Missing values stay missing; no example achievements or test scores
 * are supplied by this helper.
 */
export function getSopProfileFacts(profile: SopProfileSource): string[] {
  const facts: string[] = [];
  const degreeLevel = cleanNote(profile.degreeLevel, 120);
  const major = cleanNote(profile.targetMajor, 160);
  if (degreeLevel) facts.push(`Target degree level recorded: ${degreeLevel}`);
  if (major) facts.push(`Target field recorded: ${major}`);

  if (typeof profile.gpa === "number" && Number.isFinite(profile.gpa)) {
    facts.push(
      `GPA recorded: ${profile.gpa}${typeof profile.gpaScale === "number" && Number.isFinite(profile.gpaScale) ? ` / ${profile.gpaScale}` : " (grading scale not recorded)"}`
    );
  }

  const tests = [
    typeof profile.ieltsScore === "number" && profile.ieltsScore > 0 ? `IELTS ${profile.ieltsScore}` : null,
    typeof profile.toeflScore === "number" && profile.toeflScore > 0 ? `TOEFL ${profile.toeflScore}` : null,
    typeof profile.satScore === "number" && profile.satScore > 0 ? `SAT ${profile.satScore}` : null,
    typeof profile.actScore === "number" && profile.actScore > 0 ? `ACT ${profile.actScore}` : null,
    typeof profile.greScore === "number" && profile.greScore > 0 ? `GRE ${profile.greScore}` : null,
    typeof profile.duolingoScore === "number" && profile.duolingoScore > 0 ? `Duolingo ${profile.duolingoScore}` : null,
  ].filter((value): value is string => Boolean(value));
  if (tests.length) facts.push(`Test scores recorded: ${tests.join(", ")}`);

  const activities = [
    ...parseListColumn(profile.projects),
    ...parseListColumn(profile.researchExperience),
    ...parseListColumn(profile.extracurriculars),
    ...parseListColumn(profile.leadership),
    ...parseListColumn(profile.volunteering),
    ...parseListColumn(profile.sports),
    ...parseListColumn(profile.clubs),
  ]
    .map((item) => cleanNote(item, 180))
    .filter(Boolean)
    .slice(0, 6);
  if (activities.length) facts.push(`Student-recorded activities/projects (confirm details): ${activities.join("; ")}`);

  const workYears = Number(profile.workExperienceYears);
  if (Number.isFinite(workYears) && workYears > 0) {
    facts.push(`Work experience duration recorded: ${workYears} year(s)`);
  }
  const publications = Number(profile.researchPublications);
  if (Number.isFinite(publications) && publications > 0) {
    facts.push(`Research publication count recorded: ${publications}`);
  }

  return facts;
}

const DRAFT_COPY: Record<SopLocale, {
  motivation: (note: string) => string;
  preparation: (facts: string) => string;
  evidence: (note: string) => string;
  programFit: (program: string, university: string, evidence: string) => string;
  goals: (note: string) => string;
}> = {
  en: {
    motivation: (note) => `Motivation: [Describe one specific, true moment or question that led you to this field; do not invent an event.]${note ? ` Student-entered note to verify: “${note}”.` : ""}`,
    preparation: (facts) => `Academic preparation: [Name courses, skills, or academic work you actually completed and explain what you learned.]${facts ? ` Profile-recorded facts to verify against source documents: ${facts}.` : " No academic or test details are recorded for this draft; add only facts you can verify."}`,
    evidence: (note) => `Evidence: [Choose one real project, research, or work example. State your role, the actions you took, and an outcome you can substantiate; do not estimate impact.]${note ? ` Student-entered example to verify: “${note}”.` : " No concrete example was supplied; add one only if you have a real example."}`,
    programFit: (program, university, evidence) => `Program fit: [Explain why ${program} at ${university} fits your academic plans.]${evidence ? ` Student-supplied program detail to verify on the official programme page: “${evidence}”.` : " Add a course, research area, faculty member, or other detail only after checking the official programme page; none was supplied here."}`,
    goals: (note) => `Future direction: [State a realistic next step after the degree and connect it to your studies without promising a particular outcome.]${note ? ` Student-stated goal to verify: “${note}”.` : " No career goal was supplied; write your own before completing this paragraph."}`,
  },
  uz: {
    motivation: (note) => `Motivatsiya: [Sizni shu sohaga olib kelgan aniq va haqiqiy voqea yoki savolni yozing; voqeani o‘ylab topmang.]${note ? ` Talaba kiritgan, tekshirilishi kerak bo‘lgan qayd: “${note}”.` : ""}`,
    preparation: (facts) => `Akademik tayyorgarlik: [Haqiqatan o‘qigan fanlaringiz, egallagan ko‘nikmalaringiz yoki bajargan ishlaringizni va ulardan nimani o‘rganganingizni yozing.]${facts ? ` Manba hujjatlar bilan tekshirilishi kerak bo‘lgan profil ma’lumotlari: ${facts}.` : " Ushbu loyiha uchun akademik yoki test ma’lumoti kiritilmagan; faqat tekshira oladigan faktlarni qo‘shing."}`,
    evidence: (note) => `Aniq misol: [Haqiqiy loyiha, tadqiqot yoki ish tajribasidan birini tanlang. O‘z rolingizni, qilgan ishlaringizni va tasdiqlay oladigan natijani yozing; ta’sirni taxmin qilmang.]${note ? ` Tekshirilishi kerak bo‘lgan talaba misoli: “${note}”.` : " Aniq misol kiritilmagan; faqat haqiqiy misolingiz bo‘lsa qo‘shing."}`,
    programFit: (program, university, evidence) => `Dasturga moslik: [${university}dagi ${program} dasturi o‘quv rejangizga nima uchun mosligini tushuntiring.]${evidence ? ` Rasmiy dastur sahifasida tekshirilishi kerak bo‘lgan talaba qaydi: “${evidence}”.` : " Fan, tadqiqot yo‘nalishi, professor yoki boshqa ma’lumotni faqat rasmiy dastur sahifasidan tekshirgach kiriting; bu yerda bunday ma’lumot berilmagan."}`,
    goals: (note) => `Kelajak rejalari: [Darajadan keyingi real qadamni ayting va uni o‘qishingiz bilan bog‘lang; muayyan natijani va’da qilmang.]${note ? ` Tekshirilishi kerak bo‘lgan talaba bildirgan maqsad: “${note}”.` : " Karyera maqsadi kiritilmagan; ushbu paragrafni tugatishdan oldin o‘z maqsadingizni yozing."}`,
  },
  ru: {
    motivation: (note) => `Мотивация: [Опишите конкретный реальный эпизод или вопрос, который привёл вас в эту сферу; не придумывайте события.]${note ? ` Заметка студента, которую нужно проверить: «${note}».` : ""}`,
    preparation: (facts) => `Академическая подготовка: [Укажите курсы, навыки и учебную работу, которые вы действительно освоили или выполнили, и объясните, чему научились.]${facts ? ` Данные профиля, которые нужно сверить с документами: ${facts}.` : " Для этого черновика не указаны академические данные или результаты тестов; добавляйте только проверяемые факты."}`,
    evidence: (note) => `Конкретный пример: [Выберите реальный проект, исследование или рабочий опыт. Укажите свою роль, действия и результат, который можно подтвердить; не оценивайте эффект наугад.]${note ? ` Пример от студента, который нужно проверить: «${note}».` : " Конкретный пример не предоставлен; добавляйте его только при наличии реального опыта."}`,
    programFit: (program, university, evidence) => `Соответствие программе: [Объясните, почему программа ${program} в ${university} связана с вашими учебными планами.]${evidence ? ` Заметка о программе, которую нужно сверить с официальной страницей: «${evidence}».` : " Указывайте курс, направление исследований, преподавателя или другую деталь только после проверки официальной страницы программы; таких данных здесь нет."}`,
    goals: (note) => `Дальнейшие планы: [Назовите реалистичный следующий шаг после обучения и свяжите его с программой, не обещая определённый результат.]${note ? ` Цель, указанная студентом и требующая проверки: «${note}».` : " Карьерная цель не указана; сформулируйте её самостоятельно перед завершением этого абзаца."}`,
  },
};

const REVIEW_COPY: Record<SopLocale, {
  title: string;
  rubricNote: string;
  wordCount: string;
  dimensions: [string, string, string, string, string];
  findings: string;
  noFindings: string;
  quoteLabel: string;
  nextEdit: string;
  finalNote: string;
  issues: Record<string, string>;
}> = {
  en: {
    title: "Text-based SOP review (offline rubric)",
    rubricNote: "This deterministic writing rubric describes patterns detected in the draft. It is not an admissions rating, prediction, or guarantee.",
    wordCount: "Word count",
    dimensions: ["Opening", "Structure", "Specificity & evidence", "Language", "Prompt fit"],
    findings: "Priority findings",
    noFindings: "No issues were detected by these checks. That does not confirm that the draft meets a programme's prompt or requirements; review those separately.",
    quoteLabel: "Excerpt",
    nextEdit: "Suggested next edit",
    finalNote: "Use only accurate, verifiable information. Do not add a metric, achievement, or programme detail unless you can confirm it.",
    issues: {
      opening_boilerplate: "The opening begins with application boilerplate. Consider replacing it with a concise, true moment or question relevant to your motivation.",
      long_first_sentence: "The opening sentence is long. Try splitting it into shorter sentences while preserving its original meaning.",
      cliche_opening: "The opening contains a common phrase. Replace it only with a specific experience that actually happened to you.",
      too_few_paragraphs: "The draft has few paragraph breaks. Group related ideas and separate distinct points where the prompt allows.",
      paragraph_too_long: "One paragraph is long. Consider splitting it where the subject or main idea changes.",
      no_conclusion: "The ending may need a clearer close. Respond to the prompt without adding a new unsupported claim.",
      run_on_sentences: "Several sentences are long. Review sentence boundaries and vary sentence length where it improves clarity.",
      no_evidence: "The checks did not detect a numeric example. If relevant, add a real example and explain your role; do not invent numbers.",
      thin_evidence: "The checks found few numeric details. Named examples may not be detected; review whether your own role and evidence are clear.",
      unsupported_adjective: "A self-description appears without direct evidence in that phrase. Consider showing the quality through an action you actually took.",
      cliches: "The draft contains common application phrases. Replace only those that do not express your own specific experience.",
      passive_voice: "Some passive constructions may obscure who acted. Use active voice when it accurately reflects your role.",
      monotone_rhythm: "Sentence lengths are similar. Consider varying them if that would make the passage easier to follow.",
      repeated_word: "A repeated word was detected. Review the excerpt for an accidental duplicate.",
      target_not_named: "The supplied university or programme name was not detected. Check whether naming it is required by this prompt.",
      why_us_generic: "The checks did not detect a specific programme feature. Add one only after verifying it on an official source.",
      over_limit: "The draft exceeds the word limit you supplied. Trim it to meet the prompt's stated limit.",
      under_limit: "The draft uses less than 60% of the word limit you supplied. Check whether the prompt asks for more development before adding text.",
      no_forward_look: "A future goal was not detected. Include one only if it is relevant to the prompt.",
      too_short: "This is a short draft. Check the prompt's required length and develop the response with relevant, verified detail if needed.",
    },
  },
  uz: {
    title: "SOP matn tahlili (oflayn mezon)",
    rubricNote: "Bu deterministik yozuv mezoni matnda aniqlangan xususiyatlarni ko‘rsatadi. U qabul bahosi, bashorat yoki kafolat emas.",
    wordCount: "So‘zlar soni",
    dimensions: ["Kirish", "Tuzilish", "Aniqlik va dalillar", "Til", "Savolga moslik"],
    findings: "Ustuvor kuzatuvlar",
    noFindings: "Ushbu tekshiruvlar muammo aniqlamadi. Bu matn dastur savoli yoki talablariga mosligini tasdiqlamaydi; ularni alohida tekshiring.",
    quoteLabel: "Matndan parcha",
    nextEdit: "Keyingi tahrir uchun tavsiya",
    finalNote: "Faqat aniq va tekshiriladigan ma’lumotlardan foydalaning. Tasdiqlay olmasangiz, raqam, yutuq yoki dastur tafsilotini qo‘shmang.",
    issues: {
      opening_boilerplate: "Kirish ariza uchun odatiy iboradan boshlanadi. Uni motivatsiyangizga tegishli qisqa, haqiqiy voqea yoki savol bilan almashtirishni ko‘rib chiqing.",
      long_first_sentence: "Birinchi jumla uzun. Asl ma’nosini saqlagan holda qisqaroq jumlalarga ajratib ko‘ring.",
      cliche_opening: "Kirishda ko‘p ishlatiladigan ibora bor. Uni faqat o‘zingiz boshdan kechirgan aniq tajriba bilan almashtiring.",
      too_few_paragraphs: "Matnda paragraf ajratish kam. Savol imkon bergan joyda bog‘liq fikrlarni guruhlang va alohida nuqtalarni ajrating.",
      paragraph_too_long: "Paragraflardan biri uzun. Mavzu yoki asosiy fikr o‘zgargan joyda bo‘lishni ko‘rib chiqing.",
      no_conclusion: "Yakun yanada aniqroq bo‘lishi mumkin. Yangi, dalilsiz da’vo qo‘shmasdan savolga javob bering.",
      run_on_sentences: "Bir nechta jumla uzun. Tushunarlilikni oshirsa, jumla chegaralarini tekshirib, uzunlikni o‘zgartiring.",
      no_evidence: "Tekshiruv raqamli misol topmadi. Kerak bo‘lsa, haqiqiy misol va undagi rolingizni yozing; raqam o‘ylab topmang.",
      thin_evidence: "Tekshiruv kam sonli raqamli tafsilot topdi. Nomlangan misollar aniqlanmasligi mumkin; rolingiz va dalil ravshanligini tekshiring.",
      unsupported_adjective: "O‘zini ta’riflovchi iborada bevosita dalil ko‘rsatilmagan. Bu sifatni haqiqatan qilgan ishingiz orqali ko‘rsatishni o‘ylab ko‘ring.",
      cliches: "Matnda arizalarda ko‘p uchraydigan iboralar bor. Faqat o‘z tajribangizni ifodalamaydiganlarini almashtiring.",
      passive_voice: "Ayrim majhul nisbatdagi jumlalarda harakatni kim bajargani noaniq bo‘lishi mumkin. Rulingizga mos bo‘lsa, faol nisbatdan foydalaning.",
      monotone_rhythm: "Jumla uzunliklari o‘xshash. O‘qishni yengillashtirsa, turli uzunliklardan foydalaning.",
      repeated_word: "Takrorlangan so‘z aniqlandi. Parchada tasodifiy dublikat bor-yo‘qligini tekshiring.",
      target_not_named: "Kiritilgan universitet yoki dastur nomi aniqlanmadi. Ushbu savolda uni yozish talab qilinishini tekshiring.",
      why_us_generic: "Tekshiruv dasturga xos tafsilot topmadi. Bunday ma’lumotni faqat rasmiy manbadan tekshirgach qo‘shing.",
      over_limit: "Matn kiritgan so‘z chegarangizdan oshgan. Savolda belgilangan chegaragacha qisqartiring.",
      under_limit: "Matn belgilangan chegaraning 60 foizidan kam. Qo‘shimcha yozishdan oldin savol batafsilroq javob talab qilishini tekshiring.",
      no_forward_look: "Kelajak maqsadi aniqlanmadi. Uni faqat savolga tegishli bo‘lsa kiriting.",
      too_short: "Bu qisqa qoralama. Savoldagi uzunlik talabini tekshiring va kerak bo‘lsa, javobni tegishli, tekshirilgan tafsilotlar bilan rivojlantiring.",
    },
  },
  ru: {
    title: "Анализ текста SOP (офлайн-рубрика)",
    rubricNote: "Эта детерминированная рубрика показывает особенности, обнаруженные в тексте. Это не оценка приёма, прогноз или гарантия.",
    wordCount: "Количество слов",
    dimensions: ["Вступление", "Структура", "Конкретика и доказательства", "Язык", "Соответствие заданию"],
    findings: "Приоритетные наблюдения",
    noFindings: "Эти проверки не выявили проблем. Это не подтверждает соответствие заданию или требованиям программы; проверьте их отдельно.",
    quoteLabel: "Фрагмент",
    nextEdit: "Следующая правка",
    finalNote: "Используйте только точные и проверяемые сведения. Не добавляйте цифры, достижения или детали программы, которые не можете подтвердить.",
    issues: {
      opening_boilerplate: "Вступление начинается с типовой фразы для заявления. Подумайте, можно ли заменить её коротким реальным эпизодом или вопросом, связанным с вашей мотивацией.",
      long_first_sentence: "Первое предложение длинное. Попробуйте разделить его на более короткие, сохранив исходный смысл.",
      cliche_opening: "Во вступлении есть распространённая фраза. Заменяйте её только конкретным опытом, который действительно пережили.",
      too_few_paragraphs: "В черновике мало абзацев. Группируйте связанные идеи и разделяйте разные тезисы, если это допускает задание.",
      paragraph_too_long: "Один из абзацев длинный. Подумайте о разделении в месте смены темы или основной мысли.",
      no_conclusion: "Финал можно сделать яснее. Ответьте на задание, не добавляя новых неподтверждённых утверждений.",
      run_on_sentences: "Некоторые предложения длинные. Проверьте их границы и меняйте длину, если это улучшает ясность.",
      no_evidence: "Проверка не обнаружила числового примера. При необходимости добавьте реальный пример и укажите свою роль; не придумывайте цифры.",
      thin_evidence: "Проверка обнаружила мало числовых деталей. Именованные примеры могут не распознаваться; проверьте, ясны ли ваша роль и доказательства.",
      unsupported_adjective: "В самоописании не приведено прямое доказательство именно в этой фразе. Подумайте, как показать качество через реальное действие.",
      cliches: "В тексте есть распространённые фразы из заявлений. Заменяйте только те, которые не отражают ваш конкретный опыт.",
      passive_voice: "Некоторые пассивные конструкции могут скрывать исполнителя действия. Используйте активный залог, если он точно отражает вашу роль.",
      monotone_rhythm: "Предложения похожи по длине. Попробуйте разнообразить их, если так текст будет легче читать.",
      repeated_word: "Обнаружено повторение слова. Проверьте фрагмент на случайный дубль.",
      target_not_named: "Название указанного университета или программы не обнаружено. Проверьте, требует ли задание назвать его.",
      why_us_generic: "Проверка не обнаружила конкретной особенности программы. Добавляйте её только после проверки по официальному источнику.",
      over_limit: "Черновик превышает указанный вами лимит слов. Сократите его до ограничения из задания.",
      under_limit: "В черновике использовано менее 60% указанного лимита. Сначала проверьте, требует ли задание более подробного ответа.",
      no_forward_look: "Будущая цель не обнаружена. Указывайте её только если она относится к заданию.",
      too_short: "Это короткий черновик. Проверьте требуемый объём и при необходимости развейте ответ релевантными проверенными деталями.",
    },
  },
};

function localeOrEnglish(locale: string): SopLocale {
  return locale === "uz" || locale === "ru" ? locale : "en";
}

/** A safe five-paragraph scaffold used when no model result is available. */
export function buildSopDraftFallback(locale: string, context: SopDraftContext): string {
  const loc = localeOrEnglish(locale);
  const copy = DRAFT_COPY[loc];
  const facts = context.profileFacts.map((fact) => cleanNote(fact, 220)).filter(Boolean).join("; ");
  return [
    copy.motivation(cleanNote(context.personalHook)),
    copy.preparation(facts),
    copy.evidence(cleanNote(context.experienceExample)),
    copy.programFit(cleanNote(context.programName, 160) || "[target programme]", cleanNote(context.universityName, 160) || "[target university]", cleanNote(context.programEvidence)),
    copy.goals(cleanNote(context.careerGoals)),
  ].join("\n\n");
}

function quote(text: string, max = 180): string {
  const compact = cleanNote(text, max);
  return compact.length === max ? `${compact}…` : compact;
}

/**
 * Deterministic, text-grounded review for provider outages. It quotes only
 * spans extracted from the submitted essay and never supplies a fixed score or
 * fabricated replacement sentence.
 */
export function buildSopReviewFallback(
  locale: string,
  text: string,
  targetUniversity = "",
  targetMajor = ""
): string {
  const loc = localeOrEnglish(locale);
  const copy = REVIEW_COPY[loc];
  const targetName = cleanNote(targetUniversity || targetMajor, 160);
  const feedback: EssayFeedback = analyzeEssay(text, { type: "sop", targetName: targetName || undefined });
  const scoreLines = [
    `- ${copy.dimensions[0]}: ${feedback.scores.hook}/100`,
    `- ${copy.dimensions[1]}: ${feedback.scores.structure}/100`,
    `- ${copy.dimensions[2]}: ${feedback.scores.specificity}/100`,
    `- ${copy.dimensions[3]}: ${feedback.scores.language}/100`,
    `- ${copy.dimensions[4]}: ${feedback.scores.fit}/100`,
  ].join("\n");
  const issues = feedback.issues.slice(0, 5).map((issue) => {
    const message = copy.issues[issue.code] ?? copy.issues.too_short;
    const excerpt = issue.excerpt ? `\n  ${copy.quoteLabel}: “${quote(issue.excerpt)}”` : "";
    return `- **${issue.severity}:** ${message}${excerpt}`;
  });
  const noFindings = feedback.issues.length === 0 ? `- ${copy.noFindings}` : "";
  const nextEdit = feedback.issues[0]?.excerpt
    ? `- ${copy.nextEdit}: Review the quoted passage above. Keep its factual meaning; if a missing fact is needed, add a clearly verified detail yourself rather than substituting a guessed example.`
    : `- ${copy.nextEdit}: Check the prompt's official requirements, then revise the highest-priority finding without adding unverified facts.`;
  const targetLine = targetName ? `\n- Target supplied for context: ${targetName}` : "";

  return [
    `### ${copy.title}`,
    copy.rubricNote,
    `- ${copy.wordCount}: ${feedback.wordCount}${targetLine}`,
    `- **Writing-rubric total: ${feedback.scores.total}/100**`,
    scoreLines,
    "",
    `### ${copy.findings}`,
    ...issues,
    noFindings,
    "",
    `### ${copy.nextEdit}`,
    nextEdit,
    `- ${copy.finalNote}`,
  ].filter((line) => line !== "").join("\n");
}
