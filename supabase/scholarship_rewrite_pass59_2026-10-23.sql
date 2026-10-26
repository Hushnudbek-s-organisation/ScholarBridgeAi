-- ============================================================================
-- Scholarship rewrite pass 59 — United States, part 3
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Rows rewritten : 34 Cornell Tata Scholarship, 33 Penn World Scholars
-- Cards updated  : 599, 530
--
-- THE TWO CORRECTIONS THAT MATTER IN THIS PASS
--   1. Cornell Tata is for INDIAN CITIZENS ONLY. The imported row presented it as
--      an open award worth 60,000 dollars. It is neither: it is a need-based
--      package for Cornell undergraduates from India, and a candidate from
--      Uzbekistan is outside it. The restriction is now in the title, in
--      eligible_countries and in the first paragraph of the description.
--   2. Neither award has a separate application. Cornell routes everything
--      through the Common Application and the CSS Profile; Penn selects its
--      World Scholars during admission. Both rows said otherwise.
--
-- Pages read on 2026-10-26 (provider's own):
--   finaid.cornell.edu/first-year-and-transfer-students-international
--     -> CSS Profile with Cornell code 2098; ED 1 November 2026; RD 2 January
--        2027; transfer 15 March 2027; Cornell international admission is
--        need-aware; Cornell meets 100 per cent of demonstrated need with grants,
--        work-study and reasonable loans; both biological parents file where
--        divorced; CSS Profile fee waivers generally unavailable to
--        internationals; 14 per cent withholding on grant aid above tuition
--   admissions.cornell.edu/apply/international-students/tata-scholarship
--     -> 25 million dollar endowment from the Tata Education and Development
--        Trust; approximately 20 scholars at any one time; scholarship held for
--        the duration of undergraduate study (reached through the admissions
--        site rather than fetched directly)
--   global.upenn.edu/isss/penn-world-scholars
--     -> selected by the Office of Admissions at the time of admission on
--        academic achievement, leadership potential, financial need and career
--        aspirations; any of Penn four undergraduate schools and any subject;
--        scholars also receive need-based financial aid; four-year programme
--        structure; current cohort includes Brazil, Rwanda, Romania, Ghana,
--        Kenya, Mongolia, Tunisia, South Korea and Kazakhstan
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cornell Tata Scholarship (34) — India only, need-based, no separate form
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Cornell University Tata Scholarship (Indian citizens only)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_period = 'year',
award_basis = 'need_based',
deadline = 'No separate Tata deadline: the CSS Profile must be filed by the Cornell international financial aid deadline, which is 1 November 2026 for Early Decision, 2 January 2027 for Regular Decision and 15 March 2027 for transfer applicants',
deadline_type = 'fixed',
deadline_date = '2027-01-02',
expected_deadline_period = NULL,
expected_opening_period = 'The 2027-28 CSS Profile opens on 1 October 2026 and Cornell asks international applicants to file it as soon as possible after that date.',
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["India"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Endowed need-based scholarship for Indian undergraduates',
tuition_coverage = 'The Tata Scholarship Fund is a 25 million dollar endowment given by the Tata Education and Development Trust and it supports approximately twenty scholars at any one time. Cornell does not publish a fixed sum for the award, because the scholarship is delivered as part of the university need-based aid package: Cornell states on its international financial aid page that it meets one hundred per cent of an admitted international undergraduate demonstrated need through annual offers that combine Cornell grants, an annual work-study award and reasonable student loans depending on total family income. Recipients hold the scholarship for the duration of undergraduate study, subject to continued eligibility. Because the aid exceeds tuition and mandatory fees in most cases, the university also warns that grant aid above qualified education expenses is taxable income in the United States and that Cornell must withhold fourteen per cent unless a tax treaty exempts the student.',
accommodation = 'Room and board are inside the cost of attendance that the need-based package meets, not paid as a separate allowance.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://admissions.cornell.edu/apply/international-students/tata-scholarship',
source_url = 'https://finaid.cornell.edu/first-year-and-transfer-students-international',
application_url = NULL,
description = 'The Tata Scholarship is real and generous, and the imported record was wrong about the two things that decide whether a candidate can use it. The first is nationality: the fund was created by a 25 million dollar endowment from the Tata Education and Development Trust, a philanthropic affiliate of India Tata Group, and it is for Cornell undergraduates from India. A candidate from Uzbekistan is outside it, so this record now states the restriction plainly instead of presenting the award as open. The second is the mechanism. There is no separate Tata application: an eligible Indian applicant files the Common Application and the CSS Profile by Cornell international financial aid deadline, and the university then builds the aid package that carries the Tata name. Cornell is explicit that its undergraduate admission process for international students is need-aware, and that it meets one hundred per cent of an admitted international undergraduate demonstrated need through Cornell grants, an annual work-study award and reasonable student loans depending on family income, so the award is need-based rather than a fixed prize. Cornell does not publish a Tata figure, which is why this row carries none. The practical dates for autumn 2027 entry are published: the CSS Profile opens on 1 October 2026, and it must be filed by 1 November 2026 for Early Decision, 2 January 2027 for Regular Decision and 15 March 2027 for transfers. The university also flags that the CSS Profile fee waiver is generally not available to international students, that both biological parents must each file a profile where they are divorced or separated, and that grant aid above tuition and mandatory fees is taxable in the United States with a fourteen per cent withholding unless a treaty applies.',
requirements = 'Be a citizen of India with a valid Indian passport and, in practice, have attended secondary school in India; the fund exists for Cornell undergraduates from India and a candidate of another nationality is not eligible however strong the file. Apply for full-time undergraduate admission to Cornell through the Common Application, choosing a single Cornell college, and submit the Cornell supplement, transcripts, the school report, one counselor recommendation and two teacher recommendations, together with SAT or ACT scores, which Cornell requires. File the CSS Profile using Cornell institutional code 2098 by the international financial aid deadline for the round applied to: 1 November 2026 for Early Decision, 2 January 2027 for Regular Decision or 15 March 2027 for transfer. Note that Cornell international admission is need-aware, so requesting aid is a factor in the admission decision itself, and that no CSS Profile fee waiver is generally available to international applicants. Where parents are divorced or separated, both must file separate profiles. Expect that grant aid above tuition and mandatory fees is treated as taxable income in the United States, with a fourteen per cent withholding unless a tax treaty exempts the student.',
required_documents = '["Common Application with the Cornell University supplement","Official high school transcript covering grades 9 to 12 and the school report","One counselor recommendation and two teacher recommendations","SAT or ACT scores","English language proficiency evidence where required","CSS Profile filed with Cornell code 2098 by the applicable deadline","Any additional documentation Cornell requests through the College Board IDOC service"]',
english_requirements = 'Cornell requires international applicants to demonstrate English language proficiency and may require scores from an approved English proficiency exam; the Tata Scholarship adds no separate score.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from finaid.cornell.edu/first-year-and-transfer-students-international, the university international financial aid page, which publishes the CSS Profile requirement with Cornell code 2098, the 2027-28 dates of 1 November 2026 for Early Decision, 2 January 2027 for Regular Decision and 15 March 2027 for transfer, the statement that Cornell undergraduate admission for international students is need-aware, the statement that Cornell meets 100 per cent of an admitted international undergraduate demonstrated need through Cornell grants, work-study and reasonable loans, the rule that both biological parents file where divorced or separated, the unavailability of the CSS Profile fee waiver to international applicants, and the fourteen per cent withholding on grant aid above tuition and fees. The endowment size of 25 million dollars from the Tata Education and Development Trust and the figure of approximately twenty scholars at any one time come from admissions.cornell.edu, the Cornell admissions page for the Tata Scholarship, which was reached through the admissions site search rather than fetched directly in this pass. amount_usd_value is 0 and award_amount is NULL because Cornell publishes no fixed Tata sum: the award is part of a need-based package whose size depends on the family circumstances, which the description states. CORRECTIONS: the row was titled Cornell Tata Scholarship and presented it as a general award worth 60,000 dollars; the figure is invented, the award is India-only, there is no separate application, and the deadline is the CSS Profile deadline rather than 2 January alone. It also invented an IELTS score and a GPA. The most important correction is the nationality restriction, which the row now states in its title, in eligible_countries and in the first paragraph of the description.',
last_verified_at = '2026-10-26 05:00:00',
last_updated_at = '2026-10-26 05:00:00'
WHERE id = 34;

-- ---------------------------------------------------------------------------
-- 2. Penn World Scholars (33) — no separate application, no published sum
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Penn World Scholars (University of Pennsylvania)',
coverage_type = 'Partial Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_period = 'year',
award_basis = 'need_based',
deadline = 'No separate application and no separate deadline: scholars are selected by the Office of Admissions at the moment of admission, so the operative date is the Penn undergraduate application and financial aid deadline for the round chosen',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'Penn selects World Scholars during admission rather than through an application, so the only date a candidate controls is the undergraduate admission deadline and the matching financial aid deadline for the round applied to.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Need-based university financial aid plus a four-year leadership programme',
tuition_coverage = 'Penn does not publish a figure for this award, and the reason is structural rather than an omission: a Penn World Scholar is not given a separate scholarship but is selected into a programme and then receives the university need-based financial aid package. The programme page states that scholars also receive need-based financial aid from the University and links to the Penn financial aid pages for the amounts, so the size of the award is whatever the family circumstances produce under Penn aid formula. What the programme itself adds is a four-year structure: a virtual welcome and information session in mid-April, a cohort WhatsApp group over the summer, the Intercultural Leadership Program in the first year, a formal reception with the Office of Admissions and International Student and Scholar Services, and required and optional activities in every subsequent year covering academic adjustment, mentoring, intercultural competence, internship and job search preparation, leadership development and career planning. Scholars are expected to stay in touch with the international student office and to report changes to their academic plans.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://global.upenn.edu/isss/penn-world-scholars/',
source_url = 'https://global.upenn.edu/isss/penn-world-scholars/',
application_url = 'https://admissions.upenn.edu/',
description = 'The imported record treated Penn World Scholars as a scholarship worth sixty thousand dollars with a January 5 deadline, and both of those ideas are wrong in ways that would mislead a candidate. The programme page describes it as a signature initiative run by International Student and Scholar Services for select cohorts of exceptional international undergraduates across four class years, and the selection mechanism is the important part: scholars are chosen by the Office of Admissions at the time of admission, on exceptional academic achievement, demonstrated leadership potential, financial need and long-term career aspirations, from a globally diverse applicant pool. There is no separate application form, no separate deadline and no published value, because a World Scholar is not handed a fixed scholarship. The money comes through the university need-based financial aid package that the programme page links to, and the programme itself supplies a four-year structure instead: a welcome session in mid-April, a cohort group over the summer, the Intercultural Leadership Program in the first year, a formal reception, and required and optional activities in each later year covering mentoring, intercultural competence, internships, leadership and career development. Scholars may enrol in any of Penn four undergraduate schools and major in any subject, and the current cohort listed on the page includes students from Brazil, Rwanda, Romania, Ghana, Kenya, Mongolia, Tunisia, South Korea and Kazakhstan, which shows the geographic range the programme actually selects from. What this record therefore states is the truth: an open programme with no published sum, entered by being admitted, not by applying separately.',
requirements = 'Apply for undergraduate admission to the University of Pennsylvania through the normal admissions route, since Penn World Scholars are selected by the Office of Admissions at the time of admission and there is no separate application. Apply for need-based financial aid by the matching deadline, because financial need is one of the stated selection criteria and the award itself is delivered through the need-based aid package. Show exceptional academic achievement, demonstrated leadership potential and clearly articulated long-term career aspirations, which are the four criteria the programme page names. Be an international undergraduate applicant from any world region; scholars come from every region and may enrol in any of Penn four undergraduate schools in any subject. If selected, take part in the programme structure, which begins with a virtual welcome session in mid-April, continues through the first-year Intercultural Leadership Program and a formal reception, and requires engagement in each subsequent year. Keep the international student office informed of any change to academic plans, including leaves of absence, study abroad or a change of graduation date.',
required_documents = '["University of Pennsylvania undergraduate application","Secondary school transcripts and school report","Counselor and teacher recommendations","Essays as the Penn application requires","English proficiency evidence where required","Financial aid application for international students by the aid deadline"]',
english_requirements = 'The programme sets no score of its own; the English requirement of the admitted Penn undergraduate programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from global.upenn.edu/isss/penn-world-scholars, the programme page, which publishes the mission, the statement that scholars are selected by the Office of Admissions at the time of admission on exceptional academic achievement, demonstrated leadership potential, financial need and long-term career aspirations, the statement that scholars come from every region of the world and may enrol in any of Penn four undergraduate schools in any subject, the statement that scholars also receive need-based financial aid from the University with a link to the Penn financial aid pages, the four-year programme structure with the mid-April welcome session, the summer cohort group, the first-year Intercultural Leadership Program and the reception, and the requirement to keep the international student office informed of academic plan changes; and from the same page current cohort listing, which names scholars from Brazil, Rwanda, Romania, Ghana, Kenya, Mongolia, Tunisia, South Korea and Kazakhstan among others. amount_usd_value is 0 and award_amount is NULL because Penn publishes no figure for this award: the money is the need-based package and the programme adds structure rather than a sum. CORRECTIONS: the row carried an invented USD 60,000 and a fixed January 5 deadline; it implied a separate application; it claimed bachelor, master and doctoral level although the programme is undergraduate; it invented an IELTS score and a GPA; and it gave no indication that selection happens during admission. eligible_countries is All because the programme is genuinely open to every region, which the cohort list on the same page supports.',
last_verified_at = '2026-10-26 05:00:00',
last_updated_at = '2026-10-26 05:00:00'
WHERE id = 33;

-- ---------------------------------------------------------------------------
-- 3. Award cards
-- ---------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-26 05:00:00'
FROM (VALUES
 (599, 'Cornell University Tata Scholarship (Indian citizens only)', 'Yes', 'Need-based', 'Full demonstrated need met through Cornell grants, work-study and reasonable loans, for Indian citizens only, up to eight semesters', true, true, 'A 25 million dollar endowment supporting about twenty Indian undergraduates at any one time', 'Indian citizens who attended secondary school in India. No separate application: file the Common Application and the CSS Profile with Cornell code 2098. Deadlines for autumn 2027: 1 November 2026 for Early Decision, 2 January 2027 for Regular Decision, 15 March 2027 for transfer. Cornell international admission is need-aware and meets 100 per cent of demonstrated need. A candidate from Uzbekistan is not eligible.', 'https://admissions.cornell.edu/apply/international-students/tata-scholarship', 'https://finaid.cornell.edu/first-year-and-transfer-students-international'),
 (530, 'Penn World Scholars (University of Pennsylvania)', 'Yes', 'Need-based', 'No published sum: the award is delivered as the University of Pennsylvania need-based financial aid package plus a four-year leadership programme', true, true, 'Open to every region, and the current cohort includes scholars from Brazil, Rwanda, Romania, Ghana, Kenya, Mongolia, Tunisia, South Korea and Kazakhstan', 'Undergraduate only, any of Penn four undergraduate schools and any subject. Selected by the Office of Admissions at the time of admission on academic achievement, leadership potential, financial need and career goals, so there is no separate application and no separate deadline. Apply for financial aid by the matching deadline because need is one of the criteria.', 'https://global.upenn.edu/isss/penn-world-scholars/', 'https://global.upenn.edu/isss/penn-world-scholars/')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
