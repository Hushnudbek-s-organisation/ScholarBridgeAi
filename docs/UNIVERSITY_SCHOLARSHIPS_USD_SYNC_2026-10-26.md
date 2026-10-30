# University Scholarships USD-Satr Sinxronizatsiyasi — 2026-10-26

Pass 97 da topilgan muammoning yechimi: `university_scholarships` jadvalidagi 570 yozuvdan **118 tasi** `max_scholarship` maydonida importyorning qisqa uydirma formati — `USD <n> year` — ni saqlagan, hatto ota `scholarships` yozuvi allaqachon tuzatilgan joylarda ham (masalan Pass 95 da tozalangan ANU uchun us 565 da "USD 44000 year" yashab kelgan). Pass 97 dan keyin 116 qolgan edi; ushbu trek ularni to'liq audit qildi.

> `scholarships` jadvaliga tegilmadi: active 537, rel4 112 — o'zgarishsiz. Bu trek faqat `university_scholarships` ni ota yozuvlardagi **allaqachon tasdiqlangan** qiymatlar bilan uyg'unlashtirdi; yangi manba o'qilmadi, hech qanday raqam ixtiro qilinmadi.

## Triaж (yozishdan oldin)

116 ta USD-satr ota yozuv holati bo'yicha:

| Bucket | Soni | Yondashuv |
|---|---:|---|
| C: tasdiqlangan ota (rel ≥ 8) + e'lon qilingan miqdor bor | 40 | Haqiqiy qiymat bilan sinxronlash |
| D: tasdiqlangan ota, yagona miqdor atayin yo'q (NULL) | 18 | Raqam o'rniga coverage-tavsif |
| E: ota hali reliability 4 (`amount_usd_value=0` — raqam faqat shu jadvalda qolgan) | 55 | Uydirma raqamni olib tashlash, tekshiruv belgisisiz |
| B: ota retired | 3 | Individual qaror |

**Hal qiluvchi kuzatuv:** avvalgi passlar yozgan **boy tavsifiy satrlar** (masalan "CAD 7,500 per term, up to CAD 60,000; combinable...") qisqa formatdan ko'ra ko'proq tasdiqlangan ma'lumot tashiydi — ularni ommaviy almashtirish ma'lumot yo'qotish bo'lardi. Shuning uchun faqat qisqa importyor shabloni `^[A-Z]{3} [0-9][0-9 ]*(year|month|total|one_time)$` nishonlandi.

## Bajarilgan ishlar

- **C (10 yozuv o'zgardi):** qiymati ota yozuvnikidan farq qilganlar sinxronlandi — 472 `USD 32000 year` → `CHF 2450 month` (Swiss ESKAS), 474 → `GBP 23152 year` (Gates Cambridge), 479 → `AUD 20000 year` (UNSW Scientia), 546 → `AUD 39220 year` (UQ), 565 → `AUD 40475 year` (ANU), 569/615/643/652 → `HKD 344400 year` (Hong Kong), 595 → `AUD 42754 year` (Sydney). Yana 27 ta qisqa satr ota qiymatiga **aniq mos** chiqdi (masalan haqiqatan USD-dagi yozuvlar) — ularga tegilmadi.
- **D (15 yozuv):** uydirma USD raqam coverage-asosidagi tavsifga almashtirildi ("Full funding - see scholarship record for components" va h.k.), eskirgan nomlar/URLlar tasdiqlangan otadan sinxronlandi (masalan us 592 UBC eski nomi, us 538 Monash MITS). Xuddi shu bucketdagi 4 ta boy satr (57, 279, 293, 466) tegilmadi.
- **E (55 yozuv):** faqat raqam olib tashlandi → "See scholarship record for the published award value" (55 tasining barchasida coverage 'Unspecified'). Nom/URL sinxron **qilinmadi**, `last_verified_at` **ko'tarilmadi** — yozuvlar o'z passini kutadigan tasdiqlanmagan holatda qoldi; farq shuki, endi universitet sahifasida uydirma dollar raqami ko'rinmaydi.
- **B (2 o'chirildi, 1 qoldirildi):** us 548 (Imperial, verified id 22 ning dublikati) va us 550 (Cambridge merge) Pass 96 precedentiga ko'ra o'chirildi. us 280 (UCSB Regents) qoldirildi — `availability_status='No'` va satri halol: "USD 5 000 a year, but international students are excluded".

## Natija (hard check)

| Ko'rsatkich | Pass 97 | USD-sync |
|---|---:|---:|
| `university_scholarships` jami | 571 | 569 |
| `max_scholarship` da "USD" | 116 | **34** |
| — shundan tasdiqlangan USD-ota (rel ≥ 8) | — | 32 |
| — retired, halol exclusion yozuvi (us 280) | — | 1 |
| — tasdiqlangan boy matn ichida (us 293) | — | 1 |
| — tasdiqlanmagan ota bilan USD da'vo | 55 | **0** |
| Active / retired / rel4 (scholarships) | 537 / 132 / 112 | o'zgarishsiz |

Qolgan 34 ta USD satrning har biri tasdiqlangan yozuvga tayanadi — endi `university_scholarships` da **asossiz pul da'vosi qolmadi**.

## Kuzatuvlar (keyingi ishlar uchun)

- `university_scholarships.verification_status` ustunida yagona qiymat bor: `verified` (default) — 55 ta E-yozuv ham shunday belgilangan. Ustun hozir ma'no tashimaydi; yangi lug'at (`unverified`) kiritish — UI xatti-harakatini tekshirishni talab qiladigan alohida qaror, ushbu trekda qilinmadi.
- `official_url`/`source_url` sinxroni faqat tegilgan 25 yozuvda qilindi; qolgan tasdiqlangan ota-li yozuvlarda yalang'och domenlar qolishi mumkin — keyingi sinxron trek uchun nomzod.
- Kelajakdagi rewrite passlar us yozuvini ham birga tuzatishi kerak (Pass 97 dan boshlab shunday qilinmoqda), aks holda bu sinxron yana eskiradi.

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — o'tdi.
- `npm run check:i18n` — o'tdi.
- `npm run test:render` — 337/337 o'tdi.
- Kod o'zgarishi yo'q; faqat DB + doc/SQL replay.
- Eslatma: sandbox workspace git holatini bazaviy commitga qaytargan edi (fayllar diskda saqlangan); remote bilan solishtirib (10/10 fayl bir xil), mahalliy HEAD `6bf3fe4` ga tiklandi — ish yo'qolgani yo'q.
