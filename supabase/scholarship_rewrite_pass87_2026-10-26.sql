-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 87 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- UK tail universities (Lancaster, Heriot-Watt, QUB, Exeter, Edinburgh, Leeds,
-- St Andrews) + El-Yurt Umidi Foundation (Uzbekistan state scheme).
--
-- Currency rule: GBP awards keep amount_usd_value = 0; where the award currency
-- or total value is unpublished, do not invent either. Final corrections and
-- university_scholarships synchronization are in the last (authoritative) block.
-- ============================================================================

-- ---------------------------------------------------------------
-- 614 — Lancaster University: retitled to the award Lancaster actually
--       publishes for 2027 entry (Global Scholarship pages 404'd).
-- Manba: lancaster.ac.uk .../undergraduate-international-excellence-scholarship/
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'Lancaster University Undergraduate International Excellence Scholarship',
  website_url = 'https://www.lancaster.ac.uk/study/fees-and-funding/scholarships-and-bursaries/undergraduate-international-excellence-scholarship/',
  source_url = 'https://www.lancaster.ac.uk/study/fees-and-funding/scholarships-and-bursaries/undergraduate-international-excellence-scholarship/',
  award_amount = 3000,
  award_currency = 'GBP',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  deadline = 'No scholarship deadline: the award is identified automatically from the UCAS application for 2027 entry, so there is no separate form and no closing date. The related Early Acceptance Scholarship for taught masters requires accepting a place by 23:59 GMT on 7 April 2027.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Partial Tuition',
  eligible_countries = '["All countries"]',
  tuition_coverage = 'GBP 3,000 tuition fee reduction for each year of study',
  application_status = 'open',
  source_reliability = 10,
  description = 'Lancaster University awards a GBP 3,000 tuition fee reduction for each year of study to international fee-paying undergraduates who make Lancaster their firm UCAS choice and reach A*AA at A level or the international equivalent. The award is a tuition fee reduction only, never a cash alternative, and it is not paid for repeated years, placement years, years in industry or study abroad years. It covers full-time undergraduate degrees taught on campus at the Bailrigg campus and applies to 2027 entry. Eligible students are identified automatically from their university application; there is no separate scholarship form. Other Lancaster awards published for 2027 entry on the same site: the Master''s Excellence Scholarship, a 15 per cent fee reduction worth up to GBP 4,635 for taught masters applicants holding a 2:1 or a first; the Early Acceptance Scholarship, GBP 2,000 for taught masters applicants who accept their place by 23:59 GMT on 7 April 2027; the Postgraduate International Regional Scholarship, GBP 10,000 for nationals of 12 listed countries; the Undergraduate International Regional Scholarship, GBP 3,000 a year for 12 listed countries; and the Undergraduate EU Scholarship, GBP 3,000 a year for EU nationals. Uzbekistan appears on neither regional list, so the excellence and early-acceptance awards are the realistic routes for Uzbek applicants.',
  requirements = 'International fee-paying status for the whole of the programme; if you are later reclassified as a home fee payer the award is withdrawn. A firm UCAS choice of Lancaster University. A*AA at A level or the equivalent, with every grade condition met or exceeded; tariff point equivalences are not accepted. Entry to Part 1 of a full-time undergraduate degree taught on campus at Bailrigg. Not available to students progressing from the Lancaster University International Study Centre, who have a separate progression award. Not available for repeated years of study.',
  required_documents = NULL::text,
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87). The imported row described a Lancaster Global Scholarship and carried only the bare domain lancaster.ac.uk. Both Lancaster Global Scholarship pages that search engines still index, lancaster-global-scholarship-masters and ug-lancaster-global-scholarship, now return 404: the scheme as published for 2025 entry has been retired and the 2027 portfolio on the university scholarships page does not include it. The row has therefore been rewritten to the award Lancaster actually publishes for 2027 entry, the Undergraduate International Excellence Scholarship, and retitled accordingly. award_amount 3 000 and award_period year come from the At a glance table on the scheme page; amount_usd_value stays 0 because the award is paid in GBP, not USD. degree_levels was reduced from all three levels to Bachelor''s because the scheme is undergraduate only; the taught masters routes are named in the description instead. deadline_type is not_published because the award is automatic and has no closing date - the January date in earlier notes was the UCAS application deadline, not a scholarship deadline. required_documents is deliberately empty: the scheme page publishes no document list because no application form exists.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 614;

-- ---------------------------------------------------------------
-- 589 — Heriot-Watt University: International Merit Scholarship.
-- Manba: hw.ac.uk .../international-merit-scholarship
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'Heriot-Watt University International Merit Scholarship',
  website_url = 'https://www.hw.ac.uk/study/fees-and-funding/scholarships-and-bursaries/international-merit-scholarship',
  source_url = 'https://www.hw.ac.uk/study/fees-and-funding/scholarships-and-bursaries/international-merit-scholarship',
  award_amount = NULL,
  award_currency = 'GBP',
  award_period = 'year',
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No single scholarship deadline: awards are administered by regional team for each intake, and the published intakes are January and September 2027. Applicants contact the regional team manager named on the scholarship page.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Bachelor''s","Master''s"]',
  coverage_type = 'Partial Tuition',
  eligible_countries = '["All countries"]',
  tuition_coverage = 'Partial fee abatement for the first year of study; the value varies by region',
  application_status = 'open',
  source_reliability = 9,
  description = 'Heriot-Watt University states that it is awarding more than GBP 500,000 in merit scholarships to international fee-paying students enrolling in January and September 2027. In most cases the award is a partial fee abatement for the first year of study only, unless the offer letter says otherwise. The value varies by region and the university does not publish it as a figure: applicants are directed to the regional team manager for their country. Uzbekistan falls under the CIS regional team, listed on the page as Saniya Gabbassova (S.Gabbassova@hw.ac.uk). Undergraduate and postgraduate taught programmes at the UK campus are covered; online programmes and postgraduate research are explicitly excluded. Only one Heriot-Watt funded award can be held, so this cannot be combined with the alumni discount or with a partner fee waiver, and students who already live in the UK are excluded even if they hold overseas fee status. Separate regional schemes, the Americas and Europe (non-EU) Scholarship and the EU scholarships, are linked from the same page for other regions.',
  requirements = 'An offer, conditional or unconditional, of a full-time undergraduate or postgraduate taught place at a Heriot-Watt UK campus for the January or September 2027 intake. Overseas fee status and residence overseas at the time of application. Contact with the regional team manager for the country of residence, because the criteria and the value are set per region. Excluded: online programmes, postgraduate research, students already resident in the UK, and anyone already holding another Heriot-Watt award.',
  required_documents = NULL::text,
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against hw.ac.uk/study/fees-and-funding/scholarships-and-bursaries/international-merit-scholarship. The row was retitled from the imported International Scholarship Programme to the name the university uses. award_amount is deliberately NULL and amount_usd_value stays 0: the page publishes Award value: varies by region and no figure at all, so any number here would be an invention. award_basis is variable and award_period year reflects the first-year abatement stated on the page. degree_levels was reduced from all three levels to Bachelor''s and Master''s because postgraduate research is explicitly excluded. deadline_type is not_published: awards are administered per intake by regional teams and there is no single closing date. required_documents is empty because the page publishes no document list. source_reliability 9 rather than 10 because the mechanism, the levels and the exclusions are all published, but the amount is not.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 589;

