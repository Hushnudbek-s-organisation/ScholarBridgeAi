# Jonli Supabase loyihasini read-only tekshirish — 2026-11-06

> **Holat: faqat o‘qildi.** Ushbu tekshiruvda production bazasiga hech qanday `INSERT`, `UPDATE`, `DELETE`, `ALTER`, migration, deploy yoki secret o‘zgartirish bajarilmadi. Hech qanday API kaliti, token, parol yoki connection string qiymati hisobotga yoki repository fayllariga kiritilmagan. Ulagich kalit/secret **nomlari** haqida metadata qaytardi; qiymatlar ataylab saqlanmadi.

## 1. Loyiha va xizmatlar

| Tekshiruv | Natija |
| --- | --- |
| Project ref | `zkdguzbdopfedkffsatk` |
| Nomi | `xushnudsajc-collab's Project` |
| Region | `ap-northeast-2` |
| Status | `ACTIVE_HEALTHY` |
| Postgres | `17.6.1.166`, Postgres 17 GA |
| Yaratilgan | 2026-09-11 |
| Health | auth, db, rest, storage, pooler, realtime — barchasi `healthy: true` |
| Migratsiyalar | 8 ta, 2026-11-02 / 2026-11-03 |
| Branchlar | faqat default `main`, `persistent: false` |
| Edge functions | 0 ta |

Realtime `healthy: true`, lekin `db_connected: false`, `replication_connected: false` qaytdi; bu service health bilan replikatsiya ulanishi bir xil ko‘rsatkich emas. Production sahifasi sog‘lig‘i bilan CI’dagi database-auth xatosi aralashtirilmadi.

## 2. Auth va qo‘lda bajariladigan sozlamalar

- `site_url`: Vercel preview domeni.
- `uri_allow_list`: faqat shu Vercel preview domeni va uning wildcard variantlari.
- Asosiy production domen `https://scholarbridgeai-9bmd.onrender.com/` allow-list’da **yo‘q**. Bu tasdiqlangan konfiguratsiya nuqsoni: agar Supabase auth redirectlari production’dan ishlatilsa, domen qo‘shilishi kerak. Bu SQL migratsiyasi emas, Supabase dashboard’dagi qo‘lda sozlama.
- Email auth yoqilgan, phone auth o‘chirilgan, signup ochiq, anonymous sign-in o‘chirilgan.
- JWT `jwt_exp = 3600`, refresh token rotation yoqilgan, reuse interval 10 s, `mailer_autoconfirm = false`, CAPTCHA o‘chirilgan.
- `external_*` OAuth providerlari o‘chirilgan.

**Tavsiya (qo‘lda, alohida ruxsat bilan):** production Render domenini `site_url` va `uri_allow_list` ga qo‘shish; CAPTCHA va rate limit siyosatini product qarori sifatida ko‘rib chiqish. Ushbu ish bajarilmadi.

## 3. API kalitlari va secretlar

- Loyihada legacy `anon` va `service_role` JWT kalitlari, shuningdek default publishable va default secret kalit mavjud.
- Ulagich kalit/secret qiymatlarini ham qaytardi; ular hech qaysi faylga, logga yoki ushbu hisobotga ko‘chirilmadi.
- `SUPABASE_DB_URL` nomli bitta secret mavjud; qiymati saqlanmadi.
- Frontend `src/` bo‘yicha `sb_secret_` yoki `SUPABASE_SERVICE_ROLE_KEY=...` patternlari statik test bilan tekshirildi va topilmadi.

**Tavsiya (qo‘lda):** legacy kalitlarni rotatsiya qilish, ishlatilmayotganlarini o‘chirish, secret kalitni faqat server muhitida saqlash. Hech qanday kalit o‘chirilmadi yoki yaratilmadi.

## 4. Schema, RLS, grantlar, view va funksiyalar

| Tekshiruv | Natija |
| --- | --- |
| `public` jadvallar | 120 ta `BASE TABLE` |
| RLS | 119 ta yoqilgan, 1 ta o‘chirilgan: `password_reset_tokens` |
| `pg_policies` | 14 ta: 13 ta public catalog `SELECT` (anon/authenticated, `qual=true`), 1 ta `storage.objects` LOGO `SELECT` |
| `auth.uid()` siyosati | 0 ta. Bu HMAC/custom session + numeric `profile_id` arxitekturasi uchun to‘g‘ri; ko‘r-ko‘rona ko‘chirilmadi. Backend ownership tekshiruvlari RLS o‘rnini bosa olmaydi. |
| Public view / materialized view | 0 / 0 |
| Funksiyalar | `public` da 2 ta helper (`_match_score`, `_toks`), `storage` da 24 ta; 3 tasi `SECURITY DEFINER` |
| Extensionlar | `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp` |
| Roller | `postgres` va `service_role` `rolbypassrls = true`; `anon`/`authenticated` bypass emas |

