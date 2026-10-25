# ScholarBridgeAi — Stipendiyalarni qayta yozish, 33-pass: Kanada

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 8 qator qayta yozildi, 8 ta `university_scholarships` kartasi yangilandi. O'chirilgan qator yo'q.
Bu pass bilan **Kanada klasteri yopildi**: Kanadada qolgan shablon qator **8 → 0**.

---

## 1. Klasterning asosiy xulosasi

Kanada universitetlari o'z mukofotlarini **kanada dollarida aniq raqam bilan** e'lon qiladi — Avstraliyadan farqli. Shuning uchun bu passda `award_amount` va `award_currency = 'CAD'` haqiqiy qiymatga ega, `amount_usd_value` esa 0 bo'lib qoldi (ilova faqat USD bo'lganda konvertatsiya qiladi).

Eski 8 qatorning umumiy xatosi: **har biriga o'ylab topilgan USD 21 000–63 000** qo'yilgan va grant nomi ko'pincha mavjud bo'lmagan. Aslida Kanada grantlari ikki turga bo'linadi — **avtomatik** (arizasiz) va **arizali** — va eski qatorlar bu farqni ko'rsatmagan.

---

## 2. Aniqlangan kamchiliklar

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 562 | **Dalhousie** | USD 21 000, 1-aprel | **2 000+ grant portfeli**, CAD 1 000–80 000; bitta umumiy ariza, muddat **15-fevral 2027** |
| 622 | **McMaster** | USD 40 000, muddat yo'q | **Award of Excellence — CAD 200 000** 4 yilga; ariza **1-noyabr 2026 → 19-fevral 2027** |
| 659 | **Queen's** | USD 38 000, 1-fevral | **Dean's International Award**: fakultet bo'yicha 5–25 ming/yil, 4 yilga yangilanadi (maks. **CAD 100 000**), **arizasiz** |
| 721 | **Alberta** | USD 21 500, «yanvar–mart» | **International Admission Scholarship — CAD 10 000**, avtomatik. Katta grant — **President's International Distinction, CAD 120 000** |
| 729 | **Calgary** | USD 21 000, 1-mart | **CAD 20 000/yil**, 4 yilga yangilanadi (**CAD 80 000**), faqat **2 ta** o'rin, GPA 2.60 |
| 753 | **Ottawa** | USD 31 000, 1-aprel | **CAD 7 500/semestr → CAD 60 000**; qo'shilsa **70 000**; **cheklanmagan**, avtomatik |
| 767 | **Waterloo** | USD 63 000, Full Tuition | **CAD 10 000**, faqat 1-kurs, **arizasiz va cheklanmagan** |
| 790 | **Western** | USD 32 000, 15-yanvar | **3 × CAD 100 000** (25 000/yil × 4) + Neen Hodgins; maktab nominatsiyasi shart |

---

## 3. Eng qimmatli topilmalar

**a) Kanada — «to'liq grant» deyarli yo'q, lekin olti xonali raqamlar bor.** McMaster CAD 200 000, Alberta CAD 120 000, Western va Queen's CAD 100 000. Bu Avstraliya va AQSh davlat universitetlaridan ancha saxiyroq.

**b) Ikki xil mexanizm.** Waterloo, Ottawa, Queen's va Alberta'ning asosiy grantlari **arizasiz** — qabul arizasi bilan avtomatik. McMaster, Western, Calgary va Alberta'ning katta grantlari esa **alohida ariza + maktab nominatsiyasi** talab qiladi. Eski qatorlar bu farqni yashirgan.

**c) Aniqlangan nomuvofiqliklar (yashirilmadi, `notes`da yozildi):**
- **Alberta**: xalqaro sahifada muddat **10-yanvar 2027**, entrance-scholarships sahifasida **15-fevral 2027**. Xavfsiz sana — 10-yanvar.
- **Waterloo**: istisnolar ro'yxatida «offerini keyingi yilga ko'chirganlar» chiqarilgan, lekin xuddi shu sahifaning FAQ'i «ko'chirish huquqni saqlaydi» deydi. Qarama-qarshilik qayd etildi.
- **Alberta**: universitetning o'zi «biz to'liq grant bermaymiz» deb yozadi.

**d) O'zbekistonga yopiq grantlar ajratildi.** Ottawa'ning CAD 100 000 gacha bo'lgan Entrance/Excellence grantlari faqat **Afrika, Janubi-Sharqiy Osiyo va AQSh** talabalariga; Alberta'ning May Quon granti faqat **Xitoy/Gonkong** fuqarolariga. Bu tavsifda ochiq yozilgan.

---

## 4. `university_scholarships` kartalari

8 ta karta (255, 138, 146, 63, 110, 168, 64, 200) yangi nom, CAD qiymati, izoh va tasdiqlangan `official_url` bilan yangilandi.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 32 oxiri | Pass 33 oxiri |
|---|---|---|
| Shablon tavsiflar | 67 | **59** |
| Yalang'och domen `website_url` | 126 | **118** |
| Faol stipendiyalar | 573 | **573** |
| Kanadada qolgan shablon qatorlar | 8 | **0** |
| Kanada bo'yicha faol qatorlar | 26 | **26** |

Qayta yozilgan qatorlar jami: 158 → **166** (573 faol qatordan 29.0%).

---

## 6. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 8 qator uchun qattiq tekshiruv (`bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`) — **hammasi `false`**

---

## 7. Manbalar (2026-10-25 da ochilgan)

`dal.ca/admissions/scholarships-financial-aid/scholarships/future-undergraduate-student-awards.html` · `future.mcmaster.ca/internationalawards/` · `registrar.mcmaster.ca/entrance-awards/` · `queensu.ca/registrar/financial-aid/specific-students/international` · `queensu.ca/registrar/financial-aid/no-application-required/future-students/automatic-awards` · `ualberta.ca/en/admissions/tuition-and-scholarships/international-entrance-scholarships/index.html` · `ualberta.ca/en/admissions/tuition-and-scholarships/entrance-scholarships/index.html` · `ucalgary.ca/registrar/awards/university-calgary-international-entrance-scholarship` · `ucalgary.ca/registrar/awards/university-calgary-international-entrance-award` · `uottawa.ca/study/fees-financial-support/international-english-scholarship` · `uottawa.ca/study/fees-financial-support/scholarships-awards-overview` · `uwaterloo.ca/future-students/financing/international-scholarships` · `registrar.uwo.ca/student_finances/scholarships_awards/admission/national_scholarship_program.html`

---

## 8. Keyingi navbat

1. **Hindiston (6 qator)** — keyingi pass.
2. **Ispaniya (4)**, **Shveytsariya (4)**, keyin Belgiya / Indoneziya / Norvegiya / Tayvan / Chili.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
