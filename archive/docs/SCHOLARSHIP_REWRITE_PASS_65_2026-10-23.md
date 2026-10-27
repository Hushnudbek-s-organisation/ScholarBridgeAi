# ScholarBridgeAi — stipendiyalarni qayta yozish, 65-pass (Kanada)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Kanada — 15 qator qayta yozildi.
**Natija:** **Kanadada `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. Qayta yozilgan 15 qator

### To'liq tekshirilgan 3 qator (`reliability = 10`)

| Qator | Avval | Endi |
|---|---|---|
| **50** Toronto Pearson | uydirma **USD 50 000**, "2026-11-07" | **To'liq 4 yillik paket**: tuition + kitoblar + incidental fees + **to'liq turar joy**. Yiliga **~37 scholar**, 2024 da **CAD 12 mln+**, **188 davlat**. **Maktab nominatsiyasi majburiy** (har maktabdan **1 talaba**), muddatlar: nominatsiya **9-oktabr 2026**, UofT arizasi **16-oktabr 2026**, stipendiya arizasi **6-noyabr 2026**. Agentlar bilan ishlamaydi |
| **356** UBC International Scholars | **noto'g'ri muassasa**: "University of Alberta" + `suas.ab.ca` havolasi, uydirma **USD 55 000**, "December 1" | **UBC** dasturi (eski nomi ILOT). **Need+merit**: to'lov qobiliyati tekshiriladi (daromad, xarajat, aktivlar), **barcha baholar A**, yetakchilik. **Nominatsiya**: Vancouver uchun **2**, Okanagan uchun **1** talaba; nominator va o'qituvchi-referee **har xil odam**. Ariza **5-oktabr 2026** da ochilgan, tavsiyanomalar **15-noyabrdan bir necha kun oldin**. **Merit va need dasturlaridan faqat bittasiga** ariza berish mumkin. Cheklangan yo'nalishlar: Nursing, Dental Hygiene, Medical Laboratory Science, B+MM, dual/joint |
| **48** McGill Entrance | uydirma **USD 15 000**, "2027-01-15" | **Ikki bosqich**: **bir yillik CAD 3 000** (qaytarilmaydi, **arizasiz**, avtomatik) va **Major Entrance CAD 12 000–48 000** (yiliga 3/5/10/12 ming, 4 yilgacha yangilanadi), **alohida ariza 1-oktabrdan**. **Yiliga 12 000 pog'onasi faqat Kanada fuqarosi/PR uchun** → xalqaro talabaga maksimum **10 000/yil**. Transfer/mature/diploma/exchange/part-time/visiting **chiqarilgan** |

### Mexanizm yozilgan 12 qator (`reliability = 4`)

**129** UofT SGS · **133** McGill grad/McCall MacBain · **363** McMaster · **444** Queen's · **142** UBC 4YF · **371** uOttawa · **445** Dalhousie Killam · **375** Waterloo · **386** Calgary · **446** UVic · **380** SFU · **391** Manitoba

Har birida: `amount = 0`, `award_amount = NULL`, **`currency = CAD`**, `coverage = Unspecified`, `deadline_type = 'not_published'`, `reliability = 4`, `notes` ichida importerning uydirma USD summasi va "1/15-dekabr" shabloni **nomma-nom** ko'rsatilgan.

---

## 2. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 15/15 | USD → **CAD** |
| 2 | **Uydirma summa** | 15/15 (USD 32 000–55 000) | 3 tasi haqiqiy tuzilma bilan, 12 tasi **bo'sh** |
| 3 | **Uniforma muddat** | 12 qatorda "December 1/15 annually", "January 15 annually", "August 21 annually" | `not_published` |
| 4 | **Noto'g'ri muassasa** | 356 | University of Alberta + `suas.ab.ca` (talabalar uyushmasi sayti) → **UBC** |
| 5 | **Eski nom** | 356 | "International Leader of Tomorrow" → **International Scholars Program** (eski nom qavsda) |
| 6 | **Yashirin to'siq** | 50, 356, 48 | Toronto: **maktab nominatsiyasi**; UBC: **need yoki merit — faqat bittasi**; McGill: 12 000 pog'onasi **faqat kanadaliklarga** |
| 7 | **Kanonik bo'lmagan daraja** | 356 (`"Bachelor"`, `"Master"`), 133/363/444/446/380/391 (`"Master"`) | → `"Bachelor's"`, `"Master's"`, `"PhD"` |
| 8 | **`reliability = 10` bo'lgan uydirma** | 12 qator | **4** ga tushirildi |

---

## 3. Uch muhim topilma

**1) Toronto Pearson'ga yakka o'zi ariza berib bo'lmaydi.**
Maktab **yiliga faqat bitta** talabani nomzod qiladi, nominatsiya **9-oktabr**da yopiladi. Ya'ni "grant topdim, ariza beraman" strategiyasi ishlamaydi — avval maktabdan nominatsiya kerak.

**2) UBC'ning eng katta imtiyozi — need-based, va u merit bilan raqobatlashadi.**
International Scholars Program (eski ILOT) to'lov qobiliyatini tekshiradi va **to'liq ehtiyojni** qoplaydi, lekin ariza beruvchi **merit mukofotlariga ham ariza bera olmaydi** — tanlov ikkisidan bittasi.

**3) Kanadada ham "birgalikda olib bo'lmaydi" va "faqat fuqarolarga" cheklovlari bor.**
McGill'ning **CAD 12 000/yil** pog'onasi faqat Kanada fuqarosi/PR uchun; xalqaro talaba **CAD 10 000/yil** da to'xtaydi.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 64 | Pass 65 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 121 | **106** | **−15** |
| shundan **Kanada** | 15 | **0** | **−15** ✅ |
| `source_reliability = 4` | 47 | **59** | +12 |
| bare-domain | 84 | **84** | 0 |
| shablon tavsif | 0 | **0** | 0 |

---

## 5. Tekshiruv

15 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**. `bad_lv` faqat `["PhD"]` qatorlarida `true` — apostrofsiz kanonik qiymat, xato emas.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 6. Keyingi qadam

1. **66-pass** — **Shveytsariya 9**.
2. Keyin **Xitoy 9**, **Gonkong 8**, **Koreya 6**, **Shvetsiya 6**, **Singapur 6**, **Yangi Zelandiya 5**.
3. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori, keyin **84** bare-domain.
4. Avstraliyaning 17 va Kanadaning 12 doktorlik qatori (`reliability = 4`) — universitet sahifalari o'qilgach qayta yoziladi.
