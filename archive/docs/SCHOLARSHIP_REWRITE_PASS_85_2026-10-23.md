# ScholarBridgeAi — stipendiyalarni qayta yozish, 85-pass (milliy dasturlar)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** 7 qator — 2 tasi to'liq tekshirildi, 3 tasida valyuta xatosi tuzatildi.

---

## 1. To'liq tekshirilgan 2 qator

### **861** DAAD — `reliability = 10`, nomi o'zgardi

**Yangi nom:** *DAAD Study Scholarships — Master Studies for All Academic Disciplines (Germany)*
Manba: `www2.daad.de/…/21148-scholarship-database/?detail=50026200`

| E'lon qilingan fakt | Endi |
|---|---|
| **EUR 992/oy** + sug'urta to'lovlari + **yillik o'quv allowance EUR 460** + yo'l allowance | **`award_amount = 992`, `EUR`, `month`** |
| Muddat **10–24 oy**; 1-yildan keyin baholash | description |
| **DAAD tuition to'lamaydi** (aniq yozilgan) | `coverage_type = Living Stipend` |
| Grant **2027**da boshlanadi, odatda **1-oktabr 2027** | expected_deadline_period |
| **Germaniyada boshlangan magistratura moliyalashtirilmaydi** | requirements |
| Til: **onlayn kurs**, **2/4/6 oylik nemis tili kursi** (nemis tilida o'qilsa **majburiy**), **TestDaF/DSH** qaytariladi | description |
| Ariza **desktop** kompyuterda (portal mobilda ishlamaydi) | requirements |

**Tuzatilgan xatolar:** nomda "Deutschlandstipendium" bor edi (bu **boshqa** dastur — federal + xususiy homiylar); `Partial Tuition` deb belgilangan edi, holbuki DAAD **tuition to'lamaydi**; valyuta **USD** edi → **EUR**; "15-iyul / 15-yanvar" muddati **uydirma** edi; bare `daad.de` → **chuqur sahifa**.

### **133** McCall MacBain — `reliability = 10`, butunlay qayta yozildi

**Yangi nom:** *McCall MacBain Scholarships at McGill*
Manbalar: `mccallmacbainscholars.org/apply/` + bosh sahifa

| E'lon qilingan fakt | Endi |
|---|---|
| **Mustaqil fond** mukofoti (McGill sxemasi emas), **to'liq moliyalashtirilgan McGill magistraturasi** + yetakchilik dasturi + mentorlik | `Full Funding` |
| Yiliga **30 ta to'liq stipendiya** + **100 ta entrance award** | description |
| **Xalqaro muddat: 19-avgust 2026, 16:00 ET**; Kanada/AQSh: **23-sentabr 2026** | **`deadline_date = 2026-08-19`**, `closed` |
| 30 Scholar: **~20 kanadalik + 10 xalqaro**; **sentabr 2027** | description |
| **250+** yarim finalchi mintaqaviy suhbatga, **~85** finalchi Monrealga (**yo'l xarajati qoplanadi**) | description |
| 5 mezon: xarakter, jamoa, yetakchilik, tadbirkorlik, akademik | description |
| McGill'ga **alohida ariza** (oktabr–dekabr 2026) | requirements |

**Tuzatilgan xatolar:** qator "McGill graduate funding route" deb yozilgan edi, `reliability = 4`, summa va muddat yo'q edi. Aslida — **mustaqil fond**, o'z arizasi, o'z muddatlari, o'z eligibiliteti. **McGill Graduate Excellence Award** — **boshqa** sxema va bu qator uni tasdiqlamaydi, shuning uchun nom endi ikkalasini bog'lamaydi.

---

## 2. Valyuta xatolari tuzatilgan 3 qator (`reliability` → 4)

| Qator | Avval | Endi | Sabab |
|---|---|---|---|
| **477** IIT Delhi | **USD 5 000** | **INR**, `amount = 0` | Hindistonda rupiyada to'lanadi; summa manbasiz |
| **859** Study in Saudi | **USD** | **SAR** | Saudiya mukofotlari riyolda |
| **868** Rossotrudnichestvo | **USD** | **RUB** | Rossiya kvotasi rublьda |

Uchtasida ham tavsif **halol "tekshirilmagan" shabloniga** o'tkazildi: nima ma'lum (tuzilma), nima **noma'lum** (summa, qamrov, muddat) va nima uchun bo'sh qoldirilgani.

---

## 3. Nima uchun 3 qator 8 dan 4 ga tushdi

Ular **milliy dasturlar** va ularning **valyutasi noto'g'ri** edi — bu o'zi jiddiy xato. Sahifalar bu passda **ochilmadi**, shuning uchun 8 ball qoldirish yolg'on bo'lardi. Endi ular **halol 4**.

---

## 4. Hisoblagichlar

| Ko'rsatkich | Pass 84 | Pass 85 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| **bare-domain** | 38 | **36** | **−2** |
| `source_reliability ≥ 9` | 278 | **279** | +1 |
| `source_reliability = 4` | 137 | **139** | +2 |
| `amount_usd_value > 5000` | 20 | **20** | 0 |

## 5. Tekshiruv

7 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 6. Qolgan 36 bare-domain

- **"Stipendiya yo'q" halol qaydlar (6)** — domen to'g'ri manzil.
- **DAAD bo'lmagan milliy dasturlar (4)**: KNB 579, Phystech 829, Study in Saudi 859, Rossotrudnichestvo 868.
- **`reliability = 4` (16)** — sahifa ochilmagan.
- **UK qolganlari (7)**: Lancaster 614, Heriot-Watt 589, Loughborough 616, QUB 658, Exeter 734.
- **Boshqalar**: Paris 1, Lisbon, Porto, Witwatersrand, Barcelona, Navarra, Cornell, Florida, Maryland, El-Yurt Umidi, KSU, Open Doors (ongli istisno).

**86-pass** — qolgan **36** ni yakunlash: KNB, Phystech, Study in Saudi, Rossotrudnichestvo sahifalarini ochish, UK qolganlarini tekshirish.
