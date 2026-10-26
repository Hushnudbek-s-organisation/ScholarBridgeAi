-- ============================================================================
-- Scholarship enrichment — batch 2 (2026-10-23)
--
-- 1 update + 2 new awards, each read off its own provider page.
-- Every block is written individually: no shared template text, no copied
-- paragraph between rows. Applied to the live database the same day.
-- ============================================================================

-- 1. Imperial College President's PhD Scholarship (id 22) ---------------------
-- The stored website_url returned a 404. The live page is under
-- /study/fees-and-funding/postgraduate-doctoral/grants-scholarships/.
UPDATE scholarships SET
  website_url = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  source_url  = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  deadline = '2 November 2026 (round 1) / 11 January 2027 (round 2)',
  deadline_date = '2026-11-02',
  deadline_type = 'fixed',
  description = 'Imperial College London President''s PhD Scholarships: about 50 awards a year for high-performing graduates who want to design their own research project at Imperial. Each award runs for three and a half years and covers tuition fees in full, a stipend of GBP 27,036 at the 2027-28 rate, a GBP 2,000 a year consumables fund for the first three years, and a bespoke programme of events run by the Early Career Researcher Institute.',
  requirements = 'A high-performing undergraduate or Master''s student with an excellent academic record and promising research potential. Open to candidates from Imperial, the UK and worldwide with no nationality restriction, although some departments may not be able to support international candidates. Only NEW PhD applications are considered - students already registered on an Imperial PhD are not eligible. There is no separate scholarship form: you apply for a PhD place through Imperial''s admissions system and tick the President''s PhD Scholarship option in the funding section of the additional questions tab; your department then nominates on merit.',
  required_documents = '["Imperial PhD application via My Imperial","2-page personal statement in the required structure","Academic transcripts and degree certificates","Two academic references","CV"]',
  amount_usd_value = 0,
  award_amount = 27036,
  award_currency = 'GBP',
  award_period = 'year',
  award_basis = 'fixed',
  funding_type = 'Fully funded',
  tuition_coverage = 'Full tuition',
  application_status = 'open',
  notes = 'Verified 2026-10-23. The website_url on this row returned a 404 and now points at the live President''s PhD page. Stipend GBP 27,036 (2027-28 rate), GBP 2,000 consumables for three years, 3.5-year award and 50 places read from that page. Round dates 2 November 2026 and 11 January 2027 follow from its notification schedule; a third round on 1 March 2027 is reported only by third parties, so it is mentioned here but not stored as the deadline.',
  last_verified_at = '2026-10-23',
  last_updated_at = '2026-10-23'
WHERE id = 22;

-- 2. Rotary Peace Fellowship (new, id 896) ------------------------------------
-- rotary.org + my.rotary.org: up to 50 master's and up to 120 certificate
-- fellowships; 2028-29 applications open February 2027 and close 15 May 2027.
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds,
  english_requirements, required_documents
) VALUES (
  'Rotary Peace Fellowship (Master''s)', 'The Rotary Foundation (Rotary International)',
  'Multiple countries', 'Full Tuition + Stipend', 0,
  '15 May 2027 (2028-29 cycle opens February 2027; 2027-28 closed)', '2027-05-15', 'fixed',
  '["Master"]',
  '["Peace and conflict studies","International relations","Development studies","Public policy"]',
  '["All"]', NULL, NULL,
  'Fellowship for experienced peace and development practitioners to take a fully funded master''s degree at one of Rotary''s peace centres. The master''s runs 15 to 24 months and includes a two- to three-month field study that the fellow designs. Each year The Rotary Foundation awards up to 50 master''s fellowships and up to 120 professional development certificate fellowships; the fellowship covers tuition and fees, room and board, round-trip transportation, and internship and field-study expenses.',
  'A bachelor''s degree and at least three years of full-time, relevant experience in peace or development work; at least a three-year gap between the completion of your most recent degree and the fellowship start date (candidates currently enrolled, or enrolling in the coming academic year, are not eligible); English proficiency, with a test score required for the master''s track; demonstrated leadership and commitment to peacebuilding. Active Rotary members and employees of Rotary clubs or Rotary International are not eligible, but Rotaract members who are not also Rotary members may apply. Apply online between 1 February and 15 May, secure a Rotary club or district endorsement, and rank two preferred peace centres.',
  'https://www.rotary.org/en/our-programs/peace-fellowships',
  'https://www.rotary.org/en/our-programs/peace-fellowships',
  'https://my.rotary.org/en/peace-fellowship-application',
  'annual', 'upcoming', 'verified', 10, true, '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on rotary.org and my.rotary.org: the 2027-28 application is closed and the 2028-29 application opens online in February 2027, with submissions due by 15 May each year. Up to 50 master''s and up to 120 certificate fellowships, the 15-24 month master''s with a 2-3 month field study, and the document list are quoted from those pages. No cash value is published, so amount_usd_value is 0.',
  NULL, 'year', 'full_tuition', 'Fully funded', 'Full tuition',
  'February 2027', 'May 2027', '["Online application","District endorsement","Final selection"]',
  'English proficiency is required; a test score (IELTS or TOEFL) is required for the master''s track',
  '["Resume","Academic and/or professional recommendations","Personal statement video and essays","Transcripts (master''s track)","English language test scores (master''s track)"]'
);

