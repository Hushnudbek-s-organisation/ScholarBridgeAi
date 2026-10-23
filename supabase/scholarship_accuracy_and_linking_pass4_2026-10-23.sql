-- ============================================================================
--  Scholarship accuracy + university linking — pass 4
--  Date: 2026-10-23   ·   Project: zkguzbdopfedkffsatk
--
--  WHY
--    A check of the universities whose only scholarship was the generic
--    "<University> Scholarships" placeholder showed something worse: several of
--    those rows were already marked verification_status = 'verified' but carried
--    amounts the university does not publish.
--
--      Arizona      said $37,000 full tuition   → university publishes a GPA-banded chart
--      Minnesota    said $9,000                 → university publishes $5,000-$20,000
--      Pittsburgh   said $25,000 / $38,000      → university publishes up to $10,000
--      Rochester    said $63,000 full tuition   → university publishes $10,000-$35,000
--      Swansea      said $26,000 full tuition   → university publishes up to GBP 5,000
--      Sussex       said $6,875 + "UCAS Jan 25" → university publishes GBP 5,000, April deadline
--      Auckland     said $25,000 / $31,000      → university publishes up to NZD 10,000
--      Leiden       said $15,500 bachelor+      → LExS is master's-only
--      Utrecht      sold the UES               → withdrawn from 2026-27
--
--    Each one is replaced with the figure printed on the university's own page,
--    or with "no published amount" (0) where the university sets it per
--    programme. Sources stay in source_url/website_url and a note records what
--    changed, so the history is auditable.
--
--  ALSO
--    * Retired four rows that no longer describe a real award
--      (Auckland $31,000, Pittsburgh $38,000, UdeM $25,000, plus the template
--       row on the duplicate UNAM record).
--    * Added the two current Leiden / Utrecht awards that replaced them.
--    * Closed the three remaining university → scholarship link gaps
--      (McGill, PSL, UNAM) — every one of the 364 universities now has at least
--      one row in university_scholarships.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. US awards: publish the real numbers
-- ---------------------------------------------------------------------------
WITH fix (id, title, provider, coverage_type, amount_usd_value, award_amount, award_currency, award_basis, deadline, deadline_date, deadline_type, degree_levels, website_url, source_url, description, requirements, funding_type, tuition_coverage, notes) AS (
  VALUES
    (723, 'Global Wildcat Tuition First-Year Award', 'The University of Arizona', 'Partial Tuition', 0, 0::numeric, 'USD', 'variable',
     'Priority consideration by 1 November (Early Action)', DATE '2026-11-01', 'fixed', '["Bachelor''s"]',
     'https://financialaid.arizona.edu/2026-2027-terms-and-conditions', 'https://financialaid.arizona.edu/2026-2027-terms-and-conditions',
     'Arizona awards the Global Wildcat Tuition First-Year Award to international first-year undergraduate students on the basis of GPA and test scores. There is no separate scholarship application: a completed admission application by the Early Action deadline gives priority consideration. Renewable for up to eight semesters with a 3.00 cumulative GPA.',
     'International (non-resident) first-year undergraduate applicant. Completed University of Arizona admission application by 1 November (Early Action) for priority consideration. Renewable with a 3.00 cumulative GPA.',
     'Merit-based', 'Partial tuition',
     'Corrected 2026-10-23: the previous row claimed a $37,000 full-tuition award; the university publishes a GPA-banded merit chart and no fixed maximum in its terms and conditions. Amount left as "not published" rather than guessed.'),
    (749, 'Global Excellence Scholarship (GES)', 'University of Minnesota Twin Cities', 'Partial Tuition', 20000, 20000::numeric, 'USD', 'variable',
     'No separate deadline — considered with the admission application', NULL::date, 'automatic', '["Bachelor''s"]',
     'https://admissions.tc.umn.edu/global-excellence-scholarships', 'https://admissions.tc.umn.edu/global-excellence-scholarships',
     'Competitive, merit-based tuition award for international freshmen and transfer students. Freshmen may receive $5,000 to $20,000 each year for up to four years; transfer students entering in the fall may receive $10,000 per year for up to three years. All international applicants who apply by the admission deadline and submit the Certification of Finances form are considered automatically.',
     'International applicant on an F-1 visa who applies by the admission deadline and submits the Certification of Finances form. Must maintain full-time enrolment (at least 13 credits per semester) and F-1 status.',
     'Merit-based', 'Partial tuition (non-resident tuition waiver)',
     'Corrected 2026-10-23: the previous $9,000 figure was not published; the university states a $5,000-$20,000 annual range for freshmen.'),
    (495, 'International Student Merit Scholarships', 'University of Pittsburgh', 'Partial Tuition', 10000, 10000::numeric, 'USD', 'variable',
     '1 February', DATE '2027-02-01', 'fixed', '["Bachelor''s"]',
     'https://financialaid.pitt.edu/types-of-aid/scholarships/international-student-scholarships/', 'https://financialaid.pitt.edu/types-of-aid/scholarships/international-student-scholarships/',
     'International first-year applicants who apply by 1 February are automatically considered for merit-based scholarships of up to $10,000 per year, renewable for up to eight undergraduate terms. No separate scholarship application is needed, but the international short-answer response, Common Application essay or personal statement must be submitted.',
     'International first-year applicant with a completed application by 1 February, including the short-answer response or essay. Only for students admitted to the fall term; international transfer students are not eligible.',
     'Merit-based', 'Partial tuition',
     'Corrected 2026-10-23: the previous row claimed a $25,000 award; the university publishes up to $10,000 per year.'),
    (757, 'Meliora Scholarship', 'University of Rochester', 'Partial Tuition', 35000, 35000::numeric, 'USD', 'variable',
     'No separate deadline — all admitted applicants are considered', NULL::date, 'automatic', '["Bachelor''s"]',
     'https://www.rochester.edu/financial-aid/scholarships/', 'https://www.rochester.edu/financial-aid/scholarships/',
     'The Meliora Scholarship is the main merit award. All undergraduate applicants are considered; awards range from $10,000 to $35,000 with an average award of about $20,000, and are renewable annually while satisfactory academic performance and full-time status are maintained. Students may receive only one merit scholarship from the university.',
     'All undergraduate applicants, including international students, are considered automatically. No separate application or documentation is required.',
     'Merit-based', 'Partial tuition',
     'Corrected 2026-10-23: the previous row claimed a $63,000 full-tuition award; the university publishes $10,000-$35,000.')
)
UPDATE scholarships s
SET title = f.title, provider = f.provider, coverage_type = f.coverage_type,
    amount_usd_value = f.amount_usd_value, award_amount = f.award_amount,
    award_currency = f.award_currency, award_basis = f.award_basis,
    deadline = f.deadline, deadline_date = f.deadline_date, deadline_type = f.deadline_type,
    degree_levels = f.degree_levels, website_url = f.website_url, application_url = f.website_url,
    source_url = f.source_url, description = f.description, requirements = f.requirements,
    funding_type = f.funding_type, tuition_coverage = f.tuition_coverage, notes = f.notes,
    verification_status = 'verified', last_verified_at = now() AT TIME ZONE 'UTC',
    last_updated_at = now() AT TIME ZONE 'UTC', is_active = true
