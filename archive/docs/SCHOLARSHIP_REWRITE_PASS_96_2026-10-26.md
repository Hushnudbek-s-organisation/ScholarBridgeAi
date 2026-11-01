# SCHOLARSHIP_REWRITE_PASS_96_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/a496ffaa-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 96 Avstraliya klasterining uchinchi batchi: UWA (319) qayta yozildi; Adelaide atrofidagi ikki legacy yozuv (328, 360) **universitetlar birlashuvi** sabab alohida hal qilindi — University of Adelaide va University of South Australia 2026-yil yanvaridan yagona **Adelaide University**ga birlashgan.

## 1. Qayta yozilgan yozuvlar

| ID | Award | Rasmiy sahifadan tasdiqlangani |
|---:|---|---|
| 319 | UWA Research Training Program (RTP) Stipend Scholarship | 2027 qiymati **AUD 39 253/yil** living allowance, raqobat asosida, cheklangan sonda. Tuition alohida komponent (International RTP Tuition Fees Offset) — sahifada qiymati berilmagani uchun saqlanmadi. 2027 International Round **2026-09-15 da yopilgan** → `deadline_date=NULL`, `not_published`, `application_status='closed'`; roundlar taqvimi `rounds` maydonida. Importdagi sarlavha coursework uchun mo'ljallangan alohida **Global Excellence** awardini HDR qatoriga noto'g'ri birlashtirgan edi — sarlavha tuzatildi, Global Excellence bu yozuvga kirmaydi. |
| 328 | Adelaide University Research Scholarships (RTPS and AURS) | Voris yozuv. Rasmiy Conditions of Award (May 2026 reviziya): 2026 full-time stipend **AUD 36 500/yil**, tax-exempt, 3.5 yilgacha; **100% tuition fee waiver** (standart muddat); single OSHC (MPhil 30 oy / PhD 54 oy), relocation AUD 1 500 gacha. Roundlar alohida: Talent Scheme (international faqat AU/NZ kvalifikatsiya bilan!), SRT project round (barcha international uchun ochiq, EOI 2027-08-31 → 2027-09-30). |

## 2. Retire qilingan yozuv

| ID | Sabab |
|---:|---|
| 360 | UniSA alohida universitet sifatida tugagan: rasmiy UniSA sahifasi fetch qilinganda universitetning o'z **404 transition notice**i chiqdi ("transition from the University of South Australia website to Adelaide University... pages have been removed or relocated"). Voris sxema (RTPS/AURS) 328 da **bitta** yozuv sifatida qoldirildi — bir xil vorisni ikki marta yozishdan qochdik. `source_reliability=9`, source mapping audit uchun saqlandi. |

## 3. Ehtiyotkor qarorlar

- **328 deadline:** hozir ochiq Talent Scheme Round 1 (2026-11-02) offshore o'zbek abituriyentlariga **ochiq emas** (AU/NZ kvalifikatsiya sharti). Shuning uchun `deadline_date` qilib umumiy international uchun keyingi ochiq imkoniyat — SRT EOI yopilishi **2027-09-30** olindi; `application_status='upcoming'`. Barcha roundlar `rounds` maydonida to'liq.
- **328 bog'lanma:** `provider` "Adelaide University"ga yangilandi; katalogda Adelaide University universitet yozuvi hali yo'qligi uchun legacy University of Adelaide (191) bog'lanmasi (575) va `university_id` olib tashlandi. Katalogga Adelaide University qo'shilganda qayta bog'lanadi.
- **319:** stipend tenure raqamlari sahifada berilmagani uchun yozilmadi; tuition offset qiymati ham e'lon qilinmagan — taxmin qilinmadi.
- Uchtasida ham `saved_scholarships`/`scholarship_decisions` reference yo'qligi tekshirilgan (0/0); AUD awardlarda `amount_usd_value=0`; raqamli GPA/IELTS chegarasi yo'q — NULL.

## 4. Yakuniy Supabase nazorati

| Ko'rsatkich | Pass 96 yakuni |
|---|---:|
| Faol scholarships | 535 |
| Retired | 132 |
| Active `source_reliability = 4` | 115 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` (faollarda) | 26 |
| Kelajakdagi `deadline_date` | 157 |

**Tekshiruvlar:** Supabase hard-check bilan counterlar tasdiqlandi; `tsc --noEmit`, `check:i18n`, `test:render` muvaffaqiyatli (source-code o'zgarmadi). Hujjat va SQL: `docs/SCHOLARSHIP_REWRITE_PASS_96_2026-10-26.md`, `supabase/scholarship_rewrite_pass96_2026-10-26.sql`.

**Keyingi navbat:** Deakin (370), Macquarie (372), UTS (373), RMIT (382), Curtin (438), Newcastle AU (439), UOW (440), Flinders (442). Hali **115 ta** faol `reliability=4` yozuv qolmoqda. Alohida kelajakdagi ish: universitetlar katalogiga Adelaide University yozuvini qo'shish va 328 ni bog'lash.
