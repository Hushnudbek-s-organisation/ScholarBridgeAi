# ScholarBridgeAi — stipendiyalarni qayta yozish, 81-pass (AQSh doktorlik qatorlari, 7-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan 7 qatordan **3 tasi** to'liq tekshirildi.

---

## 1. Tekshirilgan 3 qator

### **332** Boston University — `reliability = 10`

Manbalar: `bu.edu/grad/admission-funding/phd-funding/` + `bu.edu/cas/admissions/phd-mfa/fellowship-aid/frequently-asked-questions/stipends/`

| E'lon qilingan fakt | Endi |
|---|---|
| **Charles River Campus:** har bir PhD talabaga **5 yil stipendiya + 100 % tuition + sug'urta krediti** | `Full Funding` |
| 2024–25 minimalari: **USD 27 318** (8 oy) → **40 977** (12 oy) | description |
| **2024 CBA (BUGWU):** 12 oylik stavka **45 000** (2024-11-15) → **46 350** (2025-09-01) → **47 740** (2026-09-01) | **`award_amount = 47 740`** |
| **Service vs non-service stipend:** xizmat uchun — soliq ushlanadi; mukofot — ushlanmaydi | description |
| GMS va SPH (tibbiyot kampusi) — alohida to'liq model | description |

### **150** NYU Arts & Science — `reliability = 10`

Manba: `gsas.nyu.edu/admissions/financial-aid/graduate-school-fellowships-and-assistantships.html`

| E'lon qilingan fakt | Endi |
|---|---|
| **MacCracken Program** — ko'pchilik yangi doktorantlar uchun **4 yoki 5 yillik to'liq paket** | `Full Funding` |
| **To'liq tuition** + registration/services fees + **sug'urta mukofotlari to'liq** + **9 oylik stipendiya** + bir martalik **USD 1 000** Dean's grant | description |
| Tashqi grant olganlar ham **to'liq paketga yetkaziladi** (MacCracken bilan to'ldiriladi) | requirements |
| **O'qitish haqi paketdan tashqari** (qo'shimcha) | description |
| **7 ta affiliate dastur MacCracken olmaydi:** Basic Medical Sciences, Environmental Health Sciences, Cinema Studies, Performance Studies, Data Science, Institute of Fine Arts, ISAW | requirements |

### **148** UCLA — `reliability = 9`

Manba: `grad.ucla.edu/funding/faqs/`

| E'lon qilingan fakt | Endi |
|---|---|
| **Need-based** yordam (kredit, grant, work-study) — **faqat AQSh fuqarosi/PR** | requirements |
| **Merit** yordam (fellowship, traineeship, TA, GSR) — **xalqaro talabalarga ham OCHIQ** | description |
| Pul **kafedralarga** taqsimlanadi; tanlovni **fakultet qo'mitasi** qiladi | `coverage = Unspecified` |
| **Muddat: 15-dekabr** (kiruvchilar uchun), **2-mart** (kredit/work-study) | **`deadline_date = 2026-12-15`** |
| Har bir doktorantga **USD 1 000 gacha** konferensiya/tadqiqot xarajati (7-kursgacha) | description |
| **Ikki katta mukofotni birga olib bo'lmaydi**; tashqi grant UCLA yordamini cheklaydi | description |

---

## 2. Muhim topilma

**UCLA'da xalqaro talaba uchun "need-based" kanal butunlay yopiq.**
Sahifa ochiq yozadi: *"Students must be U.S. citizens or permanent residents"* — grant, kredit va work-study uchun. Xalqaro talaba **faqat merit** yo'lidan foydalanadi, va u **kafedra** qo'lida. Bu — O'zbekiston nomzodi uchun eng muhim amaliy xulosa.

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 80 | Pass 81 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 7 | **4** | **−3** |
| **bare-domain** | 63 | **60** | **−3** |
| `amount_usd_value > 5000` | 16 | **17** | **+1** (BU 47 740 — haqiqiy stavka) |
| `source_reliability = 4` | 137 | **137** | 0 |

`reliability = 5` da qolgan **4** qator: **308** UCSD · **354** WUSTL · **357** USC · **366** Rochester.

## 4. Tekshiruv

3 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 5. Keyingi qadam

1. **82-pass** — qolgan **4** qator (UCSD, WUSTL, USC, Rochester) va shu bilan `reliability = 5` guruhi **yopiladi**.
2. Keyin **60 bare-domain**.
3. Keyin **20 ↔ 114** deduplikatsiyasi va **137** `reliability = 4` qator.
