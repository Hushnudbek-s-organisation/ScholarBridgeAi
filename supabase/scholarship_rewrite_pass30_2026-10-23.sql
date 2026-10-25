-- ScholarBridgeAi — Scholarship rewrite pass 30 (United States, need-based / full-need cluster)
-- Verified 2026-10-25 against the providers' own pages. Every figure below was read on the page
-- cited in source_url. Nothing is inferred where the provider publishes nothing.
-- Convention: amount_usd_value = 0 means "value not published"; award_amount NULL follows the same rule.

--------------------------------------------------------------------------------------------------
-- 563 Dartmouth College — need-blind for international applicants, meets 100% of demonstrated need
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Dartmouth College International Financial Aid (Need-Blind, Full Need)',
  description = 'Dartmouth is one of the very small group of American universities that is need-blind for international applicants and then pays the need it has just ignored. Its financial aid office states that 100 percent of students have their demonstrated need met no matter who they are or where they come from, and that the college meets the demonstrated need of all admitted undergraduates including those from other countries; admissions extended the need-blind policy to all international citizens beginning with the Class of 2026. Because admission is need-blind, asking for aid at Dartmouth cannot damage the application, which is not true at most American universities. The offer is built from scholarship and, for international students, loan, and it carries a work expectation: there is no summer earnings expectation before the first year, a USD 1 500 student work contribution applies from the second year, and USD 2 450 of estimated term-time work income is counted inside the award. The application is the CSS Profile with Dartmouth code 3351 plus the parents income tax statement; applicants whose parents live outside the United States and Canada upload their documents directly to the financial aid office rather than through IDOC. An applicant for whom the CSS Profile fee is a serious hardship may instead submit the Dartmouth International Student Financial Aid Application (ISFAA) straight to the aid office, and both a non-custodial PROFILE waiver and a Non-Filing Statement for Parents 2027-2028 are published on the same page. Deadlines are tied to the admission round: 1 November 2026 for Early Decision, 1 February 2027 for Regular Decision.',
  requirements = 'Be an international citizen applying for first-year or transfer undergraduate admission. Because Dartmouth is need-blind for international applicants, applying for aid does not affect the admission decision. Submit the CSS Profile with Dartmouth school code 3351 and the parents income tax statement with a certified English translation; parents living outside the United States and Canada send their documents directly to the financial aid office, while United States and Canadian families use IDOC. If the CSS Profile fee is a serious financial hardship, submit the International Student Financial Aid Application (ISFAA) directly to the financial aid office instead. Use the published non-custodial PROFILE waiver or Non-Filing Statement for Parents where they apply. File the financial aid documents by 1 November 2026 for Early Decision, 1 February 2027 for Regular Decision or 1 March 2027 for transfer. Expect a USD 1 500 student work contribution from the second year, counted inside the aid package.',
  coverage_type = 'Full Funding',
  award_basis = 'need_based',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Need-based institutional grant and loan',
  tuition_coverage = 'Full demonstrated need - tuition, housing, food, books, personal expenses and an allowance for travel to the United States. No dollar ceiling is published because the offer is calculated from the CSS Profile.',
  english_requirements = 'The award sets no separate English score; Dartmouth undergraduate admission English proficiency requirements apply.',
  required_documents = '["CSS Profile with Dartmouth school code 3351, or the ISFAA if the CSS Profile fee is a hardship","Parents income tax statement with certified English translation","Non-custodial PROFILE waiver or Non-Filing Statement for Parents where applicable","Transcripts, school report and recommendation letters for the admission application","English proficiency evidence as the admission application requires"]',
  deadline = 'Early Decision: 1 November 2026 (application and financial aid). Regular Decision: application by 1 January 2027, financial aid by 1 February 2027. Transfer: financial aid by 1 March 2027.',
  deadline_date = '2026-11-01',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://financialaid.dartmouth.edu/apply-aid/international-students',
  source_url = 'https://financialaid.dartmouth.edu/apply-aid/international-students',
  application_url = 'https://admissions.dartmouth.edu/estimate-your-cost/apply-financial-aid',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from Dartmouth College own pages fetched 2026-10-25: financialaid.dartmouth.edu/apply-aid/international-students states that Dartmouth meets the demonstrated need of all admitted undergraduates including those from other countries, that scholarships and loans are available to international students with an allowance for travel to the United States, that the need-blind policy now covers all international citizens beginning with the Class of 2026, and the work contribution figures of USD 1 500 from the second year and USD 2 450 of estimated term-time earnings counted inside the award; admissions.dartmouth.edu/estimate-your-cost/apply-financial-aid states that 100 percent of students have demonstrated need met no matter who they are or where they are from, gives the international financial aid deadlines as 1 November (Early Decision), 1 February (Regular Decision) and 1 March (transfer), the CSS Profile code 3351, the FAFSA code 002573 for United States applicants only, and the ISFAA alternative for international applicants facing a CSS Profile fee hardship. CORRECTIONS: the row claimed a Full Ride of USD 96 000 and pointed at the bare home.dartmouth.edu domain. Dartmouth publishes no maximum dollar figure at all - the offer is derived from the CSS Profile - so amount_usd_value is set to 0 and award_amount to NULL rather than repeating an invented number. degree_levels was trimmed to Bachelor''s because the guarantee described here is an undergraduate one; graduate funding at Dartmouth is departmental and is not covered by this record. The need-blind detail is the most valuable correction in the row: at most American universities asking for aid damages the application, and at Dartmouth it does not.'
