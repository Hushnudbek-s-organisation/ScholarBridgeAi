/**
 * GOLD-STANDARD SAMPLE LIBRARY ("Namunalar kutubxonasi") — Phase 7.
 *
 * Every authoring surface in the app (CV builder, SOP studio, essay rubric,
 * recommendation helpers, answer vault, activity portfolio, document vault,
 * visa speaking assistant, onboarding auto-fill) can show a real, international
 * standard exemplar and load it into the editor with one click.
 *
 * HARD RULES:
 *  1. These texts are STATIC CONTENT in a `src/lib` module. They are never
 *     written to a student's profile, essay version, document vault or
 *     application automatically. A sample reaches an editor only after the
 *     student presses "Load sample into editor", and the editor shows the
 *     academic-integrity banner ({@link SAMPLE_STRUCTURE_NOTE}) until the text
 *     is replaced.
 *  2. Nothing here is a fabricated claim about a real person, university or
 *     scholarship decision. Names, scores, employers and lab titles in the
 *     exemplars are illustrative examples — the parser/rubric treats them as
 *     text, and the UI says so.
 *  3. Every block carries a "why this works" note in uz / ru / en so the
 *     sample teaches structure and evidence density, not wording to copy.
 */

export type SampleLang = "en" | "uz" | "ru";
export type Localized = Record<SampleLang, string>;

export type SampleKind =
  | "onboarding"
  | "cv"
  | "sop"
  | "essay"
  | "scholarship"
  | "lor"
  | "email"
  | "document"
  | "visa"
  | "vault"
  | "portfolio";

export interface SampleBlock {
  /** Structural label the annotated view shows, e.g. "[1. Concrete hook]". */
  heading: Localized;
  /** Why admissions committees reward this block — in all three languages. */
  why: Localized;
  /** The exact paragraph of the exemplar that this block describes. */
  text: string;
}

export interface SampleExemplar {
  id: string;
  kind: SampleKind;
  title: Localized;
  /** One-line description for the picker. */
  summary: Localized;
  /** Suggested word limit / length note shown in the rubric studio. */
  wordCount: number;
  /** Verbatim text — what "Copy template" and "Load into editor" use. */
  text: string;
  /** The same text split into the blocks the annotated view explains. */
  blocks: SampleBlock[];
}

/**
 * MANDATORY academic-integrity banner. Shown whenever a sample is viewed or
 * loaded into an editor (Phase 7 §9.1) — the exemplar teaches structure and
 * evidence density; the words must become the student's own verified facts.
 */
export const SAMPLE_STRUCTURE_NOTE: Localized = {
  uz: "Ushbu namuna xalqaro akademik tuzilma va dalillarni qanday keltirishni ko‘rsatish uchun berilgan. Qabul komissiyasi uchun matnni o‘z shaxsiy tajribangiz, haqiqiy baholaringiz va maqsadlaringiz asosida qayta yozing.",
  en: "This exemplar illustrates structure, specificity, and evidence density. Always replace every detail with your own verified facts and voice before submitting.",
  ru: "Этот образец показывает структуру, конкретику и плотность доказательств. Перед подачей обязательно замените все детали своими подтверждёнными фактами и своим голосом.",
};

/** The four canonical SOP/essay blocks the annotated view labels. */
const WHY: Record<string, Localized> = {
  hook: {
    en: "A concrete, dated moment — not a childhood dream. Committees read thousands of “I have always been passionate about…” openings; a specific scene with a named place and consequence makes the reader ask what happened next.",
    uz: "Aniq va sanaga bog‘langan voqea — “bolalikdan orzu qilganman” emas. Komissiya minglab umumiy kirish so‘zlarini o‘qiydi; aniq joy va oqibat bilan boshlangan matn o‘quvchini davom ettirishga undaydi.",
    ru: "Конкретный момент с датой, а не «мечтал с детства». Комиссия читает тысячи общих вступлений; сцена с конкретным местом и последствием заставляет читать дальше.",
  },
  evidence: {
    en: "Quantified, verifiable proof of what YOU did: the method, the size of the sample/deployment, the measured result and the published output. Numbers plus named artefacts (papers, lab, hackathon) are what survive a quick read.",
    uz: "SIZ qilgan ishning miqyosli va tekshirsa bo‘ladigan isboti: usul, namuna hajmi, o‘lchangan natija va chop etilgan ish. Raqamlar va aniq nomlar (maqola, laboratoriya, hakaton) tez o‘qishda ham esda qoladi.",
    ru: "Измеримое и проверяемое доказательство того, что сделали ВЫ: метод, размер выборки, измеренный результат и публикация. Цифры и конкретные названия запоминаются даже при быстром чтении.",
  },
  fit: {
    en: "Programme-specific proof of fit: a named course, lab, professor or institute and the exact capability gap it closes for your goal. This is the paragraph that cannot be reused for another university.",
    uz: "Dasturga moslikning aniq isboti: aniq kurs, laboratoriya, professor yoki institut va bu sizning maqsadingiz uchun qanday yetishmovchilikni yopadi. Bu paragrafni boshqa universitetga o‘zgartirmasdan ishlatib bo‘lmaydi.",
    ru: "Доказательство соответствия программе: конкретный курс, лаборатория, профессор или институт и то, какой именно пробел в ваших навыках они закрывают. Этот абзац нельзя переиспользовать для другого вуза.",
  },
  impact: {
    en: "A named destination and role after graduation, tied to a real sector need in your country. It answers the reviewer's real question — “what does this applicant do with the degree?” — with a plan, not a promise.",
    uz: "Bitirgandan keyingi aniq joy va lavozim, mamlakatdagi real soha ehtiyoji bilan bog‘langan. Bu komissiyaning asosiy savoliga — “bu talaba diplomni nima qiladi?” — va’da emas, reja bilan javob beradi.",
    ru: "Конкретное место и роль после выпуска, привязанные к реальной потребности страны. Это отвечает на главный вопрос комиссии — «что этот абитуриент сделает с дипломом?» — планом, а не обещанием.",
  },
  quantified: {
    en: "Action verb + method + quantified result. “Engineered a PyTorch pipeline… 91.4% validation accuracy… 22% less water” is checkable; “was involved in a research project” is not.",
    uz: "Harakat fe’li + usul + o‘lchangan natija. “PyTorch quvurini yaratdim… 91,4% aniqlik… 22% kam suv” tekshiriladi; “ilmiy loyihada qatnashdim” esa tekshirilmaydi.",
    ru: "Глагол действия + метод + измеримый результат. «Разработал конвейер на PyTorch… точность 91,4%… на 22% меньше воды» проверяемо; «участвовал в проекте» — нет.",
  },
  agency: {
    en: "Agency over the letter's purpose: the request is specific about the programme, the deadline and the 1–2 things you need the recommender to speak to, and it makes saying yes easy.",
    uz: "Xatning maqsadi aniq: dastur, muddat va rahbardan aynan qaysi 1–2 jihatni yoritish kerakligi ko‘rsatilgan — shunda “ha” deyish oson bo‘ladi.",
    ru: "Ясная цель письма: программа, срок и 1–2 аспекта, о которых нужно написать рекомендателю, — это делает согласие простым.",
  },
  proof: {
    en: "Verifiable financial proof: who sponsors, the legal relationship, the annual amount, the liquid balance and the bank reference. Consular officers check documents against statements, so every figure here must match the attached papers.",
    uz: "Tekshiriladigan moliyaviy isbot: kim homiy, qonuniy qarindoshlik, yillik summa, likvid qoldiq va bank ma’lumotnomasi. Konsul hujjatlarni bayonot bilan solishtiradi — har bir raqam ilova qilingan qog‘ozga mos bo‘lishi shart.",
    ru: "Проверяемое финансовое подтверждение: кто спонсор, родство, годовая сумма, ликвидный остаток и банковская справка. Консул сверяет документы с заявлением — каждая цифра должна совпадать с приложением.",
  },
  visa: {
    en: "Every positive consular signal in one answer: the specific programme and its unique facility, the funding broken into award + sponsor + liquid savings, the concrete post-graduation role, and the ties that make returning the rational choice.",
    uz: "Bitta javobda konsul uchun barcha ijobiy signallar: aniq dastur va uning o‘ziga xos imkoni, moliyalashtirish (grant + homiy + likvid jamg‘arma), bitirgandan keyingi aniq lavozim va qaytishni mantiqiy qiladigan aloqalar.",
    ru: "Все положительные консульские сигналы в одном ответе: конкретная программа и её уникальная возможность, финансирование (стипендия + спонсор + ликвидные сбережения), конкретная должность после выпуска и связи, делающие возвращение логичным.",
  },
};

/** Helper: build a block with a localized heading and rationale. */
const block = (key: keyof typeof WHY, heading: Localized, text: string): SampleBlock => ({
  heading,
  why: WHY[key],
  text,
});

/* ==========================================================================
 * EXEMPLAR A — Onboarding / CV + test scores (10-second auto-fill source)
 * ======================================================================= */

export const SAMPLE_ONBOARDING_CV_IELTS: SampleExemplar = {
  id: "SAMPLE_ONBOARDING_CV_IELTS",
  kind: "onboarding",
  title: {
    en: "Student CV + IELTS + SAT summary (Uzbekistan)",
    uz: "Talaba CV + IELTS + SAT xulosasi (O‘zbekiston)",
    ru: "CV студента + IELTS + SAT (Узбекистан)",
  },
  summary: {
    en: "A realistic TUIT CV with IELTS 7.5, SAT 1510, GRE 326 and a 4.88/5.0 GPA — the fastest way to try the 10-second auto-fill.",
    uz: "TUIT talabasining real CV’si: IELTS 7.5, SAT 1510, GRE 326 va 4.88/5.0 GPA — 10 sekundlik avtoto‘ldirishni sinash uchun eng tez yo‘l.",
    ru: "Реалистичное CV студента TUIT: IELTS 7.5, SAT 1510, GRE 326 и GPA 4.88/5.0 — самый быстрый способ проверить автозаполнение.",
  },
  wordCount: 260,
  text: `AZIZBEK KARIMOV
Tashkent, Uzbekistan | azizbek.karimov@example.uz | +998 90 123 45 67 | github.com/azizbek-ai

EDUCATION
Tashkent University of Information Technologies (TUIT) — Tashkent, Uzbekistan
B.Sc. in Software Engineering (Expected Graduation: June 2026)
• Cumulative GPA: 4.88 / 5.0 scale (Equivalent to 3.90 / 4.00 US scale; Rank: Top 2% of 240 students)
• Key Coursework: Machine Learning, Distributed Systems, Algorithms & Data Structures, Linear Algebra

STANDARDIZED TEST SCORES
• IELTS Academic: Overall 7.5 (Listening 8.5, Reading 8.0, Writing 7.0, Speaking 7.0) — Test Date: Oct 2025
• SAT: 1510 / 1600 (Math: 790, Evidence-Based Reading & Writing: 720)
• GRE General: 326 (Quantitative: 168, Verbal: 158, Analytical Writing: 4.5)

RESEARCH & PUBLICATIONS
Undergraduate Research Assistant — Smart Irrigation & Climate Lab, TUIT (Sep 2024 – Present)
• Engineered a lightweight computer-vision pipeline using PyTorch and Sentinel-2 satellite imagery to detect cotton-field soil salinity across the Fergana Valley with 91.4% validation accuracy.
• Co-authored 2 peer-reviewed conference papers (IEEE ICISCT 2025) on low-power edge IoT sensors for drip irrigation, reducing water waste by 22% across 3 pilot farms in Qashqadaryo.

LEADERSHIP & EXTRACURRICULAR ACTIVITIES
Founder & Lead Mentor — "CodeForRegions" Youth STEM Initiative (Jan 2024 – Present, 360 hours)
• Recruited 18 university volunteers and trained 420 public high-school students in Qarshi and Namangan in Python and algorithmic problem-solving; 14 mentees won regional Informatics Olympiad medals.
Team Captain — ICPC Central Asia Regional Contest (2024 – 2025)
• Led a 3-person competitive programming team to 4th place nationally among 85 university teams.

HONORS & AWARDS
• Winner, Ministry of Digital Technologies Scholarship for IT Talent (2025)
• Silver Medalist, Republican Olympiad in Informatics (2023)
• 1st Place, AgroTech Uzbekistan National Hackathon — $3,000 R&D Grant (2024)`,
  blocks: [
    block(
      "quantified",
      { en: "Header & contact block", uz: "Sarlavha va aloqa bloki", ru: "Шапка и контакты" },
      `AZIZBEK KARIMOV
Tashkent, Uzbekistan | azizbek.karimov@example.uz | +998 90 123 45 67 | github.com/azizbek-ai`
    ),
    block(
      "quantified",
      { en: "Education: GPA with the exact scale", uz: "Ta’lim: aniq shkaladagi GPA", ru: "Образование: GPA с точной шкалой" },
      `EDUCATION
Tashkent University of Information Technologies (TUIT) — Tashkent, Uzbekistan
B.Sc. in Software Engineering (Expected Graduation: June 2026)
• Cumulative GPA: 4.88 / 5.0 scale (Equivalent to 3.90 / 4.00 US scale; Rank: Top 2% of 240 students)
• Key Coursework: Machine Learning, Distributed Systems, Algorithms & Data Structures, Linear Algebra`
    ),
    block(
      "quantified",
      { en: "Test scores with subscores and dates", uz: "Bo‘lim ballari va sana bilan test natijalari", ru: "Баллы тестов с суббаллами и датами" },
      `STANDARDIZED TEST SCORES
• IELTS Academic: Overall 7.5 (Listening 8.5, Reading 8.0, Writing 7.0, Speaking 7.0) — Test Date: Oct 2025
• SAT: 1510 / 1600 (Math: 790, Evidence-Based Reading & Writing: 720)
• GRE General: 326 (Quantitative: 168, Verbal: 158, Analytical Writing: 4.5)`
    ),
    block(
      "evidence",
      { en: "Research: method + measured result + output", uz: "Tadqiqot: usul + o‘lchangan natija + mahsulot", ru: "Исследование: метод + результат + публикация" },
      `RESEARCH & PUBLICATIONS
Undergraduate Research Assistant — Smart Irrigation & Climate Lab, TUIT (Sep 2024 – Present)
• Engineered a lightweight computer-vision pipeline using PyTorch and Sentinel-2 satellite imagery to detect cotton-field soil salinity across the Fergana Valley with 91.4% validation accuracy.
• Co-authored 2 peer-reviewed conference papers (IEEE ICISCT 2025) on low-power edge IoT sensors for drip irrigation, reducing water waste by 22% across 3 pilot farms in Qashqadaryo.`
    ),
    block(
      "quantified",
      { en: "Leadership with reach and outcomes", uz: "Yetakchilik: qamrov va natija bilan", ru: "Лидерство с охватом и результатом" },
      `LEADERSHIP & EXTRACURRICULAR ACTIVITIES
Founder & Lead Mentor — "CodeForRegions" Youth STEM Initiative (Jan 2024 – Present, 360 hours)
• Recruited 18 university volunteers and trained 420 public high-school students in Qarshi and Namangan in Python and algorithmic problem-solving; 14 mentees won regional Informatics Olympiad medals.
Team Captain — ICPC Central Asia Regional Contest (2024 – 2025)
• Led a 3-person competitive programming team to 4th place nationally among 85 university teams.`
    ),
    block(
      "evidence",
      { en: "Honors: named, dated, funded", uz: "Mukofotlar: nomi, sanasi, summasi bilan", ru: "Награды: с названием, датой и суммой" },
      `HONORS & AWARDS
• Winner, Ministry of Digital Technologies Scholarship for IT Talent (2025)
• Silver Medalist, Republican Olympiad in Informatics (2023)
• 1st Place, AgroTech Uzbekistan National Hackathon — $3,000 R&D Grant (2024)`
    ),
  ],
};

