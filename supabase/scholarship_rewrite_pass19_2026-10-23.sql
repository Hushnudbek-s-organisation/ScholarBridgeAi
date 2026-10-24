-- Scholarship rewrite pass 19 — 2026-10-23
-- The China cluster, second batch: the university-run schemes that the importer had
-- mislabelled as "CSC + something".
--
-- The pattern this pass breaks: every one of these rows carried a big invented USD
-- number and a "Dec-Apr"-style deadline, and three of the four claimed a monthly
-- stipend that the underlying award does not pay at all.
--
-- Rows: 778 USTC · 792 Wuhan · 586 HIT · 631 Nanjing
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 778 — USTC. Was: "USTC Fellowship (Level A & B) + CSC Scholarship", USD 15 500.
-- CSC and CAS-ANSO are funding sources behind Level A, not separate awards.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'USTC Fellowship for International Students (Levels A, B and C)',
  provider = 'University of Science and Technology of China (USTC) International College',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'CNY',
  award_period = 'variable',
  award_basis = 'variable',
  funding_type = 'University fellowship with government-funded top tiers',
  tuition_coverage = 'Level A waives tuition, adds comprehensive medical insurance, a monthly stipend and an accommodation subsidy; Level B (and Level C at doctoral level) waives tuition only, with teaching or research assistantship money available after enrolment',
  deadline = 'Master''s and doctoral: 31 January 2026 closed for the 2026 intake. Undergraduate: 31 March 2026. The 2027 window is expected to open in mid-October 2026.',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'USTC opened the master''s and doctoral fellowship window on 16 October 2025 and closed it on 31 January 2026, and the undergraduate window closed on 31 March 2026. The university has not yet published the 2027 dates, so applicants should watch the International College fellowship pages from October 2026.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["Mathematics","Physics","Chemistry","Materials Science","Life Sciences","Engineering Sciences","Electronic Information","Computer Science","Geophysics","Environmental Science and Engineering","Management Science","Cyberspace Security","Nuclear Engineering"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'USTC''s fellowship is not one award but a three-level ladder, and the level matters more than the name. Level A is the full package: tuition waived, comprehensive medical insurance, an accommodation subsidy and a monthly stipend of CNY 2,500 for an undergraduate, 3,000 for a master''s student and up to 7,000 for a doctoral student - that top doctoral tier is paid by the Chinese Academy of Sciences under the CAS-ANSO scheme, and the master''s and doctoral Level A places are funded by the Ministry of Education''s Chinese Government Scholarship or by USTC itself. Level B is tuition only, plus insurance and a dormitory place at the research-internship level, and it is what a master''s or doctoral applicant gets when they fall short of Level A. Level C, available at doctoral level, is a bare tuition waiver with teaching or research assistantship money offered only after enrolment. Applicants choose which levels to be considered for - they may tick one or all - and USTC decides which one to give; nobody can hold more than one scholarship. Published tuition is CNY 26,000 a year for bachelor and master programmes and CNY 32,000 for doctoral programmes, with a dormitory place at CNY 500 to 1,000 a month and insurance at CNY 160 a month.',
  requirements = 'Be a non-Chinese citizen with a valid ordinary passport and good physical and mental health, and hold the degree the level requires: a high school diploma for undergraduate entry, a bachelor degree for a master''s, a master degree for a doctorate - or a pre-graduation certificate confirming completion by July of the intake year. Respect the age limits, which differ by level: a doctoral Level A applicant must be under 35 on 1 September of the intake year, while doctoral Level B or C applicants may be under 40; a master''s applicant must not be over 35. Chinese-taught programmes need HSK level 4 or above, with an exemption for native speakers and for applicants who studied at a Chinese-medium school or university; English-taught programmes need a valid IELTS or TOEFL result unless the applicant''s mother tongue is English. Applicants cannot hold other assignments or another scholarship during the award. Two rules catch doctoral applicants out: anyone already studying for a doctorate anywhere in China is barred from doctoral Level A, and a Level A applicant may name only one supervisor at one institute, either at USTC or at UCAS, not both.',
  required_documents = '["Online application in the USTC application system","Passport photocopy, ordinary passport with at least one year of validity","Study or research proposal of at least 1,000 words","Curriculum vitae","Two letters of recommendation from full or associate professors, with phone and email","Foreigner Physical Examination Form","HSK certificate for Chinese-taught programmes, or IELTS/TOEFL for English-taught programmes","Degree certificates and transcripts for every degree held, notarised by the Ministry of Education or equivalent"]',
  english_requirements = 'English-taught programmes require a valid IELTS or TOEFL result, or other proof of English proficiency, except for applicants whose mother tongue is English. Chinese-taught programmes require HSK level 4 or above, or proof of Chinese-medium schooling.',
  website_url = 'https://ic.ustc.edu.cn/?abroad=351',
  source_url = 'https://ic.ustc.edu.cn/?abroad=351',
  application_url = 'https://isa.ustc.edu.cn/xs/login_scho.asp',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from USTC International College''s own doctoral, master''s and undergraduate fellowship pages plus its admissions overview (fetched 2026-10-23). CORRECTIONS: the imported record was called "USTC Fellowship (Level A & B) + CSC Scholarship", invented USD 15,500 and a "Nov-Mar" deadline. There is no separate CSC award bolted onto the fellowship: the Chinese Government Scholarship is simply the funding source behind master''s and doctoral Level A, and the Chinese Academy of Sciences is the source behind doctoral Level A. They are levels of one USTC scheme, not two schemes. The old row also missed Level C entirely. AMOUNT: deliberately 0 with no single award figure, because the four published tiers range from a bare tuition waiver to a package with a CNY 7,000 monthly stipend, and no single number represents them honestly; the published tuition, dormitory and insurance rates are in the description instead so a reader can compute the value of the tier they are actually offered. DEADLINE: both windows for the 2026 intake are closed (master''s and doctoral 31 January 2026, undergraduate 31 March 2026) and the 2027 dates are not yet out, so the record says not_published rather than reusing the pattern of a previous year.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 778;

