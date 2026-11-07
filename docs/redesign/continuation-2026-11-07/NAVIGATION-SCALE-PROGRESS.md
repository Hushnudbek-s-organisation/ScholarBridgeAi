> **Joriy yangilanish (2026-11-07):** pastdagi Build13–15 qaydlari tarixiy. Keyingi detail/scope/recovery/independent-academic integratsiya holati `DETAIL-SCOPE-PROGRESS.md`, haqiqiy consumer chegaralari `CONSUMER-PARITY.md`da. Build5 full39PASS/shared0 tasdiqlandi; Build6 academic diagnostic4PASS, full hali bajarilmoqda. Hech biri passing performance jufti yoki releaseReady degani emas. Pastdagi eski “keyingi ish” bandi yangi integratsiya allaqachon bajarilganini inkor qilmaydi.

# Navigation va shkala aniqligi — 2026-11-07 davomi

**scopeComplete=false; releaseReady=false.** Branch `arena/660f1392-scholarbridgeai`, HEAD `1bd810bbb5a6e749488331fb60d452b425c1b918`; mavjud dirty o‘zgarishlar saqlandi. Bu release yoki CI tasdig‘i emas. Production SQL, deploy, push, haqiqiy to‘lov, pullik provayder yoki Telegram jo‘natish bajarilmadi.

## Joriy continuation manbasi

Universitet scoped talab integratsiyasi va yangi build bo‘yicha dolzarb holat: [DETAIL-SCOPE-PROGRESS.md](./DETAIL-SCOPE-PROGRESS.md). Quyidagi Build13–15 natijalari oldingi yugurishlar tarixi; qayta tiklangan workspace’da ularning ignored build/log fayllari yo‘q va ular yangi daraxt tasdig‘i emas.

## Oldingi sessiyada qayd etilgan holat

- Build15 production-mode to‘liq E2E: **38 PASS, 0 FAIL, 2 SKIP**, exit 0, 582204.589 ms (9.7 min). Skip’lar avvaldan opt-in bo‘lgan ikkita performance test; ular alohida real yugurishda tekshirildi va quyidagi FAIL yashirilmaydi.
- Yangi haqiqiy UI-sign-in navigation regressionlari 1440 va 390 px’da PASS. Oldingi checklist IELTS fixture leak ham full suite’da endi xato bermadi.
- Brauzerdan keyingi aynan joriy daraxt shared validation: **PASS validate:local / TOTAL_FAILS=0**, exit 0. `post-browser-build15-shared.log` va `post-browser-build15-shared-detail.log`.
- Post-browser typecheck exit 0: `full-build15-post-typecheck.log`; fresh audit barcha severity bo‘yicha 0.
- Performance alohida: **desktop FAIL teardown timeout, mobile PASS**. To‘liq matched desktop after final namuna yo‘q; latency/speedup/p95/field INP yoki releaseReady da’vosi yo‘q.
- 39 yangi dashboard PNG `screens-build15/`da: EN/UZ/RU, 320/360/390/tablet/desktop, birinchi/final scroll va CSS zoom dalillari. Brauzer testlarining PASS’i haqiqiy OS klaviaturasi/native zoom yoki barcha dastur/funding personasi to‘liq yopildi degani emas.

## Shu davrda kiritilgan kod

| O‘zgarish | Fayl | Dalil / cheklov |
|---|---|---|
| Hash-only navigatsiyada mavjud framework history state’ini saqlash; stale bo‘lim/pane bilan valid URL’ni almashtirmaslik | `src/app/HomeClient.tsx`, `src/components/AdminPanel.tsx` | Build14 dagi dastlabki synchronous reconciliation yetarli bo‘lmadi va effect lint xatosi berdi; u olib tashlandi. Yangi fix history state’ni saqlaydi; yangi test/gate natijalari quyida alohida talab qilinadi. |
| Noto‘g‘ri percent encoding’li hash’ni URIError emas, noma’lum deep link deb qabul qilish | `src/app/HomeClient.tsx` | Desktop/mobile production-shell regressiyasiga kiritildi. |
| Eski GPA uchun `/4.0` shkalasini taxmin qilmaslik; eski GPA/TOEFL uchun shkala qayd etilmaganini ko‘rsatish | `src/components/UniversityDetail.tsx`, EN/UZ/RU messages va English staged feature JSON | Saqlangan raqamlar yo‘qotilmadi, shkala konvertatsiyasi yo‘q. Bu detail’dagi barcha scope/cycle/group muammolarini yakunlamaydi. |
| Tez hash almashinuvi, bo‘lim ichidagi click, Back/Forward, reload, noto‘g‘ri hash uchun real shell sinovi | `e2e/navigation-continuation.spec.ts` | Assertion limiti oshirilmadi; retry/sleep qo‘shilmadi. |
| Eski buildni source’ni qaytarmasdan real Next production serverida ishlatish | `scripts/e2e/start-built.mjs`, `e2e/global-setup.ts` | Faqat disposable E2E server tanlash; production runtime env knob emas. Artifact workspace ichida bo‘lishi shart. Baseline va after uchun aynan shu harness ishlatilishi kerak. |
| Old bottom bar source guardini amaldagi GroupedDock + CSS measured clearance’ga yo‘naltirish | `scripts/check-responsive.mjs` | Eski→yangi: Navbar’dagi alohida bottom-bar padding → GroupedDock safe-area bottom + o‘lchangan balandlik + HomeClient clearance. Runtime dalil `dashboard-continuation.spec.ts`da; source guard brauzer isboti emas. |

