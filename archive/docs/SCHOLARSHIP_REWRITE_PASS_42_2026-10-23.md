# ScholarBridgeAi — Stipendiyalarni qayta yozish, 42-pass: Nordik guruhi (Finlyandiya, Daniya, Shvetsiya)

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 4 qator qayta yozildi, 4 ta `university_scholarships` kartasi yangilandi. O'chirilgan qator yo'q.

---

## 1. Klasterning asosiy xulosasi

Nordik naqshi izchil va eski qatorlar aytganining **teskarisi**: EI/EEA tashqarisidagi talaba **yiliga EUR 13 000–18 000 yoki SEK 90 000–140 000** to'laydi, grantlar esa — **o'qish to'lovidan ozod qilish**, yashash xarajatlarini ataylab qoplamaydi. To'rt qatorning hammasi buni noto'g'ri narxlagan.

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 742 | **Helsinki** | USD 14 000, 3 daraja | **50% yoki 100% to'lovdan ozod**; ko'pchiligi **50%**; to'lov **EUR 13 000 / 15 000 / 18 000**; **yashash xarajati qoplanmaydi**; yiliga ≥55 ECTS |
| 733 | **Kopengagen** | USD 15 000, 15-mart | **Danish Government Scholarship** — ariza **yo'q**, qabulga ariza berganlar **avtomatik** ko'riladi; GPA chegarasi **90%** (Humanities, 2025 g'oliblar 98%), **85%** (Science); **15-yanvar** |
| 673 | **Stokgolm** | USD 12 000, 15-yanvar | **To'liq o'qish to'lovi** qoplanadi (**SEK 90 000 / 140 000**); yashash **yo'q**; **oldindan ariza yo'q** — aprelda forma yuboriladi |
| 739 | **Göteborg** | USD 12 500, 3 daraja | **Axel Adler**: to'lovdan ozod, **fuqarolik cheklovi YO'Q**; har dasturga 1 ta grant; yashash va yo'l **qoplanmaydi** |

---

## 2. Eng qimmatli topilmalar

**a) «Grant» aslida to'lovdan ozod qilish.** To'rttasi ham pul emas — **tuition waiver**. Ya'ni yashash xarajatlari uchun talaba alohida mablag' ko'rsatishi kerak. Helsinki buni ikki marta takrorlaydi.

**b) Helsinki'da ko'pchilik 50% oladi, 100% emas.** Universitet o'z sahifasida «waiverlar juda kam va ularning ko'pchiligi 50% ni qoplaydi» deb yozadi — eski qator esa to'liq grant taassurotini bergan.

**c) Kopengagenda ariza yo'q, lekin GPA hal qiladi.** Barcha EI bo'lmagan abituriyentlar avtomatik ko'riladi, ammo **Humanities** fakultetida GPA **90%** dan yuqori bo'lmasa umuman ko'rilmaydi (2025 g'oliblarda **98%**). Ustiga: qaror **to'lov hisob-fakturasidan keyin** (may o'rtasi) chiqadi — ya'ni grantga tayanib joyni qabul qilib bo'lmaydi.

**d) Stokgolmda «oldindan ariza yo'q».** Natijalar aprelda chiqqach universitet **o'zi forma yuboradi**; faqat birinchi raundda qabul qilinganlar va Stokgolmni **1-o'ringa** qo'yganlar ustuvor.

**e) Göteborg — fuqarolik cheklovi yo'qligi bilan ajralib turadi.** Ko'p Shvetsiya sxemalari davlat ro'yxati bilan cheklangan; **Axel Adler** esa «no restrictions on citizenship, accessible to students worldwide» deb yozadi.

---

## 3. `university_scholarships` kartalari

4 ta karta yangilandi: 182, 181, 134, 130. `covers_living_expenses` faqat Kopengagenda `true` (ba'zi fakultetlarda yashash granti bor), qolgan uchtasida `false` — bu farq endi kartada ko'rinadi.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 41 oxiri | Pass 42 oxiri |
|---|---|---|
| Shablon tavsiflar | 31 | **27** |
| Yalang'och domen `website_url` | 91 | **87** |
| Faol stipendiyalar | 566 | **566** |
| Arxiv qatorlar | 100 | **100** |

Qayta yozilgan / to'g'rilangan qatorlar jami: 191 → **195** (566 faol qatordan 34.5%).

---

## 5. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 4 qator uchun qattiq tekshiruv — **hammasi `false`**

---

## 6. Manbalar (2026-10-25 da ochilgan)

`helsinki.fi/en/admissions-and-education/apply-bachelors-and-masters-programmes/tuition-fees-and-scholarship-programme` · `ku.dk/studies/masters/application-and-admission/scholarships` · `ku.dk/studies/masters/application-and-admission/tuition-fees-and-scholarships` · `su.se/english/education/how-to-apply/costs-fees-and-scholarships/scholarships` · `su.se/english/education/how-to-apply/costs-fees-and-scholarships` · `gu.se/en/study-in-gothenburg/apply/scholarships-for-fee-paying-students/axel-adler-scholarship` · `gu.se` — School of Business scholarships · `gu.se` — tuition fees · `universityadmissions.se`

---

## 7. Keyingi navbat

Qolgan **27 shablon qator**: Fransiya (2), Irlandiya (2), Isroil (2), Meksika (2), Yangi Zelandiya (2), Qatar (2), Saudiya Arabistoni (2), JAR (2), BAA (2) va 11 ta yagona qator (Argentina, Avstriya, Braziliya, Kolumbiya, Chexiya, Gonkong, Qozog'iston, Livan, Tailand va boshqalar).
