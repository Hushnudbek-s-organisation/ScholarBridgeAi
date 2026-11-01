# Scholarship Rewrite Pass 99 — 2026-10-26

Avstraliya klateri **yopildi**: 440 Wollongong, 442 Flinders. Passdan keyin `country='Australia'` va reliability 4 bo'lgan active yozuv **qolmadi** (so'rov bilan tasdiqlandi). Ikkala yozuv rel 10 ga ko'tarildi.

## Ishlangan yozuvlar

| Id | Universitet | Yangi yozuv | Miqdor (rasmiy) | Deadline |
|---:|---|---|---:|---|
| 440 | Wollongong (uni 139) | University Postgraduate Award (UPA) | AUD 38,420/yil (2027 rate), stipend | 2027-05-23 (xalqaro) |
| 442 | Flinders (universitet rekordi bazada yo'q) | FIPRS | AUD 36,061/yil (2026 rate) + xalqaro tuition to'lanadi | Keyingi raund e'lon qilinmagan |

### 440 — UOW UPA

- **Manbalar:** uow.edu.au UPA va AGRTP listing sahifalari fet ch qilindi (eski saqlangan URL 404 edi).
- ⚠️ Hal qiluvchi farq: UOW da **AGRTP stipendiyasi faqat domestic** (AU/NZ fuqarosi yoki AU PR) deb ochiq yozilgan; xalqaro talabalar uchun yo'l — aynan **UPA** (talaba turi: Domestic + International). Ikkalasida bir xil $38,420 (2027) — AGRTP raqami xalqaro taklif sifatida ko'rsatilmadi.
- Stipendiya 2026 dagi eski keshdagi $36,943 emas — jonli sahifadagi **2027: $38,420** saqlandi. Davomiylik 3.5 yil (PhD) / 2 yil (MPhil); yillik main round: xalqaro 23-may, domestic 3-oktabr → `deadline_date='2027-05-23'`, `upcoming`.
- Tuition: UPA faqat living stipend; IPTA (tuition awards) alohida sxema — da'vo qilinmadi (`covers_tuition=false` us yozuvida ham).

### 442 — Flinders FIPRS

- **Manba:** flinders.edu.au FIPRS sahifasi (overview/benefits/eligibility/selection/application to'liq o'qildi).
- Universitetning o'z sxemasi (viza maqsadida Commonwealth Sponsored emas): xalqaro tuition to'lanadi + stipend AUD 36,061/yil (2026), 3.5 yilgacha; establishment allowance $1,485 gacha. AGRTPS arizachilari FIPRS ga avtomatik ko'rib chiqiladi.
- Juda raqobatbardosh: 5 tagacha publikatsiya ballanadi; "2026 da muvaffaqiyatli arizachilar 5 ta publikatsiya topshirgan" — foydalanuvchiga halol signal sifatida matnga kiritildi. Supervisor roziligi majburiy; English testi 2027-03-31 gacha valid bo'lishi shart bo'lgan.
- 2027-raund 2026-06-18 da yopilgan; keyingisi e'lon qilinmagan → `deadline_date=NULL`, `closed`.
- ⚠️ **Flinders University rekordi `universities` jadvalida mavjud emas** (tekshirildi) — `university_id` NULL qoldi, us bog'lanish yaratib bo'lmadi. Adelaide University (328) bilan birgalikda alohida kataloglash vazifasi: universitet rekordini qo'shish + bog'lash.

## Yon jadvallar

- `sources` 2675/2525 — bare domenlardan fet ch qilingan sahifalarga.
- us 536 (UOW) sinxronlandi: `AUD 38420 year`, `covers_tuition=false`.

## Hard check

| Ko'rsatkich | Pass 98 | Pass 99 |
|---|---:|---:|
| Active | 536 | 536 |
| Retired | 133 | 133 |
| Active reliability 4 | 109 | **107** |
| — Avstraliya ichida rel4 | 2 | **0** |
| `amount_usd_value > 5000` | 19 | 19 |
| Future `deadline_date` | 160 | **161** |
| Bare-domain active `website_url` | 26 | 26 |
| us "USD" satrlari | 34 | 34 |

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — o'tdi.
- `npm run check:i18n` — o'tdi.
- `npm run test:render` — 337/337 o'tdi.
- Kod o'zgarishi yo'q; faqat DB + doc/SQL replay.

## Keyingi qadam (foydalanuvchi rejasi bo'yicha)

Avstraliya klateri yopilgach, reja: **Batch 6 — har yili qabuli bor xalqaro grantlar** audit/qo'shish. Dastlabki mavjudlik tekshiruvi (title/provider bo'yicha, 2026-10-26): katalogda bor va tasdiqlangan — Chevening (888), Fulbright Uzbekistan (889), DAAD Study Scholarships (861), Erasmus Mundus (890), Eiffel (891), MEXT (906), CSC (866), GKS (863), JJ/WBGSP (892), Stipendium Hungaricum (860 + universitet variantlari), Knight-Hennessy (5), Schwarzman (32), Yenching (894), Swiss ESKAS (14). Kalit so'zlar bilan **topilmagan** nomzodlar (har biri rasmiy manba + O'zbekiston eligibility tekshiruvidan o'tishi shart, ba'zilari rad etilishi mumkin): Türkiye Scholarships (Burslari), JDS (Yaponiya), KOICA (Koreya), ADB-Japan Scholarship Program, Hubert H. Humphrey (AQSh), Swedish Institute Scholarships, VLIR-UOS (Belgiya), Australia Awards (eligibility shubhali — tekshiriladi), Government of Ireland GOI-IES, Invest Your Talent in Italy, DAAD EPOS (alohida trek sifatida), UTS President's Scholarship va RMIT VCPS (passlarda aniqlangan alohida yozuv nomzodlari). Commonwealth Scholarships ataylab ro'yxatda yo'q — O'zbekiston Hamdo'stlik a'zosi emas.
