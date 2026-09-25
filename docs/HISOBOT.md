# ScholarBridge AI — To'liq hisobot

Branch: `arena/01a0d7e1-scholarbridgeai` · HEAD: `c581d56` · 7 commit · 141 fayl · +15 441 / −523 qator

---

## 1. Tizim miqdori

| Ko'rsatkich | Son |
|---|---|
| Mantiq kutubxonalari (`src/lib/*.ts`) | 40 |
| API route'lar | 78 |
| Ma'lumotlar bazasi jadvallari | 54 |
| UI komponentlar | 58 |
| Test skriptlar | 15 |
| Foydalanuvchi tab'lari | 23 |
| Unit assertion'lar | 472 (+ 52 security) |

---

## 2. Imkoniyatlar va ular qanday ishlaydi

### 2.1 Universitet mosligi — `Match %`

**Fayl:** `src/lib/matching.ts` → `calculateUniversityMatch`, `calculateScholarshipMatch`

Faqat **qoidalar va universitetning ommaviy ma'lumotlari** asosida ishlaydi: GPA, IELTS/TOEFL, SAT/ACT, mutaxassislik, mamlakat, byudjet. Natija `matchScore` + `matchCategory` + `reasons` + `potentialIssues`.

Bu hech qachon "qabul ehtimoli" deb atalmaydi — bu sizning profil talablariga moslik.

### 2.2 Qabul ehtimoli — `Admission %`

**Fayl:** `src/lib/chancing.ts` → `estimateAdmissionChance`

`Match %` dan **alohida** raqam. Diapazon shaklida beriladi (`low–mid–high`), bitta nuqta emas.

