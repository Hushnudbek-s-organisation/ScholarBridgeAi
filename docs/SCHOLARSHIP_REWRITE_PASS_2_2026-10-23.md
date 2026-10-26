# Kamchiliklarni tuzatish — 2-qadam (2026-10-23)

Oldingi qadamda 9 ta yozuv qayta yozilgan edi. Bu qadamda yana **4 ta** — QS Top-100
ichidagi eng ko'p ko'riladigan sahifalar.

---

## Qayta yozilganlar

| ID | Stipendiya | Oldin | Hozir (rasmiy) |
|---|---|---|---|
| 816 | **Harvard** Financial Aid Initiative | shablon, `harvard.edu`, to'qima summa | 55% grant oladi, **25% umuman to'lamaydi**, o'rtacha ota-ona hissasi $14 000, 100% qarzsiz bitiradi; $100k/$200k chegaralari |
| 604 | **IP Paris** Excellence | shablon, **$1 125** (hech narsaga to'g'ri kelmaydi) | PhD Track: **€10 000/yil** magistratura + **€82 800** doktorantura; kontrakt €7 000 → €243 |
| 565 | **TUM** | "Tuition Waiver, DAAD & Deutschlandstipendium" — 3 xil narsa bitta yozuvda, "Full Tuition", $5 000 | TUM **non-EU talabadan kontrakt oladi**: €2 000–3 000 (bakalavr) / €4 000–6 000 (magistratura) har semestr; WS 2027/28 dan €2 300–3 400 / €4 600–6 800 |
| 591 | **HKU** | "HKU Foundation Scholarship" — bitta mukofot, shablon tavsif | HKU qidiruvida **43 ta alohida stipendiya** (non-local + xalqaro malaka) |

## Eng muhim topilmalar

1. **Harvard** — hujjatda "Maximum award" degan to'qima raqam turardi. Harvard **hech qanday
   maksimal summa e'lon qilmaydi**; need-based yordam har oilaga alohida hisoblanadi.
   Endi rasmiy statistika yozilgan (25% bepul, $14 000 o'rtacha hissa).
2. **IP Paris** — $1 125 degan summa sahifada umuman yo'q. Aslida PhD Track uchun
   €10 000/yil + 3 yillik doktorantura majburiyati (~€82 800).
3. **TUM** — eng jiddiy xato: yozuv "Full Tuition" deb turardi, lekin **TUM 2024/25 dan
   non-EU talabadan kontrakt oladi**. Ya'ni talaba "bepul o'qiyman" deb hisoblashi mumkin edi.
   Bundan tashqari uch xil dastur (TUM waiversiz, DAAD, Deutschlandstipendium) bitta
   yozuvga qo'shib yuborilgan edi.
4. **HKU** — "HKU Foundation Scholarship" — bu bitta aniq mukofot, lekin bazada uning
   o'rniga umumiy shablon turardi. HKU sahifasi esa 43 ta stipendiya borligini aytadi.

## Holat

| Ko'rsatkich | 1-qadamdan keyin | Hozir |
|---|---|---|
| Shablon tavsif | 265 | **261** |
| Faqat domen havola | 296 | **292** |
| Buzilgan `degree_levels` | 0 | **0** |
| Bo'sh `funding_type` / `tuition_coverage` | 0 | **0** |

635 faol yozuvdan **13 tasi** to'liq qayta yozildi (9 + 4).

## Usul

Har bir yozuv uchun:
1. Rasmiy sahifa ochiladi (ba'zilarida 2 ta: dastur + ariza).
2. Faqat sahifada **yozilgan** raqamlar olinadi.
3. Eski shablon tavsif va to'qima summa **butunlay almashtiriladi**.
4. `notes` ga: qaysi kuni, qaysi sahifadan, nima **o'chirilgani va nega**.
5. Summa e'lon qilinmagan bo'lsa — `0` (e'lon qilinmagan), taxminiy raqam emas.

Bu safar **7 ta rasmiy sahifa** ochildi, **2 tasi 404** qaytardi (TUM tuition-fees eski
manzili, UChicago Odyssey sahifasi). Har ikkisi uchun to'g'ri manzil qidirildi.

## Keyingi navbat (QS Top-100)

NTU Undergraduate Scholarship, UChicago Odyssey, Peking CSC, Fudan CSC, CUHK Admission
Scholarships, University of Tokyo MEXT/PEAK, SNU GKS, Northwestern, CUHK, McGill.
