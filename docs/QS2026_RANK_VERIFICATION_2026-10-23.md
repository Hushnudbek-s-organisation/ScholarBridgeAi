# Top Universities (11 dastur + QS ranking + kampus rasmlari) PDF — tekshiruv hisoboti (2026-10-23)

Manba: `top_universities_programs_qs_rankings_master.pdf` (113 sahifa).
Loyiha: Supabase `zkdguzbdopfedkffsatk`. Oldingi importlar: `docs/TOP300_PDF_IMPORT_2026-10-23.md`,
`docs/UZBEK_13_COUNTRIES_PDF_IMPORT_2026-10-23.md`.

Bu PDF oldingi ikkitasining to'liq qayta nashri + 4 yangi qatlam:
(1) har universitetga 11 ta dastur, (2) QS World Ranking o'rni, (3) kampus rasmi (`image_url`),
(4) research-agent kurs katalogi skaneri. Quyida har qatlam **mustaqil tekshirildi** — natijalar.

## 1. PDF qanday o'qildi

`scripts/import/top300/extract_pdf_11progs.py` (4 ustunli jadval, ustun chegaralari
`31.5 / 203.2 / 366.7 / 632.2 / 811.5`) + `parse_rows_11progs.py`:

| Bo'lim | Sahifalar | Qator | Holat |
| --- | --- | ---: | --- |
| 4-Bo'lim — 13 davlat × Top-10 | 5–37 | 130 | 0 xato |
| 5-Bo'lim — Global Top 1–200 | 38–87 | 200 | 0 xato (3 ta dublikat qatori belgilangan: #18/#22 Princeton, #92/#115 USP, #110/#129 Newcastle) |
| 6-Bo'lim — Global Top 201–300 | 88–113 | 100 | 0 xato |
| **Jami** | 5–113 | **430** | har birida 11 ta dastur, 0 xato |

Parse natijasi: `data/top_universities_11progs_qs_pdf_2026.json` (430 qator, barcha maydonlar).

Ichki izchillik tekshiruvi: bir universitet 2 bo'limda uchrasa, QS o'rni **har doim bir xil**
(44 ta takrorlanish, 0 farq). Raqamli maydonlar (tuition, IELTS, deadline) oldingi PDFlar bilan
deyarli bir xil — farqlar asosan defis/bo'shliq artefaktlari; haqiqiy o'zgarganlar: Oslo tuition
(23 000 → 19 000), King Abdulaziz (1 500 → 0), USP living/housing/GPA.

## 2. QS reytingi — PDF **eski (QS 2025)**, baza esa **noto'g'ri** edi

Tekshiruv uchun rasmiy QS 2026 natijalar jadvali olindi (QS World University Rankings 2026,
2025-yil 19-iyunda e'lon qilingan; 1–499 o'rinlari `data/qs_2026_top499.tsv` faylida saqlandi).

### 2.1. PDF reytinglari 2025-yil nashri

| Universitet | PDF | QS 2026 (rasmiy) | Izoh |
| --- | ---: | ---: | --- |
| Oxford | 3 | **4** | PDF = QS 2025 |
| Cambridge | 5 | **6** | PDF = QS 2025 |
| KAIST | 53 | — | 2026 nashridan **chiqarib tashlangan** (QS anti-canvassing) |
| Edinburgh | 27 | **34** | |
| King's College London | 40 | **31** | |
| USTC | 135 | **132** | |
| Universiti Malaya | 60 | **58** | |

Ya'ni PDF "aniq QS o'rni" deb bergan raqamlar bir nashr orqada; ularni yozish bazani **orqaga**
surardi.

### 2.2. Bazadagi eski `world_ranking` ham haqiqiy QS emas edi