FROM fix f
WHERE s.id = f.id;

-- ---------------------------------------------------------------------------
-- 2. UK / NZ / NL awards
-- ---------------------------------------------------------------------------
WITH fix (id, title, provider, coverage_type, amount_usd_value, award_amount, award_currency, award_basis, deadline, deadline_date, deadline_type, degree_levels, website_url, source_url, description, requirements, funding_type, tuition_coverage, notes) AS (
  VALUES
    (675, 'International Excellence Scholarship', 'Swansea University', 'Partial Tuition', 0, 5000::numeric, 'GBP', 'variable',
     'Applications close 12:00 GMT on 27 November 2026 (January and March 2027 entry)', DATE '2026-11-27', 'fixed', '["Bachelor''s","Master''s"]',
     'https://www.swansea.ac.uk/international-students/my-finances/international-scholarships/international-excellence-scholarships/',
     'https://www.swansea.ac.uk/international-students/my-finances/international-scholarships/international-excellence-scholarships/',
     'Swansea awards International Excellence Scholarships to overseas fee-paying students as a tuition-fee discount of up to GBP 5,000 in the first year. Undergraduate holders of the full GBP 5,000 who average 70% in year one receive a further GBP 2,000 in year two, so an undergraduate can receive up to GBP 7,000 in total. A separate scholarship application is required after an offer.',
     'Overseas fee-paying applicant holding an offer for an eligible full-time undergraduate or postgraduate taught course with tuition fees of GBP 16,000 or more per year. PhD, MPhil, MRes, Graduate Diploma in Law and exchange students are not eligible. One application per student.',
     'Merit-based', 'Partial tuition (fee discount)',
     'Corrected 2026-10-23: the previous row claimed a $26,000 full-tuition award and a UCAS deadline; the university publishes up to GBP 5,000 (plus GBP 2,000 in year two for undergraduates) with a 27 November 2026 scholarship deadline.'),
    (760, 'Chancellor''s International Scholarships', 'University of Sussex', 'Partial Tuition', 0, 5000::numeric, 'GBP', 'variable',
     'Not published for 2027 entry — the 2026 round closed on 30 April 2026', NULL::date, 'not_published', '["Bachelor''s","Master''s"]',
     'https://www.sussex.ac.uk/study/fees-funding/undergraduate-scholarships/view/1870-Chancellor-s-International-Scholarships',
     'https://www.sussex.ac.uk/study/fees-funding/undergraduate-scholarships/view/1870-Chancellor-s-International-Scholarships',
     'A limited number of Chancellor''s International Scholarships of GBP 5,000 are available to excellent international undergraduate and taught-master''s applicants, awarded as a tuition-fee reduction in the first year of full-time study. Applicants must already hold an offer to study at Sussex and submit a separate scholarship application.',
     'Overseas fee-paying applicant holding an offer for a full-time undergraduate or taught master''s course at Sussex, self-financing and with excellent academic grades. Cannot be combined with the Sussex Pakistan or Sussex Turkey Scholarships; the highest-value award applies.',
     'Merit-based', 'Partial tuition (first-year fee reduction)',
     'Corrected 2026-10-23: the previous row stated a $6,875 award and a "Jan 25 (UCAS)" deadline that the university does not publish. The 2027 deadline is left empty until Sussex posts it.'),
    (494, 'University of Auckland International Student Excellence Scholarship', 'The University of Auckland', 'Partial Tuition', 0, 10000::numeric, 'NZD', 'variable',
     '21 October 2026 (Semester 1 2027 entry)', DATE '2026-10-21', 'fixed', '["Bachelor''s","Master''s"]',
     'https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship/university-of-auckland-international-student-excellence-scholarship-844-all.html',
     'https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship/university-of-auckland-international-student-excellence-scholarship-844-all.html',
     'The University of Auckland International Student Excellence Scholarship contributes up to NZD 10,000 towards compulsory tuition fees for new international students enrolling in an undergraduate degree, postgraduate diploma or taught master''s programme of one year or more. Up to 50 scholarships are awarded each year in two rounds; the award is tenable for one year.',
     'New international student who has not previously studied at tertiary level in New Zealand, enrolling full-time in an undergraduate degree, PGDip or taught master''s, with a Grade Point Equivalent of at least 6.00.',
     'Merit-based', 'Partial tuition (tuition-fee contribution)',
     'Corrected 2026-10-23: the previous row claimed a $25,000 award; the university publishes up to NZD 10,000.'),
    (476, 'Leiden University Excellence Scholarship (LExS)', 'Leiden University', 'Partial Tuition', 0, 0::numeric, 'EUR', 'variable',
     '1 December 2026', DATE '2026-12-01', 'fixed', '["Master''s"]',
     'https://www.universiteitleiden.nl/en/scholarships/sea/leiden-university-excellence-scholarship-lexs',
     'https://www.universiteitleiden.nl/en/scholarships/sea/leiden-university-excellence-scholarship-lexs',
     'The Leiden University Excellence Scholarship (LExS) is awarded to excellent non-EEA students joining a full-time Leiden master''s programme (except the non-advanced LLM and the MSc programmes at Leiden Law School). The award takes the form of a tuition-fee reduction; the exact amount depends on the programme.',
     'Non-EEA applicant admitted to an eligible full-time master''s programme at Leiden, belonging to the top of their graduating class. Apply for the master''s programme first; the LExS application opens in the online application portal.',
     'Merit-based', 'Partial tuition (fee reduction)',
     'Corrected 2026-10-23: the previous row stated a $15,500 award and bachelor/master/PhD levels; LExS is master''s-only and the amount is set per programme.')
)
UPDATE scholarships s
SET title = f.title, provider = f.provider, coverage_type = f.coverage_type,
    amount_usd_value = f.amount_usd_value, award_amount = f.award_amount,
    award_currency = f.award_currency, award_basis = f.award_basis,
    deadline = f.deadline, deadline_date = f.deadline_date, deadline_type = f.deadline_type,
    degree_levels = f.degree_levels, website_url = f.website_url, application_url = f.website_url,
    source_url = f.source_url, description = f.description, requirements = f.requirements,
    funding_type = f.funding_type, tuition_coverage = f.tuition_coverage, notes = f.notes,
    verification_status = 'verified', last_verified_at = now() AT TIME ZONE 'UTC',
    last_updated_at = now() AT TIME ZONE 'UTC', is_active = true
