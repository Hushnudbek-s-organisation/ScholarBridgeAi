-- ScholarBridge AI - Scholarship Rewrite Pass 102 - 2026-10-26
-- Canada rel4 cluster closed (11 records): rewrote 142 (UBC 4YF), 444
-- (Queen's QGA), 445 (Dalhousie Killam Level 2), 446 (UVic Fellowships and
-- Graduate Awards) from official pages fetched 2026-10-26; retired 129
-- (Toronto directory/Pearson duplicate of record 50), 363 (McMaster
-- navigator), 371 (Ottawa generic directory), 375 (Waterloo: no such award),
-- 380 (SFU conflated-title directory), 386 (Calgary: no such award), 391
-- (Manitoba MGS no longer published; UMGF is a different award).
-- Side tables: 11 sources repointed; 5 university_scholarships rows
-- withdrawn, 2 synced, 1 added (674, Dalhousie Killam <-> university 284).
-- Statements below replay the exact executed SQL (RETURNING omitted; the
-- us-row INSERT pins its assigned id 674 and is followed by a sequence
-- guard). See docs/SCHOLARSHIP_REWRITE_PASS_102_2026-10-26.md.

-- 142 UBC -> Four Year Doctoral Fellowship (4YF), CAD 24,000/yr + tuition
UPDATE scholarships SET
  title = 'UBC Four Year Doctoral Fellowship (4YF)',
  provider = 'University of British Columbia (Graduate and Postdoctoral Studies)',
  coverage_type = 'Stipend + Tuition',
  amount_usd_value = 0,
  deadline = $dl$No separate 4YF deadline: the deadline is set by each UBC graduate program, and every PhD, DMA and MDPhD applicant offered admission is automatically considered for 4YF funding - apply for admission to the graduate program by its own deadline.$dl$,
  degree_levels = $json$["PhD"]$json$,
  eligible_majors = $json$["All UBC doctoral programs (PhD, DMA and MDPhD); each graduate program is allocated a number of Four Year Fellowships each year"]$json$,
  eligible_countries = $json$["All countries - Four Year Fellowships may be held by domestic (Canadian and permanent resident) and international students"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The Four Year Doctoral Fellowship (4YF) is the University of British Columbia's flagship doctoral funding program. Effective September 2026, it provides recipients with a $24,000 stipend plus tuition per year for up to four years of doctoral studies, giving outstanding domestic and international doctoral students stable, base-level funding for their studies and research (funding duration may be shorter in some circumstances, and continuation requires satisfactory academic progress). Fellowships are generally offered to students beginning their first year of full-time PhD, DMA or MDPhD studies, but may be offered to continuing students; each graduate program is allocated a number of fellowships and offers them to its very best students, with priority to incoming students, on the basis of academic excellence. There is no separate application: students apply for admission to the graduate program and all applicants offered admission are automatically considered. Holders of major Tri-Agency doctoral awards (e.g. CGRS-D and the former Vanier/CIHR/NSERC/SSHRC doctoral awards) automatically become 4YF designates, may receive 4YF tuition coverage while holding the external award, and then receive 4YF stipend and tuition support after the external funding ends, until four years after the external award's start or the end of the fifth doctoral year, whichever comes first. To remain eligible, 4YF holders must apply for other funding: Canadian citizens and permanent residents must apply each year for Tri-Agency funding if eligible (or forfeit remaining 4YF funding), while international recipients are not required to enter the annual Affiliated Fellowship competition but may do so.$desc$,
  requirements = $req$Be applying to, admitted to, or enrolled in a full-time PhD, DMA or MDPhD program at UBC (domestic and international students are eligible). Selection is based on academic excellence on the recommendation of the graduate program; programs notify Graduate and Postdoctoral Studies of their nominees (University Award Recommendation Form, award 6456, at least eight weeks before the requested 4YF start date). Funding is subject to satisfactory academic progress, and holders must meet the program's rules on applying for other funding (annual Tri-Agency applications for eligible Canadians/permanent residents).$req$,
  funding_type = 'University doctoral fellowship: CAD 24,000 annual stipend plus tuition coverage for up to four years',
  tuition_coverage = $tc$4YF provides tuition coverage alongside the $24,000 annual stipend for up to four years (the duration may be less in some circumstances - see the 4YF Guidelines). Tri-Agency award holders designated as 4YF may also receive tuition coverage during their external award.$tc$,
  living_allowance = 24000,
  english_requirements = 'Set by UBC graduate admission and the individual program; the 4YF award page publishes no separate IELTS cutoff.',
  required_documents = $json$["Application for admission to the chosen UBC doctoral program - all PhD, DMA and MDPhD applicants offered admission are automatically considered for 4YF funding; there is no separate 4YF application"]$json$,
  website_url = 'https://www.grad.ubc.ca/awards/four-year-doctoral-fellowship-4yf',
  source_url = 'https://www.grad.ubc.ca/awards/four-year-doctoral-fellowship-4yf',
  application_url = 'https://www.grad.ubc.ca/prospective-students/application-admission',
  deadline_date = NULL, deadline_type = 'not_published', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"allocation":"Annual, admission-linked","deadline":"Set by each UBC graduate program (doctoral admission deadlines)","value":"CAD 24,000 stipend plus tuition per year, effective September 2026, for up to four years"}]$json$,
  recurrence = 'annual',
  expected_opening_period = NULL,
  expected_deadline_period = $exp$No standalone deadline: consideration is automatic with doctoral admission; each graduate program sets its own admission deadlines.$exp$,
  application_status = 'upcoming',
  verification_status = 'verified', source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 102) from UBC Graduate and Postdoctoral Studies' official Four Year Doctoral Fellowship (4YF) award page fetched the same day: value box ($24,000 stipend plus full tuition coverage), citizenship (Canadian, Permanent Resident, International), degree level (Doctoral) and deadline (set by each graduate program); September 2026 rate and four-year maximum; automatic consideration of admitted PhD/DMA/MDPhD applicants; program nomination; Tri-Agency designate and post-external-award support rules; continuing-eligibility duty to apply for other funding. award_amount stores the published annual stipend (CAD 24,000) with tuition coverage recorded in the text, so amount_usd_value is 0. deadline_date NULL (not_published) because there is no single university-wide date. Previous record held the same award at reliability 4 with no values read (its deadline text admitted the round dates "were not read for this row"). university_scholarships row 539 synced with the verified value; source 2638 repointed from the bare domain to the award page.$note$,
  university_id = 49,
  award_amount = 24000, award_currency = 'CAD', award_period = 'year', award_basis = 'fixed'
