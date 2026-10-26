-- Scholarship Enrichment Batch 9 — replay SQL (2026-10-26)
-- Adds scholarships 939-942, sources 3077-3080, scholarship_sources links,
-- and university_scholarships row 675. See
-- docs/SCHOLARSHIP_ENRICHMENT_BATCH_9_2026-10-26.md for the audit trail.
-- All content verified first-hand on official pages fetched 2026-10-26.
-- NOTE on ids: the four scholarship inserts were executed without explicit
-- ids; INSERT ... RETURNING id, title fixed the true mapping
-- (939 = MOE Taiwan Scholarship, 940 = UMGF, 941 = uOttawa Admission
-- Scholarship (Doctorate), 942 = SFU Graduate Fellowship), re-verified by
-- SELECT before sources/links were created. Ids 936-938 do not exist
-- (sequence values consumed without rows; verified by SELECT). Likewise
-- sources began at 3077 (3071-3076 unconsumed/missing). The statements
-- below pin the assigned ids and end with sequence guards.
-- MOE Taiwan Scholarship passed its channel check for Uzbekistan (Moscow
-- representative office runs the CIS selection) - unlike Taiwan ICDF and
-- MOFA, which remain rejected (Batch 8).

-- ---------------------------------------------------------------------------
-- 939: MOE Taiwan Scholarship
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  939,
  'MOE Taiwan Scholarship',
  'Ministry of Education, Taiwan (Republic of China)',
  'Taiwan', 'Tuition Support + Monthly Stipend', 0,
  $dl$Annual mission-based selection (each ROC overseas mission sets its own dates; typically February to 31 March). For applicants from Uzbekistan the competent office is the Representative Office in Moscow for the Taipei-Moscow Economic and Cultural Coordination Commission: its 2026 cycle ran an online application (taiwanscholarship.moe.gov.tw/Apply) from 2 February to 31 March 2026, with paper documents due in Moscow by 10 April 2026, and has closed. Applicants must also apply separately to a university/college in Taiwan for admission.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["Degree programmes (Bachelor's, Master's, Doctorate) at universities and colleges in Taiwan, including MOE-recognised all-English-taught programmes (missions publish the participating-programme lists with each cycle)"]$json$,
  $json$["Foreign nationals (ROC nationals and overseas Chinese students are ineligible; students from mainland China, Hong Kong and Macao are excluded). Uzbekistan is explicitly served: the Taiwan representative office in Moscow runs the selection for Russia and CIS countries - Kazakhstan, Uzbekistan, Turkmenistan, Kyrgyzstan, Tajikistan, Georgia, Azerbaijan, Armenia, Belarus and Moldova (14 places in its 2026 cycle). Other nationalities apply via their local ROC (Taiwan) overseas mission."]$json$, NULL, NULL,
  false, true,
  $desc$The MOE Taiwan Scholarship is the Ministry of Education (Taiwan)'s flagship scholarship for outstanding international students to undertake a bachelor's, master's or doctorate in Taiwan. Each recipient receives (i) tuition and miscellaneous expenses (course-credit fees and miscellaneous basic study-related fees) of up to NTD 40,000 per semester, paid by the MOE - any amount above NTD 40,000 is paid by the recipient, though some universities offer recipients additional fee discounts/grants - and (ii) a monthly living allowance of NTD 15,000 for undergraduate students or NTD 20,000 for master's and doctoral students. The miscellaneous-fee coverage excludes administration fees, thesis advising fees, insurance premiums, accommodation and internet access fees, which recipients pay themselves; airfare is not included. Maximum durations are four years for a bachelor's degree, two years for a master's and four years for a doctorate, with a lifetime maximum of five years of Taiwan Scholarship support per person; the scholarship year runs 1 September to 31 August. Selection is run by ROC (Taiwan) overseas missions: applicants register online and submit documents to the mission for their country - for Uzbekistan (which has no Taiwan mission of its own) this is the Representative Office in Moscow for the Taipei-Moscow Economic and Cultural Coordination Commission, whose 2026 announcement expressly invites students from Uzbekistan and the other CIS countries and offered 14 places; applicants must separately apply to a Taiwanese university/college for admission. Recipients may not concurrently hold another scholarship or subsidy from a Taiwan government agency or educational institution (university top-ups of the tuition cap excepted).$desc$,
  $req$Be a foreign national with at least a secondary-school graduation diploma, an excellent academic record and good character. Ineligible categories include: ROC (Taiwan) nationals and overseas Chinese students; persons already holding student status at, or registered to begin studies at, a university/college in Taiwan (except final-year students applying for the next degree level); persons who have already studied in Taiwan for a degree at the same level they now intend to pursue; exchange or dual/joint-degree students admitted under academic cooperation agreements; persons who have already held a Taiwan Scholarship for five years in total; persons whose Taiwan Scholarship or MOE Huayu Enrichment Scholarship was ever revoked; and persons concurrently receiving any other scholarship/subsidy from a Taiwan government agency or education institution (other than a university subsidy covering tuition/fees above the MOE cap). Language proof (per the Moscow office's 2026 announcement): for non-all-English programmes, a TOCFL advanced-level (Band B) or equivalent certificate/transcript - applicants who do not submit one must, at their own expense, sit and pass the test within their first semester in Taiwan and give the result to their university; for all-English programmes, no TOCFL is required - submit TOEFL scores or another English-proficiency certificate recognised by the applicant's government, or proof of graduation from an English-taught programme (the target programme must be an MOE-recognised all-English programme or certified as such by the university). Uzbek applicants apply through the Moscow representative office: online registration plus paper documents delivered to Moscow (in person, by a trusted person, or by courier; e-mailed applications are not accepted).$req$,
  'https://english.moe.gov.tw/cp-24-16833-23C09-1.html',
  'https://english.moe.gov.tw/cp-24-16833-23C09-1.html',
  'https://taiwanscholarship.moe.gov.tw/Apply/',
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 9), verified first-hand the same day on (a) the Ministry of Education's official English Taiwan Scholarship Program page (NTD 40,000/semester tuition and miscellaneous expenses; monthly living allowance NTD 15,000/20,000; durations 4/2/4 years; applications to an ROC overseas mission with separate university admission; the seven ineligibility categories), and (b) the official 2026-2027 announcement of the Representative Office in Moscow for the Taipei-Moscow Economic and Cultural Coordination Commission (tmeccc.org, updated 2026-02-20), which expressly invites outstanding students from Russia, Kazakhstan, UZBEKISTAN, Turkmenistan, Kyrgyzstan, Tajikistan, Georgia, Azerbaijan, Armenia, Belarus and Moldova, offered 14 places, and set the 2026 online window (2 Feb-31 Mar 2026) and paper-document deadline (10 Apr 2026, Moscow). This Uzbekistan channel confirmation is what distinguishes the MOE Taiwan Scholarship from Taiwan ICDF and the MOFA Taiwan Scholarship, both audited and rejected in Batch 8 because Uzbekistan is not eligible under their official guidelines. award_amount is NULL (variable): the stipend differs by degree level (NTD 15,000/month bachelor's; NTD 20,000/month master's/doctoral) alongside the NTD 40,000/semester fee cap, so no single figure is stored and amount_usd_value is 0 (NTD award); living_allowance NULL for the same reason. min_gpa/min_ielts NULL (no numeric GPA threshold is published; language evidence is TOCFL Band B or TOEFL/recognised English proof, not an IELTS figure). deadline_date NULL (not_published) and status closed: the 2026 Moscow cycle closed on 31 March 2026 (paper 10 April 2026) and the next cycle's dates have not been announced. The catalogue's existing Taiwan rows (342, 632, 633, 640, 642) are university-specific awards and are unaffected.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  $ft$Ministry of Education (Taiwan) scholarship: tuition and miscellaneous fees up to NTD 40,000 per semester + monthly living allowance of NTD 15,000 (Bachelor's) or NTD 20,000 (Master's/Doctorate)$ft$,
  $tc$The MOE pays approved tuition and miscellaneous expenses (course-credit and basic study-related fees) up to NTD 40,000 per semester; anything above the cap is paid by the recipient (some universities give recipients additional discounts/grants). Administration fees, thesis advising fees, insurance premiums, accommodation and internet access fees are NOT covered, and no airfare is included.$tc$,
  'For Chinese-taught programmes: TOCFL advanced level (Band B) or equivalent - the Moscow office allows applicants without the certificate to sit and pass the test (at their own expense) within the first semester in Taiwan. For all-English programmes: no TOCFL required; TOEFL or another government-recognised English-proficiency proof (or graduation from an English-taught programme) is required instead. No IELTS figure is officially specified.',
  $json$["Completed online registration/application at taiwanscholarship.moe.gov.tw/Apply (mandatory alongside the paper file; applications without it are not accepted)","Scholarship application form (mission's form)","Copy of passport or other document proving nationality","Copy of highest-level diploma and complete transcripts, verified as required by the regulations for international students studying in Taiwan, with certified Chinese or English translations where the originals are in another language","Proof of application for admission to a university/college in Taiwan (e.g. application-fee receipt, application form copy, or the university's acknowledgement/e-mail)","Language proficiency proof: TOCFL Band B (advanced) or equivalent for Chinese-taught programmes (or an undertaking to pass it in the first semester), or TOEFL/recognised English proof for all-English programmes","Two recommendation letters (from a principal, professor or advisor), sealed and signed by the recommender"]$json$,
  $exp$Annual: ROC overseas missions typically open applications in early February (the Moscow office's 2026 online window opened 2 February 2026).$exp$,
  $exp$Mission-specific; typically 31 March (online) with paper documents shortly after (Moscow 2026: online by 31 March 2026, paper documents received in Moscow by 10 April 2026).$exp$,
  $json$[{"round":"2026 cycle (Moscow office - for Russia and CIS applicants including Uzbekistan)","online":"2026-02-02 to 2026-03-31","paper_documents_by":"2026-04-10","places":"14","status":"closed"}]$json$
);

-- ---------------------------------------------------------------------------
-- 940: University of Manitoba Graduate Fellowship (UMGF)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  940,
  'University of Manitoba Graduate Fellowship (UMGF)',
  'University of Manitoba (Faculty of Graduate and Postdoctoral Studies)',
  'Canada', 'Fellowship', 0,
  $dl$No central deadline: departments/units run their own UMGF application process and deadline and recommend students to the Faculty of Graduate and Postdoctoral Studies - consult your department or unit.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master","PhD"]$json$,
  $json$["All fields of graduate study at the University of Manitoba, provided the programme is eligible for Tri-Agency funding (research-based programmes); pre-master's and occasional students are excluded"]$json$,
  $json$["All countries - all students regardless of citizenship are eligible to apply"]$json$, NULL, NULL,
  false, true,
  $desc$The University of Manitoba Graduate Fellowship (UMGF) is the university's flagship internal fellowship, offered each year to full-time master's and PhD students who have demonstrated superior intellectual ability and academic accomplishment. Master's awards are valued at $20,000 per year for 12 or 24 months (up to $40,000 in total) and doctoral awards at $25,000 per year for 12, 24, 36 or 48 months (up to $100,000 in total); departments/units determine the value and duration within these terms and recommend students to the Faculty of Graduate and Postdoctoral Studies (FGPS), which reviews the recommendations and notifies recipients by official letter. How much support a student can receive depends on time already spent in the programme (for example, a PhD student at the start of the programme can receive up to 48 months, one with 13-24 months completed up to 24 months, and one with 37+ months completed is no longer eligible; a master's student 13+ months in is no longer eligible), and total UMGF support for any one student is capped at four years. Holders must maintain a minimum GPA of 3.0 with no grade lower than C+, remain registered full-time in the recommending unit, not change programme, route or department while holding the award, and must give up the UMGF if offered another single award of equal or greater value than the UMGF's annual value. Students who cannot accept the award within the academic year offered must decline it. The full conditions are set out in the FGPS Award Holder's Guide. The UMGF has superseded the older Manitoba Graduate Scholarship (MGS) as the university's current flagship graduate award.$desc$,
  $req$Be admitted to (or registered in) a full-time master's or PhD programme at the University of Manitoba that is eligible for Tri-Agency funding (pre-master's and occasional students are not eligible), in any citizenship category. Have a minimum admission GPA of 3.0 to be considered (on the University of Manitoba admission scale; some departments require a higher GPA). Be recommended by your department/unit to FGPS under that unit's own UMGF process and deadline, and show great promise as a researcher and graduate student. To hold the award: register full-time in the recommending unit with satisfactory progress; maintain a minimum GPA of 3.0 and no grade below C+; have no active admission-related hold during a provisional admission period; not have held more than four years of UMGF support in total; not hold another single award of equal or greater value than the UMGF annual value; and not change programme, route or department/unit during the award.$req$,
  'https://umanitoba.ca/graduate-studies/funding-awards/university-manitoba-graduate-fellowship-umgf',
  'https://umanitoba.ca/graduate-studies/funding-awards/university-manitoba-graduate-fellowship-umgf',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 9), verified first-hand on the Faculty of Graduate and Postdoctoral Studies' official UMGF page fetched the same day (overview values/durations; period-of-support tables by months in programme; eligibility list - minimum admission GPA 3.0, all citizenships, Tri-Agency-eligible programmes; holding conditions - full-time registration, GPA 3.0/no grade below C+, four-year total cap, equal-or-greater-award exclusion, no programme/department change; departmental application process and deadlines). award_amount is NULL (variable) because the fellowship has two published level-dependent values (CAD 20,000/year master's; CAD 25,000/year doctoral) and duration is set by the unit within the published ranges; amount_usd_value is 0 (CAD award). min_gpa NULL (the 3.0 minimum is the University of Manitoba admission-GPA scale and departments may set higher thresholds); min_ielts NULL (admission-set). deadline_date NULL (departmental deadlines only). Retired record 391 named the older 'Manitoba Graduate Scholarship (MGS)', for which no live official programme page exists (Pass 102); the UMGF is the university's current, differently named fellowship and is therefore added as a new record rather than retargeted into 391. university_id is NULL because no University of Manitoba record exists in the universities table (cataloguing task noted in Pass 102). Official source linked.$note$,
  NULL,
  NULL, NULL, 'year', 'variable', NULL,
  $ft$University fellowship: CAD 20,000 per year at master's level (12 or 24 months, up to CAD 40,000) and CAD 25,000 per year at doctoral level (12, 24, 36 or 48 months, up to CAD 100,000)$ft$,
  $tc$The UMGF is paid as fellowship support to the student; the award page states no separate tuition-fee payment.$tc$,
  'Set by University of Manitoba graduate admission and the admitting unit; the UMGF page publishes no separate IELTS cutoff.',
  $json$["Department/unit UMGF application and recommendation to the Faculty of Graduate and Postdoctoral Studies - the process and deadline are set by each department/unit (no central application form)"]$json$,
  NULL,
  $exp$Annual departmental cycles: students are recommended by their department/unit to FGPS; contact the department for its UMGF deadline.$exp$,
  $json$[{"allocation":"Annual, by department/unit recommendation to FGPS","values":"Master's CAD 20,000/year for 12 or 24 months; doctoral CAD 25,000/year for 12, 24, 36 or 48 months (total UMGF support per student capped at four years)"}]$json$
);

