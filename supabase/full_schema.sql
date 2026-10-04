-- ============================================================================
-- ScholarBridge — BIRLA ANIQ SUPABASE SCHEMA (single canonical schema)
-- GENERATE EDILGAN / GENERATED FILE — qo'lda tahrir qilmasdan avtolyo'li
-- yangilang:  npm run db:gen:full-schema
-- ============================================================================
-- NIMA BU:
--   src/db/schema.ts (Drizzle) — ilova o'qiydigan/yozadigan BARCHA jadval
--   va ustunlarning yagona manbai. Bu fayl aynan shu manbadan yaratilgan:
--   har bir jadval, har bir ustun, har bir indeks ilovadan kerak bo'lgani
--   bilan to'liq muvofiq.
--
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Bu faylni butunlay nusxalab qo'ying va "Run" bosing.
--   3. Tekshiring:  DATABASE_URL=postgresql://... npm run db:verify
--
-- XAVFSIZLIK:
--   * Faqat QO'SHADI (ADDITIVE): CREATE TABLE IF NOT EXISTS,
--     ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
--   * Hech qanday jadval/ustun o'chirilmaydi, nom o'zgartirilmaydi,
--     ma'lumot o'zgartirilmaydi. Necha marta ishlasangiz ham — xuddi
--     shu natija.
--   * Yangi loyihada: butun schemani bir bosishda yaratadi.
--   * Eski loyihada: yo'qolgan jadval/ustunlarni to'ldiradi ("bazi joylar
--     Supabaseda to'g'ri kelmayapti" — mana shu joylar avtomatik tuzatiladi).
--
-- QISM TASHKILI:
--   Part 1: CREATE TABLE IF NOT EXISTS   — yangi bazalar uchun to'liq ta'rif
--   Part 2: ADD COLUMN IF NOT EXISTS     — eski bazalarda yo'q ustunlar
--   Part 3: CREATE [UNIQUE] INDEX IF NOT EXISTS
--   Part 4: FK qoidalar — mavjud bazada yo'q bo'lsa, xavfsiz qo'shiladi
--   Part 5: RLS qulflash (anon/authenticated rollarga ruxsat olib qo'yish)
--   Part 6: Tekshiruv so'rovi
-- ============================================================================

BEGIN;


-- ============================================================================
-- PART 1 — JADVALLAR (fresh database: full definitions, dependency order)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "student_profiles" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "email" text CONSTRAINT "uq_student_profiles_email" UNIQUE NOT NULL,
  "password_hash" text,
  "degree_level" text NOT NULL DEFAULT 'Master',
  "target_major" text NOT NULL DEFAULT 'Computer Science',
  "study_interests" text,
  "gpa" double precision NOT NULL DEFAULT 3.5,
  "gpa_scale" double precision NOT NULL DEFAULT 4,
  "ielts_score" double precision DEFAULT 7,
  "toefl_score" integer DEFAULT 95,
  "sat_score" integer DEFAULT 1350,
  "gre_score" integer DEFAULT 315,
  "budget_annual_usd" integer NOT NULL DEFAULT 25000,
  "preferred_countries" text NOT NULL DEFAULT '["United States", "United Kingdom", "Canada", "Germany"]',
  "need_scholarship" boolean NOT NULL DEFAULT TRUE,
  "extracurriculars" text DEFAULT 'Hackathon winner, Peer Tutor, Student Council Vice President',
  "work_experience_years" integer DEFAULT 1,
  "research_publications" integer DEFAULT 0,
  "preferred_locale" text NOT NULL DEFAULT 'en',
  "is_admin" boolean NOT NULL DEFAULT FALSE,
  "referral_code" text CONSTRAINT "uq_student_profiles_referral_code" UNIQUE,
  "referred_by" integer CONSTRAINT "student_profiles_referred_by_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "referral_points" integer NOT NULL DEFAULT 0,
  "referral_rewarded" boolean NOT NULL DEFAULT FALSE,
  "is_premium" boolean NOT NULL DEFAULT FALSE,
  "premium_until" timestamp,
  "parent_share_enabled" boolean NOT NULL DEFAULT FALSE,
  "parent_share_email" text,
  "parent_share_token" text,
  "parent_share_created_at" timestamp,
  "act_score" integer,
  "duolingo_score" integer,
  "ap_courses" text,
  "ib_courses" text,
  "a_level_subjects" text,
  "coursework_notes" text,
  "country" text,
  "age" integer,
  "graduation_year" integer,
  "family_income_usd" integer,
  "needs_financial_aid" boolean,
  "requires_full_scholarship" boolean,
  "leadership" text,
  "volunteering" text,
  "sports" text,
  "clubs" text,
  "research_experience" text,
  "projects" text,
  "olympiads" text,
  "awards" text,
  "competitions" text,
  "certificates" text,
  "target_universities" text,
  "career_goal" text,
  "data_share_consent" boolean NOT NULL DEFAULT FALSE,
  "data_share_consent_at" timestamp,
  "onboarding_step" integer NOT NULL DEFAULT 0,
  "onboarding_completed" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "student_activities" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "student_activities_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "role" text,
  "organization" text,
  "start_date" date,
  "end_date" date,
  "hours" integer,
  "description" text,
  "achievements" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "user_documents" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "user_documents_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "doc_type" text NOT NULL,
  "title" text NOT NULL,
  "file_name" text,
  "file_url" text,
  "file_size_bytes" integer,
  "mime_type" text,
  "issued_at" date,
  "expires_at" date,
  "status" text NOT NULL DEFAULT 'uploaded',
  "verification_note" text,
  "verified_at" timestamp,
  "uploaded_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "activity_evidence" (
  "id" serial PRIMARY KEY,
  "activity_id" integer NOT NULL CONSTRAINT "activity_evidence_activity_id_fkey" REFERENCES "student_activities" ("id") ON DELETE CASCADE,
  "evidence_type" text NOT NULL,
  "label" text NOT NULL,
  "url" text,
  "document_id" integer CONSTRAINT "activity_evidence_document_id_fkey" REFERENCES "user_documents" ("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "universities" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "country" text NOT NULL,
  "city" text,
  "flag_emoji" text NOT NULL DEFAULT '🌐',
  "world_ranking" integer,
  "degree_level" text NOT NULL DEFAULT 'All',
  "program_major" text,
  "canonical_name" text,
  "short_name" text,
  "country_code" text,
  "qs_rank_year" integer,
  "data_source" text,
  "annual_tuition_usd" integer,
  "annual_living_est_usd" integer,
  "accommodation_cost_usd" integer,
  "annual_tuition" numeric,
  "tuition_currency" text NOT NULL DEFAULT 'USD',
  "tuition_period" text NOT NULL DEFAULT 'year',
  "annual_living_est" numeric,
  "living_cost_currency" text NOT NULL DEFAULT 'USD',
  "living_cost_period" text NOT NULL DEFAULT 'year',
  "accommodation_cost" numeric,
  "accommodation_cost_currency" text NOT NULL DEFAULT 'USD',
  "accommodation_cost_period" text NOT NULL DEFAULT 'year',
  "application_fee" integer,
  "application_fee_currency" text NOT NULL DEFAULT 'USD',
  "min_gpa" double precision,
  "min_ielts" double precision,
  "min_sat" integer,
  "acceptance_rate" double precision,
  "post_study_work_visa_years" double precision,
  "founded_year" integer,
  "university_type" text,
  "address" text,
  "international_students_count" integer,
  "international_students_percentage" double precision,
  "official_website_url" text,
  "admissions_url" text,
  "international_admissions_url" text,
  "undergraduate_admissions_url" text,
  "application_url" text,
  "description" text NOT NULL,
  "highlights" text NOT NULL DEFAULT '[]',
  "website_url" text NOT NULL,
  "image_url" text,
  "source_url" text,
  "last_verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "source_reliability" integer NOT NULL DEFAULT 7,
  "is_active" boolean NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS "applications" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "applications_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "university_id" integer CONSTRAINT "applications_university_id_fkey" REFERENCES "universities" ("id") ON DELETE SET NULL,
  "university_name" text NOT NULL DEFAULT '',
  "program_name" text,
  "application_round" text,
  "intake_term" text,
  "deadline" date,
  "status" text NOT NULL DEFAULT 'not_started',
  "submitted_at" timestamp,
  "application_fee_paid" boolean NOT NULL DEFAULT FALSE,
  "fee_amount" integer,
  "portal_url" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "admission_offers" (
  "id" serial PRIMARY KEY,
  "application_id" integer NOT NULL CONSTRAINT "admission_offers_application_id_fkey" REFERENCES "applications" ("id") ON DELETE CASCADE,
  "profile_id" integer NOT NULL CONSTRAINT "admission_offers_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "decided_at" date,
  "response_deadline" date,
  "offer_letter_url" text,
  "offer_letter_name" text,
  "conditions" text,
  "deposit_amount" integer,
  "deposit_due_date" date,
  "tuition_commitment" integer,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "ai_evaluations" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "ai_evaluations_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "evaluation_type" text NOT NULL DEFAULT 'Profile Analysis',
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "ai_provider_credentials" (
  "id" serial PRIMARY KEY,
  "provider" text CONSTRAINT "uq_ai_provider_credentials_provider" UNIQUE NOT NULL,
  "api_key_enc" text,
  "model" text,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "ai_usage_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "task_type" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "cost_estimate" double precision NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'success',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "answer_prompts" (
  "id" serial PRIMARY KEY,
  "category" text NOT NULL DEFAULT 'general',
  "question" text NOT NULL,
  "hint" text NOT NULL DEFAULT '',
  "word_limit" integer,
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "answer_vault" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "answer_vault_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "prompt_id" integer NOT NULL CONSTRAINT "answer_vault_prompt_id_fkey" REFERENCES "answer_prompts" ("id") ON DELETE CASCADE,
  "answer" text NOT NULL DEFAULT '',
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "app_config" (
  "id" serial PRIMARY KEY,
  "key" text CONSTRAINT "uq_app_config_key" UNIQUE NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "sources" (
  "id" serial PRIMARY KEY,
  "url" text NOT NULL,
  "title" text NOT NULL,
  "domain" text,
  "source_type" text NOT NULL DEFAULT 'unclassified',
  "accessed_at" timestamp,
  "is_official" boolean NOT NULL DEFAULT FALSE,
  "is_verified" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "programs" (
  "id" serial PRIMARY KEY,
  "university_id" integer NOT NULL CONSTRAINT "programs_university_id_fkey" REFERENCES "universities" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "field" text,
  "degree_level" text,
  "duration" numeric,
  "duration_unit" text NOT NULL DEFAULT 'years',
  "study_mode" text,
  "language" text,
  "annual_tuition" numeric,
  "tuition_currency" text NOT NULL DEFAULT 'USD',
  "tuition_period" text NOT NULL DEFAULT 'year',
  "description" text,
  "official_url" text,
  "application_url" text,
  "is_verified" boolean NOT NULL DEFAULT FALSE,
  "source_url" text,
  "last_verified_at" timestamp,
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_programs_id_university UNIQUE (id, university_id)
);
CREATE TABLE IF NOT EXISTS "application_cycles" (
  "id" serial PRIMARY KEY,
  "university_id" integer NOT NULL CONSTRAINT "application_cycles_university_id_fkey" REFERENCES "universities" ("id") ON DELETE CASCADE,
  "program_id" integer,
  "academic_year" text,
  "intake" text,
  "application_type" text,
  "opening_date" date,
  "deadline" date,
  "deadline_timezone" text,
  "application_fee" numeric,
  "application_fee_currency" text NOT NULL DEFAULT 'USD',
  "application_url" text,
  "source_url" text,
  "source_id" integer CONSTRAINT "application_cycles_source_id_fkey" REFERENCES "sources" ("id") ON DELETE SET NULL,
  "last_verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified'
);
CREATE TABLE IF NOT EXISTS "application_document_links" (
  "id" serial PRIMARY KEY,
  "application_id" integer NOT NULL CONSTRAINT "application_document_links_application_id_fkey" REFERENCES "applications" ("id") ON DELETE CASCADE,
  "document_id" integer NOT NULL CONSTRAINT "application_document_links_document_id_fkey" REFERENCES "user_documents" ("id") ON DELETE CASCADE,
  "usage" text NOT NULL DEFAULT 'required',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "application_documents" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "application_documents_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" integer,
  "document_type" text NOT NULL,
  "label" text NOT NULL,
  "is_required" boolean NOT NULL DEFAULT FALSE,
  "status" text NOT NULL DEFAULT 'missing',
  "file_url" text,
  "deadline_date" date,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" date,
  "file_name" text,
  "file_size_bytes" integer,
  "uploaded_at" timestamp
);
CREATE TABLE IF NOT EXISTS "application_outcomes" (
  "id" serial PRIMARY KEY,
  "application_id" integer NOT NULL CONSTRAINT "application_outcomes_application_id_fkey" REFERENCES "applications" ("id") ON DELETE CASCADE,
  "profile_id" integer NOT NULL CONSTRAINT "application_outcomes_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "university_id" integer CONSTRAINT "application_outcomes_university_id_fkey" REFERENCES "universities" ("id") ON DELETE SET NULL,
  "result" text NOT NULL,
  "decided_at" date,
  "scholarship_amount_usd" integer,
  "scholarship_name" text,
  "notes" text,
  "snapshot_gpa" double precision,
  "snapshot_gpa_scale" double precision,
  "snapshot_ielts" double precision,
  "snapshot_toefl" integer,
  "snapshot_sat" integer,
  "snapshot_act" integer,
  "snapshot_major" text,
  "snapshot_country" text,
  "snapshot_extracurriculars" text,
  "share_consent" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "application_requirements" (
  "id" serial PRIMARY KEY,
  "application_id" integer NOT NULL CONSTRAINT "application_requirements_application_id_fkey" REFERENCES "applications" ("id") ON DELETE CASCADE,
  "profile_id" integer NOT NULL CONSTRAINT "application_requirements_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "section" text NOT NULL,
  "item_key" text NOT NULL,
  "title" text NOT NULL,
  "instructions" text,
  "is_required" boolean NOT NULL DEFAULT TRUE,
  "status" text NOT NULL DEFAULT 'todo',
  "due_date" date,
  "source_url" text,
  "source_name" text,
  "source_type" text,
  "last_verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "linked_type" text,
  "linked_id" integer,
  "completed_at" timestamp,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "application_tasks" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "application_tasks_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "university_id" integer CONSTRAINT "application_tasks_university_id_fkey" REFERENCES "universities" ("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'Document Prep',
  "due_date" text NOT NULL,
  "is_completed" boolean NOT NULL DEFAULT FALSE,
  "priority" text NOT NULL DEFAULT 'Medium',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY,
  "entity_type" text NOT NULL,
  "entity_id" integer NOT NULL,
  "field_changed" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "source" text,
  "actor" text NOT NULL DEFAULT 'ADMIN',
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "badges" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "icon_url" text NOT NULL DEFAULT '🎖️',
  "criteria" text NOT NULL DEFAULT 'points'
);
CREATE TABLE IF NOT EXISTS "course_categories" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text CONSTRAINT "uq_course_categories_slug" UNIQUE NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "instructors" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "bio" text NOT NULL DEFAULT '',
  "photo_url" text,
  "university" text,
  "program" text,
  "country" text,
  "scholarship_name" text,
  "is_verified_student" boolean NOT NULL DEFAULT FALSE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "courses" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "instructor_name" text NOT NULL DEFAULT 'ScholarBridge Academy',
  "level" text NOT NULL DEFAULT 'Beginner',
  "thumbnail_url" text NOT NULL DEFAULT '',
  "is_published" boolean NOT NULL DEFAULT TRUE,
  "category_id" integer CONSTRAINT "courses_category_id_fkey" REFERENCES "course_categories" ("id") ON DELETE SET NULL,
  "instructor_id" integer CONSTRAINT "courses_instructor_id_fkey" REFERENCES "instructors" ("id") ON DELETE SET NULL,
  "student_experience" text NOT NULL DEFAULT '',
  "duration_total_seconds" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "certificates" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "certificates_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "course_id" integer NOT NULL CONSTRAINT "certificates_course_id_fkey" REFERENCES "courses" ("id") ON DELETE CASCADE,
  "certificate_code" text CONSTRAINT "uq_certificates_certificate_code" UNIQUE NOT NULL,
  "issued_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "checklist_items" (
  "id" serial PRIMARY KEY,
  "phase" text NOT NULL DEFAULT 'offer',
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "link_tab" text,
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "consulting_requests" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "consulting_requests_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "topic" text NOT NULL,
  "message" text NOT NULL DEFAULT '',
  "preferred_contact" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'new',
  "admin_notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "course_enrollments" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "course_enrollments_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "course_id" integer NOT NULL CONSTRAINT "course_enrollments_course_id_fkey" REFERENCES "courses" ("id") ON DELETE CASCADE,
  "progress_pct" integer NOT NULL DEFAULT 0,
  "is_completed" boolean NOT NULL DEFAULT FALSE,
  "completed_at" timestamp,
  "enrolled_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "course_modules" (
  "id" serial PRIMARY KEY,
  "course_id" integer NOT NULL CONSTRAINT "course_modules_course_id_fkey" REFERENCES "courses" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "essay_versions" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "essay_versions_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "university_id" integer CONSTRAINT "essay_versions_university_id_fkey" REFERENCES "universities" ("id") ON DELETE SET NULL,
  "essay_type" text NOT NULL DEFAULT 'sop',
  "title" text NOT NULL DEFAULT '',
  "content" text NOT NULL DEFAULT '',
  "word_count" integer NOT NULL DEFAULT 0,
  "char_count" integer NOT NULL DEFAULT 0,
  "version_number" integer NOT NULL DEFAULT 1,
  "rubric_hook" integer,
  "rubric_structure" integer,
  "rubric_specificity" integer,
  "rubric_language" integer,
  "rubric_fit" integer,
  "rubric_total" integer,
  "ai_feedback" text,
  "open_for_review" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "essay_reviews" (
  "id" serial PRIMARY KEY,
  "essay_version_id" integer NOT NULL CONSTRAINT "essay_reviews_essay_version_id_fkey" REFERENCES "essay_versions" ("id") ON DELETE CASCADE,
  "author_profile_id" integer NOT NULL,
  "reviewer_profile_id" integer NOT NULL CONSTRAINT "essay_reviews_reviewer_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "hook" integer,
  "structure" integer,
  "specificity" integer,
  "language" integer,
  "fit" integer,
  "total" integer,
  "comment" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "forum_categories" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text CONSTRAINT "uq_forum_categories_slug" UNIQUE NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "forum_likes" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL CONSTRAINT "forum_likes_user_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "forum_threads" (
  "id" serial PRIMARY KEY,
  "category_id" integer NOT NULL CONSTRAINT "forum_threads_category_id_fkey" REFERENCES "forum_categories" ("id") ON DELETE CASCADE,
  "author_id" integer NOT NULL CONSTRAINT "forum_threads_author_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "is_pinned" boolean NOT NULL DEFAULT FALSE,
  "is_locked" boolean NOT NULL DEFAULT FALSE,
  "view_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "forum_replies" (
  "id" serial PRIMARY KEY,
  "thread_id" integer NOT NULL CONSTRAINT "forum_replies_thread_id_fkey" REFERENCES "forum_threads" ("id") ON DELETE CASCADE,
  "author_id" integer NOT NULL CONSTRAINT "forum_replies_author_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "parent_reply_id" integer CONSTRAINT "forum_replies_parent_reply_id_fkey" REFERENCES "forum_replies" ("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "forum_reports" (
  "id" serial PRIMARY KEY,
  "reporter_id" integer NOT NULL CONSTRAINT "forum_reports_reporter_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "resolved_at" timestamp
);
CREATE TABLE IF NOT EXISTS "funding_items" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "funding_items_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "application_id" integer CONSTRAINT "funding_items_application_id_fkey" REFERENCES "applications" ("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "amount_usd" integer NOT NULL DEFAULT 0,
  "covers" text NOT NULL DEFAULT '[]',
  "status" text NOT NULL DEFAULT 'planned',
  "confirmed_at" date,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "goal_templates" (
  "id" serial PRIMARY KEY,
  "pillar" text NOT NULL DEFAULT 'academic',
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "steps" text NOT NULL DEFAULT '[]',
  "level" text NOT NULL DEFAULT 'any',
  "est_weeks" integer,
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "journey_deadlines" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "journey_deadlines_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "due_date" date NOT NULL,
  "entity_type" text,
  "entity_id" integer,
  "is_auto_generated" boolean NOT NULL DEFAULT FALSE,
  "is_completed" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "learning_providers" (
  "id" serial PRIMARY KEY,
  "provider_key" text CONSTRAINT "uq_learning_providers_provider_key" UNIQUE NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'test_prep',
  "status" text NOT NULL DEFAULT 'disabled',
  "config" text NOT NULL DEFAULT '{}',
  "is_enabled" boolean NOT NULL DEFAULT FALSE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "learning_provider_links" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "learning_provider_links_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "provider_id" integer NOT NULL CONSTRAINT "learning_provider_links_provider_id_fkey" REFERENCES "learning_providers" ("id") ON DELETE CASCADE,
  "external_user_ref" text,
  "status" text NOT NULL DEFAULT 'not_connected',
  "consent_at" timestamp,
  "last_synced_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "learning_provider_scores" (
  "id" serial PRIMARY KEY,
  "link_id" integer NOT NULL CONSTRAINT "learning_provider_scores_link_id_fkey" REFERENCES "learning_provider_links" ("id") ON DELETE CASCADE,
  "metric" text NOT NULL,
  "value" double precision,
  "measured_at" date,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "lessons" (
  "id" serial PRIMARY KEY,
  "module_id" integer NOT NULL CONSTRAINT "lessons_module_id_fkey" REFERENCES "course_modules" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "video_url" text NOT NULL,
  "duration_seconds" integer NOT NULL DEFAULT 0,
  "content" text NOT NULL DEFAULT '',
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "lesson_progress_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "lesson_id" integer NOT NULL CONSTRAINT "lesson_progress_lesson_id_fkey" REFERENCES "lessons" ("id") ON DELETE CASCADE,
  "watched_seconds" integer NOT NULL DEFAULT 0,
  "is_completed" boolean NOT NULL DEFAULT FALSE,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "levels" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "min_points" integer NOT NULL DEFAULT 0,
  "icon_url" text NOT NULL DEFAULT '🏅'
);
CREATE TABLE IF NOT EXISTS "mentors" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "mentors_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "display_name" text NOT NULL,
  "headline" text NOT NULL DEFAULT '',
  "bio" text NOT NULL DEFAULT '',
  "photo_url" text,
  "country" text,
  "city" text,
  "university" text,
  "program" text,
  "degree_level" text,
  "scholarship_name" text,
  "expertise" text NOT NULL DEFAULT '[]',
  "languages" text NOT NULL DEFAULT '[]',
  "hourly_rate_usd" integer,
  "free_sessions" boolean NOT NULL DEFAULT FALSE,
  "is_verified" boolean NOT NULL DEFAULT FALSE,
  "verification_note" text,
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "rating_average" double precision,
  "rating_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "mentor_requests" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "mentor_requests_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "mentor_id" integer NOT NULL CONSTRAINT "mentor_requests_mentor_id_fkey" REFERENCES "mentors" ("id") ON DELETE CASCADE,
  "topic" text NOT NULL,
  "message" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "scheduled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "uq_notification_preferences_profile_id" UNIQUE NOT NULL CONSTRAINT "notification_preferences_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "in_app" boolean NOT NULL DEFAULT TRUE,
  "email" boolean NOT NULL DEFAULT FALSE,
  "push" boolean NOT NULL DEFAULT FALSE,
  "types" text NOT NULL DEFAULT '["scholarship_opened","deadline_approaching","deadline_changed","milestone_due","requirement_gap","essay_improved"]',
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "notifications_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "link" text,
  "is_read" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" serial PRIMARY KEY,
  "type" text NOT NULL DEFAULT 'competition',
  "title" text NOT NULL,
  "provider" text NOT NULL DEFAULT '',
  "country" text,
  "fields" text NOT NULL DEFAULT '["All"]',
  "level" text NOT NULL DEFAULT 'any',
  "deadline_date" date,
  "url" text NOT NULL DEFAULT '',
  "description" text NOT NULL DEFAULT '',
  "is_verified" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "ownership_transfers" (
  "id" serial PRIMARY KEY,
  "from_profile_id" integer NOT NULL CONSTRAINT "ownership_transfers_from_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "to_profile_id" integer NOT NULL CONSTRAINT "ownership_transfers_to_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "retain_previous_admin" boolean NOT NULL DEFAULT TRUE,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "decided_at" timestamp,
  "decided_by" integer CONSTRAINT "ownership_transfers_decided_by_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  CONSTRAINT "ownership_transfers_status_check" CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'expired', 'cancelled')),
  CONSTRAINT "ownership_transfers_check" CHECK (from_profile_id <> to_profile_id)
);
CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "payments_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "provider" text NOT NULL,
  "provider_transaction_id" text NOT NULL DEFAULT '',
  "amount" double precision NOT NULL,
  "currency" text NOT NULL DEFAULT 'UZS',
  "status" text NOT NULL DEFAULT 'pending',
  "purpose" text NOT NULL DEFAULT 'subscription',
  "related_entity_id" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "platform_ownership" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "owner_profile_id" integer NOT NULL CONSTRAINT "platform_ownership_owner_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE RESTRICT,
  "source" text NOT NULL DEFAULT 'bootstrap',
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "platform_ownership_id_check" CHECK (id = 1)
);
CREATE TABLE IF NOT EXISTS "points_ledger" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "points_ledger_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "points" integer NOT NULL,
  "reason" text NOT NULL,
  "related_entity_id" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "program_requirements" (
  "id" serial PRIMARY KEY,
  "program_id" integer NOT NULL CONSTRAINT "program_requirements_program_id_fkey" REFERENCES "programs" ("id") ON DELETE CASCADE,
  "min_ielts" double precision,
  "min_toefl" double precision,
  "min_det" double precision,
  "min_sat" integer,
  "min_act" integer,
  "min_gpa" double precision,
  "ib_requirement" text,
  "a_level_requirement" text,
  "ap_requirement" text,
  "subject_requirements" text,
  "portfolio_required" boolean NOT NULL DEFAULT FALSE,
  "interview_required" boolean NOT NULL DEFAULT FALSE,
  "recommendation_required" boolean NOT NULL DEFAULT FALSE,
  "personal_statement_required" boolean NOT NULL DEFAULT FALSE,
  "other_requirements" text,
  "academic_year" text,
  "source_url" text,
  "last_verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified'
);
CREATE TABLE IF NOT EXISTS "program_sources" (
  "id" serial PRIMARY KEY,
  "program_id" integer NOT NULL CONSTRAINT "program_sources_program_id_fkey" REFERENCES "programs" ("id") ON DELETE CASCADE,
  "source_id" integer CONSTRAINT "program_sources_source_id_fkey" REFERENCES "sources" ("id") ON DELETE SET NULL,
  "source_type" text NOT NULL DEFAULT 'program_evidence',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL CONSTRAINT "quizzes_lesson_id_fkey" REFERENCES "lessons" ("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'Lesson Quiz',
  "pass_threshold" integer NOT NULL DEFAULT 70,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" serial PRIMARY KEY,
  "quiz_id" integer NOT NULL CONSTRAINT "quiz_attempts_quiz_id_fkey" REFERENCES "quizzes" ("id") ON DELETE CASCADE,
  "profile_id" integer NOT NULL CONSTRAINT "quiz_attempts_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "score" integer NOT NULL DEFAULT 0,
  "answers" text NOT NULL DEFAULT '[]',
  "passed" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" serial PRIMARY KEY,
  "quiz_id" integer NOT NULL CONSTRAINT "quiz_questions_quiz_id_fkey" REFERENCES "quizzes" ("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "options" text NOT NULL DEFAULT '[]',
  "correct_option_index" integer NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
  "key" text NOT NULL,
  "hit_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "recommendation_requests" (
  "id" serial PRIMARY KEY,
  "application_id" integer NOT NULL CONSTRAINT "recommendation_requests_application_id_fkey" REFERENCES "applications" ("id") ON DELETE CASCADE,
  "profile_id" integer NOT NULL CONSTRAINT "recommendation_requests_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "recommender_name" text NOT NULL,
  "recommender_email" text,
  "relationship" text,
  "status" text NOT NULL DEFAULT 'not_requested',
  "requested_at" timestamp,
  "submitted_at" timestamp,
  "due_date" date,
  "instructions" text,
  "is_private" boolean NOT NULL DEFAULT TRUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" serial PRIMARY KEY,
  "referrer_profile_id" integer NOT NULL CONSTRAINT "referrals_referrer_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "referred_profile_id" integer CONSTRAINT "referrals_referred_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "referral_code" text CONSTRAINT "uq_referrals_referral_code" UNIQUE NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "points_awarded" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "refresh_jobs" (
  "id" serial PRIMARY KEY,
  "job_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "trigger" text NOT NULL DEFAULT 'manual',
  "items_processed" integer NOT NULL DEFAULT 0,
  "items_changed" integer NOT NULL DEFAULT 0,
  "error" text,
  "started_at" timestamp,
  "finished_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "requirement_templates" (
  "id" serial PRIMARY KEY,
  "university_id" integer CONSTRAINT "requirement_templates_university_id_fkey" REFERENCES "universities" ("id") ON DELETE CASCADE,
  "program_id" integer CONSTRAINT "requirement_templates_program_id_fkey" REFERENCES "programs" ("id") ON DELETE CASCADE,
  "section" text NOT NULL,
  "item_key" text NOT NULL,
  "title" text NOT NULL,
  "instructions" text,
  "is_required" boolean NOT NULL DEFAULT TRUE,
  "source_url" text,
  "source_name" text,
  "source_type" text,
  "last_verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "saved_programs" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "saved_programs_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "program_id" integer NOT NULL CONSTRAINT "saved_programs_program_id_fkey" REFERENCES "programs" ("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "scholarships" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "provider" text NOT NULL,
  "country" text NOT NULL,
  "coverage_type" text NOT NULL DEFAULT 'Unspecified',
  "amount_usd_value" integer,
  "award_amount" numeric,
  "award_currency" text,
  "award_period" text,
  "award_basis" text,
  "deadline" text,
  "degree_levels" text NOT NULL DEFAULT '[]',
  "eligible_majors" text NOT NULL DEFAULT '[]',
  "min_gpa" double precision,
  "min_ielts" double precision,
  "financial_need_based" boolean DEFAULT FALSE,
  "merit_based" boolean DEFAULT TRUE,
  "description" text NOT NULL,
  "requirements" text NOT NULL,
  "website_url" text NOT NULL,
  "university_id" integer CONSTRAINT "scholarships_university_id_fkey" REFERENCES "universities" ("id") ON DELETE SET NULL,
  "eligible_countries" text DEFAULT '[]',
  "funding_type" text DEFAULT '',
  "tuition_coverage" text DEFAULT '',
  "living_allowance" integer,
  "travel_allowance" integer,
  "accommodation" text DEFAULT '',
  "application_fee" integer,
  "english_requirements" text DEFAULT '',
  "required_documents" text DEFAULT '[]',
  "application_url" text,
  "opening_date" date,
  "deadline_date" date,
  "deadline_type" text NOT NULL DEFAULT 'unknown',
  "deadline_range_start" date,
  "deadline_range_end" date,
  "rounds" text DEFAULT '[]',
  "recurrence" text NOT NULL DEFAULT 'none',
  "expected_opening_period" text,
  "expected_deadline_period" text,
  "application_status" text NOT NULL DEFAULT 'unknown',
  "last_verified_at" timestamp,
  "last_updated_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "source_reliability" integer NOT NULL DEFAULT 7,
  "source_url" text,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS "saved_scholarships" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "saved_scholarships_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "scholarship_id" integer NOT NULL CONSTRAINT "saved_scholarships_scholarship_id_fkey" REFERENCES "scholarships" ("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'Saved',
  "notes" text DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "saved_universities" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "saved_universities_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "university_id" integer NOT NULL CONSTRAINT "saved_universities_university_id_fkey" REFERENCES "universities" ("id") ON DELETE CASCADE,
  "match_category" text NOT NULL DEFAULT 'Match',
  "match_score" integer NOT NULL DEFAULT 85,
  "status" text NOT NULL DEFAULT 'Shortlisted',
  "notes" text DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "scholarship_decisions" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "scholarship_decisions_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "scholarship_id" integer NOT NULL CONSTRAINT "scholarship_decisions_scholarship_id_fkey" REFERENCES "scholarships" ("id") ON DELETE CASCADE,
  "status" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "scholarship_sources" (
  "id" serial PRIMARY KEY,
  "scholarship_id" integer NOT NULL CONSTRAINT "scholarship_sources_scholarship_id_fkey" REFERENCES "scholarships" ("id") ON DELETE CASCADE,
  "source_id" integer CONSTRAINT "scholarship_sources_source_id_fkey" REFERENCES "sources" ("id") ON DELETE SET NULL,
  "source_type" text NOT NULL DEFAULT 'scholarship_evidence',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "site_visits" (
  "id" serial PRIMARY KEY,
  "visitor_id" text NOT NULL DEFAULT '',
  "profile_id" integer CONSTRAINT "site_visits_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "event_type" text NOT NULL DEFAULT 'page_view',
  "path" text NOT NULL DEFAULT '/',
  "screen" text,
  "referrer" text,
  "user_agent" text,
  "device" text NOT NULL DEFAULT 'desktop',
  "locale" text,
  "country" text,
  "is_first_visit" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "student_checklist" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "student_checklist_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "item_id" integer NOT NULL CONSTRAINT "student_checklist_item_id_fkey" REFERENCES "checklist_items" ("id") ON DELETE CASCADE,
  "done_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "student_goals" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "student_goals_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "template_id" integer CONSTRAINT "student_goals_template_id_fkey" REFERENCES "goal_templates" ("id") ON DELETE SET NULL,
  "pillar" text NOT NULL DEFAULT 'academic',
  "title" text NOT NULL,
  "steps" text NOT NULL DEFAULT '[]',
  "status" text NOT NULL DEFAULT 'active',
  "target_date" date,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "study_plans" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "study_plans_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "target_major" text,
  "target_country" text,
  "degree_level" text,
  "intake_term" text,
  "goal_year" integer,
  "funding_goal" text,
  "status" text NOT NULL DEFAULT 'active',
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "study_plan_phases" (
  "id" serial PRIMARY KEY,
  "plan_id" integer NOT NULL CONSTRAINT "study_plan_phases_plan_id_fkey" REFERENCES "study_plans" ("id") ON DELETE CASCADE,
  "phase_key" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "started_at" timestamp,
  "completed_at" timestamp,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "subscriptions_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "plan" text NOT NULL DEFAULT 'premium',
  "status" text NOT NULL DEFAULT 'active',
  "current_period_end" timestamp NOT NULL,
  "payment_id" integer CONSTRAINT "subscriptions_payment_id_fkey" REFERENCES "payments" ("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "success_stories" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "success_stories_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "display_name" text NOT NULL DEFAULT 'Anonymous',
  "home_country" text,
  "admitted_university" text NOT NULL,
  "admitted_country" text,
  "other_admits" text NOT NULL DEFAULT '[]',
  "degree_level" text,
  "major" text,
  "intake_year" integer,
  "gpa" double precision,
  "gpa_scale" double precision,
  "ielts" double precision,
  "toefl" integer,
  "sat" integer,
  "activities" text NOT NULL DEFAULT '[]',
  "awards" text NOT NULL DEFAULT '[]',
  "essay_title" text,
  "essay_excerpt" text,
  "advice" text,
  "scholarship_name" text,
  "scholarship_amount_usd" integer,
  "status" text NOT NULL DEFAULT 'pending',
  "is_verified" boolean NOT NULL DEFAULT FALSE,
  "is_featured" boolean NOT NULL DEFAULT FALSE,
  "admin_note" text,
  "views" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "telegram_links" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "uq_telegram_links_profile_id" UNIQUE NOT NULL CONSTRAINT "telegram_links_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "telegram_user_id" text CONSTRAINT "uq_telegram_links_telegram_user_id" UNIQUE NOT NULL,
  "chat_id" text NOT NULL,
  "username" text,
  "first_name" text,
  "language_code" text,
  "notify_enabled" boolean NOT NULL DEFAULT TRUE,
  "muted_types" text NOT NULL DEFAULT '[]',
  "blocked" boolean NOT NULL DEFAULT FALSE,
  "linked_at" timestamp NOT NULL DEFAULT now(),
  "last_login_at" timestamp,
  "last_message_at" timestamp,
  "last_query" text,
  "reminder_days" text
);
CREATE TABLE IF NOT EXISTS "telegram_login_requests" (
  "id" serial PRIMARY KEY,
  "start_token" text CONSTRAINT "uq_telegram_login_requests_start_token" UNIQUE NOT NULL,
  "nonce_hash" text NOT NULL,
  "purpose" text NOT NULL DEFAULT 'login',
  "profile_id" integer CONSTRAINT "telegram_login_requests_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "fail_reason" text,
  "telegram_user_id" text,
  "chat_id" text,
  "username" text,
  "first_name" text,
  "last_name" text,
  "language_code" text,
  "code_hash" text,
  "code_expires_at" timestamp,
  "codes_sent" integer NOT NULL DEFAULT 0,
  "attempts" integer NOT NULL DEFAULT 0,
  "ip" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS "telegram_messages" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "telegram_messages_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE SET NULL,
  "chat_id" text,
  "kind" text NOT NULL,
  "type" text,
  "preview" text,
  "status" text NOT NULL,
  "error" text,
  "retry_payload" text,
  "attempts" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "telegram_updates" (
  "update_id" bigint PRIMARY KEY,
  "received_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "test_plans" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "test_plans_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "test_type" text NOT NULL,
  "current_score" double precision,
  "target_score" double precision,
  "target_date" date,
  "next_test_date" date,
  "is_active" boolean NOT NULL DEFAULT TRUE,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "test_attempts" (
  "id" serial PRIMARY KEY,
  "test_plan_id" integer NOT NULL CONSTRAINT "test_attempts_test_plan_id_fkey" REFERENCES "test_plans" ("id") ON DELETE CASCADE,
  "test_date" date NOT NULL,
  "score" double precision,
  "result_label" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "test_bookings" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "test_bookings_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "test_type" text NOT NULL,
  "test_date" date NOT NULL,
  "location" text,
  "registered" boolean NOT NULL DEFAULT FALSE,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "test_tasks" (
  "id" serial PRIMARY KEY,
  "test_plan_id" integer NOT NULL CONSTRAINT "test_tasks_test_plan_id_fkey" REFERENCES "test_plans" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "skill" text NOT NULL DEFAULT 'general',
  "due_date" date,
  "is_completed" boolean NOT NULL DEFAULT FALSE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "university_rankings" (
  "id" serial PRIMARY KEY,
  "university_id" integer NOT NULL CONSTRAINT "university_rankings_university_id_fkey" REFERENCES "universities" ("id") ON DELETE CASCADE,
  "ranking_provider" text NOT NULL,
  "ranking_name" text NOT NULL,
  "ranking_year" integer NOT NULL,
  "rank" integer,
  "rank_label" text,
  "score" numeric,
  "source_id" integer CONSTRAINT "university_rankings_source_id_fkey" REFERENCES "sources" ("id") ON DELETE SET NULL,
  "verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "university_sources" (
  "id" serial PRIMARY KEY,
  "university_id" integer NOT NULL CONSTRAINT "university_sources_university_id_fkey" REFERENCES "universities" ("id") ON DELETE CASCADE,
  "source_id" integer CONSTRAINT "university_sources_source_id_fkey" REFERENCES "sources" ("id") ON DELETE SET NULL,
  "source_type" text NOT NULL DEFAULT 'university_evidence'
);
CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "user_badges_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "badge_id" integer NOT NULL CONSTRAINT "user_badges_badge_id_fkey" REFERENCES "badges" ("id") ON DELETE CASCADE,
  "awarded_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "user_points" (
  "id" serial PRIMARY KEY,
  "profile_id" integer CONSTRAINT "uq_user_points_profile_id" UNIQUE NOT NULL CONSTRAINT "user_points_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "total_points" integer NOT NULL DEFAULT 0,
  "current_level" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL CONSTRAINT "user_sessions_profile_id_fkey" REFERENCES "student_profiles" ("id") ON DELETE CASCADE,
  "token_hash" text CONSTRAINT "uq_user_sessions_token_hash" UNIQUE NOT NULL,
  "scope" text NOT NULL DEFAULT 'web',
  "user_agent" text,
  "ip" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_seen_at" timestamp NOT NULL DEFAULT now(),
  "revoked_at" timestamp
);
CREATE TABLE IF NOT EXISTS "visa_requirements" (
  "id" serial PRIMARY KEY,
  "country" text NOT NULL,
  "visa_type" text NOT NULL,
  "title" text NOT NULL,
  "instructions" text,
  "is_required" boolean NOT NULL DEFAULT TRUE,
  "source_url" text,
  "source_name" text,
  "source_type" text,
  "last_verified_at" timestamp,
  "verification_status" text NOT NULL DEFAULT 'unverified',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- ============================================================================
-- PART 2 — USTUNLAR (existing databases: add only what is missing)
-- ============================================================================

-- ---------- student_profiles ----------
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "degree_level" text NOT NULL DEFAULT 'Master';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "target_major" text NOT NULL DEFAULT 'Computer Science';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "study_interests" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "gpa" double precision NOT NULL DEFAULT 3.5;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "gpa_scale" double precision NOT NULL DEFAULT 4;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "ielts_score" double precision DEFAULT 7;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "toefl_score" integer DEFAULT 95;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "sat_score" integer DEFAULT 1350;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "gre_score" integer DEFAULT 315;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "budget_annual_usd" integer NOT NULL DEFAULT 25000;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "preferred_countries" text NOT NULL DEFAULT '["United States", "United Kingdom", "Canada", "Germany"]';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "need_scholarship" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "extracurriculars" text DEFAULT 'Hackathon winner, Peer Tutor, Student Council Vice President';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "work_experience_years" integer DEFAULT 1;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "research_publications" integer DEFAULT 0;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "preferred_locale" text NOT NULL DEFAULT 'en';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referral_code" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referred_by" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referral_points" integer NOT NULL DEFAULT 0;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referral_rewarded" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "is_premium" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "premium_until" timestamp;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "parent_share_enabled" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "parent_share_email" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "parent_share_token" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "parent_share_created_at" timestamp;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "act_score" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "duolingo_score" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "ap_courses" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "ib_courses" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "a_level_subjects" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "coursework_notes" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "age" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "graduation_year" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "family_income_usd" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "needs_financial_aid" boolean;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "requires_full_scholarship" boolean;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "leadership" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "volunteering" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "sports" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "clubs" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "research_experience" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "projects" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "olympiads" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "awards" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "competitions" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "certificates" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "target_universities" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "career_goal" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "data_share_consent" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "data_share_consent_at" timestamp;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "onboarding_step" integer NOT NULL DEFAULT 0;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- student_activities ----------
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "organization" text;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "start_date" date;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "end_date" date;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "hours" integer;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "achievements" text;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "student_activities" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- user_documents ----------
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "doc_type" text;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "file_name" text;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "mime_type" text;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "issued_at" date;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "expires_at" date;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'uploaded';
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "verification_note" text;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "uploaded_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "user_documents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- activity_evidence ----------
ALTER TABLE "activity_evidence" ADD COLUMN IF NOT EXISTS "activity_id" integer;
ALTER TABLE "activity_evidence" ADD COLUMN IF NOT EXISTS "evidence_type" text;
ALTER TABLE "activity_evidence" ADD COLUMN IF NOT EXISTS "label" text;
ALTER TABLE "activity_evidence" ADD COLUMN IF NOT EXISTS "url" text;
ALTER TABLE "activity_evidence" ADD COLUMN IF NOT EXISTS "document_id" integer;
ALTER TABLE "activity_evidence" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- universities ----------
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "flag_emoji" text NOT NULL DEFAULT '🌐';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "world_ranking" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "degree_level" text NOT NULL DEFAULT 'All';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "program_major" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "canonical_name" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "short_name" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "country_code" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "qs_rank_year" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "data_source" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "annual_tuition_usd" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "annual_living_est_usd" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost_usd" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "annual_tuition" numeric;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "tuition_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "tuition_period" text NOT NULL DEFAULT 'year';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "annual_living_est" numeric;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "living_cost_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "living_cost_period" text NOT NULL DEFAULT 'year';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost" numeric;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost_period" text NOT NULL DEFAULT 'year';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "application_fee" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "application_fee_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "min_gpa" double precision;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "min_ielts" double precision;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "min_sat" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "acceptance_rate" double precision;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "post_study_work_visa_years" double precision;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "founded_year" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "university_type" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "international_students_count" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "international_students_percentage" double precision;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "official_website_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "admissions_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "international_admissions_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "undergraduate_admissions_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "application_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "highlights" text NOT NULL DEFAULT '[]';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "website_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "source_reliability" integer NOT NULL DEFAULT 7;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
-- ---------- applications ----------
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "university_name" text NOT NULL DEFAULT '';
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "program_name" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "application_round" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "intake_term" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "deadline" date;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'not_started';
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "application_fee_paid" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "fee_amount" integer;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "portal_url" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- admission_offers ----------
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "application_id" integer;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "decided_at" date;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "response_deadline" date;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "offer_letter_url" text;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "offer_letter_name" text;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "conditions" text;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "deposit_amount" integer;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "deposit_due_date" date;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "tuition_commitment" integer;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "admission_offers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- ai_evaluations ----------
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "evaluation_type" text NOT NULL DEFAULT 'Profile Analysis';
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- ai_provider_credentials ----------
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "api_key_enc" text;
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "model" text;
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- ai_usage ----------
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "task_type" text;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "model" text;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "prompt_tokens" integer NOT NULL DEFAULT 0;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "completion_tokens" integer NOT NULL DEFAULT 0;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "cost_estimate" double precision NOT NULL DEFAULT 0;
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'success';
ALTER TABLE "ai_usage" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- answer_prompts ----------
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'general';
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "question" text;
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "hint" text NOT NULL DEFAULT '';
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "word_limit" integer;
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "answer_prompts" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- answer_vault ----------
ALTER TABLE "answer_vault" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "answer_vault" ADD COLUMN IF NOT EXISTS "prompt_id" integer;
ALTER TABLE "answer_vault" ADD COLUMN IF NOT EXISTS "answer" text NOT NULL DEFAULT '';
ALTER TABLE "answer_vault" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- app_config ----------
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "key" text;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "value" text;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- sources ----------
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "url" text;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "domain" text;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "source_type" text NOT NULL DEFAULT 'unclassified';
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "accessed_at" timestamp;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "is_official" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- programs ----------
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "field" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "degree_level" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "duration" numeric;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "duration_unit" text NOT NULL DEFAULT 'years';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "study_mode" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "language" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "annual_tuition" numeric;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "tuition_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "tuition_period" text NOT NULL DEFAULT 'year';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "official_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "application_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- application_cycles ----------
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "program_id" integer;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "academic_year" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "intake" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "application_type" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "opening_date" date;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "deadline" date;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "deadline_timezone" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "application_fee" numeric;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "application_fee_currency" text NOT NULL DEFAULT 'USD';
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "application_url" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
-- ---------- application_document_links ----------
ALTER TABLE "application_document_links" ADD COLUMN IF NOT EXISTS "application_id" integer;
ALTER TABLE "application_document_links" ADD COLUMN IF NOT EXISTS "document_id" integer;
ALTER TABLE "application_document_links" ADD COLUMN IF NOT EXISTS "usage" text NOT NULL DEFAULT 'required';
ALTER TABLE "application_document_links" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- application_documents ----------
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "entity_id" integer;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "document_type" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "label" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "is_required" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'missing';
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "file_url" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "deadline_date" date;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "expires_at" date;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "file_name" text;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
ALTER TABLE "application_documents" ADD COLUMN IF NOT EXISTS "uploaded_at" timestamp;
-- ---------- application_outcomes ----------
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "application_id" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "result" text;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "decided_at" date;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "scholarship_amount_usd" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "scholarship_name" text;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_gpa" double precision;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_gpa_scale" double precision;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_ielts" double precision;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_toefl" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_sat" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_act" integer;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_major" text;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_country" text;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "snapshot_extracurriculars" text;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "share_consent" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "application_outcomes" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- application_requirements ----------
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "application_id" integer;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "section" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "item_key" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "instructions" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "is_required" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'todo';
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "due_date" date;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "source_name" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "linked_type" text;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "linked_id" integer;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "application_requirements" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- application_tasks ----------
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'Document Prep';
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "due_date" text;
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "is_completed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "priority" text NOT NULL DEFAULT 'Medium';
ALTER TABLE "application_tasks" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- audit_logs ----------
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" integer;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "field_changed" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "old_value" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "new_value" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actor" text NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- badges ----------
ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "icon_url" text NOT NULL DEFAULT '🎖️';
ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "criteria" text NOT NULL DEFAULT 'points';
-- ---------- course_categories ----------
ALTER TABLE "course_categories" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "course_categories" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "course_categories" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "course_categories" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
-- ---------- instructors ----------
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "bio" text NOT NULL DEFAULT '';
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "photo_url" text;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "university" text;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "program" text;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "scholarship_name" text;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "is_verified_student" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "instructors" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- courses ----------
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "instructor_name" text NOT NULL DEFAULT 'ScholarBridge Academy';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "level" text NOT NULL DEFAULT 'Beginner';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnail_url" text NOT NULL DEFAULT '';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "category_id" integer;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "instructor_id" integer;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "student_experience" text NOT NULL DEFAULT '';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "duration_total_seconds" integer NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- certificates ----------
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "certificate_code" text;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "issued_at" timestamp NOT NULL DEFAULT now();
-- ---------- checklist_items ----------
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "phase" text NOT NULL DEFAULT 'offer';
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "link_tab" text;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- consulting_requests ----------
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "topic" text;
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "message" text NOT NULL DEFAULT '';
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "preferred_contact" text NOT NULL DEFAULT '';
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'new';
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "admin_notes" text;
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "consulting_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- course_enrollments ----------
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "progress_pct" integer NOT NULL DEFAULT 0;
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "is_completed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "enrolled_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- course_modules ----------
ALTER TABLE "course_modules" ADD COLUMN IF NOT EXISTS "course_id" integer;
ALTER TABLE "course_modules" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "course_modules" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "course_modules" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
-- ---------- essay_versions ----------
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "essay_type" text NOT NULL DEFAULT 'sop';
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT '';
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "content" text NOT NULL DEFAULT '';
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "word_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "char_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "version_number" integer NOT NULL DEFAULT 1;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_hook" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_structure" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_specificity" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_language" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_fit" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_total" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "ai_feedback" text;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "open_for_review" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- essay_reviews ----------
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "essay_version_id" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "author_profile_id" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "reviewer_profile_id" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "hook" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "structure" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "specificity" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "language" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "fit" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "total" integer;
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "comment" text NOT NULL DEFAULT '';
ALTER TABLE "essay_reviews" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- forum_categories ----------
ALTER TABLE "forum_categories" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "forum_categories" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "forum_categories" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "forum_categories" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "forum_categories" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- forum_likes ----------
ALTER TABLE "forum_likes" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "forum_likes" ADD COLUMN IF NOT EXISTS "target_type" text;
ALTER TABLE "forum_likes" ADD COLUMN IF NOT EXISTS "target_id" integer;
ALTER TABLE "forum_likes" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- forum_threads ----------
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "category_id" integer;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "author_id" integer;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "is_pinned" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "is_locked" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- forum_replies ----------
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "thread_id" integer;
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "author_id" integer;
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "parent_reply_id" integer;
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- forum_reports ----------
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "reporter_id" integer;
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "target_type" text;
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "target_id" integer;
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'open';
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "forum_reports" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;
-- ---------- funding_items ----------
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "application_id" integer;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "kind" text;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "amount_usd" integer NOT NULL DEFAULT 0;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "covers" text NOT NULL DEFAULT '[]';
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'planned';
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "confirmed_at" date;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "funding_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- goal_templates ----------
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "pillar" text NOT NULL DEFAULT 'academic';
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "steps" text NOT NULL DEFAULT '[]';
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "level" text NOT NULL DEFAULT 'any';
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "est_weeks" integer;
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "goal_templates" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- journey_deadlines ----------
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "kind" text;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "due_date" date;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "entity_type" text;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "entity_id" integer;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "is_auto_generated" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "is_completed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "journey_deadlines" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- learning_providers ----------
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "provider_key" text;
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'test_prep';
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'disabled';
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "config" text NOT NULL DEFAULT '{}';
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "is_enabled" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "learning_providers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- learning_provider_links ----------
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "provider_id" integer;
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "external_user_ref" text;
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'not_connected';
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "consent_at" timestamp;
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp;
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "learning_provider_links" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- learning_provider_scores ----------
ALTER TABLE "learning_provider_scores" ADD COLUMN IF NOT EXISTS "link_id" integer;
ALTER TABLE "learning_provider_scores" ADD COLUMN IF NOT EXISTS "metric" text;
ALTER TABLE "learning_provider_scores" ADD COLUMN IF NOT EXISTS "value" double precision;
ALTER TABLE "learning_provider_scores" ADD COLUMN IF NOT EXISTS "measured_at" date;
ALTER TABLE "learning_provider_scores" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- lessons ----------
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "module_id" integer;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "video_url" text;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "duration_seconds" integer NOT NULL DEFAULT 0;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "content" text NOT NULL DEFAULT '';
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
-- ---------- lesson_progress ----------
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "lesson_id" integer;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "watched_seconds" integer NOT NULL DEFAULT 0;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "is_completed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- levels ----------
ALTER TABLE "levels" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "levels" ADD COLUMN IF NOT EXISTS "min_points" integer NOT NULL DEFAULT 0;
ALTER TABLE "levels" ADD COLUMN IF NOT EXISTS "icon_url" text NOT NULL DEFAULT '🏅';
-- ---------- mentors ----------
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "headline" text NOT NULL DEFAULT '';
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "bio" text NOT NULL DEFAULT '';
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "photo_url" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "university" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "program" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "degree_level" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "scholarship_name" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "expertise" text NOT NULL DEFAULT '[]';
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "languages" text NOT NULL DEFAULT '[]';
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "hourly_rate_usd" integer;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "free_sessions" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "verification_note" text;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "rating_average" double precision;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "rating_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "mentors" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- mentor_requests ----------
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "mentor_id" integer;
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "topic" text;
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "message" text NOT NULL DEFAULT '';
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp;
ALTER TABLE "mentor_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- notification_preferences ----------
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "in_app" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "email" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "push" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "types" text NOT NULL DEFAULT '["scholarship_opened","deadline_approaching","deadline_changed","milestone_due","requirement_gap","essay_improved"]';
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- notifications ----------
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- opportunities ----------
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'competition';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT '';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "fields" text NOT NULL DEFAULT '["All"]';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "level" text NOT NULL DEFAULT 'any';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "deadline_date" date;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "url" text NOT NULL DEFAULT '';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- ownership_transfers ----------
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "from_profile_id" integer;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "to_profile_id" integer;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "retain_previous_admin" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "note" text;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "decided_at" timestamp;
ALTER TABLE "ownership_transfers" ADD COLUMN IF NOT EXISTS "decided_by" integer;
-- ---------- payments ----------
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_transaction_id" text NOT NULL DEFAULT '';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount" double precision;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'UZS';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "purpose" text NOT NULL DEFAULT 'subscription';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "related_entity_id" integer;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- platform_ownership ----------
ALTER TABLE "platform_ownership" ADD COLUMN IF NOT EXISTS "owner_profile_id" integer;
ALTER TABLE "platform_ownership" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'bootstrap';
ALTER TABLE "platform_ownership" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- points_ledger ----------
ALTER TABLE "points_ledger" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "points_ledger" ADD COLUMN IF NOT EXISTS "points" integer;
ALTER TABLE "points_ledger" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "points_ledger" ADD COLUMN IF NOT EXISTS "related_entity_id" integer;
ALTER TABLE "points_ledger" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- program_requirements ----------
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "program_id" integer;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "min_ielts" double precision;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "min_toefl" double precision;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "min_det" double precision;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "min_sat" integer;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "min_act" integer;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "min_gpa" double precision;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "ib_requirement" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "a_level_requirement" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "ap_requirement" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "subject_requirements" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "portfolio_required" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "interview_required" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "recommendation_required" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "personal_statement_required" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "other_requirements" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "academic_year" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
-- ---------- program_sources ----------
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "program_id" integer;
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "source_type" text NOT NULL DEFAULT 'program_evidence';
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- quizzes ----------
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "lesson_id" integer;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT 'Lesson Quiz';
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "pass_threshold" integer NOT NULL DEFAULT 70;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- quiz_attempts ----------
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "quiz_id" integer;
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "score" integer NOT NULL DEFAULT 0;
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "answers" text NOT NULL DEFAULT '[]';
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "passed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- quiz_questions ----------
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "quiz_id" integer;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "question" text;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "options" text NOT NULL DEFAULT '[]';
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "correct_option_index" integer NOT NULL DEFAULT 0;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
-- ---------- rate_limit_hits ----------
ALTER TABLE "rate_limit_hits" ADD COLUMN IF NOT EXISTS "key" text;
ALTER TABLE "rate_limit_hits" ADD COLUMN IF NOT EXISTS "hit_at" timestamp NOT NULL DEFAULT now();
-- ---------- recommendation_requests ----------
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "application_id" integer;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "recommender_name" text;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "recommender_email" text;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "relationship" text;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'not_requested';
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "requested_at" timestamp;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "due_date" date;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "instructions" text;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "is_private" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "recommendation_requests" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- referrals ----------
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referrer_profile_id" integer;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referred_profile_id" integer;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referral_code" text;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "points_awarded" integer NOT NULL DEFAULT 0;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- refresh_jobs ----------
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "job_type" text;
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "trigger" text NOT NULL DEFAULT 'manual';
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "items_processed" integer NOT NULL DEFAULT 0;
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "items_changed" integer NOT NULL DEFAULT 0;
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "error" text;
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "finished_at" timestamp;
ALTER TABLE "refresh_jobs" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- requirement_templates ----------
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "program_id" integer;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "section" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "item_key" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "instructions" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "is_required" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "source_name" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "requirement_templates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- saved_programs ----------
ALTER TABLE "saved_programs" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "saved_programs" ADD COLUMN IF NOT EXISTS "program_id" integer;
ALTER TABLE "saved_programs" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- scholarships ----------
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "coverage_type" text NOT NULL DEFAULT 'Unspecified';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "amount_usd_value" integer;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_amount" numeric;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_currency" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_period" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_basis" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "degree_levels" text NOT NULL DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "eligible_majors" text NOT NULL DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "min_gpa" double precision;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "min_ielts" double precision;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "financial_need_based" boolean DEFAULT FALSE;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "merit_based" boolean DEFAULT TRUE;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "requirements" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "website_url" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "eligible_countries" text DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "funding_type" text DEFAULT '';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "tuition_coverage" text DEFAULT '';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "living_allowance" integer;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "travel_allowance" integer;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "accommodation" text DEFAULT '';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "application_fee" integer;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "english_requirements" text DEFAULT '';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "required_documents" text DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "application_url" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "opening_date" date;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_date" date;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_type" text NOT NULL DEFAULT 'unknown';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_range_start" date;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_range_end" date;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "rounds" text DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "recurrence" text NOT NULL DEFAULT 'none';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "expected_opening_period" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "expected_deadline_period" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "application_status" text NOT NULL DEFAULT 'unknown';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "last_updated_at" timestamp;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "source_reliability" integer NOT NULL DEFAULT 7;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
-- ---------- saved_scholarships ----------
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "scholarship_id" integer;
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'Saved';
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '';
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- saved_universities ----------
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "match_category" text NOT NULL DEFAULT 'Match';
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "match_score" integer NOT NULL DEFAULT 85;
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'Shortlisted';
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '';
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- scholarship_decisions ----------
ALTER TABLE "scholarship_decisions" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "scholarship_decisions" ADD COLUMN IF NOT EXISTS "scholarship_id" integer;
ALTER TABLE "scholarship_decisions" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "scholarship_decisions" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- scholarship_sources ----------
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "scholarship_id" integer;
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "source_type" text NOT NULL DEFAULT 'scholarship_evidence';
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- site_visits ----------
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "visitor_id" text NOT NULL DEFAULT '';
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "event_type" text NOT NULL DEFAULT 'page_view';
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "path" text NOT NULL DEFAULT '/';
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "screen" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "referrer" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "device" text NOT NULL DEFAULT 'desktop';
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "locale" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "is_first_visit" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- student_checklist ----------
ALTER TABLE "student_checklist" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "student_checklist" ADD COLUMN IF NOT EXISTS "item_id" integer;
ALTER TABLE "student_checklist" ADD COLUMN IF NOT EXISTS "done_at" timestamp NOT NULL DEFAULT now();
-- ---------- student_goals ----------
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "template_id" integer;
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "pillar" text NOT NULL DEFAULT 'academic';
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "steps" text NOT NULL DEFAULT '[]';
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "target_date" date;
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "student_goals" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- study_plans ----------
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "target_major" text;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "target_country" text;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "degree_level" text;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "intake_term" text;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "goal_year" integer;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "funding_goal" text;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "study_plans" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- study_plan_phases ----------
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "plan_id" integer;
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "phase_key" text;
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "study_plan_phases" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- subscriptions ----------
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan" text NOT NULL DEFAULT 'premium';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "payment_id" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- success_stories ----------
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "display_name" text NOT NULL DEFAULT 'Anonymous';
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "home_country" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "admitted_university" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "admitted_country" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "other_admits" text NOT NULL DEFAULT '[]';
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "degree_level" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "major" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "intake_year" integer;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "gpa" double precision;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "gpa_scale" double precision;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "ielts" double precision;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "toefl" integer;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "sat" integer;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "activities" text NOT NULL DEFAULT '[]';
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "awards" text NOT NULL DEFAULT '[]';
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "essay_title" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "essay_excerpt" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "advice" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "scholarship_name" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "scholarship_amount_usd" integer;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "is_featured" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "admin_note" text;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "views" integer NOT NULL DEFAULT 0;
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "success_stories" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- telegram_links ----------
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "telegram_user_id" text;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "chat_id" text;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "language_code" text;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "notify_enabled" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "muted_types" text NOT NULL DEFAULT '[]';
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "blocked" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "linked_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "last_query" text;
ALTER TABLE "telegram_links" ADD COLUMN IF NOT EXISTS "reminder_days" text;
-- ---------- telegram_login_requests ----------
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "start_token" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "nonce_hash" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "purpose" text NOT NULL DEFAULT 'login';
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "fail_reason" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "telegram_user_id" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "chat_id" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "language_code" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "code_hash" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "code_expires_at" timestamp;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "codes_sent" integer NOT NULL DEFAULT 0;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "ip" text;
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "telegram_login_requests" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
-- ---------- telegram_messages ----------
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "chat_id" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "kind" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "preview" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "error" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "retry_payload" text;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 1;
ALTER TABLE "telegram_messages" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- telegram_updates ----------
ALTER TABLE "telegram_updates" ADD COLUMN IF NOT EXISTS "received_at" timestamp NOT NULL DEFAULT now();
-- ---------- test_plans ----------
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "test_type" text;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "current_score" double precision;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "target_score" double precision;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "target_date" date;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "next_test_date" date;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "test_plans" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- test_attempts ----------
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "test_plan_id" integer;
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "test_date" date;
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "score" double precision;
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "result_label" text;
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- test_bookings ----------
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "test_type" text;
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "test_date" date;
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "registered" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "test_bookings" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- test_tasks ----------
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "test_plan_id" integer;
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "skill" text NOT NULL DEFAULT 'general';
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "due_date" date;
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "is_completed" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "test_tasks" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- university_rankings ----------
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "ranking_provider" text;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "ranking_name" text;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "ranking_year" integer;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "rank" integer;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "rank_label" text;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "score" numeric;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "university_rankings" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
-- ---------- university_sources ----------
ALTER TABLE "university_sources" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "university_sources" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "university_sources" ADD COLUMN IF NOT EXISTS "source_type" text NOT NULL DEFAULT 'university_evidence';
-- ---------- user_badges ----------
ALTER TABLE "user_badges" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "user_badges" ADD COLUMN IF NOT EXISTS "badge_id" integer;
ALTER TABLE "user_badges" ADD COLUMN IF NOT EXISTS "awarded_at" timestamp NOT NULL DEFAULT now();
-- ---------- user_points ----------
ALTER TABLE "user_points" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "user_points" ADD COLUMN IF NOT EXISTS "total_points" integer NOT NULL DEFAULT 0;
ALTER TABLE "user_points" ADD COLUMN IF NOT EXISTS "current_level" integer NOT NULL DEFAULT 1;
ALTER TABLE "user_points" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "user_points" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
-- ---------- user_sessions ----------
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "token_hash" text;
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "scope" text NOT NULL DEFAULT 'web';
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "ip" text;
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp;
-- ---------- visa_requirements ----------
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "visa_type" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "instructions" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "is_required" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "source_name" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'unverified';
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "visa_requirements" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

-- ============================================================================
-- PART 3 — INDEKSLAR
-- (so'rovlar tez bo'lishi uchun; har biri alohida guard'da — agar eski
--  ma'lumotlar unique indeksga zid bo'lsa, bitta NOTICE bilan o'tkaziladi,
--  qolganlari ishlay beradi)
-- ============================================================================

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_student_activities_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_student_activities_profile" ON "student_activities" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_student_activities_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_student_activities_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_documents_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_user_documents_profile" ON "user_documents" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_user_documents_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_user_documents_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_documents_expiry') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_user_documents_expiry" ON "user_documents" ("profile_id", "expires_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_user_documents_expiry skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_user_documents_expiry skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_activity_evidence_activity') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_activity_evidence_activity" ON "activity_evidence" ("activity_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_activity_evidence_activity skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_activity_evidence_activity skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_universities_canonical_name_ci') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS uq_universities_canonical_name_ci ON universities (lower(btrim(canonical_name))) WHERE canonical_name IS NOT NULL AND btrim(canonical_name) <> ''; EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_universities_canonical_name_ci skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_universities_canonical_name_ci skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_applications_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_applications_profile" ON "applications" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_applications_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_applications_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_applications_university') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_applications_university" ON "applications" ("university_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_applications_university skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_applications_university skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_applications_deadline') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_applications_deadline" ON "applications" ("deadline"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_applications_deadline skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_applications_deadline skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_admission_offer_application') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_admission_offer_application" ON "admission_offers" ("application_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_admission_offer_application skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_admission_offer_application skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_ai_usage_profile_created') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_ai_usage_profile_created" ON "ai_usage" ("profile_id", "created_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_ai_usage_profile_created skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_ai_usage_profile_created skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_answer_vault_profile_prompt') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_answer_vault_profile_prompt" ON "answer_vault" ("profile_id", "prompt_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_answer_vault_profile_prompt skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_answer_vault_profile_prompt skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_sources_url') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_sources_url" ON "sources" ("url"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_sources_url skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_sources_url skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_programs_university') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_programs_university" ON "programs" ("university_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_programs_university skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_programs_university skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_programs_university_name_degree') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_university_name_degree ON programs (university_id, lower(btrim(name)), lower(btrim(coalesce(degree_level, '')))); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_programs_university_name_degree skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_programs_university_name_degree skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_application_cycles_university_year') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_application_cycles_university_year" ON "application_cycles" ("university_id", "academic_year"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_application_cycles_university_year skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_application_cycles_university_year skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_application_cycles_program') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_application_cycles_program" ON "application_cycles" ("program_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_application_cycles_program skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_application_cycles_program skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_app_doc_link') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_app_doc_link" ON "application_document_links" ("application_id", "document_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_app_doc_link skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_app_doc_link skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_outcomes_application') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_outcomes_application" ON "application_outcomes" ("application_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_outcomes_application skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_outcomes_application skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_outcomes_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_outcomes_profile" ON "application_outcomes" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_outcomes_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_outcomes_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_outcomes_university_result') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_outcomes_university_result" ON "application_outcomes" ("university_id", "result"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_outcomes_university_result skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_outcomes_university_result skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_outcomes_consent') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_outcomes_consent" ON "application_outcomes" ("share_consent"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_outcomes_consent skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_outcomes_consent skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_app_requirements_application') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_app_requirements_application" ON "application_requirements" ("application_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_app_requirements_application skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_app_requirements_application skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_app_requirements_key') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_app_requirements_key" ON "application_requirements" ("application_id", "item_key"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_app_requirements_key skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_app_requirements_key skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_essay_versions_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_essay_versions_profile" ON "essay_versions" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_essay_versions_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_essay_versions_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_essay_versions_profile_type') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_essay_versions_profile_type" ON "essay_versions" ("profile_id", "essay_type", "version_number"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_essay_versions_profile_type skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_essay_versions_profile_type skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_essay_reviews_version') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_essay_reviews_version" ON "essay_reviews" ("essay_version_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_essay_reviews_version skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_essay_reviews_version skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_essay_reviews_reviewer') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_essay_reviews_reviewer" ON "essay_reviews" ("reviewer_profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_essay_reviews_reviewer skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_essay_reviews_reviewer skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_funding_items_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_funding_items_profile" ON "funding_items" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_funding_items_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_funding_items_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_journey_deadlines_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_journey_deadlines_profile" ON "journey_deadlines" ("profile_id", "due_date"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_journey_deadlines_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_journey_deadlines_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_learning_link') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_learning_link" ON "learning_provider_links" ("profile_id", "provider_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_learning_link skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_learning_link skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_learning_scores_link') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_learning_scores_link" ON "learning_provider_scores" ("link_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_learning_scores_link skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_learning_scores_link skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_mentors_active') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_mentors_active" ON "mentors" ("is_active", "is_verified"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_mentors_active skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_mentors_active skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_mentors_country') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_mentors_country" ON "mentors" ("country"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_mentors_country skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_mentors_country skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_mentor_requests_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_mentor_requests_profile" ON "mentor_requests" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_mentor_requests_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_mentor_requests_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_mentor_requests_mentor') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_mentor_requests_mentor" ON "mentor_requests" ("mentor_id", "status"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_mentor_requests_mentor skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_mentor_requests_mentor skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_opportunities_type') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_opportunities_type" ON "opportunities" ("type"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_opportunities_type skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_opportunities_type skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_opportunities_deadline') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_opportunities_deadline" ON "opportunities" ("deadline_date"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_opportunities_deadline skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_opportunities_deadline skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ownership_transfers_one_open') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS ownership_transfers_one_open ON ownership_transfers ((true)) WHERE status IN ('pending', 'accepted'); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index ownership_transfers_one_open skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index ownership_transfers_one_open skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ownership_transfers_to_idx') THEN BEGIN CREATE INDEX IF NOT EXISTS "ownership_transfers_to_idx" ON "ownership_transfers" ("to_profile_id", "status"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index ownership_transfers_to_idx skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index ownership_transfers_to_idx skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_program_requirements_program') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_program_requirements_program" ON "program_requirements" ("program_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_program_requirements_program skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_program_requirements_program skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_program_requirements_program_year') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS uq_program_requirements_program_year ON program_requirements (program_id, academic_year) WHERE academic_year IS NOT NULL; EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_program_requirements_program_year skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_program_requirements_program_year skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_rate_limit_hits_key_at') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_rate_limit_hits_key_at" ON "rate_limit_hits" ("key", "hit_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_rate_limit_hits_key_at skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_rate_limit_hits_key_at skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_rec_requests_application') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_rec_requests_application" ON "recommendation_requests" ("application_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_rec_requests_application skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_rec_requests_application skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_requirement_templates_uni') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_requirement_templates_uni" ON "requirement_templates" ("university_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_requirement_templates_uni skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_requirement_templates_uni skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_requirement_templates_program') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_requirement_templates_program" ON "requirement_templates" ("program_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_requirement_templates_program skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_requirement_templates_program skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_saved_programs_profile_program') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_saved_programs_profile_program" ON "saved_programs" ("profile_id", "program_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_saved_programs_profile_program skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_saved_programs_profile_program skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_scholarships_university') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_scholarships_university" ON "scholarships" ("university_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_scholarships_university skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_scholarships_university skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_saved_scholarships_profile_scholarship') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_saved_scholarships_profile_scholarship" ON "saved_scholarships" ("profile_id", "scholarship_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_saved_scholarships_profile_scholarship skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_saved_scholarships_profile_scholarship skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_saved_universities_profile_university') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_saved_universities_profile_university" ON "saved_universities" ("profile_id", "university_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_saved_universities_profile_university skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_saved_universities_profile_university skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_scholarship_decisions_profile_sch') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_scholarship_decisions_profile_sch" ON "scholarship_decisions" ("profile_id", "scholarship_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_scholarship_decisions_profile_sch skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_scholarship_decisions_profile_sch skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'site_visits_created_at_idx') THEN BEGIN CREATE INDEX IF NOT EXISTS "site_visits_created_at_idx" ON "site_visits" ("created_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index site_visits_created_at_idx skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index site_visits_created_at_idx skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'site_visits_visitor_id_idx') THEN BEGIN CREATE INDEX IF NOT EXISTS "site_visits_visitor_id_idx" ON "site_visits" ("visitor_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index site_visits_visitor_id_idx skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index site_visits_visitor_id_idx skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'site_visits_event_type_created_at_idx') THEN BEGIN CREATE INDEX IF NOT EXISTS "site_visits_event_type_created_at_idx" ON "site_visits" ("event_type", "created_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index site_visits_event_type_created_at_idx skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index site_visits_event_type_created_at_idx skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_student_checklist_profile_item') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_student_checklist_profile_item" ON "student_checklist" ("profile_id", "item_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_student_checklist_profile_item skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_student_checklist_profile_item skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_student_goals_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_student_goals_profile" ON "student_goals" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_student_goals_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_student_goals_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_study_plans_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_study_plans_profile" ON "study_plans" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_study_plans_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_study_plans_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_study_plan_phases_plan') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_study_plan_phases_plan" ON "study_plan_phases" ("plan_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_study_plan_phases_plan skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_study_plan_phases_plan skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_study_plan_phases_key') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_study_plan_phases_key" ON "study_plan_phases" ("plan_id", "phase_key"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_study_plan_phases_key skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_study_plan_phases_key skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_success_stories_status') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_success_stories_status" ON "success_stories" ("status"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_success_stories_status skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_success_stories_status skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_success_stories_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_success_stories_profile" ON "success_stories" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_success_stories_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_success_stories_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_telegram_messages_created') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_telegram_messages_created" ON "telegram_messages" ("created_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_telegram_messages_created skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_telegram_messages_created skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_telegram_updates_received') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_telegram_updates_received" ON "telegram_updates" ("received_at"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_telegram_updates_received skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_telegram_updates_received skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_test_plans_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_test_plans_profile" ON "test_plans" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_test_plans_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_test_plans_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_test_attempts_plan') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_test_attempts_plan" ON "test_attempts" ("test_plan_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_test_attempts_plan skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_test_attempts_plan skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_test_bookings_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_test_bookings_profile" ON "test_bookings" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_test_bookings_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_test_bookings_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_test_bookings_date') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_test_bookings_date" ON "test_bookings" ("test_date"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_test_bookings_date skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_test_bookings_date skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_test_tasks_plan') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_test_tasks_plan" ON "test_tasks" ("test_plan_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_test_tasks_plan skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_test_tasks_plan skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_university_ranking_edition') THEN BEGIN CREATE UNIQUE INDEX IF NOT EXISTS "uq_university_ranking_edition" ON "university_rankings" ("university_id", "ranking_provider", "ranking_name", "ranking_year"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index uq_university_ranking_edition skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index uq_university_ranking_edition skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_university_rankings_year_rank') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_university_rankings_year_rank" ON "university_rankings" ("ranking_year", "rank"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_university_rankings_year_rank skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_university_rankings_year_rank skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_sessions_profile') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_user_sessions_profile" ON "user_sessions" ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_user_sessions_profile skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_user_sessions_profile skipped: column missing'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_visa_requirements_country') THEN BEGIN CREATE INDEX IF NOT EXISTS "idx_visa_requirements_country" ON "visa_requirements" ("country", "visa_type"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'index idx_visa_requirements_country skipped: existing rows violate uniqueness'; WHEN undefined_column THEN RAISE NOTICE 'index idx_visa_requirements_country skipped: column missing'; END; END IF; END $$;

-- ============================================================================
-- PART 4 — O'ZGARMA QOIDALAR (unique constraint, FK, CHECK)
-- Mavjud jadvalga yo'q qoida qo'shiladi; agar ESKI ma'lumotlar qoidaga zid
-- bo'lsa, qoida NOTICE bilan o'tkaziladi (ilova qoidasiz ham ishlaydi, lekin
-- yangi qatorlar baribir toza qoladi).
-- ============================================================================

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.programs'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'id')::smallint, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'university_id')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.programs'::regclass AND ix.relname = 'uq_programs_id_university' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_programs_id_university')) THEN DROP INDEX uq_programs_id_university; END IF; ALTER TABLE "programs" ADD CONSTRAINT "uq_programs_id_university" UNIQUE ("id", "university_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_programs_id_university skipped: duplicate (id, university_id) rows exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_programs_id_university: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_profiles'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'email')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.student_profiles'::regclass AND ix.relname = 'uq_student_profiles_email' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_student_profiles_email')) THEN DROP INDEX uq_student_profiles_email; END IF; ALTER TABLE "student_profiles" ADD CONSTRAINT "uq_student_profiles_email" UNIQUE ("email"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_student_profiles_email skipped: duplicate student_profiles.email values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_student_profiles_email: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_profiles'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'referral_code')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.student_profiles'::regclass AND ix.relname = 'uq_student_profiles_referral_code' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_student_profiles_referral_code')) THEN DROP INDEX uq_student_profiles_referral_code; END IF; ALTER TABLE "student_profiles" ADD CONSTRAINT "uq_student_profiles_referral_code" UNIQUE ("referral_code"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_student_profiles_referral_code skipped: duplicate student_profiles.referral_code values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_student_profiles_referral_code: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.ai_provider_credentials'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.ai_provider_credentials'::regclass AND attname = 'provider')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.ai_provider_credentials'::regclass AND ix.relname = 'uq_ai_provider_credentials_provider' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_ai_provider_credentials_provider')) THEN DROP INDEX uq_ai_provider_credentials_provider; END IF; ALTER TABLE "ai_provider_credentials" ADD CONSTRAINT "uq_ai_provider_credentials_provider" UNIQUE ("provider"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_ai_provider_credentials_provider skipped: duplicate ai_provider_credentials.provider values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_ai_provider_credentials_provider: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.app_config'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.app_config'::regclass AND attname = 'key')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.app_config'::regclass AND ix.relname = 'uq_app_config_key' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_app_config_key')) THEN DROP INDEX uq_app_config_key; END IF; ALTER TABLE "app_config" ADD CONSTRAINT "uq_app_config_key" UNIQUE ("key"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_app_config_key skipped: duplicate app_config.key values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_app_config_key: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.course_categories'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_categories'::regclass AND attname = 'slug')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.course_categories'::regclass AND ix.relname = 'uq_course_categories_slug' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_course_categories_slug')) THEN DROP INDEX uq_course_categories_slug; END IF; ALTER TABLE "course_categories" ADD CONSTRAINT "uq_course_categories_slug" UNIQUE ("slug"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_course_categories_slug skipped: duplicate course_categories.slug values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_course_categories_slug: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.certificates'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.certificates'::regclass AND attname = 'certificate_code')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.certificates'::regclass AND ix.relname = 'uq_certificates_certificate_code' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_certificates_certificate_code')) THEN DROP INDEX uq_certificates_certificate_code; END IF; ALTER TABLE "certificates" ADD CONSTRAINT "uq_certificates_certificate_code" UNIQUE ("certificate_code"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_certificates_certificate_code skipped: duplicate certificates.certificate_code values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_certificates_certificate_code: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_categories'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_categories'::regclass AND attname = 'slug')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.forum_categories'::regclass AND ix.relname = 'uq_forum_categories_slug' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_forum_categories_slug')) THEN DROP INDEX uq_forum_categories_slug; END IF; ALTER TABLE "forum_categories" ADD CONSTRAINT "uq_forum_categories_slug" UNIQUE ("slug"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_forum_categories_slug skipped: duplicate forum_categories.slug values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_forum_categories_slug: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.learning_providers'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.learning_providers'::regclass AND attname = 'provider_key')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.learning_providers'::regclass AND ix.relname = 'uq_learning_providers_provider_key' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_learning_providers_provider_key')) THEN DROP INDEX uq_learning_providers_provider_key; END IF; ALTER TABLE "learning_providers" ADD CONSTRAINT "uq_learning_providers_provider_key" UNIQUE ("provider_key"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_learning_providers_provider_key skipped: duplicate learning_providers.provider_key values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_learning_providers_provider_key: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.notification_preferences'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.notification_preferences'::regclass AND attname = 'profile_id')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.notification_preferences'::regclass AND ix.relname = 'uq_notification_preferences_profile_id' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_notification_preferences_profile_id')) THEN DROP INDEX uq_notification_preferences_profile_id; END IF; ALTER TABLE "notification_preferences" ADD CONSTRAINT "uq_notification_preferences_profile_id" UNIQUE ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_notification_preferences_profile_id skipped: duplicate notification_preferences.profile_id values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_notification_preferences_profile_id: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.referrals'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.referrals'::regclass AND attname = 'referral_code')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.referrals'::regclass AND ix.relname = 'uq_referrals_referral_code' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_referrals_referral_code')) THEN DROP INDEX uq_referrals_referral_code; END IF; ALTER TABLE "referrals" ADD CONSTRAINT "uq_referrals_referral_code" UNIQUE ("referral_code"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_referrals_referral_code skipped: duplicate referrals.referral_code values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_referrals_referral_code: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.telegram_links'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.telegram_links'::regclass AND attname = 'profile_id')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.telegram_links'::regclass AND ix.relname = 'uq_telegram_links_profile_id' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_telegram_links_profile_id')) THEN DROP INDEX uq_telegram_links_profile_id; END IF; ALTER TABLE "telegram_links" ADD CONSTRAINT "uq_telegram_links_profile_id" UNIQUE ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_telegram_links_profile_id skipped: duplicate telegram_links.profile_id values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_telegram_links_profile_id: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.telegram_links'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.telegram_links'::regclass AND attname = 'telegram_user_id')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.telegram_links'::regclass AND ix.relname = 'uq_telegram_links_telegram_user_id' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_telegram_links_telegram_user_id')) THEN DROP INDEX uq_telegram_links_telegram_user_id; END IF; ALTER TABLE "telegram_links" ADD CONSTRAINT "uq_telegram_links_telegram_user_id" UNIQUE ("telegram_user_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_telegram_links_telegram_user_id skipped: duplicate telegram_links.telegram_user_id values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_telegram_links_telegram_user_id: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.telegram_login_requests'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.telegram_login_requests'::regclass AND attname = 'start_token')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.telegram_login_requests'::regclass AND ix.relname = 'uq_telegram_login_requests_start_token' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_telegram_login_requests_start_token')) THEN DROP INDEX uq_telegram_login_requests_start_token; END IF; ALTER TABLE "telegram_login_requests" ADD CONSTRAINT "uq_telegram_login_requests_start_token" UNIQUE ("start_token"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_telegram_login_requests_start_token skipped: duplicate telegram_login_requests.start_token values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_telegram_login_requests_start_token: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_points'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_points'::regclass AND attname = 'profile_id')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.user_points'::regclass AND ix.relname = 'uq_user_points_profile_id' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_user_points_profile_id')) THEN DROP INDEX uq_user_points_profile_id; END IF; ALTER TABLE "user_points" ADD CONSTRAINT "uq_user_points_profile_id" UNIQUE ("profile_id"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_user_points_profile_id skipped: duplicate user_points.profile_id values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_user_points_profile_id: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_sessions'::regclass AND c.contype = 'u' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_sessions'::regclass AND attname = 'token_hash')::smallint]) THEN BEGIN IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid = i.indexrelid WHERE i.indrelid = 'public.user_sessions'::regclass AND ix.relname = 'uq_user_sessions_token_hash' AND i.indisunique AND NOT EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.conname = 'uq_user_sessions_token_hash')) THEN DROP INDEX uq_user_sessions_token_hash; END IF; ALTER TABLE "user_sessions" ADD CONSTRAINT "uq_user_sessions_token_hash" UNIQUE ("token_hash"); EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'uq_user_sessions_token_hash skipped: duplicate user_sessions.token_hash values exist'; WHEN duplicate_object THEN RAISE NOTICE 'uq_user_sessions_token_hash: name already taken by another object — rename it manually, then re-run'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.activity_evidence'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.activity_evidence'::regclass AND attname = 'activity_id')::smallint] AND c.confrelid = 'public.student_activities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_activities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "activity_evidence" ADD CONSTRAINT "activity_evidence_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "student_activities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK activity_evidence_activity_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.activity_evidence'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.activity_evidence'::regclass AND attname = 'document_id')::smallint] AND c.confrelid = 'public.user_documents'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_documents'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "activity_evidence" ADD CONSTRAINT "activity_evidence_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "user_documents" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK activity_evidence_document_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.admission_offers'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admission_offers'::regclass AND attname = 'application_id')::smallint] AND c.confrelid = 'public.applications'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK admission_offers_application_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.admission_offers'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admission_offers'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK admission_offers_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.ai_evaluations'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.ai_evaluations'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK ai_evaluations_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.ai_usage'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.ai_usage'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK ai_usage_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.answer_vault'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.answer_vault'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "answer_vault" ADD CONSTRAINT "answer_vault_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK answer_vault_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.answer_vault'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.answer_vault'::regclass AND attname = 'prompt_id')::smallint] AND c.confrelid = 'public.answer_prompts'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.answer_prompts'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "answer_vault" ADD CONSTRAINT "answer_vault_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "answer_prompts" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK answer_vault_prompt_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_cycles'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_cycles'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_cycles" ADD CONSTRAINT "application_cycles_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_cycles_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_cycles'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_cycles'::regclass AND attname = 'source_id')::smallint] AND c.confrelid = 'public.sources'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sources'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_cycles" ADD CONSTRAINT "application_cycles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_cycles_source_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_cycles'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_cycles'::regclass AND attname = 'program_id')::smallint, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_cycles'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.programs'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'id')::smallint, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'university_id')::smallint]) THEN BEGIN ALTER TABLE "application_cycles" ADD CONSTRAINT "application_cycles_program_university_fkey" FOREIGN KEY ("program_id", "university_id") REFERENCES "programs" ("id", "university_id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_cycles_program_university_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_document_links'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_document_links'::regclass AND attname = 'application_id')::smallint] AND c.confrelid = 'public.applications'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_document_links" ADD CONSTRAINT "application_document_links_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_document_links_application_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_document_links'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_document_links'::regclass AND attname = 'document_id')::smallint] AND c.confrelid = 'public.user_documents'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_documents'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_document_links" ADD CONSTRAINT "application_document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "user_documents" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_document_links_document_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_documents'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_documents'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_documents_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_outcomes'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_outcomes'::regclass AND attname = 'application_id')::smallint] AND c.confrelid = 'public.applications'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_outcomes" ADD CONSTRAINT "application_outcomes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_outcomes_application_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_outcomes'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_outcomes'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_outcomes" ADD CONSTRAINT "application_outcomes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_outcomes_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_outcomes'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_outcomes'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_outcomes" ADD CONSTRAINT "application_outcomes_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_outcomes_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_requirements'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_requirements'::regclass AND attname = 'application_id')::smallint] AND c.confrelid = 'public.applications'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_requirements" ADD CONSTRAINT "application_requirements_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_requirements_application_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_requirements'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_requirements'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_requirements" ADD CONSTRAINT "application_requirements_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_requirements_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_tasks'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_tasks'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_tasks_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.application_tasks'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.application_tasks'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK application_tasks_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.applications'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK applications_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.applications'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "applications" ADD CONSTRAINT "applications_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK applications_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.certificates'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.certificates'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "certificates" ADD CONSTRAINT "certificates_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK certificates_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.certificates'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.certificates'::regclass AND attname = 'course_id')::smallint] AND c.confrelid = 'public.courses'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.courses'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK certificates_course_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.consulting_requests'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.consulting_requests'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "consulting_requests" ADD CONSTRAINT "consulting_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK consulting_requests_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.course_enrollments'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_enrollments'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK course_enrollments_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.course_enrollments'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_enrollments'::regclass AND attname = 'course_id')::smallint] AND c.confrelid = 'public.courses'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.courses'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK course_enrollments_course_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.course_modules'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_modules'::regclass AND attname = 'course_id')::smallint] AND c.confrelid = 'public.courses'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.courses'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK course_modules_course_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.courses'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.courses'::regclass AND attname = 'category_id')::smallint] AND c.confrelid = 'public.course_categories'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_categories'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "course_categories" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK courses_category_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.courses'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.courses'::regclass AND attname = 'instructor_id')::smallint] AND c.confrelid = 'public.instructors'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.instructors'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK courses_instructor_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.essay_reviews'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.essay_reviews'::regclass AND attname = 'essay_version_id')::smallint] AND c.confrelid = 'public.essay_versions'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.essay_versions'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "essay_reviews" ADD CONSTRAINT "essay_reviews_essay_version_id_fkey" FOREIGN KEY ("essay_version_id") REFERENCES "essay_versions" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK essay_reviews_essay_version_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.essay_reviews'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.essay_reviews'::regclass AND attname = 'reviewer_profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "essay_reviews" ADD CONSTRAINT "essay_reviews_reviewer_profile_id_fkey" FOREIGN KEY ("reviewer_profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK essay_reviews_reviewer_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.essay_versions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.essay_versions'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "essay_versions" ADD CONSTRAINT "essay_versions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK essay_versions_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.essay_versions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.essay_versions'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "essay_versions" ADD CONSTRAINT "essay_versions_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK essay_versions_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_likes'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_likes'::regclass AND attname = 'user_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_likes_user_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_replies'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_replies'::regclass AND attname = 'thread_id')::smallint] AND c.confrelid = 'public.forum_threads'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_threads'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_replies_thread_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_replies'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_replies'::regclass AND attname = 'author_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_replies_author_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_replies'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_replies'::regclass AND attname = 'parent_reply_id')::smallint] AND c.confrelid = 'public.forum_replies'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_replies'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "forum_replies" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_replies_parent_reply_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_reports'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_reports'::regclass AND attname = 'reporter_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_reports_reporter_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_threads'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_threads'::regclass AND attname = 'category_id')::smallint] AND c.confrelid = 'public.forum_categories'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_categories'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_threads_category_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.forum_threads'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.forum_threads'::regclass AND attname = 'author_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK forum_threads_author_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.funding_items'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.funding_items'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "funding_items" ADD CONSTRAINT "funding_items_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK funding_items_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.funding_items'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.funding_items'::regclass AND attname = 'application_id')::smallint] AND c.confrelid = 'public.applications'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "funding_items" ADD CONSTRAINT "funding_items_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK funding_items_application_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.journey_deadlines'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.journey_deadlines'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "journey_deadlines" ADD CONSTRAINT "journey_deadlines_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK journey_deadlines_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.learning_provider_links'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.learning_provider_links'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "learning_provider_links" ADD CONSTRAINT "learning_provider_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK learning_provider_links_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.learning_provider_links'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.learning_provider_links'::regclass AND attname = 'provider_id')::smallint] AND c.confrelid = 'public.learning_providers'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.learning_providers'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "learning_provider_links" ADD CONSTRAINT "learning_provider_links_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "learning_providers" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK learning_provider_links_provider_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.learning_provider_scores'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.learning_provider_scores'::regclass AND attname = 'link_id')::smallint] AND c.confrelid = 'public.learning_provider_links'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.learning_provider_links'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "learning_provider_scores" ADD CONSTRAINT "learning_provider_scores_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "learning_provider_links" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK learning_provider_scores_link_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.lesson_progress'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lesson_progress'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK lesson_progress_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.lesson_progress'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lesson_progress'::regclass AND attname = 'lesson_id')::smallint] AND c.confrelid = 'public.lessons'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lessons'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK lesson_progress_lesson_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.lessons'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lessons'::regclass AND attname = 'module_id')::smallint] AND c.confrelid = 'public.course_modules'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.course_modules'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "course_modules" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK lessons_module_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.mentor_requests'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.mentor_requests'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK mentor_requests_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.mentor_requests'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.mentor_requests'::regclass AND attname = 'mentor_id')::smallint] AND c.confrelid = 'public.mentors'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.mentors'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK mentor_requests_mentor_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.mentors'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.mentors'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "mentors" ADD CONSTRAINT "mentors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK mentors_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.notification_preferences'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.notification_preferences'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK notification_preferences_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.notifications'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.notifications'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK notifications_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.ownership_transfers'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.ownership_transfers'::regclass AND attname = 'from_profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_from_profile_id_fkey" FOREIGN KEY ("from_profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK ownership_transfers_from_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.ownership_transfers'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.ownership_transfers'::regclass AND attname = 'to_profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_to_profile_id_fkey" FOREIGN KEY ("to_profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK ownership_transfers_to_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.ownership_transfers'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.ownership_transfers'::regclass AND attname = 'decided_by')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK ownership_transfers_decided_by_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.payments'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.payments'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK payments_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.platform_ownership'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.platform_ownership'::regclass AND attname = 'owner_profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "platform_ownership" ADD CONSTRAINT "platform_ownership_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK platform_ownership_owner_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.points_ledger'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.points_ledger'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK points_ledger_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.program_requirements'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.program_requirements'::regclass AND attname = 'program_id')::smallint] AND c.confrelid = 'public.programs'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "program_requirements" ADD CONSTRAINT "program_requirements_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK program_requirements_program_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.program_sources'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.program_sources'::regclass AND attname = 'program_id')::smallint] AND c.confrelid = 'public.programs'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "program_sources" ADD CONSTRAINT "program_sources_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK program_sources_program_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.program_sources'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.program_sources'::regclass AND attname = 'source_id')::smallint] AND c.confrelid = 'public.sources'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sources'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "program_sources" ADD CONSTRAINT "program_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK program_sources_source_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.quiz_attempts'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.quiz_attempts'::regclass AND attname = 'quiz_id')::smallint] AND c.confrelid = 'public.quizzes'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.quizzes'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK quiz_attempts_quiz_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.quiz_attempts'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.quiz_attempts'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK quiz_attempts_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.quiz_questions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.quiz_questions'::regclass AND attname = 'quiz_id')::smallint] AND c.confrelid = 'public.quizzes'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.quizzes'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK quiz_questions_quiz_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.quizzes'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.quizzes'::regclass AND attname = 'lesson_id')::smallint] AND c.confrelid = 'public.lessons'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.lessons'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK quizzes_lesson_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.recommendation_requests'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.recommendation_requests'::regclass AND attname = 'application_id')::smallint] AND c.confrelid = 'public.applications'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.applications'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "recommendation_requests" ADD CONSTRAINT "recommendation_requests_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK recommendation_requests_application_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.recommendation_requests'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.recommendation_requests'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "recommendation_requests" ADD CONSTRAINT "recommendation_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK recommendation_requests_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.referrals'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.referrals'::regclass AND attname = 'referrer_profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_profile_id_fkey" FOREIGN KEY ("referrer_profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK referrals_referrer_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.referrals'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.referrals'::regclass AND attname = 'referred_profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_profile_id_fkey" FOREIGN KEY ("referred_profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK referrals_referred_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.requirement_templates'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.requirement_templates'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "requirement_templates" ADD CONSTRAINT "requirement_templates_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK requirement_templates_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.requirement_templates'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.requirement_templates'::regclass AND attname = 'program_id')::smallint] AND c.confrelid = 'public.programs'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "requirement_templates" ADD CONSTRAINT "requirement_templates_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK requirement_templates_program_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.saved_programs'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.saved_programs'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK saved_programs_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.saved_programs'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.saved_programs'::regclass AND attname = 'program_id')::smallint] AND c.confrelid = 'public.programs'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK saved_programs_program_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.saved_scholarships'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.saved_scholarships'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "saved_scholarships" ADD CONSTRAINT "saved_scholarships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK saved_scholarships_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.saved_scholarships'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.saved_scholarships'::regclass AND attname = 'scholarship_id')::smallint] AND c.confrelid = 'public.scholarships'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarships'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "saved_scholarships" ADD CONSTRAINT "saved_scholarships_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK saved_scholarships_scholarship_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.saved_universities'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.saved_universities'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "saved_universities" ADD CONSTRAINT "saved_universities_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK saved_universities_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.saved_universities'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.saved_universities'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "saved_universities" ADD CONSTRAINT "saved_universities_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK saved_universities_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.scholarship_decisions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarship_decisions'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "scholarship_decisions" ADD CONSTRAINT "scholarship_decisions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK scholarship_decisions_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.scholarship_decisions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarship_decisions'::regclass AND attname = 'scholarship_id')::smallint] AND c.confrelid = 'public.scholarships'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarships'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "scholarship_decisions" ADD CONSTRAINT "scholarship_decisions_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK scholarship_decisions_scholarship_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.scholarship_sources'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarship_sources'::regclass AND attname = 'scholarship_id')::smallint] AND c.confrelid = 'public.scholarships'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarships'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "scholarship_sources" ADD CONSTRAINT "scholarship_sources_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK scholarship_sources_scholarship_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.scholarship_sources'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarship_sources'::regclass AND attname = 'source_id')::smallint] AND c.confrelid = 'public.sources'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sources'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "scholarship_sources" ADD CONSTRAINT "scholarship_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK scholarship_sources_source_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.scholarships'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.scholarships'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK scholarships_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.site_visits'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.site_visits'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK site_visits_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_activities'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_activities'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK student_activities_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_checklist'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_checklist'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "student_checklist" ADD CONSTRAINT "student_checklist_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK student_checklist_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_checklist'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_checklist'::regclass AND attname = 'item_id')::smallint] AND c.confrelid = 'public.checklist_items'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.checklist_items'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "student_checklist" ADD CONSTRAINT "student_checklist_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "checklist_items" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK student_checklist_item_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_goals'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_goals'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK student_goals_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_goals'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_goals'::regclass AND attname = 'template_id')::smallint] AND c.confrelid = 'public.goal_templates'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.goal_templates'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "goal_templates" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK student_goals_template_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.student_profiles'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'referred_by')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK student_profiles_referred_by_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.study_plan_phases'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.study_plan_phases'::regclass AND attname = 'plan_id')::smallint] AND c.confrelid = 'public.study_plans'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.study_plans'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "study_plan_phases" ADD CONSTRAINT "study_plan_phases_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "study_plans" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK study_plan_phases_plan_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.study_plans'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.study_plans'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK study_plans_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.subscriptions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK subscriptions_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.subscriptions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'payment_id')::smallint] AND c.confrelid = 'public.payments'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.payments'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK subscriptions_payment_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.success_stories'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.success_stories'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "success_stories" ADD CONSTRAINT "success_stories_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK success_stories_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.telegram_links'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.telegram_links'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK telegram_links_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.telegram_login_requests'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.telegram_login_requests'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "telegram_login_requests" ADD CONSTRAINT "telegram_login_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK telegram_login_requests_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.telegram_messages'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.telegram_messages'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK telegram_messages_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.test_attempts'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.test_attempts'::regclass AND attname = 'test_plan_id')::smallint] AND c.confrelid = 'public.test_plans'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.test_plans'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_plan_id_fkey" FOREIGN KEY ("test_plan_id") REFERENCES "test_plans" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK test_attempts_test_plan_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.test_bookings'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.test_bookings'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "test_bookings" ADD CONSTRAINT "test_bookings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK test_bookings_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.test_plans'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.test_plans'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK test_plans_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.test_tasks'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.test_tasks'::regclass AND attname = 'test_plan_id')::smallint] AND c.confrelid = 'public.test_plans'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.test_plans'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "test_tasks" ADD CONSTRAINT "test_tasks_test_plan_id_fkey" FOREIGN KEY ("test_plan_id") REFERENCES "test_plans" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK test_tasks_test_plan_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.programs'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.programs'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "programs" ADD CONSTRAINT "programs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK programs_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.university_rankings'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.university_rankings'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "university_rankings" ADD CONSTRAINT "university_rankings_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK university_rankings_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.university_rankings'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.university_rankings'::regclass AND attname = 'source_id')::smallint] AND c.confrelid = 'public.sources'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sources'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "university_rankings" ADD CONSTRAINT "university_rankings_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK university_rankings_source_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.university_sources'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.university_sources'::regclass AND attname = 'university_id')::smallint] AND c.confrelid = 'public.universities'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.universities'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "university_sources" ADD CONSTRAINT "university_sources_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK university_sources_university_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.university_sources'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.university_sources'::regclass AND attname = 'source_id')::smallint] AND c.confrelid = 'public.sources'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.sources'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "university_sources" ADD CONSTRAINT "university_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE SET NULL; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK university_sources_source_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_badges'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_badges'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK user_badges_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_badges'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_badges'::regclass AND attname = 'badge_id')::smallint] AND c.confrelid = 'public.badges'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.badges'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK user_badges_badge_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_documents'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_documents'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK user_documents_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_points'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_points'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "user_points" ADD CONSTRAINT "user_points_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK user_points_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.user_sessions'::regclass AND c.contype = 'f' AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_sessions'::regclass AND attname = 'profile_id')::smallint] AND c.confrelid = 'public.student_profiles'::regclass AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_profiles'::regclass AND attname = 'id')::smallint]) THEN BEGIN ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "student_profiles" ("id") ON DELETE CASCADE; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'FK user_sessions_profile_id_fkey skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'ownership_transfers' AND c.conname = 'ownership_transfers_status_check') THEN BEGIN ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_status_check" CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'expired', 'cancelled')); EXCEPTION WHEN check_violation THEN RAISE NOTICE 'check ownership_transfers_status_check skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'ownership_transfers' AND c.conname = 'ownership_transfers_check') THEN BEGIN ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_check" CHECK (from_profile_id <> to_profile_id); EXCEPTION WHEN check_violation THEN RAISE NOTICE 'check ownership_transfers_check skipped: existing rows violate it'; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'platform_ownership' AND c.conname = 'platform_ownership_id_check') THEN BEGIN ALTER TABLE "platform_ownership" ADD CONSTRAINT "platform_ownership_id_check" CHECK (id = 1); EXCEPTION WHEN check_violation THEN RAISE NOTICE 'check platform_ownership_id_check skipped: existing rows violate it'; END; END IF; END $$;

-- ============================================================================
-- PART 5 — RLS (same logic as supabase/enable_rls.sql: anon/authenticated
-- lose access to everything except read-only universities + scholarships)
-- ============================================================================
DO $$
DECLARE
  r record;
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_auth boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  catalog text[] := ARRAY['universities', 'scholarships'];
BEGIN
  FOR r IN
    SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  LOOP
    IF r.owner <> current_user THEN
      RAISE NOTICE 'skipped public.% (owned by %, not %)', r.relname, r.owner, current_user;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname); END IF;
    IF has_auth THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', r.relname); END IF;
    IF r.relname = ANY (catalog) THEN
      EXECUTE format('DROP POLICY IF EXISTS public_catalog_read ON public.%I', r.relname);
      IF has_anon AND has_auth THEN
        EXECUTE format('CREATE POLICY public_catalog_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', r.relname);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', r.relname);
      ELSIF has_anon THEN
        EXECUTE format('CREATE POLICY public_catalog_read ON public.%I FOR SELECT TO anon USING (true)', r.relname);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', r.relname);
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- PART 6 — TEKSHIRUV: barcha jadvalda rls_enabled = true bo'lishi kerak
-- ============================================================================
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
