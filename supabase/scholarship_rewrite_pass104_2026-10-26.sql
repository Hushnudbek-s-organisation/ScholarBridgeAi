-- ScholarBridge AI - Scholarship Rewrite Pass 104 - 2026-10-26
-- Singapore rel4 cluster closed (6 records): rewrote 15 (NUS Research
-- Scholarship), 30 (NTU Nanyang Global Scholarship - the stored URL now
-- presents the former Nanyang Scholarship under this name), 112 (NUS
-- President's Graduate Fellowship), 119 (Nanyang President's Graduate
-- Scholarship - NPGS) and 396 (SMU Research Scholarship) from official
-- pages fetched 2026-10-26; retired 16 (ASEAN Undergraduate Scholarship
-- at NUS: restricted to citizens of ASEAN member countries, so
-- applicants from Uzbekistan can never qualify).
-- Side tables: 6 sources repointed (2727, 2728, 2726, 2584, 2582, 2617 -
-- all verified exclusive links; all 6 target URLs pre-checked against
-- idx_sources_url, no collisions); 5 university_scholarships rows
-- synced/withdrawn (510, 484 withdrawn, 500, 551, 642). Scholarship 396
-- keeps university_id NULL and no us row: no Singapore Management
-- University record exists in the catalogue yet.
-- Statements below replay the exact executed SQL (RETURNING omitted).
-- See docs/SCHOLARSHIP_REWRITE_PASS_104_2026-10-26.md.

-- 15 -> NUS Research Scholarship (full tuition waiver + tiered stipend)
UPDATE scholarships SET
  title = 'NUS Research Scholarship',
  provider = 'National University of Singapore (NUS Graduate School)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  deadline = 'No separate scholarship deadline: apply for the scholarship within your NUS graduate admission application on GradApp. Application windows for the August (Semester 1) and January (Semester 2) intakes are set by each faculty/school - check the faculty website for your programme.',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  degree_levels = $j$["Master's","PhD"]$j$,
  eligible_majors = $j$["All"]$j$,
  eligible_countries = '[]',
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The NUS Research Scholarship is the National University of Singapore's central scholarship for outstanding graduate students pursuing research leading to a higher degree (PhD and Master's by Research) at the University; it is administered by the NUS Graduate School and open to Singapore Citizens, Singapore Permanent Residents and all international students in any graduate research programme. It provides a full waiver of tuition fees and a monthly stipend; with effect from 1 January 2026 the international-student rates are S$3,000 per month for PhD students (rising by S$500 per month after passing the PhD Qualifying Examination) and S$2,900 per month for Master's (Research) students, with higher rates for Singapore Citizens and Permanent Residents. The typical award period is four years for PhD students and two years for Master's (Research) students: the scholarship is tenable for one year in the first instance and may be renewed each semester at the University's discretion subject to satisfactory progress, up to that maximum as determined by the faculty or school. There is no service bond; international students on the scholarship must fulfil the requirements of the Graduate Assistantship Programme, and holders may not take up employment or hold any other scholarship, award, fellowship or allowance during the scholarship period without the University's prior approval. The scholarship is applied for within the graduate admission application on GradApp (incoming students indicate their interest in their admission application); application windows for the August and January intakes are set by the individual faculties and schools.$desc$,
  requirements = $req$Open to all nationalities applying to NUS graduate research programmes (PhD or Master's by Research). Academic pre-requisite: an undergraduate degree with at least Second Class Honours (Upper division) / Honours (Distinction) or equivalent. Admission assessment weighs a good GPA in a relevant Bachelor's or Master's degree, a statement of purpose, letters of recommendation and a CV (compulsory), with GRE scores, publications or research experience, and TOEFL/IELTS evidence for non-native English speakers strengthening the application. The honours-class requirement is not a numeric GPA on an unambiguous scale and no IELTS cutoff is published, so min_gpa/min_ielts are not recorded.$req$,
  website_url = 'https://nusgs.nus.edu.sg/scholarships/nus-research-scholarship',
  source_url = 'https://nusgs.nus.edu.sg/scholarships/nus-research-scholarship',
  application_url = 'https://gradapp.nus.edu.sg/portal/app_manage',
  recurrence = 'annual',
  application_status = 'upcoming', verification_status = 'verified',
  source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 104) from the official NUS Graduate School scheme page fetched the same day (found via the NUSGS Scholarships index after the previously stored admissions URL returned HTTP 404; the scheme name matches the stored title exactly). The full tuition waiver, the citizenship-by-level stipend table effective 1 January 2026, the one-year-then-semester renewal up to 4 years (PhD) / 2 years (Master's by Research), Graduate Assistantship Programme service for international students, the no-bond term and the GradApp route were all read first-hand. award_amount is NULL (variable): two international rates by level (PhD S$3,000/month, +S$500 after the PhD Qualifying Examination; Master's by Research S$2,900/month) are recorded in the description and funding_type rather than as one figure. deadline_date is NULL/'not_published': the scheme publishes no single closing date - windows are set per faculty/school for the August and January intakes - with the intake pattern in rounds; status 'upcoming' as the standing scheme is assessed for each future intake. degree_levels corrected to include Master's by Research (previously PhD only). min_gpa/min_ielts NULL. Previous record held the scheme at reliability 4 with no values read. university_scholarships row 510 synced; source 2727 repointed from the graduate-scholarships index to the fetched scheme page.$note$,
  award_amount = NULL, award_currency = NULL, award_period = 'month', award_basis = 'variable', living_allowance = NULL,
  funding_type = 'Full waiver of tuition fees + monthly stipend (international students, with effect from 1 January 2026: PhD S$3,000/month rising by S$500 after the PhD Qualifying Examination; Master''s by Research S$2,900/month; higher rates for Singapore Citizens/Permanent Residents)',
  tuition_coverage = 'Full waiver of tuition fees; tenable one year in the first instance and renewable each semester subject to satisfactory progress, up to 4 years (PhD) or 2 years (Master''s by Research).',
  english_requirements = 'Non-native English speakers evidence proficiency through tests such as TOEFL or IELTS as part of the graduate admission assessment; the scholarship publishes no separate IELTS cutoff.',
  required_documents = $j$["NUS graduate admission application on GradApp indicating interest in the scholarship","Academic transcripts and degree certificates (at least Second Class Honours (Upper division) / Honours (Distinction) or equivalent)","Statement of purpose","Letters of recommendation","Curriculum vitae (CV)"]$j$,
  expected_opening_period = NULL, expected_deadline_period = NULL,
  rounds = $json$[{"intake":"August (Semester 1)","application_window":"Set by each faculty/school - refer to faculty websites"},{"intake":"January (Semester 2)","application_window":"Set by each faculty/school - refer to faculty websites"}]$json$
