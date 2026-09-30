# Universitet uchun kiritiladigan maydonlar — TO'LIQ RO'YXAT

> Ustun nomlari `src/db/schema.ts` dan avtomatik chiqarilgan. Qo'lda yozilmagan.
> Har bir qiymat uchun **manba (source)** shart. Topilmagan maydon → `NULL`.

---

## 📘 1-JADVAL: `universities` (46 ustun) — har bir universitetga **1 qator**

### MAJBURIY (20) — bo'sh bo'lsa qator kiritilmaydi

| # | Ustun | Misol | Qayerdan |
|---|-------|-------|----------|
| 1 | `name` | `Massachusetts Institute of Technology` | universitet saytidan |
| 2 | `country` | `United States` | universitet saytidan |
| 3 | `city` | `Cambridge, MA` | universitet saytidan |
| 4 | `flag_emoji` | `🇺🇸` | davlatga qarab avtomatik |
| 5 | `world_ranking` | `NULL` | ⚠️ **QS litsenziyali** — ruxsat yo'q, `NULL` |
| 6 | `degree_level` | `All` | saytning o'z kategoriyasi |
| 7 | `program_major` | `Computer Science` | ⚠️ saytning o'z kategoriyasi, tashqi fakt emas |
| 8 | `description` | `MIT is a private research university...` | ✍️ men yozaman (fakt emas, matn) |
| 9 | `highlights` | `["#1 CS program","CSAIL lab"]` | ✍️ men yozaman (JSON massiv) |
| 10 | `website_url` | `https://www.mit.edu` | rasmiy sayt |
| 11 | `verification_status` | `unverified` | siz tasdiqlagancha `verified` |
| 12 | `source_reliability` | `7` | shu maydallar avtomatik to'ldiriladi |
| 13 | `is_active` | `true` | avtomatik |
| 14 | `tuition_currency` | `USD` | avtomatik (`USD`) |
| 15 | `tuition_period` | `year` | avtomatik (`year`) |
| 16 | `living_cost_currency` | `USD` | avtomatik |
| 17 | `living_cost_period` | `year` | avtomatik |
| 18 | `accommodation_cost_currency` | `USD` | avtomatik |
| 19 | `accommodation_cost_period` | `year` | avtomatik |
| 20 | `application_fee_currency` | `USD` | avtomatik |

### Ixtiyoriy (26) — topilmasa `NULL` qoladi

