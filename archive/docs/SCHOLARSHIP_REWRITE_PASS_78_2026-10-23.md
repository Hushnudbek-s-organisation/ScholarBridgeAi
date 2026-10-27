# ScholarBridgeAi — stipendiyalarni qayta yozish, 78-pass (AQSh doktorlik qatorlari, 4-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan 16 qatordan **2 tasi** to'liq tekshirildi, **1 qatorda** valyuta qoidasi tuzatildi.

---

## 1. Tekshirilgan 2 qator

### **127** Yale — `reliability = 10`

| E'lon qilingan fakt | Endi |
|---|---|
| **Har bir PhD talaba** to'liq tuition + **12 oylik stipendiya** + **tibbiy sug'urta**, **kamida 5 yil** | `coverage = Full Funding` |
| O'rtacha doktorant butun o'qish davomida **USD 500 000+** oladi | description |
| **2026–27 minimum stipendiya:** gumanitar/ijtimoiy/fizika — **USD 52 046**; biologik/biomedikal — **USD 53 629** | **`award_amount = 52 046`, `amount_usd_value = 52 046`** |
| 1-kursda stipendiya **25 yarim oylik** to'lovda + **USD 1 500** bir martalik ko'chish mukofoti | description |
| **Magistratura odatda moliyalashtirilmaydi** | description + requirements |
| Dean's Emergency Fund **USD 2 000** gacha; Conference Travel Fellowship **USD 800** gacha | description |

### **138** Columbia GSAS — `reliability = 9`

| E'lon qilingan fakt | Endi |
|---|---|
| GSAS Financial Aid Office: Kolumbiya va **tashqi** manbalardan moliyalashtirish, ehtiyojni hisoblash, **kiruvchi va davom etuvchi** talabalarga mablag' taqsimlash | description |
| **Doktorantlar — maosh oladi** (sahifada "salaried PhD and DMA students" uchun salary advance tartibi bor) | description |
| Fellowship'lar **akademik merit** bo'yicha; **ichki** (GSAS) va **tashqi** | description |
| **MA talabalari uchun stipendiya imkoniyatlari cheklangan** | requirements |
| 2026–27 **federal kredit qoidalari o'zgaradi**; xalqaro talabalar uchun **alohida soliq sahifasi** | description |

**Nega Columbia 9?** Sahifa — **moliyaviy yordam hubi**: summa, kafolat yoki qamrov e'lon qilinmagan.

## 2. Valyuta qoidasi tuzatildi — **114** Kaltech

Ilgari 114 da `amount_usd_value = 0` va `award_amount = 50000` edi, 20-qatorda esa `amount_usd_value = 50000`. Bu **bir xil paket uchun ikki xil yozuv** edi.

**Qoida:** AQSh mukofoti **USD**da to'lansa — **`amount_usd_value` = e'lon qilingan raqam**, `award_amount` ham o'sha. `amount_usd_value = 0` faqat **mahalliy valyuta** (AUD, CAD, CHF, KRW…) uchun ishlatiladi.

Shu sababli 114 → `amount_usd_value = 50000`. Natijada `>5000` hisoblagichi **11 → 13** ga ko'tarildi — bu **yomonlashuv emas**: ikki qator endi **e'lon qilingan USD stavkasini** ko'rsatadi (Yale 52 046, Caltech 50 000), ya'ni ro'yxatdagi har bir qator **haqiqiy raqam**.

## 3. Muvaffaqiyatsiz urinishlar (izohlar va shu hujjatda qayd etilgan)

| Manzil | Natija |
|---|---|
| `gsas.yale.edu/admissions/financial-aid` | **404** |
| `gsas.yale.edu/financial-support` | **Access Denied** |
| `gsas.columbia.edu/content/funding` | **404** |
| `grad.gatech.edu/funding` | **404** |
| `bu.edu/grad/financial-aid/` | **404** |
| `homewoodgrad.jhu.edu/graduate-funding/` | **sahifa mavjud emas** |
| `rochester.edu/college/gradstudies/financial-support/` | **404** |
| `grad.ucla.edu/financial-support/` | **404** |
| `graduateschool.usc.edu/students/funding/` | **blog postga yo'naltirdi** |
| `provost.upenn.edu/phd-funding` | **404** |
| `cmu.edu/graduate/admission-aid/` | **404** |

**Yale uchun to'g'ri manzil qidiruv orqali topildi:** `gsas.yale.edu/resources/graduate-financial-aid`. Ya'ni taxmin qilish emas, **qidiruv → havola → o'qish** ketma-ketligi ishlaydi.

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 77 | Pass 78 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 16 | **14** | **−2** |
| **bare-domain** | 72 | **70** | **−2** |
| `amount_usd_value > 5000` | 11 | **13** | **+2** (izohga qarang) |
| `source_reliability = 4` | 137 | **137** | 0 |

**`>5000` nima uchun o'sdi:** Yale (52 046) va Kaltech (50 000) endi **haqiqiy USD stavka** sifatida yozildi. Bu ro'yxatda **uydirma emas, e'lon qilingan raqam** turadi.

## 5. Tekshiruv

3 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 6. Keyingi qadam

1. **79-pass** — qolgan **14** qator: Penn, JHU, UCLA, NYU, CMU, UCSD, UT Austin, Brown, BU, Purdue, Georgia Tech, WUSTL, USC, Rochester. **Qidiruv orqali havola topish** usuli qo'llanadi (Yale'da ishladi).
2. Keyin **70 bare-domain**.
3. Keyin **20 ↔ 114** deduplikatsiyasi (ikkisi ham Kaltech, ikkisi ham 50 000) va **137** `reliability = 4` qator.
