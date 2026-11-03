# Rasmiy manbalar bo‘yicha davomiy tekshiruv — 2026-11-03

Bu hisobot oldingi `DOCUMENT_COVERAGE_REVIEW_2026-11-02.md` natijalarini bekor qilmaydi. Yangi ish doirasi: uchta admissions sahifasi, olti UK viza yozuvi va ularga bog‘liq lokal hisoblash/validatsiya xatolari. **Butun sayt yoki barcha mamlakatlar qayta tasdiqlandi degani emas.**

## 1. Jonli bazada bajarilgan ish

`visa_requirements` jadvalidagi **7–12-ID**, `United Kingdom / Student Route Visa` yozuvlari birlamchi GOV.UK sahifalari asosida yangilandi:

| Yozuv | Xato / kamchilik | Yakuniy holat |
| --- | --- | --- |
| 7 — CAS | Muddat tushuntirilmagan | Litsenziyali sponsor, shartsiz taklif, CAS olinganidan keyin 6 oy ichida ariza; ATAS holatga bog‘liq |
| 8 — ariza to‘lovi | £490 | **£558**; IHS va qo‘shimcha xizmatlar alohida; USD to‘lov valyutasi emas |
| 9 — IHS | “Full NHS access” va yakuniy xarajat haqida ortiqcha da’vo | **£776/viza yili**; viza davomiyligi, yarim yillik yaxlitlash va istisnolar tushuntirildi; barcha tibbiy xizmat bepul deyilmaydi |
| 10 — mablag‘ | £1,483/£1,136; £13,347/£10,224 | **London £1,529/oy, tashqarida £1,171/oy**, ko‘pi bilan 9 oy: **£13,761/£10,539**, CASdagi qolgan kontrakt bilan. 28 kunlik davr arizadan oldingi 31 kun ichida tugaydi; istisnolar/homiylik alohida |
| 11 — TB | IOM Tashkent, faqat 6 oydan ko‘p qolish, hamma uchun X-ray | GOV.UKdagi **Tashkent International Clinic**; 6 oy **yoki undan ko‘p** qolish va yashash tarixi shartlari; bolalar/istisnolar; rasmiy klinika sahifasi |
| 12 — biometrika | TLScontact va manbasiz 240 kun | GOV.UK katalogining Uzbekistan havolasi **VFS Global**; arizaga berilgan individual ko‘rsatmaga rioya qilish; universal 240 kun da’vosi olib tashlandi |

Shartli IHS/mablag‘/TB/markaz bandlari barcha talabalar uchun bir xil majburiy degan belgi bilan qoldirilmadi. Lokal UI `isRequired=false` holatini “Ixtiyoriy” emas, **“Holatingizga bog‘liq”** deb ko‘rsatadi. Bu yangi UI hali deploy qilinmagan; eski deploy eski yorliqni ko‘rsatishi mumkin. Shartli talabni e’tiborsiz qoldirish mumkin degani emas — yozuv matni va rasmiy yo‘riqnomani o‘qish kerak.

### Jonli readback

- Jami **75** yozuv saqlandi; oldingi **20 practice** yozuv o‘zgarmadi.
- Yangi **6 ta private before-image**, RLS yoqilgan, `anon` o‘qiy olmaydi.
- Qolgan **69 yozuvning barcha ustunlarini qamragan MD5** oldin/keyin bir xil: `931eb1939166efb05f7b5800e7bc3050`.
- Olti yozuvning ID, mamlakat, visa type, sarlavha, to‘liq matn, majburiylik, URL, source name/type va status bo‘yicha hash’i manifestdagi kutilgan qiymat bilan teng.
- `visa_verified_requires_evidence` constraint validatsiyalangan holatda qoldi. Bu URL/sana metadata himoyasi, matnning mazmunini avtomatik tasdiqlash emas.
- Live migratsiyalar: `official_uk_visa_review_20261103` va `correct_uk_tb_source_url_20261103`.

