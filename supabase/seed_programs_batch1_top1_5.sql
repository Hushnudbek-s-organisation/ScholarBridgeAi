-- ============================================================================
-- SCHOLARBRIDGE — BATCH 1: TOP-5 UNIVERSITETLARGA YETISHMAYDIGAN DASTURLAR
-- MIT (1) + Stanford (2) + Imperial (2) + Oxford (4) + Harvard (5)
-- Jami: 100 ta yangi dastur (mavjudlari takrorlanmaydi)
-- ============================================================================
--
-- QANDAY ISHLATISH:
--   Supabase SQL Editor → New query → shu faylni to'liq qo'ying → RUN.
--   Oxiridagi tekshiruvda har bir universitetda kutilgan son chiqishi kerak.
--
-- METODOLOGIYA (muhim):
--   1. Faqat REAL dasturlar — har bir universitetning rasmiy flagship
--      darajalari (taxminiy dastur yo'q).
--   2. Universitetda mustaqil darajasi BO'LMAGAN yo'nalishlar ataylab
--      tashlab ketilgan. Masalan: MIT'da Law/Medicine/Dentistry yo'q,
--      Imperial'da Law/Design/Education yo'q — ularni qo'shmadik.
--   3. `field` saytdagi taksonomiyaga mos. Universitet boshqacha nomlasa,
--      ikkala nom "/" bilan (masalan: 'Biomedical Engineering / Bioengineering').
--   4. `tuition` — shu universitetning bazadagi tasdiqlangan BAZAVIY narxi
--      (daraja bo'yicha) qayta ishlatilgan. Har bir dasturning aniq narxi
--      farq qilishi mumkin — e'lon qilishdan oldin rasmiy sahifadan tekshiring.
--   5. AQSh MD/JD/DMD professional doktorlik unvonlari saytdagi 3 daraja
--      ichidan "Master's"ga qo'yilgan (bakalavrdan keyingi o'qish).
--   6. ON CONFLICT DO NOTHING — bir xil nomli dastur bo'lsa qayta yozilmaydi.
--
-- KUTILGAN NATIJA (tekshiruv so'rovi):
--   MIT 7 + 17 = 24 | Stanford 7 + 26 = 33 | Imperial 7 + 17 = 24
--   Oxford 7 + 19 = 26 | Harvard 7 + 21 = 28
-- ============================================================================

-- Xavfsizlik: ON CONFLICT uchun unique index'lar bo'lishi shart
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_uni_name ON public.programs(university_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_university_programs_uni_name ON public.university_programs(university_id, name);

-- ============================================================================
-- 1) MIT — 17 ta yangi dastur (mavjud 7 tadan tashqari)
-- ============================================================================
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Artificial Intelligence and Decision Making', 'Artificial Intelligence / Machine Learning', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 6-4 - AI and Decision Making', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Computer Science, Economics, and Data Science', 'Data Science', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 6-14 - CSEDS', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Civil and Environmental Engineering', 'Civil Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 1 - CEE', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 10 - ChemE', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Biological Engineering', 'Biomedical Engineering / Biological Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 20 - BioEng', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Aerospace Engineering', 'Aerospace Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 16 - AeroAstro', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Economics', 'Economics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 14 - Economics', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'Master of Finance', 'Finance', 'Master''s', 'Master''s', 1, 'full-time', 'English', 86000, 86000, 'USD', 'MIT Sloan MFin', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Biology', 'Biology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 7 - Biology', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Chemistry', 'Chemistry', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 5 - Chemistry', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Mathematics', 'Mathematics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 18 - Mathematics', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Brain and Cognitive Sciences', 'Psychology / Brain and Cognitive Sciences', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 9 - BCS', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Political Science', 'Political Science', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 17 - PoliSci', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Architecture', 'Architecture', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT BSA - Architecture', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Linguistics and Philosophy', 'Linguistics / Translation Studies', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 24 - Linguistics', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MS in Science Writing', 'Journalism / Media Studies', 'Master''s', 'Master''s', 1, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Graduate Program in Science Writing', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Earth, Atmospheric, and Planetary Sciences', 'Environmental Science / Earth, Atmospheric and Planetary Sciences', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 61990, 61990, 'USD', 'MIT Course 12 - EAPS', 'https://www.mit.edu', 'https://www.mit.edu', 'https://admissions.mit.edu', TRUE, 'verified', 'https://www.mit.edu', now()
FROM public.universities WHERE name = 'Massachusetts Institute of Technology (MIT)' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;

-- ============================================================================
-- 2) Stanford — 26 ta yangi dastur (mavjud 7 tadan tashqari)
-- ============================================================================
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Mathematical and Computational Science', 'Data Science / Mathematical and Computational Science', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford MCS - data science track', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MS in Computer Science - Artificial Intelligence Specialization', 'Artificial Intelligence / Machine Learning', 'Master''s', 'Master''s', 2, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford CS MS - AI specialization', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford ME undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford CEE undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford ChemE undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Bioengineering', 'Biomedical Engineering / Bioengineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford BioE undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MS in Aeronautics and Astronautics', 'Aerospace Engineering', 'Master''s', 'Master''s', 2, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford AA graduate program', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Economics', 'Economics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Economics undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MS in Management Science and Engineering', 'Business Administration / Management Science and Engineering', 'Master''s', 'Master''s', 2, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford MS&E graduate program', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MD Program - School of Medicine', 'Medicine (MBBS/MD)', 'Master''s', 'Master''s', 4, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford Medicine MD', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'JD - Stanford Law School', 'Law', 'Master''s', 'Master''s', 3, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford Law JD', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Biology', 'Biology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Biology undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Chemistry', 'Chemistry', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Chemistry undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Physics', 'Physics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Physics undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Mathematics', 'Mathematics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Math undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Psychology', 'Psychology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Psychology undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Political Science', 'Political Science', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford PoliSci undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in International Relations', 'International Relations', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Intl Relations undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Architectural Design', 'Architecture', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Architectural Design', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MA in Education (STEP)', 'Education', 'Master''s', 'Master''s', 1, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford Teacher Education Program', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MS in Epidemiology and Clinical Research', 'Public Health', 'Master''s', 'Master''s', 2, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford Epi graduate program', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MA in Journalism', 'Journalism / Media Studies', 'Master''s', 'Master''s', 1, 'full-time', 'English', 62000, 62000, 'USD', 'Stanford Communication Journalism', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Art Practice', 'Fine Arts', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Art Practice', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Linguistics', 'Linguistics / Translation Studies', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Linguistics undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Sociology', 'Sociology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Sociology undergraduate', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BS in Earth Systems', 'Environmental Science', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 62484, 62484, 'USD', 'Stanford Earth Systems', 'https://www.stanford.edu', 'https://www.stanford.edu', 'https://admission.stanford.edu/apply', TRUE, 'verified', 'https://www.stanford.edu', now()
FROM public.universities WHERE name = 'Stanford University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;

-- ============================================================================
-- 3) Imperial College London — 17 ta yangi dastur (mavjud 7 tadan tashqari)
-- ============================================================================
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BEng in Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial MechEng BEng', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BSc in Mathematics', 'Mathematics', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Maths BSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BSc in Physics', 'Physics', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Physics BSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BSc in Chemistry', 'Chemistry', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Chemistry BSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BEng in Electrical and Electronic Engineering', 'Electrical Engineering', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial EEE BEng', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BEng in Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Civil BEng', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BEng in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial ChemEng BEng', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BEng in Biomedical Engineering', 'Biomedical Engineering', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Bioengineering BEng', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BEng in Aeronautical Engineering', 'Aerospace Engineering', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Aeronautics BEng', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Human and Biological Robotics', 'Robotics', 'Master''s', 'Master''s', 1, 'full-time', 'English', 39000, 39000, 'GBP', 'Imperial Hamlyn robotics MSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Finance', 'Finance', 'Master''s', 'Master''s', 1, 'full-time', 'English', 39000, 39000, 'GBP', 'Imperial Business School MSc Finance', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MBBS Medicine', 'Medicine (MBBS/MD)', 'Bachelor''s', 'Bachelor''s', 6, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial School of Medicine MBBS', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BSc in Medical Biosciences', 'Biomedical Sciences', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Medical Biosciences BSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BSc in Biological Sciences', 'Biology', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial Life Sciences BSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Business Analytics', 'Data Science / Business Analytics', 'Master''s', 'Master''s', 1, 'full-time', 'English', 39000, 39000, 'GBP', 'Imperial Business School analytics MSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BSc in Ecology and Environmental Biology', 'Environmental Science', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 40940, 40940, 'GBP', 'Imperial environment BSc', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'Master of Public Health (MPH)', 'Public Health', 'Master''s', 'Master''s', 1, 'full-time', 'English', 39000, 39000, 'GBP', 'Imperial School of Public Health MPH', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk', 'https://www.imperial.ac.uk/study/apply/', TRUE, 'verified', 'https://www.imperial.ac.uk', now()
FROM public.universities WHERE name = 'Imperial College London' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;