/* ==========================================================================
 * EXEMPLAR B — Master's SOP (AI / Computer Vision)
 * ======================================================================= */

export const SAMPLE_SOP_MASTERS_AI: SampleExemplar = {
  id: "SAMPLE_SOP_MASTERS_AI",
  kind: "sop",
  title: {
    en: "Master's Statement of Purpose — M.Sc. Informatics (AI & Robotics)",
    uz: "Magistratura uchun Statement of Purpose — Informatika (AI va robototexnika)",
    ru: "Statement of Purpose в магистратуру — информатика (AI и робототехника)",
  },
  summary: {
    en: "Five structured paragraphs (hook → foundation → research → programme fit → impact) scoring 92+/100 on the deterministic rubric.",
    uz: "Besh tuzilgan paragraf (hook → asos → tadqiqot → dasturga moslik → ta’sir) deterministik rubrikada 92+/100 ball oladi.",
    ru: "Пять структурных абзацев (зацепка → база → исследование → соответствие программе → влияние) — 92+/100 по детерминированной рубрике.",
  },
  wordCount: 565,
  text: `In the summer of 2023, severe water scarcity in Uzbekistan's Qashqadaryo region forced smallholder farmers in my district to abandon nearly a third of their late-season crops. Walking alongside regional hydrologists, I noticed that the crisis was driven not only by climate volatility, but by a data blind spot: irrigation gates were opened on fixed calendar schedules rather than real-time soil evapotranspiration rates. That observation reshaped my trajectory as a software engineer. Rather than building consumer web applications, I committed my undergraduate research to a concrete question: how can resource-constrained machine learning systems optimize agricultural water allocation across Central Asia's arid river basins?

At the Tashkent University of Information Technologies (TUIT), I built the mathematical and systems foundation required to tackle this problem, maintaining a 4.88/5.00 GPA (top 2% of my cohort) across Advanced Algorithms, Linear Algebra, and Distributed Computing. In September 2024, I joined TUIT's Smart Irrigation & Climate Lab under Dr. Rustam Alimov. Over fourteen months, I designed and deployed a hybrid sensing pipeline combining multispectral Sentinel-2 satellite imagery with low-cost LoRaWAN soil probes across three pilot farms totaling 180 hectares. By quantizing a convolutional segmentation network in PyTorch to run on edge microcontrollers, we predicted root-zone moisture deficits 48 hours in advance with 91.4% accuracy and reduced seasonal water usage by 22%. This work produced two co-authored papers presented at IEEE ICISCT 2025 and earned first place at the AgroTech Uzbekistan National Hackathon.

While our pilot succeeded on uniform cotton plots, scaling predictive hydrology to heterogeneous mountain-fed watersheds exposed a critical limitation in my current toolkit: standard deep-learning models degrade rapidly under sparse ground-truth labels and shifting seasonal distributions. Overcoming this bottleneck requires rigorous graduate training in probabilistic machine learning, physics-informed neural networks, and scalable computer vision—precisely the strengths of the M.Sc. in Informatics at the Technical University of Munich (TUM).

TUM is my first-choice institution because its curriculum bridges theoretical machine intelligence with real-world environmental deployment. I am particularly eager to take Advanced Deep Learning for Physics and Earth Observation for Environmental Monitoring. Furthermore, the research conducted at the Munich Institute of Robotics and Machine Intelligence (MIRMI) and Prof. Xiaoxiang Zhu's Data Science in Earth Observation lab directly addresses multi-modal sensor fusion under label scarcity. Contributing to TUM's ongoing projects on high-resolution satellite time-series analysis will allow me to extend my LoRaWAN ground-sensor dataset into a generalizable domain-adaptation framework.

Beyond the laboratory, I have consistently translated technical knowledge into community capacity. In 2024, I founded CodeForRegions, recruiting 18 university volunteers to teach Python and algorithmic modeling to 420 rural high-school students in Qarshi and Namangan, fourteen of whom subsequently medaled in the Republican Informatics Olympiad. At TUM, I look forward to bringing this collaborative energy to the TUM.ai student initiative.

Upon completing my Master's degree at TUM, I will return to Uzbekistan to join the Digital Agriculture & Water Resources Center in Tashkent as a Lead Machine Learning Architect. My five-year goal is to integrate satellite-driven irrigation scheduling into the national water-management grid across the Amu Darya and Syr Darya basins, helping thousands of Central Asian farmers adapt to climate change with measurable precision.`,
  blocks: [
    block(
      "hook",
      { en: "1. Concrete hook", uz: "1. Aniq kirish (hook)", ru: "1. Конкретная зацепка" },
      `In the summer of 2023, severe water scarcity in Uzbekistan's Qashqadaryo region forced smallholder farmers in my district to abandon nearly a third of their late-season crops. Walking alongside regional hydrologists, I noticed that the crisis was driven not only by climate volatility, but by a data blind spot: irrigation gates were opened on fixed calendar schedules rather than real-time soil evapotranspiration rates. That observation reshaped my trajectory as a software engineer. Rather than building consumer web applications, I committed my undergraduate research to a concrete question: how can resource-constrained machine learning systems optimize agricultural water allocation across Central Asia's arid river basins?`
    ),
    block(
      "evidence",
      { en: "2. Quantified academic & research evidence", uz: "2. Miqyosli akademik va ilmiy dalillar", ru: "2. Измеримые академические и научные доказательства" },
      `At the Tashkent University of Information Technologies (TUIT), I built the mathematical and systems foundation required to tackle this problem, maintaining a 4.88/5.00 GPA (top 2% of my cohort) across Advanced Algorithms, Linear Algebra, and Distributed Computing. In September 2024, I joined TUIT's Smart Irrigation & Climate Lab under Dr. Rustam Alimov. Over fourteen months, I designed and deployed a hybrid sensing pipeline combining multispectral Sentinel-2 satellite imagery with low-cost LoRaWAN soil probes across three pilot farms totaling 180 hectares. By quantizing a convolutional segmentation network in PyTorch to run on edge microcontrollers, we predicted root-zone moisture deficits 48 hours in advance with 91.4% accuracy and reduced seasonal water usage by 22%. This work produced two co-authored papers presented at IEEE ICISCT 2025 and earned first place at the AgroTech Uzbekistan National Hackathon.`
    ),
    block(
      "evidence",
      { en: "3. The gap the degree closes", uz: "3. Dastur yopadigan bo‘shliq", ru: "3. Пробел, который закрывает программа" },
      `While our pilot succeeded on uniform cotton plots, scaling predictive hydrology to heterogeneous mountain-fed watersheds exposed a critical limitation in my current toolkit: standard deep-learning models degrade rapidly under sparse ground-truth labels and shifting seasonal distributions. Overcoming this bottleneck requires rigorous graduate training in probabilistic machine learning, physics-informed neural networks, and scalable computer vision—precisely the strengths of the M.Sc. in Informatics at the Technical University of Munich (TUM).`
    ),
    block(
      "fit",
      { en: "4. Programme & faculty fit", uz: "4. Dastur va professorlarga moslik", ru: "4. Соответствие программе и преподавателям" },
      `TUM is my first-choice institution because its curriculum bridges theoretical machine intelligence with real-world environmental deployment. I am particularly eager to take Advanced Deep Learning for Physics and Earth Observation for Environmental Monitoring. Furthermore, the research conducted at the Munich Institute of Robotics and Machine Intelligence (MIRMI) and Prof. Xiaoxiang Zhu's Data Science in Earth Observation lab directly addresses multi-modal sensor fusion under label scarcity. Contributing to TUM's ongoing projects on high-resolution satellite time-series analysis will allow me to extend my LoRaWAN ground-sensor dataset into a generalizable domain-adaptation framework.`
    ),
    block(
      "quantified",
      { en: "5. Community leadership", uz: "5. Jamiyatdagi yetakchilik", ru: "5. Лидерство в сообществе" },
      `Beyond the laboratory, I have consistently translated technical knowledge into community capacity. In 2024, I founded CodeForRegions, recruiting 18 university volunteers to teach Python and algorithmic modeling to 420 rural high-school students in Qarshi and Namangan, fourteen of whom subsequently medaled in the Republican Informatics Olympiad. At TUM, I look forward to bringing this collaborative energy to the TUM.ai student initiative.`
    ),
    block(
      "impact",
      { en: "6. Post-study impact at home", uz: "6. Vatanga qaytib ta’sir qilish", ru: "6. Влияние после выпуска дома" },
      `Upon completing my Master's degree at TUM, I will return to Uzbekistan to join the Digital Agriculture & Water Resources Center in Tashkent as a Lead Machine Learning Architect. My five-year goal is to integrate satellite-driven irrigation scheduling into the national water-management grid across the Amu Darya and Syr Darya basins, helping thousands of Central Asian farmers adapt to climate change with measurable precision.`
    ),
  ],
};

/** Field values the SOP studio's drafter pre-fills when this sample is loaded. */
export const SAMPLE_SOP_MASTERS_AI_FIELDS = {
  targetUni: "Technical University of Munich (TUM)",
  targetProgram: "M.Sc. in Informatics (Artificial Intelligence & Robotics)",
  personalHook:
    "Growing up in Qashqadaryo, where summer droughts reduced cotton yields by 30%, I saw firsthand how outdated flood-irrigation schedules wasted scarce Amu Darya water reserves.",
  experienceExample:
    "As an Undergraduate Research Assistant at TUIT, I engineered a PyTorch satellite-imagery model and LoRaWAN soil-moisture sensor network deployed across 3 farms, cutting water consumption by 22% over two growing seasons and resulting in two IEEE ICISCT papers.",
  programEvidence:
    "TUM's Computer Vision Group led by Prof. Daniel Cremers and the Munich Institute of Robotics and Machine Intelligence (MIRMI) offer the exact coursework in Statistical Learning and Earth Observation needed to scale edge-AI models under strict hardware constraints.",
  careerGoals:
    "Upon graduating, I will return to Uzbekistan to lead the AI & Precision Agriculture division at the Ministry of Agriculture's Digital Innovation Center, deploying open-source drought-forecasting systems across Central Asia.",
};

/* ==========================================================================
 * EXEMPLAR C — Flagship scholarship motivation & return-impact essay
 * (El-yurt umidi / Chevening / GKS / Stipendium Hungaricum)
 * ======================================================================= */

