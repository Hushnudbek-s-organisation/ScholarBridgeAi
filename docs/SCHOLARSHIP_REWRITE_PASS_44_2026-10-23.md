# ScholarBridgeAi — stipendiyalarni qayta yozish, 44-pass (Irlandiya + Yangi Zelandiya)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Irlandiya (2 qator) + Yangi Zelandiya (2 qator) — 4 qator qayta yozildi, 1 yangi qator qo'shildi, 1 dublikat nafaqaga chiqarildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **697** University College Cork | "UCC International Student Scholarships", to'liq kontrakt, uydirma **USD 24 000**, 3 daraja, "Feb 1" | **"University College Cork International Scholarships (College Merit Awards)"** — kollej darajasidagi **avtomatik** chegirmalar: bakalavr uchun **yiliga EUR 2 000** (3 yil yoki kurs davomida yangilanadi), san'at kollejida magistratura uchun **20 %** (1H1 diplom bilan), qaytgan xalqaro talabalar uchun 25 %. Bitta qator — bitta stipendiya; ariza **yo'q** |
| **433** UCD Global Excellence | "Full Tuition", uydirma **USD 30 000**, "March 31 annually", GPA 3.7 / IELTS 6.5, `eligible_countries = ["Non-EU"]` | **50 % yoki 100 % kontrakt bekor qilish**, faqat **bakalavr + magistratura (taught)**, PhD **yo'q**; mintaqaviy muddatlar: **1 fevral** (Shimoliy Amerika bakalavr), **28 fevral** (Yaqin Sharq/Afrika/Pokiston + Janubiy Osiyo magistratura), **31 mart** (qolganlar — O'zbekiston shu guruhda); natija ~7 hafta; saqlash uchun **GPA ≥ 3.08**, 50 ECTS/yil, ambassador vazifalari |
| **698** UCD Global Undergraduate | uydirma **USD 24 000**, "Full Tuition", `["Bachelor"]` | **Nafaqaga chiqarildi** — 433 ning dublikati. Kartasi (103) → `No` |
| **620** Massey University | "International Excellence Scholarships", to'liq kontrakt, uydirma **USD 22 500**, 3 daraja, "Dec 1" | **"Massey University Undergraduate International Study Grants"** — **NZ$15 000** (bir yil), **15 ta aniq bakalavr dasturi**, **2 ta davlat stipendiyasi yo'q** (Fed Aid, SACM, Manaaki, TSLS taqiqlangan), **ariza yo'q** — qabul paytida avtomatik baholanadi va offer xatida ko'rinadi |
| **909** *(yangi)* | — | **"Toroa International Undergraduate Fee Scholarships (Massey University)"** — **NZ$10 000**, **40 tagacha** mukofot, 5 ta dastur (Animal Science, Business, Construction, Information Science, Science), alohida ariza Student Portal orqali, **15 sen – 20 okt 2026** (yopilgan), ikki savolga javob + mukofotdan keyin 2 hafta ichida NZ$500 yoki to'liq yillik to'lov |
| **752** University of Otago | "International Student Scholarship", to'liq kontrakt, uydirma **USD 26 000**, 3 daraja, "Dec 10" | **"University of Otago International Academic Excellence Scholarship"** — **~NZ$35 000 / 3 yil**: 1-kurs **yotoqxona narxi** (~NZ$21 000, universitet kollejida yashamasangiz **to'lov yo'q**) + 2–3-kurslar **yiliga NZ$7 000**; taklifnomadan keyin **2 hafta** ichida ariza; GPA 7.0 (A−) talabi; davlat stipendiyasi oluvchilar va diplom/sertifikat dasturlari **ishtirok etmaydi** |

