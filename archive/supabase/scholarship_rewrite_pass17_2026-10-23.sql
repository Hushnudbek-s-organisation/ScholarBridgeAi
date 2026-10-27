-- Scholarship rewrite pass 17 — 2026-10-23
-- The Russia cluster. Nine importer rows, of which five turned out to be copies of a
-- national programme rather than an award the university runs. Those five are retired,
-- four are rewritten to the competition their own university actually operates, and the
-- national Open Doors project - which five of the nine rows had been standing in for -
-- is added as a record of its own with a live, current deadline.
--
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- NEW (id 902) — Open Doors: Russian Scholarship Project
-- Registration closes 1 November 2026, so the record carries a fixed date.
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value, award_amount, award_currency, award_period, award_basis,
  funding_type, tuition_coverage, deadline, deadline_type, deadline_date, degree_levels, eligible_majors, eligible_countries, min_ielts,
  description, requirements, required_documents, english_requirements, website_url, source_url, application_url, application_status,
  verification_status, source_reliability, notes, is_active, last_verified_at, last_updated_at
) VALUES (
  'Open Doors: Russian Scholarship Project (Global Universities Association)',
  'Association of Global Universities with the Ministry of Science and Higher Education of the Russian Federation',
  'Russia',
  'Full Tuition',
  0, NULL, 'RUB', 'year', 'variable',
  'Government quota (state-funded place)',
  'Full tuition funded from the federal budget, plus a monthly stipend that varies by host university, and a free Russian preparatory year for applicants who choose a Russian-taught programme',
  '1 November 2026 - registration closes',
  'fixed',
  '2026-11-01',
  '["Bachelor''s","Master''s","PhD"]',
  '["All Majors"]',
  '["All"]',
  NULL,
  'Open Doors is the second door into Russia''s state-funded places, and it is the one that does not depend on your country''s embassy allocation. It is a free, fully online academic competition run by the Association of Global Universities under the Ministry of Science and Higher Education, in 14 interdisciplinary subject areas that include applied mathematics and artificial intelligence, biology and biotechnology, computer and data science, engineering and technology, clinical medicine and economics. Winners study free of charge within the Russian Government quota at one of 24 participating universities - among them HSE, Bauman, MIPT, Novosibirsk State University, MEPhI, Saint Petersburg State University and Tomsk Polytechnic - and receive a monthly stipend whose size depends on the host university. Anyone choosing a Russian-taught programme also gets a free preparatory year of Russian. The competition is open to foreign citizens, stateless persons and compatriots living abroad, needs no entry fee, and is taken in Russian or English. It has become the main route for applicants who cannot rely on their own country''s quota: more than 100,000 people registered within a month of the 2026-2027 cycle opening. Travel, accommodation and medical insurance are not covered.',
  'Be a foreign citizen or stateless person, or a compatriot living abroad, and hold - or be completing in the year of the competition - the level of education required by the track you enter: secondary school for the bachelor''s track, a bachelor''s degree for the master''s track, and a master''s or specialist degree for the doctoral track. Register on the Open Doors portal during the published window, build a portfolio, and sit the online subject tasks in Russian or English. Winners then choose a degree programme through the one-stop system, which is what converts the result into a state-funded place, and complete that university''s enrolment steps including document recognition. Participation is free at every stage and nothing requires travel, because the whole competition is online; interviews for the doctoral track are held remotely with potential supervisors.',
  '["Registration on the Open Doors portal at od.globaluni.ru","Passport or identity document","Portfolio of academic achievements","Diploma or school certificate for the relevant track, with translation","Online subject tasks","Doctoral track only: remote interview with a potential supervisor","Document recognition after winning"]',
  'No English score is set. The competition itself can be taken in English or Russian; a winner who chooses a Russian-taught programme receives a free preparatory year of Russian, and a winner choosing an English-taught programme must meet that programme''s own English requirement.',
  'https://od.globaluni.ru/',
  'https://od.globaluni.ru/',
  'https://od.globaluni.ru/',
  'open',
  'verified',
  9,
  'NEW RECORD 2026-10-23. Added because the per-university rows for Bauman, Tomsk State University and Novosibirsk State University turned out to be describing this national programme rather than an award their own university runs, and the same was true of the Open Doors half of the MEPhI and MIPT records. Open Doors is distinct from the embassy quota recorded as id 868: both lead into the same pool of Russian state-funded places, but the embassy quota is allocated by country through Rossotrudnichestvo and closes on 15 December 2026 for CIS applicants, while Open Doors is a competition anyone can enter directly and closes on 1 November 2026. An applicant can and should enter both. The record carries a fixed deadline because the date is published and current, unlike the university rows it replaces. AMOUNT: amount_usd_value is 0 because the prize is a state-funded place and the stipend varies by host university, so no single cash figure exists to publish.',
  TRUE, NOW(), NOW()
);