WHERE id = 15;

-- 30 -> NTU Nanyang Global Scholarship (formerly publicised as Nanyang Scholarship)
UPDATE scholarships SET
  title = 'NTU Nanyang Global Scholarship',
  provider = 'Nanyang Technological University (NTU Singapore)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  deadline = 'Scholarship applications follow the NTU undergraduate admission application period for your qualification. For AY2027 entry with international qualifications or IB Diploma: 15 October 2026 to 19 March 2027 (some qualifications close earlier - check your qualification page on the NTU admissions site).',
  deadline_date = '2027-03-19', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  degree_levels = $j$["Bachelor"]$j$,
  eligible_majors = $j$["All"]$j$,
  eligible_countries = '[]',
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The Nanyang Global Scholarship is NTU's premier undergraduate scholarship, awarded to outstanding freshmen pursuing full-time undergraduate programmes at Nanyang Technological University; it recognises outstanding academic results, strong leadership abilities and very good co-curricular records, and it is open to all nationalities. NTU now presents this scheme under the name Nanyang Global Scholarship on the official scholarship page (previously publicised as the Nanyang Scholarship - the same official page and benefit structure). The scholarship covers up to the normal programme duration, subject to good academic performance and exemplary conduct: full coverage of subsidised tuition fees (after the MOE Tuition Grant), a living allowance of S$6,500 per academic year, an accommodation allowance of up to S$2,000 per academic year for holders residing in NTU hostels, a travel grant of up to S$8,000 for an overseas programme (for new cohorts from AY2025, subject to the Travel Grant Form terms) and a one-off computer allowance of S$2,000. No bond is attached apart from the three-year bond applying to all Singapore PRs and international students under the MOE Tuition Grant Scheme, and holders are enrolled into the NTU Honours College. Holders must maintain a minimum CGPA of 3.5/5.0 (reviewed every semester), may not hold other scholarships, bursaries, loans or awards without university approval, act as student ambassadors when called upon, and face repayment if they terminate the scholarship prematurely. Applicants apply for admission first, then submit the scholarship application (a personal essay of not more than 250 words, a passport-size photo and an online appraisal by a school teacher) within the admission application period for their qualification; shortlisted applicants are interviewed (March to May for Singapore qualifications; within two months of the programme offer for Year 12 equivalent qualifications).$desc$,
  requirements = $req$Open to all nationalities. Awardees read a full-time undergraduate degree programme at NTU. Applicants must present outstanding academic achievements in the Singapore-Cambridge GCE 'A' Level, a diploma awarded by a polytechnic in Singapore, the NUS High School Diploma, the IB Diploma or Year 12 equivalent qualifications, together with excellent co-curricular records and strong leadership qualities and potential. The CGPA of 3.5/5.0 is a condition for retaining the scholarship, not an entry cutoff; the scheme publishes no single entry GPA or IELTS figure, so min_gpa/min_ielts are not recorded.$req$,
  website_url = 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships-and-awards/scholarship-opportunities/detail/nanyang-scholarship',
  source_url = 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships-and-awards/scholarship-opportunities/detail/nanyang-scholarship',
  application_url = 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships-and-awards/scholarship-opportunities/detail/nanyang-scholarship',
  recurrence = 'annual',
  application_status = 'open', verification_status = 'verified',
  source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 104) from two official NTU pages fetched the same day. The stored URL now redirects to the official scheme page, which presents the award as the 'Nanyang Global Scholarship' - NTU's premier all-nationalities undergraduate scholarship (previously publicised as the Nanyang Scholarship; same page slug and benefit structure). All benefit figures (living allowance S$6,500/year, accommodation allowance up to S$2,000/year, travel grant up to S$8,000, computer allowance S$2,000, the CGPA 3.5/5.0 maintenance rule and the essay/referee requirements) were read on that page; award_amount stores the S$6,500 annual living allowance, following the convention of verified Singapore undergraduate records 28 and 641. The AY2027 windows (international qualifications and IB Diploma: 15 Oct 2026 - 19 Mar 2027) were read on NTU's Undergraduate Admissions page; the scholarship page states the scholarship application period is the same as the admission application period, so deadline_date is the 19 March 2027 outer closing, with the qualification-dependence recorded in the deadline text and rounds, and status 'open' as the window opened on 15 October 2026. min_gpa/min_ielts NULL (no single official entry figures; the 3.5/5.0 CGPA is a retention condition). Previous record held the same scheme at reliability 4 under the former name with no values read. university_scholarships row 500 synced (name updated to the current scheme name); source 2726 repointed to the current official page URL.$note$,
  award_amount = 6500, award_currency = 'SGD', award_period = 'year', award_basis = 'fixed', living_allowance = NULL,
  funding_type = 'Full coverage of subsidised tuition fees (after MOE Tuition Grant) + living allowance of S$6,500/year + accommodation allowance of up to S$2,000/year + travel grant of up to S$8,000 + one-off computer allowance of S$2,000',
  tuition_coverage = 'Full coverage of subsidised tuition fees (after MOE Tuition Grant) up to the normal programme duration. No scholarship bond, apart from the standard 3-year MOE Tuition Grant bond for Singapore PRs and international students.',
  english_requirements = 'English requirements are those for NTU undergraduate admission for your qualification; the scholarship publishes no separate IELTS cutoff.',
  required_documents = $j$["NTU undergraduate admission application","Scholarship application form with a personal essay of not more than 250 words","Recent passport-size photograph (digital image)","Online referee appraisal by a school teacher (submitted within 7 days of the scholarship application)"]$j$,
  expected_opening_period = NULL, expected_deadline_period = NULL,
  rounds = $json$[{"cycle":"AY2027 (August 2027 entry)","opens":"2026-10-15","closes":"2027-03-19","note":"For international qualifications and IB Diploma applicants; the scholarship application period is the same as the admission application period and closing dates depend on the specific qualification - some close earlier"}]$json$
