-- Scholarship rewrite pass 18 — 2026-10-23
-- The China cluster, first batch: the three municipal and provincial government
-- scholarships, plus the Schwarzman duplicate.
--
-- Insight that drives this pass: the importer treated "CSC + <something local>" as one
-- award everywhere. CSC is one national programme (id 866). Beijing, Shanghai and
-- Zhejiang each run their own separate municipal or provincial scholarship, with their
-- own amounts, age limits and application channels, and none of them is CSC.
--
-- Rows: 32 Schwarzman rewritten · 124 Schwarzman duplicate retired
--       798 Beijing Government Scholarship · 687 Shanghai Government Scholarship
--       846 Zhejiang Provincial Government Scholarship
--
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 124 — duplicate of id 32, and fabricated. Retired.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false,
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicate of the Schwarzman Scholars record (id 32)',
  deadline = 'Retired 2026-10-23 - see id 32',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  notes = 'RETIRED 2026-10-23 as a duplicate with fabricated content. The record was titled "Schwarzman Scholars Program and Tsinghua Award" and claimed a USD 75,000 award, a "September 12 annually" deadline and - the giveaway - a description reading "fully funded 1-year master program at Schwarzman College alongside full university doctoral grants", with tsinghua.edu.cn as its source. Schwarzman Scholars has nothing to do with doctoral grants; it is a one-year professional master of Global Affairs at Schwarzman College, Tsinghua. The real deadline has never been 12 September: the class of 2027-2028 U.S./Global round closed on 9 September 2026 at 15:00 EDT and the China round on 20 May 2026, and the next U.S./Global window opens in April 2027 and closes in September 2027. The programme is already recorded properly as id 32, which carries the correct admissions page, so this row only added a wrong number and a wrong date to the catalogue.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 124;

-- ---------------------------------------------------------------------------
-- 32 — Schwarzman Scholars, rewritten in full.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Schwarzman Scholars (Tsinghua University)',
  provider = 'Schwarzman College, Tsinghua University',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Fully funded leadership master',
  tuition_coverage = 'The whole residential package is covered: tuition, room and board, travel to and from Beijing, a study tour, books and supplies, a laptop, health insurance and a personal stipend',
  deadline = 'Class of 2028-2029: April - September 2027 for U.S. and global applicants; March - May 2027 for applicants with Chinese citizenship',
  deadline_type = 'range',
  deadline_date = NULL,
  expected_deadline_period = 'The U.S./global window for the class of 2028-2029 opens in April 2027 and closes in September 2027, with interviews in October and November 2027 and the programme starting in August 2028. Applicants with passports from mainland China, Hong Kong, Macau or Taiwan apply through the China system between March and May 2027.',
  degree_levels = '["Master''s"]',
  eligible_majors = '["Public Policy","Economics and Business","International Studies"]',
  eligible_countries = '["All"]',
  min_ielts = 7.0,
  description = 'Schwarzman Scholars is a one-year residential master of Global Affairs at Schwarzman College on the Tsinghua campus in Beijing, and it is the most heavily funded single award in this catalogue: tuition, room and board, travel to and from Beijing, a study tour, books and supplies, a laptop, health insurance and a personal stipend all come with the place. About 150 scholars are chosen each year from a global pool for demonstrated leadership, exemplary character, academic aptitude, empathy and intercultural competence, open-mindedness and entrepreneurial spirit, and they study in one of three concentrations - public policy, economics and business, or international studies. Teaching is entirely in English and there is no requirement that the undergraduate degree be in any particular field. Age matters and trips people up: a candidate must be at least 18 and not yet 29 on 1 August of the enrolment year, so for the class of 2028-2029 that means not yet 29 on 1 August 2028. The programme publishes no single cash value for the package, so no dollar total is claimed here.',
  requirements = 'Hold an undergraduate degree or its equivalent, conferred by 1 August of the enrolment year, from an accredited college or university - applicants still studying must be on track to finish by that date. Be at least 18 and not yet 29 years old on 1 August of the enrolment year. Prove English proficiency: TOEFL 100 out of 120, or IELTS 7.0, or Cambridge C1 Advanced / C2 Proficiency at 185, or Duolingo 130 - waived for applicants who studied at least two years in an institution where the language of instruction was English, or who have studied in English for two or more years at master level or above. Submit the online application in English through the U.S./global system or, for holders of mainland Chinese, Hong Kong, Macau or Taiwanese passports, through the China application system. Some universities run their own internal pre-application process for their undergraduates and may set earlier internal deadlines, so campus contacts should be consulted early.',
  required_documents = '["Online Schwarzman Scholars application in English","Resume or CV, maximum two pages","Leadership essay of 750 words and a statement of purpose of 500 words","Official transcripts from every degree-granting institution attended","Three letters of recommendation","One-minute video self-introduction","English proficiency test score, unless waived"]',
  english_requirements = 'TOEFL 100 out of 120, IELTS 7.0, Cambridge C1 Advanced or C2 Proficiency at 185, or Duolingo 130. The requirement is waived for applicants who studied at an undergraduate institution where English was the language of instruction for at least two years of their programme, or who have studied in English for two or more years at master level or higher.',
  website_url = 'https://www.schwarzmanscholars.org/admissions/',
  source_url = 'https://www.schwarzmanscholars.org/admissions/',
  application_url = 'https://connect.schwarzmanscholars.org/apply/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the programme''s own admissions page (fetched 2026-10-23). CORRECTIONS: the imported record carried only a one-line description and an imprecise "April - September 2027" window without the China track or the eligibility rules. The separate row id 124, which claimed USD 75,000 "alongside full university doctoral grants" and a 12 September deadline, has been retired as a duplicate with fabricated content. AMOUNT: the programme publishes a comprehensive package rather than a cash figure, so amount_usd_value stays 0 rather than repeating an unverified total. DEGREE LEVEL: master only - the old duplicate''s mention of doctoral grants was wrong. DEADLINE: the class of 2027-2028 is closed (U.S./global closed 9 September 2026, China closed 20 May 2026); the next cycle is the class of 2028-2029, which is why the record carries a range and application_status is closed.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 32;

