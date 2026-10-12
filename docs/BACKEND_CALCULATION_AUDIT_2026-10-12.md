# Backend hisoblash va qatlamlar auditi — 2026-10-12

## Maqsad

Hisoblashni React UI, route transporti, DB query va AI matnidan ajratish. Canonical formula server-safe pure `src/lib` modulida bo‘lishi, route faqat auth → input → query → domain → response ketma-ketligini boshqarishi kerak.

## Audit natijasi

| Yo‘nalish | Holat | Canonical modul | Route/UI holati |
|---|---:|---|---|
| University/scholarship fit | PASS | `lib/matching.ts`, `subjectAffinity.ts`, `gpa.ts` | APIlar bir xil engine’dan foydalanadi; probability deb atalmasligi himoyalangan |
| Program recommendation | PASS | `lib/recommend.ts` | route orkestratsiya qiladi; probability unavailable |
| Profile readiness/chancing | PASS | `lib/chancing.ts`, `journey/readiness.ts` | AI route ham canonical faktlarni oladi |
| Journey stage/progress | PASS | `journey/stages.ts`, `planning.ts` | dashboard shu modullarni chaqiradi |
| Application requirement progress | PASS | `journey/workspace.ts` | detail progress backendda |
| Workspace list progress | TUZATILDI | `lib/calculations.ts` | route ichidagi takroriy formula shared summary’ga ko‘chirildi |
| Arrival 7/30/90/year-1 progress | TUZATILDI | `journey/arrival.ts` + `lib/calculations.ts` | UI hisoblamaydi; API overall va per-window summary qaytaradi |
| Funding/cost gap | PASS | `journey/funding.ts`, `costs.ts` | noma'lum qiymatlar uydirilmaydi |
| Visa interview rubric | PASS | `visaScoring.ts` | deterministic rubric AI javobidan ajratilgan |
| Career discovery | PASS | `careerDiscovery.ts` | deterministik, AI/network yo‘q |
| Quiz/course progress | TUZATILDI | `lib/calculations.ts` | quiz score va course list/detail progress bir xil primitive orqali |
| Departure checklist | TUZATILDI | `lib/calculations.ts` | legacy maydonlar saqlandi, to‘liq `progress` projection ham qo‘shildi |
| Dashboard application summary | TUZATILDI | `journey/applicationSummary.ts` | pending decision emas; duplicate offer application sonini oshirmaydi |
| Dashboard aggregation | PARTIAL | domain modullar mavjud | `dashboard/route.ts` katta orchestration route; query/projectionni service/repository qatlamiga bo‘lish kerak |
| Saved university snapshot | TUZATILDI | `matching.ts` | manba topilmasa oldingi soxta 80/Match default bekor qilindi; endi 404 |
| UI-only vaqt formatlari | ACCEPTABLE | presentation concern | countdown/format hisoblari UI’da qolishi mumkin |

## Joriy qatlam qoidasi

1. **Route:** session/ownership, validation, HTTP status, domain service chaqirig‘i.
2. **Repository/query:** Drizzle query va transaction; business score yo‘q.
3. **Pure domain:** score/progress/eligibility/gap; DB, request, locale va clockdan mustaqil.
4. **Projection:** API response shakli, provenance va `unknown` holati.
5. **UI:** faqat render, format va interaction; canonical score qayta hisoblanmaydi.
6. **AI:** canonical raqam yaratmaydi; server bergan faktni tushuntiradi.

## Ushbu iteratsiyadagi o‘zgarishlar