WHERE id = 142;

-- 444 Queen's -> Queen's Graduate Award (QGA), variable value
UPDATE scholarships SET
  title = $t$Queen's Graduate Award (QGA)$t$,
  provider = $t$Queen's University at Kingston (School of Graduate Studies and Postdoctoral Affairs)$t$,
  coverage_type = 'Internal Graduate Award',
  amount_usd_value = 0,
  deadline = $dl$No separate application or deadline: Queen's Graduate Awards are awarded annually on the recommendation of the student's Department, Program, School or Faculty, as a component of the graduate funding package (packages are normally notified in the summer before the academic year). Doctoral students must have requested financial support on their initial admission application to be eligible for the guaranteed funding package.$dl$,
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["All fields - eligible full-time Master's and Doctoral students in research-based (non-professional) programs across Queen's departments, programs, schools and faculties"]$json$,
  eligible_countries = $json$["No citizenship restriction is stated in the QGA terms - holders must be registered full-time in an eligible Master's or Doctoral program at Queen's"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The Queen's Graduate Award (QGA) is Queen's University's central internal graduate award, administered by the School of Graduate Studies and Postdoctoral Affairs (SGSPA) and awarded annually on the recommendation of a Department, Program, School or Faculty to eligible full-time Master's and Doctoral students in all fields. It is not an open-application scholarship: the QGA forms the internal-award component of the funding packages Queen's commits to its graduate students (alongside external awards, teaching assistantships/fellowships, research assistantships and Graduate Research Fellowships). For 2026-27, full-time PhD students in years 1-4 receive a guaranteed minimum funding package of $25,000 a year, and most full-time Master's students in non-professional programs also receive funding support in their funded years. The value of the QGA itself is officially variable: departments divide their total QGA allocation among their students (the terms recommend three equal term instalments), so no single cash figure applies. QGAs are not renewable and not transferable between departments, but are awarded annually based on eligibility, availability and departmental recommendation; holders must be registered full-time (changing to part-time cancels the award), students are normally funded only within the first two years of a Master's or the first four years of a doctorate (a fifth doctoral year is at the department's discretion), teaching assistantships are capped at an average of ten hours per week, and winning an external award must be reported and can lead to reduction or withdrawal of the QGA. Queen's states that tuition and ancillary fees are not included in or paid by a funding package - students pay fees from their funding and other income.$desc$,
  requirements = $req$Be registered full-time in an eligible (non-professional, research-based) Master's or Doctoral program at Queen's, within the funded years (Master's up to year 2, or year 1 of a one-year Master's; Doctoral normally up to year 4, fifth year at the department/program's discretion), and be recommended by your Department, Program, School or Faculty (there is no separate QGA application). Off-campus full-time study requires Department/Program and SGSPA approval. For the doctoral guaranteed minimum package, students must have requested financial support on their initial application for admission, maintain good academic standing, be available in residence for package components such as teaching assistantships, and apply for all major external and internal scholarships for which they are eligible.$req$,
  funding_type = $ft$Queen's internal award of variable value, allocated through departments as a component of graduate funding packages (2026-27 PhD minimum package: CAD 25,000 per year)$ft$,
  tuition_coverage = $tc$The QGA is a cash award within the funding package; Queen's states that tuition and ancillary fees are not included in or paid for by the university as part of a student's funding package, so students pay their fees out of their funding, savings or other income.$tc$,
  living_allowance = NULL,
  english_requirements = $er$Set by Queen's graduate admission and the admitting program; the QGA terms publish no separate IELTS cutoff.$er$,
  required_documents = $json$["No separate QGA application - awards are made on the recommendation of the student's Department/Program/School/Faculty within the admission and funding-package process; doctoral applicants should request financial support on their initial admission application"]$json$,
  website_url = 'https://www.queensu.ca/grad-postdoc/grad-studies/funding/packages',
  source_url = 'https://www.queensu.ca/grad-postdoc/grad-studies/funding/packages',
  application_url = NULL,
  deadline_date = NULL, deadline_type = 'not_published', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"allocation":"Annual, on department/program recommendation","notification":"Funding packages are normally confirmed in the summer (July/August) preceding the funded academic year (September onwards)"}]$json$,
  recurrence = 'annual',
  expected_opening_period = NULL,
  expected_deadline_period = $exp$No application deadline: QGA is allocated annually through departments as part of funding packages tied to admission and continuing registration.$exp$,
  application_status = 'upcoming',
  verification_status = 'verified', source_reliability = 9, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 102) from Queen's SGSPA 'Funding Packages' page (2026-27 figures: guaranteed minimum PhD package $25,000/year for years 1-4; tuition not included in packages) and the official Queen's Graduate Awards Terms and Conditions PDF (2022-23, the published QGA terms; the QGA stream is confirmed as current in the 2026-27 General Awards terms), both fetched the same day. The terms state the QGA value is variable and awarded on departmental recommendation to eligible Master's and Doctoral students in all fields, with no citizenship restriction - so award_amount is NULL (variable) and no indicative departmental figure is stored; the $4,100-per-domestic-master's-student figure in 2024 Queen's Gazette reporting is a central allocation rate, not an individual award value, and was deliberately not recorded as one. The previously stored URL now resolves to a 'Page not found' at its redirected SGSPA address; this record now points to the live Funding Packages page, which names the QGA as the internal-award source. Previous record held the award at reliability 4 with no values read. university_scholarships row 633 synced; source 2602 repointed from the bare domain.$note$,
  university_id = 153,
  award_amount = NULL, award_currency = NULL, award_period = 'year', award_basis = 'variable'
