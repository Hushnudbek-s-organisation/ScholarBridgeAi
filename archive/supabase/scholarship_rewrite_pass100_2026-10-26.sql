-- ScholarBridge AI - Scholarship Rewrite Pass 100 - 2026-10-26
-- UK cluster, part 1: four "funding directory (named award unconfirmed)"
-- rows retired. Execution note (2026-10-26): replay of the statements
-- executed in Supabase. Each row's stored URL was re-fetched on 2026-10-26
-- before retirement:
--   326 Birmingham -> generic postgraduate study hub (not a scholarship)
--   333 Sheffield  -> PhD directory; University Research Scholarships and
--                     CSC route closed, none for 2027 entry
--   365 Cardiff    -> stored URL now returns "Page not found"
--   367 Aberdeen   -> bare site search page
-- Each university already has a verified named-award record (Birmingham
-- 546, Sheffield 666 [UG], Cardiff 550, Aberdeen 720), so per the standing
-- rule (generic funding-catalogue entries are retired rather than shown
-- as single scholarships) the directory pointers are retired at
-- reliability 9 (the finding itself is verified) and kept for audit.
-- See docs/SCHOLARSHIP_REWRITE_PASS_100_2026-10-26.md.

-- 1) University of Birmingham directory - RETIRE (id 326)
UPDATE scholarships SET title = 'University of Birmingham postgraduate funding (retired: funding directory, not a named scholarship)', is_active = false, application_status = 'closed', source_reliability = 9, deadline_date = NULL, deadline_type = 'not_published', source_url = 'https://www.birmingham.ac.uk/study/postgraduate', last_verified_at = now(), last_updated_at = now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 100). The stored URL was re-fetched the same day: https://www.birmingham.ac.uk/study/postgraduate is the generic postgraduate study hub, not a scholarship page. The importer URL for the supposed award (global-masters-scholarship) returned 404 in pass 55 and no single named award matching this row has ever been confirmed. University of Birmingham international awards are covered by verified record 546, so this directory pointer is retired from the catalogue and kept inactive for audit; individual Birmingham schemes may be added later only after separate verification. Source 2492 repointed from the bare domain to the fetched hub page.$rn$ WHERE id = 326 RETURNING id, is_active, source_reliability;

-- 2) University of Sheffield PhD directory - RETIRE (id 333)
UPDATE scholarships SET title = 'University of Sheffield PhD scholarships directory (retired: funding directory, not a named scholarship)', is_active = false, application_status = 'closed', source_reliability = 9, deadline_date = NULL, deadline_type = 'not_published', last_verified_at = now(), last_updated_at = now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 100). The official page https://sheffield.ac.uk/postgraduate/phd/scholarships was re-fetched the same day: it is a directory, not a single scholarship; the University Research Scholarships and the China Scholarship Council route are closed with no awards for 2027 entry, Hossein Farmy Archive projects are to be advertised in early 2027, and the remaining funding is UKRI/DTP awards and school/project studentships with their own terms. There is currently no open university-wide international PhD scholarship at Sheffield to rewrite this row into, so the directory is retired from the catalogue and kept inactive for audit. Sheffield's verified undergraduate record 666 is unaffected; individual Sheffield schemes may be added later only after separate verification.$rn$ WHERE id = 333 RETURNING id, is_active, source_reliability;

-- 3) Cardiff University directory - RETIRE (id 365)
UPDATE scholarships SET title = 'Cardiff University postgraduate research funding (retired: funding directory, not a named scholarship)', is_active = false, application_status = 'closed', source_reliability = 9, deadline_date = NULL, deadline_type = 'not_published', source_url = 'https://www.cardiff.ac.uk/study/postgraduate/research/funding/', last_verified_at = now(), last_updated_at = now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 100). The stored URL https://www.Cardiff.ac.uk/study/postgraduate/research/funding/ was re-fetched the same day and now returns the university Page not found notice. No named award matching this row was ever confirmed (the invented importer USD value was zeroed in the UK tail pass; this row only ever pointed at a funding directory). Cardiff University international awards are covered by verified record 550, so this row is retired from the catalogue and kept inactive for audit; individual Cardiff schemes may be added later only after separate verification. Source 2499 repointed from the bare domain to the fetched URL, which is kept as audit evidence of the dead link.$rn$ WHERE id = 365 RETURNING id, is_active, source_reliability;

-- 4) University of Aberdeen directory - RETIRE (id 367)
UPDATE scholarships SET title = 'University of Aberdeen postgraduate research funding (retired: funding directory, not a named scholarship)', is_active = false, application_status = 'closed', source_reliability = 9, deadline_date = NULL, deadline_type = 'not_published', last_verified_at = now(), last_updated_at = now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 100). The stored URL https://www.abdn.ac.uk/search/ was re-fetched the same day and is the university's bare search tool, not a scholarship page (the original funding URL returned the university page-not-found notice in pass 56). No named award matching this row has ever been confirmed. University of Aberdeen international awards are covered by verified record 720, so this row is retired from the catalogue and kept inactive for audit; individual Aberdeen schemes may be added later only after separate verification. Source 2477 repointed from the bare domain to the fetched URL.$rn$ WHERE id = 367 RETURNING id, is_active, source_reliability;

-- 5) Sources: repoint the three bare-domain audit sources to the fetched
--    evidence pages (Sheffield source 2614 already points at the live
--    directory page and is unchanged)
UPDATE sources SET url = CASE id WHEN 2492 THEN 'https://www.birmingham.ac.uk/study/postgraduate' WHEN 2499 THEN 'https://www.cardiff.ac.uk/study/postgraduate/research/funding/' WHEN 2477 THEN 'https://www.abdn.ac.uk/search/' END, domain = CASE id WHEN 2492 THEN 'www.birmingham.ac.uk' WHEN 2499 THEN 'www.cardiff.ac.uk' WHEN 2477 THEN 'www.abdn.ac.uk' END, title = CASE id WHEN 2492 THEN 'University of Birmingham - Postgraduate Study Hub (fetched 2026-10-26; generic study page, not a scholarship)' WHEN 2499 THEN 'Cardiff University - Postgraduate Research Funding URL (fetched 2026-10-26; returns Page not found)' WHEN 2477 THEN 'University of Aberdeen - Site Search Page (fetched 2026-10-26; not a scholarship page)' END, accessed_at = now() WHERE id IN (2492, 2499, 2477) RETURNING id, url;

-- 6) university_scholarships: rows 499/600/616 already carry
--    availability_status 'No' with honest "No confirmed award" strings;
--    sync names with the retired titles and refresh verification date.
--    (Sheffield 333 has no university_scholarships row.)
UPDATE university_scholarships SET scholarship_name = CASE id WHEN 499 THEN 'University of Birmingham postgraduate funding (retired: funding directory, not a named scholarship)' WHEN 600 THEN 'Cardiff University postgraduate research funding (retired: funding directory, not a named scholarship)' WHEN 616 THEN 'University of Aberdeen postgraduate research funding (retired: funding directory, not a named scholarship)' END, last_verified_at = now() WHERE id IN (499, 600, 616) RETURNING id, scholarship_id, availability_status;