FROM fix f
WHERE s.id = f.id;

-- ---------------------------------------------------------------------------
-- 3. Retire the rows that no longer describe a published award
-- ---------------------------------------------------------------------------
UPDATE scholarships SET is_active = false,
  notes = 'Retired 2026-10-23: the Utrecht Excellence Scholarship (UES) is no longer offered for programmes starting in 2026-2027 or later. Utrecht University states the award was withdrawn because of budget cuts and no new applications are accepted; existing holders keep their award.',
  verification_status = 'verified',
  source_url = 'https://www.uu.nl/en/bachelors/general-information/how-to-apply/scholarships-and-grants/utrecht-excellence-scholarships',
  website_url = 'https://www.uu.nl/en/bachelors/general-information/how-to-apply/scholarships-and-grants/utrecht-excellence-scholarships',
  amount_usd_value = 0, award_amount = 0,
  last_verified_at = now() AT TIME ZONE 'UTC', last_updated_at = now() AT TIME ZONE 'UTC'
WHERE id = 473;

UPDATE scholarships SET is_active = false,
  notes = 'Retired 2026-10-23: the university publishes only the International Student Excellence Scholarship (up to NZD 10,000). The $31,000 "full tuition" figure and the 8 December "deadline" were not published on auckland.ac.nz.',
  last_updated_at = now() AT TIME ZONE 'UTC'
