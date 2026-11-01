-- ScholarBridge AI - Scholarship Enrichment Batch 6 - 2026-10-26
-- Audit of annually-recurring international scholarship programmes.
-- Execution note (2026-10-26): the statements below are the replay of what
-- was executed in Supabase in this batch, in order:
--   0) Correction of two swapped Batch 5 scholarship_sources links
--      (verified by URL: source 3045 is kas.de, source 3046 is
--      scholarships.sk - the reverse of what the parallel Batch 5 INSERT
--      results suggested; see the errata note appended to
--      scholarship_enrichment_batch5_2026-10-26.sql).
--   1) Eight new scholarship rows, ids 918-925 (sequence values 915-917
--      were consumed without producing rows; the inserts were issued in
--      pairs and the id<->title mapping below was re-verified by SELECT
--      before any sources/links were created - parallel result order is
--      NOT a reliable mapping, see Batch 5/6 notes).
--   2) Eight new sources, ids 3053-3060 (single INSERT ... RETURNING
--      id, url, so the mapping is explicit), plus scholarship_sources links.
--   3) Two university_scholarships rows (672 RMIT, 673 UTS), RETURNING
--      id/university_id/scholarship_id.
-- The scholarship INSERTs are listed in id order here for readability;
-- their text is unchanged from execution. See
-- docs/SCHOLARSHIP_ENRICHMENT_BATCH_6_2026-10-26.md for the per-item audit
-- (added / already present / rejected) of the 11 candidate programmes.

-- 0) Batch 5 link correction: Slovak 913 -> scholarships.sk (3046),
--    KAS 914 -> kas.de (3045)
UPDATE scholarship_sources SET source_id = CASE WHEN scholarship_id = 913 THEN 3046 ELSE 3045 END WHERE (scholarship_id, source_id) IN ((913, 3045), (914, 3046)) RETURNING scholarship_id, source_id;

-- 1a) RMIT Vice Chancellor's PhD Scholarship (VCPS) - new id 918
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  $t$RMIT Vice Chancellor's PhD Scholarship (VCPS)$t$,
  'RMIT University',
  'Australia', 'Full Tuition + Stipend', 0,
  $dl$Awarded through the RMIT central research scholarship round; ten scholarships per year. For 2027 commencement, international expressions of interest closed 30 August 2026 and full applications closed 30 September 2026 (both dates have passed). RMIT states that updated scholarship information will be published at the end of 2026; check the official page for the next round.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["PhD"]$json$,
  $json$["All PhD research fields at RMIT"]$json$,
  $json$["All countries"]$json$, NULL, NULL,
  false, true,
  $desc$The RMIT Vice Chancellor's PhD Scholarship (VCPS) is RMIT University's premium doctoral scholarship for local and international PhD candidates with academic excellence and outstanding research potential; ten awards are made each year. For the most recent round published by RMIT, the VCPS provided a stipend of AUD 48,299 per year (pro rata) for 3.5 years full-time - a top-up of around AUD 12,000 above the RTP stipend rate - plus a research support allowance of AUD 5,000 per year, a relocation allowance of up to AUD 515 per adult and AUD 255 per child (maximum AUD 1,540), and paid leave entitlements. International recipients additionally receive an RMIT Research International Tuition Fee Scholarship (RRITFS) covering tuition and Overseas Student Health Cover (OSHC) for the duration of their visa. RMIT states that updated information for the next round will be published at the end of 2026. The standard RMIT research stipend round is catalogued separately (id 382).$desc$,
  $req$PhD only. Applicants must meet RMIT PhD entry standards at the highest level: a Master by Research, a Master by Coursework with a high-distinction research component, a first-class Honours degree, or a four-year bachelor's degree with an overall GPA of 4.0 (80 percent or above); applicants not meeting these qualification routes can only be considered where they have publications or significant research experience. International applicants must be commencing an RMIT PhD (from 1 January 2027 for the most recent round), have applied for a full-time PhD, meet RMIT English language requirements by the application deadline, provide evidence of supervisor support and submit the VCPS expression of interest (EOI) form. Because several qualification routes exist, no single min_gpa is stored.$req$,
  'https://www.rmit.edu.au/scholarships/research/vcps',
  'https://www.rmit.edu.au/scholarships/research/vcps',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified against the official RMIT VCPS page fetched the same day: stipend AUD 48,299 p.a., research support allowance AUD 5,000 p.a., relocation up to AUD 515/adult and AUD 255/child (max AUD 1,540), international recipients also receive RRITFS tuition coverage plus OSHC for the visa duration, 3.5 years full-time, ten awards per year. The page presents these benefits for its current published round and states 2027-round information will be published at the end of 2026, so the amount is stored as the most recently published rate. The international deadlines for 2027 commencement (EOI 30 August 2026, full application 30 September 2026) have passed, so deadline_date is NULL (not_published, closed). award_amount 48299 AUD/year fixed; amount_usd_value is 0 (AUD award). min_gpa/min_ielts NULL: multiple qualification routes and no single VCPS test cutoff are published.$note$,
  109,
  48299, 'AUD', 'year', 'fixed', 48299,
  'Premium stipend + annual research support allowance + tuition fee scholarship (RRITFS) and OSHC for international recipients',
  $tc$International VCPS recipients receive an RMIT Research International Tuition Fee Scholarship (RRITFS) covering tuition for the scholarship duration, plus OSHC for the duration of their visa.$tc$,
  'International applicants must meet RMIT PhD English language requirements by the application deadline; no single VCPS-specific test score is published.',
  $json$["Full-time RMIT PhD application through the central research scholarship round","VCPS expression of interest (EOI) form","Evidence of supervisor support for the proposed project","Evidence that RMIT English language requirements are met by the application deadline"]$json$,
  'Annual central round (RMIT states updated information will be published at the end of 2026)',
  'Annual central round (2027 commencement: international EOI 30 August 2026, full application 30 September 2026 - passed)',
  $json$[{"round":"2027 commencement (central RMIT research scholarship round)","international_eoi_deadline":"2026-08-30","international_full_application_deadline":"2026-09-30","status":"closed - international deadlines passed"}]$json$
) RETURNING id; -- 918

