# SCHOLARSHIP_REWRITE_PASS_87_2026-10-26

**Sana:** 2026-10-26
**Branch:** `arena/99b0c7fe-scholarbridgeai`
**Supabase:** `zkdguzbdopfedkffsatk` (Postgres 17)

Pass 87’da UK qatorlari qayta tekshirildi, uchta universitet funding indeksiga uydirma qiymatlar qo‘shilmadi, Edinburgh Business School’dagi bitta aniq PhD mukofoti ajratib ko‘rsatildi, Leeds magistratura mukofoti yangi yozuv sifatida qo‘shildi. El-Yurt Umidi bo‘yicha 2026-yilgi rasmiy Nizom tekshirilib, avvalgi noto‘g‘ri Top-300 talqini tuzatildi.

## 1. Supabase’dagi aniq scholarship yozuvlari

### 614 — Lancaster

- **Yangi nom:** Lancaster University Undergraduate International Excellence Scholarship.
- **Rasmiy manba:** `https://www.lancaster.ac.uk/study/fees-and-funding/scholarships-and-bursaries/undergraduate-international-excellence-scholarship/` (2027 kirish sahifasi fetch qilindi).
- **Qiymat:** GBP 3 000 har o‘quv yilida; birinchi kurs emas, har bir mos yil uchun tuition fee reduction. `award_amount=3000`, `award_currency=GBP`, `amount_usd_value=0`.
- **Talablar:** xalqaro fee-status, Lancaster firm UCAS choice, A*AA yoki ekvivalenti; avtomatik ko‘rib chiqiladi, alohida ariza yo‘q. Bakalavriatga tegishli.
- **Deadline:** stipendiya uchun alohida sana e’lon qilinmagan; UCAS sanasi stipendiya deadline’i sifatida ko‘rsatilmagan.
- `source_reliability=10`; universitetning `university_scholarships` yozuvi ham yangilandi (ID 193).

### 589 — Heriot-Watt

- **Yangi nom:** Heriot-Watt University International Merit Scholarship.
- **Manba:** `https://www.hw.ac.uk/study/fees-and-funding/scholarships-and-bursaries/international-merit-scholarship` (fetch qilindi).
- **Qiymat:** “varies by region”; raqamli miqdor e’lon qilinmagan. `award_amount=NULL`; `amount_usd_value=0`; valyuta GBP.
- UK kampusida full-time bakalavriat va taught magistratura; postgraduate research, onlayn o‘qish va UK’da yashovchilar chiqarib tashlangan. O‘zbekistonliklar CIS regional menejeriga yo‘naltiriladi.
- Har bir intake uchun yagona deadline yo‘q. `source_reliability=9`; universitet yozuvi ID 229 yangilandi.

### 658 — Queen’s University Belfast

- **Manba:** `https://www.qub.ac.uk/Study/funding-scholarships/Non-facultydepartments/international-office/international-office-undergraduate-scholarship.html` (Funding & Scholarships Finder sahifasi fetch qilindi; Europe and Central Asia mintaqa sahifasi ham tekshirildi).
- **Qiymat:** GBP 3 500 (fee rate 1) yoki GBP 4 000 (fee rate 2), faqat birinchi yil tuition reduction. DB’da pastki tier 3 500 va `award_basis=range`; ikki tier tavsifda keltirilgan.
- 2026/27 uchun yangi xalqaro full-time bakalavrlar; ariza alohida topshirilmaydi, enrolment’da avtomatik qo‘llanadi. Scholarship deadline e’lon qilinmagan; 18-sentabr-2026 sanasi boshqa — Early Confirmation Award’ga tegishli.
- `source_reliability=10`; universitet yozuvi ID 284 yangilandi.

### 734 — Exeter

- **Yangi nom:** Exeter Excellence Scholarships (University of Exeter).
- **Manba:** `https://www.exeter.ac.uk/study/funding/exeterexcellence/` (fetch qilindi).
- **Qiymat:** GBP 15 000; bakalavriat uchun har mos yil, taught magistratura uchun faqat birinchi yil. PhD uchun emas. GBP bo‘lgani sabab `amount_usd_value=0`.
- 2027/28 sahifada 150 bakalavr va 150 PGT mukofoti ko‘rsatilgan; closing date va eligible programme ro‘yxati berilmagan.
- Importer nomidagi departmental “Global Excellence” sahifalari “Sorry no information currently available” deb javob berdi; shu sabab ularning qiymati uydirilmagan.
- `source_reliability=10`; universitet yozuvi ID 139 yangilandi.

