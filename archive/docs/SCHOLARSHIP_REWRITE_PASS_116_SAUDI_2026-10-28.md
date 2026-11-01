# Stipendiyalar tozalash — Pass 116 (2026-10-28, Saudi Arabia)

**Kontekst.** 22-partiyadan keyingi tozalash navbati: oxirgi 2 qatorli rel-4 klasterlardan biri — Saudi Arabia (KFUPM 454 + Study in Saudi portali 859). Saqlangan ikkala URL ham (`postgrad.kfupm.edu.sa/scholarships`, `studyinsaudi.moe.gov.sa`) fetch bo'lmadi, shuning uchun avval web-qidiruv bilan joriy rasmiy sahifalar topildi: KFUPM bitiruvchilari endi **CGIS** (College of Graduate & Interdisciplinary Studies) saytida (`cgis.kfupm.edu.sa`), portal esa rasmiy `studyinsaudi.sa` manzilida o'qildi. Jami 6 ta rasmiy sahifa o'qildi: CGIS "KFUPM Scholarship" sahifasi, CGIS admission requirements, CGIS bosh sahifasi (ariza oynasi), bosh saytdagi "Tuition costs and Scholarships" (international students), bosh saytdagi MS/PhD dasturlari sahifasi va Study in Saudi bosh sahifasi (EN + AR).

| # | ID | Qaror | Natija |
|---|----|-------|--------|
| 1 | 454 | **Qayta yozildi → rel 10** "KFUPM Scholarship (Full MS & PhD Scholarship)" | To'liq paket: stipendiya (kategoriyaga ko'ra) + o'qish to'lovi yo'q + tekin turar-joy + avia chipta (xalqaro talabalar) + tibbiyot + subsidiyalangan ovqat + darsliklar; `deadline_date=2026-12-15`/`fixed`, `upcoming` (oyna 2026-11-01 dan) |
| 2 | 859 | **Nafaqaga chiqarildi** (portal/katalog qoidasi) | "Study in Saudi" — 50+ universitetga yagona ariza portali, 3 moliyalashtirish yo'nalishi (to'liq/qisman stipendiyalar + o'z hisobidan); bitta stipendiya emas |

## Qarorlar mantiqi

