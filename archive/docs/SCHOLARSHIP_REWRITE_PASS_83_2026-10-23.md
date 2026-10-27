# ScholarBridgeAi — stipendiyalarni qayta yozish, 83-pass (bare-domain, 1-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** `website_url` faqat domen bo'lgan qatorlar — **13 qator** tuzatildi.
**Natija:** bare-domain **56 → 43**.

---

## 1. Nima qilindi

56 ta bare-domain qator uch turga bo'lindi:

| Tur | Soni | Yondashuv |
|---|---|---|
| **Milliy dastur sahifasi** (bir domen, 10–13 qator) | 13 | Bitta chuqur havola barcha qatorga — bugun tekshirildi |
| **"Universitetda stipendiya yo'q" degan halol qaydlar** | 6 | Domen **to'g'ri manzil** — o'zgartirilmaydi |
| **`reliability = 4`** (sahifa ochilmagan) | 16 | Domen **yagona mavjud manzil** — o'zgartirilmaydi |

Bu passda **13 qator** haqiqiy chuqur havolaga o'tdi.

## 2. Stipendium Hungaricum — 10 qator

Manba: **`stipendiumhungaricum.hu/apply/`** (domen emas, ariza sahifasi).

**Bugun o'qilgan va yozilgan faktlar:**

| Fakt | Qiymat |
|---|---|
| **Muddat** | **15-yanvar 2026, 14:00 CET** — 2026/27 chaqiruvi, **yopilgan** |
| Qamrov | **barcha tuition** + **turar joy xarajati qo'llab-quvvatlanadi** |
| Ko'lam | **~30 universitet**, **90+ dastur**; **faqat 2 tanlov** |
| Ariza | **DreamApply** (`apply.stipendiumhungaricum.hu`) **+ yuboruvchi idoraga alohida ariza** |
| Doktorantura | supervisor kerak bo'lishi mumkin; **supervisor xati 15-martgacha** |
| Imtihon | mart–may, **100 balldan kamida 56** |
| Natija | iyun oxiri / iyul boshi |
| Saqlash sharti | **18 kredit** o'rtacha (BA/MA/OTM) + **venger tili kursi majburiy** |

**Tuzatilgan xatolar (10 qatorda bir xil):**
- `degree_levels` — `"Bachelor"`, `"Master"` → **`"Bachelor's"`, `"Master's"`**
- `application_status = 'open'` → **`'upcoming'`** (muddat o'tgan)
- bare domain → **`/apply/` sahifasi**
- `coverage_type` `Full Tuition + Stipend` → **`Full Funding`** (oylik stipendiya **qayta tekshirilmadi**, shuning uchun aniq summa da'vo qilinmadi)

## 3. CSC — 3 qator (554, 849, 866)

Manba: **`campuschina.org/content/details3_74776.html`** (67-passda tekshirilgan, bugun yana ochildi).

| Fakt | Qiymat |
|---|---|
| Qamrov | tuition + **bepul yotoqxona**/subsidy + **CNY 800/yil sug'urta** + oylik stipendiya |
| Stipendiya | **CNY 2 500** (bakalavr) · **3 000** (magistratura) · **3 500** (PhD) |
| Yosh | **< 25 / < 35 / < 40** |
| Til | xitoy tilida **HSK 4**; bakalavr — **CSCA** |
| Kanallar | bilateral · University Program · designated · exchange |

**Tuzatilgan:** 866-qatorda `award_currency = 'USD'` edi — **CNY** ga o'zgartirildi (Xitoy yuanida to'lanadi). 554 va 849 da daraja nomlari kanoniklashtirildi.

## 4. Open Doors — 902 qator (eng katta yangilanish)

Manba: **`od.globaluni.ru/`** — loyihaning o'z bosh sahifasi.

| Fakt | Qiymat |
|---|---|
| **Ro'yxatdan o'tish muddati** | **1-noyabr 2026** → `deadline_date = 2026-11-01` |
| Boshlanish | **20-avgust 2026** |
| **1-bosqich** | 20-avgust – 13-noyabr 2026 (portfolio + entry test + motivation letter) |
| **2-bosqich** | 13-noyabr – 21-dekabr; ro'yxat **16-noyabrgacha**; **180 daqiqa** proctoring |
| **3-bosqich** | 22-dekabr 2026 – 26-fevral 2027 (PhD — supervisor bilan suhbat) |
| Ko'lam | **24 Rossiya universiteti**, **200+ davlat**, **618 000+** ishtirokchi, **16 700+** g'olib |
| Yo'nalishlar | **14 ta** (Applied Mathematics and AI, Biology, Business, Chemistry, Clinical Medicine, Computer Science, Earth Sciences, Economics, Education, Engineering, Physical Sciences, Politics, Russian Language, Urbanism) |

**`coverage_type = 'Tuition Waiver'`** — loyiha "tuition-free" deb yozadi, stipendiya e'lon qilmaydi.

## 5. Ataylab qoldirilgan bare-domain

**902 Open Doors** — `od.globaluni.ru/` **bosh sahifa**, va **jadval aynan shu sahifada**. Ya'ni domen bu yerda **to'g'ri manzil**, chuqurroq havola jadvalni bermaydi. Shu sababli `bare` bayrog'i `true` bo'lib qoldi — bu **xato emas, ongli tanlov**.

## 6. Muvaffaqiyatsiz urinish

**862 El-Yurt Umidi** (`eyuf.uz`) — **HTTP 500**. O'zgartirilmadi.

## 7. Hisoblagichlar

| Ko'rsatkich | Pass 82 | Pass 83 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| **bare-domain** | 56 | **43** | **−13** |
| `amount_usd_value > 5000` | 20 | **20** | 0 |
| `source_reliability = 4` | 137 | **137** | 0 |
| **kelajakdagi `deadline_date`** | — | **150** | yangi ko'rsatkich |

## 8. Tekshiruv

14 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_lv`, `bad_notes` — **hammasi `false`**. Faqat 902 da `bare = true` (yuqorida izohlangan).
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 9. Keyingi qadam

1. **84-pass** — qolgan **43 bare-domain**: Buyuk Britaniya 10, "stipendiya yo'q" qaydlari 6, `reliability = 4` 16, qolgan milliy dasturlar (DAAD, KNB, Rossotrudnichestvo, Study in Saudi, Phystech, McCall MacBain, IIT Delhi).
2. Keyin **20 ↔ 114** deduplikatsiyasi.
3. Keyin **137** `reliability = 4`.
