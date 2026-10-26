# ScholarBridgeAi — stipendiyalarni qayta yozish, 73-pass (Irlandiya, Meksika, Chili)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Irlandiya 2 + Meksika 2 + Chili 2 = **6 qator**.
**Natija:** **uchala davlatda `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. Halol tan olish: bu passda ham sahifa o'qilmadi

| Manzil | Natija |
|---|---|
| `tcd.ie/study/international/scholarships/Postgraduate/` | **HTTP 403 Forbidden** |
| `universityofgalway.ie/…/feesfunding/scholarships/` | **404** |
| `tec.mx/en/scholarships` | **404** |
| UNAM va UC Chile | o'qilmadi (budjet) |

Shu sababli **6 qatorning hammasi `source_reliability = 4`**, izohlarida aniq xato yozilgan.

## 2. Qayta yozilgan 6 qator

| Davlat | Qator | Valyuta |
|---|---|---|
| **Irlandiya** | **345** Trinity Global Excellence · **434** Galway Global Achievement | **EUR** |
| **Meksika** | **402** Monterrey "Moss" · **343** UNAM International Postgraduate | **MXN** |
| **Chili** | **467** UC International Excellence · **879** UC Exchange Tuition | **CLP** |

Har birida: `amount = 0`, `award_amount = NULL`, `coverage = Unspecified`, `deadline = not_published`.

## 3. Muhim kuzatuvlar

**1) 879-qator nomining o'zida cheklov bor.**
"UC **Tuition Scholarship for Exchange Students** (CINDA & Latin American Catholic Universities)" — bu **almashinuv** talabalari uchun, O'zbekistondan daraja olmoqchi bo'lgan talaba foydalana olmaydi. Bu izohda yozildi (nomdan kelib chiqqan holda, qayta o'qilmagan).

**2) 343 va 707 — ikki xil narsa.**
**343** (UNAM International Postgraduate) va **707** (UNAM posgrado stipendiyasi, `becas.unam.mx` orqali tekshirilgan) — **turli hujjatlar**. Izohda ogohlantirish qo'yildi: **707 ning raqamlarini 343 ga ko'chirib bo'lmaydi**.

**3) 402-qator nomi shubhali.**
"Monterrey International **Scholarship Moss**" — "Moss" so'zi mantiqsiz; importer xatosi bo'lishi mumkin, lekin manba o'qilmagani uchun **nom o'zgartirilmadi**.

## 4. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 6/6 | USD → **EUR / MXN / CLP** |
| 2 | **Uydirma summa** | 345 (28 000), 434 (26 000), 402 (18 000), 343 (15 000), 467, 879 (8 000) | **hammasi bo'sh** |
| 3 | **Shablon muddat** | 4 qatorda "… annually" | `not_published` |
| 4 | **`reliability = 10/9/8` bo'lgan uydirma** | 6 qator | **4** ga tushirildi |
| 5 | **Kanonik bo'lmagan daraja** | 345, 434, 402, 343 (`"Master"`), 879 (`"Bachelor"`) | → `"Master's"`, `"Bachelor's"`, `"PhD"` |
| 6 | **Chalkashtirish xavfi** | 343 | 707 bilan aralashtirmaslik haqida **ochiq ogohlantirish** |

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 72 | Pass 73 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `amount_usd_value > 5000` | 30 | **24** | **−6** |
| shundan **Irlandiya/Meksika/Chili** | 6 | **0** | **−6** ✅ |
| `source_reliability = 4` | 119 | **125** | +6 |
| bare-domain | 83 | **83** | 0 |

## 6. Tekshiruv

6 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 7. Qolgan 24 qator

**AQSh 9** — hammasi tasdiqlangan chegara (pass 62), tegmadik.

**AQShdan tashqari 15 qator** (bir qatorli davlatlar):

| Davlat | Qator | USD |
|---|---|---|
| Qatar | 587 | 29 670 |
| Tayvan | 342 | 20 000 |
| Sloveniya | 404 | 18 000 |
| Braziliya | 401 | 16 000 |
| Saudiya | 908 | 14 400 (KSU tasdiqlagan) |
| Malayziya | 339 | 14 000 |
| Indoneziya | 398 | 14 000 |
| Argentina | 400 | 14 000 |
| Kolumbiya | 403 | 13 000 |
| Hindiston | 397 | 12 000 |
| Chexiya | 876 | 8 256 |
| O'zbekiston | 871 | 7 344 |
| Tailand | 502 | 6 500 |
| Janubiy Afrika | 503 | 6 500 |
| Rossiya | 466 | 6 000 |

**74-pass** — shu 15 qatorni bitta to'lqinda ko'rib chiqish (har biriga kamida bitta sahifa urinishi).
