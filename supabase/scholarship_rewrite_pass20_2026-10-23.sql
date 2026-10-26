-- Scholarship rewrite pass 20 — 2026-10-23
-- The China cluster, final batch. Closes the cluster: zero template descriptions
-- remain among active Chinese rows.
--
-- Every one of the five rows was named "<University> Chinese Government Scholarship"
-- and described the national CSC programme, not an award the university runs.
-- Four of the five universities do run their own scheme, which is what these rows
-- now describe; HUST does not, so it is retired.
--
-- Rows: 544 BNU · 684 Tianjin · 793 XJTU · 674 SUSTech → rewritten
--       594 HUST                                   → retired
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 544 — Beijing Normal University. Was: "Beijing Normal University Chinese
-- Government Scholarship", USD 6 000, "Dec-Jan".
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'BNU New International Student Scholarship',
  provider = 'Beijing Normal University (BNU)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 2000,
  award_currency = 'CNY',
  award_period = 'month',
  award_basis = 'fixed',
  funding_type = 'University scholarship for new degree students',
  tuition_coverage = 'Tuition waived for the whole duration of the programme, comprehensive medical insurance, and a monthly living allowance that includes an accommodation subsidy',
  deadline = 'Follows the BNU admission brochure for the intake - the university sets the date rather than publishing a fixed scholarship deadline',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'BNU ties the scholarship to the admission round and tells applicants to refer to the latest admission brochure: bachelor applications typically run from December to April and graduate applications from December to March. The 2027 brochures will carry the exact dates.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Beijing Normal University funds its own new international students directly, separately from the Chinese Government Scholarship and the Beijing municipal award, and the package is close to a full ride: tuition waived for the entire duration of the programme, comprehensive medical insurance, and a monthly living allowance that includes an accommodation subsidy. The allowance is CNY 2,000 a month for an undergraduate, 2,500 for a master''s student and 3,000 for a doctoral student, and it runs for four years at undergraduate level, two or three years at master''s level and three years for a doctorate - the award is fixed at admission and cannot be extended if a student falls behind. It is competitive rather than open: an undergraduate applicant should rank in the top 3 percent of the entrance examination or be exempted from it for excellent academic results, and a master''s applicant needs an outstanding bachelor transcript with proven research ability. Holders sit an annual review each May, and failing it suspends the scholarship for a year with one chance to recover.',
  requirements = 'Be a non-Chinese citizen in good health with proper conduct and an outstanding academic record. Undergraduate applicants should rank among the top 3 percent of the entrance examination or be exempt from it on academic merit; master''s applicants need an outstanding bachelor transcript plus a strong academic background and research ability. Apply through BNU''s international student online system, print the application form and submit the documents listed in the admission brochure for the level applied for. Pay the application fee, which BNU sets separately for each programme and which is charged even for scholarship applicants. Once awarded, attend the annual comprehensive review each May, because a first failure suspends the allowance for a year and a second terminates it.',
  required_documents = '["BNU international student online application at international.bnu.edu.cn","Printed application form","Passport","Highest diploma or expected graduation certificate, notarised with translation","Full academic transcripts","Language proficiency evidence for the chosen programme","Study or research plan and recommendation letters as the brochure requires","Physical Examination Record for Foreigners","Certificate of no criminal record","BNU application fee receipt"]',
  english_requirements = 'No English score is set by the scholarship itself. Chinese-taught programmes require HSK and English-taught programmes set their own IELTS or TOEFL threshold in the admission brochure for the programme.',
  website_url = 'https://iso.bnu.edu.cn/en/Pages?cid=505&pid=205',
  source_url = 'https://iso.bnu.edu.cn/en/Pages?cid=505&pid=205',
  application_url = 'https://international.bnu.edu.cn/',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from Beijing Normal University''s own International Students Office page for the BNU New International Student Scholarship and its scholarship overview page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Beijing Normal University Chinese Government Scholarship" and presented the national CSC programme as though it were BNU''s award, with an invented USD 6,000 and a "Dec-Jan" deadline. CSC is recorded separately as id 866 and the Beijing municipal award as id 798. What BNU actually runs itself, and what this row now describes, is the New International Student Scholarship: full tuition, insurance and a monthly allowance of CNY 2,000 / 2,500 / 3,000 by level for the whole duration of the programme. BNU also runs an in-study BNU Scholarship with first and second prizes worth a semester or a year of tuition, and a one-year Beijing Government Scholarship of 25 bachelor, 13 master and 4 doctoral places - neither is given its own record here. AMOUNT: award_amount carries the published monthly undergraduate allowance of CNY 2,000, the lowest of the three tiers, because the tiers differ by level and no single annual total is published; amount_usd_value is 0 because BNU publishes no USD equivalent. DEADLINE: the university deliberately ties this to the admission brochure rather than fixing a date, so the record says not_published.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 544;