### Tasdiqlangan xavfsizlik nuqsoni

`password_reset_tokens` jadvalida RLS **o‘chirilgan**, lekin `anon` va `authenticated` rollariga `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` grantlari berilgan. Bu token hashlarini PostgREST orqali o‘qish/yozish uchun keng imkoniyat. `universities` va `scholarships` jadvalarida esa anon/authenticated faqat `SELECT` grantiga ega.

Tayyorlangan, lekin **qo‘llanmagan** `supabase/security_evidence_research_2026-11-06.sql` migration’i:

- `password_reset_tokens` uchun RLS yoqadi;
- `PUBLIC, anon, authenticated` grantlarini bekor qiladi;
- `postgres`/`service_role` grantlarini saqlaydi;
- hech qanday `auth.uid()` policy qo‘shmaydi.

### Storage

- 1 ta bucket: `LOGO`, `public = true`, 5 MiB limit, faqat image MIME turlari.
- `storage.objects` RLS yoqilgan; faqat bitta `Public can read LOGO assets` SELECT policy bor.
- `anon`/`authenticated` ga `DELETE, INSERT, SELECT, UPDATE` grantlari berilgan, lekin yozish policy yo‘q. Shunga qaramay, keraksiz grantlar xavfli.
- Migration `REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM anon, authenticated;` qo‘shadi; SELECT saqlanadi. Hujjat upload bucket’i hozir yo‘q — bu alohida product/server-side authorization qarori.

## 5. Katalog ma’lumotlari: jonli qatordagi tasdiqlangan nuqsonlar

Batafsil dalillar va rasmiy sahifalar `docs/OFFICIAL_SOURCE_RECHECK_2026-11-06.md` da.

| Qator | Jonli qiymat | Xulosa |
| --- | --- | --- |
| `scholarships.id = 894` Yenching | `amount_usd_value = 5040`, `award_currency = CNY`, `award_period = month`, `living_allowance = 3000`, `min_ielts = NULL`, `english_requirements` va `notes` “minimum yo‘q” deydi | Rasmiy 2027-cohort sahifasida IELTS Academic 7.0 va boshqa minimumlar bor; stipendiya summasi e’lon qilinmagan. `$5,040 per month` va 3,000 living allowance tasdiqlanmagan. |
| `scholarships.id = 894` eligibility | `["Uzbekistan","All Countries"]`, `["All Majors"]`, `degree_levels = ["Master","PhD"]`, umumiy maktab-transkript hujjat shabloni | “All Countries”, “All Majors”, PhD va maktab attestati magistratura rasmiy talabi sifatida qo‘llab-quvvatlanmaydi. |
| `universities.id = 1` MIT | `min_gpa = 3.91`, `min_sat = 1520`, `acceptance_rate = 4.5`, `data_source = Top 300 Universities dataset (user PDF, 2026)`, `source_url = https://www.mit.edu`, `verification_status = verified` | Rasmiy MIT sahifalarida GPA/SAT cutoff yo‘q; 4.5% tasdiqlangan admitted-cohort statistikasi emas; PDF rasmiy manba emas. |
| `university_rankings.id = 1` | `QS World University Rankings 2026`, `#1`, `verified_at = 2026-10-31` | Jonli rank edition 2026. Repository seed’dagi QS 2027 nomi/URL aralashuvi 2026 ga tuzatildi; rank qabul qilinganlar statistikasi emas. |
|`scholarships` sxema drifti | `amount_usd_value NOT NULL`, `min_ielts DEFAULT 6.5`, `eligible_majors DEFAULT ["All"]`, `degree_levels DEFAULT ["Master","PhD"]`, `deadline NOT NULL` | Har yangi qatorga tasdiqlanmagan qiymat tiqiladi. Reviewable migration `DROP NOT NULL`, defaultlarni `[]` yoki olib tashlashni taklif qiladi. |
| Keng qamrov | 356 universitet, barchasi `verified`; 352 `min_gpa`, 252 `min_sat`, 352 `acceptance_rate` | “Har bir raqam verified” degan da’vo dalilsiz. Har bir muhim qiymat alohida typed evidence record talab qiladi. |
| `sources` | 2 939 ta, 2 845 `is_official`, 2 901 `is_verified` | Bayroqlar yuqoriligi har bir qiymatning rasmiy yoki to‘g‘ri ekanini isbotlamaydi. |
| `refresh_jobs` | 4 ta; oxirgi manual scholarships job 2026-10-28: 735 processed / 452 changed | Bu mavjud sanalardan status hisoblash; rasmiy sahifani qayta o‘qish emas. |

