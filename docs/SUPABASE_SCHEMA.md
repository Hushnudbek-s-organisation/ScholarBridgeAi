# Supabase schema — yagona aniq manba (single canonical schema)

**Nima bu (uz):** Bu hujjat Supabaseda aynan qanday ma'lumotlar turishi kerakligini
bitta joyda aniq qilib beradi. Ilovadan kerak bo'ladigan barcha jadval va ustunlar
`src/db/schema.ts` (Drizzle) da bitta manbada saqlanadi; `supabase/full_schema.sql`
esa shu manbadan avtomatik yaratilgan **bitta** tayyor schema fayli. Uni Supabase
SQL Editor'da bir marta ishga tushirsangiz, ilovaning BARCHA joylari aniq ishlaydi —
"bazi joylar to'g'ri kelmayapti" muammosi yo'qoladi.

## 1. Qanday ishlatish (3 qadam)

1. **Schema tayyorlash** — `supabase/full_schema.sql` ni Supabase Dashboard → SQL
   Editor → New query ga butunlay qo'ying va **Run** bosing.
   (Fayl xavfsiz: faqat qo'shadi, hech narsani o'chirmaydi, qayta ishlatish mumkin.)
   Yoki terminalda: `DATABASE_URL=postgresql://... npm run db:apply-full-schema`
2. **Tekshirish** — `DATABASE_URL=postgresql://... npm run db:verify`
   (Ilovaning kerak qiladigan har bir jadval/ustun haqiqiy bazada bormi — aniq
   ro'yxat chiqadi. Hammasi ✓ bo'lsa — "PASSED: Hammasi aniq ishlaydi".)
3. **schema.ts o'zgarganda** — `npm run db:gen:full-schema` (fayl qayta yaratiladi)
   va yana 1-qadamni takrorlang. Drift bo'lsa `npm run test:schema` yengilab turadi.

> Eski `supabase/add_*.sql` fayllari ham xavfsiz qoladi (hammasi `IF NOT EXISTS`),
> lekin endi ularni almashtirish uchun bitta `full_schema.sql` yetarli.

## 2. Qaysi joyda qanday ma'lumotlar turadi (feature → jadvallar)

Bu jadval "ilovaning shu bo'limi Supabasedan aynan qaysi jadval/ustunlarni
o'qiydi/yozadi" savoliga javob. Har bir qator haqiqiy API so'roviga mos.