export const SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING: SampleExemplar = {
  id: "SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING",
  kind: "scholarship",
  title: {
    en: "Scholarship motivation essay — energy systems (El-yurt umidi style)",
    uz: "Stipendiya motivatsiya inshosi — energiya tizimlari (El-yurt umidi uslubi)",
    ru: "Мотивационное эссе на стипендию — энергетика (стиль El-yurt umidi)",
  },
  summary: {
    en: "The national-problem → personal evidence → programme → return-commitment arc that flagship scholarship panels reward.",
    uz: "Davlat muammosi → shaxsiy dalil → dastur → qaytish majburiyati ketma-ketligi — yetakchi stipendiya komissiyalari shuni qadrlaydi.",
    ru: "Связка «национальная проблема → личные доказательства → программа → обязательство вернуться», которую ценят стипендиальные комиссии.",
  },
  wordCount: 470,
  text: `Uzbekistan's renewable energy transition aims to generate 25 gigawatts of solar and wind power by 2030, yet integrating intermittent solar generation into our aging regional transmission grid already causes voltage instability during peak summer demand. As a junior power-systems engineer at the National Electric Grid of Uzbekistan, I have spent the past two years analyzing substation load imbalances across the Bukhara and Navoi solar corridors. This experience convinced me that achieving energy security requires more than importing photovoltaic panels—it demands local engineers trained in AI-driven grid forecasting and high-voltage storage integration.

During my tenure at the Regional Dispatch Center (2024–2026), I spearheaded the digitization of 42 substation telemetry logs, replacing manual spreadsheet reporting with an automated Python anomaly-detection dashboard. Within six months, our team reduced transformer overload response times by 34% and prevented three major feeder outages serving 65,000 residents. However, when we attempted to model sub-hourly solar irradiance drops caused by desert dust storms, our legacy load-flow software lacked the stochastic modeling capabilities used by European transmission operators.

Pursuing the M.Sc. in Sustainable Energy Systems will equip me with advanced expertise in Smart Grid Control, Power Electronics, and Battery Energy Storage Optimization. Specifically, working within the Smart Energy Systems Laboratory will enable me to simulate dust-induced photovoltaic ramp rates using real meteorological datasets from Uzbekistan's Kyzylkum desert.

My commitment to public service is anchored in concrete action. Alongside my engineering role, I co-organized the Women & Youth in Clean Tech mentorship workshop in Tashkent, training 150 polytechnic students in solar microgrid sizing for rural clinics. As a scholarship recipient, I will serve as an active bridge between Central Asian utilities and European clean-energy researchers.

Immediately upon graduation, I will fulfill my return commitment by rejoining the Ministry of Energy of the Republic of Uzbekistan to lead the National Renewable Dispatch Modernization Taskforce. Within three years of returning, I plan to implement an automated 15-minute solar-wind forecasting protocol across all fourteen regional dispatch centers and establish a joint curriculum module at Tashkent State Technical University, ensuring that the knowledge gained through this scholarship multiplies across Uzbekistan's next generation of energy engineers.`,
  blocks: [
    block(
      "hook",
      { en: "1. The national problem, with numbers", uz: "1. Davlat muammosi raqamlar bilan", ru: "1. Национальная проблема с цифрами" },
      `Uzbekistan's renewable energy transition aims to generate 25 gigawatts of solar and wind power by 2030, yet integrating intermittent solar generation into our aging regional transmission grid already causes voltage instability during peak summer demand. As a junior power-systems engineer at the National Electric Grid of Uzbekistan, I have spent the past two years analyzing substation load imbalances across the Bukhara and Navoi solar corridors. This experience convinced me that achieving energy security requires more than importing photovoltaic panels—it demands local engineers trained in AI-driven grid forecasting and high-voltage storage integration.`
    ),
    block(
      "evidence",
      { en: "2. What you already delivered", uz: "2. Siz allaqachon qilgan ish", ru: "2. Что вы уже сделали" },
      `During my tenure at the Regional Dispatch Center (2024–2026), I spearheaded the digitization of 42 substation telemetry logs, replacing manual spreadsheet reporting with an automated Python anomaly-detection dashboard. Within six months, our team reduced transformer overload response times by 34% and prevented three major feeder outages serving 65,000 residents. However, when we attempted to model sub-hourly solar irradiance drops caused by desert dust storms, our legacy load-flow software lacked the stochastic modeling capabilities used by European transmission operators.`
    ),
    block(
      "fit",
      { en: "3. The exact programme capability you need", uz: "3. Aynan kerak bo‘lgan dastur imkoniyati", ru: "3. Конкретная возможность программы" },
      `Pursuing the M.Sc. in Sustainable Energy Systems will equip me with advanced expertise in Smart Grid Control, Power Electronics, and Battery Energy Storage Optimization. Specifically, working within the Smart Energy Systems Laboratory will enable me to simulate dust-induced photovoltaic ramp rates using real meteorological datasets from Uzbekistan's Kyzylkum desert.`
    ),
    block(
      "quantified",
      { en: "4. Service beyond your job", uz: "4. Ishdan tashqari xizmat", ru: "4. Служение вне работы" },
      `My commitment to public service is anchored in concrete action. Alongside my engineering role, I co-organized the Women & Youth in Clean Tech mentorship workshop in Tashkent, training 150 polytechnic students in solar microgrid sizing for rural clinics. As a scholarship recipient, I will serve as an active bridge between Central Asian utilities and European clean-energy researchers.`
    ),
    block(
      "impact",
      { en: "5. The return commitment, dated and measurable", uz: "5. Qaytish majburiyati: sana va o‘lchov bilan", ru: "5. Обязательство вернуться: дата и измеримость" },
      `Immediately upon graduation, I will fulfill my return commitment by rejoining the Ministry of Energy of the Republic of Uzbekistan to lead the National Renewable Dispatch Modernization Taskforce. Within three years of returning, I plan to implement an automated 15-minute solar-wind forecasting protocol across all fourteen regional dispatch centers and establish a joint curriculum module at Tashkent State Technical University, ensuring that the knowledge gained through this scholarship multiplies across Uzbekistan's next generation of energy engineers.`
    ),
  ],
};

/* ==========================================================================
 * EXEMPLAR D — "Why this university & programme" supplemental essay
 * ======================================================================= */

export const SAMPLE_WHY_US_ESSAY: SampleExemplar = {
  id: "SAMPLE_WHY_US_ESSAY",
  kind: "essay",
  title: {
    en: "\"Why this university & programme\" — KAIST CS & Economics",
    uz: "\"Nega aynan shu universitet va dastur\" — KAIST CS va iqtisodiyot",
    ru: "«Почему именно этот университет и программа» — KAIST CS и экономика",
  },
  summary: {
    en: "A 170-word supplemental that names a problem, two courses, one programme structure and one student community — no generic praise.",
    uz: "170 so‘zlik qo‘shimcha insho: bitta muammo, ikkita kurs, bitta dastur tuzilmasi va bitta talaba hamjamiyati — umumiy maqtov yo‘q.",
    ru: "Дополнительное эссе на 170 слов: проблема, два курса, структура программы и студенческое сообщество — без общих похвал.",
  },
  wordCount: 172,
  text: `My decision to apply to the B.Sc. in Computer Science and Economics at KAIST stems from a specific technical challenge I encountered while building a micro-lending credit-scoring prototype for rural artisans in Fergana: algorithms optimized purely for predictive accuracy inadvertently penalized seasonal agricultural borrowers who lacked formal bank histories. Solving financial inclusion in emerging markets requires uniting algorithmic design with microeconomic mechanism design—the exact intersection KAIST pioneers.

First, KAIST's Undergraduate Research Participation (URP) program offers immediate access to faculty laboratories during the sophomore year. I am eager to apply to the Data Science & Artificial Intelligence Lab to study interpretable machine learning for asymmetric financial markets. Second, courses such as Algorithmic Game Theory (CS492) and Econometrics of FinTech will give me the formal tools to model borrower incentives alongside neural network fairness constraints. Finally, joining ICISTS-KAIST, Asia's largest student-run technology and policy conference, will allow me to collaborate with peers across the Asia-Pacific on digital public infrastructure. KAIST is not merely a place to study code; it is the ideal ecosystem to engineer equitable economic systems for Central Asia.`,
  blocks: [
    block(
      "hook",
      { en: "1. One concrete problem you already worked on", uz: "1. Siz ishlagan bitta aniq muammo", ru: "1. Одна конкретная проблема, с которой вы работали" },
      `My decision to apply to the B.Sc. in Computer Science and Economics at KAIST stems from a specific technical challenge I encountered while building a micro-lending credit-scoring prototype for rural artisans in Fergana: algorithms optimized purely for predictive accuracy inadvertently penalized seasonal agricultural borrowers who lacked formal bank histories. Solving financial inclusion in emerging markets requires uniting algorithmic design with microeconomic mechanism design—the exact intersection KAIST pioneers.`
    ),
    block(
      "fit",
      { en: "2. Three named, checkable opportunities", uz: "2. Uchta aniq, tekshirsa bo‘ladigan imkoniyat", ru: "2. Три конкретные проверяемые возможности" },
      `First, KAIST's Undergraduate Research Participation (URP) program offers immediate access to faculty laboratories during the sophomore year. I am eager to apply to the Data Science & Artificial Intelligence Lab to study interpretable machine learning for asymmetric financial markets. Second, courses such as Algorithmic Game Theory (CS492) and Econometrics of FinTech will give me the formal tools to model borrower incentives alongside neural network fairness constraints. Finally, joining ICISTS-KAIST, Asia's largest student-run technology and policy conference, will allow me to collaborate with peers across the Asia-Pacific on digital public infrastructure. KAIST is not merely a place to study code; it is the ideal ecosystem to engineer equitable economic systems for Central Asia.`
    ),
  ],
};

/* ==========================================================================
 * EXEMPLAR E — Recommendation letter request email + academic LOR
 * ======================================================================= */

export const SAMPLE_LOR_REQUEST_EMAIL: SampleExemplar = {
  id: "SAMPLE_LOR_REQUEST_EMAIL",
  kind: "email",
  title: {
    en: "Email asking a professor for a recommendation letter",
    uz: "Professordan tavsiyanoma so‘rash xati",
    ru: "Письмо профессору с просьбой о рекомендации",
  },
  summary: {
    en: "Short, specific, deadline-dated and attached to a one-page brief — the email that gets a yes without a reminder.",
    uz: "Qisqa, aniq, muddati ko‘rsatilgan va bir varaqli brif bilan — eslatmasiz “ha” oladigan xat.",
    ru: "Коротко, конкретно, со сроком и одностраничным брифом — письмо, на которое соглашаются без напоминаний.",
  },
  wordCount: 220,
  text: `Subject: Recommendation Letter Request — [Your Full Name] (Application for [Degree & Programme], Deadline: [Date])

Dear Professor [Last Name],

I hope this email finds you well. I am writing to ask whether you would feel comfortable writing a strong letter of recommendation in support of my applications for the [M.Sc. / B.Sc.] in [Target Major] for the Fall 2027 intake (earliest deadline: [Deadline Date]).

Having taken your courses in [Course 1] and [Course 2] (where I earned [Grade/Score] and completed my project on [Project Title]), I learned a great deal from your mentorship—particularly regarding [specific methodology or research skill].

To make the process as convenient as possible, I have attached a one-page Recommendation Brief below containing:
1. My updated CV and official transcript (GPA: [Your GPA]/[Scale], IELTS: [Score]);
2. A summary of our research/coursework project on [Project Title] and its quantitative results;
3. The list of universities, submission links, and deadlines.

If you are willing to support my application, I would be deeply grateful if the letter could briefly highlight [1–2 focus areas, e.g., my independent problem-solving during the lab project and my readiness for graduate-level research]. Please let me know if we could meet briefly during your office hours this week to discuss my study plans.

Thank you very much for your time, guidance, and support.

Warm regards,
[Your Full Name]
[Your Phone / Telegram]`,
  blocks: [
    block(
      "agency",
      { en: "Subject line: name, programme, deadline", uz: "Mavzu: ism, dastur, muddat", ru: "Тема: имя, программа, срок" },
      `Subject: Recommendation Letter Request — [Your Full Name] (Application for [Degree & Programme], Deadline: [Date])`
    ),
    block(
      "agency",
      { en: "The ask, in one sentence", uz: "So‘rov — bitta jumlada", ru: "Просьба в одном предложении" },
      `Dear Professor [Last Name],

I hope this email finds you well. I am writing to ask whether you would feel comfortable writing a strong letter of recommendation in support of my applications for the [M.Sc. / B.Sc.] in [Target Major] for the Fall 2027 intake (earliest deadline: [Deadline Date]).

Having taken your courses in [Course 1] and [Course 2] (where I earned [Grade/Score] and completed my project on [Project Title]), I learned a great deal from your mentorship—particularly regarding [specific methodology or research skill].`
    ),
    block(
      "agency",
      { en: "Make saying yes easy: the brief", uz: "Rozilikni oson qilish: brif", ru: "Облегчите согласие: бриф" },
      `To make the process as convenient as possible, I have attached a one-page Recommendation Brief below containing:
1. My updated CV and official transcript (GPA: [Your GPA]/[Scale], IELTS: [Score]);
2. A summary of our research/coursework project on [Project Title] and its quantitative results;
3. The list of universities, submission links, and deadlines.

If you are willing to support my application, I would be deeply grateful if the letter could briefly highlight [1–2 focus areas, e.g., my independent problem-solving during the lab project and my readiness for graduate-level research]. Please let me know if we could meet briefly during your office hours this week to discuss my study plans.`
    ),
  ],
};

