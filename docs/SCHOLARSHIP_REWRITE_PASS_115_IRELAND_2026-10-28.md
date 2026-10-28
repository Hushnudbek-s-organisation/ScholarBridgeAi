# Tozalash — 115-o‘tish: Irlandiya klasteri (Trinity 345, Galway 434) + HKUST dublikati (592) — 2026-10-28

## Qisqacha xulosa

Pass 115 qoldiq rel-4 klasterlaridan **Irlandiyani** (2 yozuv) ishladi: ikkalasi ham rasmiy sahifalar birinchi qo‘ldan o‘qilib **reliability 10** bilan qayta yozildi. Ikkala saqlangan URL ham muammoli edi — TCD saqlangan hub URL fetcher'ga 403 qaytardi (sxema sahifasi `gexpg.php` esa to‘liq o‘qildi), Galway saqlangan URL esa 404 (dastur "Global Galway"ga ko‘chirilgan).

Qo‘shimcha ravishda, Batch 21 da belgilangan **592 vs 51 kesishishi** baholandi va yakunlandi: 592 ("HKUST Admissions Scholarships (international qualifications)", rel 8) 51-yozuv bilan bitta sxema oilasining dublikati ekanligi tasdiqlandi (ustiga eski HK$60,000 chegarasi va `["Bachelor"]` darajasi bilan) — **nafaqaga chiqarildi**, us qatori 188 o‘chirildi.

## Bajarilgan ishlar

### Qayta yozilgan yozuvlar (2)

**345 — `Trinity Global Excellence Postgraduate Scholarships` / Trinity College Dublin (81) — reliability 10, `upcoming`, deadline NULL/`not_published`, NULL EUR/`one_time`/`variable`, `Tuition Credit`**

Rasmiy `gexpg.php` sahifasidan (to‘liq fetch):

- "Exceptional international students" uchun; to‘liq stavkali **postgraduate taught** dasturiga offer bo‘lishi shart. Qiymat: **€2,000–€5,000** (mintaqa bo‘yicha), o‘qish haqiga bir martalik chegirma sifatida hisob-kitobga qo‘llanadi.
- Faqat **non-EU fee status** (non-EU stavka). **Xitoy fuqarolari qatnasha olmaydi** (ular Claddagh Postgraduate Scholarship'ga yo‘naltiriladi).
- **Business, Engineering, Natural Sciences, Computer Science & Statistics kurslari sxemadan istisno** (alohida E3 va Business School sxemalari bor).
- Ariza: onlayn forma (shaxsiy ma'lumotlar + Trinity hamjamiyatiga hissa haqida bayonnoma); saralash rolling (akademik yutuq + jamiyatga hissa salohiyati; mintaqaviy va dastur xilma-xilligi hisobga olinadi); g‘oliblar offer'ni to‘liq qabul qilishi kerak.
- 2026/27 muddatlari (o‘tib ketgan): Afrika 1-may 2026; Amerikalar 1-aprel 2026; boshqa barcha mintaqalar (shu jumladan Markaziy Osiyo) 15-iyun 2026; J-Sh Osiyo va Okeaniya 15-iyul 2026. Keyingi tsikl muddatlari sahifada yo‘q → deadline NULL/`not_published`, rounds'da pattern.
- Tuzatishlar: sarlavha "Award"→ rasmiy "Scholarships"; darajalar ["Master's","PhD"] → **["Master's"]** (faqat taught PG).

**434 — `University of Galway Global Scholarships (non-EU Excellence and Merit awards)` / University of Galway (283) — reliability 10, `open`, deadline NULL/`not_published`, NULL EUR/`year`/`variable`, `Partial Tuition`, us 702 (yangi)**

Rasmiy Global Galway sahifalaridan (hub, landing, 2 kollej sahifasi 2027/2028 nashri, Terms & Conditions):

- Universitetning xalqaro non-EU merit dasturi: ikki oila — **Global Excellence** va **Merit**; o‘tgan yili 280+ mukofot.
- Qiymatlar kollej bo‘yicha: CSE — bakalavrda ko‘plab maktablarda **€5,000/yil** "all successful applicants"ga, **Excellence €10,000/yil**; PGT'da **€2,000** yoki **€2,000–€5,000/yil** (dastur bo‘yicha aniq ro'yxatlar bilan) + Excellence €10,000. CBPL — birinchi kurs bakalavrlarga **€5,000** (Cairnes, Law); mintaqaviy bakalavr paketlari **€15,000–€20,000** (3–4 yilga) — India, China, Vietnam, Brazil, Mexico, Thailand, Uganda, Turkey uchun; PGT'da **50% gacha** (Cairnes — har dasturdan 1 talaba; Law Global Scholarship). Kesishuvchi tarmoqlar: IDEA (AQSh) — 15% chegirma; Latin America magistrlar 50%.
- T&C (2027/28): faqat non-EU; yilda faqat bitta Global Scholarship (ikkinchisi (odatda kichigi) bekor qilinadi); qisman fee waiver to‘liq to‘lovning 50% to‘langandan keyin chegiriladi; **faqat Autumn 2027 kirishi uchun, keyinga qoldirib bo‘lmaydi**; ko‘p yillik mukofotlar har yil progressiya standartida tugatilsa davom etadi; Excellence da belgilangan oynada qabul qilish shart.
- Tuzatishlar: darajalar ["Master's","PhD"] → **["Bachelor's","Master's"]** (PhD — bu dasturda emas); university_id NULL → **283** qo‘yildi (us 702 yaratildi).

### Nafaqaga chiqarilgan (1)

**592 — `HKUST Admissions Scholarships (international qualifications)` — dublikat**

Baholash natijasi: 51-yozuv bilan bitta oila (avtomatik akademik admissions scholarships, shu jumladan malaka diapazonlari va "Other Qualifications" kanali) — 2026-10-23 da tuzatilgan (muddati 2026-11-25). Kamchiliklari: Pass 114 da o‘qilgan amaldagi sahifadagi **HK$65,000** o‘rniga eski **HK$60,000** chegara; `["Bachelor"]` nostandart darajasi; bog‘langan manba yo‘q. Pass 113 shakli bilan nafaqaga chiqarildi (`is_active=false`, `closed`).

### Yon jadvallar

- **Manbalar**: 2625 (345; eski yalang‘och "https://tcd.ie") → `gexpg.php`; 2671 (434; eski yalang‘och domen) → `global-galway/globalscholarships/`. Ikkalasi ham eksklyuziv (1 bog‘lanish); mo‘ljal URL'larda to‘qnashuv yo‘q (tekshirildi).
- **us**: 535 (345, uni 81) sync; **702 (434, uni 283) yangidan yaratildi**; **188 (592) o‘chirildi**. Sequence 702 ga ko‘tarildi.

### Muhim qarorlar

- 434 ni katalog sifatida nafaqaga chiqarmadik: "Global Scholarships" — nomi va yagona T&C qoidalari bo‘lgan dastur; kollej qiymatlari rasmiy sahifalarda aniq (HK oilalari bilan bir xil mantiq). Saqlangan sarlavhadagi "Global Achievement Award" nomi amaldagi universitet darajasidagi mukofot sifatida topilmadi — yozuv URL ko‘rsatgan dasturga qayta bog‘landi.
- Ikkala yozuvda ham `award_amount = NULL` + `variable`, `min_gpa`/`min_ielts` NULL, `amount_usd_value = 0` (EUR).
- 345: o'tib ketgan 2026 muddatlari deadline_date ga yozilmadi (rounds'da "closed"); 434: "Portal is Now Open" banneri asosida status `open`, lekin grantning alohida muddati e'lon qilinmagani uchun sana qo‘yilmadi.

