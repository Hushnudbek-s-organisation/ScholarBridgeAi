# ScholarBridgeAi — stipendiyalarni qayta yozish, 50-pass (Britaniya dumlari, 1-qism)

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — 1 qator tekshirib qayta yozildi, 9 qator **halol holatga** keltirildi.

---

## 1. Nima qilindi

### Tekshirilgan va qayta yozilgan (1)

| Qator | Avval | Endi |
|---|---|---|
| **316** University of Glasgow | "Glasgow International Leadership Scholarship", uydirma **USD 30 000**, "March 31", 3 daraja, **o'lik havola** | **"University of Glasgow Global Leadership Scholarship"** — **GBP 10 000 kontrakt chegirmasi** (1 yil), 2027/28 uchun **350 ta** o'rin. Talablar: 1 yillik to'liq kunlik **taught master**, **1st Class Honours** ekvivalenti, taklifnoma, xalqaro/EU fee status. **O'zbekiston ruxsat etilgan davlatlar ro'yxatida**. Ariza — taklifnomadan keyin portal orqali, hozir **yopilish sanasisiz ochiq** |

### Halol holatga keltirilgan (9)

Bular "Vice-Chancellor's PhD Scholarship" oilasi: **355** York, **359** Loughborough, **364** Exeter, **365** Cardiff, **369** Bath, **383** Leicester, **384** UEA, **390** Portsmouth, **406** Lancaster.

Har birida: nom **birlashtirilgan shablon** ("Vice-Chancellor's PhD Scholarship" 9 xil universitetda bir xil tuzilma bilan), summa — **yumaloq USD raqam** (30 000–42 000), muddat — "January 31 annually", havola — `.../funding/` **katalog sahifasi**, ya'ni aynan bitta mukofotga ishora qilmaydi.

Qilingan ish — pass 29 dagi **pretsedent aynan takrorlandi** (o'sha paytda 10 ta UK qatori shunday qilingan; qator 550 Cardiff hali ham o'sha izoh bilan turadi):

| Maydon | Amal |
|---|---|
| `amount_usd_value` | uydirma summa → **0** |
| `award_amount` | **NULL** |
| `award_currency` | **GBP** |
| `deadline` / `deadline_type` | umumiy yanvar sanasi olib tashlandi → `not_published` |
| `min_ielts` / `min_gpa` | uydirma qiymatlar → **NULL** |
| `coverage_type` | → **Unspecified** |
| `title` | "…postgraduate research funding (named award unconfirmed)" — **nom fakt sifatida ko'rsatilmaydi** |
| `description` / `requirements` / `tuition_coverage` | "hech narsa da'vo qilinmaydi; universitetning funding katalogini o'qing" |
| `source_reliability` | **4** |
| `notes` | nima uchun summa olib tashlangani va nom tasdiqlanmagani yozilgan |
| Qator | **o'chirilmadi** — chunki ichidagi katalog havolasi haqiqiy va foydali |

`university_scholarships`: **59** yangilandi; **591, 594, 597, 600, 602** → `No` (izoh bilan).

---

## 2. Nega o'chirilmadi?

Pass 48 da UBA va USP **o'chirildi**, chunki ular "stipendiya yo'q" degan aniq javobga ega edi va **hech qanday foydali havola** qoldirmagan. Bu 9 qatorda esa universitetning **haqiqiy funding katalogi** bor. Shuning uchun ular pass 29 pretsedenti bo'yicha saqlanadi: summa olib tashlanadi, nom betaraf qilinadi, `source_reliability = 4`, va izohda "tekshirilmagan" deb ochiq yoziladi. Bu foydalanuvchini soxta raqamga yubormaydi, lekin haqiqiy manbaga yo'naltiradi.

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 49 oxiri | Pass 50 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 237 | **227** |
| shundan Britaniya | 37 | **27** |
| Yalang'och domenli `website_url` | 61 | **61** |
| Faol stipendiyalar | 560 | **560** |
| Nafaqaga chiqarilganlar | 106 | **106** |
| Shablon tavsiflar | 0 | **0** |

---

## 4. Keyingi qadam

1. **27 Britaniya qatori** qoldi. Ular orasida haqiqiy mukofotlar bor (Warwick Chancellor's International, Manchester President's Doctoral Scholar, Bristol Think Big, UCL Global Masters, Edinburgh Global, Nottingham, Sheffield, Leeds, Birmingham, St Andrews Handsel, QMUL, KCL va boshqalar) — har birini o'z sahifasidan tekshirib qayta yozish kerak.
2. **Bristol Think Big** bu passda **o'zgartirilmadi**: sahifa olindi, lekin summa e'lon qilingan bo'lim chunk'larda topilmadi — summani taxmin qilmaslik uchun keyingi passga qoldirildi.
3. Keyin AQSh (63), Avstraliya (25), Kanada (15).

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (10 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-25 da ochilgan)

`gla.ac.uk/scholarships/globalleadershipscholarship/` · `bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/` (o'qildi, summa topilmadi — qator o'zgartirilmadi)

SQL: `supabase/scholarship_rewrite_pass50_2026-10-23.sql`
