-- Honest profile defaults — migration for EXISTING databases.
--
-- Why: `student_profiles` used to define fabricated answers as column
-- defaults — GPA 3.5, IELTS 7.0, TOEFL 95, SAT 1350, GRE 315,
-- budget 25 000 USD, target major "Computer Science", degree "Master",
-- a 4-country preference list and the activity list "Hackathon winner,
-- Peer Tutor, Student Council Vice President". A student who never entered
-- any of it still got a fully populated profile, so every score, match and
-- recommendation looked personalised for data nobody had provided.
--
-- This file removes the fabrication at the schema level: the columns stay,
-- but they are nullable and have no default, so NULL means "not provided
-- yet" (src/db/schema.ts is the source of truth; `npm run db:gen:full-schema`
-- regenerates the same shape for fresh installs).
--
-- Strictly widening: no DROP TABLE, no data change, no NOT NULL introduced.
-- Rows written by an older version keep their values — some of them are real
-- answers and silently guessing which is which would be worse than leaving
-- them; the fix is that no NEW row invents anything.
--
-- Safe to run more than once.

ALTER TABLE "student_profiles" ALTER COLUMN "degree_level" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "degree_level" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "target_major" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "target_major" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "gpa" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "gpa" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "gpa_scale" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "gpa_scale" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "ielts_score" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "toefl_score" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "sat_score" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "gre_score" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "budget_annual_usd" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "budget_annual_usd" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "preferred_countries" DROP NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "preferred_countries" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "extracurriculars" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "work_experience_years" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "need_scholarship" SET DEFAULT false;
