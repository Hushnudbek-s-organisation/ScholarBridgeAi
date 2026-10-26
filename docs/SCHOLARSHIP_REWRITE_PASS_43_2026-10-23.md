# ScholarBridgeAi — stipendiyalarni qayta yozish, 43-pass (Fors ko'rfazi klasteri)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Saudiya Arabistoni (2 qator) + Qatar (2 qator) — 4 qator qayta yozildi, 1 yangi qator qo'shildi, 2 qator nafaqaga chiqarildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **609** King Abdulaziz University | "Study in Saudi / KAU Royal Scholarship", uydirma USD 11 000, IELTS 6.0 / GPA 3.5 / SAT 1350, "May–Jul" oyna | **"King Abdulaziz University External Scholarship for International Students"** — tashqi trek (chet elda yashovchi nomzodlar uchun), bakalavr + magistratura + PhD, to'liq kontrakt bekor + oylik stipendiya (miqdori e'lon qilinmagan), turar joy, ovqat, tibbiy yordam, yillik aviachipta, dissertatsiya chop etish va kitob jo'natish nafaqasi |
| **610** King Saud University | "Fully Funded International Scholarship", uch daraja, uydirma USD 11 800, "High School 90%+ / SAT 1300", aviachipta va'da qilingan | **"King Saud University External Scholarship for Non-Resident Students"** — **faqat bakalavr**, SAT ≥1010 (tibbiyot uchun 1200), 17–25 yosh, SAR 1 000/oy (fan) yoki 850/oy (gumanitar), 2 oylik va 3 oylik nafaqalar, yotoqxona, ovqat, tibbiy yordam. Aviachipta **yo'q** — KSU o'z ro'yxatida uni ko'rsatmaydi |
| **908** *(yangi)* | — | **"King Saud University Graduate Scholarship Initiative for Talented Students"** — faqat PhD, tanlangan dasturlar, to'liq kontrakt + **yiliga SAR 54 000** (= KSU o'zi yozganidek USD 14 400) + yotoqxona + tibbiy sug'urta. Muddat e'lon qilinmagan (2025-bosqichi yopilgan) |
| **587** Hamad Bin Khalifa University | "HBKU Qatar Foundation Merit/Need Scholarship", uydirma USD 40 000, uch daraja, "Family/Single Housing", IELTS 6.5 / GPA 3.6 | **"HBKU Graduate Scholarship Programme (Tuition Waiver and Stipend)"** — faqat magistratura va PhD; kontrakt bekor **0–100 %** (dastur turiga qarab: STEM PhD 100 % @ QR 4 000/kredit, SHAPE PhD va S.J.D. 100 % @ 2 500, STEM magistratura 75 %, SHAPE magistratura 60 %, LL.M. va MS Economics 0 %); stipendiya xalqaro PhD uchun **QR 9 000/oy, 45 oy**, magistratura uchun **QR 7 000/oy, 21 oy**; **yotoqxonani HBKU to'lamaydi**; alohida ariza yo'q; muddat **2027-02-01** |
| **656** Qatar University | "International Students Scholarship", uch daraja, uydirma USD 20 000, "Feb–Mar" | **"Qatar University International Students Scholarship"** — **faqat bakalavr**; o'rtacha baho ≥95 %, to'liq kontrakt + darslik bekor, **QR 500/oy**, 2 kishilik yotoqxona + transport, yillik aviachipta, universitet homiyligidagi rezidentlik ruxsatnomasi; oyna **1–25 mart**, hujjatlar 26 martgacha, natija 19 may |
| **324** King Abdulaziz University | USD 30 000, "December 31 annually", `degree_levels` = `Master/PhD` | **Nafaqaga chiqarildi** — 609 ning dublikati, `university_id` hatto NULL edi |
| **474** Qatar University "International Excellence Scholarship" | USD 8 500, "up to $25,000 tuition" | **Nafaqaga chiqarildi** — bunday stipendiya QU katalogida **umuman yo'q** |

