# Boyitish — Batch 32 (2026-10-29)

## Xulosa
Bu batch yangi yozuvsiz, tasdiqlangan yangilash/tuzatishlar batchi bo'ldi: nomzod sxemalar baholandi, lekin hech biri birinchi qo'l dalil talabidan o'tmadi yoki allaqachon katalogda bor edi. Majburlab yozuv qo'shilmadi.

## Baholangan, lekin qo'shilmagan nomzodlar
- **POSCO (Koreya) — RAD ETILDI.** POSCO TJ Park Foundation sayti bugun birinchi qo'ldan o'qildi: dastur "POSCO Global Scholarship in Korea" deb qayta tuzilgan va rasmiy FAQ yopiq mamlakatlar ro'yxatini e'lon qiladi (Osiyo: Xitoy, Hindiston, Indoneziya, Yaponiya, Qozog'iston, Malayziya, Myanma, Filippin, Saudiya, Singapur, Tailand, BAA, Vetnam; + Amerika/Yevropa/Afrika to'plamlari). **O'zbekiston ro'yxatda yo'q** — eski "Asia Fellowship" ning ochiq shakli o'tmishda qolgan. Qo'shilmadi; ro'yxat "tentative" deb belgilangan — kelajakda O'zbekiston kirsa qayta baholanadi.
- **Confucius / International Chinese Language Teachers Scholarship** — allaqachon katalogda (**946**, rel 10). Dublikat yaratilmadi.
- Swedish Institute (922), ADB-JSP (921), JJ/WBGSP (892), Stipendium Hungaricum (860), Türkiye Burslari (865) — hammasi mavjudligi tekshirildi.
- **Universitet backlinklari (981 Karolinska, 989 Linköping, 992 Ljubljana) — BLOKLANGAN:** `universities` jadvalida bu uch universitet umuman yo'q (Shvetsiyada faqat 6 ta, Sloveniyada 0 ta yozuv). `university_scholarships` havolasi yaratish uchun avval universitet yozuvlari kerak — bu alohida, o'z tekshiruvini talab qiladigan ish; bu batchda universitet yozuvi uydirilmadi.

## 967 — Axel Adler Scholarship for Sustainability: deadline mikro-tuzatishi yopildi
- 2026-10-29 da Gothenburg sahifasi va **ikkala 2027 PDF** birinchi qo'ldan o'qildi — sustainability PDF (yangi manba **3147**) birinchi marta.
- Barqarorlik PDFida alohida sanalar yo'q; ariza asosiy Axel Adler jarayoni bo'yicha ketadi. Asosiy 2027 PDF (mavjud manba 3129) grant arizasi oynasini beradi: **10 fevral – 8 mart 2027** (taklifnoma asosida).
- Tuzatishlar: `deadline_date` 2027-01-15 → **2027-03-08** (739 asosiy yozuv konvensiyasiga mos — haqiqiy grant-arizasi yopilishi; 15-yanvar birinchi-tanlov o'qish arizasi operatsion darvoza ekani matnda saqlandi), `deadline` matni ikki bosqichli qilib yozildi, `rounds` ga ariza oynasi qo'shildi, `application_status` 'open' → 'upcoming' (739 ga mos), `requirements` ga PDFdagi ikkita aniqlik qo'shildi: faqat *sustainability-focused* (bog'liq — *related* — dasturlar olmaydi) va maxsus motivatsiya savoli (3 000 belgi). `last_verified_at` yangilandi (rel 10 o'zgarmadi). Havolalar **419** (967→3147), **420** (967→3129).

## 875 — CTU (Praga) magistratura granti: gigiyena mikro-tuzatishi (fetchsiz)
- `international.cvut.cz` bugun ham "Service temporarily unavailable" (2026-10-28 dagi kabi) — hech qanday shart qayta tekshirilmadi, `last_verified_at` va rel 9 o'zgarishsiz.
- Faqat qatorning o'z matuni bilan ziddiyatli qoldiqlar tuzatildi (541 pretsedenti): `amount_usd_value` 4 300 (konversiya artefakti) → 0; tavsifdagi "(about $430)" olib tashlandi; tuzilmaviy maydonlar o'z matniga moslandi (CZK/oy/o'zgaruvchan; summa NULL — 10 000 raqami faqat matnda qoladi); `min_gpa` 3.2 va `min_ielts` 6.5 qoldiqlari NULL; yorliqlar uy uslubiga keltirildi. Yon-jadval 441: 'Yes' → 'available'. To'liq uplift 876 bilan birga sayt o'qiladigan bo'lganda.

## 500 — UM Bright Scholarship: ko'rsatgich mikro-tuzatishi (fetchsiz)
- UM sahifalari bugun ham ochilmadi (ikkala aasd sahifasi yuklanmadi; 2026-10-28 da HTTP 500 edi) — shartlar/summa/bazis/minimumlar tegilmadi.
- Faqat ko'rsatgichlar: `website_url`/`application_url` bakalavr sahifasidan ("UG granti yo'q" degan o'z matni bilan ziddiyat) Pass 124 da aniqlangan kanonik aspirantura sahifasiga o'tkazildi (sahifa o'qilmagani notes da ochiq yozilgan; `source_url` avvalgisiicha — iqtibos shundan); `recurrence` 'none' → 'annual' ("Annual call" matniga mos); "IELTS 6." → "IELTS 6.0" (tipografiya).
- Yon-jadval 454 hali ham uydirma "International Excellence" nomini ko'tarib yurgan ekan — "UM Bright Scholarship" ga o'zgartirildi, 'Yes' → 'available', qiymat matni yozuvga moslandi.
- To'liq uplift (bazis `full_tuition` vs MYR 3,500/oy summasi; GPA/IELTS minimumlari) o'qiladigan UM sahifasini kutadi — majburlanmadi.

## Manbalar
- Yangi: **3147** (Gothenburg sustainability 2027 PDF). Havolalar 419/420. Ketma-ketliklar: manbalar 3147, havolalar 420.
- CTU va UM sahifalari o'qilmagani uchun ularga manba yaratilmadi.

## Tekshiruvlar
- Boshlang'ich va yakuniy sanoq bir xil: **547 faol / 194 nafaqada / 3 rel-4 / 199 kelajak-muddat** (967 ning yangi muddati 2027-03-08 ham kelajakda). Maksimal IDlar: grantlar 993, manbalar 3147, `university_scholarships` 711, havolalar 420.
- Mahalliy tekshiruvlar: `npm run typecheck`, `npm run check:i18n`, `npm run test:render` — **337/337 o'tdi**.

## Navbat
- Keyingi qadam — **Pass 126**: oxirgi rel-4 juftligi Taiwan 342 + Thailand 502 (876 — CTU sayti tiklansa).
- Kutilayotganlar: 875+876 to'liq uplift (CTU), 500 to'liq uplift (UM), 990 yangilash 2026-11-27 dan keyin, 421 (Chalmers 2027 tafsilotlari chiqsa), PEC-PG (edital o'qilishi bilan), Karolinska/Linköping/Ljubljana universitet yozuvlari + backlinklar.
