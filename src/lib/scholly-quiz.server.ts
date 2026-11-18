import type { Locale } from "@/i18n/config";

type Text = readonly [uz: string, ru: string, en: string];
type Options = readonly [Text, Text, Text];
type Question = {
  id: string;
  prompt: Text;
  options: Options;
  correctIndex: number;
};

export type QuizQuestion = { id: string; prompt: string; options: readonly string[] };
export type QuizResult = {
  correctCount: number;
  points: number;
  answers: { questionId: string; selectedIndex: number; correctIndex: number }[];
};
export type DailyQuiz = { day: string; questions: QuizQuestion[]; result: QuizResult | null };

// One IELTS word, one admissions term and one visa preparation question per set.
// Question IDs identify a specific version of the question and its option order.
const questionSets: readonly Question[][] = [
  [
    {
      id: "deadline",
      prompt: ["“Deadline” so‘zi nimani anglatadi?", "Что означает слово «deadline»?", "What does “deadline” mean?"],
      options: [
        ["Qabul xati", "Письмо о зачислении", "An offer letter"],
        ["Oxirgi muddat", "Крайний срок", "The final due date"],
        ["Yakuniy imtihon", "Выпускной экзамен", "A final exam"],
      ],
      correctIndex: 1,
    },
    {
      id: "transcript",
      prompt: ["Universitet arizasidagi “transcript” nima?", "Что такое «transcript» в заявлении в вуз?", "What is a transcript in a university application?"],
      options: [
        ["O‘qilgan fan va baholar ro‘yxati", "Выписка с предметами и оценками", "A record of courses and grades"],
        ["Dars jadvali", "Расписание занятий", "A class timetable"],
        ["Tavsiyanoma", "Рекомендательное письмо", "A reference letter"],
      ],
      correctIndex: 0,
    },
    {
      id: "visa-checklist-source",
      prompt: ["Talaba vizasi uchun hujjatlar ro‘yxatini avval qayerdan tekshirasiz?", "Где сначала проверить список документов для студенческой визы?", "Where should you first check the student visa document checklist?"],
      options: [
        ["Ijtimoiy tarmoq izohida", "В комментариях в соцсетях", "In social media comments"],
        ["Do‘stning eski arizasida", "В старой анкете друга", "In a friend’s old application"],
        ["Rasmiy immigratsiya yoki konsullik saytida", "На официальном сайте миграционной службы или консульства", "On the official immigration or consular website"],
      ],
      correctIndex: 2,
    },
  ],
  [
    {
      id: "eligible",
      prompt: ["“Eligible” so‘zi nimani anglatadi?", "Что означает слово «eligible»?", "What does “eligible” mean?"],
      options: [
        ["Hali tekshirilmagan", "Ещё не проверен", "Not yet reviewed"],
        ["To‘liq moliyalashtirilgan", "Полностью финансируется", "Fully funded"],
        ["Talablarga javob beradi", "Соответствует требованиям", "Meets the requirements"],
      ],
      correctIndex: 2,
    },
    {
      id: "prerequisite",
      prompt: ["O‘quv dasturidagi “prerequisite” nima?", "Что значит «prerequisite» в описании программы?", "What is a prerequisite in a programme description?"],
      options: [
        ["Ixtiyoriy to‘garak", "Кружок по выбору", "An optional club"],
        ["Oldindan bajarilishi kerak bo‘lgan shart", "Условие, которое нужно выполнить заранее", "A requirement to satisfy in advance"],
        ["Yotoqxona to‘lovi", "Плата за общежитие", "A housing fee"],
      ],
      correctIndex: 1,
    },
    {
      id: "visa-interview-prep",
      prompt: ["Viza suhbatiga qanday tayyorlanish foydali?", "Как лучше подготовиться к собеседованию на визу?", "How can you prepare for a visa interview?"],
      options: [
        ["O‘qish rejangizni o‘z so‘zlaringiz bilan tushuntirishni mashq qilish", "Потренироваться объяснять свой план учёбы своими словами", "Practise explaining your own study plan in your own words"],
        ["Boshqa odamning javoblarini yodlash", "Заучить чужие ответы", "Memorise someone else’s answers"],
        ["Arizangizdagi ma’lumotlarni ko‘rib chiqmaslik", "Не перечитывать данные из своей анкеты", "Skip reviewing the information in your application"],
      ],
      correctIndex: 0,
    },
  ],
  [
    {
      id: "assess",
      prompt: ["“Assess” so‘zi nimani anglatadi?", "Что означает слово «assess»?", "What does “assess” mean?"],
      options: [
        ["Baholamoq", "Оценивать", "To evaluate"],
        ["Jo‘natmoq", "Отправлять", "To send"],
        ["Kechiktirmoq", "Откладывать", "To delay"],
      ],
      correctIndex: 0,
    },
    {
      id: "intake",
      prompt: ["Universitetdagi “intake” nimani bildiradi?", "Что означает «intake» в университете?", "What does “intake” refer to at a university?"],
      options: [
        ["Grant miqdori", "Размер стипендии", "A scholarship amount"],
        ["Yo‘nalishlar soni", "Число направлений", "The number of majors"],
        ["Yangi talabalar qabuli", "Набор новых студентов", "An incoming group or admission period"],
      ],
      correctIndex: 2,
    },
    {
      id: "visa-appointment-date",
      prompt: ["Viza suhbatining sanasi va vaqtini qayerdan tekshirasiz?", "Где проверить дату и время собеседования на визу?", "Where should you confirm the date and time of a visa interview?"],
      options: [
        ["O‘tgan yilgi blog maqolasidan", "В прошлогодней статье блога", "In last year’s blog post"],
        ["Rasmiy uchrashuv tasdiqnomasidan", "В официальном подтверждении записи", "In the official appointment confirmation"],
        ["Universitetning dars jadvalidan", "В расписании занятий вуза", "In the university timetable"],
      ],
      correctIndex: 1,
    },
  ],
  [
    {
      id: "allocate",
      prompt: ["“Allocate” so‘zi nimani anglatadi?", "Что означает слово «allocate»?", "What does “allocate” mean?"],
      options: [
        ["Ajratmoq yoki taqsimlamoq", "Выделять или распределять", "To set aside or distribute"],
        ["Bekor qilmoq", "Отменять", "To cancel"],
        ["Qayta topshirmoq", "Подавать заново", "To resubmit"],
      ],
      correctIndex: 0,
    },
    {
      id: "office-hours",
      prompt: ["Universitetda o‘qituvchining “office hours” vaqti nimaga mo‘ljallangan?", "Для чего преподаватель в вузе назначает «office hours»?", "What are a university instructor’s office hours for?"],
      options: [
        ["Darsga ro‘yxatdan o‘tish uchun", "Для записи на занятия", "Registering for classes"],
        ["Yotoqxonaga ariza berish uchun", "Для подачи заявления в общежитие", "Applying for housing"],
        ["Talabalar savol berishi va yordam olishi uchun", "Чтобы студенты могли задать вопросы и получить помощь", "For students to ask questions and get help"],
      ],
      correctIndex: 2,
    },
    {
      id: "visa-document-translation",
      prompt: ["Viza hujjatiga tarjima kerakligini qanday aniqlaysiz?", "Как узнать, нужен ли перевод документа для визы?", "How can you find out whether a visa document needs a translation?"],
      options: [
        ["Hujjat rangiga qarab", "По цвету документа", "By looking at the document’s colour"],
        ["Arizangizga tegishli rasmiy ro‘yxatdan", "По официальному списку для вашей категории заявления", "By checking the official instructions for your application"],
        ["Do‘stingiz boshdan kechirgan jarayonga qarab", "По опыту друга", "By following a friend’s experience"],
      ],
      correctIndex: 1,
    },
  ],
  [
    {
      id: "coherent",
      prompt: ["“Coherent” javob qanday bo‘ladi?", "Каким будет «coherent» ответ?", "What is a “coherent” answer like?"],
      options: [
        ["Juda uzun", "Очень длинный", "Very long"],
        ["Mantiqan bog‘langan va tushunarli", "Логичный и понятный", "Logical and easy to follow"],
        ["Faqat misollardan iborat", "Состоит только из примеров", "Made up entirely of examples"],
      ],
      correctIndex: 1,
    },
    {
      id: "elective",
      prompt: ["Universitetda “elective” nima?", "Что такое «elective» в университете?", "What is an “elective” at university?"],
      options: [
        ["Talaba tanlashi mumkin bo‘lgan fan", "Дисциплина по выбору студента", "A course the student can choose"],
        ["O‘qishga kirish imtihoni", "Вступительный экзамен", "An entrance exam"],
        ["Majburiy amaliyot", "Обязательная практика", "A mandatory internship"],
      ],
      correctIndex: 0,
    },
    {
      id: "visa-interview-mismatch",
      prompt: ["Viza arizasini yuborishdan oldin ikkita hujjatda ism yozilishi farq qilsa, nima qilasiz?", "Что делать перед отправкой заявления, если имя в двух документах написано по-разному?", "Before submitting a visa application, what should you do if two documents spell your name differently?"],
      options: [
        ["Faqat qisqa ism ishlatasiz", "Использовать только сокращённое имя", "Use only a shortened name"],
        ["Farqni yashirish uchun hujjatni tahrirlaysiz", "Отредактировать документ, чтобы скрыть различие", "Edit the document to hide the difference"],
        ["Rasmiy yo‘riqnomani tekshirib, kerak bo‘lsa hujjatni bergan tashkilotga murojaat qilasiz", "Проверить официальные инструкции и при необходимости связаться с выдавшей документ организацией", "Check the official instructions and contact the issuing organisation if needed"],
      ],
      correctIndex: 2,
    },
  ],
  [
    {
      id: "substantial",
      prompt: ["“Substantial increase” qanday o‘sishni bildiradi?", "Какой рост означает «substantial increase»?", "What kind of increase is a “substantial increase”?"],
      options: [
        ["Sezilarli o‘sish", "Значительный рост", "A considerable increase"],
        ["Juda oz o‘sish", "Очень небольшой рост", "A very slight increase"],
        ["Vaqtinchalik pasayish", "Временное падение", "A temporary decrease"],
      ],
      correctIndex: 0,
    },
    {
      id: "conditional-offer",
      prompt: ["Qabul xatidagi “conditional offer” nimani anglatadi?", "Что означает «conditional offer» в письме о зачислении?", "What is a “conditional offer” in university admissions?"],
      options: [
        ["Ariza rad etilgan", "Заявление отклонено", "The application was rejected"],
        ["Qabul uchun xatda ko‘rsatilgan shartlarni bajarish kerak", "Для зачисления нужно выполнить указанные условия", "You must meet the stated conditions to be admitted"],
        ["Talabaga stipendiya tayinlangan", "Студенту назначена стипендия", "The student was awarded a scholarship"],
      ],
      correctIndex: 1,
    },
    {
      id: "visa-upload-confirmation",
      prompt: ["Viza arizasini yuborgach, qaysi ma’lumotni saqlash foydali?", "Что полезно сохранить после подачи визового заявления?", "What is useful to keep after submitting a visa application?"],
      options: [
        ["Qidiruv sahifasining rasmi", "Скриншот страницы поиска", "A screenshot of a search page"],
        ["Ijtimoiy tarmoqdagi maslahat", "Совет из социальных сетей", "A tip from social media"],
        ["Ariza tasdiqnomasi va murojaat raqami", "Подтверждение подачи и номер заявления", "The submission confirmation and application reference number"],
      ],
      correctIndex: 2,
    },
  ],
  [
    {
      id: "constraint",
      prompt: ["“Constraint” so‘zi nimani anglatadi?", "Что означает слово «constraint»?", "What does “constraint” mean?"],
      options: [
        ["Qo‘shimcha imkoniyat", "Дополнительная возможность", "An extra opportunity"],
        ["Cheklov", "Ограничение", "A limit or restriction"],
        ["Yakuniy natija", "Итоговый результат", "A final result"],
      ],
      correctIndex: 1,
    },
    {
      id: "defer-admission",
      prompt: ["Universitet qabulini “defer” qilish nimani bildiradi?", "Что означает «defer» в контексте зачисления?", "What does it mean to “defer” admission?"],
      options: [
        ["Yo‘nalishni o‘zgartirish", "Сменить специальность", "Change your major"],
        ["Ariza nusxasini olish", "Получить копию заявления", "Get a copy of the application"],
        ["O‘qishni boshlashni keyingi davrga ko‘chirish", "Перенести начало учёбы на более поздний срок", "Postpone the start of your studies"],
      ],
      correctIndex: 2,
    },
    {
      id: "visa-funding-interview",
      prompt: ["Suhbatda o‘qish xarajatlari haqida so‘rashsa, qanday javob foydali?", "Как лучше ответить на вопрос о расходах на обучение на собеседовании?", "What is a useful way to answer a visa interview question about study costs?"],
      options: [
        ["Arizadagi haqiqiy xarajatlar va ularni qanday qoplashingizni tushuntirish", "Объяснить реальные расходы из заявления и способ их оплаты", "Explain the actual costs in your application and how you plan to cover them"],
        ["Boshqa talabaning budjetini takrorlash", "Повторить бюджет другого студента", "Repeat another student’s budget"],
        ["Har safar boshqa raqam aytish", "Каждый раз называть другую сумму", "Give a different figure each time"],
      ],
      correctIndex: 0,
    },
  ],
];

