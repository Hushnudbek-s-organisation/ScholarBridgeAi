# Scholarship Enrichment Batch 5 — 2026-10-26

Foydalanuvchi nomlab bergan 11 ta dastur audit qilindi. Natija: **6 tasi katalogda avvaldan bor edi** (2026-10-23 batchlari, id 896–901), **2 ta yangi yozuv qo'shildi** (Slovak SAIA NSP — id 913, Konrad-Adenauer-Stiftung — id 914), **4 dastur O'zbekiston uchun mos emasligi rasmiy manbalarda qayta tasdiqlandi** (Czech, Aga Khan, Manaaki New Zealand, Bulgarian). Qo'shilgan yozuvlar na universitet, na davlatga qo'lda bog'landi; `country` maydoni bilan qidiriladi. Uydirma miqdor/deadline kiritilmadi: ko'p bosqichli (tiered) tariflarda `award_amount=NULL` (KAAD/Böll precedentiga muvofiq), barcha tariflar matnda; `min_gpa/min_ielts` rasmiy bitta raqam bo'lmagani uchun NULL.

> ⚠️ Muhim: Slovak NSP joriy chaqiruvi **2026-10-31** da yopiladi (tekshiruv kunidan 5 kun sonra) — foydalanuvchilarga shoshilinch ko'rsatishga arziydi.

## 11 ta dastur bo'yicha audit