-- 1b) UTS President's Scholarship (UTSP) - new id 919
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  $t$UTS President's Scholarship (UTSP) for International Research Students$t$,
  'University of Technology Sydney (UTS)',
  'Australia', 'Living Stipend', 0,
  $dl$Annual scholarship awarded through UTS research degree admission. The most recent application round published on the official page ran 7 September - 7 October 2026 and is now closed; check the official UTS scholarship page for the next round.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master","PhD"]$json$,
  $json$["All research fields within UTS areas of research concentration"]$json$,
  $json$["All countries"]$json$, NULL, NULL,
  false, true,
  $desc$The UTS President's Scholarship (UTSP) supports international higher degree by research (HDR) students with exceptional research potential who are commencing full-time PhD or Master by Research (MRes) study at the University of Technology Sydney in an area of research concentration. From 1 January 2027 the scholarship pays a tax-free living allowance of AUD 40,500 per year for up to 3.5 years full-time (PhD) or 2 years full-time (MRes), plus Overseas Student Health Cover (OSHC) single cover for 42 months (PhD) or 24 months (MRes). The UTSP does not cover tuition fees. Applicants for the UTSP are automatically considered, on the same application form, for the UTS International Research Scholarship, which covers tuition fees and is catalogued separately in this database (id 373). The most recent application round published by UTS ran from 7 September to 7 October 2026 and is closed.$desc$,
  $req$Be an international student commencing a full-time HDR (PhD or Master by Research) at UTS in an area of research concentration, with exceptional research potential. Applicants are not eligible if they have already completed a research degree at the same or a higher level, have previously held an Australian Government-funded postgraduate research scholarship (unless it was terminated within six months), or hold an equivalent award worth more than 75 percent of the UTSP rate (the former IPRS is excluded from this bar). Applicants must meet UTS admission requirements for their research degree, including English language requirements.$req$,
  'https://www.uts.edu.au/scholarship/uts-presidents-scholarship',
  'https://www.uts.edu.au/scholarship/uts-presidents-scholarship',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6 - annually recurring international scholarships), verified against the official UTS scholarship page fetched the same day: living allowance AUD 40,500 p.a. tax-free from 1 January 2027, OSHC single cover 42 months (PhD) / 24 months (MRes), duration 3.5 years FT PhD / 2 years FT MRes, applications 7 September - 7 October 2026 (closed), UTSP applicants automatically considered for the International Research Scholarship (tuition; id 373) on one form. The UTSP itself pays no tuition, so coverage_type is Living Stipend and the linked university_scholarships row has covers_tuition=false. award_amount 40500 AUD/year fixed; amount_usd_value is 0 (AUD award). No single published GPA or IELTS cutoff for the UTSP itself; min_gpa/min_ielts NULL. deadline_date is NULL (not_published) because the published round closed 7 October 2026 and the next round is not yet published.$note$,
  169,
  40500, 'AUD', 'year', 'fixed', 40500,
  'Tax-free living allowance + OSHC single cover (tuition not included)',
  $tc$Not covered by the UTSP. UTSP applicants are automatically considered for the UTS International Research Scholarship, which pays tuition fees, on the same application.$tc$,
  'No separate UTSP English cutoff is published; applicants must meet the English language requirements of their UTS research degree.',
  $json$["UTS research degree (HDR) application indicating scholarship consideration - the same form covers the UTSP and the International Research Scholarship","Evidence required by UTS for HDR admission and competitive scholarship ranking"]$json$,
  'Annual round (the published 2026 round opened 7 September 2026)',
  'Annual round (the published 2026 round closed 7 October 2026)',
  $json$[{"round":"2026 application round","applications":"7 September - 7 October 2026","status":"closed"}]$json$
) RETURNING id; -- 919