-- ---------------------------------------------------------------------------
-- 684 — Tianjin University. Was: "Tianjin University Chinese Government
-- Scholarship", USD 6 000, "Dec-Jan", full tuition with no stipend claim.
-- The city award TJU administers does include a monthly allowance.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Tianjin Government Scholarship at Tianjin University',
  provider = 'Tianjin Municipal Government, administered by Tianjin University',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 20000,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Municipal government scholarship',
  tuition_coverage = 'First prize covers tuition up to CNY 20,000 for a bachelor or 30,000 for a master, adds a monthly living allowance of CNY 1,400 or 1,700 for ten months and comprehensive medical insurance of CNY 800; second prize covers the same tuition ceiling with no allowance',
  deadline = 'The 2026-2027 round has closed; TJU runs the municipal award each autumn for the following September intake',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Tianjin University took applications for the 2025-2026 municipal award from 15 October 2024 to 31 May 2025, with university and municipal review through June and results from July. The 2027 cycle is expected to open in October 2026, and TJU advises scholarship applicants to submit before 1 April because the quota is limited.',
  degree_levels = '["Bachelor''s","Master''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Tianjin University administers the Tianjin Government Scholarship, and it is the city''s money rather than the university''s or the Chinese government''s - which matters, because it is a one-year award that has to be reapplied for every year rather than a package fixed for the whole programme. Bachelor entrants compete for a first prize that covers tuition up to CNY 20,000, adds a living allowance of CNY 1,400 a month for ten months and pays comprehensive medical insurance of CNY 800, or a second prize that covers the same tuition ceiling with no allowance at all. Master students get a higher ceiling of CNY 30,000 and an allowance of CNY 1,700 a month. Annual tuition at TJU is CNY 16,600 for Chinese-taught general programmes, 20,000 for English-taught ones and 26,000 for architecture, software engineering, urban and rural planning and landscape architecture, so a first prize clears most or all of the tuition for the year. The award is open both to prospective students and to students already at TJU, and the university''s International Education School reviews the files on the municipality''s behalf with results released from July.',
  requirements = 'Be a citizen of a country other than China and in good health, and apply for a bachelor or master programme at Tianjin University. Submit the application through the TJU International Student Service System at tju.at0086.cn and, for this award, the separate TJU application form for the Tianjin Government Scholarship, with all documents scanned into one PDF where the older call asked for email submission. Because the quota is limited, TJU advises scholarship applicants to file before 1 April even though the published window runs to the end of May. Language follows the programme: HSK for Chinese-taught degrees and TOEFL 80 or IELTS 6.0 or higher for English-taught ones. Admitted students pay a one-time application fee and a pre-registration deposit, and neither is refunded if the student later withdraws. The award is reapplied for each year, so a holder is not guaranteed the same support in the following year.',
  required_documents = '["TJU online application at tju.at0086.cn","Application Form for Foreigners Wishing to Study at Tianjin University","Application Form for Tianjin Government Scholarship","Passport photocopy","Notarised highest diploma","Notarised academic transcripts","Language proficiency evidence","Personal statement and recommendation letters","Physical Examination Record for Foreigners","Certificate of no criminal record","Proof of financial support"]',
  english_requirements = 'English-taught programmes require TOEFL iBT 80 or IELTS 6.0 or above, or evidence that the previous degree was taught in English. Chinese-taught programmes require HSK; TJU tests language level after registration and a student who fails must take a year of Chinese tutoring at their own expense.',
  website_url = 'https://sie.tju.edu.cn/en/jxj/tjszfjxj/',
  source_url = 'https://sie.tju.edu.cn/en/jxj/tjszfjxj/',
  application_url = 'https://tju.at0086.cn/StuApplication/Login.aspx',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from Tianjin University''s own Tianjin Government Scholarship page on its International Education School site (fetched 2026-10-23), which sets out the first and second prize standards for bachelor and master levels, plus the university''s international admission page describing its scholarship channels. CORRECTIONS: the imported record was called "Tianjin University Chinese Government Scholarship", presented the national CSC programme as a university award, invented USD 6,000 and a "Dec-Jan" deadline, and claimed the award was full tuition without a stipend. The municipal scholarship this row now describes is different in three ways that matter: it is one-year and renewable only by application, the first prize includes a monthly allowance while the second does not, and it covers bachelor and master levels only rather than all three. CSC itself is recorded as id 866. AMOUNT: CNY 20,000 is the published bachelor tuition ceiling from which the prize is calculated, and the allowance is on top; no USD equivalent is published, so amount_usd_value is 0. NOT INCLUDED: TJU also runs its own International Student Scholarship with types A to D (CNY 20,000 / 20,000 / 10,000 / 6,000 tuition subsidies, with a CNY 1,400 monthly allowance on type A) and a Motian scholarship; those are separate records that have not been created yet, and this row does not pretend to cover them.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 684;

