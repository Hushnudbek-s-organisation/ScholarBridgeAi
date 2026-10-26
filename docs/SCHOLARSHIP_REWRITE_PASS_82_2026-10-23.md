# ScholarBridgeAi — stipendiyalarni qayta yozish, 82-pass (AQSh doktorlik qatorlari, 8-qism — guruh YOPILDI)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan oxirgi 4 qator.

---

## 1. 🎯 MUHIM MARRA: `source_reliability = 5` → **0**

`reliability = 5` guruhi (27 qator, pass 58 da yaratilgan "mexanizm to'g'ri, lekin sahifa o'qilmagan" qatorlar) **butunlay yopildi**. Har bir qator yo **to'liq tekshirilgan** (8–10), yo **halol `reliability = 4`** ga o'tkazilgan.

## 2. Tekshirilgan 4 qator

### **357** USC — `reliability = 10`

Manba: `graduateschool.usc.edu/…/Minimum_-Stipend-Memo-AY2026-2027-1-14-2026.pdf` (provost idorasi memorandumi, 2026-yil 14-yanvar)

| E'lon qilingan fakt | Endi |
|---|---|
| **2026–27 minimum total stipend — USD 42 436** (+3 %) | **`award_amount = 42 436`** |
| Minimumdan yuqori to'laydigan dasturlar ham **3 % ga oshirishi** shart | description |
| Har bir PhD **asl offerdagi paket muddati davomida** minimumdan past bo'lmasligi kerak | requirements |
| Stipendiya **fellowship / TA / RA / lectureship / top-off / davlat yordami** ko'rinishida bo'lishi mumkin | description |
| **Sug'urta, tish sug'urtasi va student health center fee** paketda qoladi; tuition siyosati **o'zgarmaydi** | description |

### **354** WashU St. Louis — `reliability = 10`

Manba: `gradstudies.artsci.washu.edu/funding-and-support` + `bulletin.wustl.edu/grad/phd-policies-requirements/`

| E'lon qilingan fakt | Endi |
|---|---|
| **2026–27 PhD stipendiya — USD 37 853** (oylik taqsimlanadi) | **`award_amount = 37 853`** |
| **To'liq tuition — USD 69 190** (talaba to'lamaydi) | tuition_coverage |
| Sug'urta **2 630** (90 % subsidiya), tish **231** (90 %), wellness fee **630** (90 %) | tuition_coverage |
| Universitet **barcha PhD dasturlarga** qo'llanadi (tibbiyotning post-professional dasturlaridan tashqari) | description |
| Bo'lim yuqori to'lasa — **butun kohortga** yuqori to'lashi shart | description |

### **308** UC San Diego — `reliability = 9`

Manba: `scripps.ucsd.edu/doctoral/frequently-asked-questions`

| E'lon qilingan fakt | Endi |
|---|---|
| **1-kurs uchun kampus minimumi — USD 37 500 + tuition + majburiy to'lovlar** | **`award_amount = 37 500`** |
| **Kaliforniya rezidenti bo'lmaganlarga NRST ham qoplanadi** | tuition_coverage |
| **Undan ortiq summa/muddat kafolatlanmagan** — mablag' mavjudligiga bog'liq | requirements |
| TA/GSR **UCOP-UAW jamoaviy bitimi** bilan; fee remission **25 %+** stavkada, yozda emas | description |

**Nega 9?** Bu — **kafedra sahifasi**, kampus majburiyatini keltiradi; Graduate Division'ning o'z sahifasi o'qilmagan.

### **366** Rochester — `reliability = 9`

Manba: `rochester.edu/graduate-education/financial-support/`

| E'lon qilingan fakt | Endi |
|---|---|
| Yordam **kafedra/maktab darajasida**, akademik salohiyat bo'yicha beriladi | `coverage = Unspecified` |
| Aksariyat doktorantlar **sezilarli yordam** oladi, ko'pincha tuition + yashashni to'liq qoplaydi | description |
| **Sproull University Fellowship** — universitetning eng nufuzli mukofoti, yiliga **10–12 ta**, **nomzod orqali**, yakuniy tanlov — Dean of Graduate Studies | description |
| **Provost's Fellowship** — doktorantura kohorti xilma-xilligi uchun | description |
| Markaziy qo'shimchalar: sug'urta, **bolalar bog'chasi granti**, **ota-ona ta'tili** (fully funded talabalar uchun stavka saqlanadi) | description |

**Summa nima uchun yo'q?** Markaziy sahifa **mexanizm va nomzod yo'lini** e'lon qiladi, raqamni emas; kafedralar orasida farq katta.

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 81 | Pass 82 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| **`source_reliability = 5`** | 4 | **0** | **−4** ✅ |
| **bare-domain** | 60 | **56** | **−4** |
| `amount_usd_value > 5000` | 17 | **20** | **+3** (UCSD, WashU, USC — haqiqiy stavkalar) |
| `source_reliability ≥ 9` | 252 | **260** | +8 |
| `source_reliability = 4` | 137 | **137** | 0 |

**`>5000` nima uchun o'sdi:** uch qator endi **e'lon qilingan USD stavkani** ko'rsatadi. Ro'yxatdagi **20 qatorning hammasi** — haqiqiy raqam.

## 4. Tekshiruv

4 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 5. Keyingi qadam

1. **83-pass** — **56 bare-domain**. Ko'pchiligi universitet profillari (`universities` jadvaliga tegishli), lekin bir qismi haqiqiy stipendiya qatorlari — ular ajratilib, `universities` jadvalidagi tegishli sahifa topiladi, topilmasa halol qayd etiladi.
2. Keyin **20 ↔ 114** deduplikatsiyasi (ikkisi ham Kaltech, ikkisi ham 50 000).
3. Keyin **137** `reliability = 4` qator — sahifalar ochilgach.
4. Keyin ochiq bandlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP GAS, UNAM dublikati, 57 universitetda `image_url` yo'q, 134 universitetda tasdiqlangan deadline yo'q.