-- 1c) JDS Scholarship for Uzbekistan - new id 920
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  'JDS Scholarship for Uzbekistan (Japanese Grant Aid for Human Resource Development)',
  'Government of Japan - JICA/JICE (JDS Project)',
  'Japan', 'Full Funding', 0,
  $dl$The current call for academic years 2027-2029 is open: applications close on Sunday 20 December 2026. Target Organizations must submit their recommendation lists by 6 December 2026 - candidates who are not on a Target Organization recommendation list cannot be accepted. Late or incomplete applications are not accepted.$dl$,
  '2026-12-20', 'fixed', NULL, NULL,
  $json$["Master"]$json$,
  $json$["International Public Policy","Law (Rule of Law / Building Legal Order)","Economics and Industrial Development","Public Management and Policy Analysis"]$json$,
  $json$["Uzbekistan"]$json$, NULL, 5.0,
  false, true,
  $desc$The Project for Human Resource Development Scholarship (JDS) is a Japanese grant aid programme, implemented with JICA and JICE, that has sent 461 fellows from Uzbekistan to Japan since 1999. The currently open call offers two-year master's programmes taught in English at Japanese accepting universities for the academic years 2027-2029, with 18 fellows dispatched per year. Only full-time employees of designated Target Organizations (Uzbek government bodies and related organizations) may apply, and their organization must include them in its recommendation list. The current framework has two priority areas: Strengthening the Free and Open International Order - International Public Policy (International University of Japan, International Christian University) and Rule of Law / Building Legal Order (Nagoya University, Nagoya University of Economics) - and Policy Making for Sustainable Economic Development - Industrial Development (Ritsumeikan University Graduate School of Economics; International University of Japan MBA / Japan-Global Development Program) and Public Management (International University of Japan, Public Management and Policy Analysis Program). Selection runs from January 2027 (IELTS and mathematics tests) through document screening, technical interviews and a health check to final approval in April 2027, with departure to Japan in August 2027. All selection costs are covered by the project, which also arranges air tickets and visas and supports fellows after arrival in Japan. Fellows must return to Uzbekistan and work there for at least three years after graduation.$desc$,
  $req$Citizens of Uzbekistan only. Age 25-40 as of 1 April 2027 (born on or after 2 April 1986 and on or before 1 April 2002); bachelor's degree from a university authorized by the Government of Uzbekistan; currently employed full-time in a Target Organization with at least two years of full-time work experience there by the time of application (experience across Target Organizations may be combined; contract and part-time service does not count); good written and spoken English with a minimum IELTS score of 5.0; good physical and mental health; commitment to return and work in Uzbekistan for at least three years. Not eligible: candidates currently receiving (or expected to receive) another scholarship, candidates who have already obtained a master's or doctoral degree abroad under any funding, active military personnel and civilian military employees, and temporary employees. Female candidates are strongly encouraged to apply.$req$,
  'https://www.jds-scholarship.org/country/uzbekistan/index.html',
  'https://www.jds-scholarship.org/country/uzbekistan/index.html',
  NULL,
  'annual', 'open', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified against the official JDS Uzbekistan pages fetched the same day (application page and framework/university page): call open for AY2027-2029, two-year English-taught master's, 18 dispatches a year, 461 fellows since 1999; application deadline 20 December 2026 and Target Organization recommendation lists due 6 December 2026; eligibility age 25-40 as of 1 April 2027, full-time Target Organization employment with at least two years of experience, minimum IELTS 5.0 (the official single figure, stored in min_ielts), three-year return-and-work obligation; framework component and accepting-university lists with quotas totalling 18. award_amount is NULL (basis variable): the fetched Uzbekistan pages publish no stipend cash figure, so none is invented; amount_usd_value is 0. min_gpa NULL (no official GPA cutoff published).$note$,
  NULL,
  NULL, NULL, 'total', 'variable', NULL,
  'Japanese grant aid full scholarship for a two-year master degree (selection costs covered; air tickets and visas arranged by the project)',
  $tc$JDS is funded by Japanese grant aid; the costs of the two-year master's study at the accepting Japanese university are borne by the project, which also arranges air tickets and visas and covers all selection costs in Uzbekistan. No stipend cash amount is published on the JDS Uzbekistan pages, so no cash figure is stored.$tc$,
  'Minimum IELTS 5.0 officially required. The JDS office arranges IELTS testing for applicants without a valid result (no certificate is issued to candidates); holders of a valid IELTS score are exempt from the English test.',
  $json$["Application documents required by the JDS Uzbekistan application guidelines, submitted by 20 December 2026 (late or incomplete documents are not accepted)","Inclusion in the recommendation list that the applicant's Target Organization submits to the JDS office by 6 December 2026"]$json$,
  NULL, NULL,
  $json$[{"round":"Academic years 2027-2029 (departure August 2027)","application_deadline":"2026-12-20","target_organization_recommendation_lists":"by 6 December 2026","selection":"Mid-January 2027 IELTS and mathematics tests; February 2027 document screening by Japanese universities; March 2027 technical interviews and health check in Tashkent; April 2027 comprehensive interview and final approval","promotion_seminars":"Online seminars 3, 5, 10, 12, 17 and 19 November 2026"}]$json$
) RETURNING id; -- 920