-- ---------------------------------------------------------------------------
-- 812 — HSE University: the university's own INTO HSE olympiad.
-- Was: "HSE Global Scholarship (25%, 50%, 70%, 100% Tuition) & RF Quota".
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'HSE International Olympiad (INTO HSE) — full-tuition places and discounts',
  provider = 'HSE University (Higher School of Economics)',
  coverage_type = 'Full Tuition',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'RUB',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Olympiad-based state-funded place or tuition discount',
  tuition_coverage = 'Winners and laureates get a full tuition waiver for the whole bachelor programme at any HSE campus, plus a guaranteed dormitory place; second- and third-degree prize winners get a tuition discount of up to 75% on a fee-paying place',
  deadline = 'The 2027 school-olympiad calendar is not published yet; last cycle the full-scholarship admission route closed on 13 March 2026',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'INTO HSE runs from autumn into winter and publishes its results no later than December, so a diploma can be used in the following two admission years. For the 2026-2027 intake HSE opened full-scholarship admission on 1 November 2025 and closed it on 13 March 2026, with fee-paying admission from 20 June to 3 August 2026.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'HSE runs its own olympiad for international school students, and it is the fastest of the university''s three free-tuition routes because the results arrive in December, months before the entrance exams. The olympiad covers 16 subjects and is open to non-Russian citizens in grades 10 and 11 of an 11-year school system or grades 11 and 12 of a 12-year one. First-degree winners and second-degree laureates receive a full tuition waiver funded as a Russian Government quota place: four years of bachelor or specialist study at any HSE campus, free of charge, with a guaranteed dormitory place and no further exams. Second- and third-degree prize winners instead receive a discount of up to 75% on a fee-paying place, set separately for each subject. A diploma stays valid for the two admission years that follow, and if a student enters twice the better result counts. Uzbekistan has been the single largest source of participants: in 2022, 934 of the 5,759 entrants came from Uzbekistan, ahead of Kazakhstan, Kyrgyzstan and Tajikistan.',
  requirements = 'Be an international (non-Russian) citizen or a stateless person enrolled in grade 10 or 11 of an 11-year school programme, or grade 11 or 12 of a 12-year programme. Register on the olympiad portal, sit the written stage for one of the 16 subjects and, for second- and third-degree prize winners, pass a minimum score on the eligibility tests to convert the result into a tuition discount; some subjects also require an additional test at admission. There are usually four stages: self-study, registration, the olympiad events themselves, and results, which are published no later than December. Winners then apply to HSE through the full-scholarship track and must register on the admissions portal, take the entrance route that applies to them and upload enrolment documents. No participation fee is charged.',
  required_documents = '["Registration on the INTO HSE olympiad portal","Identity document with a photograph","School certificate confirming the grade and the school","Olympiad results (published in December in the participant account)","HSE admissions registration through asav.hse.ru with the olympiad diploma","Education document and its recognition for enrolment"]',
  english_requirements = 'No English score is set. The olympiad and much of the teaching are in Russian, and HSE notes that the International Youth Olympiad is currently conducted in Russian only, while some degree programmes are taught in English. A one-year Russian preparatory programme is available.',
  website_url = 'https://olymp.hse.ru/en/inter/about_inter',
  source_url = 'https://admissions.hse.ru/en/undergraduate-apply/',
  application_url = 'https://asav.hse.ru/intolymp.html?lang=en',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from HSE''s own olympiad pages and the international admissions page (fetched 2026-10-23). CORRECTIONS: the imported record was titled "HSE Global Scholarship (25%, 50%, 70%, 100% Tuition) & RF Quota", invented USD 5,500 and an "Oct-Feb" deadline, and named three degree levels. That percentage ladder is not what HSE awards through this route: the olympiad gives a 100% waiver to winners and laureates and discounts of up to 75% to prize winners, and it is a school-student competition leading to a bachelor''s place, so degree_levels is now bachelor only. The Rossotrudnichestvo quota is a separate national programme and is recorded as id 868; the Open Doors olympiad is a third, separate route recorded as id 902. AMOUNT: amount_usd_value is 0 because the award is a waiver of tuition on a state-funded place rather than a cash prize, and the only fee figure HSE publishes on this page is the fee-paying floor of 200,000 RUB a year, which is not the value of the award. CAVEAT recorded honestly: HSE''s English olympiad page states that this year the International Youth Olympiad is conducted in Russian only, so an applicant without Russian should confirm the language of the subject before entering.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 812;

