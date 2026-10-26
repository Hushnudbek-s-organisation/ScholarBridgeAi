# ScholarBridgeAi — stipendiyalarni qayta yozish, 86-pass (Indoneziya KNB + Loughborough)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** 2 qator to'liq tekshirildi, 1 qator sahifasi bo'sh chiqdi.
**Natija:** bare-domain **36 → 35** (KNB domeni chuqur sahifaga aylandi).

---

## 1. Tekshirilgan 2 qator

### **616** Loughborough — `reliability = 10`

Manba: `lboro.ac.uk/study/undergraduate/fees-funding/scholarships/excellence-scholarships/`

| E'lon qilingan fakt | Endi |
|---|---|
| **GBP 3 000 har o'quv yili uchun tuition'ga**, 3 yillik dasturda **jami GBP 9 000 gacha** | **`award_amount = 3000`, GBP, `year`** |
| **Alohida ariza YO'Q** — UCAS yoki OnCampus arizasidan avtomatik | `deadline_type = 'automatic'` |
| Talab: odatda **AAA** (A-level), 5 ta dasturda **A\*AA**: MEng Aeronautical, MEng Automotive, MEng Mechanical, MSci Natural Sciences, BSc Sport & Exercise Science | requirements |
| Baholar **birinchi urinishda**, **resit yo'q** | requirements |
| Cheklovlar: **placement/study abroad yilida to'lanmaydi**, **yil takrorlaganlarga berilmaydi**, **self-funded** bo'lishi va boshqa mukofot/sponsorlik bo'lmasligi shart, **deferralda saqlanmaydi** | requirements |
| Qo'shimcha: **UG Future Leaders GBP 10 000**, **PG Excellence GBP 6 000**, **PG Future Leaders GBP 10 000**; universitet yiliga **GBP 1 mln**dan ortiq | description |

### **579** KNB (Indoneziya) — `reliability = 9`

Manba: `knb.kemdiktisaintek.go.id`

| E'lon qilingan fakt | Endi |
|---|---|
| **2026 sikl: 2-fevral – 31-mart 2026**, natijalar **19-iyun**, re-registratsiya **26-iyun**; to'rtinchi to'lqin **18-sentabrgacha** | `deadline_type = 'annual'`, **`closed`** |
| **47 hamkor universitet**, **bakalavr/magistratura/doktorantura** | description |
| **2006 yildan 2 299 talaba, 107 davlat**; 2026 da **200 ta** mukofot | description |
| Ariza **ikki qismli**: elchilikdan **tavsiyanoma** + onlayn portal | requirements |
| Til: **TOEFL ITP 477 / iBT 53 / IELTS 5.5 / TOEIC 510**, 2 yildan eski emas | **`min_ielts = 5.5`** |
| **5 daqiqalik YouTube video** + **3 oylik tibbiy hisobot** (TB, sifilis, HIV, Ebola, mpox, ruhiy salomatlik, giyohvandlik testi) | requirements |
| Bakalavr uchun **21 yosh** chegarasi | requirements |
| **Qamrov e'lon qilinmagan** — sahifada benefit jadvali yo'q, qo'llanma ochilmagan | **`coverage_type = 'Unspecified'`** |

**Muhim halollik qadami:** qator avval `Full Funding` deb belgilangan edi, lekin **sahifa qamrovni e'lon qilmaydi**. Shuning uchun **`Unspecified`** ga tushirildi va izohda aynan shu sabab yozildi.

---

## 2. Tekshirilmagan qator

**734 Exeter** — `exeter.ac.uk/study/funding/award/index.php?id=3249` sahifasi **"Sorry no information currently available"** qaytardi. Qidiruv natijasida ko'ringan "GBP 5 000" raqami **sahifada tasdiqlanmadi**, shuning uchun **o'zgartirilmadi**.

**868 Rossotrudnichestvo** — `education-in-russia.com/en` **404**; ruscha sahifa ochildi, lekin unda **benefit jadvali yo'q** (faqat dastur katalogi). Qator `reliability = 4` holicha qoldirildi.

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 85 | Pass 86 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| **bare-domain** | 36 | **35** | **−1** |
| `source_reliability ≥ 9` | 279 | **280** | +1 |
| `source_reliability = 4` | 139 | **139** | 0 |
| `amount_usd_value > 5000` | 20 | **20** | 0 |

## 4. Tekshiruv

2 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_notes` — **hammasi `false`**. 579 da `bare = true` — `knb.kemdiktisaintek.go.id` **bosh sahifasi** jadval va talablarni o'zida saqlaydi, shuning uchun bu **ongli istisno**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 5. Qolgan 35 bare-domain — tasnif

| Tur | Soni | Holat |
|---|---|---|
| **"Stipendiya yo'q" halol qaydlar** | 6 | Domen to'g'ri manzil |
| **`reliability = 4`** | 16 | Sahifa ochilmagan |
| **Milliy dasturlar** | 3 | Phystech 829, Study in Saudi 859, Rossotrudnichestvo 868 |
| **UK** | 5 | Lancaster 614, Heriot-Watt 589, QUB 658, Exeter 734, Edinburgh 131, Leeds 312, St Andrews 327 |
| **Boshqalar** | 5 | Paris 1, Lisbon, Porto, Witwatersrand, Barcelona, Navarra, Cornell, Florida, Maryland, El-Yurt Umidi, KSU, Open Doors |

## 6. Keyingi qadam

**87-pass** — qolgan UK universitetlari (Lancaster, Heriot-Watt, QUB) va El-Yurt Umidi (`eyuf.uz`, avval 500 bergan) qayta urinish; keyin **20 ↔ 114** deduplikatsiyasi va **139** `reliability = 4` qator.
