# Biriktirilgan hujjatlar va sayt qamrovi auditi — 2026-11-02

## Natija va cheklovlar

| Talab | Auditdan oldin | Hozirgi holat |
|---|---|---|
| 48 esse/SOP | **12 ta alohida matn**; SOP tanlagichidagi 4 nusxa shu matnlarni takrorlaydi | **48 ta alohida esse/SOP**; 36 ta yangi qisqa o‘quv essesi qo‘shildi |
| 5 to‘liq LoR | **3 to‘liq xat + 1 so‘rov emaili** | **5 to‘liq xat + saqlangan so‘rov emaili**; email beshtalik hisobiga kirmaydi |
| 201 chancing yozuvi | 201 taxminiy benchmark mavjud; ACT va ED/EA/RD uchun alohida manbali kuzatuv modeli yo‘q | 201 yozuv saqlandi; har birida **21 ta alohida manbali/noma’lum ko‘rsatkich maydoni** bor. MIT bo‘yicha rasmiy kuzatuvlar kiritildi. **201 to‘liq tekshirilgan CDS bazasi emas** |
| 75 konsullik/viza yozuvi | 75 yozuv: 55 mamlakatga oid yozuv + noto‘g‘ri verified qilingan 20 intervyu mashqi | **75 yozuv saqlandi**; 20 mashq rasmiy talablardan ajratildi, uydirma javoblar va verified belgilari olib tashlandi |

Yangi esselar va ikki LoR — **original, fictional o‘quv namunalari**. Ular haqiqiy qabul qilingan shaxslarning matni, tasdiqlangan admission outcome yoki universitetning rasmiy shabloni sifatida ko‘rsatilmaydi. Yangi esselar 300 so‘zlik mashq chegarasi ichidagi qisqa supplemental misollar; ularni to‘liq uzunlikdagi real SOP deb hisoblamang. Ularning haqiqiy rubrika baholari hisoblanadi, sun’iy 95/100 berilmaydi.

**Deploy holati:** viza ma’lumotlarini tuzatish va DB himoyasi live bazaga qo‘llandi. Esse, LoR, API va interfeys o‘zgarishlari repozitoriyda tayyor; bu turn davomida ilova deploy yoki GitHub push qilinmadi.

## 1. To‘rtta ilova tekshirildi

- `ScholarBridgeAi_Chancing_Exemplars_i18n_Report.pdf`: 5 sahifa.
- `ScholarBridgeAi_Master_Full_Document.pdf`: 174 sahifa.
- `ScholarBridgeAi_Master_Compressed.pdf`: 174 sahifa; to‘liq PDF bilan **baytma-bayt bir xil SHA-256**, alohida yangi mazmun emas.
- `ScholarBridgeAi_Master_Full_Document.html`: 201 qator benchmark jadvali va 6 647 qator lug‘at jadvali.

Barcha fayllar lokal parser orqali chiqarildi, benchmark/namuna/lokalizatsiya bo‘limlari kod va live inventar bilan solishtirildi. Bu 174 sahifadagi har bir fakt mustaqil rasmiy manbadan tasdiqlandi degani emas.

Fayl xeshlari va sanalgan farqlar: [`data/document-review/2026-11-02-attachment-audit.json`](../data/document-review/2026-11-02-attachment-audit.json).

Hisobot 53 ta yozma namuna va 95%+ chancing aniqligini da’vo qiladi. To‘liq hujjat esa **57 ta turli toifadagi namuna** deydi; ular orasida CV, activity, qisqa javob va viza transkriptlari ham bor. Demak, 57 ni 48 esse + 5 LoR o‘rnida sanash noto‘g‘ri. Hujjatdagi matnlar haqiqiy admitted submissions ekanini yoki modelning 95% aniqligini tasdiqlaydigan tekshiriladigan dalil yo‘q. Bu da’volar saytga ko‘chirilmadi.

## 2. Namunalar kutubxonasi

`src/lib/samples/exemplars.ts`:

- Esse tanlagichida 48 ta **takrorlanmas** matn. SOP drafterdagi 4 nusxa alohida qo‘shimcha esse deb sanalmaydi.
- Akademik, fan o‘qituvchisi, ish beruvchi, amaliyot rahbari va maktab maslahatchisi uchun jami 5 to‘liq tavsiyanoma. So‘rov emaili alohida yordamchi namuna sifatida saqlandi.
- 36 yangi mini-esse: dasturiy ta’minot, AI, maxfiylik, accessibility, data science, moliya/biznes, muhandislik, biologiya/sog‘liq, ijtimoiy fanlar va dizayn. Har biri o‘ziga xos vaziyat, dalil/harakat va refleksiyaga ega; yangi matnlar ilovada bor deb da’vo qilinmaydi.
- Har bir paragraf strukturaviy rol bilan belgilangan. Barcha yangi track nomlari EN/UZ/RUda bor.
- Namuna faqat foydalanuvchi bosganidan keyin tahrir maydoniga yuklanadi; o‘zgartirilmagan nusxani saqlashga qarshi mavjud himoyalar saqlandi.
- Kutubxona lazy chunk bo‘lib qoldi; asosiy sahifaga statik import qo‘shilmadi.
- Interfeysda 48/5 hisobining nimani qamrab olishi va matnlarning o‘quv namunasi ekani yozilgan. “Gold-standard” yorlig‘i “Izohli o‘quv namunalari”ga almashtirildi.

Barcha toifadagi namunalar jami 95 ta; **bu 95 ta esse degani emas**.

## 3. Chancing ishonchliligi

### Kuzatilgan statistika taxmindan ajratildi

Yangi `src/lib/admissionsStatistics.ts` har bir ko‘rsatkich uchun qiymat, status, URL, tekshirish sanasi, cohort, population va usulni saqlaydi. GPA/SAT/ACT 25/50/75, IELTS minimum/mediana, TOEFL minimum, overall/ED/EA/RD/international va SAT komponentlari alohida.

201 mavjud benchmark yozuvi saqlangan: repozitoriyda 200 reytingli yozuv va QS 2026 o‘rni yo‘q KAIST bonus yozuvi. **201 ta to‘liq, rasmiy CDS dataset tekshirildi deb da’vo qilinmaydi.** Avvalgi GPA va til taxminlari o‘z-o‘zidan rasmiy statistika bo‘lib qolmaydi. Rasmiy observation yo‘q joyda yangi qatlam `null/unreviewed` qaytaradi.

### Bu turnda tekshirilgan rasmiy misol: MIT

Manba: <https://mitadmissions.org/apply/process/stats/>, 2026-11-02da o‘qildi. **Class of 2029, fall 2025 entry; admitted students**:

- Overall: manbada e’lon qilingan **4.6%** (1 334 / 29 281, yaxlitlangan).
- EA: **721 / 12 052 = 5.98%**, manbada berilgan sonlardan hisoblangan.
- Regular Action: **603 / 24 715 = 2.44%**. Maxraj EA’dan deferred bo‘lganlarni ham o‘z ichiga oladi; faqat 17 229 yangi RA arizasi ishlatilmadi.
- International: **136 / 6 926 = 1.96%**.
- ACT Composite: **34 / noma’lum / 36**; mediana o‘rtacha bilan almashtirilmadi.
- SAT Math: **780–800**, ERW: **740–780**. Ularning percentillari qo‘shilib SAT total percentile yasalmadi.
- GPA kvartillari, SAT total, ACT medianasi va IELTS/TOEFL cutoffs ushbu sahifada yo‘q — `not_published`.
- ED ushbu EA/RA sahifasiga qo‘llanmaydi — `not_applicable`.

Bular institutional statistikalar, muayyan abituriyentning ehtimoli emas. CDS ko‘pincha **enrolled** guruhni beradi; bu sahifa **admitted** guruhini tasvirlaydi. ED va EA natijalari sababiy afzallik yoki shaxsiy odds sifatida talqin qilinmaydi.

### Aniqlangan mantiq xatolari tuzatildi

- Muassasa ranki, qisman nom yoki ota-universitet domeni endi boshqa muassasaning faktlarini tanlash uchun ishlatilmaydi. Mamlakat mosligi tekshiriladi; noma’lum muassasaga default QS #150 berilmaydi.
- Rankdan IB/A-level/AP majburiy minimumlari yasalmaydi.
- Architecture nomi yoki QS rank sababli portfolio/intervyu majburiy deb chiqarilmaydi; aniq `false` qiymat saqlanadi. Bu avval tekshirilgan Princeton bakalavriat siyosatini model qayta buzishining oldini oladi.
- Eligibility faqat manbali, yozilgan aniq numeric requirements bilan solishtiriladi. Taxminiy GPA yoki rankdan olingan IELTS/DET balli “rasmiy minimum” bo‘lib qaytmaydi. Ma’lumot yetishmasa `unknown_inputs`.
- Muqobil ingliz tili yoki SAT/ACT yo‘li qondirilgan bo‘lsa, boshqa testdagi pastroq natija uni bekor qilmaydi. Test natijasi kiritilmagan bo‘lsa, yaxshi GPA uni avtomatik qondirmaydi.
- Eski program positioning modeli hali **eksperimental taxmin**. APIda provenance belgisi va UI ogohlantirishi bor. Modeldan kelgan “percentile”, offer rate yoki strength/gap xabarlari official CDS observation deb ko‘rsatilmaydi.
- `ADMISSION_PROBABILITY.available=false` saqlandi. Shaxsiy qabul ehtimoli va **95% aniqlik kafolati qo‘shilmadi**.