## Hisoblashlar (hard check, 2026-10-28)

| Ko‘rsatkich | Oldin | Keyin |
|---|---|---|
| Active | 547 | **546** (592 nafaqada) |
| Retired | 178 | **179** |
| Active reliability-4 | 25 | **23** |
| Ireland active reliability-4 | 2 | **0** |
| Future deadlines | 193 | **192** (592 ning 2026-11-25 sanasi ketdi) |

## Mahalliy tekshiruvlar

- `npm run typecheck` ✅
- `npm run check:i18n` ✅
- `npm run test:render` ✅ 337/337

## Resurslar (fetch qilingan rasmiy sahifalar)

- TCD (to‘liq): https://www.tcd.ie/study/international/scholarships/postgraduate/gexpg.php (saqlangan hub URL — 403)
- Galway hub: https://www.universityofgalway.ie/internationalscholarships/
- Galway landing: https://www.universityofgalway.ie/global-galway/globalscholarships/
- Kollej sahifalari: …/collegeofscienceandengineeringglobalscholarships/ va …/collegeofbusinesspublicpolicylawglobalscholarships/
- Shartlar: https://www.universityofgalway.ie/global-galway/globalscholarships/scholarshiptermsconditions/

## Keyingi qadamlar (tavsiya)

1. **Batch 22 (qo‘shimchalar)**: Irlandiya izidan — **Government of Ireland International Education Scholarships (GOI-IES)** mustaqil yozuv sifatida kuchli nomzod (ikkala universitet sahifasida ham tilga olingan; HEA rasmiy sahifasidan tekshirish kerak). Shu bilan birga avvalgi nomzodlar (Stockholm Trio/ICAL, KTH India, va boshqalar).
2. **Pass 116** — keyingi 2 yozuvli klasterlar (Chile, India, Mexico, Norway, Saudi Arabia, UAE bittasi).
