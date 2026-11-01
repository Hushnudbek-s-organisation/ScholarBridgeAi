# Scholarship Rewrite Pass 109 — France (2026-10-27)

Rejim: 1 tozalash ↔ 1 qo'shish almashinuvi bo'yicha Pass 109 (Batch 15 dan keyin). Maqsad — Fransiya bo'yicha faol reliability-4 yozuvlarni nolga tushirish.

**Natija: Fransiya reliability-4: 4 → 0.** 3 yozuv qayta yozildi (128, 151, 344), 1 yozuv nafaqaga chiqarildi (52). Global hisoblagichlar: faol **537** (−1), nafaqadagi **171**, faol reliability-4 **42**, kelgusi deadline'lar **183**.

Barcha yagilangan faktlar 2026-10-27 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi (`psl.eu`, `ip-paris.fr`, `sorbonne-universite.fr`). Saqlangan 4 ta eski URL ham 404 qaytardi.

---

## 1. PSL PhD Track Grants — id 128 (Université PSL, Paris) — QAYTA YOZILDI, reliability 10

Rasmiy manba: PSL PhD Tracks sahifasi (`psl.eu/en/education/find-your-curriculum/psl-phd-tracks`) + "Scholarships and grants for graduate students" sahifasi.

- **Dastur**: yuqori tanlovli, butunlay ingliz tilida o'qitiladigan 5 yillik PhD track (2 yil magistratura + 3 yil PhD); har bir qabul qilingan talaba butun muddat davomida moliyalanadi.
- **1-bosqich (magistratura)**: €10,000/yil stipendiya, 2 yil, oyiga €1,000 × 10 oy; qabul bilan birga beriladi, alohida ariza kerak emas.
- **2-bosqich (PhD)**: 3 yillik doktorlik shartnomasi, qonun bo'yicha minimal €2,300/oy brutto maosh (xodim maqomi + benefits).
- Funding tuition/transport/yashash joyini qoplamaydi, ammo milliy tariflar past (€254/yil magistratura, €397/yil doktorantura + ~€105 CVEC); birinchi yil yashash joyi kafolatlanadi (ijara talabada).
- **September 2027 intake**: arizalar **14 Oktabr – 14 Dekabr 2026** (23:59 CET), faqat PSL portali orqali; suhbatlar Yanvar–Mart 2027. 2027 uchun ochiq tracklar: Chemistry, Life Sciences, Astrophysics, Computer Science (Physics, Engineering, Earth Sciences & Biodiversity, Cognitive Sciences ochilmaydi). Status `open`, deadline `2026-12-14`.
- Talablar: bakalavr (180 ECTS) minimal, kirish faqat M1 dan; C1 ingliz tili (TOEFL/IELTS); CV, transkriptlar, 1 betlik maqsad bayoni, 1–2 betlik tadqiqot loyihasi, 2 ta referent.
- **Kodlash**: ikki bosqichli turli summa sababli `award_amount` NULL, `EUR/year/variable`; `degree_levels` Master's+PhD ga tuzatildi (eski yozuv faqat PhD deb noto'g'ri ko'rsatardi); `min_gpa`/`min_ielts` NULL (C1 — sifat darajasi). us 469 sinxron; source 262 joriy sahifaga yo'naltirildi.

## 2. IP Paris PhD Track Excellence Scholarships — id 151 — QAYTA YOZILDI, reliability 10

Rasmiy manbalar: IP Paris PhD Track sahifasi, Scholarships sahifasi va FAQ (`ip-paris.fr`).

- **Dastur**: 5 yillik ingliz tilidagi PhD Track (magistratura + PhD, 420 ECTS), 12 track (Advanced Materials, Bioengineering, Chemistry, CS, Data & AI, Economics, Electrical Engineering, Energy for Climate, Mathematics, Mechanics, Physics, Quantum Science).
- **3 stipendiya turi**: Full Package = €10,000/yil magistratura grant (2 yil) + 3 yillik doktorlik majburiyati (~€82,800 brutto minimal/3 yil); Master's Scholarship = faqat €10,000/yil; Doctoral Package = faqat doktorlik majburiyati.
- Barcha qabul qilinganlar uchun tuition subsidiyalanadi: ~€7,000 dan **€243/yil** (1–2 yillar) va **€380/yil** (3–5 yillar).
- Alohida stipendiya arizasi yo'q: qabul fayllarini jury avtomatik ko'rib chiqadi, IP Paris xabar beradi (aksholda funding waiting list).
- **2027–28**: arizalar **28 Oktabr 2026 – 14 Yanvar 2027**; tekshiruv kuni (27 Oktabr) oynasi ochilishiga 1 kun qolgani uchun status `upcoming`, deadline `2027-01-14`.
- Talablar: bakalavr 180 ECTS (M2 ga to'g'ridan 240 ECTS/magistr bilan mumkin), ingliz tili erkin; 5 tagacha dasturga ariza.
- **Kodlash**: 3 paket + 2 bosqich sababli `EUR/year/variable`, summa NULL; `university_id` mavjud Institut Polytechnique de Paris yozuviga (302) ulandi (oldin NULL) va yangi `university_scholarships` 692 yaratildi; source 2544 Scholarships sahifasiga yo'naltirildi. 604 (oddiy magistratura excellence grantlari) dan alohida sxema ekani notes'da belgilandi.

