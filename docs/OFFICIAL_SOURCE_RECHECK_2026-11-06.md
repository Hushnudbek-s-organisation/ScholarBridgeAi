# Rasmiy manbalarni qayta tekshirish va jonli Supabase katalogi — 2026-11-06

> **Holat: NOT APPLIED.** Ushbu hujjatdagi tuzatishlar repository kod/seed fayllarida qilingan; tekshiriladigan SQL migratsiyasi `supabase/official_source_corrections_2026-11-06.sql` sifatida tayyorlangan, lekin jonli production bazasiga qo‘llanmagan. Deploy, production write, real to‘lov, Telegram/kanalga yuborish bajarilmagan. Hech qanday secret, token yoki connection string bu hujjatga kiritilmagan.

## 1. Qayta tekshirish usuli

- Oldingi audit natijalari qayta o‘qildi; har bir topilma hozirgi kod, seed va jonli Supabase qatori bilan solishtirildi.
- Supabase ulagichi orqali faqat `SELECT`/`information_schema`/`pg_catalog` so‘rovlari yuborildi. Hech qanday `INSERT`, `UPDATE`, `DELETE`, `ALTER`, migration yoki secret o‘zgartirish bajarilmadi.
- Rasmiy sahifalar: MIT `apply/firstyear/tests-scores/`, MIT `apply/firstyear/international/`, Yenching Academy `ADMISSIONS.htm`.
- Ajratib ko‘rsatildi: **tasdiqlangan nuqson**, **taxmin**, **yangi taklif**. Ushbu hujjatdagi jonli qator qiymatlari — tasdiqlangan nuqson; ularning kelib chiqishi va qaysi sahifada yo‘qligi — tekshirilgan fakt; qolgan keng ko‘lamli katalog qiymatlarini birdaniga to‘g‘rilash — yangi taklif/review-needed.

## 2. Tasdiqlangan jonli nuqsonlar

### 2.1 Yenching Academy Fellowship (`scholarships.id = 894`)

Jonli bazada quyidagilar aniqlandi:

| Maydon | Jonli qiymat | Rasmiy sahifa / xulosa |
| --- | --- | --- |
| `amount_usd_value` | `5040` | Rasmiy sahifada stipendiya summasi yo‘q; `$5,040` / `5,040 per month` topilmadi. Noma’lum summani 0 yoki USD oyiga aylantirib bo‘lmaydi. |
| `award_currency` / `award_period` / `award_basis` | `CNY` / `month` / `full_tuition` | Bir qatorda turli tushunchalar aralashgan: fellowship = grant, tuition qoplash, oylik stipendiya, bir martalik yo‘l xarajati. |
| `living_allowance` | `3000` | Rasmiy sahifada raqam yo‘q. |
| `min_ielts` | `NULL` | Rasmiy 2027-cohort sahifasi IELTS Academic **7.0** e’lon qiladi. |
| `english_requirements` | “... official page does not publish minimum scores” | Noto‘g‘ri. Rasmiy sahifada IELTS 7.0, TOEFL iBT yangi shkala 5, Cambridge 185, CET-6 600, TEM-4 “Good”+ va waiver shartlari bor. |
| `notes` | “... does not print them - only third-party blogs do” | Noto‘g‘ri; yuqoridagi rasmiy minimumlar bilan almashtirilishi kerak. |
| `eligible_countries` | `["Uzbekistan","All Countries"]` | Rasmiy sahifada mamlakat kvotasi/cheklovi yo‘q, lekin “All Countries” degan umumiy da’vo ham rasmiy matn emas. `[]` = eligibility aniq cheklanmagan, deb belgilanadi. |
| `eligible_majors` | `["All Majors"]` | Rasmiy sahifa yo‘nalishlar ro‘yxatini cheklamaydi; “All Majors” degan ixtiro qilingan yorliq emas, `[]` bo‘lishi kerak. |
| `required_documents` | maktab transkripti, maktub, pasport, IELTS/TOEFL yoki ingliz tilida o‘qiganlik sertifikati kabi umumiy shablon | Magistratura uchun rasmiy hujjatlar: bakalavr diplomi yoki avgustgacha tugatish hujjati, bakalavr transkripti, CV, promptga javoblar, ikki tavsiyanoma, til minimumi/waiver, shaxsni tasdiqlovchi hujjat, partner pre-selection (agar tegishli bo‘lsa). Maktab attestati shablonini magistratura talabi sifatida ko‘rsatib bo‘lmaydi. |
| `degree_levels` | `["Master","PhD"]` | Yenching Academy — ikki yillik **Master’s** fellowship; PhD emas. |
| `verification_status` / `last_verified_at` | `verified` / 2026-10-23 | Holat noto‘g‘ri ma’lumotlar bilan “verified” bo‘lgan. Failed verification verified date’ni yangilamasligi kerak. |