- `src/lib/calculations.ts`: `percentage`, `completionSummary`, `summarizeStatuses`.
- `src/app/api/workspace/route.ts`: list progress shared backend primitive orqali.
- `src/app/api/journey/arrival/route.ts`: overall va har window uchun backend progress projection.
- `src/components/journey/ArrivalPlanPanel.tsx`: client formula olib tashlandi; mutationdan keyin server projection qayta yuklanadi.
- `src/app/api/saved-universities/route.ts`: `80 / Match` fabricated fallback olib tashlandi; ID/status/notes validatsiyasi kuchaytirildi; engine-owned match maydonlarini PATCH qilish yopildi.
- `src/app/api/quizzes/attempt/route.ts`: quiz foizi shared backend primitive orqali.
- `src/app/api/courses/route.ts`, `courses/[id]/route.ts`: katalog/detail progress bir xil projection orqali.
- `src/app/api/departure/route.ts`: canonical completion summary, eski response maydonlari backward-compatible saqlandi.
- `src/lib/journey/applicationSummary.ts`, `dashboard/route.ts`: application holati pure domain projectionga ajratildi.
- `scripts/check-calculations.ts`: edge-case va duplicate-decision regression testlari.
- `src/app/api/saved-scholarships/route.ts`: body cap, positive ID, status allowlist, notes limit va scholarship existence tekshiruvi.
- `src/app/api/saved-programs/route.ts`: body cap va barcha IDlar uchun qat’iy positive-integer validatsiya.
- `src/app/api/notifications/sweep/route.ts`: body cap, majburiy valid profile ID va client sweep oynasi 90 kunga cheklangan.
- `src/app/api/essays/route.ts`: word limit 1–5000 oralig‘ida canonical parser; negative/NaN va noto‘g‘ri IDlar DBga o‘tmaydi.
- `src/app/api/planning/route.ts`, `src/lib/costs.ts`: soxta `0.2` scholarship ehtimoli va `familyIncome × 25%` contribution taxmini olib tashlandi. Ehtimol/contribution noma’lum bo‘lsa `null/Unknown`, affordability hukmi chiqarilmaydi.
- `src/components/PlanningStudio.tsx`: noma’lum expected funding, coverage, award chance va family contribution aniq `Unknown` ko‘rinishida; qizil “unaffordable” holatiga majburan tushmaydi.
- `src/app/api/activities/route.ts`: activity hours manfiy bo‘la olmaydi va 100,000 soat bilan data-integrity cap qo‘llanadi.
- Scholarship Autopilot statistik yorlig‘i “potential funding” emas, topshirilgan arizalardagi nominal award qiymati ekanini aniq aytadi.
- `src/app/api/ai/chat/route.ts`: offline fallback ichidagi eskirishi mumkin bo‘lgan visa muddatlari, scholarship summalari/deadline’lari, SOP foizlari va umumiy intake sanalari olib tashlandi. Offline javob faqat verified katalog/official source’ga yo‘naltiradi.
- `src/lib/gamification.ts`: point total concurrent award paytida yo‘qolmasligi uchun atomic SQL increment; read route’dan seeding side-effect olib tashlandi.
- `src/lib/streak.ts`, `DailyStreakCard.tsx`: faqat server mukofotlagan real faoliyatdan hisoblanadigan daily streak, 3/7/14/30/60/100/365 milestone; oddiy app ochish hisoblanmaydi. Dashboard va Rewards/Referrals kontekstida, sidebar’siz.
- `scripts/check-streak.ts`: duplicate same-day, grace day, reset, longest run, future/invalid date va milestone testlari.

## Keyingi xavfsiz refactorlar

1. `dashboard/route.ts`ni `dashboard/repository.ts`, `dashboard/service.ts`, `dashboard/projection.ts`ga ajratish; response contractni snapshot test bilan avval mahkamlash.
2. `programs/recommend/route.ts`dagi transport parsingni schema validatorga, katalog querysini repositoryga ko‘chirish.
3. Quiz/course completion formulalarini shared primitive orqali yuritish.
4. Barcha mutationlarda idempotency va transaction chegaralarini inventarizatsiya qilish.
5. API contract integration testlari uchun real test DB fixture; faqat static assertion bilan cheklanmaslik.

Katta route’larni bir martada qayta yozish rad etildi: bu ishlayotgan auth, provenance va premium qoidalarini buzish xavfini oshiradi. Refactor contract-test bilan bosqichma-bosqich bajarilishi kerak.
