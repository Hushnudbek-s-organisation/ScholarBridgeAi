-- ============================================================================
-- Scholarship rewrite pass 49 — UK flagship graduate awards
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-26
--
-- Rows rewritten : 7 Rhodes, 107 Clarendon, 8 Weidenfeld-Hoffmann,
--                  12 Cambridge Trust International Scholarship
-- Cards touched  : university_scholarships 515, 549, 486, 475
--
-- This opens the next workstream: the rows with amount_usd_value > 5000 that
-- were never re-verified in passes 14 to 48. There are 237 of them; 41 were in
-- the United Kingdom and four of those are closed here.
--
-- Pages read on 2026-10-25/26 (provider's own):
--   rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship
--   ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon
--   ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/
--     weidenfeld-hoffmann-scholarships-and-leadership-programme
--   student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024
--
-- All four awards are denominated in pounds, so amount_usd_value is 0 and
-- award_currency is GBP throughout.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rhodes Scholarship (id 7)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'The Rhodes Scholarship (University of Oxford)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = 20400,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'fixed',
deadline = 'Applications for the current cycle are closed; the Trust says applications reopen in 2027 for entry to Oxford in 2028, and each constituency sets its own closing date inside that round',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'Rhodes House opens the round roughly a year before entry and each constituency closes on its own date within it. The current cycle has closed and the 2027 round is the next one.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded postgraduate award from the Rhodes Trust',
tuition_coverage = 'The scholarship covers University of Oxford course fees plus an annual stipend, which for the 2025-26 academic year is GBP 20,400 a year, or GBP 1,700 a month, from which the scholar pays all living expenses including accommodation. The Trust warns that the stipend is not enough to support a partner or dependants. It also pays the fee to apply to Oxford, the student visa fee and the Immigration Health Surcharge, two economy flights at the start and end of the studies, and a settling-in allowance on arrival, and it helps with visa renewal and a further IHS payment for a scholar who moves to a second course. The number of years covered depends on the course: up to three years of fees and stipend is available to a scholar who takes a DPhil.',
accommodation = 'Accommodation is paid out of the stipend, not separately. The Trust states that the stipend is not sufficient to cover partners or dependants.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
source_url = 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
application_url = 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
description = 'The Rhodes Scholarship is real and it is fully funded, but the imported record priced it at seventy-two thousand dollars and gave an October deadline without explaining the one thing that decides whether a candidate can apply at all: eligibility runs by constituency, not by merit alone. Rhodes House awards the scholarship through national and regional constituencies, and a candidate applies inside the one that covers their nationality and ordinary residence rather than through a single global form. The value is generous and precisely published. The Trust pays Oxford course fees and an annual stipend that for 2025-26 stands at GBP 20,400 a year, or GBP 1,700 a month, out of which the scholar pays every living cost including rent; the Trust is candid that the stipend will not stretch to a partner or children. On top of that it covers the fee to apply to Oxford, the visa fee and the Immigration Health Surcharge, two economy flights at the beginning and the end, and a settling-in allowance, and it helps with a second course. Duration depends on what the scholar studies, with up to three years of fees and stipend for a DPhil. Selection is merit-based and looks for public-spirited leadership rather than grades alone, and the Trust describes its community as spanning more than seventy countries. The administrative fact that matters most right now is the calendar: applications for the current cycle are closed and the Trust says the round reopens in 2027 for entry in 2028, so a candidate reading this in late 2026 has a year to prepare rather than a month. A candidate from Uzbekistan should first check on the Rhodes House site which constituency covers their country, because the number of places per constituency and the age and residence rules attached to them are set there, not in the general description.',
requirements = 'Check which Rhodes constituency covers your nationality and ordinary residence, and apply inside that constituency rather than through a general form. Be applying for a full-time postgraduate course at the University of Oxford and hold, or expect to hold, a first degree of the standard the constituency requires. Meet the constituency own conditions, which can include age and residence rules that the general page does not set. Demonstrate academic excellence together with the qualities the Trust names: truth, courage, devotion to duty, sympathy for the weak, kindliness, unselfishness, fellowship, and a commitment to serving the public good. Apply for the Oxford course as well, since the scholarship funds a place rather than providing one, and note that the Trust covers the application fee afterwards for those selected. Where the constituency runs interviews, attend them. Note that the current round is closed and the next opens in 2027 for 2028 entry.',
required_documents = '["Rhodes constituency application for the relevant country or region","Academic transcripts and degree certificates","References as the constituency requires","Personal statement addressing leadership and service","Oxford graduate course application"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Oxford course applies, and the Rhodes application itself is made in English.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship, which publishes the full funding structure, the stipend of GBP 20,400 a year or GBP 1,700 a month for 2025-26, the warning that the stipend does not cover partners or dependants, the additional coverage of the Oxford application fee, visa fee, Immigration Health Surcharge, two economy flights and a settling-in allowance, the fact that up to three years of fees and stipend are available for a DPhil, the merit basis with selection for public-spirited leadership, the community spanning more than seventy countries, and the statement that applications are currently closed and reopen in 2027 for 2028 entry. The constituency structure is described on the same site and is the reason the row does not claim a single global deadline. CORRECTIONS: the row carried an invented USD 72,000 with award_currency USD; it gave an October deadline with no year and no constituency; it claimed bachelor, master and doctoral level although the scholarship funds postgraduate study; it invented an IELTS score and a GPA; and the URL was a directory rather than the scholarship page. award_amount carries the published annual stipend of GBP 20,400 rather than a total value, because the total depends on the length of the course.',
last_verified_at = '2026-10-26 00:00:00',
last_updated_at = '2026-10-26 00:00:00'
WHERE id = 7;

-- ----------------------------------------------------------------------------
-- 2. Clarendon Fund (id 107)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Oxford Clarendon Fund Scholarships',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = 'No separate scholarship deadline: a candidate is considered automatically if the Oxford graduate course application is submitted by that course December or January funding deadline',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'Clarendon has no calendar of its own. It follows the Oxford graduate admissions round, so the operative date is the December or January funding deadline published on the page of the chosen course.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded graduate scholarship from the University of Oxford',
tuition_coverage = 'Clarendon covers the course fees and provides a grant for living expenses for the period of the scholar fee liability on the agreed course. The university does not publish a single figure because both parts move with the course: the fee depends on the programme and the living grant is set annually. The scale is large rather than marginal: over 200 new fully funded scholarships are awarded each year, and more than 700 Clarendon scholars are on course at any time, drawn from around 70 countries.',
accommodation = 'Accommodation is paid out of the living expenses grant rather than separately.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon',
source_url = 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon',
application_url = 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon',
description = 'The Clarendon Fund is the largest of Oxford own graduate scholarships and it works in a way that makes the imported record pointless in a specific sense: there is no separate application to fill in. A candidate who applies for a new full-time or part-time master or DPhil course by the December or January funding deadline for that course is considered automatically, and selection is made on outstanding academic merit and potential. Clarendon awards over 200 new fully funded scholarships every year, and there are more than 700 Clarendon scholars on course at any one time from around 70 countries, which makes it far bigger than most of the named awards that surround it. What it pays is course fees plus a grant for living expenses, for the whole period of the scholar fee liability on the agreed course. The fund does not publish one number because the fee depends on the course and the living grant is reset each year, so a candidate should read the fee for their own programme and the current stipend rate rather than treat any single figure as the value of the award. Two properties make it unusually accessible: there are no restrictions on nationality, ordinary residence or field of study, and both full-time and part-time master and DPhil courses are eligible. It is also highly competitive, and Oxford says so plainly, so it should be treated as the strongest of several parallel applications rather than a plan in itself. The imported record claimed sixty thousand dollars and a fixed January 20 deadline; the deadline is whatever the chosen course publishes, and the dollar figure was invented.',
requirements = 'Apply for a new master or DPhil course at the University of Oxford through the normal graduate admissions process and submit that application by the December or January funding deadline published on the course page, since Clarendon has no separate form and no deadline of its own. Choose a full-time or part-time course that Oxford lists; there is no restriction by subject. Meet the academic entry requirements of the course and rank highly on academic merit and potential, which is the only basis on which Clarendon scholars are chosen. Accept that holding a deferred offer changes the round in which a candidate is considered, so the application should be made for the intake actually intended. Expect no separate notification: candidates who are unsuccessful are not contacted individually by the fund, and the outcome arrives through the Oxford graduate admissions channel.',
required_documents = '["Oxford graduate course application submitted by the course funding deadline","Academic transcripts and degree certificates","References as the course requires","Any written work or research proposal the course asks for"]',
english_requirements = 'Clarendon sets no score of its own; the English requirement of the admitted Oxford course applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon, which publishes the automatic consideration rule for applications made by the December or January course deadline, the coverage of course fees plus a living expenses grant for the period of fee liability, the statement that there are no restrictions on nationality, ordinary residence or field of study, the eligibility of all full-time and part-time DPhil and master courses, the selection on outstanding academic merit and potential, the warning that the scholarships are highly competitive, the figure of over 200 new fully funded scholarships a year, and the figures of over 700 on-course scholars from around 70 nations. amount_usd_value is 0 and award_amount is NULL because Oxford publishes neither a single fee nor a single living grant at fund level, and award_currency is GBP because both parts are denominated in pounds. CORRECTIONS: the row carried an invented USD 60,000 with award_currency USD; it gave a fixed January 20 deadline for a fund that has no deadline of its own; it claimed bachelor, master and doctoral level although Clarendon is graduate only; it invented an IELTS score and a GPA; and the old URL redirected to the current funding page.',
last_verified_at = '2026-10-26 00:00:00',
last_updated_at = '2026-10-26 00:00:00'
WHERE id = 107;

-- ----------------------------------------------------------------------------
-- 3. Weidenfeld-Hoffmann (id 8)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Oxford-Weidenfeld and Hoffmann Scholarships and Leadership Programme',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = 21805,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'fixed',
deadline = 'The December or January funding deadline of the chosen Oxford course, since a separate Weidenfeld-Hoffmann application and statement are submitted alongside it',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'The award follows the Oxford graduate round: a candidate applies to the course by its December or January funding deadline and submits the Weidenfeld-Hoffmann statement in the same application. Decisions are expected by the end of May 2027.',
expected_opening_period = NULL,
degree_levels = '["Master''s"]',
eligible_majors = '["BCL","MBA","MJur","MPP","MSc Advanced Computer Science","MSc African Studies","MSt Asian and Middle Eastern Studies","MSc Biodiversity, Conservation and Nature Recovery","MSc Clinical and Therapeutic Neuroscience","MSc Comparative Social Policy","MSc Contemporary Chinese Studies","MSc Criminology and Criminal Justice","MSt Diplomatic Studies","MSc Economics for Development","MSc Education","MSc Energy Systems","MSc Environmental Change and Policy","MSc Evidence-Based Social Intervention and Policy Evaluation","MSc Financial Economics","MSc Global Governance and Diplomacy","MSc Global Health Science and Epidemiology","MSc International Health and Tropical Medicine","MSt Islamic Studies and History","MSt Jewish Studies","MSc Latin American Studies","MSc Law and Finance","MSc Mathematical Modelling and Scientific Computing","MSc Migration Studies","MSc Modern Middle Eastern Studies","MSc Modern South Asian Studies","MSc Nature, Society and Environmental Governance","MSc Refugee and Forced Migration Studies","MSc Russian and East European Studies","MSc Social Data Science","MSc Social Science of the Internet","MSc Sustainability, Enterprise and the Environment","MSc Water Science, Policy and Management"]',
eligible_countries = '["Oxford publishes a list of around 180 eligible countries of ordinary residence, which includes Uzbekistan and excludes the United Kingdom, the United States, Canada and Australia"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded Oxford graduate scholarship with a leadership programme',
tuition_coverage = 'The scholarship covers one hundred per cent of course fees and a grant for living costs of at least GBP 21,805, for the full duration of the fee liability on the agreed course. It also funds the scholar place on the Weidenfeld-Hoffmann Leadership Programme, a year of philosophical discussion, business skills and communication training with long-term mentoring and a continuing network, which is the part that distinguishes it from Oxford other full awards. The eligible course list is short and fixed, around forty named master courses concentrated in law, business, policy, development, area studies, environment and global health, and a course outside that list makes a candidate ineligible however strong the rest of the file. Decisions are expected by the end of May 2027.',
accommodation = 'Accommodation is paid out of the living costs grant. Successful candidates are transferred to one of the partner colleges that co-funds the award.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme',
source_url = 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme',
application_url = 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme',
description = 'This is one of the strongest awards open to a student from Uzbekistan, and the imported record reduced it to a dollar figure and a January deadline. The Oxford-Weidenfeld and Hoffmann Scholarships and Leadership Programme pays one hundred per cent of course fees and a living costs grant of at least GBP 21,805 for the full period of fee liability, and adds something no other Oxford award does: a year-long leadership programme of philosophical discussion, business skills and communication training, with long-term mentoring and a network that continues after the degree. The Trust and the university fund it jointly, with Oxford contributing forty per cent and donors sixty. Three conditions decide most applications. The first is the course list: only around forty named master courses qualify, running from the BCL, MBA, MJur and MPP through development, policy, area studies, environment and global health degrees, so a candidate must pick a course from that list rather than hope. The second is ordinary residence: Oxford publishes a long list of eligible countries, and Uzbekistan is on it while the United Kingdom, the United States, Canada and Australia are not; a candidate who declared refugee or displaced status in the course application is assessed on nationality instead. The third is intent: the applicant must intend to return to their country of ordinary residence after the course and must show how the subject connects to improving public life there or regionally. The mechanics are simple but easy to miss. There is no separate scholarship form: the Weidenfeld-Hoffmann statement is completed inside the Oxford graduate application, and the operative deadline is the December or January funding deadline of the chosen course, with a course application carried to the March deadline not eligible. Current Oxford students cannot apply unless they are already Weidenfeld-Hoffmann scholars, and a candidate holding a deferred offer for 2027-28 is excluded. Decisions are expected by the end of May 2027. One practical warning from the same page: the United Kingdom currently restricts student visas for Afghan nationals, so an Afghan applicant should check the visa position before relying on any offer.',
requirements = 'Apply for a new full-time graduate course at the University of Oxford chosen from the published list of around forty eligible master courses, and submit that application by the December or January funding deadline of the course, because a course application carried to the March deadline is not eligible. Be ordinarily resident in one of the eligible countries before the course; Uzbekistan is on the list, and a candidate who declared refugee or displaced status in the course application is assessed on nationality instead. Intend to return to the country of ordinary residence once the course is finished. Demonstrate a connection between the subject of study and longer-term career objectives, explaining how the professional work will contribute to public life in the country of origin or at a regional or international level, which is assessed from the graduate application form, the Weidenfeld-Hoffmann statement and any interview. Complete the Weidenfeld-Hoffmann statement inside the Oxford application rather than through a separate form. Not already be a student at Oxford, unless already a Weidenfeld-Hoffmann scholar, and not hold a deferred offer to start in 2027-28.',
required_documents = '["Oxford graduate course application for one of the eligible master courses","Weidenfeld-Hoffmann statement inside the same application","Academic transcripts and degree certificates","References as the course requires","Evidence of leadership and of commitment to public life in the home country"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Oxford course applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme, which publishes the coverage of one hundred per cent of course fees plus a living costs grant of at least GBP 21,805 for the full fee liability period, the joint funding of forty per cent by the university and sixty per cent by donors, the leadership programme, the list of around forty eligible master courses, the list of eligible countries of ordinary residence including Uzbekistan and excluding the United Kingdom, the United States, Canada and Australia, the refugee and displaced provision, the eligibility conditions including the intent to return and the connection between the subject and public life, the exclusion of current Oxford students and of deferred offers for 2027-28, the instruction that the statement is completed inside the Oxford application, the December or January funding deadline, the end of May 2027 decision date, and the note about the UK student visa restriction for Afghan nationals. eligible_countries is stored as a single descriptive entry rather than as a country array, because the real rule is a published list of around 180 countries with named exclusions that the schema cannot express; the conservative effect is that no country is falsely matched as eligible. amount_usd_value is 0 because the award is denominated in pounds; award_amount carries the published minimum living grant of GBP 21,805. CORRECTIONS: the row carried an invented USD 55,000 with award_currency USD; it gave a vague January deadline instead of the course funding deadline; it claimed bachelor, master and doctoral level although the award is master level only; it invented an IELTS score and a GPA; and its URL pointed at a path that now returns 404.',
last_verified_at = '2026-10-26 00:00:00',
last_updated_at = '2026-10-26 00:00:00'
WHERE id = 8;

-- ----------------------------------------------------------------------------
-- 4. Cambridge Trust International Scholarship (id 12)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Cambridge Trust International Scholarship (PhD)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = 'No separate scholarship deadline: the application for admission has to be submitted by the funding deadline of the chosen PhD course, which in the current cycle falls in early December or early January',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'The Trust follows the Cambridge graduate funding round. The main university funding deadlines for the 2027/28 intake fall on 8 December 2026 and 6 January 2027, and each course publishes the date that applies to it.',
expected_opening_period = NULL,
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded PhD scholarship from the Cambridge Trust',
tuition_coverage = 'The scholarship covers the international University Composition Fee, a maintenance allowance sufficient for a single person living in Cambridge, and the Immigration Health Surcharge, for the length of the course. About 80 awards are made in a typical year, tenable at any Cambridge college and open in any subject, full time or part time, to applicants assessed as overseas for fee purposes. The Trust does not automatically fund the optional writing-up period, but a scholar can apply for a short extension of maintenance funding at the end of the award. Selection is on academic ability, research potential, examination results and references, and the Trust states that an applicant financial situation does not affect selection.',
accommodation = 'Accommodation is paid out of the maintenance allowance rather than separately.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024',
source_url = 'https://www.student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024',
application_url = 'https://www.postgraduate.study.cam.ac.uk/funding',
description = 'The Cambridge International Scholarship is a genuine full-cost PhD award, and the imported record priced it at forty-two thousand dollars with a December deadline and no indication of what it covers. The university funding search describes it precisely. It is for PhD applicants only, full time or part time, who are assessed as overseas for fee purposes and come from any country other than the United Kingdom or Ireland, in any subject, and it is tenable at any Cambridge college. It pays the international University Composition Fee, a maintenance allowance sufficient for a single person in Cambridge, and the Immigration Health Surcharge, for the length of the course; about 80 awards are made in a typical year, and a scholar can apply for a short extension of maintenance funding for the writing-up period, which is not automatic. The application mechanics are the best part. There is no separate scholarship form and no additional question in the applicant portal: a candidate who applies for admission and submits that application by the funding deadline of the chosen PhD course is considered automatically, and selection is made by a university committee ranking all PhD applicants on academic ability, research potential, examination results and references alone. The Trust says explicitly that an applicant financial situation does not affect selection, which distinguishes it from many of its partner awards. Results are released across an awards period running from March to July, and the Trust does not contact unsuccessful applicants. The premium-rate programmes that the Trust does not normally support, the MBA and Master of Finance among them, are master level and therefore outside this particular award, which is doctoral only.',
requirements = 'Apply for admission to a PhD at the University of Cambridge as a candidate from any country other than the United Kingdom or Ireland, assessed as overseas for fee purposes, and submit that application by the funding deadline published for the chosen course, which in the current cycle falls on 8 December 2026 or 6 January 2027 depending on the course. Be a prospective applicant rather than someone already part way through a Cambridge course, since the Trust does not normally fund students already mid-course unless they are moving to a higher degree. Choose any subject and any college; both are open. Study full time or part time; both are eligible. Submit no separate scholarship form and answer no additional question in the applicant portal, because consideration is automatic. Expect to be judged on academic ability, research potential, examination results and references, and note that financial need plays no part in this award. Watch the awards period from March to July for the outcome, and treat silence at the end of it as an unsuccessful application.',
required_documents = '["Cambridge PhD admission application submitted by the course funding deadline","Academic transcripts and degree certificates","Research proposal as the course requires","References","No separate scholarship form and no additional portal questions"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Cambridge PhD course applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024, the University of Cambridge postgraduate funding search entry for the award, which publishes the PhD-only level, the full-time and part-time modes, the overseas fee status and the availability to all countries except the United Kingdom and Ireland, the coverage of the international University Composition Fee, maintenance and the Immigration Health Surcharge, the duration equal to the course length, the approximately 80 awards, the academic merit basis with examination results, research potential and references, the statement that an applicant financial situation does not affect selection, the answer of no to additional questions in the applicant portal, the deadline equal to the course funding deadline, the March to July awards period, and the rule that writing-up funding is an application rather than an automatic extension. The 8 December 2026 and 6 January 2027 funding dates and the figure of about 60 awards for 2027/28 come from Cambridge own funding database as reported in a secondary summary and are recorded as the cycle calendar rather than as a firm number. amount_usd_value is 0 and award_amount is NULL because the fee and the maintenance allowance both vary by course and year, and award_currency is GBP. CORRECTIONS: the row carried an invented USD 42,000 with award_currency USD; it gave a December deadline rather than the course funding deadline; it claimed bachelor, master and doctoral level although the award is PhD only; it invented an IELTS score and a GPA; and the old URL returned the Cambridge Trust homepage, while the current fund slug without the year returns a not-found page.',
last_verified_at = '2026-10-26 00:00:00',
last_updated_at = '2026-10-26 00:00:00'
WHERE id = 12;

-- ----------------------------------------------------------------------------
-- 5. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-26 00:00:00'
FROM (VALUES
 (515, 'The Rhodes Scholarship (University of Oxford)', 'Yes', 'Fully Funded', 'Oxford course fees plus a stipend of GBP 20,400 a year for 2025-26, plus visa and health surcharge, two economy flights and a settling-in allowance', true, true, 'The stipend, the flights and the visa costs are all covered, but the stipend will not stretch to a family', 'Postgraduate only, and eligibility runs by constituency rather than by a single global form, so a candidate must apply in the constituency that covers their nationality and ordinary residence. The current cycle is closed and the Trust says the next round opens in 2027 for 2028 entry. Up to three years of fees and stipend are available for a DPhil.', 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/', 'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/'),
 (549, 'Oxford Clarendon Fund Scholarships', 'Yes', 'Fully Funded', 'Course fees plus a living expenses grant for the whole period of fee liability, awarded to over 200 new scholars a year', true, true, 'No separate application: applying to the course by its December or January deadline is the whole application', 'Graduate only, master and DPhil, full time or part time. No restrictions on nationality, ordinary residence or field of study. Considered automatically if the course application goes in by the course December or January funding deadline. Highly competitive, and unsuccessful applicants are not contacted individually.', 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon', 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon'),
 (486, 'Oxford-Weidenfeld and Hoffmann Scholarships and Leadership Programme', 'Yes', 'Fully Funded', 'One hundred per cent of course fees plus a living costs grant of at least GBP 21,805, and a place on the year-long Leadership Programme', true, true, 'Uzbekistan is on Oxford eligible country list, which the United Kingdom, the United States, Canada and Australia are not', 'Master level only, on a fixed list of around forty named courses. The applicant must be ordinarily resident in an eligible country, intend to return there after the course, and show how the subject connects to public life at home. The statement is completed inside the Oxford application, and the deadline is the December or January course funding deadline; a March-deadline application is not eligible. Decisions are expected by the end of May 2027.', 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme', 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme'),
 (475, 'Cambridge Trust International Scholarship (PhD)', 'Yes', 'Fully Funded', 'International fees, a maintenance allowance for a single person and the Immigration Health Surcharge, for the length of the PhD, with about 80 awards a year', true, true, 'No separate form and no extra portal questions: applying for the PhD by its funding deadline is enough', 'PhD only, full time or part time, any subject and any college, for applicants from any country other than the United Kingdom and Ireland with overseas fee status. Judged on academic ability, research potential, examination results and references, and financial need plays no part. The deadline is the funding deadline of the chosen course, 8 December 2026 or 6 January 2027 in the current cycle, and results come between March and July.', 'https://www.student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024', 'https://www.student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
