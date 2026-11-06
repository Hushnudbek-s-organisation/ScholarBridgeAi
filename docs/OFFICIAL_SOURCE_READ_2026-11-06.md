# Rasmiy manbalar — qayta o‘qilgan dalil, 2026-11-06

**Usul:** `fetch_page` orqali 4 ta rasmiy sahifa o‘qildi (2026-11-06), so‘ng 2 tasi (MIT tests-scores, MIT stats) **qayta o‘qilib tasdiqlandi**. Quyidagi iqtiboslar sahifa matnidan olingan; hech biri uchinchi tomon blogi yoki xotiradan ko‘chirilmagan. Sahifa mazmuni production DB’ga yozilmadi; faqat lokal `catalogue_facts` follow-up migration’i va ushbu hujjat yangilandi.

**Qayta tekshirilgan URL’lar:**

| # | URL | Holat | Title |
|---|---|---|---|
| 1 | `https://mitadmissions.org/apply/firstyear/tests-scores/` | 2x o‘qildi, mos | Tests & scores \| MIT Admissions |
| 2 | `https://mitadmissions.org/apply/process/stats/` | 2x o‘qildi, mos | Admissions statistics \| MIT Admissions |
| 3 | `https://mitadmissions.org/apply/firstyear/international/` | o‘qildi | International applicants \| MIT Admissions |
| 4 | `https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm` | o‘qildi | ADMISSIONS-Yenching Academy of Peking University |

---

## 1. MIT — testlar va ballar (manba #1)

**Verbatim:**

> “We require the SAT or the ACT for both prospective first-year and transfer students.”

> “**We do not have cutoff or recommended scores for the ACT or SAT** as scores are evaluated within an applicant’s context.”

> “We do have minimum and recommended scores for our English language tests.”

| Test | Minimum | Recommended | Shkala / sana |
|---|---:|---:|---|
| TOEFL (taken **before 1/21/26**) | **90** | **100** | eski iBT shkala |
| TOEFL (taken **on or after 1/21/26**) | **5** | **5.5** | yangi 1–6 shkala, 0.5 qadam |
| IELTS | **7** | **7.5** | IELTS Academic |
| PTE Academic | 65 | 70 | — |
| Cambridge C1/C2 | 185 | 190 | — |
| Duolingo DET | 120 | 125 | — |

> “Effective January 21, 2026, TOEFL will adopt a 1–6 score scale (in 0.5 increments) …”

**Xulosa:** bizdagi legacy `min_toefl = 100` aslida **recommended** qiymat, minimum **90** emas. Yangi shkalada 5/5.5 butunlay boshqa o‘lchov. 90/100 va 5/5.5 ni bitta `min_toefl` maydoniga aralashtirib bo‘lmaydi; test sanasi shkalani belgilaydi. `min_gpa = 3.91` va `min_sat = 1520` rasmiy minimum emas — MIT bunday cutoff e’lon qilmaydi.

## 2. MIT — qabul statistikasi (manba #2)

**Verbatim:** “Admissions statistics for the **Class of 2029**”.

| Ko‘rsatkich | Qiymat |
|---|---:|
| First-year applications | 29,281 |
| First-year admits | 1,334 |
| **Percentage admitted** | **4.6%** |
| International applied / admitted | 6,926 / 136 |
| SAT Math middle 50% | **[780, 800]** |
| SAT ERW middle 50% | **[740, 780]** |
| ACT Composite middle 50% | [34, 36] |

> “these numbers do not _determine_ our admissions process, but they are the _result_ _of_ our process” · “we admit people, not numbers”.

**Xulosa:** 4.6% — **Class of 2029** cohort’iga va shu sahifaga bog‘langan tarixiy qabul darajasi. Bizdagi `acceptance_rate = 4.5` boshqa manba (PDF/uchinchi tomon) va boshqa cycle’ga tegishli; ikkisi bir-birining ustiga yozilmaydi, `admission_cycle` bilan ajratiladi. Middle-50 **qabul qilinganlar statistikasi**, cutoff yoki minimum emas. Hech biri shaxsiy qabul ehtimoli emas.

## 3. MIT — xalqaro arizachilar (manba #3)

> “We do not have any required high school classes for domestic or international applicants.”

> “MIT admissions counselors are trained to understand the educational system in your part of the world. We do not try to convert your grades to the American system … we do not have caps or quotas for countries.”

> “We require a Secondary School Report (SSR) with transcript to be sent by your high school counselor.”

> “We do not have cutoff or recommended scores for the ACT or SAT … We do have minimum and recommended scores for our English language tests.”

**Xulosa:** xalqaro arizachi uchun alohida GPA/SAT kesimi yo‘q; SSR+transcript — hujjat talabi, ball emas.

## 4. Yenching Academy — 2027 cohort (manba #4)

**Verbatim (Qualifications):** “Minimum of a Bachelor’s degree in any field … An outstanding academic record … English proficiency.”

**Verbatim (Materials / English requirements and minimum scores):**

> IELTS (Academic): **Overall 7.0** · TOEFL (iBT): **Overall 5** (TOEFL scores of 100 or above obtained between September 1, 2025 and January 21, 2026 will also be accepted) · Cambridge English Scale (Advanced): 185 · CET 6: 600 · TEM 4: Pass level of “良好” or above

> “International applicants whose native language is English, or have graduated from an English-taught degree program … **are not required** to provide an English proficiency test report. Applicants from China’s Hong Kong, Macao and Taiwan Regions (HMT) **are required** … For applicants from the Chinese Mainland, an English proficiency test report is a **compulsory** application material.”

> “English proficiency tests must be taken after September 1, 2025 … we do not accept TOEFL MyBest Scores, TOEFL iBT Home Edition, IELTS Indicator test, IELTS Online, or IELTS One Skill Retake.”

