# ScholarBridgeAi — Stipendiyalarni qayta yozish, 30-pass: AQSh (ehtiyojga asoslangan yordam klasteri)

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` (Postgres 17) · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 7 qator qayta yozildi + 7 ta `university_scholarships` kartasi yangilandi. O'chirilgan qator yo'q.

---

## 1. Nima uchun bu klaster alohida ajratildi

AQSh bo'yicha 19 ta shablon qatorning 6 tasi bir xil xatoni takrorlagan: ular universitetning **ehtiyojga asoslangan moliyaviy yordamini** (need-based financial aid) «Full Ride» deb nomlab, unga o'ylab topilgan USD 84 000–96 000 qiymat qo'ygan va universitetning bosh domenini manba qilib ko'rsatgan.

Bu ikki darajada noto'g'ri:

1. **Qiymat yo'q.** Bu universitetlarning hech biri maksimal dollar summasini e'lon qilmaydi — paket CSS Profile asosida hisoblanadi. Ya'ni `award_amount` maydoniga yozilgan har qanday raqam to'qima bo'lgan.
2. **Kimga tegishli ekani aralashtirilgan.** Emory, Case Western, Rice kabi universitetlar «100% ehtiyoj qoplanadi» degan kafolatni **faqat ichki (domestic) talabalarga** beradi, xalqaro talabaga esa «tanlangan guruh» yoki «cheklangan mablag'» deb yozadi. Eski qatorlar bu kafolatni xalqaroga ham tegishli qilib ko'rsatgan.

Shu sababli 7 qatorning barchasida `amount_usd_value = 0`, `award_amount = NULL`, `coverage_type` haqiqiy darajaga tushirildi yoki asosli ravishda `Full Funding` qoldirildi, va `notes` maydonida aynan nima tekshirilgani yozildi.

---

## 2. Aniqlangan kamchiliklar

| № | Qator | Eski holat | Tekshirilgan haqiqat | Tuzatish |
|---|---|---|---|---|
| 1 | **563 Dartmouth** | «Full Ride», USD 96 000, `home.dartmouth.edu` | Dartmouth xalqaro abituriyentlar uchun **need-blind** (Class of 2026 dan boshlab) va 100% ehtiyojni qoplaydi. Maksimal summa e'lon qilinmagan. Ish hissasi: 1-kursdan oldin yozgi ish talabi yo'q, 2-kursdan **USD 1 500**, paket ichida **USD 2 450** term-time ish daromadi. CSS Profile kodi **3351**; CSS to'lovi og'ir bo'lsa **ISFAA** qabul qilinadi | `Full Funding`, summa 0, `deadline` = ED 1-noyabr / RD moliyaviy yordam 1-fevral |
| 2 | **789 WashU** | «Full Ride», USD 95 000, `wustl.edu` | 100% ehtiyoj **ssudasiz** qoplanadi va bu xalqaro 1-kurs talabalariga ham tegishli. Lekin yordam **faqat** o'sha qabul raundining moliyaviy yordam muddatigacha so'ralsa beriladi — o'tkazib yuborsa, keyinchalik umuman berilmaydi. CSS kodi **6929**. O'rtacha paket **USD 75 000**. Xalqaro transfer talabalari yordam ololmaydi | `Full Funding`, summa 0, muddat 17-noyabr / 11-yanvar / 1-fevral |
| 3 | **663 Rice** | «Full Ride», USD 88 000, `rice.edu` | Tanlangan xalqaro talabalarga 100% ehtiyoj grant bilan qoplanadi, **lekin** qabul ham, yordam ham **need-aware**. Yordam qabul arizasida so'ralishi shart, keyin mumkin emas. Xalqaro transferga na need, na merit. CSS kodi **6609**; IDOC faqat ichki talabalar uchun | `Full Funding`, summa 0, muddat 15-noyabr / 4-yanvar / 1-fevral |
| 4 | **575 Emory** | «Full Ride», USD 84 000, `emory.edu` | «100% ehtiyoj, sssudasiz» — bu **ichki** 1-diplom talabalari uchun. Xalqaro uchun matn: «har yili **tanlangan guruh** xalqaro talabalarga need-based yordam», mablag' cheklangan. CSS kodi **5187**. Scholar Programs (merit) — 15-noyabr | `Partial Funding`, summa 0, muddat 2-dekabr / 6-yanvar / 10-fevral |
| 5 | **552 Case Western** | «Full Ride», USD 96 000, `case.edu` | «Xalqaro 1-kurs va transfer abituriyentlarga **cheklangan miqdorda** need-based yordam». Paket grant + kredit + kampus ishidan iborat bo'lishi mumkin. Merit 8 semestr, need-grant 10 semestr. IELTS 7.0 / TOEFL iBT **4.5** (2026-01-21 dan keyingi testlar) / Duolingo 115 / PTE 61 | `Partial Funding`, summa 0, moliyaviy hujjatlar 15-noyabr / 22-yanvar / 1-fevral |
| 6 | **782 Vanderbilt** | «Full Ride», USD 94 000, `vanderbilt.edu` | Vanderbilt merit va need yordamni **ajratadi**. Ingram + Cornelius Vanderbilt: **225+** g'olibga to'liq o'qish + yozgi stipendiya, 4 yil yangilanadi, muddat **1-dekabr 2026**. Xalqaro talabalar **har qanday** Vanderbilt merit stipendiyasiga loyiq. Arizachilarning ~1% tanlanadi | `Full Tuition + Stipend`, summa 0, muddat 1-dekabr 2026 |
| 7 | **775 USC** | «Full Tuition», USD 67 000, uch daraja, muddat «Jan 15 / Nov 1» | USC merit **bir necha ming dollardan to'liq o'qishgacha**; o'tgan yil 1 000+ talaba **USD 10 000+** oldi. Merit faqat **1-noyabr (ED/EA)** yoki **1-dekabr (san'at yo'nalishlari)** raundida ko'riladi — **10-yanvar** raundi merit uchun **umuman hisobga olinmaydi** | `Partial Tuition`, `award_basis = range`, summa 0, muddat 1-noyabr 2026 |

---

## 3. Yozilgan qatorlar (batafsil)

### 563 — Dartmouth College International Financial Aid (Need-Blind, Full Need)
`Full Funding` · `need_based` · `amount_usd_value = 0` · 1-noyabr 2026 (ED) va 1-fevral 2027 (RD moliyaviy yordam)
Eng qimmatli fakt: Dartmouth xalqaro abituriyentlar uchun **need-blind** — ya'ni yordam so'rash arizaga zarar qilmaydi. AQShdagi aksar universitetlarda buning aksi. CSS Profile to'lovi og'ir bo'lsa **ISFAA** to'g'ridan-to'g'ri moliyaviy yordam idorasiga topshiriladi.

### 789 — Washington University in St. Louis International Need-Based Financial Aid
`Full Funding` · `need_based` · summa 0 · 17-noyabr 2026 / 11-yanvar 2027 / 1-fevral 2027
Muddat tuzog'i: xalqaro talaba ariza topshirilgan raundning **moliyaviy yordam** muddatini o'tkazib yuborsa, bakalavriat davomida bir marta ham yordam ololmaydi. O'rtacha paket — **USD 75 000**. CSS to'lovini to'lay olmaydiganlar uchun WashU institutsional formasi bor.

### 663 — Rice University International Need-Based Financial Aid
`Full Funding` · `need_based` · summa 0 · 15-noyabr 2026 / 4-yanvar 2027 / 1-fevral 2027
Rice **need-aware**: qabul komissiyasi oilaning qancha yordam kerakligini ko'radi. Yordam faqat qabul arizasida so'ralsa beriladi. Rice Investment (ichki dastur) xalqaro yordam oluvchilarga tegishli emas.

### 575 — Emory University International Need-Based Financial Aid
`Partial Funding` · `need_based` · summa 0 · 2-dekabr 2026 / 6-yanvar 2027 / 10-fevral 2027
Emory Advantage Plus (2026 kuzidan: USD 200 000 gacha daromadli **ichki** oilalar uchun bepul o'qish) — xalqaroga tegishli emas. Xalqaro uchun: har yili tanlangan guruh, cheklangan mablag'. Yordam so'ragan xalqaro talaba moliyaviy hujjatda 0 dan to'liq xarajatgacha ko'rsatishi mumkin.

### 552 — Case Western Reserve University International Need-Based Financial Aid
`Partial Funding` · `need_based` · summa 0 · 15-noyabr 2026 / 22-yanvar 2027 / 1-fevral 2027
Xalqaro need-based havzasi **cheklangan**. Amaliy yo'l — merit: avtomatik ko'rib chiqish + qo'shimcha insho talab qiladigan musobaqalar (to'liq o'qish mukofotlari ham bor). O'tgan yil **USD 213 mln** institutsional yordam berilgan.

### 782 — Vanderbilt University Signature Merit Scholarships (Ingram and Cornelius Vanderbilt)
`Full Tuition + Stipend` · `full_tuition` · summa 0 · **1-dekabr 2026**
**225+** g'olib: to'liq o'qish + yozgi stipendiya (xorijda o'qish, tadqiqot yoki xizmat loyihalari uchun), 4 yil yangilanadi. Xalqaro talabalar har qanday Vanderbilt merit stipendiyasiga loyiq — bu universitetning o'z FAQ'da yozilgan. Merit natijalari **mart oxirida** e'lon qilinadi, ED qarori esa undan oldin majburiy bo'ladi.

### 775 — USC Merit Scholarships
`Partial Tuition` · `award_basis = range` · summa 0 · 1-noyabr 2026 yoki 1-dekabr 2026
Qiymat: bir necha ming dollardan to'liq o'qishgacha; 1 000+ talaba **USD 10 000+** oldi. National Merit (USD 20 000/yil) — faqat AQSh dasturi, O'zbekiston abituriyentiga tegishli emas. Boshqa USC mukofotlari — Scholarship Universe'da alohida ariza bilan.

---

## 4. `university_scholarships` kartalari

7 ta karta (id 223, 279, 71, 202, 270, 247, 57) yangi nom, `funding_type`, `max_scholarship`, `eligibility_notes` va tasdiqlangan `official_url` bilan yangilandi. `availability_status = 'Yes'`, `verification_status = 'verified'`.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 29 oxiri | Pass 30 oxiri |
|---|---|---|
| Shablon tavsiflar (`offers ... Maximum award:`) | 96 | **89** |
| Yalang'och domen `website_url` | 155 | **148** |
| Faol stipendiyalar | 577 | **577** |
| AQShda qolgan shablon qatorlar | 19 | **12** |

Qayta yozilgan qatorlar jami: 133 → **140** (577 faol qatordan 24.3%).
Pass 30 da o'chirilgan qator yo'q — 7 tasi ham mazmunan to'g'rilanib, faol qoldirildi.

---

## 6. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **i18n check passed** (3 310 `t()` chaqiruvi)
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 7 qator uchun qattiq tekshiruv: `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json` — **hammasi `false`**

---

## 7. Manbalar (barchasi 2026-10-25 da ochilgan)

`financialaid.dartmouth.edu/apply-aid/international-students` · `admissions.dartmouth.edu/estimate-your-cost/apply-financial-aid` · `financialaid.washu.edu/apply-for-aid/international-applicant-process/` · `admissions.washu.edu/how-to-apply/application-dates-deadlines/` · `financialaid.rice.edu/apply-aid/international-students` · `apply.emory.edu/apply/international` · `apply.emory.edu/apply/plans-deadlines` · `case.edu/financialaid/undergraduates/international-students` · `case.edu/admission/apply/international-applicants` · `case.edu/admission/apply/deadlines-and-requirements` · `vanderbilt.edu/scholarships/` · `vanderbilt.edu/scholarships/faq/` · `admission.usc.edu/cost-and-financial-aid/scholarships/` · `admission.usc.edu/prospective-students/how-to-apply/first-year-students/`

---

## 8. Keyingi navbat

1. **AQSh — merit klasteri (12 qator):** 538 ASU, 580 Georgia Tech, 628 MSU, 645 Ohio State, 648 Penn State, 655 Purdue, 681 Texas A&M, 694 UC Davis, 701 UCSB, 706 UMass Amherst, 708 Morehead-Cain, 791 UW-Madison.
2. **Avstraliya (10)**, keyin **Kanada (8)**, **Hindiston (6)**, **Ispaniya (4)**, **Shveytsariya (4)**.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
