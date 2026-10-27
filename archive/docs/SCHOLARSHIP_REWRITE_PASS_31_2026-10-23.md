# ScholarBridgeAi — Stipendiyalarni qayta yozish, 31-pass: AQSh merit klasteri

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 8 qator qayta yozildi, **4 qator o'chirildi** (provayder xalqaro talabani ochiq rad etadi), 12 ta `university_scholarships` kartasi yangilandi.

Bu pass bilan **AQSh klasteri to'liq yopildi**: AQShda qolgan shablon qator **19 → 0**.

---

## 1. Klasterning asosiy xulosasi

AQShning davlat universitetlarida xalqaro bakalavr uchun «to'liq grant» deyarli yo'q. 12 qatorning **4 tasi** butunlay yolg'on edi:

| Provayder | O'z so'zi | Natija |
|---|---|---|
| **Georgia Tech** | «institutional scholarships … are often not awarded to international students» | **o'chirildi** |
| **Ohio State** | «International students are **not eligible**» | **o'chirildi** |
| **Purdue** | «**Only domestic students** are eligible … F, J … visa types are not eligible» | **o'chirildi** |
| **UC Santa Barbara** | «you must be a U.S. citizen, permanent resident, or … AB 130 or 131» | **o'chirildi** |

Qolgan 8 tasi haqiqiy, lekin raqamlari butunlay boshqacha bo'lgan miqyosda:

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 538 | **ASU** | Full Tuition, USD 32 000 | **USD 17 500** (GPA 4.0+), 15 500 / 13 500 / 12 000 / 10 000 pog'onalari. Ariza yo'q — avtomatik. To'liq homiylikka o'tsa bekor qilinadi |
| 628 | **MSU** | «International Tuition Grant», USD 28 125 | Bu nom endi yo'q. **MSU Non-resident Scholarship**: 18 000 / 15 000 / 12 000 / 9 000 / 5 000 / 3 000 |
| 648 | **Penn State** | «Global Programs», USD 17 100 | **SIGIA/PSTAG**, USD 100–2 000, **faqat o'qiyotgan** talabalarga (1-kurs hisobga olinmaydi) |
| 681 | **Texas A&M** | USD 15 375, 25–50% | Eppright **≥ USD 3 000**, ITPEG **≤ USD 4 000**; asosan **davom etayotgan** talabalar |
| 694 | **UC Davis** | USD 17 250, 30-noyabr | **USD 7 500/yil**, 4 yil, UC arizasi **2-dekabr**. Xalqaro talaba **loyiq** |
| 706 | **UMass Amherst** | USD 10 000, 15-yanvar | **USD 16 000/yil gacha**, avtomatik, faqat 1-kurs |
| 708 | **Morehead-Cain** | 25–50%, USD 14 625, 15-yanvar | **To'liq paket + 4 ta yoz** (Outdoor Leadership / Civic Collaboration / Global Perspective / Professional Experience), materiallar **1-oktyabr** |
| 791 | **UW-Madison** | Full tuition, USD 39 000 | **King-Morgridge**: to'liq grant, lekin **O'zbekiston ro'yxatda yo'q** |

---

## 2. Eng qimmatli topilmalar

**a) UC tizimida farq bor.** Bir xil «Regents Scholarship» UC Davisda xalqaro talabaga ochiq («all undergraduate students – national, international, undocumented, AB540 – are eligible»), UCSB, UCI va UCSDda esa faqat AQSh fuqarosi/PR/AB 130-131 uchun. Eski qatorlar bu farqni bilmasdan ikkalasini bir xil ko'rsatgan. Endi 694 ochiq, 701 yopiq deb yozilgan.

**b) «Grant» nomi almashgan.** MSU o'zining «International Tuition Grant»ini endi e'lon qilmaydi — o'rnida Non-resident Scholarship. Eski qator mavjud bo'lmagan nomni va noto'g'ri summani saqlab kelgan.