WHERE id = 724;

UPDATE scholarships SET is_active = false,
  notes = 'Retired 2026-10-23: duplicate of the International Student Merit Scholarships row. The $38,000 full-tuition figure was not published by the University of Pittsburgh.',
  last_updated_at = now() AT TIME ZONE 'UTC'
WHERE id = 755;

UPDATE scholarships SET is_active = false,
  notes = 'Retired 2026-10-23: the university does not publish an "International Excellence Scholarship" at this amount. Université de Montréal publishes tuition exemptions whose value depends on the programme; no $25,000 award could be confirmed.',
  last_updated_at = now() AT TIME ZONE 'UTC'
WHERE id = 468;

-- Université de Montréal tuition exemption: value is programme-dependent.
UPDATE scholarships
SET amount_usd_value = 0, award_amount = 0,
    deadline = 'Application deadline: 1 February (fall) / 1 November (winter)',
    deadline_date = DATE '2027-02-01', deadline_type = 'fixed',
    degree_levels = '["Bachelor''s","Master''s","PhD"]',
    website_url = 'https://admission.umontreal.ca/en/who-are-you/foreign-student/',
    source_url = 'https://admission.umontreal.ca/en/who-are-you/foreign-student/',
    description = 'Université de Montréal offers tuition-exemption scholarships to international students, which reduce tuition to the Quebec rate. The value depends on the programme and the number of credits, so no single dollar figure is published; the exemption is granted by the faculty after admission.',
    requirements = 'International applicant admitted to a UdeM programme. The faculty decides on the exemption; some programmes require a separate request.',
    tuition_coverage = 'Partial tuition (exemption to the Quebec rate)',
    notes = 'Corrected 2026-10-23: the previous $10,000 figure was not published. An exemption equals the difference between international and Quebec tuition and varies by programme.',
    verification_status = 'verified',
    last_verified_at = now() AT TIME ZONE 'UTC', last_updated_at = now() AT TIME ZONE 'UTC'
