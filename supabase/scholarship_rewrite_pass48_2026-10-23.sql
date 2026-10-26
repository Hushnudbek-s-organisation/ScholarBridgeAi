-- ============================================================================
-- Scholarship rewrite pass 48 — the last five importer-template rows
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 534 Al-Farabi KazNU, 555 Chulalongkorn, 712 Universidad
--                  Nacional de Colombia
-- Rows retired   : 693 UBA (no such scholarship), 777 USP (the university
--                  states that it offers foreign students none)
-- Cards touched  : university_scholarships 185, 177, 178 updated;
--                  161 and 175 -> No
--
-- THIS PASS CLOSES THE IMPORTER-TEMPLATE QUEUE: the count of active rows whose
-- description matches 'offers .*Maximum award:' is now 0, down from 205 when
-- the rewrite arc started.
--
-- Pages read on 2026-10-25 (provider's own):
--   farabi.university/students/inostrannym-studentam?lang=en
--   inter.chula.ac.th/funding-opportunity/40290
--   posgrados.unal.edu.co/becas
--   uba.ar/internacionales/contenido.php?id=430  (indexed text; see note)
--   sites.usp.br/prpg/en/alunos-estrangeiros-2   (indexed text; see note)
--
-- No currency is converted: KZT, THB, COP, ARS and BRL are all floating.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Al-Farabi KazNU (id 534) — the university charges foreign students; the
--    free route is the Ministry state grant.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Kazakhstan Government Scholarship for Foreign Citizens (Al-Farabi KazNU as host)',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'KZT',
award_period = 'year',
award_basis = 'full_tuition',
deadline = 'The Ministry runs the grant competition on its own calendar and the university publishes its separate fee-paying deadlines: 15 May to 30 July for the autumn intake and 16 October to 5 December for the spring intake',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'KazNU registers fee-paying international applicants all year and closes the two intakes on 30 July and 5 December. The Ministry state grant competition follows its own annual calendar and is announced on the ministry portal, not on the university page.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'State educational grant from the Ministry of Education, with the university charging fees to everyone else',
tuition_coverage = 'Three funding situations have to be kept apart, and the imported row merged them. Al-Farabi Kazakh National University admits foreign citizens on a paid basis, and its own international students page says so plainly: registration is open all year, applications are accepted through the university portal, in person or by email, the contract is concluded for the full period of study, and a hundred per cent of one academic year has to be paid within five days of signing. The only tuition-free route the university itself names is the educational grant provided by the Ministry of Education, which is the Kazakhstan Government Scholarship for foreign citizens: it places foreign nationals, including ethnic Kazakhs who are not citizens, at state universities including KazNU, and the scheme is described by the ministry and its higher education development centre as covering tuition, a monthly stipend, a dormitory place and medical insurance for the full programme. The third situation is a private foundation grant: the Kazakhstan Khalkyna foundation allocated ten grants to KazNU, each covering a full bachelor programme up to a ceiling of one million tenge of tuition with the student paying any difference, plus a stipend of forty thousand tenge for ten months a year.',
accommodation = 'A dormitory place is part of the state grant package. A fee-paying student pays for the hostel separately and the university does not bundle it into the tuition figure.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://farabi.university/students/inostrannym-studentam?lang=en',
source_url = 'https://farabi.university/students/inostrannym-studentam?lang=en',
application_url = 'https://univer.kaznu.kz/abiturient_user/register/11',
description = 'The imported record described a single grant of three thousand two hundred dollars with a March to May and August window, and the reality is three separate things that a candidate has to keep apart. First, Al-Farabi Kazakh National University is a fee-paying university for foreign citizens. Its own international students page says that registration is open all year, that applications go through the university portal, in person or by email, that the contract runs for the whole period of study, that a hundred per cent of one academic year must be paid within five days of signing, and that the two intakes close on 30 July for the autumn and 5 December for the spring. There is no mention of a university scholarship for foreign students anywhere in that process. Second, the university names one tuition-free route in a single line: educational grants are provided by the Ministry of Education. That is the Kazakhstan Government Scholarship for foreign citizens, the state scheme that places foreign nationals, including ethnic Kazakhs without Kazakh citizenship, at around three dozen state universities including KazNU, and that the ministry and its higher education development centre describe as covering tuition, a monthly stipend, a dormitory place and medical insurance for the full duration of the programme. It is a national competition, not a university one, and the university page does not carry its dates. Third, a private foundation route exists: the Kazakhstan Khalkyna foundation allocated ten grants to KazNU, each covering an entire bachelor programme with a ceiling of one million tenge of tuition and any excess paid by the student, plus a stipend of forty thousand tenge for ten months a year, with applications taken through the admissions committee in a short August window. For a candidate from Uzbekistan the practical sequence is: apply to KazNU as a fee-paying student inside the July or December deadline if funding is already secured, and treat the Ministry competition as the only realistic source of a free place. The entrance route matters too: bachelor applicants sit a test in general subjects plus a language assessment, master and doctoral applicants sit an oral interview, and the English-taught Healthcare programme requires an IELTS of at least 5.0, a TOEFL iBT of 35, a TOEIC of 550 or a Duolingo score of 80 just to be admitted to the interview.',
requirements = 'Hold a completed secondary certificate for a bachelor programme or a bachelor degree for a master programme, with all diplomas apostilled and translated into Kazakh and notarised inside Kazakhstan. Register through the university portal, in person at the admissions office in Almaty or by email to international@kaznu.kz, and submit the passport copy, the diploma with apostille, the transcript, the application form and, where the programme asks, an IELTS or TOEFL certificate. Sit the entrance test in general education subjects and the language assessment for a bachelor programme, or the oral interview for a master or doctoral programme. Sign the contract for the full period of study and pay one hundred per cent of the first academic year within five days, or secure the Ministry state grant first, since the university does not fund foreign students itself. Note that the English-taught Healthcare programme has its own gate: an IELTS of at least 5.0, a TOEFL iBT of at least 35, a TOEFL ITP of 417, a TOEIC of 550 or a Duolingo score of 80 is mandatory before the interview. Fee-paying applications close on 30 July for the autumn intake and 5 December for the spring intake, while the Ministry grant competition runs on its own separate calendar.',
required_documents = '["Application form addressed to the head of the organisation","Passport copy, translated and notarised in Kazakhstan","Diploma and transcript with apostille, translated into Kazakh and notarised","Two 3x4 colour photographs taken within the last six months","IELTS or TOEFL certificate where the programme asks for one","List of scientific publications where available","Medical certificate and fluorography on arrival"]',
english_requirements = 'The university sets no general English threshold for admission, but the English-taught Healthcare programme requires an IELTS Academic of at least 5.0, a TOEFL iBT of at least 35, a TOEFL ITP of 417, a TOEIC of 550 or a Duolingo English Test of 80 before an applicant is allowed to the interview.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 6,
notes = 'Rewritten on 2026-10-25 from farabi.university/students/inostrannym-studentam?lang=en, the university international students page, which publishes the five-step admission process, the year-round registration with the 15 May to 30 July autumn and 16 October to 5 December spring deadlines, the document list with the apostille and in-country notarisation rule, the entrance test and interview rule, the Healthcare programme English thresholds, the requirement to sign a contract for the full period of study and pay one hundred per cent of the first academic year within five days, and the single line that educational grants are provided by the Ministry of Education. The Kazakhstan Khalkyna foundation grant of ten places at KazNU, with a tuition ceiling of one million tenge and a stipend of forty thousand tenge for ten months, and the state grant package of tuition, stipend, dormitory and medical insurance for foreign citizens, come from the university news pages and from the ministry higher education development centre descriptions of the scheme. The ministry competition portal could not be read directly in this pass, which is why source_reliability is 6 rather than 8 and why no stipend figure is stored. amount_usd_value is 0 and award_amount is NULL because KazNU publishes tuition in tenge per programme and the state grant publishes no single value. CORRECTIONS: the row was titled Kazakhstan Government Scholarship for Central Asia and KazNU Grant and mixed a national competition with a university award; it carried an invented USD 3,200; it invented a March to May and August window against the university own 30 July and 5 December deadlines; it invented an IELTS score and a GPA; and both URLs were the bare domain. The most important thing it got wrong is the premise: KazNU does not give foreign students a scholarship, it charges them, and the free place comes from the ministry competition.',
last_verified_at = '2026-10-25 22:00:00',
last_updated_at = '2026-10-25 22:00:00'
WHERE id = 534;

-- ----------------------------------------------------------------------------
-- 2. Chulalongkorn University — Chula LINK (id 555). Round open until
--    31 October 2026.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Chulalongkorn University Chula LINK Scholarship',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'THB',
award_period = 'year',
award_basis = 'variable',
deadline = '31 October 2026 for the second semester of the 2026 academic year, still open with a week left',
deadline_type = 'fixed',
deadline_date = '2026-10-31',
expected_deadline_period = 'Chulalongkorn opens a Chula LINK round for each semester, one in the spring for the first semester and one in the autumn for the second, and announces each on the international affairs website.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University scholarship for international graduate students',
tuition_coverage = 'Chula LINK covers the tuition fees of the admitted master or doctoral programme, a monthly living allowance and round-trip airfare. The university does not publish the size of the allowance in the call summary, only that the three components are included, so this row carries no figure. A second, older scheme runs alongside it in the Graduate School: the Graduate Scholarship Program for ASEAN or Non-ASEAN Countries, which funds a two-year master or a three-year doctorate, pays airfare with a cap per region and one-way leg, and provides a monthly stipend and accommodation allowance. That programme states a minimum undergraduate grade point average of 2.75, a minimum graduate average of 3.25 and an age limit of 40, and it does not allow the recipient to take off-campus employment in Thailand during the award.',
accommodation = 'Chula LINK does not list accommodation separately; the companion Graduate Scholarship Program for ASEAN or Non-ASEAN Countries includes a monthly stipend and accommodation allowance.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.inter.chula.ac.th/funding-opportunity/40290/',
source_url = 'https://www.inter.chula.ac.th/funding-opportunity/40290/',
application_url = 'https://forms.gle/gU5oe1FgwqZZLXNn9',
description = 'Chulalongkorn does not run a general undergraduate scholarship for international students, and the imported record invented a two thousand dollar award with a January to March deadline. The award that actually exists, and that a student from Uzbekistan can win, is a graduate one. The Chula LINK Scholarship, formally the Chulalongkorn Leaders in International Networks and Knowledge Scholarship, is open to international students who do not hold a Thai passport, who have been admitted to or are already studying in their first semester at Chulalongkorn, and who are enrolled in a master or doctoral programme. It covers three things and states them plainly: the tuition fees, a monthly living allowance and round-trip airfare. The current call is for the second semester of the 2026 academic year, it closes on 31 October 2026, the university lists it as closing soon, and the application is a Google form rather than a portal. The office behind it is the Office of International Affairs and Global Network, which answers questions at int.off@chula.ac.th. Two things are worth knowing before counting on it. First, the university runs a round for each semester, so missing one window means waiting for the next rather than losing the year. Second, a parallel Graduate School scheme, the Graduate Scholarship Program for ASEAN or Non-ASEAN Countries, funds a two-year master or a three-year doctorate with airfare capped by region, a monthly stipend and an accommodation allowance, but it sets academic and age conditions that the LINK call does not mention: a minimum undergraduate average of 2.75, a minimum graduate average of 3.25 and an age ceiling of 40. At undergraduate level the money is faculty-specific and small: some international programmes advertise partial scholarships covering part of the fee, and the Economics programme runs its own fellowship, but there is no university-wide undergraduate award for foreigners.',
requirements = 'Be an international student who does not hold a Thai passport. Be admitted to, or already studying in the first semester of, a master or doctoral programme at Chulalongkorn University, since the scholarship tops up an existing admission rather than granting one. Apply inside the published round through the application form the Office of International Affairs and Global Network publishes, which for the second semester of 2026 closes on 31 October 2026. Expect the award to cover tuition, a monthly living allowance and round-trip airfare, and expect no published figure for the allowance, so plan the budget around the tuition being removed rather than around a known monthly sum. If the Chula LINK round is missed, consider the Graduate School Graduate Scholarship Program for ASEAN or Non-ASEAN Countries instead, which requires a minimum undergraduate average of 2.75, a minimum graduate average of 3.25 and an age of no more than 40, forbids off-campus employment in Thailand during the award, and cannot be deferred or extended. Note that at undergraduate level there is no university-wide scholarship for international students, only programme-level partial awards.',
required_documents = '["Admission to or enrolment in a Chulalongkorn master or doctoral programme","Chula LINK application through the published form","Academic transcripts supporting the admission","Any programme-level documents the call asks for"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Chulalongkorn international programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 8,
notes = 'Rewritten on 2026-10-25 from inter.chula.ac.th/funding-opportunity/40290, the call for the Chula LINK Scholarship for the second semester of the 2026 academic year, which publishes the 31 October 2026 deadline, the closing soon status, the eligibility conditions of not holding a Thai passport and being admitted to or studying in the first semester of a master or doctoral programme, the three components of tuition fees, a monthly living allowance and round-trip airfare, the application form and the contact address of the Office of International Affairs and Global Network. The companion Graduate Scholarship Program for ASEAN or Non-ASEAN Countries, with its airfare caps by region, monthly stipend and accommodation allowance, grade point averages of 2.75 and 3.25, age limit of 40 and the ban on off-campus employment, is described in the university grant gateway document referenced from the same site. amount_usd_value is 0 and award_amount is NULL because the university publishes no figure for the Chula LINK living allowance, and the currency is THB because any stipend would be paid in baht. CORRECTIONS: the row was titled Chulalongkorn University Scholarships for International Students with an invented USD 2,000; it invented a January to March deadline; it claimed bachelor, master and doctoral level although the real award is graduate only and undergraduate funding is programme-level and partial; it invented an IELTS score and a GPA; and both URLs were the bare domain.',
last_verified_at = '2026-10-25 22:00:00',
last_updated_at = '2026-10-25 22:00:00'
WHERE id = 555;

-- ----------------------------------------------------------------------------
-- 3. Universidad Nacional de Colombia (id 712) — an internal system, not an
--    entrance scholarship.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Universidad Nacional de Colombia Postgraduate Scholarships (Beca de Posgrado and fee exemptions)',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'COP',
award_period = 'month',
award_basis = 'variable',
deadline = 'No open competition for an incoming student: the formalisation window for the Grado de Honor route into the 2026-2 semester ran from 15 June to 31 July 2026, and the other internal awards are decided by each faculty after enrolment',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'UNAL publishes a formalisation calendar for each semester on the national postgraduate programmes site, and each faculty sets its own dates for the teaching assistant and fee exemption awards, so the window has to be read per semester rather than planned from an annual date.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Internal university scholarship system and fee exemptions for enrolled students',
tuition_coverage = 'The Beca de Posgrado in its Grado de Honor form exempts the holder from one hundred per cent of the administrative fees and one hundred per cent of the academic fees, and adds a payment per calendar semester of nine legal monthly minimum wages for a specialisation or a master programme, fifteen for a speciality in the health area and fifteen for a doctorate. The teaching assistant and academic fee exemption awards that sit alongside it waive the academic fees in whole or in part, with the assistant award at the Faculty of Science also paying two legal monthly minimum wages for four months of each semester. Every one of these is decided by the faculty or campus council after a student is enrolled, on criteria that include a weighted cumulative average of at least 4.0, no failed subjects and not having exceeded the standard duration of the programme. The university does not publish a single tuition figure because Colombian public universities charge a scaled registration fee rather than a fixed tuition.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://posgrados.unal.edu.co/becas/',
source_url = 'https://posgrados.unal.edu.co/becas/',
application_url = NULL,
description = 'The imported record described an entrance scholarship of a thousand two hundred and fifty dollars with an April to June window, and none of that exists. What exists at the Universidad Nacional de Colombia is an internal scholarship system, the Sistema Nacional de Becas created by agreement 028 of 2010, and every award in it is for students who are already inside the university. The flagship is the Beca de Posgrado in its Grado de Honor form: a student who graduates from a UNAL undergraduate programme with the Grado de Honor distinction receives automatic admission to a postgraduate programme, exemption from one hundred per cent of the administrative and academic fees, and a payment per calendar semester of nine legal monthly minimum wages for a specialisation or master, or fifteen for a health speciality or a doctorate, to be used within a year of the award. Beside it sit the teaching assistant and teaching auxiliary awards, which waive fees and in some faculties pay a monthly sum, and the academic fee exemption award that each faculty regulates itself. The conditions are academic and internal: enrolment in a UNAL programme, a weighted cumulative average above 4.0 for the assistant awards, no failed subjects, no disciplinary sanction and no overrun of the standard duration. For a candidate from Uzbekistan the honest conclusion is that UNAL is not an entrance-scholarship destination. Undergraduate admission runs through a written entrance examination in Spanish that tests the Colombian school curriculum, the free-tuition guarantee known as Puedo Estudiar is tied to Colombian socioeconomic strata and Sisbén registration, and the postgraduate scholarships assume a UNAL transcript. A foreign student can study there, but has to arrive funded.',
requirements = 'Be enrolled in, or have graduated from, a programme at the Universidad Nacional de Colombia, since every internal award in the system assumes that relationship. For the Beca de Posgrado, hold the Grado de Honor distinction from a UNAL undergraduate programme, which brings automatic admission to a postgraduate programme and must be formalised within one year of the award resolution by sending the resolution, the completed registration form and the third-party bank registration to the national scholarship office. For the teaching assistant and auxiliary awards, hold an average above 4.0, have no failed subjects or academic activities, keep at least three registered subjects or credits during the award, have no disciplinary sanction and stay inside the standard duration of the programme. Accept that the criteria for the academic fee exemption are set by each faculty council. A candidate from outside Colombia should understand that admission at undergraduate level requires passing a written entrance examination in Spanish on the Colombian curriculum, and that no award in this system is designed to bring a foreign student in.',
required_documents = '["Proof of the Grado de Honor distinction or of current UNAL enrolment","Resolution granting the scholarship from the campus council, for the Beca de Posgrado","Completed scholarship registration form","Third-party bank registration in the university financial portal","Academic transcript showing the weighted cumulative average","Proof of registration payment each semester to release the payment"]',
english_requirements = 'The scholarship system sets no language score. Teaching at UNAL is in Spanish, and undergraduate admission is by a written entrance examination in Spanish.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 8,
notes = 'Rewritten on 2026-10-25 from posgrados.unal.edu.co/becas, the national postgraduate scholarship office, which publishes the internal and external scholarship structure under agreement 028 of 2010, the Beca de Posgrado in its Grado de Honor form with automatic admission, total exemption from administrative and academic fees and a per-semester payment of nine legal monthly minimum wages for a specialisation or master and fifteen for a health speciality or a doctorate, the formalisation documents and process, the 15 June to 31 July 2026 formalisation window for the 2026-2 semester, and the teaching assistant, teaching auxiliary and academic fee exemption awards with their faculty-level rules. The Faculty of Science assistant award paying two legal monthly minimum wages for four months and the 4.0 average requirement come from the faculty pages that implement the same agreement. The statement that undergraduate admission is by a Spanish-language entrance examination and that the free-tuition guarantee is tied to Colombian socioeconomic strata comes from the university admission sources and from secondary reporting on the Puedo Estudiar programme. amount_usd_value is 0 and award_amount is NULL because every figure is expressed as a multiple of the Colombian minimum wage or as a fee exemption, neither of which converts to a fixed sum without inventing a rate. CORRECTIONS: the row was titled Universidad Nacional de Colombia Scholarships and carried an invented USD 1,250; it invented an April to June window for a system that has no such calendar; it claimed bachelor, master and doctoral level while the scholarship system is postgraduate and the undergraduate route has no scholarship at all; it invented an IELTS score and a GPA; and both URLs were the bare domain.',
last_verified_at = '2026-10-25 23:00:00',
last_updated_at = '2026-10-25 23:00:00'
WHERE id = 712;

-- ----------------------------------------------------------------------------
-- 4. UBA (id 693) — retired: no tuition means no tuition scholarship
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
is_active = false,
title = 'UBA Scholarships for International Students (retired, no such scholarship)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'ARS',
award_basis = 'variable',
deadline = 'No scholarship exists to apply for: undergraduate study at UBA carries no tuition, and the university runs no incoming scholarship for international students',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
degree_levels = '["Bachelor''s"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'None: tuition-free undergraduate study rather than a scholarship',
tuition_coverage = 'Nothing is paid and nothing is awarded. The University of Buenos Aires states in its own guide for foreign students that undergraduate study is free for Argentine citizens and for foreigners alike, and that only postgraduate study carries fees. Because undergraduate tuition is already zero, there is no tuition scholarship for the university to give, and its international office confirms that it has no scholarships for the Study Abroad programme. The becas it does advertise, UBAINT and the mobility and exchange awards, are for students already enrolled at UBA who want to study abroad, and several of them require Argentine nationality.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.uba.ar/internacionales/contenido.php?id=430',
source_url = 'https://www.uba.ar/internacionales/contenido.php?id=430',
application_url = NULL,
description = 'This row was retired because the award it described does not exist and, more importantly, because the premise is inverted. The University of Buenos Aires does not charge undergraduate tuition at all. Its own practical guide for foreign students says so in terms that leave no room for interpretation: undergraduate study at UBA is free for Argentine citizens and for foreigners, and only postgraduate study is fee-paying. A university that charges nothing has no tuition scholarship to offer an international student, and the UBA international office says the same thing from the other direction, that it currently has no scholarships for the Study Abroad programme. The word beca does appear all over the UBA site, but the awards are for UBA students who want to spend a semester abroad: UBAINT gives a single payment in pesos that varies by destination region, the mobility and exchange programmes fund a semester at a partner university, and the social sciences faculty versions explicitly require Argentine nationality. None of that is money for a student arriving from Uzbekistan. One caveat belongs in the record because the legal ground has moved: in 2025 a decree modified the higher education law to reserve free undergraduate study for native Argentines and permanent residents, and to let each university set a fee for other foreign students, so the free-for-all-foreigners position rests on UBA continuing to apply the old rule. A candidate should confirm the fee position with the faculty directly. The honest conclusion is that UBA is a zero-tuition option, not a scholarship option, and a scholarship catalogue should not pretend otherwise.',
requirements = 'There is no scholarship to apply for. A candidate from Uzbekistan who wants to study at UBA at undergraduate level applies for admission through the faculty, presents a secondary certificate validated by the Argentine Ministry of Education, an Argentine DNI, and documents legalised with the Hague apostille or by the Argentine consulate, and pays only the handling fee of the admission file, which the university lists at a nominal peso amount. Postgraduate study is fee-paying and the faculty sets the price, so funding has to come from elsewhere. No IELTS, GPA or age condition is attached because no award exists.',
required_documents = '[]',
english_requirements = 'Not applicable; there is no scholarship. Undergraduate teaching is in Spanish.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 7,
notes = 'RETIRED on 2026-10-25. The decisive sources are the university own guide for foreign students at uba.ar/internacionales/contenido.php?id=430, which states that undergraduate study at UBA is free for Argentine citizens and foreigners and that only postgraduate study carries fees, and the UBA international office FAQ at uba.ar/internacionales/contenido.php?id=593, which answers that there are currently no scholarships for the Study Abroad programme. The beca system on the same site is outbound: uba.ar/becas-activas lists mobility and exchange awards, and the faculty pages for UBAINT and ESCALA describe payments to students already enrolled at UBA, some of which require Argentine nationality. The 2025 caveat about a decree reserving free undergraduate study for natives and permanent residents comes from secondary reporting and is recorded as a caveat, not as a fact about UBA current practice. CORRECTIONS: the row was titled UBA Scholarships for International Students and carried an invented USD 1,300 with a vague October to November window; it invented an IELTS score and a GPA; and both URLs were the bare domain. It is retired rather than rewritten because the correct answer is that no scholarship exists.',
last_verified_at = '2026-10-25 23:00:00',
last_updated_at = '2026-10-25 23:00:00'
WHERE id = 693;

-- ----------------------------------------------------------------------------
-- 5. USP (id 777) — retired: the university itself says it offers none
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
is_active = false,
title = 'USP International Student Scholarships (retired, the university offers none)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'BRL',
award_basis = 'variable',
deadline = 'No scholarship exists to apply for: USP states that it charges foreign students no tuition and therefore offers no scholarships',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = NULL,
degree_levels = '["Bachelor''s"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'None: tuition-free study rather than a scholarship',
tuition_coverage = 'Nothing is charged and nothing is awarded. The University of São Paulo says it in a single line on its own pages for international students, and repeats it across faculties: USP is a public and free institution, it receives foreign students without charging tuition, and therefore it does not offer scholarships. Because tuition is already zero there is no tuition to waive, and the university also states that it has no student housing for students arriving from abroad. The bolsas that do exist are outbound: they pay USP students to spend a period at a partner university abroad, and the inclusion editions are reserved for students who completed all of secondary school in a Brazilian public school.',
accommodation = 'USP states that it has no student housing and does not offer accommodation to students from foreign institutions.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://sites.usp.br/prpg/en/alunos-estrangeiros-2/',
source_url = 'https://sites.usp.br/prpg/en/alunos-estrangeiros-2/',
application_url = NULL,
description = 'This row was retired because the award does not exist and the premise is inverted. The University of São Paulo charges foreign students no tuition, and it says so on its own international pages: USP is a public and free institution, it receives foreign students without charging school fees, and therefore it does not offer scholarships. The same page adds two facts that matter more to a candidate from Uzbekistan than any imaginary award: all activities at USP are conducted in Portuguese, and the university has no student housing and offers no accommodation to students from foreign institutions. The bolsas that fill the USP site are the opposite of what an arriving student needs. The Programa de Bolsas de Intercâmbio Internacional pays enrolled USP undergraduates to study abroad, with per-award caps set by each unit and the latest editals offering R$28,000 for Africa and Asia destinations and R$14,000 for Latin America. The mobility and inclusion editals, including the one on women in postgraduate study and the Latin America edition, are for USP students, and the inclusion editions require the candidate to have completed all of secondary school in a Brazilian public school. None of them is open to a student who has not first enrolled at USP, and even after enrolling the money is for going out, not for coming in. Brazil also runs a genuine national scholarship for foreigners, the PEC-G programme, but it is a separate government scheme administered through the Brazilian cooperation agency rather than a USP award, and it does not appear in this row.',
requirements = 'There is no scholarship to apply for. A student from Uzbekistan reaches USP either as an exchange student under a formal agreement between their home institution and USP, which is free of charge but requires a home institution to nominate them, or by passing the entrance examination in Portuguese as a regular student. Once enrolled, the only funding available is the outbound mobility programme, which pays USP students to study abroad. Everything else has to be funded by the student, including accommodation, because USP provides none for foreign students.',
required_documents = '[]',
english_requirements = 'Not applicable; there is no scholarship, and all teaching and activity at USP is in Portuguese.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 8,
notes = 'RETIRED on 2026-10-25. The decisive source is the university page for international students at sites.usp.br/prpg/en/alunos-estrangeiros-2, which states that USP is a public and free institution, receives foreign students without charging school fees and therefore does not offer scholarships, and that all activities are in Portuguese, and the AUCANI incoming page which repeats that USP accepts exchange students at no cost except in a few paid summer and extension courses. The statement that USP has no housing for foreign students comes from the same family of pages. The outbound bolsa figures of R$28,000 for Africa and Asia and R$14,000 for Latin America come from edital 2242 of the international office, published in August 2026 with applications closed in September 2026, and the inclusion editals 2276 and 2336 restrict eligibility to USP students, the 2336 edition further requiring a Brazilian public secondary education. CORRECTIONS: the row was titled USP International Student Scholarships and carried an invented USD 875 with an October to November window; it invented an IELTS score and a GPA; and both URLs were the bare domain. Retired rather than rewritten because the correct answer is that USP offers foreign students no scholarship at all.',
last_verified_at = '2026-10-25 23:00:00',
last_updated_at = '2026-10-25 23:00:00'
WHERE id = 777;

-- ----------------------------------------------------------------------------
-- 6. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 23:00:00'
FROM (VALUES
 (177, 'Chulalongkorn University Chula LINK Scholarship', 'Yes', 'Fully Funded', 'Tuition fees plus a monthly living allowance and round-trip airfare, with the allowance size not published', true, true, 'A full ride for international graduate students, and the current round is open until 31 October 2026', 'Graduate only: master or doctoral programmes, and the applicant must not hold a Thai passport. The candidate must be admitted to, or already studying in the first semester at, Chulalongkorn. Apply through the published form; the second-semester 2026 round closes on 31 October 2026. The companion Graduate School scheme for ASEAN and non-ASEAN countries funds a two-year master or three-year doctorate with airfare caps, a monthly stipend and an accommodation allowance, and requires a 2.75 undergraduate and 3.25 graduate average with an age limit of 40. There is no university-wide undergraduate award for international students.', 'https://www.inter.chula.ac.th/funding-opportunity/40290/', 'https://www.inter.chula.ac.th/funding-opportunity/40290/'),
 (185, 'Kazakhstan Government Scholarship for Foreign Citizens (Al-Farabi KazNU as host)', 'Yes', 'Fully Funded', 'Tuition, a monthly stipend, a dormitory place and medical insurance under the ministry grant; KazNU itself charges foreign students a full fee', true, true, 'The only free route into KazNU, and it is a national competition rather than a university award', 'KazNU admits foreign citizens on a paid basis only and asks for one hundred per cent of the first academic year within five days of signing the contract. The Ministry of Education grant is the single tuition-free route the university names. Fee-paying deadlines: 30 July for the autumn intake and 5 December for the spring. Bachelor applicants sit a general-subject test plus a language assessment; master and doctoral applicants sit an oral interview. The English-taught Healthcare programme needs IELTS 5.0 or TOEFL iBT 35 before the interview.', 'https://farabi.university/students/inostrannym-studentam?lang=en', 'https://farabi.university/students/inostrannym-studentam?lang=en'),
 (178, 'Universidad Nacional de Colombia Postgraduate Scholarships (Beca de Posgrado and fee exemptions)', 'Yes', 'Fully Funded', 'Total exemption from administrative and academic fees plus nine legal monthly minimum wages a semester for a master or fifteen for a doctorate', true, true, 'Generous, but only for students already inside UNAL', 'Internal system under agreement 028 of 2010, for enrolled or graduating UNAL students. The Grado de Honor route brings automatic admission, an exemption from all administrative and academic fees and a per-semester payment of nine minimum wages for a specialisation or master and fifteen for a health speciality or doctorate, formalised within a year of the award. Other routes require a weighted average above 4.0. Undergraduate admission runs through a written entrance examination in Spanish, and there is no entrance scholarship for a foreign student.', 'https://posgrados.unal.edu.co/becas/', 'https://posgrados.unal.edu.co/becas/'),
 (161, 'UBA Scholarships for International Students (retired, no such scholarship)', 'No', 'Unavailable', 'Retired: UBA charges no undergraduate tuition and runs no incoming scholarship', false, false, 'Retired: there is nothing to apply for', 'RETIRED on 2026-10-25. UBA states that undergraduate study is free for Argentine citizens and foreigners alike and that only postgraduate study carries fees, so there is no tuition for a scholarship to cover. The university international office confirms it has no scholarships for incoming Study Abroad students, and its becas are outbound mobility awards for students already enrolled at UBA, some requiring Argentine nationality. A 2025 decree allows universities to charge non-resident foreigners, so the fee position should be confirmed with the faculty.', 'https://www.uba.ar/internacionales/contenido.php?id=430', 'https://www.uba.ar/internacionales/contenido.php?id=430'),
 (175, 'USP International Student Scholarships (retired, the university offers none)', 'No', 'Unavailable', 'Retired: USP charges foreign students no tuition and states that it therefore offers no scholarships', false, false, 'Retired: there is nothing to apply for', 'RETIRED on 2026-10-25. USP states on its own international pages that it is a public and free institution, receives foreign students without charging school fees and therefore does not offer scholarships, that all activity is in Portuguese, and that it has no student housing for students from abroad. Its bolsas pay enrolled USP students to study abroad, and the inclusion editions require a Brazilian public secondary education.', 'https://sites.usp.br/prpg/en/alunos-estrangeiros-2/', 'https://sites.usp.br/prpg/en/alunos-estrangeiros-2/')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