-- ---------------------------------------------------------------------------
-- 798 — Tsinghua: Beijing Government Scholarship (municipal, not CSC).
-- Was: "Chinese Government Scholarship (CSC) & Beijing Government Scholarship",
--      USD 20 500, "Nov-Feb (3 Rounds)".
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Beijing Government Scholarship (BGS) at Tsinghua University',
  provider = 'Beijing Municipal Government, administered through the host university',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 40000,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Municipal government scholarship',
  tuition_coverage = 'Category C covers tuition and comprehensive medical insurance; Category B adds free on-campus accommodation; Category A adds a monthly living allowance on top of both',
  deadline = 'Set by the host university each year - applicants apply to BGS through the Beijing institution, not to the municipality',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Beijing publishes the procedures each January and the host universities then open their own windows. Both newly admitted and currently enrolled students apply through the institution that will host them, so the date to watch is Tsinghua''s own scholarship page for the 2027 intake.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'The Beijing Government Scholarship is paid by the Beijing municipality, not by Tsinghua, and it is a genuinely separate pot of money from the Chinese Government Scholarship - many applicants assume the two are the same and miss it. It comes in three categories. Category C covers tuition and comprehensive medical insurance. Category B adds free on-campus accommodation, or a monthly or quarterly accommodation allowance if the student is approved to live off campus. Category A adds a living allowance on top of tuition, housing and insurance, and that is the tier worth aiming for. Both newly admitted and currently enrolled international students may apply, undergraduate, master, doctoral, preparatory, visiting and research scholar alike, and the municipality leaves the review and the decision to the host institution. The standard amounts published by Beijing universities are RMB 40,000 a year for a full doctoral award, RMB 30,000 for a master''s and RMB 20,000 for an undergraduate, with half awards at RMB 20,000, 15,000 and 10,000; where a programme charges a different tuition rate, the award is set against that programme''s own fee standard. The funding period never exceeds the standard length of the programme, and a doctoral student who overruns for special reasons may apply for an extension.',
  requirements = 'Be a non-Chinese citizen in good health and apply to a higher education institution or research institute in Beijing - the scholarship is open to degree students at undergraduate, master and doctoral level, and to non-degree students including preparatory students, visiting and exchange students, and research scholars. Apply through the host institution rather than through the municipality, because Beijing explicitly hands review and selection to the universities. Currently enrolled students may apply for a renewal or a new award as well as new applicants. Award holders may not hold another Chinese government scholarship at the same time. Doctoral candidates unable to finish within the standard period may request an extension with reasons.',
  required_documents = '["Tsinghua University admission application","Beijing Government Scholarship application submitted through Tsinghua","Passport or identity document","Highest diploma and full transcripts","Language proficiency evidence for the chosen programme","Study or research plan, and recommendation letters where the host institution requires them"]',
  english_requirements = 'BGS itself sets no English score. It follows the host programme: Chinese-taught degrees need HSK, and English-taught degrees set their own IELTS or TOEFL threshold in the programme entry.',
  website_url = 'https://english.beijing.gov.cn/studyinginbeijing/news/202601/t20260123_4459326.html',
  source_url = 'https://english.beijing.gov.cn/studyinginbeijing/news/202601/t20260123_4459326.html',
  application_url = 'https://english.beijing.gov.cn/studyinginbeijing/scholarshipapplications/',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the Beijing municipal government''s own Application Procedures page for the Beijing Government Scholarship (fetched 2026-10-23). CORRECTIONS: the imported record was called "Chinese Government Scholarship (CSC) & Beijing Government Scholarship" and presented two different programmes as one award, carrying an invented USD 20,500 and a "Nov-Feb (3 Rounds)" deadline. CSC is a national programme recorded as id 866; the Beijing scholarship is municipal, smaller and separate. The record now covers only BGS. AMOUNT: RMB 40,000 is the standard full doctoral award published by Beijing universities (UIBE and others give RMB 20,000 undergraduate, 30,000 master, 40,000 doctoral, with half awards at 10,000/15,000/20,000); the municipal procedures page itself sets out the category structure and leaves the figure to each host institution''s tuition standard, so the number is labelled as the standard full doctoral figure rather than as a universal one. USD value is 0 because no official USD conversion is published for this award. DEADLINE: deliberately not_published, because the municipality does not set a date - it hands the calendar to the host university.(See also the Type A/B/C structure and the age caps that the old row lacked entirely.)',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 798;