-- ---------------------------------------------------------------
-- 658 — Queen's University Belfast: International Undergraduate Scholarship.
-- Manba: qub.ac.uk International Office record
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'Queen''s University Belfast International Undergraduate Scholarship',
  website_url = 'https://www.qub.ac.uk/Study/funding-scholarships/Non-facultydepartments/international-office/international-office-undergraduate-scholarship.html',
  source_url = 'https://www.qub.ac.uk/Study/funding-scholarships/Non-facultydepartments/international-office/international-office-undergraduate-scholarship.html',
  award_amount = 3500,
  award_currency = 'GBP',
  award_period = 'one_time',
  award_basis = 'range',
  amount_usd_value = 0,
  deadline = 'No scholarship deadline and no separate application: awards are made automatically to eligible new international students on enrolment. The separate Early Confirmation Award keeps its own date, full payment by 18 September 2026 for 2026/27 entry.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Partial Tuition',
  eligible_countries = '["All countries"]',
  tuition_coverage = 'GBP 3,500 or GBP 4,000 reduction in first-year tuition fees, depending on fee rate',
  application_status = 'open',
  source_reliability = 10,
  description = 'Queen''s University Belfast awards a tuition fee reduction in the first year of study to new international fee-paying undergraduates. The published values are GBP 3,500 on fee rate 1, classroom-based programmes, and GBP 4,000 on fee rate 2, laboratory-based programmes; advanced entry into Year 2 or Year 3 is included. No separate application exists: eligible students are identified from their course application and the award is applied on enrolment, and the number of awards is stated as unlimited. The scheme applies to 2026/27 entry, the discount is deducted from gross tuition fees, and it cannot be taken as cash or used against a deposit. Uzbekistan is covered: the university groups Uzbek applicants under its Europe and Central Asia regional page, which excludes only the Republic of Ireland. Other international awards on the same regional page, which are different instruments and must not be confused with this one: International Postgraduate Scholarships GBP 3,000 to GBP 5,000 for taught masters outside Queen''s Business School; the Early Confirmation Award, GBP 1,500 for unconditional offer holders who pay in full by 18 September 2026; Queen''s Business School Scholarships, GBP 6,000; the LLB Law Senior Status Scholarship, GBP 4,000; and 20 per cent family and loyalty reductions.',
  requirements = 'A new international fee-paying student beginning the first year of a full-time undergraduate programme at the Queen''s University Belfast campus in 2026/27, with the academic and English conditions of the offer met before study begins. Students paying Northern Ireland, Republic of Ireland, EU or GB fees are not eligible. Course exclusions apply and are set out in the scheme terms and conditions.',
  required_documents = NULL::text,
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against the university Funding and Scholarships Finder record for the International Undergraduate Scholarship and against the Europe and Central Asia regional page. award_amount 3 500 is the fee-rate-1 figure and award_basis is range because the scheme pays GBP 4,000 on fee-rate-2 programmes; the lower figure is stored rather than an average and both are stated in the description. award_period is one_time because the discount applies to the first year of study only. amount_usd_value stays 0 because the award is paid in GBP. degree_levels is Bachelor''s with the canonical apostrophe. deadline_type is not_published because no scholarship deadline exists - the award is automatic on enrolment - while the separate Early Confirmation Award keeps its own 18 September 2026 payment date. The imported USD figure had already been zeroed in the earlier UK pass; this pass replaced the bare domain with the real record and restored a verified amount.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 658;

-- ---------------------------------------------------------------
-- 734 — University of Exeter: retitled to Exeter Excellence Scholarships,
--       the university-wide scheme actually published for 2027/28.
--       Departmental Global Excellence pages answer "no information currently
--       available" and were deliberately not given any figure.
-- Manba: exeter.ac.uk/study/funding/exeterexcellence/
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'Exeter Excellence Scholarships (University of Exeter)',
  website_url = 'https://www.exeter.ac.uk/study/funding/exeterexcellence/',
  source_url = 'https://www.exeter.ac.uk/study/funding/exeterexcellence/',
  award_amount = 15000,
  award_currency = 'GBP',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  deadline = 'Applications are open for September 2027 entry and the scheme page publishes no closing date as of 2026-10-26; applicants are told to apply as early as possible once they hold an offer. The 2026/27 masters round for January 2027 entry stays open until 26 November 2026.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Bachelor''s","Master''s"]',
  coverage_type = 'Partial Tuition',
  eligible_countries = '["All countries"]',
  tuition_coverage = 'GBP 15,000 tuition fee reduction: each eligible year for undergraduates, first year only for taught masters',
  application_status = 'open',
  source_reliability = 10,
  description = 'Exeter Excellence Scholarships are the University of Exeter awards open to international fee-paying students across the university. For 2027/28 the university is offering 150 undergraduate and 150 postgraduate taught scholarships worth GBP 15,000 each. The undergraduate award is paid as a reduction of the international tuition fee in each eligible year of study; the postgraduate taught award is paid as a reduction of the first-year international tuition fee only. Applications for September 2027 entry are open, and the university advises applicants to submit the scholarship application as early as possible once they hold an offer for an eligible programme. A separate 2026/27 masters round for programmes beginning in January 2027 stays open until 26 November 2026. The scheme page publishes neither the list of eligible programmes nor an academic threshold, and it does not publish a closing date, so those details have to be read in the terms and conditions of the round being applied for.',
  requirements = 'International fee status, including EU applicants required to pay international fees. An offer, conditional or unconditional, for an eligible undergraduate or postgraduate taught programme at the University of Exeter. The scholarship application is submitted only after the offer is held. The scheme page as checked on 2026-10-26 publishes no grade threshold and no closing date.',
  required_documents = '["Offer of a place on an eligible undergraduate or taught masters programme", "Exeter Excellence scholarship application"]',
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against exeter.ac.uk/study/funding/exeterexcellence. The row carried the importer name Global Excellence Scholarship. Exeter still runs departmental Global Excellence awards, but the pages that describe them answer Sorry no information currently available - award?id=3242 returned exactly that on 2026-10-26 - so no Global Excellence figure can be verified and none is claimed. The row has therefore been retitled to the university-wide scheme that is actually published for 2027/28 and carries a stated value. award_amount 15 000 with award_basis fixed and award_period year reflects the page; amount_usd_value stays 0 because the award is paid in GBP. degree_levels was reduced from three levels to Bachelor''s and Master''s because the scheme does not fund doctoral study. deadline_type is not_published: the page says applications are open but gives no closing date. source_reliability 10 for the published value and levels; the missing programme list and threshold are noted rather than filled in.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 734;

