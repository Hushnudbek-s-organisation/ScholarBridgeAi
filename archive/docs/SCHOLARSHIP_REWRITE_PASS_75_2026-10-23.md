# ScholarBridgeAi — stipendiyalarni qayta yozish, 75-pass (AQShning 27 doktorlik qatori)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `source_reliability = 5` bo'lgan 27 qator — **4 tasi** to'liq tekshirildi, **23 tasi** 5 da qoldi.

---

## 1. To'liq tekshirilgan 4 qator (`reliability = 10`)

| Qator | Manba | E'lon qilingan fakt | Endi |
|---|---|---|---|
| **105** MIT | `oge.mit.edu/graduate-admissions/costs-funding/` | **Alohida moliyaviy yordam arizasi yo'q**; homiy **dastur** darajasida: to'liq / qisman / o'z hisobidan; ariza to'lovi **USD 90** (Sloan **95–250**), waiver **qaytarilmaydi** | Bare domain → **haqiqiy sahifa** |
| **108** Harvard GSAS | `gsas.harvard.edu/financial-support/funding-and-aid` + `…/cost-attendance-2026-2027` | **Barcha PhD talabalarga 5 yillik kafolatlangan moliyalashtirish**; tuition zinapoyasi **59 048 → 15 352 → 3 906 USD**; HUSHP **972 + 2 477 USD/semestr** | Bare domain → **haqiqiy sahifa** |
| **114** Caltech | `gradoffice.caltech.edu/financialsupport` + `…/budget` | **Barcha PhD to'liq moliyalashtiriladi**; stipendiya **USD 50 000** (2026-09-01 dan); tuition **68 574** + fees **2 448**; **1-dekabr – 15-yanvar** ariza oynasi | Bare domain → sahifa; `award_amount = 50 000` |
| **338** Wisconsin | `grad.wisc.edu/funding/` | **4 yo'l**: assistantship (TA/PA/RA), fellowship, traineeship, kredit; **faqat 33 %+ assistantship tuition remission beradi**; **xalqaro talabalar University Fellowship va ba'zi departmental fellowshiplarga MOS** | Bare domain → sahifa |

## 2. `reliability = 5` da qolgan 23 qator

**108 va 114** dan tashqari qolganlar: 115 Penn · 116 Berkeley · 120 Cornell · 125 Chicago · 127 Yale · 136 JHU · 138 Columbia · 148 UCLA · 150 NYU · 306 CMU · 308 UCSD · 315 UW · 320 UT Austin · 329 Brown · 330 Penn State · 332 BU · 335 UNC · 336 Purdue · 340 Georgia Tech · 347 Duke · 354 WUSTL · 357 USC · 366 Rochester.

**Bu passda sinab ko'rilgan va muvaffaqiyatsiz bo'lgan manzillar:**

| Manzil | Natija |
|---|---|
| `gsas.yale.edu/costs-funding` | **404** |
| `purdue.edu/gradschool/funding/` | **404** (yangi yo'l `/academics/ogsps/` ga ko'chgan) |
| `gradschool.columbia.edu/prospective-students/financial-aid` | **yuklanmadi** |
| `grad.ucla.edu/funding/` | sahifa ochildi, lekin bu **UCLA'ning o'z moliyalashtirishi emas** — tashqi stipendiyalar bazasi (**GRAPES**, 625 ta mukofot). Shuning uchun **manba sifatida ishlatilmadi** |

## 3. Muhim: **20 va 114 — bir xil Kaltech paketi**

`id = 20` ("Caltech Graduate Fellowships (PhD)") va `id = 114` ("California Institute of Technology doctoral funding package") **bir xil** Kaltech siyosatini yozadi. 114 ning izohiga bu **ochiq yozildi** va keyingi **deduplikatsiya passига** qoldirildi — bu passda jimgina birlashtirilmadi.

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 74 | Pass 75 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 27 | **23** | **−4** |
| **bare-domain** | 83 | **79** | **−4** |
| `source_reliability = 4` | 137 | **137** | 0 |
| `amount_usd_value > 5000` | 11 | **11** | 0 |

## 5. Tekshiruv

4 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.
`test:duplicates`, `test:provenance`, `test:deadlines` — bu sandboxda `DATABASE_URL` yo'qligi uchun **ishga tushmaydi** (ma'lum cheklov).

## 6. Keyingi qadam

1. **76-pass** — qolgan **23** doktorlik qatori: har biriga **bitta** sahifa urinishi (Yale, Columbia, UCLA, NYU, CMU, UCSD, UW, UT Austin, Brown, Penn State, BU, UNC, Purdue, Georgia Tech, Duke, WUSTL, USC, Rochester, Penn, Berkeley, Cornell, Chicago, JHU).
2. Keyin **79 bare-domain** (asosan universitet profillari va kichik stipendiya qatorlari).
3. Keyin **137** `reliability = 4` qator.
4. Keyin **20 ↔ 114** deduplikatsiyasi va boshqa ochiq bandlar (Cambridge Trust, Radboud, Eric Bleumink, UTP GAS, UNAM dublikati).