| Ilova joyi (bo'lim) | Jadvalar | Qanday ma'lumot chiqadi / saqlanadi |
|---|---|---|
| **Profil / Autentifikatsiya** (kirish, onboarding) | `student_profiles` | Ism, email, **parol hashing** (hech qachon ochiq matn), GPA, Ielts/Toefl/SAT/GRE, byudjet, mamlakatlar, hujjatlar haqidagi to'liq profil (akademik, moliyaviy, sport, olimpiadalar), onboarding qadami, premium holati, parent-link |
| **Universitetlar sahifasi** (`/universities`) | `universities`, `university_rankings`, `university_sources` | Nomi, mamlakat, shahar, reyting (QS/THE yil-bosma), har bir kurs haqiqiy puli (summa + valyuta + davr), kirish talablari (min GPA/IELTS), rahbariyat, ofitsial saytlar, manba + so'nggi tekshiruv vaqti |
| **Universitet ichida dasturlar** (programmasi) | `programs`, `program_requirements`, `application_cycles`, `program_sources` | Har bir universitetning dasturlari (yo'nalish, daraja, davomiyligi, puli, til), dastur uchun aniq talablar (IELTS/TOEFL/DET/GPA, portfolio, intervyu), hujjat topshirish muddatlari (Fall/Spring, round) |
| **Stipendiya markazi** (`/scholarships`) | `scholarships`, `scholarship_sources`, `scholarship_decisions` | Stipendiya nomi, beruvchi, qamrov turi, summa (valyuta + davr bilan), muddat, talab GPA/IELTS, qaysi mamlakatlar/darajalar, hujjatlar ro'yxati, manba + holat |
| **Meni saqlaganlar** (shortlist) | `saved_universities`, `saved_programs`, `saved_scholarships` | Talaba qaysi universitet/dastur/stipendiyani saqladi, match balli, status, izoh |
| **Ariza markazi** | `applications`, `application_outcomes`, `application_documents`, `application_requirements`, `application_document_links` | Har bir ariza (universitet, dastur, round, muddat, status, portali), natija (accept/reject/waitlist — chancing uchun o'rgansh ma'lumotlari), hujjat checklists, talablar checklist (manba bilan) |
| **Hujjatlar ombori** (vault) | `user_documents` | Bir marta yuklangan hujjat (pasport, transkript, IELTS...), muddati, statusi — barcha arizalardan takror ishlatiladi |
| **Forum** | `forum_categories`, `forum_threads`, `forum_replies`, `forum_likes`, `forum_reports` | Kategoriyalar, mavzular, javoblar (teskari darajalash), layklar, shikoyatlar (moderatsiya) |
| **Kurslar / video darslar** | `courses`, `course_categories`, `course_modules`, `lessons`, `lesson_progress`, `quizzes`, `quiz_questions`, `quiz_attempts`, `certificates`, `instructors`, `course_enrollments` | Kurslar (sarlavha, daraja, muallim), modul → dars → video + davomiyligi, talabaning qarash progressi, testlar (savol/javob/ball), sertifikat (kod bilan) |
| **To'lovlar (Payme/Click) va obuna** | `payments`, `subscriptions` | Har bir to'lov (provayder, tranzaksiya ID, summa, maqsad, status), obuna (reja, davr) |
| **O'yinlashtirish** | `user_points`, `points_ledger`, `levels`, `badges`, `user_badges`, `referrals` | Ochko'lar (qaysi ismdan, nechta), darajalar, belgilar, havolalar |
| **AI** (chat, SOP, chancing) | `ai_evaluations`, `ai_usage`, `ai_provider_credentials` | AI javoblar, har so'rov uchun token/harajat (limit uchun), admin panelga qo'yilgan API kalitlar (shifrlangan) |
| **Bilim yo'li (Journey)** | `study_plans`, `study_plan_phases`, `test_plans`, `test_attempts`, `test_tasks`, `student_activities`, `activity_evidence`, `recommendation_requests`, `admission_offers`, `funding_items`, `journey_deadlines` | O'qish rejasi (10 bosqich), testlar rejasi (hozirgi/nishan balli, harakatlar), faoliyat portfoli (dalillar bilan), tavsiyanoma so'rovlar, offerlar, moliya rejasi, barcha muddatlar bitta taxtada |
| **Mentorlar** | `mentors`, `mentor_requests` | Mentorlar (qaysi universitet/mamlakat, taklif qilinadigan stipendiya, narx), uchrashuv so'rovlar |
| **SOP / esselar** | `essay_versions`, `essay_reviews` | Har bir versiya (matn, so'zlar soni, rubrik balli, AI fikri), sinfdoshlar ko'rib chiqishi |
| **Muvaffaqiyat hikoyalari** | `success_stories` | Kirib olingan talabalar (kim, qayerga, GPA/Ielts, stipendiya), admin moderatsiya |
| **Maqsadlar / savollar bazasi** | `goal_templates`, `student_goals`, `answer_prompts`, `answer_vault` | Admin maqsad shablonlari, talabaning o'z maqsadlari (bosqichlar), umumiy savollar + talabaning bir marta yozgan javoblari |
| **So'nggi cheklist (so'nggi bosqichlar)** | `checklist_items`, `student_checklist` | "Offerdan keyin" qadamlar (viza, pul, turar joy, safar, kelish) |
| **E'lonlar / xabarlar** | `notifications`, `notification_preferences` | Muddat yaqinlashdi, ariza ochildi... xabarlari + sozlamalar |
| **Imtiyozlar (o'sish)** | `opportunities` | Tanlovlar, tadqiqotlar, amaliyot, yozgi maktablar (admin boshqaradi) |
| **Biznes / admin** | `app_config`, `audit_logs`, `refresh_jobs`, `consulting_requests`, `visa_requirements`, `learning_providers`, `learning_provider_links`, `learning_provider_scores`, `platform_ownership`, `ownership_transfers`, `site_visits` | Ilova sozlamalari (narxlar, limitlar), o'zgarish tarixi, yangilash ishlari, maslahat so'rovlar, viza talablari (mamlakat × tur), tashqi test-provayderlari, platforma egasi, analitika |
| **Telegram bot** | `telegram_links`, `telegram_login_requests`, `telegram_messages`, `telegram_updates` | Talabaning Telegram'ga ulanishi, kirish kodlar (hash bilan), xabarlar tarixi, takror so'rovlarni filtrlash |

## 3. Qoidalar (nima uchun aynan shunday)

1. **Noma'lum = NULL.** Hech qachon 0 yoki o'ycha matn bo'lmaydi. Masalan,
   universitet puli ma'lum bo'lmasa `annual_tuition` NULL qoladi — ilova
   "Ma'lum emas" deb ko'rsatadi, 0$ deb yozmaydi.
2. **Pul = summa + valyuta + davr** (`*_amount`, `*_currency`, `*_period`).
   Eski `*_usd` ustunlari saqlanadi, lekin haqiqiy manba yangi uchtasidir.
3. **Manba birinchi darajali.** Har bir fakt `sources` jadvaliga ulanadi
   (`university_sources`, `program_sources`, `scholarship_sources`); har bir
   jadvalda `source_url` + `last_verified_at` + `verification_status` bor.
   AI hech qachon manbasiz fakt o'ylab topmaydi.
4. **Birlashtirish (identifikator):** universitet — `canonical_name`
   (kichik harf + bo'shliqlarsiz), dastur — `(university_id, name, degree_level)`,
   reyting — `(university_id, provider, name, year)`, saqlangan —
   `(profile_id, target_id)`. Takrorlar bazada imkoni yo'q.
5. **O'chirish:** talaba o'chsa — uning barcha qatorlari cascade o'chadi;
   katalog (universitet) o'chsa — bog'liq saqlanganlar o'chadi, lekin mustaqil
   qoladigan faktlar `SET NULL` bilan saqlanadi.

## 4. Barcha jadval va ustunlar (to'liq ro'yxat)

Quyidagi ro'yxat `src/db/schema.ts` dan avtomatik yaratilgan (91 jadval).
Har bir ustun — ilova aniq so'raydigan ustun.

### `activity_evidence`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `activity_id` | integer |  | — | FK → student_activities(id) on delete cascade |
| `evidence_type` | text |  | — |  |
| `label` | text |  | — |  |
| `url` | text | yes | — |  |
| `document_id` | integer | yes | — | FK → user_documents(id) on delete set null |
| `created_at` | timestamp |  | yes |  |

### `admission_offers`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `application_id` | integer |  | — | FK → applications(id) on delete cascade |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `status` | text |  | yes |  |
| `decided_at` | date | yes | — |  |
| `response_deadline` | date | yes | — |  |
| `offer_letter_url` | text | yes | — |  |
| `offer_letter_name` | text | yes | — |  |
| `conditions` | text | yes | — |  |
| `deposit_amount` | integer | yes | — |  |
| `deposit_due_date` | date | yes | — |  |
| `tuition_commitment` | integer | yes | — |  |
| `notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `ai_evaluations`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `evaluation_type` | text |  | yes |  |
| `content` | text |  | — |  |
| `created_at` | timestamp |  | yes |  |

### `ai_provider_credentials`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `provider` | text |  | — | unique |
| `api_key_enc` | text | yes | — |  |
| `model` | text | yes | — |  |
| `updated_at` | timestamp |  | yes |  |

### `ai_usage`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `task_type` | text |  | — |  |
| `provider` | text |  | — |  |
| `model` | text |  | — |  |
| `prompt_tokens` | integer |  | yes |  |
| `completion_tokens` | integer |  | yes |  |
| `cost_estimate` | double precision |  | yes |  |
| `status` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `answer_prompts`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `category` | text |  | yes |  |
| `question` | text |  | — |  |
| `hint` | text |  | yes |  |
| `word_limit` | integer | yes | — |  |
| `is_active` | boolean |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `answer_vault`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `prompt_id` | integer |  | — | FK → answer_prompts(id) on delete cascade |
| `answer` | text |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `app_config`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `key` | text |  | — | unique |
| `value` | text |  | — |  |
| `description` | text | yes | — |  |
| `updated_at` | timestamp |  | yes |  |

### `application_cycles`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `university_id` | integer |  | — | FK → universities(id) on delete cascade |
| `program_id` | integer | yes | — |  |
| `academic_year` | text | yes | — |  |
| `intake` | text | yes | — |  |
| `application_type` | text | yes | — |  |
| `opening_date` | date | yes | — |  |
| `deadline` | date | yes | — |  |
| `deadline_timezone` | text | yes | — |  |
| `application_fee` | numeric | yes | — |  |
| `application_fee_currency` | text |  | yes |  |
| `application_url` | text | yes | — |  |
| `source_url` | text | yes | — |  |
| `source_id` | integer | yes | — | FK → sources(id) on delete set null |
| `last_verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |

### `application_document_links`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `application_id` | integer |  | — | FK → applications(id) on delete cascade |
| `document_id` | integer |  | — | FK → user_documents(id) on delete cascade |
| `usage` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `application_documents`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `entity_type` | text |  | — |  |
| `entity_id` | integer | yes | — |  |
| `document_type` | text |  | — |  |
| `label` | text |  | — |  |
| `is_required` | boolean |  | yes |  |
| `status` | text |  | yes |  |
| `file_url` | text | yes | — |  |
| `deadline_date` | date | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |
| `expires_at` | date | yes | — |  |
| `file_name` | text | yes | — |  |
| `file_size_bytes` | integer | yes | — |  |
| `uploaded_at` | timestamp | yes | — |  |

### `application_outcomes`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `application_id` | integer |  | — | FK → applications(id) on delete cascade |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `university_id` | integer | yes | — | FK → universities(id) on delete set null |
| `result` | text |  | — |  |
| `decided_at` | date | yes | — |  |
| `scholarship_amount_usd` | integer | yes | — |  |
| `scholarship_name` | text | yes | — |  |
| `notes` | text | yes | — |  |
| `snapshot_gpa` | double precision | yes | — |  |
| `snapshot_gpa_scale` | double precision | yes | — |  |
| `snapshot_ielts` | double precision | yes | — |  |
| `snapshot_toefl` | integer | yes | — |  |
| `snapshot_sat` | integer | yes | — |  |
| `snapshot_act` | integer | yes | — |  |
| `snapshot_major` | text | yes | — |  |
| `snapshot_country` | text | yes | — |  |
| `snapshot_extracurriculars` | text | yes | — |  |
| `share_consent` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `application_requirements`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `application_id` | integer |  | — | FK → applications(id) on delete cascade |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `section` | text |  | — |  |
| `item_key` | text |  | — |  |
| `title` | text |  | — |  |
| `instructions` | text | yes | — |  |
| `is_required` | boolean |  | yes |  |
| `status` | text |  | yes |  |
| `due_date` | date | yes | — |  |
| `source_url` | text | yes | — |  |
| `source_name` | text | yes | — |  |
| `source_type` | text | yes | — |  |
| `last_verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |
| `linked_type` | text | yes | — |  |
| `linked_id` | integer | yes | — |  |
| `completed_at` | timestamp | yes | — |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `application_tasks`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `university_id` | integer | yes | — | FK → universities(id) on delete set null |
| `title` | text |  | — |  |
| `category` | text |  | yes |  |
| `due_date` | text |  | — |  |
| `is_completed` | boolean |  | yes |  |
| `priority` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `applications`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `university_id` | integer | yes | — | FK → universities(id) on delete set null |
| `university_name` | text |  | yes |  |
| `program_name` | text | yes | — |  |
| `application_round` | text | yes | — |  |
| `intake_term` | text | yes | — |  |
| `deadline` | date | yes | — |  |
| `status` | text |  | yes |  |
| `submitted_at` | timestamp | yes | — |  |
| `application_fee_paid` | boolean |  | yes |  |
| `fee_amount` | integer | yes | — |  |
| `portal_url` | text | yes | — |  |
| `notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `audit_logs`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `entity_type` | text |  | — |  |
| `entity_id` | integer |  | — |  |
| `field_changed` | text |  | — |  |
| `old_value` | text | yes | — |  |
| `new_value` | text | yes | — |  |
| `source` | text | yes | — |  |
| `actor` | text |  | yes |  |
| `verification_status` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `badges`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `description` | text |  | yes |  |
| `icon_url` | text |  | yes |  |
| `criteria` | text |  | yes |  |

### `certificates`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `course_id` | integer |  | — | FK → courses(id) on delete cascade |
| `certificate_code` | text |  | — | unique |
| `issued_at` | timestamp |  | yes |  |

### `checklist_items`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `phase` | text |  | yes |  |
| `title` | text |  | — |  |
| `description` | text |  | yes |  |
| `link_tab` | text | yes | — |  |
| `is_active` | boolean |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `consulting_requests`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `topic` | text |  | — |  |
| `message` | text |  | yes |  |
| `preferred_contact` | text |  | yes |  |
| `status` | text |  | yes |  |
| `admin_notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `course_categories`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `slug` | text |  | — | unique |
| `description` | text |  | yes |  |
| `sort_order` | integer |  | yes |  |

### `course_enrollments`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `course_id` | integer |  | — | FK → courses(id) on delete cascade |
| `progress_pct` | integer |  | yes |  |
| `is_completed` | boolean |  | yes |  |
| `completed_at` | timestamp | yes | — |  |
| `enrolled_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `course_modules`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `course_id` | integer |  | — | FK → courses(id) on delete cascade |
| `title` | text |  | — |  |
| `description` | text |  | yes |  |
| `sort_order` | integer |  | yes |  |

### `courses`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `title` | text |  | — |  |
| `description` | text |  | — |  |
| `instructor_name` | text |  | yes |  |
| `level` | text |  | yes |  |
| `thumbnail_url` | text |  | yes |  |
| `is_published` | boolean |  | yes |  |
| `category_id` | integer | yes | — | FK → course_categories(id) on delete set null |
| `instructor_id` | integer | yes | — | FK → instructors(id) on delete set null |
| `student_experience` | text |  | yes |  |
| `duration_total_seconds` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `essay_reviews`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `essay_version_id` | integer |  | — | FK → essay_versions(id) on delete cascade |
| `author_profile_id` | integer |  | — |  |
| `reviewer_profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `hook` | integer | yes | — |  |
| `structure` | integer | yes | — |  |
| `specificity` | integer | yes | — |  |
| `language` | integer | yes | — |  |
| `fit` | integer | yes | — |  |
| `total` | integer | yes | — |  |
| `comment` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `essay_versions`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `university_id` | integer | yes | — | FK → universities(id) on delete set null |
| `essay_type` | text |  | yes |  |
| `title` | text |  | yes |  |
| `content` | text |  | yes |  |
| `word_count` | integer |  | yes |  |
| `char_count` | integer |  | yes |  |
| `version_number` | integer |  | yes |  |
| `rubric_hook` | integer | yes | — |  |
| `rubric_structure` | integer | yes | — |  |
| `rubric_specificity` | integer | yes | — |  |
| `rubric_language` | integer | yes | — |  |
| `rubric_fit` | integer | yes | — |  |
| `rubric_total` | integer | yes | — |  |
| `ai_feedback` | text | yes | — |  |
| `open_for_review` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `forum_categories`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `slug` | text |  | — | unique |
| `description` | text |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `forum_likes`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `user_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `target_type` | text |  | — |  |
| `target_id` | integer |  | — |  |
| `created_at` | timestamp |  | yes |  |

### `forum_replies`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `thread_id` | integer |  | — | FK → forum_threads(id) on delete cascade |
| `author_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `parent_reply_id` | integer | yes | — | FK → forum_replies(id) on delete cascade |
| `body` | text |  | — |  |
| `created_at` | timestamp |  | yes |  |

### `forum_reports`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `reporter_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `target_type` | text |  | — |  |
| `target_id` | integer |  | — |  |
| `reason` | text |  | — |  |
| `status` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `resolved_at` | timestamp | yes | — |  |

### `forum_threads`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `category_id` | integer |  | — | FK → forum_categories(id) on delete cascade |
| `author_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `title` | text |  | — |  |
| `body` | text |  | — |  |
| `is_pinned` | boolean |  | yes |  |
| `is_locked` | boolean |  | yes |  |
| `view_count` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `funding_items`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `application_id` | integer | yes | — | FK → applications(id) on delete cascade |
| `kind` | text |  | — |  |
| `name` | text |  | — |  |
| `amount_usd` | integer |  | yes |  |
| `covers` | text |  | yes |  |
| `status` | text |  | yes |  |
| `confirmed_at` | date | yes | — |  |
| `notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `goal_templates`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `pillar` | text |  | yes |  |
| `title` | text |  | — |  |
| `description` | text |  | yes |  |
| `steps` | text |  | yes |  |
| `level` | text |  | yes |  |
| `est_weeks` | integer | yes | — |  |
| `is_active` | boolean |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `instructors`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `bio` | text |  | yes |  |
| `photo_url` | text | yes | — |  |
| `university` | text | yes | — |  |
| `program` | text | yes | — |  |
| `country` | text | yes | — |  |
| `scholarship_name` | text | yes | — |  |
| `is_verified_student` | boolean |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `journey_deadlines`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `kind` | text |  | — |  |
| `title` | text |  | — |  |
| `due_date` | date |  | — |  |
| `entity_type` | text | yes | — |  |
| `entity_id` | integer | yes | — |  |
| `is_auto_generated` | boolean |  | yes |  |
| `is_completed` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `learning_provider_links`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `provider_id` | integer |  | — | FK → learning_providers(id) on delete cascade |
| `external_user_ref` | text | yes | — |  |
| `status` | text |  | yes |  |
| `consent_at` | timestamp | yes | — |  |
| `last_synced_at` | timestamp | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `learning_provider_scores`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `link_id` | integer |  | — | FK → learning_provider_links(id) on delete cascade |
| `metric` | text |  | — |  |
| `value` | double precision | yes | — |  |
| `measured_at` | date | yes | — |  |
| `created_at` | timestamp |  | yes |  |

### `learning_providers`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `provider_key` | text |  | — | unique |
| `name` | text |  | — |  |
| `kind` | text |  | yes |  |
| `status` | text |  | yes |  |
| `config` | text |  | yes |  |
| `is_enabled` | boolean |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `lesson_progress`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `lesson_id` | integer |  | — | FK → lessons(id) on delete cascade |
| `watched_seconds` | integer |  | yes |  |
| `is_completed` | boolean |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `lessons`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `module_id` | integer |  | — | FK → course_modules(id) on delete cascade |
| `title` | text |  | — |  |
| `video_url` | text |  | — |  |
| `duration_seconds` | integer |  | yes |  |
| `content` | text |  | yes |  |
| `sort_order` | integer |  | yes |  |

### `levels`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `min_points` | integer |  | yes |  |
| `icon_url` | text |  | yes |  |

### `mentor_requests`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `mentor_id` | integer |  | — | FK → mentors(id) on delete cascade |
| `topic` | text |  | — |  |
| `message` | text |  | yes |  |
| `status` | text |  | yes |  |
| `scheduled_at` | timestamp | yes | — |  |
| `created_at` | timestamp |  | yes |  |

### `mentors`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `display_name` | text |  | — |  |
| `headline` | text |  | yes |  |
| `bio` | text |  | yes |  |
| `photo_url` | text | yes | — |  |
| `country` | text | yes | — |  |
| `city` | text | yes | — |  |
| `university` | text | yes | — |  |
| `program` | text | yes | — |  |
| `degree_level` | text | yes | — |  |
| `scholarship_name` | text | yes | — |  |
| `expertise` | text |  | yes |  |
| `languages` | text |  | yes |  |
| `hourly_rate_usd` | integer | yes | — |  |
| `free_sessions` | boolean |  | yes |  |
| `is_verified` | boolean |  | yes |  |
| `verification_note` | text | yes | — |  |
| `is_active` | boolean |  | yes |  |
| `rating_average` | double precision | yes | — |  |
| `rating_count` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `notification_preferences`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | unique, FK → student_profiles(id) on delete cascade |
| `in_app` | boolean |  | yes |  |
| `email` | boolean |  | yes |  |
| `push` | boolean |  | yes |  |
| `types` | text |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `notifications`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `type` | text |  | — |  |
| `title` | text |  | — |  |
| `body` | text |  | — |  |
| `link` | text | yes | — |  |
| `is_read` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `opportunities`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `type` | text |  | yes |  |
| `title` | text |  | — |  |
| `provider` | text |  | yes |  |
| `country` | text | yes | — |  |
| `fields` | text |  | yes |  |
| `level` | text |  | yes |  |
| `deadline_date` | date | yes | — |  |
| `url` | text |  | yes |  |
| `description` | text |  | yes |  |
| `is_verified` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `ownership_transfers`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `from_profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `to_profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `status` | text |  | yes |  |
| `retain_previous_admin` | boolean |  | yes |  |
| `note` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `expires_at` | timestamp |  | — |  |
| `accepted_at` | timestamp | yes | — |  |
| `decided_at` | timestamp | yes | — |  |
| `decided_by` | integer | yes | — | FK → student_profiles(id) on delete set null |

### `payments`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `provider` | text |  | — |  |
| `provider_transaction_id` | text |  | yes |  |
| `amount` | double precision |  | — |  |
| `currency` | text |  | yes |  |
| `status` | text |  | yes |  |
| `purpose` | text |  | yes |  |
| `related_entity_id` | integer | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `platform_ownership`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | integer |  | yes | PK |
| `owner_profile_id` | integer |  | — | FK → student_profiles(id) on delete restrict |
| `source` | text |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `points_ledger`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `points` | integer |  | — |  |
| `reason` | text |  | — |  |
| `related_entity_id` | integer | yes | — |  |
| `created_at` | timestamp |  | yes |  |

### `program_requirements`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `program_id` | integer |  | — | FK → programs(id) on delete cascade |
| `min_ielts` | double precision | yes | — |  |
| `min_toefl` | double precision | yes | — |  |
| `min_det` | double precision | yes | — |  |
| `min_sat` | integer | yes | — |  |
| `min_act` | integer | yes | — |  |
| `min_gpa` | double precision | yes | — |  |
| `ib_requirement` | text | yes | — |  |
| `a_level_requirement` | text | yes | — |  |
| `ap_requirement` | text | yes | — |  |
| `subject_requirements` | text | yes | — |  |
| `portfolio_required` | boolean |  | yes |  |
| `interview_required` | boolean |  | yes |  |
| `recommendation_required` | boolean |  | yes |  |
| `personal_statement_required` | boolean |  | yes |  |
| `other_requirements` | text | yes | — |  |
| `academic_year` | text | yes | — |  |
| `source_url` | text | yes | — |  |
| `last_verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |

### `program_sources`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `program_id` | integer |  | — | FK → programs(id) on delete cascade |
| `source_id` | integer | yes | — | FK → sources(id) on delete set null |
| `source_type` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `quiz_attempts`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `quiz_id` | integer |  | — | FK → quizzes(id) on delete cascade |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `score` | integer |  | yes |  |
| `answers` | text |  | yes |  |
| `passed` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `quiz_questions`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `quiz_id` | integer |  | — | FK → quizzes(id) on delete cascade |
| `question` | text |  | — |  |
| `options` | text |  | yes |  |
| `correct_option_index` | integer |  | yes |  |
| `sort_order` | integer |  | yes |  |

### `quizzes`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `lesson_id` | integer |  | — | FK → lessons(id) on delete cascade |
| `title` | text |  | yes |  |
| `pass_threshold` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `recommendation_requests`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `application_id` | integer |  | — | FK → applications(id) on delete cascade |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `recommender_name` | text |  | — |  |
| `recommender_email` | text | yes | — |  |
| `relationship` | text | yes | — |  |
| `status` | text |  | yes |  |
| `requested_at` | timestamp | yes | — |  |
| `submitted_at` | timestamp | yes | — |  |
| `due_date` | date | yes | — |  |
| `instructions` | text | yes | — |  |
| `is_private` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `referrals`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `referrer_profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `referred_profile_id` | integer | yes | — | FK → student_profiles(id) on delete cascade |
| `referral_code` | text |  | — | unique |
| `status` | text |  | yes |  |
| `points_awarded` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `refresh_jobs`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `job_type` | text |  | — |  |
| `status` | text |  | yes |  |
| `trigger` | text |  | yes |  |
| `items_processed` | integer |  | yes |  |
| `items_changed` | integer |  | yes |  |
| `error` | text | yes | — |  |
| `started_at` | timestamp | yes | — |  |
| `finished_at` | timestamp | yes | — |  |
| `created_at` | timestamp |  | yes |  |

### `requirement_templates`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `university_id` | integer | yes | — | FK → universities(id) on delete cascade |
| `program_id` | integer | yes | — | FK → programs(id) on delete cascade |
| `section` | text |  | — |  |
| `item_key` | text |  | — |  |
| `title` | text |  | — |  |
| `instructions` | text | yes | — |  |
| `is_required` | boolean |  | yes |  |
| `source_url` | text | yes | — |  |
| `source_name` | text | yes | — |  |
| `source_type` | text | yes | — |  |
| `last_verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `saved_programs`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `program_id` | integer |  | — | FK → programs(id) on delete cascade |
| `created_at` | timestamp |  | yes |  |

### `saved_scholarships`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `scholarship_id` | integer |  | — | FK → scholarships(id) on delete cascade |
| `status` | text |  | yes |  |
| `notes` | text | yes | yes |  |
| `created_at` | timestamp |  | yes |  |

### `saved_universities`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `university_id` | integer |  | — | FK → universities(id) on delete cascade |
| `match_category` | text |  | yes |  |
| `match_score` | integer |  | yes |  |
| `status` | text |  | yes |  |
| `notes` | text | yes | yes |  |
| `created_at` | timestamp |  | yes |  |

### `scholarship_decisions`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `scholarship_id` | integer |  | — | FK → scholarships(id) on delete cascade |
| `status` | text |  | — |  |
| `created_at` | timestamp |  | yes |  |

### `scholarship_sources`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `scholarship_id` | integer |  | — | FK → scholarships(id) on delete cascade |
| `source_id` | integer | yes | — | FK → sources(id) on delete set null |
| `source_type` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `scholarships`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `title` | text |  | — |  |
| `provider` | text |  | — |  |
| `country` | text |  | — |  |
| `coverage_type` | text |  | yes |  |
| `amount_usd_value` | integer | yes | — |  |
| `award_amount` | numeric | yes | — |  |
| `award_currency` | text | yes | — |  |
| `award_period` | text | yes | — |  |
| `award_basis` | text | yes | — |  |
| `deadline` | text | yes | — |  |
| `degree_levels` | text |  | yes |  |
| `eligible_majors` | text |  | yes |  |
| `min_gpa` | double precision | yes | — |  |
| `min_ielts` | double precision | yes | — |  |
| `financial_need_based` | boolean | yes | yes |  |
| `merit_based` | boolean | yes | yes |  |
| `description` | text |  | — |  |
| `requirements` | text |  | — |  |
| `website_url` | text |  | — |  |
| `university_id` | integer | yes | — | FK → universities(id) on delete set null |
| `eligible_countries` | text | yes | yes |  |
| `funding_type` | text | yes | yes |  |
| `tuition_coverage` | text | yes | yes |  |
| `living_allowance` | integer | yes | — |  |
| `travel_allowance` | integer | yes | — |  |
| `accommodation` | text | yes | yes |  |
| `application_fee` | integer | yes | — |  |
| `english_requirements` | text | yes | yes |  |
| `required_documents` | text | yes | yes |  |
| `application_url` | text | yes | — |  |
| `opening_date` | date | yes | — |  |
| `deadline_date` | date | yes | — |  |
| `deadline_type` | text |  | yes |  |
| `deadline_range_start` | date | yes | — |  |
| `deadline_range_end` | date | yes | — |  |
| `rounds` | text | yes | yes |  |
| `recurrence` | text |  | yes |  |
| `expected_opening_period` | text | yes | — |  |
| `expected_deadline_period` | text | yes | — |  |
| `application_status` | text |  | yes |  |
| `last_verified_at` | timestamp | yes | — |  |
| `last_updated_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |
| `source_reliability` | integer |  | yes |  |
| `source_url` | text | yes | — |  |
| `notes` | text | yes | — |  |
| `is_active` | boolean |  | yes |  |

### `site_visits`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `visitor_id` | text |  | yes |  |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `event_type` | text |  | yes |  |
| `path` | text |  | yes |  |
| `screen` | text | yes | — |  |
| `referrer` | text | yes | — |  |
| `user_agent` | text | yes | — |  |
| `device` | text |  | yes |  |
| `locale` | text | yes | — |  |
| `country` | text | yes | — |  |
| `is_first_visit` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `sources`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `url` | text |  | — |  |
| `title` | text |  | — |  |
| `domain` | text | yes | — |  |
| `source_type` | text |  | yes |  |
| `accessed_at` | timestamp | yes | — |  |
| `is_official` | boolean |  | yes |  |
| `is_verified` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `student_activities`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `category` | text |  | — |  |
| `title` | text |  | — |  |
| `role` | text | yes | — |  |
| `organization` | text | yes | — |  |
| `start_date` | date | yes | — |  |
| `end_date` | date | yes | — |  |
| `hours` | integer | yes | — |  |
| `description` | text | yes | — |  |
| `achievements` | text | yes | — |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `student_checklist`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `item_id` | integer |  | — | FK → checklist_items(id) on delete cascade |
| `done_at` | timestamp |  | yes |  |

### `student_goals`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `template_id` | integer | yes | — | FK → goal_templates(id) on delete set null |
| `pillar` | text |  | yes |  |
| `title` | text |  | — |  |
| `steps` | text |  | yes |  |
| `status` | text |  | yes |  |
| `target_date` | date | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `student_profiles`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `email` | text |  | — | unique |
| `password_hash` | text | yes | — |  |
| `degree_level` | text |  | yes |  |
| `target_major` | text |  | yes |  |
| `gpa` | double precision |  | yes |  |
| `gpa_scale` | double precision |  | yes |  |
| `ielts_score` | double precision | yes | yes |  |
| `toefl_score` | integer | yes | yes |  |
| `sat_score` | integer | yes | yes |  |
| `gre_score` | integer | yes | yes |  |
| `budget_annual_usd` | integer |  | yes |  |
| `preferred_countries` | text |  | yes |  |
| `need_scholarship` | boolean |  | yes |  |
| `extracurriculars` | text | yes | yes |  |
| `work_experience_years` | integer | yes | yes |  |
| `research_publications` | integer | yes | yes |  |
| `preferred_locale` | text |  | yes |  |
| `is_admin` | boolean |  | yes |  |
| `referral_code` | text | yes | — | unique |
| `referred_by` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `referral_points` | integer |  | yes |  |
| `referral_rewarded` | boolean |  | yes |  |
| `is_premium` | boolean |  | yes |  |
| `premium_until` | timestamp | yes | — |  |
| `parent_share_enabled` | boolean |  | yes |  |
| `parent_share_email` | text | yes | — |  |
| `parent_share_token` | text | yes | — |  |
| `parent_share_created_at` | timestamp | yes | — |  |
| `act_score` | integer | yes | — |  |
| `duolingo_score` | integer | yes | — |  |
| `ap_courses` | text | yes | — |  |
| `ib_courses` | text | yes | — |  |
| `a_level_subjects` | text | yes | — |  |
| `coursework_notes` | text | yes | — |  |
| `country` | text | yes | — |  |
| `age` | integer | yes | — |  |
| `graduation_year` | integer | yes | — |  |
| `family_income_usd` | integer | yes | — |  |
| `needs_financial_aid` | boolean | yes | — |  |
| `requires_full_scholarship` | boolean | yes | — |  |
| `leadership` | text | yes | — |  |
| `volunteering` | text | yes | — |  |
| `sports` | text | yes | — |  |
| `clubs` | text | yes | — |  |
| `research_experience` | text | yes | — |  |
| `projects` | text | yes | — |  |
| `olympiads` | text | yes | — |  |
| `awards` | text | yes | — |  |
| `competitions` | text | yes | — |  |
| `certificates` | text | yes | — |  |
| `target_universities` | text | yes | — |  |
| `career_goal` | text | yes | — |  |
| `data_share_consent` | boolean |  | yes |  |
| `data_share_consent_at` | timestamp | yes | — |  |
| `onboarding_step` | integer |  | yes |  |
| `onboarding_completed` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `study_plan_phases`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `plan_id` | integer |  | — | FK → study_plans(id) on delete cascade |
| `phase_key` | text |  | — |  |
| `title` | text |  | — |  |
| `description` | text |  | yes |  |
| `status` | text |  | yes |  |
| `started_at` | timestamp | yes | — |  |
| `completed_at` | timestamp | yes | — |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `study_plans`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `title` | text |  | — |  |
| `target_major` | text | yes | — |  |
| `target_country` | text | yes | — |  |
| `degree_level` | text | yes | — |  |
| `intake_term` | text | yes | — |  |
| `goal_year` | integer | yes | — |  |
| `funding_goal` | text | yes | — |  |
| `status` | text |  | yes |  |
| `is_active` | boolean |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `subscriptions`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `plan` | text |  | yes |  |
| `status` | text |  | yes |  |
| `current_period_end` | timestamp |  | — |  |
| `payment_id` | integer | yes | — | FK → payments(id) on delete set null |
| `created_at` | timestamp |  | yes |  |

### `success_stories`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `display_name` | text |  | yes |  |
| `home_country` | text | yes | — |  |
| `admitted_university` | text |  | — |  |
| `admitted_country` | text | yes | — |  |
| `other_admits` | text |  | yes |  |
| `degree_level` | text | yes | — |  |
| `major` | text | yes | — |  |
| `intake_year` | integer | yes | — |  |
| `gpa` | double precision | yes | — |  |
| `gpa_scale` | double precision | yes | — |  |
| `ielts` | double precision | yes | — |  |
| `toefl` | integer | yes | — |  |
| `sat` | integer | yes | — |  |
| `activities` | text |  | yes |  |
| `awards` | text |  | yes |  |
| `essay_title` | text | yes | — |  |
| `essay_excerpt` | text | yes | — |  |
| `advice` | text | yes | — |  |
| `scholarship_name` | text | yes | — |  |
| `scholarship_amount_usd` | integer | yes | — |  |
| `status` | text |  | yes |  |
| `is_verified` | boolean |  | yes |  |
| `is_featured` | boolean |  | yes |  |
| `admin_note` | text | yes | — |  |
| `views` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `telegram_links`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | unique, FK → student_profiles(id) on delete cascade |
| `telegram_user_id` | text |  | — | unique |
| `chat_id` | text |  | — |  |
| `username` | text | yes | — |  |
| `first_name` | text | yes | — |  |
| `language_code` | text | yes | — |  |
| `notify_enabled` | boolean |  | yes |  |
| `muted_types` | text |  | yes |  |
| `blocked` | boolean |  | yes |  |
| `linked_at` | timestamp |  | yes |  |
| `last_login_at` | timestamp | yes | — |  |
| `last_message_at` | timestamp | yes | — |  |
| `last_query` | text | yes | — |  |
| `reminder_days` | text | yes | — |  |

### `telegram_login_requests`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `start_token` | text |  | — | unique |
| `nonce_hash` | text |  | — |  |
| `purpose` | text |  | yes |  |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete cascade |
| `status` | text |  | yes |  |
| `fail_reason` | text | yes | — |  |
| `telegram_user_id` | text | yes | — |  |
| `chat_id` | text | yes | — |  |
| `username` | text | yes | — |  |
| `first_name` | text | yes | — |  |
| `last_name` | text | yes | — |  |
| `language_code` | text | yes | — |  |
| `code_hash` | text | yes | — |  |
| `code_expires_at` | timestamp | yes | — |  |
| `codes_sent` | integer |  | yes |  |
| `attempts` | integer |  | yes |  |
| `ip` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `expires_at` | timestamp |  | — |  |

### `telegram_messages`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer | yes | — | FK → student_profiles(id) on delete set null |
| `chat_id` | text | yes | — |  |
| `kind` | text |  | — |  |
| `type` | text | yes | — |  |
| `preview` | text | yes | — |  |
| `status` | text |  | — |  |
| `error` | text | yes | — |  |
| `retry_payload` | text | yes | — |  |
| `attempts` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `telegram_updates`

| column | type | null | default | notes |
|---|---|---|---|---|
| `update_id` | bigint |  | — | PK |
| `received_at` | timestamp |  | yes |  |

### `test_attempts`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `test_plan_id` | integer |  | — | FK → test_plans(id) on delete cascade |
| `test_date` | date |  | — |  |
| `score` | double precision | yes | — |  |
| `result_label` | text | yes | — |  |
| `notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |

### `test_bookings`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `test_type` | text |  | — |  |
| `test_date` | date |  | — |  |
| `location` | text | yes | — |  |
| `registered` | boolean |  | yes |  |
| `notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |

### `test_plans`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `test_type` | text |  | — |  |
| `current_score` | double precision | yes | — |  |
| `target_score` | double precision | yes | — |  |
| `target_date` | date | yes | — |  |
| `next_test_date` | date | yes | — |  |
| `is_active` | boolean |  | yes |  |
| `notes` | text | yes | — |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `test_tasks`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `test_plan_id` | integer |  | — | FK → test_plans(id) on delete cascade |
| `title` | text |  | — |  |
| `skill` | text |  | yes |  |
| `due_date` | date | yes | — |  |
| `is_completed` | boolean |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `universities`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `name` | text |  | — |  |
| `country` | text |  | — |  |
| `city` | text | yes | — |  |
| `flag_emoji` | text |  | yes |  |
| `world_ranking` | integer | yes | — |  |
| `degree_level` | text |  | yes |  |
| `program_major` | text | yes | — |  |
| `canonical_name` | text | yes | — |  |
| `short_name` | text | yes | — |  |
| `country_code` | text | yes | — |  |
| `qs_rank_year` | integer | yes | — |  |
| `data_source` | text | yes | — |  |
| `annual_tuition_usd` | integer | yes | — |  |
| `annual_living_est_usd` | integer | yes | — |  |
| `accommodation_cost_usd` | integer | yes | — |  |
| `annual_tuition` | numeric | yes | — |  |
| `tuition_currency` | text |  | yes |  |
| `tuition_period` | text |  | yes |  |
| `annual_living_est` | numeric | yes | — |  |
| `living_cost_currency` | text |  | yes |  |
| `living_cost_period` | text |  | yes |  |
| `accommodation_cost` | numeric | yes | — |  |
| `accommodation_cost_currency` | text |  | yes |  |
| `accommodation_cost_period` | text |  | yes |  |
| `application_fee` | integer | yes | — |  |
| `application_fee_currency` | text |  | yes |  |
| `min_gpa` | double precision | yes | — |  |
| `min_ielts` | double precision | yes | — |  |
| `min_sat` | integer | yes | — |  |
| `acceptance_rate` | double precision | yes | — |  |
| `post_study_work_visa_years` | double precision | yes | — |  |
| `founded_year` | integer | yes | — |  |
| `university_type` | text | yes | — |  |
| `address` | text | yes | — |  |
| `international_students_count` | integer | yes | — |  |
| `international_students_percentage` | double precision | yes | — |  |
| `official_website_url` | text | yes | — |  |
| `admissions_url` | text | yes | — |  |
| `international_admissions_url` | text | yes | — |  |
| `undergraduate_admissions_url` | text | yes | — |  |
| `application_url` | text | yes | — |  |
| `description` | text |  | — |  |
| `highlights` | text |  | yes |  |
| `website_url` | text |  | — |  |
| `image_url` | text | yes | — |  |
| `source_url` | text | yes | — |  |
| `last_verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |
| `source_reliability` | integer |  | yes |  |
| `is_active` | boolean |  | yes |  |

### `programs`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `university_id` | integer |  | — | FK → universities(id) on delete cascade |
| `name` | text |  | — |  |
| `field` | text | yes | — |  |
| `degree_level` | text | yes | — |  |
| `duration` | numeric | yes | — |  |
| `duration_unit` | text |  | yes |  |
| `study_mode` | text | yes | — |  |
| `language` | text | yes | — |  |
| `annual_tuition` | numeric | yes | — |  |
| `tuition_currency` | text |  | yes |  |
| `tuition_period` | text |  | yes |  |
| `description` | text | yes | — |  |
| `official_url` | text | yes | — |  |
| `application_url` | text | yes | — |  |
| `is_verified` | boolean |  | yes |  |
| `source_url` | text | yes | — |  |
| `last_verified_at` | timestamp | yes | — |  |
| `is_active` | boolean |  | yes |  |
| `verification_status` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `university_rankings`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `university_id` | integer |  | — | FK → universities(id) on delete cascade |
| `ranking_provider` | text |  | — |  |
| `ranking_name` | text |  | — |  |
| `ranking_year` | integer |  | — |  |
| `rank` | integer | yes | — |  |
| `rank_label` | text | yes | — |  |
| `score` | numeric | yes | — |  |
| `source_id` | integer | yes | — | FK → sources(id) on delete set null |
| `verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |
| `created_at` | timestamp |  | yes |  |

### `university_sources`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `university_id` | integer |  | — | FK → universities(id) on delete cascade |
| `source_id` | integer | yes | — | FK → sources(id) on delete set null |
| `source_type` | text |  | yes |  |

### `user_badges`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `badge_id` | integer |  | — | FK → badges(id) on delete cascade |
| `awarded_at` | timestamp |  | yes |  |

### `user_documents`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | FK → student_profiles(id) on delete cascade |
| `doc_type` | text |  | — |  |
| `title` | text |  | — |  |
| `file_name` | text | yes | — |  |
| `file_url` | text | yes | — |  |
| `file_size_bytes` | integer | yes | — |  |
| `mime_type` | text | yes | — |  |
| `issued_at` | date | yes | — |  |
| `expires_at` | date | yes | — |  |
| `status` | text |  | yes |  |
| `verification_note` | text | yes | — |  |
| `verified_at` | timestamp | yes | — |  |
| `uploaded_at` | timestamp |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `user_points`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `profile_id` | integer |  | — | unique, FK → student_profiles(id) on delete cascade |
| `total_points` | integer |  | yes |  |
| `current_level` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

### `visa_requirements`

| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | serial |  | yes | PK |
| `country` | text |  | — |  |
| `visa_type` | text |  | — |  |
| `title` | text |  | — |  |
| `instructions` | text | yes | — |  |
| `is_required` | boolean |  | yes |  |
| `source_url` | text | yes | — |  |
| `source_name` | text | yes | — |  |
| `source_type` | text | yes | — |  |
| `last_verified_at` | timestamp | yes | — |  |
| `verification_status` | text |  | yes |  |
| `sort_order` | integer |  | yes |  |
| `created_at` | timestamp |  | yes |  |
| `updated_at` | timestamp |  | yes |  |

## 5. Qanday bazaga qo'yiladi — tartib va ta'mirlash (fresh vs existing)

**Faylning xarakteri:** `full_schema.sql` to'liq **qo'shadi va takrorlanuvchan**
(idempotent). U:
- **Yangi bo'sh bazada** — butun schemani yaratadi (93 jadval, 115 FK, barcha
  UNIQUE qoidalar, RLS). Hech qaysi UNIQUE ustunda 2 ta qoida emas — har bir
  unique ustun uchun aynan bitta `uq_<jadval>_<ustun>` qoidasi.
- **Mavjud bazada** (masalan, drizzle `push` bilan yaratilgan dev bazada) —
  faqat YO'Q bo'lganini qo'shadi. Qoidalar **nom bo'yicha emas, USTUN
  POZISIYASI bo'yicha** aniqlanadi (`pg_constraint.conkey`): shu sababli drizzle
  o'z nomlari bilan (`student_profiles_email_unique` kabi) qo'ygan qoidalarni
  qayta qo'shmaydi, lekin ularni "topib" o'tkazib yuboradi. Buni
  `npm run test:schema-repair` avtomatik tekshiradi.

**Nima uchun aynan shunday (eski xato):** eski `drizzle push` yangi bazada
42830 xatosi bilan to'xtagan: `application_cycles → programs(id, university_id)`
kompozit FK uchun `uq_programs_id_university` faqat **indeks** bo'lib qolgan,
haqiqiy UNIQUE **qoida** bo'lmagan. Endi:
- `programs(id, university_id)` uchun haqiqiy UNIQUE qoida bor (Part 1);
- `user_sessions.token_hash` uchun ham haqiqiy UNIQUE qoida bor — shu tufayli
  `ON CONFLICT (token_hash)` ishlaydi (session takrorlanish bug'i yopilgan);
- Part 4 bazada shu ustunlarda qoida yo'q bo'lsa, uni **pozitsiya bo'yicha**
  tekshirib qo'shadi; agar eski push qoldirgan oddiy (constraint emas) UNIQUE
  indeks shu nom bilan tursa, faqat qoida EMAS ekanini aniqlab, uni olib
  qoidani toza yaratadi.

**Texnik xodim uchun aniq tartib (Supabase/Render):**
1. Bo'sh base: `full_schema.sql` → Run (yoki `npm run db:apply-full-schema`).
2. Tekshirish: `npm run db:verify` (har bir kerakli jadval/ustun ✓ bo'lishi kerak).
3. Dev (drizzle) base: avval `npm run db:push`, keyin ixtiyoriy
   `npm run db:apply-full-schema` — hech narsa o'zgarmasligi kerak (idempotent).
4. Eski/nozolat base: `full_schema.sql` ni qo'ying — FK lar qayta tiklanadi
   (NOTICE bilan qaysi biri zidligi uchun o'tkazilgani aytib beriladi), qoidalar
   qo'shiladi, ma'lumotlar saqlanadi. Keyin `npm run db:verify`.

**Avto-tekshiruv (CI + local):**
- `npm run test:schema` — schema.ts ↔ full_schema.sql drift yo'qligini
  (offline, bazasiz) tekshiradi.
- `npm run test:schema-repair` — alohida throwaway Postgres'da **fresh** va
  **broken→repair** ikkala yo'lni ham isbotlaydi: kompozit FK, `token_hash`
  UNIQUE qoidasi, `rate_limit_hits` saqlash, FK backfill, ma'lumotlar saqlanishi,
  `ON CONFLICT (token_hash)` ishlaydigi. `DATABASE_URL` ga hech qachon tegmaydi.