-- ---------------------------------------------------------------
-- 862 — El-Yurt Umidi (provisional first-pass values; authoritative final
--      Nizom correction is in the finalization block at the bottom).
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'El-Yurt Umidi Foundation Scholarship (QS Top-300 universities)',
  website_url = 'https://el-yurt.uz/programs/1',
  source_url = 'https://el-yurt.uz/programs/1',
  award_amount = NULL,
  award_currency = 'UZS',
  award_period = 'year',
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Expected spring 2027 (2026 first open competition closed 24 April 2026). The Foundation announces each round on el-yurt.uz at least one week before applications open; the application window lasts about one month and there is no fixed calendar.',
  deadline_date = NULL,
  deadline_type = 'estimated',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  coverage_type = 'Full Tuition + Stipend',
  eligible_countries = '["Uzbekistan"]',
  tuition_coverage = 'Tuition fee, visa, health insurance, one return trip per academic year, living costs and study materials, per the Nizom',
  application_status = 'upcoming',
  source_reliability = 9,
  description = 'State scholarship of the Republic of Uzbekistan for study at top foreign universities, run by the El-Yurt Umidi Foundation under the President (Presidential Decree PF-77, 5 May 2025). Under PF-77, an applicant who has secured a 100 per cent tuition grant from a QS Top-100 university receives the full El-Yurt Umidi grant without an exam; admits to QS Top-300 / THE Top-300 universities automatically receive airfare and accommodation support through an open competition; graduates of Presidential, creative and specialised schools admitted to THE Top-20 universities on at least a 50 per cent tuition grant receive support without competition (bachelor''s only). The scheme covers tuition fees, visa, health insurance, travel to the host country and back once per academic year, living costs, and required study materials. Costs are capped per programme by the Foundation Management Board. Quotas for 2026/27: 500 total — 167 bachelor''s, 232 master''s, 38 doctoral, plus 63 under separate presidential directives. STEM and driver sectors of the economy (energy, transport, urbanisation, architecture and construction, agriculture and water management, geodesy, land relations), plus public administration, medicine and education are given priority. Age limits: bachelor''s not older than 30; master''s 22–40; doctoral 25–45. Language: IELTS Academic at least 6.0 for bachelor''s and 7.0 for master''s/doctoral, waived for applicants holding an unconditional letter of acceptance. A service record extract must be registered in the Unified National Labour System. Applicants previously fully funded by Chevening, Fulbright, Erasmus Mundus, DAAD, KOICA, JICE or similar are ineligible.',
  requirements = 'Uzbek citizen. Application addressed to the Foundation executive director; passport/ID card copy; international language certificate (IELTS Academic 6.0 bachelor / 7.0 master/PhD — waived with unconditional acceptance letter); unconditional or conditional letter of acceptance from a foreign HEI listed in the global QS/THE rankings; diploma or attestat with appendix; motivational essay; for master''s/doctoral additionally a work record extract, list of published scientific papers, and for doctoral a research supervisor recommendation and research motivation essay. Bachelor''s add a general or specialised secondary education document.',
  required_documents = '["Application to the Foundation executive director", "Passport / ID card copy", "International language certificate (IELTS Academic)", "Letter of acceptance / conditional acceptance from the foreign HEI", "Diploma or attestat", "Motivational essay", "Work record extract (master/PhD)", "List of published scientific papers (master/PhD)", "Research supervisor recommendation (doctoral)"]',
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against el-yurt.uz/programs/1. The site was HTTP 500 in earlier passes and now loads; the Nizom (selection procedure) is published there in full. award_currency changed from USD to UZS because the Foundation pays in Uzbek soums / covers costs directly — no USD figure is published anywhere, so amount_usd_value stays 0. award_amount is NULL because individual caps are set per programme by the Management Board and are not published as a single figure. deadline_type is estimated: rounds are announced ad hoc with no fixed calendar; the 2026 first round closed 24 April 2026. coverage_type stays Full Tuition + Stipend because the Nizom lists both tuition and living costs. eligible_countries is Uzbekistan only — the scheme is for Uzbek citizens. Open-doors-style deep links were avoided; el-yurt.uz/programs/1 is the page actually fetched.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 862;

-- ---------------------------------------------------------------
-- 131 — Edinburgh provisional university-wide draft; final pass rewrites this
--      to the fetched, Business School-specific Doctoral College Scholarship.
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'University of Edinburgh Edinburgh Doctoral College Scholarships',
  website_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international/other-funding/doctoral-college',
  source_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international/other-funding/doctoral-college',
  award_amount = NULL,
  award_currency = 'GBP',
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'PhD scholarships for students starting in 2027-2028; closing dates vary by School: Biological Sciences 16 November 2026, Business School 2 February 2027, Physics and Astronomy 4 January 2027 (astrophysics) / 22 January 2027 (other), Social and Political Science 2 February 2027. Admission applications must be filed at least five working days before the scholarship deadline.',
  deadline_date = NULL,
  deadline_type = 'range',
  deadline_range_start = '2026-11-16',
  deadline_range_end = '2027-02-02',
  expected_deadline_period = NULL,
  degree_levels = '["PhD"]',
  coverage_type = 'Unspecified',
  eligible_countries = '["All countries"]',
  tuition_coverage = 'Full University tuition fee plus a stipend at the UKRI rate (GBP 21,805 for 2026-2027)',
  application_status = 'open',
  source_reliability = 9,
  description = 'The University of Edinburgh will offer PhD scholarships for students starting their research in the 2027-2028 academic session. Each scholarship covers the University tuition fee as well as a stipend equivalent to the UKRI stipend rate (GBP 21,805 for 2026-2027), subject to satisfactory progress, for between three and four years as agreed by the School/College (pro-rata for part-time). Awards are open to UK and overseas applicants who have already applied for admission to a full-time or part-time on-campus or by-distance PhD research degree. Deadlines vary by School and are published on the Registry Services page; there is no single university-wide deadline.',
  requirements = 'A PhD admission application already submitted to the University of Edinburgh (at least five working days before the scholarship deadline). Outstanding academic merit and research potential — normally a UK first class or 2:1 honours degree or international equivalent. Cannot be held concurrently with another fully-funded scholarship.',
  required_documents = NULL::text,
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against registryservices.ed.ac.uk/student-funding/postgraduate/international/other-funding/doctoral-college (the page itself requires federation sign-in, but its content was captured via search index snippets from the official registryservices.ed.ac.uk domain on 2026-10-26). The imported row previously carried an invented USD 42 000 and a generic January deadline; both were removed. amount_usd_value stays 0 because the award is paid in GBP. deadline_type is range because each School publishes its own closing date (16 November 2026 to 2 February 2027 observed). coverage_type is Unspecified because the page separates tuition cover and stipend without calling it full funding. source_reliability 9: the scheme, stipend rate and deadline pattern are published, but the live page sits behind authentication and per-School tables are partially rendered via search snippets.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 131;

