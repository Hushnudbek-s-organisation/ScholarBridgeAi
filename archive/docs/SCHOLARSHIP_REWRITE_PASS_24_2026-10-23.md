# Grant yozuvlarini qayta yozish — 24-pass: Olmoniya (2026-10-23)

Olmoniya klasteri yopildi. Shu bilan birga katalogdagi eng katta **kontseptual xato** tuzatildi.

SQL eslatma: [`supabase/scholarship_rewrite_pass24_2026-10-23.sql`](../supabase/scholarship_rewrite_pass24_2026-10-23.sql)

---

## 1. Asosiy topilma

**Olmoniya davlat universitetlarida kontrakt yo'q.**

- **Berlin** shtat qonuni bo'yicha taqiqlangan — HU, TU, FU: **€0**
- 16 shtatdan **14 tasi** xalqaro talabadan kontrakt olmaydi
- **Ikki istisno:**
  - **Baden-Württemberg** — nodavlat Yevropa Ittifoqidan tashqari talabalarga **€1 500/semestr = €3 000/yil** (Heidelberg, KIT, Freiburg, Tübingen, Stuttgart, Mannheim, Konstanz, Ulm). **Doktorantlar ozod.**
  - **TUM** — **€2 000–6 000/semestr** (2024/25 dan)

**Demak:** Olmoniyada "Full Tuition" granti — **€0** ni qoplaydi. Va o'sha qatorlarga yozilgan $650 / $400 / $1 650 raqamlari — talaba **to'laydigan** semestr yig'imi, oladigan pul emas.

## 2. Nima haqiqatan yutib olinadi

**Deutschlandstipendium** — federal dastur (DAAD bazasida tasdiqlangan):

| | |
|---|---|
| Summa | **€300/oy = €3 600/yil** |
| Moliyalashtirish | 50% xususiy homiylar + 50% federal hukumat |
| Daraja | **Bakalavr va magistratura** — **doktorantura EMAS** |
| Millat | Barcha |
| Cheklov | Boshqa iste'dod grantlari (o'rtacha **≥€30/oy**) bilan **birga olib bo'lmaydi** |
| Tanlov | Universitetning o'zi o'tkazadi |
| 2025 | ~34 000 talaba oldi |

## 3. Bajarilgan ish — 23 qator

### Bekor qilingan 4 (takrorlar)
| id | Sabab |
|---|---|
| **567** HU Berlin | 499 nusxasi; $650 — semestr yig'imi |
| **571** RWTH Aachen | 350 nusxasi |
| **714** Hamburg | 483 nusxasi; $250 |
| **732** Cologne | 484 nusxasi; $400 |

### Qayta yozilgan 8
| id | Universitet | Haqiqiy holat |
|---|---|---|
| **568** | TU Berlin | **€0 kontrakt**, semestr yig'imi **€379.06** (shundan €226.80 — butun Olmoniya transport chiptasi) |
| **606** | KIT | **€1 500/semestr** + €201.50 yig'im → **€3 000/yil** |
| **736** | Freiburg | **€1 500/semestr** + €172–190 |
| **763** | Tübingen | **€1 500/semestr** + €194.80; **doktorantlar ozod** |
| **689** | TU Dresden | **€0 kontrakt** (Saksoniya) |
| **578** | FAU Erlangen | **€0** — Bavariyada faqat **TUM** istisno |
| **678** | TU Darmstadt | **€0** (Gessen) |
| **740** | Göttingen | **€0** (Quyi Saksoniya) |

### Joyida tuzatilgan 11
`43, 132, 147, 349, 352, 376, 426, 427, 428, 429, 430` — hammasida:
- `coverage_type`: **"Full Tuition + Stipend" → "Living Stipend"** (TUM'da — `Partial Funding`)
- `amount_usd_value`: **$15 000–22 000 → 0**
- `notes`ga sabab yozildi (o'sha davrda tekshirilmagan oylik stavka da'vo qilinmadi)

## 4. Halol qoldirilgan joylar

Bu passda **tekshirilmagan** raqamlar yozilmadi:
- TU Dresden, FAU, Darmstadt, Göttingen semestr yig'imlari — tavsifda aytilgan, raqam berilmagan
- Doktorantura stipendiyalarining oylik stavkalari — `amount_usd_value = 0`

## 5. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 156 | **144** |
| Bosh domen (`website_url`) | 207 | **195** |
| Faol grantlar | 617 | **613** |
| Qayta yozilgan | 105 / 617 (17.0%) | **113 / 613 (18.4%)** |
| Olmoniyada shablon | 12 | **0** ✅ |
| "Full Tuition + Stipend" (DE) | 11 | **0** ✅ |
| $5 000+ uydirma summa (DE) | 6 | **0** ✅ |

`tsc --noEmit` ✅ · `check:i18n` ✅ · `test:render` 337/0 ✅. Commit `f44fe77`.

## 6. Yopilgan klasterlar

| Klaster | Natija |
|---|---|
| Türkiye | 8 qayta yozildi, 4 retired |
| Rossiya | 4 qayta yozildi, 5 retired, **1 yangi** (Open Doors 902) |
| Xitoy | 9 qayta yozildi, 2 retired |
| Koreya | 3 qayta yozildi, 3 retired |
| Malayziya | 8 qayta yozildi, 5 retired |
| **Olmoniya** | **8 qayta yozildi, 4 retired, 11 tuzatildi** |

## 7. Keyingi navbat

**Yaponiya (MEXT)**, **Kanada**, **Niderlandiya**, **Buyuk Britaniya**. 144 shablon va 195 bosh domen qoldi.
