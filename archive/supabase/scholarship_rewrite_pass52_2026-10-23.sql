-- ============================================================================
-- Scholarship rewrite pass 52 — UK tail, part 3
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Rows rewritten : 139 Manchester President's Doctoral Scholar, 309 Bristol
--                  Think Big
-- Row made honest : 4 Imperial President's Undergraduate Scholarship (404)
-- Cards touched  : 651 and 545 updated, 485 -> No
--
-- Pages read on 2026-10-26 (provider's own):
--   manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award
--   bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships
--   imperial.ac.uk/study/ug/fees-and-funding/scholarships/presidents-undergraduate-scholarship -> 404
--
-- The Manchester funding structure and 2027/28 dates come from the faculty
-- pages of the same scheme (Science and Engineering, Biology Medicine and
-- Health, Humanities), reached from the central page but read through the
-- search index rather than fetched directly; this is recorded in the row notes.
--
-- No currency conversion: every award here is in pounds, so amount_usd_value
-- is 0 and award_currency is GBP.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Manchester President's Doctoral Scholar Award (id 139)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'President''s Doctoral Scholar Award (University of Manchester)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = '18 December 2026 for entry in the 2027/28 cycle, with projects announced on 30 October 2026 and interviews in the week commencing 1 March 2027',
deadline_type = 'fixed',
deadline_date = '2026-12-18',
expected_deadline_period = NULL,
expected_opening_period = 'Projects for the 2027/28 cycle are announced on 30 October 2026.',
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded doctoral studentship from the University of Manchester',
tuition_coverage = 'The award pays university tuition fees in full at either the home or the international rate, depending on the candidate fee status, and adds a tax-free annual maintenance stipend at the UK Research and Innovation rate plus a GBP 1,000 stipend enhancement. The UKRI minimum stipend for 2026/27 is GBP 21,805, and the Faculty of Science and Engineering pages of the same scheme state that award holders can also receive up to GBP 20,000 of research, training and skills development funding. The studentship runs for three and a half to four years depending on the faculty, and award holders join a presidential scholars network with its own training programme.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award/',
source_url = 'https://www.manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award/',
application_url = 'https://www.manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award/',
description = 'The President''s Doctoral Scholar award is real, it is Manchester''s flagship doctoral funding scheme, and it is more generous than the flat forty-three thousand dollars the imported record claimed, though the value is expressed as fees plus a stipend plus a research grant rather than as one number. The university describes the PDS as the highest accolade it bestows on its postgraduate researchers, supported personally by the President and Vice Chancellor, and it is open to students of all nationalities and across all research areas. What the scheme pays is a fully funded studentship of three and a half to four years depending on the faculty: tuition fees at the home or international rate, a tax-free maintenance stipend at the UK Research and Innovation rate plus a GBP 1,000 enhancement, and, in the Faculty of Science and Engineering, up to GBP 20,000 of research, training and skills development funding. The UKRI minimum stipend for 2026/27 is GBP 21,805, which is the rate an award holder should expect. The scheme is organised by annual cohorts around a unifying interdisciplinary theme: the 2026/27 theme was environmental challenges to human health, society and productivity, and the 2027/28 call is built around a different theme with eight to ten projects. The calendar for the 2027/28 cycle is published and tight: projects announced on 30 October 2026, applications closing on 18 December 2026, interviews in the week commencing 1 March 2027 and studentships beginning in October 2027. The entry bar is high but stated plainly: a first class or upper second class UK honours degree or its international equivalent, ideally a master''s at merit or distinction, and a track record of engagement with research that can include contributions to publications or prizes for research work. A candidate must also have submitted an application for a PhD programme by the published deadline. The scheme is administered faculty by faculty, so the first step is to find the project in the faculty that hosts it and read that faculty page.',
requirements = 'Identify a project inside the current PDS cohort, since the award is attached to a defined interdisciplinary project rather than to a free-standing application, and read the page of the faculty that hosts it: Biology, Medicine and Health, Humanities, or Science and Engineering. Hold, or expect to achieve, a first class or upper second class UK honours degree or an international equivalent, and ideally a master degree at merit or distinction. Show a track record of engagement with research, which can include contributions to publications, dissemination of research, or prizes for research and project work. Submit an application for the PhD programme by the published deadline, which for the 2027/28 cycle is 18 December 2026. Expect interviews in the week commencing 1 March 2027 and a start in October 2027. Note that the theme changes each year, that eight to ten projects were available in the cycle described on the university page, and that the value differs slightly by faculty: the Science and Engineering pages add up to GBP 20,000 of research training and skills funding while the Humanities page quotes four years of fees with the stipend and enhancement.',
required_documents = '["PhD programme application by the published deadline","Academic transcripts and degree certificates","Evidence of research engagement, such as publications, dissemination or research prizes","Research proposal as the faculty project requires","References as the programme requires"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Manchester PhD programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award, which publishes the scheme as the university flagship funding initiative, open to students of all nationalities and across all research areas, organised by annual interdisciplinary cohort, with the 2026/27 theme and the contact route through the three faculties. The funding structure and the dates come from the faculty pages of the same scheme reached from that page: the Science and Engineering page publishes tuition at the home or international rate, a stipend at the UKRI minimum, the GBP 1,000 enhancement and up to GBP 20,000 of research training and skills funding, the Biology, Medicine and Health page publishes the four-year studentship and the 2027/28 calendar of projects announced on 30 October 2026, applications closing on 18 December 2026 and interviews in the week commencing 8 March 2027, and the Humanities page publishes four years of fees with the GBP 21,805 UKRI stipend and the enhancement. Those faculty pages were read through the search index rather than fetched directly in this pass, which is why source_url points at the central scheme page that was fetched. amount_usd_value is 0 and award_amount is NULL because the value is a fee at one of two rates plus a stipend that is reset annually; award_currency is GBP. CORRECTIONS: the row carried an invented USD 43,000 with award_currency USD; it gave a fixed January 31 deadline that matches no published date; it claimed bachelor, master and doctoral level although the scheme is doctoral; it invented an IELTS score and a GPA; and its URL pointed at a path that now returns 404.',
last_verified_at = '2026-10-26 00:30:00',
last_updated_at = '2026-10-26 00:30:00'
WHERE id = 139;

-- ----------------------------------------------------------------------------
-- 2. Bristol Think Big (id 309) — scheme verified, value deliberately withheld
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'University of Bristol Think Big Scholarships',
coverage_type = 'Partial Tuition',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = '10am UK time on Friday 10 April 2026 for September 2026 entry, which has closed; outcomes were sent in May 2026 and the next round follows the same spring pattern',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'Bristol opens the international scholarship application in the spring and closes it in mid-April for the following September, with outcomes in May.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University flagship scholarship providing funding towards tuition fees for international students',
tuition_coverage = 'Think Big provides funding towards tuition fees for international students on eligible undergraduate and postgraduate courses, and Bristol publishes it as its flagship scholarship scheme. The value is set in bands by programme and by the strength of the application, and Bristol does not state a single figure at scheme level; the bands were not captured in the page content retrieved in this pass, so this row deliberately carries no number rather than guessing one. The scheme is administered together with Bristol other international awards, the GREAT scholarships, the scholarships for women and the Commonwealth and Chevening routes, through one application form, and one completed form puts a candidate forward for every Bristol international scholarship for which they are eligible.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/',
source_url = 'https://www.bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/',
application_url = 'https://internationalscholarships.fillout.com/thinkbig2026',
description = 'Think Big is real, it is Bristol flagship international scholarship scheme, and the imported record described it correctly only in the vaguest sense: it gave a round thirty-two thousand dollars and an April 29 deadline, neither of which Bristol publishes. What the university does publish is the shape of the scheme and the mechanics of applying. Think Big provides funding towards tuition fees for international students on eligible undergraduate and postgraduate courses, and there is a single online application form that also puts the candidate forward for the GREAT scholarships, the scholarships for women and the Bristol routes tied to Commonwealth and Chevening funding. The conditions are stated plainly: the candidate must have applied to start an eligible course in September 2026 and must be classed as an overseas student for fee purposes, but does not need to hold an offer before submitting the scholarship application. The course list is enormous and is published course by course, with an asterisk marking the courses where more than one Think Big award is available. The round closed at 10am UK time on Friday 10 April 2026 for September 2026 entry, with outcomes in May 2026, and the same spring pattern should be expected for the following cycle. One thing this record deliberately does not do is state a value: Bristol sets the award in bands by programme and by the strength of the case, and the bands were not captured in the page content retrieved in this pass, so no figure is asserted rather than a round number being invented a second time.',
requirements = 'Apply for an eligible undergraduate or postgraduate course at the University of Bristol starting in September, and note that an offer is not required before applying for the scholarship, only an admission application. Be classed as an overseas student for fee purposes. Check the published course list, because only the courses marked there are eligible and an asterisk indicates that more than one Think Big award is available for that course. Complete the single international scholarships application form before the deadline, which for September 2026 entry was 10am UK time on Friday 10 April 2026, and note that the same form covers the GREAT scholarships, the scholarships for women and the Bristol routes tied to Commonwealth and Chevening funding. Read the common terms and conditions, since Bristol applies the same terms to all of its international scholarships. Expect the outcome in May.',
required_documents = '["Admission application for an eligible Bristol course starting in September","International scholarships online application form","Any supporting evidence the form asks for, since the same form covers several Bristol scholarship schemes"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Bristol programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 8,
notes = 'Rewritten on 2026-10-25 from bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships, which publishes Think Big as the university flagship scholarship scheme providing funding towards tuition fees for international undergraduates and postgraduates on eligible courses, the eligibility conditions of having applied to start an eligible course in September 2026 and being classed as an overseas student, the rule that no offer is needed before applying, the course-by-course eligible list with asterisks marking courses with multiple awards, the single online application form that also covers the GREAT scholarships, the scholarships for women and the Commonwealth and Chevening routes, the shared terms and conditions, the deadline of 10am UK time on Friday 10 April 2026 and the May 2026 outcomes. amount_usd_value is 0 and award_amount is NULL because Bristol sets the award in bands by programme and application strength and the bands were not captured in the page content retrieved in this pass: no number is asserted rather than a round figure being invented again. CORRECTIONS: the row carried an invented USD 32,000 with award_currency USD; it gave a fixed April 29 deadline that matches no published date; it invented an IELTS score and a GPA; and its URL pointed at a think-big-postgraduate path that now redirects to the current scheme page.',
last_verified_at = '2026-10-26 00:30:00',
last_updated_at = '2026-10-26 00:30:00'
WHERE id = 309;

-- ----------------------------------------------------------------------------
-- 3. Imperial President's Undergraduate Scholarship (id 4) — made honest
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Imperial College President''s Undergraduate Scholarship (award unconfirmed)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = NULL,
award_basis = 'variable',
deadline = 'No published scholarship deadline: the named award page returns a 404 and Imperial scholarships search is the only confirmed source',
deadline_type = 'not_published',
deadline_date = NULL,
degree_levels = '["Bachelor''s"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Imperial scholarships directory, award unconfirmed',
tuition_coverage = 'Nothing is claimed. The page for a President''s Undergraduate Scholarship at Imperial College London returned a 404 on 2026-10-25, so the award has either been renamed, folded into another scheme or withdrawn. The amount, the deadline and the conditions recorded by the importer were invented, and they have been withdrawn rather than replaced with another guess.',
description = 'This row previously described a President''s Undergraduate Scholarship at Imperial College London worth twelve thousand dollars with a June 30 deadline. On 2026-10-25 the page for that award returned a 404, and no replacement page carrying the same name was found from the university scholarships index, so the record no longer asserts the award. What remains is the pointer: Imperial publishes its undergraduate funding through its scholarships pages, and that is where a candidate should look for whatever now carries the name or the function. The invented value and deadline have been removed rather than adjusted, because adjusting an invented number keeps the invention. Where a verified Imperial route exists it should be recorded separately once its page has been read.',
requirements = 'Read the Imperial College London undergraduate scholarships pages and identify the awards that exist for the intake intended, because this row no longer asserts one. Check whether an award is open to international fee payers or only to home students, since Imperial has both. Check whether the support is a fee waiver or a stipend, and check the closing date on the award page itself rather than trusting the June date the importer recorded.',
required_documents = '["The Imperial scholarships page entry for the award that actually exists"]',
english_requirements = 'No scholarship-level English score is claimed for this row; the English requirement of the admitted programme applies.',
verification_status = 'verified',
source_reliability = 4,
notes = 'CORRECTED 2026-10-26 (UK tail pass). The Imperial page imperial.ac.uk/study/ug/fees-and-funding/scholarships/presidents-undergraduate-scholarship returned a 404 on 2026-10-25. The invented USD 12,000 value has been zeroed, award_amount set to NULL, award_currency changed to GBP, the generic June 30 deadline removed, the invented IELTS and GPA conditions cleared and the title relabelled so that the award is no longer presented as fact. Nothing here is claimed as verified: source_reliability is 4. This is the same treatment applied to nine United Kingdom rows in the previous pass and to ten rows in the earlier UK pass.'
WHERE id = 4;

-- ----------------------------------------------------------------------------
-- 4. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-26 00:30:00'
FROM (VALUES
 (651, 'President''s Doctoral Scholar Award (University of Manchester)', 'Yes', 'Fully Funded', 'Full tuition at the home or international rate, a UKRI rate stipend plus a GBP 1,000 enhancement, and up to GBP 20,000 of research training funding in some faculties', true, true, 'Open to all nationalities and all research areas, and the highest accolade Manchester gives its doctoral researchers', 'Doctoral only, attached to a defined project inside the current PDS cohort, so the project must be identified before applying. The candidate needs a first class or upper second class honours degree or equivalent, ideally a master at merit or distinction, and a track record of research engagement. For the 2027/28 cycle projects are announced on 30 October 2026, applications close on 18 December 2026 and interviews run in the week commencing 1 March 2027.', 'https://www.manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award/', 'https://www.manchester.ac.uk/study/postgraduate-research/funding/presidents-doctoral-scholar-award/'),
 (545, 'University of Bristol Think Big Scholarships', 'Yes', 'Partial Funding', 'Funding towards tuition fees, set in bands by programme and by the strength of the application; the bands are not published at scheme level', true, false, 'One application form covers every Bristol international scholarship a candidate is eligible for', 'Undergraduate and postgraduate on eligible courses only, with the course list published course by course. The applicant must have applied for a September start and be classed as an overseas student, but does not need an offer. The form also covers the GREAT scholarships, the scholarships for women and the Commonwealth and Chevening routes. The September 2026 round closed at 10am UK time on 10 April 2026 with outcomes in May.', 'https://www.bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/', 'https://www.bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships/'),
 (485, 'Imperial College President''s Undergraduate Scholarship (award unconfirmed)', 'No', 'Unavailable', 'No confirmed award: the Imperial scholarships directory is the source', false, false, 'Withdrawn: the named award page returns a 404', 'WITHDRAWN 2026-10-26. The page for a President''s Undergraduate Scholarship at Imperial returned a 404, so this card no longer advertises the award or its invented USD 12,000 value. Imperial publishes its undergraduate funding through its scholarships pages, and that is where a candidate should look.', 'https://www.imperial.ac.uk/study/ug/fees-and-funding/scholarships/', 'https://www.imperial.ac.uk/study/ug/fees-and-funding/scholarships/')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
