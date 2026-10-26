-- ScholarBridge AI - Scholarship Enrichment Batch 5 - 2026-10-26
-- Execution note (2026-10-26): the INSERTs below are the exact replay of the
-- statements executed in Supabase in this batch. New rows: scholarships 913
-- (Slovak National Scholarship Programme NSP) and 914 (Konrad-Adenauer-
-- Stiftung), sources 3045 and 3046, with scholarship_sources links.
-- See docs/SCHOLARSHIP_ENRICHMENT_BATCH_5_2026-10-26.md for the per-item
-- audit of the user's 11 named programmes (already present / added / rejected).

-- 1) Slovak National Scholarship Programme (NSP) - SAIA mobility, new id 913
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Slovak National Scholarship Programme NSP (Mobility, SAIA)',
  'Ministry of Education, Research, Development and Youth of the Slovak Republic (administered by SAIA)',
  'Slovakia', 'Living Stipend', 0,
  $dl$Current call (summer semester 2026/2027): online applications close 31 October 2026 at 16:00 CET; the original admission/invitation letter must reach SAIA in Bratislava by 12:00 on the 3rd working day after the deadline. Recurring deadlines: 30 April and 31 October each year.$dl$,
  '2026-10-31', 'fixed', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["All fields; a Slovak host institution must accept or invite the applicant"]$json$,
  $json$["All countries"]$json$, NULL, NULL,
  false, true,
  $desc$The National Scholarship Programme of the Slovak Republic (NSP), administered by SAIA and financed by the Slovak Ministry of Education, Research, Development and Youth, funds short mobility stays in Slovakia - not full degrees. Citizens of any country except Slovakia may apply, including from Uzbekistan. Eligible applicants are master's students (or students who have completed at least 2.5 years of university study) enrolled outside Slovakia for a study stay of one to two semesters (4-10 months), PhD students enrolled outside Slovakia for a study/research stay of 1-10 months, and university teachers, researchers and artists invited for a 1-10 month stay. The monthly scholarship covering living costs is EUR 620 for students, EUR 1,025.50 for PhD students, and EUR 1,025.50-1,470 for teachers/researchers/artists depending on experience; students and PhD students may also receive a lump-sum travel grant based on distance (bands from EUR 0 to EUR 1,500), and non-EU holders staying over 90 days are reimbursed up to EUR 250 for the medical certificate needed for temporary residence. Calls close twice a year, on 30 April and 31 October at 16:00 CET; the current call for the summer semester 2026/2027 closes 31 October 2026. This record covers NSP mobility only; the separate full-degree Slovak Government Scholarship is recorded elsewhere in this catalogue (id 900).$desc$,
  $req$Be a citizen of any country except Slovakia (Uzbekistan is eligible) and: for the student category, be enrolled at a university outside Slovakia as a master's student or have completed at least 2.5 years in the same/similar programme, and be accepted by a Slovak higher education institution for academic mobility; for the PhD category, be enrolled in a doctoral programme outside Slovakia and be accepted by a Slovak institution eligible to carry out doctoral studies; teachers/researchers/artists must be invited by an eligible Slovak institution (note the work-experience limits for applicants without a PhD). NSP does not support full-degree study in Slovakia, applicants who have spent 15 or more months in Slovakia within the last 36 months, or stays simultaneously funded by other public programmes (e.g. Erasmus+, CEEPUS, bilateral agreements). Apply online at scholarships.sk in Slovak or English by 30 April or 31 October, 16:00 CET; the original admission/invitation letter must reach SAIA in Bratislava by 12:00 on the third working day after the deadline.$req$,
  'https://www.scholarships.sk/en/main/programme-terms-and-conditions/foreign-applicants',
  'https://www.scholarships.sk/en/main/programme-terms-and-conditions/foreign-applicants',
  'https://www.scholarships.sk/',
  'annual', 'open', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 5), verified against SAIA's official programme pages fetched the same day: programme terms and conditions for foreign applicants (eligibility incl. 'citizens of any country in the world (except the citizens of Slovakia) can apply', monthly amounts EUR 620 students / EUR 1,025.50 PhD / EUR 1,025.50-1,470 teachers-researchers-artists, distance-band travel grant up to EUR 1,500, deadlines 30 April and 31 October 16:00 CET) and the live call for the summer semester 2026/2027 (online deadline 31 October 2026; student stays to start 1 February-1 April 2027 and finish by 31 August 2027). award_amount is NULL because the published monthly rate depends on applicant category (tiered-award convention used for KAAD/Boll records); all rates are stated in the description. amount_usd_value is 0 (EUR award). No central GPA or language-test cutoff is published; min_gpa/min_ielts are NULL. Distinct from the full-degree Slovak Government Scholarship at id 900.$note$,
  NULL, NULL, 'month', 'variable', NULL,
  'Monthly living stipend + lump-sum travel grant (mobility stays of 1-10 months; no full-degree funding)',
  $tc$The NSP scholarship is intended to cover living costs during the stay; it does not fund full-degree study in Slovakia. Any tuition arrangements for the mobility period depend on the home and host institutions - no NSP tuition benefit is published, so none is stored.$tc$,
  'No central language-test requirement is published; applications may be submitted in Slovak or English only, and the working language of the stay is agreed with the host institution in the admission/invitation letter.',
  $json$["Online application at scholarships.sk with the required attachments (Slovak or English only; other languages need official translations)","Admission/invitation letter from the Slovak host institution - scan in the online application and the original delivered to SAIA, Bratislava, by 12:00 on the 3rd working day after the deadline"]$json$,
  NULL, NULL,
  $json$[{"period":"Call for summer semester 2026/2027","deadline":"2026-10-31 (16:00 CET, online)","students_stay":"start 1 February - 1 April 2027, finish by 31 August 2027","phd_teachers_stay":"start by 31 August 2027, finish by 30 November 2027"},{"period":"Annual April call (stays during the next academic year)","deadline":"30 April, 16:00 CET"}]$json$
) RETURNING id; -- 913

