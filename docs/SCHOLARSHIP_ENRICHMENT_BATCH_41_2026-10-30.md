# Enrichment Batch 41 — Pass 134 ochiq savollarini yopish: UC Davis 694 rel 8→9, UT Austin 682 derazalari, Arizona 723 summa konvensiyasi

**Sana:** 2026-10-30
**Turi:** Enrichment Batch (Pass 134 dan keyingi davomiylik)
**Natija:** **547 active / 206 retired / 1 rel-≤4 / 207 future-dated** (o'zgarmadi); minlow **48 → 48**. O'zgarganlar: scholarships 682, 694, 723; source 3187; link 485.

## Batch mantiqi

Pass 134 AQSh oilasidagi minimumlarni tozaladi, lekin uch yozuvda ochiq tekshiruv bo'shliqlari qolgandi: 694 ning xalqaro eligibility savoli, 682 ning to'liq bo'lmagan deadline tasviri, 723 ning `award_amount='0'` placeholderi. Ushbu batch shu uchtasini yopadi (yangi yozuv qo'shilmadi — qo'shimcha bu safar ishonchlilikni oshirish shaklida).

## 694 (UC Davis Regents) — rel 8 → 9

- **Yangi birinchi qo'l dalil (source 3187):** UC Davis Financial Aid ofisining xalqaro talabalar sahifasi bugun o'qildi — unda xalqaro talabalar stipendiyalarga ega bo'lishi mumkinligi aytilib, ular "Undergraduate and Prestigious Scholarships" bo'limiga yo'naltiriladi; Regents shu bo'limda turadi va uning sahifalarida (source 3184) citizenship/residency sharti yo'q.
- **Nega 10 emas:** admissions ofisining Regents sahifasi hanuz o'qilib bo'lmaydi (`admissions.ucdavis.edu/finances/regents-scholarship` — 403; eski `.cfm` manzil MyAdmissions loginiga yo'naltiradi). Award-specific eligibility bayonotini tekshirib bo'lmagani uchun tavsif va talablar aynan shu chegarani aytadigan qilib toraytirildi; "ofisdan tasdiqlang" maslahati saqlandi. Bu 776 (B39) precedentiga mos: shartlar tekshirilgan, bitta element o'qiladigan sahifada tasdiqlanmagan → 9.
- Shartlar (USD 7,500, renewal 3.25, 2-dekabr UC arizasi) o'zgarmadi.

## 682 (UT Austin) — deadline derazalari to'ldirildi

Saqlangan matn faqat 2027-yil 1-mart sanasini va fevral–mart derazasini aytardi; ayni paytda jonli bo'lgan **1-oktabr – 1-noyabr 2026 (Spring/Summer 2027)** derazasi tushib qolgandi. Pass 134 da birinchi qo'ldan o'qilgan ISSS sahifasi (source 3185) asosida: deadline matni to'ldirildi, `expected_opening_period`/`expected_deadline_period` strukturlab yozildi (yiliga ikki LASSO derazasi). `deadline_date` 2027-03-01 sifatida qoldi; `last_verified_at` oshirilmadi — dalil bazasi bugungi o'sha o'qishning o'zi.

## 723 (Arizona Global Wildcat) — summa konvensiyasi to'g'rilandi

`award_amount='0'` placeholder → **NULL** (variable-basis kodlash, 774 precedenta mos): yozuv endi foydalanuvchiga "$0 mukofot" ko'rsatmaydi — bu yozuvning o'z pozitsiyasiga ham zid edi ("not published rather than guessed", 2026-10-23). 2026-2027 Terms sahifasidan birinchi qo'ldan o'qilgan bo'limlar (Pass 134 + ushbu batch) birinchi-kurs merit renewal standartlarini (3.00 GPA, 30/60/90 unit) tasdiqladi, lekin Global Wildcat bo'limining o'zi sahifada topilmadi — sahifa sarlavhasida "Terms & conditions for additional scholarships will be added soon" deyilgan (xalqaro bo'lim hali e'lon qilinmagan); chart sahifasi "Access Denied" qaytaradi. Shu sababli manba yaratilmadi, agregator band-summalari ($4,000–$23,000 atrofida) kodlanmadi, `last_verified_at` oshirilmadi.

## 699 (UCLA Regents) — o'zgarishsiz

`financialaid.ucla.edu` hanuz 403. Agregatorlar xalqaro eligibility bo'yicha bir-biriga zid (biri "asosiy variant", boshqasi "faqat fuqarolar") — hech biri kodlanmadi; yozuv Pass 134 holatida qoladi (minimumlar kesilgan, 403 devori qayd etilgan).

## Tekshiruvlar

- Hard-check: **547/206/1/207**, minlow 48; 694 rel=9, yangi matn fragmentlari joyida (REPLACE ikkala maydonda yerga tushgan — so'rov bilan tekshirildi); 723 `award_amount` NULL/variable; 682 expected ustunlar to'ldirilgan; BATCH 41 izi 3 yozuvda aynan bir martadan.
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337**.
- Yozuvlar ketma-ket (pool-darsi); notes-qo'shimchalar `NOT LIKE '%BATCH 41%'` qo'riqli.

## Replay

`supabase/scholarship_enrichment_batch41_2026-10-30.sql` (source 3187, link 485, uch update, setval).

## Keyingi qadamlar

- **Pass 135:** minima navbati (48) — Hong Kong/India/South Korea (har biri 4) oilalaridan biri.
- Kuzatuvlar o'zgarmadi: **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU qayta jonlansa; **723** — Arizona xalqaro Terms bo'limi e'lon qilinganda (band jadvallarini o'shanda narrative ga kiritib, manba + lv); **694/699** — admissions/financialaid devorlari ochilsa rel 10 nomzodi; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa.
