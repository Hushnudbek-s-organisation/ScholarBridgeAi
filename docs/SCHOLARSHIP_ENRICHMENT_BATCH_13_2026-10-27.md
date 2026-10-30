# Stipendiyalar boyitilishi — Batch 13 (Hanyang ×2 + ETH ESOP dublikatini bartaraf etish)

**Sana:** 2026-10-27 · **Branch:** `arena/a496ffaa-scholarbridgeai` · **PR:** #103

Reja ETH ESOP va Hanyangning ikki stipendiyasini qo'shish edi. Auditda kutilmagan holat chiqdi: **ESOP katalogda ikki marta faol edi** (13 va 26). Shuning uchun batch: **2 ta qo'shimcha (952, 953) + 1 dublikat pensionatsiya (26) + 1 yozuvni qayta tasdiqlash (13)**.

## Nima qilindi

| ID | Amal | Tafsiloti |
|---|---|---|
| 952 | **Qo'shildi (rel 9)** | *Hanyang Scholarship for Excellence in Language Proficiency* — TOPIK 5/6 yoki TOEFL 90+ yoki IELTS 6.5+ bo'lsa, birinchi semestr kontrakt −30% |
| 953 | **Qo'shildi (rel 9)** | *Hanyang Scholarship for Engineering and Science Students* — kontrakt −50% va kirish to'lovi −50% (magistr/PhD 4 semestr, MA-PhD 6; GPA ≥3.0 saqlab qolish) |
| 13 | Qayta tekshirildi (rel 10) | *ETH ESOP* — ETH rasmiy sahifasi qayta o'qildi va yozuv bilan to'liq mos (13 500 CHF/semestr HS27 dan, kontrakt ozodligi, **1–30-noyabr 2026 darcha**, ~60 o'rin). Faqat tokenlar me'yorlashtirildi va `rounds` to'ldirildi |
| 26 | **Pensionatsiya (dublikat)** | *ETH Zurich Excellence Scholarship (ESOP)* — 13 bilan bir xil sxema; 111-variant avvalroq pensionatsiya qilingan edi |

## Dalillar

- **Hanyang sxemalari:** Hanyang OIA 2024 Bahor rasmiy qo'llanmasining 08-bo'limi Pass 105 da o'qilgan va ushbu batchda **qayta o'qildi** — matn so'zma-so'z bir xil. Shartlar 2024 Kuz qo'llanmasida ham, universitetning 2025-yil martdagi rasmiy flaierida ham aynan takrorlanadi. rel 9 sababi: qo'llanma har semestr qayta chiqadi. Ikkala sxema ham `sources` 2534 (qo'llanma PDF) ga bog'landi — HISP (452) bilan bir manba; ularni HISP bilan birga olib bo'lmaydi (matnda yozilgan).
- **ETH:** rasmiy ESOP sahifasi (`ethz.ch/students/en/.../excellencescholarship.html`) ushbu sessiyada o'qildi: summa HS27 dan 13 500 CHF/semestr, 2027/28 uchun ~60 stipendiya, qaror mart oxiri, bakalavr top-10%/grade A, pre-proposal, fevral suhbat ehtimoli. 13-yozuv bularni allaqachon to'g'ri ko'targan (2026-10-26 verifikatsiya), shu jumladan «semester» birligi yo'qligi sababli `award_amount`ni NULL qoldirish qarori ham asosli — tegilmedi.
- **26 pensionatsiyasi:** bir sxemaga ikki faol yozuv foydalanuvchini chalg'itadi; rasmiy nom va eng yangi verifikatsiyaga ega 13 qoldirildi.

## Metodik eslatmalar

- Parallel INSERTlarning bajarilish tartibi yana id tartibini o'zgartirdi: **952 = Language Proficiency, 953 = Engineering & Science** (RETURNING + qayta SELECT bilan tasdiqlangan). Universitet qatorlari: **682** (952), **683** (953); 13 uchun us 7 sinxronlandi, 26 uchun us 494 withdrawn. Manba 2519 kanonik ETH URLga yo'naltirildi (exclusive + collision 0).
- 26-pensionatsiyaning birinchi urinishi `deadline_type` NOT NULL cheklovi sababli rad etildi (ustunni NULL qilishga harakat) — Pass 105/106 dagi shakl bilan tuzatilib qayta yuborildi. Bu cheklov replay SQL sarlavhasida ham qayd etilgan.
- Faol yozuvlar soni atigi +1 ga oshdi (+2 qo'shimcha −1 dublikat): bu «kamroq, lekin to'g'ri» — katalog sifati bir dublikatdan tozalandi.

## Sanovchilar (DBdan qayta o'qilgan)

| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol stipendiyalar | 533 | **534** |
| Pensionatsiya qilingan | 166 | **167** |
| Faol reliability-4 yozuvlar | 55 | **55** |
| Kelajakdagi deadline'lar | 171 | **170** (26 ning dublikat 30-noyabr sanasi chiqdi) |

Lokal tekshiruvlar: `typecheck` ✅ · `check:i18n` ✅ · `test:render` ✅ 337/337.

## Keyingi qadamlar

1. **Pass 107 (tozalash):** Yangi Zelandiya klasteri (5 yozuv). Keyin Belgiya/Finlyandiya/Fransiya/Shvetsiya (4 tadan).
2. **Batch 14 nomzodlari:** boshqa kuchli sxemalarning bor-yo'gi + to'g'riligi tekshiriladi; kerak bo'lsa ETH atrofidagi tekshiruv boshqa «benchmark» sxemalarga (EIT, Swiss Government Excellence — mamlakat ro'yxatini tekshirib) yoyiladi.
3. Texnik qarzlar: SMU yozuvi + 396; Adelaide/Flinders; 31/849 va 44/554 dubl tekshiruvlar.