### 131 — Edinburgh Business School Doctoral College Scholarship

- **Yangi nom:** University of Edinburgh Business School Doctoral College Scholarship.
- **Manba:** `https://www.business-school.ed.ac.uk/scholarships/edc-and-business-school` (rasmiy Business School sahifasi fetch qilindi). Kengroq Registry Services sahifasi federation sign-in’ga yo‘naltirgani uchun yozuv faqat Business School qismiga cheklangan.
- **Miqdor:** to‘liq UK yoki overseas tuition + UKRI minimum stavkasidagi yillik stipendiya, 3–4 yil. GBP 21 805 — sahifada ko‘rsatilgan **2026/27 reference rate**, 2027/28 stipendiyasi emas. Shu sabab `award_amount=NULL`, `award_currency=GBP`, `amount_usd_value=0`.
- **Deadline:** to‘liq PhD programme arizasi 12-yanvar-2027; scholarship arizasi 2-fevral-2027 23:59 UK time; scholarship consideration uchun offer shu deadline’gacha olinishi kerak.
- Sahifada bitta muhim ichki zidlik bor: eligibility qismida 2027-yil sentabr intake, pastroqda esa 2026-yil sentabr deb yozilgan. Bu DB `notes`’ida ko‘rsatildi; arizachi universitetdan tasdiqlashi kerak.
- `source_reliability=9`; `university_scholarships` ID 646 “Yes” va stipend/tuition tafsilotlari bilan yangilandi.

### 910 — University of Leeds Masters International Excellence Scholarships (**yangi yozuv**)

- **Rasmiy manba:** `https://www.leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships` (rasmiy sahifa fetch qilindi).
- **Yangi yozuv ID:** `scholarships.id=910`; universitet bog‘lanmasi `university_scholarships.id=669`, `university_id=171`.
- **Qiymat:** GBP 3 000 / 6 000 / 16 000; birinchi yil tuition fee reduction. Pastki tier `award_amount=3000`, `award_basis=range`, `award_period=one_time`, `award_currency=GBP`, `amount_usd_value=0`.
- Full-time taught Master’s, 2027-yil sentabr intake; xalqaro fee-status, self/part-funded, UK 2:1 yoki ekvivalenti hamda professional/personal ko‘nikmalar. MBA va fully online kurslar chiqarib tashlangan. Scholarship form alohida; har bir kursga alohida ariza.
- **Raundlar:** 28-fevral-2027 (natija 2-aprel) va 16-may-2027 (natija 11-iyun). DB’da yakuniy sana deadline_date sifatida, ikkala raund `rounds` JSON’da saqlandi.
- Rasmiy sahifa stipendiya uchun IELTS minimumi yoki GPA raqamini bermaydi: `min_ielts` va `min_gpa` NULL. To‘g‘ridan-to‘g‘ri application URL e’lon qilinmagan.
- `source_reliability=10`.

## 2. Qiymat qo‘shilmagan funding indekslari

| ID | Yozuv | Rasmiy URL | Holat |
|---:|---|---|---|
| 53 | Edinburgh student funding (named award unconfirmed) | `https://registryservices.ed.ac.uk/student-funding/postgraduate/international` | Registry sahifasi funding’ni College/region/subject bo‘yicha ajratadi; bitta umumiy award, qiymat yoki deadline yo‘q. `reliability=4`. |
| 312 | Leeds research funding (named award unconfirmed) | `https://www.leeds.ac.uk/research-funding` | Sahifa UK va xalqaro tadqiqotchilar uchun school/faculty/project qidiruviga yo‘naltiradi; bitta umumiy mukofot emas. `reliability=4`. |
| 327 | St Andrews postgraduate scholarships (named award unconfirmed) | `https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/` | Rasmiy overview katalogga yo‘naltiradi; award, fee-status va deadline har bir katalog yozuvida alohida. `reliability=4`. |

Uchalasida ham amount, currency, sana va eligibility uydirilmagan; `award_amount=NULL`, `amount_usd_value=0`, `deadline_type=not_published`. Eski importer USD va umumiy yanvar sanalari olib tashlangan. Ular aniq award sifatida emas, ma’lumot topish uchun directory pointer sifatida qoldirildi.

## 3. 862 — El-Yurt Umidi: joriy Nizom bo‘yicha muhim tuzatish