> “For IELTS, TOEFL, and Cambridge tests, we will only accept scores sent directly to us from these organizations … For TOEFL, use the institution code: **C488**.”

**Aniq hujjatlar ro‘yxati:** completed online application form; personal statement **750 words or less**; Statement of Research Interest **maximum 1500 words, excluding citations**; CV; official transcript(s); diploma(s) / Certificate(s) of Enrollment; **two academic letters of recommendation** — “Peking University will only accept recommendation letters written by **full professors or associate professors** (or equivalent titles). Letters must be submitted by professors in the applicant’s **intended field of study**”.

**Deadline / cycle:** “We accept applications for the **2027 cohort** of Yenching Scholars starting **September 1, 2026**.” · “**Application deadline: November 30, 2026 (9:00 am Beijing time)**.” · “All students and alumni of Partner Universities must apply through your home university’s internal pre-selection process.”

**Fellowship (verbatim ro‘yxat, raqamsiz):** “Tuition fees · Accommodation · **Monthly stipend** · One round-trip travel fare · Field study costs”.

**Kuzatilgan statistika:** “annually enrolls **approximately 120** new students … International students comprise roughly **75%** of the student body.”

**Xulosa:**

- `amount_usd_value = 5040` (CNY/oy aralashgan) rasmiy sahifada **yo‘q** → unknown, 0 emas, 5,040 emas.
- `required_documents` dagi “Generic high-school transcript template” noto‘g‘ri → yuqoridagi aniq master’s ro‘yxati.
- IELTS 7.0 rasmiy **minimum**; TOEFL 5 yangi shkala, 100+ faqat 2025-09-01..2026-01-21 oralig‘ida olingan bo‘lsa.
- Waived / conditional / not-applicable holatlari rasmiy qoidaning bir qismi: native English / English-taught degree → waived; HMT → har doim talab; mainland → majburiy.
- **Dastur davomiyligi** ushbu sahifada e’lon qilinmagan → `not_published`. **Funding davomiyligi** ham e’lon qilinmagan → alohida `not_published`. Ikkovi birlashtirilib aniq jami xarajat chiqarilmaydi.
- ~120 talaba/yil = cohort **o‘lchami**, ~75% = talabalar tarkibidagi **ulush**; hech biri acceptance rate emas.

---

## 5. Kod / ma’lumot modeliga kiritilgan o‘zgarishlar

| Topilma | Qayerda | Qanday ajratildi |
|---|---|---|
| 90 / 100 / 5 / 5.5 | `supabase/official_source_followup_2026-11-06_v2.sql` | 4 ta alohida `field_key`, ikkita shkala, `unit` maydonida sana/shkala |
| minimum vs recommended | shu fayl + `src/lib/evidencePolicy.ts` | `official_requirement` vs yangi `recommended_score` turi; `isOfficialMinimum()` faqat birinchisiga ruxsat beradi |
| IELTS 7 / 7.5 | shu fayl | `min_ielts` + `recommended_ielts` |
| SAT middle-50 | shu fayl | 4 ta `observed_statistic` qator, `admission_cycle='Class of 2029'`, izohda “not a cutoff” |
| 4.5 / 4.6 | shu fayl | ikkita `acceptance_rate` qatori, **turli `admission_cycle`**, `ON CONFLICT DO NOTHING` — biri ikkinchisini ustiga yozmaydi |
| GPA/SAT cutoff yo‘q | shu fayl | `sat_cutoff`, `gpa_cutoff` → `not_published`; mavjud `unverified` qatorlar o‘chirilmay, `value_type` yangilandi |
| Yenching hujjatlari | shu fayl | `required_documents`, `personal_statement_max_words` 750, `research_interest_max_words` 1500, `recommendation_letters` 2 |
| waived/conditional | shu fayl | `english_test_requirement`, `english_test_waiver` = `conditional` / `not_applicable` |
| raqamsiz stipendiya | shu fayl | `monthly_stipend`, `amount_usd_value` → `not_published` |
| davomiylik | shu fayl | `program_duration_years` va `funding_duration` **alohida** `not_published` |
| 120 / 75% | shu fayl | `annual_cohort_size`, `international_share` → `observed_statistic`, acceptance rate emas |
| `[]` / `["*"]` / `["__not_applicable__"]` | `src/app/scholarships/[id]/page.tsx`, `src/lib/eligibilityScope.ts` | `parseEligibilityScope` → tarjima qilingan `eligibility.scope.*` yorlig‘i; xom token hech qayerda chiqmaydi |

**Tekshiruv:** `npm run test:migration-recovery` — real disposable PG’da 3 ta forward qo‘llanadi, ikkinchi apply idempotent, `recommended_score` CHECK mavjud, 4.5/4.6 birga yashaydi, `monthly_stipend = not_published`. `npm run test:evidence-render` — `recommended` yorlig‘i va metadata yo‘q holati real HTML’da render qilinadi.

## 6. Hali bajarilmagan (halol chegara)

- `docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md` dagi `$5,040` kelib chiqishi va duplicate MBA **read-only query’lari production DB’da bajarilmadi**. Ular sxemaga moslashtirildi (`public.programs`, `website_url`, `applications.program_name` matnli review signali), lekin bajarilgan deb yozilmaydi.
- Production’ga hech bir migration qo‘llanmadi, deploy/push qilinmadi.
- Sahifalar `fetch_page` orqali o‘qildi; `officialSourceAdapter.server.ts` orqali production smoke qilinmadi.
- Sahifa mazmuni vaqt o‘tishi bilan o‘zgarishi mumkin; keyingi re-verification `verified_at` ni faqat muvaffaqiyatli check’dan keyin yangilaydi.