WHERE id = 30;

-- 112 -> NUS President's Graduate Fellowship (PGF)
UPDATE scholarships SET
  title = $t$NUS President's Graduate Fellowship$t$,
  provider = 'National University of Singapore (NUS Graduate School)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  deadline = 'No separate application or closing date: excellent PhD applicants are nominated by their Faculty/Department (indicate interest within the NUS graduate admission application on GradApp). Application windows for the August and January intakes are set by each faculty/school; outcomes are notified around May (for August admission) and October (for January admission).',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  degree_levels = $j$["PhD"]$j$,
  eligible_majors = $j$["All"]$j$,
  eligible_countries = '[]',
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The President's Graduate Fellowship (PGF) is the National University of Singapore's premier doctoral fellowship, awarded to PhD candidates who show exceptional promise or accomplishment in research; a number of PhD research students are selected each semester by the University, with excellent applicants nominated by their Faculty/Department rather than applying through a separate open call. It is open to Singapore Citizens, Singapore Permanent Residents and all international students in any graduate programme, and it carries a full waiver of tuition fees plus a monthly stipend of S$4,800 (Singapore Citizens), S$4,400 (Permanent Residents) or S$3,900 (international students) for a typical award period of four years. International recipients additionally receive a one-off settling-in allowance of S$1,000 and a one-off air travel allowance of up to S$750 for a single-trip economy-class airfare from their home country to Singapore to commence study, and PGF recipients are eligible for the NUSGS Research Incentive Award supplement (a monthly allowance over four years and a one-time research allowance on passing the PhD Qualifying Examination in the second year). The Fellowship is tenable for one year in the first instance and renewable each semester subject to satisfactory progress, up to four years (for NUS Research Scholars upgraded to the Fellowship, the combined maximum of the two awards is four years). There is no service bond; international PGF holders admitted from AY2014/2015 perform 312 hours of teaching duties under the Graduate Assistantship Programme. For the President's Graduate Fellowship funded by the Lee Kong Chian Scholarship, preference is given to candidates who exhibit leadership ability and commitment to community service.$desc$,
  requirements = $req$Open to all nationalities undertaking a PhD at NUS. There are no specific published academic pre-requisites: candidates must show exceptional promise or accomplishment in research and be nominated by their Faculty/Department (further application procedures are advised once applicants are assessed to be eligible), with assessment following the NUS PhD admission criteria - academic record, statement of purpose, letters of recommendation and CV are compulsory, and GRE scores, publications and English-test evidence strengthen the application. No numeric GPA or IELTS cutoff is published, so min_gpa/min_ielts are not recorded.$req$,
  website_url = 'https://nusgs.nus.edu.sg/scholarships/presidents-graduate-fellowship',
  source_url = 'https://nusgs.nus.edu.sg/scholarships/presidents-graduate-fellowship',
  application_url = 'https://gradapp.nus.edu.sg/portal/app_manage',
  recurrence = 'annual',
  application_status = 'upcoming', verification_status = 'verified',
  source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 104) from the official NUS Graduate School scheme page fetched the same day. The previously stored URL (the NUSGS financial-aid hub) resolves to the Graduate School site whose Scholarships index lists the 'President's Graduate Fellowship' with its own scheme page - the award the stored title names (the title is corrected with the apostrophe, university prefix retained). The stipend table by citizenship (international S$3,900/month), the full tuition waiver, the S$1,000 settling-in allowance, the up-to-S$750 air travel allowance, the NUSGS Research Incentive Award supplement, the 312-hour Graduate Assistantship Programme duty, the 4-year maximum, the nomination route and the May/October notification were all read first-hand. award_amount stores the fixed international monthly stipend of S$3,900; the supplement amounts are not fixed publicly and are described rather than stored as figures. deadline_date NULL/'not_published' (nomination-based; faculty windows for the August and January intakes) with the pattern in rounds; status 'upcoming'. min_gpa/min_ielts NULL (no published cutoffs). Previous record held the scheme at reliability 4 with no values read. university_scholarships row 551 synced; source 2584 repointed from the bare domain to the fetched scheme page.$note$,
  award_amount = 3900, award_currency = 'SGD', award_period = 'month', award_basis = 'fixed', living_allowance = NULL,
  funding_type = 'Full waiver of tuition fees + monthly stipend (international students: S$3,900/month) + one-off settling-in allowance of S$1,000 (international students) + one-off air travel allowance of up to S$750 + NUSGS Research Incentive Award supplement',
  tuition_coverage = 'Full waiver of tuition fees at the University for up to 4 years of PhD candidature.',
  english_requirements = 'Non-native English speakers evidence proficiency through tests such as TOEFL or IELTS as part of the graduate admission assessment; the Fellowship publishes no separate IELTS cutoff.',
  required_documents = $j$["NUS graduate admission application on GradApp indicating interest in the Fellowship","Academic transcripts and degree certificates","Statement of purpose","Letters of recommendation","Curriculum vitae (CV)"]$j$,
  expected_opening_period = NULL, expected_deadline_period = NULL,
  rounds = $json$[{"intake":"August (Semester 1)","application_window":"Set by each faculty/school; by Faculty/Department nomination","notification":"Around May"},{"intake":"January (Semester 2)","application_window":"Set by each faculty/school; by Faculty/Department nomination","notification":"Around October"}]$json$
