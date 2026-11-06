# Vizual qabul — 2026-11-06 (joriy kod)

**Oldin (baseline):** `docs/redesign/baseline/` — 63 ta fayl, historical redesign fazasi (390/820/1440, light/dark, landing + app sahifalari).
**Keyin (joriy):** shu papka — `e2e/visual-acceptance-2026.spec.ts` tomonidan real Chromium’da olingan screenshotlar.

## Qanday yugurtiriladi

```bash
E2E_VISUAL=1 node scripts/run-e2e.mjs e2e/visual-acceptance-2026.spec.ts
```

`playwright.config.ts` standart `test:e2e` dan bu spec’ni `testIgnore` bilan chiqaradi (16 ta kombinatsiya asosiy suite’ni sekinlashtirmasligi uchun). `E2E_VISUAL=1` bo‘lganda ignore o‘chadi va aniq spec path beriladi. Disposable embedded PostgreSQL + production-mode `next start` + fixture’lar `run-e2e.mjs` tomonidan yaratiladi; hech qanday production ulanish yo‘q.

## Qamrov

| O‘lchov | Qiymatlar |
|---|---|
| Viewport | **390px** (844 baland) va **1440px** (1000 baland); mavjud baseline’da 820px (tablet) ham bor |
| Locale | **EN / UZ / RU** (`scholarbridge_locale` cookie, server va client bir xil) |
| Theme | **light / dark** (html `.dark` klassi) |
| Sahifalar (EN, har viewport/theme) | dashboard, universities catalog, university-detail, grants, finance, tracker, documents, chancing, profile |
| UZ/RU (uzun matn xavfi) | dashboard, universities, grants, documents |
| Admin (alohida admin sessiya) | review queue, refresh center — 390/1440 × light/dark |

## Har screenshot bilan birga avtomatik assert

- `document.documentElement.scrollWidth <= innerWidth + 1` → gorizontal overflow yo‘q.
- `[data-action="primary"]` markazidagi `elementFromPoint` boshqa element emas → asosiy tugma fixed/sticky panel bilan yopilmagan.
- `animations: "disabled"` → screenshot animatsiya o‘rtasida emas.

## Chegara

Screenshot **interaktiv test o‘rnini bosmaydi**: login/logout/reset, profil saqlash, qidiruv/filter/sort/pagination, save/compare/export, ariza/hujjat, deep link/back-forward, locale/theme o‘tishlari `test:e2e` (23 ta) va `validate:local` guard’lari bilan alohida sinanadi. `react-dom/server` (`test:design-system`, `test:evidence-render`) responsive sifat emas — u faqat komponent kontraktini isbotlaydi. Browser benchmark (`test:browser-perf`) production real-user INP emas.

Tooltip/modal/dropdown/toast ustma-ust tushishi, focus-kontrastning barcha temalarda o‘qilishi va mobil klaviatura/safe-area — `assertLayout` + mavjud E2E (`site-audit.spec.ts` 390px/1440px, `test:dark` 0 unreadable pair) bilan qisman qamrab olingan; har bir kombinatsiya uchun alohida qo‘lda ko‘rib chiqish **qilinmadi**.