- **454 (KFUPM).** Rasmiy nomi — "KFUPM Scholarship" (saqlangan sarlavha shu nom bilan boshlab qayta yozildi). CGIS sahifasi: yuqori GPA bilan ajralib turuvchi bitiruvchi-abituriyentlar full-time MS/PhD talaba sifatida to'liq stipendiya bilan qabul qilinadi; stipendiyalar **barcha PhD dasturlari va PhD–Direct Entry** uchun; bosh sayt qo'shadi: doktorantura muqobili bo'lmagan **ayrim (select) thesis-MS dasturlari** uchun ham. Paket: kategoriyaga ko'ra stipendiya (**summa sahifalarda chop etilmagan — uydirilmadi**, shuning uchun `award_amount=NULL`, SAR, `variable`), tekin jihozlangan konditsionerli kampus turar-joyi (kommunal + ta'mirlash bilan), xalqaro talabalar uchun avia chiptalar, tibbiy/stomatologik xizmat, subsidiyalangan ovqat, tekin darsliklar, o'qish to'lovi **yo'q**; RA-MS/RA-PhD imkoniyatlari, shartlar asosida konferensiya moliyalashtirish. Muhim noziklik: Direct PhD 5 yil, to'liq stipendiya — **dastlabki 4 yil**. Qabul talablari yagona va aniq: **GPA ≥ 3.00/4.00** (MS da aynan "stipendiya abituriyentlari uchun" deb belgilangan; stipendiyasizlar uchun 2.50; PhD da ikkala diplomda ham 3.00) — yagona rasmiy, shkala-aniq raqam bo'lgani uchun `min_gpa=3.00` yozildi (bazadagi mavjud `min_gpa` qiymatlari ham 4.0-shkalada ekani tekshirildi). Ingliz tili darajaga qarab farqlanadi (MS: IELTS 6.0 / TOEFL iBT 70 / Duolingo 105; PhD+Direct: IELTS 6.5 / iBT 80 / Duolingo 120; KFUPM va ingliz tilida so'zlashuv 5 davlat bitiruvchilariga imtiyoz; TOEFL kodi 0868) → `min_ielts=NULL`, matnda. **Deadline:** CGIS bosh sahifasi jonli oynani ko'rsatadi — MS (Thesis-Based) + PhD: **2026-yil 1-noyabr — 15-dekabr** → `deadline_date=2026-12-15`/`fixed`, holat `upcoming` (oyna hali ochilmagan). Stipendiya alohida ariza emas — qabul ichida ko'rib chiqiladi. Yon sinxronizatsiya: manba **2553** (faqat 454 ga tegishli, tekshirildi) yalang'och `kfupm.edu.sa` dan CGIS sahifasiga yo'naltirildi; us **598** yangilandi.
- **608 haqida topilma (bu passda tegilmadi).** us so'rovi aniqladi: **608** "KFUPM International Undergraduate Scholarship" (Bachelor, rel 8, faol) alohida bakalavr sxemasi ekan — 454 dublikat emas (bosh sayt ham UG to'liq stipendiyasini alohida tasdiqlaydi). Kelajakda rel-8 → 10 verifikatsiyasi nomzod: uning us qatori 67 importer-uslubidagi eski matnlarni saqlaydi ("Yes", "Full Ride…").
- **859 (Study in Saudi).** Saqlangan sarlavhaning o'zi ham iqror edi: "(multiple award types)". Rasmiy portal (hukumat sayti, DGA ro'yxatida) talabaga profil to'ldirib, 50+ davlat/xususiy universitet dasturlariga ariza berish imkonini beradi; moliyalashtirish uch yo'nalish: Fully Funded Scholarships, Partially Funded Scholarships, Self-Funded Programs; shartlarni har bir muassasa/dastur belgilaydi; oynalar semestrga qarab o'zgaradi. Bu bitta nomli mukofot emas → katalog qoidasiga ko'ra nafaqaga chiqarildi. Saudi yo'nalishlari muassasa darajasidagi yozuvlar orqali qoladi (454, 608; kelajakda KAUST kabi yozuvlarga universitet backlinklari). us/mansab qatorlari yo'q edi — sinxronizatsiya talab qilinmadi.
- Qo'llanilgan standart qoidalar: chop etilmagan stipendiya summasi **uydirilmadi** (aggregator raqamlari import qilinmadi); SAR summa yo'qligida `amount_usd_value=0`; rasmiy kelajak sana bor joyda `fixed` ishlatildi (454).

## Tasdiqlangan hisoblagichlar (passdan keyin)

| Ko'rsatkich | 22-partiyadan keyin | Pass 116 dan keyin |
|---|---|---|
| Faol stipendiyalar | 549 | **548** (−1, 859 nafaqada) |
| Nafaqaga chiqarilgan | 179 | **180** |
| Faol rel-4 | 23 | **21** (Saudi Arabia: **0**) |
| Kelajakdagi deadlinelar | 194 | **195** (454: 2026-12-15) |
| Max ID / manba / us | 980 / 3113 / 705 | o'zgarmagan |

Alomat: to'rtta yozuv ham `RETURNING` bilan tasdiqlangan (454 rel 10; 859 `is_active=false`; manba 2553 yangi URL; us 598). `npm run typecheck`, `check:i18n`, `test:render` — toza (337/337). Replay: `supabase/scholarship_rewrite_pass116_saudi_2026-10-28.sql`.

**Ish muhiti eslatmasi:** turn boshida sandbox git-reset yana takrorlandi (HEAD `b6085bb`, 82 untracked fayl) — barcha fayllar origin bloblar bilan byte-identik ekani `cmp` bilan tasdiqlanib, xavfsiz tiklandi (`reset --hard origin/...` → `4c1ba48`).

## Keyingi qadam

Boyitish 23-partiya, so'ng Pass 117: qolgan 2 qatorli rel-4 klasterlar (Chile UC 467/879; India IIT 397/477; Mexico 343/402; Norway 346/424; UAE 501/848 — jami faol rel-4 endi 21). Kelajak nomzodlar: 608 KFUPM UG verifikatsiyasi (rel 8 → 10); Stockholm Trio + Stockholm University ICAL SAS/SAA; eksternal universitetlar yaratish (Innsbruck 432, Tampere 965, LUT 964, Roskilde 972, SDU 973, SMU 396, KAUST/MBZUAI/Doha 954/955/956, Adelaide+328, Flinders+442, Simon Fraser/Manitoba/UVic — 446 NULL qoladi); 31/849, 44/554, UBC 49/65 deduplikatsiyalari; us `verification_status` ↔ UI ko'rinishi.
