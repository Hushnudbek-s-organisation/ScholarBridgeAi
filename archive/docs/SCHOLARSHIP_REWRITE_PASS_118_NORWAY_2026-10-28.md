# Scholarship Rewrite Pass 118 — Norvegiya (2026-10-28)

## Maqsad

Batch 24 dan keyin navbatdagi tozalash pass: qolgan 19 ta faol rel-4 yozuvdan
**Norvegiya juftligi** — 346 (University of Oslo) va 424 (University of Bergen)
birinchi qo'ldan tekshirildi. Ikkalasi ham importer tomonidan "grant" sifatida
kiritilgan, aslida esa **maoshli PhD lavozimlari** (e'lon qilinadigan vakansiyalar)
ekanligi rasmiy sahifalardan tasdiqlandi.

Muhim pretsedent: NTNU ning aynan shu tipdagi yozuvi (**425 — NTNU Doctoral
Research Fellowships**) oldingi passlarda rel 10 darajasida halol qayta yozib
saqlab qolingan. Shuning uchun 346 va 424 bekor qilinmay, **425 uslubiga
moslab qayta yozildi** — uchta Norvegiya universiteti foydalanuvchi uchun
bir xil, taqqoslanadigan shaklda ko'rsatiladi.

## Fetch qilingan dalillar

- **UiB** — `uib.no/en/phd` ("Pursuing your PhD at UiB", yangilangan 25.09.2026):
  PhD research fellow — maosh + vaqtinchalik xodim huquqlari (ota-ona/ kasallik
  ta'tili pullik, muddat uzaytiriladi); qabul uchun magistratura (odatda ≥5 yil) +
  loyiha tavsifi + **to'liq moliyalashtirish** shart; moliyalashtirishning 2 yo'li —
  UiB vakansiyalar sahifasidagi e'lonlar yoki tashqi ish beruvchi/moliya bilan
  fakultet orqali alohida qabul.
- **UiO** — saqlangan importer URL (`uio.no/english/about/vacancies/phd/`) **404**
  qaytardi. Joriy rasmiy sahifalar fetch qilindi: `uio.no/english/research/phd/`
  va `/before-applying/`: qabul uchun tegishli 5 yillik magistratura (yaxshi
  baho) + rahbar sig'imi + **butun 3 yilga yetarli moliya** shart; eng keng
  tarqalgan moliya — doctoral research fellow sifatida ishga kirish (3 yil, yoki
  majburiy ish — odatda o'qituvchilik — bilan 4 yil); lavozimlar doimiy e'lon
  qilinadi; **o'quv to'lovi yo'q**; PhD nomzodining talaba maqomi yo'q
  (Lånekassen va talabalar yotoqxonasiga huquq yo'q); tashqi moliya bilan ham
  qabul mumkin (to'liq hujjat + kamida 50% progres rejasi).

## Qayta yozilgan yozuvlar (ikkalasi ham rel 4 → 10)

### 346 — University of Oslo Doctoral Research Fellowships

- Sarlavha ko'plikka o'tkazildi ("Fellowship" → "Fellowships", 424/425 bilan
  moslik uchun). Kodlash 425 bilan bir xil: `coverage_type` "Full Funding",
  summa NULL / NOK / `year` / `variable`, `deadline_type` **rolling**,
  `recurrence` **continuous**, status `open`, darajalar ["PhD"].
- Matnlar fetch qilingan UiO sahifalaridan: ishga kirish modeli, 3/4 yillik
  muddatlar, to'lov yo'qligi, talaba maqomi yo'qligi, tashqi moliya yo'li,
  8 ta fakultet dasturi. Maosh summasi saqlanmadi — har e'lon o'z diapazonini
  beradi; `min_gpa`/`min_ielts` NULL (yagona rasmiy raqam yo'q).
- Yon jadval: **us 511** sinxronlandi; undagi importer ixtirosi "Grade B or
  better ECTS" eslatmasi olib tashlandi (fetch qilingan matnda "good grade"
  deyiladi).
- Manba: ildiz-domen manba (2650, `uio.no`) havolasi yangi aniq manba **3119**
  (Before applying sahifasi) bilan almashtirildi; eski manba qatori audit
  uchun saqlandi. `application_url` — UiO vakansiyalar sahifasi.

### 424 — University of Bergen PhD Research Fellowships

- Xuddi shu shakl; matnlar fetch qilingan UiB sahifasidan (maosh + xodim
  huquqlari, to'liq moliya sharti, 7 fakultet ro'yxati, ikki moliya yo'li).
  "O'quv to'lovi olinmaydi" iborasi Norvegiya bo'yicha fetch qilingan UiO
  bayonoti ("there is no tuition fee") va 425 pretsedentiga tayanadi.
- `university_id` NULL edi → katalogdagi **University of Bergen (272)**
  bog'landi va **us 709** qatori yaratildi.
- Manba: ildiz-domen (2648) havolasi yangi **3120** (`uib.no/en/phd`) bilan
  almashtirildi; `application_url` — UiB "Vacant positions" sahifasi.

## Hisoblagichlar (qat'iy tekshiruv)

| Ko'rsatkich | Pass 118 oldin | Pass 118 keyin |
| --- | --- | --- |
| Faol yozuvlar | 554 | 554 |
| Bekor qilingan (retired) | 180 | 180 |
| Faol rel-4 | 19 | **17** (−2) |
| Norvegiya faol rel-4 | 2 | **0** |
| Kelajakdagi deadline lar | 197 | 197 |
| Max source id | 3118 | **3120** |
| Max university_scholarships id | 708 | **709** |

Ketma-ketliklar: `sources_id_seq` 3120, `university_scholarships_id_seq` 709.

Mahalliy tekshiruvlar: `npm run typecheck` ✓, `npm run check:i18n` ✓,
`npm run test:render` **337/337** ✓.

## Qoldirilganlar va keyingi qadamlar

- Importer yozuvlaridagi boshqa rel-4 juftliklar navbatdagi passlarda:
  Chile 467/879, India 397/477, Mexico 343/402 (har biri birinchi qo'ldan
  fetch bilan tekshiriladi; "International Excellence Scholarship" so'nggi
  qo'shimchasi importer ixtirosi bo'lib qolmoqda — e'tibor talab qiladi).
- 425 (NTNU) uchun `universities` katalogida NTNU qatori yo'q — 346/424 bilan
  to'liq simmetriya uchun katalogga universitet qo'shish navbatdagi katalog
  ishlari ro'yxatida qoladi (Karolinska 981, Madina 986 va b. bilan birga).
- Navbat bilan keyingi — **Batch 25** (qo'shimcha yozuvlar): nomzodlar orasida
  KFUPM bakalavr yozuvi (608) ni rel 8 dan birinchi qo'l dalillar bilan
  ko'tarish ham bor.
