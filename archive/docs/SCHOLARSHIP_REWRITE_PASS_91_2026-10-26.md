# SCHOLARSHIP_REWRITE_PASS_91_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 91 — UK postgraduate research-funding pointerlarining eski manzillari va “generic award” sifatida ko‘rsatilishini tozalash. Uchta aniq bo‘lmagan katalog yozuvi retire qilindi, Sheffield’ning joriy PhD funding index’i esa faqat pointer sifatida qoldi.

## 1. ID 145 — King’s College London

- Eski `kcl.ac.uk/study/funding/funding-opportunities` manzili fetch’da 404 berdi.
- Hozirgi rasmiy PGR funding sahifasi `https://www.kcl.ac.uk/study/postgraduate-research/funding` fetch qilindi: King’s Doctoral College alohida scholarship/studentshiplarni boshqaradi va funding database’ga yo‘naltiradi; bu sahifa bitta umumiy award emas.
- Rasmiy international research funding sahifasida CSC va Commonwealth kabi mamlakatga bog‘liq sxemalar bor; ular O‘zbekistonlik nomzod uchun universal award bo‘la olmaydi.
- ID 145 generic placeholder bo‘lgani uchun `is_active=false` qilindi. Uydirma USD 41 000 va yanvar muddati saqlanmadi. Source mapping audit uchun qoldirildi; `university_scholarships` bog‘lanmasi yo‘q edi.

## 2. ID 318 — University of Southampton

- Eski `/study/postgraduate-research/fees-funding/presidential-scholarships` yo‘li 404. Rasmiy joriy sahifa `https://www.southampton.ac.uk/study/postgraduate-research/funding` fetch qilindi.
- Southampton tadqiqot moliyalashtirishini project bo‘yicha ajratadi: tuition+stipend’li loyihalar, faqat tuition’ni qoplaydigan loyihalar va self-funded yo‘llar. Xalqaro talabalar ayrim grantlarga mos kelishi mumkin, lekin yagona universitet award’i yoki umumiy summa/deadline yo‘q.
- Shu sabab ID 318 generic pointer sifatida retire qilindi, invented USD 41 000 va umumiy yanvar sanasi ishlatilmaydi. Eski `university_scholarships` ID 571 olib tashlandi; source mapping saqlandi.

## 3. ID 337 — University of Nottingham

- Rasmiy international research scholarships sahifasi fetch qilindi: `https://www.nottingham.ac.uk/studywithus/International-applicants/scholarships-funding-finance/Research-Scholarships.aspx`.
- Sahifa ikki named partner route’ni ko‘rsatadi: **China Scholarship Council Research Excellence Scholarship** (Xitoy fuqarolari uchun) va **Commonwealth PhD Scholarships** (eligible Commonwealth fuqarolari uchun). O‘zbekiston bu ikki fuqarolik guruhiga kirmaydi. Boshqa project-specific funding uchun umumiy qidiruvga yo‘naltiradi.
- Bitta umumiy Uzbek-eligible award tasdiqlanmagani sabab ID 337 retire qilindi. USD 39 000 va yanvar deadline qaytarilmadi. `university_scholarships` ID 582 olib tashlandi; official source mapping audit uchun saqlandi.

## 4. ID 333 — University of Sheffield

- Rasmiy PhD scholarships sahifasi `https://sheffield.ac.uk/postgraduate/phd/scholarships` fetch qilindi.
- Sahifa UKRI/Research Council, universitet, School/project va boshqa funding manbalarini alohida ko‘rsatadi. 2027 kirish uchun Sheffield Research Scholarships va CSC bo‘yicha joy yo‘qligi yozilgan; Hossein Farmy archive loyihalari 2027 boshida e’lon qilinishi kutiladi. White Rose ESRC DTP bo‘yicha rasmiy qidiruv natijasi xalqaro nomzodlarni kiritadi, ammo detail sahifa 403 qaytargani uchun summa yoki deadline bu qatorga ko‘chirilmadi.
- ID 333 bitta award emas, shuning uchun `award_amount=NULL`, `coverage_type=Unspecified`, `deadline_type=not_published`, `application_status=unknown` va `source_reliability=4` bo‘lib qoladi. Stale “available” university association ID 579 olib tashlandi; scholarship record esa official index pointer sifatida active qoldi.

## 5. Source va association tozaligi

`scholarship_sources` bog‘lanmalari audit uchun saqlandi, lekin source yozuvlari fetch qilingan sahifalarga yangilandi:

- 2551 → King’s PGR funding sahifasi
- 2620 → Southampton PGR funding sahifasi
- 2614 → Sheffield PhD scholarships sahifasi
- 2580 → Nottingham International Research Scholarships sahifasi

## 6. Yakuniy Supabase nazorati

| Ko‘rsatkich | Pass 91 yakuni |
|---|---:|
| Faol scholarships | 544 |
| Retired | 123 |
| Active `source_reliability = 4` | 132 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` | 27 |
| Kelajakdagi `deadline_date` | 153 |
| Template tavsiflar | 0 |

**Yangi international scholarship qo‘shilmadi:** qolgan 132 ta faol reliability-4 yozuv hali tekshirilmoqda. Tozalash tugagach, Imperial Inspires va boshqa official-source opportunity’lar alohida add-pass’da kiritiladi.

**Tekshiruvlar:** `tsc --noEmit`, `check:i18n`, `test:render` (337/337) muvaffaqiyatli; source-code o‘zgarmadi. `docs/SCHOLARSHIP_REWRITE_PASS_91_2026-10-26.md` va `supabase/scholarship_rewrite_pass91_2026-10-26.sql` o‘zgarishlarni qayta bajarish/audit qilish uchun qo‘shildi.
