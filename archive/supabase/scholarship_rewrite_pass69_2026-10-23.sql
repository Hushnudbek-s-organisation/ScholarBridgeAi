-- ScholarBridgeAi — scholarship rewrite, pass 69 (Hong Kong)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: Hong Kong SAR now has zero active rows with amount_usd_value > 5000.
--
-- VERIFIED NATIONAL FRAMEWORK
--   cerg1.ugc.edu.hk/hkpfs/index.html and cerg1.ugc.edu.hk/hkpfs/apply.html (Research Grants Council)
--     HKPFS, established 2009; eight participating universities; open to candidates of any
--     country of origin, prior work experience and ethnic background seeking NEW full-time PhD
--     admission; 2026/27 annual stipend HK$344,400 plus HK$14,400 travel allowance, for up to
--     three years; 400 fellowships for 2027/28; additional university support possible;
--     two-step application: initial application through HKPFSES for a reference number by
--     1 December 2026 at 12:00 noon HKT, then the university application quoting it by
--     1 December 2026 at 11:59pm HKT; up to two programmes at one or two universities;
--     selection on academic excellence, research ability/potential, communication and
--     interpersonal skills, leadership.
--
-- ROWS
--   121 HKU, 140 CUHK, 305 HKUST, 313 CityU, 394 PolyU — doctoral, source_reliability 10,
--       award_amount 344400 HKD, coverage Living Stipend, deadline 1 December 2026.
--       Each keeps its own HKPFS page (published by the RGC) as website_url.
--       The university-specific top-up named in each title was NOT read and the notes say so.
--   51 HKUST, 29 HKU, 36 CUHK — undergraduate entrance scholarships, source_reliability 4,
--       amount 0, currency HKD, coverage Unspecified, deadline not_published.
--       The HKU scholarship page returned a filter interface with no award content.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_69_2026-10-23.md.

BEGIN;

-- Five doctoral rows: the HKPFS route at each university.
UPDATE scholarships s SET
  degree_levels = '["PhD"]', coverage_type = 'Living Stipend',
  amount_usd_value = 0, award_amount = 344400, award_currency = 'HKD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'December 1 2026, 12:00 noon Hong Kong Time for the HKPFS initial application, and 11:59pm the same day for the university application',
  deadline_date = '2026-12-01', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'The HKPFS initial application opens on 1 September 2026 at 12:00 noon Hong Kong Time and must be completed by 1 December 2026 at 12:00 noon to obtain a reference number; every participating university then closes its own PhD application on the same 1 December at 11:59pm Hong Kong Time.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["HKPFS initial application through the scheme electronic system, before 1 December 2026 at noon Hong Kong Time","HKPFS reference number quoted in the university application","University PhD application with research proposal and supporting documents","Academic transcripts and degree certificates","English proficiency evidence meeting the university requirement","Two academic references"]',
  english_requirements = 'The fellowship sets no score of its own; the English proficiency requirement of the PhD programme at the university applied for applies.',
  funding_type = 'Hong Kong PhD Fellowship Scheme award, funded by the Research Grants Council, with possible university top-up support',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = v.hk,
  source_url = 'https://cerg1.ugc.edu.hk/hkpfs/index.html',
  application_url = 'https://cerg1.ugc.edu.hk/hkpfs/InitApplication.jsp',
  opening_date = '2026-09-01', rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10,
  description = 'This row records a doctoral award at ' || v.nm || ' as it is actually reached in Hong Kong, through the Hong Kong PhD Fellowship Scheme established by the Research Grants Council in 2009 and open to candidates from any country, any prior work experience and any ethnic background who are seeking admission as new full-time PhD students at the eight participating universities. For 2026/27 the scheme pays an annual stipend of HK$344,400, roughly US$44,150, plus a conference and research-related travel allowance of HK$14,400, roughly US$1,840, per year for each awardee for up to three years, and 400 fellowships are to be awarded for 2027/28. Where a fellow needs more than three years, the chosen university may provide additional support, and universities commonly add their own top-up schemes and tuition arrangements on top. Applications run in two steps: an initial application through the scheme''s electronic system to obtain a reference number, opening on 1 September 2026 at noon and closing on 1 December 2026 at noon Hong Kong Time, after which the applicant submits the full PhD application to ' || v.nm || ' quoting that reference number before the university''s own deadline of 1 December 2026 at 11:59pm. An applicant may name up to two programmes or departments at one or two universities.',
  requirements = 'Submit the initial application through the Hong Kong PhD Fellowship Scheme electronic system between 1 September 2026 and 1 December 2026 at 12:00 noon Hong Kong Time to obtain a reference number, because the university application cannot be considered for the fellowship without it. Then apply to ' || v.nm || ' for PhD admission quoting the reference number before the deadline of 1 December 2026 at 11:59pm Hong Kong Time, naming no more than two programmes or departments in total. Meet the admission requirements of the programme, including its language requirement, and present evidence of academic excellence, research ability, communication skills and leadership, the four published selection criteria. The university-specific top-up named in this row''s title was not read, so confirm its conditions on the university''s own fellowship page.',
  tuition_coverage = 'The scheme pays a stipend of HK$344,400 a year and a travel allowance of HK$14,400 a year for up to three years; it does not itself publish a tuition commitment, and whether tuition is waived or charged depends on the university and its postgraduate studentship arrangements, which were not read for this row. The stored HK$344,400 is the 2026/27 annual stipend published by the Research Grants Council, and amount_usd_value is 0 because the money is paid in Hong Kong dollars.',
  notes = 'Re-verified on 2026-10-26 from cerg1.ugc.edu.hk/hkpfs/index.html and cerg1.ugc.edu.hk/hkpfs/apply.html, the Research Grants Council''s own scheme pages, which publish the 2009 founding, the eight participating universities, the eligibility of candidates from any country and any background seeking new full-time PhD admission, the 2026/27 annual stipend of HK$344,400 with a travel allowance of HK$14,400 for up to three years, the 400 fellowships for 2027/28, the possibility of additional university support, the two-step application with its 1 September 2026 opening and 1 December 2026 noon closing, the limit of two programmes at one or two universities, the four selection criteria, and the university deadline of 1 December 2026 at 11:59pm. amount_usd_value is 0 because the stipend is paid in Hong Kong dollars; the annual figure sits in award_amount. CORRECTIONS: the row carried an invented US dollar amount, used the non-canonical level PhD with no scheme context, gave no indication that the fellowship is awarded only through the Research Grants Council reference number, and described a university-specific award without saying that its own terms were never read.' || v.pu
