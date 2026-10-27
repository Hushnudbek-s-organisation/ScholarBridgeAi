-- ============================================================================
-- Scholarship rewrite pass 57 — United States, part 1
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Row rewritten : 5 Knight-Hennessy Scholars
-- Rows retired  : 21, 24, 35, 45   (duplicates of 1, 10, 803, 815)
--                 456, 460, 462, 464, 475, 480  (the six-university
--                 "International Excellence Scholarship" template)
-- Cards        : 3 updated; 528, 5, 17, 13, 524, 501, 505, 526, 657, 506 -> No
--
-- Pages read on 2026-10-26:
--   knight-hennessy.stanford.edu/admission  -> "The KHS application to join the
--     2027 cohort is now closed. The KHS application to join the 2028 cohort
--     will open in June 2027."
--   knight-hennessy.stanford.edu/admission/before-you-apply  -> eligibility,
--     criteria, separate concurrent Stanford application
--
-- THE SIX-UNIVERSITY TEMPLATE. Six rows at six unrelated universities carried the
-- same award title, the same 25,000 dollar value, the same not-published
-- deadline and the same description shape. This pass retires all six. Where the
-- catalogue already holds a verified award for the same university it points at
-- it: 694 UC Davis Regents, 702 UCSD Regents/Triton, 706 UMass international
-- first-year merit awards.
--
-- Duplicate retirements follow the rule used through the arc: one programme, one
-- row. Where two rows carried different invented figures for the same aid
-- programme, the older and thinner row is retired and the surviving row cited.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Knight-Hennessy (id 5)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Knight-Hennessy Scholars (Stanford University)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_period = 'year',
award_basis = 'full_tuition',
deadline = 'The 2027 cohort application is closed; the application for the 2028 cohort opens in summer 2027, and the deadline falls in October of the year before entry',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'Stanford opens the Knight-Hennessy application in the summer and closes it in October of the year before entry, alongside a separate application to the Stanford degree programme. The 2027 cohort round has closed and the 2028 round opens in summer 2027.',
expected_opening_period = 'The 2028 cohort application opens in summer 2027.',
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully endowed graduate fellowship covering tuition, living costs, travel and relocation',
tuition_coverage = 'The fellowship pays tuition and associated fees in full for up to three years of graduate study in any Stanford school, plus a stipend for living and academic expenses covering room and board, books, supplies, instructional materials, local transportation and reasonable personal expenses, plus an annual travel stipend for one economy-class round trip to Stanford, a one-time relocation stipend in the first year, and health insurance. Where the degree runs longer than three years, which is usual for a PhD, the Stanford department funds the remaining years under its standard commitment. Scholars in the second and third years may also apply for academic enrichment funds such as conference travel, and the programme runs a Global Impact Fund that can make grants of up to 100,000 dollars to scholars launching ventures. Stanford does not publish the stipend amount, so this record carries no figure rather than an invented one.',
accommodation = 'Room and board are covered by the living and academic expenses stipend rather than paid separately.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://knight-hennessy.stanford.edu/admission',
source_url = 'https://knight-hennessy.stanford.edu/admission',
application_url = 'https://apply.knight-hennessy.stanford.edu/portal/admission-events',
description = 'Knight-Hennessy is real and it is the largest fully endowed graduate fellowship in the world, but the imported record reduced it to a ninety-thousand-dollar figure and an October 9 deadline, and it left out the two features that decide whether an applicant can even be considered. The programme is at Stanford and it funds any full-time graduate degree in any of the university seven schools, which for the catalogue matters because it covers master and doctoral study across disciplines rather than one faculty. It is open to citizens and residents of all countries, with no age limit. The support has several moving parts: full tuition and associated fees for up to three years, a stipend for living and academic expenses that covers room and board, books, supplies, local transport and reasonable personal expenses, an annual travel stipend for one economy-class round trip to Stanford, a one-time relocation stipend on arrival, and health insurance. Where the degree runs longer than three years, which is normal for a PhD, the Stanford department picks up the remaining years under its standard commitment, and scholars in years two and three can apply for academic enrichment funds such as conference travel. Stanford does not publish the stipend amount, which is why this row carries no dollar figure. The mechanics are the part the imported row got wrong. There are two separate applications, one to Knight-Hennessy and one to the Stanford degree programme, and both have to be made; the programme also runs a leadership development component, the King Global Leadership Program, which is part of the offer rather than an optional extra. The calendar has also moved: the application for the 2027 cohort is closed and the round for the 2028 cohort opens in summer 2027, with the deadline in October of the year before entry.',
requirements = 'Apply separately to Knight-Hennessy Scholars and to a full-time Stanford graduate degree programme, since the two applications are distinct and both are required. Hold a first bachelor degree or its equivalent, earned within the window the programme publishes for the cohort being applied for; the programme states the graduation cut-off for each cycle and applies an earlier cut-off to applicants with military service. Be a citizen or resident of any country, including applicants who are undocumented or stateless, since the programme places no nationality restriction and sets no age limit. Apply inside the published window for the cohort intended; the 2027 round is closed and the 2028 round opens in summer 2027. Show the qualities the programme states it selects for, which centre on independence of thought, purposeful leadership and a civic mindset rather than on a formula of scores and titles. Plan for the leadership component of the programme, which runs alongside the degree rather than after it.',
required_documents = '["Knight-Hennessy Scholars application through the programme portal","Separate Stanford graduate degree application","Academic transcripts and degree certificates","Essays and short answers as the application specifies","Two or more recommendation letters","Evidence of leadership and civic engagement"]',
english_requirements = 'The fellowship sets no score of its own; the English requirement of the admitted Stanford graduate programme applies, and Stanford graduate admissions publishes its own minimums per programme.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-26 from knight-hennessy.stanford.edu/admission and knight-hennessy.stanford.edu/admission/before-you-apply, which state that the application to join the 2027 cohort is closed and that the 2028 cohort application opens in summer 2027, and which describe the eligibility, criteria and separate concurrent application to the Stanford degree programme. The funding structure is described in the programme own terms on the same site and in the Stanford school pages that link to it: tuition and associated fees for up to three years, a stipend for living and academic expenses, an annual travel stipend, a one-time relocation stipend, and health insurance, with the remaining years of a longer degree funded by the home department. amount_usd_value is 0 and award_amount is NULL because Stanford does not publish the stipend amount and the tuition varies by school, so a figure would have to be invented; award_currency is USD because the award is denominated in dollars. CORRECTIONS: the row carried an invented USD 90,000 with award_amount 90,000; it gave a fixed October 9 deadline with no year and no mention that the 2027 round is closed; it claimed bachelor, master and doctoral level although the fellowship is for graduate study only, which in US usage means master and doctoral; it invented an IELTS score and a GPA; and it did not mention the separate Stanford application or the leadership programme.',
last_verified_at = '2026-10-26 03:00:00',
last_updated_at = '2026-10-26 03:00:00'
WHERE id = 5;

