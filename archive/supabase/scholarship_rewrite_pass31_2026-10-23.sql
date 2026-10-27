-- ScholarBridgeAi — Scholarship rewrite pass 31 (United States, merit cluster)
-- Verified 2026-10-25 against the providers' own pages (cited in source_url).
-- Convention: amount_usd_value = 0 means "value not published"; award_amount NULL follows the same rule.
-- Four rows are retired in this pass because the provider states international applicants are NOT eligible.

--------------------------------------------------------------------------------------------------
-- 538 Arizona State University — New American University Scholarship, international tiers
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'ASU New American University Scholarship (International)',
  description = 'Arizona State University awards its New American University merit scholarship to international first-year and transfer F-1 students, and the published tiers are the single most useful number an applicant from Uzbekistan can see: USD 17 500 for a GPA of 4.0 or above, USD 15 500 for 3.81 to 3.99, USD 13 500 for 3.41 to 3.80, USD 12 000 for 3.11 to 3.40 and USD 10 000 for 3.01 to 3.10. For a GPA between 3.01 and 3.10 the award is USD 10 000, and below 3.01 no international award is listed. International transfer students have a separate and much smaller ladder - USD 10 000, 8 000, 6 000 or 3 000 depending on GPA and TOEFL. There is no application: ASU reviews admitted international first-year, transfer and graduate students automatically and notifies by email, so the only real deadline is the admission application itself. Two conditions do real damage if missed. First, the scholarship is only for students who remain self- or family-funded - if a student becomes fully sponsored the scholarship is cancelled. Second, the award is paid across eight consecutive semesters for first-year entrants and four for transfers, so a term without 12 credits forfeits that term while still counting against the eight. At the 2026-27 rate an international undergraduate pays USD 39 062 in base tuition and USD 69 906 in total, so the top award covers roughly 45 percent of tuition rather than the full ride the record used to claim.',
  requirements = 'Be an admitted international first-year or transfer student at ASU on an F-1 visa, enrolling on campus full time (12 undergraduate credit hours, at least 9 of them in person). Present a competitive international GPA and English proficiency score; the published tiers run from 3.01 to 4.0 and above. SAT and ACT are not required but may support a higher award. Remain self-funded or family-funded: a student who becomes fully sponsored loses the scholarship. No separate scholarship application is filed - ASU reviews admitted students automatically. Keep 12 credits each fall and spring to be paid in that semester.',
  coverage_type = 'Partial Tuition',
  award_basis = 'range',
  award_amount = 17500,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based institutional scholarship',
  tuition_coverage = 'USD 17 500 a year for a 4.0 GPA and above, stepping down to USD 15 500, 13 500, 12 000 and 10 000 across the published GPA bands, renewable for eight consecutive semesters. Amounts may also vary by campus.',
  english_requirements = 'A competitive English proficiency score is part of the award calculation; ASU lists IELTS 6.5, TOEFL and Duolingo thresholds in its international scholarship charts and the award ladder is read together with the English score.',
  required_documents = '["ASU admission application with official transcripts","English proficiency test score","Financial guarantee or proof of funds","Passport copy","No separate scholarship application is required"]',
  deadline = 'No separate scholarship deadline. ASU reviews admitted international students automatically and awards are made on a rolling basis.',
  deadline_date = NULL,
  deadline_type = 'rolling',
  application_status = 'open',
  website_url = 'https://tuition.asu.edu/new-american-university/international',
  source_url = 'https://tuition.asu.edu/new-american-university/international',
  application_url = 'https://admission.asu.edu/cost-aid/international',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 17500,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the ASU own pages fetched 2026-10-25: tuition.asu.edu/new-american-university/international gives the full international tier table - President-International USD 17 500 at 4.0+, Provost USD 15 500 at 3.81-3.99, Dean USD 13 500 at 3.41-3.80, University USD 12 000 at 3.11-3.40, Academic Achievement USD 10 000 at 3.01-3.10 - the transfer ladder of USD 10 000/8 000/6 000/3 000, the rule that students must remain self- or family-funded or the scholarship is cancelled, the eight-semester and four-semester limits, automatic review without an application, and notification timing; admission.asu.edu/cost-aid/international gives the 2026-27 international costs of USD 39 062 base tuition and USD 69 906 total, and states that the merit scholarship is awarded to a limited number of qualified international undergraduates. CORRECTIONS: the row claimed Full Tuition (100 percent tuition) worth USD 32 000 and listed Bachelor, Master and PhD. ASU publishes a maximum of USD 17 500 for international first-year applicants, which is about 45 percent of the USD 39 062 base tuition rather than 100 percent, so the value was overstated by roughly 80 percent and the coverage type was wrong. This record now carries a published USD figure because ASU is unusual in publishing its international award amounts in dollars. degree_levels was trimmed to Bachelor''s for the first-year ladder that the row describes, and the deadline was replaced with the truth that there is no separate scholarship date.'
WHERE id = 538;