-- 1d) ADB-Japan Scholarship Program - new id 921
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  'ADB-Japan Scholarship Program (ADB-JSP)',
  'Asian Development Bank (financed by the Government of Japan)',
  'Multiple', 'Full Funding', 0,
  $dl$No single deadline: applications are made through the designated partner institutions (27 institutions in the Asia-Pacific region, 17 of them in Japan), and each institution sets its own admission and ADB-JSP deadlines. Check the application schedule of your chosen institution.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master"]$json$,
  $json$["Economics, business and management","Science and technology","Development studies","Law and public policy"]$json$,
  $json$["Citizens of ADB borrowing member countries that are eligible for Japanese ODA (the official list includes Uzbekistan)"]$json$, NULL, NULL,
  false, true,
  $desc$The Asian Development Bank-Japan Scholarship Program (ADB-JSP) was established in April 1988 and is financed by the Government of Japan. It awards about 130 graduate scholarships a year for master's studies at 27 designated institutions in the Asia-Pacific region (17 of them in Japan) in economics, business and management, science and technology, development studies, and law and public policy. Uzbekistan is explicitly listed among the eligible countries (ADB borrowing members that are also eligible for Japanese official development assistance). The scholarship provides full tuition fees, a monthly subsistence allowance including housing, books and instructional materials, medical insurance and travel expenses; a special grant may also be available for thesis/research preparation. Because amounts depend on the institution and country of study, no single cash value is stored. Applicants must first be admitted to an approved master's programme at a designated institution, which shortlists and recommends candidates to ADB for final selection.$desc$,
  $req$Be a citizen of an ADB borrowing member country eligible for Japanese ODA (Uzbekistan is on the official list); be admitted to an approved master's course at a designated institution; hold a bachelor's degree with a superior academic record; have at least two years of full-time professional work experience acquired after the university degree; be proficient in oral and written English; be not more than 35 years old (the age limit may be waived in exceptional cases); be in good health. Applicants must not hold dual citizenship of a developed country, must not already be living or working outside their home country, and must not already be enrolled in a graduate degree. Awardees must agree to return to their home country for at least two years after completing the programme. Executive directors, alternate directors, management and staff of ADB (and their close relatives) are not eligible.$req$,
  'https://www.adb.org/work-with-us/careers/japan-scholarship-program',
  'https://www.adb.org/work-with-us/careers/japan-scholarship-program',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified against the official ADB programme page fetched the same day: Uzbekistan is explicitly listed among eligible citizenships (ADB borrowing member plus Japanese ODA eligibility); about 130 awards a year since 1988; master's at 27 designated institutions (17 in Japan); fields economics/business/management, science and technology, development studies, law and public policy; covers full tuition, monthly subsistence including housing, books/materials, medical insurance and travel, with a possible thesis grant. award_amount is NULL (basis variable) because ADB publishes no single cash figure - support is expense-based and varies by institution and country of study; amount_usd_value is 0. deadline_date NULL (not_published): applications run through each designated institution on its own schedule. No single published GPA or IELTS cutoff; min_gpa/min_ielts NULL.$note$,
  NULL,
  NULL, NULL, 'total', 'variable', NULL,
  'Full scholarship: tuition + monthly subsistence (incl. housing) + books/materials + medical insurance + travel',
  $tc$Full tuition fees at the designated institution are covered by the programme.$tc$,
  'Proficiency in oral and written English is required; any specific test scores are set by the designated institution for admission. No single ADB-JSP IELTS cutoff is published.',
  $json$["Application for admission to an approved master's programme at a designated ADB-JSP institution","ADB-JSP application submitted through the designated institution, which screens candidates and forwards a shortlist to ADB"]$json$,
  'Institution-specific (annual admission cycles at the 27 designated institutions)',
  'Institution-specific - see the designated institution application schedule',
  $json$[{"note":"Annual programme; application deadlines are set by each designated institution, not by ADB centrally"}]$json$
) RETURNING id; -- 921

-- 1e) Swedish Institute Scholarship for Global Professionals - new id 922
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  'Swedish Institute Scholarship for Global Professionals',
  'Swedish Institute',
  'Sweden', 'Full Tuition + Stipend', 0,
  $dl$Two-step annual process: first apply to Swedish master programmes through University Admissions (16 October 2026 - 15 January 2027), then apply for the SI Scholarship in the Swedish Institute portal from 8 to 24 February 2027 (the portal closes at 14:59 CET on 24 February 2027).$dl$,
  '2027-02-24', 'fixed', NULL, NULL,
  $json$["Master"]$json$,
  $json$["Governance","Public Health","Entrepreneurship and Innovation","STEM (Science, Technology, Engineering and Mathematics)"]$json$,
  $json$["Citizens of the 34 eligible countries listed by the Swedish Institute (Uzbekistan is included)"]$json$, NULL, NULL,
  false, true,
  $desc$The Swedish Institute Scholarship for Global Professionals is a fully funded Swedish government scholarship for full-time one- or two-year master's studies in Sweden in the fields of Governance, Public Health, Entrepreneurship and Innovation, and STEM. Citizens of Uzbekistan are eligible: Uzbekistan is one of the 34 countries on the Swedish Institute's official list. The scholarship covers full tuition fees (paid by the Swedish Institute directly to the university each semester), a monthly living allowance of SEK 12,000 throughout the study period, and a one-time travel grant of SEK 15,000 (a lower SEK 10,000 grant applies to six listed countries; Uzbekistan receives the SEK 15,000 grant). Holders join the SI Network for Global Professionals and, after the scholarship, the Sweden Alumni Network. The scholarship does not include insurance, grants for family members, or the University Admissions application fee, and it cannot be transferred to another programme or extended. Applications are two-step: apply to SI-eligible master programmes via University Admissions by 15 January 2027, then apply for the scholarship in the SI portal between 8 and 24 February 2027; results are announced on 22 April 2027.$desc$,
  $req$Be a citizen of one of the 34 eligible countries (Uzbekistan included; residence in the country at application is not required); apply for a master programme that is eligible for the SI Scholarship (the 2027/2028 list is published 13 November 2026); be liable to pay tuition fees in Sweden and be admitted (or conditionally admitted) to an eligible programme on the admissions announcement day (1 April 2027). Work experience is mandatory: applicants from Uzbekistan must document at least 3,000 hours of work experience accumulated before February 2027, from a maximum of three employers (full-time or part-time employment, freelancing or entrepreneurship count; applicants do not need to be employed at the time of application). Demonstrated leadership experience from an employer, entrepreneurship or civil-society engagement is also required. Ineligible: applicants who hold or are enrolled in a Swedish degree, who have lived in Sweden for a cumulative two years or more before August 2027, who have previously held a Swedish Institute scholarship, or who hold Swedish or EU/EEA citizenship or certain Swedish residence/work permits. Dual citizens must apply under one citizenship only.$req$,
  'https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/',
  'https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified first-hand on the official Swedish Institute page (si.se) fetched the same day: Uzbekistan is explicitly listed among the 34 eligible countries; benefits are full tuition paid directly to the university, a monthly allowance of SEK 12,000 and a one-time travel grant of SEK 15,000 (SEK 10,000 applies only to Armenia, Azerbaijan, Belarus, Georgia, Moldova and Ukraine); fields Governance, Public Health, Entrepreneurship and Innovation, STEM; key dates University Admissions 16 October 2026 - 15 January 2027, SI portal 8-24 February 2027 closing 14:59 CET, admissions announcement 1 April 2027, SI announcement 22 April 2027; Uzbekistan applicants must document at least 3,000 hours of work experience before February 2027 plus leadership experience. award_amount stores the monthly allowance (12000 SEK/month, fixed); amount_usd_value is 0 (SEK award). Aggregator figures were not used; all amounts are from si.se. No SI-specific GPA or IELTS cutoff; min_gpa/min_ielts NULL.$note$,
  NULL,
  12000, 'SEK', 'month', 'fixed', 12000,
  'Full tuition fees paid to the university + SEK 12,000/month living allowance + one-time SEK 15,000 travel grant',
  $tc$Full tuition fee coverage: the Swedish Institute pays the tuition fee directly to the Swedish university each semester.$tc$,
  'English requirements are those of the chosen Swedish master programme (via University Admissions); the Swedish Institute publishes no separate IELTS cutoff for this scholarship.',
  $json$["Application to up to four master programmes via UniversityAdmissions.se by 15 January 2027 (keep the personal eight-digit application number for the SI application)","SI Scholarship application in the SI portal between 8 and 24 February 2027, including certified proof of work experience (at least 3,000 hours for Uzbekistan applicants) and leadership experience on the SI template forms (published 13 November 2026)"]$json$,
  NULL, NULL,
  $json$[{"round":"Autumn 2027 intake","university_admissions":"16 October 2026 - 15 January 2027","eligible_programmes_published":"13 November 2026","si_application_portal":"8 - 24 February 2027 (closes 14:59 CET on 24 February 2027)","admissions_announcement":"1 April 2027","si_scholarship_announcement":"22 April 2027"}]$json$
) RETURNING id; -- 922