WHERE id = 563;

--------------------------------------------------------------------------------------------------
-- 789 Washington University in St. Louis — meets full need without loans, deadline is the trap
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Washington University in St. Louis International Need-Based Financial Aid',
  description = 'WashU meets 100 percent of demonstrated financial need without loans for all admitted undergraduate students, and unlike most universities that phrase is not limited to American citizens - the financial aid office repeats it on the page it writes for international applicants. The trap is the deadline, not the amount. International first-year applicants are eligible for aid only if they apply by the financial aid deadline that matches their admission round, and an international student who misses it will not be considered for aid after the admission decision or at any point during undergraduate study. The forms are the CSS Profile with WashU code 6929, for both biological parent households where the parents are separated or divorced, plus a published non-custodial parent statement waiver for applicants who have no contact with that parent; a student who cannot pay the CSS Profile fee can use the WashU institutional form, which appears in the WashU Pathway from October once the admission application is submitted. Fall 2027 financial aid deadlines are 17 November 2026 for Early Action and Early Decision I, 11 January 2027 for Early Decision II and 1 February 2027 for Regular Decision, with decisions released by 23 December, 11 December, 12 February and 1 April respectively. Scholarship applications for priority consideration close on 16 December. WashU publishes an average need-based aid offer of USD 75 000 a year. International transfer applicants are not eligible for financial aid at all, which is stated twice on the same page.',
  requirements = 'Be a first-year international applicant to WashU, applying through Early Action, Early Decision I, Early Decision II or Regular Decision. Indicate on the Common Application or Coalition Application that you are requesting need-based aid, then submit the CSS Profile with WashU code 6929 by the financial aid deadline of your round; missing that date removes you from aid consideration permanently. Submit the CSS Profile for both biological parent households where the parents are separated or divorced, or the published non-custodial parent statement waiver. Use the WashU institutional form in the WashU Pathway if the CSS Profile fee is unaffordable. Submit parents income and tax documents with certified English translations. International transfer applicants cannot apply for financial aid. Submit scholarship applications by 16 December for priority consideration.',
  coverage_type = 'Full Funding',
  award_basis = 'need_based',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Need-based institutional grant, scholarship and work-study',
  tuition_coverage = '100 percent of demonstrated financial need without loans for all admitted undergraduates, including international first-year applicants. The published average need-based offer is USD 75 000 a year; no fixed maximum is stated because the package is calculated from the CSS Profile.',
  english_requirements = 'The award sets no separate English score; the WashU undergraduate English testing requirement applies to the admission application.',
  required_documents = '["CSS Profile with WashU school code 6929","Non-custodial parent statement waiver where there is no contact with that parent","Parents income and tax documents with certified English translation where required","WashU institutional financial aid form if the CSS Profile fee is unaffordable","Transcripts, recommendations and English testing for the admission application","Scholarship application by 16 December for priority consideration"]',
  deadline = 'Financial aid: 17 November 2026 (Early Action and Early Decision I), 11 January 2027 (Early Decision II), 1 February 2027 (Regular Decision)',
  deadline_date = '2026-11-17',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://financialaid.washu.edu/apply-for-aid/international-applicant-process/',
  source_url = 'https://financialaid.washu.edu/apply-for-aid/international-applicant-process/',
  application_url = 'https://admissions.washu.edu/how-to-apply/application-dates-deadlines/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the WashU own pages fetched 2026-10-25: financialaid.washu.edu/apply-for-aid/international-applicant-process states that WashU meets 100 percent of demonstrated financial need without loans for all admitted undergraduate students, that international first-year applicants are eligible only if they apply by the financial aid deadline of their admission plan and are never considered afterwards, that international transfer applicants are not eligible for financial aid, the CSS Profile code 6929, the non-custodial parent statement waiver and the institutional form for applicants who cannot pay the CSS Profile fee; admissions.washu.edu/how-to-apply/application-dates-deadlines gives the Fall 2027 grid - application 2 November 2026 (Early Action and Early Decision I), 4 January 2027 (Early Decision II and Regular Decision); financial aid 17 November 2026, 11 January 2027 and 1 February 2027; decisions 23 December 2026, 11 December 2026, 12 February 2027 and 1 April 2027; scholarship applications 16 December. The average need-based offer of USD 75 000 is stated on financialaid.washu.edu. CORRECTIONS: the row claimed a Full Ride of USD 95 000 and pointed at the bare wustl.edu domain. WashU publishes no maximum figure - the package follows the CSS Profile - so amount_usd_value is set to 0 and award_amount to NULL. degree_levels was trimmed to Bachelor''s because the need guarantee is an undergraduate policy. The genuinely useful correction is the deadline structure: the row said January 4 (RD) and November 1 (ED), which are application dates; the financial aid documents are due 17 November 2026, 11 January 2027 and 1 February 2027, and an international applicant who uses the application date as the aid date loses aid eligibility permanently, in every year of study, not just in the first.'