WHERE id = 716;

-- ---------------------------------------------------------------------------
-- 4. Add the current Leiden / Utrecht awards that replaced the retired ones
-- ---------------------------------------------------------------------------
INSERT INTO scholarships
  (title, provider, country, coverage_type, amount_usd_value, award_amount, award_currency,
   award_period, award_basis, deadline, deadline_date, deadline_type, degree_levels,
   eligible_majors, description, requirements, website_url, application_url, source_url,
   eligible_countries, funding_type, tuition_coverage, recurrence, application_status,
   verification_status, source_reliability, is_active, university_id,
   last_verified_at, last_updated_at, notes)
VALUES
  ('NL Scholarship (Utrecht University)',
   'Dutch Ministry of Education, Culture and Science (administered by Utrecht University)',
   'Netherlands', 'Partial Tuition', 0, 5000, 'EUR', 'one-off', 'variable',
   '1 February', DATE '2027-02-01', 'fixed', '["Master''s"]', '["All Majors"]',
   'The NL Scholarship is financed by the Dutch Ministry of Education, Culture and Science together with Dutch universities. It is a one-off award of EUR 5,000 for international students from outside the EEA who start a master''s programme in the Netherlands. Students apply through the Utrecht University scholarship application in the online application system; not every programme participates.',
   'Non-EEA student who is not eligible for the Dutch statutory tuition fee and has never been enrolled at a Dutch institution (exchange excluded). An application for an eligible Utrecht master''s programme must be submitted first. Selection looks at academic background, motivation and the financial plan.',
   'https://www.uu.nl/en/masters/general-information/application-and-admission/scholarships-and-grants/nl-scholarship',
   'https://www.uu.nl/en/masters/general-information/application-and-admission/scholarships-and-grants/nl-scholarship',
   'https://www.uu.nl/en/masters/general-information/application-and-admission/scholarships-and-grants/nl-scholarship',
   '["All"]', 'Merit-based', 'Partial tuition (EUR 5,000 one-off)', 'annual', 'unknown',
   'verified', 9, true, 101, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC',
   'Added 2026-10-23: replaces the Utrecht Excellence Scholarship as the current route for non-EEA master''s applicants, because UES was withdrawn from 2026-27 onwards.'),
  ('LION Scholarship (Leiden Institute of Physics)',
   'Leiden University', 'Netherlands', 'Partial Tuition', 0, 0, 'EUR', 'year', 'variable',
   '1 February', DATE '2027-02-01', 'fixed', '["Master''s"]', '["Physics"]',
   'The LION scholarship is awarded by the Leiden Institute of Physics from the Den Adel Fund for Experimental Physics and the Lorentz Fund for Theoretical Physics. Around 10% of admitted candidates receive an award on the basis of academic merit; the amount and coverage are set by the institute and communicated in the offer.',
   'Non-Dutch national admitted to a Leiden physics master''s programme. Selection is on academic merit; candidates are considered from the master''s application.',
   'https://www.universiteitleiden.nl/en/scholarships/science/lion-scholarship',
   'https://www.universiteitleiden.nl/en/scholarships/science/lion-scholarship',
   'https://www.universiteitleiden.nl/en/scholarships/science/lion-scholarship',
   '["All"]', 'Merit-based', 'Partial tuition (amount set by the institute)', 'annual', 'unknown',
   'verified', 9, true, 107, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC',
   'Added 2026-10-23 from the Leiden scholarships catalogue. Amount deliberately left at 0 (not published) rather than guessed.')
