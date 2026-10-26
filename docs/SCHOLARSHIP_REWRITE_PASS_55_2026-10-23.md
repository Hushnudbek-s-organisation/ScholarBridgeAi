# ScholarBridgeAi — stipendiyalarni qayta yozish, 55-pass (Britaniya dumlari, 6-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — **8 qator bir passda** halol holatga keltirildi.

---

## 1. Nima qilindi

Sakkizala qator "nom + yumaloq dollar summasi + umumiy yanvar muddati + katalog havolasi" shablonining aynan bir turi edi. Tekshiruv natijasi:

| Qator | Universitet | Tekshiruv natijasi (2026-10-26) | Yangi holat |
|---|---|---|---|
| **326** | Birmingham | `…/global-masters-scholarship` → **404** | pointer: `birmingham.ac.uk/study/postgraduate` |
| **318** | Southampton | `…/presidential-scholarships` → **404** | pointer: universitet **qidiruv** sahifasi |
| **327** | St Andrews | `…/recent-scholarships/` → **404** | pointer: universitet bosh sahifasi |
| **131** | Edinburgh | `ed.ac.uk/student-funding/postgraduate/global-research` → **registry 404** | pointer: `search.ed.ac.uk` |
| **312** | Leeds | `…/doc/scholarships` → **404** | pointer: `courses.leeds.ac.uk` |
| **333** | Sheffield | sahifa **ochildi va hal qiluvchi**: Hossein Farmy (2027 boshida e'lon), CSC (**yopiq — 2027 uchun yo'q**), Sheffield Research Scholarships (**yopiq — 2027 uchun yo'q**); import qilingan nom **umuman yo'q** | pointer: `sheffield.ac.uk/postgraduate/phd/scholarships` |
| **362** | Newcastle | sahifa — umumiy **fees & funding hub** + baza; mos nom yo'q | pointer: `ncl.ac.uk/postgraduate/fees-funding/` |
| **498** | QMUL | hub **ochildi**: interaktiv baza bor, `$30 000` "International Excellence" **yo'q**; faqat video sarlavhasida **GBP 5 000 Global Talent** ko'rinadi (tekshirilmagan) | pointer: `qmul.ac.uk/scholarships/` |

Har birida: `amount_usd_value = 0`, `award_amount = NULL`, `award_currency = 'GBP'`, `deadline_type = 'not_published'`, uydirma IELTS/GPA → `NULL`, `coverage_type = 'Unspecified'`, nom betaraf ("… (named award unconfirmed)"), `source_reliability = 4`, `notes`da aniq dalil.

`university_scholarships`: **646, 648, 571, 499, 533, 579, 596, 662** → `No`.

---

## 2. Metodologik izoh

1. **Nega o'chirilmadi:** har bir qatorda endi **haqiqiy, ochilgan** universitet sahifasi turadi (qidiruv, hub yoki katalog), shuning uchun qator foydali qoladi. Pass 48 da UBA/USP o'chirilgan edi, chunki ular hech qanday foydali havola qoldirmagan.
2. **Uchta yalang'och domen:** Edinburgh (`search.ed.ac.uk`), Leeds (`courses.leeds.ac.uk`) va St Andrews (`www.st-andrews.ac.uk`) uchun universitet **o'zi** 404 sahifasida faqat shu manzillarni taklif qilgan. Shu sababli `bare_domain` ko'rsatkichi **61 → 64** ga oshdi. Bu **ma'lum 404 havolani qoldirishdan afzal** va hujjatda qayd etildi.
3. **Sheffield eng foydali topilma:** katalogdagi **ikki asosiy 2027 yo'nalishi ham yopiq** — bu O'zbekistonlik nomzod uchun amaliy ma'lumot va u matnda yozilgan.

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 54 oxiri | Pass 55 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 217 | **209** |
| shundan **Britaniya** | 17 | **9** |
| Yalang'och domenli `website_url` | 61 | **64** (+3, yuqoridagi izoh) |
| `source_reliability = 4` qatorlar | 12 | **20** |
| Faol stipendiyalar | 559 | **559** |
| Nafaqaga chiqarilganlar | 107 | **107** |

---

## 4. Keyingi qadam

**9 Britaniya qatori** qoldi: Edinburgh Global (53), Liverpool (385), Aberdeen Elphinstone (367), QUB (389), Aston (368), Essex (387), Kent (388), Imperial PhD (3), va bittasi.

Keyin AQSh (**63**), Avstraliya (**25**), Kanada (**15**) va 64 yalang'och domen.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (8 qator) | hammasi toza; `bare = true` faqat yuqorida tushuntirilgan 3 qatorda |

---

## 6. Manbalar (2026-10-26 da ochilgan)

**Ochildi:** `sheffield.ac.uk/postgraduate/phd/scholarships` · `ncl.ac.uk/postgraduate/fees-funding/` · `qmul.ac.uk/scholarships/`

**404:** `birmingham.ac.uk/postgraduate/fees-and-funding/global-masters-scholarship` · `southampton.ac.uk/study/postgraduate-research/fees-funding/presidential-scholarships` · `st-andrews.ac.uk/study/fees-and-funding/postgraduate/scholarships/recent-scholarships/` · `ed.ac.uk/student-funding/postgraduate/global-research` · `leeds.ac.uk/research-degrees/doc/scholarships`

SQL: `supabase/scholarship_rewrite_pass55_2026-10-23.sql`