-- 3. KAAD Eastern Europe Programme (new, id 897) ------------------------------
-- kaad.de/en/stipendien/osteuropaprogramm + the DAAD database entry for the
-- same programme (deadlines 15 January / 30 June).
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds,
  english_requirements, required_documents
) VALUES (
  'KAAD Eastern Europe Programme Scholarship (Germany)',
  'KAAD - Catholic Academic Exchange Service (Katholischer Akademischer Ausländer-Dienst)',
  'Germany', 'Stipend', 0,
  '15 January 2027 (March award) or 30 June 2027 (September award)', '2027-01-15', 'fixed',
  '["Master","PhD"]', '["All Majors"]',
  '["Uzbekistan","Kazakhstan","Kyrgyzstan","Tajikistan","Turkmenistan","Azerbaijan","Georgia","Armenia"]',
  NULL, NULL,
  'KAAD is the scholarship organisation of the Catholic Church in Germany. Its Eastern Europe Programme supports postgraduates from Central, Eastern and South-East Europe, the Caucasus and Central Asia: a master''s degree at a German university (up to 24 months), a PhD in Germany (up to 36 months), or a research stay in Germany of up to 12 months for people doing a doctorate or habilitation at home. Funding includes a monthly stipend, and the programme adds compulsory seminars, language courses and a mentor network rather than only money.',
  'You come from and currently live in Central, Eastern or South-East Europe, the Caucasus or Central Asia (Uzbekistan is covered by the Central Asia strand). A first degree and, for the master''s track, an excellent bachelor''s record; German at level B1, or A2 for English-taught programmes, because the educational programme is run in German; Catholic denomination (other Christian denominations are accepted, especially from the Near and Middle East); social and church engagement and a willingness to join inter-religious dialogue; and a clear intention to return home - otherwise the funding is treated as a loan. Applications run in two stages: an initial enquiry can be submitted at any time through the regional partner committee, and the complete documents are due by 15 January or 30 June.',
  'https://www.kaad.de/en/stipendien/osteuropaprogramm',
  'https://www.kaad.de/en/stipendien/osteuropaprogramm',
  'https://www.kaad.de/en/stipendien/osteuropaprogramm',
  'annual', 'upcoming', 'verified', 10, true, '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on kaad.de (Eastern Europe Programme) and the DAAD scholarship database entry for the same programme. Region list, the B1 German requirement (A2 for English-taught courses), the Catholic-denomination condition, the return-home condition and the two-stage deadlines (15 January for the March award, 30 June for the September award) are quoted from those two official pages. The monthly stipend amount is not printed on either page, so amount_usd_value is 0 and award_amount stays NULL.',
  NULL, 'month', 'variable', 'Stipend only', 'None',
  'January 2027', 'January / June 2027', '["Initial enquiry","Full documents","Selection committee"]',
  'German at least B1 (A2 for English-taught programmes)',
  '["KAAD online application","Motivation letter","CV","Degree certificates and transcripts","Letter of recommendation from the partner committee"]'
);