Qanday ishlaydi:
1. **Baseline** — universitetning e'lon qilingan `acceptanceRate`idan. Agar bo'lmasa, `worldRanking` tier'idan (va bu `negatives`da aytiladi).
2. **Profil omili** — akademik, test, mutaxassislik, faoliyat, xalqaro omillar, moliya bo'yicha sub-ballar. Omil `[0.3, 1.8]` oralig'iga siqiladi.
3. **Clamp** — `p` aralashtirishdan **oldin** `[0.01, 0.95]` ga siqiladi. (Bu muhim: siqilmagan `p` 1 dan yuqori bo'lsa, haqiqiy outcome'lar raqamni deyarli o'zgartira olmaydi.)
4. **ScholarBridge ma'lumotlari bilan aralashtirish** — universitetda ≥5 outcome bo'lsa:
   - `empirical = (accepted + waitlisted × 0.5) / total`
   - `weight = clamp(total / 60, 0.1, 0.7)` — qancha ko'p outcome, shuncha ko'p vazn
   - `p = weight × empirical + (1 − weight) × p`
5. **Ishonch** — profil to'liqligiga qarab `[15, 95]` ga siqiladi.

Har bir natijada `dataBasis` bor: `public-estimate` | `hybrid` | `scholarbridge-data`. Va `disclaimer` har doim raqamning qayerdan kelganini aytadi.

### 2.3 "Nima qilishim kerak?" — 3 ta harakat

**Fayl:** `src/lib/nextActions.ts` → `buildNextActions`, `buildCandidateActions`

Dashboard'ning markazi. ~20 ta nomzod harakat ballanadi, eng yuqori 3 tasi ko'rsatiladi:

| Vaziyat | Ball |
|---|---|
| Muddati o'tgan deadline | 100 |
| ≤14 kunlik deadline | 98 |
| Ingliz tili testi yo'q | 88 |
| Profil to'liqligi <50% | 84 |
| Qisqa ro'yxat yo'q | 80 |
| Insho kerak | 78 |
| Tavsiyachilar so'ralmagan | 76 |
| Grant portfeli | 72 |
| Natijani xabar qilish | 58 |
| Viza/moliya tayyorgarligi | 48 |

Shoshilinchlik: ≥90 `critical`, ≥60 `high`, ≥30 `medium`, aks holda `low`.

### 2.4 AI maslahatchi

**Fayl:** `src/lib/advisor.ts` → `buildAdvisorBrief`, `rulesAdvice`, `isTrustworthyReply`

Ikki qatlam:
1. **`rulesAdvice`** — deterministik maslahat, AI ishlamasa ham bor.
2. **AI javobi** — `isTrustworthyReply` orqali tekshiriladi. Rad etish sabablari:
   - bo'sh yoki <40 belgi
   - **o'ylab topilgan foiz** — ruxsat etilgan to'plam faqat `fitScore`, `admission low/high/mid`, `confidence`, `completenessPct`. AI boshqa raqam aytsa, javob tashlanadi.
   - kafolat tili ("guaranteed", "you will be accepted")

### 2.5 Shaxsiy yo'l xaritasi

**Fayl:** `src/app/api/roadmap/generate/route.ts` (173 qator)

Saqlangan universitet va grantlardan **milestone vazifalarini** avtomatik yasaydi, `application_tasks` jadvaliga yozadi. Grant hujjat talablari checklist vazifasiga aylanadi. Mavjud vazifalarni takrorlamaydi (duplikat tekshiruvi bor). Yangi milestone yasalsa, `milestone_due` bildirishnomasi ketadi.

Deterministik qism — `src/lib/nextActions.ts` va `src/lib/advisor.ts` — `test:roadmap` (51 assertion) bilan qoplangan. Bu test aynan shu ikki faylni tekshiradi:
- har doim aniq 3 ta harakat qaytadi
- deadline'lar ustun keladi
- blokerlar sayqaldan ustun
- determinizm
- advisor brief faqat haqiqiy raqamlarni o'z ichiga oladi
- o'ylab topilgan raqamlar rad etiladi
- qoidaga asoslangan maslahat mustaqil turadi

### 2.6 Deadline kalendari

Barcha sanalar bir joyda: universitet, grant, IELTS, SAT, ariza, tavsiyanoma, moliya.

Ranglar: 🔴 `critical` · 🟠 `warning` · 🟡 `upcoming`.

### 2.7 Ariza kuzatuvchisi + natijalar

**Jadval:** `applications` · `application_outcomes`

Holatlar: `not_started → in_progress → submitted → accepted/rejected/waitlisted/deferred/withdrawn`.

**Bu dataset strategiyasining yuragi.** Har bir qarorda profil snapshot'i olinadi:
`snapshotGpa`, `snapshotGpaScale`, `snapshotIelts`, `snapshotToefl`, `snapshotSat`, `snapshotAct`, `snapshotMajor`, `snapshotCountry`, `snapshotExtracurriculars`.

Schema sharhi sababni yozadi: *"faqat qabullarga o'rgatilgan model 'har bir kuchli talaba qabul qilinadi'ni o'rganadi."* Shuning uchun **rad etishlar ham saqlanadi**.

### 2.8 Hujjat tekshiruvchi

**Fayl:** `src/lib/documents.ts` → `checkDocument`, `checkDocuments`, `expectedDocuments`

Qoidalar ketma-ketligi:

1. **Majburiy hujjat yo'q** → `blocker/missing_required` (darhol qaytadi)
2. **Yuklanganlar:**
   - muddati o'tgan → `blocker/expired`
   - pasport `intakeDate + 6 oy`ga qarshi → `blocker/passport_buffer`, aks holda ≤90 kun → `warning`
   - boshqa turlar ≤60 kun → `warning`
   - ariza deadline'idan oldin tugaydi → `blocker/expires_before_deadline`
   - muddati bor tur, lekin `expiresAt` yo'q → `warning/expiry_unknown`
3. **Format:** kengaytma `.pdf .jpg .jpeg .png` dan boshqa → `blocker/bad_format`; >10 MB → `blocker/too_large`; <20 KB → `warning/suspiciously_small`; eski yuklama → `warning/stale_upload`

Amal qilish muddati: pasport/ingliz tili 24 oy, moliya 6 oy, tibbiy 12 oy.

`readiness` = bloklangan bo'lmagan majburiylar ÷ jami majburiylar.

`expectedDocuments` mamlakatga qarab qo'shadi: Germaniya uchun APS, AQSh master'i uchun GRE.

### 2.9 Insho rubrikasi

**Fayl:** `src/lib/essay.ts` → `analyzeEssay`, `compareVersions`

Og'irliklar: `hook .15 + structure .20 + specificity .30 + language .15 + fit .20`

Blokerlar:
- aniq misol yo'q → specificity 35 da to'xtaydi + `blocker/no_evidence`
- 12 ta shablon iboradan ≥3 tasi → bloker
- universitet nomi aytilmagan → `blocker/target_not_named`
- limitdan oshgan → `blocker/over_limit`
- limitning <60% → ogohlantirish
- `blocker/opening_boilerplate`, takroriy so'z, passiv gap, monotoniya, >250 so'zli paragraf

`compareVersions` qaysi sub-ball o'zgarganini va `fixedIssues`/`newIssues`ni ko'rsatadi.

### 2.10 Viza intervyusi

**Fayl:** `src/lib/visaScoring.ts` → `scoreVisaInterview`, `visaChanceDisclaimer`

6 ta mezon + `total`. Xavf kodlari: `immigrant_intent`, `weak_purpose`, `funding_not_stated`, `no_home_ties`, `hedging`, `no_answers`.

`visaChanceDisclaimer(n)` har doim `n%` **va** "opinion"/"not a prediction" so'zlarini o'z ichiga oladi. `visaChanceDisclaimer(null)` esa "No probability is shown" deydi.

### 2.11 O'xshash profillar

**Fayl:** `src/lib/similarProfiles.ts` → `findSimilarProfiles`, `similarityScore`

Og'irliklar: GPA `.28`, ingliz tili `.14`, test `.13`, mutaxassislik Jaccard `.20`, bir xil mamlakat `.15`, faoliyat `.10`. `minSimilarity` = 45.

**Rozilik ikki joyda majburiy** — so'rovda `shareConsent = true` filtri **va** kutubxonada yana bir marta (defence in depth). Roziliksiz qator egasining akkauntidan tashqariga chiqmaydi, hatto agregat shaklida ham.

`acceptanceShare` namuna `MIN_SAMPLE_FOR_SHARE = 5` dan kam bo'lsa **`null`** — kichik namuna foiz bo'lib ko'rsatilmaydi.

Normallashtirish: `gpaTo4(4.75, 5) → 3.8` · TOEFL→IELTS `(t−40)/12` · ACT→SAT `act×40+180`.

### 2.12 Xarajat kalkulyatori

**Fayl:** `src/lib/costs.ts` → `calculateCosts`, `assessPortfolio`

Faqat o'qish to'lovi emas — yashash, sug'urta, kitoblar, aviachipta, viza to'lovi.

- Viza to'lovi **bir marta** qo'shiladi, har yili emas
- Yashash mamlakat bo'yicha taxmin qilinadi va `estimated: true` belgilanadi
- Germaniya uchun bloklangan hisob (≈ €11k/yil) qaydi ko'rsatiladi
- E'lon qilinmagan har bir qator `unknowns`ga tushadi va verdict "bu pol, kotirovka emas" deydi
- `accommodation` faqat yashash raqami bo'lmaganda qo'shiladi (ikki marta sanalmasligi uchun)

Grant yordami: `expected = Σ amount × probability`; `guaranteed` faqat aniq bo'lsa. Yashash uchun stipendiya o'qish to'lovini qoplay olmasa → `misaligned` ("…still unfunded").

`net.affordable` faqat `annualAfterScholarship ≤ familyContribution` bo'lsa `true`.

Portfel: `diversification` = good (≥8 grant) / thin (4–7) / risky (<4). `chanceOfAnyAwardPct = 1 − Π(1−p)`.

### 2.13 CV yasovchi

**Fayl:** `src/lib/cv.ts` → `buildCv`, `renderCvText`, `FORBIDDEN_ON_CV`

Bo'limlar tartibi: Education → Standardized Tests → Research & Projects → Honours & Awards → Leadership & Activities → Work Experience → Certifications & Languages → Objective.

**Hech qachon ma'lumot o'ylab topmaydi.** Bo'sh maydon tushirib qoldiriladi va `missing`ga yoziladi.

Taqiqlangan: fotografiya, tug'ilgan sana, oilaviy holat, din, milliy raqam.

Sahifa soni render chiqaradigan qatorlardan hisoblanadi: `ceil((3 + bo'limlar×2 + elementlar) / 45)`.

Ogohlantirishlar: bo'sh CV, "No evidence section", "No leadership role", hajm (>22 element → "ro'yxat, CV emas"), uzunlik (>2 sahifa).

### 2.14 Taqqoslash jadvallari

**Fayl:** `src/lib/compare.ts` → `compareUniversities`

Har bir qator g'olibni **va negaligini** aytadi. Yoki g'olib yo'qligini:
- **durang → `winner: null`**
- faqat bir tomon e'lon qilgan → g'olib e'lon qilinmaydi
- hech narsa e'lon qilinmagan → qator butunlay tushirib qoldiriladi
- bo'sh katak `null` (0 emas), UI "not published" ko'rsatadi

6 ta universitetgacha. `gpaFit` va `budgetFit` talabaning o'z raqamlarini tekshiradi.

Bir xil universitetlar → "The published data does not separate these universities."

### 2.15 Mentor bozori

**Fayl:** `src/lib/mentors.ts` → `matchMentors`

Mentor qiymati — u **aynan shu yo'ldan o'tgani**. Ballar:

| Signal | Ball |
|---|---|
| Bir xil universitet | +40 |
| Bir xil grant | +25 |
| Bir xil mamlakat | +22 |
| Bir xil soha | +12 |
| Til | +8 |
| Tasdiqlangan | +10 |
| Tasdiqlanmagan | −8 |
| Reyting (≥3 sharh) | `+(rating − 3.5) × 4` |

Har bir moslikda `reasons` **va** `gaps` bor. Tasdiqlangan mentor har doim tasdiqlanmaganidan yuqori turadi.

Ism solishtirish ma'noli so'zlar va prefiks-initializmlar orqali: `Technical University of Munich` → `tu`, `tum`.

Aloqa ma'lumotlari ayirboshlanmaydi — mentor avval qabul qilishi kerak.

### 2.16 Ota-ona paneli

**Fayl:** `src/lib/parentSummary.ts` → `buildParentSummary`, `parentShareLink`

Bu **oq ro'yxat, filtr emas**. Ota-onaga yetadigan har bir maydon nom bilan yaratiladi, shuning uchun yangi ustun qo'shilishi uni avtomatik oshkor qilmaydi.

Holatlar: `urgent` (kritik deadline) · `needs_attention` · `on_track` · `getting_started`.

Ota-ona ko'radigan: yo'lda bormi, nechta ariza topshirildi, yillik xarajat, moliyaviy kamchilik, eng yaqin deadline, faqat ota-ona bera oladigan hujjatlar.

**Hech qachon ko'rmaydi:** parol, insho qoralari, GPA va test ballari, rad etishlar ro'yxati, shaxsiy yozishmalar.

Kirish: CSPRNG token, doimiy vaqtda solishtiriladi (`timingSafeEqual`), istalgan vaqtda bekor qilinadi, faqat o'qish.

### 2.17 Dataset tayyorligi

**Fayl:** `src/lib/dataset.ts` → `assessDataset`, `universityHasEmpiricalData`

Sizning strategiyangiz: 1k → 100k yozuvdan keyin ML. Endi bu kod bilan majburiy.

**Oltita darvoza** — ML faqat barchasi o'tganda ruxsat etiladi:

| Darvoza | Chegara |
|---|---|
| Hajm | 100 000 rozilik berilgan yozuv |
| Balans | eng kichik sinf ≥5% |
| Kenglik | ≥200 universitet |
| Soha | ≥30 mutaxassislik |
| Mustaqillik | ≥5 000 talaba |
| Yangilik | ≥60% oxirgi 5 yilda |

**Hajm yetarli emas.** 250k yozuv, lekin 98% qabul, 6 universitet, 10 yillik — ML ruxsat etilmaydi. Test buni tekshiradi.

`withdrawn` label to'plamiga kirmaydi: talabaning o'z tanlovi, universitetning qarori emas.

Progress har bir darvoza progressining o'rtachasi — bitta katta son boshqa barcha darvozani yiqqan datasetni olib chiqa olmaydi.

Tayyor bo'lmaganda modul `forbiddenClaims` qaytaradi: `"predicted probability"`, `"our model says you will be accepted"`, `"machine learning estimate"`, `"guaranteed admission"`.

`GET /api/chancing` javobida `dataset` maydoni bor.

---

## 3. Ma'lumotlar bazasi

54 jadval. Asosiylari:

- **Profil:** `student_profiles`
- **Kashfiyot:** `universities`, `programs`, `scholarships`, `program_requirements`
- **Ariza:** `applications`, `application_documents`, `application_tasks`, `application_cycles`, `application_outcomes`
- **Saqlangan:** `saved_universities`, `saved_scholarships`
- **AI:** `ai_evaluations`, `ai_usage`, `ai_provider_credentials`
- **Jamiyat:** `forum_threads`, `forum_replies`, `forum_likes`, `forum_reports`, `mentors`, `mentor_requests`
- **O'quv:** `courses`, `lessons`, `course_modules`, `quizzes`, `quiz_attempts`, `certificates`
- **Moliya:** `payments`, `subscriptions`
- **Gamifikatsiya:** `points_ledger`, `levels`, `badges`, `user_badges`, `referrals`

---

## 4. Xavfsizlik

- Server-tomonli sessiyalar (`src/lib/auth.ts`)
- Rate limiting (`src/lib/rate-limit.ts`)
- CSP nonce (request **va** response header'larida)
- Parol hashing (`src/lib/password.ts`)
- SSRF himoyasi (`src/lib/ssrf.ts`)
- So'rov hajmi chegaralari (`src/lib/request.ts`)
- To'lov webhook imzolari (`src/lib/payments.ts`)
- Audit log (`src/lib/audit.ts`)
- IDOR himoyasi — 31 ta route `requireProfileAccess`, 6 tasi (`/documents`, `/essays`, `/applications`, `/applications/outcome`, `/saved-universities`, `/saved-scholarships`) qator darajasida `requireRowAccess` chaqiradi: avval qator olinadi, keyin egalik tekshiriladi
- Ochiq qolgan 6 ta route tekshirildi va ochiq katalog hisoblanadi: `/courses`, `/courses/[id]`, `/scholarships`, `/universities` (faqat GET, faqat ommaviy ma'lumot), `/track` (throttle'langan beacon), `/premium/status` (`optionalProfileAccess`)

**npm audit:** `next@16.2.6` critical → `16.3.6` ga tuzatildi. Qolgan 4 ta moderate — `esbuild <=0.24.2` (`drizzle-kit → @esbuild-kit/esm-loader` orqali). Yagona yechim — breaking downgrade, shuning uchun rad etildi va hujjatlashtirildi.

---

## 5. Testlar topgan haqiqiy buglar

Barchasi test yozilganda chiqdi va tuzatildi:

1. **Mentor moslashtirish talabani noto'g'ri odamga yuborardi.** Ism solishtirgichi 3 harfdan qisqa tokenlarni tashlar edi — aynan universitetni farqlovchi akronimni. `"LMU Munich"` → `"TU Munich"` **1.0 (mukammal)**, `"TU Munich"` → `"Technical University of Munich"` **0.33 (mos emas)**.

2. **Taqqoslash jadvali durangda ham g'olib e'lon qilardi.** `<`/`>` solishtirish birinchi qatorni `best` qilib qoldirar edi — bir xil universitetlar har qatorda "yutardi".

3. **`NaN` progress.** Barcha hisoblar SQL agregatidan keladi, `COUNT()`/`SUM()` bo'sh jadvalda `null` qaytaradi → arifmetikada `NaN`. Yangi deployment 0% o'rniga `NaN` ko'rsatardi.

4. **Germaniya bloklangan hisob qaydi qurilgan, lekin hech qayerda ko'rsatilmagan.**

5. **Sahifa soni sehrli bo'luvchidan** ("8 element/sahifa") hisoblanardi, renderer bilan zid edi.

6. **Chancing clamp** — siqilmagan `p` 1 dan yuqori bo'lsa, haqiqiy outcome'lar raqamni o'zgartira olmasdi.

---

## 6. Qo'lda bajarilishi kerak

Loyiha qoidasiga ko'ra `drizzle-kit push` **hech qachon** avtomatik ishga tushirilmaydi. Supabase SQL Editor'da bajaring:

| Fayl | Qator | Nima qiladi |
|---|---|---|
| `supabase/add_profile_chancing_applications.sql` | 135 | profil, chancing, applications, outcomes |
| `supabase/add_documents_essays.sql` | 43 | documents ustunlari + `essay_versions` |
| `supabase/add_mentors_parent.sql` | 66 | `mentors`, `mentor_requests`, 4 ta `parent_share_*` |

Uchalasi ham faqat `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — mavjud ma'lumot o'chmaydi.

---

## 7. Tekshiruv buyruqlari

```bash
npm run test:chancing    # 52
npm run test:roadmap     # 51
npm run test:documents   # 35
npm run test:essays      # 36
npm run test:visa        # 50
npm run test:costs       # 44
npm run test:cv          # 44
npm run test:compare     # 32
npm run test:mentors     # 37
npm run test:parent      # 41
npm run test:dataset     # 50
npm run test:security    # 52 assertion
npm run check:i18n
npm run typecheck
DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/db" npm run build
```

Jami: **472 assertion, 0 failed.**
