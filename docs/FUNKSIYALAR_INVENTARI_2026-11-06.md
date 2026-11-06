# Funksiyalarni saqlash inventari — 2026-11-06

**Branch:** `arena/672d7668-scholarbridgeai` · **HEAD:** `d185e61` · **Joriy diff:** `102 M / 71 ??` (o‘zgartirish BOSHLANISHIDAN OLDIN o‘lchandi).
**Maqsad:** premium dizayn va ma’lumot tuzatishlari hech bir mavjud funksiyani o‘chirmasligini isbotlash.

## Qanday o‘lchanadi

`docs/feature-inventory-baseline.json` — o‘zgartirish boshlanishidan oldin `npm run test:feature-inventory:snapshot` bilan yozilgan **funksiya identifikatorlari** ro‘yxati. Bu fayl hash’i emas: dizayn/kod tahriri identifikatorni o‘zgartirmasa, tekshiruv yashil qoladi; sahifa/route/method/tab/query param o‘chsa — qizil.

| Identifikator | Soni | Manba |
|---|---:|---|
| Public / authenticated sahifalar | 13 | `src/app/**/page.tsx` |
| API route + HTTP method juftliklari | 290 | `src/app/api/**/route.ts`, `export … GET/POST/PUT/PATCH/DELETE/HEAD` |
| Navigatsiya section / sub-pane | 50 | `src/lib/navSections.ts` |
| Admin tab | 26 | `src/components/AdminPanel.tsx` `SECTIONS` |
| Til | 3 | `src/i18n/messages/{en,uz,ru}.json` |
| Tema | 3 | `src/lib/theme.ts` (`light`/`dark`/`system`) |
| Query param / deep-link | 85 | `searchParams.get`, `params.get`, `URLSearchParams` chaqiruvlari |

**Tekshiruv:** `npm run test:feature-inventory` → har bir toifa bo‘yicha `before` va `after` ro‘yxatini solishtiradi; `MISSING` chiqsa exit 1. `+ new` faqat qo‘shilgan funksiya uchun ruxsat.

## Guruhlar bo‘yicha eski → yangi kirish nuqtasi