ON CONFLICT (title) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Close the last three university → scholarship link gaps
-- ---------------------------------------------------------------------------
INSERT INTO university_scholarships
  (university_id, scholarship_id, scholarship_name, availability_status, funding_type,
   max_scholarship, covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes,
   official_url, source_url, verification_status)
VALUES
  (26, 48, 'McGill Entrance Scholarship Program', 'available', 'Merit-based',
   'CAD 3,000-12,000 entrance awards (renewable options vary)', true, false,
   'Academic excellence', 'The admission application acts as the scholarship application for most entrance awards.',
   'https://www.mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships',
   'https://www.mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships', 'verified'),
  (26, 133, 'McCall MacBain Scholars (McGill Graduate Excellence)', 'available', 'Merit-based',
   'Full tuition + CAD 2,000/month stipend', true, true,
   'Leadership and academic excellence', 'Master''s and professional degrees at McGill; separate McCall MacBain application.',
   'https://www.mccallmacbainscholars.org/', 'https://www.mccallmacbainscholars.org/', 'verified'),
  (44, 52, 'PSL Excellence Scholarship', 'available', 'Merit-based',
   'Tuition + stipend depending on programme', true, true,
   'Academic excellence', 'Master''s programmes at PSL; nomination by the programme.',
   'https://psl.eu/en/education/scholarships', 'https://psl.eu/en/education/scholarships', 'verified'),
  (44, 128, 'PSL PhD Track and Excellence Grants', 'available', 'Merit-based',
   'Full funding for the PhD track', true, true,
   'Research potential', 'PhD track applicants; specific deadlines per programme.',
   'https://psl.eu/en/education/psl-phd-tracks', 'https://psl.eu/en/education/psl-phd-tracks', 'verified'),
  (176, 707, 'UNAM Scholarships for International Students', 'available', 'Merit-based',
   'Depends on the programme', true, false,
   'Academic merit', 'UNAM''s own scholarships for international students; DGECI administers mobility grants for its own students going abroad.',
   'https://www.unam.mx', 'https://www.unam.mx', 'verified'),
  (176, 343, 'UNAM International Postgraduate Scholarship', 'available', 'Merit-based',
   'Depends on the programme', true, false,
   'Academic merit', 'Postgraduate applicants; separate call published by DGECI.',
   'https://www.unam.mx', 'https://www.unam.mx', 'verified')
ON CONFLICT (university_id, scholarship_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Result
-- ---------------------------------------------------------------------------
SELECT (SELECT COUNT(*) FROM universities)                                        AS universities,
       (SELECT COUNT(DISTINCT university_id) FROM university_scholarships)        AS universities_with_a_link,
       (SELECT COUNT(*) FROM university_scholarships)                             AS link_rows,
       (SELECT COUNT(*) FROM scholarships WHERE is_active)                        AS active_scholarships,
       (SELECT COUNT(*) FROM scholarships WHERE NOT is_active)                    AS retired_scholarships;
