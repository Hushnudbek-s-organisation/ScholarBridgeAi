-- ScholarBridge AI - Enrichment Batch 11 - 2026-10-26
-- Added 946 (International Chinese Language Teachers Scholarship, CLEC)
-- and 947 (AISG PhD Fellowship Programme), both verified from official
-- sources fetched 2026-10-26. Sources 3084 (AISG programme page) and
-- 3085 (CLEC official website); links 947->3084, 946->3085. Neither
-- scheme is tied to one university, so university_id is NULL and no
-- university_scholarships rows were created.
-- NOTE ON IDS: the two scholarship INSERTs were executed in parallel
-- with RETURNING and completed in the order CLEC (946) then AISG (947);
-- the mapping below is pinned from those RETURNING results.
-- Rejected after audit (not inserted): NZIDRS (New Zealand International
-- Doctoral Research Scholarship - no longer offered, per the University
-- of Auckland's official help page) and A*STAR ACIS (no longer a
-- standalone scheme - A*STAR's site now presents Computing as a
-- specialised track of the A*STAR Graduate Scholarship, already
-- catalogued as record 930; the old ACIS URL returns Page Not Found).
-- Statements below replay the exact executed SQL with ids pinned.
-- See docs/SCHOLARSHIP_ENRICHMENT_BATCH_11_2026-10-26.md.

INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  946,
  'International Chinese Language Teachers Scholarship',
  'Center for Language Education and Cooperation (CLEC), China',
  'China', 'Full Tuition + Stipend', 0,
  'Recurring annual deadlines (Beijing time): applications open 1 March; for July admission close 15 April, for September admission 15 May, for December admission 15 September, and for March admission 31 October (next closing: 31 October 2026 for March 2027 entry).',
  '2026-10-31', 'fixed', NULL, NULL,
  $j$["Bachelor","Master's","PhD"]$j$,
  $j$["International Chinese Language Education","Chinese Language and Literature","Chinese History","Chinese Philosophy","Chinese Language Study","Traditional Chinese Medicine and Taiji Culture (short-term study tracks)"]$j$,
  $j$["All countries - applicants must be non-Chinese citizens"]$j$,
  NULL, NULL, false, true,
  $desc$The International Chinese Language Teachers Scholarship is established by China's Center for Language Education and Cooperation (CLEC) to train Chinese-language teachers and promote Chinese language education worldwide. Recommending Institutions (Confucius Institutes and independent Confucius Classrooms, HSK test centres, foreign universities' Chinese-teacher training programmes and Chinese departments, professional associations for Chinese language teaching, and Chinese embassies/consulates) recommend outstanding students and in-service Chinese teachers for study at Chinese host universities. Degree categories commence each September: a PhD in International Chinese Language Education (up to four years; HSK Level 6 score of at least 200 and HSKK Advanced at least 60, or HSK Level 7), a Master's in International Chinese Language Education (up to two years; HSK Level 5 at least 210 and HSKK Intermediate at least 60) and a Bachelor's in Chinese Language and Literature (International Chinese Language Education) (up to four years; HSK Level 4 at least 210 and HSKK Intermediate at least 60). Non-degree categories comprise a One-Year Study Program (up to 11 months, September start), a One-Semester Study Program (up to five months, September or March start) and Four-Week Study Programs (July or December, in groups of 10-15 organised by Recommending Institutions), with lower HSK/HSKK thresholds by track, plus joint scholarships with partner institutions. The scholarship covers tuition, accommodation (free on-campus housing, generally double rooms; or an off-campus allowance of RMB 1,000/month for doctoral and RMB 700/month for other students), a monthly living allowance (RMB 3,500 doctoral, RMB 3,000 Master's, RMB 2,500 undergraduate/one-year/one-semester; four-week students excluded) and comprehensive medical insurance. Applications are submitted online via the CLEC scholarship portal (registration opens each year on 1 March) and decided by a central expert panel based mainly on HSK/HSKK scores; degree students are subject to an annual assessment.$desc$,
  $req$Applicants must be non-Chinese citizens in good physical and mental health with strong academic performance and conduct, committed to Chinese language education, teaching or related work, and aged 16-35 as of 1 September of the entry year (extended to 45 for in-service Chinese language teachers; undergraduate applicants generally under 25). Chinese proficiency is the gate, with HSK/HSKK thresholds by category: PhD - a relevant Master's plus HSK 6 at least 200 and HSKK Advanced at least 60 (or HSK Level 7); Master's - a Bachelor's plus HSK 5 at least 210 and HSKK Intermediate at least 60; Bachelor's - a senior high school diploma plus HSK 4 at least 210 and HSKK Intermediate at least 60; One-Year - HSK 3 at least 270 with an HSKK score (International Chinese Language Education), HSK 4 at least 180 + HSKK Intermediate at least 60 (Chinese language and literature, history, philosophy) or HSK 3 at least 210 (Chinese Language Study); One-Semester - HSK 3 at least 180 with an HSKK score (or any HSK score for Traditional Chinese Medicine/Taiji tracks); Four-Week - an HSK score. In-service teachers (with employment proof and an employer recommendation) and applicants who provide a post-graduation employment agreement receive priority; the One-Year and One-Semester programs generally do not admit those who received a similar scholarship within the past three years. No GPA or IELTS figure applies (HSK/HSKK are the language tests), so min_gpa/min_ielts are not recorded.$req$,
  'http://www.chinese.cn', 'http://www.chinese.cn', 'https://cis.chinese.cn',
  'annual', 'open', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 11) from CLEC's official 'Application Guidelines for International Chinese Language Teachers Scholarship 2026' (Center for Language Education and Cooperation, January 2026; the guideline PDF was fetched in full on 2026-10-26 from a Confucius Institute mirror) and a fetch of the live application portal at cis.chinese.cn (redirects to the CLEC platform). All seven categories with their HSK/HSKK thresholds, the age limits, the coverage standards (tuition, accommodation, living allowance RMB 2,500/3,000/3,500 per month by level, medical insurance), the four admission-point deadlines and the application-materials list were read first-hand from that guideline; 2026 Chinese university guides corroborate the 1 March opening and 15 May September-entry closing. award_amount is NULL (variable): the living allowance has three level-based rates and coverage differs by category, so the figures live in the description and funding_type. deadline_date is the next published closing, 31 October 2026 (March 2027 admission, covering the One-Semester program), with status 'open' and the full annual deadline set in rounds. Uzbekistan eligibility: the scheme is open to all non-Chinese citizens with no country list (recommendation runs through Confucius Institutes, HSK centres, universities and Chinese embassies/consulates worldwide). university_id is NULL and no university_scholarships row is created - host institutions are the many Chinese universities listed on the portal rather than one university; this central record is distinct from university-hosted scheme pages observed earlier (e.g. NJU's scholarship menu in pass 103). min_gpa/min_ielts NULL.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  'Tuition + accommodation (free on-campus housing, or off-campus allowance of RMB 1,000/month for doctoral and RMB 700/month for other students) + monthly living allowance (RMB 3,500 doctoral, RMB 3,000 Master''s, RMB 2,500 undergraduate/one-year/one-semester) + comprehensive medical insurance',
  'Tuition is covered and managed by the Host Institution for the scholarship duration of the category (up to 4 years PhD/Bachelor''s, 2 years Master''s, 11 months one-year, 5 months one-semester); degree students must pass an annual assessment.',
  'Chinese proficiency (HSK/HSKK scores by category - see requirements) is the language gate; no English test such as IELTS is required.',
  $j$["Scanned copy of passport photo page","Scanned HSK and HSKK score reports (valid for two years)","Recommendation letter from the head of the Recommending Institution","Proof of highest academic qualification (or expected graduation) and academic transcripts (degree applicants)","Two recommendation letters from associate professors or above (Master's and PhD applicants in International Chinese Language Education)","Personal statement in Chinese of about 3,000 words (PhD applicants)","Proof of employment and employer recommendation letter (in-service Chinese teachers)"]$j$,
  NULL, NULL,
  $json$[{"admission":"March 2027 (One-Semester Study Program)","applications_close":"2026-10-31","status":"open"},{"pattern":"Annual (Beijing time): registration opens 1 March; student applications close 15 April (July admission), 15 May (September admission - all degree programs and the One-Year program), 15 September (December admission) and 31 October (March admission)"}]$json$
);

INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  947,
  'AISG PhD Fellowship Programme',
  'AI Singapore (AISG) - national programme supported by the National Research Foundation, Singapore',
  'Singapore', 'Full Tuition + Stipend', 0,
  'Nomination-based (universities nominate candidates to AI Singapore). The January 2027 intake nomination closed on 22 October 2026; the next call is expected for the August 2027 intake - first apply for PhD admission at an eligible Singapore autonomous university faculty.',
  NULL, 'not_published', NULL, NULL,
  $j$["PhD"]$j$,
  $j$["Fundamental artificial intelligence research at specified faculties: NUS School of Computing and College of Design and Engineering (Computer Engineering); NTU College of Computing and Data Science; SMU School of Computing and Information Systems; SUTD Information Systems Technology and Design Pillar"]$j$,
  '[]',
  NULL, NULL, false, true,
  $desc$The AISG PhD Fellowship Programme is AI Singapore's flagship fellowship for top artificial-intelligence research talent pursuing a full-time PhD in fundamental AI research at Singapore-based autonomous universities (NUS, NTU, SMU and SUTD). It welcomes all nationalities (Singaporeans, Singapore Permanent Residents and ASEAN applicants are given priority in the consideration of merits) and supports each fellow for up to four years with full local tuition fees, a monthly sustenance allowance of up to S$6,700 for Singaporeans, S$6,500 for Singapore Permanent Residents and S$6,300 for other nationalities, CPF contributions for Singaporeans, and computer, miscellaneous and conference-travel allowances - including travel grants of up to S$8,000 for main-author papers at top-tier AI venues (AAAI, ACL, CVPR, EMNLP, ICCV, ICLR, ICML, IJCAI, KDD, NeurIPS). Fellows work on one of five fundamental-AI themes (collaborative AI, trustworthy and explainable AI, resource-efficient AI, privacy-aware AI and continuous learning AI) and must produce at least four main/primary-author publications in top-tier venues during the award; they may not hold other remunerated employment during the supported period. International fellows (non-Singaporeans/non-PRs) owe a two-year post-graduation service obligation in Singapore-based companies. The fellowship is nomination-based: applicants first secure admission to an AI-related PhD programme at one of the specified faculties (NUS School of Computing; NUS College of Design and Engineering (Computer Engineering); NTU College of Computing and Data Science; SMU School of Computing and Information Systems; SUTD Information Systems Technology and Design Pillar), and the universities recommend candidates to AI Singapore through its nomination portal. Existing PhD candidates with at least two years remaining may also transfer in, with support pro-rated.$desc$,
  $req$Open to all nationalities; Singaporeans, Singapore Permanent Residents and ASEAN applicants are given priority in the consideration of merits. New applicants must gain admission to an AI-related full-time PhD programme at NUS School of Computing, NUS College of Design and Engineering (Computer Engineering), NTU College of Computing and Data Science, SMU School of Computing and Information Systems or SUTD's Information Systems Technology and Design Pillar (other faculties by AI Singapore's assessment, with an endorsed two-page publication plan), and hold at least a Second Upper Class Honours degree or equivalent in a relevant discipline. Existing PhD candidates at those faculties with at least two years of their four-year programme remaining may transfer (qualifying examination passed and CAP of at least 4.0/5.0 or 3.2/4.0 for end-of-second-year candidates; these are transfer/retention conditions, not entry cutoffs). Candidates are nominated by their university - there is no direct student application to AI Singapore - and are assessed on research direction, academic excellence, publications, recommendations and supervisor fit. The Second Upper Class Honours requirement is not a numeric GPA on an unambiguous scale and no IELTS cutoff is published, so min_gpa/min_ielts are not recorded.$req$,
  'https://aisingapore.org/research/phd-fellowship-programme/', 'https://aisingapore.org/research/phd-fellowship-programme/', 'https://phdfellowship.aisingapore.org/',
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 11) from two official AI Singapore sources fetched the same day: the AISG PhD Fellowship Programme page (January 2027 intake nomination; closing 22 October 2026, 5:00 PM SGT) and the January 2027 Intake Application Guideline (candidate version, 19 August 2026). The per-nationality sustenance ceilings (up to S$6,700 / S$6,500 / S$6,300 per month), full local tuition support up to four years, conference-travel grants, the two-year service obligation for international fellows, the four-publication deliverable, the eligible-faculty list, the Second Upper Class Honours requirement and the nomination-only route were all read first-hand. award_amount is NULL (variable): the guideline publishes 'up to' ceilings by nationality rather than one fixed stipend (international ceiling S$6,300/month), so the figures are recorded in the description and funding_type. deadline_date is NULL/'not_published': the read January 2027 nomination window closed on 22 October 2026 (portal opened 25 September 2026), so status is 'closed' with the two-intake pattern in rounds for re-verification at the next call. Uzbekistan eligibility is explicit: the programme 'welcomes all nationalities' with 'no restriction on nominees' nationality' (ASEAN/SC/PR applicants only receive priority consideration). university_id is NULL and no university_scholarships row is created - the fellowship spans NUS, NTU, SMU and SUTD rather than one university (same treatment as A*STAR AGS, record 930). min_gpa/min_ielts NULL.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  'Full local tuition fees + monthly sustenance allowance (up to S$6,700 Singaporeans, S$6,500 PRs, S$6,300 other nationalities) + computer, miscellaneous and conference-travel allowances (up to S$8,000 for main-author top-tier papers), for up to 4 years',
  'Full local tuition fees for up to four years of PhD studies at a Singapore autonomous university.',
  'English requirements are those of the admitting autonomous university''s PhD programme; the fellowship publishes no separate IELTS cutoff.',
  $j$["PhD admission application to an eligible AU faculty (the fellowship is by university nomination)","Personal statement (Section 4)","Curriculum vitae (Annex A)","Education certifications (Annex B)","Awards and publications table with supporting documents (Annex C)","Recommendation letters (Annex E, via the university)","Two-page research publication plan (Annex D) if from a faculty outside the listed ones"]$j$,
  NULL, NULL,
  $json$[{"intake":"January 2027","portal_opened":"2026-09-25","nomination_closed":"2026-10-22","status":"closed"},{"pattern":"Two intakes a year (January and August); universities nominate candidates through the AISG portal - secure PhD admission at an eligible faculty first"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3084, 'https://aisingapore.org/research/phd-fellowship-programme/', 'AISG PhD Fellowship Programme - AI Singapore Official Programme Page', 'aisingapore.org', 'scholarship', now(), true, true, now()),
(3085, 'http://www.chinese.cn', 'International Chinese Language Teachers Scholarship - CLEC Official Website (2026 Application Guidelines)', 'chinese.cn', 'scholarship', now(), true, true, now());
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES (947, 3084), (946, 3085);
SELECT setval('scholarships_id_seq', GREATEST((SELECT MAX(id) FROM scholarships), 947), true);
SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 3085), true);