WHERE id = 112;

-- 119 -> Nanyang President's Graduate Scholarship (NPGS)
UPDATE scholarships SET
  title = $t$Nanyang President's Graduate Scholarship (NPGS)$t$,
  provider = 'Nanyang Technological University (NTU Singapore)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  deadline = 'AY2027-2028 application period: 1 November 2026 to 31 December 2026 (National Institute of Education: 2 November to 30 December 2026). The scholarship is by nomination only - apply within the NTU PhD admission application; shortlisted candidates are invited for an interview.',
  deadline_date = '2026-12-31', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  degree_levels = $j$["PhD"]$j$,
  eligible_majors = $j$["All"]$j$,
  eligible_countries = '[]',
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The Nanyang President's Graduate Scholarship (NPGS) is NTU's competitive and prestigious premier scholarship for outstanding graduates and final-year students taking up a full-time PhD at NTU, granted by the University's President to PhD students who exemplify exceptional academic, research and leadership qualities. It is awarded by nomination only: applicants apply within the NTU graduate admission application and shortlisted candidates are invited for an interview. The award covers the annual tuition fee and a monthly stipend - S$5,300 for Singapore Citizens, S$4,800 for Singapore Permanent Residents and S$4,300 for international students (revised rates with effect from January 2026) - plus an overseas conference allowance of up to S$5,000 per financial year, an annual book allowance of S$500, a one-time IT allowance of S$1,500 and a one-time thesis allowance of S$600 disbursed in the final year; priority is given for campus accommodation. There is no bond attached to the scholarship. It is tenable for one year in the first instance and renewable subject to good progress, up to a maximum of four years for PhD candidates as determined by the school and the availability of research funding. International students must perform teaching/laboratory supervision duties under the Graduate Assistantship Programme (GAP). Successful candidates are informed of the outcome together with the offer of admission by email.$desc$,
  requirements = $req$Open to all nationalities. Applicants must hold an Honours (Highest Distinction) degree or equivalent at Bachelor's level; candidates who have not yet completed their undergraduate degree must provide official documentation from their university confirming they are on track to graduate with an Honours (Highest Distinction) degree or equivalent. The award is by nomination and interview as part of the NTU PhD admission exercise. The Honours (Highest Distinction) requirement is not a numeric GPA on an unambiguous scale and the scheme publishes no IELTS cutoff, so min_gpa/min_ielts are not recorded.$req$,
  website_url = 'https://www.ntu.edu.sg/admissions/graduate/financialmatters/scholarships/npgs',
  source_url = 'https://www.ntu.edu.sg/admissions/graduate/financialmatters/scholarships/npgs',
  application_url = 'https://gradadmissions.ntu.edu.sg/apply/',
  recurrence = 'annual',
  application_status = 'upcoming', verification_status = 'verified',
  source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 104) from the official NPGS page on ntu.edu.sg, fetched the same day (the stored URL redirects there). The stipend table by citizenship (SC S$5,300 / SPR S$4,800 / international S$4,300 per month, revised from January 2026), the conference/book/IT/thesis allowances, tuition-fee coverage, the 4-year maximum, GAP service for international students, the nomination-only route and the AY2027-2028 window (1 Nov - 31 Dec 2026; NIE 2 Nov - 30 Dec 2026) were all read first-hand. award_amount stores the international monthly stipend of S$4,300 as the single fixed figure relevant to this catalogue's audience, with the full citizenship table in the description. Title corrected to the official name (apostrophe and NPGS suffix). min_gpa/min_ielts NULL (Honours (Highest Distinction) is not a numeric cutoff; no official IELTS figure). Previous record held the same scheme at reliability 4 with no values read. university_scholarships row 642 synced; source 2582 repointed from the bare domain to the fetched official page.$note$,
  award_amount = 4300, award_currency = 'SGD', award_period = 'month', award_basis = 'fixed', living_allowance = NULL,
  funding_type = 'Covers the annual tuition fee + monthly stipend (international students: S$4,300/month, with effect from January 2026) + overseas conference allowance up to S$5,000 per financial year + book allowance S$500/year + one-time IT allowance S$1,500 + one-time thesis allowance S$600',
  tuition_coverage = 'The award covers the annual tuition fee for up to 4 years of PhD candidature.',
  english_requirements = 'English and test requirements are those of the admitting NTU school (test scores such as IELTS/TOEFL/GRE/GMAT/GATE uploaded where applicable); NPGS publishes no separate IELTS cutoff.',
  required_documents = $j$["Identification documents","Education qualifications (in the original language and official English translation)","Research proposal","Two referee reports","Resume","Research publications (if any)","Test scores (e.g. IELTS/TOEFL/GRE/GMAT/GATE), where applicable"]$j$,
  expected_opening_period = NULL, expected_deadline_period = NULL,
  rounds = $json$[{"cycle":"AY2027-2028","opens":"2026-11-01","closes":"2026-12-31","note":"By nomination only; National Institute of Education (NIE): 2 Nov 2026 - 30 Dec 2026"}]$json$