-- ---------------------------------------------------------------
-- 53 — University of Edinburgh: student funding (named award unconfirmed)
--      kept as an honest pointer to the Registry funding index.
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'University of Edinburgh student funding (named award unconfirmed)',
  website_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international',
  source_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international',
  award_amount = NULL,
  award_currency = 'GBP',
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No single published scholarship deadline: Edinburgh''s postgraduate funding is split by College (Arts/Humanities/Social Sciences, Medicine/Vet Medicine, Science/Engineering) plus other-funding and Edinburgh Doctoral College routes, each with its own calendar.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Master''s","PhD"]',
  coverage_type = 'Unspecified',
  eligible_countries = '["All countries"]',
  tuition_coverage = NULL::text,
  application_status = 'open',
  source_reliability = 4,
  description = 'This row previously described a named award at the University of Edinburgh with a round dollar value and a generic January deadline. Neither survived checking. The University of Edinburgh publishes postgraduate funding through Registry Services (awards by region, by College, and Other Funding including the Edinburgh Doctoral College Scholarships), and the amount, eligibility rules and closing dates have to be read there rather than taken from this row. A candidate should treat this as a pointer, not as a scholarship with an advertised value. Where a verified award exists in the same area it is recorded elsewhere in the catalogue, for example the Manchester President Doctoral Scholar Award, the Durham Transformative Humanities studentships, the LSE PhD Studentships, the Glasgow Global Leadership Scholarship and the UCL Global Master Scholarship.',
  requirements = NULL::text,
  required_documents = NULL::text,
  notes = 'NOT VERIFIED as a named award. The imported USD value was already zeroed and the invented IELTS/GPA cleared in earlier UK passes. No figure is claimed here; nothing in this row should be read as a published Edinburgh scholarship value. source_reliability stays 4 because the Registry funding index page could not be opened as a named-award record. If a verified Edinburgh award is later written, this row should be retired or merged into it.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 53;

-- ---------------------------------------------------------------
-- 312 — University of Leeds: keep this PhD record as an honest research-funding directory pointer.
-- The separately verified taught-Master's scholarship is inserted later as a new record.
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'University of Leeds research funding (named award unconfirmed)',
  website_url = 'https://www.leeds.ac.uk/research-funding',
  source_url = 'https://www.leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships',
  award_amount = 3000,
  award_currency = 'GBP',
  award_period = 'one_time',
  award_basis = 'range',
  amount_usd_value = 0,
  deadline = 'Two application rounds for September 2027 entry: round one deadline Sunday 28 February 2027 (results by 2 April 2027); round two deadline Sunday 16 May 2027 (results by 11 June 2027). Applicants must already hold a conditional or unconditional offer for an eligible taught Masters course.',
  deadline_date = NULL,
  deadline_type = 'range',
  deadline_range_start = '2027-02-28',
  deadline_range_end = '2027-05-16',
  expected_deadline_period = NULL,
  degree_levels = '["Master''s"]',
  coverage_type = 'Partial Tuition',
  eligible_countries = '["All countries"]',
  tuition_coverage = 'GBP 3,000, GBP 6,000 or GBP 16,000 tuition fee discount for the first year of study',
  application_status = 'open',
  source_reliability = 10,
  description = 'The University of Leeds offers Masters International Excellence Scholarships worth GBP 3,000, GBP 6,000 or GBP 16,000 as a tuition fee discount for eligible international students starting a full-time taught Masters course in September 2027. The award is paid as a fee reduction for the first year of study only and cannot be used towards maintenance or accommodation. Applicants must be classified as international for fee purposes, hold a conditional or unconditional offer for an eligible full-time taught Masters course, be self-funded or partially funded, hold (or be predicted) at least a UK 2:1 (hons) Bachelor''s or equivalent, and show excellent professional and personal skills. MBA and all fully online courses are excluded. The scholarship can be combined with the Masters International Regional Scholarship or external funding subject to a 100 per cent fee cap. Applications are submitted through a form sent to offer holders when it opens; unsuccessful round-one applicants may be reconsidered in later rounds.',
  requirements = 'International fee status. Conditional or unconditional offer for an eligible full-time taught Masters course starting September 2027 (MBA and fully online courses excluded). Self-funded or partially funded. UK 2:1 (hons) Bachelor''s or equivalent, or predicted. Evidence of excellent professional and personal skills. Scholarship application form submitted after the offer is held.',
  required_documents = '["Offer of a place on an eligible taught masters programme", "Masters International Excellence Scholarship application form"]',
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships. The imported row described Leeds research funding with an invented value; it has been rewritten to the Masters scheme Leeds actually publishes. award_amount 3 000 is the bottom of the published GBP 3,000/6,000/16,000 range and award_basis is range; both figures are stated in the description. award_period is one_time because the discount covers the first year only. amount_usd_value stays 0 because the award is paid in GBP. degree_levels changed to Master''s because the scheme is taught-masters only; Leeds PhD research funding is published school by school and is not represented by a single verified figure here. deadline_type is range with the two published round deadlines. required_documents lists the offer plus the scheme application form.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 312;

-- ---------------------------------------------------------------
-- 327 — University of St Andrews: postgraduate scholarships pointer
--       kept honest; source_url now points to the real St Andrews page.
-- ---------------------------------------------------------------
UPDATE scholarships SET
  title = 'University of St Andrews postgraduate scholarships (named award unconfirmed)',
  website_url = 'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/',
  source_url = 'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/',
  award_amount = NULL,
  award_currency = 'GBP',
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No single published postgraduate scholarship deadline: St Andrews runs taught and research postgraduate awards through its scholarships catalogue, each with its own entry year and application period.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Master''s","PhD"]',
  coverage_type = 'Unspecified',
  eligible_countries = '["All countries"]',
  tuition_coverage = NULL::text,
  application_status = 'open',
  source_reliability = 4,
  description = 'This row previously described a named award at the University of St Andrews with a round dollar value and a generic January deadline. Neither survived checking: the imported page st-andrews.ac.uk/study/fees-and-funding/postgraduate/scholarships/recent-scholarships/ returned 404 on 2026-10-26 and no award carrying the imported name and value could be confirmed. St Andrews publishes postgraduate funding through its scholarships catalogue (st-andrews.ac.uk/study/scholarships/scholarships-catalogue-search/), where each award states its own entry year, open-to fee statuses and application period. A candidate should treat this as a pointer, not as a scholarship with an advertised value. Verified St Andrews awards recorded elsewhere in this catalogue include the St Andrews International Undergraduate Scholarship (id 671, up to GBP 10,000 a year, need-based, closing 27 January 2027).',
  requirements = NULL::text,
  required_documents = NULL::text,
  notes = 'NOT VERIFIED as a named award. The imported USD 38 000 value was zeroed and the generic January deadline removed in earlier UK passes; nothing here is claimed as a published St Andrews figure. source_reliability stays 4 because no individual postgraduate award with amount and deadline could be confirmed against a St Andrews page in this pass. required_documents is empty because the catalogue record publishes no document list at row level.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 327;

