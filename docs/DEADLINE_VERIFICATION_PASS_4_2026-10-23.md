# Deadline tekshiruvi — 4-bosqich: Yevropa, Osiyo, Okeaniya (2026-10-23)

**Loyiha:** `zkdguzbdopfedkffsatk` · **Branch:** `arena/99b0c7fe-scholarbridgeai`
**Fayl:** `supabase/deadline_verification_eu_asia_2026-10-23.sql`

Bu bosqichda **29 ta universitet** o'z rasmiy qabul sahifasidan tekshirildi.
Oldingi bosqich (AQSh 25 + Shvetsiya 6) bilan birga jami **60 universitet** qo'shildi.

---

## 1. Natija (Supabase, 2026-10-23)

| Ko'rsatkich | Pass 3 dan keyin | **Hozir** |
| --- | --- | --- |
| `verified` qatorlar | 678 | **1063** |
| `verified` universitetlar | 194 | **227** |
| Faqat placeholder qolganlar | 89 | **56** |
| `estimated` qatorlar | 81 | 81 |
| Muddati o'tgan (expired) | 0 | **0** |
| `university_sources` bog'lanishlari | 605 | **639** |

---

## 2. Tekshirilgan 29 universitet

### Shveytsariya — 7
| Universitet (id) | Sana | Izoh |
| --- | --- | --- |
| EPFL (24) | 2027-04-30 | 15-noyabrdan 30-aprelgacha; MSc lar alohida |
| Basel (141) | 2027-04-30 | ariza 2027-02-01 da ochiladi |
| Bern (131) | 2027-04-30 | Tibbiyot 15-fevral |
| Geneva (177) | 2027-02-28 | viza kerak bo'lganlarga; boshqalarga 30-aprel |
| UNIL (116, 135) | 2027-02-28 | viza kerak bo'lganlarga; boshqalarga 30-aprel |
| Zurich (68) | 2027-02-28 | viza kerak bo'lganlarga; Tibbiyot 31-mart |

### Finlyandiya — 4
| Universitet (id) | Sana | Izoh |
| --- | --- | --- |
| Aalto (103) | 2027-01-05 | magistratura: 2026-12-07 → 2027-01-05 |
| Helsinki (194) | 2027-01-19 | 5–19 yanvar (SAT/ACT guruhi) |
| Turku (196) | 2027-01-21 | milliy qo'shma ariza 7–21 yanvar |
| Oulu (197) | 2027-01-21 | hujjatlar 28-yanvargacha |

### Daniya — 4 (MSc qatorlari 15-yanvar, UCPH bakalavriati 15-mart)
Copenhagen (193), Aarhus (195), DTU (114), DTU International (143).
Daniyada o'qitiladigan bakalavriat dasturlari milliy kvota tizimiga o'tadi —
ularga bu sana qo'llanmadi.

### Gonkong — 4 (2027 kirish)
| Universitet (id) | Sana | Bosqich |
| --- | --- | --- |
| HKU (21) | 2026-11-25 | First Round Evaluation (12:00 HKT) |
| CUHK (33) | 2027-01-07 | Regular Round |
| CityU (63) | 2027-01-15 | Main Round |
| PolyU (72) | 2027-02-11 | Main Round |

### Belgiya — 4 (non-EEA)
KU Leuven (48) 2027-03-01 · Ghent (142) 2027-04-01 · UCLouvain (112) 2027-03-31 ·
Antwerp (157) 2027-02-28 (ariza 2026-11-04 da ochiladi).

### Boshqa davlatlar — 6
| Universitet (id) | Sana | Manba |
| --- | --- | --- |
| RMIT (109) | 2027-03-03 | rmit.edu.au — Semester 1 2027 |
| UWA (167) | **2026-12-28** | uwa.edu.au — O'zbekiston uchun alohida ro'yxat |
| Auckland (173) | 2026-12-08 | auckland.ac.nz |
| Otago (149) | 2026-11-15 | otago.ac.nz (offshore) |
| Trinity College Dublin (81) | 2027-06-30 | tcd.ie (priority 1-fevral) |
| Université de Montréal (94) | 2027-02-01 | umontreal.ca |
| Oslo (158) | 2026-12-01 | uio.no |
| NTU Singapore (16) | 2027-03-19 | ntu.edu.sg |
| NTU Taiwan (64) | 2027-01-19 | admissions.ntu.edu.tw (2-raund) |
| UTM Malaysia (98) | 2027-05-30 | fte.utm.my |

> **UWA muhim:** universitet saytida O'zbekiston alohida ro'yxatda — Semester 1 2027
> uchun muddat **28-dekabr 2026** (umumiy xorijiy muddat 11-yanvar 2027).

---

## 3. Ataylab tekshirilmaganlar (yolg'on sana yozmaslik uchun)

| Guruh | Soni | Sabab |
| --- | --- | --- |
| Yaponiya | 9 | Fakultet bo'yicha yapon tilida e'lon qilinadi; Fall 2027 sanasi rasmiy sahifadan o'qilmadi |
| Koreya | 6 | Spring 2027 oynasi 2026-sentabrda yopilgan; Fall 2027 qo'llanmasi hali chiqmagan (SNU Fall 2026 ni 2026-martda chiqargan) |
| Avstriya | 2 | Jadvallar faqat 2026/27 qishki va 2027 yozgi semestrni ko'rsatadi; 2027/28 qishki oyna hali e'lon qilinmagan |
| Ispaniya | 3 | 2027-28 preinscripción sanalari 2027-bahorda belgilanadi |
| Avstraliya | 6 | Rolling qabul; aniq yopilish sanasi e'lon qilinmagan |
| O'zbekiston | 3 | WIUT'ning e'lon qilingan sanasi (2026-08-17) 2026/27 tsikliga tegishli |
| Boshqalar | 12 | IIT (JoSAA), Campus France, Lotin Amerikasi, Janubiy Afrika va boshqalar |

---

## 4. Tekshirish so'rovi

```sql
WITH best AS (
  SELECT university_id,
         MAX(CASE verification_status WHEN 'verified' THEN 3 WHEN 'estimated' THEN 2 ELSE 1 END) AS s
  FROM application_cycles GROUP BY 1
)
SELECT COUNT(*) FILTER (WHERE s = 1) AS placeholder_only,
       COUNT(*) FILTER (WHERE s = 2) AS estimated_only,
       COUNT(*) FILTER (WHERE s = 3) AS has_verified
FROM best;
```

Natija: `has_verified = 227`, `estimated_only = 81`, `placeholder_only = 56`
(`227 + 81 + 56 = 364` — barcha universitet hisobga olingan).

---

## 5. Keyingi qadam

Qolgan 56 placeholder + 81 estimated uchun eng katta foyda:
**Yaponiya (9)** va **Koreya (6)** — ikkalasi ham o'z qabul sahifasini 2027-yil
boshida yangilaydi. Shuningdek Ispaniya (3) va Campus France (3) fevral-martda
e'lon qilinadi. Bu guruhlarni keyingi bosqichda qayta tekshirish kerak.