`university_scholarships` kartalari: **275** (KAU), **283** (KSU), **267** (HBKU), **99** (QU) yangilandi; **656** (mavjud bo'lmagan QU mukofoti) → `availability_status = 'No'` va izoh bilan saqlandi; **667** — 908 uchun yangi karta.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Uydirma USD summalar** | 609, 610, 587, 656, 324, 474 | KAU va KSU holatida valyuta — **SAR**, HBKU va QU — **QAR**; summalar faqat e'lon qilingan bo'lsa yozildi. KAU stipendiya miqdorini umuman e'lon qilmaydi → `amount_usd_value = 0` (sentinel), `award_amount = NULL` |
| 2 | **Daraja darajalari noto'g'ri** | 610, 587, 656, 474 | KSU tashqi stipendiyasi — faqat bakalavr; HBKU — magistratura + PhD (bakalavr uchun mablag' Yo'q, uni Qatar Foundation moliyaviy yordam idorasi boshqaradi); QU — faqat bakalavr. QU ning **magistratura FAQ'i**: "There is NO scholarship for the graduate programs" va "Qatar University does not offer academic scholarships for graduate-level students" |
| 3 | **Mavjud bo'lmagan mukofot** | 474, 324 | QU katalogi to'liq ro'yxatga olindi: International Students Scholarship, Student Recruitment and Excellence, H.H. Emir, Outstanding Performance, GCC embassies, Children of QU Employees. "International Excellence" yo'q → nafaqaga chiqarildi |
| 4 | **"To'liq paket" da'vosi, lekin turar joy yo'q** | 587 | HBKU ochiq yozadi: talaba QF yotoqxonasi yoki tashqi turar joyni **stipendiyadan o'zi to'laydi** |
| 5 | **E'lon qilinmagan aviachipta** | 610 | KSU ning ingliz tilidagi "services and care" ro'yxatida yillik chipta yo'q → `travel_allowance = NULL`, izohda uchinchi tomon manbalarga ishonmaslik aytilgan |
| 6 | **O'ylab topilgan til/GPA talablari** | 609 (IELTS 6.0, GPA 3.5, SAT 1350), 587 (IELTS 6.5, GPA 3.6), 656 (GPA 3.6), 610 | KAU: **IELTS 5.0 / TOEFL iBT 61**, GPA emas — "Very Good" baho. HBKU: stipendiya sahifasida til talabi yo'q → `min_ielts = NULL`. QU: 95 % o'rtacha baho, 3.0 GPA faqat saqlab qolish uchun. KSU: kirish testi — **SAT 1010** |
| 7 | **Muddat chalkashligi** | 609, 610 ("May–Jul"), 656 ("Feb–Mar") | Saudiya: **Study in Saudi** platformasi, II-semestr 2026 oynasi **16 sentabr – 6 oktabr**. Qatar: xalqaro bakalavr arizasi va stipendiya formasi **1 martdan 25 martgacha**, hujjatlar 26 mart, natija 19 may |
| 8 | **Bitta qatorga uch xil dastur yig'ilgan** | 609, 610 | Milliy platforma + KSU bakalavr treki + KSU doktorantura tashabbusi ajratildi: 610 (bakalavr) va **908** (PhD) |
| 9 | **`degree_levels` formati** | 324 | `["Master","PhD"]` → ilova kutgan `Master's`; qator nafaqaga chiqarilgani uchun muammo yopildi |
| 10 | **Manba — yalang'och domen** | 609, 610, 587, 656 | Endi `website_url` va `source_url` — real ochilgan sahifalar: `kau.edu.sa/en/page/external-scholarships-for-international-students`, `dar.ksu.edu.sa/en/overseas`, `hbku.edu.qa/en/scholarship`, `qu.edu.qa/en-us/students/admission/scholarships/types` |

**Istisno:** 908 uchun `website_url = https://dgsinitiative.ksu.edu.sa/` — bu portal ildizi, lekin aynan shu sahifa tashabbusning to'liq shartlari, yo'nalishlari va muddatlarini olib yuradi (579 KNB holatidagi kabi hujjatlashtirilgan istisno). Shu sababli u `bare = true` deb ko'rinadi.

---

## 3. Valyuta konvertatsiyasi

Konvertatsiya faqat ikkita **qat'iy kurs** bo'yicha va izohda ko'rsatilgan:

* **SAR 3.75 = USD 1** — Saudiya riyolining rasmiy peg'i. Uni **KSU o'zi** ishlatadi: tashabbus sahifasida "SAR 54 000 ($14 400)" deb yozilgan, ya'ni 54 000 / 14 400 = 3.75. Shunga ko'ra 610 uchun SAR 12 000 → **USD 3 200**, 908 uchun esa KSU bergan **USD 14 400** o'zi ishlatildi.
* **QAR 3.64 = USD 1** — Qatar riyolining rasmiy peg'i. HBKU: QR 108 000 → **USD 29 670**; QU: QR 6 000 → **USD 1 648**.

`amount_usd_value` faqat **naqd** qismini ko'rsatadi; kontrakt, yotoqxona va aviachipta ustiga qo'shiladi va matnda tushuntirilgan.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 42 oxiri | Pass 43 oxiri | O'zgarish |
|---|---|---|---|
| Shablon tavsifli qatorlar (`offers … Maximum award:`) | 27 | **23** | −4 |
| Yalang'och domenli `website_url` | 87 | **84** | −4 +1 (908) |
| Faol stipendiyalar | 566 | **565** | −2 nafaqa +1 yangi |
| Nafaqaga chiqarilganlar | 100 | **102** | +2 |

Navbatda qolgan shablon qatorlari: **23** — Argentina 1, Avstriya 1, Braziliya 1, Chexiya 1, Fransiya 2, Gonkong 1, Irlandiya 2, Isroil 2, Qozog'iston 1, Livan 1, Meksika 2, Yangi Zelandiya 2, Janubiy Afrika 2, Tailand 1, BAA 2.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (7 qator: tavsif uzunligi, majburiy maydonlar, kanonik `coverage_type`, yalang'och domen, `required_documents` JSON) | hammasi `false`, faqat 908 uchun kutilgan `bare = true` |