-- ---------------------------------------------------------------------------
-- 941: University of Ottawa Admission Scholarship (Doctorate)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  941,
  'University of Ottawa Admission Scholarship (Doctorate)',
  'University of Ottawa (Office of the Vice-Provost, Graduate and Postdoctoral Studies, with the academic units)',
  'Canada', 'Doctoral Funding Package', 0,
  $dl$No scholarship application or deadline: you don't have to apply - eligible doctoral applicants (admission average 8.0/10 or higher) are automatically considered when they apply for admission, and the award is confirmed with the admission offer. Admission deadlines are set by each faculty/programme.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["PhD"]$json$,
  $json$["All University of Ottawa doctoral programmes (details and admission deadlines are set by the faculty/academic unit)"]$json$,
  $json$["All countries - may be awarded to Canadian students, permanent residents, protected persons, members of a diplomatic corps, and international students admitted into doctoral programs"]$json$, NULL, NULL,
  false, true,
  $desc$The University of Ottawa's Admission Scholarship for doctoral students guarantees admitted PhD students with an admission average of 8.0/10 or higher financial support with a minimum value of $72,000 over four years. It is open to Canadian students, permanent residents, protected persons, members of a diplomatic corps, and international students admitted into doctoral programmes, and there is no separate application - eligible applicants are automatically considered at admission. The support has two components: (1) an admission scholarship of $9,000 per year, paid by the Office of the Vice-Provost, Graduate and Postdoctoral Studies in instalments of $3,000 per term for the first 12 consecutive terms; and (2) a minimum of $9,000 per year for four years from the academic unit, in the form of assistantship employment contracts (teaching/research assistantships) or other internal scholarship sources. To maintain the scholarship, students must enrol full-time without interruption for its duration (12 consecutive terms). If a student wins an external scholarship (for example CIHR, NSERC, SSHRC, OGS, FRQ or CSC), the first component continues to be paid, while the academic unit's second component becomes optional during the external award's validity and its total value may be reduced accordingly; the second component is likewise optional for students in online programmes, at each faculty's discretion. Many units offer more than this published minimum - applicants should consult their faculty for the funding actually offered with admission. (The parallel master's admission scholarship is restricted to Canadians, permanent residents, protected persons and diplomatic corps members, so this record covers the doctorate only.)$desc$,
  $req$Be admitted to a University of Ottawa doctoral programme as a Canadian student, permanent resident, protected person, member of a diplomatic corps, or international student, with an admission average of 8.0/10 or higher (the university's own admission-average scale). No separate scholarship application is made: eligible candidates are considered automatically when applying for admission. Recipients must commit to full-time enrolment without interruption for the duration of the scholarship (12 consecutive terms). Students must report external scholarships: the $9,000/year first component continues during an external award, but the academic unit's second component (at least $9,000/year) then becomes optional and may be reduced, as decided by the faculty; it is also optional for online-programme students.$req$,
  'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/admission-scholarship',
  'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/admission-scholarship',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 9), verified first-hand on two official University of Ottawa pages fetched the same day: the Graduate and Postdoctoral Studies 'Admission scholarship' page (doctorate section: eligible citizenship categories including international students; admission average 8.0/10; minimum $72,000 over four years = $9,000/yr scholarship at $3,000/term for 12 consecutive terms + minimum $9,000/yr unit assistantships/internal sources; full-time 12-term condition; external-award and online-programme notes) and the Faculty of Engineering graduate-scholarships page ('You don't have to apply'). award_amount stores only the scholarship component (CAD 9,000/year); the composite guaranteed minimum (at least CAD 18,000/year including assistantship income) is recorded in funding_type and the description, so amount_usd_value is 0 and no employment income is presented as a scholarship amount. min_gpa NULL (the 8.0 threshold is on uOttawa's own 10-point admission-average scale); min_ielts NULL (language minima are set at admission). The record is scoped to the doctorate: the master's admission scholarship is published as restricted to Canadians/permanent residents/protected persons/diplomatic corps. Retired record 371 (generic 'Doctoral Awards' directory, Pass 102) named no specific award; this admission scholarship is added as a new record in its own right rather than retargeted into 371. The university's separate International Doctoral Scholarship ($45,000 over five years, read on the Engineering page) is a different award and is not part of this record. university_scholarships row added for university 178; official source linked.$note$,
  178,
  9000, 'CAD', 'year', 'fixed', NULL,
  $ft$Guaranteed minimum doctoral funding package of at least CAD 72,000 over four years: CAD 9,000 per year admission scholarship plus at least CAD 9,000 per year of academic-unit assistantships/internal scholarships$ft$,
  $tc$Not a tuition waiver: support is paid as scholarship instalments ($3,000 per term) plus assistantship/internal support from the academic unit, so students still pay tuition fees. (Separate uOttawa schemes address international tuition fees and are not part of this record.)$tc$,
  'Set by University of Ottawa doctoral admission and the admitting faculty (the university is bilingual, English/French); the admission scholarship page publishes no separate IELTS cutoff.',
  $json$["Application for admission to a University of Ottawa doctoral programme - no separate scholarship application; eligible candidates (admission average 8.0/10+) are automatically considered and informed with their offer"]$json$,
  NULL,
  $exp$Awarded on doctoral admission throughout the year; admission deadlines are set by each faculty/programme (no university-wide scholarship deadline).$exp$,
  $json$[{"allocation":"On doctoral admission (automatic offer; no application)","structure":"CAD 9,000/year scholarship (CAD 3,000 per term for 12 consecutive terms) + minimum CAD 9,000/year academic-unit assistantships/internal scholarships for four years"}]$json$
);

