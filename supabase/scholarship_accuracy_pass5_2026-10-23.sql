-- ============================================================================
--  Scholarship accuracy pass 5 — the last 32 universities whose only award was
--  a template row ("<University> Scholarships") with an invented amount.
--  Date: 2026-10-23   ·   Project: zkguzbdopfedkffsatk
--
--  WHAT WAS WRONG
--    The PDF import wrote one generic row per university. Many carried a dollar
--    figure that no university publishes ("University of Reading International
--    Excellence Scholarship $25,500", "University of Virginia Jefferson
--    Scholarship $55,000", "University of Florida International Student
--    Scholarships $7,500" ...). The figures and the "Jan 25 (UCAS)" style
--    deadlines were invented by the importer.
--
--  WHAT THIS PASS DOES
--    Each row is replaced with the award the university actually publishes:
--    its real name, the real value, the real deadline and the official URL.
--    Where a university publishes no university-wide international award, the
--    row says exactly that and points at the scheme that does exist — it never
--    keeps an invented number.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Awards with a published, unambiguous value
-- ---------------------------------------------------------------------------
WITH fix (id, title, provider, coverage_type, amount_usd_value, award_amount,
          award_currency, award_basis, deadline, deadline_date, deadline_type,
          degree_levels, website_url, description, requirements, funding_type,
          tuition_coverage, notes) AS (
  VALUES
    -- Australia -------------------------------------------------------------
    (676, 'George Swinburne International Excellence Scholarship', 'Swinburne University of Technology',
     'Partial Tuition', 0, 30, 'AUD', 'percentage',
     'No separate application — assessed automatically with the course application',
     NULL::date, 'automatic', '["Bachelor''s","Master''s"]',
     'https://www.swinburne.edu.au/courses/scholarships/international-scholarships/',
     'Swinburne awards the George Swinburne International Excellence Scholarship to high-achieving international students commencing an undergraduate or postgraduate coursework course at the Hawthorn campus for the first time in 2027. Recipients receive a 30% reduction of tuition fees for the standard duration of the course. The university also offers a Swinburne International Scholarship worth a 20% reduction; where more than one arrangement applies, the most favourable one is used.',
     'International applicant (not an Australian or New Zealand citizen or permanent resident) starting an eligible undergraduate or postgraduate coursework course at the Hawthorn campus for the first time in 2027, meeting the course entry requirements. Cannot be held with another Swinburne or external tuition discount. Excluded: Bachelor of Aviation and Piloting, Master of Physiotherapy, Master of Dietetics, Master of Occupational Therapy, research degrees.',
     'Merit-based', 'Partial tuition (30% fee reduction)',
     'Corrected 2026-10-23: the previous row claimed a $27,000 award with "varies" as the deadline. Swinburne publishes a 30% tuition reduction (20% for the Swinburne International Scholarship) and no dollar figure, with automatic assessment.'),
    (761, 'Tasmanian International Scholarship (TIS)', 'University of Tasmania',
     'Partial Tuition', 0, 25, 'AUD', 'percentage',
     'No separate application — assessed automatically with the course application',
     NULL::date, 'automatic', '["Bachelor''s","Master''s"]',
     'https://www.utas.edu.au/study/scholarships-fees-and-costs/international-scholarships',
     'The Tasmanian International Scholarship gives commencing international students a 25% reduction in registered tuition fees for the full duration of the course, provided satisfactory grades are maintained. All international applicants are assessed automatically by the Admissions Team and the award is stated in the offer letter.',
     'International fee-paying student commencing a new eligible undergraduate or postgraduate coursework course at the University of Tasmania. Generally requires the equivalent of an overall B+ average. Excluded: Bachelor of Medical Science and Doctor of Medicine, Bachelor of Dementia Care, AMC seafaring courses and short-term study abroad or exchange.',
     'Merit-based', 'Partial tuition (25% fee reduction)',
     'Corrected 2026-10-23: the previous row claimed a $25,000 award. The university publishes a 25% tuition reduction for the duration of the course, awarded automatically.'),

    -- Belgium ---------------------------------------------------------------
    (411, 'Master Mind Scholarship (Flemish Government)', 'Flemish Ministry of Education and Training (via University of Antwerp)',
     'Full Tuition + Stipend', 10225, 10225, 'EUR', 'fixed',
     '1 February', DATE '2027-02-01', 'fixed', '["Master''s"]',
     'https://www.uantwerpen.be/en/study/scholarships/',
     'Master Mind is awarded by the Flemish Ministry of Education and Training to outstanding international master''s students. The scholarship covers a grant of EUR 10,225 per academic year plus a tuition-fee waiver; the holder pays only the administrative enrolment fee (EUR 136.50 in 2026-27). UAntwerp shortlists a maximum of 20 candidates and submits them centrally.',
     'Applicant of any nationality except Russian, admitted to an eligible master''s programme at UAntwerp (preparatory, bridging and distance-learning programmes are excluded), with a high standard of academic performance (around GPA 3.5/4.0) and good English. Applications go through UAntwerp, not directly to the Ministry.',
     'Merit-based', 'Full tuition waiver + EUR 10,225 annual grant',
     'Corrected 2026-10-23: the previous deadline said "February 15 annually" and the amount $15,000. UAntwerp publishes a 1 February deadline and EUR 10,225 plus a tuition waiver.'),

    -- Switzerland -----------------------------------------------------------
    (486, 'UNIL Master''s Scholarship', 'University of Lausanne',
     'Full Tuition + Stipend', 19200, 1600, 'CHF', 'monthly',
     '1 November', DATE '2026-11-01', 'fixed', '["Master''s"]',
     'https://www.unil.ch/unil/en/home/menuinst/etudier/mobilite-et-echange/etudiantes-et-etudiants-internationaux/etudiantes-internationaux-reguliers/bourse-de-master.html',
     'The UNIL Master''s Scholarship is awarded to about ten international students a year who hold a foreign degree and an outstanding academic record. It pays CHF 1,600 per month for ten months a year (mid-September to mid-July) for the minimum statutory duration of the master''s programme, and exempts the holder from the standard course registration fees (a CHF 80 semester fee remains payable). UNIL states that the amount does not cover the full cost of living in Lausanne.',
     'Hold a foreign university degree recognised as equivalent to a Swiss bachelor''s, completed before the master''s starts. Outstanding academic results. C1-level French or English depending on the programme. Not currently enrolled at UNIL. CHF 200 administrative fee with the application. Two recommendation letters sent directly by their authors to mastergrants@unil.ch by 1 November.',
     'Merit-based', 'Registration fees waived + CHF 1,600/month stipend',
     'Corrected 2026-10-23: the previous row invented a $5,000 "International Excellence Scholarship". UNIL publishes the Master''s Scholarship: CHF 1,600/month, deadline 1 November.'),

    -- France ----------------------------------------------------------------
    (463, 'Université Paris-Saclay International Master''s Scholarship', 'Université Paris-Saclay',
     'Full Tuition + Stipend', 10000, 10000, 'EUR', 'year',
     '31 March (after programme pre-selection by 25 March)', DATE '2027-03-31', 'fixed', '["Master''s"]',
     'https://www.universite-paris-saclay.fr/en/admission/bourses-et-aides-financieres/international-masters-scholarships-program',
     'The International Master''s Scholarship is EUR 10,000 per year, paid monthly from September to June for the academic year, plus a flat travel and visa allowance of up to EUR 900 depending on the country of origin. It renews automatically for a second year for M1 laureates who progress to M2 at Paris-Saclay. Registration and tuition fees are not covered by the scholarship.',
     'Foreign national undertaking their first enrolment in higher education in France, aged 30 or under during the application year, admitted to a Paris-Saclay master''s programme (apprenticeship programmes excluded), and not receiving other funding above EUR 600 per month. Candidates are nominated by programme coordinators, then submit the scholarship form.',
     'Merit-based', 'EUR 10,000/year stipend + up to EUR 900 travel',
     'Corrected 2026-10-23: the previous row claimed a $5,000 award with "not published" as the deadline. Paris-Saclay publishes EUR 10,000/year and 25/31 March deadlines.'),

    -- Germany ---------------------------------------------------------------
    (728, 'Deutschlandstipendium (University of Bonn)', 'University of Bonn Foundation / German Federal Ministry of Education and Research',
     'Stipend', 3600, 300, 'EUR', 'monthly',
     'Annual call — the 2026/27 round closed on 18 May 2026', NULL::date, 'annual', '["Bachelor''s","Master''s"]',
     'https://www.uni-bonn.de/en/studying/consultation-and-service/financing-and-support/scholarships',
     'The Deutschlandstipendium at the University of Bonn pays EUR 300 per month (EUR 3,600 per year) for at least two semesters, funded half by private sponsors and half by the federal government. It is awarded irrespective of income and is compatible with BAföG. The University of Bonn Foundation runs the selection. Note that Bonn, as a North Rhine-Westphalia public university, charges no tuition fees — only the semester contribution.',
     'Students of all nationalities enrolled in a Bachelor''s, Master''s, State Examination or church degree at the University of Bonn, plus prospective students about to enrol. Very good academic results and social engagement outside the classroom. Doctoral candidates are excluded.',
     'Merit + engagement', 'Stipend only (no tuition fees at Bonn)',
     'Corrected 2026-10-23: the previous row claimed a $400 award on a "Jul 15 / Jan 15" deadline template. Bonn publishes EUR 300/month and an annual May call.'),

    -- Denmark ---------------------------------------------------------------
    (487, 'DTU Tuition Fee Waiver (non-EU/EEA MSc)', 'Technical University of Denmark',
     'Full Tuition', 30000, 30000, 'EUR', 'total',
     '15 January (autumn intake)', DATE '2027-01-15', 'fixed', '["Master''s"]',
     'https://www.dtu.dk/english/education/graduate/fees-and-funding/tuition_fee_waivers',
     'DTU awards a limited number of tuition fee waivers to new non-EU/EEA MSc students applying for the autumn intake. A waiver covers the tuition fee for the full two-year MSc (DTU tuition is EUR 7,500 per semester, EUR 30,000 in total). Waivers are granted after the offer of admission is accepted and are not offered for the spring intake.',
     'Non-EU/EEA applicant liable for tuition, applying to a DTU MSc programme by the 15 January deadline, who submits a separate personal statement with the application explicitly requesting the waiver. Selection is on academic excellence: grades/GPA, the ranking of the bachelor''s university, research experience, publications and relevant work experience.',
     'Merit-based', 'Full tuition waiver for the two-year MSc',
     'Corrected 2026-10-23: the previous row invented a $16,500 amount and left the deadline empty. DTU publishes a full tuition waiver (EUR 30,000 value) and a 15 January deadline with a separate statement.'),

    -- Hong Kong / Macao -----------------------------------------------------
    (746, 'UM International Student Scholarship', 'University of Macau',
     'Full Tuition', 0, 0, 'MOP', 'year',
     '3 December 2026 (master''s and postgraduate certificates, 2027/28 intake)', DATE '2026-12-03', 'fixed', '["Bachelor''s","Master''s"]',
     'https://gao.um.edu.mo/international-admission/scholarship-assistantship-academic-prizes/admission-scholarship/',
     'The University of Macau International Student Scholarship gives international students a waiver of tuition and Residential College accommodation for the normal period of study, subject to an annual review. Bachelor''s awardees receive a full (100%) or half (50%) waiver of both tuition and shared-bedroom accommodation. Master''s awardees receive Type A (100% tuition + 100% accommodation + MOP 4,000/month teaching assistantship), Type B (100% tuition) or Type C (the international tuition differential waived, so they pay the local rate).',
     'International applicant holding a valid foreign passport, applying to a full-time Bachelor''s or Master''s programme (executive degrees excluded) and meeting the admission requirements. Applicants admitted through the Joint Admission Examination for Macao''s four higher education institutions are excluded. All eligible applicants are considered automatically from the complete online application — no separate scholarship form.',
     'Merit-based', 'Full or half tuition waiver (+ assistantship for master''s)',
     'Corrected 2026-10-23: the previous row claimed a $11,000 award on a "Feb (for Fall)" deadline. UM publishes full/half tuition and accommodation waivers, with master''s applications due 3 December 2026.'),

    -- Ireland --------------------------------------------------------------
    (737, 'University of Galway Global Excellence & Merit Scholarships', 'University of Galway',
     'Partial Tuition', 10000, 10000, 'EUR', 'year',
     'Automatic — assessed with the programme application', NULL::date, 'automatic', '["Bachelor''s","Master''s"]',
     'https://www.universityofgalway.ie/internationalscholarships/',
     'University of Galway runs a Global Scholarships programme for non-EU applicants. Awards are made per college: typically a €2,000–€5,000 first-year tuition reduction for eligible undergraduate entrants, plus one Global Excellence Scholarship of up to €10,000 a year (spread over the programme) in each college. Postgraduate taught applicants may receive €2,000 (first-class honours) up to a full-tuition Excellence award. No separate application is required; the scholarship is deducted from tuition after the minimum deposit is paid.',
     'Non-EU international applicant holding an offer for an eligible undergraduate or postgraduate taught programme at the University of Galway for the 2027/28 academic year. Only one Global Scholarship may be held; where more than one is offered, the lesser is rescinded. Awards are valid for the Autumn intake only and cannot be deferred.',
     'Merit-based', 'Partial tuition (€2,000–€10,000 by college)',
     'Corrected 2026-10-23: the previous row claimed a $24,000 award on a "Feb 1" deadline. Galway publishes per-college merit awards of €2,000–€10,000, assessed automatically.'),

    -- United Kingdom -------------------------------------------------------
    (744, 'International Undergraduate Merit Scholarship', 'University of Leicester',
     'Partial Tuition', 5000, 5000, 'GBP', 'year',
     'Automatic — awarded with the course offer', NULL::date, 'automatic', '["Bachelor''s"]',
     'https://le.ac.uk/study/undergraduates/scholarships-bursaries-discounts/international-undergraduate-merit-scholarship',
     'Leicester awards the International Undergraduate Merit Scholarship of £5,000 per year to international fee-paying students who achieve the equivalent of two grades above the standard A-level entry requirement for their course. A £3,000 Chancellor''s International Scholarship is available to all international offer-holders who meet the entry requirements. Both are applied automatically as a tuition-fee discount and are held for each year of the course.',
     'International fee-paying student starting a full-time campus-based undergraduate course (including eligible top-up degrees) in September 2027 or later. The £5,000 merit award requires grades two levels above the published A-level requirement. Excluded: Medicine and the LLB Maitrise.',
     'Merit-based', 'Partial tuition (£5,000 per year)',
     'Corrected 2026-10-23: the previous row claimed a $6,500 award with a "Jan 25 (UCAS)" deadline. Leicester publishes £5,000 per year, awarded automatically.'),
    (489, 'Master''s Excellence Scholarship', 'University of Reading',
     'Partial Tuition', 10000, 10000, 'GBP', 'year',
     'Automatic — allocated on previous degree performance', NULL::date, 'automatic', '["Master''s"]',
     'https://www.reading.ac.uk/ready-to-study/study/fees-and-funding/scholarships/masters-excellence-scholarships',
     'Reading allocates Master''s Excellence Scholarships automatically from the previous degree result: a first-class equivalent receives £10,000, a 2:1 receives £9,000 and a 2:2 receives £4,000, awarded as a tuition-fee reduction. At undergraduate level the university offers 80 Reading Excellence Scholarships of £5,000 a year to international entrants by separate application through the me@reading portal.',
     'International fee-paying student holding, or expected to achieve, an undergraduate degree at UK Lower Second Class level or above, starting an eligible master''s programme. The award is automatic — no scholarship form is required.',
     'Merit-based', 'Partial tuition (£4,000–£10,000)',
     'Corrected 2026-10-23: the previous row invented a $25,500 "International Excellence Scholarship". Reading publishes the Master''s Excellence Scholarship at £4,000–£10,000 and the £5,000 Reading Excellence Scholarship for undergraduates.'),
    (758, 'Faculty of Science Undergraduate Scholarships for International Students', 'University of Strathclyde',
     'Partial Tuition', 7000, 7000, 'GBP', 'year',
     '31 July', DATE '2027-07-31', 'fixed', '["Bachelor''s"]',
     'https://www.strath.ac.uk/studywithus/undergraduate/undergraduatescholarships/',
     'Strathclyde offers international undergraduate scholarships of £6,000–£7,000 per year of study (up to 25 awards in the Faculty of Science), £7,000 a year for the Department of Physics awarded automatically, and a 15% fee reduction (typically £4,650 in year one) across the Faculty of Engineering, also automatic. Awards continue annually subject to academic progression and only one Strathclyde scholarship may be held per year.',
     'New international fee-paying student holding an offer for year one or year two of a full-time, Glasgow-campus undergraduate degree. Excellent grades to date and self-funded (full government or embassy scholars are not eligible). Students who transfer out of the awarding faculty lose the award.',
     'Merit-based', 'Partial tuition (£6,000–£7,000 per year)',
     'Corrected 2026-10-23: the previous row claimed a $6,750 award on a "Jan 25 (UCAS)" deadline. Strathclyde publishes £6,000–£7,000 with a 31 July consideration deadline.'),

    -- New Zealand ----------------------------------------------------------
    (765, 'Vice-Chancellor''s International Excellence Scholarship', 'University of Waikato',
     'Partial Tuition', 15000, 15000, 'NZD', 'year',
     '30 November for A-trimester offers (31 May for B, 31 August for C)', NULL::date, 'rolling', '["Bachelor''s","Master''s"]',
     'https://www.waikato.ac.nz/int/study/scholarships/find-a-scholarship/vice-chancellors-international-excellence-scholarship/',
     'The Vice-Chancellor''s International Excellence Scholarship is a tuition-fee credit of between NZD 2,500 and NZD 15,000 for new international students — up to NZD 15,000 for undergraduate study and up to NZD 10,000 for postgraduate study. It is paid in full in the first trimester and is awarded on academic excellence. Applications are reviewed monthly against the trimester cut-off dates.',
     'New international student enrolling full-time in an undergraduate or postgraduate programme at Waikato, holding a conditional or unconditional offer of place with a minimum GPA equivalency of B+ in the qualifying qualification. Not open to students sponsored by a sponsor body, a Guaranteed Credit Arrangement, or a study-abroad or exchange agreement.',
     'Merit-based', 'Partial tuition (NZD 2,500–15,000)',
     'Corrected 2026-10-23: the previous row claimed a $23,500 award on a "Dec 10" deadline. Waikato publishes up to NZD 15,000 with monthly trimester cut-offs.'),
    (784, 'VUW Undergraduate / Postgraduate International Scholarship', 'Victoria University of Wellington',
     'Partial Tuition', 15000, 15000, 'NZD', 'year',
     'Automatic with the programme application', NULL::date, 'automatic', '["Bachelor''s","Master''s"]',
     'https://www.wgtn.ac.nz/international/scholarships-fees/scholarships',
     'Victoria University of Wellington replaced the Tongarewa International Scholarship in August 2025 with two automatic awards: the VUW Undergraduate International Scholarship, worth NZD 15,000 towards first-year tuition fees, and the VUW Postgraduate International Scholarship, worth NZD 10,000 for master''s and 120-point postgraduate diploma students. No separate scholarship application is needed — a complete, on-time programme application is what gets a student considered.',
     'New full-fee-paying international student enrolling full-time on campus in a bachelor''s degree (undergraduate award) or a 120/180/240-point master''s or 120-point postgraduate diploma (postgraduate award). Not available with credit transfer or government sponsorship.',
     'Merit-based', 'Partial tuition (NZD 10,000–15,000, first year)',
     'Corrected 2026-10-23: the previous row claimed a $24,500 "International Excellence Scholarship" on a "Dec 1" deadline. VUW publishes automatic awards of NZD 15,000 (undergraduate) and NZD 10,000 (postgraduate); the Tongarewa Scholarship it replaced is no longer offered.'),
    (731, 'UC International First Year Scholarship', 'University of Canterbury',
     'Partial Tuition', 15000, 15000, 'NZD', 'year',
     '31 October 2026 (offshore applicants, Semester 1 2027)', DATE '2026-10-31', 'fixed', '["Bachelor''s"]',
     'https://www.canterbury.ac.nz/study/getting-started/scholarships/incoming-first-year-scholarships/international-students',
     'The UC International First Year Scholarship recognises top-achieving international students who have completed a university-entrance qualification overseas or at UC International College and will start a bachelor''s degree at Canterbury. It is worth NZD 15,000 towards tuition fees in the first year, with up to ten awarded. There are two application streams: offshore applicants (31 October for a Semester 1 start, 15 April for Semester 2) and New Zealand school leavers (closing in August).',
     'Full-fee-paying international student who is not a New Zealand or Australian citizen, resident or permanent resident. Must be starting a full-time undergraduate bachelor''s degree at Canterbury for the first time and must not have previously studied an undergraduate programme at another New Zealand tertiary institution.',
     'Merit-based', 'Partial tuition (NZD 15,000 first year)',
     'Corrected 2026-10-23: the previous row claimed a $24,000 award on a "Dec 10" deadline. Canterbury publishes NZD 15,000 with a 31 October 2026 offshore deadline.'),

    -- United States --------------------------------------------------------
    (764, 'Jefferson Scholarship', 'Jefferson Scholars Foundation (University of Virginia)',
     'Full Ride', 0, 83000, 'USD', 'year',
     'Nomination deadline 15 November (International At-Large region)', DATE '2026-11-15', 'fixed', '["Bachelor''s"]',
     'https://www.jeffersonscholars.org/scholarships',
     'The Jefferson Scholarship is a four-year award covering the full cost of attendance at the University of Virginia plus funded enrichment — summer travel, independent research and study abroad. Non-Virginian and international scholars receive more than $83,000 a year, upwards of $405,000 over four years. There is no direct application: candidates must be nominated by their secondary school.',
     'High-school senior in the graduating class, nominated by school officials, who demonstrates excellence in leadership, scholarship and engaged citizenship, and who is admitted to the University of Virginia through its own undergraduate admissions process. The Foundation does not control admission to UVA.',
     'Merit-based', 'Full cost of attendance + enrichment',
     'Corrected 2026-10-23: the previous row claimed a $55,000 award with standard admissions deadlines. The Foundation publishes more than $83,000 a year for non-Virginian and international scholars and a 15 November nomination deadline for the International At-Large region.')
)
UPDATE scholarships s
SET title = f.title, provider = f.provider, coverage_type = f.coverage_type,
    amount_usd_value = f.amount_usd_value, award_amount = f.award_amount,
    award_currency = f.award_currency, award_basis = f.award_basis,
    deadline = f.deadline, deadline_date = f.deadline_date, deadline_type = f.deadline_type,
    degree_levels = f.degree_levels, website_url = f.website_url, application_url = f.website_url,
    source_url = f.website_url, description = f.description, requirements = f.requirements,
    funding_type = f.funding_type, tuition_coverage = f.tuition_coverage, notes = f.notes,
    verification_status = 'verified', last_verified_at = now() AT TIME ZONE 'UTC',
    last_updated_at = now() AT TIME ZONE 'UTC', is_active = true
FROM fix f
WHERE s.id = f.id;

-- ============================================================================
-- 2. Rows where the university publishes no university-wide award
--    Each of these keeps the university's own page as its source and says, in
--    plain words, what the published route actually is — no invented figure.
--    (ULB, Unicamp, UPC, UPF, Barcelona, Navarra, Paris 1, Lisbon, Porto,
--     Florida, Maryland, Witwatersrand, Antwerp, Los Andes, UM Malaysia,
--     Latvia, POSTECH — see the executed statements above.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3. Duplicates retired in this pass
-- ---------------------------------------------------------------------------
UPDATE scholarships SET is_active = false,
  notes = COALESCE(notes, '') || ' Deactivated 2026-10-23: duplicate generic row; the verified award for this university is kept on a separate row.',
  last_updated_at = now() AT TIME ZONE 'UTC'
WHERE id IN (715, 463);   -- UPF generic, Paris-Saclay duplicate

-- ---------------------------------------------------------------------------
-- 4. award_basis / award_period brought back inside the values the app allows
--
--    The importer wrote free text into award_basis ("Merit-based", "Academic
--    Excellence", "Salaried PhD", a bare "year" ...). The admin API only
--    accepts fixed | range | full_tuition | need_based | variable, and
--    awardLabel() only translates three of them, so 386 rows rendered as a raw
--    number with no label. They are mapped onto the canonical set here.
-- ---------------------------------------------------------------------------
UPDATE scholarships
SET award_basis = CASE
      WHEN award_basis ~* 'need|income' THEN 'need_based'
      WHEN award_basis ~* 'full'        THEN 'full_tuition'
      WHEN award_amount > 0             THEN 'fixed'
      ELSE 'variable'
    END
WHERE award_basis IS NOT NULL
  AND award_basis NOT IN ('fixed', 'range', 'full_tuition', 'need_based', 'variable');

UPDATE scholarships
SET award_period = CASE award_period
      WHEN 'academic_year' THEN 'year'
      WHEN 'one-off'       THEN 'one_time'
      ELSE award_period
    END
WHERE award_period IN ('academic_year', 'one-off');

-- ---------------------------------------------------------------------------
-- 5. Result
-- ---------------------------------------------------------------------------
SELECT (SELECT COUNT(*) FROM universities)                                              AS universities,
       (SELECT COUNT(DISTINCT university_id) FROM scholarships
         WHERE is_active AND university_id IS NOT NULL)                                 AS universities_with_an_own_award,
       (SELECT COUNT(*) FROM scholarships WHERE is_active)                              AS active_awards,
       (SELECT COUNT(*) FROM scholarships WHERE NOT is_active)                          AS retired,
       (SELECT COUNT(*) FROM scholarships WHERE is_active AND award_amount > 0)         AS awards_with_a_published_amount,
       (SELECT COUNT(*) FROM university_scholarships)                                   AS university_links;
