-- ============================================================================
-- Scholarship rewrite pass 60 — United States, part 4
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Rows rewritten : 38 Johns Hopkins Hodson, 39 UC Berkeley Regents, 42 UChicago Odyssey
-- Cards updated  : 481, 482, 522
--
-- THE THREE CORRECTIONS THAT MATTER
--   1. NONE of the three has a separate application. All are automatic: Hopkins
--      awards at admission with no appeal; Berkeley considers every application;
--      UChicago considers every student who requests need-based aid.
--   2. Berkeley publishes 2,500 dollars a year as the honorary award and up to
--      full assessed need on top. The row said 25,000 dollars while its own
--      description said 2,500 — it contradicted itself.
--   3. Berkeley own brochure says international students ARE eligible for the
--      Regents and Chancellor Scholarship, while the same office general
--      international page says international students are ineligible for
--      institutional need-based aid. Both statements are recorded, because they
--      describe different things.
--
-- Pages read on 2026-10-26 (provider's own):
--   apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars
--     -> two awards, no separate application, applicant portal notification with
--        the admission decision, no appeal, 3.0 GPA renewal for the Trust award
--   financialaid.berkeley.edu/apply-now/international-students
--     -> international students ineligible for federal, state and need-based
--        institutional aid
--   financialaid.berkeley.edu/wp-content/uploads/FASO_250508_2026-Regents-and-
--     Chancellors-Brochure_WEB_a11y.pdf
--     -> "Incoming California residents, domestic non-residents, and
--        international students are eligible"; faculty interviews; CUSHFA decides
--   collegeadmissions.uchicago.edu/financial-support/scholarships
--   collegeadmissions.uchicago.edu/financial-support/financial-overview
--     -> Odyssey described; no separate application; international applicants
--        must request aid during admission; international transfers ineligible
--   college.uchicago.edu/odyssey and .../odyssey-scholarship-benefits-overview
--     -> guaranteed first-year Metcalf internship, 5,000 dollar minimum stipend,
--        international Odyssey aid set at the start of year one
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Johns Hopkins Hodson Scholars (38)
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Johns Hopkins Hodson Scholars (Trust and Gilliam Success Scholarships)',
coverage_type = 'Partial Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_period = 'year',
award_basis = 'variable',
deadline = 'No separate application and no separate deadline: every applicant for undergraduate admission is considered automatically, and scholarships are awarded with the admission decision',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'Hopkins awards all merit scholarships at the moment of admission and states that there is no appeal process, so the only date a candidate controls is the undergraduate application deadline for the round chosen.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Merit scholarship with a need-based sibling award, both awarded automatically',
tuition_coverage = 'Two separate awards sit inside one programme and Johns Hopkins does not publish a dollar figure for either. The Hodson Trust Scholarship goes to incoming first-year students for academic and personal achievement, leadership and engagement beyond the classroom, and is renewable for four years provided the student holds a 3.0 grade point average or higher. The Hodson-Gilliam Success Scholarship goes to incoming first-year students who show academic and personal achievement and also have financial need, is renewable for four years provided the student makes satisfactory academic progress and stays eligible for need-based aid, and replaces part of the usual first-year work-study expectation. The university describes the pair as covering a significant portion of the annual tuition cost; third-party summaries quote roughly 42,000 dollars a year for the Trust award, which is recorded here as a third-party estimate rather than as a published figure. Fewer than twenty freshmen a year receive a Hodson award. Recipients join the Hodson Scholars Program, which supplies a cohort, community-building events, mentoring, a leadership team and Baltimore service projects. A second, need-based route exists separately: since 2026-27 Hopkins charges no tuition to families earning up to 200,000 dollars and covers tuition, fees and living costs for families up to 100,000 dollars, and an admitted international student who applied for and received aid keeps that aid at the same level for all four years.',
accommodation = 'The Hodson scholarships are tuition awards; housing and dining are handled through the separate need-based aid package.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars/',
source_url = 'https://apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars/',
application_url = 'https://apply.jhu.edu/',
description = 'The Hodson award is real and it is Hopkins most visible merit scholarship, but the imported record captured it as a forty-thousand-dollar prize with a January 2 deadline, and both of those details are wrong. The university page describes two scholarships inside one programme, and the mechanism is what a candidate needs to understand. There is no separate application and no additional material: every student who applies for undergraduate admission is considered automatically for several merit scholarships, the decision arrives with the admission decision in the applicant portal, and Hopkins states that there is no appeal process. The Hodson Trust Scholarship recognises academic and personal achievement, leadership and engagement beyond the classroom, renews for four years at a 3.0 grade point average, and is the award described as the university most prestigious. The Hodson-Gilliam Success Scholarship is the hybrid: it recognises the same achievements but requires demonstrated financial need, renews for four years while the student makes satisfactory academic progress and stays eligible for need-based aid, and replaces part of the usual first-year work-study expectation. Hopkins says both cover a significant portion of annual tuition but publishes no figure, which is why this row carries none. Fewer than twenty freshmen a year are chosen, and all recipients join the Hodson Scholars Program, which adds a cohort, workshops, mentoring, a leadership team and service work in Baltimore. Two surrounding facts matter for a candidate from Uzbekistan. Hopkins separately runs a need-based aid promise from 2026-27 that removes tuition for families earning up to 200,000 dollars, and its financial aid FAQ warns that an international student who is not offered scholarship help in the first year cannot be considered for it later, so the moment of admission is the only chance. For families applying for that need-based route, the FAFSA and CSS Profile are required, and the Hodson-Gilliam award sits inside the same assessment.',
requirements = 'Apply for undergraduate admission to Johns Hopkins University through the normal route for the round intended, since every applicant is considered automatically for the Hodson awards and no separate form or additional material exists. Present a record of academic and personal achievement, leadership, and engagement beyond the classroom, which is the basis the university states for the Hodson Trust Scholarship, and carry a 3.0 grade point average if awarded, because that is the renewal condition. For the Hodson-Gilliam Success Scholarship, file the financial aid application as well, because that award requires demonstrated need, and understand that it replaces part of the first-year work-study expectation rather than adding to it. If international and applying for need-based aid, apply for that aid at the same time as the admission application: Hopkins states that an international student who is not offered scholarship help in the first year will not be eligible for it in any later year, while an international student who does receive aid keeps it at the same level for all four years. Expect the scholarship outcome in the applicant portal together with the admission decision, and note that there is no appeal.',
required_documents = '["Johns Hopkins undergraduate application","Secondary school transcript and school report","Counselor and teacher recommendations","English proficiency evidence where required","Financial aid application with FAFSA and CSS Profile where need-based aid or the Hodson-Gilliam award is sought"]',
english_requirements = 'The scholarships set no score of their own; the English requirement of the admitted Hopkins programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars, the university Hodson Scholars page, which publishes the two awards, the statement that there is no separate application and that all students who apply for undergraduate admission are automatically considered, the notification through the applicant portal with the admission decision, the absence of an appeal process, the 3.0 GPA renewal condition for the Hodson Trust Scholarship, the need condition and work-study substitution for the Hodson-Gilliam Success Scholarship, the description of both as covering a significant portion of annual tuition, the programme elements with the cohort, workshops, mentoring, leadership team and Baltimore service projects, and the note that private scholarships reduce summer savings and work-study expectations before need-based aid is adjusted. The figures of fewer than twenty freshmen a year and roughly 42,000 dollars a year come from the Hopkins student financial services page and from third-party summaries respectively and are recorded as such, not as published values. The 2026-27 tuition promise and the rule that an international student who was not offered aid in year one cannot receive it later come from apply.jhu.edu and sfs.jhu.edu pages of the same university. amount_usd_value is 0 and award_amount is NULL because Hopkins publishes no dollar figure for either Hodson award. CORRECTIONS: the row carried an invented USD 40,000 and a fixed January 2 deadline, implied a separate application, claimed bachelor, master and doctoral level although the awards are undergraduate, left eligible_countries empty and invented a description sentence; it also misspelled the programme as a single scholarship. The 3.0 renewal rule and the no-appeal rule are now stated, and the Hodson-Gilliam need-based sibling award is now described rather than omitted.',
last_verified_at = '2026-10-26 06:00:00',
last_updated_at = '2026-10-26 06:00:00'
WHERE id = 38;

-- ---------------------------------------------------------------------------
-- 2. UC Berkeley Regents and Chancellor's Scholarship (39)
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'UC Berkeley Regents'' and Chancellor''s Scholarship',
coverage_type = 'Partial Funding',
amount_usd_value = 2500,
award_amount = 2500,
award_currency = 'USD',
award_period = 'year',
award_basis = 'variable',
deadline = 'No separate scholarship deadline: every applicant to Berkeley is considered automatically, so the operative date is the UC admission application deadline for the term applied to, which falls at the end of November or the start of December',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'Berkeley reviews all applicants for this scholarship from the admission file, so there is no scholarship calendar of its own and the UC application deadline for the term governs. First-year candidates interview with faculty from late February, and decisions are released in late March with admission notifications.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Institutional merit scholarship with a need-based component',
tuition_coverage = 'The scholarship carries a monetary award that renews annually for up to eight semesters for students entering from high school and up to four semesters for transfer students. Scholars without demonstrated financial need receive a 2,500 dollar honorary award each year; scholars with need receive a scholarship set by the Financial Aid and Scholarships Office that can reach their full assessed need. Beyond money, scholars receive priority class enrolment, guaranteed on-campus housing for the duration of the award, and a designated faculty mentor. Berkeley own brochure states explicitly that incoming California residents, domestic non-residents and international students are all eligible, which matters because the same office general international page says that international students are ineligible for federal, state and need-based institutional aid: the honorary 2,500 dollars and the merit side of this award remain open to an international student, while the need-based top-up depends on the assessment.',
accommodation = 'Guaranteed on-campus housing for the duration of the scholarship is one of the named benefits, alongside priority class enrolment and a faculty mentor.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://financialaid.berkeley.edu/regents-and-chancellors-scholarship',
source_url = 'https://financialaid.berkeley.edu/wp-content/uploads/FASO_250508_2026-Regents-and-Chancellors-Brochure_WEB_a11y.pdf',
application_url = 'https://apply.berkeley.edu/',
description = 'The imported record priced the Regents and Chancellor Scholarship at twenty-five thousand dollars and described it as 2,500 dollars plus perks, which managed to be both too high and imprecise at the same time. What Berkeley actually publishes is a scholarship with a merit core and a need-based top-up. Every scholar receives a monetary award that renews for up to eight semesters from high school entry or four from transfer entry. A scholar without demonstrated financial need receives a 2,500 dollar honorary award each year; a scholar with need receives an award set by the Financial Aid and Scholarships Office that can reach the full assessed need. The benefits beyond the money are the part students actually notice: priority class enrolment, guaranteed on-campus housing for the duration of the award, and a designated faculty mentor. Selection is by holistic review of the admission file plus, for first-year candidates, a one-on-one faculty interview, and there is no separate scholarship application. The eligibility point is worth stating carefully because Berkeley own pages appear to contradict each other. The general financial aid page for international students says that international students are ineligible for federal, state and need-based institutional aid, and that is true for the central need-based programmes. But the scholarship own brochure says that incoming California residents, domestic non-residents and international students are eligible, and Berkeley lists international Regents scholars among its cohorts. The practical reading is that an international student can be named a Regents and Chancellor scholar and can receive the honorary award and the non-cash benefits, while any need-based top-up depends on what the Financial Aid and Scholarships Office can assess without federal aid. The calendar is published: first-year candidates are invited to interview after early admission in February, interviews run from late February to early March, and decisions are released in late March with the admission decisions.',
requirements = 'Apply for undergraduate admission to UC Berkeley through the University of California application by its deadline for the term intended, since consideration for the scholarship is automatic from that file and there is no separate scholarship form. Be an entering first-year or transfer student; Berkeley states that incoming California residents, domestic non-residents and international students are all eligible. Present a record that stands out for creativity, leadership, service and strong convictions, which is what the holistic review looks for. If invited as a first-year candidate, attend the one-on-one faculty interview, which takes place after early admission in February and runs into early March, and consider the Regents Overnight Host Program. To be assessed for the need-based portion, file the financial aid application Berkeley requires: the FAFSA or California Dream Act application for those eligible, and understand that international students are not eligible for federal or state aid, so any top-up depends on what the Financial Aid and Scholarships Office can assess. Keep satisfactory academic progress and the programme standards to renew the award for up to eight semesters, or four as a transfer student.',
required_documents = '["University of California undergraduate application","Secondary school transcripts and examination results","Personal insight questions as the UC application requires","Letters of recommendation where the campus or programme requests them","Financial aid application where the need-based portion is sought","Faculty interview attendance if invited"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Berkeley programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from financialaid.berkeley.edu/wp-content/uploads/FASO_250508_2026-Regents-and-Chancellors-Brochure_WEB_a11y.pdf, the official 2026 Regents and Chancellor Scholarship brochure, which states that incoming California residents, domestic non-residents and international students are eligible, that candidates entering from high school interview one-on-one with Berkeley faculty as part of a holistic review, that transfer candidates are reviewed by faculty from admission files in early May, and that awarding is decided by the Committee on Undergraduate Scholarships, Honors, and Financial Aid; and from financialaid.berkeley.edu/apply-now/international-students, the international students page, which states that international students are ineligible for federal, state and need-based university financial aid and that only US citizens, eligible non-citizens and AB 540 students can receive federal, state or institutional need-based aid. The 2,500 dollar honorary award, the full-need top-up, the eight-semester and four-semester tenures, the priority enrolment, guaranteed housing and faculty mentor, and the late February to late March interview and decision calendar come from the same scholarship brochure and the financial aid scholarship pages. Both statements are recorded rather than reconciled, because they describe different things: eligibility for the scholarship and eligibility for federal need-based aid. CORRECTIONS: the row carried an invented USD 25,000 while its own description said 2,500 dollars, so the row contradicted itself; it gave a fixed 30 November date as though a scholarship deadline existed; it left eligible_countries empty; and it listed degree levels as a bare Bachelor string rather than the app canonical Bachelor''s. award_amount now carries the published 2,500 dollar honorary minimum and amount_usd_value the same figure, since that is the only sum Berkeley publishes.',
last_verified_at = '2026-10-26 06:00:00',
last_updated_at = '2026-10-26 06:00:00'
WHERE id = 39;

-- ---------------------------------------------------------------------------
-- 3. UChicago Odyssey Scholarship (42)
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
title = 'University of Chicago Odyssey Scholarship',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_period = 'year',
award_basis = 'need_based',
deadline = 'No separate application: every student who applies for need-based financial aid is considered automatically, so the operative date is the financial aid deadline that matches the admission round, and for applicants who are not US citizens or permanent residents the aid request must be made during the admission process itself',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'UChicago states that all students who apply for need-based financial aid are automatically considered for the Odyssey programme and that there is no separate application; international applicants must request aid during the admission process, and international transfer applicants are not eligible for aid at all.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Need-based grant programme for lower-income and first-generation students',
tuition_coverage = 'UChicago meets one hundred per cent of demonstrated need in grants rather than loans for every admitted student, and the Odyssey Scholarship is the programme through which much of that support reaches students from lower-income families or students who are the first in their family to attend college. Odyssey Scholars receive university scholarship and grant funding that does not have to be repaid, are not expected to borrow in their aid package, receive funding for study abroad covering programme and administrative fees, housing, meals and a stipend towards airfare, and have the University health insurance plan paid by Odyssey funds. The programme also guarantees a paid summer internship through the Jeff Metcalf Internship Program in the first year, with a minimum stipend of five thousand dollars for full-time Metcalf internships, and adds specialised advising, programming and career support. Separately, every first-generation student at UChicago receives a minimum of twenty thousand dollars in scholarship funding across four years, which complements any need-based aid. The university does not publish a single Odyssey figure because the award is whatever the family circumstances produce against the cost of attendance.',
accommodation = 'Housing and meals are inside the cost of attendance that the need-based grant meets; study abroad housing costs are additionally covered for Odyssey Scholars.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://collegeadmissions.uchicago.edu/financial-support/scholarships/',
source_url = 'https://financialaid.uchicago.edu/undergraduate/how-aid-works/types-of-aid/scholarships/',
application_url = 'https://collegeadmissions.uchicago.edu/financial-support/financial-overview/',
description = 'UChicago does run the Odyssey programme, and the imported record turned it into a sixty-thousand-dollar scholarship with a January 4 deadline, which misses the point in a way that matters for a student from Uzbekistan. Odyssey is not an award a candidate applies for: it is the name UChicago gives to the enhanced support that flows through its need-based aid system to students from lower-income families and to students who are the first in their family to attend college. The university states that all students who apply for need-based financial aid are automatically considered and that there is no separate application. The money itself is a grant that does not have to be repaid, and UChicago meets one hundred per cent of demonstrated need in grants rather than loans for every admitted student. What Odyssey adds on top of the core grant is practical: funding for study abroad that covers programme and administrative fees, housing, meals and a stipend towards airfare; payment of the University health insurance plan; a guaranteed paid summer internship through the Jeff Metcalf Internship Program after the first year, with a minimum stipend of five thousand dollars for full-time Metcalf placements; and specialised advising, programming and career support. A separate first-generation guarantee sits alongside it: every student who is the first in their family to attend college receives at least twenty thousand dollars in scholarship funding across four years, on top of any need-based aid. Two rules decide who can use this. International applicants must request financial aid during the admission process itself, and UChicago is need-aware for international students, so asking for aid is a factor in the admission decision. International transfer applicants are not eligible for financial aid at all. And once admitted, an international Odyssey Scholar has the aid set at the start of the first year rather than recalculated annually, which is a meaningful protection in a country where costs rise every year.',
requirements = 'Apply for undergraduate admission to the University of Chicago in the round intended, and for applicants who are not US citizens or permanent residents, request need-based financial aid during that admission process, because UChicago states that international students must apply for aid at that point and that international transfer applicants are not eligible for aid at all. Complete the aid forms the university requires; for non-US citizens and non-permanent residents the International Student Financial Aid Worksheet is the only form available and it is submitted through the UChicago Account. Because consideration for Odyssey is automatic once need-based aid is requested, no separate scholarship application or essay is required. Understand that UChicago is need-aware for international applicants, so the aid request is weighed alongside the application itself. Expect the award to be a grant rather than a loan, to include study-abroad funding, health insurance and a guaranteed first-year summer internship with a minimum stipend of five thousand dollars, and to be set at the start of the first year rather than recalculated annually for international students. First-generation students should also expect at least twenty thousand dollars in scholarship funding across four years, which stacks with need-based aid.',
required_documents = '["University of Chicago undergraduate application and UChicago supplement","Secondary school transcripts and school report","Counselor and teacher recommendations","English proficiency evidence where required","International Student Financial Aid Worksheet submitted through the UChicago Account, for applicants who are not US citizens or permanent residents","Supporting income documentation as the aid office requests"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted UChicago programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from collegeadmissions.uchicago.edu/financial-support/scholarships, which publishes the Odyssey programme as support for students from lower-income families or the first in their families to attend college, the statement that Odyssey Scholars are selected on the basis of financial need and family circumstances and that students must apply for need-based financial aid to be considered, the no-loan grant structure, the study abroad funding for programme and administrative fees, housing, meals and airfare, and the payment of the University health insurance plan; from collegeadmissions.uchicago.edu/financial-support/financial-overview, which states that all students who apply for need-based financial aid are automatically considered with no separate application, that UChicago meets 100 per cent of demonstrated need in grants rather than loans, that undocumented and international students are considered, and that international transfer applicants are not eligible for financial aid; from college.uchicago.edu/odyssey, which publishes the guaranteed first-year Metcalf internship and the five thousand dollar minimum stipend for full-time Metcalf internships; and from college.uchicago.edu/student-services/odyssey-scholarship-benefits-overview, which states that financial aid for international Odyssey Scholars is set only at the beginning of the first year. The twenty thousand dollar first-generation guarantee comes from the UChicago scholarships and no-barriers financial aid pages. amount_usd_value is 0 and award_amount is NULL because the Odyssey award is a need-based grant whose size depends on family circumstances and the published cost of attendance, so no single sum exists to store. CORRECTIONS: the row carried an invented USD 60,000 and a fixed January 4 deadline, implied a separate application, left eligible_countries empty, used a bare Bachelor string rather than the canonical Bachelor''s, and omitted the internship, the study-abroad funding, the health-insurance payment and the international-aid restriction that make the programme what it is.',
last_verified_at = '2026-10-26 06:00:00',
last_updated_at = '2026-10-26 06:00:00'
WHERE id = 42;

-- ---------------------------------------------------------------------------
-- 4. Award cards
-- ---------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = 'Yes', funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = true, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-26 06:00:00'
FROM (VALUES
 (481, 'Johns Hopkins Hodson Scholars (Trust and Gilliam Success Scholarships)', 'Merit and need-based', 'No published figure: Hopkins describes the award as covering a significant portion of annual tuition', false, 'Awarded automatically with the admission decision, with a 3.0 GPA renewal and no appeal process', 'Undergraduate only, and fewer than twenty freshmen a year receive it. Two awards sit inside the programme: the Hodson Trust Scholarship on merit, renewable at a 3.0 GPA, and the Hodson-Gilliam Success Scholarship which also requires demonstrated financial need. No separate application; the decision arrives in the applicant portal with the admission decision.', 'https://apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars/', 'https://apply.jhu.edu/tuition-aid/types-of-financial-aid/need-based-scholarships/hodson-scholars/'),
 (482, 'UC Berkeley Regents'' and Chancellor''s Scholarship', 'Merit and need-based', '2,500 dollars a year honorary for scholars without need, or up to full assessed need for those with need', true, 'Priority class enrolment, guaranteed on-campus housing and a faculty mentor alongside the money', 'Entering first-year and transfer students, and Berkeley own brochure states that California residents, domestic non-residents and international students are all eligible. Automatic consideration from the admission file with no separate form; first-year candidates interview with faculty after early admission and decisions come in late March. International students cannot receive federal or state need-based aid, so any top-up depends on the campus assessment.', 'https://financialaid.berkeley.edu/regents-and-chancellors-scholarship', 'https://financialaid.berkeley.edu/wp-content/uploads/FASO_250508_2026-Regents-and-Chancellors-Brochure_WEB_a11y.pdf'),
 (522, 'University of Chicago Odyssey Scholarship', 'Need-based', 'One hundred per cent of demonstrated need met in grants and not loans, plus study-abroad funding, health insurance and a guaranteed first-year internship', true, 'The loan-free grant route for lower-income and first-generation students, and it covers study abroad and health insurance too', 'Undergraduate only, and consideration is automatic once need-based aid is requested: there is no separate Odyssey application. International applicants must request aid during the admission process and UChicago is need-aware for them, while international transfer applicants are not eligible for aid at all. For international Odyssey Scholars the aid is set at the start of the first year rather than recalculated annually.', 'https://collegeadmissions.uchicago.edu/financial-support/scholarships/', 'https://financialaid.uchicago.edu/undergraduate/how-aid-works/types-of-aid/scholarships/')
) AS v(id, nm, ft, mx, cl, va, en, ou, su)
WHERE u.id = v.id;