- **Manba:** `https://el-yurt.uz/candidates` (rasmiy Nizomning 6 bo‘lagi fetch qilindi) va `https://el-yurt.uz/programs/1`. Oldingi `eyuf.uz` 500 xatosi endi asosiy manba sifatida ishlatilmaydi.
- Yozuv **El-Yurt Umidi Presidential Scholarship (Uzbekistan)** deb nomlandi; `website_url` va `source_url` bevosita rasmiy sahifalarga o‘zgartirildi.
- **Avvalgi noto‘g‘ri talqin:** Top-300 universitetiga qabul qilingan har kim avtomatik transport/turarjoy oladi, degan jumla DB’dan olib tashlandi. Joriy Nizomda Top-300 imtihonsiz kvotasi uchun tashqi full-tuition grant ham, jamg‘arma faqat xalqaro transport va turarjoyni qoplashiga nomzodning roziligi ham talab qilinadi. Faqat Top-300 qabulining o‘zi stipendiyani kafolatlamaydi.
- **Top-100 imtihonsiz kvotasi:** tuition’ni to‘liq qoplaydigan tashqi grant kerak; bakalavrda QS, magistratura/doktoranturada THE reytingi ishlatiladi.
- **Top-20 imtihonsiz kvotasi:** faqat Prezident, ijod yoki ixtisoslashtirilgan maktab bitiruvchisi bo‘lgan bakalavr nomzodlari, QS Top-20 va tuition’ning kamida 50% tashqi grant bilan qoplangan taqdirda.
- Boshqa ochiq tanlov g‘oliblariga Nizom tuition, viza, tibbiy sug‘urta, yiliga bir marta borib-kelish, yashash va o‘quv materiallari xarajatlarini nazarda tutadi; har bir dastur limiti Jamg‘arma kengashi tomonidan belgilanadi.
- Yosh chegaralari: bakalavr ≤30; magistr 22–40; doktorantura 25–45. Ish staji: magistr uchun kamida 1 yil, doktorantura uchun kamida 2 yil. IELTS 6.0 bakalavr va 7.0 magistr/doktorantura; shartsiz qabul xati bo‘lsa til sertifikati talab qilinmaydi. Keyin O‘zbekistonga qaytish va shartnomadagi ish majburiyati bor.
- **Miqdor/valyuta/deadline:** bitta miqdor yoki valyuta e’lon qilinmagan; `award_amount=NULL`, `award_currency=NULL`, `amount_usd_value=0`, `coverage_type=Unspecified`. Tanlov sanalari ad hoc; Nizom arizalarni kamida bir hafta oldin e’lon qilishni va hujjat oynasi bir oygacha davom etishini aytadi. 2027 uchun deadline 2026-10-26 holatida e’lon qilinmagan; oldingi taxminiy aprel sanasi va 2027-04-30 `deadline_date` olib tashlandi. `application_status=unknown`, `deadline_type=not_published`.
- Milliy grant muayyan universitetga biriktirilmagan: `university_id=NULL`, shu sabab `university_scholarships` jadvaliga tasodifiy universitet bog‘lanmadi.
- `source_reliability=9`.

## 4. Ikkilamchi universitet bog‘lanmalari

Pass 87’da mavjud `university_scholarships` yozuvlari ham scholarships nomi, rasmiy URL, funding turi va verified status bilan birga to‘g‘rilandi:

- 193 → scholarship 614 (Lancaster)
- 229 → scholarship 589 (Heriot-Watt)
- 284 → scholarship 658 (Queen’s Belfast)
- 139 → scholarship 734 (Exeter)
- 646 → scholarship 131 (Edinburgh Business School)
- 669 → scholarship 910 (Leeds Masters, yangi)

## 5. Yakuniy nazorat va qoldiq

| Ko‘rsatkich | Pass 87 yakuni |
|---|---:|
| Active scholarships | 550 |
| Retired | 117 |
| Active `source_reliability = 4` | 138 |
| Active `amount_usd_value > 5000` | 20 (barchasi tekshirilgan nashr qilingan qiymatlar) |
| Bare-domain `website_url` | 27 |
| Active kelajakdagi `deadline_date` | 153 |
| Template sarlavhali yozuvlar | 0 |

**Mahalliy tekshiruvlar:** `tsc --noEmit`, `check:i18n`, `test:render` (337/337) — muvaffaqiyatli. Bu pass’da source-code o‘zgarmadi; o‘zgarishlar Supabase ma’lumoti va hujjatlar bilan cheklangan.

**Keyingi navbat:** 829 Phystech.International, 859 Study in Saudi, 868 Rossiya kvotasi; so‘ng Caltech 20↔114 dublikati va qolgan `source_reliability=4` guruhlari. Yozuvlar official page’da tasdiqlanmasa, miqdor va muddatni NULL/`not_published` qoldirish davom etadi.
