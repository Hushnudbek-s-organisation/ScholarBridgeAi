# Scholarship Rewrite Pass 111 — Sweden (2026-10-27)

Rejim: 1 tozalash ↔ 1 qo'shish almashinuvi bo'yicha Pass 111 (Batch 17 dan keyin). Maqsad — Shvetsiya bo'yicha faol reliability-4 yozuvlarni nolga tushirish.

**Natija: Shvetsiya reliability-4: 4 → 0.** 2 yozuv qayta yozildi (325, 421), 2 yozuv dublikat sifatida nafaqaga chiqarildi (422, 423). Global hisoblagichlar: faol **540** (−2), nafaqadagi **174**, faol reliability-4 **34**, kelgusi deadline'lar **186** (+2).

Barcha faktlar 2026-10-27 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi (`kth.se`, `chalmers.se` + Scholarship Regulations PDF, `su.se`, `gu.se`). Saqlangan KTH va Chalmers URL'lari 404 qaytardi — joriy sahifalar topildi.

---

## 1. KTH Scholarship — id 325 — QAYTA YOZILDI, reliability 10

Rasmiy manbalar: KTH Scholarship sahifasi (yangi `/admissions/` manzilida) + stipendiya imkoniyatlari umumiy sahifasi.

- **Shakli**: 1–2 yillik magistraturaning **to'liq tuition to'lovi** (2-yil 1-yil natijalariga bog'liq); yashash mablag'i yo'q. 2026 da qabul qilingan stipendiya arizachilarining **9%** i (718 dan 65) nominatsiya qilingan.
- **Muhim qoida**: KTH `universityadmissions.se` da **birinchi ustuvorlik** bo'lishi shart (2/3/4-ustuvorliklarga berilmaydi), ariza to'lovi to'langan bo'lsin.
- Dasturlar: 2 yili KTH da o'tadigan magistraturalarning barchasi + Molecular Techniques in Life Science, Biostatistics and Data Science (qo'shma) + Architectural Lighting Design (1 yillik). Erasmus+/EIT qo'shma dasturlar **kirmaydi** (ular uchun alohida KTH Joint Programme Scholarship; yana One-Year va India sxemalari mavjud).
- Tanlov: baholar, bakalavr universiteti reytingi, tadqiqot/nashr/ish tajribasi/mukofotlar, barqaror rivojlanish motivatsiyasi.
- **Kodlash**: deadline `2027-01-15` (milliy birinchi raundning dastur arizasi muddati; hujjatlar 1 fevralgacha), status `upcoming` (stipendiya shaklining ochilishi bugun ko'rinmadi — dastur arizasining o'zi ochiq, matnda ikki bosqich tushuntirilgan). NULL `SEK/year/variable`. us 83, source 2557 yangi sahifaga.

## 2. Chalmers Master's Scholarships (Avancez, IPOET, Adlerbert, US Friends) — id 421 — QAYTA YOZILDI, reliability 9

Rasmiy manbalar: Chalmers "Scholarships for fee-paying students" sahifasi, "How to apply" quyi sahifasi va bog'langan Scholarship Regulations (2024) PDF'i.

- **Bitta portal, bir nechta sxema**: Avancez, IPOET, Adlerbert Study Scholarships, US Friends of Chalmers. **Avancez/IPOET = to'lovning 75%** chegirmasi; 60 kredit + yuqori CGPA bilan 2-yilda **85% darajasi**gа ko'tarilishi mumkin (4-semestrda 95% sifatida qo'llanadi) — bular Regulations'dan birinchi qo'ldan tasdiqlandi.
- Saqlab qolish: birinchi uch davrda kamida 30 kredit (15 maygacha ro'yxatda); maksimum 120 kredit; kechiktirish (deferment) taklifni bekor qiladi; tanlov — nisbiy merit + tarqalish ambitsiyasi; moliyaviy holat hisobga olinmaydi.
- **Jarayon**: avval `universityadmissions.se` (Chalmers'ni 1-ustuvorlik qiling; 8 xonali raqam), so'ng stipendiya portali. 2027 raundi: noyabr oxiri 2026 → dastur deadline'i (yanvar o'rtasi); takliflar mart–may boshi.
- **Kodlash**: titl kengaytirildi (portal oilasi bo'yicha); deadline `2027-01-15/fixed`, status `upcoming` (portal noyabr oxirida ochiladi); NULL `SEK/year/variable`. Reliability **9**: sahifaning o'zi 2027 tafsilotlari bilan hali yangilanmaganini aytadi; Adlerbert/US Friends foizlari alohida o'qilmagani uchun yozuvda ular uchun raqam keltirilmadi. us 107, source 2500.

## 3. Stockholm University Tuition Fee Waiver — id 422 — NAFAQAGA CHIQARILDI (dublikat)

- Rasmiy SU stipendiyalar sahifasi (yangilangan 2025-10-20) oddiy magistrantlar uchun bitta instrumentni ko'rsatadi: **Stockholm University Scholarship Scheme** (butun to'lovni qoplaydi, birinchi raundda qabul qilinganlar, forma natijalar bilan e-pochtada, javob aprel oxirigacha).
- Bu sxema katalogda **673** yozuvda (reliability 9) to'liq yoritilgan; 422 ning umumiy titli ayni sxemani nomlaydi → dublikat pensiyaga chiqarildi. (Stockholm Trio va Arbitraj huquqi stipendiyalari alohida sxemalar — kelgusi additions nomzodlari.) us 628 o'chirildi; source 2623 rasmiy sahifaga.

## 4. Gothenburg Axel Adler Scholarship — id 423 — NAFAQAGA CHIQARILDI (dublikat)

- GU rasmiy Axel Adler sahifasi (2027 raund taqvimi bilan: ariza 15 yanvar 2027 gacha, hujjatlar 1 fevralgacha, taklif ~10 fevral, natijalar 12/15 aprel) — bu ayni **739** yozuvda (reliability 9) kataloglangan sahifa/sxema.
- 423 da daraja ko'lami ham xato edi (faqat magistr; sxema bakalavrlarni ham qamraydi — 739 to'g'ri ko'rsatadi) → dublikat pensiyaga chiqarildi. (Axel Adler for Sustainability kichik varianti — kelgusi nomzod.) us 629 o'chirildi; source 2533 rasmiy sahifaga.

---

## Tekshiruvlar

- Supabase read-back: 325 rel 10, 421 rel 9 (ikkalasi `2027-01-15`); 422/423 `is_active=false/closed`.
- Hisoblagichlar: faol **540**, nafaqadagi **174**, faol reliability-4 **34**, kelgusi deadline **186**; Shvetsiya reliability-4 = **0**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor/deadline kiritilmadi; tekshirilmagan foizlar (Adlerbert/US Friends) raqamsiz qoldirildi.

**Qolgan reliability-4 (34)**: Avstriya, Daniya, Gonkong SAR 3 tadan; Chili, Hindiston, Irlandiya, Meksika, Norvegiya, Saudiya Arabistoni, BAA 2 tadan; yana 11 davlat 1 tadan. Alternatsiya bo'yicha keyingi qadam — **Batch 18** (qo'shish), so'ng Pass 112.
