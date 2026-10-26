# SCHOLARSHIP_REWRITE_PASS_88_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 88’da 829 Phystech.International, 859 Study in Saudi va 868 Rossotrudnichestvo hukumat kvotasi tekshirildi. Miqdor va deadline manbada e’lon qilinmagan joylarda taxminiy raqamlar saqlanmadi. Shu bilan birga, ikkita eski yozuvdagi enum qiymati schema’ga moslashtirildi.

## 1. 829 — Phystech.International Olympiad (MIPT)

- **Rasmiy manba:** `https://en.phystech.international/` (rasmiy saytning barcha 3 bo‘lagi fetch qilindi).
- Bu to‘g‘ridan-to‘g‘ri stipendiya emas: matematika/fizika olimpiadasi MIPT’ga kirishdagi raqobat ustunligi va alohida Rossotrudnichestvo hukumat kvotasiga tavsiya xati berishi mumkin; g‘olib bo‘lish kvota yoki bepul o‘qishni kafolatlamaydi.
- Sahifadagi prize bo‘limi yangilanmagan/zid: unda 2024-yil bitiruvchilari uchun kvota xati, keyingi bitiruvchilar uchun esa navbatdagi finalga fast-track ko‘rsatilgan; asosiy sahifa 2025-yil yoki undan keyin bitiruvchilarni tilga oladi. Jadval 2025-yilga tegishli — matematika sessiyalari 1 va 8-noyabrda, fizika sessiyalari 2 va 9-noyabrda — 2026/27 sanalari yo‘q.
- Oldin importer qo‘shgan USD 6 000 va GPA 3.8 olib tashlandi; `award_amount=NULL`, `award_currency=NULL`, `amount_usd_value=0`, `min_gpa=NULL`, `coverage_type=Unspecified`, `deadline_type=not_published`, `application_status=unknown`. Daraja faqat Bachelor's, yo‘nalishlar matematika va fizika.
- `source_reliability=8` — manba rasmiy, ammo mukofot shartlari va yangi sikl sahifada eskirgan/zid.
- `university_scholarships` yozuvi **353** yangilandi: to‘g‘ridan-to‘g‘ri stipendiya emasligi va tuition/living to‘lovlari kafolatlanmasligi belgilandi (`covers_tuition=false`, `covers_living_expenses=false`).

## 2. 859 — Study in Saudi portal

- **Rasmiy domain:** `https://studyinsaudi.moe.gov.sa`.
- Ministry qidiruv natijalari rasmiy portalda **full scholarships**, **partial scholarships** va **paid study places** alohida toifalar ekanini ko‘rsatdi; ularni bitta to‘liq stipendiya sifatida taqdim etish mumkin emas.
- `StudyTypes/FreeScholarships` sahifasi va portal bosh sahifasini fetch qilish urinishlari xato bilan tugadi. Shuning uchun URL’lar bare domain holida qoldi, chuqur sahifa taxmin qilinmadi va `source_reliability=4` saqlandi.
- Oldingi qarama-qarshi holat tuzatildi: `coverage_type=Unspecified`, amount/currency `NULL`, `amount_usd_value=0`, deadline `not_published`, ariza holati `unknown`; hujjatlar va daraja ro‘yxati taxmin qilinmadi. Alohida dastur bo‘yicha muddat va qamrov tekshirilishi kerak.
- Bu milliy ko‘p-universitetli portal, `university_id` yo‘q; tasodifiy universitetga `university_scholarships` bog‘lanmasi yaratilmagan.

## 3. 868 — Rossiya hukumat kvotasi / Rossotrudnichestvo

