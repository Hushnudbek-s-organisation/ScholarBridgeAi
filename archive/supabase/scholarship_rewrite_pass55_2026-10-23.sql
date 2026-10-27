-- ============================================================================
-- Scholarship rewrite pass 55 — UK tail, part 6 (eight rows in one pass)
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Five of the eight recorded pages return a 404 and none of the eight awards
-- could be confirmed, so all eight receive the same honest treatment used in
-- passes 50, 52, 53 and 54: the invented amount is withdrawn, the generic
-- January deadline is removed, the title is relabelled and the row becomes a
-- pointer to a live university funding route.
--
-- Rows       : 131 Edinburgh, 312 Leeds, 318 Southampton, 326 Birmingham,
--              327 St Andrews, 333 Sheffield, 362 Newcastle, 498 QMUL
-- Cards      : 646, 648, 571, 499, 533, 579, 596, 662 -> No
--
-- Pages read on 2026-10-26:
--   birmingham.ac.uk/postgraduate/fees-and-funding/global-masters-scholarship  -> 404
--   southampton.ac.uk/study/postgraduate-research/fees-funding/presidential-scholarships -> 404
--   st-andrews.ac.uk/study/fees-and-funding/postgraduate/scholarships/recent-scholarships/ -> 404
--   ed.ac.uk/student-funding/postgraduate/global-research -> registry services 404
--   leeds.ac.uk/research-degrees/doc/scholarships -> 404
--   sheffield.ac.uk/postgraduate/phd/scholarships -> LIVE, decisive
--   ncl.ac.uk/postgraduate/fees-funding/ -> LIVE hub, no matching award
--   qmul.ac.uk/scholarships/ -> LIVE hub, no matching award
--
-- NOTE ON THREE BARE DOMAINS: for Edinburgh, Leeds and St Andrews the only live
-- destination published by the university itself was a search or course index
-- at the domain root (search.ed.ac.uk, courses.leeds.ac.uk, www.st-andrews.ac.uk),
-- so the bare-domain counter rises by three. That is preferred to leaving a
-- known 404 in the catalogue; the trade is recorded in the pass document.
-- ============================================================================

UPDATE scholarships s SET
title = v.nm,
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = NULL,
award_basis = 'variable',
deadline = 'No published scholarship deadline: ' || v.ev,
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
expected_opening_period = NULL,
degree_levels = v.lv,
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University funding directory, award unconfirmed',
tuition_coverage = 'Nothing is claimed. ' || v.ev || ' The amount recorded by the importer was a round dollar figure with no published source behind it, and it has been withdrawn rather than replaced with another guess.',
description = 'This row previously described a named award at ' || v.uni || ' with a round dollar value and a generic January deadline. Neither survived checking. ' || v.ev || ' No award carrying the imported name and value could be confirmed, so the record now states only what is known: ' || v.uni || ' publishes its funding through the route named below, and the amount, the eligibility rules and the closing date have to be read there rather than taken from this row. A candidate should treat this as a pointer, not as a scholarship with an advertised value. Where a verified award exists in the same area it is recorded elsewhere in the catalogue, for example the Manchester President Doctoral Scholar Award, the Durham Transformative Humanities studentships, the LSE PhD Studentships, the Glasgow Global Leadership Scholarship and the UCL Global Master Scholarship.',
requirements = 'Read the funding route named in this row on the ' || v.uni || ' website and identify the awards that exist for the intake intended, because this row no longer asserts one. Check the fee status condition, since many UK awards are open only to international fee payers and some only to home students. Check whether the support is a fee discount or a stipend. Contact the proposed supervisor where the award is tied to a funded project, and confirm the closing date on the award page itself rather than trusting the imported January date.',
required_documents = '["The university funding search entry for the award that actually exists"]',
english_requirements = 'No scholarship-level English score is claimed for this row; the English requirement of the admitted programme applies.',
website_url = v.url,
source_url = v.url,
application_url = NULL,
verification_status = 'verified',
source_reliability = 4,
notes = 'CORRECTED 2026-10-26 (UK tail pass 55). ' || v.ev || ' The invented USD ' || v.old::text || ' value has been zeroed, award_amount set to NULL, award_currency changed to GBP, the generic January deadline removed, the invented IELTS and GPA cleared and the title relabelled so the award is no longer presented as fact. Nothing here is claimed as verified: source_reliability is 4. This is the same treatment applied to nine rows in pass 50, to Imperial in pass 52, to Nottingham in pass 53, to King in pass 54 and to ten rows in the earlier UK pass.'
FROM (VALUES
 (326, 'University of Birmingham postgraduate funding (named award unconfirmed)', 'the University of Birmingham', 32000, 'the URL recorded by the importer, birmingham.ac.uk/postgraduate/fees-and-funding/global-masters-scholarship, returned the university 404 page on 2026-10-26.', '["Master''s","PhD"]', 'https://www.birmingham.ac.uk/study/postgraduate'),
 (318, 'University of Southampton postgraduate research funding (named award unconfirmed)', 'the University of Southampton', 41000, 'the URL recorded by the importer, southampton.ac.uk/study/postgraduate-research/fees-funding/presidential-scholarships, returned a 404 on 2026-10-26.', '["PhD"]', 'https://www.southampton.ac.uk/search/'),
 (327, 'University of St Andrews postgraduate scholarships (named award unconfirmed)', 'the University of St Andrews', 38000, 'the URL recorded by the importer, st-andrews.ac.uk/study/fees-and-funding/postgraduate/scholarships/recent-scholarships/, returned a 404 on 2026-10-26.', '["Master''s","PhD"]', 'https://www.st-andrews.ac.uk/'),
 (131, 'University of Edinburgh postgraduate research funding (named award unconfirmed)', 'the University of Edinburgh', 42000, 'the URL recorded by the importer, ed.ac.uk/student-funding/postgraduate/global-research, redirected to a registry services page that answered that no such page exists on 2026-10-26.', '["PhD"]', 'https://search.ed.ac.uk/'),
 (333, 'University of Sheffield PhD scholarships (named award unconfirmed)', 'the University of Sheffield', 40000, 'the live Sheffield PhD scholarships page, read on 2026-10-26, lists only Hossein Farmy Scholarships with projects advertised in early 2027, a China Scholarship Council route marked closed with none available for 2027 entry, and University of Sheffield Research Scholarships also marked closed with none for 2027 entry, plus school and project scholarships; the imported award name appears nowhere on it.', '["PhD"]', 'https://sheffield.ac.uk/postgraduate/phd/scholarships'),
 (362, 'Newcastle University postgraduate funding (named award unconfirmed)', 'Newcastle University', 39000, 'the URL recorded by the importer is the general postgraduate fees and funding hub of Newcastle University, read on 2026-10-26, which offers a searchable funding database and a funding guide but names no faculty doctoral award matching the imported title.', '["PhD"]', 'https://www.ncl.ac.uk/postgraduate/fees-funding/'),
 (312, 'University of Leeds research funding (named award unconfirmed)', 'the University of Leeds', 42000, 'the URL recorded by the importer, leeds.ac.uk/research-degrees/doc/scholarships, returned a 404 on 2026-10-26.', '["PhD"]', 'https://courses.leeds.ac.uk/'),
 (498, 'Queen Mary University of London scholarships database (named award unconfirmed)', 'Queen Mary University of London', 30000, 'the URL recorded by the importer was the general study landing page, and the live scholarships hub read on 2026-10-26 offers an interactive database of undergraduate, master and PhD awards and names no International Excellence Scholarship of that value; the only figure visible on the hub is a GBP 5,000 Global Talent Scholarship in the title of an embedded 2025 video, which is recorded as seen but not verified.', '["Bachelor''s","Master''s","PhD"]', 'https://www.qmul.ac.uk/scholarships/')
) AS v(id, nm, uni, old, ev, lv, url)
WHERE s.id = v.id;