## Tekshirish holati

- `navigation-typecheck.log`: exit 0.
- `navigation-i18n.log`: exit 0; staged/canonical English parity ham tekshirildi.
- `navigation-responsive.log`: exit 0, 75 source-level check. Birinchi urinish eskirgan bottom-bar source guardida to‘xtadi; guard amaldagi komponentga ko‘chirildi, touch/safe-area talabi olib tashlanmadi.
- To‘g‘ridan-to‘g‘ri birinchi `npm run build`: FAIL, build vaqtida `DATABASE_URL` berilmagani uchun. Bu production DB autentifikatsiya tekshiruvi yoki 28P01 emas. Log: `build14.log`.
- Izolatsiyalangan standart wrapper orqali build: `build14-isolated.log`da `PASS build`; ichki log `test-results/master-2026-11-07/build.log`. Provider credentiallari olib tashlangan, DB manzili bloklangan lokal port. Bu CI yoki production integratsiya dalili emas.
- Yangi builddagi fokuslangan browser run: **9 PASS**, exit 0, taxminan 2.0 min; `navigation-build14-browser.log` va `navigation-build14-browser-report.json`. Desktop 1440×900 va mobile 390×844 navigation, bo‘lim ichidagi tab, Back/Forward, rapid hash, malformed hash va reload o‘tdi; phase12 + checklist + continuation kontraktlari ham o‘tdi.
- Build14 ID `ZMWeweU4pPYveTF1_pm00`; source runtime hash `445ffafc17697dbae70c64d8065d92a80ee53d0260bc34772c61e39e7b9e381f`, verification hash `1370917a34f8201f4655747c8af4b4a22d1a3a7d0167f6e111fae1ad4bfc36c6`. Indeks: `source-build14.json`.

## Saqlangan build13 baseline — to‘liq gate o‘tmadi

`perf-archived-before-report.json`: **1 FAIL desktop (300 s timeout), 1 PASS mobile**, 518879.91 ms wrapper. Assertions yoki timeout oshirilmadi. Build13 archive ID `g0EEqICYSS1UCqJv3qiMv`, runtime source hash `b72ac06fae10206c42f40450d9c815281b2914061c1b51f9eb00d8450545a877`.