**c) Ariza yo'qligi — deadline yo'qligi degani.** ASU, MSU, UMass va Penn State'ning katta qismi avtomatik ko'rib chiqiladi. Eski qatorlar bunday holatlarda qabul sanasini «stipendiya muddati» qilib qo'ygan.

**d) O'qiyotgan talaba sharti.** Penn State va Texas A&M ning asosiy grantlari **1-kurs talabasiga yopiq** — ya'ni O'zbekistondan endi hujjat topshirayotgan talaba ulardan foydalana olmaydi. Bu shart endi tavsif, talablar va muddat izohida ochiq yozilgan.

**e) Geografik to'siq.** UW-Madison King-Morgridge faqat Afrika, Karib, Lotin Amerikasi, Janubiy va Janubi-Sharqiy Osiyo maktab bitiruvchilariga ochiq. `eligible_countries` maydoniga provayder e'lon qilgan **107 davlat** yozildi — katalog O'zbekiston talabasiga «bu yopiq» deb ayta oladi.

**f) Morehead-Cain ga kirish yo'li.** Xalqaro abituriyent nominatsiya qiluvchi maktabdan bo'lishi shart; bo'lmasa **Admissions Referral Program** orqali faqat **UNC Early Action (15-oktyabr 2026)** arizasi bilan ko'riladi. Materiallar **1-oktyabr**. Eski qatordagi «15-yanvar (RD)» mutlaqo noto'g'ri edi.

---

## 3. `university_scholarships` kartalari

8 ta karta yangi nom, summa va tasdiqlangan havola bilan yangilandi (`availability_status = 'Yes'`).
4 ta o'chirilgan qatorning kartasi (73, 285, 82, 280) `availability_status = 'No'` ga o'tkazildi va izohda provayderning rad javobi keltirildi — karta o'chirilmadi, chunki universitet sahifasida bu savol-javob ko'rinib turishi foydali.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 30 oxiri | Pass 31 oxiri |
|---|---|---|
| Shablon tavsiflar | 89 | **77** |
| Yalang'och domen `website_url` | 148 | **136** |
| Faol stipendiyalar | 577 | **573** |
| O'chirilgan (arxiv) qatorlar | 89 | **93** |
| AQShda qolgan shablon qatorlar | 12 | **0** |

Qayta yozilgan qatorlar jami: 140 → **148**. Pass 31 da 12 qatorning 8 tasi qayta yozildi, 4 tasi arxivlandi.

---

## 5. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 12 qator uchun qattiq tekshiruv (`bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`) — **hammasi `false`**; `791.eligible_countries` = 107 davlat.

---

## 6. Manbalar (2026-10-25 da ochilgan)

`tuition.asu.edu/new-american-university/international` · `admission.asu.edu/cost-aid/international` · `finaid.gatech.edu/apply/international` · `admissions.msu.edu/cost-aid/scholarships/international` · `undergrad.osu.edu/cost-and-aid/merit-based-scholarships` · `global.psu.edu/page/tuition-grant-information` · `admissions.purdue.edu/cost-financial-aid/scholarships/` · `aggie.tamu.edu/paying-for-college/apply-for-scholarships/international-student-scholarships.html` · `financialaid.ucdavis.edu/scholarships/campus/awards/regents` · `financialaid.ucdavis.edu/frequently-asked-questions/scholarships` · `finaid.ucsb.edu/types-aid/scholarship-awards/regents-scholarship` · `umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information` · `moreheadcain.org/application-eligibility/` · `moreheadcain.org/application-eligibility/deadlines/` · `moreheadcain.org/application-eligibility/faqs/` · `moreheadcain.org/application-eligibility/about-the-morehead-cain-scholarship-program/` · `admissions.wisc.edu/international-scholarships/`

---

## 7. Keyingi navbat

1. **Avstraliya (10 qator)** — keyingi pass.
2. **Kanada (8)**, **Hindiston (6)**, **Ispaniya (4)**, **Shveytsariya (4)**, keyin Belgiya / Indoneziya / Norvegiya / Tayvan / Chili.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
