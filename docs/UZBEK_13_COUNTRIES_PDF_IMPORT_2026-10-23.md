# 13 davlat Top-10 (130 universitet) — PDF → Supabase import hisoboti (2026-10-23)

Manba: `uzbek_global_universities_supabase_master_guide.pdf` — "EdTech Audit + 13 Davlat Top-10
(130 Uni) + Global Top 300 — Supabase Master Guide" (79 sahifa).
Loyiha: Supabase `zkdguzbdopfedkffsatk` (production DB). Oldingi import: `docs/TOP300_PDF_IMPORT_2026-10-23.md`.

## 1. PDF tarkibi va nima qilindi

| Bo'lim | Mazmuni | Natija |
| --- | --- | --- |
| 1–2 | EdTech audit, master-prompt, qat'iy sxema qoidalari | ko'rsatma, ma'lumot yo'q |
| 3 | `university_scholarships` DDL + `scholarship-watchlist.json` namunasi | jadval allaqachon bor (Top 300 importida yaratilgan); watchlist fayli repo'ga qo'shildi |
| **4** | **13 davlat × Top-10 = 130 universitet + davlat grantlari (5–28-sahifalar)** | **to'liq import qilindi** |
| 5–6 | Global Top 1–300 reestri | birinchi PDF bilan **bayt-ma-bayt bir xil** (300 qator, 0 farq) → hech narsa o'zgartirilmadi |

4-bo'lim mustaqil parse qilindi (`scripts/import/top300/parse_rows_13c.py`): 130 qator, 0 xato.
Parse natijasi repo'da: `data/uzbek_13_countries_top10_pdf_2026.json`.

Guruhlar: South Korea, Türkiye, Germany, Italy, Hungary, China, Russia, Malaysia, United Kingdom,
United States, Japan, Poland — har biri 10 ta; Gulf/Kazakhstan guruhi = Saudi Arabia 3, UAE 3,
Qatar 2, Kazakhstan 2.

## 2. Bazadagi mavjud qatorlar bilan moslashtirish

Avval domen (sayt) bo'yicha, so'ng mamlakat ichida nom o'xshashligi bo'yicha moslashtirildi, ro'yxat
qo'lda ko'rib chiqildi. 2 ta qo'lda tuzatish (`gen_staging_13c.py` → `MANUAL`):