-- ---------------------------------------------------------------------------
-- 793 — Xi'an Jiaotong University. Was: "Xi'an Jiaotong University Chinese
-- Government Scholarship", USD 6 000, "Dec-Jan", three degree levels.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'XJTU International Freshman Scholarship (undergraduate)',
  provider = 'Xi''an Jiaotong University (XJTU), School of International Education',
  coverage_type = 'Tuition Waiver',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Merit-based first-year tuition waiver',
  tuition_coverage = 'A tuition waiver for the first year of undergraduate study in five tiers - Highest Honour 100%, First Class 75%, Second Class 50%, Third Class 25% and Merit 10%. No stipend, no accommodation and no insurance are included',
  deadline = 'The 2026 undergraduate round ran from 1 November 2025 to 30 June 2026; the 2027 dates are not published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'XJTU opened international undergraduate applications for 2026 on 1 November 2025 and closed them on 30 June 2026, and the scholarship is decided from the same application rather than a separate one. The 2027 window is expected to open in November 2026, and the university states the scholarship covers the first year only, with the following year judged on university performance.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = 6.0,
  description = 'XJTU''s own freshman scholarship reduces undergraduate tuition for the first year only, in five grades: Highest Honour at 100 percent, First Class at 75, Second Class at 50, Third Class at 25 and Merit at 10 percent. It is not a stipend, it does not cover accommodation or insurance, and from the second year the student is judged on performance at the university rather than on the entrance record, so it functions as an entrance discount rather than a funded place. The award is decided from the ordinary admission application - no separate scholarship form - by ranking the comprehensive review of documents, interview and any examination, and the university decides both whether to award anything and which grade to give, within that year''s seat allocation. There are two other routes worth knowing about and confusing with this one: the Xi''an City Government Belt and Road Scholarship, which pays CNY 15,000 a year to a bachelor entrant, 20,000 to a master''s and 25,000 to a doctoral student from a Belt and Road country and adds 100 percent tuition cover for master and doctoral students; and the Chinese Government Scholarship, which is the national route recorded separately.',
  requirements = 'Be a non-Chinese citizen under 25 with a valid ordinary passport and good health, and hold a high school or senior secondary diploma - or an expected graduation certificate, with the diploma supplied before 1 September of the intake year. Prove language: HSK level 4 or above for a Chinese-taught programme, or IELTS 6.0 or TOEFL 80 for an English-taught one, with an exemption for native speakers approved by XJTU. Sit the China Scholastic Competency Assessment, known as CSCA, and upload the score report, because XJTU requires it from every international undergraduate applicant. Pay the application fee, which is CNY 800 for scholarship applicants and CNY 500 for self-funded ones and is not refundable either way. Application for the Environment Design programme also needs a portfolio of original artwork. Applicants under 18 must supply a guardian authorisation letter.',
  required_documents = '["XJTU online application at isso.xjtu.edu.cn","Notarised senior high school diploma or expected graduation certificate","Notarised high school transcripts with an explanation of the scoring system, plus any national or international standardised test results","HSK, TOEFL or IELTS certificate","CSCA score report","Recommendation letter from the high school headmaster or a teacher, with email, phone and signature","Study plan of at least 600 characters or words","Passport valid at least six months beyond enrolment","Physical Examination Record for Foreigner","Non-criminal record certificate","Application fee receipt, CNY 800 for scholarship applicants"]',
  english_requirements = 'English-taught programmes require IELTS 6.0 or TOEFL 80, or an equivalent certificate recognised by XJTU. Chinese-taught programmes require HSK level 4 or above, and an applicant below that level is steered into the pre-university foundation programme first.',
  website_url = 'https://sie.xjtu.edu.cn/en/info/1119/2943.htm',
  source_url = 'https://sie.xjtu.edu.cn/en/info/1119/2943.htm',
  application_url = 'http://isso.xjtu.edu.cn/recruit/login',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from XJTU''s own International Undergraduate Programs 2026 page (fetched 2026-10-23), which lists the XJTU International Freshman Scholarship tiers directly: Highest Honour 100% tuition waiver, First Class 75%, Second Class 50%, Third Class 25% and Merit 10%, covering the first year of undergraduate study. CORRECTIONS: the imported record was called "Xi''an Jiaotong University Chinese Government Scholarship", presented the national CSC programme as a university award, invented USD 6,000 and a "Dec-Jan" deadline, and claimed three degree levels. The row now describes XJTU''s own entrance award, which is undergraduate and first-year only. CSC is recorded as id 866. AMOUNT: left empty on purpose - the award is a percentage of a tuition figure that differs by programme and by whether it is Chinese- or English-taught, and XJTU does not publish a single comparable total on this page, so a dollar number would be invented. The Xi''an City Government Belt and Road Scholarship (CNY 15,000 / 20,000 / 25,000 by level plus full tuition for master and doctoral students) is described because it is the larger XJTU option and because readers will meet it on every third-party list, but it has not been given a separate record yet. CSCA: XJTU requires the China Scholastic Competency Assessment from undergraduates, which most older guides do not mention.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 793;

