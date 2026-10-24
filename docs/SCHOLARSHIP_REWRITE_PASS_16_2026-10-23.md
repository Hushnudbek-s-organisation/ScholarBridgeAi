# Grant yozuvlarini qayta yozish — 16-pass (2026-10-23)

Türkiye klasteri **tugatildi**. Qolgan 6 ta qatordan 3 tasi haqiqiy grantga almashtirildi, 3 tasi bekor qilindi — har biri universitetning o'z sahifasidagi so'z bilan.

SQL: [`supabase/scholarship_rewrite_pass16_2026-10-23.sql`](../supabase/scholarship_rewrite_pass16_2026-10-23.sql)

---

## 1. Topilgan xatolar

| Yozuv | Bazada turgan | Rasmiy manba |
|---|---|---|
| **623 METU** | "Türkiye Bursları & METU International Merit Tuition Waiver", 3 daraja | METU **Senat qarori (2022-04-26)**: xalqaro bakalavrlar uchun **chegirma** (semestr kontraktining 50%) yoki **exemption** (to'liq). Jami **10%** talabaga. Yangi talaba **arizadagi imtihon hujjatlari** bo'yicha baholanadi, alohida forma yo'q. |
| **828 İTÜ** | "Türkiye Bursları & **İTÜ Success Scholarship**" | İTÜ "Success Scholarship" **YKS reytingi** asosida (turk abituriyentlar uchun). Xalqaro talabaga universitetning kirish granti **yo'q**. Mavjud bo'lgani — **İTÜ Vakfı** stipendiyasi: TRY 500/oy × 9 oy. |
| **837 Ankara** | "Türkiye Bursları (Turkish Government Scholarship) (Ankara University)" | Ankara Univ. ISO: *"Ankara University does not run a special scholarship program for international students but there is discount on the fees for successful international students"* + oziq-ovqat stipendiyasi. Foiz e'lon qilinmagan. |
| **838 Boğaziçi** | "Türkiye Bursları & **Boğaziçi Foundation Grants**" | Boğaziçi Burs Ofisi: *"Boğaziçi University does not have a particular scholarship program for international students."* → **retired** |
| **814 YTÜ** | "Türkiye Bursları & **YTÜ Success Grants**" | YTÜ Lisansüstü: *"Yıldız Technical University (YTU) does not offer scholarships to international students."* Xalqaro talaba faqat **ovqat** stipendiyasiga ariza bera oladi → **retired** |
| **813 Istanbul Univ.** | "Türkiye Bursları (Turkish Government Scholarship) (Istanbul University)" | Qatorda universitetga oid **hech qanday** ma'lumot yo'q edi — faqat milliy dastur nomi. Universitetning o'z stipendiyalari YKS top-500 yoki turk fuqaroligini talab qiladi → **retired** |

---

## 2. Nima yozildi

### 623 — METU International Undergraduate Tuition Discount / Exemption
- **Ikki pog'ona:** chegirma = semestr kontraktining **50%**; exemption = **100%**.
- **Summa:** 2026–2027 xalqaro bakalavr kontrakti muhandislik/arxitektura/tabiiy fanlarda **USD 1 200/semestr**, ijtimoiy fanlar/iqtisod/ta'limda **USD 800/semestr** → to'liq exemption **USD 2 400/yil**.
- **Cheklov:** bir vaqtda xalqaro bakalavrlarning **10%** dan ko'pi olmaydi; davom etuvchiga CGPA **3.00** (chegirma) / **3.50** (exemption).
- **Muddat:** ariza yo'q — qabul arizasi bilan; 2026–2027 oynasi 1-iyun → 12-iyul 2026, qo'shimcha davra 26–28-avgust.

### 828 — ITU Development Foundation Learning Scholarship (in-study)
- **Summa:** **TRY 500/oy × 9 oy = TRY 4 500/yil** (USD e'lon qilinmagan → `amount_usd_value = 0`).
- **Shart:** İTÜ talabasi bo'lish (oldingi shart), GPA > 2.50, moliyaviy ehtiyoj, intizomiy jazosiz.
- **Halol ogohlantirish:** bu **o'qishga kirgandan keyingi** stipendiya, birinchi kursni moliyalashtira olmaydi.

### 837 — Ankara University International Student Tuition Discount
- **Summa:** universitet **foizni e'lon qilmagan** → `amount_usd_value = 0`, `award_amount = NULL`.
- **Qo'shimcha:** ovqat stipendiyasi mavjud.

### 838 / 814 / 813 — retired
Uchala `university_scholarships` kartochkasi (308, 337, 336) `availability_status = 'No'` ga o'tkazildi; Boğaziçi, YTÜ va Istanbul Univ. sahifalarida **865 — Türkiye Bursları** "bir xil davlat" qoidasi bo'yicha chiqaveradi.

---

## 3. Holat

| Ko'rsatkich | Pass 15 dan keyin | Hozir |
|---|---|---|
| Importer shablonidagi tavsif | 197 | **191** |
| Bosh domen (`website_url`) | 245 | **240** |
| Faol grantlar | 634 | **631** |
| Qayta yozilgan qatorlar | 76 / 634 (12.0%) | **79 / 631 (12.5%)** |
| Grant yo'q universitetlar | 1 | **4** (Hacettepe, Boğaziçi, YTÜ, Istanbul Univ. — hammasi ataylab) |

**Nega "grant yo'q universitet" ko'paydi:** bu to'rttasi o'z sahifasida xalqaro talabaga grant bermasligini aytadi. Ularning sahifalari bo'm-bo'sh qolmaydi — milliy **Türkiye Bursları (865)** va bir xil davlatdagi boshqa grantlar chiqadi. Bo'sh qatorni saqlab qo'yishdan ko'ra rostini yozish afzal.

Tekshiruvlar: `npx tsc --noEmit` ✅ · `npm run check:i18n` ✅ · `npm run test:render` ✅ (337 passed) · 6 ta qatorning qattiq tekshiruvlari ✅.

---

## 4. Türkiye klasteri — yakun

**9 ta qatorning barchasi ko'rib chiqildi:**

| Holat | Qatorlar |
|---|---|
| Qayta yozildi (haqiqiy grant) | 848 UAEU*, 845 NU*, 851 Kyung Hee*, 799 Bilkent, 823 Koç, 826 Sabancı, 623 METU, 828 İTÜ, 837 Ankara |
| Retired | 856 Hacettepe*, 838 Boğaziçi, 814 YTÜ, 813 Istanbul Univ. |

\* — oldingi passlarda.

## 5. Keyingi navbat: Rossiya klasteri (10 qator)

| id | Universitet | Tekshiriladigan narsa |
|---|---|---|
| 543 | Bauman MSTU | Rossotrudnichestvo kvotasi — universitet emas, davlat dasturi (868 da bor) |
| 629 | MSU | MSU o'z olimpiadasi bormi? |
| 807 | RUDN | RUDN Open Olympiad haqiqatan bormi? |
| 812 | HSE | HSE Global Scholarship 25/50/70/100% — rasmiy foizlar |
| 822 | KFU | Tatarstan granti |
| 829 | MIPT Phystech.International | bu haqiqiy loyiha, tekshirish kerak |
| 833 | TSU | kvota |
| 836 | MEPhI | Rosatom kvotasi |
| 840 | NSU | kvota |
| 868 | Rossotrudnichestvo | allaqachon to'g'ri yozilgan (namuna) |
