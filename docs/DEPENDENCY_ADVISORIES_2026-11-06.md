# 12 ta moderate advisory klassifikatsiyasi — 2026-11-06

**Holat:** lokal branch `arena/672d7668-scholarbridgeai`, HEAD `d185e61` + ishchi diff.
**Buyruq:** `npm audit --json`, `npm audit --omit=dev --audit-level=moderate`, `npm view <pkg> ...`, `npm ls`, `npm install --no-audit --no-fund`, `npx drizzle-kit --version`, `npx tsx ...`.
**Natija:** boshlang‘ich `12 moderate` → amalga oshirilgan xavfsiz update’dan keyin `4 moderate`; **production-only audit: `found 0 vulnerabilities`** (0 info/low/high/critical). `npm audit fix --force`, talabni pasaytirish, advisory’ni yashirish yoki threshold o‘zgartirish **qo‘llanilmadi**.

## Ikkita ildiz advisory

| # | GHSA | Tavsif | Zaif range | Production’ga ta’sir |
|---|---|---|---|---|
| A | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | esbuild dev-server: istalgan sayt dev-server’ga so‘rov yuborib javobni o‘qiy oladi (CORS) | `<=0.24.2` | Yo‘q: esbuild’ning `serve()` development server’i production build/runtime’da ishga tushmaydi |
| B | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | minimatch `globparts` amplifikatsiyasi orqali ReDoS | `>=7.0.0 <11.0.1` | Yo‘q: lint/CLI toolchain’dagi glob matcher, production so‘rov yo‘lida emas |

## Paketma-paket (12 ta)

| Paket | O‘rnatilgan | Turi (prod/dev) | Ishlatilish yo‘li | Ildiz | Xavfsiz update | Natija |
|---|---|---|---|---|---|---|
| `minimatch` (estree ichida) | 10.2.6 → **11.0.5** | dev, tranzitiv | `@typescript-eslint/typescript-estree@8.66.0` glob | B | `overrides` scoped `^11.0.5`; engine `18‖20‖>=22` loyiha `>=20 <23` ga mos; API mos | **Yopildi** |
| `@typescript-eslint/typescript-estree` | 8.66.0 | dev, tranzitiv | `typescript-eslint` / `eslint-config-next` | B | estree minimatch’i yuqoridagi override bilan | **Yopildi** |
| `@typescript-eslint/parser` | 8.66.0 | dev, tranzitiv | ESLint parsing | B (zanjir) | estree tuzalishi bilan | **Yopildi** |
| `@typescript-eslint/eslint-plugin` | 8.66.0 | dev, tranzitiv | ESLint qoidalari | B (zanjir) | estree tuzalishi bilan | **Yopildi** |
| `@typescript-eslint/type-utils` | 8.66.0 | dev, tranzitiv | ESLint type util | B (zanjir) | estree tuzalishi bilan | **Yopildi** |
| `@typescript-eslint/utils` | 8.66.0 | dev, tranzitiv | ESLint util | B (zanjir) | estree tuzalishi bilan | **Yopildi** |
| `typescript-eslint` | 8.66.0 | dev, tranzitiv | `eslint-config-next` | B (zanjir) | estree tuzalishi bilan | **Yopildi** |
| `eslint-config-next` | 16.2.6 | dev, to‘g‘ridan-to‘g‘ri | lint konfiguratsiyasi | B (zanjir) | audit `15.5.29` taklif qiladi = **major downgrade 16→15**, rad etildi; estree override bilan zanjir uzildi | **Yopildi** |
| `esbuild` | 0.18.20 (`@esbuild-kit/core-utils` ichida); 0.25.12 / 0.28.2 boshqa joylarda | dev, tranzitiv | `drizzle-kit` CLI loader, `tsx` | A | qarang: quyidagi sabab | **Qoldi** |
| `@esbuild-kit/core-utils` | 3.3.2 | dev, tranzitiv | `@esbuild-kit/esm-loader` | A | qattiq `esbuild: "~0.18.20"` bog‘lanish | **Qoldi** |
| `@esbuild-kit/esm-loader` | 2.6.5 | dev, tranzitiv | `drizzle-kit@0.31.11` config yuklash | A | yuqoridagi zanjir | **Qoldi** |
| `drizzle-kit` | 0.31.11 | dev, to‘g‘ridan-to‘g‘ri | `db:push` / migratsiya CLI (qo‘lda) | A | audit faqat `0.18.1` = **downgrade 0.31→0.18** | **Qoldi** |

