# SCHOLARSHIP_REWRITE_PASS_92_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 92’da York, Loughborough, Newcastle va Exeter postgraduate-research “scholarship” yozuvlari rasmiy funding indekslari bilan solishtirildi. Har biri bitta named award emas, bir nechta mustaqil funding yo‘llarining katalogi bo‘lgani uchun generic yozuvlar retire qilindi; hech bir miqdor yoki deadline taxmin qilinmadi.

## 1. Retire qilingan yozuvlar

| ID | Universitet | Rasmiy manba fetch qilindi | Sabab |
|---:|---|---|---|
| 355 | University of York | `https://www.york.ac.uk/study/postgraduate-research/funding/international/` | Sahifada White Rose DTP, Wolfson Humanities, Commonwealth hamda millat bo‘yicha cheklangan boshqa alohida scheme’lar bor. Bularni bitta “York PGR scholarship” deb birlashtirib bo‘lmaydi. |
| 359 | Loughborough | `https://www.lboro.ac.uk/study/postgraduate/fees-funding/research-degree-funding/` | Directory’da CSC, Commonwealth, alumni discount, Postgrad Solutions bursary va Schlumberger Foundation kabi turli sponsorlar bor. Bitta Loughborough umumiy doktorantura award’i emas. |
| 362 | Newcastle University | `https://www.ncl.ac.uk/postgraduate/fees-funding/funding-your-study/` | Umumiy funding sahifasi ko‘p scheme va research studentship’larni jamlaydi. Undagi 15% discount EU/EEA/Swiss fee-status guruhiga tegishli, O‘zbekiston uchun umumiy PhD award’i emas. |
| 364 | University of Exeter | `https://www.exeter.ac.uk/study/pg-research/funding/phdfunding/` | Sahifada UKRI, DTP, faculty va loyiha studentship’lari alohida. International o‘rinlar va shartlar har bir DTP/project bo‘yicha farq qiladi. |

To‘rtta yozuv `is_active=false` qilindi; eski USD miqdorlari va umumiy deadline’lar qaytarilmadi. `university_scholarships` jadvalidagi mos “No/unavailable” bog‘lanmalar (IDs 591, 594, 596, 597) olib tashlandi. Rasmiy source mapping’lar audit uchun saqlandi va `sources` URL’lari fetch qilingan sahifalarga yangilandi.

## 2. Keyin alohida tekshiriladigan imkoniyatlar

Directory’larda kelajakdagi alohida yozuvlar uchun nomzodlar ko‘rindi, lekin **pass 92’da yangi scholarship qo‘shilmadi**: hali 128 ta faol reliability-4 qator qolgan.

- York sahifasi White Rose Social Sciences DTP va Wolfson Humanities kabi named scheme’larni ko‘rsatadi.
- Loughborough sahifasi CSC, Commonwealth, Schlumberger Faculty for the Future va boshqa alohida funding yo‘llarini ko‘rsatadi.
- Exeter sahifasi DTP/UKRI va faculty/project studentship’larini ajratadi.

Bularni keyin har biri o‘z eligibility, miqdor, nationality sharti va deadline sahifasi bilan alohida yozish kerak; directory ma’lumotini bitta umumiy grantga birlashtirmaymiz.

## 3. Yakuniy Supabase nazorati

| Ko‘rsatkich | Pass 92 yakuni |
|---|---:|
| Faol scholarships | 540 |
| Retired | 127 |
| Active `source_reliability = 4` | 128 |
| Active `amount_usd_value > 5000` | 19 |
| Bare-domain `website_url` | 27 |
| Kelajakdagi `deadline_date` | 153 |
| Template tavsiflar | 0 |

**Tekshiruvlar:** Supabase hard-check bilan yuqoridagi counters tasdiqlandi. `tsc --noEmit`, `check:i18n` va `test:render` (**337/337**) muvaffaqiyatli; source-code o‘zgarmadi. `docs/SCHOLARSHIP_REWRITE_PASS_92_2026-10-26.md` va `supabase/scholarship_rewrite_pass92_2026-10-26.sql` o‘zgarishlarni qayta bajarish/audit qilish uchun saqlaydi.

**Keyingi navbat:** UK PGR qoldiqlarini davom ettirish, keyin reliability-4 boshqa mamlakat klasterlariga o‘tish. Yangi international scholarships qo‘shish navbati umumiy xatolar/eskirganlar tugagach boshlanadi.