-- Cards: mark withdrawn
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = 'No', funding_type = 'Unavailable',
max_scholarship = v.mx, covers_tuition = false, covers_living_expenses = false,
valued_aspect = 'Withdrawn: the named award and the value could not be confirmed',
eligibility_notes = v.en,
official_url = v.url, source_url = v.url, verification_status = 'verified', last_verified_at = '2026-10-26 02:00:00'
FROM (VALUES
 (646, 'University of Edinburgh postgraduate research funding (named award unconfirmed)', 'No confirmed award: the recorded page does not exist and the university funding search is the source', 'the recorded page redirected to a registry services 404, so this card no longer advertises the award or its invented value; use the university search.', 'https://search.ed.ac.uk/'),
 (648, 'University of Leeds research funding (named award unconfirmed)', 'No confirmed award: the recorded page returns 404 and the university course and funding pages are the source', 'the recorded page returned a 404, so this card no longer advertises the award or its invented value; use the university course search.', 'https://courses.leeds.ac.uk/'),
 (571, 'University of Southampton postgraduate research funding (named award unconfirmed)', 'No confirmed award: the recorded page returns 404 and the university site search is the source', 'the recorded page returned a 404, so this card no longer advertises the award or its invented value; use the university site search.', 'https://www.southampton.ac.uk/search/'),
 (499, 'University of Birmingham postgraduate funding (named award unconfirmed)', 'No confirmed award: the recorded page returns 404 and the postgraduate study hub is the source', 'the recorded page returned the university 404 page, so this card no longer advertises the award or its invented value; use the postgraduate study hub.', 'https://www.birmingham.ac.uk/study/postgraduate'),
 (533, 'University of St Andrews postgraduate scholarships (named award unconfirmed)', 'No confirmed award: the recorded page returns 404 and the university site is the source', 'the recorded page returned a 404, so this card no longer advertises the award or its invented value; start from the university site and its scholarships pages.', 'https://www.st-andrews.ac.uk/'),
 (579, 'University of Sheffield PhD scholarships (named award unconfirmed)', 'No confirmed award: the live PhD scholarships page names no such award and both 2027 routes are marked closed', 'the live page lists only the Hossein Farmy Scholarships with projects advertised in early 2027, a closed China Scholarship Council route and closed University of Sheffield Research Scholarships, so this card no longer advertises the imported award or its value.', 'https://sheffield.ac.uk/postgraduate/phd/scholarships'),
 (596, 'Newcastle University postgraduate funding (named award unconfirmed)', 'No confirmed award: the funding hub names no faculty doctoral award matching the imported title', 'the recorded page is the general postgraduate fees and funding hub with a searchable database, and it names no award matching the imported title, so this card no longer advertises one.', 'https://www.ncl.ac.uk/postgraduate/fees-funding/'),
 (662, 'Queen Mary University of London scholarships database (named award unconfirmed)', 'No confirmed award: the scholarships hub offers a database and names no award of that value', 'the live scholarships hub offers an interactive database of undergraduate, master and PhD awards and names no International Excellence Scholarship of that value, so this card no longer advertises one.', 'https://www.qmul.ac.uk/scholarships/')
) AS v(id, nm, mx, en, url)
WHERE u.id = v.id;
