# ScholarBridgeAi — Stipendiyalarni qayta yozish, 32-pass: Avstraliya

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 10 qator qayta yozildi, 10 ta `university_scholarships` kartasi yangilandi. O'chirilgan qator yo'q.
Bu pass bilan **Avstraliya klasteri yopildi**: Avstraliyada qolgan shablon qator **10 → 0**.

---

## 1. Klasterning asosiy xulosasi

Avstraliyaning davlat universitetlarida xalqaro bakalavr uchun grant deyarli doim **o'qish to'lovining foizi** (20–50%), dollar summasi emas. Oldingi 10 qatorning barchasi buni teskari ko'rsatgan: har biriga o'ylab topilgan USD 25 000–30 000 qo'yilgan, muddat esa «oktabr–dekabr» deb taxmin qilingan. Aslida ko'pchilikda **ariza umuman yo'q** — ya'ni muddat ham yo'q.

Shu sababli bu passda 10 qatorning hammasida:
- `amount_usd_value = 0`, `award_amount = NULL`, `award_currency = 'AUD'`;
- `coverage_type = 'Partial Tuition'`, `award_basis = 'variable'`;
- `deadline_type` haqiqiy mexanizmga qarab: `automatic`, `rolling`, `fixed` yoki `not_published`;
- `notes`da provayder foizda narxlagani va nima uchun summa bo'sh qoldirilgani yozilgan.

---

## 2. Aniqlangan kamchiliklar

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 533 | **Adelaide** | «Global Academic Excellence», USD 30 000, Full Tuition | **Universitetning o'zi yo'q** — Adelaide University (Adelaide + UniSA qo'shilgan). **50%** grant (ATAR 99 / GPA 6.7), pastda avtomatik 25% / 15% / 10% |
| 561 | **Curtin** | «Curtin International Scholarships», USD 27 000 | **John Curtin Global Excellence — 40%**, pastda 20%, plus A$10 000 va A$15 000 bir martalik kreditlar |
| 564 | **Deakin** | USD 27 000 | **25%** (Excellence), 20% (Merit), yuqorida **100% yoki 50%** (VC, alohida ariza) |
| 584 | **Griffith** | «Remarkable», USD 26 000 | Jonli grant — **Vice Chancellor International, 50%**, GPA **6.0** (Remarkable'da 5.5), muddat **28-noyabr 2026** |
| 613 | **La Trobe** | USD 27 000 | **High Achiever: WAM 60–74.9 → 20%, WAM 75+ → 25%**, avtomatik |
| 619 | **Macquarie** | College granti, USD 28 000 | **VC International — AUD 10 000 gacha**, yil bo'yi ochiq, to'liq offer + qisqa ariza |
| 660 | **QUT** | USD 26 000, 25–50% | **25% har semestr**, avtomatik, Health fakultetida faqat 2 semestr |
| 664 | **RMIT** | «International Excellence», USD 26 000 | **Academic Merit Scholarship for Central Asia and Mongolia — 20%**, ro'yxatda **O'zbekiston bor** |
| 751 | **Newcastle** | USD 28 000 | **20% yillik to'lovdan**, 500 o'rin, avtomatik |
| 768 | **Wollongong** | «UG Merit», USD 25 000 | **University Excellence — 30%**, avtomatik, cheklanmagan |

---

## 3. Eng qimmatli topilmalar

**a) RMIT — O'zbekiston nomma-nom yozilgan.** `Academic Merit Scholarship for Central Asia and Mongolia` aynan Qozog'iston, Qirg'iziston, Tojikiston, Turkmaniston, **O'zbekiston** va Mongoliya fuqarolariga 20% beradi. Shartlari qattiq: offshore ariza, GPA 2.5 / 70% / ATAR 75, **Semester 1 2027** offeri, **EOI forma**, birinchi kelgan oladi va offerdan keyin **14 kun** ichida qabul + depozit. `eligible_countries` 6 davlatga toraytirildi.

**b) Adelaide endi boshqa universitet.** University of Adelaide + UniSA = **Adelaide University**. Eski qator mavjud bo'lmagan muassasa va mavjud bo'lmagan grant nomini saqlab kelgan. Yangi narvon: 50% (ariza bilan) / 25% / 15% / 10% (avtomatik).

