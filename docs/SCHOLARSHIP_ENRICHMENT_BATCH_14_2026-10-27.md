# Scholarship Enrichment Batch 14 — 2026-10-27

## Maqsad

Baza Pass 107 dan keyin 534 faol / 167 retired / 50 faol reliability-4 / 173 kelajak deadline holatida edi. Batch 14 uchun avval qoplam tekshirildi: Azerbaijan (926), Brunei (932), KNB (579), ICCR (931), GOI-IES (925), ADB-JSP (921), MAECI (864), Banach (867), JDS (920), KOICA (923), AMEXCID (933), TIPP (934), MOE Taiwan (939) allaqachon bazada — lekin Fors ko'rfazi mintaqasining uchta yuqori qiymatli magistratura/doktorantura sxemasi umuman yo'q edi. Uchalasini rasmiy sahifalardan birinchi qo'ldan o'qib, qo'shdik.

## Muhit eslatmasi

Sessiya boshida sandbox yana `b6085bb` ga qaytgan edi (50 ta kuzatilmagan fayl); barcha fayllar `origin/arena/a496ffaa-scholarbridgeai` (`a5c38e4`) bloblari bilan baytma-bayt tekshirildi — barchasi bir xil — va `git reset --hard` bilan xavfsiz tiklandi.

## Qo'shilgan yozuvlar

### 954 — KAUST Fellowship (Saudi Arabia, rel 10)

KAUST rasmiy admissions sahifalaridan (Fees & Funding, Admission Timeline, Application Requirements birinchi qo'ldan fetch qilindi): fellowship har bir qabul qilingan M.S./M.S.-Ph.D./Ph.D. talabaga avtomatik beriladi — alohida ariza yo'q. Paket: to'liq tuition + bench fee (yiliga $35,000 gacha), stipendiya $20,000/yil (M.S.) va $25,000–30,000/yil (Ph.D., kreditlar bo'yicha oshadi), baza turar-joy, tibbiy sug'urta, relocation (viza/sayohat). KAUST umumiy qiymatni $70–80k/yil deb hisoblaydi. Yozuv: `award` NULL `USD/year/variable` (daraja va progress bo'yicha o'zgaradi — sonlar `funding_type` da); `min_ielts=6.5` (TOEFL 81; waiver mamlakatlar ro'yxati yozuvda); **`deadline_date=2027-01-03`** (Fall 2027 Round 2, `open`); raundlarda Spring 2027 (Ph.D. only, yopilgan) + shablon. Manba 3090.

### 955 — MBZUAI Graduate Funding (UAE, rel 10)

MBZUAI rasmiy Graduate Ph.D. + Graduate master's admissions sahifalari (ikkisi ham fetch qilindi, Fall 2027 siklida bir xil model ko'rsatadi): "MBZUAI offers fully funded M.Sc. and Ph.D. programs" — funded talabalarga bepul tuition, oylik stipendiya, yiliga bitta uyga qaytish aviachiptasi, sug'urta va viza/ID homiyligi. Stipendiya jadvali xalqaro talabalar uchun: **AED 15,500/oy (M.Sc.)**, **AED 17,500/oy (Ph.D.)**. Model tafsiloti yozuvda ochiq yozilgan: M.Sc. to'liq universitet tomonidan; Ph.D. — 1-yil markaziy, 2-yildan ilmiy rahbar mablag'iga o'tadi (advisor match sharti). Fee-based MAAI dasturi moliyalashtirishdan tashqari (alohida qayd). Internetda qolgan eski "fee-paying by default" talqini jonli sahifalar bilan mos kelmaydi — ishlatilmadi. Yozuv: `award` NULL `AED/month/variable`; GPA 3.0/3.5 dastur bo'yicha → `min_gpa` NULL, matnda; **`deadline_date=2026-12-15`** (`open`; Computational Biology 2027-01-22 raundlarda). Manba 3091.

### 956 — Tamim Scholarship, Doha Institute (Qatar, rel 10)

Doha Institute rasmiy Scholarships + Admission Requirements sahifalaridan: merit asosidagi flagman stipendiya; **xalqaro talabalar paketi — 100% tuition waiver + yotoqxona + oylik stipendiya + sug'urta** (stipendiya miqdori e'lon qilinmagan → `award` NULL `QAR/variable/variable`, `amount_usd_value=0`). Muhim ogohlantirish yozuvda birinchi o'rinda: o'qitish arab tilida — nomzod arab tilida akademik o'qish/tadqiqot qila olishi kerak (arab bo'lmaganlar og'zaki/yozma testdan o'tadi) + ingliz tili talabi dastur bo'yicha. Stipendiya admission dan keyin taklif qilinadi; 2027-28 qabuli 2026-09-01 da ochilgan → **`deadline_date=2027-01-15`**, `open`. Manba 3092.

## Bog'liqlik

Manbalar: 3090 (KAUST Fees & Funding), 3091 (MBZUAI Graduate Ph.D. Admissions), 3092 (DI Scholarships); linklar 954→3090, 955→3091, 956→3092. Uchala universitet (KAUST, MBZUAI, Doha Institute) `universities` jadvalida mavjud emas (tekshirildi) — `university_id` NULL qoldi, us qator yaratilmadi; universitet yozuvlarini yaratish keyingi alohida vazifa ro'yxatida (Singapore Management University bilan birga). INSERT'lar RETURNING bilan berildi; parallel bajarilish tartivi yana chalkashdi (954 KAUST, 955 MBZUAI, 956 Doha) — xaritalash RETURNING natijalari bo'yicha qotirildi.

## Hisoblagichlar va tekshiruv

- Faol: **537** (534 + 3) · Retired: **167** · Faol reliability-4: **50** · Kelajak deadline: **176** (173 + 3)
- `npm run typecheck`, `npm run check:i18n` o'tdi; `npm run test:render` — **✅ 337 passed, 0 failed**

## Halollik qaydi

Tozalash tugamadi: bazada hali ham 50 ta faol reliability-4 yozuv bor (eng kattalari: Belgium, Finland, France, Sweden — 4 tadan). Keyingi qadam — Pass 108.
