# ScholarBridgeAi — stipendiyalarni qayta yozish, 45-pass (Fransiya + Meksika)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Fransiya (2 qator) + Meksika (2 qator) — 4 qator qayta yozildi. Hech qator nafaqaga chiqarilmadi, yangi qator qo'shilmadi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **574** École des Ponts ParisTech | "Scholarships", 25–50 % kontrakt, uydirma **USD 1 250**, 3 daraja, "Apr" | **"International Admission and Funding Routes"** — maktab **o'z stipendiyasini e'lon qilmaydi**: Fondation des Ponts bursalari, foizsiz kreditlar, Meridiam va Ibn Rochd kompaniya bursalari (shartlari dastur bo'yicha). Kirish — **ParisTech tarmog'i** orqali, bitta ariza, imtihon+intervyu, **fransuz tilida**, 2-kurs (master darajasi)ga qabul. **Qabul qilinganlarning ~35 %** qaysidir bursaga ega. `coverage_type = Unspecified`, summa **0**, muddat **not_published** |
| **576** ENS de Lyon | 25–50 % kontrakt, uydirma **USD 1 000**, 3 daraja | **"Ampère and GRADUATE+ Merit Scholarships"** — **oyiga EUR 1 000**: Ampère **12 oy** (= EUR 12 000/yil), GRADUATE+ **10 oy** (SFRI). Bu **yashash stipendiyasi**, kontrakt chegirmasi emas. Faqat **magistratura**; FEADéP dasturlari bundan mustasno. 2026-27 oynasi: **14-noyabr 2025 – 23-yanvar 2026**, natija mart o'rtasi; 2027-28 kalendari **noyabr 2026**da e'lon qilinadi |
| **679** Tecnológico de Monterrey | 50–75 % kontrakt, uydirma **USD 3 750**, 3 daraja, "Feb–Apr" | **"Scholarships for International Students"** — xalqaro sahifadagi uchta mukofot **faqat Lotin Amerikasi** uchun (Socioeconómica LATAM, Talento Académico LATAM 30–70 %, Líderes del Mañana LATAM 100 % — faqat 7 davlat). O'zbekistonlik nomzod uchun qoladigan yo'l — **talent bursalari** (sport, san'at, liderlik, tadbirkorlik, kreativ, transformativ), qabul jarayonida hal qilinadi. Shartlar: PAA **1 220** yoki SAT konvertatsiyada **1 320**, o'rtacha **≥85/100**, qaytarilmaydigan **MXN 750** to'lov, qabulda **MXN 9 000/15 000** avans |
| **707** UNAM | "Scholarships for International Students", uydirma **USD 250**, "May 31", 3 daraja | **"UNAM Postgraduate Scholarships (Elisa Acuña programme)"** — **oyiga 4.5 UMA** (magistratura) / **6.0 UMA** (doktorantura), ya'ni **yashash stipendiyasi**, kontrakt chegirmasi emas; faqat to'liq kunlik, yangi qabul qilingan, boshqa moliyaviy yordamsiz va haftasiga 8 soatdan ko'p ishlamaydigan talabaga. Ro'yxat **10–14-avgust 2026** (SIAAPosgrado). **Muhim:** hujjatlar ro'yxatida **CURP** (Meksika fuqarolik reyestri kodi) va Meksika soliq guvohnomasi talab qilinadi — ya'ni bu **ichki** grant; xorijiy nomzod odatda Meksika hukumatining "excellence" stipendiyalari orqali moliyalanadi |

`university_scholarships`: **269** (Ponts), **268** (ENS Lyon), **197** (Tec), **88** (UNAM) yangilandi.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Mavjud bo'lmagan summa va foiz** | 574, 576, 679, 707 | Ponts umuman stipendiya e'lon qilmaydi; ENS Lyon — oylik stipendiya (kontrakt emas); Tec — faqat foizlar; UNAM — UMA indeksida oylik. To'rttasida ham `amount_usd_value = 0` |
| 2 | **Valyuta xatosi** | hammasi | `award_currency` **EUR** (Fransiya) va **MXN** (Meksika); eski qatorlarda **USD** edi. Suzuvchi valyutalar konvertatsiya qilinmaydi (loyiha konvensiyasi) |
| 3 | **Daraja darajalari noto'g'ri** | 574, 576, 679, 707 | Ponts — master/PhD (bakalavr yo'q); ENS Lyon — **faqat magistratura**; Tec — **faqat bakalavr**; UNAM — magistratura/PhD |
| 4 | **Muddat o'ylab topilgan** | 574 ("Apr"), 576 ("Jan"), 679 ("Feb–Apr"), 707 ("May 31") | Ponts — `not_published`; ENS Lyon — **23-yanvar 2026** + 2027-28 noyabrda; Tec — har bir chaqiruv o'z sanasi bilan; UNAM — **10–14-avgust 2026** |
| 5 | **Uydirma IELTS/GPA** | hammasi (6.5 / 3.0–3.6) | Hech bir stipendiya sahifasi bunday talab qo'ymaydi → `min_ielts = NULL`, `min_gpa = NULL` |
| 6 | **Kontekst yo'qligi — eng jiddiy xato** | 679, 707 | Tec sahifasidagi mukofotlar **Lotin Amerikasi** uchun; UNAM granti **CURP** talab qiladi. Ikkalasi ham O'zbekistonlik nomzod uchun amalda yopiq — bu matnda va `notes`da ochiq yozilgan |
| 7 | **Manba — yalang'och domen** | 574, 576, 679, 707 | Endi real ochilgan sahifalar (pastda) |
| 8 | **Ochilmagan manba** | 574 | `ecoledesponts.fr/international/etudier-lecole/bourses-et-accompagnement-la-mobilite` boshqa sahifaga yo'naltirdi; shu sababli `source_url` — ochilgan yangiliklar sahifasi, Fondation des Ponts haqidagi matn esa faqat `notes`da, `source_reliability = 6` |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 44 oxiri | Pass 45 oxiri |
|---|---|---|
| Shablon tavsifli qatorlar | 19 → (Isroil o'chirilgach 17) | **13** |
| Yalang'och domenli `website_url` | 80 → (Isroil bilan 78) | **74** |
| Faol stipendiyalar | 565 → (Isroil bilan 563) | **563** |
| Nafaqaga chiqarilganlar | 103 | **103** |

Navbatda qolgan shablon qatorlari: **13** — Argentina 1, Avstriya 1, Braziliya 1, Chexiya 1, Gonkong 1, Qozog'iston 1, Livan 1, Janubiy Afrika 2, Tailand 1, BAA 2.

---

## 4. Ochiq band (keyingi passlarga)

* **343 UNAM International Postgraduate Scholarship** — 707 dan **boshqa** instrument (milliy tadqiqot stipendiyasi, tarixan CONAHCYT bilan bog'liq), lekin unda uydirma **USD 15 000**, "June 15 annually" va `["Master","PhD"]` formati bor. Bu passda **tegilmadi** — alohida tekshirish kerak.
* UNAM katalogda **ikki marta** turadi (universitet id 91 va 176) — dublikat universitet muammosi hal qilinmagan.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (4 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-25 da ochilgan)

`ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux` · `ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships` · `tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales` · `becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1/`

SQL: `supabase/scholarship_rewrite_pass45_2026-10-23.sql`
Isroil o'chirilishi: `supabase/delete_israel_2026-10-25.sql`, `docs/ISRAEL_REMOVAL_2026-10-25.md`