--------------------------------------------------------------------------------------------------
-- 628 Michigan State University — the International Tuition Grant no longer exists; the
-- Non-resident Scholarship replaced it and every admitted international is considered
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'MSU Non-resident Scholarship (International Award Levels)',
  description = 'Michigan State University no longer publishes an International Tuition Grant; the award that replaced it is the MSU Non-resident Scholarship, and every international student admitted to MSU is automatically considered for it. The published levels are USD 18 000 for the President Award, USD 15 000 for the Provost Award, USD 12 000 for the Dean Award, USD 9 000 for the 1855 Scholarship, USD 5 000 for the Beaumont Tower Scholarship and USD 3 000 for the Global Community Scholars Scholarship, all per year in United States dollars. Scholarship decisions are released by mid-February, which matters because it means a student learns the number only after applying. Three additional awards sit alongside it and are easy to overlook. The Honors College Excellence Scholarship pays USD 13 000 a year for eight semesters and is open to non-Michigan residents and international students who are invited to the Honors College, with no separate application. The Professorial Assistantship pays about USD 3 500 a year for eight to ten hours a week of faculty-mentored research, renewable for four semesters, and is offered to a select number of international Honors College invitees. The Red Cedar Scholarship pays USD 1 250 a year to dependants or grandchildren of MSU alumni. A fourth award with similar language, the Honors College Distinction Scholarship, is restricted to United States citizens, permanent residents and citizens of Canada or Mexico and is therefore not open to an applicant from Uzbekistan.',
  requirements = 'Be an incoming first-year applicant with non-United States residency status and be admitted to Michigan State University. The admission application is the only application required for the Non-resident Scholarship levels. To be considered for the Honors College Excellence Scholarship or the Professorial Assistantship you must be invited to the Honors College, which is automatic on application and needs no separate form. Red Cedar requires a family connection to an MSU alumnus or alumna. Note that the Honors College Distinction Scholarship excludes citizens of countries outside the United States, Canada and Mexico.',
  coverage_type = 'Partial Tuition',
  award_basis = 'range',
  award_amount = 18000,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based institutional scholarship',
  tuition_coverage = 'From USD 3 000 to USD 18 000 a year depending on the level awarded, for up to eight consecutive semesters of undergraduate study. No level covers the full cost of attendance.',
  english_requirements = 'The award sets no separate English score; the MSU undergraduate admission English requirement applies.',
  required_documents = '["MSU admission application","Official high school transcripts","English proficiency test score for non-native speakers","Financial statement for the I-20","No separate scholarship application for the Non-resident Scholarship"]',
  deadline = 'No separate scholarship deadline; every admitted international first-year student is considered automatically and decisions are released by mid-February.',
  deadline_date = NULL,
  deadline_type = 'automatic',
  application_status = 'open',
  website_url = 'https://admissions.msu.edu/cost-aid/scholarships/international',
  source_url = 'https://admissions.msu.edu/cost-aid/scholarships/international',
  application_url = 'https://admissions.msu.edu/apply',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 18000,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the MSU Admissions international scholarship page fetched 2026-10-25 (admissions.msu.edu/cost-aid/scholarships/international), which lists the MSU Non-resident Scholarship award levels of USD 18 000, 15 000, 12 000, 9 000, 5 000 and 3 000, states that all international students admitted to MSU are automatically considered and that decisions are released by mid-February, and separately lists the Red Cedar Scholarship at USD 1 250, the Presidential Study Abroad Scholarship at USD 3 000 or 5 000, the Honors College Excellence Scholarship at USD 13 000 for non-Michigan and international Honors invitees, the Professorial Assistantship at about USD 3 500 a year, and the Honors College Distinction Scholarship restricted to United States, Canadian and Mexican citizens. CORRECTIONS: the row was titled MSU International Tuition Grant, which the university no longer publishes, carried an invented USD 28 125, claimed a 50 to 75 percent tuition award, listed all three degree levels and gave a 1 November priority deadline. The real ceiling is USD 18 000 a year against a much larger cost of attendance, the award is undergraduate only, consideration is automatic rather than deadline-driven, and the title now matches the name MSU actually uses. amount_usd_value and award_amount carry the published top level of USD 18 000 because MSU prices the award in dollars.'
WHERE id = 628;

--------------------------------------------------------------------------------------------------
-- 648 Penn State — SIGIA and PSTAG are the only undergraduate international tuition grants
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Penn State SIGIA and PSTAG Tuition Grants (Enrolled International Students)',
  description = 'Penn State has exactly two scholarship funds for undergraduate international students and both of them have a condition that the old record hid: they are for students who are already enrolled and attending. The Special International Grant-in-Aid (SIGIA) and the Penn State Tuition Assistance Grant (PSTAG) are administered through International Student and Scholar Advising, they typically range from USD 100 to USD 2 000, and Penn State states plainly that these are the only tuition scholarships for which undergraduate international students are eligible. SIGIA is open to graduate and undergraduate international students while PSTAG is undergraduate only. Applications go through iStart and are due 15 June for the fall semester and 15 October for the spring semester. Students in their first year at Penn State are not considered, and neither are students below a 2.0 undergraduate or 3.0 graduate GPA, which means a new applicant from Uzbekistan cannot use this money to start a degree - it is money for the second year onward. Awards are made semester by semester and a student may apply every semester, with each decision independent of the last. Selection weighs the severity of financial need, the quality of academic work and the endorsement of the academic adviser. The broader Penn State scholarship pool described on the university costs and aid pages is built around the FAFSA, which a student on an F-1 visa cannot file.',
  requirements = 'Be a non-immigrant international student already attending Penn State; permanent residents are directed to the general student aid process instead. Have completed the first year of study and hold at least a 2.0 cumulative GPA as an undergraduate or 3.0 as a graduate student. Demonstrate financial need with an explanation of the circumstances, and obtain the academic adviser endorsement and supporting documents on the iStart application. Apply by 15 June for the fall semester or 15 October for the spring semester. Apply again in each semester you need the grant, since awards are not carried over.',
  coverage_type = 'Partial Tuition',
  award_basis = 'range',
  award_amount = 2000,
  award_currency = 'USD',
  award_period = 'one_time',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Need-based tuition grant',
  tuition_coverage = 'Typically USD 100 to USD 2 000 per semester for enrolled international students, awarded semester by semester. Not a full tuition waiver.',
  english_requirements = 'The grants set no separate English score; the Penn State admission English requirement applied at entry.',
  required_documents = '["iStart scholarship application","Detailed statement of the financial need","Academic adviser endorsement","Most recent Penn State transcript","Proof of non-immigrant visa status","Original financial guarantee where requested"]',
  deadline = '15 June for the fall semester and 15 October for the spring semester; the next window is 15 June 2027 for fall 2027',
  deadline_date = '2027-06-15',
  deadline_type = 'annual',
  application_status = 'upcoming',
  website_url = 'https://global.psu.edu/page/tuition-grant-information',
  source_url = 'https://global.psu.edu/page/tuition-grant-information',
  application_url = 'https://istart.gp.psu.edu/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 2000,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the Penn State Global tuition grant page fetched 2026-10-25 (global.psu.edu/page/tuition-grant-information), which states that Penn State has tuition grants exclusively for currently enrolled international students, that applications are filed through iStart and are due 15 June for the fall semester and 15 October for the spring semester, that SIGIA and PSTAG are the only tuition scholarships for which undergraduate international students are eligible and typically range from USD 100 to USD 2 000, that first-year students and students below a 2.0 undergraduate or 3.0 graduate GPA are not considered, that awards are made semester by semester, and the selection criteria. CORRECTIONS: the row was titled Penn State Global Programs Scholarship and claimed a 0 to 90 percent discount worth USD 17 100 with a 30 November deadline. There is no such award: Global Programs is an administrative unit, not a scholarship. The real instruments are two small need-based tuition grants capped at about USD 2 000, and the decisive correction is eligibility - they are closed to first-year students, so a school-leaver in Uzbekistan cannot use them. That fact is now stated in the description, the requirements and the deadline note rather than being buried. amount_usd_value and award_amount carry the published ceiling of USD 2 000.'