### 2.2 MIT (`universities.id = 1`)

| Maydon | Jonli qiymat | Rasmiy sahifa / xulosa |
| --- | --- | --- |
| `min_gpa` | `3.91` | Rasmiy MIT first-year va international sahifalarida GPA cutoff yo‘q. |
| `min_sat` | `1520` | Rasmiy sahifada SAT/ACT cutoff yoki “tavsiya etilgan ball” yo‘q; SAT/ACT topshirish talabi bor, lekin minimum ball e’lon qilinmagan. |
| `acceptance_rate` | `4.5` | Bu rasmiy admitted-cohort statistikasi sifatida tasdiqlanmagan; QS/PDF asosidagi taxminni qabul qilinganlar statistikasi deb ko‘rsatib bo‘lmaydi. |
| `data_source` | `Top 300 Universities dataset (user PDF, 2026)` | Uchinchi tomon PDF; rasmiy talab manbai emas. |
| `source_url` | `https://www.mit.edu` | Umumiy bosh sahifa; ikkita aniq rasmiy admissions sahifasi qo‘shiladi. |
| `verification_status` | `verified` | Butun qator “verified” bo‘lgani 3.91/1520/4.5 qiymatlarini rasmiy deb isbotlamaydi. |

### 2.3 QS edition

Jonli `university_rankings.id = 1` qatori aniq **QS World University Rankings 2026**, `#1`, 2026-10-31 da `verified`. Repository `src/db/seedVerifiedUniversityFacts.ts` ilgari `QS World University Rankings 2027` va umumiy `topuniversities.com/qs-top-uni-wur` URL ishlatgan; bu **QS edition** / manba nomi aralashuvi edi. Endi seed ham 2026 edition va edition-specific URLga o‘tkazildi. `qs_rank_year`, `world_ranking` va `university_rankings` jonli bazada o‘zgartirilmadi; ular alohida tasdiqlangan ma’lumot sifatida qoladi. QS reytingi qabul qilinganlar statistikasi emas.

### 2.4 Sxema drifti va tizimli xavf

Jonli `scholarships` jadvalida quyidagilar aniqlandi:

- `amount_usd_value` **NOT NULL**, repository Drizzle sxemasida esa nullable. Shuning uchun noma’lum summani `NULL` qilish uchun avval `DROP NOT NULL` kerak.
- `min_ielts` default `6.5`, `eligible_majors` default `["All"]`, `degree_levels` default `["Master","PhD"]`. Bu har yangi qatorga tasdiqlanmagan qiymat tiqib qo‘yadi. Migratsiyada defaultlar `[]` yoki olib tashlanadi.
- `deadline`, `website_url`, `degree_levels`, `eligible_majors`, `verification_status` NOT NULL; migratsiya ularni saqlaydi.
- 356 ta universitet qatorining barchasi `verified`, lekin 352 tasi `min_gpa`, 252 tasi `min_sat`, 352 tasi `acceptance_rate` ga ega. Bu **No blanket** “barcha raqamlar verified” da’vosini qo‘llab-quvvatlamaydi. Har bir muhim qiymat uchun alohida value+unit, currency+period, degree/program, admission cycle, official source URL, verified date, verification status va value type kerak. Shu maqsadda alohida `catalogue_facts` / review-needed migratsiyasi tayyorlanadi, lekin production’da qo‘llanmaydi.
- **duplicate MBA** (`MBA (MIT Sloan)`) va boshqa MIT dastur qatorlari, kanal materiallaridagi `$5,040` iborasi, umumiy hujjat shablonlari, “All Countries”, “full funding”, “full tuition” kabi da’volar ham review-needed ro‘yxatida qoladi. Ular uchun dalil bo‘lmaguncha fakt o‘ylab topilmaydi.

