/**
 * University & scholarship interview tracks (spec §26).
 *
 * The Interview Center used to show two cards that both linked to `#visa` and
 * no actual questions, so the page could not teach anything. This module is the
 * missing content: five real interview formats a ScholarBridgeAI student
 * actually sits, each with the questions asked and a model answer showing what
 * a top response contains.
 *
 * CONTENT LIVES HERE, NOT IN `i18n/messages/*.json`
 * because these are long-form study materials, not UI strings: ~1500 words per
 * language that would swamp every message bundle and slow the i18n parity check
 * for no benefit. Every entry still carries all three locales in this one file,
 * so a track can never exist in English only.
 *
 * `scripts/check-i18n.mjs` only validates keys reached through `t()`, so the
 * UI labels around this content stay in the bundles and this prose stays here.
 */

export type InterviewTrackLocale = "en" | "uz" | "ru";

/** One phrase in every supported locale. */
type L = Record<InterviewTrackLocale, string>;

export interface InterviewQuestion {
  id: string;
  /** Prompt as the panel/interviewer puts it. */
  question: L;
  /** What a strong answer contains — the "model answer" points. */
  modelAnswer: L[];
  /** Why this question is asked, so the student can adapt instead of memorising. */
  why: L;
  /** Timed-video formats only: seconds given to prepare, then to answer. */
  prepSeconds?: number;
  responseSeconds?: number;
}

export interface InterviewTrack {
  id: string;
  emoji: string;
  title: L;
  /** Who sits this interview. */
  audience: L;
  /** The institutions named in the spec. */
  institutions: string[];
  /** Format note: panel, tutorial, timed video, … */
  format: L;
  questions: InterviewQuestion[];
  /** Timed tracks get a built-in countdown + self-check rubric. */
  timed?: boolean;
  rubric?: L[];
}

// ---------------------------------------------------------------------------
// Track 1 — STEM & technical university interviews
// ---------------------------------------------------------------------------