WHERE id = 648;

--------------------------------------------------------------------------------------------------
-- 681 Texas A&M — international scholarship portfolio, continuing students only
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Texas A&M International Student Scholarships (Continuing Students)',
  description = 'Texas A&M runs a portfolio of awards reserved for international students rather than one big scholarship, and the honest headline is that almost all of them require a student to be already enrolled. The largest single named honour is the George J. Eppright International Student Award, worth at least USD 3 000 a year, given to an international student who has excelled in academics, leadership, service and extracurricular activity, and described by the university as the highest honour bestowed on an international student; it requires two completed semesters at Texas A&M and a 3.0 undergraduate or 3.5 graduate GPR. The International Education Fee Scholarship is need-based and lasts one semester. The Goodman International Scholarship Fund, the Shibata International Memorial Scholarship, the Tina Watkins Scholarship and the Bill and Rita Stout Academic Excellence Award fill out the list, each with its own GPA and semester requirements. Need-based money runs through the Texas Application for State Financial Aid, which replaced the International Student Financial Aid Application from 2026-27, and the International Texas Public Education Grant pays up to USD 4 000 but excludes students in their first academic year on an F-1 visa and excludes J-1 students entirely. Two warnings are published and both cost money: scholarships specifically for international students do not qualify for the non-resident tuition waiver, and the Good Neighbor Program tuition assistance is limited to the Western Hemisphere, so a student from Uzbekistan is not eligible for it.',
  requirements = 'Be an international student currently enrolled at the Texas A&M College Station campus and not sponsored by a government or agency. Complete the University Scholarship Application, including the essay section, which most awards require; the application opens 15 October and closes 1 February for summer and fall awards, and opens 10 September and closes 12 October for spring awards. Submit the Texas Application for State Financial Aid as well if you are applying to a need-based award such as the International Education Fee Scholarship, the Goodman fund or the International Texas Public Education Grant. Meet the individual award requirements, which range from a 2.0 to a 3.0 undergraduate GPR and, for the Eppright award, two completed semesters of study. Note that students in their first academic year on an F-1 visa cannot receive the International Texas Public Education Grant and that J-1 students are excluded from it.',
  coverage_type = 'Partial Funding',
  award_basis = 'range',
  award_amount = 4000,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based and need-based institutional awards',
  tuition_coverage = 'Individual awards rather than one package: the Eppright award is at least USD 3 000 a year, the International Texas Public Education Grant is up to USD 4 000, and the other named awards carry unpublished amounts. None of them is a full ride and none of them qualifies for the non-resident tuition waiver.',
  english_requirements = 'The awards set no separate English score; the Texas A&M admission English requirement applied at entry.',
  required_documents = '["University Scholarship Application with the essay section completed","Texas Application for State Financial Aid (TASFA) for need-based awards","Texas A&M transcript showing completed semesters and GPR","Evidence of leadership, service and extracurricular involvement","Proof of non-immigrant visa status"]',
  deadline = '1 February 2027 for summer and fall awards; 12 October 2026 for spring awards',
  deadline_date = '2027-02-01',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://aggie.tamu.edu/paying-for-college/apply-for-scholarships/international-student-scholarships.html',
  source_url = 'https://aggie.tamu.edu/paying-for-college/apply-for-scholarships/international-student-scholarships.html',
  application_url = 'https://uwide.tamu.edu/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 4000,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the Texas A&M Aggie One Stop international scholarship page fetched 2026-10-25, which states that in most cases international students currently enrolled at College Station who are not sponsored may be considered for university scholarships, gives the University Scholarship Application windows of 15 October to 1 February for summer and fall and 10 September to 12 October for spring, and lists the International Education Fee Scholarship, the George J. Eppright International Student Award at a minimum of USD 3 000, the Goodman International Scholarship Fund, the Shibata International Memorial Scholarship, the Tina Watkins Scholarship, the Bill and Rita Stout Academic Excellence Award and the Good Neighbor Program with its Western Hemisphere restriction; the same page states that scholarships specifically for international students do not qualify for the non-resident tuition waiver and describes the International Texas Public Education Grant at up to USD 4 000 with the first-year F-1 and J-1 exclusions, and that the TASFA replaced the ISFAA from 2026-27. CORRECTIONS: the row claimed a 25 to 50 percent tuition award worth USD 15 375 with a 1 December priority deadline and all three degree levels. There is no single Texas A&M scholarship of that size for international applicants; the real portfolio is a set of named awards, mostly open to continuing students only, whose published maximum is the USD 4 000 International Texas Public Education Grant. The 1 December date was the incoming-freshman scholarship application deadline for a different pool and did not apply to these awards. amount_usd_value and award_amount carry the USD 4 000 published maximum.'
WHERE id = 681;