export const SAMPLE_LOR_PROFESSOR_ACADEMIC: SampleExemplar = {
  id: "SAMPLE_LOR_PROFESSOR_ACADEMIC",
  kind: "lor",
  title: {
    en: "Academic recommendation letter (professor, full text)",
    uz: "Akademik tavsiyanoma (professor, to‘liq matn)",
    ru: "Академическая рекомендация (профессор, полный текст)",
  },
  summary: {
    en: "The structure a strong letter follows: relationship → ranked comparison → specific intervention → quantified outcome → leadership → unreserved recommendation.",
    uz: "Kuchli tavsiyanoma tuzilmasi: aloqa → reyting bilan taqqoslash → aniq harakat → miqyosli natija → yetakchilik → so‘zsiz tavsiya.",
    ru: "Структура сильной рекомендации: знакомство → сравнение с другими → конкретный поступок → измеримый результат → лидерство → безоговорочная рекомендация.",
  },
  wordCount: 420,
  text: `[OFFICIAL UNIVERSITY LETTERHEAD]
Department of Computer Science & Software Engineering
Tashkent University of Information Technologies (TUIT)

Date: October 14, 2026

To the Graduate Admissions and Scholarship Committee,

I am writing to give my highest academic recommendation for Mr. Azizbek Karimov, who is applying to your Master of Science program in Computer Science. As Professor of Artificial Intelligence and Director of the Smart Irrigation & Climate Lab at TUIT, I have known Azizbek for over two years—first as the top-performing student in my upper-division Machine Learning and Distributed Systems courses, and subsequently as my Undergraduate Research Assistant since September 2024. Among the more than 600 undergraduate students I have taught over the past decade, Azizbek ranks firmly in the top 1% in both mathematical maturity and independent research execution.

In my Machine Learning seminar (Fall 2024, 65 students), Azizbek earned the highest overall grade in the cohort (98/100). While most students chose standard benchmark datasets for their term projects, Azizbek formulated an original research question addressing soil salinity detection in Uzbekistan's Fergana Valley using Sentinel-2 multispectral imagery. When he discovered that cloud cover corrupted 30% of the optical frames, he independently read recent literature on Synthetic Aperture Radar (SAR) data fusion, implemented a cross-modal alignment script in PyTorch, and improved classification F1-score from 0.78 to 0.91. His final presentation was so rigorous that I invited him to join my research laboratory the following week.

In the laboratory, Azizbek quickly became the technical anchor of our 6-member field sensing team. He designed the edge-inference pipeline that compressed our neural network by 4x so it could execute on low-power microcontrollers deployed across three farms in Qashqadaryo. When field gateways experienced packet loss during summer heatwaves, Azizbek wrote a custom store-and-forward buffer protocol in C++ and Python that achieved 99.6% data recovery. His contributions directly enabled two peer-reviewed papers accepted at IEEE ICISCT 2025, on which he earned second authorship—an exceptional distinction for an undergraduate at our university.

Beyond his technical depth, Azizbek possesses rare leadership generosity. He regularly mentored junior bachelor students in our lab on Git workflows and reproducible experiment tracking, and outside the university he founded "CodeForRegions," training over 400 rural high-school students in algorithmic programming. He communicates complex mathematical ideas in fluent, precise English (IELTS 7.5) and responds to peer review with humility and intellectual curiosity.

In summary, Azizbek Karimov already operates at the level of a seasoned Master's researcher. I recommend him enthusiastically and without reservation for admission and full merit scholarship consideration. Please feel free to contact me at r.alimov@tuit.uz should you require any additional information.

Sincerely,

Prof. Dr. Rustam Alimov
Head of Smart Irrigation & Climate Lab, Professor of Computer Science
Tashkent University of Information Technologies (TUIT)
Tashkent, Uzbekistan | r.alimov@tuit.uz | +998 71 238 64 00`,
  blocks: [
    block(
      "quantified",
      { en: "1. Who the writer is and how they rank you", uz: "1. Muallif kim va sizni qanday baholaydi", ru: "1. Кто автор и как он вас оценивает" },
      `[OFFICIAL UNIVERSITY LETTERHEAD]
Department of Computer Science & Software Engineering
Tashkent University of Information Technologies (TUIT)

Date: October 14, 2026

To the Graduate Admissions and Scholarship Committee,

I am writing to give my highest academic recommendation for Mr. Azizbek Karimov, who is applying to your Master of Science program in Computer Science. As Professor of Artificial Intelligence and Director of the Smart Irrigation & Climate Lab at TUIT, I have known Azizbek for over two years—first as the top-performing student in my upper-division Machine Learning and Distributed Systems courses, and subsequently as my Undergraduate Research Assistant since September 2024. Among the more than 600 undergraduate students I have taught over the past decade, Azizbek ranks firmly in the top 1% in both mathematical maturity and independent research execution.`
    ),
    block(
      "evidence",
      { en: "2. A specific intervention, not adjectives", uz: "2. Umumiy so‘z emas, aniq harakat", ru: "2. Конкретный поступок, а не прилагательные" },
      `In my Machine Learning seminar (Fall 2024, 65 students), Azizbek earned the highest overall grade in the cohort (98/100). While most students chose standard benchmark datasets for their term projects, Azizbek formulated an original research question addressing soil salinity detection in Uzbekistan's Fergana Valley using Sentinel-2 multispectral imagery. When he discovered that cloud cover corrupted 30% of the optical frames, he independently read recent literature on Synthetic Aperture Radar (SAR) data fusion, implemented a cross-modal alignment script in PyTorch, and improved classification F1-score from 0.78 to 0.91. His final presentation was so rigorous that I invited him to join my research laboratory the following week.`
    ),
    block(
      "evidence",
      { en: "3. Role in a team, with measured output", uz: "3. Jamoadagi rol, o‘lchangan natija bilan", ru: "3. Роль в команде с измеримым результатом" },
      `In the laboratory, Azizbek quickly became the technical anchor of our 6-member field sensing team. He designed the edge-inference pipeline that compressed our neural network by 4x so it could execute on low-power microcontrollers deployed across three farms in Qashqadaryo. When field gateways experienced packet loss during summer heatwaves, Azizbek wrote a custom store-and-forward buffer protocol in C++ and Python that achieved 99.6% data recovery. His contributions directly enabled two peer-reviewed papers accepted at IEEE ICISCT 2025, on which he earned second authorship—an exceptional distinction for an undergraduate at our university.`
    ),
    block(
      "quantified",
      { en: "4. Character and communication", uz: "4. Xarakter va muloqot", ru: "4. Характер и коммуникация" },
      `Beyond his technical depth, Azizbek possesses rare leadership generosity. He regularly mentored junior bachelor students in our lab on Git workflows and reproducible experiment tracking, and outside the university he founded "CodeForRegions," training over 400 rural high-school students in algorithmic programming. He communicates complex mathematical ideas in fluent, precise English (IELTS 7.5) and responds to peer review with humility and intellectual curiosity.`
    ),
    block(
      "agency",
      { en: "5. An unreserved verdict + contact details", uz: "5. So‘zsiz xulosa + aloqa ma’lumotlari", ru: "5. Безоговорочный вывод + контакты" },
      `In summary, Azizbek Karimov already operates at the level of a seasoned Master's researcher. I recommend him enthusiastically and without reservation for admission and full merit scholarship consideration. Please feel free to contact me at r.alimov@tuit.uz should you require any additional information.

Sincerely,

Prof. Dr. Rustam Alimov
Head of Smart Irrigation & Climate Lab, Professor of Computer Science
Tashkent University of Information Technologies (TUIT)
Tashkent, Uzbekistan | r.alimov@tuit.uz | +998 71 238 64 00`
    ),
  ],
};

/* ==========================================================================
 * EXEMPLAR F — Prospective supervisor cold email
 * ======================================================================= */

export const SAMPLE_PROFESSOR_COLD_EMAIL: SampleExemplar = {
  id: "SAMPLE_PROFESSOR_COLD_EMAIL",
  kind: "email",
  title: {
    en: "Cold email to a prospective research supervisor",
    uz: "Bo‘lajak ilmiy rahbarga sovuq xat (cold email)",
    ru: "Холодное письмо потенциальному научному руководителю",
  },
  summary: {
    en: "Six short paragraphs: who you are, the exact paper you read, the related problem you already worked on, and one focused research question.",
    uz: "Olti qisqa paragraf: siz kimsiz, qaysi maqolani o‘qidingiz, qanday o‘xshash muammo bilan ishlagansiz va bitta aniq tadqiqot savoli.",
    ru: "Шесть коротких абзацев: кто вы, какую статью прочли, с какой близкой проблемой работали и один сфокусированный исследовательский вопрос.",
  },
  wordCount: 250,
  text: `Subject: Prospective [M.Sc./PhD] Applicant (Fall 2027) — Extending [Lab Name]'s work on [Specific Topic]

Dear Professor [Last Name],

I am a final-year B.Sc. student in Software Engineering at Tashkent University of Information Technologies (GPA: 4.88/5.00, top 2%; GRE: 326; IELTS: 7.5), writing to inquire whether you will be recruiting graduate students for the Fall 2027 cohort in the [Lab Name] at [University Name].

I recently read your 2025 paper, "[Exact Paper Title]," and was particularly struck by your approach to [specific method/finding, e.g., domain-invariant representation learning for sparse environmental sensors]. In my undergraduate research at TUIT, I encountered a closely related challenge while deploying a quantized PyTorch + Sentinel-2 soil-moisture model across 180 hectares of farmland in Uzbekistan (published at IEEE ICISCT 2025). Specifically, our model's accuracy dropped when transferring from cotton fields to orchard microclimates.

For my graduate research, I hope to investigate how your group's [Method Name] framework can be combined with physics-informed priors to enable zero-shot calibration across arid agricultural basins.

I have attached my 1-page academic CV and transcript for your review. If you anticipate openings in your group for Fall 2027, I would be honored to submit a formal application naming you as my prospective supervisor and would welcome any guidance on whether my background aligns with your current projects.

Thank you very much for your time and consideration.

Sincerely,
Azizbek Karimov
B.Sc. Candidate, Tashkent University of Information Technologies
Portfolio & Papers: github.com/azizbek-ai`,
  blocks: [
    block(
      "fit",
      { en: "Subject: specific, not \"Hello Professor\"", uz: "Mavzu: aniq, “Salom professor” emas", ru: "Тема: конкретная, а не «Здравствуйте, профессор»" },
      `Subject: Prospective [M.Sc./PhD] Applicant (Fall 2027) — Extending [Lab Name]'s work on [Specific Topic]`
    ),
    block(
      "agency",
      { en: "Who you are in one line", uz: "Siz kimsiz — bir satrda", ru: "Кто вы — одной строкой" },
      `Dear Professor [Last Name],

I am a final-year B.Sc. student in Software Engineering at Tashkent University of Information Technologies (GPA: 4.88/5.00, top 2%; GRE: 326; IELTS: 7.5), writing to inquire whether you will be recruiting graduate students for the Fall 2027 cohort in the [Lab Name] at [University Name].`
    ),
    block(
      "evidence",
      { en: "Read the paper: name it and the idea you took from it", uz: "Maqolani o‘qing: nomini va undan olgan fikrni yozing", ru: "Прочтите статью: назовите её и идею, которую взяли" },
      `I recently read your 2025 paper, "[Exact Paper Title]," and was particularly struck by your approach to [specific method/finding, e.g., domain-invariant representation learning for sparse environmental sensors]. In my undergraduate research at TUIT, I encountered a closely related challenge while deploying a quantized PyTorch + Sentinel-2 soil-moisture model across 180 hectares of farmland in Uzbekistan (published at IEEE ICISCT 2025). Specifically, our model's accuracy dropped when transferring from cotton fields to orchard microclimates.`
    ),
    block(
      "fit",
      { en: "One focused research question + a clear ask", uz: "Bitta aniq tadqiqot savoli + aniq so‘rov", ru: "Один сфокусированный вопрос + ясная просьба" },
      `For my graduate research, I hope to investigate how your group's [Method Name] framework can be combined with physics-informed priors to enable zero-shot calibration across arid agricultural basins.

I have attached my 1-page academic CV and transcript for your review. If you anticipate openings in your group for Fall 2027, I would be honored to submit a formal application naming you as my prospective supervisor and would welcome any guidance on whether my background aligns with your current projects.`
    ),
  ],
};

/* ==========================================================================
 * EXEMPLAR G — Affidavit of financial support (Homiylik xati)
 * ======================================================================= */

export const SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI: SampleExemplar = {
  id: "SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI",
  kind: "document",
  title: {
    en: "Affidavit of financial support (Homiylik xati / moliyaviy kafolat)",
    uz: "Moliyaviy kafolat xati (Homiylik xati)",
    ru: "Заявление о финансовой поддержке (Homiylik xati)",
  },
  summary: {
    en: "The sponsorship letter embassies and universities expect: relationship, annual commitment, verifiable income and liquid savings, with bank references.",
    uz: "Elchixona va universitetlar kutadigan homiylik xati: qarindoshlik, yillik majburiyat, tasdiqlanadigan daromad va likvid jamg‘arma, bank ma’lumotnomasi bilan.",
    ru: "Письмо спонсора, которого ждут посольства и вузы: родство, годовое обязательство, подтверждаемый доход и ликвидные сбережения со ссылками на банк.",
  },
  wordCount: 330,
  text: `AFFIDAVIT OF FINANCIAL SUPPORT (HOMIYLIK XATI / MOLIYAVIY KAFOLAT XATI)

Date: [Date, e.g., October 14, 2026]
City: Tashkent, Republic of Uzbekistan

To: The Admissions Office of [University Name] and the Consular Section of the Embassy of [Country] in Tashkent

I, the undersigned, [Sponsor Full Name as in Passport] (Passport No: [FA1234567], born on [DD.MM.YYYY]), residing at [Full Address in Uzbekistan], hereby solemnly affirm and guarantee that I am the [Father / Mother / Legal Sponsor] of the applicant:

• Student Full Name: [Student Full Name as in Passport]
• Student Date of Birth & Passport No: [DD.MM.YYYY] | [Passport No]
• Admitted Programme & University: [Degree & Major] at [University Name], [Country]
• Academic Duration: [Start Month/Year] – [End Month/Year]

1. FINANCIAL COMMITMENT:
I unconditionally guarantee that I will cover all educational and living expenses for my [son/daughter] throughout the entire duration of their studies in [Country], up to $[Annual Amount, e.g., 24,000 USD] per academic year (including tuition fees, accommodation, health insurance, living expenses, and round-trip airfare) to the extent not covered by university merit scholarships.

2. SOURCE OF FUNDS & VERIFIABLE INCOME:
My financial capacity is supported by the following official, verifiable sources (original certificates attached):
• Current Employment / Business Ownership: [Position, e.g., Chief Financial Officer / Founder] at [Company Name LLC], Tashkent (Official 12-month tax & salary certificate attached: Annual Net Income of $[Amount] USD equivalent).
• Liquid Bank Savings: $[Liquid Balance, e.g., 38,500 USD] held in a demand deposit account at [Bank Name, e.g., National Bank of Uzbekistan / Kapitalbank], Account No. [XXXX], confirmed by Official Bank Reference No. [Ref] dated [Date].

I confirm that these funds are immediately available for international wire transfer toward university tuition deposits and student living expenses without affecting our family's domestic obligations in Uzbekistan.

Sponsor Signature: ___________________________
Full Name: [Sponsor Full Name]
Phone / Email: [+998 XX XXX XX XX] | [Sponsor Email]
(Attach Notarized English Translation & Official Bank Statement)`,
  blocks: [
    block(
      "proof",
      { en: "1. Identification: who is making the promise", uz: "1. Shaxsni tasdiqlash: kim kafolat beradi", ru: "1. Идентификация: кто даёт гарантию" },
      `AFFIDAVIT OF FINANCIAL SUPPORT (HOMIYLIK XATI / MOLIYAVIY KAFOLAT XATI)

Date: [Date, e.g., October 14, 2026]
City: Tashkent, Republic of Uzbekistan

To: The Admissions Office of [University Name] and the Consular Section of the Embassy of [Country] in Tashkent

I, the undersigned, [Sponsor Full Name as in Passport] (Passport No: [FA1234567], born on [DD.MM.YYYY]), residing at [Full Address in Uzbekistan], hereby solemnly affirm and guarantee that I am the [Father / Mother / Legal Sponsor] of the applicant:

• Student Full Name: [Student Full Name as in Passport]
• Student Date of Birth & Passport No: [DD.MM.YYYY] | [Passport No]
• Admitted Programme & University: [Degree & Major] at [University Name], [Country]
• Academic Duration: [Start Month/Year] – [End Month/Year]`
    ),
    block(
      "proof",
      { en: "2. The exact annual commitment", uz: "2. Aniq yillik majburiyat", ru: "2. Точное годовое обязательство" },
      `1. FINANCIAL COMMITMENT:
I unconditionally guarantee that I will cover all educational and living expenses for my [son/daughter] throughout the entire duration of their studies in [Country], up to $[Annual Amount, e.g., 24,000 USD] per academic year (including tuition fees, accommodation, health insurance, living expenses, and round-trip airfare) to the extent not covered by university merit scholarships.`
    ),
    block(
      "proof",
      { en: "3. Verifiable sources with document references", uz: "3. Hujjatlarga bog‘langan tekshiriladigan manbalar", ru: "3. Проверяемые источники со ссылками на документы" },
      `2. SOURCE OF FUNDS & VERIFIABLE INCOME:
My financial capacity is supported by the following official, verifiable sources (original certificates attached):
• Current Employment / Business Ownership: [Position, e.g., Chief Financial Officer / Founder] at [Company Name LLC], Tashkent (Official 12-month tax & salary certificate attached: Annual Net Income of $[Amount] USD equivalent).
• Liquid Bank Savings: $[Liquid Balance, e.g., 38,500 USD] held in a demand deposit account at [Bank Name, e.g., National Bank of Uzbekistan / Kapitalbank], Account No. [XXXX], confirmed by Official Bank Reference No. [Ref] dated [Date].

I confirm that these funds are immediately available for international wire transfer toward university tuition deposits and student living expenses without affecting our family's domestic obligations in Uzbekistan.

Sponsor Signature: ___________________________
Full Name: [Sponsor Full Name]
Phone / Email: [+998 XX XXX XX XX] | [Sponsor Email]
(Attach Notarized English Translation & Official Bank Statement)`
    ),
  ],
};

