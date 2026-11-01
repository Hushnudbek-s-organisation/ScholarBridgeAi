# Scholarship Enrichment Batch 15 — 2026-10-27

## Maqsad

Pass 108 (Belgiya) davomida ko'zga tashlangan haqiqiy sxemalarni alohida yozuv sifatida qo'shish. Batch 15 oldidan: 534 faol / 170 retired / 46 faol reliability-4 / 177 kelajak deadline. To'rttala nomzod ham rasmiy sahifalaridan birinchi qo'ldan o'qilib, tekshirilib qo'shildi; uchala universitet (KU Leuven 48, UCLouvain 112, Ghent 142) `universities` jadvalida mavjud, shu bois `university_id` bog'landi va har biriga us qator yaratildi.

## Qo'shilgan yozuvlar

### 957 — Inspiring the Outstanding Scholarship, KU Leuven (rel 10, `open`)

KU Leuven'ning o'z sxemasi (International Scholarship Fund — xayriya jamg'armasi): **€13,200/yil + to'liq tuition waiver** (faqat ~€140 ma'muriy to'lov), 2 yilgacha; 2027-28 da atigi **1 ta** o'rin. Master Mind bilan bitta ariza jarayoni (15-yanvar 2027), lekin alohida yozuv sifatida asosli: homiy, paket (Master Mind €10,750 + kamaytirilgan tarif; bu — €13,200 + haqiqiy to'liq waiver) va kvota farq qiladi. `deadline_date=2027-01-15`, `award 13200 EUR/year/fixed`, us 688.

### 958 — Doctoral Scholarships for Candidates from the Global South (Ghent, BOF) (rel 10, `open`)

BOF "sandwich" doktorantura: yiliga 15 ta; **Gentdagi 24 oy** UGent stipendiyasi + uy universitetidan **majburiy 24 oylik to'liq ham-moliyalashtirish** (yozma kafolat, ≤10% boshqa vazifa) + promotorga €310/oy bench fee va €8,000 sayohat byudjeti. **O'zbekiston rasmiy country-list PDF'da tasdiqlandi** (lower-middle-income ustuni). Call 2027: istisno so'rovlar 15-yanvar, **`deadline_date=2027-02-09`**; natija 12-maydan. Stipendiya miqdori call sahifasida yo'q → `award` NULL `variable`. us 690. Bu — 410 retired yozuvda aralashib qolgan BOF instrumentining mustaqil, tekshirilgan versiyasi.

### 959 — Science@Leuven Scholarship, KU Leuven Faculty of Science (rel 10, `upcoming`)

144 yozuvining eski URL'i aslida shu sxemaga ishora qilardi; endi o'z yozuviga ega. Fakultet sahifalarining 4 tasi o'qildi (landing/amount/admission/language/timepath): **€12,000 gacha 1 yil** (aniq summani jamg'arma boshqaruvi belgilaydi → `variable`), 2-yil zo'r natijaga bog'liq. Talablar qattiq va hammasi majburiy: KU Leuven'da umuman bo'lmagan bo'lishi, xorij bakalavri, master/PhD yo'qligi, **IELTS 7.0** (yozildi, sub-skorlar bilan) yoki TOEFL 94, jahonga mashhur professorlardan 2 tavsiya, ambassador majburiyati. **`deadline_date=2027-02-15`**; us 689.

### 960 — EPL Excellence Scholarships, UCLouvain (rel 10, `upcoming`)

Pass 108 da uylab topilgan 479 retired qilinganda topilgan haqiqiy sxema: Lovain muhandislik maktabi (EPL) ning yangi fakultet mukofoti — **to'liq tuition 2 yil** (birinchi yil barcha kurslar credited + GPA ≥13/20 shartida). Xalqaro magistrantlar (Engineering/CS/Data Science); tanlov akademik mukammallik: **min GPA 3.2/4** e'lon qilingan yagona rasmiy son → `min_gpa=3.2` yozildi (matnda seleksiya chegarasi ekani qayd etilgan). Non-EU shakl muddati 31-mart → **`deadline_date=2027-03-31`**. UCLouvain'ning "xalqaro talabalarga stipendiya bermaymiz" qoidasining fakultet darajasidagi mazkur aniq istisnosi ekani yozuvda ochiq. us 691.

## Bog'liqlik

INSERTlar RETURNING bilan qotirildi (parallel tartib chalkashdi: **957 Inspiring, 958 DOS, 959 Science@Leuven, 960 EPL**). Manbalar: 3093 (EPL) → 960, 3094 (Inspiring) → 957, 3095 (Science@Leuven) → 959, 3096 (DOS) → 958; linklar va us 688–691 yaratildi. Kolliziya oldindan 0 ta topildi.

## Hisoblagichlar va tekshiruv

- Faol: **538** (534 + 4) · Retired: **170** · Faol reliability-4: **46** · Kelajak deadline: **181** (177 + 4)
- `npm run typecheck`, `npm run check:i18n` o'tdi; `npm run test:render` — **✅ 337 passed, 0 failed**

## Halollik qaydi

Tozalash tugamadi: bazada hali ham 46 ta faol reliability-4 yozuv bor (eng kattalari: Finland, France, Sweden — 4 tadan). Keyingi qadam — Pass 109.
