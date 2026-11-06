# MIT / Yenching / katalog — ochiq masalalarning yakuniy holati (2026-11-06)

**Holat:** lokal branch `arena/672d7668-scholarbridgeai`, HEAD `d185e61` + ishchi diff.
**Chegara:** production’ga yozish, migratsiya qo‘llash, deploy, real to‘lov yoki Telegram yuborish **qilinmadi**. Bu hujjat `docs/OFFICIAL_SOURCE_RECHECK_2026-11-06.md` dagi eski yakunni yangilaydi: oddiy tekshiruvlar tashqi ruxsatga qoldirilmaydi, balki aniq query/URL, `unknown/review_needed`, sabab va keyingi qadam bilan yoziladi.

> Muhit cheklovi: ushbu sandbox’dan faqat `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org` ga chiqish bor. Rasmiy universitet sahifalari (`mit.edu`, `yenchingacademy.pku.edu.cn`, `sloan.mit.edu`) shu yerda **ochib o‘qilmadi**. Shuning uchun quyida ularni tekshirish uchun aniq URL + qidiruv sharti + kutiladigan maydon berilgan; sahifa mazmuni “ko‘rildi” deb da’vo qilinmaydi. Bu §5 ning “xavfsiz read-only tekshiruv **yoki** aniq tekshiruv query’si” shartining ikkinchi qismidir.

## 1. MIT — dastur/admission-cycle darajasi

| Ochiq masala | Holat | Sabab / keyingi qadam |
|---|---|---|
| Undergraduate vs graduate aralashuvi | `unknown/review_needed` | `min_sat`/`min_gpa` bakalavr qabuliga, IELTS/TOEFL esa graduate dasturga tegishli bo‘lishi mumkin. Tekshirish: `https://mitadmissions.org/apply/process/testing/` (undergrad testing, waiver) va `https://admissions.mit.edu/graduate` (graduate). Har bir `catalogue_facts` yozuvi `degree_level` + `program_name` + `admission_cycle` bilan saqlanishi shart. |
| GPA/SAT “minimum”larni kuzatilgan o‘rtacha bilan almashtirish | **Rad etildi / tuzatildi** | Jonli `id=1` dagi 3.91 / 1520 PDF-dan olingan kuzatilgan qiymatlar edi. `official_source_corrections_2026-11-06.sql` ularni `NULL` + `review_needed` qiladi; o‘rtacha bilan almashtirmaydi. `observed_statistic` hech qachon `official_requirement` ga aylantirilmaydi (`src/lib/typedEvidence.ts`). |
| Ingliz tili talabi / waiver / amal qilish doirasi | `unknown/review_needed` | `https://mitadmissions.org/apply/process/testing/` va har bir graduate dastur sahifasi. Waiver shartlari (o‘qitish tili / ingliz tilida bakalavr) alohida `value_text` + `source_url` + `verified_at` bilan; `min_ielts` default 6.5 olib tashlangan. |
| `PhD in Artificial Intelligence` | `unknown/review_needed` | MIT rasmiy kafedra/EECS/CSAIL sahifasi (`https://www.eecs.mit.edu/academics/graduate-programs/`, `https://www.csail.mit.edu/`) da dastur nomi, qabul sikli va deadline. Repository’dagi yozuv `review_needed` qoladi; dastur yo‘qligi ham, borligi ham da’vo qilinmaydi. |
| SAT 1500 | `unknown/review_needed` | Hech qanday rasmiy MIT sahifasi minimum SAT e’lon qilmaydi; 1500 kuzatilgan/o‘rtacha ko‘rsatkich sifatida ham tasdiqlanmagan. `NULL` + sabab: “official minimum not published”. |
| “Fully funded” | `review_needed` | `tuition waiver` ≠ barcha yashash xarajatlari. Tekshirish: graduate funding/fellowship sahifasi (`https://oge.mit.edu/graduate-admissions/financial-support/`). `grant / loan / waiver / stipend / reimbursement` turlari `src/lib/financeModel.ts` da alohida. |
| Deadline | `unknown/review_needed` | Har dastur/cycle uchun alohida. Umumiy admissions sahifasidagi sana butun institutga tatbiq etilmaydi. |

