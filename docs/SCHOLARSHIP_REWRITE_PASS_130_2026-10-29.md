# Scholarship Rewrite Pass 130 — AQSh need-based aid oilasi: shablon minima'si ikkinchi tozalovi (2026-10-29)

## Bu pass'da nima qilindi

Pass 129'dagi federal-da'vo mantiqi (bitta umumiy qoida → butun oila) bu yerda ishlamaydi: AQShning need-based aid yozuvlari har biri alohida universitet qoidasiga bo'ysunadi. Shuning uchun oilani uch guruhga ajratdik va dalilni har bir guruhga mos yig'dik.

**Triage (14 yozuv):** 547 Brown, 552 CWRU, 559 Cornell, 563 Dartmouth, 572 Duke, 575 Emory, 600 UIUC, 635 Northwestern, 643 NYU Promise, 644 UChicago, 663 Rice, 782 Vanderbilt, 789 WashU, 816 Harvard.

**Guruh A — o'z matni bilan (563, 575, 663, 782, 789):** yozuvlarning o'z `english_requirements` matni allaqachon "alohida ingliz tili bali yo'q / qabul darajasidagi talab" deydi — ya'ni tuzilmaviy `min_gpa`/`min_ielts` yozuvning o'zi bilan zid edi (541 na'munasidagi kabi ichki ziddiyat). Faqat tuzilmaviy qiymatlar NULL qilindi, matn o'zgarmadi.

**Guruh B — yalang'och shablon (547, 559, 572, 635, 643, 644, 816):** `english_requirements` = "IELTS X or equivalent..." yoki "IELTS 7.5 / TOEFL 102 / DET 130". Shablon izi ochiq-oydin: 559 (Cornell) va 816 (Harvard) dagi satr harfi-harfiga bir xil. To'rt yozuv uchun universitetning rasmiy sahifasi bugun birinchi qo'ldan qayta o'qildi:

- **Brown (547):** xalqaro birinchi kurslar uchun need-blind; yordam CSS Profile asosida; GPA/IELTS chegarasi yo'q (yangi manba **3159**).
- **Cornell (559):** need-based Cornell grants doirasi; minima yo'q (yangi manba **3161**).
- **NYU Promise (643):** ko'rsatilgan ehtiyojning 100% qoplanadi, xalqaro talabalar ham; sahifa tom ma'noda "There is no GPA requirement" deydi (yangi manba **3160**).
- **Harvard (816):** faqat need-based aid; xorijiy talabalar amerikaliklar bilan bir asosda (mavjud manba **2503**).

572 Duke, 635 Northwestern, 644 UChicago o'zlarining 2026-10-23 da rasmiy sahifalardan tasdiqlangan description'lari asosida tozalandi (barchasi "100% demonstrated need" mexanizmini tasvirlaydi); ularning `last_verified_at`'i o'zgartirilmadi — qog'ozda ham, notes'da ham shaffof qayd etildi.

**600 UIUC** — alohida: yozuv UIUC xalqaro talabalarga need-based aid bermasligini va cheklangan merit yo'llarini hujjatlashtiradi; saqlanib qolgan 3.6/7 shablon qiymatlar edi → NULL + mos matn.

**Bayroq tuzatishlari (o'z matni/sarlavhadan):** 635 Northwestern va 643 NYU'da flag'lar teskari edi (need=false, merit=true) → need=true, merit=false. 782 Vanderbilt (sarlavha: "Signature Merit Scholarships"; matn ikki tomonni ham qamraydi) → merit=true qo'shildi, need=true qoldi.

**Yon-jadval:** 14 yozuvdan 8 tasida "Typical academic profile: GPA X+, IELTS Y+." shablon gap bor edi (547, 559, 572, 600, 635, 643, 644, 816) — regex bilan olib tashlandi.

**Kechiktirildi:** 552 CWRU — uning ingliz tili matni aniq transkripsiya qilingan qabul profili (umumiy shablon emas); alohida to'liq uplift'da ko'riladi. Bu pass'da hech narsa tegilmadi.

## Natija

- **13 ta yozuvda** `min_gpa`/`min_ielts` NULL; shablon ingliz-tili matnlari qabul darajasidagi umumiy formulaga almashtirildi.
- Yangi manbalar: 3159 (Brown), 3160 (NYU), 3161 (Cornell); havolalar 456–459 (816 uchun mavjud 2503).
- `source_reliability ≤ 8` + minima mavjud yozuvlar: **83 → 75** (Pass 129 bilan birga 94 → 75).
- Hisoblagichlar o'zgarmadi: **546 faol / 205 iste'fodagi / 1 ta rel-4 (876) / 208 kelajak-deadline**. Uydirma miqdor yoki deadline kiritilmadi.

## Qoldiq navbatlar

- Qolgan **75 ta** past-ishonchlilik minima'li yozuv oila-oila bo'ylab faqat fetched dalil bilan tozalanadi (CWRU 552 va Michigan 626 alohida uplift sifatida).
- Navbatga ko'ra keyingi bosqich — **Batch 37** (qo'shimcha/boyitish).
