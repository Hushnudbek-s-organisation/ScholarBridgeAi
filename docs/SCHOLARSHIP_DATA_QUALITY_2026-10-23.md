# Grantlar ma'lumot sifati — 3-audit (2026-10-23)

Oldingi ikki audit **attributsiya** xatolarini (boshqa universitetning granti, bo'lishi
mumkin bo'lmagan da'vo) tuzatgandi. Bu audit **mashina o'qiydigan maydonlar**ni tekshirdi —
ular buzilganda filtr, moslik bali va dashboard jimgina noto'g'ri ishlaydi.

## 1. Eng jiddiy: `eligible_countries` matn sifatida — 339 qator

Bazada `"All Countries"` **oddiy matn** sifatida saqlangan edi (JSON `["All"]` emas).

```
parseListColumn("All Countries")  →  ["All Countries"]
```

Ya'ni "All Countries" degan **davlat** paydo bo'lgan. Natijalari:

| Joy | Nima bo'lgan |
| --- | --- |
| `essayAdapter` | har bir talaba uchun **`country_ineligible`** → moslik bali −10 |
| `api/dashboard` | `scholarshipCountryVerdict` = **"out"** → grant dashboard'dan **butunlay yashirilgan** |

Ya'ni "butun dunyo uchun" grantlar o'zbek talabasiga "siz mos emassiz" deb ko'rsatilgan
yoki umuman ko'rinmagan.

**Tuzatildi (ma'lumot):** 466 qator `["All"]`, 3 qator `["Uzbekistan"]`
(Stipendium Hungaricum, El-Yurt Umidi, NAWA Banach), 1 qator `["ASEAN"]`
(NUS ASEAN — u O'zbekistonni **haqiqatan** qabul qilmaydi).

**Tuzatildi (kod):**
* `src/lib/essayAdapter.ts` — "All / Any / Worldwide / International / Global /
  Developing / Emerging / varies" kabi iboralar cheklovsiz deb qabul qilinadi;
  `ASEAN` kabi blok nomlari esa **cheklov bo'lib qoladi**.
* `src/app/api/dashboard/route.ts` — `scholarshipCountryVerdict` endi shu iboralarni
  `open-to-all` deb biladi (avval `out` bo'lib grantni yashirardi). Regex `countries`
  so'zini **ataylab** o'z ichiga olmaydi: "ASEAN Countries" blok nomi.

Testlar: `test:essay-adapter` 50 assertion (7 tasi yangi: "All Countries",
"International (Non-UK)", "180+ Countries (varies)", "Developing & Emerging",
`["All"]`, `["Germany"]` mos keladi, `["ASEAN"]` rad etadi).

## 2. `degree_levels` grant nomiga zid — 84 qator

Top-300 PDF importi hamma qatorga `["Bachelor's","Master's","PhD"]` yozgan. Natijada:

| Holat | Soni | Misol |
| --- | ---: | --- |
| "Undergraduate Scholarship" **PhD** ga ham mos | 28 | Leeds International Undergraduate Scholarship |
| "Undergraduate Scholarship" Master's ga ham mos | 28 | Imperial President's Undergraduate Scholarship |
| "Master's award" **Bachelor** ga mos | 38 | … |
| "Doctoral award" Bachelor ga mos | 1 | … |

Daraja — katalogdagi **qattiq filtr**, shuning uchun bu grantni noto'g'ri talabaga
ko'rsatib, to'g'ri talabadan yashirardi.

**Tuzatildi:** nom bo'yicha aniqlandi — undergraduate/bachelor → `["Bachelor"]`,
doctoral/PhD → `["PhD"]`, postgraduate → `["Master","PhD"]`, master → `["Master"]`.
Uchta qo'shma nom (`LSE PhD Studentship and Master Awards`, `Birmingham Global Masters
and Doctoral Award`, `KFUPM Full Master and PhD Scholarship`) → `["Master","PhD"]`.

## 3. UI'da **"$0"** ko'rinishi — 11 qator

10 ta milliy dastur (859–868) va CTU merit stipendiyasida `amount_usd_value = 0`.
Ustun `NOT NULL` bo'lgani uchun 0 "e'lon qilinmagan miqdor" belgisi sifatida ishlatilgan,
lekin `formatMoney(0, "USD")` **"$0"** qaytaradi — foydalanuvchi "Grant: $0" ko'rardi.

**Tuzatildi (kod):**
* `src/app/api/universities/[id]/route.ts` — 0 endi `null` (ya'ni "miqdor e'lon
  qilinmagan") deb o'qiladi.
* `src/lib/countryCostBenchmarks.ts` — xarajat hisobiga 0 miqdor kirmaydi.

## 4. Boshqa tuzatishlar

| Muammo | Soni | Tuzatish |
| --- | ---: | --- |
| `degree_levels` / `eligible_majors` oddiy matn | 19 | JSON massivga |
| `deadline_type` = `"Fixed"` / `"exact"` | 85 | `"fixed"` |
| `recurrence` = `"Annual"` / `"bi-annual"` | 364 | `"annual"` |
| Sarlavhada `!` va tahririy izohlar (`Uzbekistan Eligible!`, `Top-15 QS Priority!`) | 5 | rasmiy nomga |
| `university_scholarships.scholarship_name` eskirgan | 42 | `scholarships.title` bilan sinxron |
| 9 qatorda eski `award_amount` / `tuition_coverage` ziddiyati | 9 | yangi faktlarga moslandi |

Oxirgi band muhim: oldingi auditda `amount_usd_value` va `coverage_type` yangilangan, lekin
`award_amount` va `tuition_coverage` **eski, noto'g'ri** da'voni saqlab qolgan edi
(masalan €300/oy nemis stipendiyasi "100% of annual tuition fees" deb turardi).

## 5. Yakuniy holat

```
faol grantlar                          643
degree_levels JSON emas                  0
eligible_countries JSON emas             0
sarlavhada "!"                           0
nom drift (university_scholarships)      0
award_amount ↔ amount_usd_value farqi    0
amount_usd_value = 0 (kodda hal qilingan) 11
```

## 6. Tekshiruv

```
npm run test:essay-adapter   50 passed, 0 failed
npm run test:match           99 passed, 0 failed
npm run test:render         337 passed, 0 failed
npm run test:schema          PASSED
npm run test:security        81 assertions
npm run check:i18n           passed
npx tsc --noEmit             clean
npm run build                success
```

## 7. Ochiq qolgan

* **56 ta "<Universitet> International Excellence Scholarship"** shabloni — ko'p
  universitetlarda bu haqiqiy nom, shuning uchun har birini saytdan tekshirish kerak.
* **1 ta dublikat universitet qatori** (176 = UNAM 91) — birlashtirish alohida ish.
* `tuition_coverage` — erkin matn (enum emas); hozir izchil, lekin kelajakda
  enumga o'tkazish tavsiya etiladi.

Takrorlash: `supabase/scholarship_data_quality_sweep_3_2026-10-23.sql`.