| Funksiya guruhi | Eski kirish nuqtasi | Asosiy amallar | Yangilangan kirish nuqtasi | Tekshiruv |
|---|---|---|---|---|
| Public landing, `?start=1` | `src/app/page.tsx` → `HomeClient` | SSR landing, start, locale/theme cookie | **o‘zgartirilmadi** | inventory `pages`, E2E |
| Public static sahifalar | `/features`, `/privacy`, `/terms`, `/tg`, `/forgot-password`, `/reset-password`, `/certificates/[code]`, `/parent/[token]` | akkauntsiz ochish, Telegram link, reset, sertifikat, parent token | **o‘zgartirilmadi** | inventory `pages`, `test:auth`, `test:password-reset` |
| Katalog / detail / grant | `/universities`, `/universities/[id]`, `/scholarships`, `/scholarships/[id]` | qidiruv, filter, sort, pagination, save, compare, detail | **o‘zgartirilmadi**; `evidence` yorlig‘i qo‘shildi | inventory `pages`, `test:university-sort`, `test:compare`, `test:evidence-render` |
| Hub panellari (50 ta) | `NAV_SECTIONS` → `HomeClient` hash/tab | dashboard, search, careers, matches, outlook, countries, browse, recommended, opportunities, study-plan/plan/tests/tools, tasks/deadlines, profile/readiness/goals/activities/stories/similar, funding, applications/tracker/workspace, materials/requirements/documents/essays/interviews, offers, post-admission-funding, visa/speaking, community/forum, courses, consulting, rewards, notifications, parent, payments, faq, guidance, apostille, departure, admin | **o‘zgartirilmadi**; dashboard’da bitta “Keyingi qadam” ajratildi, qolgan amallar guruhlangan holda saqlandi | inventory `nav`, `test:internal-surfaces`, `test:rendered-copy` |
| Qidiruv / filter / sort / pagination | hub + `/api/universities`, `/api/scholarships` | `?q=`, `?country=`, `?sort=`, `?page=`, `?locale=`, holatni qaytishda saqlash | **o‘zgartirilmadi** | inventory `queryParams` (85), `test:university-sort` |
| Save / compare / export | `/api/saved-*`, `/api/countries/compare`, export endpoint’lari | saqlash, taqqoslash, eksport | **o‘zgartirilmadi** | inventory `actions:save` 11, `actions:compare` 1, `actions:export` 1 |
| Profil / tavsiya / ariza / hujjat / moliya | nav + 290 API method | profil CRUD, tavsiya, ariza yaratish/tahrirlash, vault, essay, moliya | **o‘zgartirilmadi** | inventory `actions:profile` 9, `applications` 6, `documents` 24, `test:applications-state`, `test:documents`, `test:finance-unified` |
| AI / chancing / mentor | AI panel + 23 ta AI endpoint | chat, essay, chancing, mentor | **o‘zgartirilmadi** | inventory `actions:ai` 23, `test:admission-probability` |
| Payment | 6 ta endpoint | sandbox/mock, webhook, idempotency | **o‘zgartirilmadi** | inventory `actions:payment` 6, `test:payments` 114/0 |
| Telegram / kanal | 39 ta endpoint, `/tg` public | kanal postlari, approval, landing | **o‘zgartirilmadi** | inventory `actions:telegram` 39, `test:channel` 196/0 |
| Research / refresh / review queue | 5 / 3 / 2 ta endpoint | durable run, claim, cancel, resume, refresh 2 rejimi, review qarori | **o‘zgartirilmadi**; `partialFailures` va lease guard’i qo‘shildi | inventory `actions:research/refresh/reviewQueue`, `test:research-runtime`, `test:review-queue-runtime` |
| Admin (26 tab) | `AdminPanel.tsx` `SECTIONS` + `#<tab>` hash + `localStorage` | overview, analytics, universities, scholarships, opportunities, courses, verify, research, refresh, reviewQueue, stories, reports, consulting, guide, goalLibrary, vaultPrompts, checklist, navigation, premium, accounts, telegram, channel, config, ai, audit, ownership | **o‘zgartirilmadi**; umumiy dizayn tokenlari qo‘llandi | inventory `admin`, `test:internal-surfaces` |
| Auth / logout / reset | 14 ta endpoint | HMAC `sb_session`, login, logout, reset, one-time token | **o‘zgartirilmadi** | inventory `actions:auth` 14, `test:auth`, `test:password-reset` |
| EN/UZ/RU + light/dark/system | `src/i18n/*`, `src/lib/theme.ts` | til/tema almashinuvi, holat saqlanishi | **o‘zgartirilmadi**; yangi `evidence` kalitlari 3 tilda qo‘shildi | inventory `locales`/`theme`, `check-i18n.mjs`, `test:dark` |
| Direct link / alias / back-forward | `NAV_SECTIONS` hash, `TAB_KEY`, `src/proxy.ts` rewrite | deep link, browser back/forward | **o‘zgartirilmadi** | inventory `queryParams`, E2E |

> To‘liq 290 ta `METHOD /api/...` identifikatori `docs/feature-inventory-baseline.json` da. Jadval guruhlari shu ro‘yxatning odam o‘qiydigan ko‘rinishi.

## Yakuniy solishtirish — 2026-11-06, joriy dirty tree

`npm run test:feature-inventory:verify` — **0 preservation failure(s)**, barcha o‘lchovlar baseline bilan teng yoki ko‘paygan. «Ko‘paygan» faqat yangi qo‘shilgan guard/route/action hisobiga, hech bir eski identifikator o‘chirilmagan.

