# Rewrite Pass 134 — AQSh merit oilasi: shablon minimumlar tozalandi (renewal GPAlar kirish minimumi sifatida saqlangani tuzatildi)

**Sana:** 2026-10-30
**Turi:** Cleanup pass (Batch 40 dan keyin navbat bo'yicha)
**Natija:** **547 active / 206 retired / 1 rel-≤4 / 207 future-dated** (o'zgarmadi); minlow (rel≤8, strukturlangan minimum) **53 → 48**. O'zgargan yozuvlar: scholarships 682, 694, 699, 723, 764; sources 3184–3186; links 482–484; university_scholarships 49, 77, 101, 260, 264.

## Pass mantiqi

Rel≤8 strukturlangan-minimum navbatidagi eng katta oila — **AQSh (5 yozuv)**: 682 (UT Austin Texas Exes/ISSS), 694 (UC Davis Regents), 699 (UCLA Regents), 723 (Arizona Global Wildcat), 764 (Jefferson Scholarship). Besh yozuv import-shablon GPA/IELTS qiymatlari bilan saqlanib qolgan (3.6/6.5, 3.25/–, 3.6/7.5, 3.0/6.5, 3.0/7.0). Muhim topilma: **694 ning 3.25 va 723 ning 3.00 kirish minimumi emas — bu mukofotni davom ettirish (renewal) shartlari**; ular strukturlangan kirish minimumi sifatida abituriyentni chalg'itardi.

## Birinchi qo'ldan tekshirilgan uchlik (manba yaratilib, last_verified yangilandi)

| Source | Sahifa | Xulosa |
|---|---|---|
| **3184** | financialaid.ucdavis.edu — Regents Scholarship | USD 7,500/yil; 3.25 GPA — **renewal** sharti ("renewable as long as the student maintains a 3.25 GPA"); UC arizasi 2-dekabrgacha; kirish GPA/IELTS yo'q. Xalqaro eligibility hamon e'lon qilinmagan → rel 8 saqlandi |
| **3185** | global.utexas.edu — ISSS Scholarships (4/4 chunk o'qildi) | Har bir nomlangan mukofot o'z shartiga ega (GPA 2.0 / 3.0 / 3.25 pollar, need, soha, hudud shartlari); LASSO derazalari tasdiqlandi: Spring/Summer 2027 — 2026-yil 1-oktabr–1-noyabr; Fall 2027 — 2027-yil 1-fevral–1-mart. Yagona cutoff yo'q |
| **3186** | jeffersonscholars.org — Undergraduate Scholarships | Faqat maktab nominatsiyasi (2025-26: 7,697 maktab, 85 region); non-Virginianlar USD 83,000+/yil (jami 405,000+); GPA/IELTS cutoff e'lon qilinmagan |

## Own-text ikkilik (manba yaratilmadi, last_verified oshirilmadi)

- **699 (UCLA Regents):** saqlangan URL hozirda 403ga yo'naladi ("scholarships-previous"). Yozuvning o'z verified matni (2026-10-23) yetarli: tanlov admission ichida, ochiq ariza yo'q, e'lon qilingan yagona GPA — **3.0 renewal** sharti. Shablon 3.6/7.5 kesildi; 403 sahifaga manba uydirilmadi.
- **723 (Arizona Global Wildcat):** o'z verified matniga ko'ra 3.00 — **8 semestr renewal** sharti; kirish summalari GPA-band jadvalidan (test ballari bilan birga) — yagona strukturlangan cutoff buni buzib ko'rsatardi. Joriy 2026-2027 Terms sahifasidan birinchi qo'ldan o'qilgan bo'limlar 1-noyabr Early Action priority sanasini tasdiqladi, lekin Global Wildcat bo'limining o'zi qayta o'qilmadi → manba yo'q, lv yo'q. (Izlanish snippetlari — jumladan agregator band-jadvallari — orientatsiya sifatida qoldi, kodlanmadi.)

## O'zgarishlar xulosasi

- Besh yozuvda **min_gpa/min_ielts → NULL**; 682/699/723/764 da `english_requirements` "No scholarship-specific English score is published; …admission English proficiency requirement applies" formulasiga o'tkazildi (694 da shu mazmun allaqachon bor edi).
- Yon yozuvlarda (us 77, 49, 260, 264) "Typical academic profile: GPA …, IELTS …, SAT …+." shablon jumlasi regex bilan kesildi (qoldiq 0); us 101 matni to'g'ri bo'lgani uchun faqat lv sinxronlandi.
- Summalar, deadline'lar, statuslar o'zgartirilmadi — bu faqat minimum tozalash passi. Alohida kuzatuv (ushbu passdan tashqari): 723 da `award_amount='0'`/variable konvensiya siljishi mavjud; kelgusida tekshirilsa yaxshi.

## Tekshiruvlar

- Hard-check: **547/206/1/207** (o'zgarmadi), minlow **53 → 48**; besh yozuvda PASS 134 izi aynan bir martadan; strukturlangan minimum qoldig'i 0; yon-yozuv shablon qoldig'i 0.
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337**.
- Yozuvlar qat'iy ketma-ket bajarildi (pool-darsi); barcha notes-qo'shimchalar `NOT LIKE '%PASS 134%'` qo'riqli.

## Replay

`supabase/scholarship_rewrite_pass134_2026-10-30.sql` — jonli yozuvlar aynan ko'chirilgan (sources 3184–3186, links 482–484, besh update, yon-yozuv strip, setval).

## Keyingi qadamlar

- **Batch 41** (qo'shimcha navbati): kandidatlarni birinchi qo'ldan o'qish asosida tanlash (avvalgi kuzatuvlar: 421 noyabr oxiri, 990 2026-11-27 dan keyin, 876/875 CTU jonlansa, USMCARE faqat ochiq raund bilan).
- Minima navbati (48): Hong Kong/India/South Korea (har biri 4), Canada/France/Netherlands/New Zealand (har biri 3). Eslatma: 603/811 (Malaysia) navbatda qoladi, chunki ular rel 8 bilan **tasdiqlangan** minimumlar (3.0 / 3.7) — ularni kesish kerak emas.
