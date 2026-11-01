# Scholarship Rewrite Pass 107 — 2026-10-27

## Maqsad

New Zealand (Yangi Zelandiya) bo'yicha faol `source_reliability = 4` qoldiqlarini universitetlarning rasmiy sxema sahifalari va reglamentlari asosida qayta yozish. Pass 107 oldidan ma'lumotlar bazasida 534 faol, 167 retired, 55 ta faol reliability-4 va 170 kelajak deadline bor edi; Yangi Zelandiya klasteri 5 ta doktorantura stipendiyasidan iborat edi.

## Ko'rib chiqilgan yozuvlar

- 381 — Victoria University of Wellington Doctoral Scholarships
- 392 — Otago Doctoral Scholarships
- 435 — University of Canterbury Doctoral Scholarships
- 436 — Massey University Doctoral Scholarships
- 437 — University of Waikato Doctoral Scholarships

Beshala yozuvda ham amaliy bog'liqlik mavjud edi: saqlangan sayt URL'lari umumiy katalog sahifalar edi, ikkitasi (435, 436) 404 qaytarardi, 437 esa finder ro'yxatiga yo'naltirardi; beshala manbaning har biri eksklyuziv (link_count 1) va yagona domen edi. Uzbekistan fuqarolari uchun bu yerda foydali imkoniyat shuki, beshala universitet ham asosiy doktorantura stipendiyasini xalqaro talabalarga ochiq ushlagani rasmiy manbalar orqali birinchi qo'ldan tasdiqlandi.

## Qayta yozilgan yozuvlar

### 381 — Wellington Doctoral Scholarship (reliability 10)

wgtn.ac.nz rasmiy sxema sahifasidan: yiliga ~110 ta stipendiya; har bir taklif **yiliga NZ$32,000 stipendiya + ichki (domestic) o'quv to'lovi**, uch yilgacha; faqat birinchi doktorlik darajasi; First Class Honours ekvivalenti kutiladi; raundlar 1-mart, 1-iyul va 1-noyabr soat 16:30 da yopiladi, takliflar ~6 hafta ichida. Yozuv: `award_amount=32000 NZD/year/fixed`, `deadline_date=2026-11-01` (tekshiruvdan 5 kun keyingi raund) + raundlar JSON, `application_status='open'`. `university_id` endi mavjud VUW yozuviga (253) bog'landi (oldingi NULL), us 684 qo'shildi. Alohida "Guaranteed" varianti (NZ diplomidan GPA 8.5+) ushbu yozuv bilan aralashtirilmadi.

### 392 — University of Otago Doctoral Scholarship (reliability 9)

