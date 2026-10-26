-- Scholarship Enrichment Batch 8 — replay SQL (2026-10-26)
-- Adds scholarships 933-935 and sources 3068-3070 with scholarship_sources links.
-- See docs/SCHOLARSHIP_ENRICHMENT_BATCH_8_2026-10-26.md for the audit trail.
-- All content verified first-hand on official programme pages/documents fetched 2026-10-26.
-- NOTE on id mapping: the three inserts were executed in parallel and results
-- came back in completion order; each INSERT ... RETURNING id, title fixed the
-- true mapping (933 = AMEXCID, 934 = TIPP, 935 = World in Serbia), which was
-- re-verified by SELECT before the sources/links below were created.
-- Taiwan ICDF and MOFA were audited and REJECTED (Uzbekistan not eligible /
-- eligibility not confirmed on official sources); no rows for them here.

-- ---------------------------------------------------------------------------
-- 933: Mexican Government Excellence Scholarships for Foreigners (AMEXCID)
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
  933,
  'Mexican Government Excellence Scholarships for Foreigners (AMEXCID)',
  'Mexican Agency for International Development Cooperation (AMEXCID), Ministry of Foreign Affairs (SRE)',
  'Mexico', 'Monthly Stipend + Tuition Support', 0,
  $dl$Annual call; applications are registered in Spanish through the SIGCA system (sigca.sre.gob.mx). The 2026 call registered applications from 21 May to 22 June 2026 and has closed (results 6-10 July 2026; scholarships began between August and 10 November 2026, for a minimum of 6 months).$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["Programmes at the roughly 90 Mexican higher education institutions listed in Annex 1 of the annual call. Modalities: undergraduate mobility/exchange (up to 12 months), master's mobility (up to 12 months), full master's degree (up to 24 months), and doctoral or postdoctoral research stays (6-12 months). The Bachelor's and PhD-level entries are mobility/research stays, not full degrees."]$json$,
  $json$["Uzbekistan - listed in Annex 5 (Eligible Countries) of the official 2026 call, Asia section"]$json$, NULL, NULL,
  false, true,
  $desc$The Mexican Government Excellence Scholarships for Foreigners (Becas de Excelencia del Gobierno de México para Extranjeros) are the flagship academic-cooperation scholarships of Mexico's Ministry of Foreign Affairs (SRE), administered by AMEXCID and offered to more than 170 countries, including Uzbekistan (Annex 5 of the 2026 call). About 90 Mexican higher education institutions with programmes registered in the National Postgraduate System take part (Annex 1). Funded modalities: undergraduate mobility (up to 12 months), master's mobility (up to 12 months), a full master's degree (up to 24 months), and doctoral or postdoctoral research stays (6-12 months) - all full-time and in person. Benefits: a monthly stipend of four times the monthly UMA value for mobility and master's-degree scholars (MXN 14,264.88 at the 2026 call) and five times UMA for doctoral/postdoctoral research fellows (MXN 17,831.10 in 2026); enrollment and tuition fees in accordance with each institution's programme and its final decision as stated in the acceptance letter; IMSS health insurance from the seventh month; exemption from Mexican visa issuance fees; and, where Annex 4 applies, domestic transport between Mexico City and the host city. International airfare on successful completion is paid only for countries in Annex 3 of the call - Uzbekistan is not on the 2026 Annex 3 list, so Uzbek recipients arrange and fund their own international flights. Applications are made only through SIGCA, in Spanish, with a prior acceptance letter from a Mexican host institution.$desc$,
  $req$Be a national of an Annex 5 eligible country (Uzbekistan is listed), aged 18 or over at application, applying under the nationality to be accredited and residing in the country of nationality. Obtain an acceptance letter from a Mexican host institution in Annex 1, issued within 60 calendar days, stating a grade-point average of at least 85 (0-100 scale) or 8.5 (scale of 10) in Mexican-equivalent terms and the programme dates (mobility and master's-degree modalities). If your native language is not Spanish, present a Spanish certificate at CEFR level B2 or higher; for programmes conducted in another language, the host institution must instead commit in writing to tutoring/mentoring in that language. Master's applicants: copy of the Bachelor's degree and transcript showing the minimum average. Research stays: copy of the doctoral degree, host-institution acceptance naming the supervisor and the research project, a nomination letter from an academic or government institution of your country, and the research project letter (Form 3). Ineligible: foreign diplomats accredited in Mexico and their immediate family, holders of Mexican nationality (including children of Mexican parents), current or immediately-previous-year holders of Mexican federal-government scholarships, and former AMEXCID scholars who did not complete successfully.$req$,
  'https://www.gob.mx/amexcid/acciones-y-programas/becas-para-extranjeros-29785',
  'https://www.gob.mx/amexcid/acciones-y-programas/becas-para-extranjeros-29785',
  'https://sigca.sre.gob.mx',
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 8), verified first-hand on the official gob.mx/amexcid 2026 call page and its attached PDFs (the English convocatoria, Annex 5 Eligible Countries and Annex 3 International Air Transport) fetched the same day: Annex 5 lists "REPÚBLICA DE UZBEKISTÁN" in the Asia section, while Uzbekistan does NOT appear in Annex 3, so the completion airfare is recorded as not applying to Uzbek recipients in 2026. Stipends are UMA-based and differ by modality (4x UMA = MXN 14,264.88/month; 5x UMA = MXN 17,831.10/month for research stays), so award_amount is NULL (variable) and amount_usd_value is 0 (MXN award). deadline_date NULL (not_published): the 2026 SIGCA registration window (21 May - 22 June 2026) has passed. min_gpa NULL (the 85/100 or 8.5/10 minimum is a Mexican-equivalent threshold certified through the host acceptance letter for mobility/master's modalities only); min_ielts NULL (the language requirement is Spanish CEFR B2 or a host-tutoring commitment). The catalogue's existing Mexico rows (UNAM, Tecnológico de Monterrey) are university awards and are unaffected.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  $ft$Monthly stipend of 4x UMA (MXN 14,264.88 in 2026) for undergraduate/master's mobility and master's degrees, or 5x UMA (MXN 17,831.10 in 2026) for doctoral/postdoctoral research stays + enrollment/tuition per host institution + IMSS health insurance from month 7 + visa fee exemption (international airfare only for Annex 3 countries - Uzbekistan not listed in 2026)$ft$,
  $tc$Enrollment and tuition fees are granted in accordance with each Mexican educational institution's programme (Annex 1) and are subject to the final decision of each institution, as stated in the acceptance letter issued to each applicant - not a blanket tuition waiver.$tc$,
  $er$Applications must be submitted in Spanish. Applicants whose native language is not Spanish must present a Spanish certificate at CEFR B2 level or higher; for programmes taught in another language the host institution must instead commit in writing to tutoring/mentoring in that language. AMEXCID sets no IELTS cutoff.$er$,
  $json$["SIGCA online application (sigca.sre.gob.mx) in Spanish; documents in color PDF (max 1.8 MB), with a simple signed Spanish translation for documents in other languages","Acceptance letter from an Annex 1 Mexican host institution issued within 60 days, certifying a GPA of at least 85/100 (8.5/10) and the study/research period with dates","Copy of valid passport; signed declaration letter (Form 1); signed curriculum vitae (Form 2, maximum 4 pages); medical certificate issued within 3 months","Spanish CEFR B2 or higher certificate if the applicant's native language is not Spanish","For master's: copy of Bachelor's degree and transcript of the most recent semester showing the minimum average. For research stays: copy of doctoral degree, supervisor acceptance letter, nomination letter and research project letter (Form 3)"]$json$,
  'Annual call (2026: published 21 May 2026)',
  'Annual call (2026: SIGCA registration closed 22 June 2026, 3:00 p.m. Central Mexico Time)',
  $json$[{"round":"2026","call_published":"21 May 2026","registration":"21 May - 22 June 2026 (SIGCA)","results":"6-10 July 2026","scholarship_start":"August - 10 November 2026 (minimum duration 6 months)","status":"closed"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3068, 'https://www.gob.mx/amexcid/acciones-y-programas/becas-para-extranjeros-29785', 'Becas de Excelencia del Gobierno de México para Extranjeros 2026 (AMEXCID) - Gobierno de México', 'www.gob.mx', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 934: Thailand International Postgraduate Programme (TIPP)
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
  934,
  $t$Thailand International Postgraduate Programme (TIPP) - Full-Support Master's Scholarships$t$,
  'Thailand International Cooperation Agency (TICA), Ministry of Foreign Affairs of Thailand',
  'Thailand', 'Full Funding', 0,
  $dl$Annual programme filled by government nomination: candidates are nominated by their country's National Focal Point and documents go through the Royal Thai Embassy/Consulate to TICA. For the 2026 round, application documents had to be submitted to the Royal Thai Embassy by 23 February 2026; the round has closed.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master"]$json$,
  $json$["Master's courses offered under TIPP at Thai universities in TICA's thematic areas (Sufficiency Economy Philosophy for SDGs, public health, agriculture and food security, health and wellness, climate resilience, trade and economy, inclusive development, and science, technology and innovation for development); TICA publishes the course list for each annual round"]$json$,
  $json$["Uzbekistan - listed under Central Asia in the official 2026 list of countries eligible for the TIPP full-support scholarship"]$json$, NULL, NULL,
  false, true,
  $desc$The Thailand International Postgraduate Programme (TIPP) is the Royal Thai Government's postgraduate scholarship framework, administered by the Thailand International Cooperation Agency (TICA) of the Ministry of Foreign Affairs since 1999 (first courses in 2000), for nationals of developing partner countries to complete Master's degrees at Thai universities. Uzbekistan appears in TICA's official 2026 list of countries eligible for the FULL-SUPPORT scholarship (Central Asia section), under which the Royal Thai Government bears: tuition fees (reimbursed directly by TICA, excluding equipment insurance, transcript and certificate fees); a living allowance of THB 7,000 per month; an accommodation allowance of THB 7,000 or 9,000 per month; a settlement allowance of THB 6,000 on first arrival; a books allowance of THB 10,000 per year (four semesters for a Master's); a thesis allowance of up to THB 20,000 for approved fieldwork/data collection plus THB 12,000 for thesis printing (THB 8,000 for an independent study); accident and hospitalization insurance; and - for full-support countries - a round-trip economy air ticket between the home country and Bangkok and the Thai visa fee (domestic travel inside the home country and the accommodation rental deposit are not covered; TICA advises bringing about USD 300 for the deposit). Each eligible country may nominate up to three candidates per academic programme. Awardees must study full-time, may not take part-time employment, and may not bring family members to stay during the scholarship.$desc$,
  $req$Be nominated by the National Focal Point for International Development Cooperation of a TIPP-eligible country (for Uzbekistan, the full-support list applies), or by the relevant central government agency where you work; candidates working in the government sector or in an area related to the chosen course are preferred. Hold a Bachelor's degree and/or professional experience related to the graduate field. Be not more than 45 years of age, in good physical and mental condition, and not pregnant. Have a good command of English; if your first language is not English and your Bachelor's degree was not instructed in English, pass an English proficiency test (e.g. TOEFL/IELTS, not more than two years old) as required by the host institution. Submit the endorsed application set (one original with two copies, all documents in English) through the Royal Thai Embassy/Consulate accredited to your country by the round deadline.$req$,
  'https://tica-thaigov.mfa.go.th/en/page/long-term-scholarships',
  'https://tica-thaigov.mfa.go.th/en/page/long-term-scholarships',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 8), verified first-hand on official TICA/MFA Thailand documents fetched the same day: the "List of Countries/Territories eligible for full-support scholarship under TIPP and AITC Programme Year 2026" (eligible-countries page updated 5 January 2026) names Uzbekistan under Central Asia, with the full-support package defined as tuition/training fees, round-trip economy airfare (excluding domestic flights in the home country), Thai visa fees, living and accommodation allowance and insurance; the TIPP 2026 Guidelines (revised PDF, Guidelines_for_TIPP_2026_2) give the components (living THB 7,000/month; accommodation THB 7,000 or 9,000/month; settlement THB 6,000; books THB 10,000/year; thesis up to THB 20,000 + THB 12,000/8,000 printing), the nomination route, the up-to-3 nominees per programme, the age limit of 45 and the 23 February 2026 embassy-submission deadline. award_amount is NULL (multi-component package with two accommodation rates) and amount_usd_value is 0 (THB award). deadline_date NULL (not_published): the 2026 round has closed and the next round is not yet published. min_gpa/min_ielts NULL (no central cutoffs; English tests are set by the host institutions). Thailand applications route via the Royal Thai Embassy accredited to Uzbekistan.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  $ft$Full-support package: tuition reimbursed by TICA + THB 7,000/month living allowance + THB 7,000-9,000/month accommodation allowance + THB 6,000 settlement allowance + THB 10,000/year books allowance + thesis allowances + round-trip economy airfare and Thai visa fee (full-support list, incl. Uzbekistan) + insurance$ft$,
  $tc$Tuition fees are reimbursed directly by TICA for the approved Master's programme, excluding equipment insurance fees and transcript/certificate fees.$tc$,
  $er$Good command of English. Candidates whose first language is not English and whose Bachelor's degree was not taught in English must pass an English proficiency test (e.g. TOEFL or IELTS, not more than 2 years old) according to the host institution's criteria; TICA sets no single IELTS cutoff.$er$,
  $json$["TICA online application form for the annual TIPP round, plus the TIPP application form (1 original and 2 copies) endorsed by the candidate's supervisor and the National Focal Point, submitted through the Royal Thai Embassy/Consulate","TICA medical report form (other health certificates are not accepted)","Bachelor's degree certificate and transcript","Three recommendation letters (one per person)","English test score (TOEFL/IELTS) as required by the academic institution, not more than 2 years old; all documents in English"]$json$,
  'Annual round (filled by National Focal Point nomination)',
  'Annual round (2026: documents to the Royal Thai Embassy by 23 February 2026)',
  $json$[{"round":"2026","submission_deadline":"23 February 2026 (to the Royal Thai Embassy/Consulate)","nomination_cap":"up to 3 candidates per academic programme per country","status":"closed"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3069, 'https://tica-thaigov.mfa.go.th/en/page/long-term-scholarships', 'Long-term Scholarships - TIPP (Thailand International Postgraduate Programme) - Thailand International Cooperation Agency (TICA)', 'tica-thaigov.mfa.go.th', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 935: World in Serbia (Svet u Srbiji)
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
  935,
  'World in Serbia (Svet u Srbiji) - Government of Serbia Scholarship',
  'Ministry of Education of the Republic of Serbia (with the Ministry of Foreign Affairs)',
  'Serbia', 'Full Funding', 0,
  $dl$Annual competition. The 2026 call (for Serbian-language study in 2026/2027 and degree enrolment in 2027/2028) ran from 18 May to 1 June 2026 through Serbian diplomatic-consular missions and has closed; the Ministry of Education announces the competition each year.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["All fields offered by state-founded higher education institutions of the Republic of Serbia (the ministry publishes the institution list with each call; degree instruction is mainly in Serbian after a free intensive language course)"]$json$,
  $json$["Uzbekistan - a member state of the Non-Aligned Movement (the project covers 127 NAM member and observer states of Africa, Asia, Central and South America)"]$json$, NULL, NULL,
  false, true,
  $desc$The "World in Serbia" (Svet u Srbiji) project is an initiative of national importance of the Government of the Republic of Serbia, running since the 2010/2011 academic year, through which Serbia awards government scholarships to candidates from 127 member and observer states of the Non-Aligned Movement in Africa, Asia, Central and South America. Uzbekistan is a member state of the Non-Aligned Movement, so its citizens are covered. The scholarship finances one level of studies at state-founded Serbian higher education institutions and includes: a free intensive Serbian language course on arrival (before the degree, unless the recipient has already studied Serbian in Serbia); free tuition within one study level (undergraduate academic/integrated/vocational, specialist vocational or academic, master academic/vocational, or doctoral studies); a monthly stipend of RSD 18,000; free accommodation and meals in student-standard institutions founded by the Republic of Serbia or AP Vojvodina; health insurance (mandatory for recipients under 26, voluntary for those over 26, who are advised to arrange their own policy); and free recognition of secondary-school and higher-education diplomas. It does not cover travel to and from Serbia, city transport, textbooks, exam-registration and administrative fees, or residence-permit fees. The Ministry of Education runs an annual competition in cooperation with the Ministry of Foreign Affairs: candidates are proposed by the competent authority of their participating state, complete the ministry's online form, email scanned documents to worldinserbia@prosveta.gov.rs, and submit certified copies with the signed form through a Serbian diplomatic-consular mission.$desc$,
  $req$Be a citizen of a member or observer state of the Non-Aligned Movement (Uzbekistan is a NAM member state) and be proposed by the competent authority of the participating state. Age limits: under 21 for first-level studies (undergraduate academic/integrated/vocational), under 25 for first-level specialist vocational and second-level studies (master academic/vocational, specialist academic), and under 35 for doctoral studies. Education: four-year secondary education for undergraduate entry; for master's entry, a Bachelor's diploma with at least 180 ECTS (120-ECTS master) or 240 ECTS/four years (60-ECTS master); for doctoral entry, completed undergraduate plus master studies (at least 300 ECTS / five years) with an overall average grade of at least 8.5. Knowledge of English or Serbian at a minimum A1 level on arrival is required.$req$,
  'https://prosveta.gov.rs/skolski-i-studentski-zivot/stipendije/stipendije-srbije-stranim-studentima/stipendije-svet-u-srbiji/',
  'https://prosveta.gov.rs/skolski-i-studentski-zivot/stipendije/stipendije-srbije-stranim-studentima/stipendije-svet-u-srbiji/',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 8), verified first-hand on the official Ministry of Education programme page and the official 2026 competition announcement (prosveta.gov.rs) fetched the same day: 127 NAM member/observer states; package of free tuition for one study level, RSD 18,000/month, free dormitory accommodation and meals, free intensive Serbian course, health insurance and free diploma recognition; travel and admin fees excluded; age limits 21/25/35 and the doctoral 8.5 average-grade threshold as recorded. Uzbekistan's eligibility was confirmed on the official NAM Chair website (nam.go.ug), which lists Uzbekistan as a NAM member state (Asia-Pacific). award_amount stores the published monthly stipend (RSD 18,000), so amount_usd_value is 0 (non-USD award). deadline_date NULL (not_published): the 2026 competition window (18 May - 1 June 2026 at Serbian diplomatic-consular missions) has passed and the next annual call is not yet published. min_gpa NULL (the 8.5/10 average applies to doctoral applicants only and is kept in the text); min_ielts NULL (A1 in English or Serbian are alternatives).$note$,
  NULL,
  18000, 'RSD', 'month', 'fixed', 18000,
  $ft$Full funding: free tuition for one study level + RSD 18,000/month stipend + free dormitory accommodation and meals + free intensive Serbian course + health insurance + free diploma recognition (international travel not covered)$ft$,
  $tc$Free tuition within one level of studies (undergraduate academic/integrated/vocational, specialist vocational/academic, master academic/vocational, or doctoral studies) at higher education institutions founded by the Republic of Serbia.$tc$,
  $er$English or Serbian at a minimum A1 level on arrival (a certificate or confirmation is required); a free intensive Serbian language course follows arrival, as degree instruction is mainly in Serbian.$er$,
  $json$["Online application form published with the annual call on the ministry website, plus the signed application form and certified copies submitted through a Serbian diplomatic-consular mission / the competent authority of the participating state","Scanned originals with certified Serbian or English translations, emailed to worldinserbia@prosveta.gov.rs (surname, first name and country in the subject): CV with motivation letter; education certificates/diplomas and transcripts; average-grade confirmation for doctoral applicants","Photocopy of passport (the ministry asks for a passport valid at least 6 years from the moment of the visa application)","Proof of English or Serbian knowledge at conversational (A1) level","Medical documentation on the prescribed form, including immunization/vaccination records"]$json$,
  'Annual competition (the 2026 call was published on 18 May 2026)',
  'Annual competition (2026: 1 June 2026 at Serbian diplomatic-consular missions)',
  $json$[{"round":"2026/2027 Serbian language year, then 2027/2028 degree enrolment","call_published":"18 May 2026","deadline":"1 June 2026 (Serbian diplomatic-consular missions)","status":"closed"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3070, 'https://prosveta.gov.rs/skolski-i-studentski-zivot/stipendije/stipendije-srbije-stranim-studentima/stipendije-svet-u-srbiji/', $t$Stipendije "Svet u Srbiji" (World in Serbia) - Ministry of Education of the Republic of Serbia$t$, 'prosveta.gov.rs', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- Links + sequence guards
-- ---------------------------------------------------------------------------
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES
(933,3068),(934,3069),(935,3070);

SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships));
SELECT setval('sources_id_seq', (SELECT MAX(id) FROM sources));
