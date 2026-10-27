# ScholarBridgeAi — Stipendiyalarni qayta yozish, 34-pass: Hindiston (IIT tizimi va IISc)

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 5 qator qayta yozildi, 1 qator arxivlandi, 6 ta `university_scholarships` kartasi yangilandi.
Bu pass bilan **Hindiston klasteri yopildi**: Hindistonda qolgan shablon qator **6 → 0**.

---

## 1. Klasterning asosiy xulosasi

Bu passda raqamlar emas, **butun model noto'g'ri** bo'lgan. Olti qator ham «IIT X Scholarships — USD 2 375» yoki «USD 9 000» deb yozilgan, ya'ni **bakalavriatga ochiq, dollar bilan o'lchanadigan stipendiya** taassurotini bergan. Tekshiruv uchta tuzatishni ko'rsatdi:

1. **IITlar DASA dasturida qatnashmaydi.** DASA faqat NIT, IIIT, IIEST va SPA uchun. IITlarga xalqaro talaba **JEE Advanced** yoki institut portal orqali kiradi.
2. **Xalqaro talaba bakalavriatda kamroq emas, ko'proq to'laydi.** IIT Delhi'da 2025-yilgi qabul uchun xorijiy talaba o'qish to'lovi **SAARC uchun USD 1 000/semestr, boshqalar uchun USD 2 000/semestr**; IIT Madras'da xorijiy talabaning BTech to'lovi **INR 5 68 000** atrofida, hind talabasi uchun esa 0–1 00 000. Ya'ni eski qatorlar **teskari** ma'lumot bergan.
3. **Haqiqiy pul — magistratura va doktoranturada, oylik assistentlik ko'rinishida.** Va u hind talabasi bilan bir xil stavkada.

---

## 2. Aniqlangan kamchiliklar

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 595 | **IIT Kanpur** | USD 2 375, 3 daraja | **Institute Fellowship** — hind tadqiqotchisi bilan bir xil oylik; **faqat PG/PhD** (MTech, MBA, MS(R), PhD). Ariza va GATE to'lovi bekor. Study in India orqali **USD 3 200** gacha grant |
| 596 | **IIT Kharagpur** | USD 2 375 | **Arxivlandi** — institut xorijiy talabalar uchun o'z stipendiyasini e'lon qilmaydi; yo'llar ICCR/SII/DIA (davlat dasturlari) |
| 597 | **IIT Madras** | USD 2 375 | **Qiymat e'lon qilinmagan.** ICCR yo'li bor, «IIT-M GE Scholarship» nomi bor, lekin summa/shart/muddat yo'q. Ariza beruvchilarning ~10% offer oladi, ulardan ~20% grant oladi |
| 598 | **IIT Bombay** | USD 9 000, 3 daraja | **FRN-TA**: INR 31 000/oy (2 yil) → 35 000, 5 yilgacha. **FRN-SF (self-financed) kategoriyasida assistentlik YO'Q** |
| 599 | **IIT Delhi** | USD 9 000, 3 daraja | **Barcha xorijiy PhD talabalarga TA: INR 37 000/oy → 42 000.** MTech/MDes/MS(R) uchun cheklangan 12 400/oy. **PG/PhD to'lovi hind talabasi bilan bir xil** |
| 601 | **IISc** | USD 2 375, 3 daraja | **To'liq paket:** INR 37 000 → 42 000/oy (PhD), 12 400/oy (MTech R) **+ yotoqxona**. Ariza to'lovi yo'q. Integrated PhD yopiq |

---

## 3. Eng qimmatli topilmalar

**a) IISc — klasterdagi eng yaxshi taklif.** IISc o'z sahifasida ochiq yozadi: tanlangan xorijiy talabaga **yotoqxona va hind talabasi bilan bir xil stipendiya** beriladi, bu odatda o'qish, yotoqxona, ovqat va yashash xarajatlarini qoplaydi. Ariza to'lovi yo'q. Faqat PhD (Science/Engineering) va MTech (Research); **integrated PhD xorijiy talabalarga yopiq**.

**b) IIT Bombay'da ikkita o'xshash kategoriya — biri pulsiz.** `FRN-TA` assistentlik beradi, `FRN-SF` (self-financed) esa **hech narsa bermaydi**. Bu farq eski qatorda umuman yo'q edi va u to'g'ridan-to'g'ri pulga ta'sir qiladi.

**c) IIT Delhi — PG/PhD to'lovi hind talabasi bilan bir xil.** Ya'ni xorijiy doktorant nafaqat stipendiya oladi, balki bakalavriatdagi yuqori «xorijiy» tarifni ham to'lamaydi.

**d) Provayderning o'z ichida nomuvofiqlik.** IIT Bombay brochure'sida FRN-TA stavkasi **31 000/35 000**, joriy akademik sahifasida esa MoE TA stavkasi **37 000/42 000**. Ikkalasi ham `notes`da yozildi, «chiroyli» raqam tanlanmadi.

**e) IIT Madras'ni yashirmadik.** Institut o'z nomida «IIT-M GE Scholarship» sxemasini tilga oladi, lekin **summa, shart va muddat e'lon qilmaydi**. Shuning uchun `coverage_type = Unspecified`, summa NULL, va tavsifda bu ochiq yozilgan.

---

## 4. `university_scholarships` kartalari

6 ta karta yangilandi: 293, 288, 169, 105, 286 (`Yes`) va 287 (Kharagpur — `No`).

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 33 oxiri | Pass 34 oxiri |
|---|---|---|
| Shablon tavsiflar | 59 | **53** |
| Yalang'och domen `website_url` | 118 | **112** |
| Faol stipendiyalar | 573 | **572** |
| Arxiv qatorlar | 93 | **94** |
| Hindistonda qolgan shablon qatorlar | 6 | **0** |

Qayta yozilgan qatorlar jami: 166 → **171** (572 faol qatordan 29.9%).

---

## 6. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 6 qator uchun qattiq tekshiruv — **hammasi `false`**

---

## 7. Manbalar (2026-10-25 da ochilgan)

`iitk.ac.in/oir/scholarship` · `iitk.ac.in/oir/how-to-apply` · `iitk.ac.in/doaa/pgadmission/foreign-students.php` · `iitkgp.ac.in/scholarships` · `iitkgp.ac.in/assistantships` · `ge.iitm.ac.in/programs/student-inbound/mtech` · `ge.iitm.ac.in/programs/student-inbound/ms-phd` · `ge.iitm.ac.in/programs/student-inbound/scholarships` · `research.iitm.ac.in/brochure/admissions_for_foreign_nationals.pdf` · `fees.iitm.ac.in` (2026 fee circular) · `acad.iitb.ac.in/admissions/research` · `iitb.ac.in` foreign national brochure · `international.iitd.ac.in/78-2/` · `intladm.iitd.ac.in/eligibility-criteria` · `academics.iitd.ac.in/postgraduate-academic-rules` · `home.iitd.ac.in` fee structure PDF · `oir.iisc.ac.in/index.php/iisc-full-time-international-research-programmes/` · `oir.iisc.ac.in` FAQs · `iisc.ac.in/admissions/fees-and-scholarships`

---

## 8. Keyingi navbat

1. **Ispaniya (4 qator)** — keyingi pass.
2. **Shveytsariya (4)**, keyin Belgiya / Indoneziya / Norvegiya / Tayvan / Chili.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