- `perf-pair-r13-r14/before-desktop.json` va `before-mobile.json`: har birida 3 cold + 3 warm kuzatuv. Desktop yakuniy JSON attachment ham yozilgan, ammo testning umumiy holati baribir FAIL.
- Bu yugurishda route assertions bajarildi; eski v2 dagi yo‘qolgan university tab takrorlanmadi. Bu intermittent xato yo‘qligining isboti emas.
- Desktop trace: yangi sahifa ochishning ayrim chaqiruvlari 61.5–62.1 s; ular UI dispatch→DOM vaqtiga qo‘shilmaydi. Bu browser/automation xarajati uchun diagnostik dalil, saytning 62 soniyalik interaksiyasi degan da’vo emas.
- Desktop shell dispatch→DOM: 447/433/400 ms, ikki RAF: 480/518/474 ms. Birinchi university panel: 679/643/632 ms; qaytish: 149/172/89 ms.
- Mobile shell dispatch→DOM: 1164/1656/1599 ms, ikki RAF: 1396/1794/1785 ms. Birinchi university panel: 3393/3015/3204 ms; qaytish: 512/238/275 ms.
- Bular actions-only-v2 lab namunalari: field INP, fizik paint, p95, production katalog yuki yoki statistik speedup emas. Snapshot-on tarixiy natija bilan solishtirib website yaxshilandi deyilmaydi.
- Shu yugurishda parallel build/typecheck/backend suite ishlatilmadi. Avvalgi v2 yugurishdagi typecheck contention’i saqlangan tarixiy cheklov bo‘lib qoladi.
- `perf-pair-r13-r14/archive-runtime13-index.json`: 4085 production artifact faylining hash indeksi; mutable cache/trace kiritilmagan. Archive `.cache`da bo‘lgani sabab sandbox tiklanishida saqlanishiga ishonib bo‘lmaydi.
- Trace ZIP nusxalari `perf-pair-r13-r14/traces-before/`da saqlandi. DOM snapshot soni desktop ZIP ichida 0.
- Matched after build14 **2 FAIL**, desktop panel yo‘qolishi, mobile search tab yo‘qolishi. `perf-build14-after.log`/`perf-build14-after-report.json`; immutable traces `traces-after/`da. Bu natija tezlashish yoki navigation yopilgani da’vosiga asos emas.
- Mobile route attachment: 9351.3 ms’da hash `#universities/search`; 9441.2 ms’da Next framework history writer `replaceState` bilan `#dashboard`ni qayta yozgan. Sanitized stack framework chunk `0r_kiy7bmoby_.js:1:8685`ga boradi; uning `HistoryUpdater` insertion effect’i queued canonical URL’ni yozishi tekshirildi. Qo‘shimcha `setState` bilan URL’ga ergashish bu xatoni tuzatmagan.
- Yangi tuzatish: hash-only push/replace’larda `window.history.state`ni saqlash, Next’ning keraksiz route-restore enqueue yo‘lidan qochish. Path/query navigation mexanizmi almashtirilmadi; Back/Forward va admin hashlar saqlanadi. Framework private state kalitlari hardcode qilinmadi.
- Navigation regressiyasi endi API-cookie shortcut emas, haqiqiy landing sign-in dialogi orqali kiradi: xato aynan login→shell→tez hash o‘tishida ko‘ringan. Test assertions, sleep/retry va timeoutlar yumshatilmadi.
- `navigation-history-lint.log`: targeted lint exit 0. Oldingi `navigation-targeted-lint.log`dagi effect setState xatosi yashirilmadi: o‘sha yondashuv olib tashlandi.
- Generated arxiv `.cache` va browser evidence `test-results` ESLint global ignores’ga qo‘shildi. Joriy `src`, `scripts`, `e2e` qoidalari o‘zgarmadi, lint baseline ceiling oshirilmadi.
- `history-fix-shared-build15.log`: **PASS validate:local; PASS build**, exit 0. Saqlangan ichki log `history-fix-shared15-detail.log`: **TOTAL_FAILS=0**. Build tafsiloti `history-fix-build15-detail.log`. Bu lokal suite natijasi, CI emas.
- Build15 ID `jDPfGbJzu3TOqyCIu7B2S`; runtime source hash `8f68434b9b8a1b7c9ff40a6a5a90a5f9bc28addff19d529e1de4187908e791e5`, verification hash `047cb759f27926da5113a8f502308bb512dea0f2fc43d311727f51b150456798`; `source-build15.json`.
- Build15 mos performance run: **1 FAIL desktop teardown timeout / 1 PASS mobile**, 524596.692 ms; `perf-build15-after.log`/`perf-build15-after-report.json`. Avvalgi route/panel yo‘qolishi takrorlanmadi, lekin butun performance gate hali FAIL. Desktop context.close bosqichida 300 s limiti tugadi. Desktop partial faylida 2 to‘liq kuzatuv to‘plami bor; uchinchisini to‘liq final namuna deb ko‘rsatmaymiz. Mobile’da 3 cold/warm kuzatuv to‘plami bor.
- `trace-metadata.json`: har profil trace’ida 9 hub-tab expect chaqiruvi, 0 DOM snapshot. Bu call-count dalili, alohida PASS verdict emas. After15 trace ZIP’lar alohida saqlandi.
- Mobile after15 shell dispatch→DOM: 1336/1544/1663 ms; ikki RAF: 1522/1693/1808 ms. Birinchi university pane: 3041/3024/3220 ms. Ular >1 s xarajatlar hali borligini ko‘rsatadi; umumiy tezlashish yoki p95 da’vosi yo‘q.
- Teardown xatosi yakunlangan kuzatuvlarni yo‘qotmasligi uchun keyingi runlarda partial JSON context.close’dan OLDIN yoziladi. Timeout/assertion o‘zgarmadi, final JSON baribir muvaffaqiyatli teardown’dan keyingina yoziladi. Bu test-only evidence tuzatishi; after15 tarixiy fayllari o‘zgarmadi.
- To‘liq production-mode browser suite `full-build15-browser.log`da yakunlandi: **38 PASS / 2 avvaldan opt-in SKIP / 0 FAIL**, exit 0; report `full-build15-browser-report.json`. Yangi dashboard screenshotlari `screens-build15/`, snapshotsiz shell diagnostikasi `shell-build15-diagnostic/`; tarixiy kataloglar saqlanadi. RU 390 px birinchi ekran screenshot’i ko‘zdan kechirildi; bu barcha vizual holatlar uchun blanket acceptance emas.
- Fresh `npm audit --json`: **info/low/moderate/high/critical/total = 0**, exit 0; `build15-fresh-audit.json`.
- `perf-pair-r13-r15/baseline-provenance.json` build13 oldin kuzatuvlarining SHA-256 bilan byte-identical nusxa ekanini qayd etadi. Oldingi FAIL holati o‘zgarmaydi. After fayllari yangi katalogga yoziladi, build14 xatolari ustiga yozilmaydi.
- Yangi UI-sign-in navigation testi endi o‘zgargani sabab build14 dagi 9 PASS’ni uning yangi talqini yoki butun build15 browser suite’i uchun PASS deb ishlatib bo‘lmaydi.