-- ---------------------------------------------------------------------------
-- 792 — Wuhan. Was: "CSC & Wuhan University Freshman Scholarship", USD 16 000.
-- The real award is a one-off CNY 4 000-8 000 payment, not a funded package.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Studying in Wuhan University - Academic Freshman Scholarship',
  provider = 'Wuhan University, School of International Education',
  coverage_type = 'Partial Funding',
  amount_usd_value = 0,
  award_amount = 8000,
  award_currency = 'CNY',
  award_period = 'one_time',
  award_basis = 'range',
  funding_type = 'One-time merit award for self-funded freshmen',
  tuition_coverage = 'A single cash payment towards the cost of the first year - CNY 4,000 for a bachelor''s, 6,000 for a master''s and 8,000 for a doctorate. It does not waive tuition and it is not renewable.',
  deadline = '5 March - 20 May each year',
  deadline_type = 'annual',
  deadline_date = NULL,
  expected_deadline_period = 'The published rules fix the window at 5 March to 20 May every year, applied for at admission.whu.edu.cn, with the result list published before 30 June. The 2027 window is therefore expected on the same dates.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = 6.5,
  description = 'This is Wuhan University''s own award, and its size is the thing most people get wrong: it is a one-off payment of CNY 4,000 for a bachelor''s entrant, 6,000 for a master''s and 8,000 for a doctorate, made after registration for the first semester. It is not a tuition waiver, not a stipend and not renewable. The quota is 100 students a year, split into 80 bachelor places and 20 shared between master and doctoral entrants, and only self-funded freshmen who hold no other scholarship can take it - anyone already holding a Chinese government, Confucius Institute, foreign government or corporate award is excluded. Applications open at admission.whu.edu.cn from 5 March to 20 May each year, the school screens the documents, the receiving faculty runs an academic assessment, and the final list is published before 30 June together with the admission notice and the JW202 visa form. In practice the award covers a fraction of a year''s costs, so it works as a welcome grant for a self-funded student rather than as the reason to choose the university.',
  requirements = 'Be a self-funded freshman who has not received a Chinese government, Confucius Institute, foreign government, foreign enterprise or Chinese enterprise scholarship in the same year, and hold the qualification for the level applied for. Language: for Chinese-taught ordinary majors, HSK level 4 at bachelor level and HSK level 5 at master and doctoral level; for English-taught ordinary majors, TOEFL 85 or TOEFL Essentials B2 or IELTS 6.5, while medical programmes require HSK level 4 as well as the English score. Certification by Wuhan University can exempt a native speaker of Chinese or a graduate of a Chinese-medium degree, and a native speaker of English or a graduate of an English-medium degree from the English requirement. Academic record: grade B or higher in high school for bachelor entry, a GPA of 3.0 or higher in the previous degree for master and doctoral entry. The receiving tutor also assesses the applicant''s research background and publications.',
  required_documents = '["Application at admission.whu.edu.cn","Passport information page and, if already held, the Chinese visa","Notarised highest degree certificate with Chinese or English translation","Notarised full transcripts with Chinese or English translation","Language proficiency certificate (HSK, IELTS or TOEFL)","Personal statement of at least 500 words for bachelor applicants, or a research plan of at least 800 words for master and 1,200 for doctoral applicants","Recommendation letter from the high school principal for bachelor applicants, or two recommendation letters from professors, one of them a Wuhan University tutor, for master applicants","Physical Examination Record for Foreigners","Financial certification or bank statement of USD 5,000 or more","Certificate of no criminal record","Award certificates, publications and other supporting evidence (optional)"]',
  english_requirements = 'For English-taught ordinary majors: TOEFL 85, TOEFL Essentials B2 or IELTS 6.5. Medical programmes additionally require HSK level 4. Native English speakers, or graduates of an English-medium degree, may be exempted if Wuhan University certifies it.',
  website_url = 'https://admission.whu.edu.cn/info/1271/1671.htm',
  source_url = 'https://admission.whu.edu.cn/info/1271/1671.htm',
  application_url = 'https://admission.whu.edu.cn/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from Wuhan University''s own implementation plan for the "Studying in Wuhan University - Academic Freshman Scholarship" (fetched 2026-10-23). CORRECTIONS: the imported record was called "CSC & Wuhan University Freshman Scholarship", bundled the national Chinese Government Scholarship with the university''s own small award, and claimed USD 16,000 with a "Dec-Apr" deadline and full tuition plus stipend. The university''s freshman scholarship is a ONE-TIME CNY 4,000 to 8,000 payment - roughly USD 550 to 1,100 - with no tuition waiver, no stipend and no renewal, and its window is 5 March to 20 May, not December to April. CSC is a separate national programme recorded as id 866. AMOUNT: CNY 8,000 is the top published figure, for a doctoral entrant; no official USD conversion exists, so amount_usd_value is 0. HONESTY POINT: this award is far smaller than the old row implied, and the notes say so plainly rather than dressing it up - a student choosing Wuhan University on the strength of this scholarship alone would be badly misled.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 792;

