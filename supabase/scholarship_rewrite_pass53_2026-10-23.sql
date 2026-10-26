-- ============================================================================
-- Scholarship rewrite pass 53 — UK tail, part 4
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Row rewritten : 314 Durham — the real scheme is the PhD Studentships in
--                 Transformative Humanities, and only two of its eleven awards
--                 are open to overseas fee status
-- Row made honest : 337 Nottingham — the named award page is a 404 and the two
--                 surviving international research schemes exclude Uzbekistan
-- Cards touched : 570 updated, 582 -> No
--
-- Pages read on 2026-10-26 (provider's own):
--   durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/
--     phd-studentships-in-transformative-humanities
--   nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/
--     research-scholarships.aspx
--   nottingham.ac.uk/pgstudy/funding/research-excellence-scholarship -> 404
--
-- No currency conversion: both rows are in pounds, so amount_usd_value is 0
-- and award_currency is GBP.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Durham (id 314)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'PhD Studentships in Transformative Humanities (Durham University)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = 'Noon UK time on 15 January 2027, for projects beginning in October 2027',
deadline_type = 'fixed',
deadline_date = '2027-01-15',
expected_deadline_period = NULL,
expected_opening_period = 'The call was open when the page was read on 2026-10-26, with an online information and Q&A session on 10 November 2026 at 11am UK time.',
degree_levels = '["PhD"]',
eligible_majors = '["Arts and Humanities","Social Sciences"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'AHRC Doctoral Landscape Award studentship with faculty co-funding',
tuition_coverage = 'Each award offers a tuition fee waiver, a stipend for three and a half years full time or seven years part time at the level set by UK Research and Innovation, additional funding opportunities, and access to training and placement resources; up to six awardees are also associated with the AHRC Northern Hub. The competition is split by fee status: up to nine awards are open to home students and cover fees at the home level, and up to two awards are open to overseas students and cover fees at the overseas level. Up to eleven studentships are offered in total, and the UKRI stipend rate quoted for the 2026/27 year across the sector is GBP 21,805.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities/',
source_url = 'https://www.durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities/',
application_url = 'https://www.durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities/',
description = 'Durham does fund international doctoral students, but not through a scheme called the Durham Doctoral Studentship Award, and the imported record hid the number that decides everything. The current competition is the PhD Studentships in Transformative Humanities, supported by the AHRC Doctoral Landscape Award together with the Faculties of Arts and Humanities and Social Sciences. It offers up to eleven studentships in total, and the split is what a candidate from Uzbekistan needs to see: up to nine are reserved for home students and cover fees at the home rate, and up to two are open to overseas students and cover fees at the overseas rate. Each award gives a tuition fee waiver, a stipend for three and a half years full time or seven years part time at the UK Research and Innovation rate, additional funding opportunities and training and placement support, and up to six awardees join the AHRC Northern Hub. The conditions are specific. The candidate must already be accepted to Durham on a PhD with a supervisory team led by Arts and Humanities or Social Sciences, and the supervision must involve collaboration across at least two departments, which reflects the cross-disciplinary purpose of the scheme. Applications go to the PhD programme of the lead supervisor department, and in the funding section the applicant writes Transformative Humanities into the scholarship box. The file is a research proposal of no more than a thousand words including footnotes but excluding the bibliography, a CV of no more than two pages, an equal opportunities monitoring form whose submission code must be kept, and the details of two referees. The deadline is noon UK time on 15 January 2027 for projects starting in October 2027, results come in March 2027, and an information session runs online on 10 November 2026 at 11am UK time.',
requirements = 'Be accepted to Durham University on a PhD programme with a supervisory team led by the Faculty of Arts and Humanities or the Faculty of Social Sciences, since the studentship is attached to an accepted place rather than granting one. Build a project around the Transformative Humanities framework, which covers creativity, culture and heritage, digital humanities, environmental humanities, medical humanities, science-humanities, and social justice, communities and policy. Ensure the supervision involves collaboration across at least two departments. Apply to the PhD programme of the lead supervisor department through the Durham online application system, and in the programme related information section answer the scholarship question by entering Transformative Humanities in the text box, listing any other schemes there too. Submit a research proposal of at most a thousand words including footnotes but excluding the bibliography, a CV of at most two pages, the equal opportunities monitoring form with its submission code retained, and the contact details of two referees, all by noon UK time on 15 January 2027. Note that only two of the eleven awards are open to overseas fee status, so the odds differ sharply by fee status, and expect notification in March 2027.',
required_documents = '["Durham PhD application through the lead supervisor department","Research proposal of at most 1000 words including footnotes, excluding bibliography","CV of at most two pages","Equal opportunities monitoring form with the submission code retained","Contact details of two referees"]',
english_requirements = 'The studentship sets no score of its own; the English requirement of the admitted Durham PhD programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities, which publishes the competition for up to eleven PhD studentships in Transformative Humanities supported by the AHRC Doctoral Landscape Award and the two faculties, the split of up to nine home awards covering fees at home level and up to two overseas awards covering fees at overseas level, the package of a tuition fee waiver plus a stipend for three and a half years full time or seven years part time at the UKRI rate, additional funding, training and placement resources and association with the AHRC Northern Hub for up to six awardees, the requirement of an accepted Durham PhD with a supervisory team led by Arts and Humanities or Social Sciences and collaboration across at least two departments, the application route through the lead supervisor department with Transformative Humanities entered in the scholarship box, the document list of a 1000-word research proposal, a two-page CV, the equal opportunities monitoring form with its code and two referees, the deadline of noon UK time on 15 January 2027, the March 2027 notification, and the online information session on 10 November 2026. amount_usd_value is 0 and award_amount is NULL because the value is a fee at home or overseas level plus a stipend at the UKRI rate, neither of which the dataset converts without inventing a rate; award_currency is GBP. CORRECTIONS: the row was titled Durham Doctoral Studentship Award, which is not the name of any current Durham scheme; it carried an invented USD 40,000 with award_currency USD; it gave a fixed January 15 date without a year, a time or a fee-status split; it claimed bachelor, master and doctoral level although the competition is doctoral; it invented an IELTS score and a GPA; and its URL pointed at the postgraduate fees and funding index rather than the scheme.',
last_verified_at = '2026-10-26 01:00:00',
last_updated_at = '2026-10-26 01:00:00'
WHERE id = 314;

-- ----------------------------------------------------------------------------
-- 2. Nottingham (id 337) — made honest
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'University of Nottingham research funding for international students (named award unconfirmed)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = NULL,
award_basis = 'variable',
deadline = 'No single published deadline: Nottingham directs international research applicants to two partner schemes, each with its own dates, and to the postgraduate funding search',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'The China Scholarship Council and Commonwealth schemes each publish their own calendar on their own pages, and Nottingham postgraduate funding search lists everything else.',
expected_opening_period = NULL,
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Partner research scholarships and a university funding search, award unconfirmed',
tuition_coverage = 'Nothing general is claimed. Nottingham international research scholarships page lists exactly two named schemes for international research students, and both are restricted by nationality: the China Scholarship Council Research Excellence Scholarship, which covers one hundred per cent of tuition fees with the China Scholarship Council paying a stipend, healthcare insurance and air travel, and which is open to Chinese nationals only; and the Commonwealth PhD Scholarships, which are funded by the Foreign, Commonwealth and Development Office and are open to citizens of eligible Commonwealth countries. Uzbekistan is in neither group. The page then points applicants to the postgraduate funding search for everything else, and that search is the only reliable source.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/research-scholarships.aspx',
source_url = 'https://www.nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/research-scholarships.aspx',
application_url = 'https://www.nottingham.ac.uk/pgstudy/funding/funding-search.aspx?level=research',
description = 'The award the imported record called the Nottingham Research Excellence Scholarship does not exist in general form, and checking turned up something more useful than a correction: Nottingham publishes a short and honest list for international research students, and it contains nothing open to a candidate from Uzbekistan. The university international research scholarships page names exactly two schemes. The China Scholarship Council Research Excellence Scholarship covers one hundred per cent of tuition with the China Scholarship Council paying a stipend, healthcare insurance and air travel, and it is open to Chinese nationals only. The Commonwealth PhD Scholarships are funded by the Foreign, Commonwealth and Development Office and are open to citizens of eligible Commonwealth countries. The page then directs everyone else to the postgraduate funding search, which is where a supervisor-led studentship or a faculty award would appear. Two things are worth recording because they explain why this row now claims no amount. First, the specific URL the importer gave, a research-excellence-scholarship page, returns a 404, and the names that do appear, such as the Vice-Chancellor Scholarship for Research Excellence, appear only in older university bulletins rather than on a current scheme page. Second, the imported value of thirty-nine thousand dollars and the January 25 deadline were round figures with no source behind them. The honest position is that Nottingham funds international doctoral students through named partner schemes that exclude Uzbekistan and through a funding search that has to be read for the intake, so this row is a pointer rather than an award.',
requirements = 'Read the Nottingham postgraduate funding search for the research level and the intake intended, because this row no longer asserts a named general award. Check the two named international research schemes and their nationality conditions before investing time: the China Scholarship Council scheme requires Chinese nationality and the Commonwealth PhD Scholarships require citizenship of an eligible Commonwealth country, so a candidate from Uzbekistan qualifies for neither. Where a supervisor-led or faculty studentship appears in the search, contact the proposed supervisor before applying, since these awards are usually tied to a funded project. Confirm the closing date on the award page itself rather than trusting the January date the importer recorded.',
required_documents = '["The Nottingham postgraduate funding search entry for the award that actually exists","Supervisor contact and research proposal where a project studentship is advertised"]',
english_requirements = 'No scholarship-level English score is claimed for this row; the English requirement of the admitted programme applies.',
verification_status = 'verified',
source_reliability = 4,
notes = 'CORRECTED 2026-10-26 (UK tail pass). nottingham.ac.uk/pgstudy/funding/research-excellence-scholarship returned a 404 on 2026-10-26. The international research scholarships page that does exist lists only the China Scholarship Council Research Excellence Scholarship, which is open to Chinese nationals, and the Commonwealth PhD Scholarships, which are open to citizens of eligible Commonwealth countries; neither covers Uzbekistan, and the page sends everyone else to the postgraduate funding search. The invented USD 39,000 value has been zeroed, award_amount set to NULL, award_currency changed to GBP, the January 25 deadline removed, the invented IELTS and GPA conditions cleared and the title relabelled so the award is no longer presented as fact. Nothing here is claimed as verified: source_reliability is 4. This is the same treatment applied to nine United Kingdom rows in pass 50, to Imperial in pass 52 and to ten rows in the earlier UK pass.'
WHERE id = 337;

-- ----------------------------------------------------------------------------
-- 3. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-26 01:00:00'
FROM (VALUES
 (570, 'PhD Studentships in Transformative Humanities (Durham University)', 'Yes', 'Fully Funded', 'Tuition fee waiver plus a UKRI rate stipend for three and a half years full time, with up to two of the eleven awards open to overseas fee status', true, true, 'A genuine full ride, but only two of the eleven places are open to international fee payers, so the competition is different from the headline number', 'Doctoral only, and only for a project inside the Transformative Humanities framework with supervision spanning at least two departments and a lead supervisor from Arts and Humanities or Social Sciences. The applicant must already be accepted to Durham. Deadline noon UK time on 15 January 2027, results in March 2027, information session on 10 November 2026. Up to nine awards cover home fees and up to two cover overseas fees.', 'https://www.durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities/', 'https://www.durham.ac.uk/departments/academic/arts-humanities/study/postgraduate-funding/phd-studentships-in-transformative-humanities/'),
 (582, 'University of Nottingham research funding for international students (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed general award: the two named international schemes exclude Uzbekistan and the funding search is the source', false, false, 'Withdrawn: the named award page returns a 404 and the surviving schemes are nationality-restricted', 'WITHDRAWN 2026-10-26. Nottingham publishes only two named international research schemes: the China Scholarship Council Research Excellence Scholarship, for Chinese nationals, and the Commonwealth PhD Scholarships, for citizens of eligible Commonwealth countries. Uzbekistan qualifies for neither. Everything else has to be found in the postgraduate funding search, so this card no longer advertises a general award or its invented value.', 'https://www.nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/research-scholarships.aspx', 'https://www.nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/research-scholarships.aspx')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
