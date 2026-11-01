# Stipendiya katalogini boyitish — Batch 10 — 2026-10-26

## Xulosa

Pass 103'dan keyingi qo'shimchalar qadami. Batch 10 Pass 103 pensionatsiyalarida aniqlangan 2 Xitoy nomzodi va Batch 9'da ko'rilgan 1 Kanada nomzodidan iborat. Har biri alohida rasmiy sahifa auditidan o'tkazildi; **3 tasi ham qabul qilindi**:

| ID | Dastur | Ishonchlilik | Holat |
|---|---|---|---|
| 943 | Nanjing Municipal Government Scholarship at Nanjing University | 10 | `closed` (2026 oyna yopilgan) |
| 944 | University of Ottawa International Doctoral Scholarship | 10 | `upcoming` (qabulga bog'liq) |
| 945 | Peking University Scholarship for International Students | 9 | `upcoming` (yillik yanvar–mart oynasi) |

Manbalar **3081–3083** yaratilib bog'landi (945→3081, 943→3082, 944→3083); `university_scholarships`ga **676** (PKU 22 ↔ 945), **677** (NJU 111 ↔ 943), **678** (uOttawa 178 ↔ 944) qo'shildi. Sanoglar: faol **529 → 532**, pensionatsiya 162, faol rel4 73, kelajak dedlaynlar 166. Parallel insert natijalari `RETURNING id, title` bilan aniqlanib, qayta SELECT bilan tasdiqlandi (so'rov tartibi ≠ id tartibi). Manba URLlari `idx_sources_url` to'qnashuviga tekshirildi (toza). Uydirma miqdor yoki dedlayn kiritilmadi.

## 945 — Peking University Scholarship for International Students (rel 9)

**Dalil:** PKU International Students Division'ning rasmiy sxema sahifasi (xitoycha, 2025-04-14) to'liq fetch qilindi: 2012-yilda ta'sis etilgan; tarkibi — **tuition to'liq ozod etiladi + yashash nafaqasi + tibbiy sug'urta** (nafaqa summasi e'lon qilinmagan); muddatlar 4 / 2–3 / 4 yil (bakalavr/magistr/doktorantura); talablar — PKU xalqaro qabul shartlariga moslik, to'la vaqtli **o'zini-o'zi moliyalashtiruvchi (self-funded)** ariza muvaffaqiyatli topshirilgan bo'lishi, boshqa hech qanday stipendiya yo'qligi; ariza odatda **yanvar–mart**; magistr/doktorantlar studyatpku.com orqali alohida ariza beradi (panel baholaydi, email xabar qiladi), yangi bakalavrlar ariza bermaydi — qabul natijalari asosida tanlanadi; yillik review majburiy.
Shu bois: `award_amount NULL` (variable; pul summasi e'lon qilinmagan), `deadline_date NULL` + `upcoming` (takroriy yanvar–mart oynasi), rel **9**. Pensionatsiya qilingan 118 ("President Scholarship") boshqa, tekshirilmagan nom edi — bu yozuv o'z dalili asosida qo'shildi, 118'ga retarget qilinmadi.

## 943 — Nanjing Municipal Government Scholarship at NJU (rel 10)

**Dalil:** NJU Institute for International Students'ning rasmiy "2026-yilgi tanlov e'loni" (2026-07-08) uchala chunk'da to'liq fetch qilindi: Nanjin munitsipal hukumati 2013-yilda ta'sis etgan; 2026 ariza oynasi **24–28 avgust 2026**; qamrov — NJUda to'liq vaqt o'qiydigan xorijiy bakalavr/magistr/doktorantlar (yangi va joriy talabalar); qiymatlar — **RMB 10,000 bakalavr (20 o'rin) / RMB 20,000 magistr-doktorant (20 o'rin)**, **bitta o'quv yili**; boshqa Xitoy davlat/universitet stipendiyasi bilan birga bo'lmaydi; hujjatlar bitta PDF'da email orqali; joriy bakalavrlar uchun GPA chegaralari (gumanitar ≥4.3 / tabiiy ≥3.8, NJU shkalasi), magistr-doktorantlarda o'rta muddat bahosi (中期考核) + kafedra tavsiyasi; **HSK guvohnomasi** ikkala toifa hujjatlarida talab qilinadi.
`award_amount NULL` (ikki darajali qiymat); `min_gpa NULL` (NJU shkalasi, faqat joriy bakalavrlarga); `deadline_date NULL` + `closed` (2026 oyna tugagan). Yozuv qamrovi NJU tanlovi bilan cheklangan (sxema shahar miqyosida amal qiladi, lekin dalil NJU e'loni).

## 944 — University of Ottawa International Doctoral Scholarship (rel 10)

**Dalil:** uOttawa Graduate and Postdoctoral Studies'ning markaziy rasmiy sahifasi fetch qilindi: 2023-yil maydan qabul qilinganlar uchun joriy shartlar — **5 yilda $45,000**, har termda maksimum **$3,000 × 15 ketma-ket term**, talaba hisobiga kredit qilinadi; faqat xalqaro tuition to'langan termlarda to'lanadi; Differential Tuition Fee Waiver / Tuition Fee Exemption bilan birga bo'lmaydi; 2023-yil maygacha boshlaganlarga eski (domestic-rate) shartlar saqlanadi (matnda qayd etildi). Alohida ariza sahifada ko'rsatilmagan — fakultet sahifalari uni "qabul paytida beriladigan stipendiyalar" qatoriga qo'yadi.
`award_amount = 9000 CAD/yil (fixed)` — $3,000 × 3 termdan olingan yillik qiymat (jami $45,000 `funding_type`da); `living_allowance NULL` (bu tuition-kredit, yashash nafaqasi emas); `deadline_date NULL` (qabulga bog'liq). 941 (Admission Scholarship) dan alohida yozuv — Batch 9'da ataylab birlashtirilmagan edi.

## Rad etilganlar

Bu batchda rad etilgan nomzod yo'q. Pass 103'da qayd etilgan ZJU maktab sxemalari (ZIBS Hai, ZJU-ISM Freshman) bu batchga kiritilmadi — tor qamrovli, alohida tekshiruv talab qiladi.

## Kuzatilgan, lekin tegilmagan

- CSC dublikat juftliklari **31/849** (PKU) va **44/554** (Fudan) — o'zgartirilmadi; alohida dedupe tekshiruvi nomzodlari.
- NJU menyusidagi qolgan sxemalar (International Chinese Language Teachers, Confucius China Studies) — bu batchda baholanmadi.

## Yon jadvallar va sanoglar

- `sources` 3081 (isd.pku.edu.cn), 3082 (hwxy.nju.edu.cn), 3083 (uottawa.ca) — bitta INSERT, `RETURNING id,url`; URLlar oldindan `idx_sources_url` bo'shligi tekshirilgan.
- `scholarship_sources`: 945→3081, 943→3082, 944→3083 (tekshirildi: 3/3 da 1 link).
- `university_scholarships` 676 (PKU), 677 (NJU), 678 (uOttawa).
- Sanoglar: faol **532**, pensionatsiya **162**, faol rel4 **73**, kelajak dedlaynlar **166**.
- Tekshiruvlar: `tsc --noEmit` ✅, `check:i18n` ✅, `test:render` **337/337** ✅.

Bajarilgan SQL: `supabase/scholarship_enrichment_batch10_2026-10-26.sql`.
