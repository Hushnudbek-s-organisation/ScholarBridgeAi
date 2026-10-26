# Stipendiyalarni boyitish — 6-to'plam (2026-10-26)

## Maqsad

Har yili takrorlanadigan (annually-recurring) xalqaro stipendiya dasturlarining navbatdagi auditi: katalogda yo'q, O'zbekiston fuqarolari qatnasha oladigan dasturlarni rasmiy manbalardan birinchi qo'ldan tekshirib qo'shish; allaqachon mavjudlarini aniqlash; O'zbekiston uchun yopiq dasturlarni sababi bilan hujjatlashtirish (bazaga yozuv kiritmasdan).

Tekshiruv qoidalari avvalgidek: faqat rasmiy dastur sayti manba bo'ladi (agregatorlar faqat dasturlarni topishda ishlatilgan); miqdor va deadline uydirilmaydi; darajalanuvchi (tiered) yoki xarajatga qarab o'zgaruvchi mukofotlarda `award_amount = NULL` yozilib, barcha tariflar matnda ko'rsatiladi; AQSh dollaridan boshqa valyutalardagi mukofotlarda `amount_usd_value = 0`; o'tib ketgan raundlarda `deadline_date = NULL` + `not_published` + `rounds` JSON.

## Audit natijasi (11 nomzod)

### Qo'shildi — 8 ta (id 918–925, barchasi `source_reliability = 10`, `verified`)

| id | Dastur | Asosiy faktlar (rasmiy manbadan) |
|---|---|---|
| 918 | RMIT Vice Chancellor's PhD Scholarship (VCPS), Avstraliya | PhD; stipendiya **AUD 48,299/yil**, tadqiqot yordami AUD 5,000/yil, xalqaro talabalarga RRITFS (to'liq tuition) + OSHC; yiliga 10 ta mukofot; 2027-boshlash uchun xalqaro muddatlar o'tib ketgan (EOI 2026-08-30, to'liq ariza 2026-09-30) → deadline NULL/closed. RMIT 2027-raund ma'lumoti 2026 oxirida e'lon qilinishini yozgan — miqdor "eng so'nggi e'lon qilingan tarif" sifatida saqlandi. |
| 919 | UTS President's Scholarship (UTSP), Avstraliya | Xalqaro HDR (PhD/MRes); 2027-01-01 dan soliqlanmaydigan **AUD 40,500/yil** living allowance + OSHC (42/24 oy); **tuition qoplanmaydi** — ariza beruvchi bir vaqtning o'zida UTS International Research Scholarship (id 373) uchun ham ko'rib chiqiladi; so'nggi raund 2026-09-07 → 2026-10-07 (yopilgan). |
| 920 | JDS — O'zbekiston (Yaponiya hukumat granti, JICA/JICE) | **Hozir ochiq:** 2027–2029 o'quv yillari, ingliz tilidagi 2 yillik magistratura, yiliga 18 kishi; faqat Target Organization to'liq stavka xodimlari; yosh 25–40 (2027-04-01 holatiga); IELTS ≥ 5.0 (rasmiy yagona raqam — `min_ielts = 5.0`); **deadline 2026-12-20** (tavsiya ro'yxatlari 2026-12-06 gacha); qaytib kelib ≥3 yil ishlash majburiyati. Stipendiya naqd miqdori O'zbekiston sahifalarida e'lon qilinmagan → `award_amount = NULL` (uydirilmadi). |
| 921 | ADB-Japan Scholarship Program (ADB-JSP) | Magistratura; 27 ta belgilangan institut (17 tasi Yaponiyada); **O'zbekiston rasmiy ro'yxatda aniq ko'rsatilgan** (ADB borrowing member + Yaponiya ODA); to'liq tuition + oylik subsistence + kitob + tibbiy sug'urta + travel; bakalavrdan keyin ≥2 yil ish tajribasi, yosh ≤35; deadline institutga qarab → NULL/not_published; miqdor xarajatga bog'liq → NULL. |
| 922 | Swedish Institute Scholarship for Global Professionals | Magistratura (Governance, Public Health, Entrepreneurship & Innovation, STEM); **O'zbekiston 34 mamlakatlik rasmiy ro'yxatda**; to'liq tuition + **SEK 12,000/oy** + bir martalik SEK 15,000 travel grant; O'zbekistonliklarga ≥3,000 soat ish tajribasi + leadership talabi; **deadline 2027-02-24** (portal 8–24 fevral, avval UniversityAdmissions.se orqali 2027-01-15 gacha ariza). |
| 923 | KOICA Scholarship Program (CIAT), Koreya | Davlat xizmatchilari uchun (hukumat nominatsiyasi majburiy); **O'zbekiston 2027-yilgi 97 mamlakatlik designated-country ro'yxatida**; magistratura ~17 oy / doktorantura 36 oy; to'liq tuition + **KRW 1,200,000/oy** + aviachipta + yotoqxona + settlement/completion grantlari + sug'urta (2027 rasmiy guideline jadvalidan); 2027-intake arizalari 2026-yil iyulda yopilgan → deadline NULL/closed. |
| 924 | Hubert H. Humphrey Fellowship (Fulbright, non-degree), AQSh | O'rta bo'g'indagi mutaxassislar uchun 10 oylik **non-degree** fellowship; AQSh elchixonasining O'zbekiston chaqirig'i mavjud; birinchi daraja + ≥5 yil to'liq ish tajribasi + boshqaruv/siyosat mas'uliyati; ingliz tili bo'sag'asi TOEFL 72 / Duolingo 100 / IELTS 6.0 ekvivalenti (ko'p testli ekvivalent → `min_ielts = NULL`); tuition/fees + living (shaharga qarab) + aviachipta + sug'urta + professional development allowance; so'nggi deadline 2026-07-03 (o'tgan) → NULL/closed. Topilish qulayligi uchun `degree_levels` da Master yozilgan, sarlavha va matnda non-degree ekani aniq ko'rsatilgan. |
| 925 | Government of Ireland GOI-IES | NFQ 9/10 (magistratura, PG diploma, PhD), 1 yil; yiliga 60 ta; **EUR 10,000** stipendiya + qabul qiluvchi universitetning to'liq fee waiveri; eligibilik "domiciliary of origin EU/EEA/CH/UK dan tashqari" qoidasi bilan — **O'zbekiston qatnasha oladi** (faqat RU/BY chiqarilgan); oldindan conditional/final offer shart; 2026 chaqirig'i 2026-03-12 yopilgan → NULL/closed. |

Yon jadvallar: `university_scholarships` ga 2 ta yozuv qo'shildi — 672 (RMIT, universitet 109, `AUD 48299 year`, covers_tuition = true) va 673 (UTS, universitet 169, `AUD 40500 year`, covers_tuition = **false**). `sources` ga 3053–3060, `scholarship_sources` ga 8 ta official bog'lanish qo'shildi; har bir bog'lanish URL = `website_url` tengligi bilan tekshirildi (8/8 mos).

### Allaqachon mavjud — 1 ta

- **Türkiye Scholarships (Türkiye Bursları)** — id 865, faol, `source_reliability = 8`, deadline 2027-02-20 (estimated/upcoming). Ushbu to'plamda o'zgartirilmadi. (Avvalgi qidiruv `Bursları` dagi nuqtasiz "ı" harfi sababli yozuvni topolmagan edi — diacritic'lar bo'yicha saboq qayd etildi.)

### Rad etildi — 2 ta (bazaga yozuv qo'shilmadi)

- **VLIR-UOS (Belgiya)** — rasmiy country list (29 mamlakat: Afrika, Lotin Amerikasi, Janubi-Sharqiy Osiyo) da O'zbekiston/Markaziy Osiyo yo'q. O'zbekiston fuqarolari qatnasha olmaydi.
- **Invest Your Talent in Italy** — rasmiy joriy chaqiruvning 23 mamlakatlik ro'yxatida O'zbekiston yo'q (Qozog'iston bor). O'zbekiston avvalgi yillar ro'yxatida bo'lgan (2023/24 chaqiruvi bo'yicha dalil bor), lekin joriy chaqiruvda yo'q — ro'yxat o'zgarsa qayta ko'rib chiqiladi.

