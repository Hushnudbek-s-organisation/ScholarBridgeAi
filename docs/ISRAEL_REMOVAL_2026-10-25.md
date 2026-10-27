# Isroil ma'lumotlar bazasidan butunlay olib tashlandi

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk`
**Sabab:** foydalanuvchi ko'rsatmasi — "Isroil kerak emas, uni umuman databasedan olib tashla".

Bu passda Isroil **qayta yozilmadi, nafaqaga chiqarilmadi — butunlay o'chirildi** (`DELETE`), avvalgi 1–44 passlardagi "is_active = false" usulidan farqli.

---

## 1. O'chirishdan oldingi holat

| Jadval | Yozuvlar | Izoh |
|---|---|---|
| `universities` | **2** | 237 Tel Aviv University (Tel Aviv), 287 The Hebrew University of Jerusalem (Jerusalem) |
| `scholarships` | **2** | 588, 680 — ikkalasi `country = 'Israel'` |
| `university_scholarships` | **2** | ikkala universitetning stipendiya kartalari |
| `programs` | **2** | |
| `application_cycles` | **4** | |
| `university_sources` | **2** | |
| `saved_universities`, `applications`, `application_outcomes`, `application_tasks`, `essay_versions`, `saved_scholarships`, `scholarship_decisions`, `scholarship_sources`, `university_images`, `university_rankings`, `university_programs`, `campuses`, `requirement_templates` | **0** | foydalanuvchi ma'lumoti yo'q — hech narsa yo'qolmaydi |

O'chirish tartibi: `application_cycles` → `programs` → `university_scholarships` → `scholarships` → `universities`. Sabab: `application_cycles (program_id, university_id) → programs (id, university_id)` kompozit kaliti **deferrable emas**, shuning uchun avval bola jadvallar tozalanadi.

Kodda Isroilga oid hech qanday havola yo'q: `src/`, `scripts/` va `src/i18n/messages/*.json` da "Israel" so'zi uchramaydi, ya'ni o'chirishdan keyin katalogda bo'sh filtr qolmaydi.

---

## 2. Arxiv (o'chirilgan qatorlar nusxasi)

### universities

| id | name | canonical_name | country | city |
|---|---|---|---|---|
| 237 | Tel Aviv University | Tel Aviv University | Israel | Tel Aviv |
| 287 | The Hebrew University of Jerusalem | The Hebrew University of Jerusalem | Israel | Jerusalem |

### scholarships 588

| Maydon | Qiymat |
|---|---|
| title | Hebrew University of Jerusalem Scholarships |
| provider | The Hebrew University of Jerusalem |
| coverage_type | Partial Tuition |
| amount_usd_value / award_amount / award_currency | 3625 / 3625 / USD |
| deadline / deadline_type | "Varies; typically Jan–Mar" / unknown |
| degree_levels | ["Bachelor's","Master's","PhD"] |
| min_ielts / min_gpa | 6.5 / 3 |
| tuition_coverage | "Moderate Scholarship (10–30% value)" |
| website_url / source_url | https://en.huji.ac.il / https://en.huji.ac.il |
| description | "The Hebrew University of Jerusalem (Israel) offers the Hebrew University of Jerusalem Scholarships. Maximum award: Moderate Scholarship (10–30% value). Availability for international applicants: Limited." |
| requirements | "Eligibility and documents are published by the university: GPA 3, IELTS 6.5, TOEFL 85." |
| notes | "Imported from the Top 300 Universities dataset (PDF 2026). Availability: Limited." |
| source_reliability | 8 |

### scholarships 680

| Maydon | Qiymat |
|---|---|
| title | Tel Aviv University Scholarships for International Students |
| provider | Tel Aviv University |
| coverage_type | Partial Tuition |
| amount_usd_value / award_amount / award_currency | 3500 / 3500 / USD |
| deadline / deadline_type | "Varies; typically Jan- Mar" / unknown |
| degree_levels | ["Bachelor's","Master's","PhD"] |
| min_ielts / min_gpa | 6.5 / 3 |
| tuition_coverage | "Moderate Partial Scholarship (25–50% tuition)" |
| website_url / source_url | https://english.tau.ac.il / https://english.tau.ac.il |
| description | "Tel Aviv University (Israel) offers the Tel Aviv University Scholarships for International Students. Maximum award: Moderate Partial Scholarship (25–50% tuition). Availability for international applicants: Limited." |
| requirements | "Eligibility and documents are published by the university: GPA 3, IELTS 6.5, TOEFL 85." |
| notes | "Imported from the Top 300 Universities dataset (PDF 2026). Availability: Limited." |
| source_reliability | 8 |

**Muhim izoh:** ikkala qator ham import qilingan shablon qatorlar edi — uydirma USD summalar, tekshirilmagan IELTS/GPA, yalang'och domen manbalar va "Varies; typically Jan–Mar" kabi noaniq muddat. Ular baribir keyingi passlarda qayta yozilishi yoki nafaqaga chiqarilishi kerak edi, shuning uchun o'chirish tadqiqot qiymatini yo'qotmaydi. Tiklash kerak bo'lsa, yuqoridagi jadval yetarli emas — to'liq qatorni tiklash uchun `archive/docs/SCHOLARSHIP_REWRITE_PASS_*.md` konvensiyasiga ko'ra qaytadan tekshirish tavsiya etiladi.

---

## 3. O'chirishdan keyingi hisoblagichlar

| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol stipendiyalar | 565 | **563** |
| Nafaqaga chiqarilganlar | 103 | **103** |
| Shablon tavsifli qatorlar | 19 | **17** |
| Universitetlar | 358 | **356** |

Navbatda qolgan shablon qatorlari (17): Fransiya 2, Meksika 2, Janubiy Afrika 2, BAA 2 + Argentina, Avstriya, Braziliya, Chexiya, Gonkong, Qozog'iston, Livan, Tailand (har biri 1). Isroil 2 tasi o'chirildi.
