# Stipendiya sahifalari — har bir scholarship uchun to'liq detal sahifa (2026-10-23)

**Talab:** har bir stipendiyada GrantGO'dagidek to'liq detal sahifa bo'lsin — moliyalashtirish,
til talabi, kimlar uchun, imtiyozlar, dastur haqida, oxirgi muddat — va hammasi **3 tilda**
(uz / ru / en). Universitetlarda "ko'rish" tugmasi bor; stipendiyalarda ham shunday tugma
bo'lishi kerak.

---

## 1. Yangi sahifa: `/scholarships/[id]`

Server tomonda render qilinadi, manba — mavjud `scholarships` jadvali (yangi jadval qo'shilmadi).

| Bo'lim | Manba |
|---|---|
| **Dastur haqida** | `description` |
| **Kimlar uchun mo'ljallangan** | `requirements` + daraja, yo'nalishlar, davlatlar, `min_gpa`, `min_ielts` |
| **Imtiyozlar va qulayliklar** | `coverage_type`, `tuition_coverage`, `award_amount`, `living_allowance`, `travel_allowance`, `accommodation` |
| **Topshirish jarayoni** | `required_documents`, `rounds`, `application_url` (yashil "Hujjat topshirish" tugmasi) |
| **Qo'shimcha ma'lumot** | `recurrence`, `application_status`, `application_fee`, `last_verified_at` |
| **Muhim tafsilotlar** (o'ng panel) | til talabi, imkoniyat turi, daraja, moliyalashtirish, davlat, muddat, ariza to'lovi |
| **Mundarija** (o'ng panel) | bo'limlarga anchor havolalar |

O'ng panelda, xuddi namunadagidek: **Rasmiy havola** (oq) va **Hujjat topshirish** (qizil) tugmalari.

Sahifa manzili: `/scholarships/{id}` — masalan `/scholarships/888`.

## 2. "Ko'rish" tugmasi

| Joy | Nima o'zgardi |
|---|---|
| `/scholarships` ro'yxati | har bir kartada ko'k **"Batafsil"** tugmasi → `/scholarships/{id}`; yonida tashqi "Website" havolasi |
| Ilova ichidagi `ScholarshipHub` | har bir kartaning amallar qatorida **"Batafsil ma'lumot"** tugmasi |
| `sitemap.xml` | barcha faol stipendiya sahifalari qo'shildi (baza ishlamasa — sitemap buzilmaydi, ular shunchaki tushib qoladi) |

## 3. Uch til

- Barcha yorliqlar `src/i18n/messages/{en,uz,ru}.json` → yangi `scholarshipDetail` bo'limi (53 kalit).
- Matn (description/requirements) mavjud `catalogLocalizer` orqali o'tadi: ma'lum iboralar
  uz/ru ga tarjima qilinadi, notanish matn **o'zgartirilmasdan** qoldiriladi (mashina tarjimasi
  yo'q — bu ataylab shunday).
- Yo'l-yo'lakay tuzatildi: `Uzbekistan`, `Hungary`, `Poland`, `Turkey` mamlakat nomlari uz/ru da
  tarjima qilinmasdi (QI matnida inglizcha chiqardi) — `EXTRA_COUNTRY_NAMES` ga qo'shildi.

## 4. Ma'lumot to'ldirish (to'qima emas, hosil qilingan)

Sahifadagi bloklar hamma yozuvda to'liq chiqishi uchun ikki ustun to'ldirildi.
Ikkalasi ham **yozuvning o'zida bor qiymatdan** olingan, yangi fakt qo'shilmagan:

| Maydon | Oldin bo'sh | Manba | Natija |
|---|---|---|---|
| `english_requirements` | 299 | `min_ielts` | 629 / 646 to'ldi |
| `funding_type` | 9 | `coverage_type` | 646 / 646 |
| `tuition_coverage` | 9 | `coverage_type` | 646 / 646 |

Qolgan 17 tasida `min_ielts` yo'q — sahifada **"Ko'rsatilmagan"** deb chiqadi, ball to'qilmaydi.

SQL: `supabase/scholarship_detail_backfill_2026-10-23.sql`

## 5. Nima ko'rsatilmaydi

- **Rasm** — bazada stipendiya uchun rasm ustuni yo'q; soxta rasm qo'yilmaydi.
- **Format / davomiylik** — namunada bor, lekin bazada bunday maydon yo'q. To'qib yozilmadi.
- **Ariza to'lovi 0** bo'lsa "Bepul" deb chiqadi, `NULL` bo'lsa "To'lov ko'rsatilmagan".

## 6. Tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| `tsc --noEmit` | 0 xato |
| `eslint .` | 0 xato |
| `npm run check:i18n` | PASS (5916 kalit, 3 til) |
| `npm run test:render` | 337 / 0 |
| `npm run test:responsive` | 65 |
| `npm run test:dark` | 326 qoida, 0 muammo |
| `npm run build` | OK — `/scholarships/[id]` dynamic route sifatida ro'yxatga olindi |

Qo'lda tekshiruv (lokal test bazasi, `next dev`): `/scholarships/1` en/uz/ru da 200 qaytardi,
bo'limlar, o'ng panel va tugmalar joyida.

## 7. Keyingi qadam

- Har bir stipendiyaga **rasm** qo'shish (yangi `image_url` ustuni + tasdiqlangan manbalar).
- `format` / `duration` maydonlarini qo'shib, namunadagi "Muhim tafsilotlar" blokini to'liq
  nusxalash.
- Qolgan 17 yozuvga til talabini rasmiy manbadan topib yozish.