-- ---------------------------------------------------------------------------
-- 674 — SUSTech. Was: "SUSTech Scholarships for International Students",
-- USD 8 500, "May-Jun", three degree levels.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'SUSTech President Scholarship and Tuition Waiver Scholarship',
  provider = 'Southern University of Science and Technology (SUSTech)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 68000,
  award_currency = 'CNY',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'University scholarship for undergraduates',
  tuition_coverage = 'The President Scholarship pays CNY 68,000 a year, covering tuition, accommodation, insurance and living expenses for the four-year undergraduate programme; the Tuition Waiver Scholarship pays CNY 30,000 a year towards tuition',
  deadline = 'Decided with the admission round - no separate scholarship application; the 2027 intake dates are not published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'SUSTech considers every offer holder automatically and states the award in the offer letter, so the scholarship has no deadline of its own. Applicants must complete the SUSTech online test and interview, which run alongside the admission rounds; the 2027 undergraduate dates are published on the International Admissions site.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'SUSTech funds its international undergraduates generously and without a separate application: every offer holder who completes the online test and interview is considered automatically, and the award is stated in the offer letter. The President Scholarship pays CNY 68,000 a year and covers tuition, accommodation, insurance and living expenses for all four years, subject to staying in good academic standing; the Tuition Waiver Scholarship pays CNY 30,000 a year, which is exactly the annual tuition. For scale, SUSTech publishes tuition at CNY 30,000 a year, a dormitory place at CNY 7,200, insurance at CNY 800 and a residence permit at about CNY 600, with living costs estimated at CNY 2,500 a month - roughly CNY 68,000 a year in total, which is why the President Scholarship is described as covering everything. There is a trap worth reading twice: a candidate who waives the online test by presenting a strong international standardised test score is NOT eligible for either the President Scholarship or the Tuition Waiver Scholarship, so the shortcut costs the funding. From the second academic year both awards are renewed semester by semester against academic review, and reimbursement awards require the student to pay first.',
  requirements = 'Apply for an undergraduate programme at SUSTech as a non-Chinese citizen, complete the SUSTech online test and the interview, and hold the academic qualifications the programme requires. Do not waive the online test by relying on a standardised international score, because that route forfeits both the President and the Tuition Waiver scholarships. No separate scholarship form is needed and none is accepted - eligibility is assessed from the admission file and the result appears in the offer letter. Once enrolled, maintain good academic standing and pass the semester review to keep the funding. Note that the published SUSTech undergraduate scholarship guide covers undergraduate admissions only; postgraduate funding at SUSTech runs through separate schemes, including the Chinese Government Scholarship and a first-grade scholarship for admitted postgraduate students.',
  required_documents = '["SUSTech online application at sustech.at0086.cn","Passport","High school diploma and transcripts","English proficiency evidence","SUSTech online test result and interview","Physical examination record","Certificate of no criminal record","Any additional documents the programme requests"]',
  english_requirements = 'SUSTech publishes its own English proficiency expectation for admission and teaches in English and Chinese depending on the programme; the scholarship itself sets no separate score.',
  website_url = 'https://infoadmin.sustech.edu.cn/tabcontent?xxlmm=8%2C9',
  source_url = 'https://infoadmin.sustech.edu.cn/tabcontent?xxlmm=8%2C9',
  application_url = 'https://sustech.at0086.cn/StuApplication/Login.aspx',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from SUSTech''s own International Admissions scholarship comparison page (fetched 2026-10-23), which states the President Scholarship at RMB 68,000 per year covering tuition, accommodation, insurance and living expenses for the four-year programme, and the Tuition Waiver Scholarship at RMB 30,000 per year. CORRECTIONS: the imported record was called "SUSTech Scholarships for International Students", invented USD 8,500 and a "May-Jun" deadline, and claimed bachelor, master and doctoral levels. SUSTech''s published undergraduate guide covers undergraduate admissions only, so degree_levels is now bachelor, and the award is decided automatically with the offer rather than through a May-June window. AMOUNT: CNY 68,000 is the published annual value of the President Scholarship; no USD equivalent is published on the official page, so amount_usd_value is 0. THE ELIGIBILITY TRAP is recorded in both the description and here because it is the one detail that silently disqualifies people: waiving the online test with a standardised score removes eligibility for both scholarships. Also noted on the official page: the Chinese Government Scholarship at SUSTech pays RMB 30,000 tuition, RMB 2,500 a month, RMB 7,200 a year housing and RMB 800 insurance, and the Guangdong Provincial scholarship pays RMB 10,000 for one year - neither is given its own record here.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 674;