-- ---------------------------------------------------------------------------
-- 586 — HIT. Was: "CSC & HIT Distinguished International Student Scholarship",
-- USD 14 700, "Full Tuition + Stipend". The real scheme pays NO stipend.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'HIT International Students Scholarship',
  provider = 'Harbin Institute of Technology (HIT)',
  coverage_type = 'Tuition Waiver',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = 'Four tiers, all tuition only: Elite waives 100% of tuition, First waives half, Second waives 30% and Third waives 20%. No stipend, no accommodation and no insurance are included.',
  deadline = 'Applications open 1 October and close in mid-July for the following September intake; the 2027 dates are not published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'For the September 2026 intake HIT ran the scholarship window from 1 October 2025 to 15 July 2026. The previous cycle closed on 31 May 2025. The 2027 window is expected to open on 1 October 2026 with a closing date between May and July 2027, and HIT publishes it on its scholarships page.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = 6.0,
  description = 'HIT''s own scholarship is a pure tuition waiver in four tiers - Elite at 100 percent, First at half, Second at 30 percent and Third at 20 percent - for bachelor, master and doctoral entrants alike. There is no monthly stipend, no dormitory place and no insurance in the package, which is worth knowing because HIT does also administer the Chinese Government Scholarship, and that one does pay a stipend; the two are different awards with different conditions and an applicant cannot hold both. The age limits on HIT''s own scheme are stricter than CSC''s and catch people out: under 25 for a bachelor''s, under 30 for a master''s and under 35 for a doctorate. Language is HSK level 4 with a score of at least 210 for Chinese-taught programmes, or TOEFL 78 to 80 and IELTS 6 with no band stated for English-taught ones. Every applicant pays a CNY 600 application fee, which is not refundable and is not accepted through Alipay or WeChat, and must show a deposit certificate of at least CNY 20,000 for bachelor entry or 30,000 for master and doctoral entry. Awards are reviewed every year and a student who fails the review loses the waiver at the start of the next academic year.',
  requirements = 'Be a citizen of a country other than China, in good mental and physical health, willing to abide by Chinese law and HIT regulations, and holding no other scholarship - HIT states plainly that double benefits are not allowed. Respect the age limits: under 25 for a bachelor''s with a high school diploma, under 30 for a master''s with a bachelor degree, under 35 for a doctorate with a master degree. Prove language: HSK level 4 at 210 or above, valid for two years, for Chinese-taught programmes, or TOEFL 78 to 80, IELTS 6 or an equivalent certificate for English-taught ones. Chinese Language and Literature applicants are exempt from the language certificate. Show excellent academic performance. Submit the online application, pay the CNY 600 fee and email the documents to StudyatHIT@hit.edu.cn with the application number in the subject line. The award is reviewed annually on academic performance, attendance, conduct and any rewards or punishments.',
  required_documents = '["Online HIT scholarship application form","Passport information page","Diploma or expected graduation certificate for the relevant level, with notarised translation if not in Chinese or English","Full transcripts for the previous degree","Language certificate (HSK level 4 at 210+, or TOEFL 78-80 / IELTS 6)","Study plan of more than 1,000 words for master and doctoral applicants","Two recommendation letters from professors or associate professors for master and doctoral applicants","Physical Examination Record for Foreigners, issued within six months","Non-criminal record report, issued within six months","Curriculum vitae for bachelor applicants","Remittance voucher for the CNY 600 application fee","Certificate of deposit of at least CNY 20,000 for bachelor entry or CNY 30,000 for master and doctoral entry","Copies of published papers and awards (optional)"]',
  english_requirements = 'English-taught programmes require TOEFL 78 to 80, IELTS 6.0 or an equivalent certificate. Chinese-taught programmes require HSK level 4 with at least 210 points, valid for two years, with an exemption for Chinese Language and Literature applicants.',
  website_url = 'https://en.hit.edu.cn/2025/0530/c11959a238121/page.htm',
  source_url = 'https://en.hit.edu.cn/2025/0530/c11959a238121/page.htm',
  application_url = 'https://hit.at0086.cn/StuApplication',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from HIT''s own HIT International Students Scholarship page (fetched 2026-10-23). CORRECTIONS: the imported record was called "CSC & HIT Distinguished International Student Scholarship", merged the national Chinese Government Scholarship with HIT''s own award, invented USD 14,700, gave a "Dec-Apr" deadline and labelled it full tuition plus stipend. HIT''s own scholarship pays NO stipend at all - it is a tuition waiver of 20, 30, 50 or 100 percent - so the old label was wrong on the most important point, and a student budgeting for a monthly allowance on this award would have been misled. CSC is the separate national programme recorded as id 866, and HIT administers it under university code 10213. The old row''s "Distinguished" name does not appear on HIT''s page either. AMOUNT: no single figure exists because the tiers run from 20 to 100 percent of tuition, and HIT does not publish a programme-by-programme tuition table on this page, so amount_usd_value and award_amount are both left empty rather than given an invented total. DEADLINE: the 2026 intake window closed on 15 July 2026 and the 2027 dates are not out, so the record says not_published. A third-party page describes an older "HIT Scholarship for Outstanding International Students" with a living allowance; that version is not what HIT currently publishes on its own English site, so the record follows the official page.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 586;

