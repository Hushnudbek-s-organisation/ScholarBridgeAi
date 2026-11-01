# Rewrite Pass 137 — South Korea oilasi: shablon minimumlar tozalandi (har yozuv alohida)

**Sana:** 2026-11-01
**Turi:** Cleanup pass (Batch 43 dan keyin navbat bo'yicha)
**Natija:** **549 active / 206 retired / 1 rel-≤4 / 194 future-dated** (>2026-11-01; o'zgarmadi); minlow (rel≤8, strukturlangan minimum) **40 → 36**. O'zgargan yozuvlar: scholarships 583, 611, 794, 858; sources 3196–3202; links 496–502; university_scholarships 28, 97, 85, 332 (shablon-satr + nom sinxroni + lv).

## Pass mantiqi

South Korea to'rtligi (SNU GKS 583, Korea University GSIS 611, Yonsei UIC 794, GIST 858) PDF-qo'llanma importidan qolgan shablon minimumlar (3.7/3.6/3.6/3.6 + IELTS 7.0/7.0/7.0/6.5 va "IELTS 7.0 / TOEFL 94 / DET 120" triolari) bilan saqlanardi. Pass 136 da bu oila ataylab keyinga qoldirilgan edi, chunki 583 NIIED qoidalariga, 858 esa o'z verified matni ichidagi qabul-ingliz darajalariga bog'liq — ushbu passda ikkalasi ham birinchi qo'ldan o'qilib, har yozuv alohida hal qilindi. Qo'shimcha topilma: to'rtta yon yozuvda ham minimumlar manbai — "Typical academic profile: GPA …+, IELTS …+" shablon satrlari va eskirgan birlashtirilgan nomlar ("GKS & SNU President Fellowship" va h.k.) bor ekan; ular kesib tashlanib, nomlar yozuv sarlavhalariga sinxronlandi (Pass-135 precedenti).

## Birinchi qo'ldan o'qilgan sahifalar

| Source | Sahifa | Xulosa |
|---|---|---|
| **3196** | en.snu.ac.kr — UG scholarships (before application) | GKS shartlari tasdiqlandi (8 semestr, KRW 1,200,000/oy, sentyabr elchixona oynasi); sahifa NIIED / Study in Korea qo'llanmalariga havola qiladi; GPA/IELTS yo'q |
| **3197** | studyinkorea.go.kr — GKS sahifasi (5/5 chunk) | UG mezoni: **kamida 80% cumulative yoki sinf top-20% yoki CGPA chegarasi** — foiz/rank shakli, 4.0-shkalaga uydirib bo'lmaydi → matnda qoldi; ingliz-testi talabi eligibility da yo'q; SNU Type A ro'yxatida |
| **3198** | int.korea.edu — KU GSIS tuition & scholarships | Stored shartlar aniq tasdiqlandi (KRW 7,183,000/sem, 50–100%, BK21); 1-semestr — entrance score; **GPA 4.0+ — davom sharti** (GSIS shkalasi, 9+ kredit, tanaffussiz), kirish minimumi emas |
| **3199** | uic.yonsei.ac.kr — Tuition fee & Scholarship | Avtomatik ko'rib chiqish, "academic credentials" bo'yicha tanlov, renewal — "a certain level of GPA" (raqam yo'q); saqlangan `/main/…m04_03_02` URL endi `admission.php?mid=m04_03` ga yo'naladi → URL'lar ko'chirildi. **Flag:** tuition KRW 8,202,000 **semestriga**, stored summa esa `year` period bilan — alohida amount passda |
| **3200** | gist.ac.kr/iadm — Financial Support | Paket aniq tasdiqlandi; GPA 3.0/4.5 — international allowance ning **davom sharti**; kirish poli yo'q. **Flag:** KRW 3,607,000 semestr to'lovi, stored period `total` |
| **3201** | gist.ac.kr/iadm — Procedure | English: TOEFL iBT 80 / PBT 550, IELTS 6.5, TOEIC 750, **New TEPS 285** + shartli qabul yo'li |
| **3202** | gist.ac.kr/iadm — Admissions | Xuddi shu, lekin **TEPS 600 / New TEPS 327** — institutning o'z ikki sahifasi orasidagi ziddiyat flaglandi, indamay hal qilinmadi (598 precedenti) |

## Qarorlar

- **583:** min_gpa/min_ielts → NULL. GKS akademik mezoni foiz/rank shaklida (≥80% / top-20%) — 4.0-shkala konvertatsiyasi uydirilmaydi; ingliz testi talab qilinmaydi. `english_requirements` halol matnga almashtirildi.
- **611:** ikkalasi ham NULL; GPA 4.0 — davom sharti sifatida matnda (allaqachon shunday edi).
- **794:** ikkalasi ham NULL; holistik qabul; URL'lar o'qilgan sahifaga ko'chirildi; period flagi yozildi.
- **858:** ikkalasi ham NULL. IELTS 6.5 rasmiy raqam bo'lsa-da, talab **ko'p yo'nalishli** (5 test + ozod qilish + shartli qabul) — 603/811 precedentiga ko'ra matnda qoladi, `min_ielts` strukturlanmaydi. `english_requirements` endi beshta rasmiy yo'nalish + New TEPS ziddiyatini ko'rsatadi; uchburchak-shablon ("TOEFL 85 / DET 115") olib tashlandi.
- Yon yozuvlar (28/97/85/332): "Typical academic profile" satrlari regexp bilan kesildi, nomlar sarlavhalarga sinxronlandi, lv oshirildi (to'rttala sahifa fetch qilingani uchun).
- Amount period'lar (794 `year`, 858 `total`) ushbu passda o'zgartirilmadi — 651 precedentidagi kabi flaglangan; summalar/deadline'lar/statuslar tegilmagan.

## Tekshiruvlar

- Hard-check: **549/206/1/194** (o'zgarmadi), minlow **40 → 36**; PASS 137 izi 4 yozuvda; strukturlangan minimum qoldig'i 0; yon-yozuv shablon qoldig'i 0; links 496–502.
- Local: `typecheck`, `check:i18n` (3310 `t()` sayti), `test:render` — **337/337**.
- Yozuvlar qat'iy ketma-ket; URL mavjudligi mintlashdan oldin tekshirildi (Pass-135 darsi).

## Replay

`supabase/scholarship_rewrite_pass137_2026-11-01.sql` (sources 3196–3202, to'rt update, links 496–502, yon-yozuv strip + nom sinxroni, setval).

## Keyingi qadamlar

- **Batch 44** (qo'shimcha navbati): birinchi qo'ldan o'qiladigan kandidatlardan.
- Minima navbati (36): Canada/France/Netherlands/New Zealand (3 tadan), Belgium/China/Ireland/Japan/Saudi/Spain/Turkey (2 tadan) — 603/811 (Malaysia, verified) tegilmaydi.
- Amount-period flaglari: 794 (`year`→semestr summasini tekshirish), 858 (`total`→semestr) — kelajakdagi amount passda, sahifalar qayta o'qilib.
- Kuzatuvlar: **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU jonlansa; **723** Arizona xalqaro Terms e'lon qilinsa; **556/694/699** sahifalar to'g'ridan-to'g'ri o'qilsa; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa; USMCARE faqat ochiq raund bilan.
