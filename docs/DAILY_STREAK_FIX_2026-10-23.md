# Daily streak — diagnostika va tuzatish (2026-10-23)

Shikoyat: "daily streak yaxshi ishlamayapti". Quyida tekshiruv natijasi, topilgan
xatolar va ularning tuzatilishi.

## 1. Qanday tekshirildi

1. `src/lib/streak.ts` (sof funksiya), `src/lib/gamification.ts` (hisoblash),
   `DailyStreakCard.tsx` (ko'rsatish), API va mukofot beruvchi 10 ta route o'qildi.
2. Sof funksiya testlari ishga tushirildi — **14/14 o'tdi**, ya'ni matematika to'g'ri.
3. Production bazadagi (`zkdguzbdopfedkffsatk`) haqiqiy ma'lumot olindi.

### Production dalillar (2026-10-23 holati)

```
points_ledger:      22 qator, 15 profil, 42 kun
oxirgi yozuv:       2026-10-22
```

| Profil | Faol kunlar | Kunlar nima bilan |
| --- | ---: | --- |
| 1 | 4 | `profile_created`, `thread_created` ×2, `reply_created` ×4, `quiz_passed` |
| 4–18 (14 ta profil) | **1** | faqat `profile_created` |

Ya'ni **15 profildan 14 tasida streak umuman o'smagan** — yagona "kun" ro'yxatdan
o'tgan kun. Muammo hisoblashda emas, **ma'lumot qanday yozilishida** edi.

## 2. Topilgan xatolar

### Xato 1 — takroriy o'qish hech qachon hisoblanmaydi (asosiy sabab)

Streak `points_ledger`dan hisoblanadi, ball esa **har bir obyekt uchun bir marta**
beriladi:

* `lesson_complete` → `(profil, sabab, dars id)` bo'yicha idempotent. Darsni qayta
  ko'rish (talabalar odatda shunday takrorlaydi) **hech qanday yozuv qoldirmaydi**.
* `quiz_passed` → test id bo'yicha bir marta. Qayta urinish ham yozilmaydi.

Natijada streak "necha xil YANGI narsa qilgan kunlar" soniga aylanadi va darslar
tugagach muzlab qoladi.

### Xato 2 — boshqalarning harakati talabaning kunini hisoblaydi

`getGamification` barcha ledger yozuvlarini faollik deb olardi:

* `content_liked` — **boshqa odam** eski postni yoqtirganda **muallifga** ball beriladi;
* `referral_referrer` / `referral_referred` — **do'st**ning harakati uchun beriladi;
* `admin_award` — operator bergan ball;
* `profile_created` — ro'yxatdan o'tish, o'qish emas.

Ya'ni talaba hech narsa qilmasa ham, birov postini yoqtirsa, streak o'sib ketardi.

### Xato 3 — noto'g'ri chaqiruv matni (UI)

Streak allaqachon uzilgan bo'lsa ham (bugun ham, kechagi kun ham faollik yo'q)
nishon **"Bugun davom eting"** deb turardi. Davom ettiradigan narsa yo'q.

### Xato 4 — tarix 1000 qator bilan kesilardi

`getGamification` faqat oxirgi **1000** yozuvni o'qirdi. Ko'p o'qiydigan talabada
eski kunlar jimgina yo'qolib, "rekord" va uzilish noto'g'ri chiqardi (kalendar
emas, ledgerning "gapiradigan" darajasi hal qilardi).

## 3. Tuzatish

| Fayl | O'zgarish |
| --- | --- |
| `src/lib/streak.ts` | `STREAK_ACTIVITY_REASONS` + `isStreakActivity()` — faqat talaba **o'zi qilgan** amal: `lesson_complete`, `quiz_passed`, `thread_created`, `reply_created`, `daily_active`. `content_liked`, `referral_*`, `admin_award`, `profile_created` **hisoblanmaydi** |
| `src/lib/gamification.ts` | Yangi `recordDailyActivity(profileId)`: 0 ballli `daily_active` yozuvi, **kuniga ko'pi bilan bitta** (UTC kuni chegarasi `now() AT TIME ZONE 'UTC'` bilan, ulanish TimeZone'iga bog'liq emas) |
| `awardPoints()` | Kun belgisi **idempotentlik tekshiruvidan oldin** qo'yiladi — takroriy amal ham kunni belgilaydi |
| `getGamification()` | Streak faqat ruxsat etilgan sabablar bo'yicha; oyna 400 kun (rekord 365), 1000 qator cheklovi olib tashlandi; `ledger` javobi faqat ball berilgan yozuvlar |
| `api/courses/progress` | Dars **yakunlanganda** (qayta yakunlash ham) kun belgilanadi — videoni ochishning o'zi hisoblanmaydi |
| `api/quizzes/attempt` | Har bir urinish (qayta urinish ham) kunni belgilaydi |
| `DailyStreakCard.tsx` | Uzilgan streakda nishon **"Bugun boshlang"** (`streakStartToday`, en/uz/ru) |
| `scripts/check-streak.ts` | 29 ta assertion: ruxsat ro'yxati (ijobiy va salbiy holatlar), uzilgan streak, bir kunda 12 amal = 1 kun |

`daily_active` yozuvi **0 ball**: jami ball, daraja va leaderboard'ga ta'sir qilmaydi
(`userPoints.totalPoints` faqat `awardPoints` orqali o'zgaradi).

## 4. Endi qanday ishlaydi

* Darsni **tugatgan** yoki test topshirgan har bir kun — streak uchun bitta kun
  (qayta o'qish ham hisoblanadi).
* Forumda mavzu/javob yozgan kun — hisoblanadi.
* Postga like kelgan, do'st referral ishlatgan yoki ro'yxatdan o'tgan kun — **hisoblanmaydi**.
* Kun chegarasi talabaning vaqt zonasida hisoblanadi (`Asia/Tashkent` uchun mahalliy
  yarim tun), holbuki kun belgisi UTC bo'yicha saqlanadi — o'qishda timestamp
  talabaning kalendariga o'giriladi.

## 5. Tekshiruv

```
npm run test:streak      → 29 assertions passed
npm run test:render      → 337 passed, 0 failed
npm run test:schema      → PASSED
npm run test:security    → 81 assertions passed
npm run check:i18n       → passed (en/uz/ru parity)
npx tsc --noEmit         → clean
```

SQL ham production bazada (tranzaksiya + `ROLLBACK`) sinovdan o'tkazildi:
`INSERT ... WHERE NOT EXISTS (... date_trunc('day', now() AT TIME ZONE 'UTC'))`
xatosiz bajarildi.

## 6. Eslatma

Mavjud foydalanuvchilarda `profile_created` endi hisoblanmagani uchun "rekord"
1 taga kamayishi mumkin — bu ataylab: ro'yxatdan o'tish o'qish emas. Undan
keyingi haqiqiy amallar (`thread_created`, `quiz_passed`, ...) saqlanib qoladi,
shuning uchun hech qanday ma'lumot yo'qolmaydi.