Ilgari yuklangan 200 ta reyting "ishonchli ko'rinadigan ketma-ketlik" edi (UPenn #11, Columbia #18,
Seoul National #29, Fudan #40 …). Rasmiy ro'yxat bilan solishtirganda **181 tasi noto'g'ri**,
faqat 16 tasi to'g'ri chiqdi. Eng katta xatolar:

| Universitet | Eski baza | QS 2026 |
| --- | ---: | ---: |
| Universitat Politècnica de Catalunya | 46 | **392** |
| University of Münster | 130 | **350** |
| Universitat Pompeu Fabra | 47 | **265** |
| University of York | 151 | **169** |
| University of Turku | 196 | **366** |
| University of Tartu | 199 | **362** |
| UMass Amherst | 115 | **247** |
| University of Aberdeen | 138 | **262** |
| University of Adelaide | 191 | **82** (Adelaide University) |
| University of Copenhagen | 193 | **101** |

### 2.3. Nima yozildi

`supabase/qs_2026_rank_correction.sql` — 336 qator:

* **181** ta mavjud reyting tuzatildi, **139** ta bo'sh (`NULL`) qator to'ldirildi, **16** ta allaqachon to'g'ri edi;
* hammasiga `qs_rank_year = 2026` va `last_verified_at = now()`;
* **28** qator `NULL` qoldi: QS 2026 ro'yxatining 500+ qismida (bizda 1–499 tasdiqlangan) yoki reytingda yo'q
  (WIUT, IUT, New Uzbekistan University, Canadian University Dubai, ELTE, BME, Debrecen, Nazarbayev,
  Hacettepe, Istanbul, YTÜ, Ankara, Szeged, Pécs, Corvinus, Semmelweis, MATE, Óbuda, Széchenyi, MEPhI,
  IIUM, AGH, Adam Mickiewicz, Gdańsk Tech, Wrocław Tech, UWr, PUT, TUL, École des Ponts),
  shu jumladan **KAIST** — 2026 nashridan chiqarilgani uchun eski #37 tozalandi;
* to'ldirish uchun qo'shimcha tasdiqlangan 4 ta o'rin: Debrecen **563**, Hacettepe **571**,
  ELTE **584**, Szeged **597** (QS 2026 e'loni).

Yozuvdan keyin baza tekshirildi: 364 qatorning **hammasi** reja bilan aynan mos (336 reytingli, 28 `NULL`).

## 3. Kampus rasmlari (`image_url`) — **yozilmadi**: manzillar uydirma

PDF har bir qator uchun `Img: <Universitet>_Campus.jpg` beradi va matnda URL
`https://commons.wikimedia.org/wiki/Special:FilePath/{Slug}_Campus.jpg` deb **konstruksiya qilinishini**
o'zi aytadi. Commons API bilan tekshirildi (`action=query&titles=File:...`):

| Tekshirilgan fayl | Commons natijasi |
| --- | --- |
| `Seoul_National_University_SNU_Campus.jpg` | **missing** |
| `KAIST_Korea_Advanced_Institute_of_Science_Technology_Campus.jpg` | **missing** |
| `Massachusetts_Institute_of_Technology_MIT_Campus.jpg` | **missing** |
| `University_of_Oxford_Campus.jpg` | **missing** |

4/4 mavjud emas → pattern bo'yicha yasalgan. Bunday URL yozilsa ilovadagi har bir karta rasmi
buziladi. Shuning uchun **hech bir qatorga yozilmadi**; `image_url` holati o'zgartirilmadi
(200 tasida avvaldan haqiqiy rasm bor, 164 tasi bo'sh — ro'yxati
`docs/UNIVERSITIES_MISSING_RANK_IMAGE_PROGRAMS_2026-10-23.md`).

## 4. "11 dastur" qatlami — **yozilmadi**: shablon

PDF 3-bo'limda 4 ta arxetip (COMPREHENSIVE / STEM_TECH / ECON_BUSINESS / MEDICAL_LIFE) va
`seed_university_11_programs()` funksiyasini beradi: har universitetga **bir xil** 11 ta umumiy dastur
qo'shiladi. Tekshiruv:

* dastur nomlari universitetning haqiqiy katalogidan olinmagan — profil bo'yicha shablon
  (masalan, tibbiy profilga `MD/MBBS`, texnik profilga `BEng` to'plami);
* PDFdagi SQL `official_url = p_website || '/programs'`, `application_url = ... || '/apply'`,
  `source_url = ... || '/admissions'` — bular ham **uydirma deep-link** (avvalgi qaror: bunday URL yozilmaydi);
* ilova universitet sahifasida `programs`ning hammasini filtrsiz ko'rsatadi (`src/app/api/universities/[id]/route.ts`),
  ya'ni shablon qatorlar haqiqiy dasturlar bilan birga chiqadi va foydalanuvchini chalg'itadi.

Shu sababli 11 talik to'plam **bazaga qo'shilmadi**. Muqobil: mavjud research-agent
(`src/lib/research-agent/`) har universitetning `/programs` sahifasidan haqiqiy dasturlarni
`is_verified = false` + `verification_status = 'review_required'` holatida yig'adi — PDF 4-vazifasining
to'g'ri yo'li shu.

## 5. Research-agent kurs katalogi skaneri

PDF 4-qadami kod vazifasi (agent `/programs` va `/courses` sahifalarini kuzatib, yangi dasturlarni
`review_required` holatida Telegramga yuboradi). Repoda agent bor, lekin bu oqim hali ulanmagan —
`docs/UZBEK_13_COUNTRIES_PDF_IMPORT_2026-10-23.md` §6 dagi watchlist vazifasi bilan birga keyingi qadam.

## 6. Yakuniy holat (2026-10-23)

```
universities            364
  QS 2026 reytingi      336   (181 tuzatildi, 139 to'ldirildi, 16 to'g'ri edi)
  reyting NULL           28   (shu jumladan KAIST — QS 2026 dan chiqarilgan)
  rasm bor              200   |  rasm yo'q 164 (PDF manzillari uydirma — yozilmadi)
  dastur bor            360   |  dastur yo'q 4 (id 213–216)
scholarships            639   |  university_scholarships 358
programs               3008   |  application_cycles 3038
```

## 7. Fayllar

| Fayl | Mazmun |
| --- | --- |
| `data/top_universities_11progs_qs_pdf_2026.json` | PDFning 430 qatori to'liq parse qilingan holda |
| `data/qs_2026_top499.tsv` | rasmiy QS 2026 reytingi 1–499 (tekshiruv manbasi) |
| `supabase/qs_2026_rank_correction.sql` | 336 qatorlik tuzatish + 28 `NULL` + tekshiruv so'rovlari |
| `scripts/import/top300/extract_pdf_11progs.py`, `parse_rows_11progs.py` | yangi 4-ustunli layout uchun parser |
| `docs/UNIVERSITIES_MISSING_RANK_IMAGE_PROGRAMS_2026-10-23.md` | yangilangan bo'shliqlar ro'yxati (28 reyting, 164 rasm, 4 dastur) |

## 8. Keyingi qadamlar (taklif)

1. **Rasmlar** — 164 universitet uchun haqiqiy Commons/Wikipedia kampus fotosini topib `image_url`ga yozish
   (har biri uchun Commons qidiruvi kerak; API orqali partiyalab bajariladi).
2. **QS 500+** — 28 ta universitetning 2026 o'rnini QS'ning 500–1500 qismidan olib to'ldirish
   (hozir `NULL` — taxmin yozilmaydi).
3. **Haqiqiy dasturlar** — research-agentni ishga tushirib, 360 universitet uchun katalogdan dasturlarni
   `review_required` bilan yig'ish.

## 9. Qo'shimcha ishlar (2026-10-23, davomi)

Foydalanuvchi so'rovi bilan uchta ish bajarildi:

1. **Rasmlar (93 ta qo'shildi).** 164 ta rasmsiz universitetning har biri uchun Wikimedia Commons'da
   nom bo'yicha qidiruv o'tkazildi (6 tadan guruhlab, OR-qidiruv), faqat **aynan shu universitet binosi/kampusi**
   ko'rsatilgan fayl tanlandi; logo/gerb/aloqasiz natijalar rad etildi. 93 tasiga rasm topildi
   (`universities.image_url`, 200 → 293). Har bir URL Commons'ning MD5 yo'l sxemasi bo'yicha qurildi va
   6 tasi `imageinfo` API bilan solishtirib tasdiqlandi. To'liq ro'yxat + Commons sahifalari:
   `supabase/campus_images_wikimedia_2026-10-23.sql`. Qolgan 71 tasiga mos foto topilmadi — bo'sh qoldirildi.
2. **QS 500–1500 (20 ta qo'shildi).** Rasmiy QS 2026 jadvali (1504 qator, `data/qs2026_top1500.csv`) topildi va
   avval tasdiqlangan 336 reyting bilan solishtirildi: **326 tasi aynan mos**, 6 tasida ±1 (teng o'rinlar
   boshqacha yozilgan). Shundan keyin 28 ta reytingsiz universitetdan 20 tasiga o'rin yozildi
   (masalan IIUM 613, MEPhI 591, BME 711–720, Pécs 741–750, Ankara 697). Bandali o'rinlar (`711-720`)
   pastki chegarasi bilan saqlandi (`711`) — ilova butun son bo'yicha saralaydi.
   **8 tasi `NULL` qoldi:** KAIST (QS 2026 dan chiqarilgan), Nazarbayev, WIUT, IUT, New Uzbekistan University,
   École des Ponts, Corvinus, Semmelweis (2026 ro'yxatida yo'q).
3. **Dasturlar.** 11 talik shablon yozilmadi (yuqorida §4). Buning o'rniga to'liq katalogni yig'uvchi
   vosita qo'shildi: `scripts/seed-programs.ts` + `npm run db:seed:programs`
   (qarang: `docs/PROGRAMS_CATALOG_SEEDING_2026-10-23.md`). Sandbox'da universitet saytlariga chiqish
   yopiq bo'lgani uchun uni sizning serveringizda ishga tushirish kerak.

Yakuniy holat: 364 universitet, **356** reytingli (QS 2026), **293** rasmli, 4 tasida dastur yo'q.
