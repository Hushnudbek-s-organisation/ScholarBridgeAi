# ScholarBridgeAi — stipendiyalarni qayta yozish, 47-pass (qolgan yakkalar, 1-qism)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Gonkong, Livan, Avstriya, Chexiya — 4 qator qayta yozildi. Nafaqaga chiqarilgan yoki yangi qator yo'q.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **590** Hong Kong Baptist University | "HKBU International Student Scholarship", "Full Tuition 100 %", uydirma **USD 20 000**, "Jan 15", 3 daraja | **"Admission Scholarship Scheme for Overseas Applicants"** — 2027/28 uchun uch pog'ona: **Full** (HK$240 000 kontrakt + **HK$55 000 yashash subsidiyasi** = HK$295 000/yil), **Tuition-waiver** (to'liq HK$240 000), **Half** (50 %). **Ariza talab qilinmaydi** — qabul paytida baholanadi, dasturning normal davomiyligiga yangilanadi. **Belt and Road** stipendiyasi — alohida nominatsiya yo'li |
| **535** American University of Beirut | "Financial Aid", uydirma **USD 5 875**, "Jan–Feb / Sep–Oct" | **"Need-Based Financial Aid"** — haqiqiy ehtiyojga asoslangan grant (Interfaculty Financial Aid Committee). Ariza oynasi **e'lon qilinadigan davrda** ochiladi, qabul arizasidan keyin e-mail orqali xabar beriladi. Faqat qabul qilinganlarga, faqat to'liq arizalarga; birinchi bakalavrga ustuvorlik. Work-study: oyiga 50 soat → kontraktning **10 %**. Donor stipendiyalari — 2.2 o'rtacha talab qiladi. **O'rtacha grant 2021-22 da ~USD 7 800** |
| **690** TU Wien | "TU Wien Scholarships", uydirma **USD 450**, "Sep 5 / Feb 5", 3 daraja | **"Helmut Veith Stipend"** — **EUR 6 000/yil, 2 yilgacha + kontrakt bekor**. Cheklovlar: **faqat ayollar**, **faqat Informatika** ingliz tilidagi magistratura. Muddat **30-noyabr**. Muhim kontekst: Avstriyada nodavlat fuqaro **semestrga EUR 726.72** to'laydi (birinchi semestrdan), O'zbekiston "Annex 1" imtiyoz ro'yxatida **yo'q**, qolgan TU Wien stipendiyalari esa Avstriya/EEA maqomini talab qiladi |
| **553** Charles University | "Charles University Scholarships", uydirma **USD 2 125**, "Apr 30" | **"Computer Science Tuition Fee Scholarships (CSTFS)"** — kontraktni **to'g'ridan-to'g'ri qoplaydi**: **EUR 7 100/yil** (nodavlat) yoki EUR 4 200 (EI), bakalavrda **3 yil** → **EUR 21 600** gacha. 6 bakalavr + 2 magistratura o'rni. Ariza: SIS + to'lov, keyin **erkin shakldagi e-mail** va **2 tavsiyanoma** (referi o'zi yuboradi). Muddat **30-aprel**, natija **31-may**. Muhim: **chex tilidagi dasturlar har qanday fuqaroga bepul**; Chexiya hukumat stipendiyasi O'zbekistonni qamramaydi |

`university_scholarships`: **292**, **249**, **128**, **187** yangilandi.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Uydirma USD summalar** | 590 (20 000), 535 (5 875), 690 (450), 553 (2 125) | `amount_usd_value = 0`; `award_currency` — **HKD / USD / EUR / EUR**; KAU/HKBU kabi holatlarda award_amount mahalliy valyutada |
| 2 | **"To'liq kontrakt" da'vosi** | 535, 690, 553 | AUB — ehtiyojga asoslangan grant (chegara yo'q); TU Wien — stipendiya + bekor; Charles — kontrakt bekor qilish |
| 3 | **Daraja darajalari** | 590 (3 daraja), 690 (3 daraja), 553 (3 daraja) | HKBU — **faqat bakalavr**; TU Wien — **faqat magistratura (ayollar)**; Charles CSTFS — bakalavr + magistratura |
| 4 | **Muddat o'ylab topilgan** | 590 ("Jan 15"), 535 ("Jan–Feb/Sep–Oct"), 690 ("Sep 5/Feb 5"), 553 ("Apr 30") | HKBU — ariza yo'q (`automatic`); AUB — `not_published` (e'lon qilinadigan oyna); TU Wien — **30-noyabr**; Charles — **30-aprel 2026** |
| 5 | **Uydirma IELTS/GPA** | hammasi | `min_ielts = NULL`, `min_gpa = NULL` — hech bir sahifa bunday talab qo'ymaydi |
| 6 | **Kontekst yo'qligi** | 690, 553 | TU Wien'da nodavlat talaba semestrga EUR 726.72 to'laydi va O'zbekiston imtiyoz ro'yxatida yo'q; Charles'da chex tilidagi dastur bepul, Chexiya hukumat stipendiyasi esa O'zbekistonni qamramaydi. Ikkalasi ham matnda va `notes`da ochiq |
| 7 | **Ikki rasmiy raqam ziddiyati** | 690 | TU Wien Informatika sahifasi **EUR 6 000**, markaziy sahifa **EUR 7 000** deydi — ziddiyat yechilmay, qator ichida qayd etildi |
| 8 | **Manba — yalang'och domen** | hammasi | Endi real ochilgan sahifalar (pastda) |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 46 oxiri | Pass 47 oxiri |
|---|---|---|
| Shablon tavsifli qatorlar | 9 | **5** |
| Yalang'och domenli `website_url` | 70 | **66** |
| Faol stipendiyalar | 562 | **562** |
| Nafaqaga chiqarilganlar | 104 | **104** |

Navbatda **5** qator qoldi: Argentina 693, Braziliya 777, Kolumbiya 712, Qozog'iston 534, Tailand 555.

---

## 4. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (4 qator) | hammasi `false`, shu jumladan `application_url` formati |

---

## 5. Manbalar (2026-10-25 da ochilgan)

`admissions.hkbu.edu.hk/fees-and-scholarships.html` · `aub.edu.lb/faid/Pages/default.aspx` · `informatics.tuwien.ac.at/study-services/scholarships` · `tuwien.at/en/studies/admission/students-union-fee-and-tuition-fee/tuition-fee` · `mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026`

Ochilmagan: `tuwien.at/en/studies/studying-at-tu-wien/study-grants/helmut-veith-stipendium` (**404** — sahifa ko'chirilgan; o'rniga Informatika sahifasi ishlatildi).

SQL: `supabase/scholarship_rewrite_pass47_2026-10-23.sql`