WHERE id = 789;

--------------------------------------------------------------------------------------------------
-- 663 Rice University — meets full need but is need-aware for international applicants
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Rice University International Need-Based Financial Aid',
  description = 'Rice meets 100 percent of demonstrated need with institutional grant aid for the international students it chooses to fund, and it says openly that the choice is made partly on financial grounds. Rice is need-aware for international applicants for both admission and financial aid: the admission committee is told how much aid a family may need, which is the opposite of Dartmouth or Harvard. Two conditions follow and both are easy to miss. An applicant must request aid on the admission application itself, because an international student admitted without asking for aid cannot ask for it in a later year. International transfer applicants receive neither need-based nor merit-based aid. Students who do receive aid are not eligible for the Rice Investment, the domestic programme that makes tuition free below an income threshold, so the international package and the domestic promise are two different instruments. The application is the CSS Profile with Rice school code 6609 for the custodial parent and, where the parents are separated or divorced, a separate profile for the non-custodial parent; foreign tax returns are uploaded to the applicant portal with an official English translation, because IDOC is not available to international applicants. Deadlines track the admission round: 15 November 2026 for Early Decision, 4 January 2027 for Early Decision II and 1 February 2027 for Regular Decision, with awards announced in mid-December, mid-February and by 1 April.',
  requirements = 'Be an international first-year applicant to Rice and request financial aid on the admission application; an international student admitted without that request cannot apply for aid later. Submit the CSS Profile with Rice school code 6609 for the custodial parent and a second profile for the non-custodial parent where applicable, using 2025 income and current asset information. Upload parents and student foreign tax returns with an official English translation to the applicant portal, because IDOC is only available to domestic applicants. File by 15 November 2026 (Early Decision), 4 January 2027 (Early Decision II) or 1 February 2027 (Regular Decision). International transfer applicants are not eligible for either need-based or merit-based aid at Rice.',
  coverage_type = 'Full Funding',
  award_basis = 'need_based',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Need-based institutional grant aid (need-aware selection)',
  tuition_coverage = '100 percent of demonstrated need met with institutional grant aid for international students who are selected. Rice is need-aware for international applicants, so an award is not guaranteed, and international students receiving aid are not eligible for the Rice Investment.',
  english_requirements = 'The award sets no separate English score; the Rice undergraduate admission English requirement applies.',
  required_documents = '["CSS Profile with Rice school code 6609 for the custodial parent","CSS Profile for the non-custodial parent where the parents are separated or divorced","Parents and student foreign tax returns with official English translation, uploaded to the applicant portal","International Student Financial Statement as part of the admission application","Transcripts, essays and English testing for the admission application"]',
  deadline = '15 November 2026 (Early Decision), 4 January 2027 (Early Decision II), 1 February 2027 (Regular Decision)',
  deadline_date = '2026-11-15',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://financialaid.rice.edu/apply-aid/international-students',
  source_url = 'https://financialaid.rice.edu/apply-aid/international-students',
  application_url = 'https://admission.rice.edu/apply/first-year-international-applicants',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the Rice University Office of Financial Aid page fetched 2026-10-25 (financialaid.rice.edu/apply-aid/international-students), which states that international students who receive need-based aid will have 100 percent of demonstrated need met with institutional grant aid but are not eligible for the Rice Investment; that the international need-based policy is need-aware for both admission and financial aid; that international applicants must indicate their intention to apply for aid on the admission application and cannot apply later; that no need-based or merit-based aid is offered to international transfer applicants; the CSS Profile school code 6609; that IDOC is only available to domestic students and international applicants upload tax documents to the applicant portal with an official translation; and the deadline grid of 15 November 2026 (Early Decision), 4 January 2027 (Early Decision II) and 1 February 2027 (Regular Decision) with notifications in mid-December, mid-February and by 1 April. CORRECTIONS: the row claimed a Full Ride of USD 88 000 and pointed at the bare rice.edu domain. Rice publishes no maximum dollar amount, so amount_usd_value is set to 0 and award_amount to NULL. The substantive correction is the selection basis: the old row read as if the full ride were an entitlement, when in fact Rice is need-aware for international applicants and records the request for aid on the admission file itself - a fact that changes how a student should apply, not merely how much they might receive. degree_levels was trimmed to Bachelor''s because the awards described are first-year undergraduate awards.'
