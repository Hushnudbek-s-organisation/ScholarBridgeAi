# SCHOLARSHIP_REWRITE_PASS_94_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/a496ffaa-scholarbridgeai` (hujjatlashtirish; DB yangilanishlari 2026-10-26 10:10–10:14 UTC qo'llanilgan)
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 94 Avstraliya klasteridan boshlandi: Monash (49), Melbourne (117) va Sydney (122) yozuvlari rasmiy scholarship sahifalari bo'yicha to'liq qayta yozilib `source_reliability=10` ga ko'tarildi; UNSW Scientia generic yozuvi (123) joriy 2027 project pool'i faqat domestic applicantlar uchun bo'lgani sabab xalqaro katalogdan retire qilindi.

**Audit izohi:** to'rt yozuvdagi DB o'zgarishlari 2026-10-26 kuni qo'llanilgan, biroq pass hujjati/SQL o'sha paytda repo'ga yozilmay qolgan edi. Ushbu hujjat va SQL bazadagi yakuniy holatdan qayta tiklandi, har bir qiymat rasmiy sahifalar bilan qayta solishtirildi. Bitta finalizatsiya tuzatishi ham kiritildi (quyida, ID 49).

## 1. Qayta yozilgan va tasdiqlangan yozuvlar

| ID | Award | Tasdiqlangan asosiy ma'lumot |
|---:|---|---|
| 49 | Monash International Merit Scholarship | 2026-yildan beriladigan awardlar uchun yiliga AUD 15 000, jami AUD 75 000 gacha; yiliga 20 ta; barcha davlatlardan international talabalar; unconditional offerdan keyin avtomatik ko'rib chiqish. Sahifa summaning tuition waiver yoki stipend ekanini aytmaydi — `coverage_type='Unspecified'`. |
| 117 | Melbourne Research Scholarship (Stipend and Fee Offset) | 2027 full-time rate: AUD 41 100/yil stipend (MRes 2 yil, PhD 3.5 yilgacha) + fee offset (MRes 2 yil, doctoral 4 yil); relocation AUD 2 000/3 000; single OSHC; jami 350 ta dastur bo'yicha; avtomatik ko'rib chiqish. Fee-offset-only variant alohida mavjudligi tavsifda aniq yozilgan. |
| 122 | University of Sydney International Stipend Scholarship (USYDIS) | 2027 rate: AUD 44 293/yil (2026: AUD 42 754) + relocation/thesis allowance (summasi e'lon qilinmagan). Alohida Sydney Tuition Fee Scholarship (100% tuition, 14 research periodgacha) USYDIS oluvchilarga avtomatik beriladi, lekin ushbu stipend yozuviga **birlashtirilmadi**. Keyingi deadline: 2026-12-18 (RP 3–4, 2027); barcha roundlar `rounds` maydonida. |

**ID 49 finalizatsiya tuzatishi:** yozuvning shu kundagi dastlabki varianti sahifa metadatasiga tayangan holda "WAM above 85 / no minimum ATAR" deb da'vo qilgan edi. Qayta tekshiruvda bu raqamlar rasmiy sahifa matnidan tasdiqlanmadi (sahifa faqat "based on academic achievement" deydi), shuning uchun da'vo description/requirements/notes dan olib tashlandi; `min_gpa` NULL qoladi.

## 2. Retire qilingan yozuv

| ID | Universitet | Qaror |
|---:|---|---|
| 123 | UNSW Sydney (Scientia PhD) | Rasmiy Scientia PhD Projects sahifasi 2027-yil uchun 20 ta fully-funded projectni **"domestic applicants"** deb e'lon qiladi; alohida project sahifasi (Digital Eye) ham domestic-only. Tarixiy FAQ international nomzodlarni tilga olgan bo'lsa-da, u joriy round shartlarini bekor qilmaydi. Yozuv `is_active=false`, `source_reliability=9` bilan retire qilindi; tasdiqlanmagan USD 46 000/yil da'vosini olib yurgan `university_scholarships` bog'lanmasi olib tashlandi, source mapping audit uchun saqlandi. Kelajakdagi round international uchun ochilsa, qayta baholanadi. |

## 3. Yakuniy Supabase nazorati (Pass 94 yakuni)

| Ko'rsatkich | Pass 94 yakuni |
|---|---:|
| Faol scholarships | 536 |
| Retired | 131 |
| Active `source_reliability = 4` | 121 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` (faollarda) | 26 |
| Kelajakdagi `deadline_date` | 154 |

**Tekshiruvlar:** to'rt yozuvning rasmiy sahifalari qayta fetch qilinib har bir raqam/deadline solishtirildi; Supabase hard-check counterlarni tasdiqladi. Source-code o'zgarmadi. Hujjat va SQL: `docs/SCHOLARSHIP_REWRITE_PASS_94_2026-10-26.md`, `supabase/scholarship_rewrite_pass94_2026-10-26.sql`.

**Keyingi navbat:** Avstraliya RTP qoldiqlari — universitet sahifasi o'qilmagan, faqat milliy framework yozilgan ANU (134), Monash MITS (141), UQ (149) va keyingi Avstraliya qatorlari.
