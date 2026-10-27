# Grant yozuvlarini qayta yozish — 14-pass (2026-10-23)

Bu passda **4 ta grant yozuvi** provayderning o'z sahifalaridan boshidan yozildi va **1 ta yozuv** bekor qilindi (retired). Har bir qiymat `source_url` da ko'rsatilgan sahifadan olingan; hech qanday raqam taxmin qilinmagan.

Bajarilgan SQL: [`supabase/scholarship_rewrite_pass14_2026-10-23.sql`](../supabase/scholarship_rewrite_pass14_2026-10-23.sql)

---

## 1. Topilgan xatolar

| # | Yozuv | Bazada turgan holat | Rasmiy manba nima deydi |
|---|---|---|---|
| 848 | **UAEU** | "UAEU International Undergraduate Excellence Scholarship", **USD 18 000**, muddat "Mar–May" | Bunday nomdagi grant **yo'q**. Haqiqiy dastur — **Chancellor's Scholarship for Elite Students**: 12-sinf o'rtachasi **98%** → **100% tuition waiver**, 95% → **75%**. To'lov faqat kontraktni qoplaydi (yotoqxona + ariza to'lovi kirmaydi). Alohida ariza yo'q — universitetga topshirilgan ariza ichida so'raladi. |
| 845 | **Nazarbayev University** | "Abay Kunanbayev International Scholarship at NU", **USD 19 500 "Full Ride"**, muddat "Jan–Mar (SAT/NUET Track)" | Haqiqiy nom — **Abai Kunanbayev Scholarship**. Qiymati **e'lon qilinmagan**: kontrakt + tibbiy sug'urta + oylik stipendiya. Alohida ariza yo'q — har bir maktabning qabul komissiyasi **tavsiya qiladi**. 2027–2028 qabul **2026-yil 12-oktabrda ochilgan**, yopilish sanasi saytda **"TBA"**. |
| 851 | **Kyung Hee University** | "Kyung Hee President Scholarship & GKS", **USD 9 500**, bakalavr+magistratura+PhD | Rasmiy sahifa — **bakalavriat** uchun kirish stipendiyalari jadvali (A–H + SDGs + Pioneer). "President's Scholarship" — bu **magistratura**da kontrakt to'lash oynasi, GKS esa **boshqa** davlat dasturi (GKS olgan talaba KHUning bir qator grantlaridan mahrum bo'ladi). Kirish to'lovi (entrance fee) hech bir grantga kirmaydi. |
| 843 | **SPbU** | "SPbU International Government Quota & **Open Doors**", **USD 5 000**, muddat "Nov–Apr" | SPbU **o'zining** Open International Olympiads musobaqasini o'tkazadi — bu `od.globaluni.ru` dagi "Open Doors" loyihasi **emas**. 2026–2027 davra **2025-yil 12-noyabrdan 2026-yil 6-fevralgacha** bo'lgan (aprelgacha emas). G'oliblar ro'yxati 2026-yil 13-martda e'lon qilingan, dasturni tanlash muddati — 20-mart. |
| 856 | **Hacettepe University** | "Türkiye Bursları (Medical & STEM Priority)", **USD 13 800**, 20-fevral | Hacettepe xalqaro talabalar bo'limining **o'z FAQ'i, 4-savol**: *"No, currently Hacettepe University does not offer any scholarships specifically for international students."* "Medical & STEM Priority" degan yo'nalish umuman yo'q — bu importer o'ylab topgan. |

---

## 2. Nima yozildi

### 848 — Chancellor's Scholarship for Elite Students (UAEU)
- **Qoplash:** 100% kontrakt (75% pog'onasi ham bor) — `coverage_type = Full Tuition`.
- **Summa:** AED **79 830/yil** = AED 2 661/kredit × 30 kredit ≈ **USD 21 740** (3.6725 AED/USD). Bu — e'lon qilingan kredit narxidan hisoblangan ekvivalent, `notes` da shunday yozilgan.
- **Talablar:** 98% o'rtacha; IELTS 7.5 / TOEFL iBT 105 (75% pog'onasi uchun 6.5 / 85); SAT-Math 730 yoki ACT-Math 32 (Business, Humanities, Education, Law dan tashqari); Huquq kolleji uchun Al Ain arab tili testi 6.5.
- **Saqlash sharti:** CGPA 3.8, semestrda 15 kredit, boshqa grant bo'lmasligi.
- **Muddat:** alohida grant muddati yo'q — bakalavriat arizasi ichida.

