-- Scope: the reproducible 2026-11-01 synthetic batch and 14 reviewed programme listings.
-- Keep the original rows and links for review. Persist the previous publication flags in the audit log.
WITH reviewed(university_id, university_name, name, field, degree_level, url, source_title) AS (
  VALUES
    (217, 'The Hong Kong University of Science and Technology', 'BEng in Aerospace Engineering', 'Aerospace Engineering', 'Bachelor''s', 'https://join.hkust.edu.hk/our-programs/school-of-engineering/aerospace-engineering', 'HKUST Undergraduate Admissions — Aerospace Engineering'),
    (217, 'The Hong Kong University of Science and Technology', 'BEng in Bioengineering', 'Bioengineering', 'Bachelor''s', 'https://join.hkust.edu.hk/our-programs/school-of-engineering', 'HKUST Undergraduate Admissions — School of Engineering'),
    (217, 'The Hong Kong University of Science and Technology', 'BEng in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://join.hkust.edu.hk/our-programs/school-of-engineering', 'HKUST Undergraduate Admissions — School of Engineering'),
    (217, 'The Hong Kong University of Science and Technology', 'BSc in Data Science and Technology', 'Data Science', 'Bachelor''s', 'https://join.hkust.edu.hk/our-programs/school-of-engineering', 'HKUST Undergraduate Admissions — School of Engineering'),
    (217, 'The Hong Kong University of Science and Technology', 'BEng in Electronic Engineering', 'Electronic Engineering', 'Bachelor''s', 'https://join.hkust.edu.hk/our-programs/school-of-engineering', 'HKUST Undergraduate Admissions — School of Engineering'),
    (219, 'Northwestern University', 'Economics Major', 'Economics', 'Bachelor''s', 'https://catalogs.northwestern.edu/undergraduate/arts-sciences/economics/economics-major/', 'Northwestern Undergraduate Catalog — Economics Major'),
    (219, 'Northwestern University', 'Mathematics Major', 'Mathematics', 'Bachelor''s', 'https://admissions.northwestern.edu/academics/majors-minors/', 'Northwestern Undergraduate Admissions — Majors and Minors'),
    (219, 'Northwestern University', 'Physics Major', 'Physics', 'Bachelor''s', 'https://admissions.northwestern.edu/academics/majors-minors/', 'Northwestern Undergraduate Admissions — Majors and Minors'),
    (219, 'Northwestern University', 'Biomedical Engineering Major', 'Biomedical Engineering', 'Bachelor''s', 'https://admissions.northwestern.edu/academics/majors-minors/', 'Northwestern Undergraduate Admissions — Majors and Minors'),
    (302, 'Institut Polytechnique de Paris', 'Master in Computer Science', 'Computer Science', 'Master''s', 'https://www.ip-paris.fr/en/education/graduate-programs/masters-science/computer-science-program', 'Institut Polytechnique de Paris — Computer Science Program'),
    (302, 'Institut Polytechnique de Paris', 'Master in Economics', 'Economics', 'Master''s', 'https://www.ip-paris.fr/en/education/graduate-programs/masters-science/economics-program', 'Institut Polytechnique de Paris — Economics Program'),
    (302, 'Institut Polytechnique de Paris', 'Master in Physics', 'Physics', 'Master''s', 'https://www.ip-paris.fr/en/education/graduate-programs/masters-science/physics-program', 'Institut Polytechnique de Paris — Physics Program'),
    (302, 'Institut Polytechnique de Paris', 'Master in Civil Engineering', 'Civil Engineering', 'Master''s', 'https://www.ip-paris.fr/en/education/graduate-programs/masters-science/civil-engineering-program', 'Institut Polytechnique de Paris — Civil Engineering Program'),
    (302, 'Institut Polytechnique de Paris', 'Master in Electrical Engineering (E3A)', 'Electrical Engineering', 'Master''s', 'https://www.ip-paris.fr/en/education/graduate-programs/masters-science/electrical-engineering-program-e3a', 'Institut Polytechnique de Paris — Electrical Engineering Program (E3A)')
), eligible AS (
  SELECT r.* FROM reviewed r JOIN public.universities u
    ON u.id = r.university_id AND u.name = r.university_name AND u.is_active
), quarantined AS (
  UPDATE public.programs
  SET is_active = false, is_verified = false, verification_status = 'unverified'
  WHERE id BETWEEN 3036 AND 4615
    AND last_verified_at = TIMESTAMP '2026-11-01 16:37:53.675441'
    AND source_url ~ '^https://[^/]+/academics/[^/]+$'
    AND official_url = source_url AND is_active AND is_verified AND verification_status = 'verified'
  RETURNING id
), audited AS (
  INSERT INTO public.audit_logs (entity_type, entity_id, field_changed, old_value, new_value, source, actor, verification_status)
  SELECT 'program', id, 'publication_state',
    '{"is_active":true,"is_verified":true,"verification_status":"verified"}',
    '{"is_active":false,"is_verified":false,"verification_status":"unverified"}',
    '2026-11-24 official catalogue audit: repeated titles and generated URL paths', 'catalogue_review', 'unverified'
  FROM quarantined RETURNING id
), reviewed_sources AS (
  INSERT INTO public.sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
  SELECT DISTINCT url, source_title, split_part(url, '/', 3), 'official_programme', now(), true, true FROM eligible
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title, accessed_at = EXCLUDED.accessed_at, is_official = true, is_verified = true
  RETURNING id, url
), published AS (
  INSERT INTO public.programs (university_id, name, field, degree_level, official_url, source_url, last_verified_at, is_verified, verification_status, is_active)
  SELECT university_id, name, field, degree_level, url, url, now(), true, 'verified', true FROM eligible
  ON CONFLICT DO NOTHING RETURNING id, university_id, source_url
), linked AS (
  INSERT INTO public.program_sources (program_id, source_id, source_type)
  SELECT p.id, s.id, 'program_evidence' FROM published p JOIN reviewed_sources s ON s.url = p.source_url
  RETURNING program_id
), invalidated AS (
  INSERT INTO public.cache_revisions (scope, revision, reason, updated_at)
  SELECT scope, 2, '2026-11-24 programme evidence audit', now()
  FROM (VALUES ('catalogue'), ('evidence')) AS scopes(scope)
  WHERE EXISTS (SELECT 1 FROM quarantined) OR EXISTS (SELECT 1 FROM published)
  ON CONFLICT (scope) DO UPDATE SET revision = public.cache_revisions.revision + 1,
    reason = EXCLUDED.reason, updated_at = EXCLUDED.updated_at
  RETURNING scope
)
SELECT (SELECT count(*) FROM eligible) AS reviewed,
       (SELECT count(*) FROM quarantined) AS quarantined,
       (SELECT count(*) FROM audited) AS audited,
       (SELECT count(*) FROM published) AS published,
       (SELECT count(*) FROM linked) AS linked,
       (SELECT count(*) FROM invalidated) AS cache_scopes;