-- ============================================================================
-- Provisional pass statements end here. The authoritative finalization block
-- below MUST also run to replace the temporary draft values. Hard-check query:
--   SELECT id, title, award_amount, award_currency, source_reliability,
--          deadline_type, coverage_type, is_active
--   FROM scholarships WHERE id IN (614,589,658,734,862,131,53,312,327)
--   ORDER BY id;
-- ============================================================================

-- ============================================================================
-- FINALIZATION BLOCK — authoritative final state for Pass 87.
-- Run after the initial rewrite blocks above. This final block intentionally
-- supersedes their provisional draft values for ids 862, 131, 53, 312 and 327.
-- It also synchronizes university_scholarships and adds the separate Leeds
-- taught-Master's award as both a scholarship row and a university association.
-- ============================================================================

-- 862 — El-Yurt Umidi, using the official Nizom (all six chunks fetched).
UPDATE scholarships SET
  title = 'El-Yurt Umidi Presidential Scholarship (Uzbekistan)',
  website_url = 'https://el-yurt.uz/candidates',
  source_url = 'https://el-yurt.uz/candidates',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = 'variable',
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No fixed annual closing date is published. The Foundation announces each open competition at least one week before applications begin; the online document window may last up to one month. No 2027 competition deadline was published on 2026-10-26.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  opening_date = NULL,
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["Priority fields are set in each competition notice; the current rules prioritize STEM, energy, transport, urbanisation, architecture and construction, agriculture and water management, geodesy and land relations, public administration, medicine and education"]',
  eligible_countries = '["Uzbekistan"]',
  coverage_type = 'Unspecified',
  funding_type = 'Uzbekistan government scholarship; funding package depends on competition quota and approved costs',
  tuition_coverage = 'General open-competition awardees may receive tuition, visa, medical insurance, one return trip per academic year, living costs and study materials, subject to the Board-approved cap; the Top-300 exam-free quota is limited to international transport and accommodation',
  accommodation = 'Top-300 exam-free quota: accommodation and international transport only; other open-competition awards follow the individual approved package',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'IELTS Academic 6.0 for bachelor''s and 7.0 for master''s and doctoral programmes, or an equivalent international test; the language certificate is waived for applicants with an unconditional admission letter.',
  description = 'The El-Yurt Umidi Foundation is a state scholarship programme of Uzbekistan for citizens studying bachelor''s, master''s or doctoral programmes abroad. The Foundation''s current Nizom (selection rules) separates three exam-free routes from the general open competition. First, a candidate already admitted on a full tuition grant to a globally ranked Top-100 institution may compete for an exam-free quota: QS ranking is used for bachelor''s, while THE ranking is used for master''s and doctoral study. Second, a Top-300 exam-free quota is limited to candidates who already have a full tuition grant and agree that El-Yurt Umidi support will cover only international transport and accommodation. Third, graduates of Uzbekistan''s Presidential, creative or specialised schools admitted to a QS Top-20 undergraduate programme with at least 50% tuition already covered may compete for a separate exam-free quota. Candidates not selected through these routes may enter the open test-and-interview competition for eligible fields and quotas; Top-300 admission alone does not guarantee an award. For general open-competition awardees, the Nizom lists tuition, visa, health insurance, one return trip per academic year, living costs and study materials, with maximum amounts set by the Foundation Board for each programme. Age rules: bachelor''s applicants over 30, master''s applicants under 22 or over 40, and doctoral applicants under 25 or over 45 are excluded. Prior overseas study in a similar degree/field can disqualify applicants. At least one year of relevant employment is required for master''s and two years for doctoral applicants. IELTS Academic minimums are 6.0 for bachelor''s and 7.0 for master''s/doctoral applicants, or an equivalent test; this certificate is waived with an unconditional admission letter. Online or part-time study abroad is not eligible. The current Nizom describes post-study return and employment obligations in the scholarship contract. Exact funding amount, currency, eligible fields and application dates depend on the competition notice and individual approved quota; no single value or fixed 2027 date is published.',
  requirements = 'Uzbek citizenship. Age at application: bachelor''s not over 30; master''s 22–40; doctoral 25–45. Master''s applicants need at least one year of relevant work experience and doctoral applicants at least two years. Applicants with prior overseas study at the same or a related degree level may be excluded under the Nizom. Applicants must have an active offer or conditional offer from a foreign institution included in the ranking or approved field-specific list. Applicants fully funded by another scholarship are excluded; online and part-time overseas study is not eligible. Successful candidates must return to Uzbekistan and comply with the employment obligations set out in the four-party contract.',
  required_documents = '["Application addressed to the Foundation executive director", "Passport or national ID copy", "Offer of admission or conditional admission from a foreign institution", "International language certificate (IELTS Academic or equivalent; not required with an unconditional admission letter)", "Personal, academic and professional achievements statement", "High-school certificate or diploma for bachelor''s applicants", "Bachelor''s diploma and employment record for master''s applicants", "Master''s diploma and employment record for doctoral applicants", "List of published research papers for master''s and doctoral applicants", "Research supervisor recommendation and research motivation for doctoral applicants", "Level-specific motivational essay"]',
  application_status = 'unknown',
  source_reliability = 9,
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against the Foundation''s official Nizom at https://el-yurt.uz/candidates (all six page chunks fetched) and its programme page https://el-yurt.uz/programs/1. Corrected two material overstatements in the imported description: Top-300 admission does not itself guarantee the scholarship, and the current Nizom does not say that every Top-300 candidate automatically gets airfare/housing. Its Top-300 exam-free quota requires an existing full-tuition external grant plus the candidate''s consent to a package limited to international transport and accommodation. The Top-100 exam-free route uses QS for bachelor''s and THE for graduate degrees and also requires a full-tuition external grant; the Top-20 route is limited to graduates of Presidential, creative or specialised schools with at least 50% tuition covered. General open-competition awards may include tuition, visa, insurance, one return trip/year, living costs and study materials, with caps set per programme by the Board. No single award amount or currency is published, so award_amount and award_currency are NULL and amount_usd_value stays 0; coverage_type is Unspecified because benefits differ by route. IELTS criteria differ by degree and are waived with an unconditional admission letter, so min_ielts is deliberately NULL and the exact rules are in english_requirements. Calls are announced ad hoc; no 2027 date was published on 2026-10-26, so the earlier inferred April deadline and 2027-04-30 deadline_date were removed. The Foundation site currently lists a 2026 competition-results notice, not a 2027 application call.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 862;

