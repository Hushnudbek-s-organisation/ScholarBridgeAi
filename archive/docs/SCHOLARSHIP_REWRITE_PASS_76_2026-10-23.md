# ScholarBridgeAi — stipendiyalarni qayta yozish, 76-pass (AQSh doktorlik qatorlari, 2-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan 23 qatordan **4 tasi** to'liq tekshirildi.

---

## 1. Tekshirilgan 4 qator

| Qator | Manba | E'lon qilingan fakt | `reliability` |
|---|---|---|---|
| **120** Cornell | `gradschool.cornell.edu/financial-support/` | **PhD talabalarning 99 % to'liq moliyalashtiriladi**; paket: **tuition + fees + tibbiy sug'urta + stipendiya**; fellowship va assistantship stavkalari **teng va barcha yo'nalishlarda bir xil**; research magistratura va professional dasturlarga **juda kam** yordam; stipendiya **federal va NY shtat solig'iga tortiladi** | **10** |
| **347** Duke | `gradschool.duke.edu/financial-support/` | PhD paketi: **stipendiya + tuition + fees + sug'urta mukofotlari**; **5 yillik kafolat**; 2022-23 dan **12 oylik stipendiya**; magistraturaga **faqat federal Direct Loan**; 2026-07-01 dan federal kredit qoidalari o'zgaradi | **10** |
| **116** Berkeley | `grad.berkeley.edu/financial/` | Yordam **bo'laklardan yig'iladi**: akademik ish (GSR/GSI/Reader/Tutor), katta fellowship (tuition bilan), maqsadli grantlar, favqulodda grantlar; **qarorni kafedra qabul qiladi** (GSAO) | **9** |
| **315** Washington | `grad.uw.edu/…/how-do-i-pay-for-graduate-school/` | **Assistantship** = haq to'lanadigan ish + **tuition reimbursement**; **fellowship** = ish talab qilmaydigan musobaqa mukofoti; kredit/work-study/ish; **erta boshlash** tavsiyasi | **9** |

**Nega 116 va 315 da 9?** Sahifalar o'qildi, lekin **doktorlik kafolati ham, summa ham e'lon qilinmagan** — faqat yo'nalishlar tavsiflangan. Shuning uchun 10 emas, 9.

## 2. Muvaffaqiyatsiz urinishlar (izohlarda qayd etilgan)

| Manzil | Natija |
|---|---|
| `www.cmu.edu/graduate/financial-support/index.html` | **404** (File Not Found) |
| `grad.ucsd.edu/funding/` | **404** |

## 3. `reliability = 5` da qolgan **19** qator

115 Penn · 125 Chicago · 127 Yale · 136 JHU · 138 Columbia · 148 UCLA · 150 NYU · 306 CMU · 308 UCSD · 320 UT Austin · 329 Brown · 330 Penn State · 332 BU · 335 UNC · 336 Purdue · 340 Georgia Tech · 354 WUSTL · 357 USC · 366 Rochester

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 75 | Pass 76 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 23 | **19** | **−4** |
| **bare-domain** | 79 | **75** | **−4** |
| `source_reliability = 9` | 159 | **163** | +4 |
| `>5000` | 11 | **11** | 0 |

## 5. Tekshiruv

4 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 6. Uch muhim topilma

**1) Cornell — eng aniq raqamli da'vo.**
*"Ninety-nine percent of Cornell's Ph.D. students are fully funded"* — bu qator uchun 5 dan 10 ga ko'tarilishning asosiy sababi: universitet **o'z** foizini e'lon qiladi.

**2) Duke'da magistratura — butunlay boshqa olam.**
PhD uchun 5 yillik kafolat, magistratura uchun esa **faqat federal kredit**. Bitta qator ostida ikkalasini yozish xato bo'lardi — shuning uchun qator **PhD** ga yo'naltirildi, magistratura cheklovi izohda.

**3) Berkeley — markazlashtirilmagan.**
Universitet darajasida "kafolat" yo'q: *"contact your department or program's Graduate Student Affairs Officer to make a plan"*. Bu — O'zbekiston nomzodi uchun eng muhim amaliy maslahat.

## 7. Keyingi qadam

1. **77-pass** — qolgan **19** qator (Penn, Chicago, Yale, JHU, Columbia, UCLA, NYU, CMU, UCSD, UT Austin, Brown, Penn State, BU, UNC, Purdue, Georgia Tech, WUSTL, USC, Rochester).
2. Keyin **75 bare-domain** (asosan universitet profillari).
3. Keyin **20 ↔ 114** deduplikatsiyasi va boshqa ochiq bandlar.
