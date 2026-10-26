# ScholarBridgeAi — stipendiyalarni qayta yozish, 61-pass (AQSh: need-based blok)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** AQSh — 7 qator qayta yozildi (MIT, Stanford, Harvard, Caltech).
**Manba:** faqat universitetlarning o'z sahifalari (finaid / SFS / OGE / GSAS / gradoffice).

---

## 1. Qayta yozilgan 7 qator

| Qator | Avval | Endi |
|---|---|---|
| **1** MIT Need-Based Financial Aid | uydirma **USD 86 000**, "February 1 annually", `"Bachelor"` | **need-blind + full-need**, *ham mahalliy, ham xalqaro* talabalar uchun. 2025–26: **58 %** MIT Scholarship olgan, **median USD 73 666**, median net price **USD 11 432**; **USD 176 mln** e'lon qilingan. Daromad **< USD 200 000** → odatda **tuition-free**; **< USD 100 000** → ota-ona **hech narsa to'lamaydi**. 2026–27 COA **USD 92 760** (tuition 66 720, housing 14 090, food 8 104). 1-kursga **USD 2 000 First Year Grant**. Muddat: **30-noyabr (Early Action)**, **15-fevral (Regular Action / Transfer / joriy talabalar)** — xalqaro va mahalliy uchun **bir xil** |
| **2** MIT Presidential Fellowship | uydirma **USD 45 000**, "December 15 annually" — ya'ni talaba ariza beradi degan yolg'on | **9 oylik fellowship, faqat 1-o'quv yili**: tuition + oylik stipendiya (**S&E doctoral RA stavkasidan oshmaydi**) + extended insurance. **Yiliga 110–125 fellow** (2024: **143 fellow, 31 davlat**). **Talaba ariza bera olmaydi** — kafedra nomzod qiladi, Prezident va Provost tanlaydi. Muddat **e'lon qilinmagan** |
| **6** Stanford Need-Based Aid | uydirma **USD 85 000**, "February 1 annually", "150 000 USD gacha oilalar hech narsa to'lamaydi" (tekshirilmagan) | **100 % ehtiyoj, kreditsiz**. Xalqaro fuqaro uchun **need-aware** — grant so'rovi qabul tanlovida hisobga olinadi. **Ariza paytida so'ramagan xalqaro talaba 4 yil davomida umuman ololmaydi**. Merit stipendiya **yo'q** (faqat cheklangan sport). 2026–27 budjet **USD 97 545** (tuition 67 731, housing+food 22 944). Xalqarolar uchun **Cardinal Care** budjetga qo'shiladi. Grant olish uchun **SSN yoki ITIN** shart. Muddat: **15-noyabr (REA)**, **15-fevral (RD)**, **15-mart (transfer)** |
| **10** Harvard Need-Based Aid | uydirma **USD 82 000**, "February 1 annually", faqat 85 000 USD chegarasi | **Daromad chegaralari (tipik aktivlar bilan):** **≤ USD 100 000 — bepul** (barcha hisob-kitob xarajatlari + **USD 2 000 start-up** 1-kursda + sug'urta + uyga qatnov + qishki kiyim + **USD 2 000 launch** 3-kursda); **≤ USD 200 000 — tuition bepul plus**; **> USD 200 000 — individual yondashuv**. **25 %** hech narsa to'lamaydi, **55 %** stipendiya oladi, o'rtacha ota-ona hissasi **~USD 14 000**, **100 %** kreditsiz bitiradi. Xalqarolar **aynan amerikaliklar bilan bir xil** asosda. Muddat: **1-noyabr (REA)**, **1-fevral (RD)**, **1-mart (transfer)**; CSS kodi **3434**, FAFSA kodi **E00468** |
| **9** Harvard GSAS Merit Fellowship | uydirma **USD 50 000**, "December 15", go'yo kiruvchi talaba stipendiyasi | **ICHKI** fellowship: **allaqachon o'qiyotgan** PhD talabasi uchun, **generallar topshirilgan** va **dissertatsiya prospectusi tasdiqlangan** bo'lishi shart. **Bir semestrlik** stipendiya, **5 oylik to'lov** (1-sentabr–1-yanvar yoki 1-fevral–1-iyun). Tabiiy fanlarda faqat **statistika, matematika, nazariy fizika, OEB, HEB**. Presidential funding olayotganlar **olmaydi**, **kechiktirish yo'q**, ish haftasiga **10 soatdan** oshmasligi kerak. Kiruvchilar uchun muhimi: GSAS **barcha PhD talabalarga 5 yillik kafolatlangan moliyalashtirish** beradi |
| **19** Caltech Need-Based Aid | uydirma **USD 85 000**, "January 3 annually", "o'rtacha mukofot 50 000 dan yuqori" | **100 % ehtiyoj**; **mahalliylar uchun need-blind**, **xalqarolar uchun need-aware** (xalqaro jamg'arma cheklangan). **Merit stipendiya umuman yo'q**. Fall 2026 kiruvchilar uchun **o'rtacha grant ~USD 69 000**; **< USD 200 000** → tuition qoplanadi; **< USD 100 000** → **kreditsiz** paket (tuition, fees, housing, food). **Bir marta** qoidasi: 1-kursda so'ramagan yoki rad javob olgan xalqaro talaba keyin **hech qachon** ololmaydi (faqat Kanada/Meksika fuqarolari). Xalqaro transfer va 3/2 uchun **grant yo'q**. Qabul muddati: **1-noyabr 2026 (REA)**, **4-yanvar 2027 (RD)**; aid formalari 2027 uchun hali e'lon qilinmagan (2026 siklida CSS — 15-fevral, priority — 16-mart) |
| **20** Caltech PhD funding | uydirma **USD 42 000**, "December 15", "37 000–40 000 stipendiya" | **Barcha PhD talabalar** to'liq moliyalashtiriladi: **tuition + majburiy to'lovlar + stipendiya**, 5–6 yil. Stipendiya: **USD 48 244** (2025-09-01 dan), **USD 50 000** (2026-09-01 dan), har oy 26-sanagacha. 2026–27 tuition **68 574** + fees **2 448** = **71 022**. **Alohida ariza yo'q**. Ariza oynasi: **1-dekabr – 15-yanvar**. Magistratura odatda moliyalashtirilmaydi. Ish ruxsatnomasi (work authorization) talab qilinadi |

Kartalar (`university_scholarships`): **544, 554, 557, 553, 558, 10, 520** → `availability_status='Yes'`, `verification_status='verified'`, manba URL yangilandi.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Uydirma summa** | 1 (86 000), 2 (45 000), 6 (85 000), 9 (50 000), 10 (82 000), 19 (85 000), 20 (42 000) | 6 tasi **e'lon qilinmagan** → `amount = 0`, `award_amount = NULL`; faqat **20** da haqiqiy e'lon qilingan stavka **USD 50 000** qoldirildi |
| 2 | **Uydirma muddat** | 1, 6, 10 ("February 1 annually"), 2, 9, 20 ("December 15 annually"), 19 ("January 3") | Har biriga **e'lon qilingan** sana: MIT 30-noyabr/15-fevral, Stanford 15-noyabr/15-fevral/15-mart, Harvard 1-noyabr/1-fevral/1-mart, Caltech 1-noyabr/4-yanvar; 2 va 9 uchun `not_published` / `annual` |
| 3 | **Mexanizm noto'g'ri** | 2, 9, 20 | Uchtasida ham **alohida ariza yo'q**: MIT Presidential — faqat kafedra nomzodi; GSAS Merit — ichki, o'qiyotganlarga; Caltech PhD — qabul bilan birga |
| 4 | **Nominatsiya ≠ ariza** | 2 | "Eng nufuzli doktorlik stipendiyasi, ariza bilan" degan matn olib tashlandi: talaba ariza bera olmaydi |
| 5 | **Award mavjud emas / boshqa narsa** | 9 | Merit Fellowship — kiruvchilar uchun emas, **dissertatsiya semestriga** beriladigan ichki grant |
| 6 | **Daraja kanonik emas** | 1, 6, 10, 19 (`"Bachelor"`) | → `"Bachelor's"` |
| 7 | **Yashirin to'siq aytilmagan** | 6, 19 | Stanford: ariza yilida so'ramasa — **umuman ololmaydi**; Caltech: xuddi shunday + xalqaro transferga grant yo'q |
| 8 | **Need-aware aytilmagan** | 6, 19 | Ikkalasi ham xalqaro fuqaro uchun **need-aware** — bu O'zbekiston nomzodi uchun hal qiluvchi fakt |
| 9 | **Bare-domain manba** | 6 (`financialaid.stanford.edu`), 19 (`financialaid.caltech.edu` — bu domen hatto ochilmadi) | Stanford — `…/undergrad/how/international.html`; Caltech — `finaid.caltech.edu/applying/how/newinternationalrd` |
| 10 | **Muhim faktlar yo'q** | 1, 10, 20 | MIT: 2 000 USD First Year Grant, tibbiy sug'urta granti, daromad jadvallari; Harvard: 2 000 start-up + 2 000 launch; Caltech: work authorization, 5–6 yil, majburiy to'lovlar |

---

## 3. Uch muhim topilma

**1) MIT — AQShda xalqaro talabaga ochiq bo'lgan kam sonli "need-blind + full-need" maktab.**
`making-mit-affordable` sahifasi ochiq yozadi: MIT *"need blind and full need for all of our undergraduate students, domestic and international"*. Bu — O'zbekiston nomzodi uchun eng katta imkoniyat: grant so'rovi qabul imkoniyatini **pasaytirmaydi**.

**2) Kaltech/Stenford/Harvard "bir marta" qoidasi.**
Stanford: *"International students who do not request consideration for financial aid at the time they apply for admission will not be eligible to apply for aid at Stanford throughout their undergraduate years."*
Caltech: *"…are not eligible for need-based financial aid for any other academic period… (with the exception of citizens and permanent residents of Canada and Mexico)."*
Ya'ni bu uch universitetda **"keyinroq so'rayman"** degan strategiya ishlamaydi — ariza yili yagona imkoniyat.

