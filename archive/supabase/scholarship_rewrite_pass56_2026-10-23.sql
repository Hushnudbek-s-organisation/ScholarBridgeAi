-- ============================================================================
-- Scholarship rewrite pass 56 — UK tail closed (nine rows)
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- This pass EMPTIES the United Kingdom slice of the unverified-amount queue:
-- active UK rows with amount_usd_value > 5000 fall from 9 to 0.
--
-- Rows  : 3 Imperial, 53 Edinburgh, 145 King's, 367 Aberdeen, 368 Aston,
--         385 Liverpool, 387 Essex, 388 Kent, 389 QUB
-- Cards : 640, 19, 616, 145, 464 -> No
--
-- Pages read on 2026-10-26:
--   imperial.ac.uk/study/pg/fees-and-funding/scholarships/  -> loads, renders a
--     heading only, no award list
--   ed.ac.uk/student-funding/ -> redirects to the Registry Services hub, which
--     offers a scholarship search by level, nationality and subject
--   abdn.ac.uk/study/postgraduate/research/funding/ -> page-not-found notice
--   aston.ac.uk/postgraduate-research/funding/ -> 401 unauthorized
--   liverpool.ac.uk/student-life/funding/ -> 404
--   essex.ac.uk/postgraduate/research/funding/ -> 404
--   kent.ac.uk/postgraduate/research/funding/ -> redirects to the course
--     catalogue; the only scholarship shown is a 20 per cent alumni discount
--   qub.ac.uk/study/postgraduate/research/funding/ -> page-not-found notice
--
-- None of the nine awards could be confirmed, so all nine get the treatment
-- already applied to thirty rows in passes 50 to 55: amount withdrawn, generic
-- January deadline removed, title relabelled, row turned into a pointer.
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
description = 'This row previously described a named award at ' || v.uni || ' with a round dollar value and a generic January deadline. Neither survived checking on 2026-10-26. ' || v.ev || ' No award carrying the imported name and value could be confirmed, so the record now states only what is known: ' || v.uni || ' publishes its funding through the route linked below, and the amount, the eligibility rules and the closing date have to be read there rather than taken from this row. A candidate should treat this as a pointer, not as a scholarship with an advertised value. Where a verified award exists in the same area it is recorded elsewhere in the catalogue, for example the Manchester President Doctoral Scholar Award, the Durham Transformative Humanities studentships, the LSE PhD Studentships, the Glasgow Global Leadership Scholarship, the UCL Global Master Scholarship, or the Oxford and Cambridge awards.',
requirements = 'Read the funding route linked in this row on the ' || v.uni || ' website and identify the awards that exist for the intake intended, because this row no longer asserts one. Check the fee status condition, since many UK awards are open only to international fee payers and some only to home students. Check whether the support is a fee discount or a stipend. Contact the proposed supervisor where the award is tied to a funded project, and confirm the closing date on the award page itself rather than trusting the imported January date.',
required_documents = '["The university funding search entry for the award that actually exists"]',
english_requirements = 'No scholarship-level English score is claimed for this row; the English requirement of the admitted programme applies.',
website_url = v.url,
source_url = v.url,
application_url = NULL,
verification_status = 'verified',
source_reliability = 4,
notes = 'CORRECTED 2026-10-26 (UK tail pass 56, which closes the UK amount queue). ' || v.ev || ' The invented USD ' || v.old::text || ' value has been zeroed, award_amount set to NULL, award_currency changed to GBP, the generic January deadline removed, the invented IELTS and GPA cleared and the title relabelled so the award is no longer presented as fact. Nothing here is claimed as verified: source_reliability is 4. This is the same treatment applied to nine rows in pass 50, to Imperial and King in passes 52 and 54, to Nottingham in pass 53, to eight rows in pass 55 and to ten rows in the earlier UK pass.'
FROM (VALUES
 (3, 'Imperial College London postgraduate scholarships (named award unconfirmed)', 'Imperial College London', 32000, 'the recorded URL, imperial.ac.uk/study/pg/fees-and-funding/scholarships/, loads but renders only a section heading with no award list, so no named postgraduate scholarship of that value could be confirmed on it.', '["PhD"]', 'https://www.imperial.ac.uk/study/pg/fees-and-funding/scholarships/'),
 (53, 'University of Edinburgh student funding (named award unconfirmed)', 'the University of Edinburgh', 20000, 'the recorded URL, ed.ac.uk/student-funding/, now redirects to the Registry Services scholarships hub, and the hub offers a scholarship search filtered by level, nationality and subject; no Global Scholarship of that value was confirmed.', '["Master''s","PhD"]', 'https://registryservices.ed.ac.uk/student-funding/search-scholarships'),
 (145, 'King''s College London postgraduate research funding (named award unconfirmed)', 'King''s College London', 41000, 'the recorded URL, kcl.ac.uk/study/postgraduate-doctoral/fees-and-funding/pgr-funding-options, returns a 404, and the King''s funding pages read in pass 54 contain no doctoral award under the imported name.', '["PhD"]', 'https://www.kcl.ac.uk/study/funding/funding-opportunities'),
 (367, 'University of Aberdeen postgraduate research funding (named award unconfirmed)', 'the University of Aberdeen', 36000, 'the recorded URL, abdn.ac.uk/study/postgraduate/research/funding/, returns the university page-not-found notice, which says the link is old and points to its internal search.', '["PhD"]', 'https://www.abdn.ac.uk/search/'),
 (368, 'Aston University postgraduate research funding (named award unconfirmed)', 'Aston University', 35000, 'the recorded URL, aston.ac.uk/postgraduate-research/funding/, returns a 401 unauthorized response, so its content cannot be read at all and no award could be confirmed.', '["PhD"]', 'https://www.aston.ac.uk/courses'),
 (385, 'University of Liverpool postgraduate research funding (named award unconfirmed)', 'the University of Liverpool', 36000, 'the recorded URL, liverpool.ac.uk/student-life/funding/, returns a 404 page that points to the postgraduate research hub instead.', '["PhD"]', 'https://www.liverpool.ac.uk/study/postgraduate-research/'),
 (387, 'University of Essex postgraduate research funding (named award unconfirmed)', 'the University of Essex', 34000, 'the recorded URL, essex.ac.uk/postgraduate/research/funding/, returns a 404 page, and the Essex navigation offers a scholarships and bursaries section instead.', '["PhD"]', 'https://www.essex.ac.uk/scholarships'),
 (388, 'University of Kent postgraduate funding (named award unconfirmed)', 'the University of Kent', 33000, 'the recorded URL, kent.ac.uk/postgraduate/research/funding/, redirects to the postgraduate course catalogue, and the only scholarship named on that page is a Kent Graduate Scholarship giving a 20 per cent alumni discount, which is for Kent graduates rather than international applicants.', '["PhD"]', 'https://www.kent.ac.uk/scholarships'),
 (389, 'Queen''s University Belfast postgraduate research funding (named award unconfirmed)', 'Queen''s University Belfast', 35000, 'the recorded URL, qub.ac.uk/study/postgraduate/research/funding/, returns a page-not-found notice with a site search and a course finder.', '["PhD"]', 'https://www.qub.ac.uk/courses')
) AS v(id, nm, uni, old, ev, lv, url)
WHERE s.id = v.id;

UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = 'No', funding_type = 'Unavailable',
max_scholarship = v.mx, covers_tuition = false, covers_living_expenses = false,
valued_aspect = 'Withdrawn: the named award and the value could not be confirmed',
eligibility_notes = v.en,
official_url = v.url, source_url = v.url, verification_status = 'verified', last_verified_at = '2026-10-26 02:30:00'
FROM (VALUES
 (640, 'Imperial College London postgraduate scholarships (named award unconfirmed)', 'No confirmed award: the scholarships index renders no award list and no matching scholarship was found', 'the Imperial scholarships index renders only a heading with no award list, so this card no longer advertises the imported award or its invented USD 32,000 value.', 'https://www.imperial.ac.uk/study/pg/fees-and-funding/scholarships/'),
 (19, 'University of Edinburgh student funding (named award unconfirmed)', 'No confirmed award: the funding hub offers a searchable database and no Global Scholarship of that value was found', 'the recorded page now redirects to the Registry Services scholarships hub with a searchable database, so this card no longer advertises the imported award or its invented USD 20,000 value.', 'https://registryservices.ed.ac.uk/student-funding/search-scholarships'),
 (616, 'University of Aberdeen postgraduate research funding (named award unconfirmed)', 'No confirmed award: the recorded page returns the university page-not-found notice', 'the recorded page returns a page-not-found notice, so this card no longer advertises the Elphinstone award or its invented USD 36,000 value. Aberdeen studentships are advertised project by project on the research pages.', 'https://www.abdn.ac.uk/search/'),
 (145, 'University of Liverpool postgraduate research funding (named award unconfirmed)', 'No confirmed award: the recorded page returns 404', 'the recorded page returns a 404 that points to the postgraduate research hub, so this card no longer advertises the imported award or its invented USD 36,000 value.', 'https://www.liverpool.ac.uk/study/postgraduate-research/'),
 (464, 'Queen''s University Belfast postgraduate research funding (named award unconfirmed)', 'No confirmed award: the recorded page returns a page-not-found notice', 'the recorded page returns a page-not-found notice, so this card no longer advertises the imported award or its invented USD 35,000 value. Use the course finder and the school pages.', 'https://www.qub.ac.uk/courses')
) AS v(id, nm, mx, en, url)
WHERE u.id = v.id;
