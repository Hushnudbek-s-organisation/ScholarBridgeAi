# ScholarBridgeAi — stipendiyalarni qayta yozish, 72-pass (Turkiya, Saudiya, BAA)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Turkiya 3 + Saudiya 2 + BAA 2 = **7 qator** qayta ko'rildi, **6 tasi** qayta yozildi.

---

## 1. To'liq tekshirilgan 3 qator (`reliability = 10`)

| Qator | Avval | Endi |
|---|---|---|
| **799** Bilkent | "USD 18 400" | **Foizli waiver: 5 pog'ona, 20 % → 100 %** (20 % qadam bilan). **4 semestr** tayyorlov + **10 semestr** bakalavriat. Saqlash: **minimum kredit + yillik GPA 2.00** (turar joy uchun **2.50**); pasaysa **qaytarilmaydi**. Qo'shimcha: **turar joy stipendiyasi** (faqat to'liq waiver egalariga), davom etuvchilar uchun merit (**top 5 %, GPA 3.30**) → 100/80/60/40/20 %. **Turkiya fuqaroligi bo'lganlar umuman ololmaydi** |
| **826** Sabancı | "USD 27 375" | **Barcha xalqaro arizachilar avtomatik** ko'riladi; qo'mita 6 mezon bo'yicha qaror qiladi; **summa va foiz e'lon qilinmagan**; mukofot **butun o'qish davri** uchun; **erta ariza ustuvor** |
| **823** Koç | "USD 38 000" | **25 / 50 / 75 / 100 %** tuition (bakalavriat; **Tibbiyot chiqarilgan**). Alohida ariza **yo'q**, **need-blind**. Faqat tuition — **turar joy, yashash, kitoblar kirmaydi**. **SAT/ACT/IB/A-Level bo'lmasa** imkoniyat keskin tushadi. Magistratura (thesis) — **100 %**, PhD — **to'liq**; **taught masterlarda stipendiya yo'q** |

## 2. Mexanizm yozilgan 3 qator (`reliability = 4`)

| Qator | Valyuta | Sabab |
|---|---|---|
| **454** KFUPM | **SAR** | `postgrad.kfupm.edu.sa/scholarships` **yuklanmadi** |
| **501** Khalifa | **AED** | `admissions.ku.ac.ae` — loyihada avval ham **o'lik** deb qayd etilgan hub |
| **848** UAEU | **AED** | sahifa o'qilmadi |

## 3. Tegilmagan 1 qator — **908 KSU (USD 14 400)**

Bu qator **43-passda** tekshirilgan: **KSU o'zi** SAR 54 000 = **USD 14 400** deb yozadi. Ya'ni bu **uydirma emas** — shuning uchun `>5000` ro'yxatida qoldi va **o'zgartirilmadi**. Saudiya bo'yicha qolgan yagona yuqori qator shu.

---

## 4. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Foizni summaga aylantirish** | 799 (20–100 %), 823 (25–100 %) | `award_amount = NULL`, `award_currency = NULL` — foizga valyuta kerak emas |
| 2 | **Uydirma summa** | 799 (18 400), 823 (38 000), 826 (27 375), 454 (40 000), 501 (26 000), 848 (21 740) | 3 tasi haqiqiy tuzilma bilan, 3 tasi **bo'sh** |
| 3 | **Ko'rinmas shartlar** | 799, 823 | Bilkent: **GPA 2.00/2.50** + **Turkiya fuqaroligi taqiqi**; Koç: **tibbiyot chiqarilgan** + **imtihon bali shart** + **faqat tuition** |
| 4 | **Magistratura/PhD farqi yozilmagan** | 823 | Master-thesis **100 %**, PhD **to'liq**, **taught masterlarda 0** |
| 5 | **Valyuta** | 454, 501, 848 | USD → **SAR / AED** |
| 6 | **`reliability = 9/10` bo'lgan uydirma** | 454, 501, 848 | **4** ga tushirildi |

---

## 5. Uch muhim topilma

**1) Turkiyada stipendiya — bu foiz, pul emas.**
Bilkent 20–100 %, Koç 25–100 %. Ya'ni "USD 38 000 stipendiya" degan yozuv mohiyatan xato: mukofot **tuitionning foizi**, va u **yashash xarajatini qoplamaydi**.

**2) Koç'da tibbiyot — istisno.**
*"The School of Medicine does NOT award any type of merit or need-based scholarships"* — tibbiyotga ariza beruvchi xalqaro talaba **to'liq to'lovni** rejalashtirishi shart.

**3) Bilkent'da fuqarolik taqiqi.**
*"Applicants and students, who previously had or already have Turkish citizenship are not eligible"* — bu O'zbekiston nomzodi uchun muhim emas, lekin qatorning avvalgi tavsifida umuman yo'q edi.

---

## 6. Hisoblagichlar

| Ko'rsatkich | Pass 71 | Pass 72 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `amount_usd_value > 5000` | 36 | **30** | **−6** |
| shundan **Turkiya + BAA** | 5 | **0** | **−5** ✅ |
| shundan **Saudiya** | 2 | **1** (908, KSU tasdiqlagan) | −1 |
| `source_reliability = 4` | 116 | **119** | +3 |
| bare-domain | 83 | **83** | 0 |

---

## 7. Tekshiruv

6 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 8. Keyingi qadam

Qolgan **30 qator**:
- **AQSh 9** — hammasi tasdiqlangan chegara, tegmadik.
- **Irlandiya 2**, **Meksika 2**, **Chili 2** = **6**.
- **15 ta bir qatorli davlat** = 15 (Saudiya 1, Tayvan 1, Sloveniya 1, Braziliya 1, Indoneziya 1, Argentina 1, Malayziya 1, Kolumbiya 1, Hindiston 1, Chexiya 1, O'zbekiston 1, Tailand 1, Janubiy Afrika 1, Rossiya 1).

1. **73-pass** — **Irlandiya + Meksika + Chili** = **6 qator**.
2. Keyin 15 ta bir qatorli davlat.
3. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori va **83** bare-domain.