-- ---------------------------------------------------------------------------
-- 631 — Nanjing. Was: "CSC, Nanjing Municipal & NJU Silk Road Scholarship",
-- USD 18 000, three degree levels, "Dec-Mar".
-- The NJU Silk Road channel is bachelor only, one major, Belt and Road nationals 18-25.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'CSC Silk Road Program at Nanjing University',
  provider = 'Nanjing University (NJU) with the China Scholarship Council',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 2500,
  award_currency = 'CNY',
  award_period = 'month',
  award_basis = 'fixed',
  funding_type = 'Chinese Government Scholarship, Belt and Road channel',
  tuition_coverage = 'Tuition waived, free lodging in the international dormitory, comprehensive medical insurance of CNY 800 a year, and a monthly stipend of CNY 2,500',
  deadline = 'The 2027 call is not published yet; the last NJU Silk Road cycle closed on 15 March',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Nanjing University opens the Silk Road call in January and closes it in mid-March for the September intake, with the scholarship qualification assessment running from March to May each year. Confirm the 2027 dates on NJU''s Institute for International Students site.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["Chinese Language","Business Chinese"]',
  eligible_countries = '["Belt and Road partner countries"]',
  min_ielts = NULL,
  description = 'This is the Belt and Road channel of the Chinese Government Scholarship as Nanjing University runs it, and it is narrower than the headline suggests. It funds a bachelor''s degree in one specific major, Chinese Language - Business Chinese, at NJU''s Institute for International Students, taught in Chinese. The package is the standard CSC one: tuition waived, free lodging in the international dormitory, comprehensive medical insurance worth CNY 800 a year and a monthly stipend of CNY 2,500. Eligibility is doubly restricted - the applicant must be a national of a country along the Belt and Road, and must be over 18 and under 25 - so the award suits a school leaver from a Belt and Road country rather than a graduate applicant. Uzbekistan appears on the Belt and Road list that Chinese universities publish for this programme, which makes this channel genuinely open to Uzbek applicants, though each university confirms the list for its own call. Scholarship holders sit an annual qualification assessment between March and May, and a student who fails it has the award suspended or cancelled. Note that Nanjing also has a separate Nanjing Municipal Government Scholarship, which is a much smaller city award paid on top rather than a substitute.',
  requirements = 'Be a national of a country on the Belt and Road list used for the call, be older than 18 and younger than 25, and have completed high school. Meet Nanjing University''s admission requirements for the Chinese Language - Business Chinese bachelor programme, which is taught in Chinese and therefore requires Chinese proficiency. Apply twice: once on the CSC portal at studyinchina.csc.edu.cn under programme type B with Nanjing University''s agency number 10284, and once on NJU''s own international student system at istudy.nju.edu.cn with the documents the university asks for. Attend the annual scholarship qualification assessment each March to May if awarded, because failure suspends or cancels the award.',
  required_documents = '["CSC online application form, programme type B, agency number 10284","Nanjing University international student application at istudy.nju.edu.cn","Passport","High school diploma and full transcripts","Chinese language proficiency evidence, HSK certificate where held","Personal statement and recommendation letters as the university requires"]',
  english_requirements = 'The programme is taught in Chinese, so Chinese proficiency is what matters; the call does not set an English score.',
  website_url = 'https://hwxy.nju.edu.cn/English/StudyatNJU/Scholarships/ChineseGovernmentScholarship/20230414/i242760.html',
  source_url = 'https://hwxy.nju.edu.cn/English/StudyatNJU/Scholarships/ChineseGovernmentScholarship/20230414/i242760.html',
  application_url = 'https://istudy.nju.edu.cn/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from Nanjing University''s own English-language call for the Chinese Government Scholarship Silk Road Program (fetched 2026-10-23). CORRECTIONS: the imported record was called "CSC, Nanjing Municipal & NJU Silk Road Scholarship", bundled three things into one row - the national CSC programme, a Nanjing city award and an NJU channel - and gave an invented USD 18,000 with a "Dec-Mar" deadline and all three degree levels. The Silk Road channel at NJU is bachelor only, in one major, for Belt and Road nationals aged 18 to 25; the monthly stipend is CNY 2,500, not a large annual sum. CSC as a whole is recorded separately as id 866, and the Nanjing Municipal Government Scholarship is a separate city award reported by Nanjing Normal University at CNY 20,000 a year for a postgraduate and CNY 10,000 for an undergraduate. AMOUNT: award_amount carries the published monthly stipend of CNY 2,500 because that figure is explicit in the call; amount_usd_value is 0 because no official USD equivalent is published. WHY THIS ROW STILL EARNS ITS PLACE despite being CSC money: it is the specific NJU channel with its own agency number, its own age band and its own country restriction, and Uzbekistan appears on the Belt and Road lists published for this programme, so it is genuinely usable by an Uzbek school leaver.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 631;
