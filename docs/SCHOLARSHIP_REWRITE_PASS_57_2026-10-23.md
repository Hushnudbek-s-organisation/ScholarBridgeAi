# ScholarBridgeAi — stipendiyalarni qayta yozish, 57-pass (AQSh, 1-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** AQSh — 1 qator qayta yozildi, **10 qator nafaqaga chiqarildi**.

---

## 1. Qayta yozilgan

| Qator | Avval | Endi |
|---|---|---|
| **5** Stanford Knight-Hennessy | uydirma **USD 90 000**, "October 9 annually", 3 daraja | **"Knight-Hennessy Scholars (Stanford University)"** — Stanford'ning **barcha 7 maktabida** har qanday to'liq kunlik magistratura/PhD uchun: **to'liq kontrakt + yashash stipendiyasi** (turar joy, kitob, transport, shaxsiy xarajatlar) + **yillik aviachipta stipendiyasi** + **bir martalik relocation** + tibbiy sug'urta, **3 yilgacha**; uzunroq dasturlarda qolgan yillarni **bo'lim** to'laydi. **Barcha davlatlar, yosh chegarasi yo'q**. **Muhim:** KHS'ga va Stanford dasturiga **ikki alohida ariza**; **2027 kohorti yopilgan**, **2028 kohorti 2027-yil yozida** ochiladi |

## 2. Nafaqaga chiqarilgan 10 qator

**Dublikatlar (4):**

| Qator | Sabab |
|---|---|
| **21** MIT "Full Need Met" | id **1** ning dublikati; 60 000 vs id 1 dagi 86 000 — ikki xil uydirma raqam |
| **24** Harvard Financial Aid Initiative | id **10** ning dublikati; 70 000 vs 82 000. "Initiative" — dastur nomi, alohida mukofot emas |
| **35** Yale Need-Based | id **803** ning dublikati (803 da haqiqiy muddatlar va 75 220 raqami bor) |
| **45** Princeton "No Loans" | id **815** ning dublikati. "No Loans" — xususiyat, mukofot nomi emas |

**Olti universitet shabloni (6):** 456 Michigan, 460 UCLA, 462 UCSD, 464 UIUC, 475 UC Davis, 480 UMass Amherst.

Oltita **aloqasi yo'q** universitetda **bir xil nom**, **bir xil 25 000 USD**, **bir xil "Not published" muddat** va **bir xil tavsif shakli**. Bu — shablonning eng aniq belgisi. Uchtasi allaqachon tasdiqlangan qatorlarga dublikat:
- 462 → **702** (UCSD Regents & Triton)
- 475 → **694** (UC Davis Regents)
- 480 → **706** (UMass international first-year merit)

Qolgan uchtasi (456, 460, 464) uchun bu passda tasdiqlangan o'rinbosar **yo'q** — shuning uchun **qayta yozilmadi, nafaqaga chiqarildi** (yangi uydirma yaratmaslik uchun).

Kartalar: **528, 5, 17, 13, 524, 501, 505, 526, 657, 506** → `No`.

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 56 oxiri | Pass 57 oxiri |
|---|---|---|
| `>5000` faol qatorlar (jami) | 200 | **189** |
| shundan **AQSh** | 63 | **52** |
| Faol stipendiyalar | 559 | **549** |
| Nafaqaga chiqarilganlar | 107 | **117** |
| `No` kartalar | 95 | **105** |

---

## 4. AQSh navbatida qolgan 52 qator — tuzilishi

| Guruh | Soni | Nima qilish kerak |
|---|---|---|
| **"December 1/15 annually" doktorantura stipendiyalari** (105, 108, 114, 115, 116, 120, 125, 126, 127, 136, 138, 148, 150, 306, 308, 315, 320, 329, 330, 332, 334, 335, 336, 338, 340, 347, 354, 357, 366) | **29** | Har birida yumaloq 62–79 ming USD va bir xil dekabr muddati. AQShda PhD moliyalashtirish **qabul bilan birga bo'limdan** keladi, alohida "fellowship arizasi" yo'q — tasdiqlash va halol yozish kerak |
| **Need-based unda-grad** (1, 2, 6, 9, 10, 19, 20) + tasdiqlanganlar (803, 815, 605) | ~10 | Qolganlarini tasdiqlash yoki dublikatlarini yopish |
| **Merit/Regents tasdiqlanganlar** (538, 628, 694, 702, 706, 749, 757, 795?) | ~8 | Ko'pchiligi pass 30–31 da yozilgan — faqat tekshirish |
| **Boshqalar** (33 Penn World Scholars, 34 Cornell Tata, 38 JHU Hodson, 39 Berkeley Regents, 42 UChicago Odyssey, 495 Pitt) | 6 | Tekshirish |

**Keyingi pass:** 29 talik doktorantura guruhi — bir marta AQSh PhD moliyalashtirish sahifasini tasdiqlab, keyin butun guruhga bir xil halol ishlov berish.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (11 qator) | hammasi toza |

---

## 6. Manbalar (2026-10-26 da ochilgan)

`knight-hennessy.stanford.edu/admission` · `knight-hennessy.stanford.edu/admission/before-you-apply` · `oge.mit.edu/graduate-admissions/`

SQL: `supabase/scholarship_rewrite_pass57_2026-10-23.sql`