/* ==========================================================================
 * EXEMPLAR H — Gold-standard visa interview answers (4 country tracks)
 * ======================================================================= */

export const SAMPLE_VISA_QA_USA_F1: SampleExemplar = {
  id: "SAMPLE_VISA_QA_USA_F1",
  kind: "visa",
  title: {
    en: "USA F-1 interview answers (5 turns, 95+/100)",
    uz: "AQSh F-1 intervyu javoblari (5 savol, 95+/100)",
    ru: "Ответы на интервью США F-1 (5 вопросов, 95+/100)",
  },
  summary: {
    en: "Programme choice, itemised funding, application record, post-graduation role and return ties — the five questions Tashkent applicants actually get.",
    uz: "Dastur tanlovi, moddama-modda moliyalashtirish, arizalar tarixi, bitirgandan keyingi lavozim va qaytish aloqalari — Toshkentdagi arizachilarga beriladigan beshta savol.",
    ru: "Выбор программы, финансирование по пунктам, история заявок, роль после выпуска и связи с родиной — пять вопросов, которые реально задают в Ташкенте.",
  },
  wordCount: 330,
  text: `Q: Why did you choose this specific university and programme instead of studying in Uzbekistan?
A: I chose the B.Sc. in Computer Science at Arizona State University because of its specialization in Cyber-Physical Systems and Prof. Lee's Embedded IoT Laboratory. While TUIT in Tashkent offers strong general software courses, ASU's curriculum includes hands-on semiconductor and edge-sensor labs like CSE 434 and CSE 468, which are not yet available in Uzbekistan and directly match my AgroTech water-monitoring research.

Q: How will you pay for your tuition and living expenses during your studies?
A: My total annual cost on my I-20 is $34,500. First, I have been awarded the New American University Merit Scholarship of $14,500 per year, leaving a net annual cost of $20,000. My father, who is the Operations Director at UzAuto Logistics in Tashkent with a verified annual net income of $46,000, is sponsoring the remaining $20,000 per year. We have $48,000 in liquid USD savings in Kapitalbank, which covers more than two full years of my net expenses upfront.

Q: Why did you apply to these universities and how many admitted you?
A: I applied to four universities with strong embedded-systems laboratories: Arizona State University, Purdue University, the University of South Florida, and TU Munich. I received admission offers from ASU, USF, and TU Munich, and selected ASU because its $14,500 annual merit scholarship and embedded IoT lab offered the strongest academic and financial fit.

Q: What are your concrete plans immediately after you graduate?
A: Immediately after completing my Bachelor's degree in May 2030, I will return to Tashkent, Uzbekistan to join the Ministry of Agriculture's Smart Water & AgroTech Center as a Lead IoT Systems Engineer. Uzbekistan is investing $1.2 billion in modernizing drip-irrigation telemetry across the Fergana and Qashqadaryo basins, and there is an acute shortage of engineers trained in US edge-sensor standards.

Q: What ties bind you to return to Uzbekistan after your studies?
A: Beyond my career track in Uzbekistan's national water-digitization program, my entire immediate family, our family home, and our agricultural supply business are in Tashkent and Qarshi. I have also signed a formal return-employment letter of intent with AgroTech Solutions LLC in Tashkent, which has reserved a Senior Systems Engineer position for me upon graduation.`,
  blocks: [
    block(
      "fit",
      { en: "Q1. Programme choice: unique capability, not climate", uz: "1-savol. Dastur tanlovi: o‘ziga xos imkoniyat", ru: "Вопрос 1. Выбор программы: уникальная возможность" },
      `Q: Why did you choose this specific university and programme instead of studying in Uzbekistan?
A: I chose the B.Sc. in Computer Science at Arizona State University because of its specialization in Cyber-Physical Systems and Prof. Lee's Embedded IoT Laboratory. While TUIT in Tashkent offers strong general software courses, ASU's curriculum includes hands-on semiconductor and edge-sensor labs like CSE 434 and CSE 468, which are not yet available in Uzbekistan and directly match my AgroTech water-monitoring research.`
    ),
    block(
      "visa",
      { en: "Q2. Funding: award + sponsor + liquid savings", uz: "2-savol. Moliyalashtirish: grant + homiy + likvid jamg‘arma", ru: "Вопрос 2. Финансирование: стипендия + спонсор + сбережения" },
      `Q: How will you pay for your tuition and living expenses during your studies?
A: My total annual cost on my I-20 is $34,500. First, I have been awarded the New American University Merit Scholarship of $14,500 per year, leaving a net annual cost of $20,000. My father, who is the Operations Director at UzAuto Logistics in Tashkent with a verified annual net income of $46,000, is sponsoring the remaining $20,000 per year. We have $48,000 in liquid USD savings in Kapitalbank, which covers more than two full years of my net expenses upfront.`
    ),
    block(
      "evidence",
      { en: "Q3. Application record, consistent with the offers", uz: "3-savol. Arizalar tarixi takliflarga mos", ru: "Вопрос 3. История заявок, согласованная с офферами" },
      `Q: Why did you apply to these universities and how many admitted you?
A: I applied to four universities with strong embedded-systems laboratories: Arizona State University, Purdue University, the University of South Florida, and TU Munich. I received admission offers from ASU, USF, and TU Munich, and selected ASU because its $14,500 annual merit scholarship and embedded IoT lab offered the strongest academic and financial fit.`
    ),
    block(
      "impact",
      { en: "Q4. Post-graduation plan: named employer, named sector need", uz: "4-savol. Bitirish rejasi: aniq ish joyi va soha ehtiyoji", ru: "Вопрос 4. План после выпуска: конкретный работодатель и потребность" },
      `Q: What are your concrete plans immediately after you graduate?
A: Immediately after completing my Bachelor's degree in May 2030, I will return to Tashkent, Uzbekistan to join the Ministry of Agriculture's Smart Water & AgroTech Center as a Lead IoT Systems Engineer. Uzbekistan is investing $1.2 billion in modernizing drip-irrigation telemetry across the Fergana and Qashqadaryo basins, and there is an acute shortage of engineers trained in US edge-sensor standards.`
    ),
    block(
      "visa",
      { en: "Q5. Ties: family, property, business, signed offer", uz: "5-savol. Aloqalar: oila, mulk, biznes, imzolangan taklif", ru: "Вопрос 5. Связи: семья, имущество, бизнес, подписанный оффер" },
      `Q: What ties bind you to return to Uzbekistan after your studies?
A: Beyond my career track in Uzbekistan's national water-digitization program, my entire immediate family, our family home, and our agricultural supply business are in Tashkent and Qarshi. I have also signed a formal return-employment letter of intent with AgroTech Solutions LLC in Tashkent, which has reserved a Senior Systems Engineer position for me upon graduation.`
    ),
  ],
};

export const SAMPLE_VISA_QA_GERMANY: SampleExemplar = {
  id: "SAMPLE_VISA_QA_GERMANY",
  kind: "visa",
  title: {
    en: "Germany student visa answers (Sperrkonto track)",
    uz: "Germaniya talaba vizasi javoblari (Sperrkonto yo‘nalishi)",
    ru: "Ответы для визы Германии (Sperrkonto)",
  },
  summary: {
    en: "Purpose, blocked account, admission status and return plan for a national student visa interview at the German Embassy in Tashkent.",
    uz: "Toshkentdagi Germaniya elchixonasida milliy talaba vizasi suhbatida maqsad, bloklangan hisob, qabul holati va qaytish rejasi.",
    ru: "Цель, блокированный счёт, статус зачисления и план возвращения на интервью в посольстве Германии в Ташкенте.",
  },
  wordCount: 250,
  text: `Q: What is the purpose of your stay in Germany?
A: I am admitted to the M.Sc. in Sustainable Energy Systems at the Technical University of Munich for the winter semester 2027/28. My stay is limited to the two-year programme, and I have already registered my planned graduation date of September 2029 in my study plan.

Q: How is your stay financed?
A: My blocked account (Sperrkonto) at Expatrio holds the full statutory annual amount required for 2027/28, and I have the confirmation letter. In addition, my mother has an official 12-month salary certificate from UzAuto Motors in Asaka, and the university has confirmed a partial merit waiver. I am not planning to rely on employment income in Germany to cover tuition or living costs.

Q: Which university did you apply to and why this programme?
A: I applied to TUM and RWTH Aachen, and I was admitted to TUM. TUM's Smart Energy Systems Laboratory allows me to model dust-induced photovoltaic ramp rates using meteorological data from the Kyzylkum desert — the exact problem I documented as a dispatch engineer at Uzbekistan's Regional Dispatch Center.

Q: What are your plans after graduation?
A: I will return to Uzbekistan to rejoin the Ministry of Energy, which has confirmed in writing that a Deputy Head position in the National Renewable Dispatch Modernization Taskforce is available for me. Germany's knowledge transfer in grid automation is exactly what the Uzbek solar program is missing.`,
  blocks: [
    block(
      "visa",
      { en: "Q1. Purpose and end date", uz: "1-savol. Maqsad va tugash sanasi", ru: "Вопрос 1. Цель и дата окончания" },
      `Q: What is the purpose of your stay in Germany?
A: I am admitted to the M.Sc. in Sustainable Energy Systems at the Technical University of Munich for the winter semester 2027/28. My stay is limited to the two-year programme, and I have already registered my planned graduation date of September 2029 in my study plan.`
    ),
    block(
      "proof",
      { en: "Q2. Sperrkonto + sponsor documents, in one answer", uz: "2-savol. Sperrkonto va homiy hujjatlari bitta javobda", ru: "Вопрос 2. Sperrkonto и документы спонсора в одном ответе" },
      `Q: How is your stay financed?
A: My blocked account (Sperrkonto) at Expatrio holds the full statutory annual amount required for 2027/28, and I have the confirmation letter. In addition, my mother has an official 12-month salary certificate from UzAuto Motors in Asaka, and the university has confirmed a partial merit waiver. I am not planning to rely on employment income in Germany to cover tuition or living costs.`
    ),
    block(
      "fit",
      { en: "Q3. Applications and programme fit", uz: "3-savol. Arizalar va dasturga moslik", ru: "Вопрос 3. Заявки и соответствие программе" },
      `Q: Which university did you apply to and why this programme?
A: I applied to TUM and RWTH Aachen, and I was admitted to TUM. TUM's Smart Energy Systems Laboratory allows me to model dust-induced photovoltaic ramp rates using meteorological data from the Kyzylkum desert — the exact problem I documented as a dispatch engineer at Uzbekistan's Regional Dispatch Center.`
    ),
    block(
      "impact",
      { en: "Q4. Return plan with a written offer", uz: "4-savol. Yozma taklif bilan qaytish rejasi", ru: "Вопрос 4. План возвращения с письменным предложением" },
      `Q: What are your plans after graduation?
A: I will return to Uzbekistan to rejoin the Ministry of Energy, which has confirmed in writing that a Deputy Head position in the National Renewable Dispatch Modernization Taskforce is available for me. Germany's knowledge transfer in grid automation is exactly what the Uzbek solar program is missing.`
    ),
  ],
};

