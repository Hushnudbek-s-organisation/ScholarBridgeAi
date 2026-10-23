# Kod auditi — 2026-10-23

**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Nima qilindi:** butun kod bazasi typecheck, lint, 40+ test to'plami, production
build va API xavfsizlik auditi orqali o'tkazildi. Uchta haqiqiy muammo topildi va
tuzatildi; bittasi muhit cheklovi.

---

## 1. Umumiy natija

| Tekshiruv | Natija |
| --- | --- |
| `tsc --noEmit` | ✅ 0 xato |
| `eslint .` | ✅ 0 xato, 0 ogohlantirish |
| `npm run build` (production) | ✅ muvaffaqiyatli |
| Test to'plamlari | ✅ **43/44 o'tdi** (bittasi muhit) |
| `check-api-anonymous` (138 route) | ✅ har bir himoyalangan route anonim chaqiruvni rad etdi |
| `check-i18n` | ✅ 3309 `t()` chaqiruvi, 118 fayl |
| `check-responsive` | ✅ 65 tekshiruv |
| `dark-audit` | ✅ 326 qoida, 0 muammo |
| `audit:check` | ✅ 0 high/critical |

---

## 2. Topilgan va tuzatilgan muammolar

### 2.1 `check-provenance` — test kodi bilan zid edi (haqiqiy xato)

Test shuni talab qilardi: manbasiz (`source_url IS NULL`) talab **qaytishi**, lekin
`verificationStatus: "unverified"` bilan.

Aslida API buni ataylab **butunlay tashlab yuboradi**:

```ts
// Requirements without row-level verification are not facts. Keep them out of
// the response and out of the program minima consumed by matching/chancing;
// provenance alone (for example, a university root URL) does not verify a
// numeric requirement.
if (r.verificationStatus !== "verified" || !r.sourceUrl) continue;
```

**Nega kod to'g'ri:** `UniversityDetail.tsx` har bir talabni oddiy fakt sifatida
chizadi — "tasdiqlanmagan" belgisi yo'q. Ya'ni manbasiz `IELTS 7.0` qaytarilsa,
u ekranda tasdiqlangan raqam bo'lib ko'rinardi. Bu loyihaning asosiy qoidasini
buzadi.

Tekshirdim: real bazada **3032 ta talabning hammasi `verified` va manbali** —
filtr amalda hech narsani yo'qotmaydi, faqat himoya.

**Tuzatish:** test haqiqiy (qat'iyroq) shartnomaga moslandi + qo'shimcha tekshiruv
qo'shildi — dastur o'zi ro'yxatda qolishi kerak ("noma'lum" ≠ "yo'q").

```
✓ p2 requirements are withheld entirely (no source ⇒ not shown as fact)
✓ p2 is still listed even with its requirements withheld
check-provenance: PASS
```

### 2.2 `audit:check` — eskirgan istisno

`audit-exceptions.json` da `GHSA-vfj7-8cjw-p6xm` (`braces`) istisnosi bor edi.
GitHub bu advisory'ni **npm bazasidan olib tashlagan** — `npm audit` endi uni
umuman ko'rsatmaydi (`grep -c` → 0).

Gate o'zining eskirgan yozuvini o'zi ushladi (dizayn bo'yicha shunday).

**Tuzatish:** istisno o'chirildi — `exceptions: []`. Endi **hech qanday istisno
yo'q**: barcha high/critical advisory'lar istisnosiz gate qilinadi.
`docs/RELEASE_GATE.md` va skript izohi yangilandi.

```
PASSED: no unreviewed high or critical advisories. 0 reviewed exception(s).
```

### 2.3 `test:e2e` — chalg'ituvchi xato xabari

Bu muhitda Chromium ishga tushmaydi:

```
/tmp/chromium: error while loading shared libraries: libnspr4.so
```

Root yo'q, shuning uchun o'rnatib bo'lmaydi. Muammo — **kodda emas**.

Lekin runner buni "**3 failed**" deb ko'rsatardi va Playwright har bir test uchun
"target page, context or browser has been closed" derdi — go'yo kod buzilgandek.

**Tuzatish:** `scripts/run-e2e.mjs` endi brauzerni oldindan sinaydi va aniq
xabar beradi:

```
E2E cannot run on this machine: the bundled Chromium will not start.
  /tmp/chromium: error while loading shared libraries: libnspr4.so …
This is an environment problem, not a test failure — no application code was executed.
Install the browser's system libraries … sudo apt-get install -y libnspr4 libnss3 …
```

Exit kodi **3** — "muhit" uchun alohida kod, "test yiqildi" (1) bilan
aralashtirilmaydi.

---

## 3. To'liq test ro'yxati

O'tganlar (43):

```
ai-settings 96 · ai-format 40 · ai-cost 67 · plain-text · match 99 ·
chancing 27 · roadmap 67 · documents 41 · essays 103 · visa-similar 102 ·
visa-scoring 67 · video-player 42 · samples 151 · costs 71 · cv 59 ·
compare 44 · mentors 44 · parent 20 · dataset 50 · render 337 ·
essay-adapter 50 · rec-letter 39 · country-compare 24 · panel-placement 26 ·
countries · opportunities 27 · essay-reviews 16 · dashboard-cache 13 ·
growth 39 · telegram 28 · telegram-integration 134 · ownership 83 ·
portability 57 · journey 115 · differentiators 724 · schema-repair 18 ·
provenance · recommend 88 · study-interests 35 · referral 56 · payments 114 ·
career-discovery · arrival · calculations 55 · streak 29 · schema · i18n ·
responsive 65 · dark 326 · api-anonymous 248 handler · task-sync ·
lint-baseline · schema-apply-safety · stage7-seed-safety · seed-catalog ·
dependency-audit · deadlines 10 · duplicates
```

Muhit sababli ishlamagan (1): `e2e` — brauzer kutubxonasi yo'q (yuqorida).

---

## 4. Integratsiya haqida eslatma

`check-api-anonymous` 51 ta himoyalangan route haqida shunday dedi:

> "51 protected route(s) answered a validation error before the auth check"

Bu **xato emas** (route'lar ma'lumot bermaydi, faqat `400 profileId is required`
qaytaradi), lekin yaxshiroq tartib — avval `401`. Kelajakdagi ish sifatida
qayd etildi, hozircha o'zgartirilmadi: har bir route'da tekshiruv tartibini
almashtirish katta diff va alohida test talab qiladi.