WHERE id = 663;

--------------------------------------------------------------------------------------------------
-- 575 Emory University — need-based aid for a select group of international students only
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Emory University International Need-Based Financial Aid',
  description = 'Emory is generous with American students and careful with international ones, and the difference is written on its own pages rather than hidden in a footnote. Emory meets 100 percent of demonstrated need without loans for first-degree domestic undergraduates, and from autumn 2026 the Emory Advantage Plus programme makes tuition free for domestic families earning up to USD 200 000. For international applicants the wording is tighter: Emory offers need-based aid to a select group of international students each year, and international funding is limited. A student who is selected can expect a package built on demonstrated need, but the full-need guarantee Emory publishes is a domestic promise and should not be read as an international one. The forms are the CSS Profile with Emory code 5187 and, for United States citizens and permanent residents only, the FAFSA with code 001564. International applicants who ask for aid still complete the Documentation of Finances in the applicant portal, but they may declare funds from zero up to the cost of attendance instead of proving they can pay for the first year. The aid deadline is not the application deadline: Early Decision I applicants apply by 1 November 2026 but file financial aid by 2 December 2026. A separate merit route exists through the Emory University Scholar Programs, which award partial to full merit scholarships, carry a 15 November deadline and notify by 1 March; international applicants may enter. An optional InitialView interview is available but does not replace a TOEFL, IELTS or Duolingo score.',
  requirements = 'Be an international applicant to Emory College, Oxford College or both, through Early Decision I, Early Decision II or Regular Decision. File the CSS Profile with Emory code 5187 by the financial aid deadline of your round, and the FAFSA with code 001564 only if you are a United States citizen or permanent resident. Complete the Documentation of Finances in the applicant portal; if you are applying for aid, the declared funds may range from zero up to the cost of attendance rather than covering the full first year. Submit parents income and tax documents with certified English translations. Demonstrate English proficiency through TOEFL, IELTS or Duolingo, or an approved alternative; an InitialView interview is optional and does not replace the test. To be considered for the Emory University Scholar Programs, submit the scholar application by 15 November.',
  coverage_type = 'Partial Funding',
  award_basis = 'need_based',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Need-based institutional aid for a select group of international students',
  tuition_coverage = 'No published maximum for international students. Emory states that international funding is limited and that need-based aid goes to a select group each year; the promise of 100 percent of demonstrated need without loans is published for first-degree domestic undergraduates.',
  english_requirements = 'TOEFL, IELTS or Duolingo English Test as set by Emory undergraduate admission, or an approved alternative. An InitialView interview is optional and does not replace the test.',
  required_documents = '["CSS Profile with Emory school code 5187","FAFSA with Emory code 001564, for United States citizens and permanent residents only","Documentation of Finances in the applicant portal","Parents income and tax documents with certified English translations","Transcripts, school report, recommendations and English proficiency evidence for the admission application","Emory University Scholar Programs application by 15 November, if applying for merit scholarships"]',
  deadline = 'Financial aid: 2 December 2026 (Early Decision I), 6 January 2027 (Early Decision II), 10 February 2027 (Regular Decision), 17 March 2027 (transfer). Application: 1 November 2026 (Early Decision I) or 1 January 2027 (Early Decision II and Regular Decision). Scholar Programs: 15 November 2026.',
  deadline_date = '2026-12-02',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://apply.emory.edu/apply/international',
  source_url = 'https://apply.emory.edu/apply/international',
  application_url = 'https://apply.emory.edu/apply/plans-deadlines',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the Emory University own pages fetched 2026-10-25: apply.emory.edu/apply/international states that Emory offers need-based financial aid to a select group of international students each year, that financial documentation is still required but does not need to show sufficient funds to cover the whole first year, links the English proficiency requirement and the InitialView interview caveat, and mentions the Davis UWC Scholars programme; apply.emory.edu/apply/plans-deadlines gives the deadline grid - Early Decision I application 1 November and financial aid 2 December, Early Decision II 1 January and 6 January, Regular Decision 1 January and 10 February, transfer 15 March and 17 March, decisions by 15 December, 15 February, 1 April and early May, and the Scholar Programs deadline of 15 November with notification by 1 March. CORRECTIONS: the row claimed a Full Ride of USD 84 000 and pointed at the bare emory.edu domain. Emory publishes no maximum for international students, so amount_usd_value is set to 0 and award_amount to NULL. The important correction is conceptual: Emory does publish a full-need, no-loan guarantee, but that guarantee is written for first-degree domestic undergraduates; the international sentence on the same site is a select group each year with limited funding. Presenting the domestic guarantee as an international entitlement was the most misleading thing in the row. coverage_type was set to Partial Funding for the same reason, and degree_levels trimmed to Bachelor''s.'
WHERE id = 575;