**c) Griffith'da ikki xil 50% bor.** Jonli va tasdiqlangan yo'l — **Vice Chancellor International** (GPA 6.0, trimester bo'yicha yopilish: 28-noyabr 2026 va 10-aprel 2027). **Remarkable** ham 50% deb e'lon qilingan, lekin uning sahifasi 2023 yilgi hujjatni qaytaradi va "yangi arizachilarga yopiq" deb turadi — shuning uchun 2027 yo'li sifatida qabul qilinmadi.

**d) «Ariza yo'q» — muddat yo'q.** QUT, Newcastle, Wollongong, La Trobe va Macquarie'da grant qabul arizasi bilan avtomatik beriladi. Eski qatorlardagi «oktabr–dekabr» sanalari shunchaki taxmin edi.

**e) Foiz — dollar emas.** Beshta universitet (La Trobe, Newcastle, Griffith, RMIT, Wollongong) grantni faqat foizda e'lon qiladi. Shu sababli `amount_usd_value = 0` — bu "ma'lumot yo'q" emas, "provayder summani e'lon qilmaydi" degani.

---

## 4. `university_scholarships` kartalari

10 ta karta (179, 199, 203, 227, 213, 115, 297, 106, 281, 133) yangi nom, foiz qiymati, izoh va tasdiqlangan `official_url` bilan yangilandi.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 31 oxiri | Pass 32 oxiri |
|---|---|---|
| Shablon tavsiflar | 77 | **67** |
| Yalang'och domen `website_url` | 136 | **126** |
| Faol stipendiyalar | 573 | **573** |
| Avstraliyada qolgan shablon qatorlar | 10 | **0** |
| Avstraliya bo'yicha faol qatorlar | 41 | **41** |

Qayta yozilgan qatorlar jami: 148 → **158** (573 faol qatordan 27.6%).

---

## 6. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 10 qator uchun qattiq tekshiruv (`bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`) — **hammasi `false`**

---

## 7. Manbalar (2026-10-25 da ochilgan)

`adelaide.edu.au/study/scholarships/international-students-scholarships/` · `adelaide.edu.au/study/scholarships/int/adelaide-academic-excellence-scholarship-50/` · `curtin.edu.au/study/scholarships/international-scholarships/` · `deakin.edu.au/international-students/international-student-scholarships` · `griffith.edu.au/international/scholarships-finance/scholarships/vice-chancellors-international-scholarship` · `latrobe.edu.au/study/scholarships/other/la-trobe-high-achiever-scholarship` · `latrobe.edu.au/international/applying/scholarships` · `mq.edu.au/study/admissions-and-entry/scholarships/international/vice-chancellor-s-international-scholarship/` · `qut.edu.au/study/fees-and-scholarships/scholarships/international-merit-scholarship` · `qut.edu.au/study/international/scholarship-opportunities` · `rmit.edu.au/scholarships/international-scholarships` · `rmit.edu.au/scholarships/international-scholarships/academic-merit-scholarship-central-asia-mongolia` · `newcastle.edu.au/scholarships/international-scholarships` · `newcastle.edu.au/scholarships/UNI_053` · `uow.edu.au/study/scholarships/international/university-excellence-scholarships/` · `uow.edu.au/study/international/representatives/international-entry-requirements/`

---

## 8. Keyingi navbat

1. **Kanada (8 qator)** — keyingi pass.
2. **Hindiston (6)**, **Ispaniya (4)**, **Shveytsariya (4)**, keyin Belgiya / Indoneziya / Norvegiya / Tayvan / Chili.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