| Ko‘rsatkich | Boshlanish | Yakun | Farq |
|---|---:|---:|---:|
| Sahifalar (`page.tsx`) | 13 | 13 | 0 |
| API route + method | 290 | 290 | 0 |
| Nav section | 50 | 50 | 0 |
| Admin tab | 26 | 26 | 0 |
| Locale | 3 (`en`, `uz`, `ru`) | 3 | 0 |
| Theme | 3 (`light`, `dark`, `system`) | 3 | 0 |
| Query param | 85 | 85 | 0 |
| save | 11 | 11 | 0 |
| compare | 1 | 1 | 0 |
| export | 1 | 1 | 0 |
| payment | 6 | 6 | 0 |
| telegram | 39 | 39 | 0 |
| research / refresh / reviewQueue | 5 / 3 / 2 | 5 / 3 / 2 | 0 |
| documents / applications / ai | 24 / 6 / 23 | 24 / 6 / 23 | 0 |
| profile / auth | 9 / 14 | 9 / 14 | 0 |

### Qo‘shilgan, lekin hech narsani almashtirmagan yangi kirish nuqtalari

| Yangi element | Eski kirish nuqtasi | Nima qiladi | Tekshiruv |
|---|---|---|---|
| Dashboard «Keyingi qadam» paneli (`src/components/DashboardView.tsx`) | Dashboard / stat kartalari, sidebar | Bitta primary + 3 ta aniq secondary amal; eski barcha stat kartalari va AI audit tugmasi joyida | `test:design-system` 10/0, `test:feature-inventory:verify` 0, E2E nav |
| `ActionBar`, `StatusPill` (`src/components/ui/`) | Mavjud `Button`, `JourneyCard`, `Pill` | Umumiy komponentlar; hech bir eski komponent o‘chirilmadi, barrel’dan eski eksportlar saqlandi | `test:design-system` 10/0 (real `react-dom/server`) |
| `EvidenceNote` 5 ta ekranda | Xom raqam chiqaradigan span’lar | Raqam, nomi, source va izohi bir xil fact’dan; xom qiymat ko‘rsatilishi saqlandi | `test:evidence-render` 16/0 |
| `presentRaw()` (`src/lib/factPresentation.ts`) | `legacyEvidence()` (saqlandi) | Lokal hisoblangan qiymat uchun aniq `trust`/`valueType`; hech qachon trust’ni oshirmaydi | `test:evidence-render` 16/0 |
| `scripts/validate-local.sh` + `validate:local` | `/tmp/final-validate.sh` (23 check) | 35 ta takrorlanadigan check, CI P1 chain’ga 3 ta yangi guard qo‘shildi | `npm run validate:local` `TOTAL_FAILS=0` |
| `docs/MIGRATION_RUNBOOK_2026-11-06.md` | Release §8 (xato) | Forward 3 fayl vs recovery 3 fayl alohida | `test:migration-runner` 9/0, `test:migration-recovery` 7/0 |
| `docs/OFFICIAL_SOURCE_READ_2026-11-06.md` | Faqat chat’dagi `fetch_page` dalili | 4 ta rasmiy sahifa verbatim iqtiboslari saqlandi | `test:source-recheck` 12/0, `test:evidence-render` 16/0 |

### Chegara

Inventar statik identifikatorlar, route/hash/query va amal chaqiruvlarini solishtiradi; u **har bir amalning production’da ishlashini isbotlamaydi**. Quyidagilar lokal E2E/guard bilan tekshirildi: login/logout/reset, profil saqlash, qidiruv/filter/sort/pagination, save/compare, ariza/hujjat, tez deep-link/back/forward, til/theme. **Production user-flow, real payment va real Telegram yuborish tekshirilmadi** (credential va ruxsat yo‘q). Pulli providerlar E2E’da env’dan chiqarilgan/mock qilingan; funksiyalar o‘chirilmagan. Public `/tg` landing akkauntsiz E2E’da ochiladi.

Xulosa: inventar bo‘yicha **hech bir funksiya, panel, tab, deep link yoki amal o‘chirilmagan**; yuqoridagi chegaralar bilan.
