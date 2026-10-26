# ScholarBridgeAi — stipendiyalarni qayta yozish, 53-pass (Britaniya dumlari, 4-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — 1 qator qayta yozildi, 1 qator halol holatga keltirildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **314** Durham | "Durham Doctoral Studentship Award", uydirma **USD 40 000**, "January 15", 3 daraja, katalog havolasi | **"PhD Studentships in Transformative Humanities (Durham University)"** — AHRC Doctoral Landscape Award + ikki fakultet. **Jami 11 ta o'rin**, va eng muhim raqam: **9 tasi home, faqat 2 tasi overseas** (xalqaro tarif). Har birida: **kontrakt bekor + UKRI darajasidagi stipendiya 3.5 yil** (7 yil part-time), qo'shimcha mablag' va AHRC Northern Hub a'zoligi. Talab: **qabul qilingan** PhD, ikki bo'lim hamkorligi. Hujjatlar: 1000 so'zlik taklif, 2 betlik CV, teng imkoniyatlar formasi, 2 referi. **Muddat: 15-yanvar 2027, 12:00 (UK)** |
| **337** Nottingham | "Nottingham Research Excellence Scholarship", uydirma **USD 39 000**, "January 25" | **Halol holatga keltirildi** — sahifa **404**. Nottingham'ning xalqaro tadqiqot sahifasida faqat **2 ta sxema** bor: **CSC** (faqat Xitoy fuqarolari) va **Commonwealth PhD** (faqat Hamdo'stlik davlatlari). **O'zbekiston ikkalasiga ham kirmaydi** → qolganlar uchun faqat funding search |

`university_scholarships`: **570** yangilandi, **582** → `No`.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Mavjud bo'lmagan nom** | 314, 337 | Durham'da "Doctoral Studentship Award", Nottingham'da "Research Excellence Scholarship" degan umumiy mukofot **yo'q** |
| 2 | **Yashirilgan eng muhim raqam** | 314 | Durham'da 11 o'rindan **faqat 2 tasi** xalqaro — bu qator oldin aytmagan |
| 3 | **Milliy cheklov yashirilgan** | 337 | Nottingham'ning ikkala sxemasi ham O'zbekistonni qamramaydi |
| 4 | **Uydirma USD** | 314 (40 000), 337 (39 000) | → `0`, `award_currency = 'GBP'` |
| 5 | **Muddat** | 314 ("Jan 15"), 337 ("Jan 25") | Durham — **15-yanvar 2027, 12:00 UK**; Nottingham — `not_published` |
| 6 | **Daraja** | 314 (3 daraja) | → **faqat PhD** |
| 7 | **Uydirma IELTS/GPA** | ikkalasi | → `NULL` |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 52 oxiri | Pass 53 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 221 | **219** |
| shundan Britaniya | 21 | **19** |
| Yalang'och domenli `website_url` | 61 | **61** |
| Faol stipendiyalar | 559 | **559** |
| Nafaqaga chiqarilganlar | 107 | **107** |

---

## 4. Keyingi qadam

Qolgan **19 Britaniya qatori**: LSE (154), Leeds (312), Edinburgh (131, 53), KCL (145, 455), Southampton (318), Sheffield (333), Newcastle (362), St Andrews (327), Liverpool (385), Aberdeen Elphinstone (367), QUB (389), Aston (368), Essex (387), Kent (388), Birmingham (326), Imperial PhD (3), QMUL (498).

Keyin AQSh (63), Avstraliya (25), Kanada (15), va 61 yalang'och domen.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (2 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-26 da ochilgan)

`durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities/` · `nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/research-scholarships.aspx`

Ochilmagan: `nottingham.ac.uk/pgstudy/funding/research-excellence-scholarship` (**404**)

SQL: `supabase/scholarship_rewrite_pass53_2026-10-23.sql`
