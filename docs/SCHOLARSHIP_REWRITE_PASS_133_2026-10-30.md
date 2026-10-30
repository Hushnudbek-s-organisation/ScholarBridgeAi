# Scholarship Rewrite Pass 133 — Australia merit oilasi: shablon minima'si tozalovi (2026-10-30)

## Bu pass'da nima qilindi

Australia guruhidagi 6 ta yozuv (676 Swinburne, 761 UTas, 771 UNSW, 774 UQ, 780 UTS, 783 Sydney) — hammasi rel 8, hammasi 2026-10-23 da rasmiy sahifalardan tasdiqlangan, lekin tuzilmaviy maydonlarida import-shablon AQSh shkalasi raqamlari (3.0–3.85 / 6.0–7.0) va "IELTS X or equivalent English test" satrlari qolgan edi. Barcha 6 ta yon-jadval qatorida ham "Typical academic profile: GPA…, IELTS…." shablon gapi bor edi. Uydirma miqdor yoki deadline kiritilmadi.

**Uchta yozuv bugun birinchi qo'ldan qayta o'qildi** (yangi manbalar 3178–3180, havolalar 476–478, `last_verified_at` yangilandi):

- **UQ (774):** qabulda avtomatik baholash; mezon — dastur kirish reytingi + universitet belgilaydigan "raqobatbardosh ball"; alohida ariza yo'q. 3.6/7.0 raqamlari yo'q.
- **Sydney VCIS (783):** ariza talab qilinmaydi; unconditional offer + reyting bo'yicha 5 pog'ona ($60k/$40k/$20k/$10k/$5k). 3.85/7.0 yo'q.
- **Swinburne (676):** "No extra application needed" — oldingi o'qish baholari asosida avtomatik ko'rib chiqiladi. Raqamlar yo'q.

**Ikkitasi o'z matni bilan tozalandi** (771 UNSW, 780 UTS): tasdiqlangan description'lar "avtomatik, akademik xizmat bo'yicha" mexanizmini tasvirlaydi; `last_verified_at` o'zgartirilmadi.

**Maxsus holat — 761 UTas (strip + bayroqcha):** UTAS sahifasi aylangan: "Tasmanian International Scholarship" (25%) endi ro'yxatda yo'q — o'rniga Aurora Excellence (50%), International Merit (30%), Alumni/Family (25%), Access (20%) pog'onali sxemalar turibdi. 776 USM (Pass 132) na'munasi bo'yicha: minima o'chirildi, manba zarb qilinmadi, `last_verified_at` yangilanmadi, yozuvga **Batch 40 da to'liq qayta aniqlash** bayroqchasi qo'yildi.

**Yon-jadval:** 6 ta qatordagi shablon gap regex bilan olib tashlandi (qoldiq 0).

**Texnik izoh:** yozuvlar paytida ulanishlar pool'i to'lib (53300), parallel to'plam qisman bajarildi. Holat SELECT bilan tekshirilib (faqat 761 yozilgani aniqlandi), qolgan yozuvlar navbat bilan, `notes NOT LIKE '%PASS 133%'` qo'riqchisi bilan bajarildi — yakuniy tekshiruv 6/6 yozuvda append aynan bir martadan ekanini tasdiqladi.

## Natija

- 6 ta yozuvda `min_gpa`/`min_ielts` NULL; ingliz tili matni kurs darajasidagi formulaga almashtirildi.
- Rel ≤ 8 + minima mavjud yozuvlar: **59 → 53** (Pass 129 dan beri 94 → 53).
- Hisoblagichlar o'zgarmadi: **546 faol / 205 iste'fodagi / 1 ta rel-4 (876) / 206 kelajak-deadline**.

## Qoldiq navbatlar

- Navbatga ko'ra keyingi bosqich — **Batch 40** (birinchi nomzod: 761 UTAS re-scope — TIS pog'onalangan sxemalarga aylanganmi, aniqlash).
- Minima navbati (53): keyingi guruhlar — US 5, Hong Kong/India/South Korea 4 tadan, Canada/France/Netherlands/New Zealand 3 tadan.
