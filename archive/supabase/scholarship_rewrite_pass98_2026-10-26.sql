-- ScholarBridge AI - Scholarship Rewrite Pass 98 - 2026-10-26
-- Australia cluster continued: 382 RMIT, 438 Curtin, 439 Newcastle (AU).
-- All three were generic RTP-framework records at reliability 4.
-- 382/438 rewritten from live official pages fetched 2026-10-26 (rel 10);
-- 439 retired (rel 9): Newcastle's own page states its RTP schemes are
-- currently domestic-only. Statements below replay the exact executed SQL.
-- See docs/SCHOLARSHIP_REWRITE_PASS_98_2026-10-26.md.

-- 382 RMIT -> Research Stipend Scholarships (RTP RSS and RRSS), AUD 36,245 p.a.
UPDATE scholarships SET
  title = 'RMIT Research Stipend Scholarships (RTP RSS and RRSS)',
  provider = 'RMIT University',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  deadline = $dl$Central round for 2027 commencement: expressions of interest opened 1 June 2026; the international EOI deadline was 30 August 2026 and the international full-application deadline 30 September 2026, so the round is closed (RMIT's page banner still says OPEN, but its own date table governs). Dates for the next (2028) round are not yet published.$dl$,
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["All research fields (advertised projects or an own proposal aligned to RMIT research strengths)"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$RMIT University awards its central research stipends under two schemes in one competitive round: the Australian Government RTP Stipend Scholarship (RSS) and the RMIT-funded RMIT Research Stipend Scholarship (RRSS); one application automatically considers you for every scholarship you are eligible for. The stipend was AUD 36,245 per annum pro rata for full-time study in the 2026 round, indexed annually (RMIT notes 2027-round benefit details are to be released). International recipients are additionally awarded an RTP International Tuition Fee Offset Scholarship (RIFOS) or an RMIT Research International Tuition Fee Scholarship (RRITFS), so tuition is offset alongside the stipend. The package also includes a relocation allowance (up to AUD 515 per adult and AUD 255 per child, maximum AUD 1,540) and paid sick, maternity and parenting leave within the terms and conditions. Standard duration is three and a half years full-time for a doctorate and two years full-time for a research masters. Applicants who want to be considered for the selective RMIT Vice-Chancellor's PhD Scholarship (VCPS) submit an additional VCPS expression-of-interest form in the same round.$desc$,
  requirements = $req$Competitive ranking on academic achievement, research outputs and relevant professional experience; priority is given to applicants with high distinction (80% or higher at RMIT) in the final two years of the qualifying program or equivalent attainment. Every expression of interest must include evidence that an RMIT academic agrees to supervise the research (from June 2026, the In-Principle Supervisor Supporting Statement form). You must be able to receive the scholarship for at least 12 months full-time, be enrolled and primarily based at an RMIT Australian campus, not have completed a research degree at the same or higher level, not previously have held an RMIT or Commonwealth-funded postgraduate research scholarship (unless terminated within six months of payments starting), and not be receiving an equivalent award worth more than 75% of the stipend. International applicants must meet RMIT's English language requirements by the application closing date. Currently enrolled or transferring candidates need at least 24 months (PhD) or 12 months (Masters) of candidature remaining. Awards cannot be deferred to another year.$req$,
  funding_type = 'Australian Government RTP (RSS) and RMIT-funded (RRSS) stipends; international recipients also receive a tuition fee offset scholarship (RIFOS/RRITFS)',
  tuition_coverage = 'International stipend recipients are also awarded an RTP International Tuition Fee Offset Scholarship (RIFOS) or an RMIT Research International Tuition Fee Scholarship (RRITFS), so tuition fees are offset for the scholarship duration; local candidates receive an RTP Fee Offset and pay no tuition for the maximum candidature duration.',
  living_allowance = 36245,
  english_requirements = 'International applicants must meet RMIT''s English language requirements by the application closing date; the required test scores are set per research program, so no single score is stored here.',
  required_documents = $json$["Expression of interest with the In-Principle Supervisor Supporting Statement (evidence an RMIT academic agrees to supervise)","Research proposal or statement of interest for up to three nominated projects (college-dependent)","Academic transcripts and evidence of research outputs/experience","English proficiency evidence meeting the program requirement by the closing date"]$json$,
  website_url = 'https://www.rmit.edu.au/scholarships/research/research-stipend',
  source_url = 'https://www.rmit.edu.au/scholarships/research/research-stipend',
  application_url = 'https://www.rmit.edu.au/research/research-degrees/how-to-apply',
  deadline_date = NULL, deadline_type = 'not_published', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"round":"2027 central round - international","eoi_open":"2026-06-01","eoi_deadline":"2026-08-30","full_application_deadline":"2026-09-30","offers_from":"2026-11-23","outcomes_finalised":"March 2027","expected_commencement":"March 2027"},{"round":"2027 central round - domestic","eoi_deadline":"2026-09-30","full_application_deadline":"2026-10-30","offers_from":"2026-12-14"}]$json$,
  recurrence = 'annual',
  expected_opening_period = NULL,
  expected_deadline_period = $exp$RMIT runs one central round per year for the following year's commencement (the 2027 round opened expressions of interest on 1 June 2026, with international deadlines of 30 August 2026 for the EOI and 30 September 2026 for the full application). Dates for the 2028 round had not been published when the pages were read on 2026-10-26.$exp$,
  application_status = 'closed',
  verification_status = 'verified', source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (pass 98) from RMIT's official Research Stipend Scholarships page and research-degree 'How to apply' page, both fetched the same day: RSS (government) and RRSS (RMIT) in one central round with automatic consideration; stipend AUD 36,245 p.a. pro rata at the 2026-round rate (the page states 2027-round benefit details are still to be released; the rate is indexed annually); international recipients also awarded RIFOS/RRITFS tuition offset; relocation allowance up to AUD 515/adult + 255/child (max AUD 1,540); duration 3.5 years PhD / 2 years Masters; priority to high distinction (80%+) in the final two years; 2027 round international deadlines EOI 30 August 2026 and full application 30 September 2026. The importer's title named the Vice-Chancellor's PhD Scholarship (VCPS), which does exist at RMIT but only as an additional selective consideration inside the same round (separate VCPS EOI form); this record documents the main stipend route and mentions VCPS without storing a VCPS value, which was not fetched. The previous record was the generic RTP framework at reliability 4 (invented USD 40,000 and copied August 31 deadline already stripped). RMIT's banner still reads OPEN although the international deadlines in its own table have passed, so the status is stored as closed with deadline_date NULL/'not_published'. min_gpa NULL (80% is a priority marker, not a hard cut-off, and not a GPA); min_ielts NULL (per-programme scores). university_scholarships row 609 synced; source 2605 repointed from the bare domain.$note$,
  university_id = 109,
  award_amount = 36245, award_currency = 'AUD', award_period = 'year', award_basis = 'fixed'
