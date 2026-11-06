# Progress / fit / evidence formulalari — 2026-11-06

Bu hujjat «75%, 77.1%, 85%» kabi ko‘rsatkichlarning **amaldagi kod manbasini** yozadi. Ular bitta o‘lchov emas va hech qachon bitta identical progress bar sifatida ko‘rsatilmaydi. Har biri uchun: nimani o‘lchaydi, numerator/denominator, noma’lum qiymat, qachon qayta hisoblanadi, yaxlitlash sababi.

## 1. Raqamlarning kelib chiqishi

| Ko‘rinish | Haqiqiy manba | Nimani o‘lchaydi |
|---|---|---|
| **75%** (butun son) | `src/lib/calculations.ts` `percentage()` / `completionSummary()`; `src/lib/journey/stages.ts` `journeyProgress()` | Bosqich/checklist bajarilishi (`done / total`), yoki 8 ta journey stage’ning o‘rtacha bajarilishi |
| **77.1%** (1 o‘nlik) | `src/lib/chancing.ts` `overallPrecise` (301-qator), `StrengthSection.scorePrecise` (261-qator) | Profil kuchi / evidence coverage bo‘yicha **bo‘limlar o‘rtacha qiymati**, aniqroq ko‘rsatish uchun 1 o‘nlik |
| **85%** (butun son) | `chancing.ts` `overall` (302-qator, `Math.round(overallPrecise)`), `DashboardView` `strength.overall` (`/api/profile-strength`), `applicationProgress()` (`readiness.ts:227`) | Xuddi shu o‘lchovning yaxlitlangan ko‘rinishi yoki ariza bajarilishi; **admission ehtimoli emas** |

> Hisobotdagi 75 / 77.1 / 85% qatori misol qiymatlar edi; kodda qattiq yozilgan `75`, `77.1`, `85` konstantalari **yo‘q**. Ular yuqoridagi formulalarning turli kirish ma’lumotlaridagi natijalari. Qidiruv `grep -rn "77\.1\|0\.771" src/` buni tasdiqlaydi.

## 2. Har formula bo‘yicha

### 2.1 `percentage(part, whole)` — `src/lib/calculations.ts:17`

- **O‘lchaydi:** ixtiyoriy `done / total` nisbatini 0–100% ga.
- **Numerator:** `max(0, part)`; **denominator:** `whole` (`whole <= 0` bo‘lsa **0%**, hech qachon `NaN` yoki `100%` emas).
- **Noma’lum:** `!Number.isFinite(part|whole)` → **0%**; bu «ma’lumot yo‘q» degani, «0 ta bajarildi» degani emas — UI’da alohida `unknown` holati ko‘rsatiladi (`completionSummary.complete` ham `safeTotal > 0` talab qiladi).
- **Qachon:** har render / har profil o‘zgarishi; sof funksiya, kesh yo‘q.
- **Yaxlitlash:** `Math.round` + `Math.max(0, Math.min(100, …))`. Butun foiz kartada qisqa o‘qiladi; 0.5 dan kichik farq foydalanuvchi qarorini o‘zgartirmaydi.

### 2.2 `journeyProgress(c)` — `src/lib/journey/stages.ts:234`

- **O‘lchaydi:** 8 ta journey stage’ning (`JOURNEY_STAGES`) o‘rtacha bajarilishi. `track` `apply` ichiga singdirilgan, shuning uchun 8 ta.
- **Numerator:** `Σ stageCompletion(c)[s.id]` (har stage 0..1), **denominator:** `JOURNEY_STAGES.length = 8`.
- **Noma’lum:** `stageCompletion` ma’lumot yo‘q stage’ni `0` qiladi, lekin `resolveJourney` `stillNeeded` ro‘yxati bilan «noma’lum / hali kerak» ni alohida ko‘rsatadi; 0% «tasdiqlandi» emas.
- **Qachon:** `resolveJourney()` har chaqiruvda; profil/ariza/hujjat holati o‘zgarganda qayta hisoblanadi.
- **Yaxlitlash:** `Math.round`. Izoh kodda: «NOT a probability of admission».
- **Muhim:** `current` stage — bu **joriy bosqich**, bajarilgan degani emas. `stages[].done` va `current` alohida maydonlar.

### 2.3 `PLAN_PHASES` — 10 ta study-plan phase — `src/lib/journey/planning.ts:31`

- 8 bosqichli journey = **holat / bosqich** (qayerdamiz). 10 ta plan phase = **tayyorgarlik ishlari / vaqt jadvali** (nima qilish kerak, qachon).
- Ular bir xil ro‘yxat emas, bir-biriga 1:1 map qilinmaydi va bitta progress bar’ga birlashtirilmaydi. `HomeClient.tsx` izohi (1122-qator) ikki ro‘yxatni «in that order» ko‘rsatadi.
- `activeTab === "study-plan"` / `pane: "plan"` shu 10 phase’ni ochadi; `GuidedJourneyBar` 8 stage’ni ko‘rsatadi.

### 2.4 `overallPrecise` / `overall` — `src/lib/chancing.ts:260, 301–302`

