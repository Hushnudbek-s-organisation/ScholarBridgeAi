# ScholarBridgeAi — stipendiyalarni qayta yozish, 52-pass (Britaniya dumlari, 3-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — 2 qator tekshirib qayta yozildi, 1 qator halol holatga keltirildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **139** Manchester PDS | "Manchester Presidents Doctoral Scholar Award", uydirma **USD 43 000**, "January 31", 3 daraja, **404 havola** | **"President's Doctoral Scholar Award (University of Manchester)"** — Manchester'ning **flagman doktorantura** mukofoti, **barcha millatlar va barcha sohalar uchun**: **to'liq kontrakt** (home yoki **xalqaro tarif**) + **UKRI darajasidagi stipendiya** (2026/27: **GBP 21 805**) + **GBP 1 000 qo'shimcha** + ba'zi fakultetlarda **GBP 20 000 gacha** tadqiqot granti. 3.5–4 yil. 2027/28: loyihalar **30-okt 2026**, ariza **18-dek 2026**, intervyu **1-mart 2027** haftasi |
| **309** Bristol Think Big | "Bristol Think Big Postgraduate Award", uydirma **USD 32 000**, "April 29" | **"University of Bristol Think Big Scholarships"** — Bristol'ning **flagman xalqaro stipendiyasi**, kontraktga qisman moliyalashtirish, bakalavr **va** magistratura. **Bitta ariza formasi** GREAT, Women, Commonwealth/Chevening yo'nalishlarini ham qamrab oladi. Muddat: **10-aprel 2026, 10:00 (UK)**, natija may. **Summa ataylab yozilmadi** — Bristol uni dastur va ariza kuchiga qarab bandlarga bo'ladi, olingan sahifa matnida bandlar chiqmadi |
| **4** Imperial President's UG | uydirma **USD 12 000**, "June 30" | **Halol holatga keltirildi** — sahifa **404**; summa va muddat olib tashlandi, nom betaraf qilindi, `source_reliability = 4` |

`university_scholarships`: **651**, **545** yangilandi; **485** → `No`.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Uydirma yumaloq USD** | 139 (43 000), 309 (32 000), 4 (12 000) | Hammasi `0`; valyuta **GBP**. Faqat e'lon qilingan raqamlar matnda: **GBP 21 805** stipendiya, **GBP 1 000** qo'shimcha, **GBP 20 000** gacha grant |
| 2 | **Muddat o'ylab topilgan** | 139 ("Jan 31"), 309 ("Apr 29"), 4 ("Jun 30") | Manchester — **18-dek 2026**; Bristol — **10-aprel 2026**; Imperial — `not_published` (chaqiruv yo'q) |
| 3 | **Daraja darajalari** | 139 (3 daraja), 309 (PG only) | Manchester — **faqat PhD**; Bristol — **bakalavr + magistratura** |
| 4 | **O'lik havola** | 139, 4 | Manchester — yangi sahifa topildi; Imperial — 404, qator halol holatga keltirildi |
| 5 | **Summani ikkinchi marta o'ylab topmaslik** | 309 | Bristol'da bandlar topilmagani uchun **raqam yozilmadi** — bu passning eng muhim metodologik qarori |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 51 oxiri | Pass 52 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 224 | **221** |
| shundan Britaniya | 24 | **21** |
| Yalang'och domenli `website_url` | 61 | **61** |
| Faol stipendiyalar | 559 | **559** |
| Nafaqaga chiqarilganlar | 107 | **107** |

---

## 4. Keyingi qadam

Qolgan **21 Britaniya qatori**: LSE PhD Studentship (**154**), Leeds (**312**), Edinburgh Global Doctoral (**131**) va Global (**53**), KCL (**145**, **455**), Southampton (**318**), Sheffield (**333**), Durham (**314**), Nottingham (**337**), Newcastle (**362**), St Andrews (**327**), Liverpool (**385**), Aberdeen **Elphinstone** (**367**), QUB (**389**), Aston (**368**), Essex (**387**), Kent (**388**), Birmingham (**326**), Imperial PhD (**3**), QMUL (**498**).

Keyin AQSh (63), Avstraliya (25), Kanada (15). Qolgan 61 yalang'och domen ham navbatda.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (3 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-26 da ochilgan)

`manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award/` · `bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/`

Manchester'ning moliyaviy tuzilishi va 2027/28 sanalari shu sxemaning **fakultet sahifalaridan** (Science and Engineering, Biology Medicine and Health, Humanities) — ular markaziy sahifadan havola qilingan, lekin bu passda **qidiruv indeksi orqali** o'qildi; bu `notes`da yozilgan.

Ochilmagan: `imperial.ac.uk/study/ug/fees-and-funding/scholarships/presidents-undergraduate-scholarship/` (**404**), `manchester.ac.uk/…/presidents-doctoral-scholar-awards/` (**404** — yangi manzil ishlatildi)

SQL: `supabase/scholarship_rewrite_pass52_2026-10-23.sql`
