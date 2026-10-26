/**
 * Q&A bank (Uzbek Latin).
 *
 * These are questions we answer from general knowledge and from how our own
 * data is structured — never a "popular question" claim we cannot back with
 * numbers, and never a promise about admission.
 * Proofread list: docs/CHANNEL.md.
 */

export interface QaEntry {
  key: string;
  question: string;
  answer: string;
}

export const QA_BANK: readonly QaEntry[] = [
  {
    key: "qa_documents",
    question: "Ariza uchun qanday hujjatlar kerak bo'ladi?",
    answer:
      "Har bir dastur o'z ro'yxatini belgilaydi. Ko'p hollarda pasport, transkript, til sertifikati, motivatsion xat va tavsiyanoma so'raladi. Aniq ro'yxatni faqat rasmiy e'londa tekshiring.",
  },
  {
    key: "qa_no_ielts",
    question: "Til sertifikatisiz ariza topshirsam bo'ladimi?",
    answer:
      "Bu dasturga bog'liq: ba'zilari tilni boshqa usulda tasdiqlashga ruxsat beradi, ba'zilari sertifikatni majburiy qiladi. Dastur talablarida qaysi biri yozilganini ko'ring.",
  },
  {
    key: "qa_deadline_passed",
    question: "Muddat o'tib ketgan bo'lsa nima qilish kerak?",
    answer:
      "Odatda ariza qabul qilinmaydi. Keyingi qabul davrini yoki shu yo'nalishdagi boshqa dasturlarni ko'rib chiqish foydaliroq.",
  },
  {
    key: "qa_stipend_vs_tuition",
    question: "Kontrakt qoplamasi va stipendiya bir narsami?",
    answer:
      "Yo'q. Kontrakt qoplamasi o'qish to'loviga, stipendiya esa yashash xarajatlariga tegishli. E'londa qaysi biri ko'rsatilganini diqqat bilan o'qing.",
  },
  {
    key: "qa_letter_review",
    question: "Motivatsion xatni kim tekshirib berishi mumkin?",
    answer:
      "O'qituvchi, mentor yoki ingliz tilini yaxshi biladigan tanish. Muhimi — mazmun va faktlar sizniki bo'lib qolishi.",
  },
  {
    key: "qa_apply_early",
    question: "Arizani erta yuborishning foydasi bormi?",
    answer:
      "Ko'p hollarda qabul muddat oxirida emas, ariza to'liq bo'lganda ko'rib chiqiladi. Erta yuborish sizga hujjatlarni tuzatish uchun vaqt qoldiradi.",
  },
];
