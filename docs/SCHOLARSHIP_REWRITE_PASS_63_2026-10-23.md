# ScholarBridgeAi — stipendiyalarni qayta yozish, 63-pass (Avstraliya, 1-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Avstraliya doktorlik (RTP) qatorlari — 20 qator qayta yozildi.
**Manba:** `education.gov.au` (milliy RTP doirasi) + 3 ta universitet sahifasi.

---

## 1. Asosiy kashfiyot: butun klaster bitta importer shablonidan tug'ilgan

Avstraliyaning 20 ta doktorlik qatori deyarli bir xil ko'rinishda edi:

- **USD** valyutasida **39 000–46 000** ("aylantirilgan" summalar),
- deyarli hammasida **"August 31 annually"** (9 ta) yoki **"September 30 annually"** (4 ta) — bir-biriga aloqasi yo'q universitetlarda **bir xil sana**,
- `source_reliability = 10`.

Aslida Avstraliyada doktorlik stipendiyalari **AUD**da to'lanadi va **har bir universitet o'zi** belgilaydi — faqat **milliy pol va shift** hukumat tomonidan qo'yiladi. Ya'ni 20 qatorda ham **valyuta xato**, ham **summa uydirma**, ham **muddat uydirma** edi.

## 2. Tekshirilgan milliy doira (`education.gov.au`)

| Ko'rsatkich | 2026 | Izoh |
|---|---|---|
| RTP **base** stipendiya | **AUD 34,315** | har yili 1-yanvardan indekslanadi |
| RTP **maximum** stipendiya | **AUD 53 608** | keyingi yil stavkalari 1-oktabrgacha e'lon qilinadi |
| RTP nima beradi | **tuition offset + stipendiya + qo'shimcha allowance**lar | mahalliy **va** xalqaro talabalarga |
| Tarix | 2017-01-01 dan **IPRS + APA + RTS** o'rnini egallagan | — |

---

## 3. To'liq tekshirilgan 3 qator (`source_reliability = 10`)

| Qator | E'lon qilingan fakt | Endi |
|---|---|---|
| **361** Griffith | stipendiya **AUD 35 656** (2026), **tuition qoplamaydi**, continuous round, GUIPRS faqat **≥ AUD 36 000** sponsorligi bo'lganlarga, 5 yilda **2 marta** ariza | `Living Stipend`, `AUD 35 656`, `rolling` |
| **441** QUT | stipendiya **AUD 37 010** (2026) → **AUD 38 310** (2027-01-01 dan) + **RTP Fees Offset** + **AUD 1 520** ko'chish + **AUD 420/840** dissertatsiya allowance; boshqa living-allowance stipendiya olganlar chiqariladi | `Full Tuition + Stipend`, `AUD 37 010`, `annual` |
| **443** Tasmania | RTP **va** TGRS = **AUD 34 315** (2026); PhD **3,5 yil**, magistratura **2 yil**; ko'chish uchun **AUD 2 000**gacha; **SSAF, OSHC, viza qoplanmaydi**; xalqaro talaba tuition offset olmasa — **tuition to'laydi** | `Living Stipend`, `AUD 34 315`, `rolling` |

## 4. Mexanizm qayta yozilgan 17 qator (`source_reliability = 4`)

**117** Melbourne · **122** Sydney · **123** UNSW · **134** ANU · **141** Monash · **149** UQ · **319** UWA · **328** Adelaide · **360** UniSA · **370** Deakin · **372** Macquarie · **373** UTS · **382** RMIT · **438** Curtin · **439** Newcastle · **440** Wollongong · **442** Flinders

Har birida:
- `amount_usd_value = 0`, `award_amount = NULL`, `award_currency = 'AUD'`
- `coverage_type = 'Unspecified'` — chunki **tuition offset bor-yo'qligi o'qilmagan**
- `deadline_type = 'not_published'` — uydirma "31-avgust" olib tashlandi
- `notes` ichida **ochiq yozilgan**: "the scholarship page of X was not read for this row", nima uchun summa va muddat bo'sh qoldirilgani, va importer xatolari.

**O'lik URLlar (qayd etildi, o'chirilmadi):** `sydney.edu.au/…/usyd-international-scholarship.html` → **404**; `research.unsw.edu.au/scientia-phd-scholarship-scheme` → **bo'sh sahifa**; Deakin sahifasi → **404**.

---

## 5. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 20 qatorning hammasida | USD → **AUD**; `amount_usd_value = 0` |
| 2 | **Uydirma summa** | 20 qator (39 000–46 000) | 3 tasida **haqiqiy AUD stavka**, 17 tasida **bo'sh** |
| 3 | **Uydirma muddat** | 20 qator ("August 31 annually" / "September 30 annually") | 3 tasida **rolling/annual**, 17 tasida **not_published** |
| 4 | **Bir shablonning 20 universitetga ko'chirilishi** | 141, 149, 328, 360, 372, 373, 382, 438, 439, 440, 442 va boshqalar | Har biri alohida yozildi, importer shabloni **nomma-nom** ko'rsatildi |
| 5 | **Coverage oshirib yozilgan** | 20 qator "Full Tuition + Stipend" | Griffith va Tasmaniada **stipendiya tuition qoplamaydi** → `Living Stipend`; qolganlarida `Unspecified` |
| 6 | **O'lik URL** | 122, 123, 370 | Notesda qayd etildi; yangi havola **o'ylab topilmadi** |
| 7 | **`reliability = 10` bo'lgan uydirma** | 20 qator | 17 tasi **4** ga tushirildi, 3 tasi **10** (tekshirilgan) |

---

## 6. Hisoblagichlar (pass 63 dan keyin)

| Ko'rsatkich | Pass 62 | Pass 63 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 146 | **126** | **−20** |
| shundan **Avstraliya** | 25 | **5** | **−20** |
| `source_reliability = 4` | 29 | **46** | **+17** |
| `source_reliability = 5` | 27 | **27** | 0 |
| bare-domain | 84 | **84** | 0 |
| shablon tavsif | 0 | **0** | 0 |

> `reliability = 4` ning o'sishi — **yashirilgan uydirmaning ochiqqa chiqarilishi**, ya'ni yaxshilanish: 17 qator endi "tekshirilmagan, lekin halol" deb belgilangan, ilgari ular "tekshirilgan, 10" ko'rinishida yolg'on gapirardi.

Avstraliyada `>5000` bo'lib qolgan **5** qator — bakalavriat klasteri: **46** Sydney, **37** UNSW, **41** Melbourne, **47** ANU, **49** Monash → **64-pass**.

---

## 7. Tekshiruv

20 qator uchun `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_countries`, `bad_notes` — **hammasi `false`**.
Sifat darvozalari: `tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 8. Keyingi qadam

1. **64-pass** — Avstraliya bakalavriat: **46, 37, 41, 47, 49** (Sydney, UNSW, Melbourne, ANU, Monash) + qolgan 20 ta AUD qatorni (`533, 561, 564, 584, 613, 619, 660, 664, 676, 751, 761, 768, 771, 774, 780, 783`) qayta ko'rish.
2. Keyin **Kanada 15**, **Shveytsariya 9**, **Xitoy 9**, **Gonkong 8**.
3. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori, keyin **84** bare-domain.