--------------------------------------------------------------------------------------------------
-- 552 Case Western Reserve University — limited international need-based pool plus merit competitions
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Case Western Reserve University International Need-Based Financial Aid',
  description = 'Case Western Reserve accepts the CSS Profile from international applicants and states plainly that it offers only a limited amount of need-based aid to first-year and transfer international students, so for an applicant from Uzbekistan the realistic route is the merit side. Undergraduate students are automatically evaluated for several scholarships, and there are separate scholarship competitions, including full-tuition awards, that require additional information and an essay. The university reports USD 213 million of institutional aid awarded last year and says more than 80 percent of its students receive some financial assistance. An institutional offer can combine a grant, a loan and campus employment, so a need-based package is not automatically free money. Merit scholarships are limited to eight semesters and the need-based grant to ten. Two practical details decide the outcome: a student who is admitted without asking for need-based aid at the point of application cannot ask for it later, and the financial aid documents are due on different dates from the admission application in each round. English proficiency is handled by the university rather than the aid office - Duolingo 115, IELTS 7.0, PTE Academic 61, or TOEFL iBT 4.5 on the new scale for tests taken on or after 21 January 2026 (90 on the previous scale before that date).',
  requirements = 'Be a first-year or transfer applicant with non-United States citizenship applying for undergraduate admission. Indicate on the Common Application or Coalition with Scoir that you are applying for need-based aid, then submit the CSS Profile with CWRU school code 1105; the FAFSA with code 003137 is for United States citizens and permanent residents only. Submit the income and tax documents the CSS Profile requests, in English or with certified translations. File the financial aid documents by 15 November 2026 for Early Action and Early Decision I, 22 January 2027 for Early Decision II or 1 February 2027 for Regular Decision. First-time first-year international applicants who want the scholarship competitions must submit the additional essay through the Office of Undergraduate Admission. An admitted student who did not request aid at application cannot request it later.',
  coverage_type = 'Partial Funding',
  award_basis = 'need_based',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Need-based and merit-based institutional aid',
  tuition_coverage = 'No published maximum. The university describes its international need-based pool as a limited amount of aid, and an institutional package may be built from grant, loan and campus employment rather than grant alone.',
  english_requirements = 'Duolingo 115, IELTS 7.0, PTE Academic 61, or TOEFL iBT 4.5 on the new scale for tests taken on or after 21 January 2026 (90 internet-based on the previous scale). A waiver applies after two years of English-medium schooling, SAT evidence-based reading and writing 630 or higher, or ACT English 26 or higher.',
  required_documents = '["CSS Profile with CWRU school code 1105","Income and tax documents requested by the CSS Profile, in English or with certified translation","Common Application or Coalition with Scoir application","Official high school transcript, school report and three recommendations","English proficiency score sent by the testing agency or self-reported through the applicant portal","Additional essay for the CWRU scholarship competitions, if applying to them"]',
  deadline = 'Financial aid documents: 15 November 2026 (Early Action and Early Decision I), 22 January 2027 (Early Decision II), 1 February 2027 (Regular Decision)',
  deadline_date = '2026-11-15',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://case.edu/financialaid/undergraduates/international-students',
  source_url = 'https://case.edu/financialaid/undergraduates/international-students',
  application_url = 'https://case.edu/admission/apply/deadlines-and-requirements',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from Case Western Reserve own pages fetched 2026-10-25: case.edu/financialaid/undergraduates/international-students states that the university offers a limited amount of need-based aid to first-year and transfer international applicants, that the CSS Profile is required with school code 1105, and that first-time first-year international applicants may apply for the special CWRU scholarships listed under Scholarship Competitions; case.edu/admission/apply/international-applicants states that undergraduate students are automatically evaluated for several scholarships including full-tuition awards and gives the verified English scores of Duolingo 115, IELTS 7.0, PTE Academic 61 and TOEFL iBT 4.5 for tests taken on or after 21 January 2026 (90 before that date) plus the three waiver routes; case.edu/admission/apply/deadlines-and-requirements gives the grid - Early Action and Early Decision I application 1 November with financial aid documents 15 November, Early Decision II 15 January with 22 January, Regular Decision 15 January with 1 February, and the semester limits of eight for merit scholarships and ten for the need-based grant. CORRECTIONS: the row claimed a Full Ride of USD 96 000 and pointed at the bare case.edu domain. CWRU publishes no maximum figure and describes its international need-based pool as limited, so amount_usd_value is set to 0, award_amount to NULL and coverage_type to Partial Funding. degree_levels was trimmed to Bachelor''s. The deadline correction matters: the old row gave January 15 (RD) and November 1 (ED), which are application dates, while the financial aid documents are due 15 November, 22 January and 1 February.'
WHERE id = 552;