--------------------------------------------------------------------------------------------------
-- 694 UC Davis — Regents Scholarship, and UC Davis is the campus that lets international
-- applicants into its scholarship pool
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'UC Davis Regents Scholarship',
  description = 'The Regents Scholarship is UC Davis at its most selective: USD 7 500 a year, awarded to specially selected first-year students for four years and to third-year entrants for two, renewable on a 3.25 grade point average, and possibly accompanied by an additional stipend for students with demonstrated financial need. There is no separate application - the UC application for admission and scholarships is the application, and it must be received by the 2 December deadline. What makes UC Davis different from the other University of California campuses on this list is eligibility. UC Davis states in its scholarship FAQ that all undergraduate students - national, international, undocumented and AB540 - are eligible for its scholarships with at least a 3.25 UC cumulative GPA, and the Regents page itself imposes no citizenship condition. The neighbouring campuses do the opposite: UC Santa Barbara, UC Irvine and UC San Diego all require United States citizenship, permanent residency or AB 130 or AB 131 status for the same award. A student from Uzbekistan should therefore treat Davis as the open door and the other campuses as closed. The award also carries practical privileges - priority registration and guaranteed campus housing for the first two years - and a handful of scholarships including Regents and the Provost Award are announced at the moment of admission rather than later in the summer.',
  requirements = 'Apply to UC Davis as a first-year or third-year transfer applicant through the UC application for admission and scholarships by the 2 December deadline. Hold at least a 3.25 UC cumulative GPA for scholarship consideration and maintain 3.25 to renew the Regents award. No separate scholarship application and, unless UC Davis asks, no additional documents are required. International applicants are eligible for the UC Davis campus scholarship pool, unlike at several other UC campuses, and no FAFSA or California Dream Act application is needed to be considered, though filing one is recommended because a small number of awards carry a need component.',
  coverage_type = 'Partial Tuition',
  award_basis = 'fixed',
  award_amount = 7500,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based institutional scholarship',
  tuition_coverage = 'USD 7 500 a year for four years for first-year entrants and two years for third-year entrants, which is a fixed honour rather than a tuition percentage and does not cover the non-resident tuition surcharge. A need-based stipend may be added for students with demonstrated need.',
  english_requirements = 'The award sets no separate English score; the UC Davis undergraduate admission English requirement applies.',
  required_documents = '["UC application for admission and scholarships","High school or college transcripts","Personal insight questions","Letters of recommendation only if UC Davis specifically requests them","No separate scholarship application"]',
  deadline = '2 December 2026 (UC application for admission and scholarships)',
  deadline_date = '2026-12-02',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://financialaid.ucdavis.edu/scholarships/campus/awards/regents',
  source_url = 'https://financialaid.ucdavis.edu/scholarships/campus/awards/regents',
  application_url = 'https://financialaid.ucdavis.edu/frequently-asked-questions/scholarships',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 7500,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from two UC Davis own pages fetched 2026-10-25: financialaid.ucdavis.edu/scholarships/campus/awards/regents states that the Regents Scholarship is USD 7 500, awarded to specially selected first-year and third-year students, renewable on a 3.25 grade point average with good academic standing, possibly accompanied by a stipend for demonstrated financial need, and that incoming applicants are considered on the basis of the UC application for admission and scholarships which must be received by the 2 December deadline with no other documentation unless requested; financialaid.ucdavis.edu/frequently-asked-questions/scholarships states that all undergraduate students - national, international, undocumented and AB540 - are eligible for scholarships with at least a 3.25 UC cumulative GPA, that no FAFSA or CADAA is required to be considered, and that the Regents Scholarship and Provost Award are announced at the time of admission. CORRECTIONS: the row claimed a 25 to 50 percent tuition award worth USD 17 250, listed all three degree levels, and gave a 30 November deadline. The award is a published USD 7 500 a year, undergraduate only, and the application deadline is 2 December. The eligibility point is the valuable part of this rewrite: the same Regents award at UC Santa Barbara is restricted to United States citizens, permanent residents and AB 130 or AB 131 students, so a student who reads only the UC-wide descriptions will wrongly assume all UC campuses are closed. amount_usd_value and award_amount carry the published USD 7 500.'
WHERE id = 694;

--------------------------------------------------------------------------------------------------
-- 706 UMass Amherst — up to USD 16 000 a year, automatic, first-year entrants only
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'UMass Amherst International First-Year Merit Awards',
  description = 'UMass Amherst publishes one clean sentence that most international applicants never find: qualified international first-year undergraduate students are considered for academic-based financial awards of up to USD 16 000 per academic year, there is no separate application, and students are considered automatically once they are admitted. The award exists to recognise high academic achievement from applicants around the world and it is available to undergraduate students only. The university is equally clear about what does not exist: UMass Amherst cannot offer need-based financial assistance to undergraduates from other countries, so an international student must certify sufficient resources for the whole first year, and transfers get nothing - UMass states directly that there are no scholarships for international transfer students. Because the award arrives with the admission decision rather than through an application, the practical work is in the admission file itself: a strong grade trend, a rigorous curriculum and a competitive English score. Note also that international students pay the out-of-state rate, so the top award narrows the gap to the in-state price rather than covering the cost of attendance, and that the university is need-blind in admission, which means applying without funds does not by itself reduce the chance of admission but does not produce aid either.',
  requirements = 'Be an international first-year applicant to UMass Amherst and be admitted; there is no separate scholarship application form. Present strong academic achievement in secondary school, since the awards are academic-based and decided by the Admissions Office during the admission review. Certify sufficient funds for the first calendar year and explain how later years will be funded, because need-based aid is not available to international undergraduates and a FAFSA cannot be filed on an F-1 or J-1 visa. Note that international transfer applicants are not eligible for any scholarship. Undergraduate study only.',
  coverage_type = 'Partial Tuition',
  award_basis = 'variable',
  award_amount = 16000,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based institutional award',
  tuition_coverage = 'Up to USD 16 000 per academic year towards the out-of-state tuition rate, awarded automatically and only to first-year entrants. Not a full tuition award and not available to international transfer students.',
  english_requirements = 'The award sets no separate English score; the UMass Amherst undergraduate admission English proficiency requirement applies.',
  required_documents = '["UMass Amherst admission application","Official secondary school transcripts","English proficiency test score","Financial certification for the first year and a plan for later years","No separate scholarship application"]',
  deadline = 'No separate scholarship deadline; international first-year applicants are considered automatically once admitted.',
  deadline_date = NULL,
  deadline_type = 'automatic',
  application_status = 'open',
  website_url = 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information',
  source_url = 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information',
  application_url = 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 16000,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the UMass Amherst undergraduate admissions financial and visa information page fetched 2026-10-25, which states that UMass Amherst cannot offer financial assistance to undergraduate students from other countries, that international students must certify sufficient resources for the first calendar year, and that the university considers qualified international first-year undergraduate students for a limited amount of academic-based financial awards of up to USD 16 000 per academic year with no separate application required and automatic consideration once admitted, available to undergraduate students only. The companion FAQ for international applicants adds that there are no scholarships for international transfer students. CORRECTIONS: the row claimed a 25 to 50 percent tuition award worth USD 10 000, listed all three degree levels and gave a 15 January priority deadline. The published ceiling is USD 16 000 a year, the award is undergraduate and first-year only, and there is no scholarship deadline at all because consideration is automatic with admission. amount_usd_value and award_amount carry the published USD 16 000 ceiling.'
