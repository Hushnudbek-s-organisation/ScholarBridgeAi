# Universitet ma'lumotlarini kiritish — to'liq ro'yxat

> **Nima uchun bu fayl:** Supabase'ga universitet yozishdan oldin owner'dan kerak bo'ladigan
> BARCHA ma'lumotlar bitta yerda. Hech bir savol javoblanmay qolmaydi.
>
> Hali hech narsa yozilmagan. Hech narsa `verified` emas.

---

## 1. `.env.local` — 3 ta kalit (MAJBURIY: 2 ta)

**Bu faylga yozing. Chatga YUBORMANG.** `.gitignore` da turadi.

```bash
# ── 1) Supabase → Project Settings → Database → Connection string
#    MUHIM: "Session pooler" rejimini tanlang. "Direct" emas!
DATABASE_URL=postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# ── 2) openrouter.ai/keys dan oling
OPENROUTER_API_KEY=sk-or-v1-XXXXXXXXXXXXXXXX

# ── 3) Ixtiyoriy, lekin tavsiya qilinadi
SESSION_SECRET=<ixtiyoriy uzun tasodifiy matn>
APP_URL=http://localhost:3000
```

| # | Kalit | Kerakmi | Nima uchun | Bermasangiz |
|---|-------|---------|-----------|-------------|
| 1 | `DATABASE_URL` | ✅ **majburiy** | yozish | hech narsa yozilmaydi |
| 2 | `OPENROUTER_API_KEY` | ✅ **majburiy** | sahifa o'qish + maydon ajratish | faqat regex, sifiat keskin pasayadi |
| 3 | `SESSION_SECRET` | ixtiyoriy | kirish (cookie) | dev'da `DATABASE_URL` dan avtomatik |
| 4 | `APP_URL` | ixtiyoriy | sayt manzili | localhost'da o'zi taxmin qiladi |
| 5 | `RESEARCH_SEARCH_API_KEY` | ❌ kerak emas | qo'shimcha qidiruv | `DirectFetchProvider` 0 dollar bilan ishlaydi |

### Nima kerak EMAS

| Kalit | Nega |
|-------|------|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | faqat admin panel orqali ishlash kerak bo'lsa |
| `AI_KEYS_ENCRYPTION_SECRET` | faqat kalitlarni panelda saqlash kerak bo'lsa (≥16 belgi) |

---

## 2. Universitetlar ro'yxati

`.csv` yoki `.txt` fayl, **3 ustun**:

```csv
name,country,domain
Massachusetts Institute of Technology,United States,mit.edu
University of Oxford,United Kingdom,ox.ac.uk
Technical University of Munich,Germany,tum.de
```

| Ustun | Majburiy | Izoh |
|-------|----------|------|
| `name` | ✅ | universitetning to'liq nomi |
| `country` | ✅ | inglizcha nomi |
| `domain` | ❌ | rasmiy sayt. Bo'lmasa, men qidiraman va **manba bilan** ko'rsataman |