-- ---------------------------------------------------------------------------
-- 942: SFU Graduate Fellowship (GF)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  942,
  'SFU Graduate Fellowship (GF)',
  'Simon Fraser University (Graduate Studies and the academic units)',
  'Canada', 'Fellowship', 0,
  $dl$No university-wide deadline: each academic unit administers its Graduate Fellowships on its own cycle - some units award them by nomination only (students cannot apply), others run competitions through SFU's Graduate Awards Application and Adjudication System (GA3). Check your academic unit's award page for its process and dates.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master","PhD"]$json$,
  $json$["All SFU graduate programmes (each academic unit sets its own Graduate Fellowship principles, criteria and values within the university framework)"]$json$,
  $json$["Registered SFU graduate students - the Graduate Fellowship terms read for this record state no citizenship restriction; eligibility turns on academic merit (GPA 3.5 or higher) and full-time graduate registration"]$json$, NULL, NULL,
  false, true,
  $desc$The Graduate Fellowship (GF) is Simon Fraser University's standard internal merit fellowship for graduate students: a one-term award valued flexibly between $1,000 and $7,000 (a full 1.0 GF is $7,000), for which students must normally have a GPA of 3.5 or higher. Graduate Studies provides the funding framework, but each academic unit administers its own fellowships and sets its values, principles and criteria (subject to Graduate Studies approval), so both the amount a student receives and how they are selected vary by unit: some units (for example the School of Resource and Environmental Management) award GFs by nomination only and students cannot apply, considering incoming and continuing students on academic accomplishment, available funds and the student's other support; other units run open competitions (annual or bi-annual) through SFU's Graduate Awards Application and Adjudication System (GA3). Units may offer partial or multiple fellowships within the academic year (1 September-31 August) under their own rules, and GF funding cannot be guaranteed for every eligible student - it depends on available award funds. The GF is a building block of SFU graduate funding packages (alongside assistantships, supervisor support and donor awards), not a multi-year guaranteed package, and entrance (admission-time) scholarships at SFU are a separate, department-nominated mechanism.$desc$,
  $req$Be a registered (full-time) master's or doctoral student at Simon Fraser University with a GPA of 3.5 or higher (SFU's 4.33 graduate scale), selected under your academic unit's own Graduate Fellowship rules - by departmental nomination in units that do not accept applications, or through the unit's GA3 competition where one is run. Incoming students may be considered at entrance; students who do not qualify on entrance may be considered once their GPA reaches the 3.5 minimum. Unit award decisions weigh academic accomplishment, the availability of funds, and the student's other financial support through the supervisor or department, and most award funding is contingent on satisfactory progress in the annual Graduate Progress Report.$req$,
  'https://www.sfu.ca/gradstudies/awards-funding/internal-donor-funded.html',
  'https://www.sfu.ca/gradstudies/awards-funding/internal-donor-funded.html',
  NULL,
  'annual', 'upcoming', 'verified', 9, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 9). Terms verified first-hand on the official SFU School of Resource and Environmental Management scholarships page fetched the same day ('The Graduate Fellowship (GF) is a one-term award valued between $1000 and $7,000 and students must have a GPA of 3.5 or higher to be eligible. REM awards its GFs by nomination. Students cannot apply.' - plus entrance consideration, fund-availability limits and the GA3 application system), corroborated in search results by other official SFU unit pages with the same parameters (Education: flexible $1,000-$7,000 values and 0.5/1.0 increments totalling at most one full GF per academic year; Chemistry/English/History: flexible $1,000-$7,000; Molecular Biology & Biochemistry and Biological Sciences: full GF $7,000 via unit competitions with CGPA 3.5; Health Sciences: bi-annual GF competition). Reliability 9 rather than 10 because SFU publishes GF terms per academic unit rather than on one central award page; the linked source is the Graduate Studies internal-awards index through which each unit's terms of reference are published. award_amount NULL (variable: flexible one-term values of $1,000-$7,000 set by units); amount_usd_value 0 (CAD). min_gpa NULL (the 3.5 threshold is on SFU's 4.33 graduate scale); min_ielts NULL (admission-set). deadline_date NULL (unit-specific nomination/competition cycles). Retired record 380 (Pass 102) conflated this fellowship with an undergraduate international entrance award behind one funding-hub title; this new record covers the graduate fellowship only, and no SFU undergraduate entrance award is added here. university_id NULL (no Simon Fraser University record in the universities table - cataloguing task).$note$,
  NULL,
  NULL, NULL, 'year', 'variable', NULL,
  $ft$SFU internal merit fellowship: one-term awards flexibly valued between CAD 1,000 and CAD 7,000 (full Graduate Fellowship CAD 7,000), set and administered by each academic unit$ft$,
  $tc$The Graduate Fellowship is paid as award funding to the student (see Graduate Studies' Award Payment Schedule for disbursement timing); it is not a tuition waiver.$tc$,
  'Set by SFU graduate admission and the admitting programme; the Graduate Fellowship terms publish no separate IELTS cutoff.',
  $json$["Unit-dependent: GA3 (Graduate Awards Application and Adjudication System) application where the academic unit runs a GF competition, or departmental nomination where it does not (students cannot apply in nomination-only units) - check the unit's award terms"]$json$,
  NULL,
  $exp$Unit-specific cycles within the academic year (1 September-31 August): nominations or GA3 competitions depend on the academic unit.$exp$,
  $json$[{"allocation":"Per academic unit (nomination or GA3 competition)","value":"One-term award, flexible CAD 1,000-7,000 (full GF CAD 7,000); GPA 3.5+ required; offers depend on available funds"}]$json$
);