Connector orqali dastlabki qo‘llashda TB URLning bir qismi xato ko‘chirildi (`tuberculosis/testing-…`). Bu alohida, bitta yozuv bilan cheklangan migratsiya orqali fetched manbaning to‘g‘ri `tuberculosis-testing-…` URLiga qaytarildi. Yakuniy readback to‘g‘ri URL va butun matn hash’ini tasdiqladi. Repozitoriydagi asosiy SQL — to‘g‘ri URLli kanonik holat; regressiya ikkala variantni ham tekshiradi: kanonik replay hamda amalda bo‘lgan typo → correction zanjiri. Eski olti before-image ustidan yozilmadi.

## 2. Admissions statistikasi — taxmin emas, manbali kuzatuv

| Universitet | Kuzatilgan qiymatlar | Chegara |
| --- | --- | --- |
| MIT | Avvalgi **10** raqam saqlandi | Class of 2029, oldingi auditdagi EA/RA denominatorlari o‘zgarmadi |
| Harvard | Class of 2030: **2,037 / 55,104 ≈ 3.70%** | Qabul qilinganlar waitlistni ham o‘z ichiga oladi; xalqaro geografik ulush xalqaro qabul foizi emas |
| Brown | Class of 2030 e’lon qilingan **5.6%**; admitted test-submitters SAT **1470–1550**, ACT **34–36** | Test jadvali sentabr 2026 holatidagi eng so‘nggi ma’lumot, test cohort yili alohida belgilanmagan. ED uchun 889 admit bor, applicant denominatori yo‘q; median chiqarilmadi |
| Princeton | Sahifa tekshirildi, kerakli 21 metrika shu sahifada berilmagan deb belgilandi | 1,414 enrolled va 12.9% international enrolled share — acceptance rate emas |

Natija: **201 yozuvdan 4 universitet sahifasi tekshirilgan**, shundan **3 tasida jami 16 raqamli kuzatuv** bor. 84 ko‘rilgan metrika uyasi: **16 raqam, 67 ko‘rilgan sahifada yo‘q, 1 qo‘llanmaydi**. Qolgan **197 universitet / 4,137 metrika uyasi** `unreviewed`, `null`. Bu **201 ta tekshirilgan CDS emas**, dastur yoki magistratura talabi emas, shaxsiy qabul ehtimoli emas. 95% aniqlik da’vosi qilinmaydi.

## 3. Lokal koddagi qo‘shimcha tuzatishlar

- UK native GBP qiymatlari uchun `ukStudentVisaFacts.ts` yagona tayanch bo‘ldi. Xarajat kalkulyatoridagi visa fee £558 × ilovaning reference GBP/USD kursi ≈ **$720**; bu live FX yoki payable USD fee emas.
- Country factsdagi manbasi tasdiqlanmagan 30-noyabr kelajak oshishi olib tashlandi. Graduate route: 2026-12-31 gacha topshirilsa 2 yil, 2027-01-01 dan 18 oy; PhD 3 yil. 24 oy maydoni ushbu audit sanasidagi bakalavr/magistr holati, kelajakdagi ariza uchun kafolat emas.
- `fieldReviews` faqat proof-of-funds va post-study-work uchun yangi sana/manba beradi; elchixona manzili, 11 yillik attestat tan olinishi yoki boshqa mamlakatlarga yangi tasdiq sanasi qo‘yilmadi. Lokalizatsiyalangan payload ham scoped metadata’ni saqlaydi.
- Apostille/funds kalkulyatoridagi yana bir eski UK summa nusxasi tuzatildi: London £13,761, tashqarida £10,539. 30-fevral kabi noto‘g‘ri kalendar sanasi keyingi oyga ko‘chib ketmaydi. Deposit sanalari konservativ reja/buffer ekanligi, “earliest window” esa eng erta qonuniy depozit chegarasi emas, misol ekanligi tushuntirildi; 28/31 interval hisoblashning eski natijalari saqlandi.
- UK forum **seed matni** ham yangilandi. Seed qayta ishga tushirilmadi, oldindan bazada yaratilgan forum postlari bu ishda tahrirlanmadi.
- Visa POST/PATCH bir xil final-merged-state validator ishlatadi. Yangilangan `title` yoki `sourceType` practicega aylansa, verified talab sifatida qabul qilinmaydi. Noto‘g‘ri/kelajak/ambiguously parsed sanalar, xato status va yaroqsiz URL 400; draft sana uchun aniq `null` Invalid Datega aylanmaydi.
- GET country filter SQL `%`/`_` wildcard sifatida talqin qilinmaydi; practice tanlash `teaching_material`ni ham hisobga oladi. Bu adminning haqiqiy manba tekshiruvini almashtirmaydi.

