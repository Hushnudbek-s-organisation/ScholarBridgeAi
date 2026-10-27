# Grant yozuvlarini qayta yozish — 15-pass (2026-10-23)

Bu pass **Türkiye klasteriga** bag'ishlandi. Import paytida 9 ta turk universitetining qatori bitta milliy dastur — **Türkiye Bursları (YTB)** — bilan aralashtirib yuborilgan: universitetning o'z granti o'rniga davlat dasturi yozilgan, summalar esa o'ylab topilgan. Uchta qator to'liq qayta yozildi.

SQL: [`supabase/scholarship_rewrite_pass15_2026-10-23.sql`](../supabase/scholarship_rewrite_pass15_2026-10-23.sql)

---

## 1. Topilgan xatolar

| Yozuv | Bazada turgan | Rasmiy manba |
|---|---|---|
| **823 Koç** | "Koç University International Merit Scholarship **& Türkiye Bursları**", tasdiqlanmagan USD, 3 daraja | Koç o'z grantini **bakalavriatga**, **25/50/75/100%** qilib beradi. Türkiye Bursları — YTB dasturi; Koç sahifasining o'zi talabalarni unga yuboradi, chunki **davlat** grantida yotoqxona, stipendiya va chipta bor, **Koç** grantida yo'q. Tibbiyot fakulteti esa umuman grant bermaydi. |
| **826 Sabancı** | "**25% to 100%** Tuition Fee Deduction", **USD 9 500**, bakalavr+magistratura+PhD | Eng yuqori pog'ona **75%** (25/40/50/60/75). 2026–2027 kontrakt — **USD 36 500**. Ariza **bakalavriat** uchun. Alohida **yotoqxona** granti bor (3–4 kishilik xona, ovqat kirmaydi). |
| **799 Bilkent** | "Bilkent University Merit Scholarship **& Türkiye Bursları**", 3 daraja | Bilkent **20/40/60/80/100%** — besh pog'ona. 2026-yilda qabul qilinganlar uchun kontrakt **USD 18 400/yil** (10% QQS bilan). Eng muhimi: **hozir yoki avval turk fuqarosi bo'lganlar bu grantga haqli emas**. |

---

## 2. Nima yozildi

### 823 — Koç University International Undergraduate Merit Scholarship
- **Pog'onalar:** 25 / 50 / 75 / **100%**, butun o'qish davomida, GPA shartisiz.
- **Summa:** 100% × USD 38 000 (2025/26 kirish narxi) = **USD 38 000/yil**. Tibbiyot (USD 59 000) grantdan **mustasno**.
- **Qoplash:** faqat kontrakt — yotoqxona, stipendiya, kitob yo'q.
- **Muhim:** Koç grantini olgan talaba boshqa Koç moliyaviy yordamiga (yotoqxona, kitob) ariza bera olmaydi. Ariza formasi ham, alohida muddat ham yo'q — qaror qabul xati bilan keladi.

### 826 — Sabancı University International Admission Scholarship
- **Pog'onalar:** 25 / 40 / 50 / 60 / **75%** + alohida yotoqxona granti.
- **Summa:** 75% × USD 36 500 = **USD 27 375/yil**.
- **Muhim:** erta topshirganlar grant ko'rib chiqishida **ustuvorlik** oladi; taklifni qabul qilish uchun **USD 1 500** oldindan to'lov (keyin kontraktdan ayiriladi).

### 799 — Bilkent University International Tuition Waiver Scholarship
- **Pog'onalar:** 20 / 40 / 60 / 80 / **100%** + eng kuchli to'liq grant egalariga yotoqxona.
- **Summa:** 100% × USD 18 400 = **USD 18 400/yil**; 80% pog'onasi — USD 14 720.
- **Davomiylik:** tayyorlovda 4 semestr + bakalavriatda 10 semestr.
- **Saqlash:** yillik GPA ≥ 2.00 (yotoqxona uchun 2.50); tushib qolgan talaba **1–2 pog'onani yo'qotadi va qaytib ko'tarilolmaydi**.
- **Diqqat:** hozirgi yoki sobiq turk fuqarolari grantga haqli emas.

Har uchala qatorning `university_scholarships` kartochkalari (307, 309, 334) ham yangilandi.

---

## 3. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Importer shablonidagi tavsif | 200 | **197** |
| Bosh domen (`website_url`) | 246 | **245** |
| Faol grantlar | 634 | 634 |
| Qayta yozilgan qatorlar | 73 / 634 (11.5%) | **76 / 634 (12.0%)** |

Tekshiruvlar: `npx tsc --noEmit` ✅ · `npm run check:i18n` ✅ · `npm run test:render` ✅ (337 passed) · 3 ta qatorning qattiq tekshiruvlari ✅.

---

## 4. Keyingi navbat

Türkiye klasterida qolgan 6 ta qator — har birida universitetning **haqiqiy** granti bor yoki qator bekor qilinadi:

| id | Universitet | Holat |
|---|---|---|
| 623 | METU | METU ankara kampusi: alohida ariza yo'q — har yil akademik natijaga qarab kontrakt chegirmasi/exemption beriladi; boshqa grant yo'q. Aniq foizlar `iso.metu.edu.tr/en/scholarship-opportunities` da tekshirilishi kerak. |
| 838 | Boğaziçi | tekshirilmagan |
| 828 | İTÜ | tekshirilmagan |
| 814 | YTÜ | tekshirilmagan |
| 813 | Istanbul University | tekshirilmagan |
| 837 | Ankara University | tekshirilmagan |

Rossiya klasteri (10 ta qator: 543, 629, 807, 812, 822, 829, 833, 836, 840) keyingi passda.
