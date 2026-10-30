# Rewrite Pass 135 — Hong Kong kirish stipendiyalari oilasi: shablon minimumlar tozalandi

**Sana:** 2026-10-30
**Turi:** Cleanup pass (Batch 41 dan keyin navbat bo'yicha)
**Natija:** **547 active / 206 retired / 1 rel-≤4 / 207 future-dated** (o'zgarmadi); minlow (rel≤8, strukturlangan minimum) **48 → 44**. O'zgargan yozuvlar: scholarships 556, 560, 591, 651; sources 3188, 3189 (CUHK 2479 va HKU 2483 2026-10-23 dan mavjud edi); links 486–489; university_scholarships 20, 32, 61, 70.

## Pass mantiqi

Hong Kong oilasi (4 yozuv: CityUHK 556, CUHK 560, HKU 591, PolyU 651) import-shablon GPA/IELTS qiymatlari (3.6/6.5, 3.6/7.0, 3.85/7.0, 3.6/6.5) va "IELTS x or equivalent English test" satrlari bilan saqlanib qolgan edi. Hong Kongdagi kirish stipendiyalari HKDSE/IB/A-level/Gaokao kabi kvalifikatsiyalarga bog'langan; bugun o'qilgan to'rttala rasmiy sahifaning birortasida AQSh-shkalasi GPA yoki yagona IELTS chegarasi e'lon qilinmagan.

## Birinchi qo'ldan o'qilgan sahifalar

| Sxema | Sahifa | Xulosa |
|---|---|---|
| **556 CityU** | cityu.edu.hk/admo — Entrance Scholarship (source **3188**, yangi) | Uch avtomatik daraja (Top + HKD 60k gacha yashash nafaqasi, Full, Half); ariza yo'q; renewal uchun har yili minimal CGPA. Eslatma: yangilangan sahifada 3.2 renewal raqami chop etilmagan (saqlangan matndagi raqam 2026-10-23 oldingi sahifa o'qishidan — ochiq qayd etildi). Eski `/international/` URL umumiy admissions sahifasiga yo'nalgani uchun `source_url`/`website_url` o'qilgan sahifaga ko'chirildi |
| **560 CUHK** | admission.cuhk.edu.hk — Admission Scholarships (source **2479**, mavjud) | Saqlangan shartlar to'liq tasdiqlandi: HK$5,000 → to'liq to'lov, renewal progress bilan, HK$66,000 gacha nafaqa, HKSAR HK$80,000 (non-local), non-academic HK$50k–214k; cutoff yo'q |
| **591 HKU** | admissions.hku.hk — Scholarships finder (source **2483**, mavjud) | Hamonto'rtta 43 ta sxema non-local talaba uchun qaytariladi; non-local ta'rifi yozuvdagidek; 43 sxemalik katalogda yagona cutoff bo'lishi mumkin emas |
| **651 PolyU** | polyu.edu.hk/study — Undergraduate Scholarships (source **3189**, yangi) | Arizasiz merit ko'rib chiqish + "tuition + HK$60,000" ushlash chegarasi tasdiqlandi. Eski URL fetch bo'lmagani uchun URLlar o'qilgan sahifaga ko'chirildi. **Flag:** listingda Cultural Ambassador "HK$60,000/yil gacha", yozuvda 2026-10-23 bo'yicha HK$50,000 — summa ushbu passda o'zgartirilmadi, sxemaning o'z sahifasida tekshirish kerak |

## O'zgarishlar xulosasi

- To'rttala yozuvda **min_gpa/min_ielts → NULL**; `english_requirements` — "No fixed IELTS score is published for this scholarship; applicants must meet the university's undergraduate admission English language requirement for their qualification…" formulasi.
- To'rttalasida ham `last_verified_at` yangilandi (to'rttala sxema birinchi qo'ldan o'qildi; CUHK/HKU manbalari oldindan bazada bo'lgani uchun yangi manba faqat CityU va PolyU sahifalariga yaratildi — birinchi qo'shma insert URL-uniqueness xatosi bilan rad etilib, holat tekshirilgach bo'linib yuborildi).
- Yon yozuvlardan (us 61, 32, 20, 70) "Typical academic profile…" shablon jumlasi kesildi (qoldiq 0); **us 20** nomi eskicha qolgan "HKU Foundation Scholarship" dan yozuv sarlavhasiga sinxronlandi (bitta fond butun katalog sifatida ko'rinishini to'xtatish uchun).
- Summalar, deadline'lar, statuslar o'zgartirilmadi.

## Tekshiruvlar

- Hard-check: **547/206/1/207** (o'zgarmadi), minlow **48 → 44**; PASS 135 izi 4 yozuvda; strukturlangan minimum qoldig'i 0; yon-yozuv shablon qoldig'i 0.
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337**.
- Yozuvlar qat'iy ketma-ket; xato holatida state-check intizomi saqlandi (23505 → tekshiruv → bo'lib yuborish).

## Replay

`supabase/scholarship_rewrite_pass135_2026-10-30.sql` (sources 3188–3189, links 486–489, to'rt update, yon-yozuv strip + nom sinxroni, setval).

## Keyingi qadamlar

- **Batch 42** (qo'shimcha navbati): Pass-135 flaglari qulay boshlang'ich nuqtalar — PolyU Cultural Ambassador summasi sxema sahifasidan birinchi qo'ldan tekshirilsa (HK$60k), CityU renewal CGPA raqami joriy sahifada topilsa; aks holda boshqa birinchi-qo'l kandidat.
- Minima navbati (44): India (4), South Korea (4), Canada/France/Netherlands/New Zealand (3 tadan).
- Kuzatuvlar o'zgarmadi: **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU jonlansa; **723** Arizona xalqaro Terms bo'limi e'lon qilinsa; **694/699** devorlar ochilsa; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa; USMCARE faqat ochiq raund birinchi qo'ldan o'qilsa.
