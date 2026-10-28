# Scholarship Enrichment Batch 25 (2026-10-28)

## Maqsad va ko'lam

Bu batch **ko'tarish (uplift) batchi** bo'ldi: yangi yozuv o'rniga mavjud ikki
yozuv birinchi qo'ldan qayta tekshirilib rel 10 ga chiqarildi — **608**
(KFUPM bakalavr, rel 8 → 10) va **673** (Stockholm University Scholarship
Scheme, rel 9 → 10). Qo'shimcha nomzod **POSCO Global Scholarship in Korea**
rasmiy fond sahifasidan tekshirildi va rad etildi (quyida).

## 608 — KFUPM International Undergraduate Scholarship (rel 8 → 10)

Fetch qilingan rasmiy sahifalar: KFUPM "Tuition costs and Scholarships"
(yangi manba **3121**), "Apply as an International Student" (yangi manba
**3122**) va qabul portali `apply.kfupm.edu.sa`.

Asosiy tuzatishlar:

- **`min_gpa` 3,7 va `min_ielts` 6,0 olib tashlandi (NULL).** Tekshiruv
  ko'rsatdiki, bu raqamlar uchinchi tomon qo'llanmasidan ("13-country Top-10
  guide...") kirib qolgan — yon jadvaldagi us 67 qatori uni ochiq iqtibos
  qilardi: "GPA 3.7+, IELTS 6.0+, SAT 1450+". IELTS 6,0 aslida KFUPM ning
  **magistratura** qabul jadvalidan. Fetch qilingan bakalavr treklarida
  (SAT Track, ISEF Winners Track) GPA/IELTS chegarasi e'lon qilinmagan;
  e'lon qilingan akademik talab — **SAT ≥ 1350** + tabiiy fanlar yo'nalishi +
  joriy/o'tgan yil bitiruvchisi (keyin taklif bilan KFUPM matematika testi).
- **`deadline_date` 2027-02-11 ("fixed") olib tashlandi.** Fetch qilingan
  sahifalarda sana yo'q; portalda SAT treki tekshirilgan paytda "Closed"
  holatida edi. Endi NULL/`not_published` + `rounds` izohi, status
  `unknown` → `upcoming`. (Shu sabab kelajakdagi deadline lar hisobi
  197 → 196 bo'ldi — bu kamayish halol tozalash natijasi.)
- Avvalgi tahrirdagi "10–100% needs-and-merit" sxemasi fetch qilingan
  sahifalarda topilmadi — tasdiqlanmagan da'vo sifatida olib tashlandi.
- Imtiyozlar fetch qilingan ro'yxat bo'yicha aniqlashtirildi: to'lov to'liq
  bekor + bepul yotoqxona + ijaraga beriladigan bepul darsliklar + oylik
  stipendiya (summa e'lon qilinmagan — NULL) + kampus klinikasi. **Aviachiptalar
  — magistratura grantlari (454) imtiyozi**; us 67 dagi "Flights" yozuvi
  noto'g'ri edi, yon jadval to'liq qayta sinxronlandi.
- `degree_levels` "Bachelor" → "Bachelor's" (vocabulyar); manbalar
  3121–3122 yaratildi va bog'landi (oldingi holatda yozuvda manba havolasi
  umuman yo'q edi).

## 673 — Stockholm University Scholarship Scheme (rel 9 → 10)

Fetch qilingan SU scholarships sahifasi (manba **2623**, sahifa yangilangan
2025-10-20) 2026-10-25 tahririning mazmunini tasdiqladi: butun o'quv to'lovi
qoplanadi, yashash xarajatlari qoplanmaydi; EU/EEA/Shveytsariyadan tashqaridagi,
to'lovli, birinchi (xalqaro) raundda qabul qilinganlar; tanlov akademik
yutuqlar bo'yicha, SU ni birinchi tanlaganlarga ustunlik; forma natijalar
e'lon qilingach email bilan yuboriladi, javoblar aprel oxirigacha.

Kodlash tuzatishlari:

- **`award_amount` SEK 140 000/"fixed" → NULL/"variable".** To'lov sohaga
  qarab farqlanadi (gumanitar/ijtimoiy/huquq — 90 000, fanlar — 140 000
  SEK/yil; 2026-10-25 da SU sahifalaridan tasdiqlangan). Oldingi yozuv
  izohida "eng yuqori summa saqlandi" deb tan olingan edi — bu foydalanuvchiga
  soxta qat'iy summa ko'rsatardi; endi uy qoidasidagi "variable" kodlash.
- **`min_gpa` 3,3 / `min_ielts` 6,5 olib tashlandi (NULL)** — sahifa hech
  qanday chegara e'lon qilmaydi (tanlov — akademik yutuq; ingliz tili —
  dastur talabi).
- `eligible_countries` "All" → haqiqiy qamrov (EU/EEA/Shveytsariyadan tashqari,
  to'lovli, birinchi raund); `deadline_type` "annual" → "not_published" +
  sanalangan raund `rounds` da (983/984 bilan bir xil uslub); `accommodation`
  bo'sh edi → izohli matn.
- Manba havolasi **(673, 2623)** qo'shildi (yo'q edi); **us 134** sinxronlandi
  ("Yes" → "available", ma'nosiz "Swedish Proficiency & Research" almashtirildi).

## Rad etilgan nomzod: POSCO Global Scholarship in Korea

POSCO TJ Park Foundation rasmiy FAQ sahifasi birinchi qo'ldan fetch qilindi
(`postf.org/en/asia/abroad/faq`): belgilangan davlatlar — Osiyo 13, Amerika 4,
Yevropa 6, Afrika 3 = 26 davlat. **O'zbekiston ro'yxatda yo'q.** Ilgari
belgilangan mezonga ko'ra ("POSCO faqat O'zbekiston TJ Park ro'yxatida
tasdiqlansa qo'shiladi") yozuv yaratilmadi. Fond ro'yxatni keyingi davrlarda
kengaytirsa, nomzodni qayta ko'rib chiqish mumkin (ro'yxat "tentative" deb
belgilangan).

## Hisoblagichlar (qat'iy tekshiruv)

| Ko'rsatkich | Batch 25 oldin | Batch 25 keyin |
| --- | --- | --- |
| Faol yozuvlar | 554 | 554 (yangi yozuv yo'q) |
| Bekor qilingan (retired) | 180 | 180 |
| Faol rel-4 | 17 | 17 |
| Rel 8/9 → 10 | — | 608 (8→10), 673 (9→10) |
| Kelajakdagi deadline lar | 197 | **196** (tasdiqlanmagan 2027-02-11 olib tashlandi) |
| Max source id | 3120 | **3122** |

Ketma-ketlik: `sources_id_seq` 3122.

Mahalliy tekshiruvlar: `npm run typecheck` ✓, `npm run check:i18n` ✓,
`npm run test:render` **337/337** ✓.

Texnik qayd: ish boshlanishida sandbox git holati yana reset bo'lgan edi
(92 ta untracked fayl — hammasi origin bloblariga baytma-bayt tengligi
tekshirilib, `b3a465c` ga xavfsiz tiklandi).

## Keyingi qadamlar

Navbat bilan **Pass 119** (tozalash): rel-4 juftliklaridan navbatdagisi —
Chile 467/879, India 397/477 yoki Mexico 343/402. Keyingi ko'tarish
nomzodlari: Uppsala Global (773, rel 8), Chalmers (421, rel 9),
Axel Adler (739, rel 9).
