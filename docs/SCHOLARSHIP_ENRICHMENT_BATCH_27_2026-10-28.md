# Enrichment Batch 27 — Shvetsiya boyitishi (Axel Adler 739 rel 10; yangi: Malmsten 988, LiU 989; Chalmers 421 qayta tekshiruv)

**Sana:** 2026-10-28
**Natija:** 739 rel 9→10; **ikki yangi yozuv** — 988 Richard C. Malmsten Memorial Foundation Scholarship, 989 LiU International Scholarship; 421 rel 9 da qoldi (sababi quyida).

## Tekshirilgan rasmiy sahifalar (birinchi qo'ldan fetch qilindi)

1. **University of Gothenburg** — Axel Adler sahifasi (so'nggi o'zgartirish 2026-10-08; mavjud manba 2533) + **«Requirements for the Axel Adler Scholarship 2027» PDF** (yangi manba **3129**).
2. **GU School of Business, Economics and Law** — stipendiyalar sahifasi (2026-10-15; yangi manba **3130**).
3. **Linköping University** — `liu.se/en/article/scholarships` (yangi manba **3131**) + degree-studies sahifasidagi sanalar jadvali.
4. **Chalmers** — stipendiyalar sahifasi qayta fetch qilindi.

## Qarorlar

### 739 — UPLIFT rel 9 → 10 (Axel Adler Scholarship)

- **Haqiqiy deadline topildi:** PDFga ko'ra stipendiya arizasi taklif (invitation) asosida **2027-yil 10-fevral – 8-mart** oralig'ida topshiriladi → `deadline_date = 2027-03-08`, `fixed`. Ilgarigi xato takrorlanmadi: 15-yanvar — qabul (admission) muddati, stipendiyaniki emas.
- **Uydirma minimallar olib tashlandi:** `min_gpa 3.3` / `min_ielts 6.5` importer qoldig'i edi (yozuvning o'z matni bilan ham zid edi) → NULL.
- Fetchdan qo'shildi: butun dastur davomida to'liq tuition waiver (120/60/180 kredit), **FAS+ sug'urta**, first-priority qoidasi, CV + motivatsiya xati (har biri ≤3000 belgi, tizim ichida), natijalar 2027-yil 12/15-aprel, semestr kreditlarining ≥75% ini saqlash sharti, residence permit shartlari, mos bakalavr dasturlari ro'yxati.
- Malmsten paragrafi alohida yozuvga (988) chiqarildi; Sustainability varianti — 967 ga havola qoldirildi. Manba havolalari ilgari yo'q edi: (739, 2533) + (739, 3129) qo'shildi. us **130** sinxronlandi (`valued_aspect` dagi «Swedish C1» importer artefakti tuzatildi).

### 988 — YANGI YOZUV (Richard C. Malmsten Memorial Foundation Scholarship)

- To'qqizta Graduate School MSc dasturi uchun: **SEK 100,000 — 2 yilga** (semestriga SEK 25,000 waiver). Yagona rasmiy qat'iy summa bo'lgani uchun `award_amount=100000, SEK, 'total', 'fixed'` kodlandi; USD qiymat 0.
- Aslida bu GMAT musobaqasi: GMAT balli bo'yicha ranking, ballsizlar ko'rilmaydi; Swedish Institute / GU stipendiyasi egalari chiqariladi; komissiya qarori shikoyat qilinmaydi. GMAT minimumi alohida sahifada — fetch qilinmagani uchun raqam kodlanmadi.
- 2026 raund yopilgan (3-fev – 17-mar 2026); 2027 ma'lumoti **2026-yil noyabrda** e'lon qilinadi → `deadline NULL / not_published` + rounds, status `upcoming`. Universitet 136; yangi us **711**.

### 989 — YANGI YOZUV (LiU International Scholarship)

- Katalogdagi birinchi Linköping yozuvi. Yangi fee-paying magistrantlarga tuition odatda **50% kamayadi** — lekin foiz va son har yili universitet ixtiyorida (qoidalar «to'liq yoki qisman» deydi) → `variable`. Agregatorlardagi eski «25/50/75%» zinapoyasi ishlatilmadi.
- **2026-yildan qattiq akademik pol:** GPA ≥3.5/4.0 yoki ekvivalent (misollar: Hindiston 75%+, Xitoy 80–85%+, 10 ballik tizim 8.0/10+) → `min_gpa=3.5` (rasmiy 4.0 ankara), ekvivalentlar matnda.
- Jarayon: first-round ariza + LiU priority 1 + first choice ga qabul (natijalar 2027-yil 1-aprel); stipendiya oynasi natijalar kunidan qisqa muddatga ochiladi (sana TBD) → `not_published` + rounds. Saqlash sharti: 1-iyulgacha birinchi yil kreditlarining ≥75% i (45/60).
- `universities` da Linköping qatori hali yo'q → `university_id NULL`, us qatori yo'q (backlink backlogga, 981/986 kabi).

### 421 — Chalmers: rel 9 da qoldi (ataylab)

Sahifa 2026-10-28 da qayta fetch qilindi: u hamon «2027 admission round ma'lumoti bilan yangilanmagan» deb yozilgan. Operatsion da'volar (portal oynasi noyabr oxiri 2026 – yanvar o'rtalari 2027 va h.k.) o'zgarmagani tasdiqlanib, yozuvga qayta-tekshiruv izohi qo'shildi; sahifa yangilanishi bilan (portal ochilishi atrofida) rel 10 ga qaytamiz. Sun'iy ravishda 10 qo'yilmadi.

## Yon-jadvallar va texnik yozuvlar

- Yangi manbalar: **3129** (Axel Adler 2027 PDF), **3130** (GU business sahifasi), **3131** (LiU sahifasi). Havolalar: (739, 2533), (739, 3129), (988, 3130), (989, 3131).
- us: **130** yangilandi, **711** yaratildi. `setval`: scholarships 989, sources 3131, us 711.
- 967 (Axel Adler Sustainability) tegilmadi — lekin unda deadline 2027-01-15 (admission sanasi) saqlangani qayd etildi; uning 2027 Sustainability PDF i bilan alohida mikro-tuzatish navbatga qo'yildi.

## Tasdiqlangan hisoblagichlar

- **553 active / 184 retired / 13 active rel-4 / 197 future-dated**; max idlar: scholarships 989, sources 3131, us 711.
- Lokal tekshiruvlar: typecheck / i18n / render — **337/337**.

## Qoidaga muvofiqlik

- Uydirma miqdor yoki deadline kiritilmadi: 8-mart 2027 — PDFdagi real oyna yopilishi; SEK 100,000 — sahifadagi yagona qat'iy summa; LiU foizi «odatda 50%, har yili belgilanadi» deb boricha yozildi; TBD oynalar sana sifatida kodlanmadi.
- Alohida nomli real sxema (Malmsten) umumiy yozuv ichida qolmasdan, individual tekshiruvdan so'ng o'z yozuvini oldi.
- 421 da halollik ustun qo'yildi: bloklovchi shart (2027 shartlari e'lon qilinmagan) saqlanib turgani uchun rel oshirilmadi.

## Replay

`supabase/scholarship_enrichment_batch27_2026-10-28.sql` — amalda bajarilgan barcha bayonotlar.

## Keyingisi

- **Pass 121** — Chili 467/879 tozalash (rel-4).
- Navbatda: Chalmers 421 rel 10 (sahifa yangilanishi bilan); 967 deadline konsistensiyasi; Helsinki 742 (rel 9) uplift nomzodi; Linköping universitet qatori + backlink.
