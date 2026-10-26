# SCHOLARSHIP_REWRITE_PASS_90_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 90 — Imperial College London klasteri: President’s PhD mukofotining noto‘g‘ri eligibility/deadline maydonlarini yangilash, nomlangan award bo‘lmagan ikki eski pointer’ni retire qilish va ularning university/source bog‘lanmalarini tozalash.

## 1. ID 22 — Imperial College President PhD Scholarship

- **Rasmiy URL:** `https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/` (fetch qilindi; fetcher faqat sahifa sarlavhasini chiqardi. Shu URL’ning Imperial rasmiy search-index natijasi scholarship tafsilotlarini ko‘rsatdi).
- **2027/28 mukofoti:** 50 ta o‘rin; 3,5 yil; to‘liq tuition; **GBP 27 036/yil stipendiya**; dastlabki 3 yil uchun **GBP 2 000/yil consumables**. `award_amount` faqat stipendiya stavkasi — tuition yoki consumables unga qo‘shilmadi. `amount_usd_value=0`.
- **Akademik talab:** bakalavr yoki integrated Master’s’da first-class/equivalent; yoki mustaqil Master’s’da distinction. Supervisor bilan oldindan kelishish kerak; faqat yangi PhD arizachilari. Xalqaro fuqarolikka taqiq yo‘q, ammo ayrim bo‘limlar xalqaro talabani moliyalashtira olmasligi mumkin.
- Oldingi `min_gpa=3.2` va `min_ielts=6.5` rasmiy scholarship sahifasida yo‘qligi sabab `NULL` qilindi; tanlangan PhD dasturining admission/language talablari qo‘llanadi. Alohida scholarship form yo‘q — PhD arizasi orqali bo‘lim nomzod ko‘rsatadi.
- **Uchta rasmiy round:** 2-noyabr-2026 (natija 31-yanvar-2027); 11-yanvar-2027 (natija 15-aprel); 1-mart-2027 (natija 31-may). Avvalgi “uchinchi round faqat uchinchi tomon manbasida” degan izoh rasmiy Imperial search-index dalili bilan tuzatildi. `deadline_date` birinchi, eng yaqin round sifatida 2-noyabr-2026; qolganlari `rounds` JSON’da.
- `source_reliability=9`: rasmiy sahifa bevosita fetch qilindi, ammo asosiy matn search-index ekstraktidan olindi.
- `university_scholarships` ID 488 endi GBP stipendiya, tuition va consumables qiymatlarini ko‘rsatadi.

## 2. ID 3 va 4 — eski Imperial placeholder’lari retire qilindi

- **ID 3** Imperial postgraduate scholarships sahifasini umumiy “named award unconfirmed” yozuvi sifatida ko‘rsatgan; fetch qilingan sahifa faqat heading berdi. Bu alohida scholarship emasligi va Prezident PhD award’i ID 22’da alohida mavjudligi sabab ID 3 `is_active=false` qilindi. Uning scholarship-index source mapping’i ID 22’ga ko‘chirildi; `university_scholarships` ID 640 olib tashlandi.
- **ID 4** “President’s Undergraduate Scholarship” degan current/university-wide mukofot sifatida tasdiqlanmadi: scholarship sahifasi va eski UG index 404 qaytardi. Fetch qilingan Imperial News maqolasi faqat **2015-yilda EEE bo‘limida** olti President’s Undergraduate award bo‘lganini va o‘sha yili GBP 1 000/yil to‘langanini ko‘rsatadi. Bu 2026/27 xalqaro mukofot mavjudligini isbotlamaydi. ID 4 tarixiy yozuv sifatida `is_active=false` qilindi; USD miqdori saqlanmadi. `university_scholarships` ID 485 olib tashlandi; 2015-yilgi source retired yozuvda audit uchun qoldi.
- Shu bilan birga Caltech singari holatda, `is_active=false` satrlari o‘chirilmadi — eski ID/reference’lar saqlanadi.

## 3. Yangi award bosqichiga keyingi nomzod

Tozalash tugamaganligi sababli bu pass’da yangi scholarship qo‘shilmadi. Lekin Imperial’ning rasmiy sahifasi **Imperial Inspires Scholarships (2027 entry)** dasturini ko‘rsatadi: kamida 300 ta, GBP 15 000/yil, international/Overseas fee status, bakalavriat va tanlangan taught postgraduate kurslar. Rasmiy sahifa: `https://www.imperial.ac.uk/study/fees-and-funding/imperial-inspires-scholarships/` (fetch qilindi). Bu yangi, alohida mukofot — eski President’s Undergraduate Scholarship bilan aralashtirilmadi. Qo‘shish bosqichida kurs bo‘yicha eligibility va rounds’ni yana tekshirib, ikki jadvalga kiritish kerak.

## 4. Yakuniy Supabase nazorati

| Ko‘rsatkich | Pass 90 yakuni |
|---|---:|
| Faol scholarships | 547 |
| Retired | 120 |
| Active `source_reliability = 4` | 135 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` | 27 |
| Kelajakdagi `deadline_date` | 153 |
| Template tavsiflar | 0 |

Imperial uchun bitta faol PhD package (ID 22) bor; alohida bakalavr need-based aid ID 19 o‘zicha qoldi. ID 3/4’da saved-scholarship va decision referencelari yo‘qligi tekshirildi. ID 3’ning scholarship-index source mapping’i ID 22’ga ko‘chirildi, ID 4’ning 2015 tarixiy manbasi o‘zida qoldi; ikkala No/unavailable university association olib tashlandi. Source yozuvlari yangilandi.

**Tekshiruvlar:** `tsc --noEmit`, `check:i18n` va `test:render` (**337/337**) muvaffaqiyatli. Source code o‘zgarmadi. SQL va hujjat: `supabase/scholarship_rewrite_pass90_2026-10-26.sql`, `docs/SCHOLARSHIP_REWRITE_PASS_90_2026-10-26.md`.

**Keyingi navbat:** 135 ta faol `source_reliability=4` qatorni rasmiy manbalar bo‘yicha klasterlab davom ettirish. Xatolar/eskirganlar to‘liq tugamagani uchun yangi international scholarship qo‘shish navbati hali boshlanmadi; Imperial Inspires ro‘yxatda saqlandi.
