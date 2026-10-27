# Stipendiyalarni tozalash — 106-o'tish (Shveysariya klasteri)

**Sana:** 2026-10-27 · **Branch:** `arena/a496ffaa-scholarbridgeai` · **PR:** #103

Shveysariyadagi 6 ta «reliability 4» yozuv tekshirildi. Barcha 6 ta saqlangan URL 404/xato qaytardi — sxemalar rasmiy domenlarda qayta topilib, joriy sahifalar o'qildi. Natija: **4 ta rewrite** (hammasi reliability 10) va **2 ta pensionatsiya**. Ikki yozuvda jonli, kelajakdagi deadline topildi: UNIL 2027/28 raundi **1-noyabr 2026**gacha ochiq, EPFL esa **15-dekabr 2026**.

## Qarorlar xulosasi

| ID | Eski yozuv | Qaror | Yangi holat |
|---|---|---|---|
| 130 | EPFL Excellence Fellowships and Doctoral Assistantships | **Rewrite (rel 10)** | *EPFL Excellence Fellowships (Master's)* — 10 000 CHF/semestr (maks. 4), **deadline 15-dekabr 2026, ochiq** |
| 331 | UZH Candoc Doctoral Grant and Fellowship | **Rewrite (rel 10)** | *UZH Candoc Grant* — o'z maoshi (80% bandlik, 50 404–53 618 CHF/yil) + material 10 000 gacha; yillik fevral chaqiruvi |
| 341 | University of Geneva Excellence Master Fellowships | **Rewrite (rel 10)** | Fan fakulteti MSc uchun 10 000–15 000 CHF/yil, o'qitish majburiyatisiz; yanvar–fevral yillik aylanish |
| 409 | UNIL Master Grants for Foreign Students | **Rewrite (rel 10)** | *UNIL Master's Scholarship* — 1 600 CHF/oy + to'lovlardan ozod (80 CHF qoladi); **2027/28 raund ochiq — deadline 1-noyabr 2026 (!)** |
| 407 | University of Basel PhD Fellowships | **Pensionatsiya** | Bunday nomli sxema yo'q: sahifa moliyalashtirish yo'llari katalogi (SNSF loyiha/lavozimlar) |
| 408 | University of Bern Doctoral Grants | **Pensionatsiya** | Bunday nomli sxema yo'q: lavozimlar/SNSF + kichik ichki grantlar sharhi |

## Dalillar (birinchi qo'ldan o'qilgan)

- **130** — EPFLning joriy *Master excellence fellowships* sahifasi + *Application & deadlines* ostsahifasi: 10 000 CHF/semestr, maks. 4 semestr, tashqi nomzodlarga yotoqxona bandi, kontrakt to'lanmaydi (talaba o'zi to'laydi), 2027-sikldan yangi yagona deadline 15-dekabr, yangilash 50 ECTS + 5.0/6. Eski sarlavhadagi «Doctoral Assistantships» — maoshli ish, stipendiya emas, shuning uchun yozuv magistrlik sxemasiga toraytirildi (saqlangan URL ham magistrlik sahifasi edi), `degree_levels` PhD→Master's tuzatildi.
- **331** — UZH Candoc sahifasi + 2026 rasmiy qo'llanma (PDF): yillik chaqiruv (keyingisi fevral 2027), UZHga yozilish yoki rahbarning bog'lovchi roziligi, 80% bandlikdagi maosh klasslari, muddat 12 oy (Ijtimoiy fanlarda 24), material ≤10 000 CHF.
- **341** — UNIGE Fan fakultetining *Excellence Master Fellowships* sahifasi: 10 000–15 000 CHF/yil diapazoni, 1 yil + muvaffaqiyatda 3–4 semestrgacha uzayish, 8 ta fan yo'nalishi, bitta PDF ariza. Oxirgi e'lon qilingan deadline (28-fevral 2026) o'tib ketgani va yangisi hali chiqmagani uchun sana ixtiro qilinmadi — naqsh `rounds`da.
- **409** — UNILning *Master's Scholarship* sahifasi (2 chunk): shartlar, istisno dasturlar, C1 til darajasi, 200 CHF to'lov, saralash kalendari va ochiq 2027/28 raund («The deadline is 1 November 2026»). Agregatorlardagi «~10 grant/yil» soni sahifaning o'qilgan qismlarida uchrashmagani uchun yozilmadi.
- **407/408** — Basel *Doctoral Candidates* va Bern *UniBE Funding Schemes* jonli sahifalari o'qildi: ikkalasi ham katalog/sharh — mos keladigan yagona nomli stipendiya mavjud emas.

## Metodik eslatmalar

- EPFL summani semestrda beradi; bazada `award_period='semester'` qiymati umuman yo'qligi (DISTINCT tekshirildi) sababli 20 000 CHF/yil (fixed) saqlandi — asl «10 000/semestr» matnda yozilgan.
- UZH (maosh klasslari) va UNIGE (10–15 ming diapazoni)da `award_amount` NULL (variable/range) — yolg'iz «o'rtacha» raqam uydirilmadi.
- Yon jadvallar: `sources` 2516/2692/2667/2664/2665/2668 (barchasi exclusive; yangi URLlar collision'ga tekshirilgan — 0), `university_scholarships` 532/578/659/622 verified, 619/126 withdrawn.

## Sanovchilar (DBdan qayta o'qilgan)

| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol stipendiyalar | 535 | **533** |
| Pensionatsiya qilingan | 164 | **166** |
| Faol reliability-4 yozuvlar | 61 | **55** |
| Shveysariya reliability-4 | 6 | **0** |
| Kelajakdagi deadline'lar | 169 | **171** |

Lokal tekshiruvlar: `typecheck` ✅ · `check:i18n` ✅ · `test:render` ✅ 337/337.

## Keyingi qadamlar

1. **Batch 13 (qo'shimchalar):** Hanyang *Engineering & Science Students* (50%) va *Excellence in Language Proficiency* (30%, 1-semestr); imkon bo'lsa **ETH ESOP**ni bor-yo'gini tekshirish (katalogda bo'lmasa, qo'shish — 2026-yil 1–30-noyabr qabul darchasi yaqin).
2. **Pass 107 (tozalash):** Yangi Zelandiya klasteri (5 yozuv).
3. Texnik qarzlar: SMU yozuvi + 396; Adelaide/Flinders; 31/849, 44/554 dubllar.
