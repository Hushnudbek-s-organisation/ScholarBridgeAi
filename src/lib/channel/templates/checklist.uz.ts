/**
 * Checklist bank (Uzbek Latin). Short, actionable items — a checklist the
 * reader can actually tick, not a second essay.
 * Proofread list: docs/CHANNEL.md.
 */

export interface ChecklistEntry {
  key: string;
  title: string;
  items: string[];
}

export const CHECKLIST_BANK: readonly ChecklistEntry[] = [
  {
    key: "check_two_weeks_before",
    title: "Ariza topshirishdan 2 hafta oldin",
    items: [
      "Pasportning amal qilish muddatini tekshirdim",
      "Transkript va diplom nusxalarini tayyorladim",
      "Til sertifikatini yuklab oldim",
      "Motivatsion xatni yakuniy o'qib chiqdim",
      "Tavsiyanoma yuborilganini tasdiqladim",
      "Ariza formasini sinov rejimida to'ldirib ko'rdim",
    ],
  },
  {
    key: "check_ielts_day",
    title: "Ingliz tili imtihonidan oldin",
    items: [
      "Pasportni va tasdiq xatini oldim",
      "Imtihon manzilini va yetib borish vaqtini tekshirdim",
      "Oldingi kuni ertaroq uxlashni rejalashtirdim",
      "Suv va yengil taom olib bordim",
      "Telefonni jim rejimga o'tkazdim",
    ],
  },
  {
    key: "check_motivation_letter",
    title: "Motivatsion xatni tekshirish",
    items: [
      "Dastur nomi va universitet nomi to'g'ri yozilgan",
      "Har bir da'vo aniq fakt bilan tasdiqlangan",
      "Grammatika tekshirilgan",
      "Matn bir sahifadan oshmagan",
      "Fayl nomi talab qilingan formatda",
    ],
  },
  {
    key: "check_recommendation_ask",
    title: "Tavsiyanoma so'rashdan oldin",
    items: [
      "Kimdan so'rashni tanladim",
      "Muddatni aniq aytdim",
      "Dastur va yo'nalish haqida qisqa ma'lumot berdim",
      "Yuborish usulini (sayt yoki email) tushuntirdim",
      "Minnatdorchilik xatini yuborishni rejalashtirdim",
    ],
  },
  {
    key: "check_documents_folder",
    title: "Hujjatlar papkasi",
    items: [
      "Pasport skani (PDF)",
      "Transkript va diplom",
      "Til sertifikati",
      "Rezyume",
      "Motivatsion xat",
      "Tavsiyanoma nusxasi",
    ],
  },
  {
    key: "check_interview_prep",
    title: "Onlayn suhbatga tayyorgarlik",
    items: [
      "Internet aloqasini sinab ko'rdim",
      "Kamera va mikrofonni tekshirdim",
      "Orqa fon va yorug'likni tayyorladim",
      "«Nega bu dastur?» savoliga qisqa javob yozdim",
      "Suhbatdan 10 daqiqa oldin tayyor bo'ldim",
    ],
  },
];