## Qancha ish qoldi?

Aniq foiz/soat uchun yetarli asos yo‘q. Qolgan ishlar sezilarli, 5 yirik blok:

1. Navigation regressiyasini tasdiqlash, >1 s mobile shell/first-pane xarajatlarini snapshotsiz diagnostika bilan ajratish; bir xil harness/protokolda after va gate natijalarini saqlash.
2. Detail/list/compare va boshqa consumerlarda programme/cycle/applicant scope, original unit, conflict va requirement-group kontraktlarini yakunlash. Eski raw detail aggregation va free-text fallback hali alohida tekshirish/ish talab qiladi.
3. Recommendation persona qamrovi, confirmed/conditional finance, hujjat review invalidation va barcha export/Telegram consumer parity bo‘yicha qolgan ishlar.
4. Qolgan haqiqiy cache/worker/vault concurrent-write va UI (RU/mobile/zoom/keyboard/focus) acceptance qamrovi. Oldingi lokal PASS natijalar barcha yangi scope talablarini avtomatik yopmaydi.
5. Yakuniy aynan bir daraxtda shared suite, build, full production-mode E2E, fresh audit, visual dalillar, requirement/status/file/runtime jadvali va recovery/release paketi.

Oddiy lokal implementatsiya production ruxsatiga bog‘lab to‘xtatilmaydi. Faqat haqiqiy tashqi operator/credential/provider amallari tashqarida qoladi. C01… identifikatorlari original A01–A26 ma’nolarini almashtirmaydi.

## Keyingi aniq ish nuqtasi

Joriy runtime o‘zgarmagan holda bu bosqichdagi navigation/build/full-browser tekshiruvlari tugadi. Endi oddiy lokal ishlarning keyingi ustuvorligi: `src/app/api/universities/[id]/route.ts`dagi raw institutional/programme minima va free-text aggregation’ni existing scoped resolver/requirement-group kontrakti bilan tenglashtirish; legacy qiymatlarni yo‘qotmasdan unknown deb ajratish. Detail’dagi synthetic `chanceForUniRow` / unconditional owner chance yo‘li ham list’dagi real programme discovery va explicit experimental opt-in bilan alohida parity tekshirishini talab qiladi. Ular hozir yopilgan deb belgilanmaydi.

Snapshot-disabled shell diagnostikasi bajarildi (`shell-build15-diagnostic/`, 11034 trace event, 3118 CPU sample). Alohida instrumented dispatch→DOM 1931.4 ms, DOM→ikki RAF 272.3 ms. `getCSSContent`, ARIA/visibility helperlari hali profilda ko‘rinadi: snapshotlarni o‘chirish barcha automation DOM ishini yo‘q qiladi degan xulosa noto‘g‘ri. Bu nomlarning o‘zi renderer/automation xarajatini to‘liq ajratmaydi; qolgan performance ishida caller/time-window va browser-control dalili zarur. Mazkur diagnostika benchmark yoki field INP emas.