--------------------------------------------------------------------------------------------------
-- 782 Vanderbilt University — signature merit scholarships, not a need-based full ride
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Vanderbilt University Signature Merit Scholarships (Ingram and Cornelius Vanderbilt)',
  description = 'Vanderbilt splits its money in two and the split matters. The merit side is the Ingram Scholars Program and the Cornelius Vanderbilt Scholarship, and Vanderbilt states that more than 225 recipients are guaranteed full-tuition awards plus summer stipends for study abroad, research or service projects; both are renewable through four years of undergraduate study and both close on 1 December 2026. Vanderbilt answers the international question directly: international applicants are eligible to receive any of the Vanderbilt merit scholarships, and the awards are not reserved for particular majors. Roughly one percent of the entire first-year applicant pool is offered a merit award, and recipients usually sit in the top one percent of their high school class with SAT scores in the mid-1500s or ACT 34 and above, so this is a long shot rather than a plan. Financial need is not a factor in merit selection, and a student whose need exceeds the merit award receives the difference as need-based aid. Vanderbilt also states that it is committed to meeting 100 percent of each admitted student demonstrated financial need, and that commitment is the more reliable of the two routes. Two timing traps are published: merit recipients are told only in late March, so a student admitted Early Decision must commit to Vanderbilt without knowing whether a merit award will follow; and the scholarship application, described as strongly encouraged rather than compulsory, is what earns preference.',
  requirements = 'Be a first-year applicant to one of the five Vanderbilt undergraduate schools and submit the Vanderbilt Scholarship Application by 1 December 2026; the application is strongly encouraged and preference is given to those who complete it. International applicants are explicitly eligible for every Vanderbilt merit scholarship. No particular major is required and financial need is not considered in merit selection. Test scores are optional for fall 2027 merit consideration, but competitive recipients usually present SAT scores in the mid-1500s or ACT 34 and above, top one percent class standing and demonstrated leadership. Merit results are released in late March, after the Early Decision commitment deadlines. Transfer students are not eligible for these first-year awards.',
  coverage_type = 'Full Tuition + Stipend',
  award_basis = 'full_tuition',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based',
  tuition_coverage = 'Full tuition for more than 225 recipients, plus summer stipends for study abroad, research or service projects, renewable for four years subject to satisfactory academic performance. Vanderbilt publishes the structure but not a dollar figure for the 2027 tuition rate.',
  english_requirements = 'The awards set no separate English score; the Vanderbilt undergraduate admission English requirement applies.',
  required_documents = '["Vanderbilt Scholarship Application with the Ingram or Cornelius Vanderbilt essays, by 1 December 2026","Common Application or Coalition Application","High school transcript and school report","Two teacher recommendations and a counselor recommendation","Optional SAT or ACT scores for fall 2027 entry","Leadership and service evidence, which the selection criteria turn on"]',
  deadline = '1 December 2026 for both the Ingram Scholars Program and the Cornelius Vanderbilt Scholarship',
  deadline_date = '2026-12-01',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://www.vanderbilt.edu/scholarships/',
  source_url = 'https://www.vanderbilt.edu/scholarships/faq/',
  application_url = 'https://www.vanderbilt.edu/scholarships/application/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the Vanderbilt University own pages fetched 2026-10-25: vanderbilt.edu/scholarships states the Ingram Scholars Program and Cornelius Vanderbilt Scholarship deadlines of 1 December 2026, that more than 225 recipients of these scholarships are guaranteed full-tuition awards plus summer stipends, that all merit awards are renewable through four years, and that financial need is not a factor unless indicated; vanderbilt.edu/scholarships/faq states that international applicants are eligible to receive any of the Vanderbilt merit scholarships, that roughly one percent of the freshman applicant pool is offered a merit award, that recipients are usually in the top one percent of their class with SAT scores in the mid-1500s or ACT 34 and above, that recipients are notified in late March, that transfer students are not eligible, that test scores are optional for fall 2027, and that Vanderbilt is committed to meeting 100 percent of each admitted student demonstrated financial need through the separate need-based route. CORRECTIONS: the row was titled Vanderbilt University Financial Aid with an invented Full Ride of USD 94 000 and pointed at the bare vanderbilt.edu domain. It also bundled two different instruments - the signature merit scholarships and need-based aid - into one record that described neither correctly. This record now describes the merit awards the university actually publishes, with their real deadline of 1 December 2026; the need-based commitment is stated in the description and notes without being converted into a dollar figure. amount_usd_value is 0 and award_amount is NULL because Vanderbilt publishes full tuition as a structure rather than a figure. degree_levels trimmed to Bachelor''s; transfer applicants are excluded by the provider.'
WHERE id = 782;