WHERE id = 119;

-- 396 -> SMU Research Scholarship (Tier 1/Tier 2)
UPDATE scholarships SET
  title = 'SMU Research Scholarship',
  provider = 'Singapore Management University (College of Graduate Research Studies)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  deadline = 'No separate scholarship application: applicants are assessed for the scholarship at the time of PhD admission. Most PhD programmes take one August intake (applications 1 August to 31 December of the prior year; the PhD in Computer Science/Information Systems and the PhD in Law, Commerce and Technology close on 31 January of the intake year); the CS/IS programmes also take a January intake (1 February to 30 June of the prior year).',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  degree_levels = $j$["PhD"]$j$,
  eligible_majors = $j$["SMU academic research PhD programmes (Accounting, Asian Urbanisms, Business, Economics, Psychology, Computer Science, Information Systems, Law, Commerce and Technology)"]$j$,
  eligible_countries = '[]',
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The SMU Research Scholarships (Tier 1 and Tier 2) are Singapore Management University's scholarships for full-time academic research PhD students, awarded on a competitive basis and assessed at the time of admission - there is no separate scholarship application. They cover the registration and subsidised tuition fees and pay a monthly living stipend by nationality group; with effect from 1 January 2026, international students receive S$4,300 per month on Tier 1, and on Tier 2 S$3,100 per month before the qualifying examination and S$3,600 per month after it (Singapore Citizens and Permanent Residents receive higher rates, and the rates do not apply to the PhD in Business (General Management)). The scholarships are renewed yearly, conditioned on good academic performance, for the first four years of PhD candidature; SMU research PhDs typically take five years, and from Year 5 students may instead be supported through research assistantships, senior teaching assistantships, graduate instructorships or industry grants. Scholars may not engage in any other gainful employment, must observe the scholarship terms and conditions (a separate annex applies to international students) and sign a letter of undertaking. Most SMU PhD programmes admit one August intake a year, with the PhD in Computer Science/Information Systems also admitting a January intake.$desc$,
  requirements = $req$Open to all nationalities admitted to a full-time SMU academic research PhD programme; SMU assesses applicants for its award schemes at the time of admission based on qualification and suitability, and admission itself follows each programme's requirements (including compulsory GMAT/GRE and, where applicable, TOEFL/IELTS tests). No separate scholarship eligibility bar, numeric GPA or IELTS cutoff is published, so min_gpa/min_ielts are not recorded. The stipend rates do not apply to the PhD in Business (General Management).$req$,
  website_url = 'https://graduatestudies.smu.edu.sg/phd/awards-funding/scholarships',
  source_url = 'https://graduatestudies.smu.edu.sg/phd/awards-funding/scholarships',
  application_url = 'https://graduatestudies.smu.edu.sg/phd/admissions/applications',
  recurrence = 'annual',
  application_status = 'open', verification_status = 'verified',
  source_reliability = 9, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 104) from two official SMU College of Graduate Research Studies pages fetched the same day (Scholarships; Admission Dates), after the previously stored smu.edu.sg graduate-scholarships URL returned HTTP 404. The stored title names this scheme ('SMU Research Scholarships'; the importer gloss 'for International Students' has been removed - the scheme covers all nationalities with a published international rate): the official page presents the SMU Research Scholarships (Tier 1/Tier 2) as the University's PhD research scholarship, covering registration and subsidised tuition plus a monthly living stipend, renewed yearly for the first four years of candidature. Reliability 9 (not 10): the current scheme page was located on SMU's graduate-studies domain after the stored URL died, so the identification rests on the scheme name and function rather than on a redirect chain. award_amount is NULL (variable): two tiers and a qualifying-examination step give international students S$4,300 (Tier 1) or S$3,100 rising to S$3,600 (Tier 2) per month from 1 January 2026 - recorded in the description and funding_type, not as one figure. degree_levels corrected to PhD only (previously stored as Master's + PhD; the scheme covers research PhD candidature). deadline_date NULL/'not_published': the scholarship is assessed at admission, with the programme-specific windows read on the Admission Dates page recorded in rounds; status 'open' because the 1 August opening for the August 2027 intake is current. university_id remains NULL and no university_scholarships row is added: the catalogue has no Singapore Management University record yet (record creation queued for a future cataloguing batch). min_gpa/min_ielts NULL. Previous record held the scheme at reliability 4 with no values read. Source 2617 repointed from the bare domain to the fetched scheme page.$note$,
  award_amount = NULL, award_currency = NULL, award_period = 'month', award_basis = 'variable', living_allowance = NULL,
  funding_type = 'Covers registration and subsidised tuition fees + monthly living stipend (with effect from 1 January 2026, international students: Tier 1 S$4,300/month; Tier 2 S$3,100/month before the qualifying examination and S$3,600/month after; higher rates for Singapore Citizens/Permanent Residents)',
  tuition_coverage = 'Covers registration and subsidised tuition fees; renewed yearly on good academic performance for the first 4 years of PhD candidature.',
  english_requirements = 'Compulsory tests (GMAT or GRE, and TOEFL or IELTS where applicable) are part of the SMU PhD programme admission requirements; the scholarship publishes no separate IELTS cutoff.',
  required_documents = $j$["Online application for an SMU academic research PhD programme (the scholarship is assessed at admission; no separate form)","GMAT or GRE scores (programme admission requirement)","TOEFL or IELTS scores where applicable (programme admission requirement)","Supporting documents required by the admitting School (hard copies submitted to the Programme Administrator after applying online)"]$j$,
  expected_opening_period = NULL, expected_deadline_period = NULL,
  rounds = $json$[{"intake":"August 2027 (most PhD programmes)","opens":"2026-08-01","closes":"2026-12-31"},{"intake":"August 2027 (PhD in Computer Science / Information Systems and PhD in Law, Commerce and Technology)","opens":"2026-08-01","closes":"2027-01-31"},{"intake":"January 2027 (PhD in Computer Science / Information Systems only)","opens":"2026-02-01","closes":"2026-06-30","status":"closed"}]$json$
WHERE id = 396;

-- Retirement: 16 ASEAN Undergraduate Scholarship at NUS (ASEAN citizens only)
UPDATE scholarships SET
  title='ASEAN Undergraduate Scholarship at NUS (retired: restricted to ASEAN citizens)',
  is_active=false, application_status='closed', source_reliability=9,
  deadline_date=NULL, deadline_type='not_published',
  last_verified_at=now(), last_updated_at=now(),
  notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 104): the official NUS Office of Admissions scheme page (fetched 2026-10-26; the previously stored URL now redirects to the admissions hub) limits eligibility to citizens of an ASEAN member country excluding Singapore - Brunei Darussalam, Cambodia, Indonesia, Lao PDR, Malaysia, Myanmar, Philippines, Thailand, Timor-Leste and Vietnam. Applicants from Uzbekistan (and every other non-ASEAN country) can never qualify, so the record is retired rather than presented to this catalogue's audience - the same eligibility screen applied when the Taiwan ICDF/MOFA schemes were excluded in enrichment batch 8. NUS undergraduate coverage for international applicants from Uzbekistan remains via record 28 (NUS International Undergraduate Scholarship, reliability 9). university_scholarships row 484 withdrawn; linked source 2728 repointed from the redirecting stored URL to the fetched official scheme page.$rn$
