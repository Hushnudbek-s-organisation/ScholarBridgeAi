# Pass 104 — Singapur rel4 klasteri (2026-10-26)

**Qamrov:** Singapurdagi 6 ta faal rel4 yozuv (15, 16, 30, 112, 119, 396). Har biri uchun 2026-10-26 kuni rasmiy sahifalar bevosita o'qildi. **Natija: 5 ta rewrite, 1 ta pensionatsiya. Singapur rel4 = 0.**

| ID | Oldingi nom | Qaror | Yangi holat |
|---|---|---|---|
| 15 | NUS Research Scholarship | Rewrite (rel 10) | Faol, `upcoming` |
| 16 | ASEAN Undergraduate Scholarship (NUS) | **Pensionatsiya** | Faol emas — faqat ASEAN fuqarolari uchun |
| 30 | NTU Nanyang Scholarship | Rewrite (rel 10) | **NTU Nanyang Global Scholarship**, faol, `open`, dedlayn 2027-03-19 |
| 112 | NUS Presidents Graduate Fellowship | Rewrite (rel 10) | **NUS President's Graduate Fellowship**, faol, `upcoming` |
| 119 | Nanyang Presidents Graduate Scholarship | Rewrite (rel 10) | **Nanyang President's Graduate Scholarship (NPGS)**, faol, `upcoming`, dedlayn 2026-12-31 |
| 396 | SMU Research Scholarships for International Students | Rewrite (rel 9) | **SMU Research Scholarship**, faol, `open` |

## Dalillar va qarorlar (har bir yozuv bo'yicha)

### 15 — NUS Research Scholarship → rewrite (rel 10)
- Saqlangan URL HTTP 404 qaytardi; sxema NUSGS Scholarships indeksi orqali topildi (`nusgs.nus.edu.sg/scholarships/nus-research-scholarship`) — nomi saqlangan title bilan aynan mos.
- O'qilgan shartlar: tuition to'liq ozod; stipendiya 2026-01-01'dan: xalqaro PhD **S$3,000/oy** (PhD Qualifying Examination'dan keyin +S$500), xalqaro Master's by Research **S$2,900/oy**; 1 yil + semestrma-semestr uzaytirish, maks. 4 yil (PhD) / 2 yil (Master's); bond yo'q; xalqarolar uchun Graduate Assistantship Programme majburiy; GradApp ichida ariza beriladi.
- `award_amount` NULL (variable) — ikki daraja, ikki raqam; raqamlar description/funding_type'da. `degree_levels` ga Master's by Research qo'shildi. Dedlayn fakultetlar bo'yicha (avgust/yanvar intake) → NULL + `not_published` + rounds; status `upcoming`.

