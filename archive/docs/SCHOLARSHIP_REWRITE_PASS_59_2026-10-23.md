# ScholarBridgeAi — stipendiyalarni qayta yozish, 59-pass (AQSh, 3-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** AQSh — 2 qator qayta yozildi.

---

## 1. Qayta yozilgan 2 qator

| Qator | Avval | Endi |
|---|---|---|
| **34** Cornell Tata | "Cornell Tata Scholarship", uydirma **USD 60 000**, "2027-01-02", ochiq mukofot sifatida | **"Cornell University Tata Scholarship (Indian citizens only)"** — **faqat Hindiston fuqarolari**. **25 mln USD endowment** (Tata Education and Development Trust), bir vaqtda **~20 stipendiyachi**, 8 semestr. **Alohida ariza yo'q**: Common App + **CSS Profile** (Cornell kodi **2098**). Muddatlar: **1-noy 2026** (ED), **2-yanv 2027** (RD), **15-mart 2027** (transfer). Cornell xalqaro qabuli **need-aware** va **100 % ehtiyojni qoplaydi** |
| **33** Penn World Scholars | uydirma **USD 60 000**, "2027-01-05" | **"Penn World Scholars (University of Pennsylvania)"** — **alohida ariza ham, muddat ham yo'q**: Penn **qabul komissiyasi qabul paytida** tanlaydi (akademik natija, liderlik, **moliyaviy ehtiyoj**, karyera maqsadi). **Summa e'lon qilinmagan** — pul **need-based paket** orqali. Dastur **4 yillik tuzilma** beradi (aprel uchrashuvi, ILP, resepsiya, mentorlik). Hozirgi kohortda **Braziliya, Ruanda, Ruminiya, Gana, Keniya, Mongoliya, Tunis, Janubiy Koreya, Qozog'iston** talabalari bor |

Kartalar: **599**, **530** yangilandi.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Milliy cheklov yashirilgan** (eng jiddiy) | 34 | Tata — **faqat Hindiston**; O'zbekistonlik nomzod uchun yopiq. Endi **sarlavhada**, `eligible_countries = ["India"]` da va tavsifning birinchi xatboshisida |
| 2 | **"Alohida ariza" degan noto'g'ri fikr** | 34, 33 | Ikkalasida ham alohida ariza **yo'q**: Cornell — Common App + CSS Profile; Penn — qabul paytida tanlov |
| 3 | **Uydirma summa** | 34 (60 000), 33 (60 000) | Ikkalasi ham **e'lon qilinmagan** → `amount = 0`, `award_amount = NULL` |
| 4 | **Muddat o'ylab topilgan** | 34, 33 | Cornell — CSS Profile muddatlari; Penn — `not_published` |
| 5 | **Daraja** | 33 (3 daraja) | → **faqat bakalavr** |
| 6 | **Uydirma IELTS/GPA** | ikkalasi | → `NULL` |

---

## 3. Muhim amaliy faktlar (DB'ga yozildi)

**Cornell:**
- CSS Profile kodi **2098**, 1-oktabrdan ochiladi
- Xalqaro abituriyentlarga **CSS Profile fee waiver berilmaydi**
- Ota-ona ajrashgan bo'lsa — **ikkalasi ham** alohida profil to'ldiradi
- Kontraktdan ortiq grant **AQShda soliqqa tortiladi**, **14 %** ushlanadi (shartnoma bo'lmasa)

**Penn:**
- Kohort ro'yxati dasturning haqiqiy geografik qamrovini ko'rsatadi (Markaziy Osiyodan Qozog'iston bor)

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 58 oxiri | Pass 59 oxiri |
|---|---|---|
| `>5000` faol qatorlar (jami) | 160 | **158** |
| shundan **AQSh** | 23 | **21** |
| Faol stipendiyalar | 549 | **549** |
| Nafaqaga chiqarilganlar | 117 | **117** |

---

## 5. AQSh navbatida qolgan 21 qator

1. **Need-based undergrad:** 1 MIT, 6 Stanford, 10 Harvard, 19 Caltech
2. **Caltech PhD:** 20
3. **Merit/nomlangan:** 2 MIT Presidential, 9 Harvard GSAS, 38 JHU Hodson, 39 Berkeley Regents, 42 UChicago Odyssey, 495 Pitt
4. **Pass 30–31 da yozilganlar:** 538, 605, 628, 694, 702, 706, 749, 757, 803, 815 — faqat tekshirish

Keyingi pass: **UChicago Odyssey** (AQSh ichki dastur bo'lishi mumkin), **JHU Hodson** (AQSh fuqarolari uchun), **Berkeley Regents** — uchovi ham ehtimol cheklangan; keyin **MIT/Stanford/Harvard/Caltech need-based** bloki (ularning barchasi xalqarolarga ochiq, lekin summa e'lon qilinmagan).

---

## 6. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (2 qator) | hammasi toza, `eligible_countries` JSON formati to'g'ri |

---

## 7. Manbalar (2026-10-26)

`finaid.cornell.edu/first-year-and-transfer-students-international` · `admissions.cornell.edu/apply/international-students/tata-scholarship` · `global.upenn.edu/isss/penn-world-scholars/`

SQL: `supabase/scholarship_rewrite_pass59_2026-10-23.sql`
