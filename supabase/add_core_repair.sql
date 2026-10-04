-- ============================================================================
-- ScholarBridge — CORE SCHEMA REPAIR (generated, do not edit by hand)
-- ============================================================================
-- Mirror of src/lib/core/ddl.ts — regenerate with:
--   npx tsx scripts/gen-core-repair-sql.ts
--
-- WHY: production never runs `drizzle-kit push` (see render.yaml /
-- DEPLOYMENT.md). Some base tables and columns were added to
-- src/db/schema.ts without a `supabase/add_*.sql` patch — for example
-- student_profiles.is_admin, which makes every authenticated request fail
-- (column does not exist) and the dashboard show
-- "We could not load your dashboard". The app repairs this drift itself on
-- first use; run this file only if you prefer to do it manually.
--
-- SAFE: additive only — CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
-- No DROP, no RENAME, no type change. Re-running changes nothing.
-- ============================================================================


-- ============================================================================
-- 1) TABLES — created only when they are missing entirely.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "student_profiles" ("id" serial PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text UNIQUE NOT NULL, "password_hash" text, "degree_level" text NOT NULL DEFAULT 'Master', "target_major" text NOT NULL DEFAULT 'Computer Science', "study_interests" text, "gpa" double precision NOT NULL DEFAULT 3.5, "gpa_scale" double precision NOT NULL DEFAULT 4, "ielts_score" double precision DEFAULT 7, "toefl_score" integer DEFAULT 95, "sat_score" integer DEFAULT 1350, "gre_score" integer DEFAULT 315, "budget_annual_usd" integer NOT NULL DEFAULT 25000, "preferred_countries" text NOT NULL DEFAULT '["United States", "United Kingdom", "Canada", "Germany"]', "need_scholarship" boolean NOT NULL DEFAULT TRUE, "extracurriculars" text DEFAULT 'Hackathon winner, Peer Tutor, Student Council Vice President', "work_experience_years" integer DEFAULT 1, "research_publications" integer DEFAULT 0, "preferred_locale" text NOT NULL DEFAULT 'en', "is_admin" boolean NOT NULL DEFAULT FALSE, "referral_code" text UNIQUE, "referred_by" integer, "referral_points" integer NOT NULL DEFAULT 0, "referral_rewarded" boolean NOT NULL DEFAULT FALSE, "is_premium" boolean NOT NULL DEFAULT FALSE, "premium_until" timestamp, "parent_share_enabled" boolean NOT NULL DEFAULT FALSE, "parent_share_email" text, "parent_share_token" text, "parent_share_created_at" timestamp, "act_score" integer, "duolingo_score" integer, "ap_courses" text, "ib_courses" text, "a_level_subjects" text, "coursework_notes" text, "country" text, "age" integer, "graduation_year" integer, "family_income_usd" integer, "needs_financial_aid" boolean, "requires_full_scholarship" boolean, "leadership" text, "volunteering" text, "sports" text, "clubs" text, "research_experience" text, "projects" text, "olympiads" text, "awards" text, "competitions" text, "certificates" text, "target_universities" text, "career_goal" text, "data_share_consent" boolean NOT NULL DEFAULT FALSE, "data_share_consent_at" timestamp, "onboarding_step" integer NOT NULL DEFAULT 0, "onboarding_completed" boolean NOT NULL DEFAULT FALSE, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "universities" ("id" serial PRIMARY KEY NOT NULL, "name" text NOT NULL, "country" text NOT NULL, "city" text, "flag_emoji" text NOT NULL DEFAULT '🌐', "world_ranking" integer, "degree_level" text NOT NULL DEFAULT 'All', "program_major" text, "canonical_name" text, "short_name" text, "country_code" text, "qs_rank_year" integer, "data_source" text, "annual_tuition_usd" integer, "annual_living_est_usd" integer, "accommodation_cost_usd" integer, "annual_tuition" numeric, "tuition_currency" text NOT NULL DEFAULT 'USD', "tuition_period" text NOT NULL DEFAULT 'year', "annual_living_est" numeric, "living_cost_currency" text NOT NULL DEFAULT 'USD', "living_cost_period" text NOT NULL DEFAULT 'year', "accommodation_cost" numeric, "accommodation_cost_currency" text NOT NULL DEFAULT 'USD', "accommodation_cost_period" text NOT NULL DEFAULT 'year', "application_fee" integer, "application_fee_currency" text NOT NULL DEFAULT 'USD', "min_gpa" double precision, "min_ielts" double precision, "min_sat" integer, "acceptance_rate" double precision, "post_study_work_visa_years" double precision, "founded_year" integer, "university_type" text, "address" text, "international_students_count" integer, "international_students_percentage" double precision, "official_website_url" text, "admissions_url" text, "international_admissions_url" text, "undergraduate_admissions_url" text, "application_url" text, "description" text NOT NULL, "highlights" text NOT NULL DEFAULT '[]', "website_url" text NOT NULL, "image_url" text, "source_url" text, "last_verified_at" timestamp, "verification_status" text NOT NULL DEFAULT 'unverified', "source_reliability" integer NOT NULL DEFAULT 7, "is_active" boolean NOT NULL DEFAULT TRUE);

CREATE TABLE IF NOT EXISTS "scholarships" ("id" serial PRIMARY KEY NOT NULL, "title" text NOT NULL, "provider" text NOT NULL, "country" text NOT NULL, "coverage_type" text NOT NULL DEFAULT 'Unspecified', "amount_usd_value" integer, "award_amount" numeric, "award_currency" text, "award_period" text, "award_basis" text, "deadline" text, "degree_levels" text NOT NULL DEFAULT '[]', "eligible_majors" text NOT NULL DEFAULT '[]', "min_gpa" double precision, "min_ielts" double precision, "financial_need_based" boolean DEFAULT FALSE, "merit_based" boolean DEFAULT TRUE, "description" text NOT NULL, "requirements" text NOT NULL, "website_url" text NOT NULL, "university_id" integer, "eligible_countries" text DEFAULT '[]', "funding_type" text DEFAULT '', "tuition_coverage" text DEFAULT '', "living_allowance" integer, "travel_allowance" integer, "accommodation" text DEFAULT '', "application_fee" integer, "english_requirements" text DEFAULT '', "required_documents" text DEFAULT '[]', "application_url" text, "opening_date" date, "deadline_date" date, "deadline_type" text NOT NULL DEFAULT 'unknown', "deadline_range_start" date, "deadline_range_end" date, "rounds" text DEFAULT '[]', "recurrence" text NOT NULL DEFAULT 'none', "expected_opening_period" text, "expected_deadline_period" text, "application_status" text NOT NULL DEFAULT 'unknown', "last_verified_at" timestamp, "last_updated_at" timestamp, "verification_status" text NOT NULL DEFAULT 'unverified', "source_reliability" integer NOT NULL DEFAULT 7, "source_url" text, "notes" text, "is_active" boolean NOT NULL DEFAULT TRUE);
CREATE INDEX IF NOT EXISTS "idx_scholarships_university" ON "scholarships" ("university_id");

CREATE TABLE IF NOT EXISTS "applications" ("id" serial PRIMARY KEY NOT NULL, "profile_id" integer NOT NULL, "university_id" integer, "university_name" text NOT NULL DEFAULT '', "program_name" text, "application_round" text, "intake_term" text, "deadline" date, "status" text NOT NULL DEFAULT 'not_started', "submitted_at" timestamp, "application_fee_paid" boolean NOT NULL DEFAULT FALSE, "fee_amount" integer, "portal_url" text, "notes" text, "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "idx_applications_profile" ON "applications" ("profile_id");
CREATE INDEX IF NOT EXISTS "idx_applications_university" ON "applications" ("university_id");
CREATE INDEX IF NOT EXISTS "idx_applications_deadline" ON "applications" ("deadline");

CREATE TABLE IF NOT EXISTS "saved_universities" ("id" serial PRIMARY KEY NOT NULL, "profile_id" integer NOT NULL, "university_id" integer NOT NULL, "match_category" text NOT NULL DEFAULT 'Match', "match_score" integer NOT NULL DEFAULT 85, "status" text NOT NULL DEFAULT 'Shortlisted', "notes" text DEFAULT '', "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "saved_scholarships" ("id" serial PRIMARY KEY NOT NULL, "profile_id" integer NOT NULL, "scholarship_id" integer NOT NULL, "status" text NOT NULL DEFAULT 'Saved', "notes" text DEFAULT '', "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "ai_evaluations" ("id" serial PRIMARY KEY NOT NULL, "profile_id" integer NOT NULL, "evaluation_type" text NOT NULL DEFAULT 'Profile Analysis', "content" text NOT NULL, "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "essay_versions" ("id" serial PRIMARY KEY NOT NULL, "profile_id" integer NOT NULL, "university_id" integer, "essay_type" text NOT NULL DEFAULT 'sop', "title" text NOT NULL DEFAULT '', "content" text NOT NULL DEFAULT '', "word_count" integer NOT NULL DEFAULT 0, "char_count" integer NOT NULL DEFAULT 0, "version_number" integer NOT NULL DEFAULT 1, "rubric_hook" integer, "rubric_structure" integer, "rubric_specificity" integer, "rubric_language" integer, "rubric_fit" integer, "rubric_total" integer, "ai_feedback" text, "open_for_review" boolean NOT NULL DEFAULT FALSE, "created_at" timestamp NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "idx_essay_versions_profile" ON "essay_versions" ("profile_id");
CREATE INDEX IF NOT EXISTS "idx_essay_versions_profile_type" ON "essay_versions" ("profile_id", "essay_type", "version_number");

CREATE TABLE IF NOT EXISTS "opportunities" ("id" serial PRIMARY KEY NOT NULL, "type" text NOT NULL DEFAULT 'competition', "title" text NOT NULL, "provider" text NOT NULL DEFAULT '', "country" text, "fields" text NOT NULL DEFAULT '["All"]', "level" text NOT NULL DEFAULT 'any', "deadline_date" date, "url" text NOT NULL DEFAULT '', "description" text NOT NULL DEFAULT '', "is_verified" boolean NOT NULL DEFAULT FALSE, "created_at" timestamp NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "idx_opportunities_type" ON "opportunities" ("type");
CREATE INDEX IF NOT EXISTS "idx_opportunities_deadline" ON "opportunities" ("deadline_date");

CREATE TABLE IF NOT EXISTS "notifications" ("id" serial PRIMARY KEY NOT NULL, "profile_id" integer NOT NULL, "type" text NOT NULL, "title" text NOT NULL, "body" text NOT NULL, "link" text, "is_read" boolean NOT NULL DEFAULT FALSE, "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "programs" ("id" serial PRIMARY KEY NOT NULL, "university_id" integer NOT NULL, "name" text NOT NULL, "field" text, "degree_level" text, "duration" numeric, "duration_unit" text NOT NULL DEFAULT 'years', "study_mode" text, "language" text, "annual_tuition" numeric, "tuition_currency" text NOT NULL DEFAULT 'USD', "tuition_period" text NOT NULL DEFAULT 'year', "description" text, "official_url" text, "application_url" text, "is_verified" boolean NOT NULL DEFAULT FALSE, "source_url" text, "last_verified_at" timestamp, "is_active" boolean NOT NULL DEFAULT TRUE, "verification_status" text NOT NULL DEFAULT 'unverified', "created_at" timestamp NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "idx_programs_university" ON "programs" ("university_id");

CREATE TABLE IF NOT EXISTS "sources" ("id" serial PRIMARY KEY NOT NULL, "url" text NOT NULL, "title" text NOT NULL, "domain" text, "source_type" text NOT NULL DEFAULT 'unclassified', "accessed_at" timestamp, "is_official" boolean NOT NULL DEFAULT FALSE, "is_verified" boolean NOT NULL DEFAULT FALSE, "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "program_sources" ("id" serial PRIMARY KEY NOT NULL, "program_id" integer NOT NULL, "source_id" integer, "source_type" text NOT NULL DEFAULT 'program_evidence', "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "scholarship_sources" ("id" serial PRIMARY KEY NOT NULL, "scholarship_id" integer NOT NULL, "source_id" integer, "source_type" text NOT NULL DEFAULT 'scholarship_evidence', "created_at" timestamp NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS "university_sources" ("id" serial PRIMARY KEY NOT NULL, "university_id" integer NOT NULL, "source_id" integer, "source_type" text NOT NULL DEFAULT 'university_evidence');

CREATE TABLE IF NOT EXISTS "application_cycles" ("id" serial PRIMARY KEY NOT NULL, "university_id" integer NOT NULL, "program_id" integer, "academic_year" text, "intake" text, "application_type" text, "opening_date" date, "deadline" date, "deadline_timezone" text, "application_fee" numeric, "application_fee_currency" text NOT NULL DEFAULT 'USD', "application_url" text, "source_url" text, "source_id" integer, "last_verified_at" timestamp, "verification_status" text NOT NULL DEFAULT 'unverified');
CREATE INDEX IF NOT EXISTS "idx_application_cycles_university_year" ON "application_cycles" ("university_id", "academic_year");
CREATE INDEX IF NOT EXISTS "idx_application_cycles_program" ON "application_cycles" ("program_id");

CREATE TABLE IF NOT EXISTS "program_requirements" ("id" serial PRIMARY KEY NOT NULL, "program_id" integer NOT NULL, "min_ielts" double precision, "min_toefl" double precision, "min_det" double precision, "min_sat" integer, "min_act" integer, "min_gpa" double precision, "ib_requirement" text, "a_level_requirement" text, "ap_requirement" text, "subject_requirements" text, "portfolio_required" boolean NOT NULL DEFAULT FALSE, "interview_required" boolean NOT NULL DEFAULT FALSE, "recommendation_required" boolean NOT NULL DEFAULT FALSE, "personal_statement_required" boolean NOT NULL DEFAULT FALSE, "other_requirements" text, "academic_year" text, "source_url" text, "last_verified_at" timestamp, "verification_status" text NOT NULL DEFAULT 'unverified');
CREATE INDEX IF NOT EXISTS "idx_program_requirements_program" ON "program_requirements" ("program_id");

CREATE TABLE IF NOT EXISTS "ai_provider_credentials" ("id" serial PRIMARY KEY NOT NULL, "provider" text UNIQUE NOT NULL, "api_key_enc" text, "model" text, "updated_at" timestamp NOT NULL DEFAULT now());


-- ============================================================================
-- 2) COLUMNS — added only when they are missing (old databases).
-- ============================================================================

-- ---------- student_profiles ----------
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "degree_level" text DEFAULT 'Master';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "target_major" text DEFAULT 'Computer Science';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "study_interests" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "gpa" double precision DEFAULT 3.5;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "gpa_scale" double precision DEFAULT 4;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "ielts_score" double precision DEFAULT 7;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "toefl_score" integer DEFAULT 95;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "sat_score" integer DEFAULT 1350;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "gre_score" integer DEFAULT 315;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "budget_annual_usd" integer DEFAULT 25000;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "preferred_countries" text DEFAULT '["United States", "United Kingdom", "Canada", "Germany"]';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "need_scholarship" boolean DEFAULT TRUE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "extracurriculars" text DEFAULT 'Hackathon winner, Peer Tutor, Student Council Vice President';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "work_experience_years" integer DEFAULT 1;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "research_publications" integer DEFAULT 0;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "preferred_locale" text DEFAULT 'en';
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referral_code" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referred_by" integer;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referral_points" integer DEFAULT 0;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "referral_rewarded" boolean DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "premium_until" timestamp;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "parent_share_enabled" boolean DEFAULT FALSE;
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
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "data_share_consent" boolean DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "data_share_consent_at" timestamp;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 0;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT FALSE;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- ---------- universities ----------
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "flag_emoji" text DEFAULT '🌐';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "world_ranking" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "degree_level" text DEFAULT 'All';
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
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "tuition_currency" text DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "tuition_period" text DEFAULT 'year';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "annual_living_est" numeric;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "living_cost_currency" text DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "living_cost_period" text DEFAULT 'year';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost" numeric;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost_currency" text DEFAULT 'USD';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "accommodation_cost_period" text DEFAULT 'year';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "application_fee" integer;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "application_fee_currency" text DEFAULT 'USD';
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
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "highlights" text DEFAULT '[]';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "website_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified';
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "source_reliability" integer DEFAULT 7;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT TRUE;

-- ---------- scholarships ----------
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "coverage_type" text DEFAULT 'Unspecified';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "amount_usd_value" integer;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_amount" numeric;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_currency" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_period" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "award_basis" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "degree_levels" text DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "eligible_majors" text DEFAULT '[]';
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
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_type" text DEFAULT 'unknown';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_range_start" date;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "deadline_range_end" date;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "rounds" text DEFAULT '[]';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "recurrence" text DEFAULT 'none';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "expected_opening_period" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "expected_deadline_period" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "application_status" text DEFAULT 'unknown';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "last_updated_at" timestamp;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified';
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "source_reliability" integer DEFAULT 7;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "scholarships" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT TRUE;

-- ---------- applications ----------
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "university_name" text DEFAULT '';
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "program_name" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "application_round" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "intake_term" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "deadline" date;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'not_started';
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "application_fee_paid" boolean DEFAULT FALSE;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "fee_amount" integer;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "portal_url" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- ---------- saved_universities ----------
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "match_category" text DEFAULT 'Match';
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "match_score" integer DEFAULT 85;
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'Shortlisted';
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '';
ALTER TABLE "saved_universities" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- saved_scholarships ----------
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "scholarship_id" integer;
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'Saved';
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '';
ALTER TABLE "saved_scholarships" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- ai_evaluations ----------
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "evaluation_type" text DEFAULT 'Profile Analysis';
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "ai_evaluations" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- essay_versions ----------
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "essay_type" text DEFAULT 'sop';
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "title" text DEFAULT '';
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "content" text DEFAULT '';
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "word_count" integer DEFAULT 0;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "char_count" integer DEFAULT 0;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "version_number" integer DEFAULT 1;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_hook" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_structure" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_specificity" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_language" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_fit" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "rubric_total" integer;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "ai_feedback" text;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "open_for_review" boolean DEFAULT FALSE;
ALTER TABLE "essay_versions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- opportunities ----------
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'competition';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT '';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "fields" text DEFAULT '["All"]';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "level" text DEFAULT 'any';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "deadline_date" date;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "url" text DEFAULT '';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT FALSE;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- notifications ----------
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "profile_id" integer;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT FALSE;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- programs ----------
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "field" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "degree_level" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "duration" numeric;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "duration_unit" text DEFAULT 'years';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "study_mode" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "language" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "annual_tuition" numeric;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "tuition_currency" text DEFAULT 'USD';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "tuition_period" text DEFAULT 'year';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "official_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "application_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT FALSE;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT TRUE;
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified';
ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- sources ----------
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "url" text;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "domain" text;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'unclassified';
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "accessed_at" timestamp;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "is_official" boolean DEFAULT FALSE;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT FALSE;
ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- program_sources ----------
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "program_id" integer;
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'program_evidence';
ALTER TABLE "program_sources" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- scholarship_sources ----------
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "scholarship_id" integer;
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'scholarship_evidence';
ALTER TABLE "scholarship_sources" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- ---------- university_sources ----------
ALTER TABLE "university_sources" ADD COLUMN IF NOT EXISTS "university_id" integer;
ALTER TABLE "university_sources" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "university_sources" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'university_evidence';

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
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "application_fee_currency" text DEFAULT 'USD';
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "application_url" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "source_id" integer;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "application_cycles" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified';

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
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "portfolio_required" boolean DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "interview_required" boolean DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "recommendation_required" boolean DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "personal_statement_required" boolean DEFAULT FALSE;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "other_requirements" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "academic_year" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp;
ALTER TABLE "program_requirements" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'unverified';

-- ---------- ai_provider_credentials ----------
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "api_key_enc" text;
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "model" text;
ALTER TABLE "ai_provider_credentials" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
