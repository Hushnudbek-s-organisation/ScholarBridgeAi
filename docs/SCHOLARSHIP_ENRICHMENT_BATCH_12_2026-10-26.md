# Stipendiyalar boyitilishi — Batch 12 (SNU SPF, SNU GSFS, POSTECH POSTECH Ruth L. Satter)

**Sana:** 2026-10-26 · **Branch:** `arena/a496ffaa-scholarbridgeai` · **PR:** #103

Pass 105 dan keyin navbat qo'shimchalarga keladi. Batch 12 da o'sha o'tishda pensionatsiya qilingan 135-yozuv («SNU Global Scholarship and President Fellowship» — ikki sxemani aralashtirgan kompozit) ortidagi **haqiqiy** sxemalar, har biri alohida tekshirilib, katalogga mustaqil yozuvlar sifatida qo'shildi, shuningdek 453-yozuvni tekshirishda ko'rilgan POSTECH sxemasi qo'shildi. **3 ta yangi stipendiya (949–951).**

## Qo'shilganlar

| ID | Sxema | rel | Asosiy shartlari |
|---|---|---|---|
| 949 | **SNU President Fellowship (SPF)** | 10 | Rivojlanayotgan mamlakatlar universitetlari o'qituvchilari (PhD yo'q) uchun: SNUda PhDga qabul + to'liq kontrakt (6 sem), oyiga 1 500 000–2 000 000 KRW (3–4 yil), aviachipta, kechki koreys tili, tibbiy sug'urta. Taxminan 8 o'rin/semestr, 2014 yildan beri |
| 950 | **Graduate Scholarship for Excellent Foreign Students (GSFS)** | 9 | Sharq/Janubi-sharq/Markaziy Osiyo bitiruvchilari (Xitoy/Yaponiya kirmaydi; **O'zbekiston kiritilgan**): to'liq kontrakt (4 sem) + kamida 500 000 KRW/oy, takrorlash GPA ≥3.0 bilan. ~20 o'rin/semestr |
| 951 | **POSTECH Ruth L. Satter Scholarship** | 9 | POSTECHga yangi qabul qilingan osiyolik qiz magistrant/doktorantlarga: 5 000 000 KRW/yil (magistr 1 yil, doktor 2 yil). Yiliga 3 ta |

## Dalillar

- **SPF:** SNU Office of Global Affairs'ning SPF Program sahifasi (2026-yilgi tasvirlar bilan — jonli) + Admissions'ning «Before Application» sahifasi. Mehmonlik sharti ikkala sahifada birday: rivojlanayotgan davlatdagi yirik universitet o'qituvchisi (PhD yo'q) **va** SNUga PhD talaba sifatida yangi qabul qilingan bo'lish. Ariza qabul arizasidagi belgilash katakchasi orqali boriladi; saralashda suhbat bor. To'lovlar oralig'i (diapazon) bo'lgani uchun `award_basis='range'`, `award_amount` NULL.
- **GSFS:** OGA'ning rasmiy GSFS sahifasi (*Central Asia* — O'zbekiston shu mintaqada), Spring 2026 rasmiy qo'llanma (milliy mezonlar: ariza beruvchi va ikkala ota-onasi koreys emas; barcha ta'lim Koreyadan tashqarida; boy mamlakatlar ro'yxatida bo'lmaganlarga ustunlik — O'zbekiston u ro'yxatda yo'q), Fall 2020 rasmiy qo'llanmada **Uzbekistan** aniq Eligible Countries ro'yxatida. rel 9 sababi: ishtirok etuvchi kafedralar va yashash summasi kollej/majorga qarab har semestr e'lon qilinadi; summa «minimum» deyilgani uchun `award_amount` NULL (variable).
- **Satter:** POSTECH moliyaviy yordam sahifasidagi 2026-02-03 holatidagi jadval qatori — rel 9 (yagona, ammo joriy rasmiy manba; alohida ariza raundi yo'q, Student Affairs orqali). Summa bitta aniq raqam bo'lgani uchun `award_amount=5000000 KRW/year/'fixed'`.

## Rad etilganlar (qo'shilmadi)

- **POSCO Global Scholarship (POSTECH):** fond tomonidan belgilanadigan fuqaroliklarga cheklangan; O'zbekistonning kiritilganini rasmiy manbadan tasdiqlay olmadik — shuning uchun qo'shilmadi. Rasmiy ro'yxatda tasdiq topilsa, keyinroq qayta ko'rilishi mumkin.
- **K-GKS (Gyeongsangbuk-do):** bitirgandan keyin 3 yil o'sha provinsiyada yashash sharti va GKS bilan kesishuvi tufayli bu batch doirasidan tashqarida qoldirildi (GKS 843-yozuvda to'liq bor).

## Metodik eslatmalar

- Yangi idlar `RETURNING` bilan aniqlangan: **949=SPF, 950=GSFS, 951=Satter** (948 sequence tomonidan o'tkazib yuborilgan — yozuvlar ketma-ketligi buzilmagan). Manbalar: **3088** (OGA SPF sahifasi), **3089** (OGA GSFS sahifasi); Satter mavjud **2594** (POSTECH sahifasi) manbasiga bog'landi. Universitet qatorlari: **679** (SNU/SPF), **680** (SNU/GSFS), **681** (POSTECH/Satter).
- Uydirma deadline kiritilmadi — uchchala sxema qabul bilan bog'liq: `deadline_date` NULL + `not_published`, tartib `rounds`da.
- Mahalliy git snapshat 40 ta hujjat faylini untracked holga qaytargani aniqlandi; ularning remote bilan bayt-bayt birxilligi tekshirilib, lokal branch remote'ga (`ca3ad6b`) tenglashtirildi — ma'lumot yo'qolgan emas.

## Sanovchilar (DBdan qayta o'qilgan)

| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol stipendiyalar | 532 | **535** |
| Pensionatsiya qilingan | 164 | **164** |
| Faol reliability-4 yozuvlar | 61 | **61** |
| Kelajakdagi deadline'lar | 169 | **169** |

Lokal tekshiruvlar: `typecheck` ✅ · `check:i18n` ✅ · `test:render` ✅ 337/337.

## Keyingi qadamlar

1. **Pass 106 (tozalash):** Shveysariya reliability-4 klasteri (6 yozuv). Keyin Yangi Zelandiya (5).
2. **Batch 13 nomzodlari:** Hanyangning *Engineering & Science Students* (50%) va *Excellence in Language Proficiency* (30%, birinchi semestr) stipendiyalari — 2024 qo'llanmasida birinchi qo'ldan o'qilgan; POSCO Global — agar rasmiy ro'yxat topilsa.
3. Texnik qarzlar: SMU yozuvi + 396 bog'lash; Adelaide/Flinders; 31/849, 44/554 dubl tekshiruvlar.