## 4. Live viza tuzatishi

Live inventar: 75 yozuv, 12 mamlakat yorlig‘i. Bu **75 mamlakat yoki 75 mustaqil rasmiy modul emas**.

20 yozuv (ID 56–75) “Student Visa Interview Q&A” bo‘lib, bir satrda ikki URLni aralashtirgan, uydirma 7.5 IELTS, ota-ona daromadi, qarindoshlar, ish takliflari va salary multiplier kabi javoblarni “Verified Model Response” deb saqlagan edi.

Live migratsiyalar:

1. `repair_visa_practice_evidence_20261102`: 20 savol saqlandi; uydirma model javoblari olib tashlandi; faqat haqiqiy shaxsiy holat bilan javob berish ko‘rsatmasi qo‘yildi. `is_required=false`, `source_type=teaching_material`, `verification_status=needs_review`, `source_url=NULL`, `last_verified_at=NULL`.
2. `guard_visa_verified_evidence_20261102`: validated DB constraint mashqlarni verified government requirement qilib import qilishni, manbasiz/sanasiz yoki birlashtirilgan URLli verified yozuvni cheklaydi. Bu zarur texnik shart; URL mavjudligi uning mazmuni tekshirilganini o‘zi isbotlamaydi.

20 to‘liq before-image private/RLS-protected backupda saqlandi; anon access yo‘q. **Hech bir yozuv o‘chirilmadi**. Live SELECT 75 total / 20 practice / 55 oldingi verified yozuv, nol “Verified Model Response” matni, 20 backup va validated constraintni tasdiqladi.

**Qolgan 55 yozuv bu turnda hukumat sahifalaridan qayta tasdiqlanmadi.** Ularning oldingi verified statusi mustaqil yangi tekshiruv natijasi deb aytilmaydi.

Ilova kodi: GET practice va requirementsni ajratadi; 20 savol destinationga xos talab sifatida emas, alohida mashq bo‘limida ko‘rinadi. POST/PATCHda verified uchun yaroqli bitta URL, sana va practice emasligi tekshiriladi. UI sananing o‘zini ko‘rib verified yorlig‘ini chiqarmaydi.

## 5. Sinovlar

- `npm run test:document-coverage` — **PASS**: 48/5 unique hisob, 201 provenance-aware yozuv, MIT maxraj va null qoidalari, identity collision, noma’lum/alternativ test eligibility, portfolio/intervyu false qiymatlari, malformed URL, private backup, idempotent viza migratsiyasi, boshqa 55 fixture yozuvi o‘zgarmasligi va DB constraint.
- `npm run test:samples` — **193 PASS**.
- `npm run test:essays` — **247 PASS**; yangi qisqa esselar real rubric score bilan, majburiy 88/95 ballga moslab yasalmadi.
- `npm run test:rec-letter` — **39 PASS**.
- `npm run test:chancing` — **28 PASS**.
- `npm run test:qs-benchmarks` — **13 PASS**.
- `npm run test:recommend` — **91 PASS**.
- `npm run test:journey` — **115 assertions PASS**.
- Typecheck, uch tilli i18n parity, lint baseline (0 issues), `git diff --check` — **PASS**.

Yangi qamrov testi npm va GitHub CIga qo‘shildi. Testdan o‘tish admissions modelining prediction accuracy’sini yoki barcha vizalar rasmiy manbadan tekshirilganini anglatmaydi.

## Ochiq qolgan ishlar

- Qolgan universitetlar uchun har bir CDS/UCAS/admissions metricni alohida primary source, qabul yili, guruh va aniq ta’rif bilan to‘ldirish. Raqamlar borligi uchun PDFni factual authority sifatida ishlatmaslik.
- 55 mamlakatga oid viza yozuvini tegishli hukumat sahifalaridan mustaqil yangilash.
- Oldingi katalog auditidagi 1 150 dastur/talab va 313 reytingning to‘liq source review’si hali yakunlanmagan; bu turn ularni blanket verified qilmadi.
- Ilova o‘zgarishlarini alohida deploy qilib, authenticated brauzer oqimlarida tekshirish. Bu turn production UI/brauzer E2E testi va deploy qilinmadi.