WHERE id = 706;

--------------------------------------------------------------------------------------------------
-- 708 Morehead-Cain — full cost, four summers, and the October 1 materials deadline
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Morehead-Cain Scholarship (University of North Carolina at Chapel Hill)',
  description = 'The Morehead-Cain is the first merit scholarship programme established in the United States and it is the most complete undergraduate package on this list: tuition, books, room and board and a semester stipend, an optional gap year between secondary school and the first year, a four-year Summer Enrichment Programme built from an Outdoor Leadership summer, a Civic Collaboration summer, a Global Perspective summer and a Professional Experience summer, the opportunity to study abroad for a semester or a summer term, and discovery funds for education outside the classroom. Everything is decided on leadership and character as much as on grades. For an international applicant the route in is the part that decides the outcome: students outside North Carolina, Canada and the United Kingdom must attend a nominating school or affiliate programme and be nominated, and a student whose school is not on that list can only be reached through the Admissions Referral Programme, which requires applying to the University of North Carolina at Chapel Hill under the non-binding Early Action plan by 15 October 2026 so that admissions can flag exceptional international applicants to the Foundation. The competition cycle opens on 15 August 2026 and all application materials are due on 1 October, with semifinalists told in mid-December, finalists in mid-January 2027, a final selection experience from 26 February to 1 March 2027, recipient notification on 5 March 2027 and an acceptance deadline of 5 April 2027. Tests are optional, as UNC is test-optional, and submitting no scores is not a disadvantage.',
  requirements = 'Be a secondary school student within the eligible cohort and be nominated by your school or an affiliate programme, or, if your school is not a nominating school, apply to UNC-Chapel Hill under the non-binding Early Action plan by 15 October 2026 so that the Admissions Referral Programme can consider you. Arrange for your college counsellor to submit the school nomination, which is due to Morehead-Cain by 30 June. Complete the Morehead-Cain application and all materials by 1 October 2026, including the recommendation form, which is usually completed by the college counsellor. SAT, ACT and AP scores are optional and are self-reported if you choose to send them. If admitted elsewhere under a binding Early Decision plan, notify Morehead-Cain immediately, and do not apply binding Early Decision II if that first application fails.',
  coverage_type = 'Full Funding',
  award_basis = 'variable',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  funding_type = 'Merit-based leadership scholarship',
  tuition_coverage = 'Tuition, books, room and board and a semester stipend, plus four fully funded summers, an optional gap year, a study abroad term and discovery funds. The Foundation publishes the components rather than a dollar figure, so no amount is claimed here.',
  english_requirements = 'The award sets no separate English score; the UNC-Chapel Hill undergraduate admission English requirement applies.',
  required_documents = '["School or affiliate programme nomination, submitted by the counsellor by 30 June","Morehead-Cain application","Recommendation form completed by the school counsellor or a teacher","Secondary school transcript","Optional self-reported SAT, ACT or AP scores","Evidence of leadership and community impact"]',
  deadline = '1 October 2026 for all application materials; the cycle opened on 15 August 2026 and the Early Action route for the Admissions Referral Programme closes on 15 October 2026',
  deadline_date = '2026-10-01',
  deadline_type = 'fixed',
  application_status = 'closed',
  website_url = 'https://www.moreheadcain.org/application-eligibility/',
  source_url = 'https://www.moreheadcain.org/application-eligibility/deadlines/',
  application_url = 'https://www.moreheadcain.org/application-eligibility/faqs/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the Morehead-Cain Foundation own pages fetched 2026-10-25: the eligibility page sets out the five routes - North Carolina, out-of-state, Canada, United Kingdom and international - and states that international students attending a nominating school or programme are eligible if nominated and that students outside North Carolina, Canada and the United Kingdom must attend a nominating school or affiliate programme; the deadlines page gives the cycle structure with the application opening on 15 August 2026, all materials due 1 October, semifinalist notification and video interviews in mid-December, finalist notification in mid-January 2027, the Final Selection Experience from 26 February to 1 March 2027, recipient notification on 5 March 2027 and acceptance by 5 April 2027; the about-the-programme page lists the actual benefits - tuition, books, room and board and a semester stipend, an optional gap year, the four-summer enrichment programme with its Outdoor Leadership, Civic Collaboration, Global Perspective and Professional Experience summers, a study abroad term and discovery funds; the FAQs state that the Admissions Referral Programme route requires applying to UNC under the Early Action plan by 15 October 2026, that counsellors submit nominations by 30 June, and that Morehead-Cain follows UNC and is test-optional. CORRECTIONS: the row described the Morehead-Cain as a 25 to 50 percent partial scholarship worth USD 14 625, listed all three degree levels, gave a 15 January regular decision date and pointed at the bare unc.edu domain. Every one of those was wrong. The Morehead-Cain is a full-cost scholarship with four funded summers, it is undergraduate only, its materials are due 1 October, and the only external date that matters is the 15 October Early Action deadline for applicants whose school is not a nominating school. amount_usd_value is 0 because the Foundation publishes components rather than a figure.'
