# Audit va tuzatish — 2026-10-23 (birlashtirishdan keyingi tekshiruv)

**Loyiha:** `zkdguzbdopfedkffsatk` · **Branch:** `arena/99b0c7fe-scholarbridgeai`
**SQL:** `supabase/integrity_repair_2026-10-23.sql`
**Guard:** `npm run test:deadlines`

Butun baza qaytadan tekshirildi. Uch sinf xato topildi — uchalasi ham
foydalanuvchiga **noto'g'ri ma'lumot ko'rsatardi**.

---

## 1. Eng jiddiy xato: 84 ta "tasdiqlangan" qator hech qachon tekshirilmagan

Eski import har bir dastur uchun tasodifiy sana bilan qator yozgan va izohiga
`"Fall 2027 international admissions cycle for BS in …"` qo'ygan. O'sha paytda
`verified` deb belgilangan 10 ta universitet bu holatda qolib ketgan — mening
avvalgi bosqichlarim faqat `unverified`/`estimated` qatorlarga tegardi.

| Universitet | Bazada "tasdiqlangan" sanalar | Universitet e'lon qiladi |
| --- | --- | --- |
| MIT | 1-yanvar / 20-yanvar / 1-fevral / 15-dekabr | **RD — 4-yanvar 2027** |
| Stanford | 15-noyabr | **RD — 5-yanvar 2027** |
| Harvard | 1-dekabr | **RD — 1-yanvar 2027** |
| Oxford | 8-yanvar / 10-yanvar / 6-mart | **15-oktabr 2026, 18:00 UK** |
| Cambridge | 8-yanvar / 4-dekabr | **15-oktabr 2026, 18:00 UK** |
| Imperial | 31-mart | **13-yanvar 2027, 18:00 UK** |
| UCL | 31-yanvar | **13-yanvar 2027, 18:00 UK** |
| ETH Zurich | 15-dekabr | **31-mart 2027** (nashr: 2026-12-01 dan) |
| NUS | 30-noyabr | **17-fevral 2027** (nashr: 2026-12-16 dan) |
| Caltech | 1-dekabr | **RD — 4-yanvar 2027** |

**Nima qilindi:** bu 10 ta universitetning barcha eski qatorlari o'chirildi va
har biriga **bitta** rasmiy manbadan olingan `verified` qator yozildi.

Har bir qatorda: manba URL, "nima e'lon qilingan" izohi, vaqt mintaqasi,
to'g'ri `cycle_year`.

### Oxford va Cambridge haqida alohida izoh
Ularning 2027-yilga kirish muddati **15-oktabr 2026** edi — bugun (23-oktabr)
u **o'tib ketgan**. Shuning uchun qatorga **keyingi yillik takrorlanish**
(15-oktabr 2027, 2028-yilga kirish) yozildi va izohda 2027-yil muddati
o'tganligi aniq aytilgan. Bu universitetning o'zi e'lon qilgan yillik qoida —
to'qima emas.

---

## 2. Ziddiyatli bayroqlar

| Muammo | Soni | Tuzatish |
| --- | ---: | --- |
| `verification_status='verified'` lekin `is_estimated=true` | 16 | ikkalasi `verification_status` dan hosil qilindi |
| `verification_status='verified'` lekin `is_verified=false` | 22 | yuqoridagi kabi |

## 3. `academic_year` va `cycle_year` ajralib ketgan

| Muammo | Soni |
| --- | ---: |
| `academic_year='2026-2027'` lekin `cycle_year=2027` | 199 |
| `academic_year='2027'` (diapazon yo'q) | 7 |
| `academic_year='2027-2028'` lekin `cycle_year=2028` | 21 |

**Natijada API xato ko'rsatardi:** `UniversityDetail` yilni `academic_year` dan
parse qilardi — `"2026-2027"` → **2026**. Ya'ni Fall 2027 muddati "2026" deb
chiqardi.

**Tuzatish:**
1. Barcha qatorlar `academic_year` = `cycle_year` bilan boshlanadigan qilib
   normalashtirildi.
2. API endi **`cycle_year` ustunini** o'qiydi, parse qilmaydi.

## 4. Scholarship jadvalidagi qoldiqlar

| Muammo | Soni | Tuzatish |
| --- | ---: | --- |
| Miqdor bor, valyuta yo'q (UZ OTMlari) | 4 | `USD`, `award_amount`, `source_url` to'ldirildi |
| `verified` lekin muddati o'tgan (Auckland) | 1 | 21-oktabr 2026 raundi yopilgani yozildi, yangi sana to'qilmadi |
| `university_id` bor, `university_scholarships` da yo'q | 195 | 190 ta qator qo'shildi (5 tasi nom to'qnashuvi) |

## 5. Sxema drifti

`src/db/schema.ts` da `application_cycles` ning **8 ta haqiqiy ustuni yo'q** edi:
`cycle_year`, `deadline_type`, `is_estimated`, `is_active`, `is_verified`,
`notes`, `official_source_id`, `created_at`. Ilova `select()` bilan ularni
olardi, lekin TypeScript ularni bilmasdi — shuning uchun API `academic_year`
ni parse qilishga majbur bo'lgan.

Endi modellashtirilgan va hujjatlashtirilgan: **96 jadval / 1077 ustun /
119 FK**, `full_schema.sql` qayta generatsiya qilindi.

## 6. Yangi guard: `npm run test:deadlines`

`scripts/check-deadline-integrity.ts` — 10 ta qoida, har biri bugun topilgan
xatoni ushlaydi:

1. `verified` muddat o'tgan bo'lmasin
2. `verified` manba URL'siz bo'lmasin
3. `verified` izohsiz bo'lmasin
4. `verified` qatorda import shabloni izohi qolmasin
5. `is_verified` ↔ `verification_status`
6. `is_estimated` ↔ `verification_status`
7. `academic_year` formati to'g'ri bo'lsin
8. `academic_year` va `cycle_year` bir yilni ko'rsatsin
9. cycle → program → university mos kelsin
10. `verification_status` faqat 3 qiymatdan biri bo'lsin

Hozirgi natija: **10/10 passed**.

---

## 7. Yakuniy holat

| Ko'rsatkich | Qiymat |
| --- | ---: |
| Universitetlar | 358 |
| `application_cycles` | 3096 |
| `verified` qatorlar | **989** |
| `verified` universitetlar | **224** |
| Aktiv scholarship | 639 |
| `university_scholarships` | **583** (358/358 universitet) |
| Manbalar | 2337 |

Testlar: integration **331/0** · schema **PASSED** · schema-repair **18/0** ·
dataset **50/0** · streak **29** · essay-adapter **50/0** · chancing **27/0** ·
calculations **55** · deadlines **10/10**
