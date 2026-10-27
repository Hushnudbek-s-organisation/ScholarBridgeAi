# ScholarBridgeAi — stipendiyalarni qayta yozish, 51-pass (Britaniya dumlari, 2-qism)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — 2 qator tekshirib qayta yozildi, 1 qator nafaqaga chiqarildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **311** Warwick | "Warwick Chancellors International Scholarship", uydirma **USD 44 000**, "December 12 annually", 3 daraja | **"Warwick Postgraduate Research Scholarships (Faculty and Interdisciplinary Chancellors)"** — **to'liq kontrakt (UK yoki xalqaro tarif) + UKRI darajasidagi stipendiya 3.5 yil + GBP 5 000 tadqiqot granti**. 2027 uchun **80 tagacha** stipendiya, 6 oqimda: **Faculty Chancellors 30** + **Interdisciplinary 12** + AHRC 3 + Pathway 3 + Sanctuary 2 + CSC 30. **Chancellors oqimlari istalgan millat va fee status uchun ochiq**. Kalendar: chaqiruv **5-okt 2026**, kurs arizasi **7-dek**, stipendiya arizasi **10-dek**, tavsiyanomalar **21-dek** (16:59 GMT) |
| **27** UCL Global Masters | uydirma **USD 35 000**, "May 16", 3 daraja | **"UCL Global Master's Scholarship"** — **GBP 15 000** (bir yil; 2 yillik dasturda 50/50), avval kontraktga, qoldig'i 3 bo'lib yashashga. 2026/27 da **85 tagacha** stipendiya (5 tasi Hindiston, 1 tasi Yaponiya uchun). **Muhim:** tanlov **moddiy ehtiyoj** bo'yicha, baho bo'yicha emas; faqat **to'liq kunlik, joyida**. Muddat: **7-may 2026, 17:00 BST** |
| **18** UCL Overseas Research Scholarship | uydirma **USD 35 000**, "January 31", 3 daraja | **Nafaqaga chiqarildi** — UCL sahifasi **404** qaytaradi va hozir shu nomdagi mukofot topilmadi. Sxema tarixan doktorantura uchun "home/overseas" tarif farqini qoplagan; o'rnini bosuvchi tasdiqlangan sxema yo'q |

`university_scholarships`: **555**, **564** yangilandi; **573** → `No`.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Eskirgan nom** | 311 | Warwick endi bitta "PGR scholarship competition" — eski nom ostidagi mukofot yo'q |
| 2 | **Uydirma USD summalar** | 311 (44 000), 27 (35 000), 18 (35 000) | `amount_usd_value = 0`; `award_currency = 'GBP'`; faqat e'lon qilingan raqam: **GBP 15 000** (UCL) |
| 3 | **Muddat o'ylab topilgan** | 311 ("Dec 12"), 27 ("May 16"), 18 ("Jan 31") | Warwick — **10-dek 2026** (e'lon qilingan); UCL — **7-may 2026**; UCL ORS — `not_published` (chaqiruv yo'q) |
| 4 | **Daraja darajalari** | 311 (3), 27 (3), 18 (3) | Warwick — **faqat PhD/PGR**; UCL Global — **faqat magistratura**; ORS — doktorantura |
| 5 | **Kontekst yo'qligi** | 27 | UCL mukofoti **ehtiyojga asoslangan** (baho emas) va **masofaviy ta'lim mos emas** — bu O'zbekistonlik nomzod uchun eng muhim fakt |
| 6 | **O'lik sahifa** | 18 | 404 → qator nafaqaga chiqarildi (pass 48 dagi UBA/USP pretsedenti) |
| 7 | **Uydirma IELTS/GPA** | hammasi | → `NULL` |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 50 oxiri | Pass 51 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 227 | **224** |
| shundan Britaniya | 27 | **24** |
| Yalang'och domenli `website_url` | 61 | **61** |
| Faol stipendiyalar | 560 | **559** |
| Nafaqaga chiqarilganlar | 106 | **107** |

---

## 4. Keyingi qadam

1. **24 Britaniya qatori** qoldi. Ular orasida haqiqiy mukofotlar bor: Manchester President's Doctoral Scholar, Bristol Think Big, Edinburgh Global, Nottingham, Sheffield, Leeds, Birmingham, St Andrews, QMUL, KCL, Imperial, LSE, Durham, Southampton, Liverpool, Essex, Kent, Aston, Newcastle, Aberdeen, Strathclyde va boshqalar.
2. **Manchester** bu passda **o'zgartirilmadi** — `presidents-doctoral-scholar-awards` sahifasi **404** qaytardi; keyingi passda yangi manzil qidiriladi.
3. **Bristol Think Big** hamon ochiq — sahifa olindi, summa e'lon qilingan bo'lim topilmadi.
4. Keyin AQSh (63), Avstraliya (25), Kanada (15).

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (3 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-25 da ochilgan)

`warwick.ac.uk/services/dc/schols_fund/applicants/competitions/` (eski `/cis/` shu yerga yo'naltirdi) · `ucl.ac.uk/scholarships/ucl-global-masters-scholarship`

Ochilmagan: `ucl.ac.uk/scholarships/overseas-research-scholarship` (**404**), `manchester.ac.uk/…/presidents-doctoral-scholar-awards/` (**404**)

SQL: `supabase/scholarship_rewrite_pass51_2026-10-23.sql`