## 4. Tekshiruvlar

O‘tgan tekshiruvlar:

- `test:source-followup`: yangi kuzatuv/denominator/missingness; UK summalar; merged evidence/dates; isolated PostgreSQL 75→75/6 scope, canonical replay, actual typo/correction chain, before-images, RLS, 69 unchanged, identity drift va keyingi admin tahririni bosmaslik.
- `test:document-coverage`: 48 alohida essay/SOP + 5 to‘liq LoR, provenance, oldingi practice-repair chegaralari.
- `test:country-facts` **10**, `test:costs` **71**, `test:calculations` **55**, `test:chancing` **28**, `test:qs-benchmarks` **13**, `test:journey` **115**.
- `test:samples` **193**, `test:essays` **247**, `test:rec-letter` **39**, `test:recommend` **91**, `test:differentiators` **724**.
- `typecheck`, i18n parity va lint baseline (**0 finding**), `git diff --check`.
- Yangi test haqiqiy `.github/workflows/ci.yml` ga qo‘shildi.

Manbali SQL testlari lokal isolated PostgreSQLda o‘tkazildi; jonli natija connector readback bilan alohida tekshirildi. Bu production build, browser/E2E yoki authenticated visa HTTP-route integratsion testi o‘tkazildi degani emas.

## 5. Qolgan ishlar va chiqarish holati

**DBdagi olti UK tuzatishi jonli. Kod/UI/admissions/seed o‘zgarishlari lokal branchda; app deploy, push yoki PR amalga oshirilmadi.**

- Boshqa **49 non-practice visa yozuvi** bu bosqichda mustaqil qayta tekshirilmadi. 20 practice band hukumat qoidasi sifatida tasdiqlanmagan.
- 197 universitetda to‘liq admissions/CDS evidence hali yo‘q. Hatto ko‘rilgan sahifalarda ham IELTS/GPA/medians va round ma’lumotlari ko‘pincha noma’lum.
- Oldingi **1,150 dastur + 1,150 requirements, 313 ranking** source-review navbati saqlanadi. Oldingi muvaffaqiyatli migratsiyalar takrorlanmadi, yopilgan sikllar ochilmadi.
- Boshqa mamlakatlarning country-facts/apostille summalari va eski forum postlari qayta tasdiqlangani da’vo qilinmaydi. Keyingi tekshiruv uchun ayniqsa bir mamlakat summasining turli kalkulyatorlarda farqlanishini solishtirish kerak.

## Manbalar va audit artefaktlari

Manbalar 2026-11-03 kuni o‘qilgan, per-row URL va oldingi/yangi titlelar: `data/official-review/2026-11-03-admissions-uk-visa.json`. U yerda live before/after hashlar va har bir UK payload hash’i ham bor.

- https://www.gov.uk/student-visa
- https://www.gov.uk/student-visa/course
- https://www.gov.uk/student-visa/money
- https://www.gov.uk/healthcare-immigration-application/how-much-pay
- https://www.gov.uk/tb-test-visa
- https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-uzbekistan/tuberculosis-testing-in-uzbekistan
- https://www.gov.uk/find-a-visa-application-centre — Uzbekistan qatori ham o‘qildi
- https://college.harvard.edu/admissions/admissions-statistics
- https://admission.brown.edu/explore/brown-admission-numbers
- https://admission.princeton.edu/apply/admission-statistics