-- ---------------------------------------------------------------------------
-- 807 — RUDN: the Open Olympiad for Foreign Citizens, run since 2016.
-- Was: "RUDN Open Olympiad Grant & Russian Government Quota", USD 17 300.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'RUDN Open Olympiad for Foreign Citizens',
  provider = 'RUDN University (Peoples'' Friendship University of Russia)',
  coverage_type = 'Full Tuition',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'RUB',
  award_period = 'year',
  funding_type = 'Olympiad-based state-funded place or tuition discount',
  tuition_coverage = 'Winners study free of charge under the Russian Government quota; prize-winners receive a tuition discount on a fee-paying place',
  deadline = 'The 2027 olympiad calendar is not published yet; the 2026 edition ran from January to April 2026',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Registration for the Open Olympiad opens in January, the written stage and the interviews follow in spring, results are published in the participant account, and winners then attach their admission documents. The 2026 Olympiad opened registration in January 2026 and the whole cycle was complete by April 2026.',
  degree_levels = '["Bachelor''s","Master''s"]',
  eligible_majors = '["Computer Science","Mathematics","Physics","Chemistry","Biology","Social Studies","Russian Language","Ecology","Economics","Management","Advertising and Public Relations","Journalism","Psychology"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'RUDN has run its Open Olympiad for foreign citizens since 2016, and it is a genuinely free route to a state-funded place, not a discount scheme with a scholarship label. The competition is free to enter and is held either online through a proctoring system or in person at one of RUDN''s partner universities abroad, after which online participants sit a video interview. Winners - who must not hold Russian citizenship - study free of charge under the quota of the Government of the Russian Federation in the subject they competed in. Prize-winners instead receive a significant tuition discount on a fee-paying place. Both groups may then compete for the RUDN Brilliant Students scholarship, which pays RUB 25,000 a month and is awarded to 21 students. Ten subjects are offered, including computer science, mathematics, physics, chemistry, biology, social studies, Russian language, ecology, economics and management, and advertising, public relations, journalism and psychology; some of those are opened at master''s level only. Papers can be taken in Russian, English, French or Spanish. Over its first four years the Olympiad produced 260 winners from 29 countries.',
  requirements = 'Be a foreign citizen without Russian citizenship, a compatriot living outside Russia, or a stateless person, and be either a senior-year secondary school student, a graduate of RUDN, a graduate of another Russian university who is not already studying under the Russian Government quota, or a graduate of a higher-education institution in a CIS or non-CIS country. Sit the written stage in the chosen subject online with proctoring or in person at a partner university, then complete a video interview if competing online. Winners must attach the admission documents to their personal account within the published window; in a past cycle that window closed on 20 April, and a prize-winner who missed it could still take the 20% tuition discount instead. Winners also need to meet RUDN''s admission requirements for the chosen programme.',
  required_documents = '["Registration on olymp.rudn.ru","Identity document and photograph","School certificate or higher-education diploma, with translation if required","Olympiad written stage and video interview","Admission documents attached to the winner''s personal account","Document recognition for the chosen programme"]',
  english_requirements = 'No English score is set. The olympiad can be taken in Russian, English, French or Spanish, but the degree programme itself determines whether Russian or English proficiency is needed at enrolment.',
  website_url = 'https://olymp.rudn.ru/eng/main',
  source_url = 'https://international.rudn.ru/undergraduate/byudzhetnye-mesta-otkrytaya-olimpiada-rudn-dlya-inostrannykh-grazhdan/',
  application_url = 'https://olymp.rudn.ru/register',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from RUDN''s own Open Olympiad portal, its international admissions page describing state-funded places through the Olympiad, and the RUDN Brilliant Students page (fetched 2026-10-23). CORRECTIONS: the imported record was titled "RUDN Open Olympiad Grant & Russian Government Quota", invented USD 17,300 and a "Nov-Feb" deadline, and named three degree levels. There is no "RUDN Open Olympiad Grant" paying a cash package: the Olympiad yields either a state-funded place or a tuition discount, and the cash award that does exist is the separate RUDN Brilliant Students scholarship. The Rossotrudnichestvo quota is the national programme recorded as id 868 and is a separate route. AMOUNT: amount_usd_value is 0 because the prize is a waiver on a state-funded place rather than a sum of money. THE DISCOUNT: RUDN publishes 30% for prize-winners of its Open Olympiad in its tuition-discount list for foreign citizens, while a past cycle told a prize-winner who missed the document deadline that a 20% discount applied instead, so the rate is described rather than fixed in the money columns. DEGREE LEVELS: the Olympiad portal lists bachelor, master and PhD tracks but marks the PhD track as opening later, so the record covers bachelor and master only.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 807;

