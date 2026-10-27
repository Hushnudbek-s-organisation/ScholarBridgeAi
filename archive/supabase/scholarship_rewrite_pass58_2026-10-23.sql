-- ============================================================================
-- Scholarship rewrite pass 58 — United States doctoral funding, part 2
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- 29 rows rewritten. Two of them (Princeton, Rice) were verified against the
-- university own published stipend rates. The other 27 were rewritten to the
-- correct MECHANISM with no invented figure, and are flagged source_reliability 5
-- so the next pass knows to fetch each university funding page.
--
-- Verified against the provider's own pages on 2026-10-26:
--   gradschool.princeton.edu/financial-support/financial-support-model/
--     funding-calendar-university-rates-costs
--   2026-27 rates: University Fellowship 12 months 52,680; First Year Fellowship
--     Natural Sciences and Engineering 10 months 46,200; Research Assistantship
--     10 months 46,200; summer 2 months up to 9,240; Teaching Assistantship
--     10 months 48,510
--   gradschool.princeton.edu/financial-support -> guaranteed full funding for all
--     PhD students during regular enrollment, generally five years
--   graduate.rice.edu/admissions/costofstudy -> doctoral stipends about
--     36,000-40,000 a year, department-set; tuition 2026-2027 66,784
--   graduate.rice.edu/admissions/application-faq -> "There is no separate
--     application needed for this financial support; the only application needed
--     is your application for graduate study."
--
-- THE PATTERN BEING CORRECTED. Every one of the 29 rows carried a round figure
-- between 62,000 and 79,000 dollars and the same "December 15 annually" deadline,
-- with a bare-domain source_url and a one-line requirement. In the United States
-- doctoral funding is a package stated in the admission offer, not a fellowship a
-- candidate applies for separately, and the stipend is set department by
-- department and restated every year.
-- ============================================================================

-- (The two verified rows and the 27 mechanism rows were applied in this order:
--  ids 126 and 334 first with their published stipend rates, then the remaining
--  27 in one statement. The statements are reproduced below in the same order.)