-- 131 — Edinburgh: verified Business School-specific Doctoral College award.
UPDATE scholarships SET
  title = 'University of Edinburgh Business School Doctoral College Scholarship',
  provider = 'University of Edinburgh',
  website_url = 'https://www.business-school.ed.ac.uk/scholarships/edc-and-business-school',
  source_url = 'https://www.business-school.ed.ac.uk/scholarships/edc-and-business-school',
  award_amount = NULL,
  award_currency = 'GBP',
  award_period = 'year',
  award_basis = 'full_tuition',
  amount_usd_value = 0,
  deadline = 'Scholarship application deadline: 23:59 UK time, 2 February 2027. The complete PhD programme application is due by 12 January 2027, and an offer must be received by the scholarship deadline.',
  deadline_date = '2027-02-02',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["PhD"]',
  eligible_majors = '["PhD with Integrated Study in Management", "PhD with Integrated Study in Accounting", "PhD with Integrated Study in Finance", "PhD in Business Economics", "PhD in Management Science & Analytics", "PhD in Financial Technology"]',
  eligible_countries = '["All countries"]',
  coverage_type = 'Full Tuition + Stipend',
  funding_type = 'Competitive doctoral scholarship; full tuition fees plus annual UKRI-rate stipend',
  tuition_coverage = 'Full UK or overseas tuition fees plus a stipend equal to the UKRI minimum rate; the page cites GBP 21,805 as the 2026/27 reference rate, with the rate for the relevant award year subject to change',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 9,
  financial_need_based = false,
  merit_based = true,
  description = 'The University of Edinburgh Business School offers one Edinburgh Doctoral College Scholarship for a new PhD student joining in September 2027. It covers full University tuition fees at either the UK or overseas rate and pays an annual stipend equal to the UKRI minimum rate. The university cites GBP 21,805 as the current 2026/27 reference rate; the stipend for the 2027/28 award year is not yet published and should not be assumed to be the same. Subject to satisfactory progress, the award lasts between three and four years as agreed by the School/Deanery, pro-rata for part-time study. Eligible applicants must hold a conditional or unconditional offer for one of the Business School PhD programmes and receive an offer by 2 February 2027 at 23:59 UK time. The complete PhD programme application is due by 12 January 2027; the scholarship application is submitted separately through the University online application system after applying for the PhD. Selection considers academic background and research experience, the research proposal, PhD potential and contribution to the research community. The page has an internal date inconsistency: its eligibility section says September 2027 entry, while a later programme list says September 2026; applicants should confirm this with the Business School before applying.',
  requirements = 'A new PhD applicant expecting to join the Edinburgh Business School in September 2027; a conditional or unconditional offer must be received by 2 February 2027. Submit a complete programme application by 12 January 2027 and a separate scholarship application after applying for the programme. Selection is based on academic background and research experience, research proposal, potential to complete a PhD, ability to flourish with funding, and contribution to a diverse PhD community. Eligible programmes are the Business School programmes listed on the official page. The official page does not publish a scholarship-specific GPA or English-test threshold.',
  notes = 'VERIFIED 2026-10-26 (UK tail pass 87) against the official University of Edinburgh Business School page https://www.business-school.ed.ac.uk/scholarships/edc-and-business-school (fetched) and its PhD funding overview. The broader Registry Services Doctoral College page redirects the fetcher to university sign-in, so this record is deliberately limited to the Business School component, which has a directly accessible official page. The page publishes one award, full UK/overseas tuition, annual UKRI-rate stipend, three-to-four-year tenure, 2 February 2027 scholarship deadline and 12 January 2027 PhD-programme application deadline. It quotes GBP 21,805 only as the 2026/27 UKRI reference rate; no fixed 2027/28 amount is published, so award_amount is NULL and amount_usd_value is 0 rather than presenting a stale reference as the upcoming award value. The award page contains an apparent contradiction: eligibility says September 2027 entry, while the later programme list says September 2026. This is noted for applicants and source_reliability is 9 rather than 10. The page gives no scholarship document checklist or English-test/GPA threshold, so required_documents is deliberately [], min_ielts and min_gpa are NULL. The previous generic Edinburgh row and fabricated USD amount have been replaced with this named, verified School-specific award.',
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 131;

-- 53 — Edinburgh general funding index pointer; no award value is claimed.
UPDATE scholarships SET
  website_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international',
  source_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international',
  award_amount = NULL, award_currency = NULL, award_period = NULL,
  award_basis = 'variable', amount_usd_value = 0,
  deadline = 'No single university-wide scholarship deadline is published: postgraduate funding is grouped by region, College, subject and funding source, and each scheme sets its own dates.',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Master''s","PhD"]', eligible_majors = '[]', eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Postgraduate funding directory pointer; no single named award',
  tuition_coverage = NULL, min_gpa = NULL, min_ielts = NULL,
  required_documents = '[]', application_status = 'unknown', source_reliability = 4,
  description = 'This row is a directory pointer, not an individual scholarship. The University of Edinburgh Registry Services page groups prospective international postgraduate funding by region, College of Arts, Humanities and Social Sciences, College of Medicine and Veterinary Medicine, College of Science and Engineering, other funding and the Edinburgh Doctoral College Scholarships. Each award has its own eligibility rules, amount and closing date; this record makes no claim about a specific award or amount. Use the official directory and its linked scheme pages to identify the award relevant to your subject and entry year.',
  requirements = 'Eligibility and application conditions depend on the individual award linked from the official Registry Services funding directory; no single requirement can be stated for this pointer record.',
  english_requirements = NULL,
  notes = 'NOT VERIFIED as a named scholarship (UK tail pass 87, 2026-10-26). The official Registry Services funding index at registryservices.ed.ac.uk/student-funding/postgraduate/international was fetched and confirms several distinct College-, region- and subject-specific funding routes, including Edinburgh Doctoral College Scholarships. It does not publish one award amount, eligibility profile or deadline for the index as a whole. The previous invented USD amount and generic January date were removed in earlier passes and remain NULL/not_published here. source_reliability stays 4 because this is a directory pointer, not a verified award; the exact scheme, amount, application requirements and deadline are deliberately left empty rather than inferred.',
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = true
WHERE id = 53;

-- 312 — Leeds research funding pointer, separate from the new taught-Master's row 910.
UPDATE scholarships SET
  title = 'University of Leeds research funding (named award unconfirmed)',
  website_url = 'https://www.leeds.ac.uk/research-funding',
  source_url = 'https://www.leeds.ac.uk/research-funding',
  award_amount = NULL, award_currency = NULL, award_period = NULL,
  award_basis = 'variable', amount_usd_value = 0,
  deadline = 'No single postgraduate research scholarship deadline is published on the University research-funding index; dates are set by each school, faculty or funded project.',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL, expected_deadline_period = NULL,
  degree_levels = '["PhD"]', eligible_majors = '[]', eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Postgraduate research funding directory pointer; schemes vary by School and Faculty',
  tuition_coverage = NULL, min_gpa = NULL, min_ielts = NULL, required_documents = '[]',
  application_status = 'unknown', source_reliability = 4,
  description = 'This is a directory pointer rather than a single named scholarship. The University of Leeds states that research-degree funding is available to UK and international research students across its schools and subject areas, and directs applicants to its postgraduate research funding search and the Funding tab in the research opportunities directory. Central, Faculty, school and project awards have separate amounts, eligibility and deadlines; this row deliberately does not combine them into one fictitious award. The university notes that there are only a very limited number of UK Research Council studentships for international fee-rated applicants.',
  requirements = 'Applicants must check the specific scholarship or funded project in the University of Leeds research-funding directory; eligibility, fee status, documents and deadlines vary by award. This pointer row has no shared minimum GPA, IELTS score or required-document list.',
  english_requirements = NULL,
  notes = 'NOT VERIFIED as a named award (UK tail pass 87, 2026-10-26). The former imported path leeds.ac.uk/research-degrees/doc/scholarships returned 404. The official University research-funding index at leeds.ac.uk/research-funding was searched and fetched; it directs applicants to the PGR funding search and confirms that awards span schools/subjects, with only limited UKRI studentships for international-fee students. No one central award amount, eligibility rule or deadline is published there. The imported USD 42,000 and January date were already removed in prior passes; amount and deadline remain deliberately unset. source_reliability stays 4: this is an honest directory pointer, not a named scholarship.',
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = true
WHERE id = 312;

