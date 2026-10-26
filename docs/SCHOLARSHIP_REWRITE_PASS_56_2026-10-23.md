# ScholarBridgeAi — stipendiyalarni qayta yozish, 56-pass (Britaniya navbati **yopildi**)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — **9 qator** halol holatga keltirildi.

> ## 🎯 Natija: Buyuk Britaniyada tekshirilmagan summa qolmadi
> `is_active AND country = 'United Kingdom' AND amount_usd_value > 5000` → **9 → 0**.
> Umumiy `>5000` navbat: 209 → **200**.

---

## 1. Tekshiruv natijalari (2026-10-26)

| Qator | Universitet | Tekshiruv |
|---|---|---|
| **3** | Imperial | sahifa **ochildi, lekin faqat sarlavha** — mukofot ro'yxati yo'q |
| **53** | Edinburgh | `ed.ac.uk/student-funding/` → **Registry hub**'ga yo'naltirdi; u yerda faqat **qidiruv** (daraja/millat/fan bo'yicha) |
| **145** | King's | `pgr-funding-options` → **404** |
| **367** | Aberdeen | `…/research/funding/` → **page-not-found** ("havola eskirgan") |
| **368** | Aston | `…/postgraduate-research/funding/` → **401 unauthorized** (umuman ochilmadi) |
| **385** | Liverpool | `…/student-life/funding/` → **404** |
| **387** | Essex | `…/research/funding/` → **404** |
| **388** | Kent | kurs katalogiga yo'naltirdi; faqat **Kent Graduate Scholarship = 20 % alumni chegirma** (Kent bitiruvchilari uchun, xalqaro abituriyentga tegishli emas) |
| **389** | QUB | `…/research/funding/` → **page-not-found** |

To'qqizalasida ham import qilingan nom va summa **tasdiqlanmadi**.

---

## 2. Qilingan ish (har birida bir xil)

| Maydon | Qiymat |
|---|---|
| `amount_usd_value` | **0** |
| `award_amount` | **NULL** |
| `award_currency` | **GBP** |
| `deadline` / `deadline_type` | olib tashlandi → `not_published` |
| `min_ielts` / `min_gpa` | **NULL** |
| `coverage_type` | **Unspecified** |
| `title` | "… (named award unconfirmed)" |
| `website_url` / `source_url` | **haqiqiy, ochilgan** manzil (qidiruv, hub yoki katalog) |
| `source_reliability` | **4** |
| `notes` | aniq dalil — qaysi sahifa nima qaytardi |
| Karta | **640, 19, 616, 145, 464** → `No` |

**Nega o'chirilmadi:** har bir qatorda endi **ishlaydigan** universitet manzili turadi (Aberdeen/Edinburgh qidiruvi, Liverpool PGR hub, Essex scholarships, QUB course finder va h.k.). Pass 48 da UBA/USP o'chirilgan edi, chunki ular hech qanday foydali havola qoldirmagan.

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 55 oxiri | Pass 56 oxiri |
|---|---|---|
| **`>5000` faol qatorlar (jami)** | 209 | **200** |
| **shundan Buyuk Britaniya** | 9 | **0** ✅ |
| Yalang'och domenli `website_url` | 64 | **64** |
| `source_reliability = 4` | 20 | **29** |
| `university_scholarships` `No` kartalar | 87 | **95** |
| Faol stipendiyalar | 559 | **559** |
| Nafaqaga chiqarilganlar | 107 | **107** |

---

## 4. Keyingi katta klasterlar

Endi navbatda faqat boshqa davlatlar qoldi:

| Davlat | `>5000` qatorlar |
|---|---|
| **AQSh** | 63 |
| **Avstraliya** | 25 |
| **Kanada** | 15 |
| Shveytsariya | 9 |
| Xitoy | 9 |
| Gonkong | 8 |
| Janubiy Koreya | 6 |
| Shvetsiya | 6 |
| Singapur | 6 |
| Yangi Zelandiya | 5 |
| qolganlar | ~48 |

Keyingi pass — **AQSh** klasteri (63 qator), ehtimol 3–4 passda.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (9 qator) | hammasi toza, `CORRECTED` izohi bor |

---

## 6. Manbalar (2026-10-26 da ochilgan)

`imperial.ac.uk/study/pg/fees-and-funding/scholarships/` (bo'sh) · `registryservices.ed.ac.uk/student-funding/search-scholarships` · `kcl.ac.uk/study/funding/funding-opportunities` · `liverpool.ac.uk/study/postgraduate-research/` · `essex.ac.uk/scholarships` · `kent.ac.uk/scholarships` · `qub.ac.uk/courses` · `abdn.ac.uk/search/` · `aston.ac.uk/courses`

**404 / xato:** `ed.ac.uk/student-funding/` (redirect) · `kcl.ac.uk/…/pgr-funding-options` · `abdn.ac.uk/study/postgraduate/research/funding/` · `aston.ac.uk/postgraduate-research/funding/` (**401**) · `liverpool.ac.uk/student-life/funding/` · `essex.ac.uk/postgraduate/research/funding/` · `kent.ac.uk/postgraduate/research/funding/` (redirect) · `qub.ac.uk/study/postgraduate/research/funding/`

SQL: `supabase/scholarship_rewrite_pass56_2026-10-23.sql`
