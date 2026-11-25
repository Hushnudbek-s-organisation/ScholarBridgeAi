-- Official admissions evidence. Recheck identity fields without inheriting unsupported legacy values.
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
    (38, 'Institute of Science Tokyo', 'Electrical and Electronic Engineering', 'Electrical Engineering', 'Bachelor''s', 'https://www.isct.ac.jp/en/001/education/departments/undergraduate-se', 'Science Tokyo — Undergraduate Science and Engineering Departments', 'Japanese'),
    (85, 'Purdue University', 'Actuarial Science', 'Actuarial Science', 'Bachelor''s', 'https://ontour.admissions.purdue.edu/college-of-science/', 'Purdue University — College of Science', NULL),
    (85, 'Purdue University', 'Atmospheric Science', 'Atmospheric Science', 'Bachelor''s', 'https://ontour.admissions.purdue.edu/college-of-science/', 'Purdue University — College of Science', NULL),
    (85, 'Purdue University', 'Biology', 'Biology', 'Bachelor''s', 'https://ontour.admissions.purdue.edu/college-of-science/', 'Purdue University — College of Science', NULL),
    (85, 'Purdue University', 'Computer Engineering Technology', 'Computer Engineering Technology', 'Bachelor''s', 'https://admissions.purdue.edu/academics/majors/?alpha=C', 'Purdue Undergraduate Admissions — Majors', NULL),
    (106, 'University College Dublin (UCD)', 'BComm International', 'Commerce', 'Bachelor''s', 'https://hub.ucd.ie/usis/%21W_HU_MENU.P_PUBLISH?p_tag=COURSEUGPROGS', 'University College Dublin — Undergraduate Programme List', NULL),
    (106, 'University College Dublin (UCD)', 'BSc Business', 'Business', 'Bachelor''s', 'https://hub.ucd.ie/usis/%21W_HU_MENU.P_PUBLISH?p_tag=COURSEUGPROGS', 'University College Dublin — Undergraduate Programme List', NULL),
    (106, 'University College Dublin (UCD)', 'Economics & Finance', 'Economics and Finance', 'Bachelor''s', 'https://hub.ucd.ie/usis/%21W_HU_MENU.P_PUBLISH?p_tag=COURSEUGPROGS', 'University College Dublin — Undergraduate Programme List', NULL),
    (106, 'University College Dublin (UCD)', 'Structural Engineering with Architecture', 'Structural Engineering', 'Bachelor''s', 'https://hub.ucd.ie/usis/%21W_HU_MENU.P_PUBLISH?p_tag=COURSEUGPROGS', 'University College Dublin — Undergraduate Programme List', NULL),
    (312, 'King Saud University', 'Bachelor of Science in Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://ccis.ksu.edu.sa/en/node/2203', 'King Saud University — Undergraduate Computing Programmes', NULL),
    (312, 'King Saud University', 'Bachelor of Science in Software Engineering', 'Software Engineering', 'Bachelor''s', 'https://ccis.ksu.edu.sa/en/node/2203', 'King Saud University — Undergraduate Computing Programmes', NULL),
    (312, 'King Saud University', 'Bachelor of Science in Information Systems', 'Information Systems', 'Bachelor''s', 'https://ccis.ksu.edu.sa/en/node/2203', 'King Saud University — Undergraduate Computing Programmes', NULL),
    (312, 'King Saud University', 'Bachelor of Science in Information Technology — Data Science and Artificial Intelligence pathway', 'Data Science', 'Bachelor''s', 'https://ccis.ksu.edu.sa/en/node/2203', 'King Saud University — Undergraduate Computing Programmes', NULL),
    (221, 'Sungkyunkwan University (SKKU)', 'Korean Language and Literature', 'Korean', 'Bachelor''s', 'https://hakbu.skku.edu/eng_hakbu/programs/overview.do', 'Sungkyunkwan University — Overview of Majors', NULL),
    (221, 'Sungkyunkwan University (SKKU)', 'English Language and Literature', 'English', 'Bachelor''s', 'https://hakbu.skku.edu/eng_hakbu/programs/overview.do', 'Sungkyunkwan University — Overview of Majors', NULL),
    (221, 'Sungkyunkwan University (SKKU)', 'French Language and Literature', 'French', 'Bachelor''s', 'https://hakbu.skku.edu/eng_hakbu/programs/overview.do', 'Sungkyunkwan University — Overview of Majors', NULL),
    (221, 'Sungkyunkwan University (SKKU)', 'German Language and Literature', 'German', 'Bachelor''s', 'https://hakbu.skku.edu/eng_hakbu/programs/overview.do', 'Sungkyunkwan University — Overview of Majors', NULL),
    (221, 'Sungkyunkwan University (SKKU)', 'Chinese Language and Literature', 'Chinese', 'Bachelor''s', 'https://hakbu.skku.edu/eng_hakbu/programs/overview.do', 'Sungkyunkwan University — Overview of Majors', NULL),
    (102, 'Qatar University', 'Bachelor of Science in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://www.qu.edu.qa/en-us/students/Documents/students-undergraduate-catalog-2026-2027-en.pdf', 'Qatar University — Undergraduate Catalog 2026–2027', NULL),
    (102, 'Qatar University', 'Bachelor of Science in Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'https://www.qu.edu.qa/en-us/students/Documents/students-undergraduate-catalog-2026-2027-en.pdf', 'Qatar University — Undergraduate Catalog 2026–2027', NULL),
    (102, 'Qatar University', 'Bachelor of Science in Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://www.qu.edu.qa/en-us/students/Documents/students-undergraduate-catalog-2026-2027-en.pdf', 'Qatar University — Undergraduate Catalog 2026–2027', NULL),
    (102, 'Qatar University', 'Bachelor of Science in Artificial Intelligence', 'Artificial Intelligence', 'Bachelor''s', 'https://www.qu.edu.qa/en-us/students/Documents/students-undergraduate-catalog-2026-2027-en.pdf', 'Qatar University — Undergraduate Catalog 2026–2027', NULL),
    (220, 'Karlsruhe Institute of Technology', 'Physics B.Sc.', 'Physics', 'Bachelor''s', 'https://www.sle.kit.edu/english/vorstudium/bachelor-physics.php', 'Karlsruhe Institute of Technology — Physics B.Sc.', NULL),
    (220, 'Karlsruhe Institute of Technology', 'Chemical and Process Engineering B.Sc.', 'Chemical Engineering', 'Bachelor''s', 'https://www.sle.kit.edu/english/vorstudium/bachelor-chemical-process-engineering.php', 'Karlsruhe Institute of Technology — Chemical and Process Engineering B.Sc.', NULL),
    (108, 'Indian Institute of Technology Delhi (IIT Delhi)', 'B.Tech in Biochemical Engineering and Biotechnology', 'Biotechnology', 'Bachelor''s', 'https://international.iitd.ac.in/undergraduate-studies/', 'IIT Delhi International Relations — Undergraduate Studies', NULL),
    (108, 'Indian Institute of Technology Delhi (IIT Delhi)', 'B.Tech in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://international.iitd.ac.in/undergraduate-studies/', 'IIT Delhi International Relations — Undergraduate Studies', NULL),
    (108, 'Indian Institute of Technology Delhi (IIT Delhi)', 'B.Tech in Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'https://international.iitd.ac.in/undergraduate-studies/', 'IIT Delhi International Relations — Undergraduate Studies', NULL),
    (108, 'Indian Institute of Technology Delhi (IIT Delhi)', 'B.Tech in Mathematics & Computing', 'Mathematics and Computing', 'Bachelor''s', 'https://academics.iitd.ac.in/b-tech/', 'Indian Institute of Technology Delhi — B.Tech Programs', NULL),
    (109, 'RMIT University', 'Bachelor of Engineering (Civil and Infrastructure) (Honours)', 'Civil Engineering', 'Bachelor''s', 'https://www.rmit.edu.au/study-with-us/international-students/study/engineering-in-australia', 'RMIT — Study Engineering in Australia', NULL),
    (109, 'RMIT University', 'Bachelor of Engineering (Electrical Engineering) (Honours)', 'Electrical Engineering', 'Bachelor''s', 'https://www.rmit.edu.au/study-with-us/international-students/study/engineering-in-australia', 'RMIT — Study Engineering in Australia', NULL),
    (109, 'RMIT University', 'Bachelor of Engineering (Aerospace Engineering) (Honours)', 'Aerospace Engineering', 'Bachelor''s', 'https://www.rmit.edu.au/study-with-us/levels-of-study/undergraduate-study/honours-degrees/bachelor-of-engineering-aerospace-engineering-honours-bh078/pathways', 'RMIT — Aerospace Engineering Pathways', NULL),
    (109, 'RMIT University', 'Bachelor of Engineering (Mechanical Engineering) (Honours)', 'Mechanical Engineering', 'Bachelor''s', 'https://www.rmit.edu.au/study-with-us/levels-of-study/undergraduate-study/honours-degrees/bh070', 'RMIT — Bachelor of Engineering (Mechanical Engineering) (Honours)', NULL),
    (73, 'Rice University', 'Bioengineering (BSBE)', 'Bioengineering', 'Bachelor''s', 'https://ga.rice.edu/undergraduate-students/academic-opportunities/degrees/', 'Rice University General Announcements — Undergraduate Degrees', NULL),
    (73, 'Rice University', 'Chemical Engineering (BSCHE)', 'Chemical Engineering', 'Bachelor''s', 'https://ga.rice.edu/undergraduate-students/academic-opportunities/degrees/', 'Rice University General Announcements — Undergraduate Degrees', NULL),
    (73, 'Rice University', 'Civil Engineering (BSCE)', 'Civil Engineering', 'Bachelor''s', 'https://ga.rice.edu/undergraduate-students/academic-opportunities/degrees/', 'Rice University General Announcements — Undergraduate Degrees', NULL),
    (73, 'Rice University', 'Mechanical Engineering (BSME)', 'Mechanical Engineering', 'Bachelor''s', 'https://ga.rice.edu/undergraduate-students/academic-opportunities/degrees/', 'Rice University General Announcements — Undergraduate Degrees', NULL),
    (119, 'Macquarie University', 'Bachelor of Applied Finance', 'Finance', 'Bachelor''s', 'https://www.mq.edu.au/study/find-a-course/courses/bachelor-of-applied-finance/', 'Macquarie University — Bachelor of Applied Finance', NULL),
    (105, 'Universiti Sains Malaysia (USM)', 'Bachelor of Electronic Engineering with Honours', 'Electronic Engineering', 'Bachelor''s', 'https://admission.usm.my/undergraduate/undergraduate-international', 'Universiti Sains Malaysia — International Undergraduate Programmes', NULL),
    (105, 'Universiti Sains Malaysia (USM)', 'Bachelor of Chemical Engineering with Honours', 'Chemical Engineering', 'Bachelor''s', 'https://admission.usm.my/undergraduate/undergraduate-international', 'Universiti Sains Malaysia — International Undergraduate Programmes', NULL),
    (105, 'Universiti Sains Malaysia (USM)', 'Bachelor of Civil Engineering with Honours', 'Civil Engineering', 'Bachelor''s', 'https://admission.usm.my/undergraduate/undergraduate-international', 'Universiti Sains Malaysia — International Undergraduate Programmes', NULL),
    (52, 'University of Wisconsin-Madison', 'Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://guide.wisc.edu/undergraduate/engineering/mechanical-engineering/', 'University of Wisconsin–Madison — Mechanical Engineering', NULL),
    (52, 'University of Wisconsin-Madison', 'Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://guide.wisc.edu/undergraduate/engineering/chemical-biological-engineering/', 'University of Wisconsin–Madison — Chemical and Biological Engineering', NULL),
    (104, 'University of California, Davis (UC Davis)', 'Aerospace Science and Engineering', 'Aerospace Engineering', 'Bachelor''s', 'https://engineering.ucdavis.edu/undergraduates/majors-and-minors', 'UC Davis College of Engineering — Majors and Minors', NULL),
    (104, 'University of California, Davis (UC Davis)', 'Biochemical Engineering', 'Biochemical Engineering', 'Bachelor''s', 'https://engineering.ucdavis.edu/undergraduates/majors-and-minors', 'UC Davis College of Engineering — Majors and Minors', NULL),
    (104, 'University of California, Davis (UC Davis)', 'Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'https://engineering.ucdavis.edu/undergraduates/majors-and-minors', 'UC Davis College of Engineering — Majors and Minors', NULL),
    (104, 'University of California, Davis (UC Davis)', 'Computer Engineering', 'Computer Engineering', 'Bachelor''s', 'https://engineering.ucdavis.edu/undergraduates/majors-and-minors', 'UC Davis College of Engineering — Majors and Minors', NULL),
    (95, 'Universiti Putra Malaysia (UPM)', 'Bachelor of Aerospace Engineering with Honours', 'Aerospace Engineering', 'Bachelor''s', 'https://eng.upm.edu.my/academic/undergraduate/bachelor_program_admission_requirements-2288', 'Universiti Putra Malaysia — Engineering Undergraduate Programmes', NULL),
    (95, 'Universiti Putra Malaysia (UPM)', 'Bachelor of Civil Engineering with Honours', 'Civil Engineering', 'Bachelor''s', 'https://eng.upm.edu.my/academic/undergraduate/bachelor_program_admission_requirements-2288', 'Universiti Putra Malaysia — Engineering Undergraduate Programmes', NULL),
    (95, 'Universiti Putra Malaysia (UPM)', 'Bachelor of Electrical and Electronic Engineering with Honours', 'Electrical Engineering', 'Bachelor''s', 'https://eng.upm.edu.my/academic/undergraduate/bachelor_program_admission_requirements-2288', 'Universiti Putra Malaysia — Engineering Undergraduate Programmes', NULL),
    (95, 'Universiti Putra Malaysia (UPM)', 'Bachelor of Computer and Communication Systems Engineering with Honours', 'Computer Engineering', 'Bachelor''s', 'https://eng.upm.edu.my/academic/undergraduate/bachelor_program_admission_requirements-2288', 'Universiti Putra Malaysia — Engineering Undergraduate Programmes', NULL),
    (75, 'Georgia Institute of Technology (Georgia Tech)', 'Aerospace Engineering (BS)', 'Aerospace Engineering', 'Bachelor''s', 'https://catalog.gatech.edu/programs/', 'Georgia Tech Catalog — Undergraduate Programs', NULL),
    (75, 'Georgia Institute of Technology (Georgia Tech)', 'Biomedical Engineering (BS)', 'Biomedical Engineering', 'Bachelor''s', 'https://catalog.gatech.edu/programs/', 'Georgia Tech Catalog — Undergraduate Programs', NULL),
    (75, 'Georgia Institute of Technology (Georgia Tech)', 'Chemical and Biomolecular Engineering (BS)', 'Chemical Engineering', 'Bachelor''s', 'https://catalog.gatech.edu/programs/', 'Georgia Tech Catalog — Undergraduate Programs', NULL),
    (75, 'Georgia Institute of Technology (Georgia Tech)', 'Civil Engineering (BS)', 'Civil Engineering', 'Bachelor''s', 'https://catalog.gatech.edu/programs/', 'Georgia Tech Catalog — Undergraduate Programs', NULL),
    (229, 'Western University', 'Biology', 'Biology', 'Bachelor''s', 'https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/', 'Western University — Undergraduate Programs', NULL),
    (229, 'Western University', 'Chemistry', 'Chemistry', 'Bachelor''s', 'https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/', 'Western University — Undergraduate Programs', NULL),
    (229, 'Western University', 'Mathematics', 'Mathematics', 'Bachelor''s', 'https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/', 'Western University — Undergraduate Programs', NULL),
    (229, 'Western University', 'Physics and Astronomy', 'Physics and Astronomy', 'Bachelor''s', 'https://welcome.uwo.ca/what-can-i-study/undergraduate-programs/', 'Western University — Undergraduate Programs', NULL),
    (238, 'National Tsing Hua University', 'International Bachelor Degree Program — Electrical Engineering and Computer Science', 'Computer Science', 'Bachelor''s', 'https://oga.site.nthu.edu.tw/p/404-1524-230928.php?Lang=en', 'National Tsing Hua University — International Bachelor Degree Program', 'English'),
    (238, 'National Tsing Hua University', 'International Bachelor Degree Program — Engineering Technology', 'Engineering', 'Bachelor''s', 'https://oga.site.nthu.edu.tw/p/404-1524-230928.php?Lang=en', 'National Tsing Hua University — International Bachelor Degree Program', 'English'),
    (227, 'Tongji University', 'Civil Engineering (Chinese-taught)', 'Civil Engineering', 'Bachelor''s', 'https://civileng.tongji.edu.cn/civilengen/Admissions/list.htm', 'Tongji University — Civil Engineering Admissions 2027', 'Chinese'),
    (227, 'Tongji University', 'Geological Engineering', 'Geological Engineering', 'Bachelor''s', 'https://civileng.tongji.edu.cn/civilengen/Admissions/list.htm', 'Tongji University — Civil Engineering Admissions 2027', 'Chinese'),
    (188, 'Khalifa University', 'Bachelor of Science in Aerospace Engineering', 'Aerospace Engineering', 'Bachelor''s', 'https://www.ku.ac.ae/faqs/what-bachelors-degrees-are-offered-at-ku', 'Khalifa University — Bachelor’s degrees', NULL),
    (188, 'Khalifa University', 'Bachelor of Science in Chemical Engineering', 'Chemical Engineering', 'Bachelor''s', 'https://www.ku.ac.ae/faqs/what-bachelors-degrees-are-offered-at-ku', 'Khalifa University — Bachelor’s degrees', NULL),
    (188, 'Khalifa University', 'Bachelor of Science in Civil Engineering', 'Civil Engineering', 'Bachelor''s', 'https://www.ku.ac.ae/faqs/what-bachelors-degrees-are-offered-at-ku', 'Khalifa University — Bachelor’s degrees', NULL),
    (188, 'Khalifa University', 'Bachelor of Science in Mechanical Engineering', 'Mechanical Engineering', 'Bachelor''s', 'https://www.ku.ac.ae/faqs/what-bachelors-degrees-are-offered-at-ku', 'Khalifa University — Bachelor’s degrees', NULL),
    (224, 'Wageningen University & Research', 'Bachelor’s in International Land and Water Management', 'Water Management', 'Bachelor''s', 'https://www.wur.nl/en/education/bachelor/bachelors-international-land-and-water-management', 'Wageningen University & Research — International Land and Water Management', 'English')
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
     '2026-11-24 official QS catalogue review','catalogue_review','verified'
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
  SELECT scope,2,'2026-11-24 official QS catalogue review',now()
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