-- 1f) KOICA Scholarship Program (CIAT) - new id 923
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  'KOICA Scholarship Program (CIAT) for Government Officials',
  'Korea International Cooperation Agency (KOICA)',
  'South Korea', 'Full Funding', 0,
  $dl$Annual rounds run through KOICA country offices and Korean Embassies. For the 2027 intake (2027 KOICA Scholarship Program Guideline, June 2026), application packages with official government nomination were due to the KOICA country office or Korean Embassy in July 2026; exact deadlines differ by office. Check the CIAT notice board and the KOICA Uzbekistan office for the next round.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master","PhD"]$json$,
  $json$["Designated development-related programmes at Korean universities - the list changes each round (2027 intake: e-government and public management, climate change and environment management, economic development policy, health policy and financing, high value-added agriculture, global fisheries development, AI digital innovation, control of infectious diseases, digital health, social economy)"]$json$,
  $json$["Citizens of KOICA designated partner countries (97 countries in the 2027 guideline; Uzbekistan is included in the Middle East, CIS and Eastern Europe group)"]$json$, NULL, NULL,
  false, true,
  $desc$The KOICA Scholarship Program is part of the CIAT (Capacity Improvement and Advancement for Tomorrow) fellowship programme of the Korea International Cooperation Agency, the Republic of Korea's grant aid agency. It funds talented government officials from designated partner countries - Uzbekistan is on the official 2027 designated-country list of 97 countries - for degree study in Korea: master's programmes of about 17 months and doctoral programmes of 36 months at designated Korean universities. Applicants must be government officials officially nominated by their government. The 2027 programme list included Handong Global University, Incheon National University, KDI School of Public Policy and Management, Sungkyunkwan University, Yonsei University, Kyungpook National University, Pukyong National University and the University of Seoul, among others; the programme list changes between rounds. Benefits under the 2027 guideline: full tuition fees, a monthly allowance of KRW 1,200,000, round-trip airfare, dormitory accommodation arranged through the university, a settlement allowance of KRW 600,000 (master's) or KRW 1,200,000 (doctoral) paid once, scholarship completion grants of KRW 300,000 (master's) or KRW 600,000 (doctoral) paid once, national health insurance and private medical insurance. Selection has two stages: a KOICA round (application package and government nomination to the KOICA country office or Korean Embassy, then an on-site interview) and a university round (document screening, local medical check-up and university interview), followed by final acceptance.$desc$,
  $req$Be a citizen of a KOICA designated country (Uzbekistan is designated in the 2027 guideline) and a government official who receives an official nomination from their government; preferably under 40 years of age; in good mental and physical health. Master's applicants need a bachelor's degree (held as of 31 July 2026 for the 2027 round) and preferably two years of experience in the field of study; doctoral applicants need a master's degree and preferably three years of experience after the master's. A strong command of English is required. Restrictions: people who previously received a Korean government scholarship for a degree programme are not eligible (holders of a Korean government bachelor's scholarship may apply for a master's); people who already completed a KOICA-funded or other Korean government-funded master's cannot apply for the KOICA master's again; former KOICA scholars whose scholarship was cancelled are not eligible. Applicants must also meet the criteria of the specific university programme (see its Program Information) and may apply to only one programme per round.$req$,
  'https://www.koica.go.kr/ciat/7815/subview.do',
  'https://www.koica.go.kr/ciat/7815/subview.do',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified against the official 2027 KOICA Scholarship Program Application Guideline (June 2026) fetched the same day: Uzbekistan is listed among the 97 designated countries for 2027 (Middle East, CIS and Eastern Europe group); applicants must be government officials with official government nomination; master 17 months / doctoral 36 months; benefits are full tuition, monthly allowance KRW 1,200,000, airfare, dormitory accommodation, settlement allowance KRW 600,000 (master) / 1,200,000 (doctoral), completion grants KRW 300,000 / 600,000, national health insurance and private medical insurance (amounts from the guideline benefits table); application packages were due to KOICA country offices / Korean Embassy in July 2026 with office-specific exact deadlines, so deadline_date is NULL (not_published). award_amount stores the published monthly allowance (1200000 KRW, fixed); amount_usd_value is 0 (KRW award). The guideline PDF is posted on the CIAT notice board (stored as website_url/source_url); the fetched copy was the identical official guideline hosted on a partner-government site. Aggregator claims of a single worldwide deadline date were not used. No official GPA or IELTS cutoff; min_gpa/min_ielts NULL.$note$,
  NULL,
  1200000, 'KRW', 'month', 'fixed', 1200000,
  'Full scholarship: tuition + KRW 1,200,000/month allowance + airfare + dormitory accommodation + settlement and completion grants + insurance',
  $tc$Full tuition fees are paid by KOICA directly to the university.$tc$,
  'A strong command of spoken and written English is required (classes are entirely in English). No official English test score is required at the KOICA round, although some universities may require one at the university round; no single IELTS cutoff is published.',
  $json$["KOICA application package with the Document Checklist, submitted by email to the KOICA country office or Korean Embassy by that office's deadline","Official nomination from the applicant's government","University admission documents required by the chosen programme's Program Information (university round) and a local medical check-up"]$json$,
  'Annual rounds (guidelines and programme lists are posted on the CIAT notice board)',
  'Annual; application packages to KOICA country offices / Korean Embassy were due in July 2026 for the 2027 intake (exact date per office)',
  $json$[{"round":"2027 intake (2027 KOICA Scholarship Program Guideline, June 2026)","koica_round":"Application packages and government nominations to KOICA country offices / Korean Embassy by July 2026; on-site interviews July 2026","university_round":"Document screening, local medical check-up and university interviews through October 2026","final_acceptance":"November 2026","status":"closed for the 2027 intake"}]$json$
) RETURNING id; -- 923