WHERE id = 708;

--------------------------------------------------------------------------------------------------
-- 791 UW-Madison — King-Morgridge: full ride, but Central Asia is not on the country list
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'University of Wisconsin-Madison King-Morgridge Scholars Program',
  description = 'The King-Morgridge Scholars Program is the flagship international undergraduate scholarship at UW-Madison and the most important fact about it for a student from Uzbekistan is a fact of geography: it is open only to students who earned their secondary school credential in Africa, the Caribbean, Latin America, South Asia or Southeast Asia, and Uzbekistan is in none of those regions. The published country lists name more than a hundred countries and Uzbekistan is not among them, so this record is kept for completeness and because the dashboard should be able to tell an applicant that the door is closed rather than leaving them to write an essay for a competition they cannot enter. What the programme offers explains why it is worth knowing about: six scholarships a year, each covering tuition and fees, on-campus room and board, health insurance, airfare and a stipend for miscellaneous expenses for eight semesters, for students committed to poverty alleviation and community development who plan to return home. Applicants must apply to UW-Madison under the fall Early Action plan by 1 November and then complete the separate King-Morgridge application in the Wisconsin Scholarship Hub by 15 November, with decisions released by the end of March; they must be first-year entrants with no prior tertiary education, have received a high school diploma on or after 1 November 2023, and demonstrate a high level of financial need. Other UW-Madison awards for international students are listed in the Wisconsin Scholarship Hub, where incoming scholarships generally open in the fall and close by 1 February.',
  requirements = 'Be an incoming first-year, undergraduate, bachelor degree-seeking student with no prior tertiary education at another institution, and apply to UW-Madison under the fall Early Action plan by 1 November. Earn the secondary school credential from an institution in Africa, the Caribbean, Latin America, South Asia or Southeast Asia - Uzbekistan is NOT on the published list and is therefore not eligible. Demonstrate a high level of financial need and a commitment to poverty alleviation and community development, and plan to return to your home country or region after graduation. Have received a high school diploma or equivalent on or after 1 November 2023 or be in the final year with completion before 1 August 2027. Submit the separate King-Morgridge application, including a 500 to 700 word essay, in the Wisconsin Scholarship Hub by 15 November. Transfer students, graduate students, current UW-Madison students and anyone who already holds a post-secondary degree are excluded.',
  coverage_type = 'Full Funding',
  award_basis = 'need_based',
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Democratic Republic of the Congo","Republic of the Congo","Cote d''Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe","Argentina","Belize","Bolivia","Brazil","Chile","Colombia","Costa Rica","Ecuador","El Salvador","French Guiana","Guatemala","Guyana","Honduras","Mexico","Nicaragua","Panama","Paraguay","Peru","Suriname","Uruguay","Venezuela","Antigua and Barbuda","Bahamas","Barbados","Cuba","Dominica","Dominican Republic","Grenada","Haiti","Jamaica","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Trinidad and Tobago","Afghanistan","Bangladesh","Bhutan","India","The Maldives","Nepal","Pakistan","Sri Lanka","Brunei","Burma (Myanmar)","Cambodia","Indonesia","Laos","Malaysia","Philippines","Singapore","Thailand","Timor-Leste","Vietnam"]',
  funding_type = 'Need-based full-ride scholarship',
  tuition_coverage = 'Full tuition and fees, on-campus room and board, health insurance, airfare and a stipend for miscellaneous expenses for eight semesters. Six scholarships a year. Restricted to secondary school graduates from Africa, the Caribbean, Latin America, South Asia and Southeast Asia, which excludes Uzbekistan.',
  english_requirements = 'The award sets no separate English score; the UW-Madison undergraduate admission English proficiency requirement applies.',
  required_documents = '["UW-Madison undergraduate application submitted under fall Early Action","Secondary school transcript and diploma, dated on or after 1 November 2023","English proficiency test score","Financial need documentation","King-Morgridge application in the Wisconsin Scholarship Hub including a 500 to 700 word essay"]',
  deadline = '15 November 2026 (King-Morgridge application in the Wisconsin Scholarship Hub); UW-Madison Early Action application by 1 November 2026',
  deadline_date = '2026-11-15',
  deadline_type = 'fixed',
  application_status = 'open',
  website_url = 'https://admissions.wisc.edu/international-scholarships/',
  source_url = 'https://admissions.wisc.edu/international-scholarships/',
  application_url = 'https://wisc.academicworks.com/',
  verification_status = 'verified',
  source_reliability = 9,
  amount_usd_value = 0,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Rewritten from the UW-Madison Office of Admissions and Recruitment international scholarships page fetched 2026-10-25, which describes the King-Morgridge Scholars Program as a four-year full-tuition scholarship covering tuition and fees, room and board, health insurance, airfare and a stipend, admits six students a year, requires application under fall Early Action with a separate Wisconsin Scholarship Hub application due 15 November, gives the high school diploma date threshold of 1 November 2023 and the graduation-before-1-August-2027 alternative, lists the eligible countries in five tables - Africa, Latin America, the Caribbean, South Asia and Southeast Asia - and excludes transfer students, graduate students, current UW-Madison students and anyone who has already completed a post-secondary degree; the same page states that other international scholarships are listed in the Wisconsin Scholarship Hub, that incoming scholarships generally open in the fall and close by 1 February, and that F-1 and J-1 students do not qualify for federal or Wisconsin state aid. CORRECTIONS: the row was titled Wisconsin Scholarship for International Students, claimed Full tuition worth USD 39 000, listed all three degree levels and gave a 1 February priority deadline. The award has a real name, a real 15 November deadline and, decisively, a closed country list. eligible_countries now carries the published list of more than a hundred countries, which lets the catalogue tell a student from Uzbekistan that this particular award is out of reach, and the description says so in plain words. amount_usd_value is 0 because the programme publishes components rather than a figure.'
