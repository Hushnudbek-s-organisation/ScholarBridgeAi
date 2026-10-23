# 6 juft dublikat universitet birlashtirildi (2026-10-23)

**Loyiha:** `zkdguzbdopfedkffsatk` · **Branch:** `arena/99b0c7fe-scholarbridgeai`
**SQL:** `supabase/merge_duplicate_universities_2026-10-23.sql`
**Guard:** `npm run test:duplicates`

---

## 1. Muammo

Ikki PDF import bir institutni ikki marta yozgan. Ikkala qatorda ham **bir xil QS
reytingi** va bir xil davlat, lekin boshqa nom varianti bor edi. Natijada:

- explorer bir universitetni **ikki marta** ko'rsatardi;
- bitta qatorga bog'langan scholarship **ikkinchi sahifada ko'rinmasdi**;
- ularning dasturlari, muddatlari va manbalari ikkiga bo'linib qolgan edi.

| Qoldirilgan (keep) | O'chirilgan (drop) |
| --- | --- |
| 77 — Universiti Malaya (UM) | 187 — UM International |
| 87 — POSTECH (Science and Technology) | 170 — POSTECH (Graduate/BSc) |
| 89 — Pontificia UC de Chile (UC Chile) | 174 — UC (UC Santiago) |
| 91 — UNAM (Universidad Nacional…) | 176 — UNAM (… - CU) |
| 114 — Technical University of Denmark | 143 — DTU International |
| 116 — University of Lausanne (UNIL) | 135 — UNIL - HEC & Sciences |

> **Muhim:** bir xil `world_ranking` o'zi dublikat degani emas — QS diapazonlari
> sababli Aberdeen va Surrey ikkalasi ham 262-o'rinda. Shuning uchun mezon:
> **bir davlat + normallashtirilgan nom bir xil**.

---

## 2. Qanday birlashtirildi

Dublikatning **barcha farzand qatorlari** avval keeperga ko'chirildi, keyin
dublikat o'chirildi. Hech qanday dastur, muddat, scholarship yoki ariza
yo'qolmadi.

Ko'chirilgan jadvallar (15 ta FK):

```
programs · application_cycles · applications · application_outcomes
application_tasks · essay_versions · campuses · requirement_templates
university_images · scholarships · university_sources
university_programs · university_rankings · university_scholarships
saved_universities
```

### Unikal indekslar bilan ishlash
Uch jadvalda unikal cheklov bor, shuning uchun avval dublikatdagi **to'qnashuvchi
qator** o'chirildi, keyin qolganlari ko'chirildi:

| Jadval | Kalit |
| --- | --- |
| `university_programs` | `(university_id, name)` |
| `university_rankings` | `(university_id, ranking_provider, ranking_name, ranking_year)` |
| `university_scholarships` | `(university_id, scholarship_name)` |
| `saved_universities` | `(profile_id, university_id)` |

### Kompozit FK
`application_cycles` da `(program_id, university_id) → programs(id, university_id)`
kompozit FK bor va u **deferrable emas**. Shuning uchun u ko'chirish davomida
vaqtincha olib tashlandi va oxirida qayta yaratildi
(`convalidated = true` — tekshirildi).

---

## 3. Natija

| Ko'rsatkich | Oldin | **Keyin** |
| --- | --- | --- |
| Universitetlar | 364 | **358** |
| Dasturlar | 3032 | **3032** (yo'qolmadi) |
| `verified` muddatli universitetlar | 227 | **224** (3 tasi qo'shildi) |
| Aktiv scholarship | 639 | 639 |
| Scholarship bog'lanishlari | 389 | 388 (1 to'qnashuv) |
| Manba bog'lanishlari | 639 | 629 (10 takror) |

Har bir keeper endi **to'liq** ma'lumotga ega:

| Universitet | Dasturlar | Cycle'lar | Scholarxiplar | Manbalar |
| --- | --- | --- | --- | --- |
| Universiti Malaya | 16 → **25** | 17 → **27** | 2 → **3** | 1 → **2** |
| POSTECH | 15 → **25** | 15 → **25** | 2 → **3** | 1 → **2** |
| PUC Chile | 17 → **25** | 17 → **25** | 2 → **3** | 1 → **2** |
| UNAM | 19 → **27** | 19 → **27** | 1 → **2** | 1 → **2** |
| DTU | 16 → **22** | 16 → **22** | 1 → **2** | 1 → **2** |
| UNIL | 15 → **25** | 15 → **25** | 2 → **3** | 1 → **2** |

Tekshirildi: `orphan_programs = 0`, `orphan_cycles = 0`,
`orphan_scholarships = 0`, dublikat dastur nomi `0`, bo'sh universitet `0`.

---

## 4. Kod

### 4.1 `university_scholarships` endi Drizzle sxemasida
Bu jadval ilgari umuman modellashtirilmagan edi — shuning uchun uning
`covers_tuition`, `verification_status` kabi ustunlari va UNIQUE kaliti haqida
kod hech narsa bilmasdi. Endi `src/db/schema.ts` da to'liq tavsiflangan va
`docs/SUPABASE_SCHEMA.md` da hujjatlashtirilgan
(`check-supabase-schema` buni majburiy tekshiradi).

Natijada: **96 jadval, 1069 ustun, 119 FK** — `full_schema.sql` qayta
generatsiya qilindi, round-trip tekshiruvi OK.

### 4.2 Yangi guard: `npm run test:duplicates`
`scripts/check-catalog-duplicates.ts` katalogni normallashtirilgan nom bo'yicha
tekshiradi va dublikat topsa **exit 1** bilan ro'yxatni chiqaradi.

```bash
DATABASE_URL=postgresql://… npm run test:duplicates
```

Hozirgi natija: `✓ no duplicate universities (same country, same normalised name)`.

### 4.3 `check-schema-repair` yangilandi
Yangi jadval qo'shilgani uchun kutilgan raqamlar yangilandi
(95 → 96 jadval, 117 → 119 FK). Test: **18 passed, 0 failed**.

---

## 5. Testlar

| Test | Natija |
| --- | --- |
| `test:integration` | ✅ 331 passed, 0 failed |
| `test:schema` (offline) | ✅ PASSED |
| `test:schema-repair` | ✅ 18 passed, 0 failed |
| `test:security` | ✅ 81 assertions |
| `test:portability` | ✅ 57 passed, 0 failed |
| `test:duplicates` (live) | ✅ 0 duplicates |
