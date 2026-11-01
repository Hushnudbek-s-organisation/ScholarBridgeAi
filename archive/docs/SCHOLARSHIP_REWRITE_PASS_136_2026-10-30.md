# Rewrite Pass 136 — India IIT fellowship oilasi: shablon minimumlar tozalandi

**Sana:** 2026-10-30
**Turi:** Cleanup pass (Batch 42 dan keyin navbat bo'yicha)
**Natija:** **548 active / 206 retired / 1 rel-≤4 / 208 future-dated** (o'zgarmadi); minlow (rel≤8, strukturlangan minimum) **44 → 40**. O'zgargan yozuvlar: scholarships 595, 597, 598, 599; sources 3192–3194; links 492–494; university_scholarships 169, 288, 293 (lv).

## Pass mantiqi

India oilasi (IIT Kanpur 595, IIT Madras 597, IIT Bombay 598, IIT Delhi 599) import-shablon minimumlari (3.0/3.0/3.3/3.3 + IELTS 6.5) bilan saqlandan edi — lekin bu to'rtta yozuvning o'zi 2026-10-25 da institutlarning o'z sahifalaridan chuqur qayta yozilgan va matnlarning birortasida GPA poli yoki IELTS chegarasi yo'q; ustiga-ustak `english_requirements` maydonlari allaqachon to'g'ri yozilgan ("sets no separate English score") — ya'ni strukturlangan minimumlar yozuvlarning **o'z matniga zid** qoldiqlar edi. South Korea oilasi (583, 611, 794, 858) baholanib, keyingi passga qoldirildi: 583 NIIED qoidalariga, 858 esa o'z verified matni ichidagi qabul-ingliz darajalariga bog'liq — har biri alohida ehtiyotkorlik talab qiladi.

## Birinchi qo'ldan o'qilgan uchlik (manba + lv)

| Source | Sahifa | Xulosa |
|---|---|---|
| **3192** | iitk.ac.in/oir — How to Apply | Qabul kategoriyalari tasdiqlandi (ICCR, Study in India, AARDO, ASEAN, India-Bhutan, Institute Fellowship); PRAGATII USD 3,200 gacha; GPA/IELTS chop etilmagan |
| **3193** | ge.iitm.ac.in — M.Tech International Admissions | Eligibility — daraja turiga ko'ra; sxemalar faqat nomlangan (ICCR + IIT-M GE), GE qiymati/shartlari hamon e'lon qilinmagan → rel 7 saqlandi |
| **3194** | acad.iitb.ac.in — Doctoral categories | TA ₹37,000/42,000, FRN-SF — assistantshipsiz; broshura stavkasi ziddiyati yozuvda avvalgidek flaglangan; kirish GPA/IELTS yo'q |

## Own-text bitta

**599 (IIT Delhi):** saqlangan sahifa (`international.iitd.ac.in`) bugun fetch bo'lmadi. O'z verified matni (2026-10-25) yetarli: TA — admission oqibati, GATE/JAM/CEED chet elliklar uchun bekor qilingan, ingliz tili alohida ball talab qilmaydi. Minimumlar kesildi; manba uydirilmadi, `last_verified_at` oshirilmadi.

## O'zgarishlar xulosasi

- To'rttala yozuvda **min_gpa/min_ielts → NULL**; `english_requirements` o'zgartirilmadi (allaqachon halol matn).
- Yon yozuvlarda shablon satrlari yo'q edi — fetch qilingan uchlikning yon yozuvlari (293, 288, 169) faqat lv-sinxronlandi; 599 ning yon yozuvi tegilmadi.
- Summalar (₹ stavkalari), deadline'lar, statuslar o'zgartirilmadi. Eslatma: 595 ning saqlangan deadline'i 2026-11-03 — cycle sanasi yozuv matnida ham shu; keyingi sikl sanasi e'lon qilinganda yangilanadi (ushbu pass doirasidan tashqari).

## Tekshiruvlar

- Hard-check: **548/206/1/208** (o'zgarmadi), minlow **44 → 40**; PASS 136 izi 4 yozuvda; strukturlangan minimum qoldig'i 0; links 492–494.
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337**.
- Yozuvlar qat'iy ketma-ket; URL mavjudligi mintlashdan oldin tekshirildi (Pass-135 darsi).

## Replay

`supabase/scholarship_rewrite_pass136_2026-10-30.sql` (sources 3192–3194, links 492–494, to'rt update, yon-yozuv lv, setval).

## Keyingi qadamlar

- **Batch 43** (qo'shimcha navbati): birinchi-qo'l o'qiladigan kandidatlardan.
- Minima navbati (40): South Korea (4) — Pass 137 da, 583 (NIIED GPA qoidalari) va 858 (chop etilgan qabul-ingliz darajalari) alohida ko'rib chiqiladi; Canada/France/Netherlands/New Zealand (3 tadan).
- Kuzatuvlar: **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU jonlansa; **723** Arizona xalqaro Terms bo'limi e'lon qilinsa; **556/694/699** sahifalar to'g'ridan-to'g'ri o'qilsa; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa; USMCARE faqat ochiq raund bilan.