`university_scholarships`: **253** (UCC), **632** (UCD), **222** (Massey), **142** (Otago) yangilandi; **103** → `No`; **668** — 909 uchun yangi karta.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Mavjud bo'lmagan nom** | 620, 752, 697, 698 | Massey'da "International Excellence Scholarships", Otago'da "International Student Scholarship" degan mukofot **yo'q**; UCC'da bitta umumiy stipendiya yo'q — uchta kollej mukofoti bor. Haqiqiy nomlar yozildi |
| 2 | **"Full Tuition" da'vosi** | 697, 620, 752, 698 | UCC — EU 2 000/yil; Massey — NZ$15 000 bir martalik; Otago — 1-kurs yotoqxona + 7 000/yil; UCD — 50 % yoki 100 %. Hech biri to'liq kontrakt emas (UCD 100 % faqat 50 ta o'rinli darajada) |
| 3 | **Uydirma USD summalar** | 697 (24 000), 433 (30 000), 698 (24 000), 620 (22 500), 752 (26 000) | `amount_usd_value = 0`; `award_currency` — **EUR** (Irlandiya) va **NZD** (Yangi Zelandiya). Bu loyihada suzuvchi valyutalar konvertatsiya qilinmaydi (Gollandiya, Italiya, Ispaniya, Nordic qatorlaridagi kabi) |
| 4 | **Daraja darajalari noto'g'ri** | 697, 433, 698, 620, 752 | UCC — bakalavr + magistratura (doktorantura faqat CSC-Xitoy hamkorligi); UCD — bakalavr + magistratura, **PhD yo'q**; Massey/Otago — **faqat bakalavr** |
| 5 | **Muddat chalkashligi** | 697, 433, 698, 620, 752 | UCC va Massey granti — muddat **umuman yo'q** (`deadline_type = 'automatic'`); UCD — uch xil mintaqaviy sana; Otago — taklifnomadan keyin 2 hafta (`'rolling'`) |
| 6 | **Uydirma IELTS/GPA** | 697 (6.5/3.0), 433 (6.5/3.7), 698 (7.0/3.3), 620 (6.0/3.0), 752 (6.0/3.0) | Hech bir stipendiya sahifasi bu talablarni qo'ymaydi → `min_ielts = NULL`, `min_gpa = NULL`. Otago'ning GPA 7.0 talabi — mukofotni **saqlash** uchun, kirish uchun emas (matnda) |
| 7 | **Dublikat qatorlar** | 698 ↔ 433 | 433 (to'g'ri nom) qayta yozildi, 698 nafaqaga chiqarildi; karta 103 → `No`, karta 632 yangilandi |
| 8 | **`eligible_countries` / `eligible_majors` noto'g'ri** | 433 | `["Non-EU"]` — bu davlat emas, to'lov toifasi; `["All UCD Programs"]` — ilova kutgan format emas. Endi `["All"]` va `["All Majors"]` |
| 9 | **Manba — yalang'och domen** | 697, 433, 698, 620, 752 | Endi real ochilgan sahifalar: `ucc.ie/en/scholarships/internationaltable/`, `ucc.ie/en/cacsss/international/scholarships/`, `ucd.ie/global/…/globalexcellencescholarships/`, `massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/`, `otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship` |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 43 oxiri | Pass 44 oxiri | O'zgarish |
|---|---|---|---|
| Shablon tavsifli qatorlar | 23 | **19** | −4 |
| Yalang'och domenli `website_url` | 84 | **80** | −4 |
| Faol stipendiyalar | 565 | **565** | −1 nafaqa +1 yangi |
| Nafaqaga chiqarilganlar | 102 | **103** | +1 |

Navbatda qolgan shablon qatorlari: **19** — Argentina 1, Avstriya 1, Braziliya 1, Chexiya 1, Fransiya 2, Gonkong 1, Isroil 2, Qozog'iston 1, Livan 1, Meksika 2, Janubiy Afrika 2, Tailand 1, BAA 2.

---

## 4. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (6 qator) | hammasi `false`; nafaqadagi 698 ning yalang'och domeni ham haqiqiy UCD sahifasiga almashtirildi |

---

## 5. Manbalar (2026-10-25 da ochilgan)

`ucc.ie/en/scholarships/internationaltable/` · `ucc.ie/en/cacsss/international/scholarships/` · `ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/` · `ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/` · `massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/` · `massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships/` · `otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship`

Ochilmagan (qayta urinmaslik kerak): `massey.ac.nz/study/scholarships-and-awards/massey-university-international-undergraduate-excellence-scholarships/` (404 — mukofot endi mavjud emas), `otago.ac.nz/study/scholarships/otago-international-excellence-scholarship` (404), `massey.ac.nz/massey/admission/scholarships-bursaries-awards/scholarship-bursary-award_home.cfm?id=…` (eski CFM tizimi, bosh sahifaga yo'naltiradi).

SQL: `supabase/scholarship_rewrite_pass44_2026-10-23.sql`