-- ---------------------------------------------------------------------------
-- 1. Princeton (126) — verified, stipend 52,680 for 12 months in 2026-27
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Princeton University Graduate Fellowship (all PhD students fully funded)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = 52680,
award_currency = 'USD',
award_period = 'year',
award_basis = 'full_tuition',
deadline = 'The graduate application deadline of the department applied to, which Princeton publishes on each programme page and which falls between 1 December and early January for autumn entry',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'Princeton has no separate fellowship deadline: funding is decided with admission, and the operative date is the programme own graduate application deadline, published per department.',
expected_opening_period = NULL,
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Guaranteed university funding package for every enrolled PhD student',
tuition_coverage = 'Princeton guarantees full funding to every degree-seeking PhD student during their regular enrollment period, contingent on satisfactory academic progress, and the defined programme length is generally five years with a few four-year exceptions. The package is full tuition plus the student health plan fee plus a base stipend, delivered through a mix of fellowship, research assistantship and teaching assistantship money rather than as one named award. The 2026-27 published rates are: University Fellowship for twelve months 52,680 dollars in the humanities and social sciences; First Year Fellowship in the natural sciences and engineering 46,200 dollars for ten months; Research Assistantship 46,200 dollars for ten months; Teaching Assistantship 48,510 dollars for ten months; and summer fellowship or research assistantship up to 9,240 dollars for two months. Because the university funds its doctoral students it does not evaluate financial need or ask for the FAFSA at admission.',
accommodation = 'Living costs are paid from the stipend; Princeton publishes an annual cost-of-living estimate that the base stipend is designed to exceed.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://gradschool.princeton.edu/financial-support',
source_url = 'https://gradschool.princeton.edu/financial-support/financial-support-model/funding-calendar-university-rates-costs',
application_url = NULL,
description = 'Princeton does fund every PhD student in full, but the imported record turned that guarantee into a named fellowship worth seventy-nine thousand dollars with a December 15 deadline, and all three of those details are wrong. The truth is better and more specific. Princeton guarantees full funding to every degree-seeking doctoral student for the whole of their regular enrollment period, generally five years, subject to satisfactory academic progress, and the money arrives as a mix of fellowship, research assistantship and teaching assistantship support rather than as a single award a candidate can apply for separately. What the package contains is full tuition, the student health plan fee, and a base stipend intended to cover the estimated living costs of a single graduate student. The 2026-27 rates are published to the dollar: a twelve-month University Fellowship of 52,680 dollars in the humanities and social sciences, a ten-month First Year Fellowship of 46,200 dollars in the natural sciences and engineering, a Research Assistantship at 46,200 dollars for ten months, a Teaching Assistantship at 48,510 dollars for ten months, and up to 9,240 dollars for two summer months of research. The mechanism matters for a candidate from Uzbekistan: there is no separate fellowship application at all, the only application is the graduate programme application, and the operative deadline is whatever that department publishes, which typically falls between 1 December and early January. Princeton is also unusual in that, because it funds its doctoral students, it does not evaluate financial need and does not ask for the FAFSA at admission.',
requirements = 'Apply to a Princeton PhD programme through the Graduate School, since the funding is awarded with admission and there is no separate fellowship form. Submit the application by the deadline published on the programme page, which usually falls between 1 December and early January for autumn entry. Meet the programme own academic entry requirements; Princeton does not require the FAFSA or a financial need assessment from doctoral applicants because it funds them. Expect the offer to describe a funding package rather than a named scholarship, covering full tuition, the student health plan fee and a base stipend, and expect the stipend to be delivered through a combination of fellowship, research assistantship and teaching assistantship money across the years. Keep satisfactory academic progress, which is the condition of continued funding, and note that the standard funded period is generally five years with some four-year programmes.',
required_documents = '["Princeton graduate programme application","Academic transcripts","Statement of academic purpose","Three recommendation letters","Writing sample or research proposal as the department requires","English proficiency scores where required"]',
english_requirements = 'The funding sets no score of its own; the English requirement of the admitted Princeton programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from gradschool.princeton.edu/financial-support/financial-support-model/funding-calendar-university-rates-costs, which publishes the 2026-27 rates of 52,680 dollars for a twelve-month University Fellowship, 46,200 dollars for a ten-month First Year Fellowship in the natural sciences and engineering, 46,200 dollars for a ten-month Research Assistantship, 9,240 dollars for two summer months and 48,510 dollars for a ten-month Teaching Assistantship; and from gradschool.princeton.edu/financial-support and its financial support model pages, which state that Princeton guarantees full funding to every degree-seeking PhD student throughout regular enrollment, generally five years with some four-year programmes, comprising full tuition, the student health plan fee and a base stipend, delivered through a mix of fellowship and assistantship support, and that the university does not evaluate need or ask for the FAFSA at admission. A departmental page reports 55,440 dollars for the 2026-27 molecular biology stipend, which is consistent with the published range of 52,680 to 55,440 at the top end; this row stores the university-wide twelve-month fellowship rate. award_amount carries the verified 52,680 dollar twelve-month fellowship rate; amount_usd_value is 0 because the total package differs by division and by year and is not a single published award sum. CORRECTIONS: the row was titled Princeton Graduate Fellowship Package and carried an invented 79,000 dollars; it gave a fixed December 15 deadline although the deadline is the department own; it invented an IELTS score and a GPA; and its source_url was the bare domain princeton.edu rather than the funding page.',
last_verified_at = '2026-10-26 04:00:00',
last_updated_at = '2026-10-26 04:00:00'
WHERE id = 126;

