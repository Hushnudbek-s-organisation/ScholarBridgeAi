# Scholarship Rewrite Pass 128 — 2026-10-29

## Katalog holati (foydalanuvchi so'roviga o'lchov)

Pass boshida katalog kesimi olindi (parallel sessiya yozuvlari tufayli raqamlar "jonli"): jami **748** qator, **543 faol / 205 nafaqada**, maks ID 1000.

Faol yozuvlarning ishonchliligi: rel 10 = **244** (45%), rel 9 = **189** (35%), rel 8 = **104**, rel ≤7 = **6** (876 CTU rel-4 shular ichida). Qolgan asosiy ish: rel 8 va pastdagi ~110 yozuvni navbatma-navbat birinchi qo'ldan tekshirib ko'tarish yoki yopish (taxminan yana 15–25 pass/batch), plus kuzatuvdagilar (876/875 CTU sayti, 500 UM, 541 GT-IF to'liq chaqiruv, 421 — noyabr oxiri, 990 — 2026-11-27 dan keyin).

**Davlat grantlari:** 543 faoldan 453 tasi universitetga bog'langan, 90 tasi sxema darajasida. Shu 90 tadan **46 tasi aniq davlat dasturlari** (Chevening, Fulbright, DAAD ×2, Eiffel, MEXT, GKS, CSC, Türkiye Burslari, Stipendium Hungaricum, Erasmus Mundus, Swedish Institute, ICCR, NAWA, Romanian/Slovak Government, Russian Quota + Open Doors, MAECI, Ireland GOI, BDGS Brunei, TIPP, MOE Taiwan, JDS, KOICA, HKPFS, Canada CGRS, Danish State ×2, ANID, CONICET, TIAS, El-Yurt Umidi va b.) hamda 3 ta ko'p tomonlama (JJ/WBGSP, IsDB, ADB-JSP). 453 universitet yozuvi ichida ham davlat pulli mezbon yozuvlari ko'p (CSC mezbonlari 31/44, Hungaricumning 9 mezbon qatori va h.k.).

**Qo'shilmagan yirik davlat dasturlari** (keyingi batchlar nomzodlari, har biri O'zbekiston huquqi tekshirilib qo'shiladi): Australia Awards, Manaaki (Yangi Zelandiya), Invest Your Talent in Italy, Singapore SINGA, Xitoy MOFCOM. Commonwealth (UK) — O'zbekiston Hamdo'stlik a'zosi emas, katta ehtimol bilan yopiq (tekshiruvda rad hujjati qilinadi).

## Audit: 18 ta faolsiz rel 9/10 yozuv

Batch 34 da ochilgan savol — "jonli ko'rinadigan" 18 ta yuqori ishonchli faolsiz yozuv (106 Imperial President's PhD, 109 Gates, 111 ETH ESOP, 124 Schwarzman, 395 USM, 399 PUCV, 448 Hokkaido, 26 ESOP, 374, 439, 461, 463, 468, 469, 471, 472, 473, 496).

**Natija: 18 tasi ham qonuniy nafaqa.** Har birining izohida 2026-10-23/26/27 dagi hujjatli sabab turadi: dublikat (saqlanib qolgani faol — 13 ESOP rel 10, 22 Imperial, 11 Gates, 32 Schwarzman, 537 Amsterdam Merit, tekshirildi ✓), uydirma summa/nom (Malaysia "International Excellence" oilasi, 395 "ISS"), yopilgan dastur (473 Utrecht UES 2026-27 dan bekor, 448 Hokkaido 2024 dan to'xtatilgan, 439 Newcastle RTP faqat domestic). Hech biri qayta faollashtirilmadi.

Kamchilik faqat gigiyenada edi: 5 tasi (26, 106, 111, 399, 496) haligacha `status=open` + kelajak `deadline_date` bilan yotgan. 18 tasiga ham `application_status='closed'`, `deadline_date=NULL` qilindi va audit izohi qo'shildi; matnlar va reliability o'zgartirilmadi.

## Topildi: tashqi 8 ta faolsizlantirish

Pass 127 (544 faol) va Batch 34 ochilishi (536) orasidagi −8 siljishning manbai aniqlandi. Butun katalogda nafaqa sababi yozilmagan faolsiz qatorlar aynan **8 ta** chiqdi: 551 (CMU), 718 (Paris 1), 735 (Florida), 745 (Lisbon), 747 (Maryland), 756 (Porto), 762 (Wits), 781 (UW) — va ularning aynan 2 tasida (551, 781) kelajak muddat bor edi, bu −2 kelajak-muddat siljishiga ham aniq mos keladi.

Bular mazmuni "bu universitet xalqaro talabalarga grant bermaydi" bo'lgan informatsion yozuvlar: 2026-10-23 da uydirma summalari halol matn bilan almashtirilgan, lekin faol qolib ketgan edi. Parallel sessiya/admin ularni o'chirgan — **qaror to'g'ri**: "grant yo'q" deyilgan yozuv ochiq imkoniyat sifatida ko'rinmasligi kerak. Pass 128 da o'chirish bekor qilinmadi, aksincha rasmiylashtirildi: `status=closed`, muddat tozalandi, sabab izohga yozildi.

## Natija (qattiq tekshiruv)

- **543 faol / 205 nafaqada / 1 rel-4 / 205 kelajak-muddat** — pass hisobidan o'zgarish yo'q (26 ta qator allaqachon faolsiz edi; faqat holat gigiyenasi tuzatildi). Audit qilingan 26/26 qator `closed` + muddat NULL ✓.
- Kengroq gigiyena qoldi: yana **166 ta** faolsiz qatorda status `closed` emas (asosan eski davr nafaqalari) — ularga ommaviy tegilmadi (ba'zilari ataylab "unknown" sifatida saqlangan, mas. 704 UCT); alohida ehtiyotkor micro-pass mavzusi.
- Hech qanday sahifa fetch qilinmadi — audit yozuvlarning o'z hujjatli izohlariga tayandi.
- Mahalliy tekshiruvlar: typecheck ✓, check:i18n ✓, render 337/337 ✓.

Keyingi qadam: **Enrichment Batch 35** — yuqoridagi davlat dasturlari bo'shlig'idan (Australia Awards / Manaaki / Invest Your Talent / SINGA / MOFCOM) huquqi tasdiqlangani birinchi qo'ldan qo'shiladi.
