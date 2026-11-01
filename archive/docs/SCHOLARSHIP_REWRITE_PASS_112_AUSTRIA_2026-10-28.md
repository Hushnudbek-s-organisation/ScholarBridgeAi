# Scholarship Rewrite Pass 112 — Austria (2026-10-28)

Rejim: 1 tozalash ↔ 1 qo'shish almashinuvi bo'yicha Pass 112 (Batch 18 dan keyin). Maqsad — Avstriya bo'yicha faol reliability-4 yozuvlarni nolga tushirish.

**Natija: Avstriya reliability-4: 3 → 0.** 1 yozuv qayta yozildi (432), 2 yozuv nafaqaga chiqarildi (378, 431). Global hisoblagichlar: faol **541** (−2), nafaqadagi **176**, faol reliability-4 **31**, kelgusi deadline'lar **187** (o'zgarmadi).

Ikkalasining ham saqlangan URL'lari o'lik chiqdi (dok29 subdomani umuman javob bermaydi; TU Wien va Innsbruck sahifalari 404) — qarorlar 2026-10-28 kuni chaqirilgan joriy rasmiy sahifalar asosida qabul qilindi.

---

## 1. Doctoral Scholarship of the University of Innsbruck — id 432 — QAYTA YOZILDI, reliability 10

Rasmiy manba: `uibk.ac.at/en/research/research-funding/phd/doctoral-scholarship/` (joriy "3rd tranche 2026" e'loni). 2024-yil 15-martdan universitetning ikkita oldingi doktorantura dasturi shu **bitta** sxemaga birlashtirilgan — shuning uchun bitta to'liq yozuv to'g'ri.

- **Shakli**: oyiga **€1,150**, maksimum **24 oy** (har 6 oyda rahbar tasdig'idagi taraqqiyot hisoboti bilan davom ettiriladi; 2 martagacha ≤6 oylik tanaffus mumkin). "Start-up/interim/bridge/final" moliyalashtirish.
- **Kim uchun**: Innsbrukda muntazam talaba sifatida ro'yxatda bo'lgan, dissertatsiyasi ro'yxatdan o'tgan doktorantlar (shu jumladan doktorlik kollejlari a'zolari); a'lo o'zlashtirish (me'yoriy muddat + 2 tolerance semestr) yoki ilmiy yutuqlar. Kamida 50% mablag' ayollarga yo'naltirilishi maqsad qilingan.
- **Shartlar**: stipendiya davrida universitetda ishlash taqiqlanadi; tashqarida haftasiga >15 soat ishlash bekor qilishga olib keladi; to'lov faqat SEPA orqali.
- **Raund**: 2026-yil 3-transformasi 24 avgust–9 oktyabrda yopilgan; qarorlar dekabr 2026, keyingi e'lon 2026 oxiri / 2027 boshi.
- **Kodlash**: `1150 EUR/month/fixed`; deadline NULL/`not_published`, status `upcoming`; `university_id` NULL qoldirildi (bazada Innsbruck universiteti yozuvi yo'q — yaratish/bog'lash kelgusi vazifa). Source 2649 jonli sahifaga yo'naltirildi; us yozuvi yo'q edi.

## 2. Vienna Doctoral Schools (Dok29) Funding Grant — id 378 — NAFAQAGA CHIQARILDI (uydirilgan nom)

- `dok29.univie.ac.at` o'lik; "Dok29" nomli hech qanday instrument rasmiy sahifalarda yo'q. Vienna Doctoral Schools — bitta grant emas, ~11 ta alohida doktorlik maktablari federatsiyasi.
- Eng yaqin tarixiy markaziy sxema — **uni:docs fellowship** — hozir rasmiy sahifalarda faqat o'tgan zamonda tasvirlanadi va sahifasi 404 (alohida e'lon sifatida tugatilgan). Joriy model: e'lon qilinadigan **PraeDoc pozitsiyalari** va maktab darajasidagi rekrutment e'lonlari (doktorat portalining o'zi careers.univie.ac.at ga yo'naltiradi) — ya'ni ish o'rinlari, ushbu yozuv da'vo qilgan yagona "funding grant" emas.
- Uydirma nomdagi yozuvni boshqa sxemaga aylantirib bo'lmaydi → pensiya. us 121 o'chirildi; source 2672 doktorat portaliga yo'naltirildi (audit uchun).

## 3. TU Wien Doctoral College Grants — id 431 — NAFAQAGA CHIQARILDI (katalog/direktoriya)

- Jonli rasmiy sahifa (~25 joriy + tugallanganlar ro'yxati) — har biri o'z konsorsiumi, o'z e'lonlari va qoidalari bilan ishlaydigan alohida tematik kollejlardan iborat **direktoriya**. Umumiy miqdor/deadline/talablar to'plami mavjud emas; hatto nomzodlar kollejga moliyalashtirilmasdan ham biriktirilishi mumkinligi sahifada qayd etilgan.
- Direktoriyani bitta stipendiya sifatida ko'rsatish talabalarni chalg'itadi → pensiya. us 631 o'chirildi; source 2633 rasmiy direktoriya sahifasiga yo'naltirildi.

---

## Tekshiruvlar

- Supabase read-back: 432 rel 10, `€1,150/month`, `upcoming`; 378/431 `is_active=false/closed`.
- Hisoblagichlar: faol **541**, nafaqadagi **176**, faol reliability-4 **31**, kelgusi deadline **187**; Avstriya reliability-4 = **0**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor/deadline kiritilmadi (Innsbruck keyingi e'loni faqat "late 2026/early 2027" deb e'lon qilingan — sana o'ylab topilmadi).

**Qolgan reliability-4 (31)**: Daniya, Gonkong SAR 3 tadan; Chili, Hindiston, Irlandiya, Meksika, Norvegiya, Saudiya Arabistoni, BAA 2 tadan; yana 11 davlat 1 tadan. Alternatsiya bo'yicha keyingi qadam — **Batch 19** (qo'shish), so'ng Pass 113.