WHERE id = 382;

-- 438 Curtin -> RTP Central Scholarship Round, AUD 38,440 p.a., PhD only
UPDATE scholarships SET
  title = 'Curtin University Research Training Program (RTP) Scholarship (Central Scholarship Round)',
  provider = 'Curtin University',
  coverage_type = 'Living Stipend',
  amount_usd_value = 0,
  deadline = $dl$Expressions of Interest run 1-31 July each year. Applications are closed for the 2027 intake; Curtin states applications for the 2028 intake will open in July 2027, so the next EOI deadline is 31 July 2027. You must secure an endorsed Invitation to Apply from a registered Curtin supervisor (issued by end of August), outcomes are released in November, and successful recipients must enrol and start by 31 March.$dl$,
  degree_levels = $json$["PhD"]$json$,
  eligible_majors = $json$["All disciplines (listed HDR projects or a candidate-proposed project with a registered Curtin supervisor)"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$Curtin University fills its Australian Government Research Training Program (RTP) scholarships through an annual Central Scholarship Round open to current and future students, domestic and international. The Curtin PhD base stipend is AUD 38,440 per annum tax-free at the 2026 rate, for a maximum of three years and six months full-time equivalent; Curtin notes the rate may be indexed each year in line with CPI (normally 2%) at the Research Office's discretion and is normally higher than the federal RTP base rate. Curtin values the total annual package - stipend plus tuition-fee coverage for domestic students - at approximately AUD 70,000 per year; the central-round page does not state that an international recipient's tuition is offset, so this record stores the stipend only and international applicants should confirm any fee-offset component in their offer. The process is project-based: submit an Expression of Interest between 1 and 31 July for an advertised HDR project or your own project, obtain an endorsed Invitation to Apply from a registered Curtin supervisor, with outcomes in November and enrolment by 31 March. RTP scholarships at Curtin are available to PhD applicants only - MPhil candidates are not eligible.$desc$,
  requirements = $req$Be applying for a Doctor of Philosophy at Curtin (MPhil applications are not eligible for an RTP Scholarship), as a current or future student of any citizenship (domestic and international applicants are both listed). Submit an Expression of Interest between 1 and 31 July to the advertised project lead or a level 1 research supervisor, and secure an endorsed Invitation to Apply - shortlisting happens only once and only your first project nomination is ranked. Applicants who have previously completed a PhD are not eligible. Current Curtin HDR students must additionally not be receiving an HDR base stipend, have their principal supervisor's support, hold Good Standing status, and have completed no more than 18 months of full-time-equivalent enrolment as at 1 July of the application year. Submit the HDR admission application only after the scholarship outcome; successful recipients must enrol and start by 31 March.$req$,
  funding_type = 'Australian Government Research Training Program stipend awarded through the Curtin Central Scholarship Round',
  tuition_coverage = $tc$Curtin's central-round page values the package at approximately AUD 70,000 per year including tuition-fee coverage for domestic students. It does not state that tuition fees are offset for international recipients, so no international tuition benefit is claimed in this record; an RTP Fee Offset exists as an RTP component at Curtin, but international applicants must confirm in their offer letter whether one is attached.$tc$,
  living_allowance = 38440,
  english_requirements = 'English requirements sit in Curtin HDR admission criteria rather than on the scholarship-round page; no single score is published on the page read, so none is stored.',
  required_documents = $json$["Expression of Interest (1-31 July) to the advertised project lead or a registered Curtin supervisor","Endorsed Invitation to Apply from the nominated supervisor (by end of August)","Referee information as specified in the Invitation (a second referee report is strongly recommended)","HDR admission application - submitted only after the scholarship outcome (November)"]$json$,
  website_url = 'https://www.curtin.edu.au/research/hdr-r-projects/central-scholarship-round-rtp-scholarship/',
  source_url = 'https://www.curtin.edu.au/research/hdr-r-projects/central-scholarship-round-rtp-scholarship/',
  application_url = 'https://curtin.ap21.smartcommunications.cloud/produce/wizard/50364b9e-f47f-4247-a427-c128b066483f/',
  deadline_date = '2027-07-31', deadline_type = 'fixed', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"intake":"2027","status":"closed","eoi_window":"1-31 July 2026","outcomes":"November 2026","enrol_by":"31 March 2027"},{"intake":"2028","status":"opens July 2027 (stated on the Curtin page)","eoi_window":"1-31 July 2027","outcomes":"November 2027","enrol_by":"31 March 2028"}]$json$,
  recurrence = 'annual',
  expected_opening_period = 'The 2028-intake round opens in July 2027 (Expression of Interest window 1-31 July).',
  expected_deadline_period = $exp$Annual central round: Expression of Interest window 1-31 July, Invitation to Apply by end of August, outcomes in November, enrolment by 31 March. The next EOI deadline is 31 July 2027 for the 2028 intake.$exp$,
  application_status = 'upcoming',
  verification_status = 'verified', source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (pass 98) from Curtin University's official Central Scholarship Round (RTP Scholarship) page fetched the same day: open to domestic and international PhD applicants (MPhil explicitly ineligible); 2026 base stipend AUD 38,440 p.a. tax-free for up to 3.5 years FTE, CPI indexation at the Research Office's discretion; EOI 1-31 July, Invitation to Apply by end of August, outcomes November, enrol by 31 March; 2027 intake closed, 2028 intake opens July 2027. The importer's 'CIPRS' title used Curtin's former international scholarship branding; the previous record was the generic RTP framework at reliability 4 (invented USD 42,000 and copied August 31 deadline already stripped). degree_levels is PhD only, following the page. Coverage is stored as Living Stipend only: the page values the AUD ~70,000 package with tuition coverage explicitly for domestic students and does not confirm an international fee offset, so none is claimed. deadline_date stores the next published EOI close (2027-07-31) rather than a guess. university_id set to the Curtin record (228) and a university_scholarships link created in this pass; source 2508 repointed from the bare domain.$note$,
  university_id = 228,
  award_amount = 38440, award_currency = 'AUD', award_period = 'year', award_basis = 'fixed'