---

## 6. Manbalar (2026-10-25 da ochilgan)

`kau.edu.sa/en/page/scholarship` · `kau.edu.sa/en/page/external-scholarships-for-international-students` · `studyinsaudi.sa/en` · `studyinsaudi.sa/en/VisaOptions` · `dar.ksu.edu.sa/en/overseas` · `dar.ksu.edu.sa/en/stipend` · `isd.ksu.edu.sa/en/node/3063` · `dgsinitiative.ksu.edu.sa` · `hbku.edu.qa/en/scholarship` · `hbku.edu.qa/en/admissions` · `qu.edu.qa/en-us/students/admission/scholarships/types` · `qu.edu.qa/en-us/students/admission/scholarships/Pages/scholarships-timeline.aspx` · `qu.edu.qa/en-us/students/international-students/important-dates` · `qu.edu.qa/en-us/students/admission/graduate/Pages/faq.aspx` · `qu.edu.qa/en-us/students/admission/undergraduate/Pages/apply.aspx`

Qo'shimcha iqtibos (KAU ning eski `graduatestudies.kau.edu.sa` va `dcafl.kau.edu.sa` sahifalari): ularning matni qidiruv indeksidan olingan, 2026-10-25 da to'g'ridan-to'g'ri ochilmadi — shu sababli `source_url` sifatida emas, faqat `notes` da keltirilgan. Bu qatorning `source_reliability` qiymati 8 emas, **7**.

SQL: `supabase/scholarship_rewrite_pass43_2026-10-23.sql`
