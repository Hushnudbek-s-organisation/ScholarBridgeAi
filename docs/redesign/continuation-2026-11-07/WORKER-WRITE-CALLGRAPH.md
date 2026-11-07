# Research worker: haqiqiy write callgraph va dalil chegarasi

2026-11-07. Bu mavjud implementatsiyaning source-level xaritasi; production/CI yoki barcha race’lar yopilganining tasdig‘i emas. Original A-identifikatorlar qayta talqin qilinmaydi.

## Kuzatilgan yo‘l

`worker.ts` → `claimDurableRun`dan qaytgan **haqiqiy claim token** → `runBatch(... callbacks.lease)` → `withResearchLease` → `runUniversity` → quyidagi exported, fenced persistence metodlari.

| Entrypoint | Haqiqiy biznes yozuvlari | Fence |
|---|---|---|
| `persist.upsertSource` | sources va university_sources | `fenceResearchWrite`, nested chaqiriqlar bir transaction’da |
| `persist.writeUniversity` | universitet field’lari va source/link yordamchi yozuvlari | shu qisqa, lease-row-locked transaction |
| `persist.upsertProgram` | programs va tegishli source/link | shu proxy/transaction |
| `persist.upsertRequirements` | program_requirements | shu proxy/transaction |
| `persist.upsertCycle` | application_cycles | shu proxy/transaction |
| `persist.upsertScholarship` | scholarships va scholarship_sources | shu proxy/transaction |
| `audit.logRunStart` / `audit.logRunFinish` | refresh_jobs | shu wrapper; fenced context’da xato console fallback bilan yutilmaydi |
| `recordUniversityResult` / `recordUniversityError`, registry flush | research_run_items va run/checkpoint/report | durableStore’ning token/lease SQL predicate’lari; business metodidan alohida write unit |

`writeFence.ts` network/AI ishini uzoq DB transaction ichiga o‘ramaydi. Har write unit boshida `research_runs` row `FOR UPDATE` bilan olinadi: token, haqiqiy `clock_timestamp()`, cancel, status va timeout tekshiriladi. Commit oldidan qayta tekshiruv bor. Durabledagi unclaimed/raw proxy write fail-closed. Ichki persist/audit metodlari `researchDb` proxy orqali aynan shu transaction’ga ulanadi.

Bu **bir butun universitet ishi va uning checkpoint’i bitta transaction** degani emas. Business yozuv va keyingi checkpoint oralig‘ida process o‘lsa, resume/dedupe alohida muhim. Bir xil universitetni turli run’lar parallel qayta ishlashining entity-level dedupe/uniqueness qamrovi ham shu diagrammaning o‘zi bilan isbotlanmaydi.

## Mavjud haqiqiy PG/process testi nimani isbotlaydi?

`scripts/check-research-runtime.ts` → `scripts/proofs/research-write-fence.ts` → alohida `scripts/fixtures/research-fence-child.ts` process:

1. A claim oladi va child process write’dan oldin kutadi.
2. Disposable PostgreSQL’da A lease eskiradi, B qayta claim oladi.
3. B haqiqiy source + link hamda audit-start yozuvini muvaffaqiyatli commit qiladi.
4. A yuqoridagi **8 haqiqiy exported business/audit entrpoint**ni valid argument bilan chaqirganda `ResearchLeaseLostError` oladi.
5. Qo‘shimcha **9-chi probe** umumiy `fenceResearchWrite` ostidagi `fence_business` fixture UPDATE’idir. U haqiqiy `catalogue_facts` writer emas. Uni “9 ta haqiqiy catalogue/fact writer” deb qayta nomlamaymiz.
6. Live B generic SQL commit, thrown-error rollback, lease commit oldidan eskirsa allaqachon bajarilgan SQL rollback’i va item checkpoint token rad etishlari tekshiriladi.

Build6 shared suite’da `research-runtime` **17 PASS**, `research-worker` **9 PASS** qayd etilgan. Build8 strengthened-guard shared run ham `research-runtime` 17 PASS / `research-worker` 9 PASS, TOTAL_FAILS=0 (`detail-build8-guard-shared.log`). Build9 full/shared natijasi alohida; tarixiy passing suite yangi o‘zgarishlarni avtomatik tasdiqlamaydi.

## Alohida qoladigan yo‘llar

- Hozir ko‘rilgan `runUniversity → persist/audit` yo‘lida `catalogue_facts`ga bevosita write ko‘rinmadi. Official-source CAS adapter va admin fact review alohida writer’lardir; umumiy proxy fixture UPDATE ularning haqiqiy runtime lease parity isboti emas.
- Heartbeat lease yo‘qolishini cancelled deb belgilaydi, batch yangi universitet ishini boshlamaydi, keyingi business write fail-closed. Hozirgi `runUniversity` ichida har bir tashqi await uchun cancellation checkpoint bor deb da’vo qilinmaydi.
- `runUniversity` outer catch audit-finish chaqiradi; stale token uchun uning fenced wrapper’i ham rad qiladi. Bu xato normal muvaffaqiyatli report sifatida yashirilmasligi uchun orchestrator-level regression qamrovi alohida tekshirilishi kerak.
- Production’da durable mode yoqilganini, forward migration/grant/index’lar mavjudligini yoki haqiqiy provider ishini bu lokal xarita tasdiqlamaydi. Bu sessiyada production/provider/research run boshlanmagan.

## Yangi source tekshiruvi va joriy dalil

- Corrected proof labels bilan Build10 va Build11 shared run’lari ham **research-runtime17PASS / research-worker9PASS / TOTAL_FAILS=0**. Bu yuqoridagi sakkiz entrypoint + generic SQL doirasini kengaytirmaydi.
- Qo‘shimcha transitive write bor: `runUniversity → researchAIProvider.complete → aiChat (src/lib/ai/index.ts) → logAIUsage (src/lib/ai/usage.ts) → ai_usage INSERT`. Bu source’dan kuzatilgan, provider chaqirilib runtime tekshirilmagan. U catalogue/source/checkpoint transaction’i emas, mustaqil **sarflangan xizmat hisobi**. Lease eskirgani uchun allaqachon yuzaga kelgan haqiqiy xarajatni o‘chirib/yutib yuboradigan fence qo‘yilmaydi.
- Shu sabab “barcha transitive writes lease bilan fenced” deyilmaydi. Stale worker yangi external/paid ish boshlamasligi, har await’dan keyin cancellation’ni ko‘rishi va lease-loss outer catch’da oddiy success/fallback bo‘lib yutilmasligi — alohida checkpoint/orchestrator regression vazifasi. Incured-cost accounting va catalogue business writes bir xil atomiklik deb ko‘rsatilmaydi.