## 6. Research Agent / refresh

- Jonli bazada durable `research_runs` / `research_run_items` jadvallari yo‘q; kod ilgari process-local `Map` va detached background task’ga tayangan.
- `refresh_jobs` da `mode`, `source_pages_read`, `verified_dates_updated`, `failed_verification` ustunlari yo‘q.
- Kod endi ikki rejimni ajratadi: `status_from_existing_dates` va `official_source_reverification`. Faqat muvaffaqiyatli, dalilli official re-read `last_verified_at` ni yangilaydi; failed check yangilamaydi.
- Research Agent uchun PostgreSQL-backed durable queue, checkpoint, timeout, cancellation, idempotency va har bir universitet natijasini saqlash tayyorlandi. `RESEARCH_DURABLE_STORE=1` bilan yoqiladi; default process-local xatti-harakat saqlanadi. Dry-run production DB’ga yozmaydi.
- Restart worker qo‘shildi: `lease_owner` / `lease_until` ustunlari bilan atomik claim, muddati o‘tgan run’larni `timed_out` qilish, heartbeat bilan lease yangilash, checkpoint + per-item `attempts` asosida faqat qolgan universitetlarni davom ettirish, retry budget tugaganda aniq `skipped` gap. Admin `POST /api/admin/research-agent/resume` uni chaqiradi; migration qo‘llanmaguncha va env flag yoqilmaguncha u `enabled:false` qaytaradi. Production cron scheduling alohida operatsion qaror.
- `npm run test:research-worker` 9/0; `npm run test:migration-dry-run` disposable PostgreSQL’da atomik lease claim va ikki worker race’ini tekshiradi (11/0). Bu production worker ishlagani emas.

## 7. Tasdiqlangan xato / taxmin / yangi taklif

- **Tasdiqlangan xato:** `password_reset_tokens` RLS o‘chirilgan + keng anon/authenticated grantlar; Yenching `$5,040`/IELTS/generic documents; MIT `3.91`/`1520`/`4.5`; QS 2026/2027 seed aralashuvi; sxema defaultlari; auth allow-list’da production domen yo‘qligi; `/features` public copy’dagi shaxsiy qabul ehtimoli da’volari.
- **Taxmin:** 2 845 ta `is_official` source bayrog‘i har bir qator uchun to‘g‘ri; 356 ta `verified` universitetning barcha raqamlari dalilli. Bu tasdiqlanmadi, shuning uchun blanket claim ishlatilmadi.
- **Yangi taklif / review-needed:** `catalogue_facts` typed evidence jadvali, 352/252/252 keng qamrovli akademik qiymatlarni alohida tekshirish, duplicate MIT MBA, `$5,040` kanal matni, generic hujjat shablonlari, “All countries / full funding / full tuition” da’volari, storage upload bucket’i va legacy kalit rotatsiyasi.

## 8. Qo‘llanmagan migratsiyalar va keyingi qadam

1. `supabase/official_source_corrections_2026-11-06.sql` — ikki katalog qatori, sxema drifti va ikkita rasmiy MIT source linki. **NOT APPLIED.**
2. `supabase/security_evidence_research_2026-11-06.sql` — RLS/grantlar, `catalogue_facts`, durable research queue, refresh mode ustunlari. **NOT APPLIED.**
3. Ikkala migration disposable PostgreSQL’da ikki marta qo‘llanib, idempotency, RLS, evidence facts va storage grantlari tekshirildi (`npm run test:migration-dry-run`, 10/0). Bu production natijasi emas.
4. Qo‘lda: production Render domenini Supabase Auth `site_url`/`uri_allow_list` ga qo‘shish; legacy kalit/secret rotatsiyasini ko‘rib chiqish; data owner ikki katalog qatorini tasdiqlash; migration’ni staging/disposable DB’da `BEGIN … ROLLBACK` bilan ko‘rib, alohida ruxsatdan keyin production’ga qo‘llash; `RESEARCH_DURABLE_STORE=1` ni faqat migration qo‘llangandan keyin yoqish.
5. Production deploy, production DB write, real to‘lov, Telegram/kanal xabari va real foydalanuvchi oqimi tekshiruvi bajarilmadi.