## 3. Repository’da qilingan tuzatishlar

- `data/supabase_enrichment.sql`: MIT GPA/SAT cutofflari olib tashlangan.
- `data/top300_universities_pdf_2026.json`: MIT GPA/SAT `null` va `observed_third_party_estimate` / `review_needed` sifatida belgilangan.
- `supabase/international_scholarships_batch1_2026-10-23.sql`: Yenching IELTS 7.0, numeric stipend o‘chirilgan, rasmiy hujjatlar va eligibility aniqlandi.
- `data/programs_enriched_full.csv`: Yenching 7.0 / review_needed, duplicate MBA `false,review_needed`.
- `src/db/seedVerifiedUniversityFacts.ts`, `src/db/seed.ts`, `scripts/check-seed-catalog.ts`: QS 2027 → QS 2026 edition va edition-specific URL.
- `src/i18n/messages/{en,uz,ru}.json`: public features sahifasidagi “admission chance / qabul ehtimoli / шанс поступления” da’volari fit/evidence tushuntirishiga almashtirildi; chancing bandlari “not probability” deb belgilandi.
- `supabase/official_source_corrections_2026-11-06.sql`: jonli qatorlar uchun aniq guardlar, sxema drifti uchun 3 ta `ALTER`, ikkita rasmiy MIT source linki va NOT APPLIED izohi. Bulk replacement yo‘q, delete yo‘q, student row yo‘q, rank o‘zgartirish yo‘q.

## 4. Qo‘llanmagan / review-needed

- Production bazasiga migratsiya qo‘llanmadi; data owner tasdiqi va alohida ko‘rsatma kerak.
- `refresh` jarayoni mavjud sanalardan status hisoblashni rasmiy sahifani qayta o‘qishdan ajratishi kerak. **Failed verification** hech qachon `last_verified_at` ni yangilamasligi shart.
- 352/252/352 keng ko‘lamli `min_gpa` / `min_sat` / `acceptance_rate` qiymatlarini birdaniga o‘chirish yoki “to‘g‘ri” deb belgilash mumkin emas. Har biri alohida manba, yil, dastur va value type bilan tekshiriladi.
- duplicate MBA, `$5,040` kanal matni, generic document templates, eligibility/funding semantikasi, testimonial va “barcha ma’lumot verified” kabi da’volar alohida ko‘rib chiqiladi.
- QS-dan olingan taxmin hech qachon admitted-cohort statistikasi emas; evidence coverage yuqori bo‘lishi ma’lumotning rasmiy yoki to‘g‘ri ekanini isbotlamaydi.
- Shaxsiy admission probability faqat validated/calibrated model bo‘lganda ko‘rsatilishi mumkin; hozir yo‘q. Fit score, evidence coverage, experimental index va historical acceptance rate bir-biridan ajratiladi.

## 5. Keyingi qadamlar

1. Data owner yuqoridagi ikki qator va sxema o‘zgarishlarini ko‘rib chiqadi.
2. Alohida ko‘rsatma bo‘lganda migratsiya avval disposable/staging bazada `BEGIN … ROLLBACK` bilan sinanadi, keyin production’ga qo‘llanadi.
3. Har bir muhim qiymat uchun typed evidence record (`catalogue_facts`) va review-needed navbati joriy qilinadi.
4. Admin refresh markazida “status from existing dates” va “official page re-read” rejimlari aniq ajratiladi; failed check loglanadi, lekin verified date o‘zgartirilmaydi.
5. Real production user-flow tekshiruvi, deploy, to‘lov va Telegram/kanal yuborish alohida ruxsat bilan bajariladi.