WHERE id = 438;

-- 439 Newcastle -> RETIRED (RTP schemes domestic-only per the university page)
UPDATE scholarships SET
  title = 'Newcastle International Postgraduate Research Scholarship (not currently offered to international applicants)',
  provider = 'University of Newcastle Australia',
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  deadline = 'Not applicable - record retired. The University of Newcastle states its RTP scholarship schemes are currently available to domestic applicants only.',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["All Majors"]$json$,
  eligible_countries = $json$["Australia and New Zealand (domestic applicants only for the listed RTP schemes)"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$RETIRED RECORD. The University of Newcastle's official research scholarships page (read 2026-10-26) states that its Australian Government Research Training Program (RTP) scholarships - the Academic Pathway Scheme and Strategic Engagement Scheme (fee offset plus a stipend of AUD 40,690 per annum at the 2027 rate for up to 3.5 years) and the Indigenous Priority Scheme (AUD 54,414 per annum for up to 4 years) - are 'currently available to domestic applicants only'. For international candidates the page lists only two partnership routes (China Scholarship Council and the Vietnam Government Project 89 PhD Scholarship), plus project-specific PhD scholarships and externally funded opportunities advertised separately. There is therefore no general Newcastle HDR stipend currently open to applicants from Uzbekistan, and this importer-era record (formerly titled 'Newcastle International Postgraduate Research Scholarship') is retired instead of being presented as an available international award. International applicants interested in Newcastle should check its project-specific PhD scholarships page.$desc$,
  requirements = 'Not applicable - record retired for the international catalogue. The listed RTP schemes require domestic status (Australian/NZ citizenship or Australian permanent residency); the two international partnership routes currently listed are restricted to Chinese (China Scholarship Council) and Vietnamese (Project 89) candidates.',
  funding_type = 'Retired record - no general international HDR stipend currently offered',
  tuition_coverage = 'Not applicable - record retired. No tuition benefit is recorded because the schemes listed by the university are not open to this catalogue''s applicants.',
  living_allowance = NULL,
  english_requirements = 'Not applicable - record retired.',
  required_documents = $json$[]$json$,
  website_url = 'https://www.newcastle.edu.au/study/research/future-students/scholarships',
  source_url = 'https://www.newcastle.edu.au/study/research/future-students/scholarships',
  application_url = NULL,
  deadline_date = NULL, deadline_type = 'not_published', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[]$json$,
  recurrence = 'annual',
  expected_opening_period = NULL,
  expected_deadline_period = 'Not applicable - record retired 2026-10-26.',
  application_status = 'closed',
  verification_status = 'verified', source_reliability = 9, is_active = false,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$RETIRED 2026-10-26 (pass 98). The University of Newcastle's official 'Scholarships - Future Research Students' page was fetched and read in full: under 'Australian Government Research Training Program (RTP) Scholarships' it states 'The RTP scholarships listed below are currently available to domestic applicants only', listing the Academic Pathway Scheme (fee offset + AUD 40,690 p.a. 2027 rate up to 3.5 years, plus a possible AUD 10,000 p.a. University Medalist top-up; closing 30 November 2026), the Strategic Engagement Scheme (same value, monthly rounds) and the Indigenous Priority Scheme (AUD 54,414 p.a. up to 4 years). Its 'International Scholarships' section lists only the China Scholarship Council and Project 89 Vietnam partnerships; project-specific and external scholarships sit on separate pages. The previous record was the generic RTP framework at reliability 4 under an importer name (invented USD 41,000 and copied August 31 deadline already stripped); presenting a Newcastle HDR stipend as open to international applicants would mislead this catalogue's users, so the row is retired at reliability 9 and kept for audit. If Newcastle reopens its RTP schemes to international applicants, the record can be rewritten from the live page. university_scholarships row 465 set to availability 'No' with an explanatory string (kept so the university page does not silently imply availability); source 2579 repointed from the bare domain to the fetched page.$note$,
  university_id = 310,
  award_amount = NULL, award_currency = 'AUD', award_period = 'year', award_basis = 'variable'
WHERE id = 439;

-- Sources repointed from bare domains to the fetched official pages
UPDATE sources SET url='https://www.rmit.edu.au/scholarships/research/research-stipend', title='RMIT University - Research Stipend Scholarships (RTP RSS and RRSS) Official Page', domain='www.rmit.edu.au', source_type='scholarship', accessed_at=now(), is_official=true, is_verified=true WHERE id=2605;
UPDATE sources SET url='https://www.curtin.edu.au/research/hdr-r-projects/central-scholarship-round-rtp-scholarship/', title='Curtin University - Central Scholarship Round (RTP Scholarship) Official Page', domain='www.curtin.edu.au', source_type='scholarship', accessed_at=now(), is_official=true, is_verified=true WHERE id=2508;
UPDATE sources SET url='https://www.newcastle.edu.au/study/research/future-students/scholarships', title='The University of Newcastle - Scholarships for Future Research Students (RTP domestic-only notice)', domain='www.newcastle.edu.au', source_type='scholarship', accessed_at=now(), is_official=true, is_verified=true WHERE id=2579;

-- university_scholarships: 609 synced (RMIT), 465 marked No (Newcastle), Curtin link created (id 671)
UPDATE university_scholarships SET scholarship_name='RMIT Research Stipend Scholarships (RTP RSS and RRSS)', max_scholarship='AUD 36245 year', funding_type='Fully Funded', valued_aspect='Fully Funded', official_url='https://www.rmit.edu.au/scholarships/research/research-stipend', source_url='https://www.rmit.edu.au/scholarships/research/research-stipend', eligibility_notes='Competitive central round; supervisor agreement required at EOI; priority to high distinction (80%+) in the final two years; international recipients also awarded a tuition fee offset scholarship (RIFOS/RRITFS).', covers_tuition=true, covers_living_expenses=true, last_verified_at=now() WHERE id=609;
UPDATE university_scholarships SET scholarship_name='Newcastle International Postgraduate Research Scholarship (not currently offered to international applicants)', availability_status='No', max_scholarship='Not open to international applicants (listed RTP schemes are domestic-only)', official_url='https://www.newcastle.edu.au/study/research/future-students/scholarships', source_url='https://www.newcastle.edu.au/study/research/future-students/scholarships', eligibility_notes='Retired for the international catalogue: the University of Newcastle states its RTP scholarship schemes are currently available to domestic applicants only (page read 2026-10-26); international routes listed are the China Scholarship Council and Vietnam Project 89 partnerships.', covers_tuition=false, covers_living_expenses=false, last_verified_at=now() WHERE id=465;
INSERT INTO university_scholarships (university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url, verification_status, last_verified_at) VALUES (228, 438, 'Curtin University Research Training Program (RTP) Scholarship (Central Scholarship Round)', 'available', 'Merit-based', 'AUD 38440 year', false, true, 'Merit-based', 'PhD applicants only (MPhil not eligible), domestic and international; Expression of Interest 1-31 July each year with an endorsed Invitation to Apply from a registered Curtin supervisor. International tuition offset not confirmed on the central-round page - covers_tuition left false.', 'https://www.curtin.edu.au/research/hdr-r-projects/central-scholarship-round-rtp-scholarship/', 'https://www.curtin.edu.au/research/hdr-r-projects/central-scholarship-round-rtp-scholarship/', 'verified', now()); -- new id 671
