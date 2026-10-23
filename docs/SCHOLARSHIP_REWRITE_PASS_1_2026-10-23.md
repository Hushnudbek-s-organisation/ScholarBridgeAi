# Kamchiliklarni tuzatish — 1-qadam (2026-10-23)

Avvalgi auditda 3 ta kamchilik qayd etilgan edi: **shablon tavsiflar**, **faqat domen
ko'rinishidagi havolalar** va **eski summalar**. Bu qadamda ularni tuzatish boshlandi.

---

## 1. Tuzatilgan yozuvlar (9 ta) — har biri rasmiy sahifadan

Har biri uchun: rasmiy sahifa ochildi → raqamlar o'qildi → `description`, `requirements`,
`required_documents`, `source_url`, `website_url`, `deadline`, summa va `notes` yozildi.

| ID | Stipendiya | Oldin (noto'g'ri) | Hozir (rasmiy) |
|---|---|---|---|
| 803 | **Yale** need-based aid | "Maximum award: Full Ride" shabloni, `yale.edu` | $75 220 o'rtacha grant; need-blind, qarz yo'q; EA 1-dek (xalqaro), RD 15-fev |
| 815 | **Princeton** need-based aid | shablon, `princeton.edu` | $83 000 o'rtacha grant; 2026-27 kontrakt $68 140; EA 9-noy, RD 1-fev |
| 559 | **Cornell** international aid | **$105 266 "maximum"** (to'qima), shablon | Summa **0** (e'lon qilinmagan); xalqaro muddatlar ED 1-noy / RD 2-yanv |
| 605 | **Johns Hopkins** need-based grant | **$100 670 "maximum"** (to'qima) | $66 000 o'rtacha; 15-yanvar; FAFSA E00473, CSS 5332 |
| 602 | **UBC IMES** | $71 000 "Full Tuition + Stipend" | **CAD 10 000–25 000/yil**, 3 yilga uzaytiriladi, qisman |
| 771 | **UNSW** | $36 500 "Full Tuition", nomi ham boshqa | **AUD 10 000 bir martalik**, 2-semestrda kontraktga |
| 783 | **University of Sydney** VCIS | shablon, `sydney.edu.au` | 5 pog'ona: **AUD 60k / 40k / 20k / 10k / 5k**; 16-noyabr 2026 |
| 692 | **U of T Scholars** | shablon, `utoronto.ca` | Avtomatik ko'rib chiqiladi; sana yo'q; summa e'lon qilinmagan |
| 17 | **UCL Global UG** | 30-aprel 2027 (e'lon qilinmagan sana) | Sana **NULL** → "e'lon qilinmagan", kutilayotgan aprel 2027; 33 ta grant tuzilishi |

### Eng muhim 4 topilma

1. **Cornell ($105 266) va JHU ($100 670)** — bu raqamlar hech qayerda e'lon qilinmagan,
   PDF importdan qolgan "maximum award". Need-based yordamda qat'iy maksimum **yo'q**.
   Endi o'rniga universitet e'lon qilgan **o'rtacha grant** yozildi yoki 0 (e'lon qilinmagan).
2. **UBC** $71 000 "to'liq kontrakt" — aslida **CAD 10–25 ming/yil**, ya'ni to'liq emas.
3. **UNSW** $36 500 "to'liq kontrakt" — aslida **AUD 10 000 bir martalik**.
4. **UCL** 30-aprel 2027 sanasi UCL saytida **yo'q** — 2026/27 uchun e'lon qilingan sana
   27-aprel 2026 edi. Yozuv "e'lon qilinmagan" ga o'tkazildi.

## 2. Nazorat qo'shildi

`npm run test:scholarship-detail` endi ikki yangi qatorni ko'rsatadi:

- `description still in the importer's template phrasing`
- `website_url is a bare domain (home page, not the award page)`

Bu ikkisi **FAIL emas** — ochiq ish ro'yxati. Har safar qancha qolganini ko'rsatib turadi.

## 3. Hozirgi holat

| Ko'rsatkich | Boshi | Hozir |
|---|---|---|
| Shablon tavsif | 273 | **265** |
| Faqat domen havola | 302 | **296** |
| Chet valyuta USD ustunida | 12 | **0** |

635 faol stipendiyadan **9 tasi** to'liq qayta yozildi. Qolgan 265 tasi — keyingi qadamlar.

## 4. Nega sekin

Har bir yozuv uchun kamida bitta rasmiy sahifa ochish kerak, ba'zilarida 2–3 ta
(masalan UCL: dastur sahifasi + ariza yo'riqnomasi). Bu safar **11 ta sahifa** ochildi,
shundan **2 tasi 404** qaytardi (UChicago Odyssey, UBC IMES eski manzili) — ular uchun
to'g'ri manzil qidirildi yoki yozuv boshqa tasdiqlangan dasturga almashtirildi.

## 5. Keyingi navbat

1. Qolgan **265** shablon tavsif — universitet saytlaridan.
2. Qolgan **296** domen havola — mukofot sahifasiga.
3. 57 ta rasm, 8 ta reyting.

Tartib: QS Top-100 ichidagi universitetlardan boshlab pastga — eng ko'p ko'riladigan
sahifalar birinchi.