-- 1g) Hubert H. Humphrey Fellowship Program - new id 924
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  'Hubert H. Humphrey Fellowship Program (Fulbright, Non-Degree)',
  'U.S. Department of State - Fulbright Program (administered by IIE)',
  'United States', 'Full Funding', 0,
  $dl$Annual competition administered in Uzbekistan by the U.S. Embassy in Tashkent. The most recent Uzbekistan application deadline was 3 July 2026 (for the 2027-2028 fellowship year, with travel to the United States in late summer 2027). Watch the U.S. Embassy Tashkent page for the next annual call.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master"]$json$,
  $json$["Communications and Journalism","Law and Governance","Natural Resources Policy","Public and Economic Policy","Public Health Policy and Management","Technology Policy and Management"]$json$,
  $json$["Uzbekistan (via the U.S. Embassy in Tashkent; the programme runs in designated countries worldwide)"]$json$, NULL, NULL,
  false, true,
  $desc$The Hubert Humphrey Fellowship Program is a Fulbright programme that brings accomplished young and mid-career professionals from designated countries to the United States for ten months of non-degree graduate study and related practical professional experience. It is not a degree programme: fellows are placed in multinational thematic cohorts at approximately 13 U.S. host universities (fellows may not request a particular university), take graduate-level courses, and complete at least six weeks of professional affiliation with a U.S. governmental, non-governmental, private-sector or international organization. For Uzbekistan, the U.S. Embassy's most recent call covered six fields: Communications and Journalism; Law and Governance; Natural Resources Policy; Public and Economic Policy; Public Health Policy and Management; and Technology Policy and Management. The fellowship covers required standardized-test costs, J-1 visa assistance, an economy-class round-trip airline ticket, medical insurance, living expenses (which vary by destination city; no support for accompanying family members), tuition and fees at the assigned host university, a professional development allowance for field trips, professional visits and conferences, and a pre-academic orientation programme in the United States. Because living support varies by host city and no single cash figure is published, no award amount is stored. This record is listed at graduate level for discovery, but it is a non-degree fellowship - see the degree-seeking Fulbright record (id 889) for master's study.$desc$,
  $req$Hold a first university degree (equivalent to a four-year bachelor's degree); have at least five years of full-time professional experience after the first degree; hold management or policy responsibilities (this includes university teachers and teachers of English as a foreign language only where they have such responsibilities; an exception is made for scientists and researchers in substance abuse education and policy); hold (or be eligible to hold) a passport of the Republic of Uzbekistan; and reach an English assessment level equivalent to TOEFL 72 / Duolingo 100 / IELTS 6.0 or higher. Ineligible: dual U.S. citizens and U.S. permanent residents; university teachers or academic researchers without management responsibilities; applicants who attended graduate school in the United States for one academic year or more during the previous seven years, who had more than six months of U.S. experience during the previous five years, or who participated in a U.S. government-sponsored exchange programme within the previous five years. The Embassy looks for leadership qualities, a record of public service and clear potential to benefit the applicant's institution and country on return.$req$,
  'https://uz.usembassy.gov/hubert-h-humphrey-fellowship-program/',
  'https://uz.usembassy.gov/hubert-h-humphrey-fellowship-program/',
  'https://apply.iie.org/huberthhumphrey',
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified first-hand on the official U.S. Embassy in Uzbekistan programme page fetched the same day: ten-month non-degree Fulbright fellowship; Uzbekistan eligibility (passport of the Republic of Uzbekistan); first degree plus at least five years of full-time professional experience and management/policy responsibilities; English threshold TOEFL 72 / Duolingo 100 / IELTS 6.0 equivalent (multi-test equivalence and scores not required at application, so min_ielts is NULL); six eligible fields for the Uzbekistan call; benefits (test costs, J-1 assistance, economy round-trip ticket, medical insurance, living expenses varying by city, tuition and fees at the host university, professional development allowance, pre-academic orientation); deadline 3 July 2026 for travel in late summer 2027 (passed, so deadline_date NULL/not_published). award_amount NULL (basis variable) and amount_usd_value 0: the Embassy publishes no single cash figure. degree_levels lists Master only as the nearest study level for discovery; the record title and description state explicitly that Humphrey is a non-degree programme.$note$,
  NULL,
  NULL, NULL, 'total', 'variable', NULL,
  'Full fellowship: host-university tuition and fees + living expenses + round-trip airfare + medical insurance + professional development allowance (amounts vary by host city)',
  $tc$Tuition and fees at the assigned U.S. host university are paid by the fellowship (non-degree graduate-level study).$tc$,
  'An English assessment equivalent to TOEFL 72 / Duolingo 100 / IELTS 6.0 or higher is required. IELTS/TOEFL scores are NOT required at the time of application - the Embassy instructs applicants to leave the language form blank and email any available scores; finalists and alternates register for TOEFL using Embassy-provided vouchers. min_ielts is NULL because the published threshold is a multi-test equivalence.',
  $json$["Online application at apply.iie.org/huberthhumphrey with all essay responses in English","Two letters of reference in English, one of them from the applicant's current employer","Official transcripts in English for the undergraduate (first) degree, plus diplomas for all other higher-education degrees"]$json$,
  'Annual call via the U.S. Embassy in Tashkent',
  'Annual call (most recent Uzbekistan deadline: 3 July 2026)',
  $json$[{"round":"2027-2028 fellowship year (Uzbekistan)","application_deadline":"2026-07-03","travel":"late summer 2027","status":"closed"}]$json$
) RETURNING id; -- 924

