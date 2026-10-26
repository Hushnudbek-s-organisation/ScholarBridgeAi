/**
 * Tip bank (Uzbek Latin). Every entry is advice we can stand behind — no
 * statistics, no success rates, no "do this and you will be admitted".
 *
 * The planner cycles through the bank and never repeats a key within the
 * rotation window, so adding an entry immediately adds variety.
 * Proofread list: docs/CHANNEL.md.
 */

export interface TipEntry {
  key: string;
  title: string;
  body: string[];
}

export const TIP_BANK: readonly TipEntry[] = [
  {
    key: "tip_motivation_letter",
    title: "Motivatsion xat: nimadan boshlash kerak",
    body: [
      "«Nega aynan siz?» savoliga uchta aniq fakt bilan javob bering: o'qigan yo'nalishingiz, qilgan loyihangiz va kelajakdagi rejangiz.",
      "Umumiy gaplar («mehnatkashman», «maqsadim bor») joy egallaydi, lekin hech narsani isbotlamaydi. Sana, raqam va natija yozing.",
      "Yozib bo'lgach ovoz chiqarib o'qing: ikki daqiqada aytib bera olmasangiz, matn hali uzun.",
    ],
  },
  {
    key: "tip_recommendation_source",
    title: "Tavsiyanoma: kimdan so'rash kerak",
    body: [
      "Sizni darsda yoki ishda ko'rgan odamdan so'rang — u aniq misol keltira oladi.",
      "So'rovda muddatni, qaysi dastur uchun ekanini va nima uchun aynan shu dasturni tanlaganingizni yozing. Bu tavsiya yozayotgan odamga vaqt tejaydi.",
      "Tavsiyanoma matnini o'zingiz yozib bermang: faqat faktlarni eslatib qo'ying.",
    ],
  },
  {
    key: "tip_ielts_routine",
    title: "Ingliz tili: har kungi kichik mashq",
    body: [
      "Har kuni 25 daqiqa: 10 daqiqa o'qish, 10 daqiqa tinglash, 5 daqiqa yangi so'zlarni yozish. Kundalik rejim bir martalik uch soatdan foydaliroq.",
      "Yozma javoblaringizni saqlab boring — ikki haftada qanday o'zgarganini o'zingiz ko'rasiz.",
      "Gapirishni ovoz yozib oling: xatolarni eshitish eng tez usul.",
    ],
  },
  {
    key: "tip_deadline_tracking",
    title: "Muddatlarni bitta joyda saqlang",
    body: [
      "Har bir dasturning muddatini bitta ro'yxatga yozing: sana, vaqt mintaqasi va kerakli hujjatlar bilan.",
      "Hujjatlarni muddatdan 10 kun oldin yuborishni rejalashtiring — qabul saytlari oxirgi kunlarda sekinlashadi.",
    ],
  },
  {
    key: "tip_documents_scan",
    title: "Hujjatlarni skanerlash tartibi",
    body: [
      "Barcha hujjatlarni PDF qilib skanerlang; fayl nomida hujjat turi va familiyangiz bo'lsin.",
      "Asl nusxalarni alohida saqlang: ba'zi dasturlar keyinchalik tasdiqlangan nusxani so'raydi.",
    ],
  },
  {
    key: "tip_budget_plan",
    title: "Byudjet: nimalarni hisobga olish kerak",
    body: [
      "Yashash xarajatlarini shahar bo'yicha hisoblang: ijara, transport, oziq-ovqat.",
      "Bank komissiyasi, viza va sug'urta to'lovlarini ham byudjetga qo'shing.",
      "Stipendiya barcha xarajatni qoplamasligi mumkin — e'londa nima ko'rsatilganini tekshiring.",
    ],
  },
  {
    key: "tip_verify_listing",
    title: "E'lonni tekshirish: uchta savol",
    body: [
      "Ma'lumot rasmiy saytda ham bormi?",
      "Muddat qaysi qabul yiliga tegishli?",
      "Talablar va hujjatlar ro'yxati e'londagi bilan mos keladimi?",
      "Bu savollarga javob topmasangiz, ariza to'lovini to'lashdan oldin to'xtang.",
    ],
  },
];
