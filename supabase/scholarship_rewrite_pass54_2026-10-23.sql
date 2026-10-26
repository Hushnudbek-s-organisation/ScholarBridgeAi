-- ============================================================================
-- Scholarship rewrite pass 54 — UK tail, part 5
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Row rewritten   : 154 LSE PhD Studentships (verified)
-- Row made honest : 455 King's College London (the named award does not exist and
--                   the importer's link was the undergraduate how-to-apply page)
-- Cards touched   : 537 updated, 27 -> No
--
-- Pages read on 2026-10-26 (provider's own):
--   lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships
--   kcl.ac.uk/study/undergraduate/how-to-apply   (no scholarship content)
--   kcl.ac.uk/study/funding/funding-opportunities  (award portfolio, via search)
--
-- 404 on this date: lse.ac.uk/study-at-lse/Graduate/fees-and-funding/secure/
--   lse-phd-studentships  (the importer's URL, note the /secure/ segment)
--   and kcl.ac.uk/study/postgraduate-doctoral/fees-and-funding/pgr-funding-options
--
-- No currency conversion: both are in pounds, amount_usd_value 0, currency GBP.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LSE PhD Studentships (id 154)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'LSE PhD Studentships',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = 'The admission deadline of the chosen department: 3 December 2026 for early application, 13 January 2027 as the standard date, and 27 May 2027 for a few departments only',
deadline_type = 'fixed',
deadline_date = '2027-01-13',
expected_deadline_period = NULL,
expected_opening_period = NULL,
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded doctoral studentship from the London School of Economics',
tuition_coverage = 'LSE PhD Studentships are tenable for four years and cover full fees plus an annual stipend, with renewal each year subject to satisfactory academic performance. The stipend figures published on LSE pages differ slightly by year and department: GBP 23,805 for 2026/27 on the law and management pages, GBP 22,780 for 2025 entry in the graduate funding guide. The studentship carries a teaching requirement of around a hundred hours of classroom teaching across the doctorate on some programmes. Selection is on outstanding academic merit and research potential, judged both on the past academic record and on the assessed aptitude to complete the doctorate in the time allowed, and the award is open to high calibre students of all nationalities in every LSE research discipline.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships',
source_url = 'https://www.lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships',
application_url = 'https://www.lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships',
description = 'LSE does run a genuinely open doctoral studentship and the imported record undersold it while getting the mechanics wrong. LSE PhD Studentships are tenable for four years, cover full fees and pay an annual stipend, and they are open to high calibre students of all nationalities across all research areas of the School, which for a candidate from Uzbekistan means the route is not nationality-bound. Selection rests only on outstanding academic merit and research potential, assessed both on the past academic record and on the candidate likely aptitude to finish the doctorate inside the allotted time. The mechanics are the part that trips people up, and the imported record had them wrong in both directions. There is no separate scholarship application at all: academic departments nominate students for consideration by a School panel for every doctoral funding opportunity they might be eligible for, and the only thing a candidate controls is submitting a complete admission application by the right date. That date differs by department, with three published closing points: 3 December 2026 for early application, 13 January 2027 as the standard date, and 27 May 2027 for a few departments only. So the correct plan is to read the programme page for the department being applied to rather than to hunt for a scholarship form. Two further details are worth recording. Stipend figures published across LSE pages differ by year: GBP 23,805 for 2026/27 appears on the law and management pages and GBP 22,780 for 2025 entry in the funding guide, which is why this record carries no single stored figure. And some studentships carry a teaching requirement of around a hundred hours of classroom teaching over the doctorate, which is a commitment rather than a formality.',
requirements = 'Apply for admission to an MPhil or PhD programme in any LSE discipline through the normal graduate route, and submit that complete application by the deadline of the department being applied to, since there is no separate scholarship form and departments nominate candidates from the admission pool. Check the individual programme page for the date that applies, because LSE publishes three: 3 December 2026 for early application, 13 January 2027 as the standard deadline, and 27 May 2027 for a small number of departments only. Present an academic record strong enough to rank highly on merit and research potential, which is the only stated basis for the award. Be prepared for a teaching requirement of around a hundred hours of classroom teaching across the doctorate on some programmes. Keep results at the level required for renewal, since the studentship is renewed annually subject to satisfactory academic performance.',
required_documents = '["LSE MPhil or PhD admission application submitted by the departmental deadline","Academic transcripts and degree certificates","Research proposal as the department requires","References as the programme requires"]',
english_requirements = 'The studentship sets no score of its own; the English requirement of the admitted LSE programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships, which publishes the four-year tenure, the coverage of full fees and an annual stipend, the availability to high calibre students of all nationalities across all research areas, the annual renewal subject to satisfactory academic performance, the selection solely on outstanding academic merit and research potential, the departmental nomination with no separate application, the requirement to submit a complete admission application, and the three deadlines of 3 December 2026, 13 January 2027 and 27 May 2027 for the departments that use the last date. The stipend figures of GBP 23,805 for 2026/27 and GBP 22,780 for 2025 entry, and the teaching requirement of around a hundred hours, come from LSE departmental pages of the same scheme rather than from the central page. amount_usd_value is 0 and award_amount is NULL because the stipend is reset annually and the published figures differ by year, which is recorded in the description rather than collapsed into an invented single number; award_currency is GBP. CORRECTIONS: the row was titled LSE PhD Studentship and Master Awards and carried an invented USD 45,000 with award_currency USD; it gave a fixed January 15 deadline that is not one of the three published dates; it implied a separate application; it claimed bachelor, master and doctoral level although the scheme is doctoral only; it invented an IELTS score and a GPA; and its URL returned a 404, so the row now points at the live scheme page.',
last_verified_at = '2026-10-26 01:30:00',
last_updated_at = '2026-10-26 01:30:00'
WHERE id = 154;

-- ----------------------------------------------------------------------------
-- 2. King's College London (id 455) — made honest
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'King''s College London funding opportunities (named award unconfirmed)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = NULL,
award_basis = 'variable',
deadline = 'No single published deadline: King''s publishes a funding database and each award inside it carries its own date',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'Each King''s award publishes its own closing date on its own page, so the funding database has to be read award by award.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University funding database, award unconfirmed',
tuition_coverage = 'Nothing general is claimed. King''s College London publishes no single international excellence award under that name, and the page the importer linked is the undergraduate how-to-apply guide, which contains no scholarship at all. What King''s does publish is a funding database of named awards, each with its own conditions, and the ones visible in this pass show how different they are: an International Hardship Fund of up to GBP 6,000 for enrolled international and EU students who already arranged funding and then hit difficulty, with a 31 May 2027 deadline; Vice-Chancellor''s Awards of GBP 5,000 for particular offer holders; GREAT Scholarships of about GBP 10,000 for a named list of countries; the Marshall Scholarship for American students; the King''s-China Scholarship Council PhD programme, which waives full international fees with the CSC paying a living allowance, health cover and airfare, and is limited to Chinese nationals with a 1 January 2027 deadline; and departmental awards such as a GBP 9,250 undergraduate degree award in geography.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.kcl.ac.uk/study/funding/funding-opportunities',
source_url = 'https://www.kcl.ac.uk/study/funding/funding-opportunities',
application_url = 'https://www.kcl.ac.uk/study/funding/funding-opportunities',
description = 'The award the imported record called the King''s College London International Excellence Scholarship does not exist under that name, and the link it gave was worse than useless: it pointed at the undergraduate how-to-apply guide, which explains UCAS and contains no scholarship at all. Checking King''s instead turned up a portfolio rather than an award, and the portfolio is worth describing honestly because it shows a student from Uzbekistan what is actually within reach. King''s publishes a funding database of named awards, each with its own conditions and its own closing date. The International Hardship Fund gives up to GBP 6,000 to international and EU students who already arranged funding and then hit unexpected difficulty, with a 31 May 2027 deadline, which is help after enrolment rather than an entrance scholarship. Vice-Chancellor''s Awards of GBP 5,000 go to particular offer holders; GREAT Scholarships of about GBP 10,000 are restricted to a named list of countries; the Marshall Scholarship at King''s is for American students and covers full international fees for up to three scholars a year at master or doctoral level; the King''s-China Scholarship Council PhD programme waives full international fees with the CSC paying a living allowance, health cover and airfare, and is limited to Chinese nationals, closing on 1 January 2027; and departments run their own small awards, such as a GBP 9,250 undergraduate degree award in geography that is considered automatically from the UCAS application. What is missing from that list is a general international excellence award with a published value, which is why this row now claims no amount and no deadline, and why the honest instruction to a candidate is to read the funding database and filter it by level, subject and fee status.',
requirements = 'Read the King''s College London funding database and filter it by study level, subject and fee status, because this row no longer asserts a named general award. Check the conditions that decide most awards: some are for enrolled students only, such as the International Hardship Fund; some are restricted by nationality, such as the China Scholarship Council programme and the GREAT Scholarships; and some are tied to a department or to a specific offer. Confirm each closing date on the award page itself rather than trusting the generic January date the importer recorded. For an undergraduate award, note that some departmental schemes are considered automatically from the UCAS application with no separate form, so the UCAS submission date is the operative deadline.',
required_documents = '["The King''s funding database entry for the award that actually exists","UCAS or direct admission application as the level requires"]',
english_requirements = 'No scholarship-level English score is claimed for this row; the English requirement of the admitted programme applies.',
verification_status = 'verified',
source_reliability = 4,
notes = 'CORRECTED 2026-10-26 (UK tail pass). The URL recorded by the importer, kcl.ac.uk/study/undergraduate/how-to-apply, was fetched and contains the UCAS application guide with no scholarship information, and the earlier kcl.ac.uk/study/postgraduate-doctoral/fees-and-funding/pgr-funding-options returned a 404. The award named in the title could not be confirmed, so the invented USD 25,000 value has been zeroed, award_amount set to NULL, award_currency changed to GBP, the invented deadline, IELTS and GPA cleared, and the title relabelled. The portfolio described in tuition_coverage was read from King''s own funding pages in this pass: the International Hardship Fund at up to GBP 6,000 with a 31 May 2027 deadline, Vice-Chancellor''s Awards at GBP 5,000, GREAT Scholarships at about GBP 10,000, the Marshall Scholarship for American students, the King''s-China Scholarship Council PhD programme with a 1 January 2027 deadline, and the GBP 9,250 geography undergraduate award. Nothing here is claimed as a verified single award: source_reliability is 4. This is the same treatment applied to nine United Kingdom rows in pass 50, to Imperial in pass 52, to Nottingham in pass 53 and to ten rows in the earlier UK pass.'
WHERE id = 455;

-- ----------------------------------------------------------------------------
-- 3. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-26 01:30:00'
FROM (VALUES
 (537, 'LSE PhD Studentships', 'Yes', 'Fully Funded', 'Full fees plus an annual stipend for four years, quoted as GBP 23,805 for 2026/27 on departmental pages', true, true, 'Open to all nationalities across all LSE research areas, and departments nominate candidates so there is no separate form', 'Doctoral only. Submit a complete admission application by the departmental deadline: 3 December 2026 for early application, 13 January 2027 as the standard date, or 27 May 2027 for a few departments. Selection is on academic merit and research potential alone, renewal is annual, and some studentships carry a teaching requirement of about a hundred hours.', 'https://www.lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships', 'https://www.lse.ac.uk/study-at-lse/graduate/fees-and-funding/phd-studentships'),
 (27, 'King''s College London funding opportunities (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed general award: King''s publishes a funding database of named awards, each with its own conditions', false, false, 'Withdrawn: the named award could not be confirmed and the linked page contained no scholarship', 'WITHDRAWN 2026-10-26. The International Excellence Scholarship could not be found at King''s, and the page the importer linked was the undergraduate how-to-apply guide. The named awards that do exist are specific: the International Hardship Fund at up to GBP 6,000 for enrolled students, Vice-Chancellor''s Awards at GBP 5,000, GREAT Scholarships at about GBP 10,000 for listed countries, the Marshall Scholarship for American students, the China Scholarship Council PhD programme for Chinese nationals, and departmental awards. Read the funding database.', 'https://www.kcl.ac.uk/study/funding/funding-opportunities', 'https://www.kcl.ac.uk/study/funding/funding-opportunities')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