## 3. Doctoral Contracts (Contrats Doctoraux) at Sorbonne Université — id 344 — QAYTA YOZILDI, reliability 9

Rasmiy manba: Sorbonne doctorate Funding sahifasi (yangilangan 24/07/2025) + doktorlik maktablari sahifalari.

- **Shartnoma**: 3 yillik davlat mehnat shartnomasi (2 oylik sinov), milliy minimal maosh **€2,300 brutto/oy** (2026-01-01 dan; 2025: €2,200). Vaqtna 1/6 qismi o'qitish kabi qo'shimcha missiya uchun (qo'shimcha to'lov).
- Har bir doktorlik maktabi yillik (odatda bahor) tanlov o'tqazadi: laboratoriya mavzulari e'lon qilinadi, nomzod rahbarga murojaat qiladi (ko'plab maktablarda ADUM orqali), har loyihaga 1 nomzod.
- Chet el fuqarolari (mavzusi qabul qilinganlar) bir xilda ariza bera oladi; yosh/diplom yilligi cheklovi yo'q. Laboratoriya va CIFRE moliyalashuvi ham xudi shu shartnoma bilan tuziladi.
- **Kodlash**: `award 2300 EUR/month/fixed` (milliy minimal — pol; notes'da aniq ko'rsatilgan); deadline NULL/`not_published` + rounds'da yillik bahor kompaniyasi patterni; status `upcoming`. Reliability 9 (yagona nomlangan chaqiruv emas, fransiya moliyaviy doctorantura standart kategoriyasi; UZH Candoc yozuvi bilan analog). us 586 sinxron; source 2619 Funding sahifasiga.

## 4. PSL Excellence Scholarship — id 52 — NAFAQAGA CHIQARILDI

- "PSL Excellence Scholarship" nomli yagona mukofot mavjud emas. PSL rasmiy sahifasi magistratura excellence grantlarini **alohida graduate-programme grantlari portfoli** sifatida ko'rsatadi (Chemistry, Engineering ISAI — xalqaro, CS, Mathematics, Finance, Earth, Life Sciences, Religious Studies, Management, Physics ICFP — har biri o'z qiymati/manzili bilan, masalan CS/Math €1,200/oy×10, Finance €12,000/yil) va arizachilarni har dasturning o'z sahifasiga yuboradi.
- Yagona nom ostidagi soyabon direktoriya — bitta stipendiya emas; bitta programmaning grantini tanlab yozuvga aylantirish identity qoidasini buzadi → nafaqaga chiqarildi (tozalash printsipi: Basel/Bern precedentlari).
- Sahifadagi yagona birlashgan instrument — PhD Track Grants (128) da kataloglangan. Dastur-darajadagi grantlar (CS, Math, Finance) kelgusi additions batch uchun nomzodlar.
- us 468 o'chirildi; source 2597 joriy rasmiy overview sahifasiga yo'naltirildi (audit).

---

## Tekshiruvlar

- Supabase read-back: 52 `is_active=false/closed`; 128/151 rel 10, 344 rel 9; sanalar/kodlash tasdiqlandi.
- Hisoblagichlar: faol **537**, nafaqadagi **171**, faol reliability-4 **42**, kelgusi deadline **183**; Fransiya reliability-4 = **0**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor/deadline kiritilmadi; barcha summalar o'qilgan rasmiy sahifalardan.

**Qolgan reliability-4 (42)**: Finland, Sweden 4 tadan; Austria, Denmark, Hong Kong SAR 3; Chile, India, Ireland, Mexico, Norway, Saudi Arabia, UAE 2; yana 11 davlat 1 tadan. Alternatsiya bo'yicha keyingi qadam — Batch 16 (qo'shish), so'ng Pass 110.