FROM (VALUES
  (121,'the University of Hong Kong','https://gradsch.hku.hk/hkpfs',''),
  (140,'the Chinese University of Hong Kong','https://www.gs.cuhk.edu.hk/hkpfs',''),
  (305,'the Hong Kong University of Science and Technology','https://fytgs.hkust.edu.hk/hkpfs',''),
  (313,'City University of Hong Kong','http://www.cityu.edu.hk/sgs/hkphd',''),
  (394,'the Hong Kong Polytechnic University','https://www.polyu.edu.hk/gs/hkpfs/','')
) AS v(id, nm, hk, pu)
WHERE s.id = v.id;

-- Three undergraduate entrance scholarships: mechanism only.
UPDATE scholarships s SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'HKD',
  award_period = 'year', award_basis = 'variable',
  deadline = 'Not published - the university sets its own entrance scholarship round, and that page was not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Hong Kong universities assess entrance scholarships alongside the undergraduate application round, which for international qualifications normally closes in the winter before a September start. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the university page was not read, so no score is recorded.',
  funding_type = 'Entrance scholarship for international undergraduates; terms not verified for this row',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records an entrance scholarship for international undergraduates at ' || v.nm || ', and its terms were not read from the university on 2026-10-26. Hong Kong universities commonly award entrance scholarships automatically to admitted non-local students, either as a tuition waiver or as a cash award, sometimes renewable subject to a grade average, and the amounts are set in Hong Kong dollars rather than in US dollars. What this particular award is worth, whether it covers tuition only or also accommodation and living costs, whether a separate application is required and when its round closes were not verified, so the amount is empty, the coverage unspecified and the deadline not published.',
  requirements = 'Apply for undergraduate admission to ' || v.nm || ' in the round intended, and check the admissions office scholarship page directly, because the terms recorded here were not verified. Expect an entrance scholarship in Hong Kong to be assessed with the admission application rather than through a separate form, and expect any renewal to depend on maintaining a grade average. Confirm whether the award is a tuition waiver or a cash payment, because that decides whether it can cover accommodation and living costs.',
  required_documents = '["University undergraduate application","Secondary school transcripts and predicted or final results","English proficiency evidence meeting the university requirement","Scholarship application where the university requires a separate one"]',
  tuition_coverage = 'No coverage can be stated for this award. Whether it is a full or partial tuition waiver, a renewable cash award or a one-off payment was not read, so the row stores no amount and records coverage as Unspecified; the previously stored US dollar figure was an invented conversion into a currency the university does not use.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. Hong Kong awards are set by each university and paid in Hong Kong dollars, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The scholarship page of ' || v.nm || ' was not read for this row, so amount_usd_value is 0, award_amount is NULL, award_currency is HKD, coverage is Unspecified, the deadline is not_published and source_reliability drops from 9 to 4.' || v.pu
FROM (VALUES
  (51,'HKUST','30,000 US dollars','10 January 2027',''),
  (29,'the University of Hong Kong','25,000 US dollars','25 November 2026 at noon Hong Kong Time for first-round evaluation',' The recorded scholarship page is a filter interface that returned no award content, so the award could not be read.'),
  (36,'the Chinese University of Hong Kong','20,000 US dollars','15 November 2026','')
) AS v(id, nm, amt, dl, pu)
WHERE s.id = v.id;

COMMIT;