const STEM: InterviewTrack = {
  id: "stem",
  emoji: "🧪",
  title: {
    en: "STEM & Technical University Interviews",
    uz: "STEM va texnik universitet suhbatlari",
    ru: "Собеседования в STEM и технические вузы",
  },
  audience: {
    en: "Applicants to engineering, computing and science faculties at research universities.",
    uz: "Tadqiqot universitetlarining muhandislik, informatika va fan fakultetlariga abituriyentlar.",
    ru: "Абитуриенты инженерных, компьютерных и естественно-научных факультетов исследовательских вузов.",
  },
  institutions: ["KAIST", "MIT", "ETH Zurich", "TUM"],
  format: {
    en: "Technical panel: live problem-solving on a shared board, then research verification.",
    uz: "Texnik panel: umumiy doskada jonli masala yechish, so‘ng tadqiqotni tekshirish.",
    ru: "Техническая панель: решение задачи на общей доске, затем проверка исследований.",
  },
  questions: [
    {
      id: "stem-1",
      question: {
        en: "Differentiate x³ − 3x with respect to x, then tell me where the function is increasing.",
        uz: "x³ − 3x ni x bo‘yicha differensiallang, so‘ng funksiya qaysi oraliqda o‘sishini ayting.",
        ru: "Продифференцируйте x³ − 3x по x, затем скажите, где функция возрастает.",
      },
      why: {
        en: "They are not testing whether you can differentiate — the syllabus is public. They are testing whether you narrate your reasoning while nervous.",
        uz: "Ular differensiallashni bilishingizni emas, hayajonlanganda ham fikringizni ovoz chiqarib bayon eta olishingizni sinaydi.",
        ru: "Проверяют не умение дифференцировать — программа открыта. Проверяют, объясняете ли вы ход мысли, когда волнуетесь.",
      },
      modelAnswer: [
        {
          en: "Say the rule before you apply it: \"This is a polynomial, so I differentiate term by term — 3x² − 3.\"",
          uz: "Qoidani avval ayting: \"Bu ko‘phad, shuning uchun hadma-had differensiallayman — 3x² − 3.\"",
          ru: "Сначала назовите правило: «Это многочлен, дифференцирую почленно — 3x² − 3».",
        },
        {
          en: "Then set the derivative to zero out loud: 3x² − 3 = 0 gives x = ±1, so the sign changes at those two points.",
          uz: "So‘ng hosilani nolga tenglashtiring: 3x² − 3 = 0 dan x = ±1, demak ishora shu ikki nuqtada o‘zgaradi.",
          ru: "Затем приравняйте производную к нулю вслух: 3x² − 3 = 0 даёт x = ±1 — знак меняется в этих двух точках.",
        },
        {
          en: "Finish with the answer and the caveat: increasing on x < −1 and x > 1, decreasing between. State that you checked the sign rather than assuming it.",
          uz: "Javobni va izohni ayting: x < −1 va x > 1 da o‘sadi, oradagi intervalda kamayadi. Ishora taxmin qilinmaganini, tekshirilganini ayting.",
          ru: "Закончите ответом и оговоркой: возрастает при x < −1 и x > 1, убывает между. Скажите, что проверили знак, а не предположили.",
        },
      ],
    },
    {
      id: "stem-2",
      question: {
        en: "Here is an array of n integers. Describe an algorithm that finds the two numbers summing to a target in better than O(n²).",
        uz: "Mana n ta butun sondan iborat massiv. Yig‘indisi maqsad songa teng bo‘lgan ikki sonni O(n²) dan tezroq topadigan algoritmni tasvirlab bering.",
        ru: "Вот массив из n целых чисел. Опишите алгоритм, находящий два числа с целевой суммой быстрее, чем за O(n²).",
      },
      why: {
        en: "Every strong applicant has seen this problem. What separates them is whether they discuss the trade-off rather than reciting the optimal answer.",
        uz: "Kuchli abituriyentlarning barchasi bu masalani ko‘rgan. Ular orasidagi farq — optimal javobni yodlab aytish emas, murosaga kelishni muhokama qilish.",
        ru: "Все сильные абитуриенты видели эту задачу. Разница в том, обсуждают ли они компромисс, а не пересказывают оптимум.",
      },
      modelAnswer: [
        {
          en: "Name the brute force and its exact cost first: check every pair, O(n²) time, O(1) space.",
          uz: "Avval sodda yechim va uning aniq narxini ayting: har bir juftlikni tekshirish, vaqt O(n²), xotira O(1).",
          ru: "Сначала назовите перебор и его цену: проверить каждую пару, время O(n²), память O(1).",
        },
        {
          en: "Then the hash-map improvement: one pass, store seen values in a set, look up target − current. O(n) time, O(n) space.",
          uz: "So‘ng xesh-xarita bilan yaxshilash: bir marta o‘tish, ko‘rilgan qiymatlarni to‘plamga saqlash, target − joriy ni izlash. Vaqt O(n), xotira O(n).",
          ru: "Затем улучшение через хеш-таблицу: один проход, храним увиденные значения, ищем target − текущее. Время O(n), память O(n).",
        },
        {
          en: "Close with the decision: if the array is sorted you can use two pointers and get O(1) space instead — ask whether the input is sorted before committing.",
          uz: "Qaror bilan yakunlang: agar massiv tartiblangan bo‘lsa, ikki ko‘rsatkich bilan O(1) xotiraga erishiladi — tanlashdan oldin tartiblanganligini so‘rang.",
          ru: "Завершите решением: если массив отсортирован, два указателя дают O(1) памяти — уточните это до выбора подхода.",
        },
      ],
    },
    {
      id: "stem-3",
      question: {
        en: "You mention a research project on your CV. Who supervised it, what was your specific contribution, and what would you do differently?",
        uz: "Rezyumenizda tadqiqot loyihasini tilga oldingiz. Uni kim boshqargan, sizning aniq hissangiz nima edi va nima qilgan bo‘lar edingiz boshqacha?",
        ru: "В резюме вы упомянули исследовательский проект. Кто им руководил, каков ваш конкретный вклад и что вы сделали бы иначе?",
      },
      why: {
        en: "This is a verification question. Interviewers have met applicants who list a lab they visited twice; the follow-ups are designed to find the edge of what you actually did.",
        uz: "Bu tekshirish savoli. Suhbatdoshlar laboratoriyaga ikki marta kirib, loyihani o‘ziniki qilib yozganlarni uchratgan; qo‘shimcha savollar sizning haqiqiy chegarangizni topish uchun.",
        ru: "Это проверочный вопрос. Интервьюеры видели абитуриентов, записавших лабораторию, куда заходили дважды; уточнения ищут границу того, что вы сделали сами.",
      },
      modelAnswer: [
        {
          en: "Be exact about scale: \"a 3-person team over 4 months\", not \"we worked on AI\".",
          uz: "Hajmni aniq ayting: \"4 oy davomida 3 kishilik jamoa\", \"biz AI bilan shug‘ullandik\" emas.",
          ru: "Будьте точны в масштабе: «команда из 3 человек, 4 месяца», а не «мы занимались ИИ».",
        },
        {
          en: "Separate your part with a first-person verb: \"I built the data-cleaning pipeline that reduced the unusable rows from 30% to 4%.\"",
          uz: "O‘z hissangizni birinchi shaxs fe’li bilan ajratib ko‘rsating: \"Men ma’lumotlarni tozalash quvurini qurdim, yaroqsiz qatorlar 30% dan 4% ga tushdi.\"",
          ru: "Отделите свою часть глаголом от первого лица: «Я собрал конвейер очистки данных, доля непригодных строк упала с 30% до 4%».",
        },
        {
          en: "Give a real limitation without being asked twice: what the method could not do, and the one change you would make now.",
          uz: "Cheklovni ikkinchi marta so‘rashlarini kutmasdan ayting: usul nima qila olmadi va hozir qanday o‘zgartirgan bo‘lar edingiz.",
          ru: "Назовите ограничение, не дожидаясь второго вопроса: что метод не мог, и что вы изменили бы сейчас.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Track 2 — UK Oxbridge / Russell Group tutorials
// ---------------------------------------------------------------------------

const UK_TUTORIAL: InterviewTrack = {
  id: "uk-tutorial",
  emoji: "🎓",
  title: {
    en: "UK Oxbridge & Russell Group Academic Tutorials",
    uz: "Buyuk Britaniya Oksbrij & Russell Group akademik darslari",
    ru: "Академические тьюториалы Оксбриджа и Russell Group",
  },
  audience: {
    en: "Applicants to tutorial-based UK courses, where the interview IS the teaching format.",
    uz: "Tutorialga asoslangan Britaniya kurslariga abituriyentlar — bu yerda suhbatning o‘zi o‘qitish formatidir.",
    ru: "Абитуриенты британских курсов с тьюториалами — там собеседование и есть формат обучения.",
  },
  institutions: ["Oxford", "Cambridge", "Imperial", "UCL", "LSE"],
  format: {
    en: "Two academics, no fixed script: they teach a short idea, then push you past what you already know.",
    uz: "Ikki akademik, qat’iy skript yo‘q: qisqa g‘oyani o‘rgatadilar, so‘ng sizni bilganingizdan nariga undaydilar.",
    ru: "Два преподавателя без жёсткого сценария: дают короткую идею и выводят вас за пределы известного.",
  },
  questions: [
    {
      id: "uk-1",
      question: {
        en: "Why this course, and why at this university rather than a cheaper one nearer home?",
        uz: "Nega aynan bu kurs va nega yaqinroqdagi arzonrog‘i emas, aynan bu universitet?",
        ru: "Почему именно этот курс и почему именно этот университет, а не более дешёвый поближе к дому?",
      },
      why: {
        en: "They are separating students who want the subject from students who want the name. Both are fine; only one can be defended for three years.",
        uz: "Ular fanni xohlaydiganlarni nomni xohlaydiganlardan ajratadi. Ikkalasi ham mumkin; lekin faqat bittasi uch yil davomida oqlanadi.",
        ru: "Отделяют тех, кому нужен предмет, от тех, кому нужно имя. Оба варианта допустимы, но выдержать три года может один.",
      },
      modelAnswer: [
        {
          en: "Name a specific module or paper, and say what in it you cannot learn from the Internet — that is the honest reason to be in the room.",
          uz: "Aniq modul yoki kurs ishini ayting va unda internetdan o‘rganib bo‘lmaydigan narsa nima — xonada bo‘lishning halol sababi shu.",
          ru: "Назовите конкретный модуль и то, чему из него нельзя научиться в интернете, — это и есть честная причина быть в аудитории.",
        },
        {
          en: "Reference something you read that is not a blog post: a paper, a textbook chapter, a lecture series. Be ready to say what you disagreed with.",
          uz: "Blog post bo‘lmagan narsani tilga oling: maqola, darslik bobi, ma’ruzalar turkumi. Nimaga rozi bo‘lmaganingizni ayting.",
          ru: "Сошлитесь на не-блог: статью, главу учебника, курс лекций. Будьте готовы сказать, с чем не согласны.",
        },
        {
          en: "Answer the cost half directly. Silence here reads as evasion; a clear \"I am applying for X, and I have a plan for Y\" does not.",
          uz: "Xarajat qismiga to‘g‘ridan-to‘g‘ri javob bering. Bu yerda jim qolish qochishdek tuyuladi; \"X ga ariza beraman, Y bo‘yicha rejam bor\" deyish esa yo‘q.",
          ru: "Ответьте прямо на часть про деньги. Молчание читается как уклонение, а «подаю на X и имею план на Y» — нет.",
        },
      ],
    },
    {
      id: "uk-2",
      question: {
        en: "Here is a short text you have not seen. Read it and tell me what the author is actually claiming.",
        uz: "Mana siz ko‘rmagan qisqa matn. O‘qing va muallif aslida nimani da’vo qilayotganini ayting.",
        ru: "Вот короткий текст, которого вы не видели. Прочитайте и скажите, что автор на самом деле утверждает.",
      },
      why: {
        en: "Critical reading under time pressure. The skill being tested is distinguishing the claim from the evidence presented for it.",
        uz: "Vaqt bosimi ostida tanqidiy o‘qish. Sinovdan o‘tadigan ko‘nikma — da’voni u uchun keltirilgan dalildan ajratish.",
        ru: "Критическое чтение под давлением времени. Проверяют умение отделить утверждение от приведённого доказательства.",
      },
      modelAnswer: [
        {
          en: "Restate the central claim in one sentence of your own words before commenting on it.",
          uz: "Izohlashdan oldin markaziy da’voni o‘z so‘zlaringiz bilan bir gapda qayta ayting.",
          ru: "Прежде чем комментировать, перескажите главный тезис одним предложением своими словами.",
        },
        {
          en: "Separate claim from evidence out loud: \"The claim is X; the support offered is only Y, which would also be true if the opposite were the case.\"",
          uz: "Da’vo va dalilni ovoz chiqarib ajrating: \"Da’vo — X; keltirilgan dalil faqat Y, u qarama-qarshi holatda ham to‘g‘ri bo‘lardi.\"",
          ru: "Разделите тезис и доказательство вслух: «Тезис — X; приведено только Y, которое верно и при обратном».",
        },
        {
          en: "Offer one counter-example, then say what evidence would change your mind. That last part is what tutors remember.",
          uz: "Bitta qarshi misol keltiring, so‘ng fikringizni nima o‘zgartirishini ayting. Ustozlar aynan shuni eslab qoladi.",
          ru: "Приведите контрпример, затем скажите, какие данные изменили бы ваш взгляд. Именно это запоминают тьюторы.",
        },
      ],
    },
    {
      id: "uk-3",
      question: {
        en: "I will give you a problem from a field you have not studied. Work through it with me — I will help when you ask.",
        uz: "Siz o‘qimagan sohadan masala beraman. Men bilan birga yeching — so‘raganingizda yordam beraman.",
        ru: "Дам задачу из области, которую вы не изучали. Решайте вместе со мной — помогу, когда попросите.",
      },
      why: {
        en: "The unseen-problem format is the whole point of a tutorial interview: they are checking whether you are teachable in real time.",
        uz: "Ko‘rilmagan masala formati — tutorial suhbatining butun mazmuni: real vaqtda o‘rgatish mumkinligingizni tekshiradilar.",
        ru: "Формат незнакомой задачи — суть тьюториального интервью: проверяют, обучаемы ли вы в реальном времени.",
      },
      modelAnswer: [
        {
          en: "Think aloud continuously. A silent minute is worse than a wrong sentence, because a wrong sentence can be corrected.",
          uz: "Doim ovoz chiqarib o‘ylang. Jim o‘tgan daqiqa noto‘g‘ri gapdan yomonroq, chunki noto‘g‘ri gapni tuzatish mumkin.",
          ru: "Думайте вслух непрерывно. Минута молчания хуже неверной фразы: неверную можно исправить.",
        },
        {
          en: "Ask a precise question when stuck — \"is the quantity discrete or continuous?\" — not \"can you help me?\".",
          uz: "Qiyinlashganda aniq savol bering — \"bu kattalik diskretmi yoki uzluksizmi?\" — \"yordam bera olasizmi?\" emas.",
          ru: "Застряв, задайте точный вопрос — «величина дискретна или непрерывна?» — а не «помогите?».",
        },
        {
          en: "Follow the hint further than they expect, and say when you notice your own earlier step was wrong. Self-correction is the highest-scoring behaviour.",
          uz: "Maslahatni kutilganidan nariga olib boring va avvalgi qadamingiz xato ekanini payqaganingizda ayting. O‘zini tuzatish — eng yuqori ball.",
          ru: "Развейте подсказку дальше ожидаемого и скажите, когда заметили свою прежнюю ошибку. Самокоррекция — самый ценный балл.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Track 3 — El-yurt umidi presidential scholarship commission
// ---------------------------------------------------------------------------

const EL_YURT_UMIDI: InterviewTrack = {
  id: "el-yurt-umidi",
  emoji: "🇺🇿",
  title: {
    en: "\u201CEl-yurt umidi\u201D Presidential Scholarship Oral Commission",
    uz: "\u201CEl-yurt umidi\u201D Prezident stipendiyasi og‘zaki komissiyasi",
    ru: "Устная комиссия президентской стипендии «El-yurt umidi»",
  },
  audience: {
    en: "Shortlisted candidates for Uzbekistan's state-funded overseas study scholarship.",
    uz: "O‘zbekistonning davlat hisobidan chet elda o‘qish stipendiyasi uchun qisqa ro‘yxatga kirgan nomzodlar.",
    ru: "Кандидаты, прошедшие отбор на государственную стипендию для обучения за рубежом.",
  },
  institutions: ["El-yurt umidi Foundation", "Presidential Commission"],
  format: {
    en: "Formal commission, timed statements. Every applicant has strong grades; the return-service contract is the differentiator.",
    uz: "Rasmiy komissiya, vaqt cheklangan bayonotlar. Barcha nomzodlarning baholari kuchli; farqni qaytish majburiyati shartnomasi belgilaydi.",
    ru: "Формальная комиссия, регламентированные выступления. У всех сильные оценки; различие создаёт договор о возвращении.",
  },
  questions: [
    {
      id: "eyu-1",
      question: {
        en: "You sign a contract to return and serve. What exactly will you do in Uzbekistan in the first two years after graduation?",
        uz: "Siz qaytib xizmat qilish shartnomasini imzolaysiz. O‘qishni tugatgach, dastlabki ikki yilda O‘zbekistonda aniq nima qilasiz?",
        ru: "Вы подписываете договор о возвращении и работе. Что именно вы будете делать в Узбекистане первые два года после выпуска?",
      },
      why: {
        en: "The commission has heard \"I will develop my country\" many times. They are listening for a named employer, sector or project.",
        uz: "Komissiya \"vatanimni rivojlantiraman\" degan gaplarni ko‘p eshitgan. Ular aniq ish beruvchi, soha yoki loyihani eshitishni xohlaydi.",
        ru: "Комиссия много раз слышала «буду развивать страну». Ждут названного работодателя, отрасли или проекта.",
      },
      modelAnswer: [
        {
          en: "Name the deliverable: \"a working prototype of an Uzbek-language clinical triage model, deployed in two Tashkent clinics.\"",
          uz: "Natijani aniq ayting: \"o‘zbek tilidagi klinik triaj modelining ishlaydigan prototipi, Toshkentdagi ikki klinikada joriy etilgan.\"",
          ru: "Назовите результат: «работающий прототип клинической триажной модели на узбекском, внедрённый в двух клиниках Ташкента».",
        },
        {
          en: "Name the ministry, agency or company that would host you, and say whether you have already spoken to them.",
          uz: "Sizni qabul qiladigan vazirlik, agentlik yoki kompaniyani ayting va ular bilan allaqachon gaplashganmisiz, ayting.",
          ru: "Назовите министерство, агентство или компанию, куда придёте, и сказали ли, что уже с ними говорили.",
        },
        {
          en: "Give the timeline in months, not years, and stop talking when you have answered. Padding after a complete answer costs you.",
          uz: "Muddatni yillar emas, oylar bilan ayting va javob tugagach gapirishni to‘xtating. To‘liq javobdan keyingi ortiqcha so‘z zarar qiladi.",
          ru: "Дайте срок в месяцах, а не годах, и остановитесь, когда ответили. Лишние слова после полного ответа стоят баллов.",
        },
      ],
    },
    {
      id: "eyu-2",
      question: {
        en: "Present a five-year plan for how your field should develop nationally, with the indicators you would be measured on.",
        uz: "Sohangiz milliy miqyosda qanday rivojlanishi kerakligi bo‘yicha besh yillik reja va siz o‘lchanadigan ko‘rsatkichlarni taqdim eting.",
        ru: "Представьте пятилетний план развития вашей отрасли в стране и показатели, по которым вас будут оценивать.",
      },
      why: {
        en: "One sponsored place has to move a national number. The commission is choosing a candidate who already thinks in indicators.",
        uz: "Bitta davlat o‘rni milliy ko‘rsatkichni o‘zgartirishi kerak. Komissiya allaqachon indikatorlarda fikrlaydigan nomzodni tanlaydi.",
        ru: "Одно государственное место должно изменить национальный показатель. Выбирают кандидата, который уже мыслит индикаторами.",
      },
      modelAnswer: [
        {
          en: "Open with the baseline figure and its source, so the target has a denominator. \"The sector graduates roughly N specialists a year (agency report, 2025).\"",
          uz: "Boshlang‘ich ko‘rsatkich va uning manbasini aytib boshlang, shunda maqsadning maxraji bo‘ladi. \"Soha yiliga taxminan N mutaxassis chiqaradi (agentlik hisoboti, 2025).\"",
          ru: "Начните с базового показателя и его источника — у цели должен быть знаменатель. «Отрасль выпускает около N специалистов в год (отчёт агентства, 2025)».",
        },
        {
          en: "Give 2–3 indicators you can actually influence, with a number and a year: \"reduce equipment import lead time from 9 months to 3 by 2029.\"",
          uz: "Haqiqatan ta’sir qila oladigan 2–3 indikatorni raqam va yil bilan bering: \"uskuna import muddatini 2029 yilga qadar 9 oydan 3 oyga tushirish.\"",
          ru: "Дайте 2–3 показателя, на которые реально влияете, с числом и годом: «сократить срок поставки оборудования с 9 месяцев до 3 к 2029 году».",
        },
        {
          en: "Acknowledge one risk and your mitigation. An unqualified five-year plan reads as inexperience.",
          uz: "Bitta xavfni va uni kamaytirish yo‘lini tan oling. Shartsiz besh yillik reja tajribasizlikdek o‘qiladi.",
          ru: "Признайте один риск и способ его снижения. Безоговорочный пятилетний план читается как неопытность.",
        },
      ],
    },
    {
      id: "eyu-3",
      question: {
        en: "Defend your choice of university and programme against the alternatives the commission could have funded.",
        uz: "Komissiya moliyalashi mumkin bo‘lgan alternativalarga qarshi universitet va dastur tanlovingizni asoslang.",
        ru: "Обоснуйте выбор вуза и программы против альтернатив, которые комиссия могла бы финансировать.",
      },
      why: {
        en: "This is a value-for-money question. The commission is protecting public money and needs your reasoning on the record.",
        uz: "Bu pulning samaradorligi haqidagi savol. Komissiya davlat mablag‘ini himoya qiladi va sizning asoslaringizni yozib olishi kerak.",
        ru: "Это вопрос эффективности расходов. Комиссия защищает государственные средства и хочет зафиксировать вашу аргументацию.",
      },
      modelAnswer: [
        {
          en: "Compare on the axis that matters for the plan you just gave — lab access, specific supervisor, industry placement — not on ranking alone.",
          uz: "Faqat reyting bo‘yicha emas, avval aytgan rejangiz uchun muhim o‘q bo‘yicha solishtiring — laboratoriya imkoni, aniq rahbar, ishlab chiqarish amaliyoti.",
          ru: "Сравнивайте по оси, важной для вашего же плана — доступ к лаборатории, конкретный научрук, стажировка, — а не только по рейтингу.",
        },
        {
          en: "State the total cost against the nearest cheaper alternative, and what the difference buys.",
          uz: "Umumiy xarajatni eng yaqin arzon alternativaga qiyoslab ayting va bu farq nima berishini tushuntiring.",
          ru: "Назовите полную стоимость против ближайшей дешёвой альтернативы и то, что даёт разница.",
        },
        {
          en: "If a cheaper option is genuinely comparable for your plan, say so. Admitting it strengthens the case for the one you chose.",
          uz: "Agar arzon variant rejangiz uchun haqiqatan teng bo‘lsa, shuni ayting. Buni tan olish tanlagan variantingizni kuchaytiradi.",
          ru: "Если более дешёвый вариант действительно сопоставим для вашего плана, скажите это. Признание усиливает выбор.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Track 4 — Chevening / GKS / Stipendium Hungaricum embassy panels
// ---------------------------------------------------------------------------

const EMBASSY_PANEL: InterviewTrack = {
  id: "embassy-panel",
  emoji: "🏛️",
  title: {
    en: "Chevening, GKS & Stipendium Hungaricum Embassy Panels",
    uz: "Chevening, GKS va Stipendium Hungaricum elchixona panellari",
    ru: "Панели посольств Chevening, GKS и Stipendium Hungaricum",
  },
  audience: {
    en: "Applicants to government-funded scholarship panels with a leadership and networking component.",
    uz: "Yetakchilik va tarmoq komponenti bo‘lgan davlat stipendiyasi panellariga abituriyentlar.",
    ru: "Абитуриенты государственных стипендиальных панелей с лидерской и сетевой составляющей.",
  },
  institutions: ["Chevening (UK)", "Global Korea Scholarship", "Stipendium Hungaricum"],
  format: {
    en: "Panel interview, 25–40 minutes. Every rubric has a leadership line and a networking line you must actually evidence.",
    uz: "Panel suhbati, 25–40 daqiqa. Har bir rubrikada yetakchilik va tarmoq qatori bor — ularni dalil bilan ko‘rsatish shart.",
    ru: "Панельное интервью, 25–40 минут. В каждом рубрикаторе есть строка о лидерстве и о нетворкинге — их нужно подтвердить фактами.",
  },
  questions: [
    {
      id: "ep-1",
      question: {
        en: "Give me one leadership example where you changed an outcome. Use a specific situation.",
        uz: "Natijani o‘zgartirgan bitta yetakchilik misolini keltiring. Aniq vaziyat bilan.",
        ru: "Приведите пример лидерства, где вы изменили результат. С конкретной ситуацией.",
      },
      why: {
        en: "This is scored against a rubric, not a general impression. An unstructured story loses the point even if the story is good.",
        uz: "Bu umumiy taassurot emas, rubrika bo‘yicha baholanadi. Tuzilmagan hikoya yaxshi bo‘lsa ham ball yo‘qotadi.",
        ru: "Оценивают по рубрикатору, а не по впечатлению. Неструктурированная история теряет балл, даже если хороша.",
      },
      modelAnswer: [
        {
          en: "Use STAR out loud: Situation, Task, Action, Result. Keep S and T to two sentences; the panel scores the Action and the Result.",
          uz: "STAR ni ovoz chiqarib qo‘llang: Vaziyat, Vazifa, Harakat, Natija. V va V ni ikki gapda saqlang; panel Harakat va Natijani baholaydi.",
          ru: "Проговорите STAR: ситуация, задача, действие, результат. Ситуацию и задачу — в двух предложениях; оценивают действие и результат.",
        },
        {
          en: "Quantify the result even if it is small: \"attendance went from 12 to 60\", not \"it was very successful\".",
          uz: "Natijani kichik bo‘lsa ham raqamda ko‘rsating: \"qatnashuv 12 dan 60 ga chiqdi\", \"juda muvaffaqiyatli bo‘ldi\" emas.",
          ru: "Оцифруйте результат, даже небольшой: «посещаемость выросла с 12 до 60», а не «прошло очень успешно».",
        },
        {
          en: "Name what you would do differently. The rubric usually has a reflection line, and most candidates leave it empty.",
          uz: "Nima qilgan bo‘lardingiz boshqacha, ayting. Rubrikada odatda mulohaza qatori bo‘ladi va ko‘p nomzodlar uni bo‘sh qoldiradi.",
          ru: "Скажите, что сделали бы иначе. В рубрикаторе обычно есть строка рефлексии, и большинство её пропускает.",
        },
      ],
    },
    {
      id: "ep-2",
      question: {
        en: "How will you use the network you build on this scholarship once you are back in Central Asia?",
        uz: "Stipendiya davomida qurgan tarmog‘ingizdan Markaziy Osiyoga qaytgach qanday foydalanasiz?",
        ru: "Как вы используете сеть контактов, созданную на стипендии, вернувшись в Центральную Азию?",
      },
      why: {
        en: "Alumni networks are the product these programmes actually fund. A vague answer here fails the criterion no matter how strong the academics.",
        uz: "Alumni tarmoqlari — bu dasturlar aslida moliyalaydigan mahsulot. Bu yerda noaniq javob, akademik kuchliligidan qat’i nazar, mezonni yiqitadi.",
        ru: "Сети выпускников — то, что эти программы на самом деле финансируют. Расплывчатый ответ проваливает критерий при любой академической силе.",
      },
      modelAnswer: [
        {
          en: "Name two concrete links: a named institution you will keep working with, and a named regional body or conference.",
          uz: "Ikki aniq bog‘lanishni ayting: birga ishlashda davom etadigan aniq muassasa va aniq mintaqaviy tashkilot yoki konferensiya.",
          ru: "Назовите две конкретные связи: учреждение, с которым продолжите работу, и региональную организацию или конференцию.",
        },
        {
          en: "Describe what you bring TO the network, not only what you take. Funders reward candidates who host, not only attend.",
          uz: "Tarmoqqa nima olib kelishingizni tasvirlab bering, faqat nima olishingizni emas. Homiyar tashrif buyuruvchini emas, mezbonni qadrlaydi.",
          ru: "Опишите, что вы приносите в сеть, а не только берёте. Спонсоры поощряют тех, кто принимает, а не только посещает.",
        },
        {
          en: "Give a horizon: one action within 12 months of returning, one within 5 years.",
          uz: "Ufqni belgilang: qaytgach 12 oy ichida bir harakat, 5 yil ichida yana bir harakat.",
          ru: "Задайте горизонт: одно действие в первые 12 месяцев после возвращения, одно — в течение 5 лет.",
        },
      ],
    },
    {
      id: "ep-3",
      question: {
        en: "Defend your study plan. Why these modules, and how do they connect to the problem you say you want to solve?",
        uz: "O‘qish rejangizni asoslang. Nega aynan bu modullar va ular hal qilmoqchi bo‘lgan muammoingiz bilan qanday bog‘lanadi?",
        ru: "Обоснуйте учебный план. Почему именно эти модули и как они связаны с проблемой, которую вы хотите решить?",
      },
      why: {
        en: "Panels reject otherwise strong candidates whose course choice has no visible link to their stated goal. The burden is on your articulation.",
        uz: "Panellar kuchli nomzodlarni ham, kurs tanlovi aytilgan maqsad bilan ko‘rinmas bog‘langan bo‘lsa, rad etadi. Buni siz ayting.",
        ru: "Панели отклоняют сильных кандидатов, если выбор курса не связан с заявленной целью. Связь должны сформулировать вы.",
      },
      modelAnswer: [
        {
          en: "Draw the line explicitly: \"Module A gives me the method I lack; module B gives me the policy instrument; the dissertation ties them to <problem>.\"",
          uz: "Bog‘lanishni aniq chizing: \"A moduli menga yetishmayotgan usulni beradi; B moduli siyosat vositasini beradi; dissertatsiya ularni <muammo>ga bog‘laydi.\"",
          ru: "Проведите связь явно: «Модуль A даёт недостающий метод, модуль B — инструмент политики, диссертация связывает их с <проблемой>».",
        },
        {
          en: "Show you read the actual handbook: name the elective and the assessment type, not just the programme title.",
          uz: "Haqiqiy qo‘llanmani o‘qiganingizni ko‘rsating: dastur nomini emas, tanlov fanini va baholash turini ayting.",
          ru: "Покажите, что читали настоящий справочник: назовите электив и форму аттестации, а не только название программы.",
        },
        {
          en: "If the programme is missing something you need, say how you will cover it — that reads as judgement, not as criticism.",
          uz: "Dasturda sizga kerak narsa yetishmasa, uni qanday qoplashingizni ayting — bu tanqid emas, mulohaza sifatida o‘qiladi.",
          ru: "Если в программе нет нужного вам, скажите, как восполните, — это читается как рассудительность, а не критика.",
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Track 5 — Timed video interviews (Kira Talent et al.)
// ---------------------------------------------------------------------------

const TIMED_VIDEO: InterviewTrack = {
  id: "timed-video",
  emoji: "⏱️",
  title: {
    en: "Timed Video Interviews (Toronto OSP, Waterloo, Kira Talent)",
    uz: "Vaqtli video suhbatlar (Toronto OSP, Waterloo, Kira Talent)",
    ru: "Видеоинтервью с таймером (Toronto OSP, Waterloo, Kira Talent)",
  },
  audience: {
    en: "Applicants to programmes that screen with an asynchronous recorded interview.",
    uz: "Asinxron yozib olinadigan suhbat bilan saralaydigan dasturlarga abituriyentlar.",
    ru: "Абитуриенты программ с асинхронным записанным собеседованием.",
  },
  institutions: ["University of Toronto (OSP)", "University of Waterloo", "Kira Talent"],
  format: {
    en: "No interviewer and no second take: a timer starts, you record, it submits. Practise with the countdown below.",
    uz: "Suhbatdosh yo‘q va qayta yozish yo‘q: taymer boshlanadi, siz yozasiz, u yuboriladi. Quyidagi hisoblagich bilan mashq qiling.",
    ru: "Нет интервьюера и второго дубля: запускается таймер, вы записываете, отправляется. Тренируйтесь с таймером ниже.",
  },
  timed: true,
  questions: [
    {
      id: "tv-1",
      question: {
        en: "Tell us about a time you worked in a team where someone was not contributing. What did you do?",
        uz: "Jamoada kimdir hissa qo‘shmayotgan holatni eslang. Nima qildingiz?",
        ru: "Расскажите о случае, когда в команде кто-то не вносил вклад. Что вы сделали?",
      },
      why: {
        en: "The most common asynchronous prompt. It is scored on structure far more than on the story.",
        uz: "Eng ko‘p uchraydigan asinxron savol. U hikoyadan ko‘ra tuzilma bo‘yicha baholanadi.",
        ru: "Самый частый асинхронный вопрос. Оценивают структуру, а не историю.",
      },
      prepSeconds: 60,
      responseSeconds: 120,
      modelAnswer: [
        {
          en: "Spend the 60 seconds of prep on the four STAR beats in note form. Do not write sentences.",
          uz: "60 soniya tayyorgarlikni STAR ning to‘rt qadamini qayd shaklida yozishga sarflang. Gap yozmang.",
          ru: "Потратьте 60 секунд подготовки на четыре шага STAR в виде заметок. Не пишите предложениями.",
        },
        {
          en: "Open with the outcome, not the setup: \"I reorganised the workload after two weeks, and we submitted on time.\" Then rewind.",
          uz: "Tuzilma bilan emas, natija bilan boshlang: \"Ikki haftadan keyin yuklamani qayta taqsimladim va o‘z vaqtida topshirdik.\" So‘ng orqaga qayting.",
          ru: "Начните с результата, а не с завязки: «Через две недели я перераспределил нагрузку, и мы сдали вовремя». Затем вернитесь назад.",
        },
        {
          en: "Fill the time but stop at 100 seconds. Reviewers penalise trailing off and reward a clear close.",
          uz: "Vaqtni to‘ldiring, lekin 100-soniyada to‘xtang. Baholovchilar cho‘zilib ketishni jazolaydi, aniq yakunni rag‘batlantiradi.",
          ru: "Заполните время, но остановитесь на 100-й секунде. Рецензенты наказывают за угасание и поощряют ясное завершение.",
        },
      ],
    },
    {
      id: "tv-2",
      question: {
        en: "Describe a technical or academic challenge you faced and how you resolved it.",
        uz: "Duch kelgan texnik yoki akademik qiyinchilikni va uni qanday hal qilganingizni tasvirlab bering.",
        ru: "Опишите техническую или академическую трудность и то, как вы её разрешили.",
      },
      why: {
        en: "Screens for self-direction. The recorded format means they are checking whether you can structure a story without help.",
        uz: "Mustaqillikni saralaydi. Yozib olingan format yordamsiz hikoyani tuza olishingizni tekshiradi.",
        ru: "Проверяет самостоятельность. Запись показывает, умеете ли вы выстроить рассказ без подсказок.",
      },
      prepSeconds: 60,
      responseSeconds: 120,
      modelAnswer: [
        {
          en: "Pick a challenge with a visible turning point, not a general difficulty.",
          uz: "Umumiy qiyinchilikni emas, burilish nuqtasi ko‘rinadigan qiyinchilikni tanlang.",
          ru: "Возьмите трудность с явной точкой перелома, а не общую.",
        },
        {
          en: "State what you tried that failed. A story with no failed attempt sounds invented.",
          uz: "Muvaffaqiyatsiz bo‘lgan urinishingizni ayting. Muvaffaqiyatsiz urinishsiz hikoya o‘ylab topilgandek eshitiladi.",
          ru: "Скажите, что вы попробовали и что не сработало. История без провальной попытки звучит выдуманной.",
        },
        {
          en: "Close with the transferable lesson in one sentence. That is what the rubric line rewards.",
          uz: "Ko‘chiriladigan saboqni bir gapda yakunlang. Rubrika qatori aynan shuni rag‘batlantiradi.",
          ru: "Завершите переносимым выводом в одном предложении. Именно это поощряет рубрика.",
        },
      ],
    },
    {
      id: "tv-3",
      question: {
        en: "Why have you chosen this programme, and what will you contribute to the cohort?",
        uz: "Nega aynan bu dasturni tanladingiz va jamoadoshlaringizga nima hissa qo‘shasiz?",
        ru: "Почему вы выбрали эту программу и что привнесёте в группу?",
      },
      why: {
        en: "Closes nearly every asynchronous interview. It is also the prompt where the generic answer is most obvious.",
        uz: "Deyarli har bir asinxron suhbatni yakunlaydi. Shuningdek, umumiy javob eng ko‘p ko‘rinadigan savol.",
        ru: "Завершает почти любое асинхронное интервью. И именно здесь очевиднее всего шаблонный ответ.",
      },
      prepSeconds: 60,
      responseSeconds: 120,
      modelAnswer: [
        {
          en: "Answer the contribution half with something specific you have already done: a study group you ran, a society you built.",
          uz: "Hissa qismini allaqachon qilgan aniq ishingiz bilan javob bering: boshqargan o‘quv guruhi, qurgan jamiyat.",
          ru: "Ответьте на часть о вкладе конкретным уже сделанным: учебная группа, которую вы вели; сообщество, которое создали.",
        },
        {
          en: "Reference one thing only that university has — a lab, a clinic, a named course. One precise detail beats four general ones.",
          uz: "Universitetga xos faqat bitta narsani tilga oling — laboratoriya, klinika, aniq kurs. Bitta aniq tafsilot to‘rtta umumiydan afzal.",
          ru: "Упомяните одну вещь, которая есть только у этого вуза: лаборатория, клиника, конкретный курс. Одна точная деталь лучше четырёх общих.",
        },
        {
          en: "Keep the whole answer inside 110 seconds so you finish with a deliberate sentence, not mid-thought when the timer cuts you off.",
          uz: "Butun javobni 110 soniya ichida saqlang, shunda taymer uzganda fikr o‘rtasida emas, ataylab aytilgan gap bilan yakunlaysiz.",
          ru: "Держите ответ в пределах 110 секунд, чтобы закончить осознанной фразой, а не на полуслове, когда обрежет таймер.",
        },
      ],
    },
  ],
  rubric: [
    {
      en: "Structure — did you reach the result, or drift for the first 30 seconds?",
      uz: "Tuzilma — natijaga yetdingizmi yoki dastlabki 30 soniyada chalg‘idingizmi?",
      ru: "Структура — дошли до результата или 30 секунд растекались?",
    },
    {
      en: "Specificity — numbers, names, dates; not \"many\", \"successfully\", \"various\".",
      uz: "Aniqlik — raqamlar, nomlar, sanalar; \"ko‘p\", \"muvaffaqiyatli\", \"turli\" emas.",
      ru: "Конкретика — числа, имена, даты; не «много», «успешно», «различные».",
    },
    {
      en: "Ownership — what YOU decided, not what the team did.",
      uz: "Mas’uliyat — JAMOA nima qildi emas, SIZ nima qaror qildingiz.",
      ru: "Личный вклад — что решили ВЫ, а не что сделала команда.",
    },
    {
      en: "Pace — finished before the timer, no audible filler while thinking.",
      uz: "Temp — taymerdan oldin tugatdingiz, o‘ylayotganda to‘ldiruvchi tovushlar yo‘q.",
      ru: "Темп — закончили до таймера, без слов-заполнителей.",
    },
    {
      en: "Camera & voice — eyes to the lens, steady volume, no read-aloud intonation.",
      uz: "Kamera va ovoz — ko‘z linzada, barqaror ovoz, o‘qib berish intonatsiyasi yo‘q.",
      ru: "Камера и голос — взгляд в объектив, ровный тон, без интонации чтения.",
    },
  ],
};

export const INTERVIEW_TRACKS: InterviewTrack[] = [
  STEM,
  UK_TUTORIAL,
  EL_YURT_UMIDI,
  EMBASSY_PANEL,
  TIMED_VIDEO,
];

/** Resolve a localized phrase, always falling back to English. */
export function interviewText(value: L | undefined, locale: string): string {
  if (!value) return "";
  const key = (["en", "uz", "ru"] as InterviewTrackLocale[]).includes(locale as InterviewTrackLocale)
    ? (locale as InterviewTrackLocale)
    : "en";
  return value[key] || value.en;
}