## Batch 5 dagi xato tuzatildi

URL bo'yicha tekshiruv tasdiqladi: `sources` 3045 = kas.de, 3046 = scholarships.sk — batch 5 da parallel INSERT natijalarining tartibi bo'yicha bog'lanishlar **teskari** qilingan edi (913 Slovak ↔ KAS sahifasi, 914 KAS ↔ Slovak sahifasi). Ushbu to'plamda `scholarship_sources` tuzatildi: 913 → 3046, 914 → 3045. Batch 5 SQL fayliga errata izohi qo'shildi. Qoida yana mustahkamlandi: parallel INSERT natijalarini o'rni bo'yicha moslashtirib bo'lmaydi — bog'lashdan oldin har doim title/URL bo'yicha qayta SELECT qilinadi (bu to'plamda 918/919 ham avvaliga teskari taxmin qilingan edi; qayta SELECT to'g'ri juftlikni berdi: 918 = RMIT, 919 = UTS).

## Hisoblagichlar (hard-check, 2026-10-26)

| Ko'rsatkich | Pass 99 dan keyin | Batch 6 dan keyin |
|---|---|---|
| Faol yozuvlar | 536 | **544** (+8) |
| Faol rel=4 (tekshirilmagan importer) | 107 | 107 (o'zgarmadi) |
| Kelajakdagi deadline lar (`> 2026-10-26`) | 161 | **163** (+2: JDS 2026-12-20, SI 2027-02-24) |

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — xatosiz
- `npm run check:i18n` — passed
- `npm run test:render` — 337/337 passed

## Rostgo'y izoh

Katalog tozalash ishlari **tugagani yo'q**: bazada hali ham 107 ta tekshirilmagan (rel=4) faol yozuv bor — keyingi navbatdagi cleanup pass aynan shular bilan ishlaydi. Ushbu to'plam faqat qo'shimchalar to'plami (navbatma-navbat reja bo'yicha cleanup ↔ additions).

## Keyingi qadam (reja bo'yicha)

Cleanup pass 100: rel=4 yozuvlarining keyingi guruhi Avstraliyadan tashqari klasterdan (Avstraliya klasteri pass 99 bilan yopilgan: AU rel4 = 0).
