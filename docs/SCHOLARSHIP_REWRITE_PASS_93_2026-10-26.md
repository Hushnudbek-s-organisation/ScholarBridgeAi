# SCHOLARSHIP_REWRITE_PASS_93_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 93’da Edinburgh, Leeds research funding va St Andrews postgraduate scholarship katalog pointerlari qayta ko‘rib chiqildi. Rasmiy sahifalar bitta award emas, ko‘p sxemali indeks ekanini tasdiqladi; generic qatorlar scholarship kartasi sifatida retire qilindi. Mavjud named awards alohida yozuv sifatida qoldi.

## 1. Retire qilingan generic pointerlar

| ID | Universitet | Rasmiy manba | Qaror |
|---:|---|---|---|
| 53 | Edinburgh | `https://registryservices.ed.ac.uk/student-funding/postgraduate/international` | Sahifa region/College/subject bo‘yicha turli funding sxemalarini jamlaydi; bitta umumiy award yo‘q. Edinburgh Business School Doctoral College Scholarship ID 131’da. |
| 312 | Leeds | `https://www.leeds.ac.uk/research-funding` | Central/faculty/school/project funding qidiruvi; yagona research award emas. Leeds Masters International Excellence ID 910’da alohida. |
| 327 | St Andrews | `https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/` | Taught va research award’lar katalogi, fee status va subject’ga qarab alohida. St Andrews International Undergraduate Scholarship ID 671’da. |

Uch row `is_active=false` qilindi. Oldingi USD/GBP estimate, generic deadline yoki eligibility’lar qayta tiklanmadi. University associations **19, 648, 533** olib tashlandi; source mappings audit uchun qoldirildi va `sources` jadvalidagi URL/title’lar fetch qilingan rasmiy sahifalarga yangilandi. Hech birida saved-scholarship yoki decision reference yo‘qligi tekshirildi.

## 2. Yakuniy Supabase nazorati

| Ko‘rsatkich | Pass 93 yakuni |
|---|---:|
| Faol scholarships | 537 |
| Retired | 130 |
| Active `source_reliability = 4` | 125 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` | 27 |
| Kelajakdagi `deadline_date` | 153 |
| Template tavsiflar | 0 |

**Yangi international scholarship qo‘shilmadi:** 125 ta faol reliability-4 yozuv qolmoqda. Cleanup tugagach, alohida scheme sahifalari asosida yangi award’lar ikki jadvalga qo‘shiladi; directory indeksini alohida stipendiya sifatida ko‘rsatmaymiz.

**Tekshiruvlar:** Supabase counters va uchala row state tasdiqlandi; `tsc --noEmit`, `check:i18n` va `test:render` (**337/337**) muvaffaqiyatli. Source-code o‘zgarmadi. Hujjat va SQL: `docs/SCHOLARSHIP_REWRITE_PASS_93_2026-10-26.md`, `supabase/scholarship_rewrite_pass93_2026-10-26.sql`.
