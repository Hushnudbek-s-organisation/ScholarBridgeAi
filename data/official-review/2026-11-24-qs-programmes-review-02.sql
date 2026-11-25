-- Official undergraduate evidence reviewed against the publisher's programme catalogue.
-- A row proves the listed programme identity only. Costs, requirements and dates stay unset.
WITH reviewed(university_id, university_name, name, field, degree_level, url, source_title, language) AS (
  VALUES
    (21, 'The University of Hong Kong (HKU)', 'Bachelor of Arts in Architectural Studies', 'Architecture', 'Bachelor''s', 'https://admissions.hku.hk/sites/default/files/2026-11/HKU%20Programme%20List.pdf', 'HKU 2027 International Undergraduate Admissions', NULL),
    (21, 'The University of Hong Kong (HKU)', 'Bachelor of Science in Surveying', 'Surveying', 'Bachelor''s', 'https://admissions.hku.hk/sites/default/files/2026-11/HKU%20Programme%20List.pdf', 'HKU 2027 International Undergraduate Admissions', NULL),
    (21, 'The University of Hong Kong (HKU)', 'Bachelor of Arts in Landscape Studies', 'Landscape Architecture', 'Bachelor''s', 'https://admissions.hku.hk/sites/default/files/2026-11/HKU%20Programme%20List.pdf', 'HKU 2027 International Undergraduate Admissions', NULL),
    (21, 'The University of Hong Kong (HKU)', 'Bachelor of Arts in Urban Studies', 'Urban Studies', 'Bachelor''s', 'https://admissions.hku.hk/sites/default/files/2026-11/HKU%20Programme%20List.pdf', 'HKU 2027 International Undergraduate Admissions', NULL),
    (22, 'Peking University', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://www.isd.pku.edu.cn/en/detail.php?id=529', 'Peking University International Students Division — Admission Catalogue', NULL),
    (22, 'Peking University', 'Physics', 'Physics', 'Bachelor''s', 'https://www.isd.pku.edu.cn/en/detail.php?id=529', 'Peking University International Students Division — Admission Catalogue', NULL),
    (22, 'Peking University', 'Chemistry', 'Chemistry', 'Bachelor''s', 'https://www.isd.pku.edu.cn/en/detail.php?id=529', 'Peking University International Students Division — Admission Catalogue', NULL),
    (22, 'Peking University', 'Psychology', 'Psychology', 'Bachelor''s', 'https://www.isd.pku.edu.cn/en/detail.php?id=529', 'Peking University International Students Division — Admission Catalogue', NULL),
    (14, 'Cornell University', 'Animal Science (BS)', 'Animal Science', 'Bachelor''s', 'https://catalog.cornell.edu/programs/', 'Cornell University — Undergraduate Programs', NULL),
    (14, 'Cornell University', 'Applied Economics and Management (BS)', 'Applied Economics', 'Bachelor''s', 'https://catalog.cornell.edu/programs/', 'Cornell University — Undergraduate Programs', NULL),
    (14, 'Cornell University', 'Agricultural Sciences (BS)', 'Agriculture', 'Bachelor''s', 'https://catalog.cornell.edu/programs/', 'Cornell University — Undergraduate Programs', NULL),
    (14, 'Cornell University', 'Atmospheric Sciences (BS)', 'Atmospheric Science', 'Bachelor''s', 'https://catalog.cornell.edu/programs/', 'Cornell University — Undergraduate Programs', NULL),
    (17, 'Yale University', 'Applied Physics (B.S.)', 'Applied Physics', 'Bachelor''s', 'https://catalog.yale.edu/ycps/majors-in-yale-college/', 'Yale College Programs of Study — Majors', NULL),
    (17, 'Yale University', 'Chemical Engineering (B.S.)', 'Chemical Engineering', 'Bachelor''s', 'https://catalog.yale.edu/ycps/majors-in-yale-college/', 'Yale College Programs of Study — Majors', NULL),
    (17, 'Yale University', 'Computer Science and Mathematics (B.S.)', 'Computer Science', 'Bachelor''s', 'https://catalog.yale.edu/ycps/majors-in-yale-college/', 'Yale College Programs of Study — Majors', NULL),
    (33, 'The Chinese University of Hong Kong (CUHK)', 'Biomedical Engineering', 'Biomedical Engineering', 'Bachelor''s', 'https://admission.cuhk.edu.hk/programmes/list/', 'CUHK Undergraduate Admissions — 2027 Programme List', NULL),
    (33, 'The Chinese University of Hong Kong (CUHK)', 'Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://admission.cuhk.edu.hk/programmes/list/', 'CUHK Undergraduate Admissions — 2027 Programme List', NULL),
    (33, 'The Chinese University of Hong Kong (CUHK)', 'Electronic Engineering', 'Electronic Engineering', 'Bachelor''s', 'https://admission.cuhk.edu.hk/programmes/list/', 'CUHK Undergraduate Admissions — 2027 Programme List', NULL),
    (33, 'The Chinese University of Hong Kong (CUHK)', 'Mechanical and Automation Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://admission.cuhk.edu.hk/programmes/list/', 'CUHK Undergraduate Admissions — 2027 Programme List', NULL),
    (32, 'University of California, Berkeley (UC Berkeley)', 'Aerospace Engineering', 'Aerospace Engineering', 'Bachelor''s', 'https://engineering.berkeley.edu/students/undergraduate-guide/degree-requirements/major-programs/', 'Berkeley Engineering — Undergraduate Major Programs', NULL),
    (32, 'University of California, Berkeley (UC Berkeley)', 'Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'https://engineering.berkeley.edu/students/undergraduate-guide/degree-requirements/major-programs/', 'Berkeley Engineering — Undergraduate Major Programs', NULL),
    (32, 'University of California, Berkeley (UC Berkeley)', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://engineering.berkeley.edu/students/undergraduate-guide/degree-requirements/major-programs/', 'Berkeley Engineering — Undergraduate Major Programs', NULL),
    (27, 'Australian National University (ANU)', 'Bachelor of Economics', 'Economics', 'Bachelor''s', 'https://programsandcourses.anu.edu.au/2027/program/BECON', 'ANU 2027 — Bachelor of Economics', NULL),
    (27, 'Australian National University (ANU)', 'Bachelor of Science', 'Science', 'Bachelor''s', 'https://programsandcourses.anu.edu.au/2027/program/BSC', 'ANU 2027 — Bachelor of Science', NULL),
    (27, 'Australian National University (ANU)', 'Bachelor of Engineering (Honours)', 'Engineering', 'Bachelor''s', 'https://programsandcourses.anu.edu.au/2027/program/AENGI', 'ANU 2027 — Bachelor of Engineering (Honours)', NULL),
    (27, 'Australian National University (ANU)', 'Bachelor of Arts (Honours)', 'Arts', 'Bachelor''s', 'https://programsandcourses.anu.edu.au/2027/program/harts', 'ANU 2027 — Bachelor of Arts (Honours)', NULL),
    (23, 'University of Toronto', 'Mathematics Specialist', 'Mathematics', 'Bachelor''s', 'https://sidneysmithcommons.artsci.utoronto.ca/alphabetical-program-list/', 'University of Toronto Faculty of Arts & Science — Program List', NULL),
    (23, 'University of Toronto', 'Mathematics and Physics Specialist', 'Physics', 'Bachelor''s', 'https://sidneysmithcommons.artsci.utoronto.ca/alphabetical-program-list/', 'University of Toronto Faculty of Arts & Science — Program List', NULL),
    (23, 'University of Toronto', 'Economics and Mathematics Specialist', 'Economics', 'Bachelor''s', 'https://sidneysmithcommons.artsci.utoronto.ca/alphabetical-program-list/', 'University of Toronto Faculty of Arts & Science — Program List', NULL),
    (41, 'Shanghai Jiao Tong University (SJTU)', 'Mechanical Engineering (English-Taught Engineering Cluster)', 'Mechanical Engineering', 'Bachelor''s', 'https://en.sjtu.edu.cn/study-sjtu/prospective/degree-programs/278', 'Shanghai Jiao Tong University — 2027 Undergraduate Engineering Cluster in English', 'English'),
    (41, 'Shanghai Jiao Tong University (SJTU)', 'Electrical and Computer Engineering (English-Taught Engineering Cluster)', 'Computer Engineering', 'Bachelor''s', 'https://en.sjtu.edu.cn/study-sjtu/prospective/degree-programs/278', 'Shanghai Jiao Tong University — 2027 Undergraduate Engineering Cluster in English', 'English'),
    (55, 'The University of Manchester', 'BEng Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://www.manchester.ac.uk/study/undergraduate/courses/2027/03389/beng-mechanical-engineering/', 'University of Manchester 2027 — BEng Mechanical Engineering', NULL),
    (56, 'The University of Queensland (UQ)', 'Bachelor of Engineering (Honours)', 'Engineering', 'Bachelor''s', 'https://study.uq.edu.au/study-options/programs/bachelor-engineering-honours-2455', 'University of Queensland — Bachelor of Engineering (Honours)', NULL),
    (56, 'The University of Queensland (UQ)', 'Bachelor of Economics', 'Economics', 'Bachelor''s', 'https://study.uq.edu.au/study-options/programs/bachelor-economics-2467?year=2027', 'University of Queensland 2027 — Bachelor of Economics', NULL),
    (56, 'The University of Queensland (UQ)', 'Bachelor of Science', 'Science', 'Bachelor''s', 'https://study.uq.edu.au/study-options/programs/bachelor-science-2461?year=2027', 'University of Queensland 2027 — Bachelor of Science', NULL),
    (56, 'The University of Queensland (UQ)', 'Bachelor of Business Management', 'Business', 'Bachelor''s', 'https://study.uq.edu.au/study-options/programs/bachelor-business-management-2171', 'University of Queensland — Bachelor of Business Management', NULL),
    (18, 'Columbia University', 'Computational Biology Major', 'Computational Biology', 'Bachelor''s', 'https://bulletin.columbia.edu/columbia-college/departments-instruction/computer-science/', 'Columbia College Bulletin — Computer Science', NULL),
    (18, 'Columbia University', 'Computer Science–Mathematics Major', 'Computer Science', 'Bachelor''s', 'https://bulletin.columbia.edu/columbia-college/departments-instruction/computer-science/', 'Columbia College Bulletin — Computer Science', NULL),
    (18, 'Columbia University', 'Economics Major', 'Economics', 'Bachelor''s', 'https://bulletin.columbia.edu/columbia-college/departments-instruction/economics/', 'Columbia College Bulletin — Economics', NULL),
    (49, 'University of British Columbia (UBC)', 'Computer Science (BSc, Vancouver)', 'Computer Science', 'Bachelor''s', 'https://you.ubc.ca/programs/computer-science-vancouver-bsc/', 'UBC Vancouver — Computer Science (BSc)', NULL),
    (49, 'University of British Columbia (UBC)', 'Computer Science (BA, Vancouver)', 'Computer Science', 'Bachelor''s', 'https://you.ubc.ca/programs/computer-science-vancouver-ba/', 'UBC Vancouver — Computer Science (BA)', NULL),
    (49, 'University of British Columbia (UBC)', 'Economics (Vancouver)', 'Economics', 'Bachelor''s', 'https://you.ubc.ca/programs/economics-vancouver/', 'UBC Vancouver — Economics', NULL),
    (49, 'University of British Columbia (UBC)', 'Commerce', 'Business', 'Bachelor''s', 'https://you.ubc.ca/programs/commerce/', 'UBC Undergraduate Admissions — Commerce', NULL),
    (51, 'University of California, Los Angeles (UCLA)', 'Mathematics (B.S.)', 'Mathematics', 'Bachelor''s', 'https://admission.ucla.edu/apply/majors', 'UCLA Undergraduate Admission — Majors', NULL),
    (51, 'University of California, Los Angeles (UCLA)', 'Marine Biology (B.S.)', 'Marine Biology', 'Bachelor''s', 'https://admission.ucla.edu/apply/majors', 'UCLA Undergraduate Admission — Majors', NULL),
    (51, 'University of California, Los Angeles (UCLA)', 'Mathematics/Economics (B.S.)', 'Economics', 'Bachelor''s', 'https://admission.ucla.edu/apply/majors', 'UCLA Undergraduate Admission — Majors', NULL),
    (51, 'University of California, Los Angeles (UCLA)', 'Linguistics and Computer Science (B.A.)', 'Computer Science', 'Bachelor''s', 'https://admission.ucla.edu/apply/majors', 'UCLA Undergraduate Admission — Majors', NULL),
    (72, 'The Hong Kong Polytechnic University (PolyU)', 'Bachelor’s Degree Scheme in Engineering', 'Engineering', 'Bachelor''s', 'https://www.polyu.edu.hk/study/ug/international/2027/js3005', 'PolyU 2027 International — Bachelor’s Degree Scheme in Engineering', NULL),
    (72, 'The Hong Kong Polytechnic University (PolyU)', 'Bachelor’s Degree Scheme in Business Administration', 'Business', 'Bachelor''s', 'https://www.polyu.edu.hk/study/ug/international/2027/js3003', 'PolyU 2027 International — Bachelor’s Degree Scheme in Business Administration', NULL),
    (72, 'The Hong Kong Polytechnic University (PolyU)', 'Bachelor of Business Administration (Honours) Scheme in Accounting and Finance', 'Accounting and Finance', 'Bachelor''s', 'https://www.polyu.edu.hk/study/ug/international/2027/js3060', 'PolyU 2027 International — BBA (Honours) Scheme in Accounting and Finance', NULL),
    (72, 'The Hong Kong Polytechnic University (PolyU)', 'Applied Biology with Biotechnology (BSc Honours)', 'Biotechnology', 'Bachelor''s', 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications', 'PolyU — International Admissions', NULL),
    (63, 'City University of Hong Kong (CityU)', 'BSc in Computer Science and BSc in Computational Finance & Financial Technology', 'Financial Technology', 'Bachelor''s', 'https://www.cs.cityu.edu.hk/en/academic-programmes/programmes-overview', 'CityUHK — Computer Science Programmes Overview', NULL),
    (63, 'City University of Hong Kong (CityU)', 'Bachelor of Laws and BSc in Computer Science (Stream: Artificial Intelligence)', 'Law and Artificial Intelligence', 'Bachelor''s', 'https://www.cs.cityu.edu.hk/en/academic-programmes/programmes-overview', 'CityUHK — Computer Science Programmes Overview', NULL),
    (69, 'King Fahd University of Petroleum & Minerals (KFUPM)', 'B.S. in Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://ccm.kfupm.edu.sa/academics/programs/undergraduate-programs', 'KFUPM College of Computing and Mathematics — Undergraduate Programs', NULL),
    (69, 'King Fahd University of Petroleum & Minerals (KFUPM)', 'B.S. in Software Engineering', 'Software Engineering', 'Bachelor''s', 'https://ccm.kfupm.edu.sa/academics/programs/undergraduate-programs', 'KFUPM College of Computing and Mathematics — Undergraduate Programs', NULL),
    (69, 'King Fahd University of Petroleum & Minerals (KFUPM)', 'B.S. in Data Science and Engineering', 'Data Science', 'Bachelor''s', 'https://ccm.kfupm.edu.sa/academics/programs/undergraduate-programs', 'KFUPM College of Computing and Mathematics — Undergraduate Programs', NULL),
    (69, 'King Fahd University of Petroleum & Minerals (KFUPM)', 'B.S. in Applied Mathematics and AI', 'Applied Mathematics', 'Bachelor''s', 'https://ccm.kfupm.edu.sa/academics/programs/undergraduate-programs', 'KFUPM College of Computing and Mathematics — Undergraduate Programs', NULL),
    (70, 'Brown University', 'Applied Mathematics Concentration', 'Applied Mathematics', 'Bachelor''s', 'https://bulletin.brown.edu/the-college/concentrations/', 'Brown University Bulletin — Undergraduate Concentrations', NULL),
    (70, 'Brown University', 'Biomedical Engineering Concentration', 'Biomedical Engineering', 'Bachelor''s', 'https://bulletin.brown.edu/the-college/concentrations/', 'Brown University Bulletin — Undergraduate Concentrations', NULL),
    (70, 'Brown University', 'Chemical Engineering Concentration', 'Chemical Engineering', 'Bachelor''s', 'https://bulletin.brown.edu/the-college/concentrations/', 'Brown University Bulletin — Undergraduate Concentrations', NULL),
    (70, 'Brown University', 'Computer Science-Economics Concentration', 'Computer Science and Economics', 'Bachelor''s', 'https://bulletin.brown.edu/the-college/concentrations/', 'Brown University Bulletin — Undergraduate Concentrations', NULL),
    (74, 'University of Illinois Urbana-Champaign (UIUC)', 'Aerospace Engineering, BS', 'Aerospace Engineering', 'Bachelor''s', 'https://catalog.illinois.edu/degree-programs/undergraduate_index/', 'Illinois 2026–2027 Course Catalog — Undergraduate Program Index', NULL),
    (74, 'University of Illinois Urbana-Champaign (UIUC)', 'Agricultural & Biological Engineering, BS', 'Agricultural Engineering', 'Bachelor''s', 'https://catalog.illinois.edu/degree-programs/undergraduate_index/', 'Illinois 2026–2027 Course Catalog — Undergraduate Program Index', NULL),
    (74, 'University of Illinois Urbana-Champaign (UIUC)', 'Agricultural & Consumer Economics, BS', 'Economics', 'Bachelor''s', 'https://catalog.illinois.edu/degree-programs/undergraduate_index/', 'Illinois 2026–2027 Course Catalog — Undergraduate Program Index', NULL),
    (74, 'University of Illinois Urbana-Champaign (UIUC)', 'Accountancy + Data Science, BS', 'Data Science', 'Bachelor''s', 'https://catalog.illinois.edu/degree-programs/undergraduate_index/', 'Illinois 2026–2027 Course Catalog — Undergraduate Program Index', NULL),
    (191, 'Adelaide University', 'Bachelor of Computer Science (Honours) majoring in Programming Languages', 'Computer Science', 'Bachelor''s', 'https://adelaide.edu.au/content/dam/adelaideuniversity/documents/study/pdfs/2027/study-at-adelaide-university.pdf', 'Adelaide University — Study Guide 2027', NULL),
    (191, 'Adelaide University', 'Bachelor of Cyber Security', 'Cybersecurity', 'Bachelor''s', 'https://adelaide.edu.au/content/dam/adelaideuniversity/documents/study/pdfs/2027/study-at-adelaide-university.pdf', 'Adelaide University — Study Guide 2027', NULL),
    (191, 'Adelaide University', 'Bachelor of Mathematics', 'Mathematics', 'Bachelor''s', 'https://adelaide.edu.au/content/dam/adelaideuniversity/documents/study/pdfs/study-guides/dom/computer-science-it-maths-study-guide.pdf', 'Adelaide University 2027 — Computer Science, IT and Mathematics', NULL),
    (191, 'Adelaide University', 'Bachelor of Information Technology majoring in Networking and Cyber Security', 'Information Technology', 'Bachelor''s', 'https://adelaide.edu.au/content/dam/adelaideuniversity/documents/study/pdfs/study-guides/dom/computer-science-it-maths-study-guide.pdf', 'Adelaide University 2027 — Computer Science, IT and Mathematics', NULL),
    (67, 'University of California, San Diego (UCSD)', 'Economics B.A.', 'Economics', 'Bachelor''s', 'https://admissions.ucsd.edu/why/majors/index.html', 'UC San Diego — Departments & Majors', NULL),
    (67, 'University of California, San Diego (UCSD)', 'Economics B.S.', 'Economics', 'Bachelor''s', 'https://admissions.ucsd.edu/why/majors/index.html', 'UC San Diego — Departments & Majors', NULL),
    (67, 'University of California, San Diego (UCSD)', 'Joint Major Mathematics & Economics B.S.', 'Economics and Mathematics', 'Bachelor''s', 'https://admissions.ucsd.edu/why/majors/index.html', 'UC San Diego — Departments & Majors', NULL),
    (78, 'University of Washington (UW)', 'Bachelor of Science in Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://www.washington.edu/students/gencat/front/ugdegrees.html', 'University of Washington Registrar — Undergraduate Degrees', NULL),
    (78, 'University of Washington (UW)', 'Bachelor of Science in Aeronautical and Astronautical Engineering', 'Aerospace Engineering', 'Bachelor''s', 'https://www.washington.edu/students/gencat/front/ugdegrees.html', 'University of Washington Registrar — Undergraduate Degrees', NULL),
    (78, 'University of Washington (UW)', 'Bachelor of Science in Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://www.washington.edu/students/gencat/front/ugdegrees.html', 'University of Washington Registrar — Undergraduate Degrees', NULL),
    (82, 'Penn State University', 'Electrical Engineering, B.S. (University Park)', 'Electrical Engineering', 'Bachelor''s', 'https://undergraduate.bulletins.psu.edu/programs/', 'Penn State Undergraduate Bulletin — Undergraduate Programs', NULL),
    (83, 'Boston University (BU)', 'Biomedical Engineering BS', 'Biomedical Engineering', 'Bachelor''s', 'https://www.bu.edu/academics/eng/programs/', 'Boston University — College of Engineering Programs', NULL),
    (83, 'Boston University (BU)', 'Computer Engineering BS', 'Computer Engineering', 'Bachelor''s', 'https://www.bu.edu/academics/eng/programs/', 'Boston University — College of Engineering Programs', NULL),
    (83, 'Boston University (BU)', 'Electrical Engineering BS', 'Electrical Engineering', 'Bachelor''s', 'https://www.bu.edu/academics/eng/programs/', 'Boston University — College of Engineering Programs', NULL),
    (83, 'Boston University (BU)', 'Mechanical Engineering BS', 'Mechanical Engineering', 'Bachelor''s', 'https://www.bu.edu/academics/eng/programs/', 'Boston University — College of Engineering Programs', NULL),
    (38, 'Institute of Science Tokyo', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://www.isct.ac.jp/en/001/education/departments/undergraduate-se', 'Science Tokyo — Undergraduate Science and Engineering Departments', 'Japanese'),
    (38, 'Institute of Science Tokyo', 'Physics', 'Physics', 'Bachelor''s', 'https://www.isct.ac.jp/en/001/education/departments/undergraduate-se', 'Science Tokyo — Undergraduate Science and Engineering Departments', 'Japanese'),
    (38, 'Institute of Science Tokyo', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://www.isct.ac.jp/en/001/education/departments/undergraduate-se', 'Science Tokyo — Undergraduate Science and Engineering Departments', 'Japanese'),
    (38, 'Institute of Science Tokyo', 'Electrical and Electronic Engineering', 'Electrical Engineering', 'Bachelor''s', 'https://www.isct.ac.jp/en/001/education/departments/undergraduate-se', 'Science Tokyo — Undergraduate Science and Engineering Departments', 'Japanese')
), eligible AS (
  SELECT r.* FROM reviewed r JOIN public.universities u
    ON u.id = r.university_id AND u.name = r.university_name AND u.is_active
), reviewed_sources AS (
  INSERT INTO public.sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
  SELECT DISTINCT url, source_title, split_part(url, '/', 3), 'official_programme', now(), true, true FROM eligible
  ON CONFLICT (url) DO UPDATE SET
    accessed_at = EXCLUDED.accessed_at, is_official = true, is_verified = true
  RETURNING id, url
), published AS (
  INSERT INTO public.programs
    (university_id, name, field, degree_level, official_url, source_url, language, last_verified_at, is_verified, verification_status, is_active)
  SELECT university_id, name, field, degree_level, url, url, language, now(), true, 'verified', true FROM eligible
  ON CONFLICT DO NOTHING RETURNING id, university_id, source_url
), linked AS (
  INSERT INTO public.program_sources (program_id, source_id, source_type)
  SELECT p.id, s.id, 'program_evidence' FROM published p JOIN reviewed_sources s ON s.url = p.source_url
  RETURNING program_id
), invalidated AS (
  INSERT INTO public.cache_revisions (scope, revision, reason, updated_at)
  SELECT scope, 2, '2026-11-24 official QS catalogue review', now()
  FROM (VALUES ('catalogue'), ('evidence')) AS scopes(scope)
  WHERE EXISTS (SELECT 1 FROM published)
  ON CONFLICT (scope) DO UPDATE SET revision = public.cache_revisions.revision + 1,
    reason = EXCLUDED.reason, updated_at = EXCLUDED.updated_at
  RETURNING scope
)
SELECT (SELECT count(*) FROM eligible) AS reviewed,
       (SELECT count(*) FROM published) AS added,
       (SELECT count(*) FROM linked) AS linked,
       (SELECT count(*) FROM invalidated) AS cache_scopes;
