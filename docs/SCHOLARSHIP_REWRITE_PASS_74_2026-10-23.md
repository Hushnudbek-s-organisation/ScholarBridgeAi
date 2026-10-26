# ScholarBridgeAi — stipendiyalarni qayta yozish, 74-pass (15 ta bir qatorli davlat)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** 13 qator qayta yozildi, 2 qator allaqachon halol bo'lgani uchun **tegilmadi**.

---

## 1. MUHIM MARRA: `>5000` ro'yxati 24 → **11**

| Toifa | Soni | Holat |
|---|---|---|
| **AQSh** | **9** | hammasi **tasdiqlangan** stavka/chegara (pass 61–64) |
| **Qatar 587** HBKU | 1 | **43-passda tekshirilgan** (QR 9 000/oy, uy-joy yo'q), `QAR` |
| **Saudiya 908** KSU | 1 | **43-passda tekshirilgan** (KSU o'zi SAR 54 000 = USD 14 400) |

Ya'ni **bazada uydirma summa qolmadi**: qolgan har bir `>5000` qator **e'lon qilingan raqam**.

## 2. To'liq tekshirilgan qator (`reliability = 10`)

**871 NewUU (O'zbekiston)** — `newuu.uz/en/scholarships/tuition-fees-overview`:

| Fakt | Endi |
|---|---|
| Uch daraja: **50 % / 70 % / 100 %** | `coverage = Tuition Waiver`, `bas is = range` |
| 2026/27 to'lovlar (**UZS**): 25,2 mln (3 muhandislik), 34 mln, 42 mln, 48 mln, **MD 94 mln** | `award_currency = 'UZS'`, `amount = 0` |
| 70 % da qoladigan to'lov: 14,4 / 12,6 / 10,2 mln UZS | description ichida |
| 3 muhandislik dasturida **40 % mahalliy stipendiya allaqachon** to'lovga kiritilgan | description ichida |

> Ilgari turgan **USD 7 344** — bu **MD dasturining to'liq yillik to'lovi** dollar kursida, ya'ni **eng qimmat dasturning narxi**, stipendiya emas.

## 3. Mexanizm yozilgan 12 qator (`reliability = 4`)

| Davlat | Qator | Valyuta | Izoh |
|---|---|---|---|
| Argentina | 400 UBA | **ARS** | 48-passda UBA "tuition olmaydi" deb topilgan — bu **boshqa hujjat** |
| Braziliya | 401 USP | **BRL** | 48-passda USP "stipendiya bermaydi" — bu ham **boshqa hujjat** |
| Kolumbiya | 403 UNAL | **COP** | — |
| Chexiya | 876 CTU | **CZK** | `international.cvut.cz` **yuklanmadi** |
| Hindiston | 397 IIT KGP | **INR** | — |
| Indoneziya | 398 ITB | **IDR** | `itb.ac.id/en/admission` → **404** |
| Malayziya | 339 UM | **MYR** | `aadc.um.edu.my` **yuklanmadi** |
| Rossiya | 466 MSU | **RUB** | — |
| Sloveniya | 404 Ljubljana | **EUR** | ⚠️ **URL `ijs.si`** — bu **Jožef Stefan instituti**, Ljubljana universiteti emas |
| Janubiy Afrika | 503 UCT | **ZAR** | UCT sahifalari avvalgi passda **HTTP 500** bergan |
| Tayvan | 342 NTU | **TWD** | `oia.ntu.edu.tw` — **"under maintenance"** |
| Tailand | 502 Chula | **THB** | — |

## 4. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 13/13 | USD → **ARS, BRL, COP, CZK, INR, IDR, MYR, RUB, EUR, ZAR, TWD, THB, UZS** |
| 2 | **Uydirma summa** | 13 qator (6 000–20 000 USD) | 871 da haqiqiy UZS jadval, 12 tasida **bo'sh** |
| 3 | **Noto'g'ri URL** | 404 | `ijs.si` — Ljubljana emas, **institut** sayti |
| 4 | **Shablon muddat** | 9 qatorda "… annually" | `not_published` |
| 5 | **`reliability = 9/10` bo'lgan uydirma** | 12 qator | **4** ga tushirildi |
| 6 | **Kanonik bo'lmagan daraja** | 401, 403, 404, 876 va boshqalar (`"Master"`) | → `"Master's"`, `"Bachelor's"`, `"PhD"` |
| 7 | **Chalkashtirish xavfi** | 400, 401 | UBA/USP bo'yicha 48-passda **boshqa qatorlar** bekor qilingan — bu ikki qator **boshqa hujjat**, izohda yozildi |

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 73 | Pass 74 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `amount_usd_value > 5000` | 24 | **11** | **−13** |
| shundan **AQSh bo'lmagan** | 15 | **2** (Ikkalasi ham tasdiqlangan) | **−13** |
| `source_reliability = 4` | 125 | **137** | +12 |
| bare-domain | 83 | **83** | 0 |

## 6. Tekshiruv

13 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 7. Keyingi qadam

Uydirma summalar tugadi. Endi qolgan ish **sifat**, miqdor emas:

1. **75-pass** — `source_reliability = 5` bo'lgan **27 AQSh doktorlik qatori** (har biriga universitetning o'z moliyalashtirish sahifasi).
2. Keyin **83 bare-domain** `website_url`.
3. Keyin `source_reliability = 4` bo'lgan **137 qator** — sahifalar ochilgach bosqichma-bosqich.
4. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP GAS, UNAM dublikati, 57 universitetda `image_url` yo'q, 134 universitetda tasdiqlangan deadline yo'q.
