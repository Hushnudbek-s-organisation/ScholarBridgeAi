# Session recovery — accessible-source findings and first rebuilt change

## Tiklash tekshiruvi

Session branch: `arena/5970dc95-scholarbridgeai`. Tekshiruv boshlanganda checkout clean, HEAD `9039fce7ffe1bc3136b3910b554d985ab0dfdb56` edi. Oldingi turn’da tasvirlangan `src/lib/costLineProvenance.ts`, `e2e/cost-line-provenance.spec.ts`, `scripts/assessment-local.ts` va `docs/redesign/master-2026-11-07-followup/` bu checkout’da yo‘q.

- Reflog: faqat clone va session branch’ga checkout.
- Stash yo‘q; unreachable Git object topilmadi; loose object soni0.
- Aynan session branch uchun `git ls-remote` natijasi bo‘sh, GitHub ref API404; oldingi ish push qilinganiga dalil yo‘q.
- Workspace, `/tmp`, `/mnt`, `/opt` ichidagi accessible patch/checkpoint/snapshot arxivlari tekshirildi; oldingi kod patch’i topilmadi.
- `/tmp/arena-coding-uploads/` ichida original Master HTML/PDF, i18n report PDF va ikki image bor. Master HTML ~2.59MB, extracted text ~1.76M characters. Bu tarixiy database/architecture registry, yo‘qolgan yangi implementation nusxasi emas. Undagi eski audit/admission ko‘rsatkichlari joriy acceptance yoki yangi rasmiy fakt sifatida ishlatilmadi.

Agent reset/clean/checkout bilan oldingi o‘zgarishlarni o‘chirmadi. **Accessible nusxa topilmadi** — bu platforma storage’ida butunlay yo‘q degan hukm emas. Yo‘qolish sababi va foydalanuvchi aytgan “128000” o‘lchovi aniqlanmagan; artifact limiti sabab bo‘lgan deb da’vo qilinmaydi. Eski source hash/build/test natijalari bu clean baseline’ni attest qilmaydi.

## WHAT → HOW → FILES

Birinchi amaliy qayta yozilgan qism: catalogue HTTP503 sababini credentials/SQL/PII’siz aniqlash.

- Existing fixed `classifyReadFailure` taxonomy saqlandi: snapshot conflict, database auth, transient DB, schema va internal alohida.
- `readFailureDiagnostic` faqat fixed allowlist bo‘yicha kind/SQLSTATE/route label chiqaradi; raw error/message/query/cause obyektlari serialize qilinmaydi.
- `reportReadFailure` server UUID yaratadi va mavjud `[journey-failure]` operator/test kanaliga faqat safe descriptor yozadi.
- `/api/universities` catch’dagi raw `console.error(error)` olib tashlandi. Existing **503 status va exact `data_unavailable` body saqlandi**, additive `X-Request-Id` / `X-Failure-Class` headers bor. No retry, stale-success fallback yoki fabricated catalogue yo‘q.
- Existing Journey `serverError` shu reporter’dan foydalanadi; uning oldingi status/body/header siyosati saqlanadi.
- `e2e/catalogue-read-diagnostics.spec.ts`: warm actual GET200; faqat disposable PostgreSQL’da universities relation’ni vaqtincha yashirish + shared revision bump; actual GET503 va safe diagnostic correlation; relation’ni tiklash + `to_regclass` assertion; actual GET200. Barcha cleanup `finally` ichida. Hosted DATABASE_URL qabul qilinmaydi.

Files: `src/lib/readFailure.ts`, `src/lib/readFailure.server.ts`, `src/lib/journey/api.ts`, `src/app/api/universities/route.ts`, `scripts/check-snapshot-recovery.ts`, `e2e/catalogue-read-diagnostics.spec.ts`.

## TEST → EVIDENCE