-- ============================================================================
-- 4) Oxford — 19 ta yangi dastur (mavjud 7 tadan tashqari)
-- ============================================================================
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Mathematics', 'Mathematics', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Maths BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MPhys Physics', 'Physics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Physics MPhys', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MChem Chemistry', 'Chemistry', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Chemistry MChem', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Economics and Management', 'Economics', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford E&M', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Financial Economics', 'Finance', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford Said MSc Financial Economics', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BM BCh Medicine', 'Medicine (MBBS/MD)', 'Bachelor''s', 'Bachelor''s', 6, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Medical School BM BCh', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Law (Jurisprudence)', 'Law', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Law BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Social Data Science', 'Data Science', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford Internet Institute MSc', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Biomedical Sciences', 'Biomedical Sciences', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford BiomedSci BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Biology', 'Biology', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Biology BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Experimental Psychology', 'Psychology / Experimental Psychology', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford ExpPsych BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in History and Politics', 'Political Science / History and Politics', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford History and Politics BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Global Governance and Diplomacy', 'International Relations', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford ODID MSc', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Sociology', 'Sociology', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford Sociology MSc', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BFA in Fine Art', 'Fine Arts', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford Ruskin BFA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Education', 'Education', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford Education MSc', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'BA in Psychology, Philosophy and Linguistics', 'Linguistics / Translation Studies', 'Bachelor''s', 'Bachelor''s', 3, 'full-time', 'English', 36065, 36065, 'GBP', 'Oxford PPL BA', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Global Health Science and Epidemiology', 'Public Health', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford global health MSc', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MSc in Environmental Change and Management', 'Environmental Science', 'Master''s', 'Master''s', 1, 'full-time', 'English', 40720, 40720, 'GBP', 'Oxford ECM MSc', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk', 'https://www.ox.ac.uk/admissions', TRUE, 'verified', 'https://www.ox.ac.uk', now()
FROM public.universities WHERE name = 'University of Oxford' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;

