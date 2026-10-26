# Muddatlar auditi (deadline) — 2026-10-23

Vazifa: eskirgan, noto'g'ri kiritilgan yoki xato qilingan muddatlarni topish va tuzatish.
Bugungi sana: **2026-10-23**.

## 1. Umumiy holat (auditdan oldin → keyin)

| Ko'rsatkich | Oldin | Keyin |
| --- | ---: | ---: |
| Grantlar (faol) | 643 | 643 |
| Sanasi bor grantlar | 481 | **421** |
| **Muddati o'tgan** grantlar | 0 | **0** |
| Bir xil sanali grantlar (254 ta `2027-01-31`) | 254 | **0** (har biri o'z qoidasi bilan) |
| Ariza sikllari | 3042 | 3042 |
| **Bir xil sanali sikllar** (2785 ta `2027-01-15`) | 2785 | **0** |
| Tasdiqlangan (verified) sikl | 2785 (yolg'on) | **171** (haqiqiy) |
| Programmalarda "aniq" sana | 2764 | **0** (`NULL`) |

Muddati o'tgan sana **yo'q edi** — buni tekshirdim, taxmin qilmadim.

## 2. Asosiy xato: matn bir narsa deydi, sana boshqa narsa

195 grantda `deadline` matni haqiqiy qoidani yozgan, `deadline_date` esa **hammasida
bir xil `2027-01-31`** edi:

| Grant | Matn (haqiqiy qoida) | Eski sana | Yangi sana |
| --- | --- | --- | --- |
| MIT Graduate Fellowship | "December 15 annually" | 2027-01-31 | **2026-12-15** |
| Oxford Clarendon Fund | "January 20 annually" | 2027-01-31 | **2027-01-20** |
| Stanford Knight-Hennessy | "October 9 annually" | 2027-01-31 | **2027-10-09** |
| Melbourne Research (MRS) | "October 31 annually" | 2027-01-31 | **2026-10-31** |

Tuzatish usuli: matndagi qoidadan **keyingi uchrash** sanasini hisoblash (bugundan
keyingi birinchi kun). Ya'ni sanani o'ylab topmadim — e'lon qilingan qoidani kalendarga
qo'ydim.

## 3. Boshqa tuzatilgan muddat xatolari

| Muammo | Soni | Tuzatish |
| --- | ---: | --- |
| Matnda ham, sanada ham `2027-01-31` bo'lgan "placeholder" (nomi `fixed`, holati `open`) | 51 | sana olib tashlandi, "Not published — confirm…" |
| `rolling` deb belgilangan, lekin bitta aniq sanasi bor grant | 6 | sana olib tashlandi (NUS, Oslo, UCPH, DTU, Bergen, NTNU) |
| Ikki sanali qoida ("Sep 30 / Jan 31") bitta o'zboshimchalik sanasi bilan | 10 | qoidadagi **keyingi** sana |
| "October (varies by country)", "Annually in May/June…" kabi aniqlab bo'lmaydigan qoidalar | 3 | sana olib tashlandi, `estimated` |
| `opening_date` 2024-yilda, `deadline` 2027-yilda (2.5 yillik "ariza oynasi") | 196 | `opening_date = NULL` |
| Matnda ISO sana (`2027-07-31`), sana ustuni bo'sh | 4 | "Expected end of July 2027 (not yet published)" |

## 4. Eng katta topilma: 2785 ariza sikli — bitta sana

**217 universitetning** har bir programmasiga bir xil sikl yozilgan:

```
intake             = 'Fall 2027'
application_type   = 'Regular Decision'
opening_date       = 2026-09-01
deadline           = 2027-01-15
is_estimated       = false      ← "taxmin emas" deb da'vo qilingan
verification_status = 'verified'  ← "tasdiqlangan" deb da'vo qilingan
```

Bu manba: `data/supabase_enrichment.sql` — faylda `DATE '2027-01-15'` **doimiy qiymat**
sifatida yozilgan. Ya'ni hech bir universitet bilan tekshirilmagan sana "tasdiqlangan"
deb turgan va Deadline Center'da 217 universitet uchun bir xil 15-yanvar
ko'rsatilgan (AQSh universitetlarida bu noto'g'ri, Buyuk Britaniyada esa to'g'ri).

**Tuzatish:**
1. 2774 sikl `is_estimated = true`, `verification_status = 'unverified'`,
   `is_verified = false` + izoh: *"Generic Fall-2027 catalogue window — the exact
   deadline is NOT verified for this programme"*.
2. `programs.application_deadline` (2764 qator) → `NULL`, chunki aniq sana yo'q.
3. `data/supabase_enrichment.sql` da `DATE '2027-01-15'` → `NULL::date` — qayta
   import qilinsa xato qaytmaydi.
4. **Kod tuzatildi:** `src/app/api/deadlines/route.ts` izohi "nearest UPCOMING
   **verified** cycle" deb yozgan, lekin so'rovda filtr **yo'q** edi. Endi
   `verification_status = 'verified'` filtri qo'shildi — izoh va kod bir xil.

11 ta Stipendium Hungaricum sikli (Vengriya universitetlari) **tegilmadi**: 15-yanvar
bu dasturning haqiqiy e'lon qilingan muddati.

## 5. Regressiya testi

`scripts/check-integration.ts` ga 2 ta yangi test qo'shildi:

```
✓ deadlines: an UNVERIFIED application cycle never becomes a countdown
✓ deadlines: a VERIFIED application cycle does produce the date
```

Birinchi test tasdiqlanmagan sikl qo'shib, Deadline Center'da **sana chiqmasligini**
(`NO DEADLINE ON FILE`) tekshiradi; ikkinchisi uni `verified` qilib, sana
chiqishini tasdiqlaydi.

## 6. Tekshiruv

```
npm run test:integration   328 passed, 0 failed   (2 yangi)
npm run test:journey       115 assertions
npm run test:match          99 passed
npm run test:render        337 passed
npm run test:essay-adapter  50 passed
npm run test:schema        PASSED
npx tsc --noEmit           clean
```

## 7. Yakuniy holat

```
grantlar            643      sana bor 421      muddati o'tgan 0
ariza sikllari     3042      verified  171      muddati o'tgan 0
programmalar       3032      aniq sana  84 (qolgani NULL — taxmin yozilmagan)
```

Takrorlash: `supabase/deadline_correctness_sweep_2026-10-23.sql`.

## 8. Eslatma

`sanani keyingi uchrashga ko'chirish` — bu qoidani kalendarga qo'llash, yangi fakt
o'ylab topish emas. Har bir bunday qatorda `notes`ga izoh yozildi, shuning uchun
kelajakda qaysi sana qayerdan kelgani ko'rinadi.
