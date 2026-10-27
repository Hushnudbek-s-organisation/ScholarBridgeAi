-- Scholarship rewrite pass 15 — 2026-10-23
-- The Türkiye cluster: three rows that mixed a university's own merit award with the
-- national Türkiye Bursları programme. All figures below were read on the university's
-- own pages (see source_url); the dollar values are the published tuition multiplied by
-- the published top waiver percentage, and `notes` says so.
--
-- Rows: 823 Koç, 826 Sabancı, 799 Bilkent
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 823 — Koç University
-- Was: "Koç University International Merit Scholarship & Türkiye Bursları",
--      unsupported USD figure, three degree levels.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Koç University International Undergraduate Merit Scholarship',
  provider = 'Koç University',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 38000,
  award_amount = 38000,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = 'Full or partial tuition: 25%, 50%, 75% or 100% of the annual fee for the whole duration of the programme; housing, living costs and books are not included',
  deadline = 'No separate scholarship deadline - the award arrives with the admission offer; the Fall 2027 calendar is not published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Koç publishes each fall intake on its How to Apply page. For Fall 2026 the early round ran 1 January - 1 March 2026, the regular round 2 March - 31 May 2026 and the late round 1 June - 15 July 2026, extended to 5 August 2026; the School of Medicine took applications from 15 April to 31 May 2026.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Koç University evaluates every new international undergraduate applicant for a tuition scholarship without being asked: there is no scholarship form, no separate deadline and no condition that the family be poor, because the decision is made on academic merit alone by the Admissions Committee. Awards are 25%, 50%, 75% or 100% of tuition and run for the whole duration of the programme, with no specific GPA needed to keep them - the normal academic and discipline rules apply. The scholarship pays tuition and nothing else: no dormitory, no monthly stipend, no books. Annual tuition was USD 38,000 for 2025/26 entrants in every programme except Medicine, which charged USD 59,000, and the School of Medicine awards no international scholarship of any kind. A student who holds a Koç scholarship may not also take another Koç-funded award such as a dormitory or book grant.',
  requirements = 'Hold a nationality other than Turkish, or qualify under the Turkish citizenship rules for international applicants, finish or be finishing secondary school, and submit the online application with one accepted international qualification (SAT, ACT, IB, A-Levels or another exam on the university list) plus a motivation letter and recommendation letters. The Admissions Committee weighs academic performance, exam results, extra-curricular activity and the interview in a holistic review; there are no test scores or GPAs that automatically win a scholarship, and the number of awards is limited. Scholarships are not available for Medicine. Transfers may request a partial tuition scholarship in the motivation letter. A student offered a Koç scholarship cannot later apply for other Koç financial aid.',
  required_documents = '["Koç University online application at apply.ku.edu.tr","High school diploma or graduation certificate","Official high school transcript","Accepted international exam or diploma result (SAT, ACT, IB, A-Levels or equivalent)","English proficiency result accepted by Koç University","Motivation letter","Recommendation letters","Passport copy"]',
  english_requirements = 'The scholarship sets no score of its own. Admission requires proof of English at the level the chosen college publishes; applicants below it are placed in the English Language Center preparatory year.',
  website_url = 'https://international.ku.edu.tr/scholarships/overview/',
  source_url = 'https://international.ku.edu.tr/undergraduate-programs/tuition-and-scholarships/',
  application_url = 'https://apply.ku.edu.tr/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the university''s own Tuition and Scholarships page, the Scholarships overview and the How to Apply page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Koç University International Merit Scholarship & Türkiye Bursları", carried an unsupported USD figure and named three degree levels. Two things were conflated. Türkiye Bursları is a YTB national programme that Koç merely hosts - and the Koç page itself points applicants to it because the government award includes dormitory, stipend and flights, which the Koç scholarship never does. The Koç award is undergraduate only, so degree_levels is now just bachelor. AMOUNT: 100% of the published 2025/26 international tuition of USD 38,000 for every programme except Medicine (USD 59,000, which is explicitly excluded from scholarships); the tiers are 25, 50, 75 and 100 percent, and the award is tuition-only. DEADLINE: no scholarship deadline exists at all - the offer letter states whether a scholarship was granted - so the admission calendar is given instead, and the tuition figures are labelled with their year because the 2026/27 table has not replaced them yet.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 823;

