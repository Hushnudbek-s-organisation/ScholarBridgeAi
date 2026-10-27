# SCHOLARSHIP_REWRITE_PASS_89_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 89’da oldindan belgilangan **Caltech PhD id 20 ↔ id 114** dublikati rasmiy manbalar bilan qayta tekshirildi va konsolidatsiya qilindi. Caltech’ning alohida bakalavr need-based aid yozuvi id 19 dublikat emas, faol qoldirildi.

## 1. Rasmiy manbalar

Quyidagi Caltech Graduate Studies Office sahifalari rasmiy manba sifatida search qilindi va fetch qilindi:

- `https://gradoffice.caltech.edu/financialsupport`
- `https://gradoffice.caltech.edu/financialsupport/budget`
- `https://www.gradoffice.caltech.edu/admissions`

Ular quyidagilarni tasdiqlaydi:

- Caltech barcha PhD talabalariga, full-time enrolment va satisfactory progress sharti bilan, tuition/mandatory fees krediti hamda yashash stipendiyasi taklif qiladi; funding fellowship, RA, TA yoki aralash ko‘rinishda bo‘lishi mumkin.
- 2026-yil 1-sentabrdan PhD stipendiya stavkasi **USD 50 000 / 12 oy**, oylik to‘lanadi va soliqqa tortiladi. 2025-yil 1-sentabrdan oldingi stavka USD 48 244.
- 2026/27 tuition USD 68 574 va mandatory fees USD 2 448; fellowship yoki assistantship oluvchilarga tuition credit qo‘llanadi. Bu xarajatlar stipendiyaning USD 50 000 miqdoriga qo‘shib hisoblanmadi.
- 2026-27 uchun admission arizasi oynasi odatda 1-dekabr–15-yanvar; moliyaviy yordam uchun alohida ariza yo‘q. Ko‘pchilik funding manbalari work authorization talab qiladi.
- 2025/26 yashash budjeti, 90% Institute health-plan subsidiyasi va birinchi yil housing kafolati rasmiy budget sahifasida alohida berilgan; ular stipendiya miqdori sifatida ko‘rsatilmagan.

## 2. Konsolidatsiya

- **20 — `Caltech Graduate Fellowships (PhD)`** Caltech’ning PhD funding paketi uchun yagona faol canonical yozuv bo‘lib qoldi. Unda USD 50 000/yil stavkasi, tuition credit, admission oynasi va shartlar saqlandi. Alohida bakalavr need-based aid id 19 bilan birlashtirilmadi.
- **114 — `California Institute of Technology doctoral funding package (retired duplicate; canonical id 20)`** `is_active=false` qilindi. Yozuv o‘chirilmadi — referential integrity uchun qoladi; tavsifi id 20’ga yo‘naltiradi. Dublikatning miqdori `NULL` qilindi, shuning uchun inactive yozuv katalogda ikkinchi award sifatida ko‘rinmaydi.
- **`university_scholarships` id 520** — canonical id 20 uchun stipendiya/tuition tafsilotlari, rasmiy URL va eligibility qayta yangilandi.
- **`university_scholarships` id 639** — faqat dublikat PhD id 114’ga tegishli bo‘lgan bog‘lanma olib tashlandi. Id 20 uchun canonical bog‘lanma id 520 qoldi.
- Faol bo‘lmagan, importer’dan kelgan **id 804** (`Caltech Need-Based Financial Aid + El-Yurt Umidi`) ham alohida tekshirildi. U id 19’dagi real bakalavr need-based aid bilan bir xil canonical offer emas edi; lekin id 804’ning stale `university_scholarships` **id 376** bog‘lanmasi universitet sahifasida `Yes` ko‘rsatishi mumkin edi. Shu sabab faqat inactive row’ga tegishli association id 376 olib tashlandi; canonical id 19 va uning association id 10 saqlandi. `university_scholarships` jadvaliga tashqi foreign key yo‘qligi tekshirildi.
- **`scholarship_sources` id 27** — canonical id 20’ga ko‘chirildi; source id 2496 `https://gradoffice.caltech.edu/financialsupport` sahifasiga yangilandi. Id 20’ning mavjud ikkinchi official source’i id 2705 esa fetch qilingan `https://gradoffice.caltech.edu/financialsupport/budget` sahifasiga yangilandi.
- Id 114’da `saved_scholarships` va `scholarship_decisions` bog‘lanmalari yo‘qligi tekshirildi; faqat bitta source mapping bor edi va u id 20’ga ko‘chirildi.

## 3. Yakuniy Supabase nazorati

| Ko‘rsatkich | Pass 89 yakuni |
|---|---:|
| Faol scholarships | 549 |
| Retired | 118 |
| Active `source_reliability = 4` | 137 |
| Active `amount_usd_value > 5000` | 19 (Caltech dublikatining bitta qatori faol ro‘yxatdan chiqarildi) |
| Bare-domain `website_url` | 27 |
| Kelajakdagi `deadline_date` | 153 |
| Template tavsiflar | 0 |

**Tekshiruv:** Supabase’da id 20 faol, id 114 inactive; PhD funding paketi uchun bitta faol `university_scholarships` bog‘lanmasi qoldi. Boshqa faol Caltech award — bakalavr need-based aid id 19 — mustaqil yozuv va association id 10 sifatida qoladi. PhD award’ning ikkala rasmiy source’i id 20’ga ulanadi.

Mahalliy tekshiruvlar qayta bajarildi: `tsc --noEmit` muvaffaqiyatli, `check:i18n` muvaffaqiyatli, `test:render` 337/337. Source-code o‘zgarmadi; Supabase yozuvlari va pass hujjatlari yangilandi. `docs/SCHOLARSHIP_REWRITE_PASS_89_2026-10-26.md` va `supabase/scholarship_rewrite_pass89_2026-10-26.sql` ushbu ishning qayta bajariladigan izini saqlaydi.

**Keyingi navbat:** faol `source_reliability=4` yozuvlarini rasmiy manbalari fetch qilinadigan mamlakat/region klasterlari bo‘yicha davom ettirish.
