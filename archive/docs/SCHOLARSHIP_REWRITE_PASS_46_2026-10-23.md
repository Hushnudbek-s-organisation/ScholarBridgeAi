# ScholarBridgeAi — stipendiyalarni qayta yozish, 46-pass (Janubiy Afrika + BAA)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Janubiy Afrika (2 qator) + BAA (2 qator) — 3 qator qayta yozildi, 1 qator nafaqaga chiqarildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **536** American University of Sharjah | "AUS Chancellor's Scholars Award & Merit Grants", "20–100 % Full Tuition", uydirma **USD 27 000**, 3 daraja, "Mar–Jun/Oct–Nov" | **"President's Scholarship and Merit Scholarships"** — BAA tashqarisida o'qigan nomzodlar uchun **aynan President's Scholarship**: **100 % kontrakt + laboratoriya**, ariza to'lovi bekor, **oylik stipendiya**, yotoqxona, **3 marta borish-kelish chiptasi**, tibbiy sug'urta. Talablar: **IELTS 7.0 / TOEFL iBT 94**, 3 A-level (A) + 5 GCSE (A), yoki IB ≥40, yoki 10–11-sinflarda 98 % + 3 AP (5) yoki SAT 1400; portfolios: esse, liderlik, **3 daqiqalik video**, 2 tavsiyanoma. **Fall 2027 muddati: 1 aprel 2027** |
| **549** Canadian University Dubai | "Full Tuition", uydirma **USD 15 000**, 3 daraja, "Rolling" | **"Academic Excellence and Talent Scholarships"** — o'rtacha bahoga qarab **20/30/40/50 %** (85–89.9 / 90–94.9 / 95–98.9 / 99 %+), qaytgan talabalar uchun 10 %; sport, moddiy qiyinchilik, alohida ehtiyoj va maxsus iqtidor uchun **40 % gacha**. Yangilash CGPA bandlari (3.85–3.98). Ariza **e-mail** orqali: **7-iyul** (kuz) / **20-dekabr** (bahor) |
| **672** Stellenbosch University | "Financial Aid", 25–50 % need-based chegirma, uydirma **USD 2 625**, 3 daraja, "Jun 30" | **"Postgraduate Scholarship Programme (PSP)"** — 2027 uchun: **honours R70 000–140 000**, **magistratura R75 000–150 000/yil** (2 yilgacha), **doktorantura R80 000–170 000/yil** (3 yilgacha), fakultet bo'yicha. Talablar: to'liq kunlik, haftasiga 20 soatdan ko'p ishlamaslik, oldingi darajada **65 %**, boshqa to'liq stipendiya yo'q, kamida 1 (magistratura) / 2 (PhD) maqola. Ariza **10-avgust – 30-sentabr 2026** (yopilgan). Xalqaro talabalar **qatnashishi mumkin** |
| **704** UCT | "UCT Financial Aid for International Students", uydirma **USD 2 750**, 3 daraja | **Nafaqaga chiqarildi** — universitet o'z sahifasida **2026 uchun xalqaro stipendiya chaqiruvi moliyaviy cheklovlar tufayli ochilmaganini** yozgan; sxema baribir to'liq kontrakt emas (honours R25 000 / magistratura R30 000 / PhD R35 000, qo'shimcha yordam). UCT merit/need mukofotlari faqat Janubiy Afrika fuqarolari uchun, NRF xalqarolarga 5 % partial-cost, Mastercard Foundation esa faqat Sahroi Kabirdan janubiy Afrika uchun |

`university_scholarships`: **205**, **231**, **263** yangilandi; **180** (UCT) → `No`.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Nomuvofiq mukofot nomi** | 536 | AUS'da xalqaro nomzod uchun **President's Scholarship** bor; **Chancellor's Scholarship** esa faqat BAA'da o'qiganlar uchun. O'zbekistonlik nomzod uchun bu farq hal qiluvchi |
| 2 | **To'liq kontrakt da'vosi** | 549, 672, 704 | CUD — 10–50 % chegirma; Stellenbosch — R150 000/yil stipendiya (kontrakt emas); UCT — qo'shimcha yordam. `coverage_type` mos ravishda **Partial Tuition / Partial Funding / Unspecified** |
| 3 | **Uydirma USD summalar** | 536 (27 000), 549 (15 000), 672 (2 625), 704 (2 750) | `amount_usd_value = 0`; `award_currency` — **AED** (BAA) va **ZAR** (Janubiy Afrika) |
| 4 | **Daraja darajalari** | 536, 549, 704 | AUS va CUD — **faqat bakalavr**; UCT — faqat magistratura/PhD |
| 5 | **Muddat o'ylab topilgan** | 536 ("Mar–Jun"), 549 ("Rolling"), 672 ("Jun 30"), 704 ("Jun 30") | AUS — **1 aprel 2027**; CUD — **7-iyul / 20-dekabr**; Stellenbosch — **30-sentabr 2026**; UCT — `not_published` (chaqiruv yo'q) |
| 6 | **Uydirma IELTS/GPA** | 536 (6.5/3.4), 549 (6.0/3.0), 672 (6.5/3.0), 704 (7.0/3.3) | AUS'da **IELTS 7.0 e'lon qilingan** (yagona haqiqiy qiymat); qolganlarida `min_ielts = NULL`, `min_gpa = NULL` |
| 7 | **Ochiq bo'lmagan mukofotni ko'rsatish** | 704 | UCT chaqiruvi 2026 da ochilmagan → qator **faol emas**; karta `No` |
| 8 | **Manba — yalang'och domen** | hammasi | Endi real manbalar: `aus.edu/admissions/financial-grants-and-scholarships`, `cud.ac.ae/scholarships`, `files.su.ac.za/…/psp-2027-call-…pdf` |

