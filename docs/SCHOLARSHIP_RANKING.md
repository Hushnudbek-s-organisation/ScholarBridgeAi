# Grantlar ro'yxatini tartiblash: moslik + universitet + imkoniyat

**Sana:** 2026-10-29 · **Bosqich:** M · **Holat:** kodda ishlaydi, CI'da qulflangan

## 1. Muammo

2026-10-29 gacha grantlar ro'yxati faqat **grant mosligi** (`matchScore`) bo'yicha
tartiblanardi. Ya'ni bitta grant talabaning profiliga juda mos bo'lsa ham, u
**qaysi universitetda** berilishiga qarab emas, balki faqat o'z balliga qarab
yuqorida turardi. Talaba uchun esa uchta savol bir vaqtda muhim:

1. Bu grant menga mosmi? → **fit**
2. Bu grant turgan universitet menga mosmi? → **universitet**
3. Bu grant e'lon qilgan talablarni bajara olamanmi? → **imkoniyat**

## 2. Yechim — bitta raqam

`src/lib/scholarshipRanking.ts` → `combinedRelevance()`:

```
relevance = Σ(og'irlik × qism) / Σ(og'irlik)     ← faqat mavjud qismlar bo'yicha
og'irliklar: fit 0.5, universitet 0.3, imkoniyat 0.2
```

- **fit** — `calculateScholarshipMatch().matchScore` (30…98).
- **universitet** — `scholarships.university_id` orqali topilgan universitet uchun
  `calculateUniversityMatch().matchScore`. Bir so'rov ichida universitet id
  bo'yicha memoizatsiya qilinadi (ko'p grant bitta universitetda).
- **imkoniyat** — `scholarshipGates.ts` → `evaluateChance()` natijasi:
  `meets` = 100, `unknown` = 55, `below` = 20.

**Bo'sh qism nolga tenglashtirilmaydi.** Grant hech qanday universitetga
bog'lanmagan bo'lsa, universitet qismi umuman qatnashmaydi va qolgan
og'irliklar qayta taqsimlanadi (0.5/0.7, 0.2/0.7). Shu sababli kam ma'lumotli
qator "o'rtacha" bo'lib ko'rinmaydi — u faqat o'zi haqida bor ma'lumot bilan
baholanadi. Hech bir qism mavjud bo'lmasa, ball `null` (o'ylab topilmaydi).

Tartib: `covTier` (saqlangan universitetning to'liq qoplami) → `relevanceScore`
→ `matchScore` → semantik moslik → eng yaqin muddat → `id`. Anonim foydalanuvchi
uchun tartib o'zgarmaydi (u yerda shaxsiy ball yo'q).

## 3. "Imkoniyat" — bu qabul ehtimoli EMAS

`src/lib/chancing.ts` qabul ehtimolini hisoblashdan **bosh tortadi**:

```ts
export const ADMISSION_PROBABILITY = { available: false, reason: "no-validated-methodology" };
```

Shu sababli "imkoniyat" filtri faqat **grant o'zi e'lon qilgan** uchta eshikni
tekshiradi va natijani uch holatga ajratadi:

| Holat | Ma'nosi |
|---|---|
| `meets` | Taqqoslash mumkin bo'lgan barcha eshiklar o'tdi (kamida bittasi bo'ldi) |
| `below` | Kamida bitta e'lon qilingan eshik o'tmadi (GPA/IELTS/daraja) |
| `unknown` | Taqqoslanadigan ma'lumot yo'q — bu "yo'q" degani emas |

Tekshiriladigan eshiklar: `min_gpa`, `min_ielts`, `degree_levels`.
Millat ro'yxatlari va "IELTS o'rniga boshqa test" kabi erkin matnlar
taqqoslanmaydi — ularni solishtirish taxmin qilish bo'lardi.

Muhim qoidalar:
- 4.0 bo'lmagan shkaladagi GPA avval 4.0 ga keltiriladi (`gpaTo40Scale`);
  shkala ko'rsatilmagan va qiymat 4 dan katta bo'lsa — `unknown`;
- profil jim bo'lsa — `unknown`, hech qachon `below` emas;
- tanilmagan daraja yorlig'i mos kelmaslik deb hisoblanmaydi.

## 4. Filtrlar

`src/lib/scholarshipFilters.ts` ga ikkita yangi o'lcham qo'shildi: `chance` va
`fit`. Ikkalasi **faqat profil yuklanganda** ko'rinadi (`hasProfile`) va faqat
profil bilan javob beradi:

- API: `?chance=meets|below|unknown`, `?fit=strong|good|low` (mos ravishda
  `chances`, `fits` ham qabul qilinadi).
- Anonim so'rovda bu ikki filtr **tashlab yuboriladi** — bo'sh katalog emas,
  to'liq katalog qaytadi (eskirgan havola / tugagan sessiya uchun).
- Facet hisoblari (`facets=1`) `chance` va `fit` uchun ham to'ldiriladi; har
  biri o'zini hisoblashda chetlab o'tadi, shuning uchun tanlangan qiymat o'z
  variantlarini nolga tushirmaydi.
- Filtr paneli: 5 katalog o'lchamidan keyin **"Imkoniyat (e'lon qilingan
  talablar)"** va **"Moslik"**. Uch tilda (uz/ru/en), har variant yonida
  nechta grant qaytishini ko'rsatadi.
- Orqaga qaytishda tanlov saqlanadi: `readStoredFilters()` oq ro'yxatiga
  `chance` va `fit` qo'shildi (aks holda sessionStorage ularni jimgina
  tashlab yuborardi).

`fit` chegaralari: `strong` ≥ 80, `good` ≥ 60 (`isEligible` chegarasi), `low` < 60.

## 5. Nega og'irliklar aynan shunday

- `fit 0.5` — grantning o'zi baribir birinchi darajali savol.
- `universitet 0.3` — universitet mosligi sezilarli ta'sir qiladi, lekin yolg'iz
  o'zi grant mosligini yenga olmaydi: 0.5/0.3 nisbatida universitet farqi grant
  farqidan ~1.7 barobar katta bo'lishi kerak. Bu ataylab shunday — 95 fitli
  grant 50 moslikdagi universitetda 85 fitli, 95 moslikdagi universitetdagi
  grantdan pastda qoladi, ya'ni ikkalasi **birga** baholanadi.
- `imkoniyat 0.2` — o'tilmagan e'lon qilingan talab ro'yxatdan chiqarib
  yubormaydi (talaba uni hali tuzatishi mumkin), lekin ro'yxat boshiga ham
  chiqarmaydi.

## 6. Tekshirish

```bash
npm run test:ranking        # 42 ta oflayn tekshiruv (DB yo'q, tarmoq yo'q)
npm run test:integration    # +9 ta HTTP-darajasidagi tekshiruv (embedded Postgres)
npm run test:match          # mavjud moslik dvigateli o'zgarmaganini tasdiqlaydi
npm run typecheck
```

`test:ranking` qamrab oladi: og'irliklar yig'indisi, qayta taqsimlash, `null`
ball, universitet ta'siri, `meets > unknown > below`, GPA shkalasi, daraja
yorlig'i, `fit` chegaralari, `chance`/`fit` filtrlari va facet-chetlab-o'tish.

`test:integration` esa haqiqiy route'ni chaqiradi: ikkita bir xil grant, biri
yaxshiroq mos universitetda — tartib o'sha universitet balliga ergashadi;
universitetga bog'lanmagan grant nolga tenglashtirilmaydi; anonim so'rovdagi
shaxsiy filtr tashlanadi.

## 7. Ma'lumot holati

Live bazada (2026-10-29): 749 grantdan **641 tasi** `university_id` bilan
bog'langan (356 xil universitet), hammasi `verified`. Ya'ni universitet qismi
aksariyat qatorlar uchun haqiqiy raqam beradi, taxmin emas. Bog'lanmagan 108
qator shunchaki bu qismsiz baholanadi.

Admin uchun: grantni universitetga bog'lash endi tartibga bevosita ta'sir
qiladi — noto'g'ri bog'langan grant noto'g'ri universitet mosligi bilan
yuqoriga chiqadi. Bog'lanish `scholarships.university_id` orqali boshqariladi.