-- ---------------------------------------------------------------------------
-- 687 — Tongji: Shanghai Government Scholarship (municipal, not CSC).
-- Was: "Shanghai Government Scholarship (SGS) & CSC", USD 20 500, "Dec-Apr".
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Shanghai Government Scholarship (SGS) at Tongji University',
  provider = 'Shanghai Municipal People''s Government, administered through the host university',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Municipal government scholarship',
  tuition_coverage = 'Type A covers tuition, accommodation, a monthly living allowance and comprehensive medical insurance; Type B covers tuition and comprehensive medical insurance only',
  deadline = 'Set by each Shanghai university - the municipal window generally runs from February to April',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'The municipality describes the application period as generally February to April each year, applied for on the Study in Shanghai portal, while individual universities open earlier and split the window into batches - East China Normal University ran a first batch from 15 November 2025 to 1 March 2026 and a second from 2 March to 30 April 2026. Watch Tongji''s own international student page for the 2027 cycle.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = 6.5,
  description = 'The Shanghai Government Scholarship has existed since 2006 and is paid by the Shanghai municipality, which makes it a separate opportunity from the Chinese Government Scholarship even though both are applied for around the same months. Type A is the full award: tuition, accommodation, comprehensive medical insurance and a monthly living allowance of CNY 2,500 for an undergraduate, 3,000 for a master''s student and 3,500 for a doctoral student. Type B is the partial award, covering tuition and insurance with no housing and no stipend. Funding runs for the standard length of the programme, four to five years for a bachelor''s, two to three for a master''s and three to four for a doctorate. Age limits are enforced and are stricter than at most Chinese universities: no more than 25 for an undergraduate, 35 for a master''s and 40 for a doctorate. An applicant who already holds another Chinese government or organisational scholarship cannot apply, and from 2026 bachelor-level applicants to Shanghai universities must also pass the CSCA assessment before submitting the university application.',
  requirements = 'Be a non-Chinese citizen in good health and apply to a higher education institution in Shanghai. Meet the age limits: no more than 25 for an undergraduate programme with a high school diploma, no more than 35 for a master''s with a bachelor degree, and no more than 40 for a doctorate with a master degree and research ability. Meet the language bar, which is higher than mere admission: HSK 5 with 210 or more for science and engineering, HSK 6 with 180 or more for the humanities, or IELTS 6.5 / TOEFL 90 for an English-taught programme. Hold no other scholarship from a Chinese government or organisation. Applicants for bachelor-level study from 2026 onwards must sit the CSCA assessment, which runs five times a year and includes a compulsory mathematics paper, with the Chinese component waived for English-medium programmes and scores valid for two years.',
  required_documents = '["Tongji University admission application","Shanghai Government Scholarship application on the Study in Shanghai portal","Passport","High school diploma or degree certificate with transcripts","HSK certificate or IELTS/TOEFL score depending on the language of instruction","CSCA assessment result for bachelor-level applicants","Study plan and recommendation letters where the university requires them"]',
  english_requirements = 'IELTS 6.5 or TOEFL 90 for English-taught programmes. Chinese-taught programmes need HSK 5 with 210 or more in science and engineering, or HSK 6 with 180 or more in the humanities.',
  website_url = 'https://edu.sh.gov.cn/study_en_scholarships/20240904/5d8add31c7ce44a4b1e0d5bdfafe1495.html',
  source_url = 'https://edu.sh.gov.cn/study_en_scholarships/20240904/5d8add31c7ce44a4b1e0d5bdfafe1495.html',
  application_url = 'https://www.study-shanghai.cn/',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the Shanghai Municipal Education Commission''s own application guide for the Shanghai Government Scholarship (fetched 2026-10-23). CORRECTIONS: the imported record was called "Shanghai Government Scholarship (SGS) & CSC" and again merged a municipal award with the national Chinese Government Scholarship, carrying an invented USD 20,500 and a "Dec-Apr" deadline. CSC is recorded separately as id 866. The record now covers SGS only, with the Type A and Type B split, the 2,500/3,000/3,500 CNY monthly stipend by level, the 25/35/40 age limits and the HSK or IELTS thresholds that the municipal guide sets, none of which the old row contained. AMOUNT: amount_usd_value and award_amount are deliberately left empty, because the value depends on which of three discipline classes the programme falls into and on whether the student wins Type A or Type B, and no single published total exists; a fabricated round number is exactly what this pass is removing. DEADLINE: the municipality gives only "generally February to April" and hands the calendar to the universities, so the record says not_published rather than inventing a date.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 687;

