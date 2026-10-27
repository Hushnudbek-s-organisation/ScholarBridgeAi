# ScholarBridgeAi — stipendiyalarni qayta yozish, 54-pass (Britaniya dumlari, 5-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — 1 qator qayta yozildi, 1 qator halol holatga keltirildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **154** LSE | "LSE PhD Studentship and Master Awards", uydirma **USD 45 000**, "January 15", 3 daraja, **404 havola** | **"LSE PhD Studentships"** — **4 yil, to'liq kontrakt + yillik stipendiya**, **barcha millatlar va barcha tadqiqot sohalari uchun**. **Alohida ariza yo'q** — bo'limlar nomzod ko'rsatadi. Uch muddat: **3-dek 2026** (erta), **13-yanvar 2027** (standart), **27-may 2027** (ba'zi bo'limlar). Ba'zi stipendiyalarda **~100 soat o'qitish** majburiyati |
| **455** KCL | "KCL International Excellence Scholarship", uydirma **USD 25 000**, havola — **bakalavrga qabul qo'llanmasi** | **Halol holatga keltirildi** — bunday umumiy mukofot **yo'q**; KCL **fond ma'lumotlar bazasi** yuritadi. Aniqlangan mukofotlar ro'yxati yozildi: International Hardship Fund (**GBP 6 000 gacha**, faqat o'qiyotganlarga, 31-may 2027), VC Awards (**GBP 5 000**), GREAT (**~GBP 10 000**, davlatlar ro'yxati), Marshall (AQSh), **K-CSC** (xitoyliklar, 1-yanvar 2027), geografiya bo'limi (**GBP 9 250**) |

`university_scholarships`: **537** yangilandi, **27** → `No`.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Nomuvofiq nom** | 154, 455 | LSE'da "and Master Awards" qismi **yo'q** (faqat PhD); KCL'da "International Excellence Scholarship" **umuman yo'q** |
| 2 | **Ariza mexanizmi noto'g'ri** | 154 | Alohida stipendiya arizasi **yo'q** — bo'lim nomzodi; ariza faqat qabul arizasi orqali |
| 3 | **Muddat o'ylab topilgan** | 154 ("Jan 15"), 455 | LSE — **3-dek / 13-yanvar / 27-may**; KCL — `not_published` |
| 4 | **Yaroqsiz havola** | 154, 455 | LSE `/secure/` segmentli URL **404**; KCL havolasi **bakalavr qo'llanmasi** edi |
| 5 | **Uydirma USD** | 154 (45 000), 455 (25 000) | → `0`, `award_currency = 'GBP'` |
| 6 | **Daraja** | 154 (3 daraja) | → **faqat PhD** |
| 7 | **Stipendiya raqamlari ziddiyati** | 154 | LSE sahifalarida **GBP 23 805** (2026/27) va **GBP 22 780** (2025) — yechilmadi, ikkalasi ham matnda qayd etildi, `award_amount = NULL` |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 53 oxiri | Pass 54 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 219 | **217** |
| shundan Britaniya | 19 | **17** |
| Yalang'och domenli `website_url` | 61 | **61** |
| Faol stipendiyalar | 559 | **559** |
| Nafaqaga chiqarilganlar | 107 | **107** |

---

## 4. Keyingi qadam

Qolgan **17 Britaniya qatori**: Leeds (312), Edinburgh (131, 53), Southampton (318), Sheffield (333), Newcastle (362), St Andrews (327), Liverpool (385), Aberdeen Elphinstone (367), QUB (389), Aston (368), Essex (387), Kent (388), Birmingham (326), Imperial PhD (3), QMUL (498).

Keyin AQSh (63), Avstraliya (25), Kanada (15), va 61 yalang'och domen.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (2 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-26 da ochilgan)

`lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships` · `kcl.ac.uk/study/undergraduate/how-to-apply` (stipendiya mazmuni yo'q) · `kcl.ac.uk/study/funding/funding-opportunities` (mukofotlar portfeli, qidiruv orqali)

Ochilmagan (404): `lse.ac.uk/study-at-lse/Graduate/fees-and-funding/secure/lse-phd-studentships` · `kcl.ac.uk/study/postgraduate-doctoral/fees-and-funding/pgr-funding-options`

SQL: `supabase/scholarship_rewrite_pass54_2026-10-23.sql`