### 1.1 Dublikat MBA — faqat `id=185` ga tayanmasdan aniqlash

Quyidagi **read-only** query barcha plausible dublikatlarni topadi; ID emas, nom/provider/domain/source asosida:

```sql
-- READ-ONLY. Hech narsa o'chirmaydi, birlashtirmaydi.
-- Jadval/ustun nomlari src/db/schema.ts bilan tasdiqlangan:
--   universityPrograms -> public."programs" (name, university_id, degree_level)
--   universities.website_url (NOT "website"); applications has NO program_id.
SELECT p.id, p.name, p.degree_level, p.university_id,
       u.name AS university_name, u.website_url,
       count(DISTINCT ps.source_id) AS source_links,
       count(DISTINCT a.id) AS applications,
       count(DISTINCT sv.id) AS saved_rows,
       count(DISTINCT ps.id) AS program_sources
FROM public.programs p
LEFT JOIN public.universities u ON u.id = p.university_id
LEFT JOIN public.program_sources ps ON ps.program_id = p.id
LEFT JOIN public.saved_programs sv ON sv.program_id = p.id
-- `applications` is linked to universities, NOT to programs: its only
-- connection to a program is the free-text `program_name`. This is a REVIEW
-- signal, not a foreign key — it must be eyeballed before any merge.
LEFT JOIN public.applications a
       ON a.university_id = p.university_id
      AND lower(btrim(coalesce(a.program_name,''))) = lower(btrim(p.name))
WHERE lower(p.name) LIKE '%mba%'
  AND (lower(u.name) LIKE '%massachusetts institute%'
       OR lower(u.website_url) LIKE '%mit.edu%'
       OR lower(p.name) LIKE '%sloan%')
GROUP BY p.id, p.name, p.degree_level, p.university_id, u.name, u.website_url
ORDER BY p.id;
```

> Eslatma: `public.programs` (Drizzle `universityPrograms`), `universities.website_url`, `saved_programs.program_id`, `program_sources.program_id` va `applications.program_name` nomlari `src/db/schema.ts` bilan tasdiqlandi. `applications.program_id` **mavjud emas**; shuning uchun u matnli `program_name` + `university_id` orqali faqat ko‘rib chiqish signali sifatida ulanadi. Production’da qo‘llashdan oldin jonli sxema `information_schema.columns` bilan qayta solishtiriladi — hech qachon taxminiy JOIN bilan yozuv o‘chirilmaydi.

**Xavfsiz merge/redirect rejasi (production’da qo‘llanmadi):**
1. Yuqoridagi query natijasida **0 yoki >1 plausible canonical** bo‘lsa → hech narsa qilinmaydi, `review_needed` + sabab.
2. Bitta canonical tanlansa: avval barcha bog‘lanishlar (applications, saved, sources, program_requirements, application_cycles) ro‘yxati olinadi.
3. `DELETE` o‘rniga: dublikat qatorga `canonical_program_id` / `merged_into` belgisi, `redirect` yozuvi va barcha FK’lar canonical’ga ko‘chiriladi (transaction ichida, `ON CONFLICT` bilan).
4. Qonuniy ariza/saqlangan yozuvlar saqlanadi; foydalanuvchi ko‘rgan eski URL `/programs/<old>` → `/programs/<canonical>` ga 301/302 qilinadi.
5. Rollback: `merged_into` NULL qaytarish + redirect o‘chirish; hech qanday qator jismonan o‘chirilmagani uchun tiklash to‘liq.

## 2. Yenching — dastur/fellowship sahifalari

