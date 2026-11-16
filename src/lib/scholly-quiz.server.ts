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
];

export function questionsForDay(day: string) {
  const daysSinceEpoch = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 86_400_000);
  const index = ((daysSinceEpoch % questionSets.length) + questionSets.length) % questionSets.length;
  return questionSets[index];
}

export function publicQuiz(day: string, locale: Locale, result: QuizResult | null): DailyQuiz {
  const language = { uz: 0, ru: 1, en: 2 }[locale];
  const questions = questionsForDay(day).map(({ id, prompt, options }) => ({
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
