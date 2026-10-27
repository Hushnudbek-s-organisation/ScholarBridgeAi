# ScholarBridgeAi — stipendiyalarni qayta yozish, 64-pass (Avstraliya, 2-qism: bakalavriat)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Avstraliya bakalavriat — 5 qator qayta yozildi.
**Natija:** **Avstraliyada `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. Qayta yozilgan 5 qator

| Qator | Avval | Endi |
|---|---|---|
| **46** Sydney USydIS | uydirma **USD 40 000**, "2027-03-15" | **AUD 42 754/yil** (2026 stavka, 1-yanvardan indekslanadi) — bu **stipendiya**, tuition emas. PhD uchun **14 research period**, magistratura uchun **7**, **uzaytirish yo'q**. Ko'chish **AUD 1 485** (borish) + **1 485** (qaytish), dissertatsiya **420/840**. **Parallel grant faqat 75 %dan kam bo'lsa** ruxsat etiladi. **Alohida ariza formasi majburiy** |
| **37** UNSW Scientia | uydirma **USD 35 000**, "2027-03-31" | **Ikki variant**: **to'liq tuition** yoki **AUD 20 000/yil**. **Ariza talab qilinadi** (avtomatik emas!). **Term 1 2027 uchun 30-oktabr 2026** yopiladi. Qo'shimcha: **International Student Award 20 %** (birlashtirish mumkin) + **Australia's Global University Award AUD 10 000** (avtomatik) |
| **41** Melbourne UG | uydirma **USD 35 000**, "2026-12-31" | **Foizli yengillik**: 2027 dan **20 %** (ilgari 25 %), butun kurs davomida; kamida **110**, 2027 dan **225** ta. **Ariza yo'q** — avtomatik. Shart: fuqaroligi **GDP/kapital ≤ USD 10 000** bo'lgan davlat (World Bank), **avval oliy ta'lim olmagan**. Boshqa fee-discount bilan **birlashtirilmaydi** |
| **47** ANU Chancellor | uydirma **USD 30 000**, "2027-03-15" | **Tuition'dan 25 % yoki 50 %** (9 toifa, fuqarolik bo'yicha), **200** tagacha, **avtomatik**. 1-kurs **turar joy kafolati**. MChD va Master of Military and Defence Studies **chiqarilgan**. **Tuition'ni qoplaydigan tashqi sponsorlik bo'lsa — nomzod chiqariladi**. Hozir sahifada: **"scholarship is currently unavailable"**, ariza **yopiq** |
| **49** Monash Merit | uydirma **USD 30 000**, "2027-03-31" | **Tekshirilmadi** → `reliability = 4`. Monash sahifasi 20 bo'lakda faqat navigatsiya qaytardi, eski URL **404**. Summa, muddat, coverage — **hammasi bo'sh** |

---

## 2. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 5/5 | USD → **AUD**; `amount_usd_value = 0` |
| 2 | **Uydirma summa** | 46 (40 000), 37 (35 000), 41 (35 000), 47 (30 000), 49 (30 000) | 2 tasida **haqiqiy AUD stavka**, 2 tasida **foizli yengillik** (summa yo'q), 1 tasida **bo'sh** |
| 3 | **Foizni summaga aylantirish** | 41 (20 %), 47 (25/50 %) | `award_amount = NULL`, izohda foiz |
| 4 | **Uydirma muddat** | 46, 37, 41, 47, 49 | 37 → **30-oktabr 2026** (e'lon qilingan), 41 → `automatic`, 47 → `not_published` + `closed`, 46 → `not_published` |
| 5 | **"Ariza kerak emas" degan noto'g'ri taxmin** | 37, 46 | Ikkalasida ham **alohida ariza majburiy** — yozildi |
| 6 | **To'siq yashirilgan** | 41, 47 | Melbourne: **GDP ≤ 10 000** davlatlar + boshqa yengillik bilan birlashtirilmaydi; ANU: **tashqi sponsorlik** diskvalifikatsiya |
| 7 | **O'lik URL** | 46, 49 | Sydney `/b/usyd-international-scholarship.html` → **404**; Monash eski manzil → **404** |
| 8 | **Mavjud emas award** | 47 | ANU sahifasi: *"The scholarship is currently unavailable"* → `application_status = 'closed'` |

---

## 3. Uch muhim topilma

**1) Avstraliyada "to'liq grant" deyarli yo'q — foizli yengillik hukmron.**
Melbourne 20 %, ANU 25/50 % — bular **summa emas, chegirma**. Ya'ni "USD 35 000 stipendiya" degan yozuv ham valyutada, ham mohiyatda xato edi.

**2) Ikki xil "birgalikda olib bo'lmaydi" qoidasi bor.**
Melbourne: *boshqa fee-discount/sponsorship bilan birlashtirib bo'lmaydi*. ANU: *tuition'ni qoplaydigan tashqi sponsorligi bor nomzod chiqariladi*. **El-Yurt Umidi** kabi dastur bilan birga olishda bu hal qiluvchi.

**3) Sydney'da stipendiya va tuition — ikki alohida hujjat.**
USydIS — **stipendiya** (AUD 42 754). Tuition uchun alohida **University of Sydney Tuition Fee Scholarship** bor va u **stipendiya olganlarga** beriladi. Ya'ni "to'liq paket" deb yozish xato bo'lardi.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 63 | Pass 64 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 126 | **121** | **−5** |
| shundan **Avstraliya** | 5 | **0** | **−5** ✅ |
| `source_reliability = 4` | 46 | **47** | +1 |
| bare-domain | 84 | **84** | 0 |
| shablon tavsif | 0 | **0** | 0 |

**Avstraliya klasteri yopildi:** 25 ta `>5000` qatorning hammasi qayta yozildi (pass 63 — 20 ta doktorlik, pass 64 — 5 ta bakalavriat).

---

## 5. Tekshiruv

5 qator uchun `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 6. Keyingi qadam

1. **65-pass** — **Kanada** (`>5000` bo'yicha **15** qator).
2. Keyin **Shveytsariya 9**, **Xitoy 9**, **Gonkong 8**, **Koreya 6**, **Shvetsiya 6**, **Singapur 6**, **Yangi Zelandiya 5**.
3. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori, keyin **84** bare-domain.
4. Monash (49) va Avstraliyaning 17 doktorlik qatori (`reliability = 4`) — universitet sahifalari o'qilgach qayta yoziladi.
