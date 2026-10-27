-- ============================================================================
-- Scholarship rewrite pass 47 — remaining singles, part 1
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 590 Hong Kong Baptist University, 535 American University of
--                  Beirut, 690 TU Wien, 553 Charles University
-- Cards touched  : university_scholarships 292, 249, 128, 187
-- No rows retired or created.
--
-- Pages read on 2026-10-25 (provider's own):
--   admissions.hkbu.edu.hk/fees-and-scholarships.html
--   aub.edu.lb/faid/Pages/default.aspx
--   informatics.tuwien.ac.at/study-services/scholarships
--   tuwien.at/en/studies/admission/students-union-fee-and-tuition-fee/tuition-fee
--   mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026
--
-- No currency is converted in this pass: HKD, USD and EUR are all left in the
-- provider's own denomination, so amount_usd_value stays 0.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HKBU (id 590)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'HKBU Admission Scholarship Scheme for Overseas Applicants',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,
award_amount = 295000,
award_currency = 'HKD',
award_period = 'year',
award_basis = 'fixed',
deadline = 'No separate scholarship application: awards are decided at admission, so the operative date is the programme application deadline that HKBU publishes for non-local applicants',
deadline_type = 'automatic',
deadline_date = NULL,
expected_deadline_period = 'HKBU assesses every non-local applicant for an admission scholarship when it processes the admission application, so there is no scholarship calendar of its own.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Merit-based university admission scholarship, awarded without an application',
tuition_coverage = 'Three tiers, all paid as a waiver of the non-local tuition fee of HK$240,000 for the 2027/28 academic year. The Full Scholarship covers the whole HK$240,000 of tuition plus a living subsidy of HK$55,000, so HK$295,000 a year. The Tuition-waiver Scholarship covers the full HK$240,000. The Half Scholarship pays 50 per cent of the full package. Each is tenable for the normal duration of the programme and renewable annually subject to good results. The scheme is assessed on the admission application and needs no separate form. A second route exists through the Hong Kong government Belt and Road Scholarship, for which HKBU nominates outstanding non-local non-mainland admittees from Indonesia, Malaysia, Mongolia, Myanmar, Thailand and other Belt and Road countries; that award covers annual tuition for the normal duration of the programme and is renewable on satisfactory academic performance.',
accommodation = 'Accommodation is not included in the scholarship. On-campus hostel fees for a two-person room run from HK$24,000 to HK$30,000 for nine months, and off-campus accommodation from HK$72,000 to HK$144,000 for twelve months.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://admissions.hkbu.edu.hk/fees-and-scholarships.html',
source_url = 'https://admissions.hkbu.edu.hk/fees-and-scholarships.html',
application_url = 'https://admissions.hkbu.edu.hk/',
description = 'Hong Kong Baptist University does run a real full-tuition scholarship for overseas applicants, and the imported record priced it at 20,000 dollars with a January deadline that belongs to the admission round, not to the scholarship. The scheme is the Admission Scholarship Scheme for Overseas Applicants and it operates in three tiers against a non-local tuition fee of HK$240,000 for the 2027/28 academic year. The Full Scholarship pays the entire HK$240,000 of tuition plus a HK$55,000 living subsidy, HK$295,000 in all. The Tuition-waiver Scholarship pays the whole HK$240,000 of tuition. The Half Scholarship pays half of the full package. What makes the scheme unusually simple is that it needs no application at all: HKBU assesses non-local applicants at the point of admission, on academic merit, non-academic achievement and other criteria the university and its donors set, and the award is renewable for the normal duration of the programme as long as results stay good. There is a second, indirect route worth knowing about. The Hong Kong government Belt and Road Scholarship covers annual tuition and is awarded through nomination, and HKBU nominates outstanding non-local non-mainland admittees from Indonesia, Malaysia, Mongolia, Myanmar, Thailand and other Belt and Road countries, so a candidate from Uzbekistan can be nominated but is not on the named list and should not count on it. The cost of living in Hong Kong is the reason the full package includes a living subsidy: hostel fees for a two-person room run from HK$24,000 to HK$30,000 for nine months and the university estimates total yearly expenses of HK$286,500 to HK$320,000 including tuition, on-campus accommodation and personal spending. At postgraduate level HKBU runs a separate International Postgraduate Scholarship worth a full tuition waiver plus a HK$100,000 living allowance, open to applicants from outside mainland China, Macau and Hong Kong, which is recorded separately rather than merged into this row.',
requirements = 'Apply for admission to a full-time undergraduate programme at HKBU as a non-local applicant, which in Hong Kong means a person entering for education on a student visa, an entry permit, a visa under the Immigration Arrangements for Non-local Graduates, or a dependent visa issued at 18 or older. Present the academic record and the English qualification the chosen programme requires; HKBU sets the English requirement at admission rather than at scholarship level. Submit the admission application inside the round that suits the intended intake, because the scholarship is assessed as part of that application and there is no separate scholarship form. Accept that selection is by university and donor criteria, that there is no fixed quota and that an award is not guaranteed, and that the Full, Tuition-waiver and Half tiers are decided by the university rather than chosen by the applicant. If awarded, keep results at the level the renewal criteria require, since the scholarship is renewed annually for the normal duration of study. Note that the Belt and Road Scholarship requires nomination by HKBU and applies to named countries plus other Belt and Road countries, so it is a possibility rather than a right. Plan the accommodation budget separately, because no tier of the scholarship pays hostel fees.',
required_documents = '["HKBU admission application for a full-time undergraduate programme","Secondary school transcripts and public examination results","English language qualification as the programme requires","Any non-academic achievement evidence the university or a donor may weigh","Student visa or entry permit documentation for non-local status"]',
english_requirements = 'HKBU sets the English requirement at admission programme by programme; the scholarship adds no separate score.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from admissions.hkbu.edu.hk/fees-and-scholarships.html, which publishes the non-local tuition fee of HK$240,000 for 2027/28, the local fee of HK$49,500, the accommodation and personal expense estimates, and the statement that admission scholarships are awarded on academic merit, non-academic achievement and other criteria with no separate application, and which carries the three tiers of the Admission Scholarship Scheme for Overseas Applicants, the Full Scholarship at 100 per cent of the HK$240,000 tuition plus HK$55,000 of living subsidies, the Tuition-waiver Scholarship at the full HK$240,000 and the Half Scholarship at 50 per cent of the full package, renewable for the normal duration subject to good results, together with the Belt and Road Scholarship nomination route for Indonesia, Malaysia, Mongolia, Myanmar, Thailand and other Belt and Road countries. amount_usd_value is 0 because the award is denominated in Hong Kong dollars and this dataset does not convert floating currencies; award_amount carries the full package of HKD 295,000 a year. CORRECTIONS: the row carried an invented USD 20,000; it described a 15 January deadline that is an admission round rather than a scholarship date, when the scheme has no separate application at all; it invented an IELTS score and a GPA; and both URLs were the bare domain. The Hong Kong student visa restriction that nationals of Afghanistan, Cuba and North Korea may not obtain a study visa is noted on the same page and is why the visa question has to be settled early.',
last_verified_at = '2026-10-25 20:00:00',
last_updated_at = '2026-10-25 20:00:00'
WHERE id = 590;

-- ----------------------------------------------------------------------------
-- 2. American University of Beirut (id 535)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'American University of Beirut Need-Based Financial Aid',
coverage_type = 'Partial Funding',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'USD',
award_period = 'year',
award_basis = 'need_based',
deadline = 'The financial aid application opens for a period announced each year on the Office of Financial Aid site, and prospective applicants are emailed the dates and the individual deadline after they submit an admission application',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'AUB opens the financial aid application window for a defined period each year and communicates the individual deadline by email to everyone who has submitted an admission application, so the date has to be read from the financial aid office rather than from a published calendar.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Need-based grant programme with work-study and donor-funded scholarships',
tuition_coverage = 'AUB does not publish a percentage or a maximum. The programme is a need-based grant assessed by the Interfaculty Financial Aid Committee and applied to tuition; the university awarded 47.5 million dollars in need-based grants and merit scholarships in 2021-22 across the whole student body and its own common data set reports an average institutional award of about 7,800 dollars to undergraduate non-resident students in 2021-22. A student who needs more can be recommended for need-based work-study, which requires at least 50 hours a month in a term and is rewarded with 10 per cent of the tuition fee, deducted from the bill. Donor-funded scholarships are also need-based and require the same financial aid application; they add a condition of full-time registration and a minimum average of 2.2 a term, and some require a higher average.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.aub.edu.lb/faid/Pages/default.aspx',
source_url = 'https://www.aub.edu.lb/faid/Pages/default.aspx',
application_url = 'https://www.aub.edu.lb/admissions/applications/Pages/applications.aspx',
description = 'The American University of Beirut does help international students pay, but not with a scholarship of the kind the imported record described: there is no named award with a fixed dollar value and a January deadline. AUB runs a need-based financial aid programme. The Office of Financial Aid assesses the family financial situation through the Interfaculty Financial Aid Committee and awards a grant that is applied to tuition, and the university states that financial circumstances should not become a barrier for applicants who meet its academic criteria. The mechanics are the part a candidate has to plan around. An applicant submits the admission application first and then receives an email from the financial aid office explaining how to access the financial aid application and what the individual deadline is, because the window opens for a defined period that is announced on the financial aid site rather than fixed to a public date. Only admitted students are awarded, and only complete applications are evaluated. Priority goes to undergraduate students seeking a first degree, and full-time graduate students can apply as well. Once awarded, a need-based grant runs for the normal period of study as long as the student stays in good academic standing. Two further routes sit alongside it. A student who still needs money can be recommended for need-based work-study, which asks for at least 50 hours a month during a term and pays 10 per cent of the tuition fee, deducted from the bill. Donor-funded scholarships are also need-based, require the same financial aid application, and add a full-time registration condition and a minimum average of 2.2 a term. The scale is worth putting in context: AUB awarded 47.5 million dollars in need-based grants and merit scholarships in 2021-22 across all students, and its common data set reports an average institutional award of about 7,800 dollars to undergraduate non-resident students in that year, which tells a candidate that the aid is real but rarely full cost. Lebanon also carries a cost-of-living and currency risk that the aid package does not address.',
requirements = 'Submit an admission application to AUB first, since the financial aid process starts from it and only admitted students can be awarded. Watch for the email the Office of Financial Aid sends to every applicant explaining how to access the financial aid application and what the individual deadline is, and complete the application inside the announced window, because only complete applications are evaluated. Demonstrate genuine financial need as assessed by the Interfaculty Financial Aid Committee, since need is the condition of the grant and there is no merit-only route through this programme. Register full time, which the donor-funded scholarships require explicitly and the work-study route requires in practice. Maintain good academic standing for the award to continue through the normal period of study, and a minimum average of 2.2 a term for the donor-funded scholarships, with some donors asking for more. If more money is needed after the grant, ask the financial aid office about need-based work-study, which requires at least 50 hours a month in a term and pays 10 per cent of the tuition fee. Note that AUB participates in the United States Direct Loan programme only for US citizens and permanent residents, so federal loans are not a route for a student from Uzbekistan.',
required_documents = '["AUB admission application","Financial aid application submitted inside the announced window","Documentation of the family financial situation as the Office of Financial Aid requires","Academic records supporting the admission application","Proof of full-time registration where a donor scholarship is involved"]',
english_requirements = 'The financial aid programme sets no language score; the English requirement of the admitted AUB programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 8,
notes = 'Rewritten on 2026-10-25 from aub.edu.lb/faid/Pages/default.aspx, the Office of Financial Aid, which describes the need-based financial aid programme, its undergraduate, graduate and medicine sections, the tuition calculator and the deadlines page; and from the AUB financial aid pages it links, which state that the application opens for a period announced on the site, that applicants receive an email with the process and their individual deadline after submitting an admission application, that only complete applications are evaluated, that only admitted students are awarded, that priority goes to first-degree undergraduates, that the need-based grant is valid for the normal period of study while the student remains in good academic standing, that need-based work-study requires at least 50 hours a month and rewards 10 per cent of tuition, that donor-funded scholarships are need-based and require full-time registration and a 2.2 average, and that the university awarded 47.5 million dollars in need-based grants and merit scholarships in 2021-22. The average award of about 7,800 dollars to undergraduate non-resident students comes from the AUB common data set for 2021-22. amount_usd_value is 0 and award_amount is NULL because AUB publishes no fixed value or percentage: the award is whatever the committee assesses. CORRECTIONS: the row was titled AUB Financial Aid and framed as a scholarship with an invented USD 5,875; it invented a January to February fall deadline and a September to October spring deadline against a process that has no published public date; it invented an IELTS score and a GPA; it claimed bachelor, master and doctoral level when AUB aid covers undergraduate, graduate and medicine with priority to first-degree undergraduates; and both URLs were the bare domain.',
last_verified_at = '2026-10-25 20:00:00',
last_updated_at = '2026-10-25 20:00:00'
WHERE id = 535;

-- ----------------------------------------------------------------------------
-- 3. TU Wien — Helmut Veith Stipend (id 690)
--    No general TU Wien scholarship exists for a new non-EU student; the
--    tuition fee is EUR 726.72 a semester and Uzbekistan is not on the
--    Annex 1 exemption list.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Helmut Veith Stipend (TU Wien)',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,
award_amount = 6000,
award_currency = 'EUR',
award_period = 'year',
award_basis = 'fixed',
deadline = '30 November each year; the next closing date is 30 November 2026',
deadline_type = 'fixed',
deadline_date = '2026-11-30',
expected_deadline_period = NULL,
expected_opening_period = NULL,
degree_levels = '["Master''s"]',
eligible_majors = '["Computer Science"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Private stipend administered through TU Wien Informatics, with a tuition fee waiver',
tuition_coverage = 'The stipend pays EUR 6,000 a year for up to two years and waives the TU Wien tuition fee. That waiver matters because a non-EU student pays EUR 726.72 a semester from the very first semester, plus the ÖH student union fee, and unlike EU students gets no tuition-free period. Two published figures exist for the amount and they do not match: the TU Wien Informatics scholarships page states EUR 6,000 a year for up to two years, while the central TU Wien page for the same award has quoted EUR 7,000 a year, so the exact sum should be confirmed with the award office. Nothing else at TU Wien is open to a new international student from outside the EEA: the merit and funding grants under the Student Support Act require Austrian or EEA status, or a long-term residence permit with five years of residence in Austria, and the completion scholarship is for students already in their final phase. Nationals of the least developed countries listed in Annex 1 of the tuition fee decree are exempt from the fee entirely, but that list runs from Afghanistan to Zambia through Bangladesh, Ethiopia, Nepal and Yemen and does not include Uzbekistan.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://informatics.tuwien.ac.at/study-services/scholarships/',
source_url = 'https://informatics.tuwien.ac.at/study-services/scholarships/',
application_url = 'http://www.vcla.at/helmut-veith-stipend/',
description = 'The imported record pretended that TU Wien runs a general scholarship worth a few hundred dollars with a September and February deadline. It does not run a general scholarship at all, and the honest version of this row is narrower and more useful. Austria charges tuition, and a non-EU student at TU Wien pays EUR 726.72 a semester from the first semester, plus the student union fee, with no tuition-free period; the exemption list for least developed countries does not include Uzbekistan. Against that background the one substantial award open to an international master student is the Helmut Veith Stipend, and it is restricted in two ways that the imported row never mentioned: it is addressed exclusively to female students, and it is for the English-language master programmes of TU Wien Informatics. For a candidate who fits, it is excellent value: EUR 6,000 a year for up to two years and a waiver of the tuition fee on top, which is the difference between paying about EUR 1,453 a year in tuition and paying nothing while receiving a stipend. The call is annual with a 30 November deadline, applications go to the award office address published by Informatics, and the award is named after the Austrian computer scientist Helmut Veith, so the selection looks for a strong mathematical and technical background in his areas, logic, formal methods and computer-aided verification. The other scholarships on the Informatics page are worth understanding precisely because they are mostly closed to a newcomer: the merit scholarship grant of EUR 750 to EUR 1,500 and the funding grant of EUR 750 to EUR 3,600 both sit under the Student Support Act and require Austrian or EEA status or five years of residence in Austria, and the completion scholarship of EUR 3,000 a year assumes a student already in the final phase of a degree.',
requirements = 'Be a female student, since the stipend is addressed exclusively to women. Be admitted to, or already enrolled in, one of the English-language master programmes of TU Wien Informatics; the award is not open to bachelor students or to other faculties. Show a solid mathematical and technical background in at least one of the areas Helmut Veith worked in, which the award page describes as logic, formal methods, verification and computer-aided verification. Apply by 30 November to the address the Informatics scholarships page publishes, using the call on the award website. Budget for the tuition fee at the same time: a non-EU student pays EUR 726.72 a semester plus the student union fee unless a waiver is granted, and the stipend waiver is what removes that cost. Do not count on the other TU Wien schemes: the Student Support Act grants require Austrian or EEA citizenship, or a long-term residence permit and five years of residence in Austria, and the completion scholarship is for students already finishing.',
required_documents = '["Admission to or enrolment in a TU Wien Informatics English-language master programme","Evidence of the mathematical and technical background the award asks for","Curriculum vitae and motivation for the research areas named in the call","Application submitted to the award office by 30 November"]',
english_requirements = 'The stipend sets no score of its own; the English requirement of the admitted TU Wien Informatics master programme applies.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 8,
notes = 'Rewritten on 2026-10-25 from informatics.tuwien.ac.at/study-services/scholarships, which publishes the Helmut Veith Stipend at EUR 6,000 a year for up to two years plus a tuition fee waiver, addressed exclusively to female students enrolled in or admitted to the English-language master programmes, with a 30 November deadline and the award office address, and which also publishes the merit scholarship grant, the funding grant and the completion scholarship with their Student Support Act residence requirements; and from tuwien.at/en/studies/admission/students-union-fee-and-tuition-fee/tuition-fee, which publishes the tuition fee of EUR 726.72 a semester for non-EU nationals from the first semester, the ÖH fee, the temporary exemption categories that require EU, EEA, Swiss or specific residence status, and the general exemption for nationals of the countries in Annex 1 of the tuition fee decree, a list that runs from Afghanistan to Zambia and does not include Uzbekistan. amount_usd_value is 0 because the award is denominated in euro and this dataset does not convert floating currencies. CORRECTIONS: the row was titled TU Wien Scholarships and implied a general award; it carried an invented USD 450 with award_currency USD; it invented a 5 September and 5 February deadline; it claimed bachelor, master and doctoral level although the stipend is master only and female only; it invented an IELTS score and a GPA; and both URLs were the bare domain. The discrepancy between EUR 6,000 and EUR 7,000 is recorded in the row rather than resolved, because the two official TU Wien pages disagree.',
last_verified_at = '2026-10-25 21:00:00',
last_updated_at = '2026-10-25 21:00:00'
WHERE id = 690;

-- ----------------------------------------------------------------------------
-- 4. Charles University — CSTFS (id 553)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Charles University Computer Science Tuition Fee Scholarships (Faculty of Mathematics and Physics)',
coverage_type = 'Tuition Waiver',
amount_usd_value = 0,
award_amount = 7100,
award_currency = 'EUR',
award_period = 'year',
award_basis = 'fixed',
deadline = '30 April 2026 for the 2026/27 intake, now closed; results were due by 31 May 2026',
deadline_type = 'fixed',
deadline_date = '2026-04-30',
expected_deadline_period = 'The Faculty of Mathematics and Physics opens the tuition fee scholarship with the admission round and closes it at the end of April for the following academic year, with decisions by the end of May.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s"]',
eligible_majors = '["Computer Science"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Faculty merit scholarship paid as direct coverage of the tuition fee',
tuition_coverage = 'The scholarship covers the tuition fee directly: EUR 4,200 a year for a student from the EU and EUR 7,100 a year for a student from outside the EU, so over a bachelor programme of three academic years the waiver runs from EUR 4,200 up to EUR 21,600 depending on the programme, the applicant academic performance and the country of origin, and over a two-year master programme it covers 2026/27 and 2027/28. Up to six scholarships are awarded for the bachelor programme and up to two for the master programme. A holder may not be the recipient of any other scholarship or maintenance grant, and the award cannot be transferred to another programme or university. A bachelor holder must finish in three years with at least 60 credits by the end of the first year and 120 by the end of the second; a master holder must finish in two years with at least 60 credits after the first, or the waiver is withdrawn for the rest of the studies.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026',
source_url = 'https://www.mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026',
application_url = NULL,
description = 'Charles University has no central scholarship for international students, and the imported record invented both a four-digit dollar figure and an April 30 deadline without saying which award they belonged to. The honest picture has two layers. The first is a legal fact that dwarfs any scholarship: a programme taught in Czech is free of tuition for any nationality, while a programme taught in English, German, French or Russian charges tuition that Charles University itself puts between EUR 40 and EUR 30,620 a year depending on the programme. The second layer is faculty money, and for a student from Uzbekistan the most useful of those is the Computer Science Tuition Fee Scholarship of the Faculty of Mathematics and Physics, known as CSTFS, which covers the tuition fee directly at EUR 4,200 a year for an EU student and EUR 7,100 a year for a non-EU student. Up to six bachelor and up to two master scholarships are offered, and the bachelor waiver runs for the full three academic years, which is how the value reaches EUR 21,600. The application is unusual and cheap to get wrong: the candidate applies for the Computer Science programme through the university student information system and pays the application fee, then sends a free-form scholarship application by email to the faculty admissions address with the subject line CSTFS application followed by the name, while the two recommendation letters go separately from the referees own professional email addresses on institutional letterhead. The CV, motivation letter, publication list and transcripts are uploaded to the student system instead. The deadline is 30 April, decisions come by 31 May, all entry requirements including the diploma must be documented by the deadline, a holder cannot hold another scholarship, and the dean may decline to award any scholarship at all. Two neighbouring routes are worth naming because they are often confused with this one. The Prague Mathematics Tuition Fee Scholarships in the same faculty work the same way for mathematics programmes. The Faculty of Social Sciences runs FSV UK SCHOLARS, a one-off CZK 75,000 payment towards living costs with no tuition waiver and an April 30 deadline. And the Czech Government Scholarship, which would be the obvious national award, is limited to citizens of a named list of countries that does not include Uzbekistan.',
requirements = 'Apply for the bachelor or master programme in Computer Science at the Faculty of Mathematics and Physics of Charles University, taught in English, for the academic year starting in the autumn, through the university student information system, and pay the application fee. Have not studied in that programme at the faculty before. Meet the entry requirements of the programme and document them, including the diploma, by the application deadline; a final-year candidate may submit proof of the final year and add the diploma when it is awarded. Upload a curriculum vitae, a motivation letter, a list of publications where applicable and transcripts of records to the student system, and send a free-form scholarship application by email to admission@matfyz.cuni.cz with the subject line CSTFS application and the applicant name, since no prescribed form exists. Arrange for two recommendation letters from academic supervisors or an employer to be sent directly by the referees from their professional email addresses, on institutional or organisational letterhead, with the subject line CSTFS recommendation and the applicant name, arriving by the same deadline. Hold no other scholarship or maintenance grant. If awarded, study full time and complete the programme in three years at bachelor level or two at master level, earning at least 60 credits by the end of the first year and 120 by the end of the second at bachelor level, and observe the university code of ethics, since plagiarism or cheating can withdraw the scholarship.',
required_documents = '["Application to the Computer Science programme through the Charles University student information system","Application fee payment","Curriculum vitae, motivation letter, list of publications where applicable, transcripts of records uploaded to the student system","Free-form scholarship application emailed to admission@matfyz.cuni.cz with the CSTFS subject line","Two recommendation letters sent directly by the referees on institutional letterhead"]',
english_requirements = 'The scholarship sets no score of its own; the English requirement of the admitted Computer Science programme applies, and the documents have to be written in or translated into English.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026, the official CSTFS call, which publishes the tuition fee waiver of EUR 4,200 a year for EU and EUR 7,100 a year for non-EU students, the overall range from EUR 4,200 up to EUR 21,600, up to six bachelor and up to two master awards, the coverage years 2026/27 to 2028/29 for bachelor and 2026/27 to 2027/28 for master, the ban on holding another scholarship, the document list, the email subject lines for the application and the recommendation letters, the 30 April 2026 deadline with results by 31 May 2026, the credit thresholds of 60 and 120 and the withdrawal rules. The statement that Czech-taught programmes are free for any nationality while foreign-language programmes charge between EUR 40 and EUR 30,620 a year comes from cuni.cz/UKEN-372.html, the university tuition fee page. amount_usd_value is 0 because the award is denominated in euro and this dataset does not convert floating currencies; award_amount carries the non-EU annual figure of EUR 7,100. CORRECTIONS: the row was titled Charles University Scholarships and carried an invented USD 2,125 with award_currency USD; it claimed bachelor, master and doctoral level while CSTFS is bachelor and master only and other faculty schemes are separate; it invented an IELTS requirement and a GPA; it gave an April 30 deadline without naming the award it belonged to; and both URLs were the bare domain. Also recorded: the Czech Government Scholarship is limited to a named list of countries that does not include Uzbekistan, and the FSV UK SCHOLARS scheme is a CZK 75,000 living cost payment with no tuition waiver.',
last_verified_at = '2026-10-25 21:00:00',
last_updated_at = '2026-10-25 21:00:00'
WHERE id = 553;

-- ----------------------------------------------------------------------------
-- 5. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 21:00:00'
FROM (VALUES
 (292, 'HKBU Admission Scholarship Scheme for Overseas Applicants', 'Yes', 'Fully Funded', 'Full package worth HK$295,000 a year: HK$240,000 of tuition plus HK$55,000 of living subsidy, with tuition-waiver and half tiers below it', true, true, 'A full ride for non-local undergraduates that needs no application at all', 'Open to non-local applicants at entrance, decided with the admission application. Three tiers: Full at HK$240,000 of tuition plus HK$55,000 living subsidy, Tuition-waiver at the full HK$240,000, and Half at 50 per cent of the full package. Renewable for the normal duration subject to good results. Accommodation is not included, at HK$24,000 to HK$30,000 for nine months on campus. The Belt and Road Scholarship is a separate nomination route for named countries and other Belt and Road countries.', 'https://admissions.hkbu.edu.hk/fees-and-scholarships.html', 'https://admissions.hkbu.edu.hk/fees-and-scholarships.html'),
 (249, 'American University of Beirut Need-Based Financial Aid', 'Yes', 'Partial Funding', 'No published cap: a need-based grant assessed by the Interfaculty Financial Aid Committee, with work-study adding 10 per cent of tuition for 50 hours a month', true, false, 'Open to international students, but need is the condition and the average award is modest', 'AUB aid is need-based and requires the financial aid application, which opens for an announced window and is explained by email after the admission application. Only admitted students are awarded and only complete applications are evaluated, with priority to first-degree undergraduates. Full-time registration and good academic standing are required; donor scholarships add a 2.2 average. The average institutional award to undergraduate non-resident students was about 7,800 dollars in 2021-22. US federal loans are for US citizens only.', 'https://www.aub.edu.lb/faid/Pages/default.aspx', 'https://www.aub.edu.lb/faid/Pages/default.aspx'),
 (128, 'Helmut Veith Stipend (TU Wien)', 'Yes', 'Fully Funded', 'EUR 6,000 a year for up to two years plus a waiver of the tuition fee, which is otherwise EUR 726.72 a semester for a non-EU student', true, true, 'The only substantial award open to an international master student at TU Wien, and it is for women in computer science', 'Addressed exclusively to female students admitted to or enrolled in one of the English-language master programmes of TU Wien Informatics. Deadline 30 November each year. A strong mathematical and technical background in logic, formal methods or verification is expected. No other TU Wien scheme is open to a new non-EU student: the Student Support Act grants require Austrian or EEA status or five years of residence, and Uzbekistan is not on the tuition fee exemption list.', 'https://informatics.tuwien.ac.at/study-services/scholarships/', 'https://informatics.tuwien.ac.at/study-services/scholarships/'),
 (187, 'Charles University Computer Science Tuition Fee Scholarships (Faculty of Mathematics and Physics)', 'Yes', 'Partial Funding', 'A direct tuition waiver of EUR 7,100 a year for a non-EU student, or EUR 4,200 for an EU student, worth up to EUR 21,600 over a three-year bachelor programme', true, false, 'The largest faculty award at Charles University for an English-taught programme, and Czech-taught study is free in any case', 'Bachelor and master only, in Computer Science at the Faculty of Mathematics and Physics, taught in English. Up to six bachelor and two master awards. Apply through the student information system with the application fee, then send a free-form scholarship email and two recommendation letters from the referees. Deadline 30 April, decisions by 31 May. Hold no other scholarship, study full time and meet the credit thresholds. Czech-taught programmes are free for any nationality, and the Czech Government Scholarship excludes Uzbekistan.', 'https://www.mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026', 'https://www.mff.cuni.cz/en/admissions/scholarships/cstf-scholarships-2026')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
