# SCHOLARSHIP_REWRITE_PASS_95_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/a496ffaa-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 95 Avstraliya klasterini davom ettirdi. ANU (134), Monash MITS (141) va UQ (149) qatorlari avval faqat milliy RTP frameworkini yozib, "universitet sahifasi o'qilmagan" deb ochiq tan olgan `reliability=4` holatda edi. Endi uchala universitetning rasmiy sahifasi o'qilib, real named awardlar to'liq qayta yozildi va `source_reliability=10` ga ko'tarildi. **Hech narsa retire qilinmadi** — uchala award ham mavjudligi tasdiqlandi.

## 1. Qayta yozilgan yozuvlar

| ID | Award | Rasmiy sahifadan tasdiqlangani |
|---:|---|---|
| 134 | ANU — Australian Government Research Training Program (RTP) Stipend Scholarship | 2027 full-time base rate **AUD 40 475/yil**, fortnightly, 3.5 yil (+6 oy extension mumkin); travel/removal, thesis, dependant child (international only) allowance va paid leave — summalar e'lon qilinmagan, shuning uchun faqat stipend saqlandi (`coverage='Living Stipend'`). Sahifa international oluvchilarga RTP Fee Offset orqali OSHC reimbursement tilga oladi, lekin tuition qiymati berilmaydi — tuition saqlanmadi. Round 1 (international) har yili **31-avgust**, keyingisi 2027-08-31; Round 2 kichik round 15-aprelda yopiladi (sahifa fuqarolik bo'yicha ajratmaydi). Alohida scholarship application yo'q — HDR admission ichida tanlanadi. |
| 141 | Monash International Tuition Scholarship (MITS) | Award mavjud: course tuition fees + single OSHC, qiymati course fee'ga bog'liq (`award_amount` NULL, AUD, variable), `coverage='Full Tuition'`. Eski saqlangan `fees-enrolment` URL endi RTP Fees-Offset sahifasiga redirect qiladi; joriy sahifa `fees-scholarships/.../international-tuition-scholarship`. |
| 149 | UQ — Graduate Research School Scholarships (UQGRSS), includes RTP | Importdagi "UQGSRS" nomi va URL eskirgan (eski URL 404). Yangi sahifa: **AUD 39 220/yil** tax-free stipend (2026 rate, indexed), funding type "Living stipend, Tuition fees", single OSHC, 3.5 yil (+1 extension mumkin). EOI orqali, alohida application yo'q. |

## 2. Ehtiyotkor qarorlar (uydirma kiritilmadi)

- **141 (MITS) sana nomuvofiqligi:** rasmiy sahifaning sarlavha bloki "close 31 March and 31 July each year" deydi, "How to apply" bo'limi esa International Round 1 — **28 February** (2027 uchun oldinga surilgan), Round 3 — **31 August** deydi. `deadline_date=2027-02-28` qilib "How to apply" sanalari olindi, nomuvofiqlik notes'da ochiq belgilab qo'yildi.
- **149 (UQ) yopilgan round:** xalqaro round (RQ4 2027 / early 2028 boshlanishi) tekshiruvdan **bir hafta oldin**, 2026-10-19 da yopilgan; keyingi round sanalari UQ va'dasiga ko'ra 2026-yil oktabr oxirigacha e'lon qilinadi. Shu sabab `deadline_date=NULL`, `deadline_type='not_published'`, `application_status='closed'`; e'lon qilingan to'liq round taqvimlari `rounds` maydonida saqlandi. Yangi jadval chiqqach qayta tekshirish kerak.
- **134 (ANU):** Round 2 (15-aprel) kimlar uchunligi sahifada aytilmagan — `deadline_date` sifatida faqat international uchun aniq bo'lgan Round 1 sanasi (2027-08-31) olindi.
- Uchalasi ham AUD da to'lanadi: `amount_usd_value=0`; sahifalarda raqamli GPA/IELTS chegarasi yo'q: `min_gpa`/`min_ielts` NULL.
- `saved_scholarships`/`scholarship_decisions` da uchala ID bo'yicha reference yo'qligi tekshirildi (0/0). `university_scholarships` bog'lanmalari (565, 538, 546) awardlar tasdiqlangani uchun saqlandi; bare-domain source URLlar (anu.edu.au, monash.edu, uq.edu.au) fetch qilingan rasmiy sahifalarga yangilandi.

## 3. Yakuniy Supabase nazorati

| Ko'rsatkich | Pass 95 yakuni |
|---|---:|
| Faol scholarships | 536 |
| Retired | 131 |
| Active `source_reliability = 4` | 118 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` (faollarda) | 26 |
| Kelajakdagi `deadline_date` | 156 |

**Tekshiruvlar:** Supabase hard-check bilan uchala qator holati va yuqoridagi counterlar tasdiqlandi; `tsc --noEmit`, `check:i18n` va `test:render` muvaffaqiyatli (source-code o'zgarmadi). Hujjat va SQL: `docs/SCHOLARSHIP_REWRITE_PASS_95_2026-10-26.md`, `supabase/scholarship_rewrite_pass95_2026-10-26.sql`.

**Keyingi navbat:** Avstraliya qoldiqlari — UWA (319), Adelaide ASI (328), UniSA (360), Deakin (370), Macquarie (372), UTS (373), RMIT (382), Curtin (438), Newcastle AU (439), UOW (440), Flinders (442); keyin boshqa mamlakat klasterlari. Hali **118 ta** faol `reliability=4` yozuv qolmoqda; yangi international scholarship qo'shish cleanup tugagandan keyin boshlanadi.
