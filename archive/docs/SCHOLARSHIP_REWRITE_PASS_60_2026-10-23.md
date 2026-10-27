# ScholarBridgeAi — stipendiyalarni qayta yozish, 60-pass (AQSh, 4-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** AQSh — 3 qator qayta yozildi.

---

## 1. Qayta yozilgan 3 qator

| Qator | Avval | Endi |
|---|---|---|
| **38** Johns Hopkins Hodson | "Hodson Trust Scholarship", uydirma **USD 40 000**, "2027-01-02", 3 daraja, `eligible_countries = []` | **"Johns Hopkins Hodson Scholars (Trust and Gilliam Success Scholarships)"** — **ikki mukofot bir dasturda**: **Hodson Trust** (xizmat/etakchilik, **3.0 GPA** bilan 4 yil yangilanadi) va **Hodson-Gilliam Success** (akademik natija + **moddiy ehtiyoj**). **Alohida ariza yo'q**, qabul qarori bilan keladi, **apellyatsiya yo'q**. Yiliga **20 dan kam** talaba. JHU summani **e'lon qilmaydi** (`amount = 0`) |
| **39** UC Berkeley Regents | uydirma **USD 25 000**, tavsifda esa "2 500 USD" — **qator o'z-o'ziga zid** edi | **"UC Berkeley Regents' and Chancellor's Scholarship"** — **yiliga USD 2 500 honorary** (ehtiyojsizlarga) yoki **to'liq ehtiyojgacha**; **8 semestr** (bakalavr) / **4 semestr** (transfer); qo'shimcha: **ustuvor ro'yxatga olish**, **kafolatlangan yotoqxona**, **fakultet mentori**. **Alohida ariza yo'q**, fakultet bilan intervyu fevral–mart |
| **42** UChicago Odyssey | uydirma **USD 60 000**, "2027-01-04" | **"University of Chicago Odyssey Scholarship"** — **need-based grant** (qaytarilmaydi), **100 % ehtiyoj qoplanadi, kredit yo'q**; + **chet elda o'qish** (dastur to'lovi, turar joy, ovqat, aviachipta stipendiyasi) + **tibbiy sug'urta to'lanadi** + **1-kursdan keyin kafolatlangan haq to'lanadigan yozgi stajirovka** (Metcalf, **kamida USD 5 000**). Alohida ariza **yo'q** |

Kartalar: **481**, **482**, **522** yangilandi.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **"Alohida ariza" degan noto'g'ri fikr** | 38, 39, 42 | Uchtasida ham **yo'q**: JHU — qabul bilan; Berkeley — ariza faylidan avtomatik; UChicago — need-based ariza berganga avtomatik |
| 2 | **Qator o'z-o'ziga zid** | 39 | summa 25 000, tavsifda 2 500 — endi **e'lon qilingan 2 500** |
| 3 | **Uydirma summa** | 38 (40 000), 42 (60 000) | Ikkalasi ham **e'lon qilinmagan** → `amount = 0`, `award_amount = NULL` |
| 4 | **Muddat o'ylab topilgan** | 38, 39, 42 | JHU va UChicago — `automatic`; Berkeley — `not_published` |
| 5 | **Daraja** | 38, 42 | → **faqat bakalavr** (`"Bachelor's"` kanonik shaklda) |
| 6 | **`eligible_countries` bo'sh** | 38, 39, 42 | → `["All"]` |
| 7 | **Kiritilmagan muhim faktlar** | 39, 42 | Berkeley: ustuvor ro'yxat, yotoqxona, mentor; UChicago: stajirovka, chet el granti, sug'urta |

---

## 3. Ikki qiziq topilma

**Berkeley'ning ikki sahifasi bir-biriga zid ko'rinadi:**
- Umumiy xalqaro sahifa: *"international students are ineligible for federal, state, and need-based university financial aid"*
- Regents broshurasi: *"Incoming California residents, domestic non-residents, and **international students are eligible**"*

Yechim: bu ikki xil narsa haqida — **stipendiyaga nomzod bo'lish** va **federal need-based yordam olish**. Ikkalasi ham DB'ga yozildi, "ziddiyat yechildi" deb emas, **"ikki xil narsani tavsiflaydi"** deb.

**JHU'ning muhim ogohlantirishi:** xalqaro talaba **1-kursda yordam olmasa, keyingi yillarda unga ariza bera olmaydi**; olgan bo'lsa — **4 yil davomida bir xil darajada** saqlanadi.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 59 oxiri | Pass 60 oxiri |
|---|---|---|
| `>5000` faol qatorlar (jami) | 158 | **155** |
| shundan **AQSh** | 21 | **18** |
| Faol stipendiyalar | 549 | **549** |
| Nafaqaga chiqarilganlar | 117 | **117** |

---

## 5. AQSh navbatida qolgan 18 qator

1. **Need-based undergrad:** 1 MIT, 6 Stanford, 10 Harvard, 19 Caltech
2. **Caltech PhD:** 20
3. **Merit:** 2 MIT Presidential, 9 Harvard GSAS, 495 Pitt (pass 23 da tuzatilgan — tekshirish)
4. **Pass 30–31 da yozilganlar:** 538, 605, 628, 694, 702, 706, 749, 757, 803, 815

Keyingi pass: **MIT / Stanford / Harvard / Caltech need-based** bloki — to'rtovi ham xalqarolarga ochiq, lekin summa e'lon qilinmagan; keyin qolganlarni tekshirish.

---

## 6. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (3 qator) | hammasi toza; `degree_levels` kanonik, `eligible_countries` JSON |

---

## 7. Manbalar (2026-10-26)

`apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars/` · `financialaid.berkeley.edu/apply-now/international-students` · `financialaid.berkeley.edu/wp-content/uploads/FASO_250508_2026-Regents-and-Chancellors-Brochure_WEB_a11y.pdf` · `collegeadmissions.uchicago.edu/financial-support/scholarships` · `collegeadmissions.uchicago.edu/financial-support/financial-overview` · `college.uchicago.edu/odyssey`

SQL: `supabase/scholarship_rewrite_pass60_2026-10-23.sql`
