-- ScholarBridgeAi — scholarship rewrite, pass 83 (bare-domain website_url, part 1)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: bare-domain website_url falls from 56 to 43.
--
-- The 56 bare-domain rows were sorted into three kinds:
--   a) a national programme page shared by many rows   -> one verified deep link for all of them
--   b) honest records that say "no university-wide scholarship published" -> the domain IS the
--      right destination and is left alone
--   c) rows at reliability 4 whose page could not be opened -> the domain is the only address
--      known, so it is left alone
-- This pass fixed the thirteen rows of kind (a).
--
-- 1) STIPENDIUM HUNGARICUM — ten rows (797, 806, 817, 831, 832, 841, 844, 847, 853, 855)
--    Source: https://stipendiumhungaricum.hu/apply/ (verified 2026-10-26)
--      * deadline of the 2026/2027 round: 15 January 2026 at 14:00 CET — now closed
--      * all tuition fees covered and accommodation costs supported
--      * about 30 universities, more than 90 study programmes, only two programme choices
--      * apply in DreamApply AND to the sending partner authority, which may set its own deadline
--      * doctoral candidates may need a supervisor; supervisor statement by 15 March
--      * entrance exams mid-March to end of May, minimum 56 out of 100
--      * results end of June / beginning of July
--      * holders in BA/MA/OTM must average 18 credits and take the Hungarian language course
--    Corrections on all ten: non-canonical "Bachelor"/"Master" fixed; application_status
--    open -> upcoming because the published deadline has passed; coverage_type moved from
--    Full Tuition + Stipend to Full Funding because the stipend amount was not re-verified.
--
-- 2) CHINESE GOVERNMENT SCHOLARSHIP — three rows (554, 849, 866)
--    Source: https://www.campuschina.org/content/details3_74776.html (verified pass 67, re-read
--    2026-10-26). Coverage: tuition; free dormitory or accommodation subsidy; medical insurance
--    CNY 800/year (CNY 400 under six months); monthly stipend CNY 2,500 undergraduate,
--    3,000 master's/general scholar, 3,500 doctoral/senior scholar. Age ceilings 25/35/40.
--    HSK 4 for Chinese-taught master's or doctoral; CSCA for bachelor applicants.
--    Four channels: bilateral, University Program, designated programmes, student exchange.
--    Correction: row 866 had award_currency USD although the award is paid in renminbi; now CNY.
--
-- 3) OPEN DOORS — row 902
--    Source: https://od.globaluni.ru/ (verified 2026-10-26). Registration deadline 1 November
--    2026; registration opened 20 August 2026; First Stage 20 Aug - 13 Nov 2026; Second Stage
--    13 Nov - 21 Dec 2026 with registration by 16 November and 180 minutes of proctored work;
--    Third Stage interviews 22 Dec 2026 - 26 Feb 2027; 24 Russian universities; 200+ countries,
--    618,000+ participants, 16,700+ winners; fourteen subject areas.
--    coverage_type = Tuition Waiver because the project publishes tuition-free admission and no
--    stipend figure.
--
-- DELIBERATE EXCEPTION: row 902 keeps https://od.globaluni.ru/ as its address. That home page
-- is where the schedule is published, so the domain is the correct destination and a deeper
-- link would not carry the dates. The bare-domain flag therefore stays true for that one row.
--
-- FAILED: 862 El-Yurt Umidi (eyuf.uz) returned HTTP 500 and was left unchanged.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_83_2026-10-23.md.

BEGIN;

-- 902 Open Doors: full rewrite with the published 2027 schedule.
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  coverage_type = 'Tuition Waiver',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'RUB',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'November 1 2026 - the registration deadline for the 2027 cycle; after it, account information and portfolios can no longer be edited',
  deadline_date = '2026-11-01', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  opening_date = '2026-08-20',
  website_url = 'https://od.globaluni.ru/',
  source_url = 'https://od.globaluni.ru/',
  application_url = 'https://od.globaluni.ru/register',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 902;

-- Chinese Government Scholarship rows 554, 849, 866
UPDATE scholarships s SET
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CNY',
  award_period = 'month', award_basis = 'fixed',
  deadline = 'Not published as a single date - the Chinese Government Scholarship closes by home country for the bilateral programme and by host university for the University Program',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www.campuschina.org/content/details3_74776.html',
  source_url = 'https://www.campuschina.org/content/details3_74776.html',
  application_url = 'https://studyinchina.csc.edu.cn/',
  recurrence = 'annual', application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
FROM (VALUES (554), (849), (866)) AS v(id)
WHERE s.id = v.id;

-- Stipendium Hungaricum rows
UPDATE scholarships s SET
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'HUF',
  award_period = 'year', award_basis = 'variable',
  deadline = '15 January 2026 at 14:00 CET was the deadline of the 2026/2027 round, which has now closed; the 2027/2028 call had not been published when this row was verified',
  deadline_date = NULL, deadline_type = 'annual',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://stipendiumhungaricum.hu/apply/',
  source_url = 'https://stipendiumhungaricum.hu/apply/',
  application_url = 'https://apply.stipendiumhungaricum.hu/',
  opening_date = NULL, recurrence = 'annual', application_status = 'upcoming',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
FROM (VALUES
  (797), (806), (817), (831), (832), (841), (844), (847), (853), (855)
) AS v(id)
WHERE s.id = v.id;

COMMIT;

-- Verification: all fourteen rows should come back clean except that row 902 legitimately keeps
-- a bare-domain address because the schedule lives on the project home page.
--   SELECT COUNT(*) FROM scholarships WHERE is_active AND website_url ~ '^https?://(www\.)?[^/]+/?$';
--   -- expect 43
