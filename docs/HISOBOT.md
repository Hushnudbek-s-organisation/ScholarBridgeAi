# ScholarBridge AI — To'liq hisobot

Branch: `arena/01a0d901-scholarbridgeai` · asos: `17068cc` · 22 commit · 182 fayl · +25 480 / −1 318 qator

---

## 1. Tizim miqdori

| Ko'rsatkich | Son |
|---|---|
| Mantiq kutubxonalari (`src/lib/*.ts`) | 46 |
| API route'lar | 89 |
| Ma'lumotlar bazasi jadvallari | 57 |
| UI komponentlar | 62 |
| Test skriptlar (`scripts/check-*`) | 23 |
| Foydalanuvchi tab'lari | 26 |
| Unit assertion'lar | 758 (+ 52 security) |
| Integratsion assertion'lar | 136 (haqiqiy PostgreSQL) |

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

UI (`TaskRoadmap.tsx`) shuningdek **oylik reja** ko'rinishini beradi: bir xil vazifalar due-date oyiga guruhlantiriladi (Sentyabr → Oktabr → Noyabr), har oyda ✓/□ belgilari va `x/y` hisobi, tepada esa `Progress: x of y — %` progress bar'ı.

### 2.6 Deadline kalendari

Barcha sanalar bir joyda: universitet, grant, IELTS, SAT, ariza, tavsiyanoma, moliya.

Ranglar: 🔴 `critical` · 🟠 `warning` · 🟡 `upcoming`.

### 2.7 Ariza kuzatuvchisi + natijalar

**Jadval:** `applications` · `application_outcomes`

Holatlar: `not_started → in_progress → submitted → accepted/rejected/waitlisted/deferred/withdrawn`.

**Bu dataset strategiyasining yuragi.** Har bir qarorda profil snapshot'i olinadi:
`snapshotGpa`, `snapshotGpaScale`, `snapshotIelts`, `snapshotToefl`, `snapshotSat`, `snapshotAct`, `snapshotMajor`, `snapshotCountry`, `snapshotExtracurriculars`.

Schema sharhi sababni yozadi: *"faqat qabullarga o'rgatilgan model 'har bir kuchli talaba qabul qilinadi'ni o'rganadi."* Shuning uchun **rad etishlar ham saqlanadi**.

**Application analytics** (spec §33): panel tepasida 7 ta jonli statistika — Applied, Submitted, In progress, Decisions, Accepted, Scholarship matches, Deadlines ≤45d. Barchasi API'dan olinadi (`/api/applications`, `/api/deadlines`, `/api/scholarships`); javob kelmaguncha "—" ko'rsatiladi, raqam ixtiro qilinmaydi.

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

**Amaliyot tarixi** (spec §13): kirgan talaba har bir `POST /api/visa/analyze` da deterministik rubrikani saqlaydi (`ai_evaluations`, `evaluationType: "Visa Practice"`); `GET /api/visa/history` eng so'nggi 20 sessiyani qaytaradi. Natija ekrani "Practice history" kartasida Session 1 61% → 2 72% → 3 82% tendensiyasini ko'rsatadi (har sessiyada +Δ ball). Anonim ishlatishda hech narsa saqlanmaydi.

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

6 ta universitetgacha. `gpaFit`, `ieltsFit` va `budgetFit` talabaning o'z raqamlarini tekshiradi.

**Yangi qatorlar** (spec §23 nozikliklari):
- `ieltsFit` — "Your IELTS vs minimum" (`Meets it (+0.5)` / `Below by 0.5`), eng katta margin g'olib.
- `scholarships` — "Scholarships in country" (mamlakatdagi ochiq grantlar soni, haqiqiy `count(*)`).
- Shaxsiylashtirilgan sarlavha qatorlari — `/api/planning` ularni `extraRows` orqali birinchi joyga qo'yadi: **Your profile match** (`matchScore`%) va **Admission estimate** (`low–high%` band). Bu ikki raqam **ajratib turiladi** — match qabul ehtimoli emas.

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

