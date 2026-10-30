-- Enrichment Batch 41 (2026-10-30): Pass-134 follow-through on the three US rows that
-- still had open verification gaps.
-- (a) 694 UC Davis Regents: reliability 8 -> 9. The Davis financial aid office's
--     international-students page (source 3187, fetched first-hand) states that
--     international students may be eligible for scholarships and routes them to the
--     Undergraduate Scholarship pages where Regents sits; no citizenship bar is
--     published on the office's Regents/campus-awards pages (source 3184). NOT 10:
--     the admissions office's Regents detail page still answers 403 and the legacy
--     .cfm URL redirects to the MyAdmissions login, so no award-specific eligibility
--     statement from admissions could be read; description/requirements narrowed to
--     say exactly this, confirmation caveat retained.
-- (b) 682 UT Austin: deadline narrative + expected opening/deadline periods completed
--     from the Pass 134 first-hand read of the ISSS page (source 3185) — the stored
--     text omitted the live 1 Oct-1 Nov 2026 window. No last_verified bump (same
--     evidence base, same day).
-- (c) 723 Arizona Global Wildcat: award_amount '0' -> NULL (variable-basis encoding;
--     the $0 placeholder contradicted the record's own "not published rather than
--     guessed" stance). The Global Wildcat section still was not found on the
--     2026-2027 terms page (its header says additional scholarship terms will be
--     added soon; the scholarship-chart path answers Access Denied), so no source
--     minted and no band amounts encoded from aggregators.
-- (d) 699 UCLA re-checked, financialaid.ucla.edu still 403; aggregator claims about
--     eligibility conflict with each other and were not encoded. No writes.
-- Notes appends are replay-once; writes executed strictly sequentially.

-- 1) Source 3187
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3187, 'https://financialaid.ucdavis.edu/undergraduate/apply/international', 'UC Davis Financial Aid — International students (may be eligible for scholarships; points to Undergraduate Scholarships)', 'financialaid.ucdavis.edu', 'scholarship', '2026-10-30 00:00:00', true, true);

-- 2) 694 UC Davis Regents (rel 9, wording narrowed)
UPDATE scholarships SET source_reliability = 9, description = REPLACE(description, 'The Davis financial aid pages that were read do not state a citizenship or residency restriction, but the Regents detail page directs readers to an admissions page that answered with an HTTP 403 error, so eligibility for international citizens could not be confirmed from the university itself and is recorded here as unconfirmed.', 'On eligibility, the evidence is close to complete but not quite award-specific: none of the Davis financial aid office''s Regents pages states a citizenship or residency restriction, and the same office''s page for international students states that international students may be eligible for scholarships and directs them to these Undergraduate Scholarship pages; the admissions office''s own Regents detail page, however, cannot be read publicly, so an international applicant should still confirm eligibility with the campus scholarship office.'), requirements = REPLACE(requirements, 'and that the residency position for international applicants is not published on the Davis financial aid pages, so an international applicant should confirm eligibility with the campus scholarship office before counting on the award.', 'and that, while the Davis financial aid office states that international students may be eligible for its scholarships and publishes no citizenship bar for this award, an international applicant should confirm Regents eligibility with the campus scholarship office before counting on the award.'), last_verified_at = '2026-10-30 06:00:00+05', last_updated_at = '2026-10-30 06:00:00+05', notes = COALESCE(notes, '') || ' BATCH 41 (2026-10-30): reliability raised 8 -> 9. The UC Davis financial aid office''s page for international students (source 3187, fetched first-hand today) states that international students may be eligible for scholarships and points them to the Undergraduate and Prestigious Scholarships pages, under which the Regents Scholarship sits (source 3184); combined with the absence of any citizenship or residency condition on the office''s Regents and campus-awards pages, the award is now presented as open in principle to international applicants with a confirmation caveat. Not 10: the admissions office''s Regents detail page remains unreadable (admissions.ucdavis.edu/finances/regents-scholarship still answers 403, and the older .cfm address redirects to the MyAdmissions login), so an award-specific eligibility statement from admissions could not be checked; the description and requirements were tightened to say exactly this, and the confirm-with-the-office advice is retained. Terms (USD 7,500, 3.25 renewal GPA, 2 December UC application) unchanged.' WHERE id = 694 AND notes NOT LIKE '%BATCH 41%';

-- 3) 682 UT Austin (deadline windows completed from source 3185)
UPDATE scholarships SET deadline = 'Texas Exes entering first-year applications close 1 March 2027. ISSS scholarship applications in LASSO run twice a year: 1 October - 1 November 2026 for Spring/Summer 2027 awards, and 1 February - 1 March 2027 for Fall 2027 and academic-year awards.', expected_opening_period = 'Two LASSO windows each year: 1 October (spring/summer awards) and 1 February (fall/academic-year awards); Texas Exes entering first-year applications open 1 September', expected_deadline_period = '1 November (ISSS spring/summer awards) and 1 March (ISSS fall/academic-year awards and Texas Exes closing date)', last_updated_at = '2026-10-30 06:00:00+05', notes = COALESCE(notes, '') || ' BATCH 41 (2026-10-30): deadline narrative and expected periods completed from the Pass 134 first-hand read of the Texas Global ISSS page (source 3185) — the stored text named only the 1 March 2027 date and the February-March window, so the autumn window (1 October - 1 November 2026 for Spring/Summer 2027 awards) and the twice-yearly rhythm are now recorded structurally (expected_opening_period / expected_deadline_period). deadline_date remains 2027-03-01 (the next major close) and last_verified_at is unchanged because the evidence base is the same read that verified this row earlier today.' WHERE id = 682 AND notes NOT LIKE '%BATCH 41%';

-- 4) 723 Arizona (award_amount '0' -> NULL)
UPDATE scholarships SET award_amount = NULL, notes = COALESCE(notes, '') || ' BATCH 41 (2026-10-30): award_amount cleared from the placeholder ''0'' to NULL so the record no longer displays a zero-dollar award — matching this row''s own stance (corrected 2026-10-23: the university publishes a GPA-banded merit chart and no fixed maximum in the terms and conditions, and the amount was left not published rather than guessed) and the variable-basis encoding used elsewhere (amount NULL with currency/period/basis). First-hand sections of the 2026-2027 terms-and-conditions page read during Pass 134 and this batch confirm that first-year merit renewal standards sit at a 3.00 cumulative GPA with 30/60/90-unit progression, and that the terms page itself says terms for additional scholarships will be added soon; the Global Wildcat section was still not found on that page or on the scholarship-chart path (which now answers Access Denied), so no source was minted, no band amounts were encoded from aggregators and last_verified_at was not advanced.' WHERE id = 723 AND notes NOT LIKE '%BATCH 41%';

-- 5) Link 485
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES (485, 694, 3187, 'official_scholarship', now());

-- 6) Sequences (MAX-based)
SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships)), setval('sources_id_seq', (SELECT MAX(id) FROM sources)), setval('scholarship_sources_id_seq', (SELECT MAX(id) FROM scholarship_sources)), setval('university_scholarships_id_seq', (SELECT MAX(id) FROM university_scholarships));

-- Hard check after Batch 41 (2026-10-30): 547 active / 206 retired / 1
-- reliability-<=4 (876) / 207 future-dated (all unchanged); minima pool 48.
-- 694 now reliability 9 with the narrowed wording present; 723 award_amount NULL;
-- 682 expected periods set; notes tagged BATCH 41 x3.