--------------------------------------------------------------------------------------------------
-- 775 University of Southern California — merit range up to full tuition, early round only
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'USC Merit Scholarships',
  description = 'USC merit money is real, but the row previously described it as a guaranteed full ride, which it is not. USC states that its merit scholarships range in value from a few thousand dollars up to full tuition and are awarded on academic excellence, leadership, service and talent; last year more than 1 000 admitted students earned scholarships of USD 10 000 a year or more. The single most important detail is when you apply, because merit consideration is attached to the early rounds. Early Decision and Early Action applicants, both due 1 November 2026, are considered for USC Merit Scholarships, and performing arts applicants who file by the 1 December 2026 Regular Decision date are considered too, but a student who applies in the 10 January 2027 regular round is not in the merit pool at all. Merit money and need-based aid run on separate tracks, and a student does not need to file a need-based application to be considered for merit. USC also awards USD 20 000 a year to National Merit Finalists who name USC as their first choice, but that is a United States programme and is not open to an applicant from Uzbekistan. Everything outside the Office of Admission awards - departmental money, alumni groups and the Town and Gown award - is listed on Scholarship Universe with its own application, its own deadline and, in some cases, an interview.',
  requirements = 'Be a first-year applicant to USC and submit the Common Application by 1 November 2026 through Early Decision or Early Action, or by 1 December 2026 for a performing arts major, because only those rounds are considered for USC Merit Scholarships; the 10 January 2027 regular deadline is excluded from merit consideration. No separate merit scholarship application and no need-based financial aid form is required. Present the academic excellence, leadership, service and talent the awards are judged on, since selection is holistic and highly competitive. Undocumented and DACA applicants submit a 2025 tax return instead of the FAFSA if they are also applying for need-based aid. Applications for departmental and alumni awards are separate and are listed on Scholarship Universe.',
  coverage_type = 'Partial Tuition',
  award_basis = 'range',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based',
  tuition_coverage = 'A few thousand United States dollars up to full tuition, according to USC; more than 1 000 admitted students received USD 10 000 a year or more last year. No single figure is published for the top award.',
  english_requirements = 'The awards set no separate English score; the USC undergraduate admission English requirement applies.',
  required_documents = '["Common Application by 1 November 2026, or 1 December 2026 for a performing arts major","High school transcript and school report","Two teacher recommendations where required by the school","Optional SAT or ACT scores, sent officially from the testing agency","Portfolio or audition for the arts schools, where the major requires one","Separate application for departmental, alumni and Town and Gown awards listed on Scholarship Universe"]',
  deadline = '1 November 2026 (Early Decision and Early Action) or 1 December 2026 (Regular Decision for performing arts majors); the 10 January 2027 regular deadline is not considered for merit awards',
  deadline_date = '2026-11-01',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://admission.usc.edu/cost-and-financial-aid/scholarships/',
  source_url = 'https://admission.usc.edu/cost-and-financial-aid/scholarships/',
  application_url = 'https://admission.usc.edu/prospective-students/how-to-apply/first-year-students/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the USC own pages fetched 2026-10-25: admission.usc.edu/cost-and-financial-aid/scholarships states that USC Merit Scholarships range in value from a few thousand dollars up to full tuition and are awarded on academic excellence, leadership, service and talent, that over 1 000 admitted students earned scholarships of USD 10 000 a year or more last year, that the USD 20 000 National Merit award is separate, and that merit and need-based aid have separate application processes; admission.usc.edu/prospective-students/how-to-apply/first-year-students gives the round structure - Early Decision and Early Action on 1 November 2026 with both explicitly considered for USC Merit Scholarships, performing arts Regular Decision on 1 December 2026 also considered, and the final regular deadline on 10 January 2027 with no merit consideration - plus the financial aid deadlines of 1 November 2026 (Early Decision), 15 November 2026 (Early Action) and 3 February 2027 (Regular Decision) for FAFSA and CSS Profile applicants. CORRECTIONS: the row claimed Full Tuition of USD 67 000 as if every award were full tuition, listed all three degree levels, and gave the deadline as January 15 (RD) / November 1 (Merit Scholarship). USC publishes a range rather than a guaranteed full tuition, so coverage_type is Partial Tuition with award_basis range, amount_usd_value 0 and award_amount NULL. degree_levels was trimmed to Bachelor''s because USC Merit Scholarships are undergraduate awards. The deadline was the most damaging error: a student reading January 15 as the scholarship deadline would apply in the round that is explicitly excluded from merit consideration, and the National Merit route that produced the old figure is closed to non-United States applicants.'
WHERE id = 775;

--------------------------------------------------------------------------------------------------
-- university_scholarships cards for the same seven awards
--------------------------------------------------------------------------------------------------
UPDATE university_scholarships SET
  scholarship_name = 'Dartmouth College International Financial Aid (Need-Blind, Full Need)',
  availability_status = 'Yes',
  funding_type = 'Need-based, need-blind for international applicants',
  max_scholarship = 'Full demonstrated need, including travel to the United States; no dollar ceiling published',
  covers_tuition = true,
  covers_living_expenses = true,
  eligibility_notes = 'Need-blind for all international citizens since the Class of 2026 and meets 100 percent of demonstrated need. CSS Profile code 3351 plus parents income tax statement; ISFAA accepted where the CSS fee is a hardship. Financial aid deadlines 1 November 2026 (Early Decision) and 1 February 2027 (Regular Decision).',
  official_url = 'https://financialaid.dartmouth.edu/apply-aid/international-students',
  source_url = 'https://financialaid.dartmouth.edu/apply-aid/international-students',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 223;

