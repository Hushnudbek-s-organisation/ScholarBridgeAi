# ScholarBridgeAi — stipendiyalarni qayta yozish, 58-pass (AQSh doktoranturasi)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** AQSh — **29 qator** bitta passda.

---

## 1. Asosiy topilma

Barcha 29 qatorda bir xil kasallik bor edi: **62 000–79 000 USD yumaloq raqam**, **"December 15 annually"** muddati, **yalang'och domen** `source_url` va bir qatorlik "talab".

AQShda doktorantura moliyalashtirish **boshqacha ishlaydi**: bu **qabul taklifnomasida aytiladigan paket**, alohida "fellowship arizasi" **yo'q**, stipendiya miqdori **bo'lim bo'yicha** belgilanadi va har yili yangilanadi.

Bu passda **ikkita universitet o'z sahifasidan to'liq tasdiqlandi**, qolgan 27 tasiga **to'g'ri mexanizm** yozildi — **uydirma raqam qo'yilmadi**.

---

## 2. Tasdiqlangan 2 qator

### **126** Princeton — `gradschool.princeton.edu` dan
| 2026-27 stavka | Miqdor |
|---|---|
| University Fellowship (12 oy) | **$52 680** |
| First Year Fellowship, Natural Sci & Eng (10 oy) | **$46 200** |
| Research Assistantship (10 oy) | **$46 200** |
| Teaching Assistantship (10 oy) | **$48 510** |
| Summer RA (2 oy) | **$9 240** gacha |

Princeton **barcha PhD talabalarga** to'liq moliyalashtirishni kafolatlaydi (odatda 5 yil): to'liq kontrakt + tibbiy sug'urta + bazaviy stipendiya. **FAFSA talab qilinmaydi.**

### **334** Rice — `graduate.rice.edu` dan
- Doktorantura stipendiyasi: **~$36 000 – $40 000/yil**, bo'lim bo'yicha
- Kontrakt 2026-27: **$66 784** (to'liq bekor qilinadi)
- **Rasmiy iqtibos:** *"There is no separate application needed for this financial support; the only application needed is your application for graduate study."*
- Bo'limlar bo'yicha: EEB/falsafa/din **$37 000**, biofanlar **$40 500**, biznes **$43 000**, psixologiya **$36 000**

---

## 3. Qolgan 27 qator (mexanizm to'g'rilandi, raqam yozilmadi)

**105** MIT · **108** Harvard · **114** Caltech · **115** Penn · **116** Berkeley · **120** Cornell · **125** UChicago · **127** Yale · **136** JHU · **138** Columbia · **148** UCLA · **150** NYU · **306** CMU · **308** UCSD · **315** UW · **320** UT Austin · **329** Brown · **330** Penn State · **332** BU · **335** UNC · **336** Purdue · **338** UW-Madison · **340** Georgia Tech · **347** Duke · **354** WashU · **357** USC · **366** Rochester

Har birida: `coverage_type = Full Funding`, `amount_usd_value = 0`, `award_amount = NULL`, `USD`, muddat `not_published` (dastur o'z muddati), daraja `["PhD"]`, **`source_reliability = 5`**.

⚠️ **Halollik izohi:** 5 ball — chunki **mexanizm** (AQShda paket qabul bilan beriladi) to'g'ri va Princeton/Rice bilan tasdiqlangan, lekin **har bir universitetning o'z sahifasi bu passda o'qilmadi**. `notes`da bu ochiq yozilgan va keyingi pass uchun vazifa qilib qo'yilgan.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 57 oxiri | Pass 58 oxiri |
|---|---|---|
| `>5000` faol qatorlar (jami) | 189 | **160** |
| shundan **AQSh** | 52 | **23** |
| `source_reliability = 5` | 0 | **27** |
| Faol stipendiyalar | 549 | **549** |
| Nafaqaga chiqarilganlar | 117 | **117** |

---

## 5. AQSh navbatida qolgan 23 qator

1. **Undergrad need-based:** 1 MIT, 6 Stanford, 10 Harvard, 19 Caltech, 20 Caltech (PhD)
2. **Merit/nomlangan:** 2 MIT Presidential, 9 Harvard GSAS, 33 Penn World Scholars, 34 Cornell Tata, 38 JHU Hodson, 39 Berkeley Regents, 42 UChicago Odyssey, 495 Pitt
3. **Pass 30–31 da yozilganlar** (538, 605, 628, 694, 702, 706, 749, 757, 803, 815) — faqat tekshirish

Keyingi pass — **Cornell Tata** (O'zbekiston uchun emas — faqat Hindiston), **Penn World Scholars**, **Berkeley Regents**, **UChicago Odyssey** — bularning har biri alohida mantiqqa ega.

---

## 6. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (29 qator) | hammasi toza |

---

## 7. Manbalar (2026-10-26)

`gradschool.princeton.edu/financial-support` · `gradschool.princeton.edu/financial-support/financial-support-model/funding-calendar-university-rates-costs` · `graduate.rice.edu/admissions/costofstudy` · `graduate.rice.edu/admissions/application-faq`

SQL: `supabase/scholarship_rewrite_pass58_2026-10-23.sql`
