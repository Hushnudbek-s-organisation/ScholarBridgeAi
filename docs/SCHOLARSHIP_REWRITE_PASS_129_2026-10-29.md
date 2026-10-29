# Scholarship Rewrite Pass 129 — 2026-10-29

Uch qismli tozalash: (1) Deutschlandstipendium oilasidagi uydirma minimumlar, (2) USD konversiyalari, (3) faolsiz qatorlar holat gigiyenasi. Pass boshidagi kesim: 544 faol / 205 nafaqa; rel ≤8 da minimumli yozuvlar **94**; muddati o'tib ham "ochiq" yozuvlar **0** ✓; USD-konversiya shubhasi **5**; statusi `closed` bo'lmagan faolsizlar **166**.

## 1) Deutschlandstipendium oilasi (17 yozuv): shablon minimumlar olib tashlandi

Germaniya bo'yicha 17 ta faol yozuv (350 RWTH rel 10 dan tortib rel 8 gacha) bir xil shablon minimumlarini ko'tarib yurgan: GPA 3.0–3.6, IELTS 6.5 — bir-biri bilan bog'liq bo'lmagan universitetlarda aynan bir xil raqamlar. Federal vazirlikning (BMFTR) rasmiy dastur sahifasi birinchi qo'ldan o'qildi (manba **3158**): grant oyiga **€300**, universitetlar uni akademik natija + ijtimoiy faollik + shaxsiy holatlar bo'yicha beradi, **raqamli GPA/IELTS kesimi yo'q** — til talabi dasturning o'ziga tegishli, grantga emas.

- 17 tasida ham `min_gpa`/`min_ielts` NULL qilindi; yalang'och shablon `english_requirements` ("IELTS 6.5 or equivalent...") dastur-darajasi matni bilan almashtirildi (736/763 kabi allaqachon to'g'ri yozilganlariga tegilmadi).
- Yon jadvalda: 12 ta qatordagi "Typical academic profile: GPA X+, IELTS Y+." shablon jumlasi regex bilan olib tashlandi; 485 (ProTalent) dagi muqobil shakl ("GPA 3.3+, IELTS 6.5+") alohida qayta yozildi; 4 ta qator (350, 483, 484, 499) allaqachon toza edi.
- 17 ta havola (434–450) federal manbaga qo'shildi. Reliability va `last_verified_at` o'zgartirilmadi — har bir universitetning o'z chaqiruvi bugun qayta o'qilmadi.

## 2) USD konversiyalri (5 yozuv)

`amount_usd_value` e'lon qilinmagan konversiya saqlagan 5 ta yozuv tozalandi (→ 0, mahalliy valyutadagi summa saqlanib qoldi): 570 LMU (300 EUR → "300 USD" ko'chirish xatosi), 587 HBKU (108 000 QAR), 656 Qatar Univ. (6 000 QAR), 610 va 908 King Saud (12 000 / 54 000 SAR).

## 3) Faolsiz qatorlar gigiyenasi (166 yozuv)

Pass 128 da qoldirilgan qoldiq: 166 ta faolsiz qatorda status `closed` emas edi (eski davr nafaqalari). Hammasi tekshirildi: ularning barchasida nafaqa sababi hujjatlangan (Pass 128 da sababsiz faolsizlar nolga tushirilgan edi). Bu passda `application_status='closed'` + saqlangan `deadline_date` tozalandi va qisqa gigiyena izohi qo'shildi. "To'xtatilgan/kelgusida chaqiruv bo'lsa qayta yoziladigan" qatorlar (mas. 704 UCT) mazmunan o'zgarishsiz — jonlantirish baribir qayta yozish passini talab qiladi.

## Natija (qattiq tekshiruv)

- Hisoblagichlar o'zgarmadi: **544 faol / 205 nafaqada / 1 rel-4 (876) / 205 kelajak-muddat**; maks ID 1001/3158/718/450.
- Nishon-o'lchovlar: faolsiz `closed` emas **166 → 0**; rel ≤8 minimumli yozuvlar **94 → 83**; USD-konversiya shubhalilari **5 → 0**; oilada shablon qoldig'i **0**.
- Qolgan 83 ta rel ≤8 minimum boshqa oilalar bo'yicha keyingi passlarda (masalan, AQSh need-based aid klasteri — Brown "IELTS 8" kabi) xuddi shu usulda, oila bo'yicha bitta rasmiy manbaa bilan tozalanadi. Bulk-NULL qilinmaydi: ayrim minimumlar haqiqiy bo'lishi mumkin (mas. 603 MIS).
- Mahalliy tekshiruvlar: typecheck ✓, check:i18n ✓, render 337/337 ✓.

Keyingi qadam: **Enrichment Batch 36**. Kuzatuvlar o'zgarmadi (421 — noyabr oxiri; 990 — 2026-11-27 dan keyin; CTU/UM/GT-IF/SINGA zondlari).
