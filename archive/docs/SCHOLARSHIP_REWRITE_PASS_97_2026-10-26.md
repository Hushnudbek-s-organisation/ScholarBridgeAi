# Scholarship Rewrite Pass 97 — 2026-10-26

Avstraliya klateri davom etdi: 370 Deakin, 372 Macquarie, 373 UTS. Uchala yozuv ham umumiy RTP-ramka matnidan iborat reliability-4 yozuvlar edi (uydirma USD raqamlar avvalgi yozuvda tozalangan, lekin universitetning real stavkasi/raundi o'qilmagan edi). Endi har biri universitetning jonli rasmiy sahifasidan qayta yozildi, rel 10. Uydirma miqdor/deadline kiritilmadi: o'tgan raundlar yopiq bo'lgani va keyingi raund sanalari e'lon qilinmagani uchun uchtasida ham `deadline_date=NULL`, `deadline_type='not_published'`, `application_status='closed'`.

## Ishlangan yozuvlar

| Id | Universitet | Yangi nom | Miqdor (rasmiy) | Rel |
|---:|---|---|---:|---:|
| 370 | Deakin (uni 232) | Deakin Research Training Program (RTP) and Postgraduate Research Scholarship (DUPRS) | AUD 37,450/yil stipend + fees offset + single OSHC (xalqaro) | 10 |
| 372 | Macquarie (uni 119) | Macquarie University International Research Scholarships (iRTP and iMQRES) | AUD 40,900/yil stipend + 3 yil tuition offset (+iRTP ga Opal concession) | 10 |
| 373 | UTS (uni 169) | UTS International Research Scholarship (IRS) | Tuition fee (kursga bog'liq) — `award_amount=NULL` | 10 |

### 370 — Deakin RTP / DUPRS

- **Manba:** deakin.edu.au rasmiy "RTP and DUPRS" sahifasi (2026-10-26 da fet ch qilingan).
- Stavka AUD 37,450/yil (tax exempt), relocation $500–$1,500, xalqaroga single OSHC; doktorantura: stipend 3 yil, fees offset 4 yil; magistrlik 2/2. Tanlov talabi: ≥4 yil oliy ta'lim + research komponentida **80%** yoki ekvivalenti — bu foiz shaklida berilgani uchun `min_gpa` ga konvertatsiya qilinmadi (matnda), `min_gpa=NULL`.
- 2027 xalqaro raund (fevral qabuli): 2026-07-06 → 2026-08-23 yopilgan, natija 2026-11-06 gacha. Keyingi raund e'lon qilinmagan.
- **Bog'lanish tuzatildi:** yozuvda `university_id` NULL edi; Deakin universitet rekordi (232) bazada borligi aniqlandi — `university_id=232` qo'yildi va `university_scholarships` ga yangi bog'lanish (id 670) yaratildi.

### 372 — Macquarie iRTP / iMQRES

- **Manba:** mq.edu.au "International scholarship round" rasmiy sahifasi (2 chunk to'liq o'qildi).
- Bitta raund ikki sxemani qamrab oladi (davlat iRTP + universitet iMQRES, iRTP arizachisi iMQRES ga avtomatik ko'rib chiqiladi): tuition offset 3 yilgacha + stipend AUD 40,900/yil 3 yilgacha; iRTP ga Opal transport concession qo'shilgan.
- ⚠️ Sahifa o'zi yil nomlanishida qarama-qarshi: Key details "40,900 (2027 rate)", Components bo'limlari "at the 2026 rate" deydi. Raqamning o'zi hamma joyda bir xil — saqlandi, yil yorlig'i Key details bo'yicha olindi, qarama-qarshilik `notes` da qayd etildi (Pass 95 MITS precedentiali kabi).
- Session 1 2027 raund 2026-07-31 da yopilgan; Session 1 2028 sanalari yo'q.

### 373 — UTS IRS

- Importyor nomi "UTS Vice-Chancellor PhD Scholarship VCPS" jonli UTS mukofotiga mos kelmaydi (UTS ning nufuzli mukofoti — President's Scholarship).
- Avvalgi yondashuv bo'yicha IRTP sahifasi tekshirildi: **404** qaytaradi va IRTP UTS ning jonli raqobatbardosh stipendiyalari ro'yxatidan ham yo'qolgan. Shuning uchun yozuv UTS hozir e'lon qilib turgan jonli sahifalar asosida yozildi: **IRS** (tuition fee, 3.5 yil PhD / 2 yil MRes; 2026-09-07 → 10-07 yopilgan), funding hub sahifasi (raqobatbardosh stipendiyalar research-degree arizasi orqali; base rate AUD 40,500 — 2027-01-01 dan), AG RTP Stipend sahifasi (living allowance AUD 40,500/yil).
- ⚠️ Muhim halollik nuqtasi: eski IRTP listingidagi OSHC va stipend IRS ga "ko'chirilmadi" — jonli IRS sahifasi bularni aytmaydi. Stipend alohida bog'liq mukofot ekani description da ochiq yozilgan; `coverage_type='Full Tuition'`, `award_amount=NULL` (miqdor kursga bog'liq).

## Yon jadvallar

- `sources` 2510/2576/2686 — yalang'och domenlardan tegishli rasmiy sahifalarga ko'chirildi.
- `university_scholarships` 604/605 da **uydirma qoldiqlar** topildi va tuzatildi: `max_scholarship` "USD 43000 year" / "USD 42000 year" (scholarships jadvalidan tozalangan raqamlar universitet sahifalarida haligacha yashab kelgan) — AUD qiymatlarga almashtirildi; nomlar, rasmiy URLlar, eligibility matnlari yangilandi; 605 da `covers_living_expenses=false` (IRS faqat tuition).
- ⚠️ **Katta kuzatuv:** `university_scholarships` jadvalidagi 570 yozuvdan ushbu passgacha **118 tasi** `max_scholarship` da "USD ..." satrini saqlagan; passdan keyin 116 qoldi. Bu yozuvlar `scholarships` da tozalangan yozuvlarning universitet sahifalaridagi aks-sadolari bo'lishi mumkin — **alohida tozalash treki** sifatida qarash tavsiya etiladi (ushbu pass doirasidan tashqarida).

## Hard check

| Ko'rsatkich | Batch 5 | Pass 97 |
|---|---:|---:|
| Active | 537 | 537 |
| Retired | 132 | 132 |
| Active reliability 4 | 115 | **112** |
| `amount_usd_value > 5000` | 19 | 19 |
| Future `deadline_date` | 159 | 159 |
| Bare-domain active `website_url` | 26 | 26 |
| `university_scholarships` "USD" satrlari | 118 | **116** |

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — o'tdi.
- `npm run check:i18n` — o'tdi.
- `npm run test:render` — 337/337 o'tdi.
- Kod o'zgarishi yo'q; faqat DB + doc/SQL replay.

## Qolgan Avstraliya rel4 navbati

382 RMIT, 438 Curtin, 439 Newcastle (AU), 440 Wollongong, 442 Flinders.