| # | Ustun | Misol | Qayerdan |
|---|-------|-------|----------|
| 21 | `founded_year` | `1861` | universitet saytidan / Wikipedia (rasmiy yoki obrobli) |
| 22 | `address` | `77 Massachusetts Ave, Cambridge, MA 02139` | universitet saytidan |
| 23 | `university_type` | `Private research university` | universitet saytidan |
| 24 | `min_gpa` | `3.9` | ✍️ admissions sahifasi (ko'pincha **PDF**) |
| 25 | `min_ielts` | `7.5` | ✍️ admissions sahifasi (ko'pincha **PDF**) |
| 26 | `min_sat` | `1500` | ✍️ admissions sahifasi (ko'pincha **PDF**) |
| 27 | `acceptance_rate` | `4.0` | ✍️ Common Data Set / admissions statistikasi |
| 28 | `post_study_work_visa_years` | `3` | ✍️ hukumat sayti (mamlakat qonuni) |
| 29 | `annual_tuition` | `65000` | ✍️ to'lov sahifasi |
| 30 | `annual_living_est` | `32000` | ✍️ to'lov sahifasi |
| 31 | `accommodation_cost` | `12000` | ✍️ yotoqona sahifasi |
| 32 | `application_fee` | `100` | ✍️ to'lov sahifasi |
| 33 | `international_students_count` | `7000` | ✍️ yillik hisobot (ko'pincha **PDF**) |
| 34 | `international_students_percentage` | `27` | ✍️ yillik hisobot |
| 35 | `official_website_url` | `https://www.mit.edu` | rasmiy sayt |
| 36 | `admissions_url` | `https://admissions.mit.edu` | rasmiy sayt |
| 37 | `international_admissions_url` | `https://mitadmissions.org` | rasmiy sayt |
| 38 | `undergraduate_admissions_url` | `https://admissions.mit.edu` | rasmiy sayt |
| 39 | `application_url` | `https://apply.mit.edu` | rasmiy sayt |
| 40 | `image_url` | `https://...` | 🔒 o'zingizga tegibdi |
| 41 | `source_url` | `https://mit.edu/admissions/apply` | ✅ manba |
| 42 | `last_verified_at` | `2026-09-30` | ✅ tekshirilgan sana |
| 43-46 | `annual_tuition_usd` `annual_living_est_usd` `accommodation_cost_usd` `id` | — | eski maydonlar, kerak bo'lmaydi |

---

## 📗 2-JADVAL: `programs` (19 ustun) — har bir dasturga **1 qator**

| # | Ustun | Misol | Majburiy |
|---|-------|-------|-----------|
| 1 | `university_id` | `1` | ✅ |
| 2 | `name` | `MS in Computer Science` | ✅ |
| 3 | `field` | `Computer Science` | ❌ |
| 4 | `degree_level` | `Master's` | ❌ |
| 5 | `duration` | `2` | ❌ |
| 6 | `duration_unit` | `years` | ✅ (`years`) |
| 7 | `study_mode` | `full-time` | ❌ |
| 8 | `language` | `English` | ❌ |
| 9 | `annual_tuition` | `65000` | ❌ |
| 10 | `tuition_currency` | `USD` | ✅ |
| 11 | `tuition_period` | `year` | ✅ |
| 12 | `description` | `...` | ❌ |
| 13 | `official_url` | `https://...` | ❌ |
| 14 | `application_url` | `https://...` | ❌ |
| 15 | `source_url` | `https://...` | ✅ manba |
| 16 | `last_verified_at` | `2026-09-30` | ✅ |
| 17 | `is_verified` | `false` | ✅ (avtomatik) |
| 18-19 | `id` `created_at` | — | avtomatik |

---

## 📕 3-JADVAL: `program_requirements` (20 ustun) — har bir dasturga **1 qator**

> ⚠️ Bu jadval orqali saytda **IELTS / GPA / SAT** ko'rsatiladi. Dastur bo'lmasa — bo'lim bo'sh.

| # | Ustun | Misol | Qayerdan |
|---|-------|-------|----------|
| 1 | `program_id` | `1` | ✅ |
| 2 | `min_ielts` | `7.5` | ✍️ dastur sahifasi |
| 3 | `min_toefl` | `100` | ✍️ dastur sahifasi |
| 4 | `min_det` | `130` | ✍️ dastur sahifasi (Duolingo) |
| 5 | `min_sat` | `1500` | ✍️ dastur sahifasi |
| 6 | `min_act` | `34` | ✍️ dastur sahifasi |
| 7 | `min_gpa` | `3.9` | ✍️ dastur sahifasi |
| 8 | `ib_requirement` | `HL Chemistry + HL Math` | ✍️ dastur sahifasi |
| 9 | `a_level_requirement` | `A* A* A*` | ✍️ dastur sahifasi |
| 10 | `ap_requirement` | `AP Calculus BC, AP CS A` | ✍️ dastur sahifasi |
| 11 | `subject_requirements` | `Mathematics, Physics` | ✍️ dastur sahifasi |
| 12 | `other_requirements` | `PTE 92+, Cambridge C1 Advanced` | ✍️ dastur sahifasi (matn) |
| 13 | `portfolio_required` | `false` | ✍️ |
| 14 | `interview_required` | `false` | ✍️ |
| 15 | `recommendation_required` | `true` | ✍️ |
| 16 | `personal_statement_required` | `true` | ✍️ |
| 17 | `source_url` | `https://...` | ✅ manba |
| 18 | `last_verified_at` | `2026-09-30` | ✅ |
| 19 | `verification_status` | `unverified` | ✅ (siz tasdiqlaysiz) |
| 20 | `id` | — | avtomatik |

---

## 📘 4-JADVAL: `application_cycles` (14 ustun) — har bir intake/round uchun **1 qator**

| # | Ustun | Misol | Qayerdan |
|---|-------|-------|----------|
| 1 | `university_id` | `1` | ✅ |
| 2 | `academic_year` | `2027-2028` | ✍️ admissions saytidan |
| 3 | `intake` | `Fall` | ✍️ |
| 4 | `application_type` | `Regular Decision` | ✍️ |
| 5 | `opening_date` | `2026-09-01` | ✍️ |
| 6 | `deadline` | `2027-01-05` | ✍️ |
| 7 | `deadline_timezone` | `America/New_York` | ✍️ |
| 8 | `application_fee` | `100` | ✍️ |
| 9 | `application_fee_currency` | `USD` | ✅ (`USD`) |
| 10 | `application_url` | `https://apply.mit.edu` | ✍️ |
| 11 | `source_url` | `https://...` | ✅ manba |
| 12 | `last_verified_at` | `2026-09-30` | ✅ |
| 13 | `verification_status` | `unverified` | ✅ |
| 14 | `id` | — | avtomatik |

---

## 📙 5-JADVAL: `sources` + `university_sources` — **manbalar**

### `sources` (har bir manba uchun 1 qator, takrorlanmaydi)

| Ustun | Misol |
|-------|-------|
| `url` | `https://admissions.mit.edu/apply/` |
| `title` | `MIT Admissions — Apply` |
| `domain` | `admissions.mit.edu` |
| `source_type` | `official_website` |
| `is_official` | `true` |
| `accessed_at` | `2026-09-30` |
| `is_verified` | `false` → siz `true` qilasiz |
| `id` `created_at` | avtomatik |

### `university_sources` (bog'lash)

| Ustun | Misol |
|-------|-------|
| `university_id` | `1` |
| `source_id` | `42` |
| `source_type` | `official_website` |
| `id` | avtomatik |

---

## 📊 JAMI

| Jadval | 1 ta universitet uchun |
|--------|------------------------|
| `universities` | **1** qator |
| `programs` | **5–12** qator |
| `program_requirements` | **5–12** qator (har dasturga 1) |
| `application_cycles` | **1–4** qator |
| `sources` | **8–15** qator |
| `university_sources` | **8–15** qator |
| **JAMI** | **~25–35 qator** |

---

## 🚫 Nima KIRITILMAYDI

| Ustun | Nega |
|-------|------|
| `verification_status` = `verified` | ⚠️ avtomatik **hech qachon**. Faqat sizning tasdiqlogingiz bilan (spec §14) |
| `min_gpa` = `3.0`, `min_ielts` = `6.5` | ⚠️ `api/admin/universities/route.ts` hozir shunday **o'ylab topadi** — bu taxmin, manbasiz. Topilmasa `NULL` |
| `world_ranking` = `0` | ⚠️ litsenziyali ma'lumot. `NULL` |
| `country` = `Unknown`, `city` = `""` | ⚠️ o'ylab topilgan |
| `image_url` (tashqi rasm) | 🔒 mualliflik huquqi — o'zingizga tegibdi |