-- ----------------------------------------------------------------------------
-- 2. Ten retirements: four duplicates and the six-university template
-- ----------------------------------------------------------------------------
UPDATE scholarships s SET
is_active = false,
title = v.nm,
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_basis = 'variable',
deadline = v.dl,
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
min_ielts = NULL,
min_gpa = NULL,
source_reliability = 3,
notes = v.nt
FROM (VALUES
 (21, 'MIT Financial Aid - Full Need Met (retired duplicate, see id 1)', 'No separate deadline: this row duplicated the MIT need-based aid recorded at id 1', 'RETIRED 2026-10-26 as a duplicate of id 1, MIT Need-Based Financial Aid (SFS Program). Both rows describe the same MIT undergraduate financial aid programme, which meets full demonstrated need, and both present it as an award with a dollar value. The duplicate carried a different invented figure, 60,000 dollars against the 86,000 in id 1, which is the clearest evidence that neither number was a published value: MIT publishes an aid calculator and average package statistics, not a single award sum. The title of this row also invented a programme name, Full Need Met, which is a description rather than an award title. Id 1 is kept as the record and this row is retired so that no candidate is offered two different values for the same aid.'),
 (24, 'Harvard Financial Aid Initiative (retired duplicate, see id 10)', 'No separate deadline: this row duplicated the Harvard need-based undergraduate aid recorded at id 10', 'RETIRED 2026-10-26 as a duplicate of id 10, Harvard University Scholarship (Need-Based Undergraduate Aid). Both rows describe Harvard undergraduate need-based aid, and both attach a different invented figure to it, 70,000 dollars here against 82,000 in id 10, which is why neither is trusted as a value. The Financial Aid Initiative is the name Harvard used for the programme that removed loans from aid packages for lower and middle income families, not the name of a separate award, so presenting it as a second scholarship was wrong twice over. Id 10 is kept as the record and this row is retired.'),
 (35, 'Yale Need-Based Financial Aid (retired duplicate, see id 803)', 'No separate deadline: this row duplicated the Yale need-blind aid recorded at id 803', 'RETIRED 2026-10-26 as a duplicate of id 803, Yale Need-Based Financial Aid (Need-Blind), which was written later and carries the actual aid deadlines of 1 November 2026 for US Early Action, 1 December 2026 for international Early Action and 15 February 2027 for Regular Decision, together with a figure of 75,220 dollars that at least corresponds to a published average package rather than a round invention. This row carried 65,000 dollars and a bare February 1 date for the same programme. Two rows for one aid programme with two different values is exactly what the catalogue should not contain, so this row is retired and id 803 kept.'),
 (45, 'Princeton Financial Aid - No Loans (retired duplicate, see id 815)', 'No separate deadline: this row duplicated the Princeton need-blind zero-loan aid recorded at id 815', 'RETIRED 2026-10-26 as a duplicate of id 815, Princeton Financial Aid (Need-Blind, Zero-Loan Policy), which carries the published aid calendar of 9 November 2026 for Early Action and 1 February 2027 for Regular Decision. This row described the same programme as No Loans, which is a feature of Princeton aid rather than an award name, and attached 70,000 dollars to it against 83,000 in the surviving row. Retired so that the catalogue states one figure and one calendar for one programme.'),
 (456, 'University of Michigan International Excellence Scholarship (retired, name and value unverified)', 'No such award could be confirmed: the row was part of a six-university template', 'RETIRED 2026-10-26. This row belongs to a family of six rows at six unrelated universities, Michigan, UCLA, UC San Diego, UC Davis, UIUC and UMass Amherst, which all carried the same award title, the same 25,000 dollar value, the same not-published deadline and the same description shape. That uniformity is the tell: six universities do not publish an identically named award at an identically round figure. Michigan does fund international undergraduates through need-based aid and through named department awards, but no award called the International Excellence Scholarship at 25,000 dollars appears in the university own funding pages. The row is retired rather than rewritten because there is no verified Michigan award to put in its place, and the catalogue already carries a verified sibling where one exists: UC Davis Regents at id 694, UCSD Regents and Triton Scholars at id 702 and UMass Amherst international first-year merit awards at id 706.'),
 (460, 'UCLA International Excellence Scholarship (retired, name and value unverified)', 'No such award could be confirmed: the row was part of a six-university template', 'RETIRED 2026-10-26 as part of the same six-university template described on id 456. UCLA gives international students need-based aid and runs the Regents scholarship, but it publishes no award called the International Excellence Scholarship at 25,000 dollars with an unpublished deadline. The row is retired rather than rewritten because no UCLA award page was read in this pass to replace it, and inventing a replacement would repeat the original error. A candidate should read the UCLA financial aid and scholarships pages directly.'),
 (462, 'UCSD International Excellence Scholarship (retired duplicate of id 702)', 'No such award could be confirmed: the row was part of a six-university template and duplicates id 702', 'RETIRED 2026-10-26 as part of the six-university template described on id 456, and specifically because UC San Diego already has a verified row at id 702, UCSD Regents and Triton Scholars Awards, which states that awards are assessed with the UC admission application and carries a 20,000 dollar figure taken from the university own award structure. This row claimed a differently named award at 25,000 dollars for the same university, so it is retired in favour of id 702.'),
 (464, 'UIUC International Excellence Scholarship (retired, name and value unverified)', 'No such award could be confirmed: the row was part of a six-university template', 'RETIRED 2026-10-26 as part of the six-university template described on id 456. Illinois funds international students through a set of named merit and need awards and publishes them individually, but no award called the International Excellence Scholarship at 25,000 dollars with an unpublished deadline was confirmed on the university funding pages. Retired rather than rewritten, because there is no verified Illinois award from this pass to substitute.'),
 (475, 'UC Davis International Excellence Scholarship (retired duplicate of id 694)', 'No such award could be confirmed: the row was part of a six-university template and duplicates id 694', 'RETIRED 2026-10-26 as part of the six-university template described on id 456, and specifically because UC Davis already has a verified row at id 694, the UC Davis Regents Scholarship, which publishes the award basis, the 7,500 dollar annual value, the 3.25 GPA renewal rule and the 2 December 2026 UC application deadline. This row claimed a differently named award at 25,000 dollars for the same university, so it is retired in favour of id 694.'),
 (480, 'UMass Amherst International Excellence Scholarship (retired duplicate of id 706)', 'No such award could be confirmed: the row was part of a six-university template and duplicates id 706', 'RETIRED 2026-10-26 as part of the six-university template described on id 456, and specifically because UMass Amherst already has a verified row at id 706, International First-Year Merit Awards, which states the up-to-16,000-dollar value and the rule that international first-year applicants are considered automatically once admitted. This row claimed a differently named award at 25,000 dollars for the same university, so it is retired in favour of id 706.')
) AS v(id, nm, dl, nt)
WHERE s.id = v.id;

UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = 'No', funding_type = 'Unavailable',
max_scholarship = 'No confirmed award', covers_tuition = false, covers_living_expenses = false,
valued_aspect = 'Retired: duplicate or unconfirmed award',
eligibility_notes = v.en, verification_status = 'verified', last_verified_at = '2026-10-26 03:00:00'
FROM (VALUES
 (528, 'MIT Financial Aid - Full Need Met (retired duplicate, see id 1)', 'RETIRED 2026-10-26 as a duplicate of id 1. MIT need-based aid is described on card 1; this card quoted a second, different invented figure for the same programme.'),
 (5, 'Harvard Financial Aid Initiative (retired duplicate, see id 10)', 'RETIRED 2026-10-26 as a duplicate of id 10. Harvard need-based undergraduate aid is described on card 10; the Financial Aid Initiative is a programme name, not a separate award.'),
 (17, 'Yale Need-Based Financial Aid (retired duplicate, see id 803)', 'RETIRED 2026-10-26 as a duplicate of id 803, which carries the published aid deadlines and the average package figure for the same programme.'),
 (13, 'Princeton Financial Aid - No Loans (retired duplicate, see id 815)', 'RETIRED 2026-10-26 as a duplicate of id 815, which carries the published aid calendar for the same programme.'),
 (524, 'University of Michigan International Excellence Scholarship (retired, unverified)', 'RETIRED 2026-10-26. Part of a six-university template that applied the same award name and the same 25,000 dollar value to six unrelated universities. No Michigan award of that name and value was confirmed.'),
 (501, 'UCLA International Excellence Scholarship (retired, unverified)', 'RETIRED 2026-10-26. Same six-university template. UCLA runs the Regents scholarship and need-based aid, but no award of this name and value was confirmed.'),
 (505, 'UCSD International Excellence Scholarship (retired duplicate of id 702)', 'RETIRED 2026-10-26. UCSD is described on card 702, the Regents and Triton Scholars awards, which is the verified row for the same university.'),
 (526, 'UIUC International Excellence Scholarship (retired, unverified)', 'RETIRED 2026-10-26. Same six-university template; no Illinois award of this name and value was confirmed.'),
 (657, 'UC Davis International Excellence Scholarship (retired duplicate of id 694)', 'RETIRED 2026-10-26. UC Davis is described on card 694, the Regents Scholarship, which is the verified row for the same university.'),
 (506, 'UMass Amherst International Excellence Scholarship (retired duplicate of id 706)', 'RETIRED 2026-10-26. UMass Amherst is described on card 706, the international first-year merit awards, which is the verified row for the same university.')
) AS v(id, nm, en)
WHERE u.id = v.id;