-- 2) Konrad-Adenauer-Stiftung (KAS) - Germany, new id 914
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Konrad-Adenauer-Stiftung Scholarship for International Students (Germany)',
  'Konrad-Adenauer-Stiftung (KAS)',
  'Germany', 'Living Stipend', 0,
  $dl$Two routes: applicants already living in Germany apply in the domestic selection by 15 July each year, 12:00 CET, via the KAS Campus Portal (next deadline: 2027-07-15). Applicants in their home country can only apply through a local KAS foreign office in years when their region is selected - for 2026 only selected Latin American and East African countries participate, so applying from Uzbekistan is not possible in the current cycle.$dl$,
  '2027-07-15', 'fixed', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["All subjects except human medicine and dentistry (state examination); programmes shorter than four semesters (e.g. some LL.M.) are ineligible"]$json$,
  $json$["All non-EU countries"]$json$, NULL, NULL,
  false, true,
  $desc$The Konrad-Adenauer-Stiftung (KAS), the German CDU-affiliated political foundation, funds international students and doctoral candidates from non-EU countries for degree study or research stays of at least four semesters at German universities (including universities of applied sciences). Funding is a monthly stipend of up to EUR 992 for Bachelor's (from the third semester) and Master's students for a standard period of two years, and up to EUR 1,400 per month for doctoral candidates fully admitted to a German PhD programme for a standard period of three years. Additional allowances on request include a health-insurance subsidy up to EUR 120 per month, family allowance EUR 276, child allowance EUR 250 per child, research travel grants, and partial reimbursement of course-related tuition up to EUR 750 per semester in exceptional cases; enrolment and semester fees are not covered. German language proficiency of at least B2 is mandatory even for English-taught programmes, because the accompanying seminar programme is held in German. There are two application routes: applicants already living in Germany use the domestic selection procedure (deadline 15 July each year, 12:00 CET, via the KAS Campus Portal), while applicants in their home country apply through a local KAS foreign office - but only selected offices run regional selection in a given year. For 2026 the participating regions are parts of Latin America (Buenos Aires office: Argentina, Bolivia, Chile, Uruguay, Paraguay) and East Africa (Nairobi office: Kenya, Uganda/South Sudan, Tanzania, Ethiopia); Uzbekistan and Central Asia are not a 2026 focus region, so at the time of verification an applicant living in Uzbekistan cannot apply from home and would need to wait for a future regional call or apply via the in-Germany procedure.$desc$,
  $req$Above-average academic record; demonstrable commitment to democracy and human rights and to volunteering; identification with the values and political views of the Konrad-Adenauer-Stiftung. Mandatory: German at minimum B2 level (e.g. Goethe-Institut certificate) by the start of studies - most scholars present DSH or TestDaF for enrolment. Master's applicants must intend to enrol in a four-semester MA at a German university (a completed bachelor's is normally expected; final-year students may apply with transcripts and submit the certificate later, before starting the MA). Bachelor's funding requires at least two completed semesters at a German university. Doctoral applicants must be unconditionally admitted to a German PhD programme. The minimum funding period is four semesters; human medicine and dentistry (state examination) and three-semester programmes such as some LL.M.s are not funded; postdoctoral programmes are not funded; there is no age limit; the scholarship cannot bridge or top up another grant for the same study stage. Route for Uzbek applicants: if already living in Germany, apply by 15 July (12:00 CET) via the KAS Campus Portal; from Uzbekistan, application is only possible in years when the responsible KAS foreign office takes part in the regional selection - which is not the case in 2026.$req$,
  'https://www.kas.de/en/web/begabtenfoerderung-und-kultur/international-talent-development',
  'https://www.kas.de/en/web/begabtenfoerderung-und-kultur/international-talent-development',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 5), verified against the official KAS International Talent Development page fetched the same day (mandatory B2 German, four-semester MA condition, stipends up to EUR 992/month for BA/MA over a standard two years and EUR 1,400/month for PhD over a standard three years, health-insurance/family/research-travel allowances, and FAQ on the two application routes). This resolves the item deferred in enrichment batch 3 pending a final read: the home-country route exists but depends on annually selected focus regions, and for 2026 only the Buenos Aires and Nairobi offices run regional selection (Argentina, Bolivia, Chile, Uruguay, Paraguay; Kenya, Uganda/South Sudan, Tanzania, Ethiopia), so Uzbekistan is not currently reachable from home. deadline_date therefore stores the next domestic-procedure deadline (2027-07-15) and the restriction is stated prominently in the deadline, description and requirements so the record is not read as currently open from Uzbekistan. award_amount is NULL because the published monthly rate depends on study level (tiered-award convention used for the KAAD/Boll records); amount_usd_value is 0 (EUR award). No numeric GPA cutoff is published (above-average grades required); min_gpa is NULL. The programme's mandatory German B2 requirement is recorded in english_requirements. application_url is NULL because the Campus Portal link was not separately verified; the official programme page is stored as website_url/source_url.$note$,
  NULL, NULL, 'month', 'variable', NULL,
  'Monthly stipend + allowances (health insurance, family, research travel)',
  $tc$KAS does not pay tuition, enrolment, re-registration, semester-ticket or student-services fees; in exceptional cases course-related university fees may be partially reimbursed up to EUR 750 per semester. German public universities generally charge no tuition (except e.g. in Baden-Wurttemberg), so the core funding is the living-cost stipend.$tc$,
  'German language proficiency of at least B2 (CEFR) is a mandatory condition of the scholarship (e.g. Goethe-Institut certificate; DSH/TestDaF typically required for degree enrolment) - this applies even if the chosen degree programme is taught in English, because the KAS seminar and mentoring programme is held in German.',
  $json$["Application via the KAS Campus Portal (domestic procedure) or the responsible KAS foreign office (regional selection years), with the documents specified in the official German application notes (Hinweise zur Bewerbung) and guidelines checklist","Academic transcripts and certificates (final-year students may submit the degree certificate later)","Proof of German language proficiency (minimum B2)","Letters of recommendation in German or English (or original with German translation); doctoral applicants also submit a dissertation proposal, preferably in German"]$json$,
  NULL, NULL,
  $json$[{"route":"Applicants already living in Germany (domestic selection)","channel":"KAS Campus Portal","deadline":"15 July annually, 12:00 CET","next_deadline":"2027-07-15"},{"route":"Applicants in their home country (regional selection via KAS foreign offices)","2026_focus":"Buenos Aires office: Argentina, Bolivia, Chile, Uruguay, Paraguay; Nairobi office: Kenya, Uganda/South Sudan, Tanzania, Ethiopia. Uzbekistan/Central Asia is not a 2026 focus region."}]$json$
) RETURNING id; -- 914

-- 3) Sources + links
INSERT INTO sources (url, title, domain, source_type, accessed_at, is_official, is_verified, created_at)
VALUES ('https://www.scholarships.sk/en/main/programme-terms-and-conditions/foreign-applicants',
 'National Scholarship Programme of the Slovak Republic (SAIA) - Official Terms for International Applicants',
 'www.scholarships.sk', 'scholarship', now(), true, true, now()) RETURNING id; -- 3045

INSERT INTO sources (url, title, domain, source_type, accessed_at, is_official, is_verified, created_at)
VALUES ('https://www.kas.de/en/web/begabtenfoerderung-und-kultur/international-talent-development',
 'Konrad-Adenauer-Stiftung - Official International Scholarship Programme Page',
 'www.kas.de', 'scholarship', now(), true, true, now()) RETURNING id; -- 3046

INSERT INTO scholarship_sources (scholarship_id, source_id, source_type, created_at)
VALUES (913, 3045, 'official', now()), (914, 3046, 'official', now());
