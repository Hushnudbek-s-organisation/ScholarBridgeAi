# Enrichment Batch 34 — 2026-10-29

## Avval: baza holati haqida ikkita eslatma (muhim)

1. **Batch ochilganda hisoblagichlar 536 faol / 205 nafaqada edi** (Pass 127 yopilganda 544/197 bo'lgan). 8 ta yozuv `last_updated_at` ni yangilamasdan faolsiz qilingan — repo ichida bunday avtomatika topilmadi (cron/edge-function yo'q), demak o'zgarish tashqaridan (Supabase admin/boshqa sessiya) bo'lgan. Aynan qaysi 8 ta ekanini hozir isbotlab bo'lmaydi; "jonli ko'rinadigan lekin faolsiz" yuqori ishonchli (rel ≥ 9) 18 ta yozuv aniqlandi (106 Imperial President's PhD, 109 Gates Cambridge, 111 ETH ESOP, 124 Schwarzman, 395 USM, 399 PUCV, 448 Hokkaido va b.) — ular **Pass 128** da alohida audit qilinadi. Bu batchda ularga tegilmadi.
2. **Batch davomida parallel sessiya ishladi:** 995–998 yozuvlar (KAIST, Warwick, NUS, Nanyang) boshqa sessiya tomonidan qo'shildi. Ularga ham tegilmadi; quyidagi raqamlar ikki qatlamda berilgan — batchga tegishli o'zgarish va hujjat yozilishidagi jonli holat.

## 1) YANGI: 994 — Outstanding International Student Award (UBC)

UBC ning bir martalik kirish granti katalogda yo'q edi (faqat yenilanadigan IMES bor edi). Rasmiy sahifadan birinchi qo'ldan yozildi (manbalar 3154/3155):

- **CAD 10 000–25 000, bir martalik** (sahifadagi 2025/26 qiymatlar; diapazon bo'lgani uchun strukturaviy summa NULL, CAD/one_time/variable). Alohida ariza yo'q — qabul arizasi bilan avtomatik ko'rib chiqiladi; o'rta maktabdan ham, OTMdan o'tuvchilardan ham.
- Deadline: UBC qabul muddati — **2027-yil 15-yanvar** (2027 sentabr qabuli); ariza 2026 oktabr boshida ochilgan, shuning uchun `status=open`. GPA/IELTS kesim ballari e'lon qilinmagan → minima NULL; ingliz tili UBC ELAS standarti bo'yicha.
- Yon jadvalga us 712 qo'shildi (UBC, 49). Okanagan avtomatik grantlari (8 000/5 000/6 000) bu batchga kiritilmadi.

## 2) UPLIFT: 602 — UBC IMES, rel 8 → 10

Xuddi shu rasmiy sahifalar asosida: uydirma `min_gpa 3.6` / `min_ielts 7` olib tashlandi (UBC raqamli kesim e'lon qilmaydi); daraja "Bachelor" → "Bachelor's"; strukturaviy summa diapazon konventsiyasiga o'tkazildi (25 000/range → NULL, CAD/year/variable); operatsion muddat saqlandi — ariza ochiq, deadline 2027-01-15, qarorlar fevral o'rtasi–aprel. Yon-qator us 47 butunlay qayta yozildi (unda "Full Ride" va "GPA 3.6+, IELTS 7.0+" kabi uydirma ma'lumotlar bor edi; IMES to'liq xarajatni qoplamaydi).

## 3) Micro-repairlar

- **687 SGS@Tongji** (rel 9 saqlandi): Munitsipal qo'llanma bugun birinchi qo'ldan qayta olindi va manba 3156 sifatida bog'landi (ilgari sources qatori yo'q edi). Type A/B, yosh chegaralari 25/35/40, fevral–aprel okna, yillik baholash tasdiqlandi. Ammo qo'llanmaning joriy matni til barini umumiy beradi ("odatda HSK4 + universitet talablari"), summalar esa faqat rasm-ilovada — demak yozuvdagi aniq HSK 5/6 chegaralari va stipendiya summalari 2026-10-23 o'qilishga tayanadi, bugun qayta tasdiqlanmadi; rel 10 ga ko'tarilmadi. `min_gpa 3.4`/`min_ielts 6.5` NULL qilindi, status `upcoming`.
- **541 GT-IF** (rel 7 saqlandi): ITB partnership sahifasi qayta o'qildi — GT-IF hali ham "deadline: to be announced". `sps.itb.ac.id/gta` o'lik (SPITM 404), demak to'liq uplift hali mumkin emas. `application_url` boshqa sxema (KNB) sahifasidan GT-IF ning o'z portali (sagata) ga tuzatildi; us 228 dagi bema'ni "SBMPTN/National Exam" yozuvi to'g'rilandi.
- **44 Fudan CSC**: Pass 127 dagi SGS ishorasiga yozuv raqami qo'shildi ("record 687").

## 4) Zondlar (o'zgarishsiz)

- **CTU** (875/876): host yana "Service temporarily unavailable". **UM** (500): aasd sahifa yana olinmadi. Ikkalasiga ham hechnarsa yozilmadi.
- Nomzod tekshiruvlari: SGS (687), Heydar Əliyev (926), Brunei (932), Latvia (508), Kazakhstan (534) allaqachon katalogda — dublikat yaratilmadi.

## Natija

- **Batch hissasi:** +1 yangi yozuv (994), +3 manba (3154–3156), +5 havola (428–432), +1 us qatori (712); kelajak-muddatli yozuvlarga +2 (602 va 994: 2027-01-15). Batch ochilishi 536/205/1/197 → batch hisobiga **537/205/1/199**.
- **Jonli holat (hujjat vaqti):** **541 faol / 205 nafaqada / 1 rel-4 (876) / 203 kelajak-muddat**; maks ID 998/3156/716/432 — farq parallel sessiyaning 995–998 yozuvlari. Ketma-ketliklar joriy maksimumlarga sinxronlandi.
- Mahalliy tekshiruvlar: typecheck ✓, check:i18n ✓, render 337/337 ✓.

Keyingi qadam: **Pass 128** — "jonli ko'rinadigan faolsiz" 18 ta rel≥9 yozuv auditi (har biri qayta tekshirilib, yo qayta faollashtiriladi, yo to'g'ri yopiladi).