| Ochiq masala | Holat | Sabab / keyingi qadam |
|---|---|---|
| IELTS 7.0 / test turi / minimum / waiver / cycle | `verified` (mavjud migratsiya) + `review_needed` (waiver/cycle) | Rasmiy `https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm` IELTS 7.0 va komponentlarni e’lon qiladi. Waiver va aniq qabul sikli uchun `https://yenchingacademy.pku.edu.cn/` fellowship/FAQ sahifalari tekshiriladi; topilmasa `unknown/review_needed` + “official page does not publish a waiver”. |
| Stipendiya summasi | **To‘qilmadi** | Jonli `amount_usd_value=5040`, `living_allowance=3000`, `award_currency='CNY'`, `award_period='month'`, `award_basis='full_tuition'` aralashuvi rasmiy sahifada tasdiqlanmagan. Migratsiya ularni `NULL` qiladi, `award_basis='variable'`. E’lon qilinmagan summa `0` emas, `unknown`. |
| “Medical insurance” / “two-year” | **Noto‘g‘ri deb belgilanmadi** | Faqat bitta umumiy admissions sahifasida uchramagani uchun xato deb topilmadi. Tekshirish: Yenching fellowship / “Scholarship and Funding” / “Program Structure” sahifalari. Dastur davomiyligi (2 yil) va moliyalashtirish davomiyligi alohida maydonlarda saqlanadi (`period` + `degreeLevel` + `admissionCycle`). |
| `$5,040` kelib chiqishi | `unknown/review_needed` | Repository’da topilmaganligi jonli bazada yo‘qligini isbotlamaydi. Quyidagi read-only query tayyor (production’da **bajarilmadi**). |

```sql
-- READ-ONLY: $5,040 / 5040 qayerdan kelganini aniqlash uchun aniq query.
-- Hech qanday token/secret/hujjat mazmuni o'qilmaydi, faqat katalog maydonlari.
SELECT id, title, provider, amount_usd_value, award_amount, award_currency,
       award_period, award_basis, living_allowance, currency,
       verification_status, verified_at, source_id
FROM public.scholarships
WHERE amount_usd_value = 5040
   OR award_amount = 5040
   OR lower(coalesce(title,'') || ' ' || coalesce(description,'')) LIKE '%5,040%'
   OR lower(coalesce(notes,'')) LIKE '%5040%';

-- Qo'shimcha: kanal/render materiallaridagi $5,040 iborasi manbasi (read-only).
SELECT id, template_key, field_key, LEFT(value_text, 120) AS preview
FROM public.catalogue_facts
WHERE value_text LIKE '%5,040%' OR value_text LIKE '%5040%';
```

> Ikkinchi query `catalogue_facts` jadvali migratsiya qo‘llangandan keyin ishlaydi; hozir `migration_pending`. Shu sabab ham javob `unknown/review_needed`, sabab: “jadval hali yaratilmagan”, keyingi qadam: migratsiyani disposable/staging’da qo‘llab query’ni qayta yugurtirish.

## 3. Katalog bo‘yicha yakuniy qoidalar (kodda amalga oshirilgan)

| Qoida | Qayerda | Dalil |
|---|---|---|
| Bo‘sh eligibility ≠ “All countries” | `src/lib/eligibilityScope.ts` | `[]` → `unknown`; `["*"]` → source-backed `unrestricted`; `["__not_applicable__"]` → not applicable; legacy `["All"]` → `legacy` (review-needed). `test:channel` 196/0, `test:source-recheck` 10/0. |
| Tuition waiver ≠ barcha yashash xarajatlari | `src/lib/financeModel.ts`, `src/lib/costs.ts` | `waiver` faqat tuition’ga ta’sir qiladi; `unknown` yashash xarajati `0` emas. `test:finance-unified` 16/0, `test:costs` 71/0. |
| Grant / loan / waiver / stipend / reimbursement alohida | `src/lib/financeModel.ts` | `repayable`/`reimbursement` net-cost’dan chiqariladi; `test:finance-unified` 16/0. |
| Generic hujjatlar ≠ rasmiy majburiy talab | `src/lib/typedEvidence.ts`, migratsiya | Yenching uchun rasmiy master-only hujjatlar; `documents.readiness=null` tasdiqlanmaguncha. |
| QS edition = source URL yili | `src/db/seedVerifiedUniversityFacts.ts` | `VERIFIED_QS_2026` / 2026 URL / `qsRankYear:2026`; recheck hujjati §2.3. |
| Tasdiqlanmagan testimonial = demo | `src/i18n/messages/*.json` | “Fictional teaching material, not verified admitted submissions” (`writingCoverage`). |
| Manba yo‘q → `unknown/review_needed` + sabab + keyingi qadam | `src/lib/reviewQueue.ts`, `src/components/admin/ReviewQueue.tsx` | Har item’da reason/source/priority/nextAction; ro‘yxat ochilishi `verified` qilmaydi. `test:review-queue` 15/0. |

