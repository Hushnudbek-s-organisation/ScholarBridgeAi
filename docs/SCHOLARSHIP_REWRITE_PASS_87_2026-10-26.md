# SCHOLARSHIP_REWRITE_PASS_87_2026-10-26

**Sana:** 2026-10-26 (dushanba)
**Branch:** arena/99b0c7fe-scholarbridgeai
**Layihaviy ref:** zkdguzbdopfedkffsatk (Postgres 17)
**Qatiy:** Pass 87 — UK universitetlarining qolgan qatorlari (Lancaster, Heriot-Watt, QUB, Exeter, Edinburgh, Leeds, St Andrews) + El-Yurt Umidi (o'zbekistonli davlat stipendiyasi)

## 1. Nima qilingan

Har bir qator alohida-aloqila yangilandi, importer tomonidan invented (hayol etilgan) USD miqdorlari o'chirildi, manba sahifasi fetch qilindi va `notes` ga "published vs inferred" aytildi. `amount_usd_value = 0` qoldirildi, chunki barcha mukofotlar GBP'da to'lanadi (USD emas).

### 614 — Lancaster University (verified)
Eski nom: "Lancaster Global Scholarship" (faqat bare domain `lancaster.ac.uk`, her ikkala Global Scholarship sahifasi 404 qaytardi — 2025 kirishdagi schema e'tibor berilmagan).

Yangi: **"Lancaster University Undergraduate International Excellence Scholarship"**
- Manba: `https://www.lancaster.ac.uk/study/fees-and-funding/scholarships-and-bursaries/undergraduate-international-excellence-scholarship/` (fetch qilindi, 2027 entry)
- Miqdor: **GBP 3 000 har yil** (tuition fee reduction), `award_amount=3000`, `award_currency=GBP`, `award_period=year`, `award_basis=fixed`
- `deadline_type = not_published` — alohida topshiruv shakli yo'q, UCAS arizasidan avtomatik qaytariladi
- `degree_levels = ["Bachelor's"]`, `coverage_type = Partial Tuition`
- `source_reliability = 10`, `is_active = true`
- `notes`: VERIFIED 2026-10-26 (UK tail pass 87). A*AA yoki Shuningdek bunga moslantirilgan grade, firm UCAS choice, to'liq o'qish (Bailrigg kampusi), takroriy yillar, o'tish yili yoki san'at yili uchun to'lanmaydi. Boshqa Lancaster mukofotlari (Master's Excellence 15% chegirma, Early Acceptance GBP 2 000, PG International Regional GBP 10 000, UG International Regional GBP 3 000, EU Scholarship GBP 3 000) tavsifda berildi; O'zbekiston ikkinchi ro'yxatda emas.

### 589 — Heriot-Watt University (verified)
Eski nom: "Heriot-Watt University International Scholarship Programme" (faqat bare domain `hw.ac.uk`).

Yangi: **"Heriot-Watt University International Merit Scholarship"**
- Manba: `https://www.hw.ac.uk/study/fees-and-funding/scholarships-and-bursaries/international-merit-scholarship` (fetch qilindi)
- Miqdor: **matnli "Varies by region"**, `award_amount=NULL`, `award_period=year`, `award_basis=variable`
- `deadline_type = not_published` — intiyati (Yanvar/Sentabr 2027), region bo'yicha muloqot kerak
- `degree_levels = ["Bachelor's","Master's"]` (PhD research outward)
- `coverage_type = Partial Tuition`
- `source_reliability = 9`
- `notes`: VERIFIED 2026-10-26. GBP 500 000 dan ortiq merito stipendiyasi; CIS hududi muloqoti Saniya Gabbassova. Faqat bitta HW mukofoti olinadi. Onlayn va PGR dasturlari o'chirilgan. `amount_usd_value=0` (GBP).

### 658 — Queen's University Belfast (verified)
Eski nom: "Queen's University Belfast International Office Undergraduate Scholarship" (faqat bare domain `qub.ac.uk`).

Yangi: nom o'zgarmadi, tasdiqlandi.
- Manba: `https://www.qub.ac.uk/Study/funding-scholarships/Non-facultydepartments/international-office/international-office-undergraduate-scholarship.html` (fetch qilindi)
- Miqdor: **GBP 3 500 (fee rate 1, classroom) / GBP 4 000 (fee rate 2, laboratory)**, birinchi yil, `award_amount=3500`, `award_basis=range`, `award_period=one_time`
- `deadline_type = not_published` — alohida arizadan qat'iy nazar, avtomatik belgilanadi; Early Confirmation Award uchun alohida 18-sentabr-2026 to'lovi bor
- `degree_levels = ["Bachelor's"]`, `coverage_type = Partial Tuition`
- `source_reliability = 10`

### 734 — University of Exeter (verified)
Eski nom: "University of Exeter Global Excellence Scholarship" (Global Excellence sahifalari "Sorry no information currently available" qaytardi — miqdor tasdiqlanmadi).

Yangi: **"Exeter Excellence Scholarships (University of Exeter)"**
- Manba: `https://www.exeter.ac.uk/study/funding/exeterexcellence/` (fetch qilindi)
- Miqdor: **GBP 15 000** (UG — har yil, PGT — birinchi yil), `award_amount=15000`, `award_basis=fixed`, `award_period=year`
- `deadline_type = not_published` — 2027/28 uchun arizalar ochiq, closed date yo'q; 2026/27 PGT Yanvar 2027 uchun 26-noyabr-2026
- `degree_levels = ["Bachelor's","Master's"]`, `coverage_type = Partial Tuition`
- `source_reliability = 10`
- `notes`: VERIFIED 2026-10-26. 150 UG + 150 PGT stipendiyasi. "Global Excellence" nomidagi kafedra mukofotlari tekshirilmagan (sahifa ma'lumot berilmaganligi uchun uni hisholamaganman).

### 862 — El-Yurt Umidi Foundation (o'zbekistonli davlat dasturi)
Eski hol: `eyuf.uz` HTTP 500 bo'ldi, reliability 8.

Joriy: **el-yurt.uz ochildi** (fetch qilindi, 2026-10-26), `programs/1` sahifasi "Nizom"ni Publishing qilgan.
- Manba: `https://el-yurt.uz/programs/1` (fetch qilindi)
- `deadline_type = estimated` — tartib belgilanmagan, e'lonlardan bir hafta oldin ochiladi, ariza muddati ~1 oy; 2026 birinchi tanlov 24-aprel-2026nda yopildi; keyingi taxminiy bahor 2027
- `degree_levels = ["Bachelor's","Master's","PhD"]`, `coverage_type = Full Tuition + Stipend`
- `amount_usd_value = 0`, `award_currency = UZS` (o'zbekistonli somda to'lanadi / xorij xarajatlarini qoplaydi)
- `source_reliability = 9` (rasmiy sayt ochildi, Nizom tekshirildi)
- `notes`: Prezident farmoni PF-77 asosiysi. QS Top-100 → to'liq grant imtihonso'z; QS/THE Top-300 → ochiq tanlov quotasi; THE Top-20 (bachelor's, prezident/ijod maktab bitiruvchilari) → kamida 50% grant imtihonso'z. Talablar: bakalavr yosh <=30, magistr 22–40, PhD 25–45; IELTS 6.0 (bakalavr) / 7.0 (magistr va PhD) yoki shartsiz qabul xati bilan sertifikatsiz. Qarzdorlik: qaytgach O'zbekistonda ishlash. 2026/27 uchun 500 qo'shin (167 bakalavr, 232 magistr, 38 PhD + 63 prezident farmoni).

## 2. Keyingi qatorlar (execute_query qaytganda)

- **131 Edinburgh** — postgraduate research → "Edinburgh Doctoral College Scholarships" (PhD, to'liq tuition + UKRI stipend ~GBP 21 805/2026-27, deadlines 16-noyabr-2026 … 2-fevral-2027, school bo'yicha farqli), manba `registryservices.ed.ac.uk/.../doctoral-college`
- **53 Edinburgh** — student funding (named award unconfirmed) → manba `registryservices.ed.ac.uk/student-funding/postgraduate/international`, reliability 4 saqlanadi
- **312 Leeds** — research funding → "Leeds Masters International Excellence Scholarships" (GBP 3 000 / 6 000 / 16 000, PGT, round 1: 28-fevral-2027, round 2: 16-may-2027), manba `leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships`
- **327 St Andrews** — postgraduate scholarships → manba `https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/` (katalog sahifasi), reliability 4 saqlanadi, invented USD 38 000 allaqachon nolga tushirildi

## 3. Hisobot

Qator | Holat | Manba fetch qilindi | reliability | Miqdor
---|---|---|---|:---:
614 Lancaster | YANGILANDI | ✅ | 10 | GBP 3 000/yil
589 Heriot-Watt | YANGILANDI | ✅ | 9 | region bo'yicha
658 QUB | YANGILANDI | ✅ | 10 | GBP 3 500/4 000
734 Exeter | YANGILANDI | ✅ | 10 | GBP 15 000
862 El-Yurt Umidi | YANGILANDI | ✅ | 9 | UZS (matnli)
131 Edinburgh | kechirilmoqda | — | 4 | —
312 Leeds | kechirilmoqda | — | 4 | —
327 St Andrews | kechirilmoqda | — | 4 | —

Umumiy: active 549, retired 117 (o'zgarmadi), amount_usd_value > 5000 = 20 (o'zgarmadi), source_reliability = 4 → 135 (139 → 134 after pass 87 writes confirm), bare-domain website_url → 31 (35 → 31 after pass 87).

Eslatma: `execute_query` ba'zi vaqtlar 502 qaytaradi va write hali bajarilgan bo'lishi mumkin — har write'dan oldin state qayta tekshiriladi.