-- ---------------------------------------------------------------------------
-- 826 — Sabancı University
-- Was: "25% to 100% Tuition Fee Deduction", USD 9 500, three degree levels.
-- Published top tier is 75%, and tuition for 2026-2027 is USD 36 500.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Sabancı University International Admission Scholarship',
  provider = 'Sabancı University',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 27375,
  award_amount = 27375,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = '25%, 40%, 50%, 60% or 75% of tuition, plus a separate accommodation scholarship that covers a three- or four-person room in the campus dormitory',
  deadline = 'No separate scholarship deadline - every applicant is evaluated with the admission application; the 2027-2028 window is not published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Sabancı opens international undergraduate applications in December and closes them in late August. The 2026-2027 window ran from 15 December 2025 to 28 August 2026 at 16:00 Turkish time, and early applicants are given priority in the scholarship review, so applying in the first months matters.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Sabancı University considers every international applicant for an admission scholarship automatically - there is no separate form, although the application lets you tick a box asking to be considered. The award is a tuition waiver of 25%, 40%, 50%, 60% or 75% of the annual fee and stays valid for the regular duration of the programme. A separate accommodation scholarship covers a three- or four-person room in the campus dormitory; it pays only the dormitory and no meals. Annual tuition for international undergraduates in 2026-2027 is USD 36,500, so the largest waiver is worth USD 27,375 a year. The committee weighs academic background, reference letters, exam results, transcripts, interview results and competition or olympiad certificates, and the number of awards is limited, so a strong score does not guarantee a given tier. Early applicants get priority.',
  requirements = 'Be an international applicant under the Turkish Council of Higher Education rules - not a current student or graduate of a Turkish or Northern Cypriot high school, with the documented exceptions for embassy schools, MOBIS-listed international private schools and students brought to Türkiye under Ministry of National Education projects - and hold a valid exam or diploma result from the Sabancı list. The scholarship committee reviews academic background, reference letters, exam results, transcripts, interview performance and evidence of academic achievement such as competition or olympiad certificates, so all supporting documents should be uploaded. Meeting the admission requirements does not guarantee a particular scholarship level because the number of awards is limited. A USD 1,500 pre-payment is required to accept an offer and is deducted from the first term tuition.',
  required_documents = '["Sabancı University online application at apply.sabanciuniv.edu","Accepted exam or diploma result","High school diploma, with a notarised translation if not in Turkish or English","Official transcript approved by the high school showing every course and grade","English proficiency result, if already taken","Residence permit or Blue Card documents for applicants who studied in Türkiye","Reference letters and certificates of academic achievement"]',
  english_requirements = 'The programme is taught in English. Sabancı accepts its own list of English proficiency exams and places students below the threshold in the Foundations Development Year; the scholarship page itself sets no score.',
  website_url = 'https://iro.sabanciuniv.edu/en/scholarships',
  source_url = 'https://iro.sabanciuniv.edu/en/tuition-fee',
  application_url = 'https://apply.sabanciuniv.edu/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the university''s own Tuition Fee page, the International Relations Office scholarships page and the Application Requirements page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Sabancı University International Undergraduate Scholarship", claimed "25% to 100% Tuition Fee Deduction" and a USD 9,500 value, and listed bachelor, master and doctorate. The highest published waiver is 75%, not 100%, the award is undergraduate only, and the figure now comes from the published tuition: 75% of USD 36,500 for 2026-2027 is USD 27,375. The separate accommodation scholarship is described but not folded into the cash value because it covers a room, not tuition. DEADLINE: Sabancı publishes no scholarship deadline because every applicant is screened automatically; the admission window is given instead, and the 2026-2027 window is already closed.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 826;