WHERE id = 791;

--------------------------------------------------------------------------------------------------
-- Retirements: four providers state that international applicants are not eligible
--------------------------------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Georgia Institute of Technology - no institutional scholarship for international undergraduates (retired)',
  description = 'Georgia Tech answers this question directly and the answer is no. The Office of Scholarships and Financial Aid states that international students are not eligible for federal or state financial aid programmes and that institutional scholarships administered by that office are often not awarded to international students. What the office offers instead is a private loan requiring a United States citizen or permanent resident co-signer, an emergency tuition loan for students in unforeseen difficulty, and payment plans through the bursar. The old record claimed a full-tuition award worth USD 32 000 with a 50 to 90 percent discount and a 4 January regular decision deadline; Georgia Tech publishes nothing of the kind for international undergraduates, so the record is withdrawn rather than left standing with an authoritative-looking number. Students who still want to look should start at the Office of International Education financial assistance page, which collects external options.',
  coverage_type = 'Unspecified',
  award_basis = 'variable',
  award_amount = NULL,
  award_currency = 'USD',
  amount_usd_value = 0,
  deadline = 'Not published',
  deadline_date = NULL,
  deadline_type = 'not_published',
  website_url = 'https://finaid.gatech.edu/apply/international',
  source_url = 'https://finaid.gatech.edu/apply/international',
  verification_status = 'verified',
  source_reliability = 9,
  is_active = false,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Retired after reading the Georgia Tech Office of Scholarships and Financial Aid international students page fetched 2026-10-25, which states: international students are not eligible for federal or state financial aid programs, and institutional scholarships administered by Georgia Tech Office of Scholarships and Financial Aid are often not awarded to international students. The page then lists only private loans with a United States co-signer, an emergency tuition loan and payment plans. The row it replaces claimed Full tuition with a 50 to 90 percent discount, USD 32 000 and all three degree levels, none of which Georgia Tech publishes. No replacement award was invented; the row is deactivated.'
WHERE id = 580;

UPDATE scholarships SET
  title = 'Ohio State University - no university merit scholarships for international students (retired)',
  description = 'Ohio State is unusually explicit: the merit scholarships page states that incoming first-year students to the Columbus campus compete for university-funded merit-based scholarships and that international students are not eligible. The same page restricts the Stamps Eminence Scholarship and the Morrill Scholarship Program to United States citizens and permanent residents, and the President Ohio Scholarship Program to Ohio residents. The Office of International Affairs money that is open to international students is emergency or study-abroad funding rather than degree funding, and the university scholarship application behind most of the aid requires a FAFSA, which cannot be filed on an F-1 visa. The old record claimed a 25 to 50 percent tuition award worth USD 9 000 with a 1 February priority deadline; there is no such award for an applicant from Uzbekistan, so the record is withdrawn rather than renumbered.',
  coverage_type = 'Unspecified',
  award_basis = 'variable',
  award_amount = NULL,
  award_currency = 'USD',
  amount_usd_value = 0,
  deadline = 'Not published',
  deadline_date = NULL,
  deadline_type = 'not_published',
  website_url = 'https://undergrad.osu.edu/cost-and-aid/merit-based-scholarships',
  source_url = 'https://undergrad.osu.edu/cost-and-aid/merit-based-scholarships',
  verification_status = 'verified',
  source_reliability = 9,
  is_active = false,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Retired after reading the Ohio State merit scholarships page fetched 2026-10-25, which states in its first bullet that incoming first-year students to the Columbus campus compete for university-funded merit-based scholarships and that international students are not eligible. The same page limits Stamps Eminence and the Morrill Scholarship Program to United States citizens and permanent residents. The retired row claimed a 25 to 50 percent tuition award worth USD 9 000, all three degree levels and a 1 February priority deadline, none of which exists for international applicants. No replacement award was invented; the row is deactivated and the source page is kept so the claim can be checked.'
WHERE id = 645;

UPDATE scholarships SET
  title = 'Purdue University - international undergraduates are not eligible for university scholarships (retired)',
  description = 'Purdue closes this door in the plainest language on the list. Its first-year scholarships page states that in general international undergraduate students are not eligible for financial aid, including scholarships, and then spells out that only domestic students are eligible for the scholarships described, defining domestic as United States citizens, United States nationals, permanent resident aliens and aliens lawfully present and able to establish domicile, and adding that international students who hold F, J and some other visa types are not eligible. The Division of Financial Aid adds that merit aid may exist from private sources and that loans may be available with a United States citizen co-signer. The old record claimed a full ride worth USD 57 000 for a Purdue International Undergraduate Scholarship with a 15 January deadline; no such scholarship exists, and leaving the figure in place would have sent applicants to an application that cannot produce it.',
  coverage_type = 'Unspecified',
  award_basis = 'variable',
  award_amount = NULL,
  award_currency = 'USD',
  amount_usd_value = 0,
  deadline = 'Not published',
  deadline_date = NULL,
  deadline_type = 'not_published',
  website_url = 'https://admissions.purdue.edu/cost-financial-aid/scholarships/',
  source_url = 'https://admissions.purdue.edu/cost-financial-aid/scholarships/',
  verification_status = 'verified',
  source_reliability = 9,
  is_active = false,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Retired after reading the Purdue first-year scholarships page fetched 2026-10-25, which states that in general international undergraduate students are not eligible for financial aid, including scholarships, that only domestic students are eligible for the university-wide merit scholarships described, and that international students holding F, J and some other visa types are not eligible. The retired row claimed a Full Ride of USD 57 000 under the name Purdue International Undergraduate Scholarship with a 15 January deadline. No such scholarship is published. No replacement award was invented; the row is deactivated.'
WHERE id = 655;

