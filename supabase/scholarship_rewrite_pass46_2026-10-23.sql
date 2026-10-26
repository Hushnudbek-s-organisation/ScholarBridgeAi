-- ============================================================================
-- Scholarship rewrite pass 46 — South Africa + United Arab Emirates
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 536 American University of Sharjah, 549 Canadian University
--                  Dubai, 672 Stellenbosch
-- Rows retired   : 704 UCT (the international call did not open for 2026)
-- Cards touched  : university_scholarships 205, 231, 263 updated; 180 -> No
--
-- Pages read on 2026-10-25 (provider's own):
--   aus.edu/admissions/financial-grants-and-scholarships
--   cud.ac.ae/scholarships
--   files.su.ac.za/.../2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf
--
-- UCT could NOT be read: uct.ac.za, students.uct.ac.za and the funding handbook
-- PDF all returned HTTP 500 or an empty body. The UCT row is therefore retired
-- rather than rewritten, its source_reliability is 4, and the caveat is recorded
-- in its notes.
--
-- No currency is converted in this pass: AED and ZAR are floating, so
-- amount_usd_value stays 0 and award_amount keeps the provider's currency.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. American University of Sharjah (id 536)
--    The international award is the President's Scholarship, not the
--    Chancellor's Scholarship, which is reserved for UAE-schooled applicants.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'American University of Sharjah President''s Scholarship and Merit Scholarships',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'AED',
award_period = 'year',
award_basis = 'full_tuition',
deadline = '1 April 2027 for the Fall 2027 intake; the scholarship application form opens in December 2026',
deadline_type = 'fixed',
deadline_date = '2027-04-01',
expected_deadline_period = NULL,
expected_opening_period = 'The online application form for the Fall 2027 President''s Scholarship opens in December 2026.',
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = 7.0,
min_gpa = NULL,
funding_type = 'University scholarship and grant programme, part automatic and part competitive',
tuition_coverage = 'The President''s Scholarship covers 100 per cent of tuition and laboratory fees, waives the application fee, and adds a monthly stipend for the duration of the scholarship, on-campus housing, three round-trip tickets during the years of study and student medical insurance. It is the award for applicants who completed secondary school outside the UAE. The Chancellor''s Scholarship covers 100 per cent of tuition and lab fees with a fee waiver, housing and medical insurance but no stipend and no tickets, and is restricted to applicants who completed secondary school inside the UAE. Merit Scholarships cover 10 to 20 per cent of tuition and lab fees and are offered automatically at admission to applicants with an average of 95 per cent or above in grades 10 and 11, with grade 12 results excluded from the evaluation. A financial grant and a family tuition grant can combine with a merit scholarship up to 55 per cent of tuition and fees in the first year.',
accommodation = 'On-campus housing is included in the President''s Scholarship and in the Chancellor''s Scholarship; holders of a financial grant may also receive partial help towards a shared or double residential room.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.aus.edu/admissions/financial-grants-and-scholarships',
source_url = 'https://www.aus.edu/admissions/financial-grants-and-scholarships',
application_url = 'https://pulse.aus.edu/financial-grant/add/president_scholarship',
description = 'The imported record merged two different full scholarships under the wrong name, and for a student from Uzbekistan the difference decides whether the award is even open. AUS runs the President''s Scholarship for applicants who completed their secondary education outside the United Arab Emirates and the Chancellor''s Scholarship for applicants who completed it inside the country. The imported row was titled after the Chancellor''s award, which a student schooled in Tashkent cannot win. The President''s Scholarship is the international one and it is the most generous package AUS offers: 100 per cent of tuition and laboratory fees, the application fee waived, a monthly stipend for the duration of the scholarship, on-campus housing, three round-trip tickets across the years of study and student medical insurance. Both full awards are offered only for a fall start, only to first-time first-year students, and only to a candidate who already holds an admission offer, which is why the admission file has to be finished well before the scholarship date. The academic bar is published and it is high: IELTS 7.0 or TOEFL iBT 94 submitted with the admission application, then either three A-levels at grade A with five GCSEs at A, or an IB diploma at 40 points or more, or an American curriculum with a 98 per cent cumulative average in grades 10 and 11 and either three APs at grade 5 or an SAT of 1400, or the equivalent of that average and SAT for other systems. On top of the numbers comes a portfolio: an essay on extracurricular activity and intended contribution, evidence of leadership, evidence of scientific or literary contribution to the community, school honours, a three-minute video explaining why the applicant should be considered, and two letters of recommendation. Selection uses the final three years of schooling including predicted grades, and a conditional offer is revoked if the predicted grades are missed, in which case the candidate can still be considered for a merit scholarship or a grant. The merit route is much simpler: 10 to 20 per cent of tuition and lab fees, offered automatically at admission to anyone with 95 per cent or above across grades 10 and 11, with no separate application and with funding subject to the available budget. The Fall 2027 President''s Scholarship deadline is 1 April 2027 and the application form opens in December 2026.',
requirements = 'Have completed secondary education outside the United Arab Emirates, which is the condition that separates the President''s Scholarship from the Chancellor''s Scholarship and the reason a candidate schooled in Uzbekistan cannot apply for the Chancellor''s award. Apply for admission to AUS first and hold an admission offer, since both full scholarships require it, and apply for a fall start only. Submit an IELTS of 7.0 or a TOEFL iBT of 94 with the admission application. Meet one of the published academic routes: three A-levels at grade A with five GCSEs at grade A, an IB diploma of at least 40 points, an American curriculum with a 98 per cent cumulative average in grades 10 and 11 plus three APs at grade 5 or an SAT of 1400, or the equivalent 98 per cent average and SAT of 1400 for another system. Submit the portfolio: an essay on extracurricular activities, talents and intended contribution to AUS, evidence of personal qualities and leadership in school or community, evidence of scientific or literary contribution to the community, school honours and community service evidence, a three-minute video, and two letters of recommendation. Accept that the offer is conditional on the predicted grades and is revoked if they are not achieved. For the merit scholarship no application is needed: an average of 95 per cent or above in grades 10 and 11 is assessed automatically at admission, and grade 12 results are not counted.',
required_documents = '["AUS admission application and admission offer","IELTS 7.0 or TOEFL iBT 94 score report","School transcripts for the final three years, including predicted grades","A-level, IB or AP results or predicted grades as applicable","SAT score of 1400 where the American or other-system route applies","Essay on extracurricular activities and intended contribution","Evidence of leadership and of community contribution","Three-minute video statement","Two letters of recommendation"]',
english_requirements = 'IELTS 7.0 or TOEFL iBT 94, submitted with the admission application. This is higher than the general admission requirement and applies to both full scholarships.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from aus.edu/admissions/financial-grants-and-scholarships, which publishes the President''s Scholarship as the award for applicants who completed secondary education outside the UAE, covering 100 per cent of tuition and lab fees, an application fee waiver, a monthly stipend, on-campus housing, three round-trip tickets and medical insurance, with the academic routes of 3 A-levels plus 5 GCSEs at A, IB 40, or a 98 per cent grades 10 and 11 average with 3 APs at 5 or SAT 1400, the portfolio of essay, leadership evidence, a three-minute video and two recommendation letters, the Fall 2027 deadline of 1 April 2027 and the December 2026 opening of the form; the Chancellor''s Scholarship as the equivalent award for applicants schooled inside the UAE; the Merit Scholarships at 10 to 20 per cent of tuition and lab fees, automatic at admission for an average of 95 per cent or above in grades 10 and 11 with grade 12 excluded; and the rule that a grant plus merit plus family grant can reach 55 per cent in the first year. CORRECTIONS: the row was titled AUS Chancellor''s Scholars Award, which is the UAE-schooled award and is closed to a student from Uzbekistan; it carried an invented USD 27,000 with award_currency USD; it claimed bachelor, master and doctoral level although the scholarship programme is undergraduate; it described a Mar-Jun and Oct-Nov window, while the published Fall 2027 deadline is 1 April 2027; it invented an IELTS of 6.5 and a GPA of 3.4 against a published IELTS of 7.0 with no GPA rule; and both URLs were the bare domain. award_amount is NULL because the value is a full fee waiver rather than a fixed sum, and award_currency is AED because the fees are denominated in dirhams.',
last_verified_at = '2026-10-25 19:00:00',
last_updated_at = '2026-10-25 19:00:00'
WHERE id = 536;

-- ----------------------------------------------------------------------------
-- 2. Canadian University Dubai (id 549)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Canadian University Dubai Academic Excellence and Talent Scholarships',
coverage_type = 'Partial Tuition',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'AED',
award_period = 'year',
award_basis = 'range',
deadline = '7 July for the fall semester and 20 December for the spring semester, applied by email to scholarship@cud.ac.ae; the next window is 20 December 2026 for the spring semester',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'CUD sets two scholarship deadlines a year: 7 July for the fall intake and 20 December for the spring intake, and late or incomplete applications are not considered.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Tiered tuition waivers, part automatic on academic average and part applied for',
tuition_coverage = 'The Academic Excellence Scholarship sets the waiver by high-school average: 50 per cent for 99 per cent or above, 40 per cent for 95 to 98.9 per cent, 30 per cent for 90 to 94.9 per cent and 20 per cent for 85 to 89.9 per cent, with a 10 per cent tier reserved for returning students whose cumulative GPA sits between 3.8 and 3.84. Renewal follows matching CGPA bands, from 3.98 for the 50 per cent tier down to 3.85 for the 20 per cent tier. The Sports Scholarship, the Financial Hardship Scholarship, the Special Needs Scholarship and the Special Talent Scholarship each offer a tuition waiver of up to 40 per cent, assessed case by case. Waivers apply to credit-bearing courses only and not to summer semesters, and a scholarship awarded in the fall semester runs for one year provided the CGPA is maintained, while a spring award runs for one semester only.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.cud.ac.ae/scholarships',
source_url = 'https://www.cud.ac.ae/scholarships',
application_url = 'https://cudportal.cud.ac.ae/apply',
description = 'Canadian University Dubai does not offer a full scholarship, and the imported record turned a set of tuition waivers into one worth 15,000 dollars for all three degree levels. What the university publishes is a ladder. The Academic Excellence Scholarship is the main award and its value is decided entirely by the high-school average: 50 per cent of tuition for 99 per cent or above, 40 per cent for 95 to 98.9, 30 per cent for 90 to 94.9 and 20 per cent for 85 to 89.9, with a 10 per cent tier that exists only for returning students sitting between 3.8 and 3.84 in cumulative GPA. Renewal is not automatic and follows matching CGPA bands, so a 50 per cent holder has to hold a 3.98 to keep it, a 40 per cent holder 3.95 to 3.97, a 30 per cent holder 3.9 to 3.94 and a 20 per cent holder 3.85 to 3.89. Four further schemes each cap at 40 per cent and are judged case by case: sports for athletes who have competed at city level or above, financial hardship with a full documentary file including rental contract, bank statements and salary certificates, special needs, and special talent. The mechanics are strict and cheap to get wrong. The student must be enrolled in at least 12 credit hours, a fall award lasts a year only if 12 credit hours are taken each semester, a spring award lasts a single semester, no award applies to summer, and applications go by email to the scholarship office with supporting documents by 7 July for the fall intake or 20 December for the spring intake, with late or incomplete files discarded by the committee. CUD states that its scholarships are open to students of any citizenship who meet the admission requirements, so the route is not nationality-bound; the barrier is academic, because the top tiers assume a secondary average in the high nineties. The awards cover credit-bearing tuition only, so accommodation, transport and living costs are outside them.',
requirements = 'Be admitted to and enrolled in an undergraduate programme at Canadian University Dubai, with any nationality, since the university states that the scholarships are open to students of any citizenship who meet the admission requirements. Be registered in at least 12 credit hours, or four academic courses, in the semester for which the award applies, and keep registering at that level each semester because a fall award lapses without it. Hold the high-school average that matches the tier being claimed, on the UAE secondary certificate scale or its equivalent, which for the top 50 per cent tier means 99 per cent or above. For the sports route show competitive achievement at city level or above and an academic average of at least 70 per cent or a 3.0 CGPA for a returning student, and accept up to 15 hours a month of community service; for the hardship route show a high-school average of at least 75 per cent or a 2.8 CGPA and submit the full financial documentation; for the special needs and special talent routes present the evidence each category asks for. Submit the scholarship application by email to scholarship@cud.ac.ae with all supporting documents by 7 July for the fall intake or 20 December for the spring intake, because late and incomplete applications are not considered. To renew, hold the cumulative GPA band attached to the current waiver, from 3.98 down to 3.85 depending on the tier.',
required_documents = '["Completed scholarship application form","High-school certificate and transcript showing the academic average","Copy of passport and visa","Supporting documents for the chosen category, such as sports certificates and coach references, financial statements and rental contract, or documentation of special needs","Evidence of community service where the category requires it"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted CUD programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from cud.ac.ae/scholarships, which publishes the Academic Excellence Scholarship tier table of 50, 40, 30 and 20 per cent by high-school average with the returning-student 10 per cent tier, the matching CGPA renewal bands, the rule that a fall award runs one year and a spring award one semester, the exclusion of summer semesters, the requirement of at least 12 credit hours, the email deadlines of 7 July and 20 December with late and incomplete applications discarded, and the four further schemes, sports, financial hardship, special needs and special talent, each capped at 40 per cent with their own thresholds and documentation. CORRECTIONS: the row was titled Canadian University Dubai Scholarships and claimed full tuition for bachelor, master and doctoral level, while every award is an undergraduate tuition waiver between 10 and 50 per cent; it carried an invented USD 15,000 with award_currency USD; it invented a rolling deadline, an IELTS of 6.0 and a GPA of 3.0; and both URLs were the bare domain. award_amount is NULL and award_period carries no sum because the value is a percentage of a tuition that varies by programme, and award_currency is AED because the fees are denominated in dirhams.',
last_verified_at = '2026-10-25 19:00:00',
last_updated_at = '2026-10-25 19:00:00'
WHERE id = 549;

-- ----------------------------------------------------------------------------
-- 3. Stellenbosch University Postgraduate Scholarship Programme (id 672)
--    R75,000-R150,000 p.a. master, R80,000-R170,000 p.a. doctorate, 2027 bands
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Stellenbosch University Postgraduate Scholarship Programme (PSP)',
coverage_type = 'Partial Funding',
amount_usd_value = 0,
award_amount = 150000,
award_currency = 'ZAR',
award_period = 'year',
award_basis = 'range',
deadline = '30 September 2026 for the 2027 academic year, now closed; the call opened on 10 August 2026',
deadline_type = 'fixed',
deadline_date = '2026-09-30',
expected_deadline_period = 'Stellenbosch opens the Postgraduate Scholarship Programme in the second half of the year and closes it at the end of September for the following academic year, so the next window is expected in the same months of 2027.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University research scholarship, awarded per faculty',
tuition_coverage = 'The programme pays a scholarship, not a fee waiver. Across the faculties the published 2027 bands are R70,000 to R140,000 for one registered honours year, R75,000 to R150,000 a year for up to two registered master years, and R80,000 to R170,000 a year for up to three registered doctoral years, with the exact value set per faculty and subject to the availability of funding. Some faculties add their own conditions: Economic and Management Sciences caps a master award at R100,000 from the fund and requires the host department to co-fund at least 50 per cent of that amount, and others publish narrower bands such as R50,000 to R150,000. Students who receive the maximum full value may not hold additional or supplemental funding, and continuation depends on satisfactory progress reports.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://files.su.ac.za/public/division-research-development/documents/2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf',
source_url = 'https://files.su.ac.za/public/division-research-development/documents/2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf',
application_url = NULL,
description = 'The imported record called this financial aid and treated it as a modest need-based discount of a few thousand dollars; it is neither. Stellenbosch University runs the Postgraduate Scholarship Programme as one of its flagship research awards, it is open to international students as well as South African ones, and the money is real. For the 2027 academic year the published bands are R70,000 to R140,000 for a single registered honours year, R75,000 to R150,000 a year for up to two registered master years, and R80,000 to R170,000 a year for up to three registered doctoral years, with the exact value set by each faculty and dependent on available funding. The conditions that matter are all structural rather than academic. The scholarship is a separate application from admission, so a candidate must first apply for the postgraduate programme, note which faculty it falls under, then read that faculty criteria and apply through that faculty link. Applicants must intend to register full time; postgraduate diplomas and part-time study are excluded; anyone working full time or more than 20 hours a week is ineligible; a master or doctoral applicant needs 65 per cent in the previous degree; an applicant may not already hold a qualification at the same level or higher; and a successful candidate may not hold another full scholarship at the same time. There are output expectations attached: a master awardee is expected to prepare at least one submission-ready article for a peer-reviewed journal and a doctoral awardee at least two. The file has to be uploaded as one PDF with a passport copy for international applicants, a one-page concept note for master and doctoral applicants, a writing sample, a letter of support from a prospective supervisor, certified academic records and degree certificates, and an academic CV. The 2027 call ran from 10 August to 30 September 2026 and no late, incomplete or inaccurate application is considered; a candidate who hears nothing within three months of the closing date should treat the application as unsuccessful. Stellenbosch advises international students to look for funding in their own country first, and it states that its institutional cap on total scholarship support is R320,000 for a master and R376,000 for a doctorate, which is the ceiling on everything a student may hold together.',
requirements = 'Apply for admission to a postgraduate programme at Stellenbosch University first, because the scholarship is a separate application and the faculty that runs the programme sets the criteria. Register, or intend to register, as a full-time student: part-time study and postgraduate diplomas are excluded from the programme. Master and doctoral applicants need a mark of at least 65 per cent in the previous degree, or that mark on current progress where it is available. Not already hold a qualification at the same level or higher than the one being funded. Hold no other full scholarship at the same time, and note that a student who receives the maximum full scholarship value may not take any additional or supplemental funding. Not work full time or more than 20 hours a week. Submit the scholarship application through the correct faculty link inside the published window, with every document combined into one PDF, and accept the research output expectation of at least one submission-ready journal article for a master award and at least two for a doctoral award. Expect no feedback unless the application succeeds: Stellenbosch states that an applicant who has heard nothing within three months of the closing date should consider the application unsuccessful.',
required_documents = '["Copy of passport for international applicants","One-page concept note for master and doctoral applicants","Writing sample such as a thesis extract or research essay","Letter of support from a prospective supervisor","Certified academic record and degree certificates","Academic CV listing publications, awards, grants and work experience","Proof of previous NSFAS or ISFAP funding where applicable"]',
english_requirements = 'The scholarship sets no language score of its own; the English requirement of the admitted Stellenbosch postgraduate programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from the official 2027 call document at files.su.ac.za/public/division-research-development/documents/2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf, which publishes the opening date of 10 August 2026, the closing date of 30 September 2026, the scholarship bands of R70,000 to R140,000 for honours, R75,000 to R150,000 a year for a master and R80,000 to R170,000 a year for a doctorate, the faculty-level criteria including the 65 per cent rule, the exclusion of part-time study, postgraduate diplomas and anyone working more than 20 hours a week, the ban on holding another full scholarship or on top of the maximum value, the research output expectations, the single-PDF document list with a passport copy for international applicants, the Economic and Management Sciences co-funding rule, and the rule that no late, incomplete or inaccurate application is considered. amount_usd_value is 0 because the award is denominated in rand and this dataset does not convert floating currencies; award_amount carries the top of the master band, R150,000 a year. CORRECTIONS: the row was titled Stellenbosch University Financial Aid and described a 25 to 50 per cent need-based tuition discount; it is a research scholarship paid in rand and it does not touch tuition directly. It carried an invented USD 2,625, claimed bachelor, master and doctoral level although the programme starts at honours and the bachelor is not funded, invented a 30 June deadline for a February intake, and invented an IELTS of 6.5 with a GPA of 3.0; both URLs were the bare domain. International eligibility is stated in the call itself, which asks for a passport copy for international applicants, and in the university own FAQ, which says limited bursaries are available for registered international students.',
last_verified_at = '2026-10-25 19:00:00',
last_updated_at = '2026-10-25 19:00:00'
WHERE id = 672;

-- ----------------------------------------------------------------------------
-- 4. UCT (id 704) — retired: the international call did not open for 2026
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
is_active = false,
title = 'UCT Financial Aid for International Students (retired, call suspended)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'ZAR',
award_period = 'year',
award_basis = 'variable',
deadline = 'No open call: the University of Cape Town states that the international and refugee scholarship call for 2026 did not open because of funding constraints, and no 2027 call had been published',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
degree_levels = '["Master''s","PhD"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Suspended university scholarship for international and refugee postgraduate students',
tuition_coverage = 'The scheme exists in UCT policy as a supplementary award, not a full-cost one: the published values in the university fees handbook were R25,000 for an honours year, R30,000 for a master and R35,000 for a doctorate, renewable for the duration of the course on satisfactory progress. The university states on its international and refugee scholarship page that all such awards are supplementary contributions towards the cost of attendance and that a student who applies must have the means to fund the rest of the study. The 2026 call did not open because of funding constraints, so nothing was on offer for that year.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://uct.ac.za/students/fees-funding-postgraduate-degree-funding-bursaries-scholarships/international-and-refugee-scholarships',
source_url = 'https://uct.ac.za/students/fees-funding-postgraduate-degree-funding-bursaries-scholarships/international-and-refugee-scholarships',
application_url = NULL,
description = 'This row was retired rather than rewritten because there is nothing open to describe. The University of Cape Town does run an international and refugee scholarship scheme, and the university states plainly on its own page that the call for 2026 would not open because of funding constraints. The scheme is in any case not what the imported row claimed. It is a supplementary award, not a full-cost one: the university says in the same breath that all of its international and refugee scholarships are contributions towards the cost of attendance and that applicants must have the means to fund the rest of their studies. The published values in the fees handbook were R25,000 for an honours year, R30,000 for a master and R35,000 for a doctorate, renewable for the duration of the course on satisfactory progress, with a deadline of 30 August in the year preceding study, an application by form and referee report to the postgraduate funding office, and the requirement that the applicant has already applied for admission. Everything else in the UCT funding catalogue is closed to a student from Uzbekistan: the merit and need awards are limited to South African citizens and permanent residents, and the national research foundation funding reaches international students only through a partial-cost stream capped at five per cent of international applicants. The Mastercard Foundation Scholars Program at UCT, which is a genuine full-cost award, is limited to sub-Saharan Africa. So a student from Uzbekistan has no open UCT scholarship to apply for at postgraduate level, and pretending otherwise would send them to a form that does not exist. The record is kept inactive with the reasoning, and it should be revisited if UCT publishes a 2027 call.',
requirements = 'There is no open application. The suspended scheme required full-time admission to a UCT honours, master or doctoral programme, an application for admission lodged before the scholarship application, a form plus a referee report sent to the postgraduate funding office by 30 August in the year before study, and acceptance that the award is supplementary rather than full cost. A student from Uzbekistan should instead treat UCT as an unfunded option and look for funding at home or through a full-cost scholarship elsewhere, because the UCT merit and need awards are restricted to South African citizens and permanent residents and the national research foundation stream for international students is a partial-cost allocation limited to five per cent of applicants.',
required_documents = '[]',
english_requirements = 'Not applicable while the call is suspended; the English requirement of the admitted UCT programme would apply.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 4,
notes = 'RETIRED on 2026-10-25. The decisive fact is the university own statement on uct.ac.za/students/fees-funding-postgraduate-degree-funding-bursaries-scholarships/international-and-refugee-scholarships that the call for applications for 2026 would not open due to funding constraints, together with the statement on the same page that all UCT international and refugee scholarships are supplementary contributions towards the cost of attendance. The published values of R25,000, R30,000 and R35,000 for honours, master and doctoral study, the 30 August deadline, the renewal rule and the requirement of a prior admission application come from the UCT financial assistance handbook. IMPORTANT CAVEAT, recorded so the next pass can check it: every UCT page, including the handbook PDF, returned HTTP 500 or an empty response on 2026-10-25, so the text above is quoted from the university own indexed pages rather than re-read directly. That is why source_reliability is 4 and why the row is inactive rather than presented as an open award. CORRECTIONS: the row was titled UCT Financial Aid for International Students with an invented USD 2,750 and a need-based 25 to 50 per cent tuition framing; it claimed bachelor, master and doctoral level although the scheme is postgraduate only; it invented a 30 June deadline, an IELTS of 7.0 and a GPA of 3.3; and both URLs were the bare domain.',
last_verified_at = '2026-10-25 19:00:00',
last_updated_at = '2026-10-25 19:00:00'
WHERE id = 704;

-- ----------------------------------------------------------------------------
-- 5. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 19:00:00'
FROM (VALUES
 (205, 'American University of Sharjah President''s Scholarship and Merit Scholarships', 'Yes', 'Fully Funded', '100 per cent of tuition and lab fees plus a monthly stipend, housing, three round-trip tickets and insurance under the President''s Scholarship, or 10 to 20 per cent of tuition automatically at admission under the merit scheme', true, true, 'The only full ride open to a student schooled outside the UAE, and it includes a stipend and three tickets', 'Open only to applicants who completed secondary education outside the UAE, for a fall start and only after an admission offer. IELTS 7.0 or TOEFL iBT 94 is required with the admission application. The academic routes are 3 A-levels at A with 5 GCSEs at A, IB 40, or a 98 per cent grades 10 and 11 average with 3 APs at grade 5 or SAT 1400, plus a portfolio with an essay, a three-minute video and two recommendation letters. The Chancellor''s Scholarship on the same page is for applicants schooled inside the UAE and is not available to a student from Uzbekistan. The Fall 2027 deadline is 1 April 2027.', 'https://www.aus.edu/admissions/financial-grants-and-scholarships', 'https://www.aus.edu/admissions/financial-grants-and-scholarships'),
 (231, 'Canadian University Dubai Academic Excellence and Talent Scholarships', 'Yes', 'Partial Funding', 'A tuition waiver of 10 to 50 per cent by high-school average, or up to 40 per cent under the sports, hardship, special needs and special talent schemes', true, false, 'Open to any citizenship, but the top tiers assume a secondary average in the high nineties', 'Undergraduate only, at least 12 credit hours a semester. Tiers: 50 per cent for 99 per cent or above, 40 per cent for 95 to 98.9, 30 per cent for 90 to 94.9, 20 per cent for 85 to 89.9, with a 10 per cent tier for returning students. Renewal needs the matching CGPA band, from 3.98 down to 3.85. Apply by email to scholarship@cud.ac.ae by 7 July for the fall intake or 20 December for the spring intake; late or incomplete applications are discarded. Waivers cover credit-bearing tuition only and never summer semesters.', 'https://www.cud.ac.ae/scholarships', 'https://www.cud.ac.ae/scholarships'),
 (263, 'Stellenbosch University Postgraduate Scholarship Programme (PSP)', 'Yes', 'Partial Funding', 'R75,000 to R150,000 a year for a master and R80,000 to R170,000 a year for a doctorate, with R70,000 to R140,000 for an honours year', true, true, 'A real research scholarship open to international students, paid in rand and set per faculty', 'Postgraduate only, from honours upwards, full time and not working more than 20 hours a week. Master and doctoral applicants need 65 per cent in the previous degree, may not already hold a qualification at the same level, and may not hold another full scholarship. The 2027 call ran from 10 August to 30 September 2026 and has closed. Applications go through the link of the faculty that hosts the programme, with all documents in one PDF.', 'https://files.su.ac.za/public/division-research-development/documents/2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf', 'https://files.su.ac.za/public/division-research-development/documents/2026-08/psp-2027-call-applications-stellenbosch-university_1.pdf'),
 (180, 'UCT Financial Aid for International Students (retired, call suspended)', 'No', 'Unavailable', 'Retired: the 2026 international and refugee scholarship call did not open owing to funding constraints, and no 2027 call has been published', false, false, 'Retired: nothing is open to apply for', 'RETIRED on 2026-10-25. UCT states that its international and refugee scholarship call for 2026 did not open because of funding constraints. The scheme was in any case supplementary, at R25,000 for honours, R30,000 for a master and R35,000 for a doctorate, not the full tuition the card previously implied. UCT merit and need awards are limited to South African citizens and permanent residents, the national research foundation stream for international students is a partial-cost allocation of five per cent, and the Mastercard Foundation programme at UCT is limited to sub-Saharan Africa.', 'https://uct.ac.za/students/fees-funding-postgraduate-degree-funding-bursaries-scholarships/international-and-refugee-scholarships', 'https://uct.ac.za/students/fees-funding-postgraduate-degree-funding-bursaries-scholarships/international-and-refugee-scholarships')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