- Node22 `npm ci`: EXIT0,499packages; dependency/lock upgrades yo‘q.
- Actual baseline RED: `recovery-diagnostics-red-2/report.json` — existing503/body o‘tadi, `X-Failure-Class` undefined bo‘lgani uchun FAIL.
- Oldingi birinchi RED harness attempt `recovery-diagnostics-red/`: noto‘g‘ri `university_programs` table nomi; genuine missing-diagnostic RED deb hisoblanmaydi.
- Birinchi post-patch `recovery-diagnostics-green/`: **2FAIL**, green emas. Fixture cleanup table’ni noto‘g‘ri nomga tiklagan; shu sabab recovery GET503 va keyingi catalogue card absent. Bu agent yozgan harness xatosi tuzatildi, failed report saqlandi; product assertion/budget yumshatilmadi. Final cleanup exact `universities` + independent `to_regclass` check bilan.
- Tuzatilgan dev actual SQL/API + existing English locale control: **2PASS**, `recovery-diagnostics-green-2/report.json`.
- Pure classification/recovery: **18PASS**; existing `test:snapshot-recovery` gate ichida, takrorlar qo‘shimcha unique coverage emas.
- Existing local suite: **38OK gates / TOTAL_FAILS=0**, typecheck/lint/i18n/migration/disposable runtime/security bilan. `recovery-diagnostics-final/local.log`.
- LOCAL production build: **EXIT0**, provider credentials isolated, dummy local build DB, request seeding off. `recovery-diagnostics-final/build.log`.
- LOCAL production-mode targeted: **5PASS / 0FAIL / 0SKIP / 0flaky** — actual SQL fault/recovery, English locale boundary va EN/UZ/RU existing dashboard geometry/focus/capture. Default20s screenshot budget o‘zgarmadi. Bu oldingi boshqa-source capture beqarorligi tuzatildi degani emas.

Raw working artifacts `test-results/` ichida. Tanlangan JSON/loglar compact `docs/recovery/evidence/` nusxasida saqlanadi. Oldingi turn’dagi full89/1,87/3 va visual23/1 — boshqa, hozir mavjud bo‘lmagan dirty source haqidagi historical memory; bu testlar bilan “yopildi” deyilmaydi.

## Ochiq scope / xavfsizlik

**scopeComplete=false / releaseReady=false.** Bu diagnostika prerequisite’i, oldingi intermittent503 yoki screenshot/compositor root-cause fix emas. Local forced42P01 boshqa, oldingi noma’lum503 boshqa. 28P01 auth xatosi schema xatosiga tenglashtirilmaydi.

Oldingi cost provenance/assessment-v2/CAS va boshqa post-9039fce ishlari bu checkout’da hali qayta tiklanmagan. Full Master, published-default CostScenario, consumer parity va physical-OS/performance acceptance yakunlanmagan. Current full/visual suite acceptance da’vosi yo‘q.

Production DB/Telegram/payments/paidAI/deployment ishlatilmadi. Historical authorized N06 production repair qayta qo‘llanmadi; uning SQL’i yo‘qolganligi uni production’da takrorlashga ruxsat emas. PR/merge/release qilinmaydi.

Yangi Git checkpoint va patch/bundle **faqat shu kichik qayta yozilgan ish** uchun; oldingi yo‘qolgan katta patch o‘rnini bosmaydi.

## Yangi source binding

Build: `icvIuPfQABf26uu7BsPvC`; Node `v22.22.3`. QA oldi/keyin runtime/verification/migrations setlari exact mos. `EVIDENCE.json` barcha compact raw report/log/source JSON sha256’larini saqlaydi.

```text
runtime 16c5592d5888ccbe53bd08d7724ccaf61c02e073e5fb24be334a306147c56fb3
verification 1dee68354d6634432c04b86b1bbeb7fa61dfd8c02a61719950385bc3cad15309
migrations 2593f3819fb237a7159411e54895cada92959b1b1da09bdc1d13334a321bddb0
```