- **O‘lchaydi:** profil kuchining bo‘limlar bo‘yicha o‘rtachasi (`academics`, `testing`, `activities`, …) — **fit / tayyorgarlik**, qabul ehtimoli emas.
- **Numerator:** `Σ section.scorePrecise`; **denominator:** `sections.length`. Har bo‘lim: `present / safeTotal`, `present = min(total, recorded)`.
- **Noma’lum:** `optional && present === 0` → `unknown: true`, `score = 0`, `coverage = 0`, lekin `missing` ro‘yxati va `unknown` flag UI’ga uzatiladi. **Unknown ≠ 0 ta bajarildi**; `evidencePolicy.ts` bo‘yicha `unknown` hech qachon `official_requirement` ga aylanmaydi.
- **Qachon:** `/api/profile-strength?profileId=…` har profil o‘zgarishida; `DashboardView` `useEffect` bilan oladi. `cacheRevision.ts` shared revision + profil/locale/sana kaliti bilan keshlanadi — boshqa instance profil o‘zgarganda eski natijani cheksiz qaytarmaydi.
- **Yaxlitlash:** `overallPrecise = roundTo(…, 1)` (1 o'nlik — **77.1%** shu yerdan), `overall = Math.round(overallPrecise)` (kartadagi butun son). Ikkalasi bir vaqtda mavjud: aniq qiymat kerak bo‘lganda 1 o‘nlik, kichik kartada butun son.

### 2.5 `applicationProgress()` — `src/lib/journey/readiness.ts:227`

- **O‘lchaydi:** ariza bajarilishi. Har biri uchun 10 ball: boshlangan ariza (max 5) + topshirilgan ariza (max 5), jami `min(100, …)`.
- **Noma’lum:** `finiteNonNegative` bo‘lmagan qiymat 0 ga, `submitted <= started` ga clamp qilinadi; sonlar yo‘q bo‘lsa 0%, lekin ariza ro‘yxati alohida bo‘sh holat ko‘rsatadi.
- **Qachon:** readiness hisoblanayotganda; monoton (yangi pending ariza qo‘shilsa pasaymaydi).
- **Yaxlitlash:** butun ball, yaxlitlash yo‘q — 10 ballik qadamlar ataylab.

### 2.6 Hujjat tayyorligi / evidence coverage

- Hujjat tayyorligi `readiness: null` bo‘lsa **tayyor emas** deb ko‘rsatiladi, 0% progress bar emas (`test:documents-readiness` 10/0).
- Evidence coverage `src/lib/evidencePolicy.ts` / `src/lib/typedEvidence.ts`: `official_verified` + `official_requirement` + `verified` + `sourceUrl` + `verifiedAt` bo‘lgandagina `isOfficialMinimum`. `entityVerified` hech bir fact’ni avtomatik verified qilmaydi. `recommended_score` — rasmiy manbali, lekin **minimum/cutoff emas**.
- Review queue qarori yozilishi fact’ni avtomatik `verified` qilmaydi (`verifiedWritten:false`); `test:review-queue` 15/0 + `test:review-queue-runtime` 10/0.

## 3. Nima uchun ular bir xil progress bar emas

| Ko‘rsatkich | Turi | Ko‘rinish |
|---|---|---|
| Profil to‘liqligi / kuchi | bo‘limlar o‘rtachasi, 1 o‘nlik variant bilan | Dashboard readiness halqasi + matn |
| Journey holati | 8 stage’dan joriy + o‘rtacha bajarilish | `GuidedJourneyBar` / `JourneyControlCenter`, `current` ≠ `done` |
| Study plan | 10 phase, vaqt jadvali | `study-plan/plan` tabi, har phase uchun next action |
| Ariza bosqichi | 8 journey stage ichidagi `apply` + ariza statuslari | Application tracker, status/blocker/next action |
| Hujjat tayyorligi | `readiness: null` yoki tasdiqlanganlar ro‘yxati | Documents ekrani, alohida bo‘sh/xato/yuklanish holati |
| Fit | `chancing` bo‘limlari + typed evidence | Chancing panel, `EvidenceNote` izohlari |
| Evidence coverage | field-level trust | `EvidenceNote` (`data-evidence-trust`, `data-evidence-display`) |
| Qabul qilingan | FAQAT tasdiqlangan `admitted` holati | Journey’da `done`; aks holda ko‘rsatilmaydi |

**«Qabul qilingan» faqat tasdiqlangan holatda** — `journey/stages.ts` `stageCompletion` va admin/application status tekshiruvi bilan. Hech bir progress % uni taxmin qilib ko‘rsatmaydi.

## 4. Tekshiruv

- `npm run test:profile-recompute` 6/0 — qayta hisoblash/shared kalit.
- `npm run test:cache-revision` 20/0 — boshqa instance eski natijani cheksiz qaytarmaydi.
- `npm run test:finance-unified` 16/0, `npm run test:admission-probability` 12/0 — fit va probability aralashmaydi.
- `npm run test:documents-readiness` 10/0, `npm run test:applications-state` 9/0 — unknown ≠ 0, API xatosi bo‘sh ro‘yxat emas.
- `npm run test:evidence-render` 16/0 — `recommended`/`observed`/`computed`/`unknown` alohida render.
- `npm run test:design-system` 10/0 — Dashboard «Keyingi qadam» paneli bitta primary + aniq secondary, yangi progress bar qo‘shmadi.

**Chegara:** yuqoridagi `%` larning har biri uchun 390px/1440px real browser screenshot’i alohida olinmadi; formulalar kod + guard bilan isbotlandi. `react-dom/server` responsive sifat o‘rnini bosmaydi.