export const SAMPLE_VISA_QA_KOREA_D2: SampleExemplar = {
  id: "SAMPLE_VISA_QA_KOREA_D2",
  kind: "visa",
  title: {
    en: "South Korea D-2 answers (KVAC Tashkent track)",
    uz: "Janubiy Koreya D-2 javoblari (Toshkent KVAC yo‘nalishi)",
    ru: "Ответы на визу D-2 Южной Кореи (KVAC Ташкент)",
  },
  summary: {
    en: "Certificate of admission, apostilled documents, bank balance history and study plan — the KVAC checklist in spoken form.",
    uz: "Qabul sertifikati, apostil qilingan hujjatlar, bank balansi tarixi va o‘qish rejasi — KVAC ro‘yxati og‘zaki shaklda.",
    ru: "Сертификат о зачислении, документы с апостилем, история банковского баланса и учебный план — чек-лист KVAC в устной форме.",
  },
  wordCount: 220,
  text: `Q: Why do you want to study in Korea?
A: I have a Certificate of Admission from KAIST for the M.Sc. in Artificial Intelligence. My undergraduate thesis at TUIT applied transformer models to low-resource Uzbek speech recognition, and KAIST's speech and language processing group publishes exactly the multilingual modelling work my thesis depends on. Korean semiconductor and AI research infrastructure is not available in Uzbekistan today.

Q: Can you confirm your financial documents?
A: Yes. My sponsor is my father, an agricultural equipment distributor in Samarkand. The Certificate of Bank Balance from Kapitalbank covers the tuition for two semesters plus living costs, with a 6-month transaction history attached, and my birth certificate and his business registration are apostilled.

Q: What did you do to prepare for study in Korea?
A: I have completed an online Korean language course to TOPIK level 2 and I can read basic academic Korean. I also attended the 2026 KAIST information session in Tashkent and have written confirmation that my lab supervisor will support my Korean language study in the first year.

Q: Will you return to Uzbekistan?
A: Yes. I have a conditional employment offer from Uzcard in Tashkent for a machine learning engineer role starting after graduation, focused on Uzbek-language voice interfaces for bank services.`,
  blocks: [
    block(
      "fit",
      { en: "Q1. Why Korea, why this programme", uz: "1-savol. Nega Koreya, nega bu dastur", ru: "Вопрос 1. Почему Корея и почему эта программа" },
      `Q: Why do you want to study in Korea?
A: I have a Certificate of Admission from KAIST for the M.Sc. in Artificial Intelligence. My undergraduate thesis at TUIT applied transformer models to low-resource Uzbek speech recognition, and KAIST's speech and language processing group publishes exactly the multilingual modelling work my thesis depends on. Korean semiconductor and AI research infrastructure is not available in Uzbekistan today.`
    ),
    block(
      "proof",
      { en: "Q2. Financial documents: balance + 6-month history + apostilles", uz: "2-savol. Moliyaviy hujjatlar: balans + 6 oylik tarix + apostil", ru: "Вопрос 2. Финансовые документы: баланс + история за 6 месяцев + апостиль" },
      `Q: Can you confirm your financial documents?
A: Yes. My sponsor is my father, an agricultural equipment distributor in Samarkand. The Certificate of Bank Balance from Kapitalbank covers the tuition for two semesters plus living costs, with a 6-month transaction history attached, and my birth certificate and his business registration are apostilled.`
    ),
    block(
      "evidence",
      { en: "Q3. Preparation: language + named supervisor", uz: "3-savol. Tayyorgarlik: til va aniq rahbar", ru: "Вопрос 3. Подготовка: язык и конкретный руководитель" },
      `Q: What did you do to prepare for study in Korea?
A: I have completed an online Korean language course to TOPIK level 2 and I can read basic academic Korean. I also attended the 2026 KAIST information session in Tashkent and have written confirmation that my lab supervisor will support my Korean language study in the first year.`
    ),
    block(
      "impact",
      { en: "Q4. Return: a named local employer and product", uz: "4-savol. Qaytish: aniq ish beruvchi va mahsulot", ru: "Вопрос 4. Возвращение: конкретный работодатель и продукт" },
      `Q: Will you return to Uzbekistan?
A: Yes. I have a conditional employment offer from Uzcard in Tashkent for a machine learning engineer role starting after graduation, focused on Uzbek-language voice interfaces for bank services.`
    ),
  ],
};

export const SAMPLE_VISA_QA_UK: SampleExemplar = {
  id: "SAMPLE_VISA_QA_UK",
  kind: "visa",
  title: {
    en: "UK Student Route answers (TLScontact Tashkent track)",
    uz: "Buyuk Britaniya Student Route javoblari (Toshkent TLScontact)",
    ru: "Ответы для UK Student Route (TLScontact Ташкент)",
  },
  summary: {
    en: "CAS, 28-day maintenance funds, TB certificate and a return plan — the four points a credibility interview tests.",
    uz: "CAS, 28 kunlik hisob mablag‘i, TB sertifikati va qaytish rejasi — kredibilitet suhbatida tekshiriladigan to‘rt nuqta.",
    ru: "CAS, средства за 28 дней, справка о туберкулёзе и план возвращения — четыре пункта интервью на достоверность.",
  },
  wordCount: 220,
  text: `Q: What will you study in the UK and for how long?
A: I will study the 12-month M.Sc. in Data Science at the University of Edinburgh, starting September 2027 and finishing in August 2028. My CAS number is confirmed and my course is full-time, on-campus.

Q: How are you funding your studies?
A: My CAS shows total tuition of £32,000 and an estimated £12,000 living cost. My Chevening scholarship application covers the full tuition and stipend; independently, my father holds the required maintenance funds in a Narodny Bank demand account, and the bank statement shows the balance held continuously for the 28 consecutive days required, dated within the last 31 days.

Q: Have you arranged your health checks for the UK?
A: Yes. I completed the pre-entry tuberculosis screening at the IOM-approved clinic in Tashkent, and my TB certificate is valid for the start of my course. My IHS payment reference is in my application.

Q: What will you do after completing the course?
A: I will return to Uzbekistan and take the Senior Data Analyst position that IT Park Tashkent has offered in my employment reference letter, working on national digital statistics. The UK's data-science training is the specific expertise that role requires.`,
  blocks: [
    block(
      "visa",
      { en: "Q1. Course, dates and CAS", uz: "1-savol. Kurs, sanalar va CAS", ru: "Вопрос 1. Курс, даты и CAS" },
      `Q: What will you study in the UK and for how long?
A: I will study the 12-month M.Sc. in Data Science at the University of Edinburgh, starting September 2027 and finishing in August 2028. My CAS number is confirmed and my course is full-time, on-campus.`
    ),
    block(
      "proof",
      { en: "Q2. The 28-day maintenance rule, stated precisely", uz: "2-savol. 28 kunlik mablag‘ qoidasi aniq qilib", ru: "Вопрос 2. Правило 28 дней сформулировано точно" },
      `Q: How are you funding your studies?
A: My CAS shows total tuition of £32,000 and an estimated £12,000 living cost. My Chevening scholarship application covers the full tuition and stipend; independently, my father holds the required maintenance funds in a Narodny Bank demand account, and the bank statement shows the balance held continuously for the 28 consecutive days required, dated within the last 31 days.`
    ),
    block(
      "proof",
      { en: "Q3. Health screening for the UK", uz: "3-savol. Buyuk Britaniya uchun tibbiy tekshiruv", ru: "Вопрос 3. Медицинское обследование для Великобритании" },
      `Q: Have you arranged your health checks for the UK?
A: Yes. I completed the pre-entry tuberculosis screening at the IOM-approved clinic in Tashkent, and my TB certificate is valid for the start of my course. My IHS payment reference is in my application.`
    ),
    block(
      "impact",
      { en: "Q4. Return with a written offer", uz: "4-savol. Yozma taklif bilan qaytish", ru: "Вопрос 4. Возвращение с письменным предложением" },
      `Q: What will you do after completing the course?
A: I will return to Uzbekistan and take the Senior Data Analyst position that IT Park Tashkent has offered in my employment reference letter, working on national digital statistics. The UK's data-science training is the specific expertise that role requires.`
    ),
  ],
};

/** The USA F-1 set is also the "gold standard" Q&A track referenced in the UI. */
export const SAMPLE_VISA_QA_GOLD = SAMPLE_VISA_QA_USA_F1;

/* ==========================================================================
 * CV exemplars (1-page academic CV for STEM; Europass-style CV for policy)
 * ======================================================================= */

export const SAMPLE_ACADEMIC_CV_STEM: SampleExemplar = {
  id: "SAMPLE_ACADEMIC_CV_STEM",
  kind: "cv",
  title: {
    en: "One-page academic CV (STEM, research-focused)",
    uz: "Bir varaqli akademik CV (STEM, tadqiqotga yo‘naltirilgan)",
    ru: "Академическое CV на одну страницу (STEM, исследовательский профиль)",
  },
  summary: {
    en: "How a graduate-school CV differs from a job CV: education, research, publications, presentations, skills — no photo, no marital status.",
    uz: "Magistratura CV’si ish CV’sidən farqi: ta’lim, tadqiqot, nashrlar, taqdimotlar, ko‘nikmalar — rasm va oilaviy holat yo‘q.",
    ru: "Чем CV для магистратуры отличается от резюме для работы: образование, исследования, публикации, выступления, навыки — без фото и семейного статуса.",
  },
  wordCount: 240,
  text: `AZIZBEK KARIMOV
Tashkent, Uzbekistan • azizbek.karimov@example.uz • +998 90 123 45 67 • github.com/azizbek-ai

EDUCATION
Tashkent University of Information Technologies (TUIT)
B.Sc. in Software Engineering, June 2026 (expected) | GPA 4.88/5.00 (top 2% of 240)
Relevant coursework: Machine Learning, Computer Vision, Distributed Systems, Probability & Statistics, Numerical Methods

RESEARCH EXPERIENCE
Undergraduate Research Assistant — Smart Irrigation & Climate Lab, TUIT | Sep 2024 – Present
• Engineered a quantized PyTorch segmentation pipeline on Sentinel-2 multispectral imagery; 91.4% validation accuracy for soil-salinity detection (Fergana Valley).
• Built a LoRaWAN soil-moisture network across 3 farms (180 ha) with a custom store-and-forward protocol reaching 99.6% data recovery.
• Quantified impact: 22% reduction in seasonal irrigation water use over two growing seasons.

PUBLICATIONS
• Karimov, A., Alimov, R. "Edge-inference sensor fusion for drip-irrigation scheduling." IEEE ICISCT 2025 (2 papers, second author).

PRESENTATIONS & AWARDS
• AgroTech Uzbekistan National Hackathon — 1st place, $3,000 R&D grant (2024).
• Republican Olympiad in Informatics — Silver medal (2023); Ministry of Digital Technologies IT Talent Scholarship (2025).

LEADERSHIP
Founder & Lead Mentor — CodeForRegions | Jan 2024 – Present
• Recruited 18 volunteers; trained 420 rural high-school students in Python and algorithms; 14 mentees medaled at regional olympiads.

TECHNICAL SKILLS
Python (PyTorch, NumPy), C++, SQL, Docker, Git, Linux, GIS (QGIS, rasterio), English IELTS 7.5, Uzbek (native), Russian (fluent).`,
  blocks: [
    block(
      "quantified",
      { en: "Education block: degree, date, GPA with scale", uz: "Ta’lim bloki: daraja, sana, shkalali GPA", ru: "Блок образования: степень, дата, GPA со шкалой" },
      `EDUCATION
Tashkent University of Information Technologies (TUIT)
B.Sc. in Software Engineering, June 2026 (expected) | GPA 4.88/5.00 (top 2% of 240)
Relevant coursework: Machine Learning, Computer Vision, Distributed Systems, Probability & Statistics, Numerical Methods`
    ),
    block(
      "evidence",
      { en: "Research: three quantified bullets", uz: "Tadqiqot: uchta miqyosli punkt", ru: "Исследование: три измеримых пункта" },
      `RESEARCH EXPERIENCE
Undergraduate Research Assistant — Smart Irrigation & Climate Lab, TUIT | Sep 2024 – Present
• Engineered a quantized PyTorch segmentation pipeline on Sentinel-2 multispectral imagery; 91.4% validation accuracy for soil-salinity detection (Fergana Valley).
• Built a LoRaWAN soil-moisture network across 3 farms (180 ha) with a custom store-and-forward protocol reaching 99.6% data recovery.
• Quantified impact: 22% reduction in seasonal irrigation water use over two growing seasons.`
    ),
    block(
      "fit",
      { en: "Skills line: tools a lab can verify", uz: "Ko‘nikmalar: laboratoriya tekshira oladigan vositalar", ru: "Навыки: инструменты, которые лаборатория может проверить" },
      `TECHNICAL SKILLS
Python (PyTorch, NumPy), C++, SQL, Docker, Git, Linux, GIS (QGIS, rasterio), English IELTS 7.5, Uzbek (native), Russian (fluent).`
    ),
  ],
};

export const SAMPLE_EUROPASS_CV_POLICY: SampleExemplar = {
  id: "SAMPLE_EUROPASS_CV_POLICY",
  kind: "cv",
  title: {
    en: "Europass-style CV (public policy / social science)",
    uz: "Europass uslubidagi CV (davlat siyosati / ijtimoiy fanlar)",
    ru: "CV в стиле Europass (государственная политика / соц. науки)",
  },
  summary: {
    en: "The DAAD / Erasmus format: personal information, education, work experience with responsibilities, language levels on the CEFR scale.",
    uz: "DAAD / Erasmus formati: shaxsiy ma’lumot, ta’lim, mas’uliyat bilan ish tajribasi, CEFR bo‘yicha til darajalari.",
    ru: "Формат DAAD / Erasmus: личные данные, образование, опыт работы с обязанностями, уровни языков по CEFR.",
  },
  wordCount: 250,
  text: `PERSONAL INFORMATION
Dilnoza Yusupova | Tashkent, Uzbekistan | dilnoza.yusupova@example.uz | +998 93 555 21 08
Date of birth: 14.03.2001 | Nationality: Uzbek

EDUCATION AND TRAINING
09/2019 – 06/2023 — B.A. in Public Administration, Westminster International University in Tashkent
• Final GPA 3.8/4.0; thesis: "Inter-agency data sharing barriers in Uzbekistan's social protection system" (grade A).
• Exchange semester at Riga Technical University (02/2022 – 06/2022), 30 ECTS in Public Finance.

WORK EXPERIENCE
07/2023 – Present — Policy Analyst (Junior), Agency for Strategic Reforms, Tashkent
• Drafted the analytical annex of three regulatory impact assessments; coordinated consultations with 11 regional administrations.
• Built a Power BI monitoring dashboard used weekly by the deputy director's office; reduced reporting preparation time from 6 hours to 40 minutes.
• Supported the negotiation of a €4.2 million EU technical-assistance grant (document preparation and data annexes).

11/2021 – 06/2023 — Research Assistant, Westminster International University in Tashkent
• Coded 1,240 household survey responses for a World Bank-funded study on informal employment; co-authored the descriptive statistics chapter.

LANGUAGE SKILLS
Uzbek — native | Russian — C2 | English — C1 | German — A2 (Goethe-Zertifikat A2, 2026)

DIGITAL SKILLS
Advanced Excel, Power BI, Stata (regression basics), NVivo, project coordination (Trello, Notion).

ADDITIONAL INFORMATION
Volunteer coordinator, "Open Budget" civic initiative (2022 – 2024): trained 60 students in budget literacy.`,
  blocks: [
    block(
      "fit",
      { en: "Europass header: personal information and nationality", uz: "Europass sarlavhasi: shaxsiy ma’lumot va fuqarolik", ru: "Шапка Europass: личные данные и гражданство" },
      `PERSONAL INFORMATION
Dilnoza Yusupova | Tashkent, Uzbekistan | dilnoza.yusupova@example.uz | +998 93 555 21 08
Date of birth: 14.03.2001 | Nationality: Uzbek`
    ),
    block(
      "evidence",
      { en: "Work experience: duties + measured result", uz: "Ish tajribasi: vazifalar + o‘lchangan natija", ru: "Опыт работы: обязанности + измеримый результат" },
      `WORK EXPERIENCE
07/2023 – Present — Policy Analyst (Junior), Agency for Strategic Reforms, Tashkent
• Drafted the analytical annex of three regulatory impact assessments; coordinated consultations with 11 regional administrations.
• Built a Power BI monitoring dashboard used weekly by the deputy director's office; reduced reporting preparation time from 6 hours to 40 minutes.
• Supported the negotiation of a €4.2 million EU technical-assistance grant (document preparation and data annexes).

11/2021 – 06/2023 — Research Assistant, Westminster International University in Tashkent
• Coded 1,240 household survey responses for a World Bank-funded study on informal employment; co-authored the descriptive statistics chapter.`
    ),
    block(
      "agency",
      { en: "Languages on the CEFR scale — no invented levels", uz: "Tillar CEFR shkalasida — o‘ylab topilgan daraja yo‘q", ru: "Языки по шкале CEFR — без выдуманных уровней" },
      `LANGUAGE SKILLS
Uzbek — native | Russian — C2 | English — C1 | German — A2 (Goethe-Zertifikat A2, 2026)`
    ),
  ],
};

