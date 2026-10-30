# Enrichment Batch 40 — UTAS re-scope: TIS tugatildi; Merit 30% va Aurora Excellence 50% yangi yozuvlar sifatida qo'shildi

**Sana:** 2026-10-30
**Turi:** Enrichment Batch (Pass 133 dagi re-scope flagni yopish)
**Natija:** **547 active / 206 retired / 1 rel-≤4 / 207 future-dated**; minlow (rel≤8, strukturlangan minimum) **53 → 53** (o'zgarmadi). Butun bazada boshqa hech narsa o'zgarmadi (sch.id ∈ {761, 1004, 1005}, sources 3181–3183, links 479–481, university_scholarships 261/721/722).

## Ushbu batchning maqsadi

Pass 133 da UTAS (University of Tasmania) hubi aylangani aniqlanib, 761 (Tasmanian International Scholarship, TIS) uchun aniq re-scope flag qoldirilgandi: *"hub no longer lists the TIS name — resolve in Batch 40: read the current hub + the specific successor scheme pages first-hand and rewrite/retire or add the real successor scheme accordingly."* Ushbu batch shu flagni yopadi.

## Birlamchi dalillar (birinchi qo'ldan o'qilgan)

| Source | Sahifa | Asosiy xulosa |
|---|---|---|
| **3181** | utas.edu.au — Tasmanian International Merit Scholarship | 30% chegirma, admission paytida avtomatik baholash (natija — offer letterda); benchmark ≈ course minimumidan 10 ATAR yuqori (4.0 shkalada 3.3; UTAS GPA 5.25/7); 2027 T&C: standard duration, max 5 yil FTE, tuition-only, excluded kurslar; 2026 gacha oldingi guidelines amalda bo'lgan |
| **3182** | utas.edu.au — Tasmanian Aurora Excellence Scholarship | 50% chegirma, 2027 dan boshlovchilar uchun, offerdan keyin taklif bilan; forma + 300–500 so'zlik personal statement + intervyu; S1 2027: ochilish 2026-09-14 → yopilish 2026-11-15; S2 2027 yopilish 2027-04-30; 90 ATAR ekvivalenti (O'zbekiston jadvalda yo'q — "contact us"), UTAS GPA 6.5/7 |
| **3183** | utas.edu.au — International Scholarships hubi | 2027 avtomatik sxemalar: Aurora Excellence 50%, International Merit 30%, Alumni/Family 25%, Access 20%, partner-college 20%, Maritime College bursary 25–30%. **"Tasmanian International Scholarship (TIS)" nomi yo'q — TIS tugatilgan** |

## Qaror va uning sababi

1. **761 (TIS, 25%) — retired.** TIS nomi hubdan ham, ikkala yangi sxema sahifasidan ham g'oyib bo'lgan. Dom: is_active=false, status=closed, award-ustunlar NULL, recurrence=none, deadline matni yopilish haqida to'g'ri yozildi; description va source URL audit uchun saqlandi; hub (3183) link 479 bilan bog'landi; universitet yon yozuvi (us 261) availability='No' qilindi. **761 hech qaysi yangi sxemaga qayta yozilmadi** — nomi, foizi va benchmarki butunlay o'zgargan; qayta yozish audit izini aldovchi qilib qo'yardi. Retirement yozuvi mavjud TIS holderlarining huquqi haqida hech qanday da'vo qilmaydi — faqat yangi abituriyentlar uchun sxema e'lon qilinmayotgani qayd etildi.
2. **1004 (Tasmanian International Merit, 30%) — yangi, rel 10.** Avtomatik (deadline_type=automatic, deadline_date NULL), 676 (Swinburne) yozuvi shablonida; award 30% AUD/year/variable, USD 0 (foizli chegirmada dollar ekvivalenti e'lon qilinmagan — 676/761 an'anasi).
3. **1005 (Tasmanian Aurora Excellence, 50%) — yangi, rel 10.** Raqobatli, taklif bilan; deadline_date=2026-11-15 (S1 2027 yopilishi) + ikki raundlik rounds JSON (573 Durham an'anasi); S2 2027 ochilishi rasmiy sahifada "TBC" — sana uydirib yozilmadi.
4. **Access 20% va Alumni/Family 25% katalogga olinmadi** — birinchisi access/mamlakat asosida, ikkinchisi UTAS bitiruvchilari uchun; umumiy xalqaro merit sxemalari emas.
5. Ikkala yangi yozuvda **min_gpa/min_ielts NULL** — akademik pollar ATAR-ekvivalent va 7 balli shkalada berilgan (shkala-noma'lum), narrative'da yozildi; ingliz tili — Pass 133 course-level formulasi (T&C faqat "admission and English language requirements" deydi).

## Tekshiruvlar

- Hard-check: **547 active / 206 retired / 1 rel-≤4 / 207 future-dated** (1005 ning 2026-11-15 yopilishi qo'shildi; 1004 avtomatik — deadline_date yo'q), minlow 53→53 (761 Pass 133 dan beri minima-siz edi; yangi yozuvlar rel 10).
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337** o'tdi.
- Yozuvlar qat'iy ketma-ket bajarildi (Pass 133 connection-pool darsi); birinchi sources insert sxema xatosi (`type` ustuni yo'q) bilan rad etilib, haqiqiy ustunlar tekshirilib qayta yuborildi.

## Replay

`supabase/scholarship_enrichment_batch40_2026-10-30.sql` — izoh jonli holatni jamladi; notes-qo'shimchalar replay-once, yangi IDlar aniq (sources 3181–3183, scholarships 1004–1005, links 479–481, us 721–722).

## Keyingi qadamlar

- **Pass 134:** rel≤8 minima navbati (53) — US (5), Hong Kong/India/South Korea (har biri 4) guruhlari kutishda.
- O'zgarishsiz kuzatuvlar: **990** 2026-11-27 dan keyin; **421** 2026-yil noyabr oxiri; **876/875** CTU saytlari o'qilable bo'lganda (2026-10-30 qayta tekshirilgan — hamon ishlamaydi); **541** faqat o'qiladigan GT-IF chaqiruvi bilan; SINGA / 500 UM / 534 faqat rasmiy sahifalar o'qilsa; USMCARE faqat kelgusidagi ochiq raund birinchi qo'ldan o'qilsa.