-- Sources 3077-3080 + links + university_scholarships 675
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3077, 'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/admission-scholarship', 'University of Ottawa Admission Scholarship (Doctorate) Official Page', 'uottawa.ca', 'scholarship', now(), true, true, now()),
(3078, 'https://umanitoba.ca/graduate-studies/funding-awards/university-manitoba-graduate-fellowship-umgf', 'University of Manitoba Graduate Fellowship (UMGF) Official Page', 'umanitoba.ca', 'scholarship', now(), true, true, now()),
(3079, 'https://www.sfu.ca/gradstudies/awards-funding/internal-donor-funded.html', 'SFU Graduate Studies Internal and Donor Funded Awards Official Index', 'sfu.ca', 'scholarship', now(), true, true, now()),
(3080, 'https://english.moe.gov.tw/cp-24-16833-23C09-1.html', 'MOE Taiwan Scholarship Program - Ministry of Education, Taiwan (Official)', 'english.moe.gov.tw', 'scholarship', now(), true, true, now());
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES (941, 3077), (940, 3078), (942, 3079), (939, 3080);
INSERT INTO university_scholarships (id, university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, official_url, source_url, verification_status, last_verified_at) VALUES (675, 178, 941, 'University of Ottawa Admission Scholarship (Doctorate)', 'available', 'Doctoral funding package (admission scholarship + academic-unit support)', 'Minimum CAD 72,000 over four years (CAD 9,000/year scholarship + at least CAD 9,000/year unit support)', false, true, 'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/admission-scholarship', 'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/admission-scholarship', 'verified', now());

SELECT setval('scholarships_id_seq', GREATEST((SELECT MAX(id) FROM scholarships), 942), true);
SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 3080), true);
SELECT setval('university_scholarships_id_seq', GREATEST((SELECT MAX(id) FROM university_scholarships), 675), true);
