-- ============================================================================
-- Scholarship rewrite pass 45 — France + Mexico
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 574 École des Ponts ParisTech, 576 ENS de Lyon,
--                  679 Tecnológico de Monterrey, 707 UNAM
-- Cards touched  : university_scholarships 269, 268, 197, 88
-- No rows were retired or created in this pass.
--
-- Pages read on 2026-10-25 (provider's own):
--   ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux
--   ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships
--   tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales
--   becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1
--
-- No currency is converted in this pass: EUR and MXN are floating, so
-- amount_usd_value stays 0 and award_amount keeps the provider's currency.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. École des Ponts ParisTech (id 574) — no published award of its own
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'École des Ponts ParisTech International Admission and Funding Routes',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'EUR',
award_period = NULL,
award_basis = 'variable',
deadline = 'No scholarship deadline of its own. The ParisTech international admission campaign opened on 1 June 2024 for the September 2025 intake and the network announces the campaign each year; the funding attached to a place depends on the scheme the student is nominated for',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'The ParisTech network runs one international admission campaign a year for the following September and announces its opening on the school news pages. No separate scholarship calendar is published.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Externally funded: Eiffel, French government and embassy scholarships, Erasmus+, and school foundation bursaries',
tuition_coverage = 'École des Ponts does not publish a scholarship of its own with a stated value. Its own pages list the Fondation des Ponts excellence bursaries for incoming and outgoing mobility, interest-free loans for study abroad, and company bursaries from partners such as Meridiam and the Ibn Rochd Foundation, with eligibility and value set programme by programme. The ParisTech admission route adds that about 35 per cent of admitted international students receive some funding, drawn from Eiffel, French government scholarships, Erasmus+, BRAFITEC and ARFITEC and the school foundations.',
accommodation = 'The school states that all first-time international students have access to its housing stock and to partner student residences in Champs-sur-Marne and Paris, and that it helps with the visa, residence permit, social security, insurance and bank account formalities.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux',
source_url = 'https://ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux',
application_url = 'https://studywithus.paristech.fr/fr',
description = 'The imported record assumed that École des Ponts ParisTech runs an international scholarship worth 25 to 50 per cent of tuition with an April deadline, and the school publishes nothing of the kind. What it publishes is a funding landscape rather than an award. The school page on bursaries and mobility support names the Fondation des Ponts excellence bursaries, which move in both directions, interest-free loans for students who spend part of their course abroad, and company bursaries from industrial partners such as Meridiam and the Ibn Rochd Foundation, and states plainly that the eligibility rules and the characteristics of those bursaries belong to each programme. The wider admission route matters more for a student from Uzbekistan. École des Ponts recruits international students through the ParisTech network, where seven engineering schools run one admission campaign, a candidate submits a single dossier expressing a preference among the schools, and admission is decided by a review of transcripts, a scientific test, a motivation interview and possibly oral science examinations. Admitted students enter directly in the second year of the engineering cycle, which is master level, and the courses are mostly taught in French, so a candidate who does not speak French is expected to show a strong commitment to learning it before arrival. On money, the school own account is that each year about 35 per cent of the students admitted through this route receive a bursary from one source or another, including the Eiffel scholarship, French government bursaries, Erasmus+, the BRAFITEC and ARFITEC agreements and the school foundations. That is a description of how the admitted cohort is funded, not a scholarship that a candidate can apply for on a published date, which is why this record carries no amount and no deadline.',
requirements = 'Hold a bachelor-level qualification in science, technology or engineering, or be in the final year of one, since the ParisTech route takes students into the second year of the engineering cycle at master level. Submit the single ParisTech dossier in the annual campaign, expressing a preference among the participating schools, and go through the full selection: transcripts, a written scientific test, a motivation interview and, where the school asks, oral science examinations. Accept that teaching is mostly in French and demonstrate before arrival a serious commitment to learning French if you do not already speak it. Note that admission to the school and the award of a bursary are separate decisions: Eiffel and the government bursaries are applied for through the institution that nominates the candidate, while the Fondation des Ponts and company bursaries are decided programme by programme, so the funding question must be raised with the programme or the international office rather than with a central scholarship form.',
required_documents = '["Single ParisTech application dossier","Academic transcripts of the bachelor degree or its final year","Curriculum vitae and motivation statement","Evidence of scientific preparation for the written test and interview","Any French language certificate, or an explanation of how French will be learned before arrival"]',
english_requirements = 'Neither the school nor the ParisTech campaign publishes an IELTS or TOEFL threshold. The language of instruction is French, and the school expects a strong commitment to learning it before arrival where the candidate does not speak it.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 6,
notes = 'Rewritten on 2026-10-25 from the school own news page ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux, which describes the ParisTech international admission programme, the single dossier, the selection stages, entry into the second year of the engineering cycle at master level, the French language of instruction, the absence of country quotas, and the statement that about 35 per cent of admitted students receive a bursary from Eiffel, French government scholarships, Erasmus+, the BRAFITEC and ARFITEC agreements or school foundations. The dedicated bursaries page at ecoledesponts.fr/international/etudier-lecole/bourses-et-accompagnement-la-mobilite redirected to a double-degree fact sheet on 2026-10-25 and could not be read directly, so its content about the Fondation des Ponts bursaries, the interest-free mobility loans and the Meridiam and Ibn Rochd company bursaries is drawn from the school own indexed text and is not used as source_url. CORRECTIONS: the row claimed a 25 to 50 per cent tuition scholarship, which the school does not publish; it carried an invented USD 1,250 with award_currency USD; it claimed bachelor, master and doctoral level although the school admits at master level through the engineering cycle and the bachelor does not exist there; it invented an April deadline, an IELTS of 6.5 and a GPA of 3.0; and both URLs were the bare domain. amount_usd_value is 0, award_amount is NULL and coverage_type is Unspecified because no award with a published value exists to describe.',
last_verified_at = '2026-10-25 18:00:00',
last_updated_at = '2026-10-25 18:00:00'
WHERE id = 574;

-- ----------------------------------------------------------------------------
-- 2. ENS de Lyon — Ampère and GRADUATE+ merit scholarships (id 576)
--    EUR 1,000 x 12 months = EUR 12,000, a living stipend, not a fee waiver
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'ENS de Lyon Ampère and GRADUATE+ Merit Scholarships',
coverage_type = 'Living Stipend',
amount_usd_value = 0,
award_amount = 12000,
award_currency = 'EUR',
award_period = 'year',
award_basis = 'fixed',
deadline = '23 January 2026 at 23:59 CET for the 2026-27 call, which has closed; ENS de Lyon states that the 2027-28 calendar will be published in November 2026',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'ENS de Lyon opens the call in mid-November and closes it in the second half of January for the following September, with results in mid-March. The 2026-27 call ran from 14 November 2025 to 23 January 2026.',
expected_opening_period = 'The 2027-28 calendar is published in November 2026.',
degree_levels = '["Master''s"]',
eligible_majors = '["Exact Sciences","Arts","Human and Social Sciences"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Merit scholarship paid monthly for living costs, separate from tuition',
tuition_coverage = 'The scholarships do not waive tuition; French public master fees apply separately. The Ampère scholarship pays EUR 1,000 a month for 12 months, and a student starting in the first master year can ask to renew it for the second year. The GRADUATE+ scholarship, funded under the French government SFRI programme, pays EUR 1,000 a month for 10 months to students admitted to one of the CORE, DynLifeSys, MathInfi or PACE graduate initiatives in either the first or the second master year.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships',
source_url = 'https://www.ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships',
application_url = 'https://www.ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships',
description = 'ENS de Lyon does award real money to international master students, but it is a monthly living allowance rather than a tuition discount, and the imported record got both the currency and the nature of the award wrong. Two schemes run side by side. The Ampère merit scholarship pays EUR 1,000 a month for 12 months to students admitted to a master programme in exact sciences, the arts or the human and social sciences, excluding the FEADéP apprenticeship master programmes and a few others, and a student who starts in the first master year can request a second year. The GRADUATE+ scholarship, financed by the French government SFRI programme, pays EUR 1,000 a month for 10 months to the best international students entering one of four graduate initiatives, CORE in European studies and advanced economics, DynLifeSys in biosciences, MathInfi in mathematics and computer science foundations, and PACE in physics, astronomy, chemistry and earth sciences, which is open at second-year level only. The application mechanics are worth spelling out because they punish carelessness. One online form covers both the master application and the scholarship, three separate forms are published for European students, non-European students with a foreign degree and non-European students with a French degree, and ENS states that an application filed on the wrong form will not be considered, that late applications are not considered, that applications sent by email are not considered and that incomplete applications are not considered. The international student office explicitly refuses to pre-validate a file. The 2026-27 call opened on 14 November 2025, closed on 23 January 2026 at 23:59 CET and released results in mid-March 2026; the school says the 2027-28 calendar will be published in November 2026. There are also country-specific add-ons that do not cover Uzbekistan: students enrolled at a US university can add the Lafayette Fellowship from the French embassy in Washington, worth EUR 1,500 a month for 12 months plus tuition and airfare, and Canada and India have their own embassy schemes.',
requirements = 'Hold a bachelor degree of 180 ECTS, or its equivalent for a degree earned abroad, to apply for the first master year, or a 240-ECTS master year one to apply for the second. Be a non-European applicant without the nationality of an EEA member state, Switzerland, Monaco or Andorra, and have obtained a higher education degree abroad, if applying on the non-European form; ENS publishes separate forms for European applicants and for non-Europeans who already hold a French degree, and an application on the wrong form is discarded. Apply through the single online form, which serves both the master application and the scholarship request, inside the published window, and upload every document in French or English, with an officially certified translation where the original is in another language. Expect no pre-validation: ENS states that the international student office will not check the file in advance and that the responsibility for completeness rests with the candidate. Applications by email, after the deadline or incomplete are not considered. Note that the Ampère award covers the master programmes in exact sciences, the arts and the human and social sciences except the FEADéP programmes, while GRADUATE+ is limited to the CORE, DynLifeSys, MathInfi and PACE initiatives in the first or second master year.',
required_documents = '["Official identity document","Motivation letter","Curriculum vitae","Bachelor degree certificate, in French or English or with a certified translation","University academic transcript, in French or English or with a certified translation","Proof of enrolment for the current year","Programme-specific documents such as a research project, language certificate or recommendation letters"]',
english_requirements = 'ENS de Lyon sets language conditions per master programme and publishes them on its language requirements page, which covers French and English; the scholarship itself adds no separate score.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships, which publishes the Ampère merit scholarship at EUR 1,000 a month for 12 months for master programmes in exact sciences, the arts and the human and social sciences excluding FEADéP, the GRADUATE+ scholarship at EUR 1,000 a month for 10 months for the CORE, DynLifeSys, MathInfi and PACE initiatives in the first or second master year with SFRI funding, the definition of non-European applicants, the three separate application forms, the warning that an application on the wrong form, late, by email or incomplete will not be considered, the refusal of the international student office to pre-validate files, the document list, the 2026-27 calendar of 14 November 2025 to 23 January 2026 with mid-March results, the statement that the 2027-28 calendar will be updated in November 2026, and the Lafayette Fellowship and the Canadian and Indian embassy add-ons. amount_usd_value is 0 because the award is denominated in euro and this dataset does not convert floating currencies; award_amount carries the 12-month Ampère total of EUR 12,000. CORRECTIONS: the row was titled ENS de Lyon Scholarships and described as a 25 to 50 per cent tuition scholarship, while both awards are flat monthly stipends and neither touches tuition; it carried an invented USD 1,000 with award_currency USD, which confused a monthly euro figure with an annual dollar one; it claimed bachelor, master and doctoral level although both schemes are master only; it gave a January deadline without a year or a calendar; it invented an IELTS of 6.5 and a GPA of 3.3; and both URLs were the bare domain. min_ielts and min_gpa are NULL because ENS sets language and academic conditions per programme rather than at scholarship level.',
last_verified_at = '2026-10-25 18:00:00',
last_updated_at = '2026-10-25 18:00:00'
WHERE id = 576;

-- ----------------------------------------------------------------------------
-- 3. Tecnológico de Monterrey — international bursaries (id 679)
--    Every value on the page is a percentage of tuition, so no sum is stored.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Tecnológico de Monterrey Scholarships for International Students',
coverage_type = 'Partial Tuition',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'MXN',
award_period = 'year',
award_basis = 'range',
deadline = 'Each international award has its own annual call for an August start, and the university publishes the dates in that call. No single scholarship deadline applies to all of them',
deadline_type = 'not_published',
deadline_date = NULL,
expected_deadline_period = 'The Tec publishes one call a year for August entry, with admission and bursary registration running from late summer into the following February and results in the spring. The dates are set per call and per campus, so they have to be read from the current call rather than planned from a pattern.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Partial tuition bursaries and educational loans decided during admission',
tuition_coverage = 'The bursaries are percentages of tuition, never a fixed sum. The two awards presented on the international student page are explicitly for students from Latin America: the Beca Socioeconómica LATAM, whose percentage depends on the family economic need, and the Beca al Talento Académico LATAM, worth 30, 40, 50, 60 or 70 per cent of tuition, plus the Beca Líderes del Mañana LATAM, which covers 100 per cent of tuition but is limited to Guatemala, Belize, Honduras, El Salvador, Costa Rica, Panama and the Dominican Republic. The same page lists the athletic, artistic, leadership, entrepreneurial, creative and transformative talent bursaries and external educational loans as routes for international students, and attaches no nationality restriction to them there. The socio-economic route requires the Tec admission test at 1,220 points, or a converted SAT score of 1,320, an accumulated average of at least 85 out of 100, a MXN 750 non-refundable processing fee and a MXN 9,000 tuition advance, or MXN 15,000 for special programmes, on accepting an award.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = 750,
website_url = 'https://tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales',
source_url = 'https://tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales',
application_url = 'http://solicitud.tec.mx/',
description = 'The Tecnológico de Monterrey does give international undergraduates money, but almost nothing on its international student page is open to a student from Uzbekistan, and the imported record hid that behind a single 50 to 75 per cent figure. The page is built around three Latin American awards. The Beca Socioeconómica LATAM is for students from Latin American countries and sets its percentage by the family economic need. The Beca al Talento Académico LATAM is worth 30, 40, 50, 60 or 70 per cent of tuition and runs once a year for August entry. The Beca Líderes del Mañana LATAM covers the whole of tuition but is restricted by name to Guatemala, Belize, Honduras, El Salvador, Costa Rica, Panama and the Dominican Republic. A candidate from Central Asia therefore sits outside all three. What remains on that page are the talent bursaries, athletic, artistic, leadership, entrepreneurial, creative and transformative, and the external educational loan routes, none of which carries a published nationality restriction, and all of which are decided inside the admission process rather than by a separate scholarship form. The mechanics are rigid and worth stating. The applicant must first be admitted through the Tec admission process, then complete the bursary request in a second portal, pay a non-refundable MXN 750 processing fee, sit the Tec admission test at 1,220 points or present a converted SAT score of 1,320, and show an accumulated high school average of at least 85 out of 100 for the socio-economic route. An award of 50 per cent or more carries the right to intensive winter and summer courses and to exchange, and the decision of the bursary committee is final and unappealable. On acceptance, a new student pays a MXN 9,000 tuition advance, which includes the tuition payment insurance premium, or MXN 15,000 for special programmes. Every amount here is a percentage of a tuition that the Tec publishes per campus and per programme, so this record carries no dollar or peso figure.',
requirements = 'Apply for admission to an undergraduate programme at the Tec through the admission portal and be admitted, since the bursaries are decided only after admission. Complete the separate bursary request in the Becas y Apoyos Educativos section of the same application, and pay the MXN 750 processing fee, which is not refundable in any case. Sit the Tec admission test, Prueba de Aptitud Académica, and reach at least 1,220 points, or present an SAT score converted to at least 1,320 points. Show an accumulated average of at least 85 out of 100 at the moment of admission for the socio-economic route, and demonstrate the economic need. If applying to one of the Latin American awards, be a national of a Latin American country, because the Beca Líderes del Mañana LATAM is limited to Guatemala, Belize, Honduras, El Salvador, Costa Rica, Panama and the Dominican Republic and the other two LATAM awards are restricted by name to the region. Recognise that the talent bursaries, athletic, artistic, leadership, entrepreneurial, creative and transformative, are decided on the evidence each call asks for, and that the committee decision is final.',
required_documents = '["Admission application at the Tec portal","Academic transcripts showing the accumulated average","Prueba de Aptitud Académica or converted SAT result","Bursary request in the Becas y Apoyos Educativos section","Proof of the family economic situation where need is claimed","Payment of the MXN 750 processing fee"]',
english_requirements = 'The Tec sets no scholarship-level English score; the language requirement of the chosen programme applies, and Spanish is the language of most teaching.',
rounds = '[]',
recurrence = 'annual',
application_status = 'unknown',
verification_status = 'verified',
source_reliability = 7,
notes = 'Rewritten on 2026-10-25 from tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales, the international student bursary page, which lists the Beca Socioeconómica LATAM for students from Latin American countries, the Beca al Talento Académico LATAM at 30 to 70 per cent of tuition for August entry, the Beca Líderes del Mañana LATAM restricted to Guatemala, Belize, Honduras, El Salvador, Costa Rica, Panama and the Dominican Republic, and the talent bursaries and external educational loans as the other routes open to international students; and which publishes the socio-economic requirements of a 1,220-point admission test or a converted 1,320 SAT, an accumulated average of at least 85 out of 100, the MXN 750 non-refundable processing fee, the MXN 9,000 or 15,000 tuition advance and the finality of the committee decision. amount_usd_value is 0, award_amount is NULL and award_period carries no sum because every value on the page is a percentage of a tuition that varies by campus and programme. CORRECTIONS: the row claimed a 50 to 75 per cent tuition scholarship, a range the Tec does not publish; it carried an invented USD 3,750 with award_currency USD; it claimed bachelor, master and doctoral level although the international bursary page is undergraduate; it invented a February to April deadline, an IELTS of 6.5 and a GPA of 3.3; and both URLs were the bare domain. The critical omission it fixed is that the LATAM awards named on that page are restricted to Latin America, so a candidate from Uzbekistan is outside them and has to rely on the talent bursaries decided in admission.',
last_verified_at = '2026-10-25 18:00:00',
last_updated_at = '2026-10-25 18:00:00'
WHERE id = 679;

-- ----------------------------------------------------------------------------
-- 4. UNAM postgraduate scholarships (id 707)
--    Amount is fixed in UMA (4.5 master, 6.0 doctorate), so no sum is stored.
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'UNAM Postgraduate Scholarships (Elisa Acuña programme)',
coverage_type = 'Living Stipend',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'MXN',
award_period = 'month',
award_basis = 'fixed',
deadline = 'Registration ran from 10 to 14 August 2026 in SIAAPosgrado for the 2027-1 semester, and that window has closed; UNAM issues a call for each semester',
deadline_type = 'range',
deadline_date = NULL,
deadline_range_start = '2026-08-10',
deadline_range_end = '2026-08-14',
expected_deadline_period = 'UNAM issues the postgraduate scholarship call for each semester and announces the registration window a few weeks in advance in the Gaceta UNAM and on the becas portal, with the registration itself squeezed into about five days.',
expected_opening_period = NULL,
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Monthly living stipend from the university, fixed in UMA',
tuition_coverage = 'The scholarship is a living stipend, not a tuition waiver, and UNAM charges its postgraduate fees separately. The amount is fixed in Unidades de Medida de Actualización: 4.5 UMA a month for a master programme and 6.0 UMA a month for a doctorate, paid monthly by electronic transfer, so the peso value follows the UMA index rather than a fixed figure.',
accommodation = '',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1/',
source_url = 'https://www.becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1/',
application_url = 'https://siaap.posgrado.unam.mx/es/accounts/login/',
description = 'UNAM does run a university scholarship for postgraduate study, and it is a monthly living stipend calculated in UMA rather than a tuition discount, which is the opposite of what the imported record assumed. Under the Elisa Acuña bursary programme the Coordination General of Postgraduate Studies awards 4.5 UMA a month to a master student and 6.0 UMA a month to a doctoral student, paid monthly by bank transfer in pesos, so the real value moves with the UMA index and nobody should quote it as a dollar figure. The conditions are narrow. The award is for a newly admitted student who is enrolled full time and on site in one of the master or doctoral programmes listed in the operating rules of that call, who holds no other financial support for the same purpose, and who does not earn income from employment of more than eight hours a week. Registration happens inside a five-day window in the SIAAPosgrado system. For the 2027-1 semester it ran from 10 to 14 August 2026, and UNAM issues a fresh call for each semester in the Gaceta UNAM. The document list is the part a foreign applicant must read before planning. It asks for a certified CURP, which is the Mexican population registry code, and a Mexican tax status certificate where the applicant is registered with the tax authority, alongside a bank statement from the previous three months and, where employed, a certificate stating the weekly hours. Those are documents of a person already inside the Mexican administrative system. So the honest conclusion is that this award is a domestic maintenance grant, and a student from Uzbekistan who reaches UNAM normally funds postgraduate study through the Mexican government excellence scholarships or a UNAM programme-level studentship rather than through this call. UNAM publishes none of this as a percentage of tuition, which is why the record carries no amount in dollars or pesos.',
requirements = 'Be newly admitted and enrolled full time, in the on-site modality, in a master or doctoral programme at UNAM that is listed in the operating rules of the current call. Hold no other financial support for the same purpose, and do not earn income from employment of more than eight hours a week. Register the application in the SIAAPosgrado system inside the published window, which for the 2027-1 semester was 10 to 14 August 2026 and typically lasts about five days. Upload the full document set, which includes official semester enrolment, the degree certificate and transcript for the level below, a personal data sheet and a commitment letter generated by the system, a bank statement from up to three months before registration, a certified CURP, a Mexican tax status certificate where registered with the tax authority, and an employer certificate stating weekly hours where employed. Read the operating rules before applying, because only the programmes listed there take part in that call. A foreign applicant should confirm directly with the programme whether a CURP can be replaced by equivalent national identification, since the published list assumes a Mexican one.',
required_documents = '["Official semester enrolment at UNAM","Degree certificate and transcript for the previous level","Personal data sheet generated by SIAAPosgrado","Signed commitment letter generated by SIAAPosgrado","Bank statement from up to three months before registration","Certified CURP","Mexican tax status certificate where registered with the SAT","Employer certificate stating weekly working hours where employed"]',
english_requirements = 'The scholarship sets no language score; the language requirement of the admitted UNAM postgraduate programme applies, and most teaching is in Spanish.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 8,
notes = 'Rewritten on 2026-10-25 from becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1, the 2027-1 postgraduate scholarship call, which publishes the monthly amounts of 4.5 UMA for a master and 6.0 UMA for a doctorate, the requirement of being newly admitted, full time and on site in a listed programme, the exclusion of anyone holding other support for the same purpose or working more than eight hours a week, the registration window of 10 to 14 August 2026 in SIAAPosgrado, the document list including the certified CURP and the Mexican tax status certificate, and the publication of each call in the Gaceta UNAM. amount_usd_value is 0 and award_amount is NULL because the amount is expressed in UMA, an index the dataset cannot convert without inventing a rate; award_currency is MXN because payment is in pesos. CORRECTIONS: the row was titled UNAM Scholarships for International Students and implied an open international award; it carried an invented USD 250 and described the benefit only as a discount; it claimed bachelor, master and doctoral level although the call is postgraduate only; it invented a May 31 deadline and an IELTS of 6.5 with a GPA of 3.6; and both URLs were the bare domain. Separately, row 343 UNAM International Postgraduate Scholarship is a different instrument, the national research stipend historically associated with CONAHCYT, and it is not the same award: it is left untouched by this pass and is flagged in the pass document as still unverified.',
last_verified_at = '2026-10-25 18:00:00',
last_updated_at = '2026-10-25 18:00:00'
WHERE id = 707;

-- ----------------------------------------------------------------------------
-- 5. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 18:00:00'
FROM (VALUES
 (269, 'École des Ponts ParisTech International Admission and Funding Routes', 'Yes', 'Partial Funding', 'No award of its own; about 35 per cent of admitted international students hold some bursary from Eiffel, government schemes, Erasmus+, BRAFITEC or the school foundations', false, false, 'The school publishes routes rather than one award, and the ParisTech campaign is the way in', 'Admission is at master level through the ParisTech network, entering the second year of the engineering cycle, with courses mostly in French. Selection uses transcripts, a scientific test, a motivation interview and possibly oral exams. Bursaries are decided separately: Eiffel and government bursaries through the nominating institution, and Fondation des Ponts and company bursaries programme by programme. No amount or deadline is published at school level.', 'https://ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux', 'https://ecoledesponts.fr/actualites-evenements/paristech-lance-sa-nouvelle-campagne-dadmission-detudiants-internationaux'),
 (268, 'ENS de Lyon Ampère and GRADUATE+ Merit Scholarships', 'Yes', 'Fully Funded', 'EUR 1,000 a month for 12 months under Ampère, or for 10 months under GRADUATE+, on top of which French public tuition fees apply separately', false, true, 'A monthly living allowance rather than a tuition discount, so it can actually cover the cost of living in Lyon', 'Master level only. Non-European applicants with a degree earned abroad use a dedicated form, and an application on the wrong form, late, by email or incomplete is discarded. Ampère covers exact sciences, the arts and human and social sciences except FEADéP; GRADUATE+ covers the CORE, DynLifeSys, MathInfi and PACE initiatives. The 2026-27 window ran from 14 November 2025 to 23 January 2026 with results in mid-March; the 2027-28 calendar is published in November 2026.', 'https://www.ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships', 'https://www.ens-lyon.fr/en/studies/admissions/application-masters-degrees-and-scholarships'),
 (197, 'Tecnológico de Monterrey Scholarships for International Students', 'Yes', 'Partial Funding', 'Percentages of tuition: 30 to 70 per cent under the academic talent award, need based under the socio-economic award, and 100 per cent under the Latin America only Líderes del Mañana', true, false, 'The talent bursaries are open to international students, but the three named LATAM awards are not open to Central Asia', 'Undergraduate only. Admission comes first, then a separate bursary request with a MXN 750 non-refundable fee and the admission test at 1,220 points or a converted SAT of 1,320, with an accumulated average of at least 85 out of 100 for the socio-economic route. The Beca Líderes del Mañana LATAM is limited to Guatemala, Belize, Honduras, El Salvador, Costa Rica, Panama and the Dominican Republic. On accepting an award the student pays a MXN 9,000 or 15,000 tuition advance.', 'https://tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales', 'https://tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales'),
 (88, 'UNAM Postgraduate Scholarships (Elisa Acuña programme)', 'Yes', 'Partial Funding', '4.5 UMA a month for a master programme and 6.0 UMA a month for a doctorate, paid as a living stipend', false, true, 'A monthly maintenance grant fixed in UMA, not a tuition waiver', 'Postgraduate only, and the document list requires a certified CURP and a Mexican tax status certificate, which makes it a domestic grant. Registration for 2027-1 ran from 10 to 14 August 2026 in SIAAPosgrado. A foreign applicant must confirm with the programme whether equivalent national identification is accepted.', 'https://www.becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1/', 'https://www.becas.unam.mx/2026/08/10/becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;
