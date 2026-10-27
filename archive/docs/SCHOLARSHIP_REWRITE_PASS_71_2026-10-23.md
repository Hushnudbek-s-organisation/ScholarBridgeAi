# ScholarBridgeAi — stipendiyalarni qayta yozish, 71-pass (Belgiya, Fransiya, Avstriya)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Belgiya 4 + Fransiya 4 + Avstriya 3 = **11 qator**.
**Natija:** **uchala davlatda `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. Halol tan olish: bu passda **hech bir** sahifa o'qilmadi

Olti xil manzil sinab ko'rildi — **hammasi muvaffaqiyatsiz**:

| Manzil | Natija |
|---|---|
| `psl.eu/en/education/psl-phd-tracks` | **HTTP 503** |
| `ip-paris.fr/en/education/phd-tracks` | **404** |
| `ugent.be/…/bof/topup-grants.htm` | **404** |
| `tuwien.at/…/doctoral-programmes/phd-programmes` | **404** |
| `kuleuven.be/english/study/scholarships/mastermind` | sahifa yo'q |
| `dok29.univie.ac.at` | **umuman yuklanmadi** |

Shu sababli bu klasterda **bitta ham qator "tekshirilgan" deb belgilanmadi**: 11 qatorning hammasi `source_reliability = 4` va izohlarida qaysi manzil qanday xato bergani **nomma-nom** yozilgan.

## 2. Qayta yozilgan 11 qator (`reliability = 4`)

| Davlat | Qatorlar |
|---|---|
| **Avstriya** | **378** Vienna Dok29 · **431** TU Wien · **432** Innsbruck |
| **Belgiya** | **410** Ghent · **144** KU Leuven Master Mind · **412** VUB · **479** UCLouvain |
| **Fransiya** | **151** IP Paris · **344** Sorbonne · **128** PSL PhD · **52** PSL master |

Har birida:
- `amount_usd_value = 0`, `award_amount = NULL`, **`award_currency = 'EUR'`**
- `coverage_type = 'Unspecified'`, `deadline_type = 'not_published'`
- `notes` ichida: uydirma USD summasi, shablon muddat, **URL ning aniq xatosi**

**Izohlarda ehtiyotkor tafakkur:** doktorlik moliyalashtirish bu mintaqada **ko'pincha mehnat shartnomasi** (Fransiyada *contrat doctoral*), magistratura mukofoti esa odatda **qismiy tuition waiver** yoki oylik nafaqa — lekin bu **aynan shu mukofotga tegishli ekani tasdiqlanmagan** va shunday yozilgan.

## 3. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 11/11 | USD → **EUR** |
| 2 | **Uydirma summa** | 128, 151, 344 (26 000), 378, 431 (24 000), 52 (20 000), 432 (22 000), 410 (18 000), 144 (16 000), 412 (14 000), 479 (7 500) | **hammasi bo'sh** |
| 3 | **Shablon muddat** | 10 qatorda "… annually", 1 tasida "2027-03-31" | `not_published` |
| 4 | **Noto'g'ri manzil** | 144 | KU Leuven qatoridagi URL **fakultet sahifasi**, Flemish Master Mind sxemasiga tegishli emas |
| 5 | **`reliability = 10/9` bo'lgan uydirma** | 11 qator | **4** ga tushirildi |
| 6 | **Kanonik bo'lmagan daraja** | 144, 412, 52 (`"Master"`), 410 (`"Master"`), 479 | → `"Master's"`, `"Bachelor's"`, `"PhD"` |

## 4. Muhim topilma

**Bu klasterda "tekshirilgan" degan yorliq berish — yolg'on bo'lardi.**
11 qatorning avvalgi holati: `source_reliability = 10` va **hech bir manba ko'rsatilmagan** raqamlar. Endi: **manba yo'qligi ochiq yozilgan**. Bu — sifat jihatidan pasayish emas, **yolg'onning olib tashlanishi**.

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 70 | Pass 71 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `amount_usd_value > 5000` | 47 | **36** | **−11** |
| shundan **Belgiya/Fransiya/Avstriya** | 11 | **0** | **−11** ✅ |
| `source_reliability = 4` | 105 | **116** | +11 |
| bare-domain | 83 | **83** | 0 |
| shablon tavsif | 0 | **0** | 0 |

## 6. Tekshiruv

11 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 7. Keyingi qadam

Qolgan **36 qator**:
- **AQSh 9** — hammasi **tasdiqlangan chegara** (pass 62–64), tegmadik.
- **Turkiya 3**, **Saudiya 2**, **BAA 2**, **Irlandiya 2**, **Meksika 2**, **Chili 2** = **13**.
- **15 ta bir qatorli davlat** = 15.

1. **72-pass** — **Turkiya + Saudiya + BAA** = **6 qator** (Türkiye Bursları milliy sxemasi tekshiriladi).
2. Keyin Irlandiya, Meksika, Chili va qolgan 15 ta.
