# ScholarBridgeAi — stipendiyalarni qayta yozish, 68-pass (Shvetsiya, Koreya, Singapur, Yangi Zelandiya)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** 4 davlat — **23 qator** qayta yozildi.

---

## 1. To'liq tekshirilgan 2 qator (`reliability = 10`)

| Qator | Avval | Endi |
|---|---|---|
| **323** Lund Global Scholarship | uydirma **USD 28 000**, "February 15 annually" | **Faqat tuition** (qisman yoki to'liq), yiliga **~SEK 26 mln**; **EU/EEA va Shveytsariya tashqarisi**; **magistratura** + 4 ta istisno bakalavriat (Development Studies, Mathematics, Physics, Physical Geography); dastur **universiyadmissions.se'da 1-tanlov** bo'lishi shart; **600 so'zli motivation letter**; **bitta ariza** bir turda. Muddat: **16-fevral 2026** (yopilgan), yangi tur e'lon qilinmagan. **Yashash xarajati qoplanmaydi** |
| **348** Uppsala master's scholarships | uydirma **USD 28 000**, "January 15 annually", nomi "King Carl Gustaf" | **Global Scholarship — to'liq tuition** (yashash xarajatisiz), EU/EEA tashqarisi, **magistratura**, 1-tanlov shart. Ariza davri **16-yanvar – 1-fevral 2027**. **Arizachilarning faqat ~2 %** oladi. **11 ta dastur** (Nordic/Erasmus qo'shma magistraturalar) **chiqarilgan**. Anders Wall — faqat Afrika fuqarolariga |

## 2. Mexanizm yozilgan 21 qator (`reliability = 4`)

| Davlat | Valyuta | Qatorlar |
|---|---|---|
| **Shvetsariya** | — | — |
| **Shvetsiya** | SEK | **325** KTH · **421** Chalmers · **422** Stockholm · **423** Gothenburg |
| **Janubiy Koreya** | KRW | **453** POSTECH · **310** KAIST · **135** SNU · **317** Yonsei · **321** Korea Univ · **452** Hanyang |
| **Singapur** | SGD | **112** NUS PGF · **119** NTU NPGS · **396** SMU · **30** NTU Nanyang · **16** NUS ASEAN · **15** NUS Research |
| **Yangi Zelandiya** | NZD | **381** VUW · **435** Canterbury · **437** Waikato · **392** Otago · **436** Massey |

Har birida: `amount = 0`, `award_amount = NULL`, **mahalliy valyuta**, `coverage = Unspecified`, `deadline = not_published`, `notes`da uydirma USD summasi va shablon muddati.

**Muhim:** **16**-qator (NUS **ASEAN** Undergraduate Scholarship) — nomining o'zidan ko'rinib turibdiki, faqat **ASEAN** davlatlari fuqarolari uchun; O'zbekiston unga kirmaydi. Bu izohda yozildi.

---

## 3. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 23/23 | USD → **SEK / KRW / SGD / NZD** |
| 2 | **Uydirma summa** | 23/23 (USD 20 000–45 000) | 2 tasida haqiqiy tuzilma, 21 tasida **bo'sh** |
| 3 | **Shablon muddat** | 15 qatorda "annually", boshqalarida "Month 15 / Month 15" | `not_published`, Lund va Uppsala uchun **haqiqiy sana** |
| 4 | **Foizli/waiver mukofotni summaga aylantirish** | 323, 348 va boshqa Shvetsiya qatorlari | `award_amount = NULL`, foiz/qamrov matnda |
| 5 | **Yashirin to'siq** | 323, 348 | Lund: **1-tanlov** + **600 so'z** + yashash xarajati o'z zimmasida; Uppsala: **1-tanlov** + **11 ta chiqarilgan dastur** + **~2 %** muvaffaqiyat |
| 6 | **Nom noto'g'ri** | 348 | "King Carl Gustaf" o'qilgan sahifada **yo'q** → aslida **Global Scholarship**; izohda qayd etildi |
| 7 | **Kanonik bo'lmagan daraja** | 30, 16 (`"Bachelor"`), 112, 119, 135, 317, 321, 396, 452, 453 (`"Master"`) | → `"Bachelor's"`, `"Master's"`, `"PhD"` |
| 8 | **O'lik URL** | 325 (KTH), 421 (Chalmers) | **404** — notesda qayd etildi |
| 9 | **`reliability = 10` bo'lgan uydirma** | 21 qator | **4** ga tushirildi |

---

## 4. Uch muhim topilma

**1) Shvetsiyada stipendiya — bu tuition waiver, yashash puli emas.**
Lund ham, Uppsala ham ochiq yozadi: *"covers tuition only – living costs are not included"*, va Migratsiya idorasi talab qiladigan yashash mablag'ini talaba **o'zi** isbotlashi kerak. Ya'ni "USD 28 000 stipendiya" degan yozuv ikki marta xato edi.

**2) "1-tanlov" qoidasi.**
Lund va Uppsula ikkalasi ham dastur `universityadmissions.se`da **birinchi tanlov** bo'lishini talab qiladi. Bu — O'zbekiston nomzodi uchun eng amaliy maslahat: birinchi tanlovni tasodifiy tanlash stipendiyani yo'qotadi.

**3) Uppsala'da 11 ta dastur butunlay chiqarilgan.**
Nordic/Erasmus qo'shma magistraturalar (Euroculture, NABiS, MEME, PANGEA va boshqalar) — Uppsala stipendiyasiga **mos emas**.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 67 | Pass 68 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 88 | **65** | **−23** |
| `source_reliability = 4` | 72 | **93** | +21 |
| bare-domain | 83 | **83** | 0 |
| shablon tavsif | 0 | **0** | 0 |
| `>5000` qolgan davlatlar | — | **28** | — |

Shvetsiya, Janubiy Koreya, Singapur va Yangi Zelandiyada `>5000` qator **qolmadi**.

---

## 6. Tekshiruv

23 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**. `bad_lv` faqat `["PhD"]` qatorlarida `true` (apostrofsiz kanonik qiymat).
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 7. Keyingi qadam

1. **69-pass** — qolgan **28 davlatdagi 65 qator**: eng kattalari **Germaniya, Yaponiya, Niderlandiya, Italiya, Ispaniya, Fransiya** va boshqalar.
2. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori, keyin **83** bare-domain.
3. `reliability = 4` qatorlar (hozir **93**) — sahifalar o'qilgach bosqichma-bosqich qayta yoziladi.