- **O‘zbekiston uchun rasmiy portal:** `https://rusedu.uz/` (fetch qilindi). Unda 2027/28 kvota arizalari **2026-yil noyabrda boshlanishi** aytilgan va federal ariza portaliga havola berilgan.
- **Rasmiy mezon va qamrov sahifalari:** `https://en.misis.ru/applicants/scholarships/quota/` va `https://en.misis.ru/applicants/algorithm/` (ikkalasi ham fetch qilindi).
- NUST MISIS sahifasi kvota orqali bakalavr, magistratura va PhD-ekvivalent bosqichlarida full tuition, zarur bo‘lsa tayyorlov rus tili kursi hamda oylik stipendiya ko‘rsatilishini bildiradi. Stipendiyaning miqdori e’lon qilinmagan: `award_amount=NULL`, `award_currency=NULL`, `amount_usd_value=0`.
- MISIS yotoqxona joyini taklif qiladi, lekin narxi **oyiga RUB 2 500–3 769**; turar joy bepul emas va bu narx boshqa universitetlarga avtomatik tatbiq qilinmaydi. MISIS qo‘llanmasida yo‘l, hujjat tarjimasi/rasmiylashtirish, viza, sug‘urta va ovqat xarajatlari talabgor zimmasida ekani aytiladi.
- **Muddat:** MISIS’ning CIS mamlakatlariga xos jadvali 15-dekabr-2026, boshqa mamlakatlar uchun 15-yanvar-2027 deydi; ariza algoritmi ham shu farqni tasdiqlaydi. Biroq MISIS sahifasining umumiy 5-qadami 15-yanvar sanasini umumiy qilib yozadi. Shu zidlik `notes`’da qayd etildi; O‘zbekistonliklar mahalliy portalni tekshirishi kerak. Hozircha 15-dekabr-2026 CIS muddati sifatida saqlandi, `application_status=upcoming`.
- `source_reliability=9`; award amount va stipend soni to‘qib kiritilmadi. Bu milliy kvota bo‘lgani sabab `university_id=NULL` va `university_scholarships` bog‘lanmasi qo‘shilmadi.

## 4. Schema enum tozaligi

Live auditda Pass 87’dan qolgan 2 ta enum xatosi topildi va qiymat ma’nosini saqlagan holda tuzatildi:

- **776 USM Graduate Scholarship:** `award_period='semester'` ruxsat etilgan qiymat emas edi. Birinchi semestr uchun to‘lov va keyingi semestrga shartli uzaytirish sabab `variable` qilindi.
- **828 ITU Development Foundation Learning Scholarship:** `award_basis='monthly'` ruxsat etilgan qiymat emas edi. TRY 500/oy × 9 oy yillik qat’iy burs bo‘lgani sabab basis `fixed` qildi; `award_period='year'` saqlandi.

Bu ikki qatorda stipendiya miqdori yoki boshqa eligibility tafsilotlari o‘zgartirilmadi.

## 5. Yakuniy Supabase nazorati

| Ko‘rsatkich | Pass 88 yakuni |
|---|---:|
| Faol stipendiyalar | 550 |
| Retired | 117 |
| Active `source_reliability = 4` | 137 |
| Active `amount_usd_value > 5000` | 20 |
| Bare-domain `website_url` | 27 |
| Kelajakdagi `deadline_date` | 153 |
| Template tavsiflar | 0 |
| Noto‘g‘ri coverage/deadline/basis/period enumlari | 0 |

**Mahalliy tekshiruvlar:** `tsc --noEmit`, `check:i18n` va `test:render` (**337/337**) muvaffaqiyatli. `test:duplicates`, `test:provenance` va `test:deadlines` bu muhitda `DATABASE_URL`/lokal DB talab qiladi; jonli ma’lumotlar Supabase query’lari bilan tekshirildi. Pass 88’da source-code o‘zgarmadi.

**Keyingi navbat:** `source_reliability=4` qatorlarini mamlakat klasterlari bo‘yicha davom ettirish. Study in Saudi rasmiy sahifasi fetch bo‘lganda portal ko‘rsatkichlari qayta ko‘riladi; stipendiya emas, lekin grantga olib boruvchi olimpiada/kvota yo‘llari katalogda ochiq belgilanishi kerak.