WHERE id = 444;

-- 445 Dalhousie -> Killam Predoctoral Scholarship - Doctoral (Level 2), CAD 42,000/yr
UPDATE scholarships SET
  title = 'Dalhousie Killam Predoctoral Scholarship - Doctoral (Level 2)',
  provider = 'Dalhousie University (Faculty of Graduate Studies), funded by the Killam Trusts',
  coverage_type = 'Doctoral Scholarship',
  amount_usd_value = 0,
  deadline = $dl$For non-Tri-agency applicants there are two rounds: round one closed 16 October 2026; round two opens 1 December 2026 with submissions due 31 January 2027 at midnight AT. Dalhousie Tri-agency CGRS-D applicants are automatically considered for Killam funding.$dl$,
  degree_levels = $json$["PhD"]$json$,
  eligible_majors = $json$["All disciplines - sciences, engineering, humanities and social sciences (full-time doctoral programs at Dalhousie)"]$json$,
  eligible_countries = $json$["All countries - open to Canadian and international students (scholarships granted to international students may only be used for study and research in Canada)"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The Killam Predoctoral Scholarships, supported by the Killam Trusts and administered by Dalhousie University's Faculty of Graduate Studies, are awarded competitively to outstanding doctoral students across all disciplines. This record covers the doctoral award (Level 2): a base value of $42,000 per year ($14,000 per term) for up to three years, for Canadian or international students in a full-time PhD at Dalhousie who demonstrate exceptional academic achievement, strong research potential and a clear likelihood of contributing to the advancement of learning (character, ethical conduct and contributions to a respectful and inclusive community are also considered). Killam holders are expected to apply for a Tri-agency CGRS-D within their first two years: a concurrent CGRS-D ($40,000/year) is topped up to $48,000 per year, and if the CGRS-D ends before the holder's fourth PhD year ends, Killam funding continues into the remaining fourth-year terms at $14,000 per term. Conversely, the Killam becomes partially or fully honorary in terms where the holder also holds other FGS-managed awards (CGRS-D, Dalhousie Research Excellence Scholarships, Abdul Majid Bader Graduate Scholarships), while supervisor stipends and department-level scholarships do not directly reduce its value. New scholars relocating to Nova Scotia can claim a relocation allowance (reimbursement up to the lowest-cost airfare by the most direct route, claimed by the end of the first term; family members' transport and personal effects are excluded). Scholars file an annual report by 31 July, may take non-paid interruptions of up to 12 months on an approved leave, and may apply for paid parental-leave benefits if they have no Tri-agency parental support. Dalhousie CGRS-D applicants are automatically considered; other applicants apply through the Faculty of Graduate Studies' Scholarship Management Platform (Major Scholarship Competitions 2026/2027 - Non-Tri-Agency category), and all eligible applications are reviewed together. (A separate Level 1 master's stream of the Killam Predoctoral Scholarships exists; it is not covered by this record.)$desc$,
  requirements = $req$Be a Canadian or international student pursuing a full-time doctoral (PhD) degree at Dalhousie University. You must have spent less than six terms (24 months) in your PhD as of 1 May of the award year (for Master's-to-PhD transfers, time in program counts from the transfer date), and the scholarship must be taken up no later than the seventh term of the PhD. Demonstrate exceptional academic achievement and strong research potential. Apply either through a Dalhousie Tri-agency CGRS-D application (automatic Killam consideration) or, if not eligible for CGRS-D through Dalhousie this cycle, through the Faculty of Graduate Studies' online Scholarship Management Platform by the round deadline. Recipients are expected to apply for CGRS-D within their first two years of holding the award and to participate in Killam Scholar initiatives where possible.$req$,
  funding_type = 'Killam Trusts doctoral scholarship via Dalhousie FGS: CAD 42,000 per year for up to three years (topped up to CAD 48,000 when held concurrently with a CGRS-D)',
  tuition_coverage = $tc$The Level 2 award is paid as a scholarship of $14,000 per term; the award page does not present a separate tuition-fee payment for the doctoral award. Its $42,000 annual envelope interacts with other FGS-managed support (the award can become partially or fully honorary alongside CGRS-D/DRES/Bader awards, with a top-up to $48,000/year alongside a CGRS-D).$tc$,
  living_allowance = 42000,
  english_requirements = 'Set by Dalhousie doctoral admission and the admitting program; the Killam page publishes no separate IELTS cutoff.',
  required_documents = $json$["Tri-agency CGRS-D application through Dalhousie in the current cycle (automatic Killam consideration), OR an application in the Faculty of Graduate Studies' Scholarship Management Platform under Major Scholarship Competitions 2026/2027 - Major Scholarship Application for Non-Tri-Agency Applicants, with all accompanying materials by the round deadline","For the relocation allowance: travel expense claim with original receipts and boarding passes, submitted by the end of the first term"]$json$,
  website_url = 'https://www.dal.ca/faculty/gradstudies/finance-your-studies/scholarships-bursaries/killam-master-doctoral.html',
  source_url = 'https://www.dal.ca/faculty/gradstudies/finance-your-studies/scholarships-bursaries/killam-master-doctoral.html',
  application_url = NULL,
  deadline_date = '2027-01-31', deadline_type = 'fixed', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"round":"2026/2027 Major Scholarship Competition - round one (non-Tri-agency applicants)","deadline":"2026-10-16 (midnight AT)","status":"closed"},{"round":"2026/2027 Major Scholarship Competition - round two","opens":"2026-12-01","deadline":"2027-01-31 (midnight AT)","status":"upcoming"},{"round":"Tri-agency route","note":"Dalhousie CGRS-D applicants in the current cycle are automatically considered for Killam funding"}]$json$,
  recurrence = 'annual',
  expected_opening_period = $exp$Round two of the 2026/2027 competition opens 1 December 2026 (round one closed 16 October 2026).$exp$,
  expected_deadline_period = $exp$31 January 2027 (round two submissions, midnight AT), per the live award page.$exp$,
  application_status = 'upcoming',
  verification_status = 'verified', source_reliability = 10, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 102) from Dalhousie FGS's official 'Killam Predoctoral Scholarship Level 2 (Doctoral)' page fetched the same day (the previously stored Killam URL returns 404): value up to $42,000/yr for up to three years ($14,000/term), Canadian or international full-time PhD students, eligibility window (<6 terms by 1 May; take up by 7th term), CGRS-D auto-consideration and $48,000 top-up, honorary interaction with other FGS-managed awards, relocation airfare reimbursement, and the two-round deadlines. Where a cached search snippet of the same page gave different round-two dates (opens 5 January / due 28 February), the live page governs: opens 1 December 2026, due 31 January 2027 - deadline_date stores 2027-01-31. The record is scoped to the doctoral Level 2 award read first-hand; the separate Level 1 master's stream was not fetched to award-page standard and is not folded into this record. award_amount stores the published annual base value (CAD 42,000), so amount_usd_value is 0. Previous record held the award at reliability 4 with no values read and no university link; university_id now set to Dalhousie (284) and a university_scholarships row added; source 2509 repointed from the bare domain.$note$,
  university_id = 284,
  award_amount = 42000, award_currency = 'CAD', award_period = 'year', award_basis = 'fixed'
WHERE id = 445;

-- 446 UVic -> UVic Fellowships and UVic Graduate Awards, variable (up-to) values
UPDATE scholarships SET
  title = 'UVic Fellowships and UVic Graduate Awards',
  provider = 'University of Victoria (Faculty of Graduate Studies)',
  coverage_type = 'Fellowship / Graduate Award',
  amount_usd_value = 0,
  deadline = $dl$No central application deadline: UVic's internal fellowships and graduate awards are made on academic-unit nomination for the graduate year (September to August), with distribution, value and duration determined by each academic unit and final approval by the Faculty of Graduate Studies; entering students are considered through their program admission (units state that complete applications are automatically considered).$dl$,
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["All UVic master's and doctoral degree programs, via the academic units"]$json$,
  eligible_countries = $json$["All countries - Canadian and international students are eligible (the UVic Fellowship's FGS grade threshold is a 6.0/9.0 cumulative GPA, or second-class standing for entering international students)"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The University of Victoria's Faculty of Graduate Studies (FGS) funds entering and continuing graduate students of high academic standing through two internal award streams: UVic Fellowships of up to $17,500 per year for master's students and up to $20,000 per year for PhD students, and UVic Graduate Awards of up to $10,000 per year (master's and PhD). The awards are administered by FGS on the nomination of the academic unit, and each unit determines the distribution, value and duration of its awards (with FGS final approval), so individual amounts vary and no single value is guaranteed; meeting the minimum grade eligibility does not guarantee an award. Funding normally covers only the current graduate year (September to August), is not automatically renewable, and renewal is at the department's discretion contingent on maintaining the grade point average set out in the offer letter. To hold UVic funding, students must be unconditionally admitted (no funding is issued under provisional admission), be in continuous registration during the graduate year, and meet the registered-units rules for their award (for example, at least 1.5 graduate units per term for the UVic Fellowship). Graduate awards are not portable between departments or institutions, and UVic does not deduct tuition and fees from award payments - students remain responsible for paying their fees by each term's deadline. Donor-funded awards and need-based graduate bursaries are separate mechanisms and are not part of this record.$desc$,
  requirements = $req$Be unconditionally admitted to, or registered in, a master's or doctoral degree program at UVic, and be nominated by your department, program or faculty. Maintain continuous registration through the graduate year (September to August) and the registered-units minimum for the award held. Meet the FGS grade eligibility for the stream (UVic Fellowship: 6.0/9.0 cumulative GPA, or second-class standing for entering international students; higher thresholds apply to separate entrance awards such as the UVic Graduate Entrance Award and tri-agency awards). Students registered with the Centre for Accessible Learning may be considered full-time at 1.5 units per term with a reduced course load letter.$req$,
  funding_type = $ft$University internal awards: UVic Fellowships up to CAD 17,500 per year (master's) and CAD 20,000 per year (PhD); UVic Graduate Awards up to CAD 10,000 per year (values set by academic units)$ft$,
  tuition_coverage = $tc$The fellowships and awards are paid to the student as award funding; tuition and fees are not deducted from graduate award payments, and students must ensure their tuition and fees are paid by the deadline in each term.$tc$,
  living_allowance = NULL,
  english_requirements = 'Set by UVic graduate admission and the admitting program; the FGS funding pages publish no separate IELTS cutoff for these awards.',
  required_documents = $json$["Program admission application (academic units consider complete applications for these internal awards automatically) and unit nomination; no central application for the general UVic Fellowship/Graduate Award streams - check the FGS awards search for donor awards that use the online application"]$json$,
  website_url = 'https://www.uvic.ca/graduatestudies/finances/graduate-student-funding/',
  source_url = 'https://www.uvic.ca/graduatestudies/finances/graduate-student-funding/',
  application_url = NULL,
  deadline_date = NULL, deadline_type = 'not_published', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"allocation":"Per graduate year (September-August) by academic-unit nomination","note":"Distribution, value and duration are determined by each academic unit; final approval by the Faculty of Graduate Studies; funding is not automatically renewed"}]$json$,
  recurrence = 'annual',
  expected_opening_period = NULL,
  expected_deadline_period = $exp$No central deadline: allocations follow each academic unit's admission and nomination cycle for the September-August graduate year.$exp$,
  application_status = 'upcoming',
  verification_status = 'verified', source_reliability = 9, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 102) from official University of Victoria pages fetched the same day - the FGS 'Graduate student funding' page (awards to students of high academic standing; distribution, value and duration determined by each academic unit with FGS final approval; funding normally for the current graduate year), the FGS funding eligibility and regulations page (unit nomination, unconditional admission, continuous registration, GPA tiers, registered-units minima, tuition not deducted from payments), and an official departmental finances page (Art History & Visual Studies) stating the up-to values ($17,500 master's / $20,000 PhD fellowships; $10,000 graduate awards) and automatic consideration of complete applications - values consistent across UVic departmental pages. The previously stored URL returns 404. award_amount is NULL (variable): both streams are 'up to' amounts set by units. min_gpa NULL (FGS uses standing/GPA tiers, 6.0/9.0 UVic scale for the Fellowship, not a single convertible figure); min_ielts NULL. Previous record held the awards at reliability 4 with no values read. university_id remains NULL because no University of Victoria record exists in the universities table (checked 2026-10-26; the similarly named id 253 is Victoria University of Wellington, New Zealand) - adding that record and linking is a separate cataloguing task. Source 2689 repointed from the bare domain to the live FGS funding page.$note$,
  university_id = NULL,
  award_amount = NULL, award_currency = NULL, award_period = 'year', award_basis = 'variable'
WHERE id = 446;

-- 7 retirements: funding directories / unnamed or unfindable awards
UPDATE scholarships SET title='University of Toronto Doctoral Funding and Pearson Award (retired: funding directory, not a named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored School of Graduate Studies funding URL returns 404 (Page Not Found) when fetched on 2026-10-26, and the title bundled generic doctoral funding (delivered at U of T through unit-level funding arrangements rather than one named award) together with the Lester B. Pearson International Scholarship, which is already catalogued as verified record 50 (reliability 10). There is no single named doctoral award in this record to verify, so it is retired rather than guessed; University of Toronto coverage remains via records 50 and 692. university_scholarships row 531 withdrawn; linked source 2685 repointed from the bare domain to the fetched 404 URL.$rn$ WHERE id=129;
UPDATE scholarships SET title='McMaster Graduate Research Scholarship GRS (retired: funding directory, not a named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored URL now redirects to the School of Graduate Studies hub, and the school's live scholarships page (fetched 2026-10-26) is a 'Scholarship Navigator' - a searchable listing of many awards, including the explicitly domestic Tri-Agency harmonized master's/doctoral competitions - rather than a single named scholarship; no award named 'Graduate Research Scholarship (GRS)' appears. Retired as a directory record rather than rewritten into an unnamed sub-scheme; McMaster coverage remains via record 622. university_scholarships row 534 withdrawn; linked source 2573 repointed from the bare domain to the fetched navigator page.$rn$ WHERE id=363;
UPDATE scholarships SET title='University of Ottawa Doctoral Awards (retired: funding directory, not a named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored graduate-studies funding URL returns 404 when fetched on 2026-10-26, and the title named no specific award (a generic plural); the university's current official structure routes into separate named admission scholarships and external awards, not one 'Doctoral Awards' scheme. Retired rather than rewritten into an unstated single value. The university's named Admission Scholarship (Doctorate) - published minimum structure of $72,000 over four years, open to international students with automatic consideration - is a different award that this record did not name; it is a candidate for a future additions batch only after its own detailed verification. University of Ottawa coverage remains via record 753. university_scholarships row 603 withdrawn; linked source 2674 repointed from the bare domain to the fetched 404 URL.$rn$ WHERE id=371;
UPDATE scholarships SET title='Waterloo Graduate Research Fellowship GFR (retired: no such named award found)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored fellowships URL returns 404 ('Page not found') when fetched on 2026-10-26, and searching the University of Waterloo's official site surfaces undergraduate research awards (UREA, NSERC USRA) but no graduate award named 'Graduate Research Fellowship (GFR)' - graduate funding at Waterloo is published through other mechanisms (graduate research studentships and named awards of other titles). No award of this name could be verified, so the record is retired rather than kept as a single invented-named fellowship; Waterloo coverage remains via record 767. university_scholarships row 607 withdrawn; linked source 838 repointed from the bare domain to the fetched 404 URL.$rn$ WHERE id=375;
UPDATE scholarships SET title='SFU International Entrance Award and Graduate Fellowship (retired: funding directory, not a single named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored funding URL returns 404 (Page Not Found) when fetched on 2026-10-26, and the title conflated two distinct Simon Fraser University awards (an undergraduate international entrance award and a graduate fellowship) behind one funding-hub record with no values, eligibility or deadline ever read. As a single record it cannot be verified honestly for either award, so it is retired as a directory record; SFU's separate entrance and graduate-fellowship awards may be added later only after individual verification. Linked source 2613 repointed from the bare domain to the fetched 404 URL.$rn$ WHERE id=380;
UPDATE scholarships SET title='Calgary Graduate Research Scholarship GRS (retired: no such named award found)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored funding URL returns 404 ('Page not found') when fetched on 2026-10-26, and the Faculty of Graduate Studies' official awards search (read the same day) describes application-based funding through Tri-agency competitions (CGRS-D/M, SSHRC, NSERC, CIHR), provincial graduate scholarships and Donor awards - no award named 'Graduate Research Scholarship (GRS)' appears. Retired rather than kept as a single invented-named award; University of Calgary coverage remains via record 729. university_scholarships row 610 withdrawn; linked source 2639 repointed from the bare domain to the fetched 404 URL.$rn$ WHERE id=386;
UPDATE scholarships SET title='Manitoba Graduate Scholarship MGS (retired: named award no longer published)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 102): the stored funding URL returns 404 ('Page not found') when fetched on 2026-10-26, and no live official programme page for a 'Manitoba Graduate Scholarship (MGS)' could be found on the University of Manitoba site in the site search and the Faculty of Graduate & Postdoctoral Studies funding hub fetched the same day (MGS appears only in older award-holder documentation). The university's current flagship named award is the University of Manitoba Graduate Fellowship (UMGF) - a different award that this record did not name - so the record is retired rather than silently retargeted to it; the UMGF is a candidate for a future additions batch only after its own detailed verification. Linked source 2653 repointed from the bare domain to the fetched 404 URL.$rn$ WHERE id=391;

-- Sources repointed from bare domains (rewrites -> live award pages;
-- retirements -> fetched 404/redirect URLs; McMaster -> navigator page)
UPDATE sources SET
  url = CASE id
    WHEN 2685 THEN 'https://www.sgs.utoronto.ca/awards/funding-for-graduate-studies/'
    WHEN 2638 THEN 'https://www.grad.ubc.ca/awards/four-year-doctoral-fellowship-4yf'
    WHEN 2573 THEN 'https://gs.mcmaster.ca/current-students/scholarships/'
    WHEN 2674 THEN 'https://www.uottawa.ca/graduate-studies/funding/'
    WHEN 838 THEN 'https://uwaterloo.ca/grads/financial-support/fellowships/'
    WHEN 2613 THEN 'https://www.sfu.ca/graduate-studies/funding.html'
    WHEN 2639 THEN 'https://www.ucalgary.ca/graduate-studies/funding/'
    WHEN 2653 THEN 'https://umanitoba.ca/gradstudies/funding/'
    WHEN 2602 THEN 'https://www.queensu.ca/grad-postdoc/grad-studies/funding/packages'
    WHEN 2509 THEN 'https://www.dal.ca/faculty/gradstudies/finance-your-studies/scholarships-bursaries/killam-master-doctoral.html'
    WHEN 2689 THEN 'https://www.uvic.ca/graduatestudies/finances/graduate-student-funding/'
  END,
  domain = CASE id
    WHEN 2685 THEN 'sgs.utoronto.ca'
    WHEN 2638 THEN 'grad.ubc.ca'
    WHEN 2573 THEN 'gs.mcmaster.ca'
    WHEN 2674 THEN 'uottawa.ca'
    WHEN 838 THEN 'uwaterloo.ca'
    WHEN 2613 THEN 'sfu.ca'
    WHEN 2639 THEN 'ucalgary.ca'
    WHEN 2653 THEN 'umanitoba.ca'
    WHEN 2602 THEN 'queensu.ca'
    WHEN 2509 THEN 'dal.ca'
    WHEN 2689 THEN 'uvic.ca'
  END,
  title = CASE id
    WHEN 2685 THEN 'University of Toronto School of Graduate Studies Funding URL (fetched 2026-10-26; 404)'
    WHEN 2638 THEN 'UBC Four Year Doctoral Fellowship (4YF) Official Award Page'
    WHEN 2573 THEN 'McMaster School of Graduate Studies Scholarships Navigator (fetched 2026-10-26)'
    WHEN 2674 THEN 'University of Ottawa Graduate Studies Funding URL (fetched 2026-10-26; 404)'
    WHEN 838 THEN 'University of Waterloo Fellowships URL (fetched 2026-10-26; 404)'
    WHEN 2613 THEN 'Simon Fraser University Graduate Studies Funding URL (fetched 2026-10-26; 404)'
    WHEN 2639 THEN 'University of Calgary Graduate Studies Funding URL (fetched 2026-10-26; 404)'
    WHEN 2653 THEN 'University of Manitoba Graduate Studies Funding URL (fetched 2026-10-26; 404)'
    WHEN 2602 THEN 'Queen''s University SGSPA Funding Packages Official Page'
    WHEN 2509 THEN 'Dalhousie Killam Predoctoral Scholarship Level 2 (Doctoral) Official Page'
    WHEN 2689 THEN 'University of Victoria Graduate Student Funding Official Page'
  END,
  accessed_at = now()
WHERE id IN (2685, 2638, 2573, 2674, 838, 2613, 2639, 2653, 2602, 2509, 2689);

-- university_scholarships: 5 withdrawals + 2 verified-value syncs
UPDATE university_scholarships SET
  scholarship_name = CASE id
    WHEN 531 THEN 'University of Toronto Doctoral Funding and Pearson Award (retired: funding directory, not a named scholarship)'
    WHEN 534 THEN 'McMaster Graduate Research Scholarship GRS (retired: funding directory, not a named scholarship)'
    WHEN 603 THEN 'University of Ottawa Doctoral Awards (retired: funding directory, not a named scholarship)'
    WHEN 607 THEN 'Waterloo Graduate Research Fellowship GFR (retired: no such named award found)'
    WHEN 610 THEN 'Calgary Graduate Research Scholarship GRS (retired: no such named award found)'
    WHEN 539 THEN 'UBC Four Year Doctoral Fellowship (4YF)'
    WHEN 633 THEN 'Queen''s Graduate Award (QGA)'
  END,
  availability_status = CASE WHEN id IN (539, 633) THEN availability_status ELSE 'No' END,
  max_scholarship = CASE id
    WHEN 531 THEN 'No confirmed award: the stored SGS funding page returns 404 (Pearson Scholarship is scholarship record 50)'
    WHEN 534 THEN 'No confirmed award: the stored page is a scholarship search directory, not a named award'
    WHEN 603 THEN 'No confirmed award: the stored funding page returns 404'
    WHEN 607 THEN 'No confirmed award: no award of this name is published by the university'
    WHEN 610 THEN 'No confirmed award: no award of this name appears in the official UCalgary awards search'
    WHEN 539 THEN 'CAD 24,000 stipend plus tuition coverage per year, up to four years'
    WHEN 633 THEN 'Variable value set by the department within graduate funding packages'
  END,
  last_verified_at = now()
WHERE id IN (531, 534, 603, 607, 610, 539, 633);

-- university_scholarships: new Dalhousie Killam row (assigned id 674)
INSERT INTO university_scholarships (id, university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, official_url, source_url, verification_status, last_verified_at) VALUES (674, 284, 445, 'Dalhousie Killam Predoctoral Scholarship - Doctoral (Level 2)', 'available', 'Doctoral scholarship (Killam Trusts, administered by Dalhousie FGS)', 'CAD 42,000 per year for up to three years', false, true, 'https://www.dal.ca/faculty/gradstudies/finance-your-studies/scholarships-bursaries/killam-master-doctoral.html', 'https://www.dal.ca/faculty/gradstudies/finance-your-studies/scholarships-bursaries/killam-master-doctoral.html', 'verified', now());
SELECT setval('university_scholarships_id_seq', GREATEST((SELECT MAX(id) FROM university_scholarships), 674), true);