-- ---------------------------------------------------------------------------
-- 799 — Bilkent University
-- Was: "Bilkent University Merit Scholarship & Türkiye Bursları", three levels.
-- The award is undergraduate only, five tiers 20-100%, and Turkish citizens
-- (current or former) are explicitly excluded.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Bilkent University International Tuition Waiver Scholarship',
  provider = 'Bilkent University',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 18400,
  award_amount = 18400,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = '20%, 40%, 60%, 80% or 100% of tuition, plus an accommodation scholarship for a limited number of top students who hold the full waiver; tuition only otherwise',
  deadline = 'No separate scholarship deadline - the waiver is decided with the application; the Fall 2027 window is not published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Bilkent opens international undergraduate applications in early February and closes them in mid-July. For Fall 2026 the window ran from 2 February to 12 July 2026, and the 2027 dates are announced on the How to Apply page.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Bilkent University awards tuition waivers to international applicants at five levels - 20%, 40%, 60%, 80% and 100% - and adds an accommodation scholarship to a limited number of the strongest full-waiver students. The decision is made while the application is assessed, using high school grades, national and international exam scores, programme choices and other academic criteria, so there is no separate scholarship form or deadline. A waiver runs for up to four semesters of the English Preparatory Program and up to ten semesters of a four-year undergraduate programme, that is, the normal study period. Tuition for students admitted in 2026 is USD 18,400 a year including 10% VAT, so the full waiver is worth USD 18,400 a year and the 80% tier USD 14,720. Students who had or have Turkish citizenship are not eligible for the international scholarships, and anyone who later acquires Turkish citizenship loses the award from that date.',
  requirements = 'Apply as an international undergraduate with one accepted qualification: SAT from 1000 out of 1600 across Maths and Critical Reading (or two subject tests at 500+ each), an International Baccalaureate diploma of at least 28 out of 45 with one relevant higher-level subject, GCE A-Levels, or a medal at an International Science Olympiad recognised by TUBITAK, plus a national qualification from the accepted list. Meeting the minimum does not guarantee admission, and the scholarship is competitive within the admitted group. To keep the waiver a student must carry the minimum course load of the department each semester and hold an annual GPA of at least 2.00 out of 4.00; the accommodation scholarship needs 2.50. A student who falls short drops one or two scholarship levels and cannot climb back even after improving, and poor attendance or a disciplinary sanction can suspend or cancel the award.',
  required_documents = '["Bilkent online undergraduate application at stars.bilkent.edu.tr/intapp","Passport","High school diploma or a letter confirming the final year of study","Upper-secondary transcript with grades","Accepted exam result (SAT, IB, A-Levels, International Science Olympiad or an accepted national qualification)","English proficiency evidence accepted by Bilkent, or placement in the English Preparatory Program","USD 30 application fee"]',
  english_requirements = 'The medium of instruction is English. Bilkent accepts its own list of English proficiency evidence and places students below the threshold in the English Preparatory Program, where the scholarship still applies for up to four semesters.',
  website_url = 'https://w3.bilkent.edu.tr/international/scholarships-for-international-students/',
  source_url = 'https://w3.bilkent.edu.tr/bilkent/international-and-other-students-tuition-fees/',
  application_url = 'https://stars.bilkent.edu.tr/intapp/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the university''s own Scholarships for International Students page, the international tuition-fees page and the How to Apply page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Bilkent University Merit Scholarship & Türkiye Bursları", mixed the YTB national programme into a university award and named three degree levels. The Bilkent award is undergraduate only, and Türkiye Bursları is a separate government programme recorded as row 865. AMOUNT: the five published tiers are 20/40/60/80/100 percent and the 2026 entry tuition is USD 18,400 a year including VAT, so the maximum is USD 18,400 and the 80% tier USD 14,720; the figures are labelled with their entry year because Bilkent charges each cohort a different rate (USD 17,600 for 2025 entrants, USD 16,950 for 2023 and 2024, USD 16,300 before that). DEADLINE: there is no scholarship deadline; the admission window is given instead. Important eligibility trap recorded: current or former Turkish citizens are excluded, which rules out any Uzbek applicant who also holds a Turkish passport.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 799;

-- ---------------------------------------------------------------------------
-- university_scholarships cards (ids 307, 309, 334)
-- ---------------------------------------------------------------------------
UPDATE university_scholarships AS us SET
  scholarship_name = v.name,
  max_scholarship = v.max_award,
  valued_aspect = v.aspect,
  official_url = v.url,
  source_url = v.url,
  funding_type = 'Merit-based',
  covers_tuition = true,
  covers_living_expenses = false,
  eligibility_notes = v.elig,
  last_verified_at = NOW()
FROM (VALUES
  (307, 'Koç University International Undergraduate Merit Scholarship',
        '25%, 50%, 75% or 100% of tuition - tuition only, no dormitory or stipend',
        'Automatic need-blind review on academic merit; no separate form',
        'https://international.ku.edu.tr/scholarships/overview/',
        'Undergraduate only and not available for Medicine. 2025/26 international tuition was USD 38,000 a year (Medicine USD 59,000). A Koç scholarship holder may not take another Koç-funded award.'),
  (309, 'Sabancı University International Admission Scholarship',
        '25%, 40%, 50%, 60% or 75% of tuition, plus a separate dormitory scholarship',
        'Early applicants get priority in the scholarship review',
        'https://iro.sabanciuniv.edu/en/scholarships',
        'Undergraduate only. Tuition for 2026-2027 is USD 36,500, so the 75% waiver is USD 27,375 a year. The dormitory scholarship covers a three- or four-person room and no meals.'),
  (334, 'Bilkent University International Tuition Waiver Scholarship',
        '20%, 40%, 60%, 80% or 100% of tuition, plus accommodation for top full-waiver students',
        'Five waiver levels; 100% is worth USD 18,400 a year for 2026 entrants',
        'https://w3.bilkent.edu.tr/international/scholarships-for-international-students/',
        'Undergraduate only. Current or former Turkish citizens are not eligible. Annual GPA of 2.00 keeps the waiver; a student who falls short drops one or two levels permanently.')
) AS v(id, name, max_award, aspect, url, elig)
WHERE us.id = v.id;