## 4. Qolgan cheklovlar (halol)

- Yuqoridagi rasmiy URL’lar sandbox’dan ochib o‘qilmadi; ularning **hozirgi mazmuni** tasdiqlanmagan. Production’da qo‘llashdan oldin ushbu URL’lar `src/lib/officialSourceAdapter.server.ts` orqali (SSRF guard bilan) qayta o‘qilishi va `official_source_checks` ga yozilishi kerak. HTTP 200 fakt tasdiqlanishi emas.
- `$5,040` va dublikat MBA query’lari production bazada **bajarilmadi**; ular tayyor, read-only va rollback’li.
- Hech qanday qator o‘chirilmadi, birlashtirilmadi, `verified` deb belgilanmadi. 352/252/352 eski sonlar boshlang‘ich ma’lumot sifatida qoladi, joriy aniq son deb takrorlanmaydi.

---

## 2026-11-06 — rasmiy sahifalar qayta o‘qildi (dalil saqlandi)

Yuqoridagi ochiq masalalar bo‘yicha `fetch_page` orqali 4 ta rasmiy sahifa o‘qildi, ikkitasi qayta tekshirildi. **Verbatim iqtiboslar, jadval va kod/fixture’ga kiritilgan o‘zgarishlar:** `docs/OFFICIAL_SOURCE_READ_2026-11-06.md`. Asosiy tuzatishlar:

- MIT `min_toefl = 100` aslida **recommended**, minimum 90 (eski shkala) yoki 5 (2026-01-21 dan 1–6 shkala); 5.5 — yangi shkala recommended. Ular bitta maydonga aralashtirilmadi.
- IELTS minimum 7 / recommended 7.5 alohida `field_key` va `value_type` (`official_requirement` / `recommended_score`).
- SAT Math [780,800] va ERW [740,780] — **Class of 2029 admitted-cohort middle-50**, cutoff emas.
- `4.6%` (Class of 2029, MIT stats sahifasi) va `4.5%` (PDF/uchinchi tomon, cycle noma’lum) **ikki alohida qator**, biri ikkinchisining ustiga yozilmadi; hech biri shaxsiy qabul ehtimoli emas.
- Yenching 2027: IELTS Academic 7.0 rasmiy minimum; aniq hujjatlar ro‘yxati (online form, personal statement ≤750, research interest ≤1500, CV, official transcript, diploma, **2 ta professor/associate professor tavsiyasi**, English score); waived/conditional/HMT qoidalari; deadline 2026-11-30 09:00 Beijing.
- Fellowship: tuition, accommodation, **monthly stipend**, 1 round-trip, field-study — **hech qanday raqamli summa yo‘q** → `not_published`, 0 emas, 5,040 emas. Dastur davomiyligi va funding davomiyligi alohida `not_published`.
- ~120 talaba/yil va ~75% xalqaro — cohort o‘lchami / ulush, **acceptance rate emas**.

**Versiyalangan follow-up:** `supabase/official_source_followup_2026-11-06_v2.sql` (qo‘llangan bo‘lishi mumkin bo‘lgan asl migration’lar jim tahrirlanmadi). `recommended_score` turi `src/lib/evidencePolicy.ts`, `src/lib/typedEvidence.ts`, `src/lib/factPresentation.ts`, `src/components/EvidenceNote.tsx` va EN/UZ/RU tarjimalariga kiritildi.

**Bajarilmagan (aniq):** `$5,040` kelib chiqishi va duplicate MBA read-only query’lari **production DB’da yugurtirilmadi** — yuqoridagi query’lar sxemaga moslashtirilgan, lekin bajarilgan deb hisoblanmaydi. Production migration/deploy/push qilinmadi. Adapter orqali official-source smoke ham qilinmadi.