UPDATE scholarships SET
  title = 'UC Santa Barbara Regents Scholarship - United States citizens and AB 130/131 students only (retired)',
  description = 'The UCSB Regents Scholarship is a USD 5 000 a year award for four years offered to the top two percent of admitted freshmen, and it comes with a citizenship condition that the old record never mentioned: to be eligible you must be a United States citizen, a permanent resident, or a non-citizen student qualifying under California Assembly Bills 130 or 131, and UCSB states that only students who fall under those categories are eligible. An applicant from Uzbekistan on an F-1 visa therefore cannot receive it, whatever the academic record. The neighbouring University of California campus is the opposite case - UC Davis states that all undergraduates including international students are eligible for its scholarships - which is exactly the kind of distinction a catalogue should make visible rather than flatten. The award is also already exhausted for the current cycle: UCSB states that all Regents Scholarships for the 2026-27 year have been awarded and that decisions are final.',
  coverage_type = 'Unspecified',
  award_basis = 'variable',
  award_amount = NULL,
  award_currency = 'USD',
  amount_usd_value = 0,
  deadline = 'Not published',
  deadline_date = NULL,
  deadline_type = 'not_published',
  website_url = 'https://www.finaid.ucsb.edu/types-aid/scholarship-awards/regents-scholarship',
  source_url = 'https://www.finaid.ucsb.edu/types-aid/scholarship-awards/regents-scholarship',
  verification_status = 'verified',
  source_reliability = 9,
  is_active = false,
  last_updated_at = now(),
  last_verified_at = now(),
  notes = 'Retired after reading the UCSB Office of Financial Aid and Scholarships Regents Scholarship page fetched 2026-10-25, which states that the award is USD 5 000 per year for four years for entering freshmen, that UCSB typically offers it to students within the top two percent of admitted freshmen, that all Regents Scholarships for the 2026-27 year have been awarded with no appeals, and - the decisive line - that to be eligible you must be a United States citizen, permanent resident or a non-citizen student qualifying under California Assembly Bills 130 or 131 and that only students who fall under these categories are eligible. The retired row claimed a 25 to 50 percent tuition award worth USD 11 500 and a 30 November deadline. International students are excluded by the provider, so the row is deactivated rather than repriced; the UC Davis row in the same pass is the open alternative.'
WHERE id = 701;

--------------------------------------------------------------------------------------------------
-- university_scholarships cards
--------------------------------------------------------------------------------------------------
UPDATE university_scholarships u SET scholarship_name = v.name, availability_status = 'Yes', funding_type = v.ftype, max_scholarship = v.mx, covers_tuition = v.tuition, covers_living_expenses = v.living, eligibility_notes = v.elig, official_url = v.url, source_url = v.url, verification_status = 'verified', last_verified_at = now()
FROM (VALUES
  (282, 'ASU New American University Scholarship (International)', 'Merit-based', 'USD 17 500 a year at a 4.0 GPA, stepping down to USD 10 000 at 3.01', true, false, 'International first-year and transfer F-1 students only, automatic review with no application, eight semesters for first-year entrants, and the award is cancelled if the student becomes fully sponsored.', 'https://tuition.asu.edu/new-american-university/international'),
  (276, 'MSU Non-resident Scholarship (International Award Levels)', 'Merit-based', 'USD 3 000 to USD 18 000 a year for up to eight semesters', true, false, 'Every admitted international first-year student is considered automatically; decisions by mid-February. Honors College invitees may also receive the USD 13 000 Honors College Excellence Scholarship or a Professorial Assistantship.', 'https://admissions.msu.edu/cost-aid/scholarships/international'),
  (80, 'Penn State SIGIA and PSTAG Tuition Grants (Enrolled International Students)', 'Need-based tuition grant', 'Typically USD 100 to USD 2 000 per semester', true, false, 'Open only to international students already enrolled at Penn State, with a 2.0 undergraduate or 3.0 graduate GPA minimum; first-year students are not considered. Apply through iStart by 15 June for fall or 15 October for spring.', 'https://global.psu.edu/page/tuition-grant-information'),
  (277, 'Texas A&M International Student Scholarships (Continuing Students)', 'Merit-based and need-based', 'Eppright award at least USD 3 000; ITPEG up to USD 4 000; others unpublished', true, false, 'Mostly for continuing international students at College Station. University Scholarship Application due 1 February for summer and fall or 12 October for spring; TASFA needed for need-based awards. International-specific awards do not qualify for the non-resident tuition waiver.', 'https://aggie.tamu.edu/paying-for-college/apply-for-scholarships/international-student-scholarships.html'),
  (101, 'UC Davis Regents Scholarship', 'Merit-based', 'USD 7 500 a year for four years, plus a possible need-based stipend', true, false, 'Awarded to specially selected first-year entrants; international students are eligible for the UC Davis scholarship pool, unlike at several other UC campuses. UC application due 2 December, renewable at a 3.25 GPA.', 'https://financialaid.ucdavis.edu/scholarships/campus/awards/regents'),
  (111, 'UMass Amherst International First-Year Merit Awards', 'Merit-based', 'Up to USD 16 000 per academic year', true, false, 'International first-year entrants only, considered automatically once admitted with no separate application. International transfer students are not eligible for any scholarship.', 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information'),
  (194, 'Morehead-Cain Scholarship (University of North Carolina at Chapel Hill)', 'Merit-based leadership scholarship', 'Tuition, books, room and board, a semester stipend and four funded summers', true, true, 'International applicants must be nominated by a nominating school or affiliate programme, or apply to UNC under Early Action by 15 October 2026 for the Admissions Referral Programme. All materials due 1 October 2026; test-optional.', 'https://www.moreheadcain.org/application-eligibility/'),
  (50, 'University of Wisconsin-Madison King-Morgridge Scholars Program', 'Need-based full ride', 'Full tuition, room and board, insurance, airfare and stipend for eight semesters', true, true, 'Six scholarships a year, restricted to secondary school graduates from Africa, the Caribbean, Latin America, South Asia and Southeast Asia: Uzbekistan is NOT eligible. Early Action application by 1 November and WiSH application by 15 November.', 'https://admissions.wisc.edu/international-scholarships/')
) AS v(id, name, ftype, mx, tuition, living, elig, url)
WHERE u.id = v.id;
