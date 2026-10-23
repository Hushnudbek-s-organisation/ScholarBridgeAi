# Stipendiyalarni to'ldirish — 3-batch (2026-10-23)

Ikki yangi dastur qo'shildi, uchtasi **rad etildi**. Har biri o'z rasmiy sahifasidan o'qildi
va alohida yozildi.

---

## 1. Qo'shilgan

| ID | Dastur | Daraja | Muddat | Kim uchun |
|---|---|---|---|---|
| 898 | **Romanian Government Scholarship (MFA)** | Bakalavr, Magistratura, PhD | 16-fevral – 31-mart 2027 (kutilmoqda) | Barcha **norasmiy YeI** davlatlari — O'zbekiston kiradi |
| 899 | **Heinrich Böll Foundation** | Magistratura, PhD | **1-mart 2027** / 1-sentabr 2027 | YeI va DAC davlatlari (O'zbekiston DAC ro'yxatida) |

### 898 — Ruminiya

- Ro'yxatdan o'tish va kontrakt to'lovi, oylik stipendiya, davlat subsidiyasidagi yotoqxona qoplanadi;
  **aviabilet qoplanmaydi**.
- Bakalavr va magistratura **rumin tilida** — til bilmaydiganlarga 1 yillik tayyorlov kursi to'lanadi.
- Tibbiyot, stomatologiya va farmatsiya **chiqarib tashlangan**.
- Oxirgi bosqichda o'rtacha baho kamida **7/10**; apostil va tarjima qilingan hujjatlar kerak.
- 2026/27 chaqirig'i 16-fevral – 31-mart 2026 da bo'lgan → 2027/28 hali e'lon qilinmagan,
  shuning uchun `deadline_date = NULL`, `deadline_type = 'not_published'`, kutilayotgan davr yozildi.
- Stipendiya miqdori (65/75/85 EUR) faqat uchinchi tomon saytlarida — **yozilmadi**.

### 899 — Heinrich Böll

- Germaniyadagi yashil partiya fondi; yiliga ~1 000 kishi moliyalanadi.
- Shart: birinchi diplom Germaniyadan tashqarida olingan bo'lishi, magistraturaga **boshlashdan oldin**
  ariza berish, dastur kamida **4 semestr**, nemis tili **B2 / DSH 1** (sertifikat bilan).
- DAC davlatlariga ustuvorlik; Germaniyaga ko'chib o'tmaganlar ustuvor.
- Ikki marta qabul: **1-mart** va **1-sentabr**, portal ~6 hafta oldin ochiladi.
- Oylik stipendiya miqdori rasmiy sahifada yo'q → `amount_usd_value = 0`.

## 2. Rad etilgan (O'zbekiston uchun ochiq emas)

| Dastur | Sabab |
|---|---|
| **Czech Government Scholarship** | 2027/28 uchun faqat **13 davlat**; O'zbekiston yo'q |
| **Aga Khan Foundation ISP** | Ro'yxat: Afg'oniston, Bangladesh, Misr, Hindiston, Keniya, Qirg'iziston, Madagascar, Mozambik, Pokiston, Suriya, Tojikiston, Tanzaniya, Uganda — **O'zbekiston yo'q** |
| **Konrad-Adenauer (KAS)** | Germaniyada yashovchilar uchun sana aniq (15-iyul), xorijdagilar uchun yagona sana yo'q — O'zbekiston uchun aniq shart topilmadi, keyinga qoldirildi |

## 3. Baza holati

| Ko'rsatkich | Qiymat |
|---|---|
| Faol stipendiya | **650** (648 → 650) |
| Universitetga bog'lanmagan (xalqaro) | **71** (69 → 71) |
| Til talabi bo'sh | **0** |
| `funding_type` / `tuition_coverage` bo'sh | **0** |

## 4. Navbatda

- **IsDB** — O'zbekiston a'zo, lekin dasturlar asosan LDC mamlakatlar uchun; qaysi biri ochiqligini aniqlashtirish
- **Slovak SAIA (NSP)** — O'zbekiston uchun ochiq, muddatlarini tekshirish
- **New Zealand Scholarships** — ishtirokchi davlatlar ro'yxatida O'zbekiston bormi
- **KAS** — O'zbekiston uchun yo'l topilsa
- **HKU / NTU** o'lik havolalarini tuzatish
- 425 ta yozuvga hujjatlar ro'yxatini qo'shish (o'z sahifasidan)