### 16 — ASEAN Undergraduate Scholarship (NUS) → pensionatsiya
- Rasmiy OAM sahifasi (saqlangan URL admissions hub'ga redirect bo'ladi) eligibility'ni ochiq cheklaydi: **faqat ASEAN a'zo davlatlari fuqarolari (Singapurdan tashqari)** — Brunei, Kambodja, Indoneziya, Laos, Malayziya, Myanma, Filippin, Tailand, Timor-Leste, Vyetnam.
- O'zbekiston fuqarosi bu grantga hech qachon ariza bera olmaydi → yozuv auditoriyaga ko'rsatilmaydi (Batch 8'dagi Taiwan ICDF/MOFA rad etish skriningi bilan bir xil).
- NUS bakalavriat qamrovi 28-yozuv (NUS International Undergraduate Scholarship, rel 9) orqali qoladi. us 484 withdrawn; manba 2728 o'qilgan OAM sahifasiga yo'naltirildi.

### 30 — NTU Nanyang Global Scholarship → rewrite (rel 10)
- Saqlangan URL rasmiy sahifaga redirect bo'ladi va u sxema endi **"Nanyang Global Scholarship"** nomi bilan taqdim etiladi (NTU'ning premier, barcha millatlar uchun ochiq bakalavriat granti; sahifa slug'i va benefitlar tarkibi avvalgi Nanyang Scholarship bilan bir xil).
- O'qilgan benefitlar: subsidised tuition to'liq qoplanadi (MOE Tuition Grant'dan keyin), **S$6,500/yil** living, S$2,000/yilgacha accommodation, S$8,000'gate travel grant, S$2,000 computer (bir martalik); saqlab qolish sharti CGPA ≥3.5/5.0 (kirish cutoff emas → `min_gpa` NULL).
- Dedlayn: stipendiya arizasi = qabul arizasi oynasi; AY2027 xalqaro kvalifikatsiyalar va IB: **2026-10-15 — 2027-03-19** (NTU Admissions sahifasidan o'qildi) → deadline_date 2027-03-19, status `open` (oyna 15-oktabrda ochilgan). `award_amount` = 6,500/yil (28 va 641 tasdiqlangan yozuvlar konventsiyasi bo'yicha).

### 112 — NUS President's Graduate Fellowship → rewrite (rel 10)
- Saqlangan URL (NUSGS financial-aid hub) Graduate School saytiga ochiladi; uning Scholarships indeksi **"President's Graduate Fellowship"**ni alohida sxema sahifasi bilan beradi — saqlangan title shu mukofotni nomlaydi (apostrof tuzatildi).
- O'qilgan shartlar: tuition to'liq ozod + stipendiya xalqaro **S$3,900/oy**; one-off settling-in S$1,000 va air travel S$750'gate (faqat xalqarolar); NUSGS Research Incentive Award qo'shimchasi; GAP 312 soat; maks. 4 yil; **nominatsiya orqali** (fakultet nomzod qo'yadi), natijalar may/oktabr.
- `award_amount` = 3,900/oy fixed (xalqaro stavka); qo'shimcha summalari qat'iy emas → matnda. Dedlayn NULL + rounds; status `upcoming`.

### 119 — Nanyang President's Graduate Scholarship (NPGS) → rewrite (rel 10)
- Saqlangan URL rasmiy NPGS sahifasiga redirect bo'ladi. O'qilgan shartlar: yillik tuition qoplanadi; stipendiya 2026-yil yanvardan: SC 5,300 / PR 4,800 / **xalqaro S$4,300/oy**; conference S$5,000/yilgacha, book S$500/yil, IT S$1,500, thesis S$600; bond yo'q; maks. 4 yil; GAP majburiy; **faqat nominatsiya orqali**.
- AY2027-2028 oynasi sahifada e'lon qilingan: **2026-11-01 — 2026-12-31** (NIE: 2–30 dekabr) → deadline_date 2026-12-31, status `upcoming`. Talab: Honours (Highest Distinction) — raqamli GPA emas → `min_gpa` NULL.

### 396 — SMU Research Scholarship → rewrite (rel 9)
- Saqlangan `smu.edu.sg` URL HTTP 404; sxema SMU College of Graduate Research Studies'ning rasmiy sahifasida topildi. Saqlangan title aynan shu sxema ("SMU Research Scholarships"; importer qo'shimchasi "for International Students" olib tashlandi — sxema barcha millatlar uchun, xalqaro stavka e'lon qilingan).
- O'qilgan shartlar: registration + subsidised tuition qoplanadi; stipendiya 2026-01-01'dan xalqaro: **Tier 1 S$4,300/oy; Tier 2 S$3,100 → qualifying exam'dan keyin S$3,600/oy**; har yili uzaytirish, birinchi 4 yil; qabul paytida baholanadi (alohida ariza yo'q).
- Rel 9 (10 emas): sahifa redirect zanjiri bilan emas, saqlangan URL o'lganidan keyin nom/funksiya orqali aniqlandi. `award_amount` NULL (variable — ikki tier). `degree_levels` faqat PhD (oldingi Master's + PhD xato edi). Avgust 2027 intake oynasi 2026-08-01'dan ochiq → status `open`; oynalar dasturga xos → rounds.
- `university_id` NULL qoldi va us qator qo'shilmadi: katalogda **Singapore Management University yozuvi hali yo'q** (SFU/Manitoba/UVic qatori navbatga qo'shildi).

## Yon jadvallar
- `sources`: 2727 (15), 2728 (16), 2726 (30), 2584 (112), 2582 (119), 2617 (396) — barchasi eksklyuziv link ekani tekshirilgan; 6 ta yangi URL `idx_sources_url`ga oldindan tekshirilgan (to'qnashuv yo'q). URL/title/domain yangilandi.
- `university_scholarships`: 510, 500, 551, 642 sinxron (nom, funding_type, max_scholarship, covers bayroqlari, URLlar); 484 withdrawn (`availability_status='No'`).

## Sanoglar (Pass 104'dan keyin)
| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol yozuvlar | 532 | **531** |
| Pensionatsiya | 162 | **163** |
| Faol rel4 | 73 | **67** |
| Singapur rel4 | 6 | **0** |
| Kelajak dedlaynlar | 166 | **168** |

Lokal tekshiruvlar: `tsc --noEmit` ✅, `check:i18n` ✅, `test:render` **337/337** ✅. Uydirma miqdor yoki dedlayn kiritilmadi; barcha raqamlar 2026-10-26 kuni o'qilgan rasmiy sahifalardan.

Replay SQL: `supabase/scholarship_rewrite_pass104_2026-10-26.sql`.

## Qolgan ish
- **67 ta faal rel4** qolmoqda: Janubiy Koreya 6, Shveytsariya 6, Yangi Zelandiya 5, Belgiya/Finlandiya/Fransiya/Shvetsiya 4 tadan, va kichikroq guruhlar.
- Navbatdagi kataloglashtirish: Singapore Management University yozuvi yaratish + 396'ni ulash (SFU, Manitoba, UVic, Adelaide, Flinders qatori).
- Keyingi qadam (navbat bo'yicha): **Batch 11 (qo'shimchalar)**, undan keyin Pass 105 cleanup (Janubiy Koreya yoki Shveytsariya guruhi).