---

## 3. Metodologik izoh — UCT

`uct.ac.za`, `www.students.uct.ac.za` va moliyaviy qo'llanma PDF'lari 2026-10-25 da **HTTP 500** yoki bo'sh javob qaytardi (uch marta urinildi). Shu sababli UCT matni universitetning **o'z indekslangan sahifalaridan** olingan, `source_reliability = 4`, va qator **faol emas** qilib qo'yildi — mavjud bo'lmagan formaga yubormaslik uchun. 2027 chaqiruvi chiqsa, qayta ko'rib chiqilishi kerak.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 45 oxiri | Pass 46 oxiri |
|---|---|---|
| Shablon tavsifli qatorlar | 13 | **9** |
| Yalang'och domenli `website_url` | 74 | **70** |
| Faol stipendiyalar | 563 | **562** |
| Nafaqaga chiqarilganlar | 103 | **104** |

Navbatda qolgan **9** shablon qator (aniq ro'yxat, `SELECT` bilan tasdiqlangan): Argentina 693, Avstriya 690, Braziliya 777, **Kolumbiya 712**, Chexiya 553, Gonkong 590, Qozog'iston 534, Livan 535, Tailand 555. Janubiy Afrika va BAA klasterlari to'liq yopildi.

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

`aus.edu/admissions/financial-grants-and-scholarships` · `cud.ac.ae/scholarships` · `files.su.ac.za/public/division-research-development/documents/2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf`

Ochilmagan: `uct.ac.za/students/…/international-and-refugee-scholarships`, `uct.ac.za/sites/default/files/media/documents/uct-handbook-14-2027-final.pdf` (HTTP 500), `www.sun.ac.za/english/research-innovation/Research-Development/institutional-postgraduate-scholarships` (yangi bosh sahifaga yo'naltirdi — o'rniga rasmiy 2027 chaqiruv PDF'i ishlatildi).

SQL: `supabase/scholarship_rewrite_pass46_2026-10-23.sql`
