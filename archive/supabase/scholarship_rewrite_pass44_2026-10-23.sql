-- ============================================================================
-- Scholarship rewrite pass 44 — Ireland + New Zealand
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 697 University College Cork, 433 UCD Global Excellence,
--                  620 Massey, 752 University of Otago
-- Rows retired   : 698 (UCD duplicate of 433)
-- Rows created   : 909 Toroa International Undergraduate Fee Scholarships
-- Cards touched  : university_scholarships 253, 632, 222, 142 updated;
--                  103 set to No (retired duplicate); 668 created for 909
--
-- Pages read on 2026-10-25 (provider's own):
--   ucc.ie/en/scholarships/internationaltable      (catalogue, updated 17 Apr 2026)
--   ucc.ie/en/cacsss/international/scholarships    (CACSSS terms)
--   ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/
--   ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/
--   massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/
--   massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships/
--   otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship
--
-- No currency is converted in this pass: EUR and NZD are floating, so
-- amount_usd_value stays 0 and award_amount keeps the provider's currency.
-- That is the same convention as the Dutch, Italian, Spanish, Nordic and
-- Japanese rows written in passes 14 to 42.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. University College Cork (id 697)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'University College Cork International Scholarships (College Merit Awards)',
coverage_type = 'Partial Tuition',
amount_usd_value = 0,
award_amount = 2000,
award_currency = 'EUR',
award_period = 'year',
award_basis = 'range',
deadline = 'No separate scholarship deadline: the college awards are applied automatically at offer stage, so the only date that matters is the programme application deadline published for the intake',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'UCC awards these at offer stage rather than through a form of their own, so the scholarship has no calendar of its own and the programme application deadline for the intake is the operative date.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Automatic college-level tuition fee reduction',
tuition_coverage = 'Undergraduates in the College of Arts, Celtic Studies and Social Sciences, in the College of Business and Law and in the College of Science, Engineering and Food Science receive a EUR 2,000 reduction in each year of study, renewable for the duration of the degree subject to progressing each year. Taught master students in the College of Arts, Celtic Studies and Social Sciences receive a 20 per cent fee reduction on acceptance of the offer if they hold a first class honours degree or its GPA equivalent, and the other two colleges publish their own percentage tiers for taught masters. A 25 per cent award exists for returning international students. Only one UCC scholarship can be held at a time and, where a student qualifies for more than one, the higher award is applied.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ucc.ie/en/scholarships/internationaltable/',
source_url = 'https://www.ucc.ie/en/cacsss/international/scholarships/',
application_url = NULL,
description = 'UCC does not run one international scholarship; it runs a set of college-level fee reductions that are applied automatically, and the imported record turned that into a full-tuition award worth 24,000 dollars that does not exist. The university international scholarships catalogue, last updated on 17 April 2026, lists the awards open to students from outside the EU and marks most of them as automatic: a College of Science, Engineering and Food Science undergraduate award, a College of Arts, Celtic Studies and Social Sciences undergraduate award, a College of Business and Law undergraduate award, taught master merit awards in each of the three colleges, and a returning international student award. The value is published and it is modest. The Arts undergraduate award is a EUR 2,000 fee reduction, renewable for three years or the duration of the course, subject to progressing to the required standard; the Business and Law award is EUR 2,000 a year for full-time international undergraduates in the business school and law school; the Science and Engineering award is a EUR 2,000 fee reduction in each year of study. A candidate may not hold more than one UCC scholarship, and where more than one is available the higher one is applied. At master level the Arts college gives a 20 per cent fee reduction to a student with a first class honours degree or its GPA equivalent, on acceptance of the offer, and the other colleges run their own percentage tiers. Two exceptions in the catalogue are worth naming. The Claddagh Scholarship Program is listed as closed, and the China Scholarship Council partnership, the CSC-UCC PhD programme, is open but is a doctoral route tied to the Chinese funding council rather than a general award. So the honest summary is that UCC offers a few thousand euro of fee relief per year, not a full scholarship, and that it does so without an application.',
requirements = 'Apply for and be offered a place on a full-time undergraduate or taught master programme at University College Cork, since every one of these awards is made at offer stage rather than through a scholarship application. Be classified as an international, non-EU student for fee purposes, because the catalogue is expressly the list of scholarships offered to students from outside the EU. Be enrolled in the college that runs the award: Science, Engineering and Food Science, Arts, Celtic Studies and Social Sciences, or Business and Law. Hold the academic classification the award requires, which for the postgraduate Arts award means a first class honours undergraduate degree or its GPA equivalent. Accept the offer, because the reduction is applied on acceptance. Hold no other UCC scholarship at the same time; where more than one would apply, UCC gives the higher one. Keep progressing each year to the standard required for the next year of study, since the undergraduate reduction is renewable only on that condition.',
required_documents = '["UCC programme application","Degree transcripts and results that establish the classification the award is based on"]',
english_requirements = 'The award sets no English score; the English requirement of the chosen UCC programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from ucc.ie/en/scholarships/internationaltable, the university catalogue of scholarships offered to students from outside the EU, updated 17 April 2026, which lists the three college undergraduate awards, the taught master merit awards, the returning student award, the closed Claddagh programme and the open CSC-UCC doctoral route with their statuses; and from ucc.ie/en/cacsss/international/scholarships, the College of Arts, Celtic Studies and Social Sciences page, which publishes the EUR 2,000 undergraduate reduction, the three-year renewal rule, the 20 per cent taught master reduction for a first class honours degree, the one-scholarship rule with the higher award applied, and the automatic award at offer stage. amount_usd_value is 0 because the award is denominated in euro and this dataset does not convert floating currencies, which is the same convention used for the Dutch, Italian, Spanish and Nordic rows. CORRECTIONS: the row was titled UCC International Student Scholarships and claimed full tuition, which no UCC award provides; it carried an invented USD 24,000; it claimed bachelor, master and doctoral level, while the general awards stop at taught master and the only doctoral route is a China Scholarship Council partnership; it invented a February 1 deadline for a set of awards that have no deadline at all because they are automatic; and it invented an IELTS of 6.5 and a GPA of 3.0 that no UCC scholarship page sets.',
last_verified_at = '2026-10-25 17:00:00',
last_updated_at = '2026-10-25 17:00:00'
WHERE id = 697;

-- ----------------------------------------------------------------------------
-- 2. UCD Global Excellence Scholarship (id 433) — the correct row for the award
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
coverage_type = 'Tuition Waiver',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'EUR',
award_period = 'year',
award_basis = 'variable',
deadline = 'For 2026/27 the deadlines were 1 February 2026 for North American undergraduates, 28 February 2026 for undergraduate and graduate taught applicants from the Middle East, Africa and Pakistan and for graduate taught applicants from South Asia, and 31 March 2026 for all other regions. The 2027/28 round opens in November 2026 and its dates were still to be confirmed',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'UCD publishes a regional calendar each year for a September start: North American undergraduates in early February, the Middle East, Africa, Pakistan and South Asian graduate applicants in late February, and everyone else at the end of March. UCD said the 2027/28 dates would be published in early November 2026.',
expected_opening_period = 'Applications for the 2027/28 round open in November 2026.',
degree_levels = '["Bachelor''s","Master''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Competitive merit scholarship: 50 per cent or 100 per cent tuition fee waiver',
tuition_coverage = 'A 100 per cent or a 50 per cent waiver of the tuition fee charged at the non-EU rate, payable only toward tuition, for the standard duration of the programme. It cannot be combined with any other tuition fee scholarship, it cannot be deferred or transferred, it applies only to the programme and term named in the offer letter, and the deposit is refunded to 100 per cent awardees after registration.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/',
source_url = 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/',
application_url = 'https://hub.ucd.ie/usis/!W_HU_MENU.P_PUBLISH?p_tag=COURSES',
description = 'UCD runs two international scholarships itself and the Global Excellence Scholarship is the larger of them. It is worth a 100 per cent or a 50 per cent waiver of the tuition fee charged at the non-EU rate, and it is open to applicants for undergraduate and graduate taught programmes only, which means a doctoral applicant is outside the scheme entirely even though the imported record offered it to every level. The route is competitive and deliberate: a candidate must already hold an offer or a conditional offer for an eligible full-time programme, must be classified as non-EU for fee purposes and must be self-funding, must be entering a new programme rather than continuing in one, and must then submit a separate scholarship application through the UCD portal inside a regional window. Those windows are staggered, which is where most applicants lose the award without noticing: North American undergraduates had to apply by 1 February 2026, undergraduate and graduate taught applicants from the Middle East, Africa and Pakistan and graduate taught applicants from South Asia by 28 February 2026, and everyone else, including applicants from Central Asia, by 31 March 2026. Results are released about seven weeks after each regional deadline through the student portal. The award carries obligations after it is won. The holder must keep a stage grade point average of at least 3.08, take a standard credit load and at least 50 ECTS a year, stay enrolled full time, and act as an ambassador for UCD in student panels, focus groups and blogs. It cannot be combined with any other tuition fee scholarship and it cannot be deferred or moved to another programme. UCD states that the 2027/28 round opens in November 2026 and that the dates and terms were still being finalised when this row was verified, so the calendar above is the published 2026/27 one.',
requirements = 'Apply to an eligible full-time undergraduate or graduate taught programme at UCD and hold an offer or a conditional offer before applying for the scholarship; doctoral research programmes are not eligible. Be classified as a non-EU student for tuition purposes and be a self-funding candidate. Be entering a new UCD programme rather than continuing in one. Meet the citizenship and residence requirements UCD sets for the region the applicant is applying from. Submit the separate Global Excellence Scholarship application through the UCD student portal during the regional window that applies, and submit it complete: UCD states without exception that only complete applications received on or before the deadline are considered. If awarded, keep a stage grade point average of at least 3.08, take a standard credit load with no fewer than 50 ECTS in a year, remain enrolled full time, progress within the standard timeframe of the programme, and take part in ambassador activity as requested by UCD Global. Do not hold another tuition fee scholarship at the same time.',
required_documents = '["Offer or conditional offer for an eligible UCD programme","Global Excellence Scholarship application submitted through the UCD portal","Academic transcripts and results supporting the application","Evidence of the motivation, achievements and ambassador potential that UCD assesses"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted UCD programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships, which publishes the 100 per cent and 50 per cent tuition fee structure, the restriction to undergraduate and graduate taught programmes, the three regional closing dates of 1 February, 28 February and 31 March 2026, the seven-week results window, the statement that the 2027/28 round opens in November with dates to be confirmed, and the terms and conditions; and from ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships, which states that the awards administered by UCD Global are for students on non-EU fee rates only and publishes the maintenance rules: a stage GPA of at least 3.08, a standard credit load, at least 50 ECTS a year, full-time enrolment and ambassador duties. amount_usd_value is 0 and award_amount is NULL because the award is a percentage of a fee that varies by programme, so there is no single published sum to store; award_currency is EUR because the fee and the waiver are denominated in euro. CORRECTIONS: the row carried an invented USD 30,000 with award_currency USD; it gave a fixed March 31 deadline for every applicant when the calendar is regional and the earliest date was 1 February; it invented a 3.7 GPA and an IELTS of 6.5; it stored eligible_countries as Non-EU, which is a fee classification rather than a country, and eligible_majors as All UCD Programs; and it left application_url pointing at the general apply page instead of the scholarship route. A second live row, id 698 UCD Global Undergraduate Scholarship, duplicated this award with an invented USD 24,000, a full-tuition claim, a February 1 deadline and a malformed Bachelor''s degree level, and has been retired in the same pass.',
last_verified_at = '2026-10-25 17:00:00',
last_updated_at = '2026-10-25 17:00:00'
WHERE id = 433;

-- ----------------------------------------------------------------------------
-- 3. Retire the UCD duplicate (id 698)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
is_active = false,
title = 'UCD Global Undergraduate Scholarship (retired duplicate, see id 433)',
coverage_type = 'Tuition Waiver',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'EUR',
award_basis = 'variable',
deadline = 'No deadline of its own: this row duplicated the UCD Global Excellence Scholarship, which is recorded at id 433 with the real regional calendar',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
degree_levels = '["Bachelor''s","Master''s"]',
min_ielts = NULL,
min_gpa = NULL,
website_url = 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/',
source_url = 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/',
source_reliability = 3,
notes = 'RETIRED on 2026-10-25 as a duplicate of id 433, UCD Global Excellence Scholarship. Both rows described the same UCD award from the same university, and the imported one was wrong in every field it could be wrong in: it gave the name as UCD Global Undergraduate Scholarship although the award covers undergraduate and graduate taught programmes, it claimed full tuition worth an invented USD 24,000 when the award is a 50 per cent or 100 per cent waiver, it stored the degree level as Bachelor rather than the app canonical Bachelor''s, it invented a February 1 deadline that is only the North American undergraduate closing date, and it invented an IELTS of 7.0 and a GPA of 3.3. Its card, university_scholarships id 103, has had its availability set to No in the same pass, and the live award is described on card 632. What remains true and is preserved in id 433: the award is held only by non-EU, self-funding applicants who already hold an offer, it cannot be combined with another tuition scholarship, and it requires a stage GPA of at least 3.08 to keep.',
last_verified_at = '2026-10-25 17:00:00',
last_updated_at = '2026-10-25 17:00:00'
WHERE id = 698;

-- ----------------------------------------------------------------------------
-- 4. Massey University — Undergraduate International Study Grants (id 620)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Massey University Undergraduate International Study Grants',
coverage_type = 'Partial Tuition',
amount_usd_value = 0,
award_amount = 15000,
award_currency = 'NZD',
award_period = 'one_time',
award_basis = 'fixed',
deadline = 'No separate application: Massey assesses every eligible applicant at the point of admission and the grant appears on the offer of place, so only the programme application deadline applies',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'The grant is assessed at admission for any 2027 intake, so there is no separate scholarship deadline to track.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["Bachelor of Accountancy","Bachelor of Agribusiness","Bachelor of Agricultural Science","Bachelor of Arts","Bachelor of Aviation Management","Bachelor of Commercial Music","Bachelor of Communication","Bachelor of Design","Bachelor of Fine Arts","Bachelor of Food Technology with Honours","Bachelor of Horticultural and Plant Systems","Bachelor of Nursing","Bachelor of Resource and Environmental Planning","Bachelor of Screen Arts","Bachelor of Sport and Exercise"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Automatic tuition fee contribution for new international undergraduates',
tuition_coverage = 'NZ$15,000 towards tuition fees for one year, awarded to international students new to Massey who enrol full time onshore in one of the fifteen listed undergraduate degrees in any 2027 intake. Students holding a fully funded government scholarship are not eligible, which Massey spells out as including Fed Aid, SACM, Manaaki and TSLS.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/',
source_url = 'https://www.massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/',
application_url = 'https://www.massey.ac.nz/study/apply-to-study/',
description = 'Massey no longer runs an award called the International Excellence Scholarship, and the imported record invented both the name and the numbers. What Massey actually advertises for a new international undergraduate in 2027 is a pair of schemes with different mechanics, and the larger of the two is the easiest to get because it has no separate application. The Undergraduate International Study Grants pay NZ$15,000 towards tuition fees for one year to international students who are new to Massey and enrol full time onshore in one of fifteen listed undergraduate degrees in any intake of 2027. There is no scholarship form: Massey assesses every eligible applicant at the point of admission and, if the applicant qualifies, the grant simply appears on the offer of place. The list is broad enough to matter, running from Accountancy, Agribusiness, Agricultural Science, Arts, Aviation Management, Commercial Music, Communication, Design, Fine Arts, Food Technology with Honours and Horticultural and Plant Systems through Nursing, Resource and Environmental Planning and Screen Arts to Sport and Exercise. Two limits are worth stating plainly. Students who already hold a fully funded government scholarship are excluded, and Massey names Fed Aid, SACM, Manaaki and TSLS. And a candidate whose degree is not on the list is redirected by Massey itself to the Toroa International Undergraduate Fee Scholarships, worth NZ$10,000, capped at about forty awards, restricted to five degrees and requiring a separate application in the spring for a February start. Neither scheme is a full scholarship. The grant is a one-off contribution of NZ$15,000 against the full international undergraduate tuition fee that Massey publishes per programme and per year, so a student still funds the remainder.',
requirements = 'Be an international student new to Massey University, meaning no previous enrolment there. Enrol full time and onshore in New Zealand in one of the fifteen undergraduate degrees listed on the grant page, in any intake of 2027. Apply for admission to the degree, since the grant is assessed at that point and there is no separate scholarship application. Hold no fully funded government scholarship, since Fed Aid, SACM, Manaaki and TSLS recipients are excluded. If the intended degree is not on the list, apply instead for the Toroa International Undergraduate Fee Scholarships, which requires a separate application through the Massey student portal and is limited to the Bachelor of Animal Science, Bachelor of Business, Bachelor of Construction, Bachelor of Information Science and Bachelor of Science.',
required_documents = '["Application for admission to an eligible Massey undergraduate degree","Academic transcripts assessed at admission"]',
english_requirements = 'The grant sets no score; the English requirement of the chosen Massey programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants, which publishes the NZ$15,000 value, the one-year duration, the open status, the restriction to new international students enrolling full time onshore in any 2027 intake, the fifteen eligible degrees, the exclusion of fully funded government scholarship holders including Fed Aid, SACM, Manaaki and TSLS, the instruction that there is no separate application and that the grant is assessed at admission and shown on the offer of place, and the redirection to the Toroa award for degrees not on the list. amount_usd_value is 0 because the award is denominated in New Zealand dollars and this dataset does not convert floating currencies. CORRECTIONS: the row was titled Massey University International Excellence Scholarships, which is not the current name of any Massey award; it claimed full tuition when Massey awards a NZ$15,000 contribution toward a five-figure fee; it carried an invented USD 22,500 and award_currency USD; it claimed bachelor, master and doctoral level when the grant is undergraduate only; it invented a December 1 deadline for an award that has no application at all; and it invented an IELTS of 6.0 and a GPA of 3.0 that no Massey scholarship page sets.',
last_verified_at = '2026-10-25 17:00:00',
last_updated_at = '2026-10-25 17:00:00'
WHERE id = 620;

-- ----------------------------------------------------------------------------
-- 5. NEW — Toroa International Undergraduate Fee Scholarships (id 909)
-- ----------------------------------------------------------------------------
INSERT INTO scholarships (
title, provider, country, coverage_type, amount_usd_value, award_amount, award_currency, award_period, award_basis,
deadline, deadline_type, expected_deadline_period, degree_levels, eligible_majors, eligible_countries, min_ielts, min_gpa,
funding_type, tuition_coverage, accommodation, website_url, source_url, application_url,
description, requirements, required_documents, english_requirements, rounds, recurrence, application_status,
verification_status, source_reliability, notes, is_active, university_id, last_verified_at, last_updated_at
) VALUES (
'Toroa International Undergraduate Fee Scholarships (Massey University)',
'Massey University',
'New Zealand',
'Partial Tuition',
0,
10000,
'NZD',
'one_time',
'fixed',
'20 October 2026 for the February 2027 intake, now closed; the round opened on 15 September 2026',
'annual',
'Massey opened the Toroa round on 15 September and closed it on 20 October 2026 for the intake starting in February 2027, so the next window is expected in the same two months a year later.',
'["Bachelor''s"]',
'["Bachelor of Animal Science","Bachelor of Business","Bachelor of Construction","Bachelor of Information Science","Bachelor of Science"]',
'["All"]',
NULL,
NULL,
'Merit and contribution based tuition fee scholarship for new international undergraduates',
'NZ$10,000 towards tuition fees for one year, with up to 40 awards offered, for international students new to Massey who enrol full time on campus in the first 120 credits of one of five undergraduate degrees in the February 2027 semester. The recipient must pay the first year full fees, or make a NZ$500 contribution towards tuition, within two weeks of the award in order to secure it.',
'',
'https://www.massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships/',
'https://www.massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships/',
'https://smsportal.massey.ac.nz/sitsvision/wrd/siw_lgn',
'The Toroa award is the smaller and more selective of the two routes Massey opens to a new international undergraduate, and unlike the automatic study grant it requires an actual application. It is worth NZ$10,000 towards one year of tuition, up to about forty awards are offered, and for the February 2027 intake it was restricted to five degrees: Animal Science, Business, Construction, Information Science and Science. Applications ran from 15 September to 20 October 2026 and were submitted through the Massey student portal under the Scholarships tab, not through the admission application. The selection question is not purely academic. Massey states that it considers the applicant contribution to a vibrant Massey campus and asks two questions in the form: why the applicant chose Massey, and what academic or other contribution they intend to make to the Massey community. There is also a commitment attached to the award that is easy to miss: a successful recipient must pay the first year full fees, or put NZ$500 towards tuition, within two weeks of the award in order to secure the scholarship. Massey publishes a separate scheme for a candidate whose degree is not on this list, the Undergraduate International Study Grants, which pay NZ$15,000 and need no application at all. Neither is a full scholarship, and the Toroa round for the February 2027 intake has closed.',
'Be an international student new to Massey University. Intend to enrol full time on campus in New Zealand in the first 120 credits of one of the five eligible undergraduate degrees in the February semester of the award year. Hold an admission offer for that degree, since the scholarship application sits alongside admission rather than replacing it. Submit the scholarship application through the Massey student portal before the closing date, answering the two selection questions on the choice of Massey and the contribution the applicant intends to make. If successful, pay the first year full fees or a NZ$500 contribution towards tuition within two weeks of the award in order to secure the scholarship. Consider the automatic Undergraduate International Study Grants instead if the intended degree is not one of the five listed here.',
'["Admission offer for an eligible Massey undergraduate degree","Scholarship application through the Massey student portal","Answers to the two selection questions on choosing Massey and the intended contribution","Academic transcripts assessed with the admission application"]',
'The scholarship sets no score of its own; the English requirement of the admitted Massey programme applies.',
'[]',
'annual',
'closed',
'verified',
9,
'New row created on 2026-10-25 from massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships, which publishes the NZ$10,000 value, the one-year duration, the up to 40 awards, the closed status, the application window of 15 September to 20 October 2026, the five eligible degrees, the two selection questions, the student portal route and the requirement to pay the first year full fees or a NZ$500 contribution within two weeks of the award. The reason for a separate record is that Massey runs two different international undergraduate schemes with different mechanics: the study grant is automatic and worth NZ$15,000 for fifteen degrees, while this award is applied for, worth NZ$10,000, capped in number and restricted to five degrees. Collapsing them into one row would misstate both. amount_usd_value is 0 because the award is denominated in New Zealand dollars and this dataset does not convert floating currencies.',
true,
251,
'2026-10-25 17:00:00',
'2026-10-25 17:00:00'
);

-- ----------------------------------------------------------------------------
-- 6. University of Otago (id 752)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'University of Otago International Academic Excellence Scholarship',
coverage_type = 'Partial Funding',
amount_usd_value = 0,
award_amount = 35000,
award_currency = 'NZD',
award_period = 'total',
award_basis = 'fixed',
deadline = 'Closing date is two weeks after the invitation to apply, which Otago issues once an offer of place has been made; consideration opens on 1 May in the year before study',
deadline_type = 'rolling',
deadline_date = NULL,
expected_deadline_period = 'Otago opens international entrance scholarship consideration on 1 May in the year before study, then invites eligible applicants to apply once they hold an offer, and the two-week clock runs from each individual invitation.',
expected_opening_period = 'Consideration opens on 1 May in the year before study.',
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Merit-based undergraduate entrance scholarship',
tuition_coverage = 'About NZ$35,000 over three years. In year one the scholarship pays the accommodation fee for a University-owned or University-affiliated residential college up to the standard University room rate, worth roughly NZ$21,000, and no payment is made at all if the student chooses not to live in such a college. In years two and three it pays NZ$7,000 a year towards tuition and student services fees, subject to a grade point average of 7.0, roughly an A-, in the previous year, or admission to and successful progress within a professional programme.',
accommodation = 'Year one is paid as the residential college accommodation fee, so the award only has value if the student lives in a University-owned or University-affiliated college in the first year. Students starting in the July semester receive half the funds towards accommodation and the other half in the following February.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship',
source_url = 'https://www.otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship',
application_url = NULL,
description = 'Otago has no award called the International Student Scholarship, and the imported record invented both the name and a full-tuition value that the university never offers at undergraduate level. The entrance award for a high-achieving international undergraduate is the International Academic Excellence Scholarship, and it is worth about NZ$35,000 over three years, but almost none of it is paid as cash. Year one is paid as the accommodation fee in a University-owned or University-affiliated residential college, up to the standard room rate, which Otago values at roughly NZ$21,000, and the university is blunt that a student who chooses not to live in such a college in the first year receives nothing. Years two and three pay NZ$7,000 a year towards tuition and student services fees, and continuation depends on a grade point average of 7.0, roughly an A-, or on admission to and successful progress within one of the professional programmes. The route in is unusual and it matters. There is no stand-alone scholarship form: an applicant ticks the box in the eVision admission application to be considered for international scholarships, and once an offer of place is issued the eligible candidate is invited to apply, with a two-week window from the invitation. Consideration opens on 1 May in the year before study. The conditions are tight. Deferral is not possible, diploma and certificate programmes are excluded because they are not degree programmes, a student sponsored by their home government or by the New Zealand government is ineligible, the award is paid only once even if the applicant receives several offers of place, and a change of residency status from international to domestic can end the award and trigger repayment. Otago offers a separate set of postgraduate research awards, including the Otago Doctoral Scholarship, which are not covered by this record.',
requirements = 'Have completed secondary school or another qualification that grants University Entrance at an approved institution, outside New Zealand. Intend to enrol, or already be enrolled, full time in degree-level undergraduate study at Otago, from 100-level through to degree attainment, and study on campus for the whole duration; diploma and certificate programmes are not degree programmes and are ineligible. Opt in to international scholarship consideration in the eVision admission application, since Otago issues the invitation to apply rather than accepting open applications. Hold an offer of place in a programme, then submit the full application within two weeks of the invitation. Not be sponsored by the home government or by the New Zealand government. Accept that the award cannot be deferred, that only one scholarship will be awarded even where several offers of place are received, and that a change of residency status during the tenure may end the award. To keep years two and three, hold a grade point average of 7.0 or better in the previous year, or be admitted to and progressing within a professional programme, and write to the Manager of Undergraduate Entrance Scholarships by 31 January if requesting leniency on that requirement.',
required_documents = '["Admission application through eVision with the international scholarship box ticked","Offer of place in an eligible undergraduate programme","Scholarship application submitted within two weeks of the invitation"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Otago programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship, which publishes the value of about NZ$35,000 over three years, the structure of a first-year residential college accommodation payment worth around NZ$21,000 followed by NZ$7,000 a year towards tuition and student services fees in years two and three, the rule that no payment is made if the student does not live in a University-owned or University-affiliated college in year one, the semester 2 split, the GPA 7.0 continuation requirement and the 31 January leniency route, the opening date of 1 May in the year before study, the closing date of two weeks after the invitation, the eVision opt-in and invitation process, the exclusion of diploma and certificate programmes, the ban on government-sponsored students, the no-deferral rule and the residency-change clause. amount_usd_value is 0 because the award is denominated in New Zealand dollars and this dataset does not convert floating currencies. CORRECTIONS: the row was titled University of Otago International Student Scholarship, which is not the name of an Otago award; it claimed full tuition when the award is a first-year accommodation payment plus NZ$7,000 a year; it carried an invented USD 26,000 with award_currency USD; it claimed bachelor, master and doctoral level when this is an undergraduate entrance scholarship and doctoral funding is a separate scheme already recorded at id 392; it invented a 10 December deadline for an award that is invitation-driven with a two-week window; and it invented an IELTS of 6.0 and a GPA of 3.0 that no Otago scholarship page sets.',
last_verified_at = '2026-10-25 17:00:00',
last_updated_at = '2026-10-25 17:00:00'
WHERE id = 752;

-- ----------------------------------------------------------------------------
-- 7. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 17:00:00'
FROM (VALUES
 (253, 'University College Cork International Scholarships (College Merit Awards)', 'Yes', 'Partial Funding', 'EUR 2,000 a year off tuition for undergraduates in the three colleges, renewable for the degree, and 20 per cent off fees for a first class honours taught master in Arts, Celtic Studies and Social Sciences', true, false, 'Automatic fee reduction at offer stage, with no application form', 'Awards are made at offer stage to non-EU students enrolled in the college that runs the award. Only one UCC scholarship can be held at a time and the higher one is applied. The undergraduate reduction renews for three years or the course duration subject to progressing. No UCC award covers full tuition, and the only doctoral route in the catalogue is a China Scholarship Council partnership.', 'https://www.ucc.ie/en/scholarships/internationaltable/', 'https://www.ucc.ie/en/cacsss/international/scholarships/'),
 (103, 'UCD Global Undergraduate Scholarship (retired duplicate, see id 433)', 'No', 'Unavailable', 'Retired: this was a duplicate of the Global Excellence Scholarship, described on card 632', false, false, 'Retired: the same award is described on card 632', 'RETIRED on 2026-10-25. This card duplicated the UCD Global Excellence Scholarship while claiming full tuition worth USD 24,000, a February 1 deadline and an undergraduate-only scope. The live award is the UCD Global Excellence Scholarship, a 50 or 100 per cent tuition waiver for undergraduate and graduate taught applicants, on card 632.', 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/', 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/'),
 (632, 'UCD Global Excellence Scholarship', 'Yes', 'Partial Funding', 'A 100 per cent or 50 per cent waiver of the non-EU tuition fee for the standard duration of the programme', true, false, 'The only UCD award that can waive the whole tuition fee, but it is regional and competitive', 'Non-EU, self-funding applicants who already hold an offer or conditional offer for an eligible undergraduate or graduate taught programme. Doctoral research programmes are not eligible. A separate application is required inside a regional window: 1 February for North American undergraduates, 28 February for the Middle East, Africa, Pakistan and South Asian graduate applicants, 31 March for everyone else. Results about seven weeks after each deadline. To keep it: a stage GPA of at least 3.08, a standard credit load, at least 50 ECTS a year and ambassador duties. The 2027/28 dates open in November 2026.', 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/', 'https://www.ucd.ie/global/study-at-ucd/scholarshipsfinances/scholarships/globalexcellencescholarships/'),
 (222, 'Massey University Undergraduate International Study Grants', 'Yes', 'Partial Funding', 'NZ$15,000 towards tuition fees for one year, assessed automatically at admission', true, false, 'No application needed: the grant is assessed at admission and shown on the offer of place', 'For international students new to Massey enrolling full time onshore in one of fifteen listed undergraduate degrees in any 2027 intake. Holders of a fully funded government scholarship, including Fed Aid, SACM, Manaaki and TSLS, are excluded. Degrees not on the list can apply for the Toroa award instead, which is a separate card on this page.', 'https://www.massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/', 'https://www.massey.ac.nz/study/scholarships-and-awards/undergraduate-international-study-grants/'),
 (142, 'University of Otago International Academic Excellence Scholarship', 'Yes', 'Partial Funding', 'About NZ$35,000 over three years: a first-year residential college accommodation fee of roughly NZ$21,000 plus NZ$7,000 a year towards fees in years two and three', true, true, 'The largest undergraduate entrance award Otago offers international students, but most of it is paid as accommodation', 'Undergraduate entrants who completed secondary school outside New Zealand and will study full time on campus from 100-level to degree. Diploma and certificate programmes are ineligible, as are students sponsored by a home government or the New Zealand government. Candidates opt in through eVision and are invited to apply after an offer of place, with a two-week window. Year one is paid only if the student lives in a University-owned or University-affiliated college. Years two and three need a GPA of 7.0.', 'https://www.otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship', 'https://www.otago.ac.nz/courses/scholarships/international-academic-excellence-scholarship')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;

INSERT INTO university_scholarships (
university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship,
covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url,
verification_status, last_verified_at
) VALUES (
251, 909, 'Toroa International Undergraduate Fee Scholarships (Massey University)', 'Yes', 'Partial Funding',
'NZ$10,000 towards tuition fees for one year, with up to 40 awards',
true, false,
'The only Massey international undergraduate award that asks the student to make a case for contribution to campus life',
'New international students enrolling full time on campus in the first 120 credits of one of five degrees: Animal Science, Business, Construction, Information Science or Science. A separate application through the Massey student portal, with two questions on why Massey and what the applicant will contribute. The February 2027 round ran from 15 September to 20 October 2026 and has closed. Recipients must pay the first year full fees or a NZ$500 contribution within two weeks of the award to secure it.',
'https://www.massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships/',
'https://www.massey.ac.nz/study/scholarships-and-awards/toroa-international-undergraduate-fee-scholarships/',
'verified', '2026-10-25 17:00:00'
);
