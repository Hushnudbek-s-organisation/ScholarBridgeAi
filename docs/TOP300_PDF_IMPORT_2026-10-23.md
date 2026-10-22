# Top 300 universitetlar — PDF → Supabase import hisoboti (2026-10-23)

Manba: `top_300_universities_supabase_prompt.pdf` (59 sahifa, 3–4-bo'limlardagi 6 ustunli reestr).
Loyiha: Supabase `zkdguzbdopfedkffsatk` (production DB).

## 1. Vaziyat

Import boshlanganda bazaga **parallel ravishda boshqa bir jarayon** xuddi shu PDF ma'lumotlarini
yozayotgani aniqlandi (21:20–21:27 UTC oralig'ida `universities` 216→326, `scholarships` 305→567,
`_import_top300` staging jadvali 297 qator). Foydalanuvchi qarori bilan: kutildi, so'ng natija
PDF bilan mustaqil solishtirildi va yetishmagan qismlar to'ldirildi.

## 2. Tekshiruv natijalari (boshqa jarayon yozgan ma'lumotlar vs PDF)

PDF mustaqil parse qilindi (`scripts/import/top300/`), 300 qator, 0 xato, vaqtinchalik
`_pdf_top300` jadvaliga yuklanib SQL orqali solishtirildi:

| Maydon | Farq | Izoh |
| --- | --- | --- |
| tuition / living / housing / app fee | 0 | to'liq mos |
| acceptance_rate | 0 | foizda saqlangan (ilova konvensiyasi: `4` = 4%) |
| GPA / IELTS / TOEFL / DET / founded / PSW / flag | 0 | to'liq mos |
| SAT | 149 | PDFda `NULL` bo'lgan joylarda bazadagi eski qiymat saqlangan (COALESCE) — to'g'ri |
| university_type | 187 | mavjud qatorlarda `Public Research University` kabi boyroq yorliq saqlangan |
| country / city | 2 / 20 | formatlash (`Czechia` vs `Czech Republic`, `Toronto` vs `Toronto, ON`) |
| description / highlights | 0 | 297/297 to'ldirilgan, highlights birinchi elementi `Scholarship: …` |

Nomlar bo'yicha moslashtirish (187 ta mavjud + 110 ta yangi) qo'lda ko'rib chiqildi — xato yo'q,
110 ta yangi qator orasida mavjudlar bilan dublikat yo'q. 3 ta PDF dublikati (#18/#22 Princeton,
#92/#115 USP, #110/#129 Newcastle) bitta `id` ostida birlashtirilgan.

## 3. Qabul qilingan qarorlar (chatda tasdiqlangan)

1. **`world_ranking`** — PDF "qat'iy NULL" talab qiladi, lekin ilova (saralash/filtr) mavjud QS
   reytingidan foydalanadi → mavjud 200 ta reyting **saqlandi**, yangi 110 ta qator `NULL`.
2. **Grantlar** — ham mavjud `scholarships` jadvaliga (foydalanuvchi yuborgan sxema bo'yicha), ham
   PDF A-varianti bo'yicha yangi `university_scholarships` jadvaliga yozildi.
3. **Soxta URL yo'q** — PDFdagi `website || '/admissions'` kabi to'qib chiqarilgan manzillar
   ishlatilmadi (404 xavfi). Yangi qatorlarda `admissions_url` = rasmiy sayt; `application_url`,
   `international_admissions_url`, `undergraduate_admissions_url` = `NULL`.

## 4. Men bajargan to'ldirishlar

| Jadval | Qo'shildi / yangilandi | Izoh |
| --- | --- | --- |
| `universities` | 114 yangilandi | `country_code` (ISO2), `admissions_url`, `is_english_taught` (PDFdagi "Other" talablarida mahalliy til — German C1, French B2, HSK, TOPIK… — bo'lmasa `true`) |
| `sources` | +108 | rasmiy sayt manbasi (dublikat URL tekshirilgan) |
| `university_sources` | +114 | `source_type = 'official'` |
| `programs` | +114 | `Undergraduate Degree Programs (BSc / BA / BEng)`, davomiylik 3/4 yil (mamlakat bo'yicha), til, tuition, tavsif (DE/FR/NO/DK/AT/CH uchun "ma'muriy badal" izohi — PDF 5-bo'lim, 2-qoida) |
| `program_requirements` | +114 | IELTS/TOEFL/DET/SAT/GPA, IB, A-Level, PS/Rec/Int/Port bayroqlari; tavsiya SAT bali va "Fokus" `other_requirements` ichida (PDF 5-bo'lim, 1-qoida) |
| `program_sources` | +114 | |
| `application_cycles` | +134 | har bir aniq sana uchun alohida qator (`Jan 5 (RD), Nov 1 (EA)` → 2 qator); yil "keyingi kelasi sana" qoidasi bilan (`Oct 15` → 2027-10-15, `Nov 30` → 2026-11-30). Aniq sana bo'lmaganlar (`Varies; typically Jan-Feb`) → `deadline = NULL`, `is_estimated = true`, asl matn `notes`da |
| `university_scholarships` | **yangi jadval**, 297 qator | `scholarship_id` orqali `scholarships` qatoriga bog'langan (262 ta import qilingan + 35 ta oldindan mavjud bo'lgan mos grant) |

Xavfsizlik: `university_scholarships` uchun RLS yoqildi va `anon`/`authenticated` huquqlari olib
tashlandi (`supabase/enable_rls.sql` siyosati). Boshqa jarayon qoldirgan `_import_top300` va
`_import_codes` staging jadvallaridan ham `anon` huquqlari olib tashlandi (jadvallar o'chirilmadi —
kerak bo'lmasa `DROP TABLE` qilish mumkin). O'zimning `_pdf_top300` / `_pdf_cycles` staging
jadvallarim o'chirildi.

## 5. Yakuniy holat

```
universities            326 (297 tasi PDFdan; 200 tasida world_ranking bor)
programs                2962   program_requirements 2962
application_cycles      2982   sources 2217   university_sources 519
scholarships            567    university_scholarships 297 (297 bog'langan)
```

Har bir 297 PDF universitetida: programs ✓, requirements ✓, cycles ✓, sources ✓,
scholarships ✓, university_scholarships ✓, highlights `Scholarship: …` ✓, `country_code` ✓.

## 6. Ma'lum cheklovlar

* PDFdagi ko'p qiymatlar shablonlashtirilgan (masalan, Top-50 uchun GPA 3.85, IB 36–40,
  `PTE 62+/C1`) — ular "rasmiy" emas, manba `data_source = 'Top 300 Universities dataset (user PDF, 2026)'`.
* Yangi 110 universitet uchun tavsif (`description`) avtomatik, 2–3 gapli; `image_url`, `short_name`,
  `international_students_*` bo'sh.
* 4 ta universitet (`id` 201, 209, 210, 212 — METU, KazNU, Warsaw, Charles) ilgari bo'sh
  "placeholder" edi (`unverified`, `world_ranking = NULL`); endi PDF ma'lumotlari bilan to'ldirildi
  (`verified`), reytingi hali ham `NULL`.
* `application_cycles`dagi taxminiy muddatlar (`is_estimated = true`, 63 ta) `verification_status = 'unverified'`
  bilan belgilangan — ularni rasmiy sahifadan aniqlashtirish kerak.