-- ---------------------------------------------------------------------------
-- 829 — MIPT: Phystech.International, described for what it actually gives.
-- Was: "Phystech.International Winner Quota & RF Government Scholarship", USD 6 000.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Phystech.International Olympiad (MIPT)',
  provider = 'Moscow Institute of Physics and Technology (MIPT / Phystech)',
  coverage_type = 'Full Tuition',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'RUB',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Olympiad route to a state-funded place',
  tuition_coverage = 'No separate scholarship fund: a strong result improves the applicant''s position in the Russian Government quota selection, and a winner who is granted the quota studies tuition-free. MIPT states plainly that winning does not by itself guarantee a free place.',
  deadline = 'The 2027 edition is not published yet; the last cycle closed its online stage on 30 November 2025',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Phystech.International opens registration in the autumn and runs its online stage through November, with the final stage in December. In the 2025-2026 season the Mathematics second round ran on 1 November 2025 between 14:00 and 18:00 Moscow time and the competition is now marked finished, so the next edition is expected to open in the autumn of 2027.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["Mathematics","Physics"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'MIPT runs Phystech.International, an olympiad in mathematics and physics that is the university''s own route into the Russian Government quota, and it is worth understanding exactly what it does and does not give. Candidates compete in one or both tracks, entirely online, and the winners and runners-up gain two things: competitive benefits when applying to MIPT, and a letter of recommendation that the olympiad team sends to the winner''s local Rossotrudnichestvo office to improve the chance of being granted a quota place for tuition-free study. That letter is the point of the exercise. Winning does not by itself make study free, because the quota is allocated nationally and the final decision sits with Rossotrudnichestvo and the ministry rather than with MIPT. The olympiad is open to international school students, not only to applicants inside Russia, and asks for an identity document with a photograph plus a stamped school certificate carrying the same photograph. It has drawn more than 12,000 participants from over 100 countries.',
  requirements = 'Be a secondary school student - MIPT runs the rounds by grade, with the timetable split across grades 9, 10 and 11 - and register on the Phystech.International portal during the published window. Upload an identity document from MIPT''s accepted list; if the document carries no photograph, also upload a stamped certificate from the school bearing the applicant''s photograph with the stamp covering part of it. Sit the online stage in mathematics, physics or both. Winners and runners-up are then recommended to their local Rossotrudnichestvo office. A quota place still depends on the national selection in the applicant''s own country, so the olympiad is an advantage in that competition rather than a reserved seat.',
  required_documents = '["Registration on the Phystech.International portal","Identity document with a photograph, or a stamped school certificate carrying the photograph","School certificate showing the grade","Online stage results in mathematics and/or physics","Application to MIPT and, separately, to education-in-russia.com for the quota"]',
  english_requirements = 'No English score is set. The olympiad is online and can be taken from the applicant''s own country; the degree programme then determines whether Russian or English proficiency is needed at enrolment.',
  website_url = 'https://en.phystech.international/',
  source_url = 'https://en.phystech.international/',
  application_url = 'https://en.phystech.international/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from MIPT''s own Phystech.International site (fetched 2026-10-23). CORRECTIONS: the imported record was called "Phystech.International Winner Quota & RF Government Scholarship", invented USD 6,000, invented an "Oct-Dec" deadline and named three degree levels. Three things were wrong. First, MIPT awards no cash scholarship through this competition; the olympiad is a competition whose prize is a recommendation into the national quota process, in MIPT''s own wording "a competitive advantage in applying to the state grant for tuition-free education". Second, the olympiad is for school students and leads to a bachelor''s place, so degree_levels is now bachelor only. Third, the Russian Government quota itself is a national programme applied for through education-in-russia.com and is recorded separately as id 868. AMOUNT: amount_usd_value is 0 because nothing is paid to the winner and no award value is published. HONEST LIMITATION, stated both in the description and here: winning is not a guarantee of free study, and MIPT''s own admissions rules restrict some olympiad privileges to Russian citizens and to foreign citizens holding equal rights under international treaties, so a winner from Uzbekistan should treat the quota route as the actual prize.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 829;

-- ---------------------------------------------------------------------------
-- 822 — KFU: its own olympiads for foreign citizens.
-- Was: "Russian Government Quota & Tatarstan Study Grant", USD 4 000.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'KFU International Olympiads for foreign citizens',
  provider = 'Kazan Federal University (KFU)',
  coverage_type = 'Full Tuition',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'RUB',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Olympiad-based state-funded place',
  tuition_coverage = 'Winners are admitted free of charge, within the Russian Government quota, to Kazan Federal University or another Russian university',
  deadline = 'The 2026-2027 international edition dates are not published yet; the previous season ran from December into the spring',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'KFU runs the international olympiads in two stages, a preliminary round online in December and January followed by a final stage. The 2025-2026 international edition is the one still published on the English site and the 2026-2027 dates for foreign citizens had not been announced at the time of writing.',
  degree_levels = '["Bachelor''s","Master''s"]',
  eligible_majors = '["Mathematics","Biology","Chemistry","Physics","Russian Language","English Language","Law","Design","Oil and Gas Engineering","Applied Mathematics and Informatics","Economics","Management","Pedagogy"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Kazan Federal University runs its own olympiads specifically for foreign citizens, separate from the general track for school students inside Russia, and entry is free. Foreign high school students in grades 10 and 11, preparatory school students, and applicants to master''s programmes compete in two stages: a preliminary round held online in December and January, after which the winners - roughly the top 45 percent of entrants in each subject - go through to a final stage. Winners are admitted free of charge to Kazan Federal University or to another Russian university in the following academic year, funded as a Russian Government quota place. Subjects for school-level entrants are mathematics, biology, chemistry, physics, Russian, English, law and design; master''s applicants also compete in oil and gas engineering, applied mathematics and informatics, Russian as a foreign language, English, pedagogy, economics and management. Note that the 2026-2027 dates for the international track had not been published when this record was checked, and that the dates shown on the general Russian-language olympiad page belong to school students in Russia rather than to this track.',
  requirements = 'Be a foreign citizen, including a compatriot living abroad, and be either a grade 10 or grade 11 high school student, a preparatory school student, or - for the master''s subjects - a final-year bachelor or specialist student or a graduate of a foreign higher-education institution. Register on the KFU olympiad portal before the preliminary round, sit that round online, and qualify for the final stage. Winning gives a quota place for the following academic year, so the applicant must then complete the university admission steps and document recognition. There is no participation fee at either stage.',
  required_documents = '["Registration on the KFU olympiad portal","Identity document","School certificate or higher-education diploma showing the grade or year of study","Preliminary online round results","Final stage participation","Admission documents and document recognition after winning"]',
  english_requirements = 'No English score is set. Competitions are offered in both Russian and English subjects, but the degree programme itself decides whether Russian or English proficiency is needed at enrolment.',
  website_url = 'https://eng.kpfu.ru/afisha/konkursy-i-olimpiady/kfu-international-olympiads-win-free-education-at-a-russian-university/',
  source_url = 'https://eng.kpfu.ru/afisha/konkursy-i-olimpiady/kfu-international-olympiads-win-free-education-at-a-russian-university/',
  application_url = 'https://malun.kpfu.ru/mpo/fc',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from KFU''s own international olympiad announcement and its English scholarships page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Russian Government Quota & Tatarstan Study Grant", invented USD 4,000 and a "Nov-Feb" deadline. There is no "Tatarstan Study Grant" in KFU''s own materials, and the Russian Government Quota is a national programme recorded separately as id 868. What KFU does run is its own olympiad for foreign citizens, described here. AMOUNT: amount_usd_value is 0 because the prize is a state-funded place rather than a cash payment. CAVEAT recorded honestly: the KFU English site was still showing the 2025-2026 international edition, and the university had not published the 2026-2027 dates for the foreign-citizen track, so the deadline is marked not published rather than copied from the Russian-language school-student calendar.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 822;

-- ---------------------------------------------------------------------------
-- 629 — MSU → retired. MSU's own FAQ: no scholarships to contract students.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - MSU runs no entrance scholarship for international applicants',
  deadline = 'Retired 2026-10-23 - the tuition-free route is the national quota, recorded as id 868',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://openday.msu.ru/en/faq',
  source_url = 'https://openday.msu.ru/en/faq',
  notes = 'RETIRED 2026-10-23. The imported record was called "Russian Government Quota (Rossotrudnichestvo) & MSU Olympiad" and implied that Lomonosov Moscow State University runs its own scholarship for international applicants alongside the national quota. MSU says the opposite in its own admissions FAQ: "Moscow State University provides scholarships to students studying on a budgetary basis. MSU does not provide scholarships to students studying on a contractual basis." The Faculty of Biology puts the same rule in plainer words for foreign applicants: a foreign citizen pays tuition unless the fees are covered by the federal budget, and "No scholarship can be provided for contract students by the University." In practice that leaves two routes to a tuition-free place at MSU and neither of them is an MSU scholarship: the Russian Government Quota, recorded as id 868 and applied for through education-in-russia.com and the Russian embassy, and the Open Doors olympiad for master''s and doctoral applicants, recorded as id 902. The quota route is all-or-nothing at MSU - a winner pays no tuition and receives the standard state stipend, while a fee-paying student pays the full contract fee, which MSU publishes at roughly USD 5,124 to 9,817 a year depending on the faculty. Note the detail that catches people out: the dormitory is NOT part of the quota package at MSU, a place has to be requested through the faculty and quota students still pay a subsidised monthly rate.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 629;

-- ---------------------------------------------------------------------------
-- 836 — MEPhI → retired. Its Rosatom awards are stipend top-ups for enrolled
-- students, not tuition funding for an applicant.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - MEPhI runs no entrance tuition scholarship of its own',
  deadline = 'Retired 2026-10-23 - the tuition-free routes are the national quota (id 868) and Open Doors (id 902)',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://inter.mephi.ru/',
  source_url = 'https://inter.mephi.ru/',
  notes = 'RETIRED 2026-10-23. The imported record was called "Rosatom / Russian Government Quota & Open Doors" and implied that MEPhI awards its own entrance scholarship to international applicants. MEPhI''s own international admissions page lists exactly three ways to cover tuition and none of them is a MEPhI entrance scholarship: self-funding from the family''s own money, the Russian Government Quota (national programme, id 868), and the Open Doors olympiad, which is a national competition that MEPhI hosts rather than awards (id 902). The Rosatom element that gives the old title its flavour is real but was mis-described: MEPhI''s page calls the Rosatom awards "personal scholarships that are added to your monthly payments, aimed at students who have achieved high results in studies and scientific research" - a stipend top-up for students who are already enrolled, not tuition funding for an applicant. Two further details worth keeping: MEPhI runs the quota selection through education-in-russia.com where an applicant may list up to six universities and is advised to put MEPhI first, and for 2026-2027 bachelor programmes at MEPhI are taught in Russian only and require at least B1 Russian. Medical insurance is compulsory and covered by none of the funding routes.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 836;

-- ---------------------------------------------------------------------------
-- 543 — Bauman → retired. Its Open Doors page is a pointer, and its 50%
-- discount is gated behind four Russian Unified State Exam scores.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicates of the national Open Doors project and the embassy quota',
  deadline = 'Retired 2026-10-23 - use Open Doors (id 902) or the embassy quota (id 868)',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://opendoors.bmstu.ru/eng.html',
  source_url = 'https://opendoors.bmstu.ru/eng.html',
  notes = 'RETIRED 2026-10-23. The imported record was called "Russian Government Quota & Open Doors Olympiad (Bauman Moscow State Technical University)", invented USD 5,200 and a "Nov-Jan" deadline. Everything of substance in it belongs to national programmes that now have their own records: the embassy quota is id 868 and the Open Doors competition that Bauman hosts is id 902. Bauman''s own page on the subject is simply a landing page for Open Doors saying "We invite talented students from all over the world to take part in the Open Doors Olympiad of Bauman Moscow State Technical University", which is a pointer rather than an award. Bauman does run its own olympiad, Step into the Future, and its materials state that winning foreign entrants may receive a quota place, but that route also ends in the same government quota rather than in a Bauman scholarship. What is worth recording about Bauman for an applicant from Uzbekistan: teaching is in Russian across the catalogue and no English-taught degree list is published for foreign applicants, so a preparatory year is normally needed; quota entrants skip Bauman''s internal entrance examinations entirely; and the university''s 50 percent first-year tuition discount is tied to four high Russian Unified State Exam scores, which a foreign applicant examined on Bauman''s own tests cannot produce, so it is out of reach by construction.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 543;

-- ---------------------------------------------------------------------------
-- 833 — Tomsk State University → retired. Its Open Doors page offers a 40%
-- master's reduction, a host top-up rather than a scholarship.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicates of the national Open Doors project and the embassy quota',
  deadline = 'Retired 2026-10-23 - use Open Doors (id 902) or the embassy quota (id 868)',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://en.tsu.ru/student_s_life/OpenDoorsRussianScholarshipProject.php',
  source_url = 'https://en.tsu.ru/student_s_life/OpenDoorsRussianScholarshipProject.php',
  notes = 'RETIRED 2026-10-23. The imported record was called "Russian Government Quota & Open Doors Scholarship" with Tomsk State University as the provider, invented USD 3,800 and a "Nov-Feb" deadline. Both halves are national programmes with their own records - the embassy quota is id 868 and the Open Doors competition is id 902 - so a TSU copy only made the catalogue look as though TSU ran an award of its own. TSU''s own page confirms the relationship: it welcomes Open Doors participants and states that "at TSU winners of the Olympiad will receive a reduction in the cost of training for master''s programs by 40%", which is a host-university top-up rather than a separate scholarship. Other TSU-specific facts worth keeping: the Tomsk International Science Program discounts 30 percent for applicants from outside the CIS who score 80 or more in one entrance exam or 200 or more across three; TSU''s endowment fund pays scholarships of around RUB 25,000 a month to selected Russian and international students, but only once they are enrolled; and TSU''s own Master of TSU olympiad awards entrance-exam points and tuition discounts rather than free tuition. TSU reports about 3,500 international students from more than 60 countries, with Uzbekistan among the five most numerous groups.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 833;

-- ---------------------------------------------------------------------------
-- 840 — Novosibirsk State University → retired. It lists only the embassy quota
-- and Open Doors for foreign students.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicates of the national Open Doors project and the embassy quota',
  deadline = 'Retired 2026-10-23 - use Open Doors (id 902) or the embassy quota (id 868)',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://english.nsu.ru/admission/grants-scholarships/',
  source_url = 'https://english.nsu.ru/admission/grants-scholarships/',
  notes = 'RETIRED 2026-10-23. The imported record was called "Russian Government Quota & Open Doors Olympiad (Novosibirsk State University)", invented USD 4,500 and a "Nov-Feb" deadline. NSU''s own grants and scholarships page lists exactly two funding routes for foreign students, and both are national programmes already recorded here: the Russian Government Scholarship, which is the embassy quota at id 868, and the Open Doors project at id 902, where NSU coordinates the biology and biotechnology and the earth sciences subject areas. The university does not advertise an entrance scholarship of its own on that page. What it does publish, worth keeping: master''s programmes carry discounts of up to 25 percent for the first year, decided by an analysis of the applicant''s documents rather than by a competition, and only one discount may be applied to the contract. Published fees for foreign payers are USD 4,500 a year for bachelor programmes, USD 6,500 for specialist programmes, USD 3,600 to 6,500 for master''s and USD 5,500 for PhD. Travel, living costs and health insurance are excluded from every funded route.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 840;

-- ---------------------------------------------------------------------------
-- university_scholarships cards
-- ---------------------------------------------------------------------------
UPDATE university_scholarships AS us SET
  scholarship_name = v.name, max_scholarship = v.max_award, valued_aspect = v.aspect,
  availability_status = v.availability, funding_type = v.funding,
  covers_tuition = v.covers_tuition, covers_living_expenses = v.living,
  official_url = v.url, source_url = v.url, eligibility_notes = v.elig,
  last_verified_at = NOW()
FROM (VALUES
  (352, 'HSE International Olympiad (INTO HSE) — full-tuition places and discounts',
        'Full tuition for four years plus a guaranteed dormitory place; up to 75% discount on a fee-paying place',
        'Results arrive in December, months before the entrance exams',
        'Yes', 'Olympiad-based', true, false,
        'https://olymp.hse.ru/en/inter/about_inter',
        'Open to non-Russian citizens in grades 10-11 (11-year) or 11-12 (12-year). Diploma valid for two admission years. HSE notes the Olympiad is currently conducted in Russian only.'),
  (350, 'RUDN Open Olympiad for Foreign Citizens',
        'Free tuition under the Russian Government quota for winners; a tuition discount for prize-winners',
        'Free to enter; online with proctoring or in person at a partner university',
        'Yes', 'Olympiad-based', true, false,
        'https://olymp.rudn.ru/eng/main',
        'Ten subjects. Winners and prize-winners may also compete for the RUDN Brilliant Students scholarship of RUB 25,000 a month, awarded to 21 students.'),
  (353, 'Phystech.International Olympiad (MIPT)',
        'No cash prize - a recommendation to Rossotrudnichestvo that improves the quota application',
        'Online mathematics and physics olympiad open to international school students',
        'Yes', 'Olympiad-based', true, false,
        'https://en.phystech.international/',
        'MIPT states plainly that winning does not guarantee a free place; the quota itself is decided nationally.'),
  (357, 'KFU International Olympiads for foreign citizens',
        'Free tuition for winners under the Russian Government quota',
        'Two stages, free entry; the international track is separate from the Russian school-student track',
        'Yes', 'Olympiad-based', true, false,
        'https://eng.kpfu.ru/afisha/konkursy-i-olimpiady/kfu-international-olympiads-win-free-education-at-a-russian-university/',
        'Subjects include mathematics, biology, chemistry, physics, Russian, English, law and design, plus master-level oil and gas, applied mathematics, pedagogy, economics and management.'),
  (296, 'Russian Government Quota & Open Doors Olympiad (Bauman Moscow State Technical University)',
        'No Bauman award to apply for', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'https://opendoors.bmstu.ru/eng.html',
        'Bauman hosts Open Doors (id 902) and takes part in the embassy quota (id 868); it publishes no entrance scholarship of its own for foreign applicants.'),
  (81, 'Russian Government Quota (Rossotrudnichestvo) & MSU Olympiad',
        'No MSU award to apply for', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'https://openday.msu.ru/en/faq',
        'MSU states that it provides scholarships only to students on budgetary places and none to contract students.'),
  (355, 'Russian Government Quota & Open Doors Scholarship',
        'No TSU award to apply for', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'https://en.tsu.ru/student_s_life/OpenDoorsRussianScholarshipProject.php',
        'TSU''s own page says Open Doors winners at TSU receive a 40% reduction on master''s tuition - a host top-up, not a separate scholarship.'),
  (356, 'Rosatom / Russian Government Quota & Open Doors',
        'No MEPhI entrance award', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'https://inter.mephi.ru/',
        'MEPhI lists only self-funding, the government quota and Open Doors. The Rosatom awards are personal stipend top-ups for students already enrolled.'),
  (354, 'Russian Government Quota & Open Doors Olympiad (Novosibirsk State University)',
        'No NSU entrance award', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'https://english.nsu.ru/admission/grants-scholarships/',
        'NSU lists only the embassy quota and Open Doors for foreign students, and publishes master''s discounts of up to 25% for the first year.')
) AS v(id, name, max_award, aspect, availability, funding, covers_tuition, living, url, elig)
WHERE us.id = v.id;