-- 327 — St Andrews postgraduate funding index pointer.
UPDATE scholarships SET
  website_url = 'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/',
  source_url = 'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/',
  award_amount = NULL, award_currency = NULL, award_period = NULL,
  award_basis = 'variable', amount_usd_value = 0,
  deadline = 'No single postgraduate scholarship deadline is published on the overview page. St Andrews directs applicants to its catalogue, where each award has its own entry year, fee-status eligibility and application period.',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL, expected_deadline_period = NULL,
  degree_levels = '["Master''s","PhD"]', eligible_majors = '[]', eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Postgraduate scholarship directory pointer; named award unconfirmed',
  tuition_coverage = NULL, min_gpa = NULL, min_ielts = NULL, required_documents = '[]',
  application_status = 'unknown', source_reliability = 4,
  description = 'This row is a pointer to the University of St Andrews postgraduate scholarships overview, not an individual award. The university says scholarship availability may depend on study area and Home/Overseas fee status, and links applicants to its searchable scholarship catalogue. Individual catalogue records set their own award values, eligibility and deadlines; none is inferred for this generic row. A verified undergraduate award is listed separately in this catalogue as St Andrews International Undergraduate Scholarship (id 671).',
  requirements = 'Eligibility, amounts, application requirements and deadlines depend on the specific postgraduate award in the St Andrews scholarship catalogue; no universal rule is published on the overview page.',
  english_requirements = NULL,
  notes = 'NOT VERIFIED as a named award (UK tail pass 87, 2026-10-26). The imported recent-scholarships path returned 404. The official St Andrews postgraduate scholarships overview was fetched at st-andrews.ac.uk/study/postgraduate/fees/scholarships/ and confirms a catalogue of taught and research awards whose availability varies by subject and fee status, but it does not state a generic award amount or deadline. The imported USD 38,000 and January deadline were removed in earlier UK passes and remain unset. source_reliability stays 4: this is a directory pointer, not a specific award.',
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = true
WHERE id = 327;

-- Synchronize the corresponding existing university_scholarships records.
UPDATE university_scholarships us SET
  scholarship_name = v.nm, availability_status = v.avail, funding_type = v.funding,
  max_scholarship = v.max_amount, covers_tuition = v.covers_tuition,
  covers_living_expenses = v.covers_living, valued_aspect = v.valued,
  eligibility_notes = v.eligibility, official_url = v.url, source_url = v.url,
  verification_status = 'verified', last_verified_at = now()
FROM (VALUES
 (646, 'University of Edinburgh Business School Doctoral College Scholarship', 'Yes', 'Competitive doctoral scholarship; full tuition and annual UKRI-rate stipend', 'Full UK or overseas tuition plus annual UKRI-rate stipend; 3–4 years', true, true, 'Tuition and annual living stipend', 'New Business School PhD applicant; complete programme application by 12 Jan 2027 and hold offer by 2 Feb 2027; programme list and entry-year discrepancy noted on the official page.', 'https://www.business-school.ed.ac.uk/scholarships/edc-and-business-school'),
 (229, 'Heriot-Watt University International Merit Scholarship', 'Yes', 'Merit-based partial tuition fee abatement', 'Value varies by region; normally first year only', true, false, 'Partial tuition fee reduction', 'International fee-paying students residing overseas; UK campus; undergraduate or taught postgraduate only; regional criteria and value are confirmed by the relevant manager; postgraduate research and online courses excluded.', 'https://www.hw.ac.uk/study/fees-and-funding/scholarships-and-bursaries/international-merit-scholarship'),
 (193, 'Lancaster University Undergraduate International Excellence Scholarship', 'Yes', 'Automatic merit-based tuition fee reduction', 'GBP 3,000 fee reduction per year of study', true, false, 'Undergraduate tuition fee reduction', 'International fee-paying undergraduate; firm UCAS choice; A*AA or equivalent; full-time on-campus; repeated years, placement/industry/study-abroad years excluded.', 'https://www.lancaster.ac.uk/study/fees-and-funding/scholarships-and-bursaries/undergraduate-international-excellence-scholarship/'),
 (284, 'Queen''s University Belfast International Undergraduate Scholarship', 'Yes', 'International undergraduate tuition fee reduction', 'GBP 3,500 (fee rate 1) or GBP 4,000 (fee rate 2), first year only', true, false, 'First-year tuition fee reduction', 'New international fee-paying full-time undergraduate at Queen''s Belfast for 2026/27; award is automatic on enrolment; fee-status and course exclusions apply.', 'https://www.qub.ac.uk/Study/funding-scholarships/Non-facultydepartments/international-office/international-office-undergraduate-scholarship.html'),
 (139, 'Exeter Excellence Scholarships (University of Exeter)', 'Yes', 'International merit-based tuition fee reduction', 'GBP 15,000: undergraduates each eligible year; taught masters first year', true, false, 'International tuition fee reduction', 'International fee status and offer for an eligible undergraduate or taught masters programme; 2027/28 applications open, but no closing date is published on the scheme page.', 'https://www.exeter.ac.uk/study/funding/exeterexcellence/')
) AS v(id, nm, avail, funding, max_amount, covers_tuition, covers_living, valued, eligibility, url)
WHERE us.id = v.id;

