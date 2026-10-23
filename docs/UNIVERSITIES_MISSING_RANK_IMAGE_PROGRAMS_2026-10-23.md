# Supabase universitetlar — QS reyting, rasm va dastur holati (2026-10-23, QS 2026 tekshiruvidan keyin)

Loyiha: Supabase `zkdguzbdopfedkffsatk`, jadval `public.universities` (364 qator). Reyting ustuni `world_ranking` + `qs_rank_year`, rasm — `image_url`, dastur — `programs` jadvali.

> Bu hisobot 2026-10-23 dagi QS 2026 tekshiruvidan **keyingi** holatni ko'rsatadi (avvalgi nusxada 164 ta reytingsiz edi). Tekshiruv tafsilotlari: `docs/QS2026_RANK_VERIFICATION_2026-10-23.md`.

## 1. Xulosa

| Mezon | Oldin | Hozir |
| --- | ---: | ---: |
| QS reytingi bor (`world_ranking`, QS 2026) | 200 (tekshirilmagan) | **336** (rasmiy QS 2026 ro'yxati bo'yicha) |
| QS reytingi yo'q | 164 | **28** |
| Rasmi yo'q (`image_url` bo'sh) | 164 | **164** |
| Dasturi yo'q (`programs` bo'sh) | 4 | **4** |

## 2. QS reytingi yo'q — 28 ta

Bularda 2026-yil nashri bo'yicha tasdiqlangan o'rin yo'q: yo QS 2026 ro'yxatining 500+ qismida (bizda 1–499 qismi tasdiqlangan), yo umuman reytingda yo'q. **KAIST** 2026 nashridan QS tomonidan chiqarib tashlangan (so'rovnomada qoidabuzarlik) — shuning uchun reytingi ataylab `NULL`.

| id | Universitet | Davlat | Eski (tekshirilmagan) reyting |
| ---: | --- | --- | ---: |
| 298 | École des Ponts ParisTech | France | — |
| 206 | Budapest University of Technology and Economics (BME) | Hungary | — |
| 341 | Corvinus University of Budapest | Hungary | — |
| 343 | Hungarian University of Agriculture and Life Sciences (MATE) | Hungary | — |
| 342 | Semmelweis University | Hungary | — |
| 345 | Széchenyi István University | Hungary | — |
| 340 | University of Pécs | Hungary | — |
| 344 | Óbuda University | Hungary | — |
| 198 | University of Iceland | Iceland | 198 |
| 208 | Nazarbayev University | Kazakhstan | — |
| 200 | University of Latvia | Latvia | 200 |
| 355 | International Islamic University Malaysia (IIUM) | Malaysia | — |
| 357 | AGH University of Krakow | Poland | — |
| 358 | Adam Mickiewicz University, Poznań | Poland | — |
| 359 | Gdańsk University of Technology (Gdańsk Tech) | Poland | — |
| 363 | Lodz University of Technology (TUL) | Poland | — |
| 362 | Poznań University of Technology (PUT) | Poland | — |
| 361 | University of Wrocław | Poland | — |
| 360 | Wrocław University of Science and Technology | Poland | — |
| 352 | National Research Nuclear University MEPhI | Russia | — |
| 37 | KAIST (Korea Advanced Institute of Science & Technology) | South Korea | 37 |
| 334 | Ankara University | Turkey | — |
| 332 | Istanbul University | Turkey | — |
| 333 | Yıldız Technical University (YTÜ) | Turkey | — |
| 260 | Canadian University Dubai | United Arab Emirates | — |
| 215 | Inha University in Tashkent (IUT) | Uzbekistan | — |
| 216 | New Uzbekistan University | Uzbekistan | — |
| 214 | Westminster International University in Tashkent (WIUT) | Uzbekistan | — |

## 3. Rasmi yo'q — 164 ta

Ilova `image_url`dan Wikimedia Commons kampus fotosini kutadi (thumbnail + `/api/image` proksi). PDF'dagi `Special:FilePath/<Universitet>_Campus.jpg` ko'rinishidagi manzillar **uydirma** — tekshirilgan 4 tadan 4 tasi Commons'da mavjud emas, shuning uchun yozilmadi. Haqiqiy rasm topilmaguncha ustun bo'sh qoladi (noto'g'ri rasm qo'yishdan ko'ra bo'sh — to'g'ri).

Davlatlar bo'yicha: United States — 18, Hungary — 10, Poland — 10, Turkey — 10, Russia — 9, Australia — 8, China — 8, United Kingdom — 8, Germany — 7, Italy — 7, Malaysia — 5, Spain — 5 …

To'liq ro'yxat CSV'da (`image_missing = yes`).

## 4. Dasturi yo'q — 4 ta

| id | Universitet | Davlat | QS 2026 |
| ---: | --- | --- | ---: |
| 213 | Czech Technical University in Prague (CTU) | Czechia | 416 |
| 215 | Inha University in Tashkent (IUT) | Uzbekistan | — |
| 216 | New Uzbekistan University | Uzbekistan | — |
| 214 | Westminster International University in Tashkent (WIUT) | Uzbekistan | — |

Bu 4 ta eski "placeholder" qator: hali dastur, muddat, grant, manba yo'q.

## 5. Mashina o'qiydigan nusxa

`data/universities_missing_rank_image_programs_2026-10-23.csv` — 364 qator, ustunlar: `qs_2026_rank`, `image_url_present`, `programs_count`, `rank_missing`, `image_missing`, `programs_missing`.

## 6. Takrorlash uchun SQL

```sql
SELECT u.id, u.name, u.country, u.world_ranking, u.qs_rank_year, u.image_url,
       (SELECT count(*) FROM public.programs p WHERE p.university_id = u.id) AS programs
FROM public.universities u
WHERE u.world_ranking IS NULL
   OR NULLIF(trim(coalesce(u.image_url, '')), '') IS NULL
   OR NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.university_id = u.id)
ORDER BY u.country, u.name;
```
