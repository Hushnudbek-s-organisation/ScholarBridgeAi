# ScholarBridgeAi — stipendiyalarni qayta yozish, 69-pass (Gonkong)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Gonkong — 8 qator qayta yozildi.
**Natija:** **Gonkongda `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. Tekshirilgan milliy doira — HKPFS (Hong Kong PhD Fellowship Scheme)

Manba: `cerg1.ugc.edu.hk/hkpfs/index.html` va `…/apply.html` — **Research Grants Council**ning o'z sahifalari.

| Element | E'lon qilingan |
|---|---|
| Tashkil etilgan | **2009**, RGC tomonidan |
| Kim uchun | **8 universitetda yangi to'liq kunlik PhD** — **fuqarolik, ish tajribasi, etnik kelib chiqishi cheklanmagan** |
| **2026/27 stipendiya** | **HK$ 344 400/yil** (≈ **US$ 44 150**) |
| **Sayohat allowance** | **HK$ 14 400/yil** (≈ US$ 1 840) |
| Muddat | **3 yilgacha**; ko'proq kerak bo'lsa universitet qo'shimcha berishi mumkin |
| 2027/28 uchun | **400 fellowship** |
| Ariza | **2 bosqich**: HKPFSES da **initial application** → reference number → universitetga ariza |
| Oyna | **1-sentabr 2026, 12:00** (HK vaqti) → **1-dekabr 2026, 12:00** |
| Universitet muddati | **1-dekabr 2026, 23:59** (8 tasida ham bir xil) |
| Nechta dastur | **ko'pi bilan 2** dastur/1–2 universitetda |

---

## 2. Qayta yozilgan 8 qator

### Doktorlik (`reliability = 10`) — 5 ta

**121** HKU Presidential · **140** CUHK Vice-Chancellor · **305** HKUST RedBird · **313** CityU Outstanding Doctoral · **394** PolyU PRS

Har biriga:
- `award_amount = 344400`, **`HKD`**, `award_period = 'year'`, `coverage = Living Stipend`
- `deadline = 1-dekabr 2026, 12:00 (initial) / 23:59 (universitet)`, `deadline_date = 2026-12-01`
- Har birining **o'z HKPFS sahifasi** `website_url`ga qo'yildi (RGC e'lon qilgan havolalar)
- Izohda: **universitetning o'z top-up mukofoti o'qilmagan** — faqat HKPFS doirasi tasdiqlangan

### Bakalavriat (`reliability = 4`) — 3 ta

**51** HKUST · **29** HKU · **36** CUHK — `amount = 0`, **HKD**, `coverage = Unspecified`, `deadline = not_published`.
HKU sahifasi filtr-interfeys bo'lib chiqdi (43 ta stipendiya ro'yxati yuklanmadi) — izohda qayd etildi.

---

## 3. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 8/8 | USD → **HKD** |
| 2 | **Uydirma summa** | 121 (52 000), 140 (48 000), 305 (46 000), 313 (45 000), 394 (42 000), 51 (30 000), 29 (25 000), 36 (20 000) | Doktorlikda **HK$ 344 400** (e'lon qilingan), bakalavriatda **bo'sh** |
| 3 | **Mexanizm ko'rsatilmagan** | 5 doktorlik qatori | **HKPFS ikki bosqichli ariza** yozildi: initial → reference number → universitet |
| 4 | **Shablon muddat** | 5 qatorda "December 1 annually", 3 qatorda turli sana | → **1-dekabr 2026** (RGC e'lon qilgan), bakalavriatda `not_published` |
| 5 | **Yosh/fuqarolik noto'g'ri tushunchasi** | 5 doktorlik | HKPFS **fuqarolikka cheklov qo'ymaydi** — bu yozildi |
| 6 | **Kanonik bo'lmagan daraja** | 51, 29, 36 (`"Bachelor"`), 5 tasi `"PhD"` bilan | → `"Bachelor's"`, `"PhD"` |
| 7 | **`reliability = 10` bo'lgan uydirma** | 5 qator | Endi **10** — lekin **haqiqiy HKPFS raqami** bilan |

---

## 4. Uch muhim topilma

**1) Gonkongda doktorlikning kaliti — HKPFS reference number.**
Universitetga ariza yuborishdan **oldin** RGC tizimida initial application qilish shart. Bu qadamni o'tkazib yuborgan nomzod fellowship uchun **umuman ko'rilmaydi**.

**2) Fuqarolik cheklovi yo'q.**
RGC ochiq yozadi: *"irrespective of their country of origin, prior work experience and ethnic background"*. Ya'ni O'zbekiston nomzodi to'liq huquqli.

**3) Ikki dasturga ariza berish mumkin.**
Bitta yoki ikkita universitetda **ko'pi bilan 2 ta** dastur tanlanadi — bu strategik afzallik, lekin ko'pchilik bilmaydi.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 68 | Pass 69 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 65 | **57** | **−8** |
| shundan **Gonkong** | 8 | **0** | **−8** ✅ |
| `source_reliability = 4` | 93 | **96** | +3 |
| bare-domain | 83 | **83** | 0 |
| shablon tavsif | 0 | **0** | 0 |

---

## 6. Tekshiruv

8 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 7. Keyingi qadam

Qolgan **57 qator, 27 davlat**: **AQSh 9** (hammasi tasdiqlangan chegara), **Finlandiya 4**, **Belgiya 4**, **Fransiya 4**, **Daniya 3**, **Norvegiya 3**, **Turkiya 3**, **Avstriya 3**, **Saudiya 2**, **Irlandiya 2**, **BAA 2**, **Meksika 2**, **Chili 2**, va 15 ta bir qatorli davlat.

1. **70-pass** — **Nordik klasteri**: Daniya 3 + Norvegiya 3 + Finlandiya 4 = **10 qator** (doktorlik maosh-asosida).
2. Keyin **Belgiya + Fransiya + Avstriya** = 11 qator.
3. Keyin qolgan kichik klasterlar.
