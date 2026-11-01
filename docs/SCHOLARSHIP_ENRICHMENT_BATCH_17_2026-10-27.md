# Scholarship Enrichment Batch 17 — Finland additions (2026-10-27)

Rejim: 1 tozalash ↔ 1 qo'shish almashinuvi bo'yicha Batch 17 (Pass 110 dan keyin), Batch 15/16 naqshi bo'yicha — tozalash paytida ko'rilgan / klasterni to'ldiradigan Finlandiya sxemalari.

**Natija: 3 ta yangi yozuv (964–966).** Hisoblagichlar: faol **542** (+3), nafaqadagi 172, faol reliability-4 38 (o'zgarmadi), kelgusi deadline **184** (+1 — LUT rolling admission 2027-03-31).

Barcha faktlar 2026-10-27 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi (`aalto.fi`, `tuni.fi`, `lut.fi`, `elut.lut.fi`). Ish boshlanishida sandbox git reset aniqlandi (HEAD `b6085bb`, 60 ta untracked fayl) — barchasi origin blob'lari bilan baytma-bayt bir xil ekani `cmp` orqali tasdiqlangach, `git reset --hard origin/arena/a496ffaa-scholarbridgeai` (`4be62ab`) qo'llandi.

---

## 1. LUT University Early Bird Discount and Progress Scholarships — id 964 (reliability 10)

Rasmiy manbalar: LUT magistratura sahifasi, "Discounts for master's programmes" sahifasi, eLUT "Scholarship for Bachelor's studies" sahifasi.

- **Magistratura** (to'lov €15,000/yil): Early Bird **€5,000** — joy ni qabul qilib, qolgan €10,000 ni qabul e-pochtasidan keyin **21 kun** ichida to'lasa; 2-yil **€5,000** stipendiya — 1-yilda shaxsiy reja bo'yicha ≥60 ECTS (transkriptda 31 iyulgacha) + to'lov o'z vaqtida; **avtomatik** tekshiriladi, ariza yo'q.
- **Bakalavr** (€12,000/yil): 1-yilda early bird varianti; 2026-intake uchun 2- va 3-yillarga **€3,000** dan avtomatik chegirma (60 / 120 ECTS; 1 semestr o'qigan bo'lsa 30 ECTS; avgustda tekshiriladi). Eskiroq intakelarning 50% stavkalari yangi qabulga taalluqli emas — ishlatilmadi.
- **Deadline**: magistratura rolling admission **2026-10-01 → 2027-03-31**, hozir **ochiq** → `2027-03-31/fixed/open`. Partner/joint dasturlarda alohida siyosat. Fulbright–LUT (AQSh fuqarolari) yozuvga kiritilmadi.
- **Kodlash**: NULL `EUR/year/variable` (daraja/yil bo'yicha turli qat'iy summalar); bakalavr early bird summasi tasdiqlanmagani uchun summasiz tilga olindi. `university_id` NULL (katalogda LUT universitet yozuvi yo'q — kelgusi vazifa). Source 3100.

## 2. Tampere University Tuition Fee Scholarships and Early Bird Offer — id 965 (reliability 10)

Rasmiy manbalar: TAU "Tuition Fees and Scholarships" sahifasi (2027 qabul nashri) + Student's Guide "2026 yoki keyin qabul qilinganlar" sahifasi.

- **Tuition fee scholarship (qabulda)**: to'lovning **50%** i butun dastur muddatiga (normativ muddat, qatnashgan semestrlar bo'yicha); Studyinfo arizasi ichida so'raladi; juda selektiv — **2026 qabulda barcha B+M dasturlar bo'yicha jami 9 ta** berilgan; barcha dasturlarda ham berilmaydi. Plagiat → ogohlantirish/bekor qilish.
- **Early bird**: stipendiya olmagan to'lovli talabalar uchun 1-yil to'lovida **€2,000** (joy ni qabul qilib, 21 kun ichida to'lasa). **Graduation Scholarship**: TAU bakalavrini 3 yilda bitirganlarga magistratura 1-yilida €2,000.
- To'lovlar (2027): bakalavr €10,000, magistr €12,000 → 50% = €5,000–6,000/yil.
- **Kodlash**: NULL `EUR/year/variable`; deadline NULL/`not_published` + yillik Studyinfo naqshi; status `upcoming`. `university_id` NULL (TAU yozuvi yo'q — vazifa). Source 3101. 2026 dan oldingi sxemalar (International Advancement, Finland Scholarships 2022–24) alohida kohortalar — ishlatilmadi.

## 3. Pekka Mattila Excellence Scholarship (Aalto University School of Business) — id 966 (reliability 10)

Rasmiy manba: Aalto "Scholarships and Tuition Fees" sahifasidagi alohida bo'lim (Pass 110 da 405 ni qayta yozishda payqalgan nomzod).

- Pekka Mattila xotirasiga atalgan sxema: Marketing yoki International Management magistraturasiga kirgan to'lovli, ayniqsa iqtidorli talabalar uchun **bir martalik €3,000** ko'chish granti (ro'yxatdan o'tgandan keyin 1-yilda Finlyandiya/SEPA hisobiga).
- Ariza — magistratura shaklining o'zida, qabul davrida; tanlov dasturlar mezonlari bo'yicha qabul jarayonida; natija qabul xabarlari haftasida. Yosh/millat/jins cheklovi yo'q.
- **405** (Aalto Excellence to'liq waiver) bilan bir vaqtda olib bo'lmaydi (ikkalasiga ham ariza berish mumkin).
- **Kodlash**: 3000 `EUR/one_time/fixed`; deadline NULL/`not_published`; Universitet 103 (Aalto) ulandi, us 696; mavjud tasdiqlangan source 2476 ga bog'landi (yangi manba kerak bo'lmadi).

---

## Tekshiruvlar

- Supabase read-back: uchala yozuv rel 10; bog'lanishlar 964→3100, 965→3101, 966→2476; us 696→966.
- Hisoblagichlar: faol **542**, nafaqadagi 172, faol reliability-4 38, kelgusi deadline **184**; max IDlar: 966/3101/696.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337 (reset sabab `npm ci` qayta bajarildi).
- Uydirma miqdor/deadline kiritilmadi; eski kohorta shartlari yangi qabulga ko'chirilmadi.

**Kelgusi vazifalarга qo'shildi**: Tampere University va LUT University universitet yozuvlarini yaratib 965/964 ni backlink qilish. Alternatsiya bo'yicha keyingi qadam — **Pass 111** (tozalash; Shvetsiya, 4 ta rel-4). Qolgan reliability-4 (38): Shvetsiya 4; Avstriya/Daniya/Gonkong SAR 3; 7 davlat 2; 11 davlat 1.