-- 1h) Government of Ireland International Education Scholarships - new id 925
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
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
  'Government of Ireland International Education Scholarships (GOI-IES)',
  'Government of Ireland (managed by the Higher Education Authority, HEA)',
  'Ireland', 'Full Tuition + Stipend', 0,
  $dl$Annual call managed by the Higher Education Authority. The 2026 call closed at 5pm (Irish time) on 12 March 2026 with outcomes in early June 2026. Check the HEA programme page for the next annual call.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master","PhD"]$json$,
  $json$["All disciplines (one year of full-time study at NFQ level 9 or 10 at an eligible Irish higher education institution, subject to availability of places)"]$json$,
  $json$["Domiciliary of origin outside the EU/EEA, Switzerland and the United Kingdom (Russian and Belarusian nationals are not eligible); students from Uzbekistan are eligible"]$json$, NULL, NULL,
  false, true,
  $desc$The Government of Ireland International Education Scholarship (GOI-IES) programme supports high-calibre international students for one year of full-time study in Ireland at NFQ levels 9 or 10 - a taught master's, a postgraduate diploma, a research master's or a PhD. Funded by the Government of Ireland in partnership with Irish higher education institutions and managed by the Higher Education Authority (HEA), it awards 60 scholarships each year across all disciplines, subject to the availability of places. Each scholarship consists of a stipend of EUR 10,000 for one year of full-time study, and the awardee's host institution is required to give a full fee waiver for the scholarship year. Applicants must already hold a conditional or final offer of admission from an eligible Irish higher education institution when they apply. Assessment looks for outstanding academic achievement, excellent communication skills, extracurricular participation (for example humanitarian work, politics, arts or sport) and a strong rationale linking study in Ireland to longer-term goals. The 2026 call closed on 12 March 2026; the programme runs annually.$desc$,
  $req$Have a domiciliary of origin outside the EU/EEA, Switzerland and the United Kingdom (Uzbekistan qualifies; Russian and Belarusian nationals are not eligible); hold a conditional or final offer of a place as an international, fee-paying student in a full-time, in-person programme at an eligible Irish higher education institution - a taught master's of at least one year, a postgraduate diploma at NFQ level 9 of at least one year, or a research master's or PhD of at least one year - with proof of admission submitted inside the GOI-IES application; and not have previously held a GOI-IES scholarship. Only one application per candidate may be submitted in a cycle, and two references must be uploaded through the application portal.$req$,
  'https://hea.ie/policy/internationalisation/goi-ies/',
  'https://hea.ie/policy/internationalisation/goi-ies/',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 6), verified first-hand on the official Higher Education Authority (hea.ie) programme page fetched the same day: 60 awards a year for one year of full-time NFQ level 9/10 study; stipend EUR 10,000 for one year plus a mandatory full fee waiver from the host institution for the scholarship year; eligibility is by domiciliary of origin outside the EU/EEA, Switzerland and the UK with Russian and Belarusian nationals excluded, so Uzbekistan-domiciled students are eligible; a conditional or final offer is required before applying; 2026 call deadline was 12 March 2026 (5pm Irish time) with outcomes in early June 2026, so deadline_date is NULL (not_published). award_amount stores the published stipend (10000 EUR, total for the one scholarship year, fixed); amount_usd_value is 0 (EUR award). degree_levels Master/PhD covers the NFQ 9/10 scope including the postgraduate-diploma route described in the text. No central GPA or IELTS cutoff; min_gpa/min_ielts NULL.$note$,
  NULL,
  10000, 'EUR', 'total', 'fixed', 10000,
  'EUR 10,000 stipend for one year + full fee waiver from the host institution for the scholarship year',
  $tc$Full fee waiver for the scholarship year, provided by the host Irish higher education institution (a condition of the award).$tc$,
  'English requirements are set by the admitting Irish institution for the chosen programme; GOI-IES publishes no central IELTS cutoff.',
  $json$["GOI-IES online application through the HEA portal (maximum one application per candidate per cycle)","Proof of a conditional or final offer of admission from an eligible Irish higher education institution, submitted in the relevant section of the application form","Two references uploaded by the applicant through the online portal"]$json$,
  'Annual call (the 2026 call opened in early 2026)',
  'Annual call (2026 deadline: 12 March 2026, 5pm Irish time)',
  $json$[{"round":"2026 call (2026/27 academic year)","application_deadline":"2026-03-12 17:00 Irish time","outcome":"early June 2026","status":"closed"}]$json$
) RETURNING id; -- 925