/* ==========================================================================
 * Additional statement types
 * ======================================================================= */

export const SAMPLE_SOP_BACHELORS_CS: SampleExemplar = {
  id: "SAMPLE_SOP_BACHELORS_CS",
  kind: "sop",
  title: {
    en: "Bachelor's SOP (Computer Science, undergraduate admission)",
    uz: "Bakalavr uchun SOP (Kompyuter fanlari, bakalavriatga qabul)",
    ru: "SOP для бакалавриата (Computer Science)",
  },
  summary: {
    en: "For an 18-year-old with no publications: interest traced to a concrete project, academic preparation, and what you will do on campus.",
    uz: "Nashrlari yo‘q 18 yoshli abituriyent uchun: qiziqish aniq loyihaga bog‘langan, akademik tayyorgarlik va kampusda nima qilish rejasi.",
    ru: "Для абитуриента без публикаций: интерес к конкретному проекту, академическая подготовка и планы на кампусе.",
  },
  wordCount: 380,
  text: `When our school's water pump failed for the third time last spring, our physics teacher asked the class to calculate the cost of the repairs. I wrote a small Python script that pulled three years of repair invoices from the school's archive and showed that preventive maintenance would have cost 40% less. It was the first time I saw that code could change a decision, and I have been building for that purpose ever since.

At Academic Lyceum #2 in Tashkent I have taken every mathematics and physics elective available, with a cumulative grade of 4.9/5.0, and I completed the two-semester "Introduction to Programming with Python" course of the Uzbekistan Digital Skills Program, where I finished in the top 5 of 900 students. In 2025 I placed second in the regional stage of the Republican Informatics Olympiad with a dynamic-programming solution to a scheduling problem.

Outside class I lead the school's robotics club, where our team built an automated greenhouse watering controller with an Arduino and a soil-moisture sensor. The prototype failed twice: first because the sensor corroded in the damp soil, then because our threshold logic ignored temperature. Debugging those failures taught me more than any tutorial, and it convinced me that I want to study computer science as an engineering discipline, not just a programming skill.

I am applying to your Computer Science programme because its first-year sequence in discrete mathematics and computer systems, followed by the undergraduate research assistantship programme from the second year, matches how I learn: theory first, then a lab where the theory meets hardware. I am especially interested in the embedded-systems and operating-systems electives, because the greenhouse project showed me how much of the real difficulty lives close to the hardware.

At university I hope to join the competitive programming club and the student branch that organizes coding workshops for local schools — I have run three such workshops for 60 students in my district and I want to keep doing that work with better training behind me. In the long term, I want to return to Uzbekistan and build agricultural technology that small farms can actually afford.`,
  blocks: [
    block(
      "hook",
      { en: "1. Concrete hook from your own school", uz: "1. O‘z maktabingizdan aniq kirish", ru: "1. Конкретная зацепка из своей школы" },
      `When our school's water pump failed for the third time last spring, our physics teacher asked the class to calculate the cost of the repairs. I wrote a small Python script that pulled three years of repair invoices from the school's archive and showed that preventive maintenance would have cost 40% less. It was the first time I saw that code could change a decision, and I have been building for that purpose ever since.`
    ),
    block(
      "evidence",
      { en: "2. Academic preparation with grades and ranks", uz: "2. Akademik tayyorgarlik: baho va reyting bilan", ru: "2. Академическая подготовка с оценками и местами" },
      `At Academic Lyceum #2 in Tashkent I have taken every mathematics and physics elective available, with a cumulative grade of 4.9/5.0, and I completed the two-semester "Introduction to Programming with Python" course of the Uzbekistan Digital Skills Program, where I finished in the top 5 of 900 students. In 2025 I placed second in the regional stage of the Republican Informatics Olympiad with a dynamic-programming solution to a scheduling problem.`
    ),
    block(
      "evidence",
      { en: "3. A project, including its two failures", uz: "3. Loyiha, ikki muvaffaqiyatsizligi bilan", ru: "3. Проект, включая две неудачи" },
      `Outside class I lead the school's robotics club, where our team built an automated greenhouse watering controller with an Arduino and a soil-moisture sensor. The prototype failed twice: first because the sensor corroded in the damp soil, then because our threshold logic ignored temperature. Debugging those failures taught me more than any tutorial, and it convinced me that I want to study computer science as an engineering discipline, not just a programming skill.`
    ),
    block(
      "fit",
      { en: "4. The programme, named specifically", uz: "4. Dastur — aniq nomlangan", ru: "4. Программа — названа конкретно" },
      `I am applying to your Computer Science programme because its first-year sequence in discrete mathematics and computer systems, followed by the undergraduate research assistantship programme from the second year, matches how I learn: theory first, then a lab where the theory meets hardware. I am especially interested in the embedded-systems and operating-systems electives, because the greenhouse project showed me how much of the real difficulty lives close to the hardware.`
    ),
    block(
      "impact",
      { en: "5. Campus contribution + long-term goal", uz: "5. Kampusga hissa + uzoq muddatli maqsad", ru: "5. Вклад в кампус + долгосрочная цель" },
      `At university I hope to join the competitive programming club and the student branch that organizes coding workshops for local schools — I have run three such workshops for 60 students in my district and I want to keep doing that work with better training behind me. In the long term, I want to return to Uzbekistan and build agricultural technology that small farms can actually afford.`
    ),
  ],
};

export const SAMPLE_PERSONAL_STATEMENT: SampleExemplar = {
  id: "SAMPLE_PERSONAL_STATEMENT",
  kind: "essay",
  title: {
    en: "Personal statement (obstacle → response → what changed)",
    uz: "Shaxsiy bayonot (to‘siq → javob → nima o‘zgardi)",
    ru: "Личное заявление (препятствие → реакция → что изменилось)",
  },
  summary: {
    en: "A personal-history essay that stays concrete: one obstacle, three actions, one measurable outcome — and no self-pity.",
    uz: "Aniq qoladigan shaxsiy insho: bitta to‘siq, uchta harakat, bitta o‘lchanadigan natija — va o‘ziga achinish yo‘q.",
    ru: "Эссе о личной истории, остающееся конкретным: одно препятствие, три действия, один измеримый результат — без жалости к себе.",
  },
  wordCount: 320,
  text: `In 2022 my family moved from Samarkand to Tashkent for my father's job, and I changed schools in the middle of grade 10. The new school taught mathematics in Russian and used a different sequencing from my old school, so for four months I sat in the back of the class understanding roughly half of every lesson. My first monthly test came back at 51%.

I did not ask the teacher for extra lessons — I was embarrassed to admit how much I had missed. Instead I asked the three strongest students in the class if I could join their study group, and I started writing my own notes on every theorem in both languages so the gap could not hide. By December I had rebuilt the first two years of the Russian-language mathematics course, and I began recording short video explanations of each topic on my phone and sharing them with two classmates who were struggling with the same material.

That decision turned into something bigger. By the end of grade 10, the group had grown to nine students, and our teacher asked me to run a weekly 90-minute review session before each test. My own score rose from 51% to 88% by the spring, and all nine students in the group passed the year without a retake — the three who had been failing alongside me finished above 70%.

The experience taught me that the gap I was afraid to admit was not actually my weakness; the silence around it was. Since then, when I do not understand something, I write down the exact sentence where my understanding stops and bring that sentence, not a general apology, to whoever can help. In university I want to keep that habit in mathematics and physics courses that are harder than anything I have taken, and I want to keep the teaching habit too: I have already volunteered to run a mathematics review session for first-year students in my district's education center next summer.`,
  blocks: [
    block(
      "hook",
      { en: "1. The obstacle, quantified honestly", uz: "1. To‘siq — halol va aniq", ru: "1. Препятствие — честно и точно" },
      `In 2022 my family moved from Samarkand to Tashkent for my father's job, and I changed schools in the middle of grade 10. The new school taught mathematics in Russian and used a different sequencing from my old school, so for four months I sat in the back of the class understanding roughly half of every lesson. My first monthly test came back at 51%.`
    ),
    block(
      "evidence",
      { en: "2. Three actions, in order", uz: "2. Uchta harakat ketma-ket", ru: "2. Три действия по порядку" },
      `I did not ask the teacher for extra lessons — I was embarrassed to admit how much I had missed. Instead I asked the three strongest students in the class if I could join their study group, and I started writing my own notes on every theorem in both languages so the gap could not hide. By December I had rebuilt the first two years of the Russian-language mathematics course, and I began recording short video explanations of each topic on my phone and sharing them with two classmates who were struggling with the same material.`
    ),
    block(
      "quantified",
      { en: "3. The measured result, including other people", uz: "3. O‘lchangan natija, boshqalarni ham qamrab", ru: "3. Измеримый результат, включая других" },
      `That decision turned into something bigger. By the end of grade 10, the group had grown to nine students, and our teacher asked me to run a weekly 90-minute review session before each test. My own score rose from 51% to 88% by the spring, and all nine students in the group passed the year without a retake — the three who had been failing alongside me finished above 70%.`
    ),
    block(
      "impact",
      { en: "4. The principle you now use", uz: "4. Endi ishlatadigan tamoyil", ru: "4. Принцип, который вы применяете сейчас" },
      `The experience taught me that the gap I was afraid to admit was not actually my weakness; the silence around it was. Since then, when I do not understand something, I write down the exact sentence where my understanding stops and bring that sentence, not a general apology, to whoever can help. In university I want to keep that habit in mathematics and physics courses that are harder than anything I have taken, and I want to keep the teaching habit too: I have already volunteered to run a mathematics review session for first-year students in my district's education center next summer.`
    ),
  ],
};

/* ==========================================================================
 * Answer Vault — short answers on five standard prompts
 * ======================================================================= */

export const SAMPLE_VAULT_SHORT_ANSWERS: SampleExemplar = {
  id: "SAMPLE_VAULT_SHORT_ANSWERS",
  kind: "vault",
  title: {
    en: "Answer Vault starter set (5 standard prompts)",
    uz: "Javoblar ombori to‘plami (5 standart savol)",
    ru: "Набор ответов (5 стандартных вопросов)",
  },
  summary: {
    en: "Motivation, leadership, career plan, a challenge you overcame and community impact — reusable 90-word answers with concrete evidence.",
    uz: "Motivatsiya, yetakchilik, karyera rejasi, yengilgan qiyinchilik va jamiyatga hissa — aniq dalilli 90 so‘zlik qayta ishlatiladigan javoblar.",
    ru: "Мотивация, лидерство, карьерный план, преодолённая трудность и вклад в сообщество — многоразовые ответы на 90 слов с конкретикой.",
  },
  wordCount: 470,
  text: `MOTIVATION — "Why do you want to study abroad?"
I want to study abroad because the research infrastructure my project needs does not exist in Uzbekistan yet. My soil-salinity model required satellite time-series tooling and edge-hardware labs that our university cannot provide at scale. A graduate programme with an earth-observation group lets me bring that capability home instead of importing the finished result.

LEADERSHIP — "Describe a leadership experience."
I founded CodeForRegions in 2024 after seeing that rural students in Qarshi had no programming teacher. I recruited 18 volunteers, designed a 10-week Python curriculum, and coordinated transport and venues for 420 high-school students in two regions. Fourteen of them later medaled at regional olympiads, and six volunteers now run the programme without me.

CAREER PLAN — "What are your plans after graduation?"
After my Master's I will return to Uzbekistan and work as a machine learning engineer on national water-resource data. Specifically, I want to integrate satellite-driven irrigation scheduling into the Amu Darya and Syr Darya basin management systems, a programme that the Ministry of Agriculture has already started funding.

CHALLENGE — "Describe a difficulty you overcame."
In my second year my family could not cover the full cost of my IELTS exam and a laptop in the same month. I chose the exam, prepared with free online materials for six weeks, and scored 7.5. I then wrote 40 freelance data-cleaning scripts over the next three months to buy the laptop, which is the machine I still use for all my research work.

COMMUNITY — "How have you contributed to your community?"
Beyond CodeForRegions, I spent 120 hours in 2025 volunteering at the Tashkent Science Library, digitising 3,000 pages of Soviet-era physics journals and building the index that students now search online. I also translated 20 pages of Python documentation into Uzbek for the school curriculum project.`,
  blocks: [
    block(
      "evidence",
      { en: "Answer structure: claim → evidence → number", uz: "Javob tuzilmasi: fikr → dalil → raqam", ru: "Структура ответа: тезис → доказательство → цифра" },
      `LEADERSHIP — "Describe a leadership experience."
I founded CodeForRegions in 2024 after seeing that rural students in Qarshi had no programming teacher. I recruited 18 volunteers, designed a 10-week Python curriculum, and coordinated transport and venues for 420 high-school students in two regions. Fourteen of them later medaled at regional olympiads, and six volunteers now run the programme without me.`
    ),
    block(
      "quantified",
      { en: "Handling adversity without self-pity", uz: "Qiyinchilikni achinishsiz bayon qilish", ru: "О трудностях без жалости к себе" },
      `CHALLENGE — "Describe a difficulty you overcame."
In my second year my family could not cover the full cost of my IELTS exam and a laptop in the same month. I chose the exam, prepared with free online materials for six weeks, and scored 7.5. I then wrote 40 freelance data-cleaning scripts over the next three months to buy the laptop, which is the machine I still use for all my research work.`
    ),
    block(
      "impact",
      { en: "Career plan tied to a funded national programme", uz: "Karyera rejasi davlat dasturiga bog‘langan", ru: "Карьерный план, привязанный к государственной программе" },
      `CAREER PLAN — "What are your plans after graduation?"
After my Master's I will return to Uzbekistan and work as a machine learning engineer on national water-resource data. Specifically, I want to integrate satellite-driven irrigation scheduling into the Amu Darya and Syr Darya basin management systems, a programme that the Ministry of Agriculture has already started funding.`
    ),
  ],
};

