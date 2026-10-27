# ScholarBridgeAi — stipendiyalarni qayta yozish, 70-pass (Nordik klasteri)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Daniya 3 + Norvegiya 3 + Finlandiya 4 = **10 qator**.
**Natija:** **Nordik davlatlarida `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. To'liq tekshirilgan qator (`reliability = 10`)

**425 NTNU Doctoral Research Fellowships** (`ntnu.edu/phd`)

| E'lon qilingan fakt | Endi |
|---|---|
| Doktorantura — **maoshli lavozim**, stipendiya emas | `coverage = Full Funding`, `currency = NOK`, `amount = 0` |
| **Moliyalashtirish qabul uchun mutlaq shart** | requirements ichida |
| Lavozimlar **vakansiya** sifatida **doimiy** e'lon qilinadi | `deadline_type = 'rolling'`, "yagona muddat yo'q" |
| Nominal **3 yil**, ba'zilarida **4-yil** (odatda o'qitish) — **mehnat shartnomasida** yoziladi | requirements ichida |
| **30 ECTS** kurs + **2,5 yil**ga baholangan dissertatsiya | description ichida |
| Norvegiyada doktoranturaga **tuition olinmaydi** | tuition_coverage ichida |

> `amount_usd_value = 0`: bu **maosh**, e'lon qilingan stipendiya summasi emas. Ilgari turgan **USD 54 000** — noma'lum maoshni "stipendiya"ga aylantirilgan uydirma.

## 2. Mexanizm yozilgan 9 qator (`reliability = 4`)

| Davlat | Valyuta | Qatorlar |
|---|---|---|
| **Daniya** | DKK | **414** DTU · **377** UCPH · **413** Aarhus |
| **Norvegiya** | NOK | **346** Oslo · **424** Bergen |
| **Finlandiya** | EUR | **353** Helsinki · **405** Aalto · **504** Turku · **505** Oulu |

Har birida: `amount = 0`, `award_amount = NULL`, **mahalliy valyuta**, `coverage = Unspecified`, `deadline = not_published`; izohda uydirma USD summasi va shablon muddat.

**Alohida:** **504** (Turku 50 % waiver) va **505** (Oulu 10–40 % waiver) — bular **foiz**, summa emas; shuning uchun dollar figurasi butunlay olib tashlandi.

---

## 3. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Maoshni stipendiya deb yozish** | 414, 377, 346, 424, 425 | 5 ta doktorlik qatorining hammasi — Shimoliy Yevropada **ish o'rni**; izohda tushuntirildi |
| 2 | **Valyuta xato** | 10/10 | USD → **DKK / NOK / EUR** |
| 3 | **Uydirma summa** | 425 (54 000), 414 (55 000), 377 (48 000), 346 (52 000), 424 (52 000), 413 (26 000), 353 (22 000), 405 (18 000), 504 (6 480), 505 (6 048) | 425 → **0** (maosh), qolganlari → **bo'sh** |
| 4 | **Foizni summaga aylantirish** | 504 (50 %), 505 (10–40 %) | `award_amount = NULL` |
| 5 | **"Rolling" muddat** | 414, 377, 346, 424 | `not_published` (425 da **haqiqiy** rolling — vakansiyalar) |
| 6 | **Kanonik bo'lmagan daraja** | 413, 353, 405 (`"Master"`), 504, 505 (`"Bachelor"`) | → `"Master's"`, `"Bachelor's"`, `"PhD"` |
| 7 | **O'lik URL** | 353 (Helsinki) | **404** — notesda qayd etildi |

---

## 4. Uch muhim topilma

**1) Shimoliy Yevropada "stipendiya" so'zi noto'g'ri.**
Norvegiya va Daniyada doktorant — **xodim**: maosh, mehnat shartnomasi, ta'til, 4-yil o'qitish majburiyati. Buni "USD 54 000 stipendiya" deb yozish ham summani, ham huquqiy maqomni buzadi.

**2) Kirish yo'li — vakansiya, ariza emas.**
NTNU ochiq yozadi: lavozimlar **doimiy ravishda** e'lon qilinadi; ya'ni "yillik grant arizasi" degan narsa yo'q — **e'lon qilingan ish o'rniga** ariza beriladi.

**3) Finlandiyada ikki xil narsa bor.**
Magistratura uchun **tuition fee waiver** (foizda), doktorantura uchun esa grant/maosh. 504 va 505 qatorlarida aynan shu **foiz** dollar summasiga aylantirilgan edi.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 69 | Pass 70 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `amount_usd_value > 5000` | 57 | **47** | **−10** |
| shundan **Daniya/Norvegiya/Finlandiya** | 10 | **0** | **−10** ✅ |
| `source_reliability = 4` | 96 | **105** | +9 |
| bare-domain | 83 | **83** | 0 |
| shablon tavsif | 0 | **0** | 0 |

---

## 6. Tekshiruv

10 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 7. Keyingi qadam

Qolgan **47 qator**: **AQSh 9** (hammasi tasdiqlangan chegara), **Belgiya 4**, **Fransiya 4**, **Turkiya 3**, **Avstriya 3**, **Saudiya 2**, **Irlandiya 2**, **BAA 2**, **Meksika 2**, **Chili 2**, va 15 ta bir qatorli davlat.

1. **71-pass** — **Belgiya + Fransiya + Avstriya** = **11 qator**.
2. Keyin **Turkiya + Saudiya + BAA** = 6.
3. Keyin qolgan kichik klasterlar.