-- 2) Sources (single INSERT; RETURNING id, url gave 3053-3060 in URL order
--    shown) + links
INSERT INTO sources (url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
('https://www.rmit.edu.au/scholarships/research/vcps', $t$RMIT Vice Chancellor's PhD Scholarship (VCPS) - Official Programme Page$t$, 'www.rmit.edu.au', 'scholarship', now(), true, true, now()), -- 3053
('https://www.uts.edu.au/scholarship/uts-presidents-scholarship', $t$UTS President's Scholarship - Official Scholarship Page$t$, 'www.uts.edu.au', 'scholarship', now(), true, true, now()), -- 3054
('https://www.jds-scholarship.org/country/uzbekistan/index.html', 'JDS Uzbekistan - Official Application Page (JICA/JICE)', 'www.jds-scholarship.org', 'scholarship', now(), true, true, now()), -- 3055
('https://www.adb.org/work-with-us/careers/japan-scholarship-program', 'ADB-Japan Scholarship Program - Official ADB Page', 'www.adb.org', 'scholarship', now(), true, true, now()), -- 3056
('https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/', 'SI Scholarship for Global Professionals - Official Swedish Institute Page', 'si.se', 'scholarship', now(), true, true, now()), -- 3057
('https://www.koica.go.kr/ciat/7815/subview.do', 'KOICA CIAT Notice Board - Scholarship Programme Guidelines', 'www.koica.go.kr', 'scholarship', now(), true, true, now()), -- 3058
('https://uz.usembassy.gov/hubert-h-humphrey-fellowship-program/', 'Humphrey Fellowship Program - U.S. Embassy in Uzbekistan', 'uz.usembassy.gov', 'scholarship', now(), true, true, now()), -- 3059
('https://hea.ie/policy/internationalisation/goi-ies/', 'Government of Ireland International Education Scholarships - Higher Education Authority', 'hea.ie', 'scholarship', now(), true, true, now()) -- 3060
RETURNING id, url;

INSERT INTO scholarship_sources (scholarship_id, source_id, source_type, created_at) VALUES
(918, 3053, 'official', now()),
(919, 3054, 'official', now()),
(920, 3055, 'official', now()),
(921, 3056, 'official', now()),
(922, 3057, 'official', now()),
(923, 3058, 'official', now()),
(924, 3059, 'official', now()),
(925, 3060, 'official', now())
RETURNING scholarship_id, source_id;

-- 3) university_scholarships side-table rows for the two university awards
INSERT INTO university_scholarships (university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url, verification_status, last_verified_at, created_at) VALUES
(109, 918, $n$RMIT Vice Chancellor's PhD Scholarship (VCPS)$n$, 'available', 'Fully Funded', 'AUD 48299 year', true, true, 'Fully Funded', 'PhD only; ten awards per year. International recipients also receive the RRITFS tuition fee scholarship and OSHC for the visa duration. Awarded through the RMIT central research scholarship round (2027 commencement international EOI closed 30 August 2026, full applications 30 September 2026).', 'https://www.rmit.edu.au/scholarships/research/vcps', 'https://www.rmit.edu.au/scholarships/research/vcps', 'verified', now(), now()), -- us 672
(169, 919, $n$UTS President's Scholarship (UTSP)$n$, 'available', 'Merit-based', 'AUD 40500 year', false, true, 'Merit-based', 'International HDR (PhD / Master by Research) students commencing in UTS areas of research concentration. Living allowance AUD 40,500 p.a. from 1 January 2027 plus OSHC single cover; tuition is covered separately by the UTS International Research Scholarship, for which UTSP applicants are automatically considered on the same form. Most recent round: 7 September - 7 October 2026 (closed).', 'https://www.uts.edu.au/scholarship/uts-presidents-scholarship', 'https://www.uts.edu.au/scholarship/uts-presidents-scholarship', 'verified', now(), now()) -- us 673
RETURNING id, university_id, scholarship_id, max_scholarship;
