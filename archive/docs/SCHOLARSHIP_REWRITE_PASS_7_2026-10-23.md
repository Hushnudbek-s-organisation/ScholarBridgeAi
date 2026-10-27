# Kamchiliklarni tuzatish — 7-qadam (2026-10-23)

Yana **3 ta** yozuv rasmiy manbadan qayta yozildi, va yo'l-yo'lakay **43 ta yozuvdagi
tarjima xatosi** topildi.

---

## 1. Qayta yozilganlar

| ID | Stipendiya | Oldin | Hozir (rasmiy) |
|---|---|---|---|
| 537 | **Amsterdam Merit (UvA)** | shablon, Bachelor+PhD ham yozilgan | **Faqat magistratura**; fakultetga qarab **EUR 25 900** (Law School 2026-27) yoki kontraktga teng; 15-yanvar |
| 572 | **Duke** | $100 000 "Full Ride", Master+PhD | **Faqat bakalavr**; yiliga **20–25** xalqaro talaba to'liq ehtiyoj bilan; o'rtacha grant **$87 841** |
| 570 | **LMU Munich** | "Tuition-Free" + Deutschlandstipendium **bitta narsa** sifatida | Bavariyada **kontrakt yo'q** (bu davlat siyosati) + alohida **EUR 300/oy** stipendiya |

### 537 — UvA: eng chalg'ituvchi shart

Amsterdam Merit Scholarship fakultetga qarab **butunlay boshqacha**:
- **Law School:** EUR 25 900 (2026-27)
- **Ijtimoiy va xulq-atvor fanlari:** *kontraktga teng*, lekin — muhim! — bu **kontraktdan ozodlik emas**.
  Talaba kontraktni **to'liq to'laydi** (bo'lib-bo'lib), stipendiya esa alohida oylik to'lov sifatida keladi.
  Buni noto'g'ri tushunish oson, shuning uchun `notes` ga yozildi.
- **Iqtisod va biznes:** kontrakt + EUR 5 000 qo'shimcha.

### 572 — Duke: bitta "checkbox" hal qiladi

Duke'ning o'z siyosatida:
- Yiliga **20–25** xalqaro talaba to'liq ehtiyoj bilan qabul qilinadi (butun dunyodan).
- Xalqaro talabalar uchun qabul **need-aware** — yordam so'raganlar alohida, qattiqroq poyga.
- ⚠️ **Birinchi kurs arizasida "financial aid interest" katagini belgilamasangiz — keyin hech qachon**
  yordam olmaysiz. Bu qoida bazada umuman yo'q edi.
- O'rtacha grant: **$87 841** (Common Data Set 2025-26).

### 570 — LMU: siyosat va stipendiyani aralashtirish

Bavariyada davlat universitetlarida **kontrakt yo'q** — bu **stipendiya emas, davlat siyosati**.
Uning ustiga LMU **Deutschlandstipendium** beradi: **EUR 300/oy** (yarmi xususiy homiy, yarmi federal
hukumat). Ilgari ikkalasi bitta "stipendiya" sifatida ko'rsatilgan edi.

## 2. Yangi topilgan xato — 43 ta yozuvda tarjima ishlamaydi 🔴

`coverage_type` ustunida **43 ta turli xil qiymat** bor edi: `Full Ride`, `Stipend`,
`Partial (Monthly Stipend)`, `Full (Tuition + Living + Fees)` va h.k.

Ilova uz/ru tilida faqat **8 ta kanonik qiymatni** tarjima qiladi
(`Full Tuition + Stipend`, `Full Tuition`, `Partial Tuition`, `Full Funding`,
`Partial Funding`, `Tuition Waiver`, `Living Stipend`, `Unspecified`).

Ya'ni o'zbek tilida sahifa ochsa, **43 ta stipendiyada "Full Ride" yoki "Partial (Monthly Stipend)"**
deb inglizcha chiqardi. Hammasi kanonik qiymatlarga keltirildi.

## 3. Nazoratga yangi tekshiruv

`npm run test:scholarship-detail` endi `coverage_type` ni ham tekshiradi:

> `coverage_type stays inside the values the UI can translate`

Shu kabi xato qaytmasligi uchun.

## 4. Holat

| Ko'rsatkich | 6-qadamdan keyin | Hozir |
|---|---|---|
| Shablon tavsif | 242 | **239** |
| Faqat domen havola | 275 | **272** |
| Kanonik bo'lmagan `coverage_type` | 43 | **0** ✅ |

Jami **34 / 635** yozuv (5.4%) to'liq qayta yozildi.

## 5. Ochilgan sahifalar

`uva.nl` (3) · `financialaid.duke.edu` (3) · `admissions.duke.edu` (2) · `lmu.de`

**404:** `uva.nl/.../ams.html` (eski manzil), `financialaid.duke.edu/apply-aid/international-students/`
— ikkisiga ham yangi manzil topildi.

## 6. Keyingi navbat

Universiti Malaya MIS, Korea University, CityU, NTU Taiwan, UCSD, KFUPM, UT Austin, Monash,
Manchester, Bristol, Warwick.