### 2.18 Scholarship essay adapter (#18)

**Fayl:** `src/lib/essayAdapter.ts` → `scoreEssayFit`, `adaptationPlan`, `rankScholarships`

Bitta insho → N ta scholarship. Oltita deterministik signal (jami 100):

| Signal | Og'irlik |
|---|---|
| So'z chegarasi (scholarship'nin nashr qilingan talabidan parse qilinadi) | 20 |
| Tema qoplamasi (scholarship qaysi mavzuni atasa, inshoda shu bo'lishi kerak) | 30 |
| Mutaxassislik (eligible ro'yxat) | 15 |
| Mamlakat (eligible ro'yxat) | 10 |
| GPA (minimaga qarshi, 4.0 scale'da) | 10 |
| Ingliz tili (IELTS yoki TOEFL `(t−40)/12`) | 15 |

Nimani rad etadi: chegara nashr qilinmagan bo'lsa → neytral ball (mag'lubiyat emas); profil maydoni bo'sh bo'lsa → "tekshirib bo'lmaydi" gap (jim o'tish emas); scholarship matnida tema atalmagan bo'lsa → gap bo'lmaydi. Har bir gapga aniq moslash qadami bor (`adaptationPlan`). AI rewrite (`/api/essay-adapter/adapt`) ustiga qo'yiladi: model ishlamasa `adapted: null` + deterministik plan qaytadi — hech narsa bo'lmagandek qilinmaydi.

### 2.19 Recommendation letter helper (#20)

**Fayl:** `src/lib/recLetter.ts` → `buildRecLetterBrief`

Recommender uchun brif: talking points, maktub tuzilmasi, kamchiliklar ro'yxati, amaliy checklist — **faqat profil'da mavjud bo'lgan ma'lumotlardan**. Bo'sh maydon `dataMissing`ga tushadi, o'ylab topilmaydi. GPA har doim 4.0 scale'ga konvert qilinadi (3.7/5 → 2.96/4.0).

### 2.20 Profile strength dashboard + extracurricular analyzer (#21, #22)

**Fayl:** `src/lib/chancing.ts` → `profileStrength`, `analyzeExtracurriculars`, `profileCompletenessRatio` + yangi `/api/profile-strength` route

Har o'lchovga bitta raqam: academics, tests, extracurriculars, leadership, awards, essays, financial + overall va completeness %. Essays bo'limi so'nggi inshoning rubrik ballidan olindi. Extracurricular analyzer: leadership / impact / consistency / academicFit + "keyingi 3 oy" uchun aniq takliflar.

### 2.21 Essay peer review (#24)

**Fayllar:** `src/lib/essayReviews.ts` + `src/app/api/essays/reviews/route.ts` + `EssayRubricStudio.tsx` (PeerReviewSection)

Muallif saqlangan insho versiyasini **o'zi** `open_for_review` flag'i bilan ochadi (`PATCH /api/essays`). Boshqa talaba uchta o'lchov o'lchami + umumiy ball + izoh qoldiradi. Qoidalar:

- Muallif o'z inshosini **hech qachon** sharhlamaydi (API'da 403).
- Yopiq inshoga sharh kirishi mumkin emas (403); muallif yopgach — darhol rad etiladi.
- Sharhlovchilar faqat "Student #001" shaklida anonim ko'rinadi — ism hech qachon o'tmaydi.
- Muallif har bir o'lchov bo'yicha **o'rtacha** raqamni ko'radi — bitta sharhlovchi raqamni yurgiza olmaydi; to'ldirilmagan o'lchov o'rtachadan chiqariladi, nol deb hisoblanmaydi.

### 2.22 Personalized opportunities feed (#26, #27, #28)

**Fayllar:** `src/lib/opportunities.ts` + `/api/opportunities` + `/api/admin/opportunities` + `OpportunitiesPanel.tsx` + admin `OpportunitiesManager`

Tayyor katalog: `opportunities` jadvali (competition / research / internship / summer_school). **Hech qanday scraping yo'q** — faqat admin qo'sha oladigan, tekshirilgan, haqiqiy dasturlar (starter: IMO, IBO, EGMO, ICPC, Regeneron STS, Thiel, FIRST, GSoC, Fulbright, DAAD, MITACS — barchasi rasmiy URL bilan).

Moslik balli deterministik, og'irliklar jami 100:

| Signal | Ball |
|---|---|
| Soha (majorSimilarity) | 40 |
| Mamlakat (International = 15, o'z mamlakati = 20) | 20 |
| Daraja (high_school/undergrad/grad/phd/any) | 20 |
| Muddat (kelajakda = 10, takrorlanuvchi/noma'lum = 5 + flag, o'tgan = 0 + flag) | 10 |

Takrorlanuvchi muddat hech qachon o'ylab topilmaydi — neutral 5 ball va "rasmiy sahifada ko'ring" flag'i. `now` parametri inject qilinadi, natijalar takrorlanuvchan.

### 2.23 Mamlakatlar taqqoslash (#29)

**Fayllar:** `src/lib/countryCompare.ts` + `/api/countries/compare` + `CountryComparePanel.tsx`

Yo'nalish mamlakatlari **faqat bazada nashr qilingan** qiymatlar bo'yicha taqqoslanadi: universitetlar soni, o'rtacha tuish haqi, o'rtacha yashash, o'rtacha min. IELTS, grantlar (son + jami potensial mablag'). Qoidalar:

- Nashr etilmagan qiymat o'rtachadan chiqariladi va qavs ichida sanab ko'rsatiladi — **hech qachon nol deb hisoblanmaydi** (NaN xatosining manbai aynan shu bo'lgan).
- **Work rights / visa** ustuni doim "nashr etilmagan" — platforma xotiradan raqam to'ldirmaydi (bazada bu ma'lumot yo'q).
- Noma'lum mamlakat → nol va null, xato emas.

### 2.24 Voice AI interview — Gemini Live (#13, #14)

**Fayllar:** `src/app/api/visa/live-token/route.ts` + `VisaSpeakingAssistant.tsx` + `src/lib/gemini.ts` (qayta tiklandi)

PR #22 branchga cherry-pick qilindi (original muallif saqlangan) va Gemini'dan Groq/OpenRouter'ga o'tilgan mainline'ga moslandi:

- `src/lib/gemini.ts` (PR bazasidan, o'zi o'z ichida yopiq `@google/generative-ai` qatlam) qayta tiklandi — u **faqat Live ovoz** uchun, chat emas.
- `AIProviderId` ga `gemini` qo'shildi (DB → `GEMINI_API_KEY`); `aiGenerate` chat adapteri bo'lmasa openrouter'ga pasayadi (gemining chat adapteri yo'q).
- Live token server-tomonli yaratiladi, kalit brauzerga **hech qachon** bormaydi; kalit shaklidagi tokenlar javobda `redactGeminiSecrets` bilan tozalangan.
- Kalit bo'lmasa yoki brauzer qo'llab-quvvatlamasa — Web Speech API fallback'iga o'tadi (hujjatlashtirilgan, 404/503 xatolariga backoff bilan retry).

### 2.25 Landing page (qayta qurilgan)

**Fayl:** `src/components/LandingPage.tsx`

Namunaviy dizayn bo'yicha qayta qurildi: sarlavha navi (anchor bo'ylab siljish),
hero + mahsulot dashboard mockup'i, 4 qadamli "qanday ishlaydi", 6 xususiyatli
qorong'u bo'lim, **halol chancing bo'limi** (admission ehtimoli maxsus "—" —
platforma ehtimollikni ixtiro qilmaydi, izoh bilan), roadmap, iqtibos va CTA.
Tugma "Log in" emas — **Sign in** (profil tanlovini ochadi); "Get started"
onboarding'ni boshlaydi; footer /privacy va /terms ga olib boradi.
To'liq lokalizatsiya: `landing` namespace 3 til × 93 kalit.

### 2.26 Aqlli bildirishnomalar (spec §25)

**Fayl:** `src/app/api/notifications/sweep/route.ts`

Sweep endi 5 xil tur yaratadi (barchasi idempotent — `(type, profile_id, link)` bo'yicha):

| Tur | Qachon |
|---|---|
| `deadline_approaching` | saqlangan grantning muddati ≤N kunda |
| `milestone_due` | vazifa muddati ≤N kunda |
| `scholarship_opened` | saqlangan universitet mamlakati bo'yicha profilga mos (≥60%) va hali saqlanmagan yangi grant (bir sweep'da ≤3 ta) |
| `requirement_gap` | saqlangan universitetlar IELTS talabini profildagi IELTS qoplamasa (yoki IELTS umuman yo'q) |
| `essay_improved` | so'nggi insho versiyasi oldingisidan ≥5 ball yuqori |

Yangi turlar `notification_preferences` default'lari hamda 4-qi SQL migratsiyasiga qo'shildi.

### 2.27 Dasturlar shortlist'i (spec §24)

**Jadval:** `saved_programs` (profile ↔ program, `UNIQUE (profile_id, program_id)`)

`UniversityDetail`'da har bir program kartasida save/unsave tugmasi; `/api/saved-programs` (GET/POST/DELETE) IDOR himoyasida — begona cookie 403, phantom program id 404. Dashboard shortlist kartasi universitetlar soni yonida "· N dastur" ko'rsatadi.

---

## 3. Ma'lumotlar bazasi

56 jadval. Asosiylari:

- **Profil:** `student_profiles`
- **Kashfiyot:** `universities`, `programs`, `scholarships`, `program_requirements`
- **Ariza:** `applications`, `application_documents`, `application_tasks`, `application_cycles`, `application_outcomes`
- **Saqlangan:** `saved_universities`, `saved_scholarships`
- **AI:** `ai_evaluations`, `ai_usage`, `ai_provider_credentials`
- **Jamiyat:** `forum_threads`, `forum_replies`, `forum_likes`, `forum_reports`, `mentors`, `mentor_requests`, `essay_reviews`
- **Imkoniyatlar:** `opportunities` (competition / research / internship / summer_school)
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
- IDOR himoyasi — 35 ta route `requireProfileAccess` (20 tasi admin, `requireAdmin`), 6 tasi (`/documents`, `/essays`, `/applications`, `/applications/outcome`, `/saved-universities`, `/saved-scholarships`) qator darajasida `requireRowAccess` chaqiradi: avval qator olinadi, keyin egalik tekshiriladi. `/essay-adapter` route'larida essay versiyasi egaligi `WHERE profileId = sessiya` orqali isbotlanadi (boshqa talabaning versiyasini o'qib bo'lmaydi)
- `PATCH /api/essays` (peer review toggle) egalikni `WHERE id AND profileId = sessiya` bilan tekshiradi — boshqa talaba 404 oladi, insho mavjudekani ham ochilmaydi
- Ochiq qolgan route'lar tekshirildi va ochiq katalog hisoblanadi: `/courses`, `/courses/[id]`, `/scholarships`, `/universities`, `/api/opportunities`, `/api/countries/compare` (faqat GET, faqat ommaviy ma'lumot), `/track` (throttle'langan beacon), `/premium/status` (`optionalProfileAccess`)

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
| `supabase/add_opportunities_essay_reviews.sql` | 100 | `essay_versions.open_for_review`, `essay_reviews`, `opportunities` + 11 ta haqiqiy starter dastur + **`saved_programs`** + `notification_preferences` default'lari kengaytmasi |

Uchalasi ham faqat `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — mavjud ma'lumot o'chmaydi.

---

## 7. Tekshiruv buyruqlari

**Unit testlar** — sof `src/lib/*.ts` mantiqi, baza talab qilmaydi:

```bash
npm run test:chancing    # 52
npm run test:roadmap     # 51
npm run test:documents   # 35
npm run test:essays      # 36
npm run test:visa        # 50
npm run test:costs       # 44
npm run test:cv          # 44
npm run test:compare     # 43
npm run test:mentors     # 37
npm run test:parent      # 41
npm run test:dataset     # 50
npm run test:render      # 37
npm run test:essay-adapter  # 39
npm run test:rec-letter     # 28
npm run test:country-compare  # 17
npm run test:opportunities    # 14
npm run test:essay-reviews    # 16
```

Jami: **758 passed, 0 failed.**

**Xavfsizlik va statik tekshiruvlar:**

```bash
npm run test:security    # 52 assertion
npm run check:i18n
npm run typecheck
DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/db" npm run build
```

**Integratsion test** — haqiqiy route'lar haqiqiy PostgreSQL'ga qarshi:

```bash
npm install --no-save embedded-postgres   # bir marta
npm run test:integration                  # 136 passed, 0 failed
```

Bu `embedded-postgres` bilan jarayon ichida haqiqiy Postgres serverini ishga
tushiradi va `drizzle-kit push` orqali `src/db/schema.ts` dan real sxemani
quradi. `package.json`ga yozilmaydi (`--no-save`), shuning uchun standart
`npm test` yo'lidan tashqarida saqlangan.

Uch yo'nalishni qoplaydi:

| Bo'lim | Nima sinovdan o'tadi |
|---|---|
| `/api/planning`, `/api/mentors`, `/api/parent-share` | Xarajatlar nashr qilingan raqamlardan quriladi, mentor mosligi real qatorga qarshi, ota-ona token'ining to'liq hayot sikli |
| IDOR (21 assert) | Oltita qator-egalik route'ida begona rad etiladi, qator yozilmaydi, egasi muvaffaqiyatli |
| `/api/chancing` (27 assert) | `Match %` va `Admission %` alohida qoladi; rozilik berilgan natijalar `dataBasis`ni o'zgartiradi, rozilik berilmaganlari ko'rinmas |
| `/api/profile-strength` (8 assert) | 7 bo'lim real profile'dan quriladi, ballar 0–100 da, anonim 401, boshqa sessiya faqat o'z profile'ni ko'radi |
| `/api/opportunities` (7 assert) | Katalog ochiq, lekin ball faqat sessiyaning o'z profile'iga hisoblanadi; anonim `match: null`; type filter; mismatch flag'lanadi, yashirin qilinmaydi |
| `/api/countries/compare` (8 assert) | O'rtachalar faqat nashr qilingan qiymatlardan; work rights hech qachon ixtiro qilinmaydi; noma'lum mamlakat → null, NaN yo'q |
| `/api/essays/reviews` (13 assert) | Ochiq inshoga boshqa talaba sharh qo'yadi; yopiq → 403; muallif o'z inshosini → 403; anonim → 401; o'rtachalar muallifda; sharhlovchi anonim; toggle'da IDOR 404; yopgach sharhlar yana rad etiladi |
| `/api/saved-programs` (9 assert) | Egasi saqlaydi; takror POST idempotent; phantom program 404; boshqa profil bo'sh ko'radi; begona DELETE 403; egasi o'chiradi |
| `/api/visa/history` + analyze (7 assert) | Seed sessiya qaytadi; begona 403; profileId bilan analyze ikkinchi sessiyani qo'shadi (eng eski birinchi); anonim analyze javob beradi lekin saqlamaydi |
| `/api/notifications/sweep` (5 assert) | Aqlli turlar yaratiladi; `requirement_gap` 8.0-IELTS universitetni belgilaydi; `scholarship_opened` grantni nomlaydi; `essay_improved` +15 ballni aytadi; ikkinchi sweep hech narsa yaratmaydi |

**Umumiy jami: 758 + 52 + 136 = 946 assertion, 0 failed.**

> **Tuzatilgan da'vo.** Bu hisobotning avvalgi versiyasida "sandbox'da
> Postgres yo'q, shuning uchun DB bilan ishlaydigan route'lar bu yerda ishga
> tushirilmadi" deb yozilgan edi. Bu noto'g'ri edi — men imkoniyatni
> tekshirmasdan, taxminimni fakt sifatida yozgan edim. Yuqoridagi integratsion
> test aynan shu bo'shliqni yopadi.

---

## 8. Qolgan ishlar (halol ro'yxat)

Strategiyaning 34 ta funksiyasidan oldin qilinmagan bo'lgan 6 tasi endi
barchasi shu branchda ishlaydi:

| # | Funksiya | Holat |
|---|---|---|
| 13/14 | Voice AI interview (mikrofon) | **Bajarildi** — PR #22 cherry-pick qilindi, Gemini→multi-provider mainline'ga moslandi (§2.24) |
| 24 | Essay peer review | **Bajarildi** — ochish/yopish, anonim sharhlar, o'rtachalar (§2.21) |
| 26 | Personalized opportunities feed | **Bajarildi** — profilga moslashgan "NEW FOR YOU" feed (§2.22) |
| 27 | Competition / olympiad finder | **Bajarildi** — `opportunities` katalogi, competition turi + filter (§2.22) |
| 28 | Research / internship opportunities | **Bajarildi** — research/internship/summer_school turlari, admin CRUD (§2.22) |
| 29 | Country comparison | **Bajarildi** — nashr qilingan ma'lumotlar bilan, work rights ixtiro qilinmaydi (§2.23) |

**Halol cheklovlari (nima hali ham yo'q):**

- `opportunities` starter katalogi 11 ta haqiqiy, barqaror, xalqaro tan olingan
  dasturdan iborat. To'liq mamlakat bo'ylab ro'yxat admin panel orqali o'sadi —
  avtomatik ro'yxat tuzish (scraping) strategiya bo'yicha **majburiy rad etilgan**.
- Mamlakat taqqoslashida visa/work rights raqamlari bazada nashr etilmaganligi
  sababli doim "nashr etilmagan" ko'rinadi — bu to'g'ri xatar, xato emas.
  Agar owner buni bazaga qo'shmoqchi bo'lsa, `universities`/yangi jadvalga
  qo'shish kerak, keyin `countryCompare.ts` avtomatik oladi.
- Gemini Live ovoz intervyu faqat `GEMINI_API_KEY` serverda bo'lganda ishlaydi;
  key bo'lmasa Web Speech fallback'iga o'tadi (hujjatlashtirilgan).

**Foydalanuvchiga qolgan qo'lda ishlar:**
1. `supabase/add_opportunities_essay_reviews.sql` ni Supabase SQL Editor'da
   ishga tushirish (yangi 4-chi SQL fayl — §6).
2. PR #32 ni merge qilish, PR #31 ni yopish, PR #22 ni yopish (kodi shu
   branchga cherry-pick qilindi).
3. `cp ci/security-ci.yml .github/workflows/ci.yml` (avtomatizatsiya hisobida
   workflows ruxsati yo'q).

**Data qoidasi (strategiya) — o'zgarmadi:** boshqa saytlardan profil yoki
ro'yxat scraping qilinmaydi. Asosiy dataset o'z platformamizdan o'sadi:
`applications` + `application_outcomes` + `shareConsent`. Opportunities
katalogi esa kichik, tekshirilgan, rasmiy URL'li dasturlardan boshlanadi.
