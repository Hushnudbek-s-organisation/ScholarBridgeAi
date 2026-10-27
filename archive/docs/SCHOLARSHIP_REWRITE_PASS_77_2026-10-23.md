# ScholarBridgeAi — stipendiyalarni qayta yozish, 77-pass (AQSh doktorlik qatorlari, 3-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan 19 qatordan **3 tasi** tekshirildi.

---

## 1. Tekshirilgan 3 qator

| Qator | Manba | E'lon qilingan fakt | `rel.` |
|---|---|---|---|
| **125** Chicago | `grad.uchicago.edu/admissions/funding/` | **Aksariyat PhD dasturlarida har yili, dissertatsiya oxirigacha kafolatlangan moliyalashtirish**; magistratura **dasturga qarab** (ko'pida merit, ba'zilarida need); tashqi grantlar rag'batlantiriladi | **9** |
| **330** Penn State | `gradschool.psu.edu/funding/` | Eng ko'p tarqalgan yordam — **assistantship**, uni **dastur** beradi; yana fellowship, traineeship, stipendiya, kredit, ish; **xalqarolar uchun sayohat grantlari**; savollarni **program coordinator**ga | **9** |
| **335** UNC-Chapel Hill | `gradschool.unc.edu/funding/basics/financialresources/` | Sahifa **byudjet va soliq**ga bag'ishlangan: GradSense, VITA, **IRS Topic 421** (stipendiya solig'i), Publication 970; savollar — **kafedra biznes-menejeri** yoki Director of Graduate Studies | **8** |

**Nega 9/9/8?** Uchala sahifa ham **kafolat, summa yoki qamrov e'lon qilmaydi** — yo'nalish va havolalarni beradi. 10 qo'yish yolg'on bo'lardi.

## 2. Muvaffaqiyatsiz urinishlar (izohlarda qayd etilgan)

| Manzil | Natija |
|---|---|
| `gradschool.utexas.edu/financial` | **404** (`graduate.utexas.edu/financial` ham 404) |
| `graduate.brown.edu/financial-support` | **yuklanmadi** |
| `gsas.nyu.edu/financial-aid.html` | **404** |
| `graduateschool.wustl.edu/financial-support/` | **HTTP 500** |
| `graduateschool.usc.edu/funding/` | ochildi, lekin bu **blog post** (xalqaro tadqiqot paneli haqida), USC'ning doktorlik moliyalashtirishi haqida emas → **manba sifatida ishlatilmadi** |
| `www.cmu.edu/graduate/financial-support/` (pass 76) | **404** |
| `grad.ucsd.edu/funding/` (pass 76) | **404** |

## 3. `reliability = 5` da qolgan **16** qator

115 Penn · 127 Yale · 136 JHU · 138 Columbia · 148 UCLA · 150 NYU · 306 CMU · 308 UCSD · 320 UT Austin · 329 Brown · 332 BU · 336 Purdue · 340 Georgia Tech · 354 WUSTL · 357 USC · 366 Rochester

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 76 | Pass 77 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 19 | **16** | **−3** |
| **bare-domain** | 75 | **72** | **−3** |
| `source_reliability = 4` | 137 | **137** | 0 |
| `>5000` | 11 | **11** | 0 |

## 5. Tekshiruv

3 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 6. Muhim kuzatuv

**AQShda doktorlik moliyalashtirishi haqidagi sahifalar uch xil bo'ladi:**

1. **Aniq raqam va foiz beradigan** — Cornell (99 %), Duke (5 yillik kafolat), Caltech (stipendiya USD 50 000), MIT, Harvard, Wisconsin. Bular `reliability = 10`.
2. **Kategoriya va yo'nalish beradigan** — Berkeley, UW, Chicago, Penn State. Bular `9`.
3. **Faqat yo'l-yo'riq va soliq maslahati** — UNC. Bu `8`.

Bu farqni **yashirmaslik** kerak: foydalanuvchi "10" ni "aniq summa bor" deb o'qimasligi lozim, shuning uchun har bir izohda nima uchun shu baho qo'yilgani yozildi.

## 7. Keyingi qadam

1. **78-pass** — qolgan **16** qator: Penn, Yale, JHU, Columbia, UCLA, NYU, CMU, UCSD, UT Austin, Brown, BU, Purdue, Georgia Tech, WUSTL, USC, Rochester.
2. Keyin **72 bare-domain** (asosan universitet profillari, ular `universities` jadvaliga tegishli).
3. Keyin **20 ↔ 114** deduplikatsiyasi va **137** `reliability = 4` qator.
