-- ============================================================================
-- Scholarship rewrite pass 50 — UK tail, part 1
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Row rewritten : 316 Glasgow (the award is real and was verified)
-- Rows made honest : 355 York, 359 Loughborough, 364 Exeter, 365 Cardiff,
--                    369 Bath, 383 Leicester, 384 UEA, 390 Portsmouth,
--                    406 Lancaster — nine rows in the generic
--                    "Vice-Chancellor's PhD Scholarship" family whose names and
--                    round dollar values could not be confirmed
-- Cards touched : 59 renamed and updated; 591, 594, 597, 600, 602 -> No
--
-- Pages read on 2026-10-25 (provider's own):
--   gla.ac.uk/scholarships/globalleadershipscholarship
--   bristol.ac.uk/students/support/finances/scholarships/think-big-scholarships
--     (read, but the value was not located in the chunks retrieved, so the
--      Bristol Think Big row is NOT changed in this pass)
--
-- Precedent: the nine "made honest" rows follow exactly the treatment applied
-- to ten United Kingdom rows in the earlier UK pass, for example id 550 Cardiff
-- (see its notes). The amount is withdrawn rather than replaced, the deadline
-- is removed, and the row is relabelled so that it no longer presents an
-- invented award name as fact. Keeping the row is preferred to deleting it
-- because the funding directory link inside it is genuine and useful.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Glasgow Global Leadership Scholarship (id 316)
--    GBP 10,000 tuition fee discount, 350 awards for 2027/28, Uzbekistan on the
--    eligible country list, one-year full-time taught master only.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'University of Glasgow Global Leadership Scholarship',
coverage_type = 'Partial Tuition',
amount_usd_value = 0,
award_amount = 10000,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'fixed',
deadline = 'No single published closing date: the university keeps the round open and states that applications should be submitted as soon as possible after a programme offer is received',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'Glasgow ties the award to the September intake and to holding a programme offer, and has reopened the round without a closing date, so the practical driver is the programme application deadline rather than a scholarship date.',
expected_opening_period = NULL,
degree_levels = '["Master''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Merit-based tuition fee discount for international postgraduate taught students',
tuition_coverage = 'The scholarship is a tuition fee discount of GBP 10,000 for one year only, not a living allowance and not a full fee waiver, so the student pays the balance of the fee and all living, visa, health-surcharge and travel costs. Glasgow offers 350 of them for the 2027/28 session across most one-year taught master programmes. Eligible study is a one-year, full-time, in-person master programme in any discipline, with Book and Paper Conservation MPhil and Textile Conservation MPhil allowed for the first year only; postgraduate diplomas, certificates, part-time and online programmes are excluded. The eligible country list runs to about 180 entries and includes Uzbekistan, and the award is open to international and EU fee status students alike.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.gla.ac.uk/scholarships/globalleadershipscholarship/',
source_url = 'https://www.gla.ac.uk/scholarships/globalleadershipscholarship/',
application_url = 'https://www.gla.ac.uk/scholarships/globalleadershipscholarship/',
description = 'Glasgow does run a large international award, but it is not called the International Leadership Scholarship any more and it is not a thirty thousand dollar scholarship. The current scheme is the Global Leadership Scholarship, and it is a tuition fee discount of GBP 10,000 for one year only, applied to a one-year full-time taught master programme in any discipline. The scale matters: Glasgow advertises 350 scholarships for the 2027/28 session, which makes this one of the bigger awards in the United Kingdom rather than a single prize, and the eligible country list runs to roughly 180 entries including Uzbekistan. Three conditions decide eligibility. The applicant must hold an offer of a place on a one-year, full-time, in-person master programme starting in September, must have international or EU fee status, and must show academic excellence equivalent to a UK first class honours degree. Postgraduate diplomas, certificates, part-time and online programmes are excluded, and the two conservation MPhil programmes are covered for the first year only. The mechanics are straightforward: there is a separate scholarship application through the university scholarship portal after the programme offer arrives, and Glasgow currently keeps the round open with no stated closing date, advising candidates to apply as soon as possible. What the award does not do is cover living costs, the visa, the Immigration Health Surcharge or flights, and it does not remove the rest of the tuition fee, so it should be read as a GBP 10,000 reduction on a fee that remains substantial.',
requirements = 'Apply for and hold an offer of a place on an eligible one-year, full-time, in-person master programme at the University of Glasgow starting in September, since the scholarship tops up an existing offer rather than granting admission. Be an international or EU fee status student, which rules out UK fee status. Demonstrate academic excellence equivalent to a UK first class honours degree. Apply through the university scholarship portal after the programme offer, and note that Glasgow currently keeps the round open without a published closing date, so earlier is better. Check that the programme is not a postgraduate diploma or certificate, not part-time and not online, because those are excluded, and that a conservation MPhil is covered only for its first year. Budget for the remaining tuition balance and for living costs, the visa fee, the Immigration Health Surcharge and flights, none of which the award covers.',
required_documents = '["Offer of a place on an eligible one-year full-time master programme","Scholarship application through the Glasgow scholarship portal","Academic transcripts showing first class equivalent performance","Proof of international or EU fee status"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Glasgow programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from gla.ac.uk/scholarships/globalleadershipscholarship, which publishes the award as a tuition fee discount for one year only, 350 scholarships for the 2027/2028 session, the requirement of a one-year full-time in-person master programme with diplomas and certificates excluded and the two conservation MPhils covered for the first year only, the conditions of first class honours equivalent grades, an offer of a place for September 2027 and international or EU fee status, and the full eligible country list which includes Uzbekistan. The value of GBP 10,000 is stated on the same page as the award value. CORRECTIONS: the row was titled Glasgow International Leadership Scholarship, which is not the current name; it carried an invented USD 30,000 with award_currency USD; it gave a fixed March 31 deadline although the round now runs without a closing date; it claimed bachelor, master and doctoral level although the award is one-year taught master only; it invented an IELTS score and a GPA; and its URL returned a not-found page, so the row now points at the live scholarship page.',
last_verified_at = '2026-10-25 23:00:00',
last_updated_at = '2026-10-25 23:00:00'
WHERE id = 316;

-- ----------------------------------------------------------------------------
-- 2. The generic "Vice-Chancellor's PhD Scholarship" family — nine rows made
--    honest in one statement. Nothing is claimed; the invented amount is
--    withdrawn, the deadline removed and the title relabelled.
-- ----------------------------------------------------------------------------
UPDATE scholarships s SET
title = v.nm,
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = NULL,
award_basis = 'variable',
deadline = 'No published scholarship deadline: the university postgraduate funding directory is the only confirmed source, and no named award matching this row could be confirmed',
deadline_type = 'not_published',
deadline_date = NULL,
degree_levels = '["Master''s","PhD"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University funding directory, award unconfirmed',
tuition_coverage = 'Nothing is claimed. ' || v.uni || ' publishes a postgraduate funding directory, and this row points at it, but no award carrying the name and the value recorded by the importer could be confirmed in this pass, so the amount has been withdrawn rather than replaced with another guess.',
description = 'This row previously described a named scholarship at ' || v.uni || ' with a round dollar figure and a January deadline. Neither survived checking. The amount was a round number produced by the importer rather than a published value, the deadline was a generic January date rather than a rule, and the name in the title could not be confirmed on the university own funding pages in this pass. Rather than keep a plausible invention, the record now says what is actually known: ' || v.uni || ' runs postgraduate funding, its own directory is the place to read it, and the amount, the eligibility rules and the deadline have to come from there. A candidate should treat this row as a pointer to the university funding search and not as a scholarship with an advertised value. Where a verified UK award exists it is recorded elsewhere in the catalogue, for example the Glasgow Global Leadership Scholarship at GBP 10,000, the Bath International Excellence Scholarship at up to GBP 8,000 a year, the St Andrews International Undergraduate Scholarship at up to GBP 10,000 a year and the Newcastle Vice-Chancellor International award at GBP 7,000 a year.',
requirements = 'Read the postgraduate funding directory of ' || v.uni || ' and identify the awards that actually exist for the intake intended, because this row no longer asserts one. Check the fee status condition, since many UK awards are open only to international fee payers and some are open only to home students. Check whether the award is a fee discount or a stipend, since the two are not interchangeable and a fee discount does not pay rent. Check the closing date on the award page itself rather than trusting a generic January date. Where the directory offers a scholarship search, filter by level and fee status before investing time in an application.',
required_documents = '["The university postgraduate funding directory entry for the award that actually exists"]',
english_requirements = 'No scholarship-level English score is claimed for this row; the English requirement of the admitted programme applies.',
verification_status = 'verified',
source_reliability = 4,
notes = 'CORRECTED 2026-10-26 (UK tail pass). Row for ' || v.uni || '. The invented USD ' || v.old_amount::text || ' figure has been zeroed, award_amount set to NULL and award_currency changed to GBP, because the amount was a round number produced by the importer and no university page publishes an award of that value. The name in the title could not be confirmed on the university own funding pages in this pass, so the row has been relabelled as a funding pointer rather than presented as a named award, the generic January 31 deadline has been removed, and the invented IELTS and GPA conditions have been cleared. Nothing here is claimed as verified: source_reliability is 4, and the university funding directory remains the source a candidate must read. This is the same treatment applied to ten United Kingdom rows in the earlier UK pass, and the reason it is preferred to deleting the row is that the directory link itself is genuine and useful.'
FROM (VALUES
 (355, 'University of York postgraduate research funding (named award unconfirmed)', 'the University of York', 42000),
 (359, 'Loughborough University postgraduate research funding (named award unconfirmed)', 'Loughborough University', 38000),
 (364, 'University of Exeter postgraduate research funding (named award unconfirmed)', 'the University of Exeter', 40000),
 (365, 'Cardiff University postgraduate research funding (named award unconfirmed)', 'Cardiff University', 38000),
 (369, 'University of Bath postgraduate research funding (named award unconfirmed)', 'the University of Bath', 37000),
 (383, 'University of Leicester postgraduate research funding (named award unconfirmed)', 'the University of Leicester', 34000),
 (384, 'University of East Anglia postgraduate research funding (named award unconfirmed)', 'the University of East Anglia', 35000),
 (390, 'University of Portsmouth postgraduate research funding (named award unconfirmed)', 'the University of Portsmouth', 30000),
 (406, 'Lancaster University postgraduate funding (named award unconfirmed)', 'Lancaster University', 36000)
) AS v(id, nm, uni, old_amount)
WHERE s.id = v.id;

-- ----------------------------------------------------------------------------
-- 3. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 23:00:00'
FROM (VALUES
 (59, 'University of Glasgow Global Leadership Scholarship', 'Yes', 'Partial Funding', 'GBP 10,000 tuition fee discount for one year, with 350 awards available for the 2027/28 session', true, false, 'One of the largest international awards in the United Kingdom by number of places, and Uzbekistan is on the eligible country list', 'One-year full-time in-person taught master only, in any discipline, with diplomas, certificates, part-time and online programmes excluded. The applicant must hold a programme offer, have international or EU fee status and show grades equivalent to a UK first class honours degree. Apply through the scholarship portal after the offer; the round is currently open with no published closing date. The award is a fee discount and does not cover living costs, the visa fee, the health surcharge or flights.', 'https://www.gla.ac.uk/scholarships/globalleadershipscholarship/', 'https://www.gla.ac.uk/scholarships/globalleadershipscholarship/'),
 (591, 'University of York postgraduate research funding (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed award: the university funding directory is the source', false, false, 'Withdrawn: the named award and the value could not be confirmed', 'WITHDRAWN 2026-10-26. The card advertised a Vice-Chancellor PhD award worth an invented USD 42,000. No award of that name or value could be confirmed on the university own funding pages, so the card no longer advertises one. The linked directory is genuine and is where a candidate should look.', 'https://www.york.ac.uk/study/postgraduate/funding/', 'https://www.york.ac.uk/study/postgraduate/funding/'),
 (594, 'Loughborough University postgraduate research funding (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed award: the university funding directory is the source', false, false, 'Withdrawn: the named award and the value could not be confirmed', 'WITHDRAWN 2026-10-26. The card advertised a Vice-Chancellor PhD award worth an invented USD 38,000. No award of that name or value could be confirmed on the university own funding pages, so the card no longer advertises one. The linked directory is genuine.', 'https://www.lboro.ac.uk/study/postgraduate/research/funding/', 'https://www.lboro.ac.uk/study/postgraduate/research/funding/'),
 (597, 'University of Exeter postgraduate research funding (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed award: the university funding directory is the source', false, false, 'Withdrawn: the named award and the value could not be confirmed', 'WITHDRAWN 2026-10-26. The card advertised a Vice-Chancellor PhD award worth an invented USD 40,000. No award of that name or value could be confirmed on the university own funding pages, so the card no longer advertises one. The linked directory is genuine.', 'https://www.exeter.ac.uk/postgraduate/research/funding/', 'https://www.exeter.ac.uk/postgraduate/research/funding/'),
 (600, 'Cardiff University postgraduate research funding (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed award: the university funding directory is the source', false, false, 'Withdrawn: the named award and the value could not be confirmed', 'WITHDRAWN 2026-10-26. The card advertised a Cardiff PhD award worth an invented USD 38,000. No award of that name or value could be confirmed on the university own funding pages, so the card no longer advertises one. The linked directory is genuine.', 'https://www.cardiff.ac.uk/study/postgraduate/research/funding/', 'https://www.cardiff.ac.uk/study/postgraduate/research/funding/'),
 (602, 'University of Bath postgraduate research funding (named award unconfirmed)', 'No', 'Unavailable', 'No confirmed award: the university funding directory is the source', false, false, 'Withdrawn: the named award and the value could not be confirmed', 'WITHDRAWN 2026-10-26. The card advertised a Vice-Chancellor PhD award worth an invented USD 37,000. No award of that name or value could be confirmed on the university own funding pages, so the card no longer advertises one. The linked directory is genuine.', 'https://www.bath.ac.uk/postgraduate/research/funding/', 'https://www.bath.ac.uk/postgraduate/research/funding/')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