/* ==========================================================================
 * Activity portfolio — how to write activity entries
 * ======================================================================= */

export const SAMPLE_PORTFOLIO_ACTIVITIES: SampleExemplar = {
  id: "SAMPLE_PORTFOLIO_ACTIVITIES",
  kind: "portfolio",
  title: {
    en: "Four activity entries (research, leadership, volunteering, olympiad)",
    uz: "To‘rtta faoliyat yozuvi (tadqiqot, yetakchilik, ko‘ngillilik, olimpiada)",
    ru: "Четыре записи об активности (исследование, лидерство, волонтёрство, олимпиада)",
  },
  summary: {
    en: "The role/hours/result format every application system asks for, filled in with realistic Uzbekistan examples.",
    uz: "Har bir ariza tizimi so‘raydigan rol/soat/natija formati, O‘zbekistondagi real misollar bilan.",
    ru: "Формат «роль/часы/результат», который требуют все системы, с реалистичными примерами из Узбекистана.",
  },
  wordCount: 300,
  text: `RESEARCH — Undergraduate Research Assistant, Smart Irrigation & Climate Lab (Sep 2024 – Present, 640 hours)
Role: Built the computer-vision pipeline and led field deployment of the sensor network.
Result: 91.4% validation accuracy on salinity detection; 22% lower irrigation water use across 3 farms; two co-authored IEEE ICISCT 2025 papers.

LEADERSHIP — Founder & Lead Mentor, CodeForRegions (Jan 2024 – Present, 360 hours)
Role: Recruited and trained 18 volunteer teachers; designed the 10-week Python curriculum; managed scheduling across two regions.
Result: 420 high-school students trained; 14 regional olympiad medals; the programme now runs under six trained volunteer leads.

VOLUNTEERING — Tashkent Science Library digitisation (Jun 2025 – Sep 2025, 120 hours)
Role: Scanned and indexed Soviet-era physics journals; built the searchable catalogue used by students.
Result: 3,000 pages digitised; the index is used weekly by an estimated 40 students; trained two other volunteers on the workflow.

OLYMPIAD — Republican Olympiad in Informatics (2022, 2023; ~500 hours of preparation)
Role: Team member (2022), team captain in the regional round (2023).
Result: Silver medal, national stage (2023); 4th place nationally with a 3-person team at the ICPC Central Asia Regional Contest (2025).`,
  blocks: [
    block(
      "quantified",
      { en: "Research entry: role, hours, measured result", uz: "Tadqiqot yozuvi: rol, soat, o‘lchangan natija", ru: "Исследование: роль, часы, измеримый результат" },
      `RESEARCH — Undergraduate Research Assistant, Smart Irrigation & Climate Lab (Sep 2024 – Present, 640 hours)
Role: Built the computer-vision pipeline and led field deployment of the sensor network.
Result: 91.4% validation accuracy on salinity detection; 22% lower irrigation water use across 3 farms; two co-authored IEEE ICISCT 2025 papers.`
    ),
    block(
      "quantified",
      { en: "Leadership entry: what you built that outlived you", uz: "Yetakchilik: sizdan keyin ham ishlaydigan narsa", ru: "Лидерство: то, что работает и без вас" },
      `LEADERSHIP — Founder & Lead Mentor, CodeForRegions (Jan 2024 – Present, 360 hours)
Role: Recruited and trained 18 volunteer teachers; designed the 10-week Python curriculum; managed scheduling across two regions.
Result: 420 high-school students trained; 14 regional olympiad medals; the programme now runs under six trained volunteer leads.`
    ),
    block(
      "quantified",
      { en: "Volunteering entry: service with a number attached", uz: "Ko‘ngillilik: raqam bilan xizmat", ru: "Волонтёрство: служение с цифрой" },
      `VOLUNTEERING — Tashkent Science Library digitisation (Jun 2025 – Sep 2025, 120 hours)
Role: Scanned and indexed Soviet-era physics journals; built the searchable catalogue used by students.
Result: 3,000 pages digitised; the index is used weekly by an estimated 40 students; trained two other volunteers on the workflow.`
    ),
  ],
};

/* ==========================================================================
 * Employer / research supervisor letter
 * ======================================================================= */

export const SAMPLE_LOR_EMPLOYER_RESEARCH: SampleExemplar = {
  id: "SAMPLE_LOR_EMPLOYER_RESEARCH",
  kind: "lor",
  title: {
    en: "Employer / research supervisor recommendation",
    uz: "Ish beruvchi / ilmiy rahbar tavsiyanomasi",
    ru: "Рекомендация от работодателя / научного руководителя",
  },
  summary: {
    en: "For applicants with work experience: scope of responsibility, one hard problem solved, and a comparison against peers.",
    uz: "Ish tajribasi borlar uchun: mas’uliyat doirasi, hal qilingan bitta qiyin muammo va tengdoshlar bilan taqqoslash.",
    ru: "Для тех, у кого есть опыт работы: зона ответственности, одна решённая сложная задача и сравнение с коллегами.",
  },
  wordCount: 300,
  text: `[COMPANY LETTERHEAD]
National Electric Grid of Uzbekistan — Regional Dispatch Center, Tashkent

Date: October 14, 2026
To the Admissions Committee,

I am the Head of the Regional Dispatch Center at the National Electric Grid of Uzbekistan, and I supervised Dilnoza Yusupova during her two years as a junior power-systems engineer in our office (2024–2026). I write in support of her application to the M.Sc. in Sustainable Energy Systems.

Dilnoza joined a team of nine engineers responsible for load balancing across the Bukhara and Navoi solar corridors. Within her first three months she had digitised 42 substation telemetry logs that had been maintained as paper spreadsheets, and she built the anomaly-detection dashboard with which our dispatchers now identify overload conditions. Response time to transformer overload events fell by 34% in the first half-year, and we avoided three feeder outages that would have affected roughly 65,000 residents.

What distinguishes Dilnoza is how she responds when a tool does not exist. When we tried to model sub-hourly solar irradiance drops caused by desert dust storms, our legacy load-flow software could not represent the stochastic behaviour. Dilnoza read the relevant literature on her own time, wrote a simulation prototype in Python using three years of our meteorological data, and presented the results to the deputy director — which is why our center is now procuring a modern stochastic load-flow tool. She also trained four colleagues on the dashboard, so the capability stayed with the team.

She is one of the two strongest junior engineers I have supervised in the last five years, and the only one who has combined engineering work with public teaching: she co-organized a clean-tech mentorship workshop for 150 polytechnic students in Tashkent.

Dilnoza has committed to returning to our Ministry after graduation, and we have confirmed in writing that a role leading the National Renewable Dispatch Modernization Taskforce will be available to her. I recommend her without reservation.

Sincerely,
[Name], Head of Regional Dispatch Center
National Electric Grid of Uzbekistan | [phone] | [email]`,
  blocks: [
    block(
      "evidence",
      { en: "1. Relationship, dates and scope", uz: "1. Aloqa, sanalar va mas’uliyat doirasi", ru: "1. Знакомство, даты и зона ответственности" },
      `[COMPANY LETTERHEAD]
National Electric Grid of Uzbekistan — Regional Dispatch Center, Tashkent

Date: October 14, 2026
To the Admissions Committee,

I am the Head of the Regional Dispatch Center at the National Electric Grid of Uzbekistan, and I supervised Dilnoza Yusupova during her two years as a junior power-systems engineer in our office (2024–2026). I write in support of her application to the M.Sc. in Sustainable Energy Systems.`
    ),
    block(
      "proof",
      { en: "2. Measured business impact", uz: "2. O‘lchangan amaliy natija", ru: "2. Измеримый практический результат" },
      `Dilnoza joined a team of nine engineers responsible for load balancing across the Bukhara and Navoi solar corridors. Within her first three months she had digitised 42 substation telemetry logs that had been maintained as paper spreadsheets, and she built the anomaly-detection dashboard with which our dispatchers now identify overload conditions. Response time to transformer overload events fell by 34% in the first half-year, and we avoided three feeder outages that would have affected roughly 65,000 residents.`
    ),
    block(
      "fit",
      { en: "3. Initiative beyond the job description", uz: "3. Vazifadan tashqari tashabbus", ru: "3. Инициатива за рамками должности" },
      `What distinguishes Dilnoza is how she responds when a tool does not exist. When we tried to model sub-hourly solar irradiance drops caused by desert dust storms, our legacy load-flow software could not represent the stochastic behaviour. Dilnoza read the relevant literature on her own time, wrote a simulation prototype in Python using three years of our meteorological data, and presented the results to the deputy director — which is why our center is now procuring a modern stochastic load-flow tool. She also trained four colleagues on the dashboard, so the capability stayed with the team.`
    ),
    block(
      "agency",
      { en: "4. Ranked verdict + a written return offer", uz: "4. Reyting bilan xulosa + yozma qaytish taklifi", ru: "4. Вывод с рейтингом + письменное предложение вернуться" },
      `She is one of the two strongest junior engineers I have supervised in the last five years, and the only one who has combined engineering work with public teaching: she co-organized a clean-tech mentorship workshop for 150 polytechnic students in Tashkent.

Dilnoza has committed to returning to our Ministry after graduation, and we have confirmed in writing that a role leading the National Renewable Dispatch Modernization Taskforce will be available to her. I recommend her without reservation.`
    ),
  ],
};

/* ==========================================================================
 * Registry + lookups
 * ======================================================================= */

export const SAMPLES: readonly SampleExemplar[] = [
  SAMPLE_ONBOARDING_CV_IELTS,
  SAMPLE_ACADEMIC_CV_STEM,
  SAMPLE_EUROPASS_CV_POLICY,
  SAMPLE_SOP_MASTERS_AI,
  SAMPLE_SOP_BACHELORS_CS,
  SAMPLE_PERSONAL_STATEMENT,
  SAMPLE_WHY_US_ESSAY,
  SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING,
  SAMPLE_LOR_REQUEST_EMAIL,
  SAMPLE_LOR_PROFESSOR_ACADEMIC,
  SAMPLE_LOR_EMPLOYER_RESEARCH,
  SAMPLE_PROFESSOR_COLD_EMAIL,
  SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI,
  SAMPLE_VAULT_SHORT_ANSWERS,
  SAMPLE_PORTFOLIO_ACTIVITIES,
  SAMPLE_VISA_QA_USA_F1,
  SAMPLE_VISA_QA_GERMANY,
  SAMPLE_VISA_QA_KOREA_D2,
  SAMPLE_VISA_QA_UK,
];

export const SAMPLE_BY_ID: Record<string, SampleExemplar> = Object.fromEntries(
  SAMPLES.map((sample) => [sample.id, sample])
);

/** Look a sample up by id; null when the id is unknown (callers fail closed). */
export function sampleById(id: string | null | undefined): SampleExemplar | null {
  if (!id) return null;
  return SAMPLE_BY_ID[id] ?? null;
}

/** Samples for one surface, in registry order. */
export function samplesByKind(kind: SampleKind): SampleExemplar[] {
  return SAMPLES.filter((sample) => sample.kind === kind);
}

/** The text a "load into editor" action should insert ("" when unknown). */
export function sampleTextFor(id: string | null | undefined): string {
  return sampleById(id)?.text ?? "";
}

/** Same, but only when the value is on the allowlist of sample ids. */
export function isSampleId(value: unknown): value is string {
  return typeof value === "string" && value in SAMPLE_BY_ID;
}

/**
 * Default sample per authoring surface — used by the SampleExemplarBar when a
 * component does not choose one explicitly.
 */
export const SAMPLE_DEFAULTS: Record<string, string> = {
  onboarding: SAMPLE_ONBOARDING_CV_IELTS.id,
  cv: SAMPLE_ACADEMIC_CV_STEM.id,
  sop: SAMPLE_SOP_MASTERS_AI.id,
  essay: SAMPLE_PERSONAL_STATEMENT.id,
  scholarship: SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING.id,
  lor: SAMPLE_LOR_PROFESSOR_ACADEMIC.id,
  email: SAMPLE_LOR_REQUEST_EMAIL.id,
  document: SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI.id,
  visa: SAMPLE_VISA_QA_USA_F1.id,
  vault: SAMPLE_VAULT_SHORT_ANSWERS.id,
  portfolio: SAMPLE_PORTFOLIO_ACTIVITIES.id,
};