**3) Harvard GSAS Merit Fellowship — importer uni butunlay boshqa narsa deb yozgan.**
Haqiqatda bu **o'qiyotgan** talaba uchun bir semestrlik tadqiqot granti (generallar + prospectus shart). Kiruvchi PhD talaba uchun esa GSAS *"guaranteed funding for the first five years to all PhD students"* — ya'ni bu qator "kiruvchilar uchun stipendiya" sifatida foydasiz, lekin **to'g'ri mexanizm** yozildi.

---

## 4. Hisoblagichlar (pass 61 dan keyin)

| Ko'rsatkich | Pass 60 | Pass 61 | O'zgarish |
|---|---|---|---|
| `is_active` qatorlar | 549 | **549** | 0 |
| `is_active = false` (retired) | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 155 | **149** | **−6** |
| shundan **AQSh** | 18 | **12** | **−6** |
| importer-shablon tavsif | 0 | **0** | 0 |
| bare-domain `website_url` | 85 | **85** | 0 |
| `source_reliability = 4` | 29 | **29** | 0 |
| `source_reliability = 5` | 27 | **27** | 0 |

> **Eslatma:** oldingi hisobotda bare-domain **64** deb yozilgan edi — bu raqam xato bo'lgan. Haqiqiy holat: **85** (71 tasi 2026-10-23 dagi dastlabki passlardan, 2 tasi 24-oktabrdan, 12 tasi 25-oktabrdan). Bu passda bare-domain qo'shilmadi va olib tashlanmadi.

