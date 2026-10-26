# ScholarBridgeAi — stipendiyalarni qayta yozish, 80-pass (AQSh doktorlik qatorlari, 6-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `reliability = 5` bo'lgan 10 qatordan **3 tasi** to'liq tekshirildi.

---

## 1. Tekshirilgan 3 qator

### **329** Brown — `reliability = 10`

Manba: `graduateschool.brown.edu/financing-support/phd-funding/graduate-student-stipend-information`

| E'lon qilingan fakt | Endi |
|---|---|
| **5 yillik kafolat**: stipendiya + **to'liq tuition remission** + health-services fee + sog'liq/tish sug'urtasi subsidiyasi; **gumanitar va ijtimoiy fanlarda 6 yil** | `Full Funding` |
| **2025–26:** kuz+bahor **USD 19 574,25**, yoz **13 049,50**, **12 oylik jami USD 52 198**, oylik **4 349,83** | **`award_amount = 52 198`** |
| 2026–27 doktorlik tuition: **USD 74 568** (remission — talaba to'lamaydi) | tuition_coverage |
| **Appointment turi soliqqa ta'sir qiladi**: fellowship — soliq ushlanmaydi, kasaba uyushmasidan tashqarida; RA/TA/Proctor — soliq ushlanadi, uyushma ichida | description |
| Qo'shimcha haq to'lanadigan ish — **haftasiga 12 soatdan** oshmasligi kerak | requirements |
| **Xalqaro talabalar:** har kalendar yili **Sprintax Calculus** to'ldirish + har safar AQShdan chiqish/qaytishni xabar qilish | requirements |

### **320** UT Austin — `reliability = 10`

Manba: `graduate.utexas.edu/funding/fellowships/grad-school/recruitment`

| E'lon qilingan fakt | Endi |
|---|---|
| **Harrington Graduate Fellows:** 12 oylik stipendiya **kamida USD 49 000** + **to'liq tuition va majburiy to'lovlar** + sug'urta stipendiyasi + **USD 2 000** allowance | **`award_amount = 49 000`**, `basis = range` |
| Talab: **9 kredit** kuz/bahor, **3 kredit** yoz; **boshqa universitet fellowship'i bilan birga olib bo'lmaydi** | requirements |
| **Doktorlik fellowship'i 1–3 yil**, davomiyligi natijaga bog'liq | description |
| **Nomzod:** kafedra maslahatchisi orqali; **top 10 %**; UT Austin aspiranturasida o'qimagan bo'lishi shart | requirements |
| **Muddatlar: nomzodlar 7-dekabr 2026 → 29-yanvar 2027** | `deadline_date = 2027-01-29` |

### **306** Carnegie Mellon — `reliability = 9`

Manba: `cmu.edu/graduate/prospective/index.html` + `cmu.edu/graduate/funding/index.html` + Tepper sahifasi

| E'lon qilingan fakt | Endi |
|---|---|
| **Magistratura asosan o'z hisobidan**, **PhD kamida qisman moliyalashtiriladi**; **har bir dastur o'zi** qaror qiladi | `coverage = Unspecified` |
| Markaziy qo'shimchalar: **konferensiya USD 750** (guruhga 1 500), **scholarly project USD 750**, **professional engagement USD 250**, **Rales Fellows** | description |
| Doktorlik tuition kollejga qarab farq qiladi: **SCS USD 52 000**, **CIT USD 52 780** | tuition_coverage |
| **Tepper** misoli: **to'liq tuition remission** (W.L. Mellon fellowship) + **5 yillik kafolatlangan stipendiya**, 100 % sug'urta, 5 yil technology fee | description |

**Nega CMU 9?** Universitet darajasida **summa yo'q** — har bir dastur o'zi belgilaydi.

---

## 2. Hisoblagichlar

| Ko'rsatkich | Pass 79 | Pass 80 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `source_reliability = 5` | 10 | **7** | **−3** |
| **bare-domain** | 66 | **63** | **−3** |
| `amount_usd_value > 5000` | 14 | **16** | **+2** (UT Austin 49 000, Brown 52 198 — haqiqiy stavkalar) |
| `source_reliability = 4` | 137 | **137** | 0 |

`reliability = 5` da qolgan **7** qator: **148** UCLA · **150** NYU · **308** UCSD · **332** BU · **354** WUSTL · **357** USC · **366** Rochester.

## 3. Tekshiruv

3 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 4. Keyingi qadam

1. **81-pass** — qolgan **7** qator (UCLA, NYU, UCSD, BU, WUSTL, USC, Rochester) — **qidiruv → rasmiy havola → o'qish** usuli bilan.
2. Keyin **63 bare-domain** (asosan universitet profillari).
3. Keyin **20 ↔ 114** deduplikatsiyasi va **137** `reliability = 4` qator.
