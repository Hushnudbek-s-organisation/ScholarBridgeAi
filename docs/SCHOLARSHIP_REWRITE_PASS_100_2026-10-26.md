# Stipendiyalarni qayta ko'rib chiqish — Pass 100 (2026-10-26)

## Kontekst

Pass 99 Avstraliya klasterini yopdi (AU rel4 = 0). Qolgan 103 ta tekshirilmagan (rel=4) faol yozuvning eng katta guruhi — **Buyuk Britaniya (16 ta)**. Bu yozuvlar raw importer qatorlari emas: avvalgi "UK tail pass"lar (50–56) ularga yumshoqroq usul qo'llagan — uydirma USD qiymatlar nollangan, sarlavha "(named award unconfirmed)" deb belgilangan va yozuv "funding directory pointer" sifatida **faol qoldirilgan**. Amaldagi qat'iy qoida (pass 94–99larda qo'llangan): umumiy funding-katalog yozuvlari alohida stipendiya qilib ko'rsatilmay, **retire qilinadi**; katalog ichidagi real sxemalar faqat alohida tekshiruvdan keyin keyingi to'plamlarda qo'shilishi mumkin.

Pass 100 UK klasterining birinchi 4 yozuvini oladi (id tartibida). Har biri uchun saqlangan URL 2026-10-26 da qayta fetch qilindi.

## Natijalar — 4 ta retire

| id | Yozuv | Qayta fetch natijasi | Qaror asosi |
|---|---|---|---|
| 326 | University of Birmingham postgraduate funding | Saqlangan URL = umumiy "Postgraduate study" hub sahifasi (marketing sahifa, stipendiya emas). Importer yuborgan global-masters-scholarship URL pass 55 da 404 qaytargan. | Nomlangan mukofot hech qachon tasdiqlanmagan; Birmingham xalqaro mukofotlari verified yozuv **546** da bor → retire. |
| 333 | University of Sheffield PhD scholarships directory | Jonli sahifa — katalog: University Research Scholarships va CSC **yopiq (2027 entry uchun mukofot yo'q)**, Hossein Farmy loyihalari 2027 boshida e'lon qilinadi (tor arxiv mavzusi), qolgani UKRI/DTP va school/project studentshiplar. | Yozuvni qayta yozish mumkin bo'lgan ochiq universitet-darajasidagi xalqaro PhD stipendiyasi yo'q → retire. Sheffield UG verified yozuvi 666 ta'sirlanmadi. |
| 365 | Cardiff University postgraduate research funding | Saqlangan URL endi **"Page not found"** qaytaradi. | Mukofot hech qachon tasdiqlanmagan; Cardiff xalqaro mukofotlari verified **550** da bor → retire. |
| 367 | University of Aberdeen postgraduate research funding | Saqlangan URL = universitetning bo'm-bo'sh qidiruv sahifasi (/search/). Asl funding URL pass 56 da page-not-found bergan. | Mukofot tasdiqlanmagan; Aberdeen xalqaro mukofotlari verified **720** da bor → retire. |

Retire shabloni (pass 98 dagi 439 usuli): `is_active = false`, `application_status = 'closed'`, `source_reliability = 9` (topilma o'zi tekshirilgan), sarlavhaga "(retired: funding directory, not a named scholarship)" qo'shimchasi, notes ga retire sababi ilova qilindi.

## Yon jadvallar

- `sources`: 3 ta bare-domain manba fetch qilingan dalil-sahifalarga yo'naltirildi — 2492 (Bham.ac.uk → Birmingham study hub), 2499 (Cardiff.ac.uk → fetched URL, o'lik havola dalili sifatida), 2477 (abdn.ac.uk → /search/). Sheffield manbasi 2614 allaqachon to'g'ri jonli sahifada edi — o'zgartirilmadi.
- `university_scholarships`: 499/600/616 yozuvlarida `availability_status = 'No'` va halol "No confirmed award" matni avvaldan bor edi; nomlar retired sarlavhalar bilan sinxronlandi, `last_verified_at` yangilandi. Sheffield 333 da us yozuvi yo'q.

## Hisoblagichlar (hard-check, 2026-10-26)

| Ko'rsatkich | Batch 6 dan keyin | Pass 100 dan keyin |
|---|---|---|
| Faol yozuvlar | 544 | **540** (−4) |
| Retire qilinganlar | 133 | **137** (+4) |
| Faol rel=4 | 107 | **103** (−4) |
| UK rel=4 | 16 | **12** (−4) |
| Kelajakdagi deadline'lar | 163 | 163 (o'zgarmadi) |

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — xatosiz (node_modules snapshotda yo'qolib, `npm ci` bilan qayta o'rnatildi)
- `npm run check:i18n` — passed
- `npm run test:render` — 337/337 passed

## Rostgo'y izoh

Tozalash **tugagani yo'q**: hali 103 ta rel=4 faol yozuv bor, shundan UK da 12 ta qoldi (368, 369, 383, 384, 385, 387, 388, 389, 390, 406, 455, 498) — ularning ham ko'pi xuddi shunday "(named award unconfirmed)" katalog-ko'rsatkichlari, lekin har biri alohida fetch asosida hal qilinadi (ommaviy yopiq qaror qabul qilinmaydi).

## Keyingi qadam (reja bo'yicha)

Additions batch 7 (cleanup ↔ additions navbati bo'yicha), undan keyin Pass 101 — UK klasterining davomi.