| Dastur | Id | Holat |
|---|---:|---|
| Rotary Peace Fellowship (Master's) | 896 | Bor (batch 2), rel 10, deadline 2027-05-15 |
| KAAD Eastern Europe Programme | 897 | Bor (batch 2), rel 10, Central Asia eligibility yozilgan |
| Romanian Government (MFA) | 898 | Bor (batch 3), rel 10, navbatdagi qabul kutilmoqda |
| Heinrich Böll Foundation | 899 | Bor (batch 3), rel 10, deadline 2027-03-01 |
| Slovak Government (full degree) | 900 | Bor (batch 4), rel 9 — bu SAIA NSP emas |
| IsDB MSP (PhD/postdoc, high tech) | 901 | Bor (batch 4), rel 8. IsDB da jami 4 dastur bor; O'zbekiston (member, LDMC emas) uchun faqat MSP mos — alohida bachelor/master member-country dasturi yo'q (isdb.org/scholarships da qayta tasdiqlandi) |
| **Slovak SAIA NSP (mobility)** | **913 (YANGI)** | rel 10, jonli chaqiruv 2026-10-31 16:00 CET |
| **Konrad-Adenauer-Stiftung** | **914 (YANGI)** | rel 10, batch 3 da kechiktirilgan item hal qilindi (pastda) |
| Czech Government | — | QO'SHILMADI. Rasmiy MŠMT 2027/2028 sahifasi (chaqiruv 2026-08-21–09-30, yopilgan): 13 mamlakat, O'zbekiston yo'q |
| Aga Khan Foundation ISP | — | QO'SHILMADI. AKDN/AKF rasmiy ro'yxati joriy siklda ham O'zbekistonni o'z ichiga olmaydi |
| Manaaki New Zealand | — | QO'SHILMADI. nzscholarships.govt.nz eligible-country ro'yxati: Pacific + tanlangan Osiyo mamlakatlari; O'zbekiston/Markaziy Osiyo yo'q |
| Bulgarian Government | — | QO'SHILMADI. Eurydice ikki tomonlama kelishuvlar ro'yxatida O'zbekiston yo'q; Decree 103 etnik bolgarlar uchun va O'zbekistonga fee-waiver bermaydi. Agregatorlarning "ochiq chaqiruv" iddaolari rasmiy manbada tasdiqlanmadi |

## Yangi yozuvlar

### Id 913 — Slovak National Scholarship Programme NSP (Mobility, SAIA)

- **Manba:** scholarships.sk shartlar sahifasi (terms for foreign applicants) + 2026/2027 yoz semestri jonli chaqiruvi (2026-10-26 da fet ch qilingan).
- **Eligibility:** Slovakiyadan tashqari har qanday mamlakat fuqarosi — O'zbekiston mos. Kategoriyalar: master talabalari yoki ≥2.5 yil o'qigan talabalar (4–10 oy), PhD talabalar (1–10 oy), o'qituvchi/tadqiqotchi/rassomlar (1–10 oy). **Bu mobility — full-degree emas** (id 900 dagi Slovak Government full-degree dan ajratib yozildi).
- **Miqdorlar (matnda, `award_amount=NULL` tiered konventsiyasi):** talaba €620/oy, PhD €1,025.50/oy, o'qituvchi/tadqiqotchi €1,025.50–€1,470/oy; masofa bandlari bo'yicha travel grant €0–€1,500; >90 kunlik non-EU holderlarga tibbiy ma'lumotnoma kompensatsiyasi €250 gacha.
- **Deadline:** `deadline_date='2026-10-31'`, `fixed`, `open`; doimiy muddatlar 30-aprel va 31-oktabr 16:00 CET (rounds JSON da).
- **Manba reestri:** sources 3045 + scholarship_sources link.

### Id 914 — Konrad-Adenauer-Stiftung Scholarship (Germany)

- **Manba:** kas.de International Talent Development rasmiy sahifasi (2026-10-26 da fet ch qilingan).
- **Batch 3 dagi shubha hal qilindi:** uy mamlakatidan ariza — faqat yillik tanlanadigan focus hududlardagi KAS ofislari orqali. 2026 da Buenos Aires (Argentina, Bolivia, Chile, Uruguay, Paraguay) va Nairobi (Kenya, Uganda/South Sudan, Tanzania, Ethiopia) — **O'zbekiston 2026 focus hududi emas**, uy mamlakatidan ariza hozir mumkin emas. Ikkinchi yo'l: Germaniyada allaqachon yashayotganlar — har yili 15-iyul 12:00 CET, Campus Portal.
- **Yozuv shakli:** `deadline_date='2027-07-15'` (Germaniya ichidagi yo'l) + cheklov deadline/description/requirements matnida birinchi gaplarda ochiq yozilgan — yozuv "hozir O'zbekistondan ochiq" deb o'qilishi mumkin emas.
- **Miqdorlar (matnda, tiered konventsiyasi):** BA/MA €992/oygacha (standart 2 yil), PhD €1,400/oy (standart 3 yil); health insurance €120/oygacha, family €276, child €250/bola, research travel grants, istisno hollarda tuition €750/semestrgacha qisman. German tili **majburiy B2** (inglizcha dasturlar uchun ham) — `english_requirements` ga yozildi. Medicine/dentistry (state exam) va 3-semestrli dasturlar mos emas; postdoc yo'q; yosh chegarasi yo'q.
- **Manba reestri:** sources 3046 + scholarship_sources link. `application_url=NULL` (Campus Portal havolasi alohida tekshirilmadi — ixtiro qilinmadi).

## Rad etilganlar — rasmiy asoslar

- **Czech Government (qayta tasdiqlandı bazėsidan, birinchi qo'l):** MŠMT rasmiy sahifasi — 2027/2028 qabul 2026-08-21–09-30 davomida bo'lgan; eligible 13 mamlakat: Bosnia and Herzegovina, Georgia, Ukraine, Belarus (democratic forces), Ethiopia, Gabon, Mauritania, Zambia, Bangladesh, Cambodia, Palestine, Guatemala, Honduras. O'zbekiston yo'q.
- **Aga Khan ISP (qayta tasdiqlandı):** AKDN rasmiy sahifasi — available countries ro'yxatida O'zbekiston yo'q (Qirg'iziston va Tojikiston borligi alohida tekshirildi, lekin ular Uzbekistan fuqarosi uchun yo'l emas — origin talabi bor).
- **Manaaki New Zealand (yangi tekshirilgan):** official eligible-country ro'yxatlari tertiary va short-term ikkala trekda ham O'zbekistonni bermaydi.
- **Bulgarian Government (yangi tekshirilgan):** Eurydice (EU) ikki tomonlama kelishuvlar ro'yxatida O'zbekiston yo'q; uchinchi tomon "studyinbulgaria" tipidagi saytlarning umumiy chaqiruv iddaolari rasmiy tasdiqsiz qoldirildi va yozuv qo'shilmadi.

## Hard check (batch 5 dan keyin)

| Ko'rsatkich | Pass 96 | Batch 5 |
|---|---:|---:|
| Active | 535 | **537** |
| Retired | 132 | 132 |
| Active reliability 4 | 115 | 115 (tozalash tugamagan) |
| `amount_usd_value > 5000` | 19 | 19 |
| Future `deadline_date` | 157 | **159** |
| Bare-domain active `website_url` | 26 | 26 |

Yangi yozuvlar ikkalasi ham `source_reliability=10`, `amount_usd_value=0` (EUR tariflar matnda), `min_gpa/min_ielts=NULL`.

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — o'tdi.
- `npm run check:i18n` — o'tdi.
- `npm run test:render` — 337/337 o'tdi.
- Kod o'zgarishi yo'q; faqat DB + doc/SQL replay.