* `Poland #8` University of Wrocław ≠ University of Warsaw (o'xshash nom, **yangi** qator qilindi);
* `Japan #3` Institute of Science Tokyo = `id 38` Tokyo Institute of Technology (nomi o'zgargan).

| Guruh | Qator | Mavjud (yangilandi) | Yangi (INSERT) | Yangi `id` |
| --- | --- | --- | --- | --- |
| South Korea | 10 | 8 | 2 | 327–328 |
| Türkiye (bazada `Turkey`) | 10 | 4 | 6 | 329–334 |
| Germany | 10 | 10 | 0 | — |
| Italy | 10 | 6 | 4 | 335–338 |
| Hungary | 10 | 3 | 7 | 339–345 |
| China | 10 | 10 | 0 | — |
| Russia | 10 | 2 | 8 | 346–353 |
| Malaysia | 10 | 8 | 2 | 354–355 |
| United Kingdom | 10 | 10 | 0 | — |
| United States | 10 | 10 | 0 | — |
| Japan | 10 | 10 | 0 | — |
| Poland | 10 | 2 | 8 | 356–363 |
| Saudi Arabia / UAE / Qatar / Kazakhstan | 3 / 3 / 2 / 2 | 3 / 2 / 2 / 2 | 0 / 1 / 0 / 0 | 364 (UAEU) |
| **Jami** | **130** | **92** | **38** | **327–364** |

Yangi 38 ta: Kyung Hee, GIST, İTÜ, Bilkent, Hacettepe, Istanbul University, YTÜ, Ankara University,
Naples Federico II, Pisa, Florence, Turin, Szeged, Pécs, Corvinus, Semmelweis, MATE, Óbuda,
Széchenyi István, RUDN, SPbU, HSE, MIPT, NSU, TSU, MEPhI, KFU, Sunway, IIUM, WUT, AGH,
Adam Mickiewicz, Gdańsk Tech, Wrocław Tech, University of Wrocław, PUT, TUL, UAEU.

Mavjud 92 tadan 8 tasi ilgari bo'sh "placeholder" edi (`unverified`, moliyaviy maydonlar `NULL`):
`id` 202 Koç, 203 Boğaziçi, 204 Sabancı, 205 ELTE, 206 BME, 207 Debrecen, 208 Nazarbayev,
211 Jagiellonian — endi PDF ma'lumotlari bilan to'liq to'ldirildi (`verified`, reyting hali ham `NULL`).

## 3. Qarorlar (Top 300 importidagi kabi, chatda tasdiqlangan)

1. **`world_ranking`** — mavjud 200 ta QS reytingi saqlandi; yangi 38 qator `NULL`.
2. **`acceptance_rate`** foizda (`15` = 15%), PDFdagi `0.15` emas.
3. **Soxta URL yo'q** — `admissions_url` = rasmiy sayt; `application_url` va boshqalar `NULL`.
4. **Grantlar ikki joyga**: `scholarships` (foydalanuvchi sxemasi, `university_id` FK) va
   `university_scholarships` (PDF A-varianti).
5. PDF 3-vazifasi: "Top 300 ichida bo'lsa — grant va qabul ma'lumotlarini 4-bo'lim bilan yangila,
   yangi bo'lsa INSERT" — aynan shunday qilindi (4-bo'lim O'zbekistonlik abituriyentlarga mo'ljallangan
   boyroq ma'lumot hisoblanadi).

## 4. Supabase'ga yozilganlar

| Jadval | O'zgarish | Izoh |
| --- | --- | --- |
| `universities` | **+38** yangi (`id` 327–364) | tavsif, `highlights`, moliyaviy va qabul maydonlari, `country_code`, `flag_emoji`, `is_english_taught`, `data_source = 'Uzbek-focused 13-country Top-10 dataset (user PDF, 2026)'`, `source_reliability 8`, `verified` |
| `universities` | **92** yangilandi | `min_gpa`, `min_ielts`, `min_toefl`, `min_duolingo` (DET), `acceptance_rate` PDFdan; `min_sat` faqat PDFda bo'lsa; `founded_year` / `university_type` / `country_code` / `flag_emoji` / PSW bo'sh bo'lsa to'ldirildi; `is_english_taught` OR; `highlights[0]` = `Scholarship: …`, oxiriga `Uzbek applicants guide: <Country> Top-10 #N` qo'shildi; `last_verified_at = now()` |
| `scholarships` | **68** yangilandi | Top 300 importidagi bosh grantlar 4-bo'lim nomi/qoplamasi/muddati bilan boyitildi (`notes`: `…; enriched from the 13-country Top-10 guide for Uzbek applicants (PDF 2026, <guruh> #<n>)`) |
| `scholarships` | **+62** universitet granti | `notes`: `Imported from the 13-country Top-10 guide for Uzbek applicants (PDF 2026, …)`; 13 ta takror nomga ` (<Universitet>)` qo'shildi (`title` UNIQUE) |
| `scholarships` | **+10** milliy dastur (`id` 859–868, `university_id = NULL`) | El-Yurt Umidi, Stipendium Hungaricum, Türkiye Bursları, GKS, DAAD & Deutschlandstipendium, MAECI/DSU, CSC, Rossiya kvotasi, NAWA Banach, Study in Saudi. MIS (Malaysia) va MEXT — PDFda URL yo'q, kiritilmadi |
| `university_scholarships` | 130 upsert (61 yangi, 67 nomi yangilandi) → **358 qator / 345 universitet**, bog'lanmagan 0 | |
| `sources` / `university_sources` | +46 / +46 | 38 yangi + 8 placeholder uchun rasmiy sayt manbasi |
| `programs` / `program_requirements` / `program_sources` | +46 / +46 / +46 | `Undergraduate Degree Programs (BSc / BA / BEng)` umumiy dastur + IELTS/TOEFL/DET/SAT/GPA, PS/Rec/Int/Port, `other_requirements` (TOPIK, TR-YÖS, HSK, TOLC …) |
| `application_cycles` | +56 | har bir aniq sana alohida qator ("keyingi kelasi sana" yili bilan); aniq sana bo'lmaganlar `deadline = NULL`, `is_estimated = true`, asl matn `notes`da |

## 5. Yakuniy holat (2026-10-23, import tugagach tekshirildi)

```
universities            364 (130 tasi 4-bo'limdan; 200 tasida world_ranking bor)
programs                3008   application_cycles 3038
sources                 2263   university_sources 565
scholarships            639    (140 tasi shu PDFga tegishli: 68 boyitilgan + 62 yangi + 10 milliy)
university_scholarships 358    (345 universitet, scholarship_id NULL = 0)
```

130 ta 4-bo'lim universitetining har birida: programs ✓, application_cycles ✓, university_sources ✓,
scholarships ✓, university_scholarships ✓, `highlights` `Scholarship: …` + `Uzbek applicants guide` ✓.
Tekshiruv so'rovlari: `supabase/uzbek_13c_pdf_import.sql`.

## 6. Research-agent watchlist (PDF 4C-vazifasi)

`src/lib/research-agent/scholarship-watchlist.json` yaratildi — PDFdagi 9 ta yozuv aynan
(`eyuf-uz`, `stipendium-hungaricum`, `turkiye-burslari`, `gks-korea`, `maeci-italy`, `csc-china`,
`rf-quota`, `nawa-poland`, `kfupm-saudi`) + 4C-vazifa ro'yxatida bor, lekin namunada tushib qolgan
2 ta portal (`daad-germany` → daad.de, `universitaly-italy` → universitaly.it). Format: `id`, `name`,
`url`, `country`, `regexHint`.

**Hali ulanmagan** (alohida kod vazifasi, PDF 4C): cron (`GET /api/cron/refresh`) ichida shu portallarni
regex bilan tekshirish, o'zgarish topilganda `university_scholarships.verification_status = 'review_required'`
qilish va Telegram orqali adminga xabar yuborish. `src/lib/research-agent/` da hozircha "watchlist"
tushunchasi yo'q; `src/db/schema.ts` ham `university_scholarships` jadvalini modellamaydi.

## 7. Ma'lum cheklovlar va qoldiqlar

* Staging jadvallari **o'chirilmadi**: `_pdf_13c`, `_pdf_13c_cycles` (shu import) — `DROP TABLE`
  so'rovi Supabase konnektori provayderining xavfsizlik filtri tomonidan bloklandi, qayta yuborilmadi.
  `_import_top300`, `_import_codes` — Top 300 importidagi parallel jarayon qoldirgan. To'rttasida ham
  `anon`/`authenticated` huquqlari olib tashlangan (PostgREST orqali ko'rinmaydi). O'chirish uchun tayyor
  satrlar `supabase/uzbek_13c_pdf_import.sql` oxirida (Supabase SQL editor'da qo'lda ishga tushiriladi).
* PDFdagi ko'p qiymatlar shablonlashtirilgan (masalan, GPA 3.7 / IELTS 7.0 bir xil ko'p qatorda) — ular
  "rasmiy" emas; `data_source` orqali ajratib olinadi.
* Yangi 38 universitetda `description` avtomatik (2–3 gap), `image_url`, `short_name` bo'sh.
* `application_cycles`dagi taxminiy muddatlar (`is_estimated = true`) `unverified` — rasmiy sahifadan
  aniqlashtirish kerak.
* Bazada mamlakat nomi `Turkey` (PDFda `Türkiye`) — ilova konvensiyasiga ko'ra saqlandi.