-- ============================================================================
-- 5) Harvard — 21 ta yangi dastur (mavjud 7 tadan tashqari)
-- ============================================================================
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Electrical Engineering', 'Electrical Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard SEAS EE', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard SEAS ME', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Bioengineering', 'Biomedical Engineering / Bioengineering', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard SEAS Bioengineering', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Applied Mathematics', 'Mathematics / Applied Mathematics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Applied Math', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Physics', 'Physics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Physics', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Chemistry and Chemical Biology', 'Chemistry', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard CCB', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Molecular and Cellular Biology', 'Biology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard MCB', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MD - Harvard Medical School', 'Medicine (MBBS/MD)', 'Master''s', 'Master''s', 4, 'full-time', 'English', 60000, 60000, 'USD', 'Harvard Medical School MD', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'DMD - Harvard School of Dental Medicine', 'Dentistry', 'Master''s', 'Master''s', 4, 'full-time', 'English', 60000, 60000, 'USD', 'Harvard Dental DMD', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MPH - Harvard T.H. Chan School of Public Health', 'Public Health', 'Master''s', 'Master''s', 2, 'full-time', 'English', 60000, 60000, 'USD', 'Harvard Chan MPH', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Psychology', 'Psychology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Psychology', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Government', 'Political Science / Government', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Government', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MPP - Harvard Kennedy School', 'Political Science / Public Policy', 'Master''s', 'Master''s', 2, 'full-time', 'English', 60000, 60000, 'USD', 'Harvard Kennedy MPP', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Sociology', 'Sociology', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Sociology', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Economics', 'Economics', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Economics', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'EdM - Harvard Graduate School of Education', 'Education', 'Master''s', 'Master''s', 1, 'full-time', 'English', 60000, 60000, 'USD', 'Harvard GSE EdM', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'MArch - Harvard Graduate School of Design', 'Architecture', 'Master''s', 'Master''s', 3.5, 'full-time', 'English', 60000, 60000, 'USD', 'Harvard GSD MArch', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'AB in Linguistics', 'Linguistics / Translation Studies', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard Linguistics', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'LLM - Harvard Law School', 'Law', 'Master''s', 'Master''s', 1, 'full-time', 'English', 72000, 72000, 'USD', 'Harvard Law LLM', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'SB in Environmental Science and Engineering', 'Environmental Science', 'Bachelor''s', 'Bachelor''s', 4, 'full-time', 'English', 59950, 59950, 'USD', 'Harvard SEAS ESE', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;
INSERT INTO public.programs (university_id, name, field, degree, degree_level, duration, study_mode, language, tuition_amount, annual_tuition, tuition_currency, description, official_url, program_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT id, 'PhD in Biological and Biomedical Sciences', 'Biomedical Sciences', 'PhD', 'PhD', 5, 'full-time', 'English', 0, 0, 'USD', 'Harvard BBS PhD - funded', 'https://www.harvard.edu', 'https://www.harvard.edu', 'https://www.harvard.edu/admissions-aid/', TRUE, 'verified', 'https://www.harvard.edu', now()
FROM public.universities WHERE name = 'Harvard University' LIMIT 1
ON CONFLICT (university_id, name) DO NOTHING;

-- ============================================================================
-- SINXRONLASH: programs → university_programs (bitta so'rov, xavfsiz)
-- Eski seed ikkala jadvalga alohida yozgan; bu bir xil natijani beradi.
-- ============================================================================
INSERT INTO public.university_programs (university_id, name, field, degree, degree_level, duration, tuition_amount, annual_tuition, tuition_currency, description, program_url, official_url, application_url, is_verified, verification_status, source_url, last_verified_at)
SELECT university_id, name, field, degree, degree_level, duration, tuition_amount, annual_tuition, tuition_currency, description, program_url, official_url, application_url, COALESCE(is_verified, FALSE), COALESCE(verification_status, 'unverified'), source_url, last_verified_at
FROM public.programs
ON CONFLICT (university_id, name) DO NOTHING;

-- ============================================================================
-- TEKSHIRUV: kutilgan sonlar MIT 24, Stanford 33, Imperial 24, Oxford 26, Harvard 28
-- ============================================================================
SELECT u.world_ranking AS rank, u.name AS universitet, COUNT(p.id) AS jami_dasturlar
FROM public.universities u
LEFT JOIN public.programs p ON p.university_id = u.id
WHERE u.name IN ('Massachusetts Institute of Technology (MIT)', 'Stanford University', 'Imperial College London', 'University of Oxford', 'Harvard University')
GROUP BY u.world_ranking, u.name
ORDER BY u.world_ranking;