> Eslatma: `minimatch@3.1.5` (eslint-plugin-import / -react / -jsx-a11y / @eslint/*) zaif range `>=7` ga kirmaydi; scoped override ularning 3.x API’sini buzmaydi — `npm ls` toza, `ESLPROBLEMS` yo‘q.

## Qolgan 4 ta uchun aniq sabab va ta’sir

- **Bitta ildiz, to‘rtta ko‘rinish.** `esbuild@0.18.20` → `@esbuild-kit/core-utils` → `@esbuild-kit/esm-loader` → `drizzle-kit`. Bular to‘rtta mustaqil zaiflik emas, bitta `GHSA-67mh-4wv8-2f99` ning tranzitiv tarqalishi.
- **Ta’sir yo‘li.** Zaiflik faqat esbuild’ning `serve()` development server’i ishlatilganda yuzaga keladi (CVSS `AV:N/AC:H/PR:N/UI:R`, ya’ni foydalanuvchi zararli sahifaga o‘tishi kerak). Bu zanjir `drizzle-kit` migratsiya CLI’sini ishga tushirishda config faylni yuklash (`transform`) uchun ishlatiladi; **u hech qachon tarmoqqa ochiq dev-server ochmaydi**. `npm audit --omit=dev` → `0 vulnerabilities`: production runtime, Next.js build, API route’lar va brauzer bundle’ida bu paket yo‘q.
- **Nima uchun xavfsiz update qo‘llanmadi.** `@esbuild-kit/core-utils@3.3.2` `esbuild` ni `~0.18.20` ga qattiq bog‘lagan. `overrides` orqali `^0.25.12` ga majburlash sinab ko‘rildi: `npm ls` `invalid: esbuild@0.18.20 ... ^0.25.12` xatosini berdi (0.18→0.25 loader API mosligi kafolatlanmagan). Buzilgan lock holati darhol bekor qilindi, `npm ls` qayta toza (`ESLPROBLEMS` yo‘q), `npx drizzle-kit --version` va `npx tsx scripts/check-observability.ts` ishlashi tasdiqlandi. Hech qanday yarim-buzilgan override qoldirilmadi.
- **Nima uchun `--force` qo‘llanmadi.** `npm audit fix --force` `drizzle-kit` ni `0.31.11 → 0.18.1` va `eslint-config-next` ni `16.2.6 → 15.5.29` ga **pasaytiradi**. Bu major downgrade bo‘lib, foydalanuvchi tomonidan aniq taqiqlangan; bundan tashqari Drizzle schema/migratsiya CLI’sining 0.31 xatti-harakati (loyiha `drizzle-orm@0.45.2` bilan) 0.18 ga tushirilsa mos kelmasligi xavfi bor. Shuning uchun rad etildi.
- **Qachon yopiladi.** `@esbuild-kit/*` zanjiri `drizzle-kit` tomonidan `esbuild@0.25+` ga o‘tkazilganda (yangi drizzle-kit release) yoki paket butunlay olib tashlanganda. Bu tashqi paket yangilanishiga bog‘liq — loyiha ichida xavfsiz almashtirish yo‘q. Kuzatuv: `npm audit --omit=dev` production tozaligini tasdiqlaydi; CI `npm audit` 4 moderate’ni ko‘rsatadi va ular ushbu hujjat bilan asoslanadi, yashirilmaydi.

## Amalga oshirilgan o‘zgarishlar va tekshiruv

- `package.json` → `overrides."@typescript-eslint/typescript-estree".minimatch = "^11.0.5"` (yangi).
- `package-lock.json` → `minimatch@11.0.5` estree ostida (yangi); boshqa paketlar o‘zgarmadi (`added 1 package, and changed 1 package`).
- `npm audit --json`: `12 moderate` → `4 moderate`, `high/critical/low/info = 0`.
- `npm audit --omit=dev --audit-level=moderate`: `found 0 vulnerabilities` (exit 0).
- `npm ls esbuild`: toza, `ESLPROBLEMS` yo‘q.
- `npx drizzle-kit --version`: `v0.31.11` / `drizzle-orm v0.45.2` (exit 0).
- `npx tsx scripts/check-observability.ts`: `8 passed, 0 failed` (exit 0).
- `npm run typecheck` / lint / guard sweeps: ushbu paket o‘zgarishi bilan qayta yugurtildi (pastga qarang: yakuniy hisobot).

## Cheklovlar

- Bu faqat lokal dependency/lock o‘zgarishi; production deploy, `npm ci` ning CI muhitidagi natijasi va `npm audit fix --force` sinovi qo‘llanilmadi.
- 4 ta qoldiq advisory production’ga ta’sir qilmasa ham **yopilmagan** va yashirilmagan; ular uchun yuqoridagi sabab va kuzatuv sharti keltirilgan.
- Hech qanday talab pasaytirilmadi, threshold oshirilmadi, advisory o‘chirilmadi.
