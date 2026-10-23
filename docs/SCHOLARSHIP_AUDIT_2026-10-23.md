# Grantlar auditi — topilgan xatolar va tuzatishlar (2026-10-23)

Oldingi qadamda 4 ta noto'g'ri grant tuzatilgandi. So'rov bo'yicha **butun jadval**
(648 qator) xuddi shu ikki turdagi xatolik bo'yicha tekshirildi:

1. **boshqa universitetning granti** shu universitetga bog'langan;
2. **bo'lishi mumkin bo'lmagan da'vo** (masalan kontrakt yo'q joyda "Full Tuition").

## 1. Boshqa universitetning granti — 5 ta (tuzatildi)

| id | Grant | Noto'g'ri turgan joy | To'g'ri manzil |
| ---: | --- | --- | --- |
| 148 | UCLA Chancellor's Fellowship | University College London (UK) | **UCLA** (id 51) |
| 389 | QUB Doctoral Scholarships International | Queen's University **Kingston** (Kanada) | **Queen's University Belfast** (313) |
| 439 | Newcastle International Postgraduate Research | Newcastle University (**UK**) | **University of Newcastle, Australia** (310) |
| 51 | HKUST University Scholarship for Non-Local Students | **HKU** (21) | **HKUST** (217) |
| 305 | HKUST RedBird PhD Scholarship | **HKU** (21) | **HKUST** (217) |

Sabab: nomlar chalkashligi (Newcastle UK ↔ Newcastle Australia, Queen's Belfast ↔ Queen's
Kingston) va qisqartmalar (HKU ↔ HKUST). Grantlar **o'chirilmadi** — to'g'ri
universitetga ko'chirildi, `country` maydoni ham yangilandi, `university_scholarships`
bog'lamalari qayta yaratildi.

## 2. Bo'lishi mumkin bo'lmagan da'volar — 4 ta (tuzatildi)

Germaniyada (Baden-Württemberg va Bavariyadan tashqari) davlat universitetlari
**kontrakt olmaydi** — faqat ~€350 semestr yig'imi. Lekin bazada:

| id | Universitet | Eski | Yangi |
| ---: | --- | --- | --- |
| 350 | RWTH Aachen | "International Excellence Scholarship", **$18 000 "Full Tuition + Stipend"** | Deutschlandstipendium (€300/oy) + RWTH Education Fund |
| 483 | Universität Hamburg | **$5 000 "Full Tuition"** | Deutschlandstipendium & DAAD (€300/oy) |
| 484 | University of Cologne | **$5 000 "Full Tuition"** | Deutschlandstipendium & DAAD (€300/oy) |
| 499 | Humboldt-Universität | **$5 000 "Full Tuition"** | Deutschlandstipendium & DAAD (€300/oy) |

Deutschlandstipendium — federal dastur, universitet orqali beriladi: €300/oy, kamida
ikki semestr. Bu tekshiriladigan fakt (har bir nemis OTMi e'lon qiladi).

## 3. Dublikatlar — 3 ta (o'chirildi)

Bir grant ikki marta turgan, sahifadagi 6 o'rinni egallab:

| Saqlab qolindi | O'chirildi | Sabab |
| --- | --- | --- |
| 26 — ETH Zurich ESOP, $40 000, ethz.ch/studies/master/… | 111 — $36 000, bosh sahifa | ikkinchisi umumiy |
| 48 — McGill Entrance Scholarship, studentaid sahifasi | 621 — $41 500, bosh sahifa | 621 miqdori McGill kontraktidan **yuqori** |
| 52 — PSL Excellence, psl.eu/en/education/scholarships | 654 — $1 125, bosh sahifa | ikkinchisi umumiy |

## 4. Tekshirildi va **to'g'ri** deb topildi (tegilmadi)

| Shubha | Natija |
| --- | --- |
| 32 ta grant $80 000 dan yuqori | AQSh/UK to'liq paketi (kontrakt + yashash + sug'urta) — real raqamlar |
| "X + El-Yurt Umidi" (16 qator) | 13-davlat PDFidan: universitet granti + o'zbek milliy granti birgalikda — ataylab shunday |
| 9 ta "Full Tuition + Stipend" kontrakti arzon universitetlarda | Doktorantura stipendiyalari (Elsa-Neumann, TU Dresden Graduate Academy) — summa real, faqat nomlanishi keng |
| Provider ≠ universitet nomi (20 ta) | Hammasi to'g'ri ("The University of…" prefiksi sabab soxta signal) |
| "Tuition-Free State Education + Deutschlandstipendium" (5 ta) | Sarlavhasi Germaniya holatini to'g'ri tushuntiradi |

## 5. Yakuniy holat

```
faol grantlar                  643   (5 tasi is_active = false)
mamlakat ≠ universitet             0
grant ro'yxati bo'sh               0
o'z granti birinchi            363/364
bog'lama o'chirilgan grantga       0
```

Yagona istisno — **id 176**, UNAM'ning takroriy qatori (asosiysi 91). U dublikat
qatorlar birlashtirilganda hal bo'ladi.

## 6. Qolgan ma'lum cheklov

**56 ta "<Universitet> International Excellence Scholarship"** shabloni hali ham bor
(41 tasida boshqa grant ham bor, 10 tasi davlat grantiga tayanadi, 5 tasi yolg'iz).
Ammo bu nom — ko'p universitetlarda **haqiqiy** dastur nomi (Padua, RMIT, Swinburne,
Massey, Waikato, VUW va boshqalar). Shuning uchun ularni o'chirish ham, qoldirish ham
bir xilda noto'g'ri bo'lardi: har birini o'z saytidan tekshirish kerak. Bu keyingi
bosqichga qoldirildi (56 ta so'rov).

Takrorlash: `supabase/scholarship_correctness_sweep_2_2026-10-23.sql`.