UPDATE university_scholarships SET
  scholarship_name = 'Washington University in St. Louis International Need-Based Financial Aid',
  availability_status = 'Yes',
  funding_type = 'Need-based, no loans',
  max_scholarship = '100 percent of demonstrated need without loans; published average need-based offer USD 75 000 a year',
  covers_tuition = true,
  covers_living_expenses = true,
  eligibility_notes = 'First-year international applicants only, and only if the CSS Profile (code 6929) is filed by the financial aid deadline of the admission round: 17 November 2026, 11 January 2027 or 1 February 2027. International transfer applicants are not eligible.',
  official_url = 'https://financialaid.washu.edu/apply-for-aid/international-applicant-process/',
  source_url = 'https://financialaid.washu.edu/apply-for-aid/international-applicant-process/',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 279;

UPDATE university_scholarships SET
  scholarship_name = 'Rice University International Need-Based Financial Aid',
  availability_status = 'Yes',
  funding_type = 'Need-based, need-aware selection',
  max_scholarship = '100 percent of demonstrated need met with institutional grant aid for selected international students',
  covers_tuition = true,
  covers_living_expenses = true,
  eligibility_notes = 'Need-aware for international applicants in both admission and aid. Aid must be requested on the admission application; it cannot be requested later. International transfer applicants receive no need-based or merit aid. CSS Profile code 6609; deadlines 15 November 2026, 4 January 2027 and 1 February 2027.',
  official_url = 'https://financialaid.rice.edu/apply-aid/international-students',
  source_url = 'https://financialaid.rice.edu/apply-aid/international-students',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 71;

UPDATE university_scholarships SET
  scholarship_name = 'Emory University International Need-Based Financial Aid',
  availability_status = 'Yes',
  funding_type = 'Need-based, limited international pool',
  max_scholarship = 'No published maximum; aid goes to a select group of international students each year',
  covers_tuition = true,
  covers_living_expenses = true,
  eligibility_notes = 'Emory publishes need-based aid for a select group of international students each year with limited funding. The 100 percent of demonstrated need without loans guarantee applies to first-degree domestic undergraduates. CSS Profile code 5187; financial aid deadlines 2 December 2026, 6 January 2027 and 10 February 2027.',
  official_url = 'https://apply.emory.edu/apply/international',
  source_url = 'https://apply.emory.edu/apply/international',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 202;

UPDATE university_scholarships SET
  scholarship_name = 'Case Western Reserve University International Need-Based Financial Aid',
  availability_status = 'Yes',
  funding_type = 'Need-based and merit-based institutional aid',
  max_scholarship = 'No published maximum; the international need-based pool is described as limited',
  covers_tuition = true,
  covers_living_expenses = true,
  eligibility_notes = 'Limited need-based aid for first-year and transfer international applicants. CSS Profile code 1105 required. Financial aid documents due 15 November 2026, 22 January 2027 or 1 February 2027. Separate scholarship competitions include full-tuition awards and need an extra essay.',
  official_url = 'https://case.edu/financialaid/undergraduates/international-students',
  source_url = 'https://case.edu/financialaid/undergraduates/international-students',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 270;

UPDATE university_scholarships SET
  scholarship_name = 'Vanderbilt University Signature Merit Scholarships (Ingram and Cornelius Vanderbilt)',
  availability_status = 'Yes',
  funding_type = 'Merit-based',
  max_scholarship = 'Full tuition plus summer stipend for more than 225 recipients; renewable for four years',
  covers_tuition = true,
  covers_living_expenses = false,
  eligibility_notes = 'International applicants are eligible for every Vanderbilt merit scholarship. Application due 1 December 2026; results in late March. About one percent of the applicant pool is selected. Transfer students are not eligible.',
  official_url = 'https://www.vanderbilt.edu/scholarships/',
  source_url = 'https://www.vanderbilt.edu/scholarships/faq/',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 247;

UPDATE university_scholarships SET
  scholarship_name = 'USC Merit Scholarships',
  availability_status = 'Yes',
  funding_type = 'Merit-based',
  max_scholarship = 'From a few thousand US dollars up to full tuition; over 1 000 students received USD 10 000 a year or more',
  covers_tuition = true,
  covers_living_expenses = false,
  eligibility_notes = 'Merit consideration only for Early Decision or Early Action applicants by 1 November 2026, or performing arts Regular Decision applicants by 1 December 2026. The 10 January 2027 regular deadline is excluded. No separate scholarship application required.',
  official_url = 'https://admission.usc.edu/cost-and-financial-aid/scholarships/',
  source_url = 'https://admission.usc.edu/cost-and-financial-aid/scholarships/',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 57;
