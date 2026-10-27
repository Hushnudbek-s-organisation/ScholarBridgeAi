-- ============================================================================
-- Scholarship rewrite pass 51 — UK tail, part 2
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 311 Warwick, 27 UCL Global Master's
-- Row retired    : 18 UCL Overseas Research Scholarship (page returns 404)
-- Cards touched  : 555 and 564 updated, 573 -> No
--
-- Pages read on 2026-10-25 (provider's own):
--   warwick.ac.uk/services/dc/schols_fund/applicants/competitions
--     (the old /cis/ URL now redirects here)
--   ucl.ac.uk/scholarships/ucl-global-masters-scholarship
--   ucl.ac.uk/scholarships/overseas-research-scholarship  -> 404
--   manchester.ac.uk/.../presidents-doctoral-scholar-awards/ -> 404, so the
--     Manchester row is NOT touched in this pass
--
-- All three awards are denominated in pounds: amount_usd_value is 0 and
-- award_currency is GBP.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Warwick postgraduate research competition (id 311)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Warwick Postgraduate Research Scholarships (Faculty and Interdisciplinary Chancellors)',
coverage_type = 'Full Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_period = 'year',
award_basis = 'variable',
deadline = 'For October 2027 entry: course application 7 December 2026, scholarship application 10 December 2026, references 21 December 2026, all at 16:59 GMT; the call opened on 5 October 2026',
deadline_type = 'fixed',
deadline_date = '2026-12-10',
expected_deadline_period = NULL,
expected_opening_period = 'The 2027 call opened on 5 October 2026.',
degree_levels = '["PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Fully funded postgraduate research scholarship from the University of Warwick',
tuition_coverage = 'Every Warwick postgraduate research scholarship pays the academic fees in full at either the UK or the international rate, and adds a tax-free maintenance stipend at the UK Research and Innovation rate for three and a half years, plus a GBP 5,000 research training and support grant. Part-time funding is available at 60 per cent with a proportionally longer funding period, subject to visa requirements, and eligible international applicants can also apply for help with UK visa and immigration costs. Up to 80 scholarships are offered across six streams for October 2027 entry: up to 30 Faculty Chancellors, up to 12 Interdisciplinary Chancellors, up to 3 AHRC Doctoral, up to 3 Doctoral Access Pathway, up to 2 Doctoral Access Sanctuary and up to 30 China Scholarship Council. A single application enters a candidate for the streams they qualify for.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/',
source_url = 'https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/',
application_url = 'https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/',
description = 'The award the imported record called the Warwick Chancellors International Scholarship no longer exists under that name, and the nearest real thing is bigger and better documented. Warwick now runs a single postgraduate research competition that offers up to 80 scholarships across six streams for October 2027 entry, and the two streams an international candidate from Uzbekistan should look at are the Faculty Chancellors awards, up to 30 of them, and the Interdisciplinary Chancellors awards, up to 12. Every award in the competition pays academic fees in full at either the UK or the international rate, adds a tax-free maintenance stipend at the UK Research and Innovation rate for three and a half years, and includes a GBP 5,000 research training and support grant; the Chancellors streams are open to any nationality and any fee status, and eligible international applicants can also apply for help with visa and immigration costs. Part-time candidates are funded at 60 per cent over a longer period. The calendar is unforgiving and all of it is published: the 2027 call opened on 5 October 2026, the course application closes on 7 December 2026, the scholarship application on 10 December 2026 and the references on 21 December 2026, all at 16:59 GMT, with late submissions refused; mid-stage notification comes on 25 January 2027 and offers on 5 March 2027. Three conditions matter: the candidate must apply for an eligible postgraduate research course starting in October 2027, the scholarship cannot be deferred to another academic year, and current Warwick postgraduate research students are not eligible. The other streams are restricted in ways the general description does not show. The AHRC stream needs an arts and humanities project; the Doctoral Access Pathway stream is for applicants who identify as Black or of Black heritage; the Sanctuary stream needs a UK asylum-related status or support from the Council for At-Risk Academics; and the China Scholarship Council stream is for Chinese candidates.',
requirements = 'Apply for an eligible postgraduate research course at the University of Warwick starting in October 2027, which means a PhD, an MPhil leading to PhD, an EngD or the PhD stage of a Masters plus PhD route, by the course deadline of 7 December 2026. Submit the single scholarship application by 10 December 2026 and make sure referees submit their references by 21 December 2026, all at 16:59 GMT, since late submissions are not accepted. Be of any nationality and any fee status for the Faculty Chancellors and Interdisciplinary Chancellors streams; current Warwick postgraduate research students are not eligible. Choose the stream that fits: the general Faculty stream needs nothing beyond the course application, while the Interdisciplinary stream requires a research project aligned to a Warwick research spotlight or research centre and a specific statement in the application. Note that the Doctoral Access Pathway stream is restricted to applicants who identify as Black or of Black heritage, the Sanctuary stream requires a UK asylum-related status or CARA support with evidence uploaded, the AHRC stream requires an arts and humanities research project, and the China Scholarship Council stream is for Chinese candidates. Accept that the award cannot be deferred and that part-time funding, where chosen, runs at 60 per cent.',
required_documents = '["Application for an eligible Warwick postgraduate research course","Warwick scholarship application through the published form","Two references submitted by the referees by the reference deadline","Interdisciplinary statement where that stream is claimed","Evidence of asylum-related status or CARA support where the Sanctuary stream is claimed","Research proposal as the department requires"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Warwick research programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from warwick.ac.uk/services/dc/schols_fund/applicants/competitions, the Warwick PGR scholarship competitions page, which publishes the figure of up to 80 postgraduate research scholarships across six streams for autumn 2027 entry, the stream sizes of up to 30 Faculty Chancellors, up to 12 Interdisciplinary Chancellors, up to 3 AHRC Doctoral, up to 3 Doctoral Access Pathway, up to 2 Doctoral Access Sanctuary and up to 30 China Scholarship Council, the common package of full academic fees at the UK or international rate plus a UKRI rate stipend for three and a half years, a GBP 5,000 research training and support grant, part-time funding at 60 per cent, help with visa costs for eligible international applicants, the eligibility of any nationality and fee status for the Chancellors streams, the exclusion of current postgraduate research students, the rule that awards cannot be deferred, and the 2027 calendar of a call opening on 5 October 2026, a course deadline of 7 December 2026, a scholarship deadline of 10 December 2026 and a reference deadline of 21 December 2026, with mid-stage notification on 25 January 2027 and offers on 5 March 2027. amount_usd_value is 0 and award_amount is NULL because the value is a fee at the international rate plus a stipend at a rate that is reset annually, neither of which the dataset can convert without inventing a rate; award_currency is GBP. CORRECTIONS: the row was titled Warwick Chancellors International Scholarship, which is not the current name; it carried an invented USD 44,000 with award_currency USD; it gave a fixed December 12 deadline that matches no published date; it claimed bachelor, master and doctoral level although the competition is postgraduate research only; it invented an IELTS score and a GPA; and its URL pointed at a page that now redirects to the competitions page.',
last_verified_at = '2026-10-25 23:30:00',
last_updated_at = '2026-10-25 23:30:00'
WHERE id = 311;

-- ----------------------------------------------------------------------------
-- 2. UCL Global Master's Scholarship (id 27) — GBP 15,000, need-based
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'UCL Global Master''s Scholarship',
coverage_type = 'Partial Funding',
amount_usd_value = 0,
award_amount = 15000,
award_currency = 'GBP',
award_period = 'one_time',
award_basis = 'fixed',
deadline = '5pm BST on Thursday 7 May 2026 for the 2026/27 round, which has closed; the next round is expected in the same spring window',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'UCL opens the international master awards round in the spring and closes it in early May for the following September, with shortlisting in mid-May and outcomes by late June.',
expected_opening_period = NULL,
degree_levels = '["Master''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Need-based bursary for international master students',
tuition_coverage = 'The award is a bursary of GBP 15,000, tenable for one year unless the full-time programme runs for two years, in which case it is paid in two halves. It is applied first to tuition fees, and any remainder is paid to the student in three equal instalments across the academic year towards maintenance. Up to 85 scholarships are offered in 2026/27, with five ring-fenced for students from India and one for a student from Japan under the Musubi Global Master''s Scholarship. It may be held alongside other awards depending on the total value received, but the holder must tell the UCL Student Funding Office about any other funding immediately.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship',
source_url = 'https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship',
application_url = 'https://www.ucl.ac.uk/scholarships/international-masters-awards',
description = 'UCL does run a large international master award, but it is worth fifteen thousand pounds rather than thirty-five thousand, and it is awarded on financial need rather than on grades. The UCL Global Master''s Scholarship exists to help international students from lower income backgrounds study a full-time master degree at UCL. The value is GBP 15,000, tenable for one year, or paid in two halves if the programme runs for two years, and it is applied to tuition first with any remainder paid to the student in three instalments towards maintenance. The scale is unusual: up to 85 scholarships are offered in 2026/27, five of them ring-fenced for students from India and one for a student from Japan. The conditions are about circumstances rather than merit. The candidate must be eligible for the overseas fee rate, must come from a lower income background as UCL defines household income on its essential information page, and must have submitted a complete admission application including references for a full-time master programme; distance learning is excluded because the fund expects the student to attend UCL in person. The mechanics are worth noting because the award can be held with others: the round closes at 5pm BST on 7 May, shortlisted candidates are asked in mid-May to provide evidence of financial need, and successful candidates hear by late June. A holder must inform the Student Funding Office of any other funding immediately. One warning published on the same page applies to four nationalities rather than to Uzbekistan but is worth repeating: since 26 March 2026 citizens of Cameroon, Sudan, Myanmar and Afghanistan cannot obtain a Study Visa to enter the United Kingdom, so a scholarship alone would not admit them.',
requirements = 'Be eligible to pay the overseas fee rate at UCL and be a national of any country outside the United Kingdom. Come from a lower income background as UCL defines household income on its essential information page, since the award is made on financial need and on the Student Funding Office recommendation rather than on academic merit. Submit a complete admission application, including references, for a full-time master programme at UCL, and note that distance learning and part-time study are not eligible because the fund expects the student in London. Apply for the scholarship through the international master awards route by 5pm BST on the published spring deadline, which was 7 May 2026 for the 2026/27 round. Be ready in mid-May to provide evidence of financial need if shortlisted. If awarded, tell the UCL Student Funding Office immediately about any other scholarship or bursary received, before or after the award, because the two may be held together only depending on the total value.',
required_documents = '["Complete UCL admission application with references for a full-time master programme","International master awards scholarship application","Evidence of household income and financial need when shortlisted sometime in mid-May"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted UCL programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from ucl.ac.uk/scholarships/ucl-global-masters-scholarship, which publishes the value of GBP 15,000, the tenability rule for one-year and two-year programmes, the figure of up to 85 scholarships in 2026/27 with five ring-fenced for India and one for Japan under the Musubi scheme, the selection on financial need and Student Funding Office recommendation, the overseas fee status and lower income background conditions, the requirement of a complete admission application for a full-time master programme with distance learning excluded, the treatment of the award as tuition first with the remainder paid in three instalments, the rule that it may be held with other awards depending on total value and that other funding must be reported immediately, the 5pm BST 7 May 2026 deadline, the mid-May evidence stage and the late June outcomes, and the UK visa restriction for citizens of Cameroon, Sudan, Myanmar and Afghanistan from 26 March 2026. amount_usd_value is 0 because the award is denominated in pounds; award_amount carries the GBP 15,000 value. CORRECTIONS: the row carried an invented USD 35,000 with award_currency USD; it gave a fixed May 16 deadline that matches no published date; it claimed bachelor, master and doctoral level although the award is master only; it invented an IELTS score and a GPA; and it did not mention that the award is need-based rather than merit-based, which for a candidate from Uzbekistan is the single most important fact about it.',
last_verified_at = '2026-10-25 23:30:00',
last_updated_at = '2026-10-25 23:30:00'
WHERE id = 27;

-- ----------------------------------------------------------------------------
-- 3. UCL Overseas Research Scholarship (id 18) — retired, the page is gone
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
is_active = false,
title = 'UCL Overseas Research Scholarship (retired, page withdrawn)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'GBP',
award_basis = 'variable',
deadline = 'No award to apply for: the UCL Overseas Research Scholarship page now returns a 404 and no current UCL award of that name was found',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
degree_levels = '["PhD"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Withdrawn: the named award could not be found',
tuition_coverage = 'Nothing is claimed. The Overseas Research Scholarship used to be a UCL scheme that waived the difference between the home and overseas fee for doctoral students, and the imported row presented it as a USD 35,000 award with a January deadline. On 2026-10-25 the UCL scholarships page for it returned a 404, and no current UCL award carrying that name was found, so the record has been withdrawn rather than re-guessed. UCL publishes its current doctoral funding through its scholarships search, and that is where a candidate should look; the verified UCL award in this catalogue is the Global Master''s Scholarship worth GBP 15,000, which is master level and need-based.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ucl.ac.uk/scholarships/overseas-research-scholarship',
source_url = 'https://www.ucl.ac.uk/scholarships/overseas-research-scholarship',
application_url = NULL,
description = 'This row has been retired because the award it describes could not be found. The Overseas Research Scholarship was a real UCL scheme in the past, and its purpose was to waive the gap between the home and the overseas fee for doctoral students, but the UCL page for it now returns a 404 and no current UCL award carrying that name appeared in the university scholarships catalogue on 2026-10-25. The imported record also gave it a value and a deadline it never published, thirty-five thousand dollars and a January date. Two possible explanations exist and the record does not choose between them: UCL may have renamed the scheme, or it may have folded doctoral fee support into a broader research scholarship. Either way, a candidate should not be sent to a page that does not exist. UCL current funding is published through its scholarships search, and the UCL award that IS verified in this catalogue is the Global Master''s Scholarship, worth GBP 15,000, awarded on financial need to international master students. The row is kept inactive with the reasoning so that the decision can be reopened if UCL publishes an Overseas Research Scholarship again.',
requirements = 'There is no current application to make. A doctoral candidate seeking UCL funding should use the university scholarships search rather than this row, check whether the support is a fee waiver at the overseas rate or a stipend, and confirm the closing date on the award page itself. The historical scheme required a doctoral place at UCL and an overseas fee status, but the conditions of any successor scheme were not read in this pass, so nothing is asserted here.',
required_documents = '[]',
english_requirements = 'Not applicable while the award cannot be found; the English requirement of the admitted UCL programme would apply.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 4,
notes = 'RETIRED on 2026-10-25. ucl.ac.uk/scholarships/overseas-research-scholarship returned a 404 page on that date, while ucl.ac.uk/scholarships/ucl-global-masters-scholarship returned full details for the award that IS verified and rewritten in this pass, id 27. The row is retired rather than rewritten because there is no verified successor to point at: the historical purpose of the Overseas Research Scholarship, waiving the difference between home and overseas fees for doctoral students, is recorded in the description as history and not as a current claim. CORRECTIONS: the row carried an invented USD 35,000 with award_currency USD; it gave a fixed January 31 deadline that matches no published date; it claimed bachelor, master and doctoral level although the historical scheme was doctoral; it invented an IELTS score and a GPA; and its URL no longer resolves, which is exactly the condition under which a catalogue entry should be withdrawn rather than kept.',
last_verified_at = '2026-10-25 23:30:00',
last_updated_at = '2026-10-25 23:30:00'
WHERE id = 18;

-- ----------------------------------------------------------------------------
-- 4. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 23:30:00'
FROM (VALUES
 (564, 'UCL Global Master''s Scholarship', 'Yes', 'Partial Funding', 'GBP 15,000 for one year, applied to tuition first with any remainder paid in three instalments for maintenance', true, true, 'Up to 85 awards a year, and the money is awarded on financial need rather than on grades', 'Master level only, full time and on site, any postgraduate taught programme. The applicant must be on the overseas fee rate, come from a lower income background and have submitted a complete admission application with references. Applications close at 5pm BST in early May, shortlisted candidates provide financial evidence in mid-May and outcomes come by late June. It may be held with other awards depending on total value, and other funding must be reported immediately.', 'https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship', 'https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship'),
 (555, 'Warwick Postgraduate Research Scholarships (Faculty and Interdisciplinary Chancellors)', 'Yes', 'Fully Funded', 'Full academic fees at the UK or international rate, a UKRI rate stipend for three and a half years and a GBP 5,000 research training grant', true, true, 'Up to 80 scholarships across six streams, and the Chancellors streams are open to any nationality', 'Postgraduate research only: PhD, MPhil leading to PhD, EngD or the PhD stage of a Masters plus PhD route, starting in October 2027. Any nationality and fee status for the Faculty and Interdisciplinary Chancellors streams, with current Warwick research students excluded. Course application by 7 December 2026, scholarship application by 10 December 2026 and references by 21 December 2026, all at 16:59 GMT. The award cannot be deferred. Part-time funding runs at 60 per cent.', 'https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/', 'https://warwick.ac.uk/services/dc/schols_fund/applicants/competitions/'),
 (573, 'UCL Overseas Research Scholarship (retired, page withdrawn)', 'No', 'Unavailable', 'Retired: the UCL page for this award returns a 404 and no current award of that name was found', false, false, 'Retired: there is nothing to apply for', 'RETIRED 2026-10-25. The Overseas Research Scholarship was historically a doctoral fee waiver for overseas students at UCL, but the university page for it no longer exists and no current award under that name appeared in the UCL scholarship catalogue. The verified UCL award in this catalogue is the Global Master''s Scholarship, worth GBP 15,000 and awarded on financial need, on card 564.', 'https://www.ucl.ac.uk/scholarships/overseas-research-scholarship', 'https://www.ucl.ac.uk/scholarships/overseas-research-scholarship')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