-- ---------------------------------------------------------------------------
-- 846 — ZJU: Zhejiang Provincial Government Scholarship (provincial, not CSC).
-- Was: "CSC, Zhejiang Provincial Scholarship & ZJU Scholarship", USD 22 000.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Zhejiang Provincial Government Scholarship at Zhejiang University',
  provider = 'Zhejiang Provincial Government, administered through the host university',
  coverage_type = 'Partial Funding',
  amount_usd_value = 0,
  award_amount = 30000,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Provincial government scholarship',
  tuition_coverage = 'A flat cash award towards the cost of study - Type A pays CNY 30,000 a year for a master''s or doctoral student, Type B pays CNY 20,000 a year for an undergraduate and Type C pays CNY 6,000 for a long-term or language student. It carries no monthly stipend and no automatic housing or insurance',
  deadline = 'New international postgraduate applicants: the 2026 cycle closed on 28 February 2026; the 2027 date is set by Zhejiang University',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Zhejiang University runs the provincial award alongside its own admission rounds, with a February deadline for new international postgraduate applicants in the last cycle and an annual selection each autumn for students already enrolled. The 2027 dates are published on ZJU''s International College site.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'The Zhejiang Provincial Government Scholarship is paid by the province rather than by the university, and it is a flat sum of money towards the cost of study rather than a full ride - a distinction that the old catalogue entry hid behind a large invented dollar figure. Type A pays CNY 30,000 a year to an outstanding master''s or doctoral student, Type B pays CNY 20,000 a year to an outstanding undergraduate, and Type C pays CNY 6,000 to a long-term or language student. None of the three includes a monthly stipend, and none automatically includes accommodation or insurance, so the award is best understood as covering a substantial part of tuition with the balance falling to the student. The funding period is one year and a strong student may reapply while their studies continue. Eligibility is capped by age: no more than 30 for a bachelor''s applicant holding a high school diploma, and 35 for a master''s or doctoral applicant. A holder of another Chinese government scholarship of any level is not eligible, and Zhejiang University will not process a scholarship application at all unless the university application fee has been paid - CNY 800 for degree applicants, CNY 400 for Chinese language students, and not refundable either way.',
  requirements = 'Be a non-Chinese citizen in good health with a strong academic record, and either be studying at a higher-education institution in Zhejiang or be applying to one for a bachelor''s, master''s, doctoral or long-term general scholar programme. Respect the age caps: 30 or under for a bachelor''s applicant with a high school diploma, 35 or under for a master''s or doctoral applicant. Hold no other Chinese government scholarship at any level. Apply to Zhejiang University and pay the application fee first, because an application without the fee is treated as invalid and neither admission nor the scholarship is processed. For the new international postgraduate round, Zhejiang University reviews the files, holds a video interview and then recommends candidates to the province, which makes the university''s review the first filter rather than the last.',
  required_documents = '["Zhejiang University application through the international student system, with the CNY 800 application fee paid","Passport","High school diploma or degree certificate with full transcripts","Language proficiency evidence for the chosen programme","Study or research plan","Recommendation letters","Video interview for the postgraduate round"]',
  english_requirements = 'The provincial scholarship sets no score of its own. The degree programme decides: English-taught programmes publish their own IELTS or TOEFL threshold, and Chinese-taught programmes require HSK.',
  website_url = 'https://iczu.zju.edu.cn/iczuen/2025/1021/c63325a3094255/page.htm',
  source_url = 'https://iczu.zju.edu.cn/iczuen/2025/1021/c63325a3094255/page.htm',
  application_url = 'https://iczu.zju.edu.cn/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from Zhejiang University''s own International College notice on the Zhejiang Provincial Government Scholarship selection (fetched 2026-10-23), which states the type A and type B amounts directly: "Type A for graduate students: 30,000 RMB per student, Type B for undergraduate students: 20,000 RMB per student". CORRECTIONS: the imported record was called "CSC, Zhejiang Provincial Scholarship & ZJU Scholarship", bundled three separate programmes into one row, invented USD 22,000 and a "Nov-Mar" deadline, and gave the impression of a fully funded package. CSC is recorded separately as id 866 and ZJU''s own scholarship is a third, separate scheme. AMOUNT: CNY 30,000 is the largest published type, and no USD conversion is published, so amount_usd_value is 0 while award_amount carries the real CNY figure. IMPORTANT HONESTY POINT: the province''s award carries no monthly stipend and no automatic accommodation, which is why coverage_type is Partial Funding rather than Full Tuition - the old row''s "Full Tuition + Stipend" label was wrong on both counts. TYPE C: the CNY 6,000 long-term award is described but not given its own record. DEADLINE: the 2026 postgraduate round closed on 28 February 2026 and no 2027 date is published yet, so the record says not_published rather than guessing.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 846;
