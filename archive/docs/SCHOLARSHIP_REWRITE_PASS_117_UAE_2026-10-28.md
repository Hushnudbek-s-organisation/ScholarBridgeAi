# Stipendiyalar tozalash — Pass 117 (2026-10-28, United Arab Emirates)

**Kontekst.** UAE klasteri (Khalifa 501 + UAEU 848). Ikkala yozuv ham oldingi passda "shartlar o'qilmagan" deb halol belgilangan placeholder edi. **848** nomi importer-uydirma bo'lib ko'ringan edi, lekin fetch aksini ko'rsatdi: "Chancellor's Scholarship for Elite Students" — UAEU ning rasmiy nomi. **501** esa chindan ham uydirma sarlavha ("International Excellence Scholarship") bo'lib, barcha darajalarni qamrab olgan edi; bakalavr qismi allaqachon alohida **854** yozuvda (rel 8) aks etgan, magistratura/PhD sxemasi katalogda yo'q edi — 501 shu nomli graduate sxemaga qayta anchorga olindi (434/345 andozasi). Jami 7 ta fetch: KU graduate sahifasi (2 chunk), KU PG landing, KU Postgraduate Admissions, UAEU Undergraduate Scholarships (4 chunk).

| # | ID | Qaror | Natija |
|---|----|-------|--------|
| 1 | 501 | **Qayta yozildi → rel 10** "Khalifa University Graduate Scholarship for International Students"; darajalar [Bachelor's+Master's+PhD] → [Master's, PhD] | Darajali (tier) tizim: MSc — to'liq/50% ozod + turar-joy (stipendiyasiz); PhD Research Path — to'liq + 20 000 AED/oy + 10–20k qo'shimcha, **ish majburiyati** bilan; PhD Study Path — 100–25% + 4k/2k AED/oy. Qabul yopiq (Spring 2027) → `upcoming`, sana yo'q |
| 2 | 848 | **Qayta yozildi → rel 10** "Chancellor's Scholarship for Elite Students (UAEU)" (rasmiy nom saqlandi) | 100% (G12 ≥98% + IELTS 7.5 + SAT-M 730) / 75% (≥95% + IELTS 6.5); faqat tuition; davomiylik CGPA 3.8/3.6; ariza qabul arizasi ichida → `open` |

## Qarorlar mantiqi

- **501 (Khalifa graduate).** KU sxemasi qabul jarayoni ichida baholanadi — alohida forma yo'q; slotlar cheklangan; minimal talablar kafolat emas. Eng muhim noziklik o'quvchiga ochiq yozildi: **Research Path** (oyiga 40k AED gacha) bitiruvdan keyin o'qish muddatiga teng **ish majburiyati** yuklaydi (universitet ish taklif qilmaslik huquqini ham saqlaydi), **Study Path** esa majburiyatsiz, lekin 4k/2k AED. Sahifadagi ogohlantirish — imtiyozlar ogohlantirishsiz o'zgarishi mumkin — ham qayd etildi; sahifaning chop sanasi (2023-06-13) notesda halol ko'rsatildi (joriy sayt strukturasidan bog'langan sahifa, landing bilan tasdiqlangan). Qabul minimalari marshrutga qarab farqlanadi (CGPA 3.0/3.25/3.5; Direct PhD GRE Q150) va ingliz tili qoidasida imtiyozlar bor → `min_gpa`/`min_ielts` NULL, matnda (IELTS 6.5 / TOEFL 91, kod 0960). UAE MOE ekvivalentlik sertifikati "uzoq jarayon" ekani alohida ta'kidlangan. CMDRTS (faqat UAE fuqarolari) va CSC–KU (faqat Xitoy fuqarolari) — doiradan tashqari, notesda. Manba **888** (eksklyuziv) graduate sahifasiga yo'naltirildi; us **487** sinxronlashtirildi.
- **848 (UAEU Elite).** Bitta nom — ikki grant darajasi: 100% (98% + IELTS 7.5 + SAT-M 730/ACT 32; Huquq uchun arab tili 6.5; matematika sharti 4 kollejga tegishli emas) va 75% (95% + 6.5 + 660/28; arab 5.5). Faqat tuition (yotoqxona va qabul to'lovi qoplanmaydi); shartnoma imzosi majburiy; davomiylik: CGPA 3.8/3.6, ≥15 kredit, boshqa stipendiya taqiqlanadi; kollej/dastur almashinuv — bekor qilish; 30 kunlik apellyatsiya; upgrade mexanizmi mavjud. Sahifadagi "Talented Students" (100%/50%) va "Children of UAEU Employees" — alohida sxemalar (bu yozuv emas; Talented keyingi boyitish nomzodi). Yangi manba **3116** yaratildi (848 da manba umuman yo'q edi); us **368** importer qiymatlaridan yangilandi.
- Qo'llanilgan qoidalar: rasmiy sana yo'qligida deadline **uydirilmadi** (ikkalasida ham NULL/`not_published`); daraja/path bo'yicha farqlanuvchi summalar — NULL/`variable`; AED da `amount_usd_value=0`; qidiruv snippetidagi raqamlar fetchsiz qabul qilinmadi (snippet MSc/PhD imtiyozlarini aralashtirib ko'rsatgani fetchda aniqlandi — xalqaro MSc stipendiya **olmaydi**).

## Tasdiqlangan hisoblagichlar (passdan keyin)

| Ko'rsatkich | 23-partiyadan keyin | Pass 117 dan keyin |
|---|---|---|
| Faol stipendiyalar | 552 | 552 |
| Nafaqaga chiqarilgan | 180 | 180 |
| Faol rel-4 | 21 | **19** (United Arab Emirates: **0**) |
| Kelajakdagi deadlinelar | 197 | 197 |
| Max ID / manba / us | 984 / 3115 / 707 | 984 / **3116** / 707 |

Alomat: 8 ta yozuv (2 UPDATE scholarships, 1 INSERT source, 1 UPDATE source, 2 UPDATE us, 1 INSERT link, setval) `RETURNING` bilan tasdiqlangan. `npm run typecheck`, `check:i18n`, `test:render` — toza (337/337). Replay: `supabase/scholarship_rewrite_pass117_uae_2026-10-28.sql`.

## Keyingi qadam

Boyitish 24-partiya, so'ng Pass 118: qolgan 2 qatorli rel-4 klasterlar (Chile UC 467/879; India IIT 397/477; Mexico 343/402; Norway 346/424 — faol rel-4 jami 19). Kelajak nomzodlar: UAEU Chancellor's Scholarship for Talented Students (100%/50%) qo'shish; Islamic University of Madinah; 608/854 verifikatsiyalari (rel 8 → 10; 854 da daraja qiymati "Bachelor" nostandart — tuzatish nomzodi); 673 SU Scheme kodlanishi; eksternal universitetlar yaratish (Karolinska, Innsbruck 432, Tampere 965, LUT 964, Roskilde 972, SDU 973, SMU 396, KAUST/MBZUAI/Doha 954/955/956, Adelaide+328, Flinders+442, Simon Fraser/Manitoba/UVic — 446 NULL qoladi); 31/849, 44/554, UBC 49/65 deduplikatsiyalari.
