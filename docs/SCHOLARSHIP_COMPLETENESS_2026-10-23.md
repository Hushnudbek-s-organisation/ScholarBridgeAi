# Har bir stipendiya sahifasini to'liq qilish — 1-bosqich (2026-10-23)

**Talab:** *"Hamma scholarshiplarni men aytgan deb detailed qilib chiqarishi kerak — u
ma'lumotlarni database ga kiritib chiqishing kerak, boshidan boshlab kiritib chiq."*

---

## 1. Siz aytgan 6 ta blok — endi 646 / 646

| Blok | Maydon | Qamrov |
|---|---|---|
| **Dastur haqida** | `description` | 646 / 646 |
| **Kimlar uchun mo'ljallangan** | `requirements` | 646 / 646 |
| **Moliyalashtirish** | `coverage_type` + `funding_type` + `tuition_coverage` | 646 / 646 |
| **Til talabi** | `english_requirements` | **646 / 646** ← shu bosqichda yopildi |
| **Foydali tomonlari** | coverage + `award_amount` + nafaqalar | 646 / 646 (bo'sh bo'lsa "ko'rsatilmagan") |
| **Oxirgi muddat** | `deadline` | 646 / 646 |
| Daraja | `degree_levels` | 646 / 646 |
| Yo'nalishlar | `eligible_majors` | 646 / 646 |
| Manba | `source_url` + `website_url` | 646 / 646 |

**Til talabi** — oxirgi 17 tasi qolgan edi: 10 ta hukumat dasturi (859–868) va 7 ta yangi
xalqaro dastur (888–894). Ularda bitta umumiy ball yo'q, shuning uchun har biriga **rostini**
yozdim:

- Fulbright (889) → *"TOEFL is required after nomination; no minimum score is published"*
- Honjo (893) → *"Basic conversational Japanese is required — the interview is in Japanese"*
- Yenching (894) → *"English proficiency evidence is required; the official page does not publish minimum scores"*
- Qolganlari → *"No single score is published — the host university or programme sets the English requirement"*

Hech qayerda to'qilgan ball yo'q.

## 2. Har bir sahifada "Hujjat topshirish" tugmasi

Avval 299 ta yozuvda `application_url` yo'q edi va qizil tugma umuman chiqmasdi.
Endi: `application_url` bo'lsa — o'sha; bo'lmasa — **rasmiy manba sahifasi**, va tugma
yozuvi ham shuni aytadi: *"Rasmiy sahifada topshirish"*. Soxta `/apply` havolasi yasalmaydi.

## 3. Chuqur to'ldirish — birinchi 3 ta (namuna)

| ID | Stipendiya | Nima qo'shildi |
|---|---|---|
| 23 | **Clarendon Fund (Oxford)** | alohida ariza yo'qligi, 200+ to'liq grant, barcha davlatlar/sohalar, hujjatlar ro'yxati; o'lik `/clarendon` havolasi yangi sahifaga almashtirildi |
| 26 | **ETH Zurich ESOP** | **o'lik havola topildi va tuzatildi**, muddat 30-noyabr 2026, CHF 12 000/semestr (HS27 dan 13 500), pre-proposal + 2 tavsiyanoma, ~60 grant |
| 32 | **Schwarzman Scholars** | muddat sana emas, **davr** (aprel–sentabr 2027), IELTS 7 / TOEFL 100 / Cambridge 185 / Duolingo 130, 7 ta hujjat ro'yxati, ariza havolasi |

Uchtasida ham eski **yumaloqlangan USD summalar** (45 000 / 40 000 / 80 000) olib tashlandi —
manbada bunday raqam yo'q; endi "to'liq moliyalash" deb ko'rsatiladi.

## 4. Qolgan ish — ochiq ro'yxat

Bular sahifada "ko'rsatilmagan" bo'lib turadi, chunki **manba ularni e'lon qilmagan** yoki
hali o'qilmagan. To'qib yozilmaydi.

| Maydon | Bo'sh | Izoh |
|---|---|---|
| `required_documents` | 426 | har bir universitet sahifasini o'qish kerak |
| `application_fee` | 429 | ko'pchilikda umuman yo'q |
| `accommodation` | 429 | faqat ayrim dasturlar yozadi |
| `living_allowance` | 444 | |
| `travel_allowance` | 549 | |
| `application_url` | 299 | sahifada tugma baribir ishlaydi (rasmiy havola) |
| `deadline_date` (aniq sana) | 226 | matn ko'rinishidagi muddat bor |
| `eligible_countries` | 41 | |

Ish tartibi: universitet sahifasi → hujjatlar/summalar → `required_documents` / `application_fee`
→ `notes` ga "qaysi kuni o'qildi". Har safar 10–20 ta.

## 5. Qayta bo'lib qolmasligi uchun tekshiruv

Yangi skript: `npm run test:scholarship-detail` (`scripts/check-scholarship-detail.ts`).

- **11 ta qattiq shart** — verified va faol har bir stipendiyada 6 blokning maydonlari,
  daraja, yo'nalish, manba, `award_basis`/`award_period` qiymatlari. Bittasi bo'sh bo'lsa — FAIL.
- **8 ta ma'lumot qatori** — hujjatlar, to'lov, turar joy, nafaqalar, aniq sana, yumaloq
  summalar. Bular FAIL emas: bo'sh bo'lishi "manba e'lon qilmagan" degani.

Jonli bazada hozir: **11 / 11 qattiq shart bajarilgan**.

## 6. Keyingi qadam

1. Har safar 10–20 ta universitet stipendiyasini rasmiy manbadan to'ldirish (426 ta qoldi).
2. `format` (onlayn/offlayn) va `duration` (davomiylik) ustunlarini qo'shish — namunada bor,
   bazada hozircha yo'q.
3. Har bir stipendiyaga rasm (`image_url`) — tasdiqlangan manbadan.
4. `amount_usd_value` yumaloq raqamlar bo'yicha 140 ta shubhali qatorni alohida audit qilish
   (5 000 ga karrali summalar — eski import izi bo'lishi mumkin).
