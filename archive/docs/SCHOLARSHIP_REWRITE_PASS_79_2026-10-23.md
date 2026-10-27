# ScholarBridgeAi — stipendiyalarni qayta yozish, 79-pass (AQSh doktorlik qatorlari, 5-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan 14 qatordan **4 tasi** to'liq tekshirildi.

---

## 1. Tekshirilgan 4 qator

### **136** Johns Hopkins — `reliability = 10`

Manba: `provost.jhu.edu/…/PhD-Funding-and-Wage-Types_030425.pdf` (provost idorasi hujjati)

| E'lon qilingan fakt | Endi |
|---|---|
| **2024-yil aprelda ratifikatsiya qilingan jamoaviy bitim (CBA)** PhD talabalarga **yillik kafolatlangan moliyalashtirish** beradi | description |
| **24/25 — USD 47 000**, **25/26 — 50 000**, **26/27 — 52 000** (yarim oylik **2 167,67**) | **`award_amount = 52 000`** |
| To'lov **ish haqi yoki fellowship** sifatida tasniflanadi; **NIH NRSA T-32/F31** — fellowship | description |
| **Xalqaro talabalar (F-1/J-1):** haftasiga **20 soat** on-campus; to'liq stipendiya **shu 20 soatga teng** → qo'shimcha ish **CPT/AT** ruxsatini talab qiladi, **kamida 2 hafta oldin** iHopkins orqali | requirements |

### **340** Georgia Tech — `reliability = 10`

Manba: `policylibrary.gatech.edu/academic-affairs/stipends-graduate-assistantships` (iyun 2026 da yangilangan)

| E'lon qilingan fakt | Endi |
|---|---|
| **2026–27 institut minimumi: doktorant GRA/GTA — USD 2 291/oy** (≥1/3 stavka); magistratura — **1 184/oy** | **`award_amount = 2 291`, `award_period = 'month'`** |
| Har bir bo'linma **o'z stavkasini** shu poydevordan yuqori belgilaydi; **8 omil** ichida **xalqaro talaba uchun I-20 dagi yashash qiymati** | description |
| Provost har yili **1-yanvargacha** yangi minimumni belgilaydi; bo'linmalar stavkalarini **ochiq e'lon qilishi** shart | description |

### **336** Purdue — `reliability = 10`

Manba: `purdue.edu/academics/ogsps/admissions/faq/`

| E'lon qilingan fakt | Endi |
|---|---|
| Purdue aspirantlarining **~70 %** universitet orqali moliyalashtiriladi; asosan **GTA/GRA** va fellowship | description |
| **Assistantship** ≈ haftasiga **20 soat** → **ko'p to'lovlardan ozod** + oylik stipendiya; **yarim stavkadan** boshlab tibbiy sug'urta; 12 oylik shartnomada **haq to'lanadigan ta'til** | description |
| **Fellowship** tuition'ni **qoplashi ham, qoplamasligi ham** mumkin | requirements |

### **115** Penn — `reliability = 8`

Manba: `penntoday.upenn.edu/news/penn-announces-largest-one-time-increase-minimum-phd-stipend`

| E'lon qilingan fakt | Izoh |
|---|---|
| Universitet **minimum PhD stipendiyasini USD 38 000** ga ko'targan — **2023–24 dan** | **eski raqam** — hozirgi stavka e'lon qilinmagan, shuning uchun **summa saqlanmadi** |
| **9 maktab** o'z stipendiyasini shu minimumdan **yuqori** belgilaydi | mexanizm tasdiqlangan |
| San'at va fanlar maktabi **Benjamin Franklin Fellowship** — 5 yil, tuition + fees + sug'urta + stipendiya, **fuqarolikka bog'liq emas** | description |

**Nega 8?** Bu **yangilik e'loni**: mexanizm to'g'ri, lekin **2023–24 raqami** hozirgi holatni ko'rsatmaydi — shuning uchun raqam **saqlanmadi**.

## 2. Uslubiy natija

**Qidiruv → havola → o'qish** usuli bu passda **4/4** ishladi. Oldingi passda 11 ta taxminiy manzil 404 bergan edi. Endi qolgan 10 qator uchun ham shu uslub qo'llanadi.

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 78 | Pass 79 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 14 | **10** | **−4** |
| **bare-domain** | 70 | **66** | **−4** |
| `amount_usd_value > 5000` | 13 | **14** | **+1** (JHU 52 000 — haqiqiy stavka) |
| `source_reliability = 4` | 137 | **137** | 0 |

## 4. Tekshiruv

4 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 5. Keyingi qadam

1. **80-pass** — qolgan **10** qator: UCLA, NYU, CMU, UCSD, UT Austin, Brown, BU, WUSTL, USC, Rochester.
2. Keyin **66 bare-domain** (asosan universitet profillari).
3. Keyin **20 ↔ 114** deduplikatsiyasi va **137** `reliability = 4` qator.