-- ---------------------------------------------------------------------------
-- 594 — HUST → retired. Its own guides describe no university fund, only CSC.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false,
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicate of the national Chinese Government Scholarship (id 866)',
  deadline = 'Retired 2026-10-23 - HUST''s own scholarship offer is CSC, recorded as id 866',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  website_url = 'https://iso.hust.edu.cn/Scholarships/Chinese_University_Program_CUP_.htm',
  source_url = 'https://iso.hust.edu.cn/Scholarships/Chinese_University_Program_CUP_.htm',
  notes = 'RETIRED 2026-10-23. The imported record was called "Huazhong University of Science and Technology Chinese Government Scholarship", invented USD 5,500 and a "Dec-Jan" deadline, and described nothing but the national Chinese Government Scholarship at one particular university. CSC is recorded once, correctly, as id 866, and it still appears on HUST''s page through the same-country relevance rule. HUST''s own pages confirm the dependency: its 2026 international graduate guide says plainly that "HUST offers full scholarship to excellent applicants under the scheme of Chinese Government Scholarship", and its scholarship pages are organised around CSC channels rather than around a HUST fund. The university does administer several CSC channels with its own agency number 10487 - the Chinese University Program for postgraduates, the Silk Road Program which in 2026 funded two Chinese-taught bachelor programmes, and the Type A bilateral route through embassies - and those are conveniences within CSC, not separate awards. One genuine HUST award existed in the past: the 2024 guide described a one-time HUST President Scholarship of RMB 2,000 to 5,000 for self-funded undergraduates, but the 2026 undergraduate guide no longer mentions it, so it is not presented here as current. HUST charges an application fee of CNY 800 for scholarship applicants and CNY 600 for self-funded ones, and requires the CSCA assessment from undergraduates from 2026 onward.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 594;
