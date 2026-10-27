# ScholarBridgeAi — stipendiyalarni qayta yozish, 66-pass (Shveytsariya)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Shveytsariya — 9 qator qayta yozildi.
**Natija:** **Shveytsariyada `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. To'liq tekshirilgan 3 qator (`reliability = 10`)

| Qator | Avval | Endi |
|---|---|---|
| **14** Swiss Government Excellence Scholarships | uydirma **USD 32 000**, nomida **"(ETH Zurich)"**, "Nov–Feb" | **Federal dastur (ESKAS)**, **183 davlat**, **CHF 2 450/oy**, **maksimal yosh 35**. Turlari: **Research 12 oy**, **PhD 36 oy**, **Art 21 oy** (faqat 26 davlat, bakalavr). **Shveytsariyada supervisor majburiy**. Ariza **elchixonaga** (universitetga emas). Ariza **bepul** (firibgarlik ogohlantirishi bor). Ariza **20-avgust 2026** da ochilgan, muddat **davlatga qarab**, qaror **may oxirigacha** |
| **13** ETH ESOP | uydirma **USD 27 000**, "December 15 annually" | **CHF 12 000/semestr**, HS27 dan **CHF 13 500/semestr** + **tuition waiver**, 3–4 semestr. Ariza oynasi **1–30-noyabr 2026** (11:59 MEZ) — **boshqa oyna yo'q**. 2027/28 uchun **~60 stipendiya**, qaror **mart oxiri**. Shart: bakalavr **top 10 % / A**, **pre-proposal** + 2 ta reference |
| **40** EPFL Master Excellence | uydirma **USD 25 000** | **CHF 10 000/semestr + kafolatlangan turar joy**. Ariza formasiда **belgi qo'yish** shart. Muddatlar: **15-dekabr** (IS-Academia) / **31-yanvar** (EPFL ichki, ketma-ket magistratura). Yangilash: **≥50 ECTS**, o'rtacha **5.0/6** |

## 2. Mexanizm yozilgan 6 qator (`reliability = 4`)

**130** EPFL doktorlik · **341** Geneva · **409** UNIL · **407** Basel · **408** Bern · **331** UZH

Har birida: `amount = 0`, `award_amount = NULL`, **`CHF`**, `coverage = Unspecified`, `deadline = not_published`, `notes`da importerning uydirma USD summasi va "annually" muddati ko'rsatilgan.

**Muhim izoh — 130-qator:** EPFL'da doktorantlar **assistantship shartnomasi** (maosh) bilan moliyalashtiriladi, "Excellence Fellowship" esa **magistratura** mukofoti (40-qator). Importer ikkisini birlashtirib yuborgan.

---

## 3. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 9/9 | USD → **CHF** |
| 2 | **Uydirma summa** | 14 (32 000), 13 (27 000), 40 (25 000), 130 (40 000), 341 (24 000), 409 (22 000), 407 (45 000), 408 (42 000), 331 (38 000) | 3 tasida **haqiqiy CHF stavka**, 6 tasida **bo'sh** |
| 3 | **Uydirma muddat** | 13 ("Dec 15"), 14 ("Nov–Feb"), 6 qatorda "annually" | 13 → **1–30-noyabr**, 40 → **15-dekabr / 31-yanvar**, 14 → `not_published` (davlatga qarab) |
| 4 | **Noto'g'ri egasi** | 14 | "(ETH Zurich)" — aslida **federal dastur**; nom **ESKAS** ga o'zgartirildi |
| 5 | **Ikki narsani birlashtirish** | 130 | EPFL doktorlik **assistantship** ≠ master **Excellence Fellowship** |
| 6 | **Semestr to'lovini "yillik" deb yozish xavfi** | 13, 40 | `award_amount = NULL` — bazada **semestr** davri yo'q, shuning uchun raqam matnda, izoh bilan |
| 7 | **O'lik URL** | 341, 409 | Geneva va UNIL sahifalari **404** — notesda qayd etildi |
| 8 | **`reliability = 10` bo'lgan uydirma** | 6 qator | **4** ga tushirildi |

---

## 4. Uch muhim topilma

**1) ESKAS — O'zbekiston nomzodi uchun eng real federal yo'l.**
183 davlat, **CHF 2 450/oy**, yosh chegarasi **35**, lekin **Shveytsariyada supervisor** topilmasa ariza ko'rilmaydi. Ariza **elchixonaga** topshiriladi va **bepul** — pul so'ragan har qanday xabar — firibgarlik.

**2) ETH ESOP'da bitta oyna bor.**
**1–30-noyabr**; kechikkan ariza qabulga ko'riladi, lekin **stipendiyaga mos emas**. Ya'ni "keyinroq yuboraman" degan strategiya ishlamaydi.

**3) EPFL'da ikki xil narsa bor.**
**Magistratura** — CHF 10 000/semestr + turar joy; **doktorlik** — assistantship maoshi. Bularni bitta qatorga qo'shish ham summani, ham mexanizmni buzadi.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 65 | Pass 66 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 106 | **97** | **−9** |
| shundan **Shveytsariya** | 9 | **0** | **−9** ✅ |
| `source_reliability = 4` | 59 | **65** | +6 |
| bare-domain | 84 | **84** | 0 |
| shablon tavsif | 0 | **0** | 0 |

---

## 6. Tekshiruv

9 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 7. Keyingi qadam

1. **67-pass** — **Xitoy 9** (keyin Gonkong, Koreya 6, Shvetsiya 6, Singapur 6, Yangi Zelandiya 5).
2. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori, keyin **84** bare-domain.
3. Avstraliya (17), Kanada (12) va Shveytsariya (6) doktorlik qatorlari `reliability = 4` — sahifalar o'qilgach qayta yoziladi.