### 845 — Abai Kunanbayev Scholarship (Nazarbayev University)
- **Qoplash:** kontrakt + tibbiy sug'urta + oylik stipendiya — `Full Tuition + Stipend`.
- **Summa:** e'lon qilinmagan → `amount_usd_value = 0` (loyiha konvensiyasi). Buning o'rniga e'lon qilingan kontrakt narxlari yozildi: bakalavr **USD 15 000**, magistratura **16 000**, PhD **23 500**.
- **Muddat:** `not_published`; 2027–2028 oynasi 2026-10-12 da ochilgan, yopilish sanasi "TBA".
- **Muhim:** moliyaviy yordam uchun **alohida ariza** qabul taklifi kelgandan keyin topshiriladi; ariza to'lovi KZT 10 000 (qaytarilmaydi).

### 851 — Kyung Hee International Student Scholarships (Admission Awards)
- **Qoplash:** birinchi semestr to'liq kontrakt; SDGs va Engineering (G) uchun **4 yilgacha**.
- **Summa:** foizda → `amount_usd_value = 0`; kontrakt narxi dastur jadvalida.
- **Daraja:** faqat **bakalavriat** (avval magistratura va PhD ham yozilgan edi — xato).
- **Pog'onalar:** A (kollejda eng yuqori ball), B (TOPIK 6), C (TOPIK 5), D–H (KHU til instituti dekani tavsiyasi, Global Campus top 50%, Koreys tili bo'limi, Engineering/Electronics/Software, International Studies), SDGs (DAC ODA ro'yxati yoki Koreyada qochqin maqomi).
- **Muddat:** qabul natijasi bilan birga e'lon qilinadi — alohida ariza yo'q.

### 843 — SPbU Russian Government Scholarship Quota (Open International Olympiads)
- **Qoplash:** federal byudjetdan to'liq kontrakt + oylik akademik nafaqa + arzon yotoqxona — `Full Funding`.
- **Summa:** e'lon qilinmagan → 0 (nafaqa miqdorini universitet emas, federal hukumat belgilaydi).
- **Muddat:** `not_published`; keyingi davra **2026-yil noyabr**da kutilmoqda (o'tgan davra 2025-11-12 → 2026-02-06).
- **Holat:** 2026–2027 davrasi **yopilgan** (`application_status = closed`).
- **Qo'shimcha:** SPbU ning **Toshkent filiali** ham bor — 2026-yil kontrakt asosidagi ariza muddatlari 20-iyun → 10/23-iyul.

### 856 — Hacettepe University → **retired**
- `is_active = false`, `notes` da to'liq asos.
- Hacettepe sahifasi bo'sh qolmaydi: **865 — Türkiye Bursları (YTB)** yozuvi "bir xil davlat" qoidasi bo'yicha chiqadi.

### `university_scholarships` kartochkalari
5 ta karta (351, 313, 368, 331, 335) yangi nom, summa, havola va izoh bilan yangilandi; 335 da `availability_status = 'No'`.

---

## 3. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Importer shablonidagi tavsif | 205 | **200** |
| Bosh domen (`website_url`) | 251 | **246** |
| Faol grantlar | 635 | 634 (856 retired) |
| Qayta yozilgan qatorlar | 69 / 635 (10.9%) | **73 / 634 (11.5%)** |
| Grant yo'q universitetlar | 0 | **1** (Hacettepe — ataylab, universitetning o'zi grant yo'qligini aytadi) |

Tekshiruvlar: `npx tsc --noEmit` ✅ · `npm run check:i18n` ✅ · `npm run test:render` ✅ (337 passed, 0 failed) · 4 ta faol qatorning 12 ta qattiq tekshiruvi ✅.

---

## 4. Keyingi navbat

Xuddi shu muammo **Türkiye va Rossiya klasterida** takrorlanmoqda: 9 ta turk va 10 ta rus universiteti qatorida milliy dastur (Türkiye Bursları / Rossotrudnichestvo kvotasi) universitetning "o'z granti" sifatida takrorlangan. Har birini universitetning haqiqiy grantiga almashtirish yoki bekor qilish kerak:

- **Türkiye:** METU 623, Bilkent 799, Istanbul Univ 813, YTÜ 814, Koç 823, Sabancı 826, İTÜ 828, Ankara 837, Boğaziçi 838
- **Rossiya:** Bauman 543, MSU 629, RUDN 807, HSE 812, KFU 822, MIPT 829, TSU 833, MEPhI 836, NSU 840
- **Boshqalar:** Sunway 842 (Jeffrey Cheah stipendiyasi — xalqaro talabalar uchun ochiqligi hali tasdiqlanmagan), Penn State 648, Adelaide 533
