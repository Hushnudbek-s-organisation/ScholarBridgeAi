-- Add evidence-backed listings for the ten leading QS 2027 institutions.
WITH reviewed(university_id, university_name, name, field, degree_level, url, source_title) AS (
  VALUES
    (1, 'Massachusetts Institute of Technology (MIT)', 'Aerospace Engineering (Course 16)', 'Aerospace Engineering', 'Bachelor''s', 'https://catalog.mit.edu/degree-charts/aerospace-engineering-course-16/', 'MIT Course Catalog — Aerospace Engineering'),
    (2, 'Imperial College London', 'Aeronautical Engineering MEng', 'Aeronautical Engineering', 'Undergraduate', 'https://www.imperial.ac.uk/study/courses/undergraduate/aeronautical-engineering/', 'Imperial College London — Aeronautical Engineering MEng'),
    (2, 'Imperial College London', 'Electrical and Electronic Engineering MEng', 'Electrical Engineering', 'Undergraduate', 'https://www.imperial.ac.uk/study/courses/undergraduate/electrical-electronic-engineering-meng/', 'Imperial College London — Electrical and Electronic Engineering MEng'),
    (2, 'Imperial College London', 'Mechanical Engineering MEng', 'Mechanical Engineering', 'Undergraduate', 'https://www.imperial.ac.uk/study/courses/undergraduate/mechanical-engineering/', 'Imperial College London — Mechanical Engineering MEng'),
    (2, 'Imperial College London', 'Mathematics BSc', 'Mathematics', 'Undergraduate', 'https://www.imperial.ac.uk/study/courses/undergraduate/mathematics-bsc/', 'Imperial College London — Mathematics BSc'),
    (2, 'Imperial College London', 'Physics BSc', 'Physics', 'Undergraduate', 'https://www.imperial.ac.uk/study/courses/undergraduate/physics-bsc/', 'Imperial College London — Physics BSc'),
    (3, 'Stanford University', 'Bioengineering Major', 'Bioengineering', 'Bachelor''s', 'https://ughb.stanford.edu/majors-minors', 'Stanford School of Engineering — Undergraduate Majors'),
    (3, 'Stanford University', 'Electrical Engineering Major', 'Electrical Engineering', 'Bachelor''s', 'https://ughb.stanford.edu/majors-minors', 'Stanford School of Engineering — Undergraduate Majors'),
    (3, 'Stanford University', 'Chemical Engineering Major', 'Chemical Engineering', 'Bachelor''s', 'https://ughb.stanford.edu/majors-minors', 'Stanford School of Engineering — Undergraduate Majors'),
    (3, 'Stanford University', 'Management Science and Engineering Major', 'Management Science and Engineering', 'Bachelor''s', 'https://ughb.stanford.edu/majors-minors', 'Stanford School of Engineering — Undergraduate Majors'),
    (4, 'University of Oxford', 'Mathematics / Mathematics and Statistics', 'Mathematics', 'Undergraduate', 'https://www.ox.ac.uk/admissions/undergraduate/courses/undergraduate-course-listing-a-z', 'University of Oxford — Undergraduate course listings'),
    (4, 'University of Oxford', 'Physics', 'Physics', 'Undergraduate', 'https://www.ox.ac.uk/admissions/undergraduate/courses/undergraduate-course-listing-a-z', 'University of Oxford — Undergraduate course listings'),
    (4, 'University of Oxford', 'Engineering Science', 'Engineering', 'Undergraduate', 'https://www.ox.ac.uk/admissions/undergraduate/courses/undergraduate-course-listing-a-z', 'University of Oxford — Undergraduate course listings'),
    (4, 'University of Oxford', 'Chemistry', 'Chemistry', 'Undergraduate', 'https://www.ox.ac.uk/admissions/undergraduate/courses/undergraduate-course-listing-a-z', 'University of Oxford — Undergraduate course listings'),
    (5, 'Harvard University', 'Economics (Undergraduate Concentration)', 'Economics', 'Bachelor''s', 'https://college.harvard.edu/academics/liberal-arts-sciences/concentrations', 'Harvard College — Undergraduate Concentrations'),
    (5, 'Harvard University', 'Mathematics (Undergraduate Concentration)', 'Mathematics', 'Bachelor''s', 'https://college.harvard.edu/academics/liberal-arts-sciences/concentrations', 'Harvard College — Undergraduate Concentrations'),
    (5, 'Harvard University', 'Physics (Undergraduate Concentration)', 'Physics', 'Bachelor''s', 'https://college.harvard.edu/academics/liberal-arts-sciences/concentrations', 'Harvard College — Undergraduate Concentrations'),
    (5, 'Harvard University', 'Statistics (Undergraduate Concentration)', 'Statistics', 'Bachelor''s', 'https://college.harvard.edu/academics/liberal-arts-sciences/concentrations', 'Harvard College — Undergraduate Concentrations'),
    (6, 'University of Cambridge', 'Law, BA (Hons)', 'Law', 'Undergraduate', 'https://www.undergraduate.study.cam.ac.uk/courses/search', 'University of Cambridge — Undergraduate subjects'),
    (6, 'University of Cambridge', 'Economics, BA (Hons)', 'Economics', 'Undergraduate', 'https://www.undergraduate.study.cam.ac.uk/courses/search', 'University of Cambridge — Undergraduate subjects'),
    (6, 'University of Cambridge', 'Natural Sciences, BA (Hons) and MSci', 'Natural Sciences', 'Undergraduate', 'https://www.undergraduate.study.cam.ac.uk/courses/search', 'University of Cambridge — Undergraduate subjects'),
    (6, 'University of Cambridge', 'Engineering, BA (Hons) and MEng', 'Engineering', 'Undergraduate', 'https://www.undergraduate.study.cam.ac.uk/courses/search', 'University of Cambridge — Undergraduate subjects'),
    (10, 'California Institute of Technology (Caltech)', 'Physics Undergraduate Option', 'Physics', 'Bachelor''s', 'https://catalog.caltech.edu/current/general-information/education-and-research/', 'Caltech Academic Catalog — Undergraduate options'),
    (10, 'California Institute of Technology (Caltech)', 'Chemical Engineering Undergraduate Option', 'Chemical Engineering', 'Bachelor''s', 'https://catalog.caltech.edu/current/general-information/education-and-research/', 'Caltech Academic Catalog — Undergraduate options'),
    (10, 'California Institute of Technology (Caltech)', 'Electrical Engineering Undergraduate Option', 'Electrical Engineering', 'Bachelor''s', 'https://catalog.caltech.edu/current/general-information/education-and-research/', 'Caltech Academic Catalog — Undergraduate options'),
    (10, 'California Institute of Technology (Caltech)', 'Mechanical Engineering Undergraduate Option', 'Mechanical Engineering', 'Bachelor''s', 'https://catalog.caltech.edu/current/general-information/education-and-research/', 'Caltech Academic Catalog — Undergraduate options'),
    (7, 'ETH Zurich (Swiss Federal Institute of Technology)', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes.html', 'ETH Zurich — Bachelor’s degree programmes'),
    (7, 'ETH Zurich (Swiss Federal Institute of Technology)', 'Physics', 'Physics', 'Bachelor''s', 'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes.html', 'ETH Zurich — Bachelor’s degree programmes'),
    (7, 'ETH Zurich (Swiss Federal Institute of Technology)', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes.html', 'ETH Zurich — Bachelor’s degree programmes'),
    (7, 'ETH Zurich (Swiss Federal Institute of Technology)', 'Electrical Engineering and Information Technology', 'Electrical Engineering', 'Bachelor''s', 'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes.html', 'ETH Zurich — Bachelor’s degree programmes'),
    (9, 'University College London (UCL)', 'Economics BSc (Econ)', 'Economics', 'Undergraduate', 'https://www.ucl.ac.uk/prospective-students/undergraduate/degrees', 'UCL — Undergraduate degrees'),
    (9, 'University College London (UCL)', 'Medicine MBBS BSc', 'Medicine', 'Undergraduate', 'https://www.ucl.ac.uk/prospective-students/undergraduate/degrees', 'UCL — Undergraduate degrees'),
    (9, 'University College London (UCL)', 'Civil Engineering MEng', 'Civil Engineering', 'Undergraduate', 'https://www.ucl.ac.uk/prospective-students/undergraduate/degrees', 'UCL — Undergraduate degrees'),
    (9, 'University College London (UCL)', 'Management Science BSc', 'Management Science', 'Undergraduate', 'https://www.ucl.ac.uk/prospective-students/undergraduate/degrees', 'UCL — Undergraduate degrees'),
    (9, 'University College London (UCL)', 'Biomedical Engineering BEng', 'Biomedical Engineering', 'Undergraduate', 'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/biomedical-engineering-beng', 'UCL — Biomedical Engineering BEng'),
    (8, 'National University of Singapore (NUS)', 'Business Administration', 'Business Administration', 'Bachelor''s', 'https://nus.edu.sg/oam/undergraduate-programmes', 'National University of Singapore — Undergraduate programmes'),
    (8, 'National University of Singapore (NUS)', 'Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://nus.edu.sg/oam/undergraduate-programmes', 'National University of Singapore — Undergraduate programmes'),
    (8, 'National University of Singapore (NUS)', 'Data Science & Economics', 'Data Science', 'Bachelor''s', 'https://nus.edu.sg/oam/undergraduate-programmes', 'National University of Singapore — Undergraduate programmes'),
    (8, 'National University of Singapore (NUS)', 'Environmental Studies', 'Environmental Studies', 'Bachelor''s', 'https://nus.edu.sg/oam/undergraduate-programmes', 'National University of Singapore — Undergraduate programmes')
), eligible AS (
  SELECT r.* FROM reviewed r JOIN public.universities u
    ON u.id = r.university_id AND u.name = r.university_name AND u.is_active
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
  SELECT scope, 2, '2026-11-24 QS leading institutions programme review', now()
  FROM (VALUES ('catalogue'), ('evidence')) AS scopes(scope)
  WHERE EXISTS (SELECT 1 FROM published)
  ON CONFLICT (scope) DO UPDATE SET revision = public.cache_revisions.revision + 1,
    reason = EXCLUDED.reason, updated_at = EXCLUDED.updated_at
  RETURNING scope
)
SELECT (SELECT count(*) FROM eligible) AS reviewed,
       (SELECT count(*) FROM published) AS published,
       (SELECT count(*) FROM linked) AS linked,
       (SELECT count(*) FROM invalidated) AS cache_scopes;
