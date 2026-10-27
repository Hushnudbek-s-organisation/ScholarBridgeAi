# ScholarBridgeAi — stipendiyalarni qayta yozish, 62-pass (AQSh: 30/31-pass qatorlarini qayta tekshirish)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** AQSh — 11 qator qayta tekshirildi va tuzatildi.
**Manba:** faqat universitetlarning o'z sahifalari.

---

## 1. Qayta yozilgan 11 qator

| Qator | Avval | Endi |
|---|---|---|
| **495** Pitt | "USD 10 000", o'lik URL | **USD 10 000 — eng yuqori chegara** (`range`), 8 semestr. **1-fevral**gacha to'liq ariza → **avtomatik** ko'riladi, oktyabrdan rolling, javob **1-aprelgacha**. Faqat **kuzgi** qabul; xalqaro **transfer**lar **umuman** hisobga olinmaydi. Yangi ishlaydigan URL |
| **538** ASU | USD 17 500 "har kimga" | **5 pog'ona**: 4.0+ → **17 500**, 3.81–3.99 → 15 500, 3.41–3.80 → 13 500, 3.11–3.40 → 12 000, 3.01–3.10 → 10 000. Transferlarda alohida shkala. **8 semestr** yangilanadi. 12 kredit (9 tasi jonli). **To'liq sponsor bo'lsa stipendiya bekor qilinadi** |
| **605** JHU | "USD 66 000 grant" | **USD 66 000 — o'rtacha** stipendiya, mukofot emas. 2026–27 dan: **≤200 000 → tuition bepul**, **≤100 000 → ota-ona 0** ($91 000 tipik stipendiya). 8 daromad pog'onasi. Need-blind, **ssudasiz**. Xalqaro talaba qabulda olgan bo'lsa **qayta ariza bermaydi**. COF majburiy, CSS **5332**, muddat **15-yanvar** |
| **628** MSU | USD 18 000 "award" | **6 pog'ona**: President's **18 000**, Provost's 15 000, Dean's 12 000, 1855 9 000, Beaumont Tower 5 000, Global Community 3 000. Qaror **fevral o'rtasi**. Honors College Excellence **13 000**/yil, Professorial Assistantship **~3 500**/yil |
| **694** UC Davis Regents | USD 7 500, "ochiq" | **USD 7 500/yil**, bakalavrga **4 yil**, 3-kurs kiruvchiga 2 yil; **3.25 GPA** bilan yangilanadi; qo'shimcha **need-based stipend** bo'lishi mumkin. Muddat **2-dekabr** (UC arizasi). **Fuqarolik cheklovi e'lon qilinmagan**, lekin tekshiruv sahifasi **403** qaytardi → `source_reliability = 8` |
| **702** UCSD | "Regents 20 000" | **Regents — FAQAT** US fuqarosi/rezidenti/CA Dream Act; **xalqaro talaba ololmaydi**. Xalqaro uchun **Triton Scholars**: **5 000–20 000/yil**, 4 yilgacha, **avtomatik**. Yangilash: non-resident maqomini saqlash, **NRST waiver olmaslik**. Muddat **30-noyabr** |
| **706** UMass | USD 16 000 | **16 000 gacha** (`range`), **avtomatik**, faqat bakalavr. Universitet **xalqarolarga need-based yordam bera olmasligini** ochiq yozadi → talaba **mablag'ini tasdiqlashi** shart. Bahor qabuli xalqarolarga deyarli yopiq |
| **749** UMN GES | USD 20 000 | **5 000–20 000/yil**, 4 yilgacha; transfer **10 000/yil**, 3 yilgacha. Bu **faqat tuition uchun non-resident waiver**. **Viza** (F-1/H-4/L-2/E-2/TD) shart. Minnesota/Wisconsin/ND/Manitoba **recriprocity** oladiganlar **chiqarib tashlanadi**. Universitet **to'liq stipendiya bermaydi** |
| **757** Rochester Meliora | USD 35 000 | **10 000–35 000**, **o'rtacha ~20 000**; 2026–27 da qabul qilinganlarning **~75 %** olgan. Bitta talaba **faqat bitta** merit mukofot oladi. Faqat **tuition**ga. Handler Scholarship — to'liq qo'llab-quvvatlash, lekin **begona odamning nominatsiyasi** kerak |
| **803** Yale | USD 75 220 | **75 220 — o'rtacha** stipendiya. Yale **xalqaro talabalar uchun ham need-blind** ("for any student, anywhere in the world"), 100 % ehtiyoj, **ssudasiz**. **<100 000 → 0** (sug'urta + **2 000** start-up), **<200 000 → tuition 0**. Muddat: EA **1-noyabr** (AQSh) / **1-dekabr** (xalqaro), RD **15-fevral**, transfer **1-aprel**. CSS **3987**, FAFSA **001426** |
| **815** Princeton | USD 83 000 | **83 000 — o'rtacha grant**. Princeton **xalqarolarga ham bir xil siyosat** qo'llaydi, PFAA **bepul**. 2026–27: tuition **68 140**, to'liq COA **90 574**, o'rtacha grant **83 000**, o'rtacha net cost **7 574**. Daromad jadvali: 150 000 → **0**, 200 000 → 12 500. Muddat: EA **9-noyabr**, RD **1-fevral**, transfer **9-mart** |

