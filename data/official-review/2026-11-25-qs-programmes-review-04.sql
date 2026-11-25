-- Verified undergraduate programme identities from institutional sources; unverified fields remain unset.
WITH reviewed(university_id, university_name, name, field, degree_level, url, source_title, language) AS (
  VALUES
    (63, 'City University of Hong Kong (CityU)', 'Bachelor of Engineering in Architectural Engineering', 'Architectural Engineering', 'Bachelor''s', 'https://www.cityu.edu.hk/ace/programmes-admissions/undergraduate-programmes1', 'City University of Hong Kong — Undergraduate Programmes', NULL),
    (63, 'City University of Hong Kong (CityU)', 'Bachelor of Science in Architecture and Surveying', 'Architecture', 'Bachelor''s', 'https://www.cityu.edu.hk/ace/programmes-admissions/undergraduate-programmes1', 'City University of Hong Kong — Undergraduate Programmes', NULL),
    (76, 'London School of Economics and Political Science (LSE)', 'BSc Economics and Data Science', 'Data Science', 'Bachelor''s', 'https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics-and-data-science', 'LSE — BSc Economics and Data Science', NULL),
    (76, 'London School of Economics and Political Science (LSE)', 'BSc Management', 'Management', 'Bachelor''s', 'https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-management', 'LSE — BSc Management', NULL),
    (76, 'London School of Economics and Political Science (LSE)', 'BSc Finance', 'Finance', 'Bachelor''s', 'https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-finance', 'LSE — BSc Finance', NULL),
    (76, 'London School of Economics and Political Science (LSE)', 'BSc Accounting and Finance', 'Accounting', 'Bachelor''s', 'https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-accounting-and-finance', 'LSE — BSc Accounting and Finance', NULL),
    (62, 'Duke University', 'Economics (B.S.)', 'Economics', 'Bachelor''s', 'https://econ.duke.edu/undergraduate/majors-minors', 'Duke University — Economics Majors', NULL),
    (62, 'Duke University', 'Mathematics Major', 'Mathematics', 'Bachelor''s', 'https://math.duke.edu/undergraduate/major', 'Duke University — Mathematics Major', NULL),
    (62, 'Duke University', 'Biomedical Engineering', 'Biomedical Engineering', 'Bachelor''s', 'https://bme.duke.edu/academics/undergrad/', 'Duke Biomedical Engineering — Undergraduate Degree', NULL),
    (62, 'Duke University', 'Civil Engineering (BSE)', 'Civil Engineering', 'Bachelor''s', 'https://cee.duke.edu/academics/undergrad/civil/', 'Duke University — Civil Engineering Major', NULL),
    (67, 'University of California, San Diego (UCSD)', 'Electrical Engineering', 'Electrical Engineering', 'Bachelor''s', 'https://admissions.ucsd.edu/why/majors/index.html', 'UC San Diego — Undergraduate Departments and Majors', NULL),
    (82, 'Penn State University', 'Biomedical Engineering, B.S.', 'Biomedical Engineering', 'Bachelor''s', 'https://bulletins.psu.edu/undergraduate/colleges/engineering/', 'Penn State — Undergraduate College of Engineering', NULL),
    (82, 'Penn State University', 'Mechanical Engineering, B.S. (Engineering)', 'Mechanical Engineering', 'Bachelor''s', 'https://bulletins.psu.edu/undergraduate/colleges/engineering/', 'Penn State — Undergraduate College of Engineering', NULL),
    (220, 'Karlsruhe Institute of Technology', 'Mechanical Engineering B.Sc.', 'Mechanical Engineering', 'Bachelor''s', 'https://www.sle.kit.edu/english/vorstudium/bachelor-mechanical-engineering.php', 'KIT — Mechanical Engineering B.Sc.', NULL),
    (220, 'Karlsruhe Institute of Technology', 'Mathematics B.Sc.', 'Mathematics', 'Bachelor''s', 'https://www.sle.kit.edu/english/vorstudium/bachelor-mathematics.php', 'KIT — Mathematics B.Sc.', NULL),
    (119, 'Macquarie University', 'Bachelor of Psychology', 'Psychology', 'Bachelor''s', 'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-psychology/', 'Macquarie University — Bachelor of Psychology', NULL),
    (119, 'Macquarie University', 'Bachelor of Engineering (Honours)', 'Engineering', 'Bachelor''s', 'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-engineering-honours/', 'Macquarie University — Bachelor of Engineering (Honours)', NULL),
    (119, 'Macquarie University', 'Bachelor of Science and Bachelor of Engineering (Honours)', 'Science and Engineering', 'Bachelor''s', 'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-science-and-bachelor-of-engineering-honours/', 'Macquarie University — Science and Engineering Double Degree', NULL),
    (105, 'Universiti Sains Malaysia (USM)', 'Bachelor of Mechanical Engineering with Honours', 'Mechanical Engineering', 'Bachelor''s', 'https://admission.usm.my/index.php/undergraduate/undergraduate-international?catid=77&id=745&view=article', 'USM International — Mechanical Engineering Bachelor', NULL),
    (52, 'University of Wisconsin-Madison', 'Civil Engineering, BS', 'Civil Engineering', 'Bachelor''s', 'https://guide.wisc.edu/undergraduate/engineering/', 'University of Wisconsin–Madison — Undergraduate College of Engineering', NULL),
    (52, 'University of Wisconsin-Madison', 'Electrical Engineering, BS', 'Electrical Engineering', 'Bachelor''s', 'https://guide.wisc.edu/undergraduate/engineering/', 'University of Wisconsin–Madison — Undergraduate College of Engineering', NULL),
    (238, 'National Tsing Hua University', 'International Bachelor Degree Program — International Chinese Language with Multiple Disciplines', 'Chinese Language', 'Bachelor''s', 'https://oga.site.nthu.edu.tw/p/404-1524-230928.php?Lang=en', 'National Tsing Hua University — International Bachelor Degree Program', NULL),
    (238, 'National Tsing Hua University', 'International Bachelor Degree Program — Business Management', 'Business', 'Bachelor''s', 'https://oga.site.nthu.edu.tw/p/404-1524-230928.php?Lang=en', 'National Tsing Hua University — International Bachelor Degree Program', 'English'),
    (224, 'Wageningen University & Research', 'Bachelor’s in Animal Sciences', 'Animal Science', 'Bachelor''s', 'https://www.wur.nl/en/education/bachelor/bachelors-animal-sciences', 'Wageningen University & Research — Animal Sciences', 'English'),
    (224, 'Wageningen University & Research', 'Bachelor’s in Environmental Sciences', 'Environmental Science', 'Bachelor''s', 'https://www.wur.nl/en/education/bachelor/bachelors-environmental-sciences', 'Wageningen University & Research — Environmental Sciences', NULL),
    (224, 'Wageningen University & Research', 'Bachelor’s in Food Technology', 'Food Technology', 'Bachelor''s', 'https://www.wur.nl/en/education/bachelor/bachelors-food-technology', 'Wageningen University & Research — Food Technology', NULL),
    (134, 'Hanyang University', 'Architectural Engineering', 'Architectural Engineering', 'Bachelor''s', 'https://oia.hanyang.ac.kr/files/attach/filebox/2026/08/24/4bad55cf33436519f06a243547ec2a6e.pdf', 'Hanyang University — Spring 2027 International Admission Guidelines', NULL),
    (134, 'Hanyang University', 'Civil and Environmental Engineering', 'Civil Engineering', 'Bachelor''s', 'https://oia.hanyang.ac.kr/files/attach/filebox/2026/08/24/4bad55cf33436519f06a243547ec2a6e.pdf', 'Hanyang University — Spring 2027 International Admission Guidelines', NULL),
    (134, 'Hanyang University', 'Electronic Engineering', 'Electronic Engineering', 'Bachelor''s', 'https://oia.hanyang.ac.kr/files/attach/filebox/2026/08/24/4bad55cf33436519f06a243547ec2a6e.pdf', 'Hanyang University — Spring 2027 International Admission Guidelines', NULL),
    (134, 'Hanyang University', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://oia.hanyang.ac.kr/files/attach/filebox/2026/08/24/4bad55cf33436519f06a243547ec2a6e.pdf', 'Hanyang University — Spring 2027 International Admission Guidelines', NULL),
    (122, 'Nagoya University', 'Automotive Engineering Program — Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://admissions.g30.nagoya-u.ac.jp/undergraduate/', 'Nagoya University — G30 Undergraduate Programs', 'English'),
    (122, 'Nagoya University', 'Physics Program', 'Physics', 'Bachelor''s', 'https://admissions.g30.nagoya-u.ac.jp/undergraduate/', 'Nagoya University — G30 Undergraduate Programs', 'English'),
    (122, 'Nagoya University', 'Chemistry Program (School of Science)', 'Chemistry', 'Bachelor''s', 'https://admissions.g30.nagoya-u.ac.jp/undergraduate/', 'Nagoya University — G30 Undergraduate Programs', 'English'),
    (122, 'Nagoya University', 'Biological Science Program (School of Science)', 'Biology', 'Bachelor''s', 'https://admissions.g30.nagoya-u.ac.jp/undergraduate/', 'Nagoya University — G30 Undergraduate Programs', 'English'),
    (98, 'Universiti Teknologi Malaysia (UTM)', 'Bachelor of Chemical Engineering with Honours', 'Chemical Engineering', 'Bachelor''s', 'https://admission.utm.my/wp-content/uploads/sites/461/2026/10/UG-PROGRAMME-FEB-2027-INTAKE-LATEST.pdf', 'UTM — International Undergraduate Programmes February 2027', NULL),
    (98, 'Universiti Teknologi Malaysia (UTM)', 'Bachelor of Chemical Engineering (Bioprocess) with Honours', 'Bioprocess Engineering', 'Bachelor''s', 'https://admission.utm.my/wp-content/uploads/sites/461/2026/10/UG-PROGRAMME-FEB-2027-INTAKE-LATEST.pdf', 'UTM — International Undergraduate Programmes February 2027', NULL),
    (98, 'Universiti Teknologi Malaysia (UTM)', 'Bachelor of Civil Engineering with Honours', 'Civil Engineering', 'Bachelor''s', 'https://admission.utm.my/wp-content/uploads/sites/461/2026/10/UG-PROGRAMME-FEB-2027-INTAKE-LATEST.pdf', 'UTM — International Undergraduate Programmes February 2027', NULL),
    (98, 'Universiti Teknologi Malaysia (UTM)', 'Bachelor of Mechanical Precision Engineering with Honours', 'Mechanical Engineering', 'Bachelor''s', 'https://admission.utm.my/wp-content/uploads/sites/461/2026/10/UG-PROGRAMME-FEB-2027-INTAKE-LATEST.pdf', 'UTM — International Undergraduate Programmes February 2027', NULL),
    (218, 'Technische Universität Berlin', 'Computer Science, B.Sc.', 'Computer Science', 'Bachelor''s', 'https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/computer-science-b-sc', 'TU Berlin — Computer Science B.Sc.', NULL),
    (218, 'Technische Universität Berlin', 'Engineering Science, B.Sc.', 'Engineering', 'Bachelor''s', 'https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/engineering-science-b-sc', 'TU Berlin — Engineering Science B.Sc.', NULL),
    (218, 'Technische Universität Berlin', 'Electrical Engineering, B.Sc.', 'Electrical Engineering', 'Bachelor''s', 'https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/electrical-engineering-b-sc/', 'TU Berlin — Electrical Engineering B.Sc.', NULL),
    (218, 'Technische Universität Berlin', 'Mechanical Engineering, B.Sc.', 'Mechanical Engineering', 'Bachelor''s', 'https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/mechanical-engineering-b-sc', 'TU Berlin — Mechanical Engineering B.Sc.', NULL),
    (223, 'University of North Carolina at Chapel Hill', 'Earth and Marine Sciences Major, B.S.', 'Earth Science', 'Bachelor''s', 'https://catalog.unc.edu/undergraduate/programs-study/programs-study.pdf', 'UNC Chapel Hill — Undergraduate Programs of Study', NULL),
    (223, 'University of North Carolina at Chapel Hill', 'Economics Major, B.A.', 'Economics', 'Bachelor''s', 'https://catalog.unc.edu/undergraduate/programs-study/programs-study.pdf', 'UNC Chapel Hill — Undergraduate Programs of Study', NULL),
    (223, 'University of North Carolina at Chapel Hill', 'Economics Major, B.S.', 'Economics', 'Bachelor''s', 'https://catalog.unc.edu/undergraduate/programs-study/programs-study.pdf', 'UNC Chapel Hill — Undergraduate Programs of Study', NULL),
    (223, 'University of North Carolina at Chapel Hill', 'Clinical Laboratory Science Major, B.S.', 'Clinical Laboratory Science', 'Bachelor''s', 'https://catalog.unc.edu/undergraduate/programs-study/programs-study.pdf', 'UNC Chapel Hill — Undergraduate Programs of Study', NULL),
    (94, 'Université de Montréal', 'Baccalauréat en mathématiques et informatique', 'Mathematics and Computer Science', 'Bachelor''s', 'https://admission.umontreal.ca/programmes/baccalaureat-en-mathematiques-et-informatique/', 'Université de Montréal — Mathématiques et informatique', NULL),
    (94, 'Université de Montréal', 'Baccalauréat en physique', 'Physics', 'Bachelor''s', 'https://admission.umontreal.ca/programmes/baccalaureat-en-physique/', 'Université de Montréal — Physique', NULL),
    (308, 'Washington University in St. Louis', 'Biomedical Engineering, BS', 'Biomedical Engineering', 'Bachelor''s', 'https://bulletin.wustl.edu/undergrad/engineering/requirements/', 'Washington University Bulletin — Undergraduate Engineering Degrees', NULL),
    (308, 'Washington University in St. Louis', 'Chemical Engineering, BS', 'Chemical Engineering', 'Bachelor''s', 'https://bulletin.wustl.edu/undergrad/engineering/requirements/', 'Washington University Bulletin — Undergraduate Engineering Degrees', NULL),
    (308, 'Washington University in St. Louis', 'Computer Engineering, BS', 'Computer Engineering', 'Bachelor''s', 'https://bulletin.wustl.edu/undergrad/engineering/requirements/', 'Washington University Bulletin — Undergraduate Engineering Degrees', NULL),
    (308, 'Washington University in St. Louis', 'Electrical Engineering, BS', 'Electrical Engineering', 'Bachelor''s', 'https://bulletin.wustl.edu/undergrad/engineering/requirements/', 'Washington University Bulletin — Undergraduate Engineering Degrees', NULL),
    (222, 'Lancaster University', 'Data Science BSc Hons', 'Data Science', 'Bachelor''s', 'https://www.lancaster.ac.uk/study/undergraduate/courses/', 'Lancaster University — Undergraduate Courses', NULL),
    (222, 'Lancaster University', 'Economics BA Hons', 'Economics', 'Bachelor''s', 'https://www.lancaster.ac.uk/study/undergraduate/courses/index.php', 'Lancaster University — Undergraduate Courses', NULL),
    (222, 'Lancaster University', 'Economics BSc Hons', 'Economics', 'Bachelor''s', 'https://www.lancaster.ac.uk/study/undergraduate/courses/index.php', 'Lancaster University — Undergraduate Courses', NULL),
    (222, 'Lancaster University', 'Economics and Finance BSc Hons', 'Finance', 'Bachelor''s', 'https://www.lancaster.ac.uk/study/undergraduate/courses/index.php', 'Lancaster University — Undergraduate Courses', NULL),
    (307, 'University of Barcelona', 'Physics', 'Physics', 'Bachelor''s', 'https://web.ub.edu/en/web/estudis/w/bachelordegree-g1035?referer=bachelors-degrees-finder', 'University of Barcelona — Bachelor''s Degree in Physics', NULL),
    (307, 'University of Barcelona', 'Chemistry', 'Chemistry', 'Bachelor''s', 'https://web.ub.edu/en/web/estudis/w/bachelordegree-g1038', 'University of Barcelona — Bachelor''s Degree in Chemistry', NULL),
    (306, 'Texas A&M University', 'Bachelor of Science in Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://catalog.tamu.edu/undergraduate/engineering/', 'Texas A&M University — Undergraduate College of Engineering', NULL),
    (306, 'Texas A&M University', 'Bachelor of Science in Electrical Engineering', 'Electrical Engineering', 'Bachelor''s', 'https://catalog.tamu.edu/undergraduate/engineering/', 'Texas A&M University — Undergraduate College of Engineering', NULL),
    (306, 'Texas A&M University', 'Bachelor of Science in Industrial Distribution', 'Industrial Distribution', 'Bachelor''s', 'https://catalog.tamu.edu/undergraduate/engineering/', 'Texas A&M University — Undergraduate College of Engineering', NULL),
    (306, 'Texas A&M University', 'Bachelor of Science in Data Engineering', 'Data Engineering', 'Bachelor''s', 'https://catalog.tamu.edu/undergraduate/engineering/', 'Texas A&M University — Undergraduate College of Engineering', NULL),
    (317, 'Indian Institute of Technology Madras', 'Aerospace Engineering (B.Tech.)', 'Aerospace Engineering', 'Bachelor''s', 'https://www.iitm.ac.in/sites/default/files/Others/UG_Admission_2026.pdf', 'IIT Madras — Undergraduate Admission 2026', NULL),
    (317, 'Indian Institute of Technology Madras', 'Chemical Engineering (B.Tech.)', 'Chemical Engineering', 'Bachelor''s', 'https://www.iitm.ac.in/sites/default/files/Others/UG_Admission_2026.pdf', 'IIT Madras — Undergraduate Admission 2026', NULL),
    (317, 'Indian Institute of Technology Madras', 'Civil Engineering (B.Tech.)', 'Civil Engineering', 'Bachelor''s', 'https://www.iitm.ac.in/sites/default/files/Others/UG_Admission_2026.pdf', 'IIT Madras — Undergraduate Admission 2026', NULL),
    (317, 'Indian Institute of Technology Madras', 'Electrical Engineering (B.Tech.)', 'Electrical Engineering', 'Bachelor''s', 'https://www.iitm.ac.in/sites/default/files/Others/UG_Admission_2026.pdf', 'IIT Madras — Undergraduate Admission 2026', NULL),
    (317, 'Indian Institute of Technology Madras', 'Metallurgical and Materials Engineering (B.Tech.)', 'Materials Engineering', 'Bachelor''s', 'https://www.iitm.ac.in/sites/default/files/Others/UG_Admission_2026.pdf', 'IIT Madras — Undergraduate Admission 2026', NULL),
    (311, 'Arizona State University', 'Chemical engineering, BSE', 'Chemical Engineering', 'Bachelor''s', 'https://engineering.asu.edu/degrees/undergraduate/', 'Arizona State University — Engineering Undergraduate Degrees', NULL),
    (311, 'Arizona State University', 'Mechanical engineering, BSE', 'Mechanical Engineering', 'Bachelor''s', 'https://engineering.asu.edu/degrees/undergraduate/', 'Arizona State University — Engineering Undergraduate Degrees', NULL),
    (311, 'Arizona State University', 'Electrical Engineering, BSE', 'Electrical Engineering', 'Bachelor''s', 'https://degrees.apps.asu.edu/bachelors/major/ASU00/ESEEEBSE/electrical-engineering', 'Arizona State University — Electrical Engineering BSE', NULL),
    (311, 'Arizona State University', 'Engineering science (business), BS', 'Engineering and Business', 'Bachelor''s', 'https://sie.engineering.asu.edu/degrees/undergraduate/', 'Arizona State University — School of Integrated Engineering', NULL),
    (309, 'University of California, Santa Barbara', 'Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://admissions.sa.ucsb.edu/majors', 'UC Santa Barbara — Undergraduate Majors', NULL),
    (309, 'University of California, Santa Barbara', 'Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://admissions.sa.ucsb.edu/majors', 'UC Santa Barbara — Undergraduate Majors', NULL),
    (309, 'University of California, Santa Barbara', 'Electrical Engineering', 'Electrical Engineering', 'Bachelor''s', 'https://admissions.sa.ucsb.edu/majors', 'UC Santa Barbara — Undergraduate Majors', NULL),
    (309, 'University of California, Santa Barbara', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://admissions.sa.ucsb.edu/majors', 'UC Santa Barbara — Undergraduate Majors', NULL),
    (313, 'Queen’s University Belfast', 'Computer Science with Artificial Intelligence (BEng)', 'Artificial Intelligence', 'Bachelor''s', 'https://www.qub.ac.uk/courses/undergraduate/computer-science-artificial-intelligence-beng/', 'Queen’s University Belfast — Computer Science with Artificial Intelligence', NULL),
    (209, 'Al-Farabi Kazakh National University (KazNU)', 'Economics', 'Economics', 'Bachelor''s', 'https://welcome.kaznu.kz/en/education_programs/bachelor/speciality/1514', 'Al-Farabi Kazakh National University — Economics Bachelor', NULL),
    (274, 'National Yang Ming Chiao Tung University', 'Photonics (Bachelor Program)', 'Photonics', 'Bachelor''s', 'https://dop.nycu.edu.tw/en/admission.html', 'National Yang Ming Chiao Tung University — Photonics Bachelor Program', NULL),
    (305, 'Michigan State University', 'Economics', 'Economics', 'Bachelor''s', 'https://admissions.msu.edu/academics/majors-degrees-programs/economics', 'Michigan State University — Economics Major', NULL),
    (305, 'Michigan State University', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://admissions.msu.edu/academics/majors-degrees-programs/mechanical-engineering', 'Michigan State University — Mechanical Engineering', NULL),
    (305, 'Michigan State University', 'Statistics', 'Statistics', 'Bachelor''s', 'https://admissions.msu.edu/academics/majors-degrees-programs/statistics', 'Michigan State University — Statistics', NULL),
    (305, 'Michigan State University', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://admissions.msu.edu/academics/majors-degrees-programs/mathematics', 'Michigan State University — Mathematics', NULL),
    (303, 'Universidad de Chile', 'Ingeniería en Sonido', 'Sound Engineering', 'Bachelor''s', 'https://uchile.cl/carreras', 'Universidad de Chile — Carreras de pregrado', NULL),
    (303, 'Universidad de Chile', 'Licenciatura en Ciencias con mención en Biología', 'Biology', 'Bachelor''s', 'https://uchile.cl/carreras', 'Universidad de Chile — Carreras de pregrado', NULL),
    (303, 'Universidad de Chile', 'Licenciatura en Ciencias con mención en Física', 'Physics', 'Bachelor''s', 'https://uchile.cl/carreras', 'Universidad de Chile — Carreras de pregrado', NULL),
    (303, 'Universidad de Chile', 'Licenciatura en Ciencias con mención en Matemática', 'Mathematics', 'Bachelor''s', 'https://uchile.cl/carreras', 'Universidad de Chile — Carreras de pregrado', NULL),
    (228, 'Curtin University', 'Bachelor of Engineering (Honours)', 'Engineering', 'Bachelor''s', 'https://www.curtin.edu.au/study/offering/course-ug-engineering-sciences-first-year-stream-b-multidisc--stru-engsc/', 'Curtin University — Engineering Degree Pathways', NULL),
    (228, 'Curtin University', 'Bachelor of Engineering (Honours), Bachelor of Science', 'Engineering and Science', 'Bachelor''s', 'https://www.curtin.edu.au/study/offering/course-ug-engineering-sciences-first-year-stream-b-multidisc--stru-engsc/', 'Curtin University — Engineering Degree Pathways', NULL),
    (228, 'Curtin University', 'Bachelor of Engineering (Honours), Bachelor of Innovation', 'Engineering and Innovation', 'Bachelor''s', 'https://www.curtin.edu.au/study/offering/course-ug-engineering-sciences-first-year-stream-b-multidisc--stru-engsc/', 'Curtin University — Engineering Degree Pathways', NULL),
    (228, 'Curtin University', 'Bachelor of Engineering (Honours), Bachelor of Commerce', 'Engineering and Commerce', 'Bachelor''s', 'https://www.curtin.edu.au/study/offering/course-ug-engineering-sciences-first-year-stream-b-multidisc--stru-engsc/', 'Curtin University — Engineering Degree Pathways', NULL),
    (236, 'Universitas Indonesia', 'Civil Engineering (International Undergraduate Program)', 'Civil Engineering', 'Bachelor''s', 'https://international.eng.ui.ac.id/faq-2/', 'Universitas Indonesia — International Undergraduate Engineering', NULL),
    (236, 'Universitas Indonesia', 'Mechanical Engineering (International Undergraduate Program)', 'Mechanical Engineering', 'Bachelor''s', 'https://international.eng.ui.ac.id/faq-2/', 'Universitas Indonesia — International Undergraduate Engineering', NULL),
    (236, 'Universitas Indonesia', 'Electrical Engineering (International Undergraduate Program)', 'Electrical Engineering', 'Bachelor''s', 'https://international.eng.ui.ac.id/faq-2/', 'Universitas Indonesia — International Undergraduate Engineering', NULL),
    (236, 'Universitas Indonesia', 'Computer Engineering (International Undergraduate Program)', 'Computer Engineering', 'Bachelor''s', 'https://international.eng.ui.ac.id/faq-2/', 'Universitas Indonesia — International Undergraduate Engineering', NULL),
    (304, 'King Abdulaziz University', 'Bachelor of Science in Information Systems', 'Information Systems', 'Bachelor''s', 'https://www.kau.edu.sa/en/programs/bachelor-of-science-in-information-systems-278', 'King Abdulaziz University — Information Systems', NULL),
    (304, 'King Abdulaziz University', 'Bachelor of Science in Information Technology', 'Information Technology', 'Bachelor''s', 'https://www.kau.edu.sa/en/programs/bachelor-of-science-in-information-technology', 'King Abdulaziz University — Information Technology', NULL)
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
