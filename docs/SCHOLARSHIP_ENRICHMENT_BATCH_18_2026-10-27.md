# Scholarship Enrichment Batch 18 — Sweden additions (2026-10-27)

Rejim: Pass 111 dan keyin navbatdagi qo'shish bosqich. Uchala sxema ham Pass-111 tadqiqotida (`kth.se` umumiy sahifasi va `gu.se` Axel Adler sahifasi) ko'rinib qolgan, katalogda hali bo'lmagan **nomlangan** sxemalar. Barchasi 2026-10-27 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi, reliability 10.

**Natija:** +3 yozuv (967–969) → faol **543**, nafaqadagi **174**, faol reliability-4 **34**, kelgusi deadline'lar **187**.

---

## 1. Axel Adler Scholarship for Sustainability — id 967 (Gothenburg, university 136)

Rasmiy manba: GU Axel Adler sahifasidagi alohida bo'lim + FAQ (mavjud source 2533 bog'landi; us 697).

- Asosiy Axel Adler (739) arizasining **ichidagi** qo'shimcha mukofot: faqat **sustainability-focused magistr** dasturlariga; ikkalasiga ham mos kelsangiz bitta arizada topshirasiz. Faqat **2–12 talaba** — asosiy sxemadan (har dasturga 1 ta) ancha selektiv.
- Talablar: umumiy Axel Adler 2027 + maxsus sustainability talablari; **bakalavr dasturlari va masofaviy Education for Sustainable Development magistri kirmaydi**.
- Raund: 1-tanlov ariza **2027-01-15** gacha; to'lov + hujjatlar 1 fevralgacha; taklif ~10 fevral; natijalar 12 aprel (magistr). Tanlov: tizim ichida yoziladigan CV + motivatsiya xati (har biri ≤3000 belgi).
- Kodlash: deadline `2027-01-15/fixed`, `upcoming`, NULL `SEK/year/variable` (to'liq waiver; qiymat dastur to'loviga bog'liq). Saqlab qolish: semestr kreditlarining ≥75%.

## 2. KTH One-Year Scholarship — id 968 (KTH, university 86)

Rasmiy manba: KTH One-Year Scholarship sahifasi (source 3102; us 698).

- Faqat **joriy** birinchi kurs talabalariga: 2 yillik magistraturaning **ikkinchi yili to'lovini to'liq waiver** qiladi — birinchi yildagi a'lo natijalar evaziga. 2025 da **5%** (220 dan 12) nominatsiya qilingan.
- Ariza har yili **1–15 aprel** (birinchi o'quv yilida); tanlov birinchi yil baholariga ko'ra. Qo'shma/EIT dasturlari kirmaydi.
- Kodlash: deadline NULL/`not_published` (yillik 1–15 aprel oyna rounds JSON'da), `upcoming`, NULL `SEK/year/variable`.

## 3. KTH Joint Programme Scholarship — id 969 (KTH, university 86)

Rasmiy manba: KTH Joint Programme Scholarship sahifasi (source 3103; us 699).

- 5 nomlangan qo'shma dasturda KTH da 1–2 semestr o'tkazadigan to'lovchi talabalar uchun **KTH davridagi to'lovni qoplaydi**: COSSE, DENSYS (Erasmus Mundus/konsorsium stipendiatlari emas), EIT Digital (1/3-semestr KTH da), Innovative Sustainable Energy Engineering (Nordic Five Tech), Transport Mobility and Innovation (EIT Urban Mobility). 2025 da **3%** (62 dan 2).
- MTLS/Biostatistics → KTH Scholarship (325); Mathematics → Stockholm University orqali. Ro'yxatda bo'lmagan EIT va Erasmus Mundus egalariga yopiq.
- Ariza **1–15 aprel**; kodlash: NULL/`not_published`, `upcoming`, NULL `SEK/year/variable`.

---

## Yon yozuvlar va tekshiruvlar

- Manbalar: 3102 (One-Year), 3103 (Joint); bog'lanmalar 967→2533, 968→3102, 969→3103; `university_scholarships` 697–699; ketma-ketliklar yangilandi (max ID: stipendiyalar 969, manbalar 3103, us 699).
- Supabase read-back: uchalasi ham rel 10, `upcoming`; 967 deadline `2027-01-15`.
- Hisoblagichlar: faol **543**, nafaqadagi **174**, faol reliability-4 **34**, kelgusi deadline **187**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor/deadline kiritilmadi (KTH sahifalari yillik oyna beradi — yagona sana o'ylab topilmadi).

**Keyingi qadam:** Pass 112 (tozalash) — qolgan 34 ta reliability-4 dan navbatdagi klaster (Avstriya / Daniya / Gonkong SAR — 3 tadan). KTH India Scholarship (Hindiston fuqarolariga) qizg'in auditoriya profili tufayli bu safar kiritilmadi — kelgusi nomzod sifatida qoldi.
