# Scholarship Rewrite Pass 98 — 2026-10-26

Avstraliya klateri: 382 RMIT, 438 Curtin, 439 Newcastle (AU). Uchala yozuv ham umumiy RTP-ramka reliability-4 edi. Natija: 2 ta qayta yozildi (rel 10), 1 tasi retired qilindi (rel 9) — sababi quyida. Uydirma miqdor/deadline kiritilmadi.

## Ishlangan yozuvlar

| Id | Universitet | Natija | Miqdor (rasmiy) | Rel |
|---:|---|---|---:|---:|
| 382 | RMIT (uni 109) | RMIT Research Stipend Scholarships (RTP RSS and RRSS) | AUD 36,245/yil stipend + xalqaroga tuition offset (RIFOS/RRITFS) | 10 |
| 438 | Curtin (uni 228, bog'lanish yaratildi) | Curtin RTP Scholarship (Central Scholarship Round) — faqat PhD | AUD 38,440/yil (2026 rate) | 10 |
| 439 | Newcastle (uni 310) | **RETIRED** — RTP sxemalari faqat domestic | — | 9 |

### 382 — RMIT RSS/RRSS

- **Manbalar:** rmit.edu.au "Research Stipend Scholarships" + "How to apply" (2027 raund jadvali) sahifalari fet ch qilindi.
- Bitta raund, avtomatik ko'rib chiqish; stipend AUD 36,245/yil — sahifa buni **2026-raund stavkasi** deb belgilaydi (2027 tafsilotlari "tez orada"), shuning uchun matnda yil ko'rsatib yozildi, indeksatsiya tilga olindi. Xalqaroga RIFOS/RRITFS tuition offset biriktiriladi; relocation $515/$255 (max $1,540). Ustuvorlik: oxirgi 2 yilda high distinction (80%+) — qat'iy chegara emasligi uchun `min_gpa=NULL`.
- ⚠️ Sahifa bannerida "OPEN" yozilgan, lekin o'z jadvalida xalqaro muddatlar o'tgan (EOI 2026-08-30, full application 2026-09-30) → status `closed`, `deadline_date=NULL`.
- Importyor nomi "VCPS" xato emas ekan: RMIT Vice-Chancellor's PhD Scholarship xuddi shu raundda alohida EOI forma bilan ko'rib chiqiladigan tanlov; yozuv asosiy stipendiya yo'li sifatida yozildi, VCPS qiymati fet ch qilinmagani uchun saqlanmadi (faqat tilga olindi).

### 438 — Curtin RTP Central Round

- **Manba:** curtin.edu.au "Central Scholarship Round (RTP Scholarship)" sahifasi.
- ⚠️ Faqat **PhD** (MPhil "not eligible" deb ochiq yozilgan) → `degree_levels=["PhD"]`. Stipend AUD 38,440/yil (2026), 3.5 yil FTE.
- ⚠️ Tuition: sahifa ~$70,000 paketni "tuition fees for domestic students" bilan baholaydi; xalqaro oluvchiga fee offset tasdiqlanmagan → `coverage_type='Living Stipend'`, us yozuvida `covers_tuition=false`. Da'vo qilinmadi.
- EOI oynasi har yili 1–31-iyul; sahifa "2028 intake will open in July 2027" deydi → `deadline_date='2027-07-31'`, `fixed`, `upcoming` (taxmin emas, e'lon qilingan keyingi raund).
- `university_id` NULL edi → Curtin (228) qo'yildi, us bog'lanish (671) yaratildi.

### 439 — Newcastle (RETIRED)

- **Manba:** newcastle.edu.au "Scholarships — Future Research Students" sahifasi to'liq o'qildi: "The RTP scholarships listed below are **currently available to domestic applicants only**" (Academic Pathway/Strategic Engagement $40,690, Indigenous Priority $54,414 — 2027 stavkalari). Xalqaro bo'limida faqat China Scholarship Council va Vietnam Project 89 — O'zbekistonga aloqasi yo'q.
- Katalog auditoriyasi (xalqaro talabalar) uchun umumiy Newcastle HDR stipendiyasi hozir mavjud emas → yozuv "ochiq grant" sifatida qoldirilmadi, rel 9 bilan retired qilindi, sababi description/notes da to'liq. us 465 `availability_status='No'` + tushuntiruvchi satr (o'chirilmedi — universitet sahifasida jim implikatsiya qolmasligi uchun, UCSB precedentiali).

## Yon jadvallar

- `sources` 2605/2508/2579 — bare domenlardan fet ch qilingan sahifalarga.
- us 609 (RMIT) sinxronlandi (`AUD 36245 year`); us 465 (Newcastle) 'No'; us 671 (Curtin) yaratildi.

## Hard check

| Ko'rsatkich | Pass 97 / USD-sync | Pass 98 |
|---|---:|---:|
| Active | 537 | **536** |
| Retired | 132 | **133** |
| Active reliability 4 | 112 | **109** |
| `amount_usd_value > 5000` | 19 | 19 |
| Future `deadline_date` | 159 | **160** |
| Bare-domain active `website_url` | 26 | 26 |
| us "USD" satrlari | 34 | 34 |

## Tekshiruvlar

- `npm run typecheck` (`tsc --noEmit`) — o'tdi.
- `npm run check:i18n` — o'tdi.
- `npm run test:render` — 337/337 o'tdi.
- Kod o'zgarishi yo'q; faqat DB + doc/SQL replay.

## Qolgan Avstraliya rel4 navbati

440 Wollongong, 442 Flinders — klater keyingi passda yopiladi.
