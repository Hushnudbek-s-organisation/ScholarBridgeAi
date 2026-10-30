# Scholarship Rewrite Pass 132 — Malaysia oilasi: CGPA minima'si tekshiruvi va tuzatish (2026-10-30)

## Bu pass'da nima qilindi

Malaysia oilasi avvalgi oilalardan farq qildi: Britaniya/AQSh dagi kabi barcha raqamlar shablon emas — Malaysiya universitetlari haqiqatan ham CGPA chegaralarini e'lon qiladi. Shuning uchun 7 ta yozuv (603 MIS, 677 Taylor's, 703 UCSI, 776 USM, 805 UTM, 811 IIUM, 842 Sunway) alohida o'rganildi va natija uch xil bo'ldi. Uydirma miqdor yoki deadline kiritilmadi.

### Birinchi qo'ldan tuzatildi (manbalar 3173–3176, havolalar 471–474, `last_verified_at` yangilandi)

- **603 MIS:** rasmiy MIS 2026 qo'llanmasi (PDF) va MOHE INTER portali o'qildi. `min_gpa` **3.4 → 3.00** tuzatildi (qo'llanma: CGPA 3.00 / 2nd Class Upper; 3.4 yon-jadvalning o'zida ko'rsatilgan "13-country Top-10 guide" importi edi). `min_ielts` NULL qilindi — uchta rasmiy ingliz tili yo'li bor (IELTS 6.0 / TOEFL PBT 550 / ingliz tilida o'qilgan oldingi diplom); "TOEFL 75 / DET 105" rasmiy matnda yo'q edi. **O'zbekiston qabul qiluvchi davlatlar ro'yxatida so'zma-so'z tasdiqlandi.** `source_url` studymalaysia.com dan rasmiy portalga ko'chirildi; yon-jadval to'liq qayta yozildi.
- **811 IIUM Postgraduate Ummatic:** CPS sahifasi so'zma-so'z: ikkala diplomda ham **CGPA ≥ 3.70** → `min_gpa` **3.0 → 3.7** (3.0 bakalavriat Ummatic chegarasi edi — noto'g'ri ko'chgan). `min_ielts` NULL (IELTS 6.5 / TOEFL iBT 73–93 / IIUM bitiruvchisi — uch yo'l).
- **805 UTM International Doctoral Fellowship:** sahifa mezonlari faqat maqomga oid (faol PhD, 1–6 semestr, boshqa yordam yo'q) — CGPA chegarasi yo'q → 3.1 NULL qilindi.

### O'z matni bilan NULL qilindi (677, 703, 842)

Uchtasi ham tasdiqlangan matnida pog'onali, ko'p shkalali jadvallarni tasvirlaydi (Taylor's ≈3.30/≈3.70 bandlari; UCSI malakaga qarab pog'onalar; Sunway ko'p shkala kirish + 3.25/3.45 yangilash chegaralari) — yagona 3.0 raqami bunday jadvalni buzib ko'rsatadi.

### Maxsus holat — 776 USM (NULL + bayroqcha)

3.2 na o'z yozuvlari (3.33) ga, na bugun qayta o'qilgan sahifaga mos keladi. Muhimi: USM sahifasi **aylanib ketgan** — endi u yerda USMCARE / Graduate Horizon / PGRA turibdi, yozuvdagi "Graduate Scholarship" yo'q. Shuning uchun manba zarb qilinmadi, `last_verified_at` yangilanmadi, yozuvga keyingi enrichment batch'da to'liq qayta aniqlash (mukofot tugaganmi, nomi o'zgarganmi, ko'chganmi) kerakligi qayd etildi.

## Natija

- 5 ta yozuvda minima butunlay NULL; 2 tasida (603, 811) rasmiy yagona shkala-aniq CGPA saqlanib, to'g'ri qiymatga tuzatildi.
- Rel ≤ 8 + minima mavjud yozuvlar: **64 → 59** (Pass 129 dan beri 94 → 59).
- Hisoblagichlar o'zgarmadi: **546 faol / 205 iste'fodagi / 1 ta rel-4 (876) / 208 kelajak-deadline**.

## Qoldiq navbatlar

- Navbatga ko'ra keyingi bosqich — **Batch 39** (birinchi nomzod: 776 USM ni to'liq qayta aniqlash; USMCARE alohida yozuv sifatida ham baholanishi mumkin — O'zbekiston low/lower-middle income toifasiga kiradi).
- Minima navbati (59): keyingi guruhlar — Australia 6, US 5, Hong Kong/India/South Korea 4 tadan.