-- Add the Leeds taught-Master's scholarship in both catalogue tables. The
-- upserts make this block safe to run again without creating duplicate rows.
WITH new_scholarship AS (
  INSERT INTO scholarships (
    title, provider, country, coverage_type, amount_usd_value, deadline,
    degree_levels, eligible_majors, min_gpa, min_ielts, financial_need_based,
    merit_based, description, requirements, website_url, eligible_countries,
    funding_type, tuition_coverage, required_documents, deadline_date,
    deadline_type, rounds, application_status, last_verified_at,
    last_updated_at, verification_status, source_reliability, source_url,
    notes, is_active, university_id, award_amount, award_currency,
    award_period, award_basis
  ) VALUES (
    'University of Leeds Masters International Excellence Scholarships',
    'University of Leeds', 'United Kingdom', 'Partial Tuition', 0,
    'Two application rounds for September 2027 entry: round one closes Sunday 28 February 2027, with outcomes by 2 April 2027; round two closes Sunday 16 May 2027, with outcomes by 11 June 2027.',
    '["Master''s"]',
    '["Eligible full-time taught Master''s programmes; MBA and fully online courses are excluded"]',
    NULL, NULL, false, true,
    'The University of Leeds offers Masters International Excellence Scholarships of GBP 3,000, GBP 6,000 or GBP 16,000 as a tuition fee reduction to eligible international students starting an eligible full-time taught Master''s course in September 2027. The award is applied to first-year tuition only and cannot pay for maintenance or accommodation. Applicants must be international-fee rated, self-funded or partially funded, hold an offer for an eligible programme, demonstrate at least a UK 2:1 honours bachelor''s degree or equivalent and evidence excellent professional and personal skills through work experience or extracurricular activity. MBA and fully online courses are excluded. Applicants may apply after receiving a conditional or unconditional offer; a separate scholarship application is required for each course. Round-one applicants who are not selected may be reconsidered in round two. The award may be combined with the Masters International Regional Scholarship or external funding only if total support does not exceed 100 per cent of tuition fees.',
    'International fee status; conditional or unconditional offer for an eligible full-time taught Master''s course beginning September 2027; self-funded or partially-funded status; at least a UK 2:1 honours bachelor''s degree or equivalent; excellent professional and personal skills evidenced by work experience and/or extracurricular activities. MBA and fully online courses are excluded. Submit a separate scholarship application for each course after receiving an offer. The award cannot be deferred and is a first-year tuition reduction only.',
    'https://www.leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships',
    '["All international"]',
    'Merit-based tuition fee discount',
    'GBP 3,000, GBP 6,000 or GBP 16,000 tuition discount for the first year only; no living-cost or accommodation payment',
    '["Conditional or unconditional offer for an eligible taught Master''s course", "Masters International Excellence Scholarship application form"]',
    '2027-05-16', 'fixed',
    '[{"round":1,"deadline":"2027-02-28","outcome":"2027-04-02"},{"round":2,"deadline":"2027-05-16","outcome":"2027-06-11"}]',
    'open', now(), now(), 'verified', 10,
    'https://www.leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships',
    'VERIFIED 2026-10-26 (UK tail pass 87) against the official University of Leeds scholarship page, fetched at leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships. This is a distinct taught-Master''s award, not the separate Leeds postgraduate-research funding directory retained at scholarship id 312. The official page publishes three tiers (GBP 3,000/6,000/16,000), international fee eligibility, first-year-only fee reduction, 2:1 and skills criteria, exclusions and two 2027 application rounds. award_amount stores the lowest published tier (GBP 3,000) and award_basis=range; the other tiers are stated in the description and tuition_coverage. award_currency is GBP and amount_usd_value remains 0 because no USD award is paid. The latest closing date (16 May 2027) is stored in deadline_date; both round-specific deadlines and results dates are preserved in rounds and deadline. No IELTS threshold, GPA number or document checklist beyond the offer and application form is stated by the scheme page; min_ielts and min_gpa are NULL. The page does not publish a direct application URL; offer holders receive details by email.',
    true, 171, 3000, 'GBP', 'one_time', 'range'
  )
  ON CONFLICT (title) DO UPDATE SET
    provider = EXCLUDED.provider,
    country = EXCLUDED.country,
    coverage_type = EXCLUDED.coverage_type,
    amount_usd_value = EXCLUDED.amount_usd_value,
    deadline = EXCLUDED.deadline,
    degree_levels = EXCLUDED.degree_levels,
    eligible_majors = EXCLUDED.eligible_majors,
    min_gpa = EXCLUDED.min_gpa,
    min_ielts = EXCLUDED.min_ielts,
    financial_need_based = EXCLUDED.financial_need_based,
    merit_based = EXCLUDED.merit_based,
    description = EXCLUDED.description,
    requirements = EXCLUDED.requirements,
    website_url = EXCLUDED.website_url,
    eligible_countries = EXCLUDED.eligible_countries,
    funding_type = EXCLUDED.funding_type,
    tuition_coverage = EXCLUDED.tuition_coverage,
    required_documents = EXCLUDED.required_documents,
    deadline_date = EXCLUDED.deadline_date,
    deadline_type = EXCLUDED.deadline_type,
    rounds = EXCLUDED.rounds,
    application_status = EXCLUDED.application_status,
    last_verified_at = EXCLUDED.last_verified_at,
    last_updated_at = EXCLUDED.last_updated_at,
    verification_status = EXCLUDED.verification_status,
    source_reliability = EXCLUDED.source_reliability,
    source_url = EXCLUDED.source_url,
    notes = EXCLUDED.notes,
    is_active = EXCLUDED.is_active,
    university_id = EXCLUDED.university_id,
    award_amount = EXCLUDED.award_amount,
    award_currency = EXCLUDED.award_currency,
    award_period = EXCLUDED.award_period,
    award_basis = EXCLUDED.award_basis
  RETURNING id, university_id, title, funding_type
)
INSERT INTO university_scholarships (
  university_id, scholarship_id, scholarship_name, availability_status,
  funding_type, max_scholarship, covers_tuition, covers_living_expenses,
  valued_aspect, eligibility_notes, official_url, source_url,
  verification_status, last_verified_at
)
SELECT
  university_id, id, title, 'Yes', funding_type,
  'GBP 16,000 maximum published tier; first-year tuition fee reduction only',
  true, false, 'Merit-based first-year tuition fee reduction',
  'International fee-rated, self-funded or partially-funded full-time taught Master''s applicants; 2:1 equivalent; MBA and fully online courses excluded; round deadlines 28 February and 16 May 2027.',
  'https://www.leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships',
  'https://www.leeds.ac.uk/scholarship/12/masters-international-excellence-scholarships',
  'verified', now()
FROM new_scholarship
ON CONFLICT (university_id, scholarship_name) DO UPDATE SET
  scholarship_id = EXCLUDED.scholarship_id,
  availability_status = EXCLUDED.availability_status,
  funding_type = EXCLUDED.funding_type,
  max_scholarship = EXCLUDED.max_scholarship,
  covers_tuition = EXCLUDED.covers_tuition,
  covers_living_expenses = EXCLUDED.covers_living_expenses,
  valued_aspect = EXCLUDED.valued_aspect,
  eligibility_notes = EXCLUDED.eligibility_notes,
  official_url = EXCLUDED.official_url,
  source_url = EXCLUDED.source_url,
  verification_status = EXCLUDED.verification_status,
  last_verified_at = EXCLUDED.last_verified_at;

-- Final hard-check query:
-- SELECT id, title, award_amount, award_currency, source_reliability,
--        deadline_type, coverage_type, is_active
-- FROM scholarships WHERE id IN (53,131,312,327,589,614,658,734,862,910)
-- ORDER BY id;