Kartalar (`university_scholarships`): **493, 282, 30, 276, 101, 65, 111, 206, 220, 382, 381**.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **O'rtachani mukofot deb yozish** | 605 (66 000), 803 (75 220), 815 (83 000) | Uchtasi ham **o'rtacha** → `amount = 0`, raqam tavsifda qoldi |
| 2 | **Chegarani qat'iy summa deb yozish** | 495 (10 000), 538 (17 500), 628 (18 000), 706 (16 000), 749 (20 000), 757 (35 000), 702 (20 000) | Hammasi **pog'ona/interval** → `award_basis = 'range'`, izohda "eng yuqori chegara" deb belgilandi |
| 3 | **Ikki xil mukofotni birlashtirish** | 702 | Regents **xalqaroga yopiq**, Triton Scholars **ochiq** — ikkisi ajratildi |
| 4 | **Yashirin to'siq aytilmagan** | 538, 749 | ASU: **to'liq sponsorlik** stipendiyani bekor qiladi; UMN: **recriprocity** oladiganlar chiqarilgan |
| 5 | **O'lik URL** | 495 | `…/international-student-merit-scholarships` → 404; `…/international-student-scholarships` ishlaydi |
| 6 | **Bare-domain URL** | 605 (`sfs.jhu.edu`) | `…/applying-for-financial-aid/` ga o'zgartirildi |
| 7 | **Need-blind siyosati yozilmagan** | 803, 815, 605, 706 | Yale/Princeton **xalqarolarga ham need-blind**; JHU — need-blind + sudasiz; UMass — need-blind, lekin xalqarolarga need-based yordam bermaydi |
| 8 | **Daromad chegaralari yo'q** | 605, 803, 815 | JHU 100k/200k, Yale 100k/200k, Princeton 150k → 0 hissa |
| 9 | **Muddat noto'g'ri** | 694 ("1-yanvar" emas, 2-dekabr), 702 (30-noyabr), 815 (9-noyabr / 1-fevral / 9-mart), 803 (xalqaro EA **1-dekabr**) | Har biri e'lon qilingan sana bilan almashtirildi |

---

## 3. Uch muhim topilma

**1) AQShning eng yaxshi universitetlari O'zbekiston nomzodiga ochiq — lekin shart bilan.**
Yale va Princeton **xalqaro talabalar uchun ham need-blind** va 100 % ehtiyojni qoplaydi. MIT (61-pass) ham shunday. Bu uchlik — AQShda moliyaviy yordam so'rash qabul imkoniyatini **pasaytirmaydigan** kam sonli maktablar.

**2) Regents — xalqaro talaba uchun ko'pincha yopiq.**
UCSD Regents sahifasi ochiq yozadi: *"United States citizens, permanent residents, or California Dream Act students"*. UC Davis sahifalari esa jim; tekshirish sahifasi 403 qaytardi. Shu sababli 694-qator `source_reliability = 8` — summa va muddat tasdiqlangan, **xalqaro eligibility tasdiqlanmagan**.

**3) Pitt va MSU'da "sponsorlik" tuzog'i.**
ASU: *"If students become fully sponsored, the scholarship will be cancelled."* Ya'ni El-Yurt Umidi yoki boshqa davlat grantini olgan talaba ASU stipendiyasini **yo'qotadi**. Bu — O'zbekiston nomzodlari uchun eng amaliy ogohlantirish.

---

## 4. Hisoblagichlar (pass 62 dan keyin)

| Ko'rsatkich | Pass 61 | Pass 62 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 149 | **146** | **−3** |
| shundan **AQSh** | 12 | **9** | **−3** |
| importer-shablon tavsif | 0 | **0** | 0 |
| bare-domain `website_url` | 85 | **84** | **−1** |
| `source_reliability = 4` | 29 | **29** | 0 |
| `source_reliability = 5` | 27 | **27** | 0 |

**AQShning `>5000` ro'yxati endi 9 qatordan iborat va hammasi tasdiqlangan**: 20 Caltech PhD (50 000 — e'lon qilingan stavka), 757 Rochester (35 000 — eng yuqori pog'ona), 702 UCSD (20 000 — Triton chegarasi), 749 UMN (20 000 — chegara), 628 MSU (18 000 — President's Award), 538 ASU (17 500 — eng yuqori pog'ona), 706 UMass (16 000 — chegara), 495 Pitt (10 000 — chegara), 694 UC Davis (7 500 — qat'iy summa). **AQShda uydirma summa qolmadi.**

---

## 5. Tekshiruv (hard-check)

`id IN (495,538,605,628,694,702,706,749,757,803,815)` uchun `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`, `bad_countries`, `bad_notes` — **hammasi `false`**.

Sifat darvozalari: `npx tsc --noEmit` — **0** · `npm run check:i18n` — **passed** · `npm run test:render` — **337 passed, 0 failed**.

---

## 6. Keyingi qadam

1. **63-pass** — AQSh bo'lmagan klasterlar: **Avstraliya 25**, **Kanada 15**, **Shveytsariya 9**, **Xitoy 9**, **Gonkong 8**, **Janubiy Koreya 6**, **Shvetsiya 6**, **Singapur 6**, **Yangi Zelandiya 5**.
2. Keyin `source_reliability = 5` bo'lgan **27** AQSh doktorlik qatori — har biriga universitetning o'z moliyalashtirish sahifasi.
3. Keyin **84** bare-domain, keyin ochiq qolganlar (Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP GAS, **343**-qator, UNAM dublikati).