WHERE id=16;

-- sources: 6 repointed to the fetched official scheme pages
UPDATE sources SET
  url = CASE id
    WHEN 2727 THEN 'https://nusgs.nus.edu.sg/scholarships/nus-research-scholarship'
    WHEN 2728 THEN 'https://nus.edu.sg/oam/scholarships/scholarships-for-freshmen-singapore-permanent-residents/asean-undergraduate-scholarship'
    WHEN 2726 THEN 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships-and-awards/scholarship-opportunities/detail/nanyang-scholarship'
    WHEN 2584 THEN 'https://nusgs.nus.edu.sg/scholarships/presidents-graduate-fellowship'
    WHEN 2582 THEN 'https://www.ntu.edu.sg/admissions/graduate/financialmatters/scholarships/npgs'
    WHEN 2617 THEN 'https://graduatestudies.smu.edu.sg/phd/awards-funding/scholarships'
  END,
  title = CASE id
    WHEN 2727 THEN 'NUS Research Scholarship - NUS Graduate School Official Scheme Page'
    WHEN 2728 THEN 'ASEAN Undergraduate Scholarship - NUS Office of Admissions Official Scheme Page'
    WHEN 2726 THEN 'Nanyang Global Scholarship - NTU Undergraduate Admissions Official Scheme Page'
    WHEN 2584 THEN 'President''s Graduate Fellowship - NUS Graduate School Official Scheme Page'
    WHEN 2582 THEN 'Nanyang President''s Graduate Scholarship (NPGS) - NTU Official Scheme Page'
    WHEN 2617 THEN 'SMU Research Scholarships (Tier 1/Tier 2) - College of Graduate Research Studies Official Page'
  END,
  domain = CASE id
    WHEN 2727 THEN 'nusgs.nus.edu.sg'
    WHEN 2728 THEN 'nus.edu.sg'
    WHEN 2726 THEN 'ntu.edu.sg'
    WHEN 2584 THEN 'nusgs.nus.edu.sg'
    WHEN 2582 THEN 'ntu.edu.sg'
    WHEN 2617 THEN 'graduatestudies.smu.edu.sg'
  END,
  accessed_at = now()