---

## 5. Tekshiruv (hard-check)

`id IN (1,2,6,9,10,19,20)` uchun barcha tekshiruvlar `false`:
`bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`, `bad_countries`, `bad_notes` — **hammasi false**.
`degree_levels` apostrof tekshiruvi `2, 9, 20` da `true` — bu **xato emas**: `"PhD"` kanonik qiymat, apostrofsiz.

Sifat darvozalari: `npx tsc --noEmit` — **0** · `npm run check:i18n` — **passed** (3 310 `t()` chaqiruvi) · `npm run test:render` — **337 passed, 0 failed**.

---

## 6. Keyingi qadam

1. **62-pass** — 30/31-passlarda yozilgan 10 ta AQSh qatorini qayta tekshirish: **538** ASU, **605** JHU need-based, **628** MSU, **694** UC Davis Regents, **702** UCSD Regents/Triton, **706** UMass, **749** Minnesota GES, **757** Rochester Meliora, **803** Yale need-blind, **815** Princeton need-blind, plus **495** Pitt.
2. Keyin AQSh bo'lmagan klasterlar: **Avstraliya 25**, **Kanada 15**, **Shveytsariya 9**, **Xitoy 9**, **Gonkong 8**, **Janubiy Koreya 6**, **Shvetsiya 6**, **Singapur 6**, **Yangi Zelandiya 5**.
3. Keyin `source_reliability = 5` bo'lgan **27** AQSh doktorlik qatori — har biriga universitetning o'z moliyalashtirish sahifasi.
4. Keyin **85** bare-domain, keyin ochiq qolganlar (Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP GAS, **343**-qator, UNAM dublikati).
