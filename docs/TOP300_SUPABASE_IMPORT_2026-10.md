# Top 300 Universities — Supabase import (2026-10)

Manba: foydalanuvchi yuborgan `top_300_universities_supabase_prompt.pdf`
(300 ta universitet reestri + grant ma'lumotlari).

Import `public.universities` va `public.scholarships` jadvallariga bajarildi
(repozitoriy kodi o'zgartirilmadi — faqat ma'lumot bazasi boyitildi).

## Natija

| Ko'rsatkich | Oldin | Keyin |
| --- | --- | --- |
| `universities` | 216 | **326** (+110 yangi) |
| `universities.verification_status = 'verified'` | 200 | **314** |
| `scholarships` | 305 | **567** (+262 import) |

* 297 ta unikal yozuv ishlov berildi (PDFda 300 ta qator, 3 tasi dublikat:
  #18/#22 Princeton, #92/#115 USP, #110/#129 Newcastle — birlashtirildi).
* 187 tasi mavjud yozuv bilan moslashtirilib **yangilandi**, 110 tasi **yangi**
  qator sifatida qo'shildi.
* Har bir unikal universitet uchun grant yozuvi `scholarships`ga qo'shildi
  (35 tasi mavjud katalogdagi shu grantni allaqachon qamrab olgani uchun
  qo'shilmadi).

## Yangilangan maydonlar

`universities`: `annual_tuition`, `annual_living_est`, `accommodation_cost`,
`application_fee`, `min_gpa`, `min_ielts`, `min_sat`, `min_toefl`,
`min_duolingo` (DET), `acceptance_rate` (foizda, 0–100), `post_study_work_visa_years`,
`founded_year`, `website_url`/`official_website_url` (bo'sh bo'lsa),
`highlights` (birinchi element — grant xulosasi), `source_url`,
`data_source`, `last_verified_at`, `verification_status`, `source_reliability`.

Yangi qatorlar uchun qo'shimcha: `degree_level`, `program_major`,
`description` (2–3 gap, PDF ma'lumotlaridan shakllantirilgan), `address`,
`canonical_name`, `flag_emoji`, `country`, `city`.

`scholarships`: `title`, `provider`, `country`, `coverage_type`,
`amount_usd_value`/`award_amount` (yillik tuition asosida hisoblangan),
`award_currency`, `award_period`, `award_basis`, `deadline`, `deadline_date`,
`deadline_type`, `funding_type`, `tuition_coverage`, `application_status`,
`degree_levels`, `eligible_majors`, `eligible_countries`, `min_gpa`,
`min_ielts`, `financial_need_based`, `merit_based`, `description`,
`requirements`, `website_url`, `source_url`, `notes`, `university_id`.

## Qabul qilingan qarorlar

1. **`world_ranking` o'zgartirilmadi.** PDF "barcha reytinglarni NULL qilish"
   deydi, lekin bazada 1–200 reytinglari mavjud va ilova ularni ko'rsatadi
   (`/universities`, `UniversityDetail`). Mavjud qiymatlar saqlab qolindi;
   yangi 110 qator uchun `world_ranking = NULL` (reyting da'vo qilinmagan).
2. **`acceptance_rate` foizda saqlanadi** (4 = 4%), chunki API validatsiyasi
   0–100 oralig'ini talab qiladi va UI `%` bilan chiqaradi.
3. **`highlights`** — matn (JSON massiv) ustuni; birinchi element sifatida
   `"Scholarship: <nom> (<tur>) — <maksimal> [<mavjudlik>]"` yozildi, eski
   `"Scholarship: ..."` yozuvi almashtirildi, qolgan elementlar saqlangan.
4. **`coverage_type`** ilovadagi mavjud qiymatlar bilan moslashtirildi:
   Full Ride → `Full Tuition + Stipend`, 100% tuition → `Full Tuition`,
   qisman grantlar → `Partial Tuition`.
5. **Grant summasi** PDFdagi maksimal qamrov va universitetning yillik
   tuition qiymatidan hisoblandi (Full Ride = tuition + yashash + turar joy;
   foizli grantlar = tuition × diapazon o'rtasi).
6. **`verification_status = 'verified'`, `source_reliability = 8`** — PDF
   rasmiy manbalarga tayangan reestr, lekin har bir qiymat sayt bo'yicha
   qayta tekshirilmagan (mavjud 200 yozuvda 9).
7. **`source_reliability`/`source_url`** — `source_url` sifatida
   universitetning rasmiy sayti yozildi, `data_source` =
   `Top 300 Universities dataset (user PDF, 2026)`.

## Eslatmalar / cheklovlar

* PDF reestrida **Tsinghua University, Boston University, University of Turku**
  kabi bazada mavjud ayrim universitetlar yo'q — ular tegmagan holda qoldi.
* PDFda berilgan `annual_tuition_usd`, `annual_living_est_usd`,
  `accommodation_cost_usd` (eski USD ustunlari) **ishlatilmadi**; yangi
  `annual_tuition` + `tuition_currency='USD'` ishlatildi.
* `programs`, `program_requirements`, `admission_deadlines`, `sources`,
  `university_sources` jadvallari bu importda to'ldirilmadi (foydalanuvchi
  ko'rsatgan 2 jadval doirasida ishlandi). Yangi 110 universitetda `programs`
  yozuvi yo'q — recommender ularni program darajasida ko'rmaydi.
* Import uchun vaqtinchalik obyektlar bazada qoldi (connector DROP'ni
  blokladi). Qo'lda o'chirish mumkin:

```sql
drop table if exists public._import_top300;
drop table if exists public._import_codes;
drop function if exists public._toks(text);
drop function if exists public._match_score(text, text);
```

## Tekshiruv so'rovlari

```sql
select count(*) from public.universities;                 -- 326
select count(*) from public.scholarships;                 -- 567
select count(*) from public.scholarships
 where notes like 'Imported from the Top 300%';           -- 262
select count(*) from public.universities
 where data_source like 'Top 300%';                       -- 297
select name, annual_tuition, min_ielts, acceptance_rate, highlights
  from public.universities where name like 'Massachusetts%';
```