WHERE id IN (2727, 2728, 2726, 2584, 2582, 2617);

-- university_scholarships: 4 synced (510, 500, 551, 642) + 1 withdrawn (484)
UPDATE university_scholarships SET
  scholarship_name = CASE id
    WHEN 510 THEN 'NUS Research Scholarship'
    WHEN 484 THEN 'ASEAN Undergraduate Scholarship at NUS (retired: restricted to ASEAN citizens)'
    WHEN 500 THEN 'NTU Nanyang Global Scholarship'
    WHEN 551 THEN 'NUS President''s Graduate Fellowship'
    WHEN 642 THEN 'Nanyang President''s Graduate Scholarship (NPGS)'
  END,
  availability_status = CASE WHEN id = 484 THEN 'No' ELSE availability_status END,
  funding_type = CASE id
    WHEN 510 THEN 'Full tuition waiver + monthly stipend'
    WHEN 500 THEN 'Full subsidised tuition (after Tuition Grant) + living and accommodation allowances'
    WHEN 551 THEN 'Full tuition waiver + monthly stipend + settling-in and air-travel allowances'
    WHEN 642 THEN 'Full tuition + monthly stipend + conference/book/IT/thesis allowances'
    ELSE funding_type
  END,
  max_scholarship = CASE id
    WHEN 510 THEN 'Full tuition waiver + monthly stipend (international: PhD S$3,000/month, +S$500 after PhD Qualifying Examination; Master''s by Research S$2,900/month)'
    WHEN 484 THEN 'Not open to this catalogue''s audience: restricted to citizens of ASEAN member countries (excluding Singapore)'
    WHEN 500 THEN 'Full subsidised tuition + S$6,500/year living allowance + up to S$2,000/year accommodation + up to S$8,000 travel grant + S$2,000 computer allowance'
    WHEN 551 THEN 'Full tuition waiver + S$3,900/month stipend (international) + S$1,000 settling-in + up to S$750 air travel + Research Incentive Award supplement'
    WHEN 642 THEN 'Annual tuition fee + S$4,300/month stipend (international) + up to S$5,000/year conference allowance + book, IT and thesis allowances'
  END,
  covers_tuition = CASE id WHEN 484 THEN covers_tuition ELSE true END,
  covers_living_expenses = CASE id WHEN 484 THEN covers_living_expenses ELSE true END,
  official_url = CASE id
    WHEN 510 THEN 'https://nusgs.nus.edu.sg/scholarships/nus-research-scholarship'
    WHEN 500 THEN 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships-and-awards/scholarship-opportunities/detail/nanyang-scholarship'
    WHEN 551 THEN 'https://nusgs.nus.edu.sg/scholarships/presidents-graduate-fellowship'
    WHEN 642 THEN 'https://www.ntu.edu.sg/admissions/graduate/financialmatters/scholarships/npgs'
    ELSE official_url
  END,
  source_url = CASE id
    WHEN 510 THEN 'https://nusgs.nus.edu.sg/scholarships/nus-research-scholarship'
    WHEN 500 THEN 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships-and-awards/scholarship-opportunities/detail/nanyang-scholarship'
    WHEN 551 THEN 'https://nusgs.nus.edu.sg/scholarships/presidents-graduate-fellowship'
    WHEN 642 THEN 'https://www.ntu.edu.sg/admissions/graduate/financialmatters/scholarships/npgs'
    ELSE source_url
  END,
  last_verified_at = now()
WHERE id IN (510, 484, 500, 551, 642);
