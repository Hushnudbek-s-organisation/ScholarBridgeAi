-- Verified undergraduate programme identities from institutional sources; unverified fields remain unset.
WITH reviewed(university_id, university_name, name, field, degree_level, url, source_title, language) AS (
  VALUES
    (12, 'University of Chicago', 'Economics Major', 'Economics', 'Bachelor''s', 'https://economics.uchicago.edu/undergraduate-study', 'University of Chicago — Undergraduate Economics', NULL),
    (12, 'University of Chicago', 'Computer Science Major', 'Computer Science', 'Bachelor''s', 'https://cs.uchicago.edu/academics/undergraduate/program-overview/', 'University of Chicago — Computer Science Undergraduate Program', NULL),
    (12, 'University of Chicago', 'Mathematics Major', 'Mathematics', 'Bachelor''s', 'https://mathematics.uchicago.edu/undergraduate/', 'University of Chicago — Mathematics Undergraduate Study', NULL),
    (12, 'University of Chicago', 'Physics Major', 'Physics', 'Bachelor''s', 'https://physics.uchicago.edu/academics/undergraduate-programs/', 'University of Chicago — Undergraduate Physics', NULL),
    (238, 'National Tsing Hua University', 'International Bachelor Degree Program — Education and Learning Sciences', 'Education', 'Bachelor''s', 'https://apply.nthu.edu.tw/en/faq/list', 'National Tsing Hua University — International Undergraduate FAQ', 'English'),
    (227, 'Tongji University', 'Architecture (International Class)', 'Architecture', 'Bachelor''s', 'https://study.tongji.edu.cn/__local/6/CE/B3/DB3EA6F85EB3180F8745A67E42E_140F8A17_39F42.pdf', 'Tongji University — Architecture International Class 2026', NULL),
    (227, 'Tongji University', 'Traffic Engineering', 'Traffic Engineering', 'Bachelor''s', 'https://tjjt.tongji.edu.cn/English_Home/INTERNATIONAL/Bachelor_Degree_Program.htm', 'Tongji University — Bachelor Degree Program in Transportation', NULL),
    (230, 'Wuhan University', 'Computer Science and Technology (Lei Jun Class)', 'Computer Science', 'Bachelor''s', 'https://news.whu.edu.cn/info/1013/500927.htm', 'Wuhan University Undergraduate Admissions Office — 2026 Programme Report', NULL),
    (230, 'Wuhan University', 'Artificial Intelligence (Ziqiang Class)', 'Artificial Intelligence', 'Bachelor''s', 'https://news.whu.edu.cn/info/1013/500927.htm', 'Wuhan University Undergraduate Admissions Office — 2026 Programme Report', NULL),
    (230, 'Wuhan University', 'Robotics Engineering (Embodied Robotics Ziqiang Class)', 'Robotics Engineering', 'Bachelor''s', 'https://news.whu.edu.cn/info/1013/500927.htm', 'Wuhan University Undergraduate Admissions Office — 2026 Programme Report', NULL),
    (230, 'Wuhan University', 'Electrical Engineering and Automation (Intelligent Electrical Innovation Class)', 'Electrical Engineering', 'Bachelor''s', 'https://news.whu.edu.cn/info/1013/500927.htm', 'Wuhan University Undergraduate Admissions Office — 2026 Programme Report', NULL),
    (307, 'University of Barcelona', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://web.ub.edu/en/web/estudis/w/bachelordegree-g1147?referer=cercador-graus', 'University of Barcelona — Bachelor''s Degree in Mathematics', NULL),
    (307, 'University of Barcelona', 'Economics', 'Economics', 'Bachelor''s', 'https://web.ub.edu/en/web/estudis/w/bachelordegree-g1115?referer=bachelors-degrees-finder', 'University of Barcelona — Bachelor''s Degree in Economics', NULL),
    (313, 'Queen’s University Belfast', 'Mechanical Engineering Sandwich (BEng)', 'Mechanical Engineering', 'Bachelor''s', 'https://www.qub.ac.uk/courses/undergraduate/mechanical-engineering-sandwich-beng-h304/', 'Queen’s University Belfast — Mechanical Engineering Sandwich BEng 2027/28', NULL),
    (313, 'Queen’s University Belfast', 'Economics (BSc)', 'Economics', 'Bachelor''s', 'https://www.qub.ac.uk/courses/undergraduate/economics-bsc-l100/', 'Queen’s University Belfast — Economics BSc 2027/28', NULL),
    (313, 'Queen’s University Belfast', 'Electrical and Electronic Engineering (BEng)', 'Electrical Engineering', 'Bachelor''s', 'https://www.qub.ac.uk/courses/undergraduate/electrical-electronic-engineering-beng-h600/', 'Queen’s University Belfast — Electrical and Electronic Engineering 2027/28', NULL),
    (209, 'Al-Farabi Kazakh National University (KazNU)', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://welcome.kaznu.kz/en/education_programs/bachelor/speciality/1681', 'Al-Farabi Kazakh National University — Mathematics', NULL),
    (209, 'Al-Farabi Kazakh National University (KazNU)', 'Physics', 'Physics', 'Bachelor''s', 'https://welcome.kaznu.kz/en/education_programs/bachelor/speciality/1436', 'Al-Farabi Kazakh National University — Physics', NULL),
    (209, 'Al-Farabi Kazakh National University (KazNU)', 'Chemistry', 'Chemistry', 'Bachelor''s', 'https://welcome.kaznu.kz/en/education_programs/bachelor/speciality/1403', 'Al-Farabi Kazakh National University — Chemistry', NULL),
    (274, 'National Yang Ming Chiao Tung University', 'Computer Science Undergraduate Program', 'Computer Science', 'Bachelor''s', 'https://www.cs.nycu.edu.tw/intro/organization?locale=en', 'NYCU Department of Computer Science — Undergraduate Programs', NULL),
    (274, 'National Yang Ming Chiao Tung University', 'Electrical Engineering and Computer Science Undergraduate Program', 'Electrical Engineering and Computer Science', 'Bachelor''s', 'https://www.cs.nycu.edu.tw/intro/organization?locale=en', 'NYCU Department of Computer Science — Undergraduate Programs', NULL),
    (274, 'National Yang Ming Chiao Tung University', 'Applied Mathematics', 'Applied Mathematics', 'Bachelor''s', 'https://www.math.nycu.edu.tw/program/e_programs.php', 'NYCU Applied Mathematics — Programs', NULL),
    (274, 'National Yang Ming Chiao Tung University', 'Communication and Technology', 'Communication', 'Bachelor''s', 'https://dcat.nycu.edu.tw/en/undergraduate/undergraduate-admission/international-applicants/', 'NYCU Communication and Technology — International Undergraduate Admissions', NULL),
    (128, 'Hokkaido University', 'Economics', 'Economics', 'Bachelor''s', 'https://www.global.hokudai.ac.jp/wp/wp-content/uploads/2026/04/EN_International-Student-Prospectus.pdf', 'Hokkaido University — 2026 International Student Prospectus, Undergraduate Study Areas', NULL),
    (128, 'Hokkaido University', 'Business Administration', 'Business', 'Bachelor''s', 'https://www.global.hokudai.ac.jp/wp/wp-content/uploads/2026/04/EN_International-Student-Prospectus.pdf', 'Hokkaido University — 2026 International Student Prospectus, Undergraduate Study Areas', NULL),
    (128, 'Hokkaido University', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://www.global.hokudai.ac.jp/wp/wp-content/uploads/2026/04/EN_International-Student-Prospectus.pdf', 'Hokkaido University — 2026 International Student Prospectus, Undergraduate Study Areas', NULL),
    (128, 'Hokkaido University', 'Physics', 'Physics', 'Bachelor''s', 'https://www.global.hokudai.ac.jp/wp/wp-content/uploads/2026/04/EN_International-Student-Prospectus.pdf', 'Hokkaido University — 2026 International Student Prospectus, Undergraduate Study Areas', NULL),
    (231, 'Emory University', 'Applied Mathematics', 'Applied Mathematics', 'Bachelor''s', 'https://apply.emory.edu/academics/majors-and-minors?school=96', 'Emory University — Majors, Minors, and Programs', NULL),
    (231, 'Emory University', 'Applied Mathematics and Statistics', 'Statistics', 'Bachelor''s', 'https://apply.emory.edu/academics/majors-and-minors?school=96', 'Emory University — Majors, Minors, and Programs', NULL),
    (231, 'Emory University', 'Anthropology and Human Biology', 'Anthropology', 'Bachelor''s', 'https://apply.emory.edu/academics/majors-and-minors?school=96', 'Emory University — Majors, Minors, and Programs', NULL),
    (231, 'Emory University', 'Ancient Mediterranean Studies', 'History', 'Bachelor''s', 'https://apply.emory.edu/academics/majors-and-minors?school=96', 'Emory University — Majors, Minors, and Programs', NULL),
    (226, 'Tecnológico de Monterrey', 'B.S. in Digital Business Transformation', 'Digital Business', 'Bachelor''s', 'https://tec.mx/en/undergraduate/academic-programs?page=2', 'Tecnológico de Monterrey — Undergraduate Academic Programs', NULL),
    (226, 'Tecnológico de Monterrey', 'B.S. in Financial Engineering', 'Financial Engineering', 'Bachelor''s', 'https://tec.mx/en/undergraduate/academic-programs?page=2', 'Tecnológico de Monterrey — Undergraduate Academic Programs', NULL),
    (226, 'Tecnológico de Monterrey', 'B.S. in Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://tec.mx/en/undergraduate/academic-programs?page=2', 'Tecnológico de Monterrey — Undergraduate Academic Programs', NULL),
    (226, 'Tecnológico de Monterrey', 'B.S. in Mechatronics Engineering', 'Mechatronics', 'Bachelor''s', 'https://tec.mx/en/undergraduate/academic-programs?page=2', 'Tecnológico de Monterrey — Undergraduate Academic Programs', NULL),
    (280, 'Harbin Institute of Technology', 'English', 'English', 'Bachelor''s', 'https://enrwskxb.hit.edu.cn/InternationalStudentsEnrollment/list.htm', 'Harbin Institute of Technology — International Students Enrollment', NULL),
    (280, 'Harbin Institute of Technology', 'Sociology', 'Sociology', 'Bachelor''s', 'https://enrwskxb.hit.edu.cn/InternationalStudentsEnrollment/list.htm', 'Harbin Institute of Technology — International Students Enrollment', NULL),
    (280, 'Harbin Institute of Technology', 'Economics', 'Economics', 'Bachelor''s', 'https://enrwskxb.hit.edu.cn/InternationalStudentsEnrollment/list.htm', 'Harbin Institute of Technology — International Students Enrollment', NULL),
    (280, 'Harbin Institute of Technology', 'Chinese Language and Literature', 'Chinese Language', 'Bachelor''s', 'https://enrwskxb.hit.edu.cn/InternationalStudentsEnrollment/list.htm', 'Harbin Institute of Technology — International Students Enrollment', NULL),
    (240, 'National Cheng Kung University', 'Photonics', 'Photonics', 'Bachelor''s', 'https://oia.ncku.edu.tw/var/file/32/1032/img/5242/NCKUAdmissionProspectusforInternationalStudents2027Fall2028Spring.pdf', 'National Cheng Kung University — Admission Prospectus for International Students 2027/28', NULL),
    (240, 'National Cheng Kung University', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://oia.ncku.edu.tw/var/file/32/1032/img/5242/NCKUAdmissionProspectusforInternationalStudents2027Fall2028Spring.pdf', 'National Cheng Kung University — Admission Prospectus for International Students 2027/28', NULL),
    (240, 'National Cheng Kung University', 'Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://oia.ncku.edu.tw/var/file/32/1032/img/5242/NCKUAdmissionProspectusforInternationalStudents2027Fall2028Spring.pdf', 'National Cheng Kung University — Admission Prospectus for International Students 2027/28', NULL),
    (240, 'National Cheng Kung University', 'Engineering Science', 'Engineering', 'Bachelor''s', 'https://oia.ncku.edu.tw/var/file/32/1032/img/5242/NCKUAdmissionProspectusforInternationalStudents2027Fall2028Spring.pdf', 'National Cheng Kung University — Admission Prospectus for International Students 2027/28', NULL),
    (240, 'National Cheng Kung University', 'Systems & Naval Mechatronic Engineering', 'Mechatronics', 'Bachelor''s', 'https://oia.ncku.edu.tw/var/file/32/1032/img/5242/NCKUAdmissionProspectusforInternationalStudents2027Fall2028Spring.pdf', 'National Cheng Kung University — Admission Prospectus for International Students 2027/28', NULL),
    (225, 'Complutense University of Madrid', 'Economía', 'Economics', 'Bachelor''s', 'https://www.ucm.es/grados-y-baremos-2', 'Universidad Complutense de Madrid — Grados y baremos 2026', NULL),
    (225, 'Complutense University of Madrid', 'Física', 'Physics', 'Bachelor''s', 'https://www.ucm.es/grados-y-baremos-2', 'Universidad Complutense de Madrid — Grados y baremos 2026', NULL),
    (225, 'Complutense University of Madrid', 'Matemáticas', 'Mathematics', 'Bachelor''s', 'https://www.ucm.es/grados-y-baremos-2', 'Universidad Complutense de Madrid — Grados y baremos 2026', NULL),
    (225, 'Complutense University of Madrid', 'Química', 'Chemistry', 'Bachelor''s', 'https://www.ucm.es/grados-y-baremos-2', 'Universidad Complutense de Madrid — Grados y baremos 2026', NULL),
    (225, 'Complutense University of Madrid', 'Ingeniería Informática', 'Computer Science', 'Bachelor''s', 'https://www.ucm.es/grados-y-baremos-2', 'Universidad Complutense de Madrid — Grados y baremos 2026', NULL),
    (304, 'King Abdulaziz University', 'Bachelor of Science in Chemistry', 'Chemistry', 'Bachelor''s', 'https://www.kau.edu.sa/en/programs/bachelor-of-science-in-chemistry', 'King Abdulaziz University — Bachelor of Science in Chemistry', NULL),
    (304, 'King Abdulaziz University', 'Bachelor of Science in Electrical Engineering (Electronics and Communications)', 'Electrical Engineering', 'Bachelor''s', 'https://www.kau.edu.sa/faculty/en/engineering/programs', 'King Abdulaziz University — Engineering Programs', NULL)
), eligible AS (
  SELECT r.* FROM reviewed r JOIN public.universities u
    ON u.id = r.university_id AND u.name = r.university_name AND u.is_active
), reviewed_sources AS (
  INSERT INTO public.sources (url,title,domain,source_type,accessed_at,is_official,is_verified)
  SELECT DISTINCT ON (url) url,source_title,split_part(url,'/',3),'official_programme',now(),true,true
  FROM eligible ORDER BY url, source_title
  ON CONFLICT (url) DO UPDATE SET accessed_at=EXCLUDED.accessed_at,is_official=true,is_verified=true
  RETURNING id,url
), reviewed_existing AS MATERIALIZED (
  SELECT p.id, r.*, to_jsonb(p) AS previous
  FROM eligible r JOIN public.programs p ON p.university_id=r.university_id
    AND lower(btrim(p.name))=lower(btrim(r.name))
    AND lower(btrim(coalesce(p.degree_level,'')))=lower(btrim(r.degree_level))
  WHERE p.is_verified IS NOT TRUE AND p.verification_status='unverified'
), repaired AS (
  UPDATE public.programs p
  SET field=r.field,official_url=r.url,source_url=r.url,language=r.language,
      application_url=NULL,description=NULL,duration=NULL,study_mode=NULL,annual_tuition=NULL,
      application_deadline=NULL,duration_years=NULL,tuition_amount=NULL,program_url=NULL,
      min_ielts=NULL,min_sat=NULL,is_active=true,is_verified=true,verification_status='verified',last_verified_at=now()
  FROM reviewed_existing r
  WHERE p.id=r.id AND to_jsonb(p)=r.previous
  RETURNING p.id,p.source_url
), audited AS (
  INSERT INTO public.audit_logs (entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
  SELECT 'program',p.id,'official_programme_identity',r.previous::text,
     jsonb_build_object('source_url',p.source_url,'verification_status','verified',
       'scope','programme identity; other legacy fields await source review')::text,
     '2026-11-25 official QS catalogue review','catalogue_review','verified'
  FROM repaired p JOIN reviewed_existing r ON r.id=p.id
  RETURNING id
), added AS (
  INSERT INTO public.programs (university_id,name,field,degree_level,official_url,source_url,language,last_verified_at,is_verified,verification_status,is_active)
  SELECT university_id,name,field,degree_level,url,url,language,now(),true,'verified',true
  FROM eligible
  ON CONFLICT DO NOTHING RETURNING id,source_url
), published AS (
  SELECT * FROM added UNION ALL SELECT * FROM repaired
), linked AS (
  INSERT INTO public.program_sources (program_id,source_id,source_type)
  SELECT p.id,s.id,'program_evidence' FROM published p JOIN reviewed_sources s ON s.url=p.source_url
  WHERE NOT EXISTS (SELECT 1 FROM public.program_sources l WHERE l.program_id=p.id AND l.source_id=s.id AND l.source_type='program_evidence')
  RETURNING program_id
), invalidated AS (
  INSERT INTO public.cache_revisions (scope,revision,reason,updated_at)
  SELECT scope,2,'2026-11-25 official QS catalogue review',now()
  FROM (VALUES ('catalogue'),('evidence')) AS scopes(scope)
  WHERE EXISTS (SELECT 1 FROM published)
  ON CONFLICT (scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at
  RETURNING scope
)
SELECT (SELECT count(*) FROM eligible) AS reviewed,
       (SELECT count(*) FROM added) AS added,
       (SELECT count(*) FROM repaired) AS repaired,
       (SELECT count(*) FROM linked) AS linked,
       (SELECT count(*) FROM audited) AS audited,
       (SELECT count(*) FROM invalidated) AS cache_scopes;
