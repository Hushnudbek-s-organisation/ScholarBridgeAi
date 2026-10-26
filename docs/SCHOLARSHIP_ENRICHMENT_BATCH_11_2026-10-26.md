# Batch 11 (Qo'shimchalar) — 2026-10-26

**Natija: 2 ta yozuv qo'shildi (946, 947), 2 ta nomzod rad etildi (NZIDRS, ACIS).**

## Muhim jarayon eslatmasi
Oldingi javobda "Batch 11 yakunlandi" degan xulosa berilgan edi, ammo shu qadam boshida o'tkazilgan tekshirish (git log, PR sarlavhasi, baza sanoglari) ko'rsatdiki, **o'sha ishlar amalda saqlanmagan**: commit ham, fayllar ham, baza yozuvlari (946–948) ham yo'q edi. Shuning uchun Batch 11 ushbu qadamda **boshidan, to'liq audit bilan qayta bajarildi** — va audit natijasi oldingi xulosadan farq qildi: NZIDRS ma'lum bo'lishicha to'xtatilgan dastur, ACIS esa alohida sxema sifatida mavjud emas (quyida). Faqat haqiqatan tekshirilgan sxemalar qo'shildi.

## Qo'shilgan yozuvlar

### 947 — AISG PhD Fellowship Programme (Singapur, rel 10)
- Manbalar: AI Singapore'ning rasmiy dastur sahifasi va **January 2027 Intake Application Guideline** (2026-08-19, PDF to'liq o'qildi).
- Shartlar: barcha millatlar ("no restriction on nominees' nationality"; SC/PR/ASEAN faqat ustuvor ko'rib chiqiladi — O'zbekiston ariza berishi mumkin); full local tuition + oyiga **«up to»** stipendiya: SC 6,700 / SPR 6,500 / boshqa millatlar **6,300 S$**; conference travel 8,000 S$'gate; 4 yilgacha; xalqaro fellow'larga **2 yillik** xizmat majburiyati; kamida 4 ta asosiy mualliflik top-tier nashr talabi.
- Yo'nalish: faqat ko'rsatilgan fakultetlar (NUS SoC + CDE Computer Engineering, NTU CCDS, SMU SCIS, SUTD ISTD); **universitet nominatsiyasi orqali** — avval PhD qabul.
- `award_amount` NULL (variable) — "up to" shiplari; Jan 2027 nominatsiya 2026-10-22 yopilgan → status `closed`, dedlayn NULL + rounds.
- Manba 3084; `university_id` NULL (4 universitetni qamraydi; 930 namunasi).

### 946 — International Chinese Language Teachers Scholarship (Xitoy, rel 10)
- Manba: CLEC'ning rasmiy **2026 Application Guidelines** (2026-yil yanvar; PDF to'liq o'qildi) + tirik ariza portali (cis.chinese.cn).
- Kategoriyalar: PhD (4 yil, HSK6 ≥200 + HSKK Adv ≥60 yoki HSK7), Magistrlik (2 yil, HSK5 ≥210 + HSKK Int ≥60), Bakalavr (4 yil, HSK4 ≥210 + HSKK Int ≥60), One-Year (11 oy), One-Semester (5 oy), Four-Week (guruhli). Yosh 16–35 (ishlab turgan o'qituvchilar 45'gacha).
- Qoplama: tuition + turar joy (kampusda bepul yoki 700/1,000 RMB oylik) + living allowance **2,500 / 3,000 / 3,500 RMB/oy** (darajaga qarab) + tibbiy sug'urta. Barcha Xitoy fuqarosi bo'lmaganlar uchun ochiq — mamlakatlar ro'yxati yo'q.
- `award_amount` NULL (variable); dedlaynlar yillik to'rtta (15-apr / 15-may / 15-sent / **31-oktabr 2026** — keyingisi, status `open`).
- Manba 3085; `university_id` NULL (ko'p host universitetlar).

## Rad etilgan nomzodlar

### NZIDRS (New Zealand International Doctoral Research Scholarship) — RAD ETILDI
- University of Auckland rasmiy yordam sahifasi: *"This scholarship is not currently being offered"*; mustaqil manbalar (2025–2026) dasturning yillardan beri yopiq ekanini, qayta ochilish sanasi tasdiqlanmaganini ko'rsatadi. To'xtatilgan dastur katalogga kiritilmaydi. (Oldingi javobdagi "NZ$30,696" va "2027'da qayta ochiladi" da'volari tekshirishda tasdiqlanmadi.)

### A*STAR ACIS — RAD ETILDI (alohida sxema emas)
- A*STAR'ning rasmiy saytidagi eski ACIS sahifasi **404**. Joriy rasmiy AGS sahifasi bitta yagona sxema — **A*STAR Graduate Scholarship** — ni to'rtta yo'nalish (STEM, Semiconductor, Quantum, **Computing**) va yagona ariza tsikllari (1-noy – 1-fev; 1-iyun – 10-avg) bilan beradi; specialized track stipendiyasi (xalqaro 5,000 S$) Computing'ni ham qamraydi. Ya'ni ACIS AGS tarkibiga singib ketgan va allaqachon **930-yozuv** (AGS, rel 10; eligible_majors ichida Computing bor) bilan qoplangan. Alohida yozuv dublikat bo'lardi.

## Yon jadvallar
- `sources`: 3084 (AISG), 3085 (CLEC) — URLlar `idx_sources_url`ga oldindan tekshirilgan.
- `scholarship_sources`: 947→3084, 946→3085.
- `university_scholarships` qatorlar qo'shilmadi: ikkala sxema ham ko'p universitetli (`university_id` NULL).

## Sanoglar
| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol | 531 | **533** |
| Pensionatsiya | 163 | 163 |
| Faol rel4 | 67 | 67 |
| Kelajak dedlaynlar | 168 | **169** |

Tekshiruvlar: `tsc --noEmit` ✅, `check:i18n` ✅, `test:render` **337/337** ✅. Uydirma miqdor yoki dedlayn kiritilmadi.

Replay SQL: `supabase/scholarship_enrichment_batch11_2026-10-26.sql`.

## Keyingi qadamlar
- **Pass 105 (cleanup):** Janubiy Koreya yoki Shveytsariya klasteri (6 tadan rel4); jami 67 rel4 qolmoqda.
- Kelajak nomzodlar: Confucius China Studies Program (NJU menyusidan kuzatilgan, baholanmagan), ZJU maktab darajasidagi sxemalar (past ustuvorlik).
- Kataloglashtirish navbati: SMU yozuvi + 396 ulash, Adelaide/Flinders, SFU/Manitoba/UVic, UBC 49/65, CSC dublikatlari (31/849, 44/554).