-- ---------------------------------------------------------------------------
-- 2. Rice (334) — verified, stipend 37,000; no separate application
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Rice University Graduate Fellowship (PhD funding package)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = 37000,
award_currency = 'USD',
award_period = 'year',
award_basis = 'full_tuition',
deadline = 'The graduate programme deadline of the department applied to, which Rice publishes per programme and which clusters between 1 December and mid-January for autumn entry',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'Rice states plainly that there is no separate application for doctoral financial support: the only application is the application for graduate study, so the programme deadline is the operative date.',
expected_opening_period = NULL,
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Departmental fellowship and assistantship package for admitted PhD students',
tuition_coverage = 'Rice funds its doctoral students through a combination of a tuition waiver, a graduate fellowship or assistantship stipend, and in most departments a health insurance subsidy. Rice publishes the range rather than a single figure: doctoral stipends run from about 36,000 to 40,000 dollars a year depending on the department, with the university graduate fellowship quoting a minimum of 36,000 dollars over twelve months, ecology and evolutionary biology 37,000 dollars for 2026-27, philosophy 37,000 dollars, religion 37,000 dollars, psychology at 36,000 dollars for students entering in 2025, the biosciences professional programme 40,500 dollars for 2026-27 and the business school 43,000 dollars. Tuition for 2026-2027 is published at 66,784 dollars, and a tuition waiver is granted in an amount equal to that. Students who hold a competitive external fellowship are typically offered full tuition support as well.',
accommodation = 'Living costs come from the stipend. Rice notes that Houston has the lowest median housing costs among the top twenty US metropolitan areas, which is why the stipend stretches further than at coastal universities.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://graduate.rice.edu/admissions/costofstudy',
source_url = 'https://graduate.rice.edu/admissions/costofstudy',
application_url = NULL,
description = 'Rice does fully fund its doctoral students, and the imported record got the existence of the funding right while getting the mechanism and the figure wrong. The important correction is mechanical: Rice states in its own admissions FAQ that there is no separate application for this financial support, and that the only application needed is the application for graduate study. So a candidate does not hunt for a fellowship form; the funding arrives with the admission offer, and the operative deadline is the programme own application deadline, which clusters between 1 December and mid-January. The package is a tuition waiver plus a stipend plus, in most departments, a health insurance subsidy, and the stipend is set department by department rather than centrally. Rice publishes the range: roughly 36,000 to 40,000 dollars a year, with the university graduate fellowship quoting a minimum of 36,000 dollars over twelve months, the ecology and evolutionary biology programme and several humanities departments at 37,000 dollars for 2026-27, the biosciences professional programme at 40,500 dollars, and the business school at 43,000 dollars. Tuition for 2026-2027 is 66,784 dollars and the waiver is granted in an amount equal to it. Two practical points are worth keeping. First, most students receive commitments for five years, contingent on good standing and satisfactory progress. Second, Rice waives the doctoral application fee for graduates of institutions in Texas and four bordering states and, for the 2027 term, ran a fee waiver open to all eligible domestic and international applicants in October and November.',
requirements = 'Apply to a Rice doctoral programme through the graduate admissions portal, since Rice states that there is no separate application for financial support and the graduate application is the only form required. Submit by the programme own deadline, which most departments set between 1 December and mid-January for autumn entry. Meet the programme academic requirements, including a cumulative GPA of at least 3.0 on the 4.0 scale or the equivalent where the department states one, and submit English test scores such as TOEFL, IELTS or Duolingo by the application deadline. Note that some departments accept a three-year bachelor degree directly into the PhD without a master, and that funding offers are typically for five years, contingent on satisfactory progress and good standing. Check whether the doctoral application fee can be waived, because Rice waives it for graduates of institutions in Texas and four bordering states and ran an open waiver period for the 2027 term.',
required_documents = '["Rice graduate programme application through gradadmissions.rice.edu","Official transcripts from previous institutions","Statement of purpose","Three recommendation letters","English proficiency scores where required","Department-specific writing sample or portfolio where asked"]',
english_requirements = 'The funding sets no score of its own; the English requirement of the admitted Rice programme applies, and scores such as TOEFL, IELTS or Duolingo may be submitted after the initial application opens as long as they arrive by the programme deadline.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from graduate.rice.edu/admissions/costofstudy, the university financial support page, which publishes the tuition waiver mechanism, the departmental stipend range of about 36,000 to 40,000 dollars a year and the 2026-2027 tuition figure; from graduate.rice.edu/admissions/application-faq, which states that there is no separate application for doctoral financial support and that the only application needed is the application for graduate study; and from departmental pages of the same university, which publish the annual stipend for 2026-27 as 37,000 dollars in ecology and evolutionary biology, philosophy and religion, 40,500 dollars in the biosciences professional programme, 43,000 dollars in the business school and 36,000 dollars in psychology and the university graduate fellowship minimum. The five-year commitment and the fee waiver rules come from the same family of pages. award_amount carries the 37,000 dollar stipend published by the largest number of Rice departments, and the range is stated in tuition_coverage so a candidate can see that the figure is department-set; amount_usd_value is 0 because the package as a whole differs by department and year. CORRECTIONS: the row was titled Rice University Doctoral Fellowship Package and carried an invented 68,000 dollars; it gave a fixed December 15 deadline although Rice has no separate funding deadline; it invented an IELTS score and a GPA while the real threshold is a 3.0 cumulative GPA where stated; and its source_url was the bare domain rice.edu rather than the funding page.',
last_verified_at = '2026-10-26 04:00:00',
last_updated_at = '2026-10-26 04:00:00'
WHERE id = 334;

-- ---------------------------------------------------------------------------
-- 3. The remaining 27 rows — correct mechanism, no invented figure
--    ids: 105 108 114 115 116 120 125 127 136 138 148 150 306 308 315 320
--         329 330 332 335 336 338 340 347 354 357 366
--    Each was set to: coverage_type Full Funding, amount_usd_value 0,
--    award_amount NULL, currency USD, deadline_type not_published with the
--    programme-deadline rule, degree_levels ["PhD"], source_reliability 5, and a
--    notes field stating exactly what was and was not verified. The full
--    statement is in the applied SQL file; the shape is identical for all 27 and
--    the two verified rows above show the target form.
-- ---------------------------------------------------------------------------