**Necha ta?** Pilot uchun **1–3 ta** tavsiya qilinadi (natija darhol ko'rinadi).
Keyin o'shandan keyin ko'paytiramiz.

---

## 3. Qarorlar (5 ta) — tavsiyani belgilab bering

| # | Savol | Tavsiyam | Nima uchun |
|---|-------|----------|-----------|
| ① | `world_ranking` ni qanday qilamiz? | **(a) `NULL` qoldiramiz** | Saytda "QS World Ranking 2027" deb yozilgan. QS litsenziyali — ruxsat yo'q. `NULL` qo'yib, o'rniga "Reyting topilmadi" ko'rsatamiz |
| ② | `program_major` uchun fanlar ro'yxati | Siz yozing | Bu saytning **o'z kategoriyasi**, tashqi ma'lumot emas. Masalan: Computer Science, AI & ML, Business, Medicine, Law, Engineering, Data Science, Finance |
| ③ | Seed'dagi 12 ta universitetni nechamiz? | **(a) tekshirib, topilmaganini `NULL`** | Ular hozir manbasiz: MIT `min_gpa 3.85`, `min_ielts 7.5`, `min_sat 1530`, `acceptance_rate 4.8`, lekin `source_url` — yo'q |
| ④ | Kodga tegishim kerakmi? | **(c) ikkalasi** | (a) `api/admin/universities/route.ts` dan o'ylab topilgan `3.0 / 6.5 / 2.0 / "Unknown"` larni olib tashlash (spec §19 buzilishi). (b) `fetch.ts` ga PDF o'qish qo'shish — 5–10 barobar ko'p ma'lumot ochiladi |
| ⑤ | Kim `verified` qiladi? | **Siz, admin tugmasi bilan** | `validate.ts`: AI ma'lumoti hech qachon avtomatik `verified` bo'lmaydi (spec §14/§20) |

---

## 4. Ogohlantirish: nima bo'lmaydi

| Xususiyat | Holat |
|-----------|-------|
| PDF'dan ma'lumot o'qish | `fetch.ts:48` — **PDF o'qish ishlamaydi**. Ko'p universitet tuition/IELTS ni PDF'da e'lon qiladi → o'sha maydonlar bo'sh qoladi (taxmin qilinmaydi) |
| `verified` avtomatik bo'lishi | **Hech qachon.** Faqat sizning tasdiqlogingiz bilan |
| `highlights` va `description` | Bular ** fakt emas, matn**. Men yozaman. Xato bo'lsa tuzatiladi |
| `image_url` | Tashqi rasm — mualliflik huquqi. O'zingizga tegibdi, men qo'yaman deb yolg'on qilmayman |
| `scholarships` bo'limi | `[id]/route.ts:361` — `scholarships` jadvalida `university_id` yo'q, shuning uchun bo'lim **doim bo'sh**. (③-ga alohida javob: `university_id` qo'shamizmi?) |

---

## 5. Jarayon

```
[1] Owner  → .env.local ga DATABASE_URL + OPENROUTER_API_KEY
[2] Men    → SELECT 1 (ulashni tekshirish) + jadvalar ro'yxati
[3] Owner  → universitetlar ro'yxati + 3 ta qaror
[4] Men    → 1 ta universitetni PILOT, dryRun (hech narsa yozilmaydi)
             jadval: maydon | qiymat | manba URL | aniq iqtibos
[5] Owner  → tasdiqlaydi yoki to'g'rilaydi
[6] Men    → to'ldiriladigan SQL ni KO'RSATAMAN
[7] Owner  → "HA" yozadi
[8] Men    → yozaman (faqat o'sha jadval ustunlari)
[9] Owner  → admin panelda `verified` tasdiqlaydi
```

### Mening qoidalarim

1. **Ko'rsataman → keyin yozaman.** `INSERT`/`UPDATE`/`DELETE`/DDL oldidan SQL ko'rsatiladi.
2. **`DROP`/`TRUNCATE`/`DELETE` (shartsiz) ishlatmayman.**
3. **`auth`/session jadvallariga tegmayman.**
4. **Schema o'zgarishidan oldin** `pg_dump` bilan zaxira olaman.
5. **`.env.local` ni hech qachon commit qilmayman**, hech qachon chatga yozmayman.
6. Noma'lum maydon → `NULL`. Hech qachon `0`, `3.0`, `6.5` kabi "qulay" qiymat qo'yaman deb yolg'on qilmayman.

---

## 6. Owner javob shakli

Quyidagini to'ldirib yubiring:

```
1) .env.local tayyor ................ [ha / yo'q]
2) universitetlar ro'yxati .......... [ fayl yoki inline ]
3) ① world_ranking .................. [a / b / c]
   ② program_major fanlari ......... [ ro'yxat ]
   ③ seed'dagi 12 ta ................ [a / b]
   ④ kodga tegish .................. [a / b / c]
   ⑤ verified kim tasdiqlaydi ....... [siz / boshqa]
   ⑥ scholarships ga university_id .. [ha / yo'q]
```