export function questionsForDay(day: string) {
  const daysSinceEpoch = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 86_400_000);
  const index = ((daysSinceEpoch % questionSets.length) + questionSets.length) % questionSets.length;
  return questionSets[index];
}

export function publicQuiz(day: string, locale: Locale, result: QuizResult | null): DailyQuiz {
  const language = { uz: 0, ru: 1, en: 2 }[locale];
  // Keep completed quizzes paired with their original questions when the bank grows.
  const submittedIds = result?.answers.map(({ questionId }) => questionId);
  const originalSet = submittedIds && questionSets.find(
    (set) => set.length === submittedIds.length && set.every(({ id }, index) => id === submittedIds[index]),
  );
  const questions = (originalSet ?? questionsForDay(day)).map(({ id, prompt, options }) => ({
    id, prompt: prompt[language], options: options.map((label) => label[language]),
  }));
  return { day, questions, result };
}

export function gradeQuiz(day: string, submission: unknown): QuizResult | null {
  const questions = questionsForDay(day);
  if (!Array.isArray(submission) || submission.length !== questions.length) return null;

  const answers: QuizResult["answers"] = [];
  for (const [index, question] of questions.entries()) {
    const answer: unknown = submission[index];
    if (!answer || typeof answer !== "object" || !("questionId" in answer) || !("selectedIndex" in answer)
        || answer.questionId !== question.id || typeof answer.selectedIndex !== "number"
        || !Number.isInteger(answer.selectedIndex) || answer.selectedIndex < 0
        || answer.selectedIndex >= question.options.length) return null;
    answers.push({ questionId: question.id, selectedIndex: answer.selectedIndex, correctIndex: question.correctIndex });
  }
  const correctCount = answers.filter((answer) => answer.selectedIndex === answer.correctIndex).length;
  return { correctCount, points: correctCount === questions.length ? 8 : 5, answers };
}