otago.ac.nz rasmiy ma'lumotlar bazasi sahifasidan: **yiliga NZ$34,128 stipendiya + 36 oyga domestic o'quv to'lovi imtiyozi** (talabalar xizmati to'lovi va sug'urta bundan mustasno); yiliga 153 tagacha; PhD va professional doktoranturalar; istalgan vaqtda eVision orqali ariza, choraklik raundlar (mart/iyun/sentabr/noiembrie). **Reliability 9** sababi: sahifa universitet doktorantura stipendiya dasturini qayta ko'rib chiqayotganini e'lon qilgan va eski reglament hujjatida NZ$33,624 ko'rsatilgan; joriy rasmiy sahifadagi 34,128 saqlandi va sharhda bayroq bilan belgilandi. `deadline_date` NULL/`not_published` (uzluksiz qabul + choraklik ko'rib chiqish), status `open`; us 613 sinxronlandi.

### 435 — UC Doctoral Scholarship (reliability 10)

canterbury.ac.nz sxema sahifasi + rasmiy reglament (PDF) birinchi qo'ldan o'qildi: qimmati **NZ$32,650 per 120 points + thesis-only o'quv to'lovi**, 360 pointsgacha (120 points = bir to'liq o'quv yili); ammo reglament qiymatni "offer'da belgilanadi" deb qoldirgani uchun `award_basis='variable'` saqlandi — e'lon qilingan raqam + reglament ogohlantirishi birga yozildi. Raundlar: 15-may va 15-oktabr; 2026-oktabr raundi yopilgan, keyingisi **2027-05-15**. Reglamentdan: doktorlik darajasi borlar mumkin emas; admission arizasi yopilish sanasidan oldin topshirilgan bo'lishi kerak; UC GPA (9 ballik) kamida 7.0 — `min_gpa` NULL, matnda yozildi; millat cheklovi yo'qligi reglamentdan tasdiqlandi. `university_id=261`, us 685.

### 436 — Massey University Doctoral Scholarship (reliability 10)

massey.ac.nz rasmiy sahifasidan: **NZ$90,000 + uch yil davomida to'lovlar** (= yiliga NZ$30,000, `award 30000 fixed`); PhD/DClinPsych/DSW; GPA ≥ 7.0 (Massey 9-ballik shkalasi — `min_gpa` NULL, matnda); offer of place yoki birinchi 12 oy ichidagi ro'yxatdan o'tish; 2026-raund 1-oktabrda yopilgan → `deadline` NULL/`not_published`, status `upcoming`, yillik avgust-oktabr shablon raundlarda. Eski sahifalardagi NZ$25,000 (2019 reglament) ishlatilmadi. `university_id=251`, us 686.

### 437 — University of Waikato Doctoral Scholarship (reliability 10)

2026 reglament (v3, PDF) + jonli finder sahifasi: standart qiymat **har 12 oyga NZ$33,000 living allowance + domestic o'quv to'lovi + Student Services Fee**, 36 oygacha — finder'dagi "up to" 36-oy chegarasi va fees-only variantni aks ettiradi, reglamentdagi tekis raqam `fixed` sifatida saqlandi. To'rt raund (31-yanv / 30-apr / 31-iyul / 31-okt); keyingisi **2026-10-31**, finder "Accepting applications" → status `open`. Reglament 2.1.1 xalqaro talabalarni ochiq sanab o'tadi; minimum GPA **A−** (NZ harf shkalasi — `min_gpa` NULL, matnda); Offer of Place shartligi va ikki martadan ortiq ariza berib bo'lmasligi yozildi. `university_id=247`, us 687.

## Manbalar va bog'liqlik

- 2698 (381) → `wgtn.ac.nz/scholarships/current/wellington-doctoral-scholarships`
- 2587 (392) → `otago.ac.nz/courses/scholarships/university-of-otago-doctoral-scholarship`
- 2498 (435) → `canterbury.ac.nz/study/getting-started/scholarships/doctoral-scholarships/uc-doctoral-scholarships`
- 2571 (436) → `massey.ac.nz/study/scholarships-and-awards/massey-university-doctoral-scholarship/`
- 2695 (437) → `waikato.ac.nz/study/scholarships/find-a-scholarship/university-of-waikato-doctoral-scholarship/`

Kolliziya tekshiruvi oldindan 0 qator qaytardi. `university_scholarships`: 613 sinxron (Otago), 684–687 yangi (VUW 253, UC 261, Massey 251, Waikato 247) — to'rt yozuvda `university_id` avval NULL bo'lgan, endi mavjud universitet yozuvlariga bog'landi. Eslatma: us jadvali ustunlari sxema faylidan qayta tasdiqlandi (`scholarship_name/availability_status/funding_type/max_scholarship/covers_tuition/covers_living_expenses/official_url/source_url/verification_status`).

## Hisoblagichlar va tekshiruv

- Faol: **534** (betaraflik — 5 rewrite, retirement yo'q)
- Retired: **167**
- Faol reliability-4: **50** (55 − 5) — Yangi Zelandiyada **0** qoldi
- Kelajak deadline'lar: **173** (170 + 3: 381→2026-11-01, 437→2026-10-31, 435→2027-05-15)
- `npm run typecheck`, `npm run check:i18n` o'tdi; `npm run test:render` — **✅ 337 passed, 0 failed**

## Halollik qaydi

Tozalash tugamadi: bazada hali ham 50 ta faol reliability-4 yozuv bor (eng kattalari: Belgium, Finland, France, Sweden — 4 tadan). Keyingi qadam — Batch 14.
