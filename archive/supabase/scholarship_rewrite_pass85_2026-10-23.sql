-- ScholarBridgeAi — scholarship rewrite, pass 85 (national programmes)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: bare-domain website_url falls from 38 to 36.
--
-- FULLY VERIFIED (two rows)
--
-- 861 DAAD — retitled to "DAAD Study Scholarships — Master Studies for All Academic Disciplines
--     (Germany)" and re-sourced to
--     www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50026200
--       * EUR 992 a month plus insurance, an annual study allowance of EUR 460 and a travel
--         allowance on application
--       * duration 10 to 24 months with an assessment after the first year
--       * DAAD states explicitly that it does NOT cover tuition fees
--       * funding begins in 2027, usually on 1 October 2027
--       * a master's already begun in Germany cannot be funded
--       * online language course fees, an optional 2/4/6-month German course (compulsory for
--         German-taught degrees) and TestDaF/DSH reimbursement
--       * the application portal is only partly usable on mobile, so a desktop is required
--       CORRECTIONS: the title bundled the Deutschlandstipendium, which is a different
--       programme; the row was labelled a partial tuition award although DAAD pays no tuition;
--       the currency was USD; the deadlines of 15 July and 15 January were an importer pattern;
--       and the address was the bare daad.de domain.
--
-- 133 McCall MacBain — retitled to "McCall MacBain Scholarships at McGill" and re-sourced to
--     mccallmacbainscholars.org/apply/
--       * an independent foundation award funding a fully paid master's or professional degree
--         at McGill plus a leadership programme, mentors and a scholar community
--       * up to 30 full scholarships and 100 entrance awards a year
--       * 2027 deadlines: 19 August 2026 at 4:00 PM Eastern for international applicants,
--         23 September 2026 at 4:00 PM Eastern for Canadian and US applicants; now closed
--       * separate McGill programme application between October and December 2026
--       * more than 250 regional semi-finalists, about 85 finalists interviewed in Montreal in
--         March 2027 with travel costs covered
--       * up to 30 Scholars, about 20 Canadian and 10 international, starting September 2027
--       * five selection themes plus an eligibility test based on the first degree and, for
--         older graduates, being 30 or younger on 1 January 2026
--       CORRECTIONS: the row was filed as a "McGill graduate funding route" alongside the McGill
--       Graduate Excellence Award, at reliability 4 with no amount and no deadline; it is in fact
--       a separate foundation with its own application and eligibility, and the McGill Graduate
--       Excellence Award is a different scheme that this row does not evidence, so the title no
--       longer pairs them.
--
-- CURRENCY CORRECTIONS (three rows, all downgraded to reliability 4 because the awarding body's
-- page was not opened in this pass)
--   477 IIT Delhi        USD -> INR, amount zeroed
--   859 Study in Saudi   USD -> SAR
--   868 Russian Quota    USD -> RUB
--   All three also received the honest "not verified" prose: what is structural is stated, what
--   is unknown is left empty, and the note says why.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_85_2026-10-23.md.

BEGIN;

-- 861 DAAD
UPDATE scholarships SET
  title = 'DAAD Study Scholarships — Master Studies for All Academic Disciplines (Germany)',
  provider = 'Deutscher Akademischer Austauschdienst (DAAD)',
  degree_levels = '["Master''s"]',
  coverage_type = 'Living Stipend',
  amount_usd_value = 0, award_amount = 992, award_currency = 'EUR',
  award_period = 'month', award_basis = 'fixed',
  deadline = 'Not published as a single date on the programme entry read; funding for the 2027 start usually begins on 1 October 2027 and a German language course may start earlier',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50026200',
  source_url = 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50026200',
  application_url = 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/',
  recurrence = 'annual', application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 861;

-- 133 McCall MacBain
UPDATE scholarships SET
  title = 'McCall MacBain Scholarships at McGill',
  provider = 'McCall MacBain Scholarships at McGill (independent foundation)',
  country = 'Canada',
  degree_levels = '["Master''s"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CAD',
  award_period = 'year', award_basis = 'variable',
  deadline = '19 August 2026 at 4:00 PM Eastern for applicants from universities outside Canada and the United States, and 23 September 2026 at 4:00 PM Eastern for students and graduates of Canadian and US universities and for Canadians abroad; the 2027 round is now closed',
  deadline_date = '2026-08-19', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://mccallmacbainscholars.org/apply/',
  source_url = 'https://mccallmacbainscholars.org/apply/',
  application_url = 'https://apply.mccallmacbainscholars.org/apply',
  opening_date = NULL, recurrence = 'annual', application_status = 'closed',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 133;

-- 477, 859, 868: currency corrections and honest downgrade
UPDATE scholarships SET
  coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_period = 'year', award_basis = 'variable',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  source_reliability = 4, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id IN (477, 859, 868);

UPDATE scholarships SET award_currency = 'INR' WHERE id = 477;
UPDATE scholarships SET award_currency = 'SAR' WHERE id = 859;
UPDATE scholarships SET award_currency = 'RUB' WHERE id = 868;

COMMIT;

-- Verification: expect 36.
--   SELECT COUNT(*) FROM scholarships WHERE is_active AND website_url ~ '^https?://(www\.)?[^/]+/?$';
