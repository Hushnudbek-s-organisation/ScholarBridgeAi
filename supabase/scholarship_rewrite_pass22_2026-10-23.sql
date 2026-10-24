-- Scholarship rewrite pass 22 — 2026-10-23
-- The Malaysia cluster, first batch: the four public research universities.
--
-- The pattern broken here is the worst in the catalogue so far. Five rows were built
-- as "<University> award & MIS", welding a national MOHE programme (Malaysia
-- International Scholarship, already recorded as id 603) onto a university award.
-- Four of the five university awards were themselves invented: no UKM, UPM, UTM or
-- USM page carries the names "International Excellence Scholarship", "Global
-- Fellowship" or "International Endowment", and every one of them claimed full
-- tuition plus a monthly allowance while the real schemes pay less - three of the
-- four pay no allowance at all.
--
-- Rows: 705 UKM · 772 UPM · 805 UTM · 776 USM  → rewritten to the documented award
--       469, 471, 472, 395                      → retired as vague duplicates
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 705 — UKM. Was: "UKM Vice-Chancellor Scholarship & MIS (PG)", USD 6 500.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'UKM Vice-Chancellor''s Scholarship (Gold and Silver)',
  provider = 'Universiti Kebangsaan Malaysia (UKM), Graduate Centre',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 3200,
  award_currency = 'MYR',
  award_period = 'month',
  award_basis = 'range',
  funding_type = 'Merit-based research scholarship',
  tuition_coverage = 'Gold: tuition waived every semester plus one-time registration and service fees, a living allowance of MYR 3,200 a month for a PhD or 2,200 for a master''s, an accommodation allowance of MYR 300 a month, one return economy flight and visa costs. Silver: tuition and registration waived, MYR 2,000 a month for a PhD or 1,500 for a master''s, and MYR 300 a month for accommodation - no flight and no visa cover.',
  deadline = 'No fixed date - the selection committee meets each semester and vacancies are announced on the UKM Graduate Centre site',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'UKM convenes the selection committee every semester, or whenever vacancies arise, and announces each round through the Graduate Centre at ukm.my/pusatsiswazah. Successful and unsuccessful applicants are told within one month of the committee meeting.',
  degree_levels = '["Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'UKM''s Vice-Chancellor''s Scholarship is the university''s flagship research award, and it comes in two grades that are worth very different amounts. Gold pays a waived tuition every semester, the one-time registration and service fees, a living allowance of MYR 3,200 a month for a doctoral candidate or 2,200 for a master''s, MYR 300 a month towards accommodation, one return economy flight and the cost of the student visa. Silver drops the flight and the visa and pays MYR 2,000 a month for a PhD or 1,500 for a master''s, but still waives tuition and registration and adds the same MYR 300 accommodation allowance. Both are open to international candidates as well as Malaysians, both require full-time research or mixed-mode enrolment, and both demand a CGPA of at least 3.67 out of 4.00. Publications separate the grades: a Gold candidate needs one Q2 paper as a master''s student or two Q2 papers as a doctoral candidate, while Silver asks for Q3 instead of Q2. The award runs from two to six semesters and is reviewed against a published KPI each year, so a holder who stops publishing can lose it.',
  requirements = 'Be a prospective full-time master''s-by-research or doctoral candidate at UKM - research or mixed mode, not coursework - with a CGPA of at least 3.67 out of 4.00 or a first-class bachelor degree from a recognised university. Hold no other scholarship, assistance or salary from any sponsor, federal or state body or statutory body, and have no outstanding debt or fees with UKM. Publish to the grade applied for: one Q2 article as first student author for a Gold master''s candidate, two Q2 articles for Gold doctoral, and Q3 rather than Q2 for Silver. Download the application form from the UKM Graduate Centre, write the required essay on why UKM should choose you, and submit the form with the supporting documents to graduate@ukm.edu.my. The selection committee meets each semester, and the award is monitored against an annual KPI - a Gold master''s candidate must publish one Q2 article a year and a doctoral candidate two.',
  required_documents = '["UKM Vice-Chancellor''s Scholarship application form, downloaded from the Graduate Centre","Essay on why UKM should select you","Copy of valid passport","One passport-sized photograph","Certified academic transcripts for every degree held","Front page of each published article","Front page of the UKM admission application form","Research proposal","Curriculum vitae"]',
  english_requirements = 'UKM sets its own English requirement for admission to a research programme, usually an IELTS or TOEFL band or a prior degree taught in English; the scholarship itself adds no separate score. The real entry currency here is publication: Q2 journals for Gold and Q3 for Silver, as first student author.',
  website_url = 'https://www.ukm.my/pusatsiswazah/wp-content/uploads/2020/04/BI-GENERAL-TERMS-AND-SPECIFIC-CONDITIONS-UKM-VC-SCHOLARSHIP-24032020-copy.pdf',
  source_url = 'https://www.ukm.my/pusatsiswazah/wp-content/uploads/2020/04/BI-GENERAL-TERMS-AND-SPECIFIC-CONDITIONS-UKM-VC-SCHOLARSHIP-24032020-copy.pdf',
  application_url = 'https://www.ukm.my/pusatsiswazah/',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from UKM''s own official guidelines for the Vice-Chancellor Scholarship published by the UKM Graduate Centre (fetched 2026-10-23), which set out the Gold and Silver grades line by line: the MYR 3,200 / 2,200 and 2,000 / 1,500 monthly rates, the MYR 300 accommodation allowance, the return flight and visa cover in Gold only, the CGPA 3.67 floor, the Q2 versus Q3 publication split, the two-to-six semester duration and the annual KPI. CORRECTIONS: the imported record was called "UKM Vice-Chancellor Scholarship & MIS (PG)", invented USD 6,500, gave an "Apr-Jul (Fall), Nov-Jan (Spring)" deadline and pointed only at www.ukm.my. The "& MIS" half is the Malaysia International Scholarship, a national MOHE programme recorded separately as id 603 - it is not a UKM award and nobody applies for it through UKM. The invented deadline is also wrong: UKM has no annual application window at all, the committee meets each semester. AMOUNT: award_amount carries the top Gold rate of MYR 3,200 a month, and amount_usd_value is 0 because UKM publishes no USD equivalent and a self-invented exchange rate is exactly what this pass removes. DISTINCTION FROM id 471: that row is a vague "UKM International Excellence Scholarship" with an invented USD 5,000 and no source; this row is the award UKM actually documents.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 705;

-- ---------------------------------------------------------------------------
-- 772 — UPM. Was: "UPM International Scholarship & MIS (PG)", USD 6 200.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'UPM International Graduate Student Scholarship (IGSS)',
  provider = 'Universiti Putra Malaysia (UPM), School of Graduate Studies',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'MYR',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Partial tuition fee waiver for international doctoral students',
  tuition_coverage = 'A 30 to 50 percent waiver of tuition fees for up to three years (six semesters), reviewed annually against academic progress. It does not cover living costs, accommodation or the remaining tuition',
  deadline = 'Two windows a year: 1-31 August for the first semester and 1-31 January for the second semester',
  deadline_type = 'annual',
  deadline_date = NULL,
  expected_deadline_period = 'UPM''s School of Graduate Studies opens IGSS for the first semester of 2026/2027 from 1 to 31 August 2026, and the second-semester round runs from 1 to 31 January. The supervisor and the Dean must have supported the application in the SGS portal by the same closing date, and late or incomplete applications are not processed.',
  degree_levels = '["PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["Southeast Asia","South Asia","Central Asia","Middle East","Africa"]',
  min_ielts = NULL,
  description = 'UPM''s scholarship for international candidates is smaller than its name suggests and honest about it: the International Graduate Student Scholarship waives between 30 and 50 percent of tuition for a doctoral student for up to six semesters, and it pays no living allowance, no accommodation and no insurance. What it does offer is a real discount at a research university for applicants from Southeast Asia, South Asia, Central Asia, the Middle East and Africa - the Central Asia band includes Uzbekistan - with priority for academic staff of institutions that hold a memorandum of understanding with UPM and for research in areas UPM treats as priorities. Two things decide the outcome as much as the applicant''s grades: a supervisor support letter and an embassy letter confirming that the applicant receives no other financial assistance or income. Applications run through the SGS portal in two windows a year, 1 to 31 August and 1 to 31 January, and both the supervisor and the Dean have to endorse the file online by the closing date.',
  requirements = 'Hold a master''s degree, meet UPM''s general requirements for international students, and be a new student or a student in the first semester with continuing status. Hold no other scholarship, loan or financial assistance and no employment at the time of application. Show at least one article published in an academic journal, or strong recommendations from a Vice-Chancellor, Dean or Director. Provide a support letter from the prospective supervisor and a letter from the applicant''s embassy confirming that no other financial assistance or income is being received. Priority goes to applicants from developing countries where UPM has strategic interests and to staff of institutions with a memorandum of understanding with UPM. Apply online through the SGS portal and make sure the supervisor and the Dean complete their online endorsements before the closing date, because incomplete or late applications are not processed and there is no appeal.',
  required_documents = '["UPM School of Graduate Studies portal application","Master''s degree certificate and full transcripts","At least one published journal article, or a strong institutional recommendation","Supervisor support letter","Embassy letter confirming no other financial assistance or income","Research proposal and curriculum vitae","Online endorsement by the supervisor and the Dean or Director"]',
  english_requirements = 'UPM sets its own English requirement for doctoral admission, usually an IELTS or TOEFL band or a prior degree taught in English. The scholarship adds no separate score but does require a publication in an academic journal.',
  website_url = 'https://sgs.upm.edu.my/financial_assistance_scholarships/scholarship_financial_assistance_upm/international_graduate_student_scholarship_igss-1402',
  source_url = 'https://sgs.upm.edu.my/financial_assistance_scholarships/scholarship_financial_assistance_upm/international_graduate_student_scholarship_igss-1402',
  application_url = 'http://sgsportal.upm.edu.my:8080/sgsportal/',
  application_status = 'open',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from UPM''s own School of Graduate Studies page for the International Graduate Student Scholarship (fetched 2026-10-23), which states the 30 to 50 percent tuition waiver, the up-to-six-semester duration with annual review, the eligible regions including Central Asia, the 1-31 August and 1-31 January windows, and the supervisor and embassy letter requirements. CORRECTIONS: the imported record was called "UPM International Scholarship & MIS (PG)", invented USD 6,200 and an "Apr-Jul (Oct Intake)" deadline, claimed full tuition, and pointed only at www.upm.edu.my. The "& MIS" half is the Malaysia International Scholarship, a national MOHE programme recorded as id 603. The award is neither full tuition nor a stipend - it is a 30 to 50 percent waiver, and the old row gave a reader no way to know that. It is also doctoral only, which the old row did not say. AMOUNT: amount_usd_value and award_amount are both left empty because the waiver is a percentage of a tuition figure that varies by programme, and UPM publishes the percentage rather than a ringgit total. STATUS: open, because the 1-31 August 2026 window for the first semester of 2026/2027 is the current round as this record is written. DISTINCTION FROM id 469: that row is a vague "UPM International Excellence Scholarship" with an invented USD 5,000 and no source.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 772;

-- ---------------------------------------------------------------------------
-- 805 — UTM. Was: "UTM International Endowment & MIS (PG)", USD 6 500.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'UTM International Doctoral Fellowship',
  provider = 'Universiti Teknologi Malaysia (UTM)',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0,
  award_amount = 2000,
  award_currency = 'MYR',
  award_period = 'year',
  award_basis = 'fixed',
  funding_type = 'Partial tuition waiver for international doctoral students',
  tuition_coverage = 'A partial tuition waiver of MYR 2,000 for an international doctoral student - tuition only, with no monthly allowance, no accommodation and no insurance',
  deadline = 'Announced by the UTM School of Graduate Studies with each intake; no fixed annual date is published',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'UTM runs this fellowship through the School of Graduate Studies and announces each round on admission.utm.my and sps.utm.my. The larger UTM ASCEND Scholarships, which pay full tuition for up to six semesters plus MYR 3,000 a month, closed on 31 May 2026 and will reopen with the next cycle.',
  degree_levels = '["PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'UTM''s International Doctoral Fellowship is a modest, specific thing: a partial tuition waiver of MYR 2,000 for an international doctoral student who is already enrolled and in good standing. It pays no monthly allowance and covers no accommodation, so it is not the package that the phrase "international scholarship" usually suggests. The conditions are about status rather than merit alone - the student must be active and normally within the first six semesters of the doctorate, and must not be receiving other financial aid from another source. UTM''s own page lists it alongside the National Postgraduate Fund, which is restricted to Malaysian students and waives MYR 1,000, and alongside the far larger UTM ASCEND Scholarships, which cover tuition for up to six semesters and pay a MYR 3,000 monthly allowance but closed on 31 May 2026. For an applicant from outside Malaysia who needs a funded place rather than a discount, ASCEND or the national Malaysia International Scholarship are the realistic routes, and this fellowship is a small top-up rather than a funding plan.',
  requirements = 'Be an international student enrolled full time in a UTM doctoral programme with active status, normally within the first six semesters of study, and be receiving no other financial aid from any other source at the time of application. Apply through the UTM School of Graduate Studies when the round is announced, using the UTM student system at my.utm.my where the university directs applicants. Students in the fifth and sixth semesters are generally given priority only where they have submitted notification of thesis submission. Note that the neighbouring National Postgraduate Fund on the same page is open to Malaysian students only, so an international applicant should not apply for it.',
  required_documents = '["UTM School of Graduate Studies application through my.utm.my","Proof of active doctoral enrolment at UTM","Current academic progress report","Evidence of no other financial aid","Passport and visa documents","Thesis submission notification where the applicant is in the fifth or sixth semester"]',
  english_requirements = 'The fellowship sets no English score. English proficiency is settled at doctoral admission, and the award depends on enrolment status rather than on a further test.',
  website_url = 'https://admission.utm.my/scholarship-and-financial-aid/',
  source_url = 'https://admission.utm.my/scholarship-and-financial-aid/',
  application_url = 'https://my.utm.my',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from UTM''s own scholarship and financial aid page (fetched 2026-10-23), which describes the International Doctoral Fellowship as "partial tuition waivers of RM 2,000.00 for International Doctoral" students, alongside the Malaysian-only National Postgraduate Fund at RM 1,000 and the UTM ASCEND Scholarships which cover tuition for up to six semesters with a RM 3,000 monthly allowance and closed on 31 May 2026. CORRECTIONS: the imported record was called "UTM International Endowment & MIS (PG)", invented USD 6,500, gave an "Apr-Jul (Oct Intake)" deadline, claimed full tuition and pointed only at www.utm.my. There is no UTM "International Endowment" on the university''s scholarship page - the international awards UTM documents are the International Doctoral Fellowship, ASCEND, MTCP and the Young Scholars Grant. The "& MIS" half is the Malaysia International Scholarship, a national MOHE programme recorded as id 603, and UTM is merely one of the universities where MIS scholars may be placed. AMOUNT: MYR 2,000 is the published waiver, and amount_usd_value is 0 because UTM publishes no USD equivalent. HONESTY POINT: the row now says plainly that MYR 2,000 is a small top-up, not a funding package, because the old "Full Tuition" label would have led a student to plan around money that does not exist. DISTINCTION FROM id 472: that row is a vague "UTM International Excellence Scholarship" with an invented USD 5,000 and no source.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 805;

-- ---------------------------------------------------------------------------
-- 776 — USM. Was: "USM Global Fellowship & MIS (PG)", USD 6 000, claimed a stipend.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'USM Graduate Scholarship (research mode)',
  provider = 'Universiti Sains Malaysia (USM), Institute of Postgraduate Studies',
  coverage_type = 'Tuition Waiver',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'MYR',
  award_period = 'semester',
  award_basis = 'variable',
  funding_type = 'Tuition-only scholarship for new research students',
  tuition_coverage = 'Tuition fees for the first semester, extendable to the second semester on satisfactory progress. No monthly allowance, accommodation, airfare, visa, health insurance or living costs are included',
  deadline = 'The 2026 round closed on 1 September 2026; the next round is announced by the Institute of Postgraduate Studies',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'USM closed the 2026 Graduate Scholarship round on 1 September 2026 at 17:00 Malaysia time. The Institute of Postgraduate Studies announces the next round on ips.usm.my and admission.usm.my, and the university runs separate schemes on their own dates - USMCARE closed on 1 October 2026 and the Graduate Horizon research-attachment grant on 15 October 2026.',
  degree_levels = '["PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'USM''s Graduate Scholarship pays tuition and nothing else, and that single fact is what separates it from most of the awards on this list. It covers the first semester of a research programme and can be extended to the second if the student shows satisfactory progress; there is no monthly allowance, no accommodation and no insurance. It is open to Malaysians at both master''s and doctoral level but to international candidates at doctoral level only, which is the detail applicants from Uzbekistan need. Requirements are specific and checkable: a CGPA of at least 3.33, full-time research-mode enrolment, a full admission offer from USM before applying, and at least one manuscript published in a Web of Science, Scopus or ERA-indexed journal as a doctoral candidate - the publication requirement is waived only for fast-track doctoral candidates. Renewal works by publishing rather than by exam: before the second semester the holder applies for an extension and must have submitted at least one manuscript to a Q1 or Q2 journal as first student author with the main supervisor as co-author.',
  requirements = 'Hold a full USM admission offer for a master''s or doctoral programme by research mode and not yet have registered as a full-time student - part-time candidates are not considered. International applicants may apply at doctoral level only. Meet the academic floor: a CGPA of at least 3.33 for a master''s applicant, or a master''s degree by coursework or mixed mode with a CGPA of at least 3.33, or a master''s by research, for a doctoral applicant. Publish at least one manuscript in a Web of Science, Scopus or ERA-indexed journal as a doctoral candidate, a requirement waived for fast-track doctoral candidates. Apply through the Institute of Postgraduate Studies before the published closing date. To extend into the second semester, apply for the extension before that semester begins and show satisfactory research progress.',
  required_documents = '["USM Graduate Scholarship application form from the Institute of Postgraduate Studies","Full USM admission offer letter","Bachelor and master degree certificates with certified transcripts","Evidence of at least one manuscript in a WoS, Scopus or ERA-indexed journal","Research proposal and curriculum vitae","Supervisor support confirmation"]',
  english_requirements = 'USM sets its own English requirement for research admission, usually an IELTS or TOEFL band or a prior degree taught in English. The scholarship adds no separate score, but the publication requirement is the real filter.',
  website_url = 'https://admission.usm.my/index.php/postgraduate/financial-assistance',
  source_url = 'https://admission.usm.my/index.php/postgraduate/financial-assistance',
  application_url = 'https://ips.usm.my/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from USM''s own postgraduate financial assistance page (fetched 2026-10-23), which sets out the Graduate Scholarship - open to Malaysians at master''s and doctoral level and to international candidates at PhD only, requiring a full admission offer before registration, a CGPA of 3.33 and at least one WoS, Scopus or ERA publication for doctoral candidates, with the fast-track exemption - plus the separate USMCARE and Graduate Horizon schemes with their own closing dates. CORRECTIONS: the imported record was called "USM Global Fellowship & MIS (PG)", invented USD 6,000, gave an "Apr-Jul (Oct Intake)" deadline, claimed full tuition plus a stipend, and pointed only at www.usm.my. There is no USM award called the Global Fellowship, and the Graduate Scholarship pays no stipend - a student who budgeted on the old row would have counted on a monthly allowance that does not exist. The "& MIS" half is the Malaysia International Scholarship, a national MOHE programme recorded as id 603. AMOUNT: left empty because the award is a semester of tuition that varies by programme, and no ringgit total is published; amount_usd_value is 0 because no USD equivalent is published either. STATUS: closed, because the 1 September 2026 closing date has passed as this record is written. DISTINCTION FROM id 395: that row is a vague "USM International Scholarship ISS" with an invented USD 12,000, a claimed monthly allowance and no source.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 776;

-- ---------------------------------------------------------------------------
-- 469, 471, 472, 395 → retired. Four vague "International Excellence" /
-- "Global Fellowship" / "ISS" rows with invented USD totals, a claimed stipend
-- and no source page. Each duplicates the documented award now rewritten above.
-- ---------------------------------------------------------------------------
UPDATE scholarships AS s SET
  is_active = false,
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  award_amount = NULL,
  award_basis = 'variable',
  deadline = 'Retired 2026-10-23 - ' || v.replacement,
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  tuition_coverage = 'Retired 2026-10-23 - ' || v.replacement,
  website_url = v.url,
  source_url = v.url,
  notes = v.notes,
  last_verified_at = NOW(),
  last_updated_at = NOW()
FROM (VALUES
  (469, 'see id 772, the UPM International Graduate Student Scholarship',
   'https://sgs.upm.edu.my/financial_assistance_scholarships/scholarship_financial_assistance_upm/international_graduate_student_scholarship_igss-1402',
   'RETIRED 2026-10-23 as a vague duplicate with fabricated content. The record was called "Universiti Putra Malaysia (UPM) International Excellence Scholarship", invented USD 5,000, claimed full tuition and admitted in its own deadline field that the date was not published. A search of UPM''s own pages finds no award by that name: the university''s documented international scholarship is the International Graduate Student Scholarship (IGSS), a 30 to 50 percent tuition waiver for doctoral students, which is recorded as id 772 with its two application windows. Nothing is lost by retiring this row, and leaving it would have suggested that UPM runs a second, larger award that a student could find with a web search and never locate on the university site.'),
  (471, 'see id 705, the UKM Vice-Chancellor''s Scholarship',
   'https://www.ukm.my/pusatsiswazah/',
   'RETIRED 2026-10-23 as a vague duplicate with fabricated content. The record was called "Universiti Kebangsaan Malaysia (UKM) International Excellence Scholarship", invented USD 5,000, claimed full tuition and said in its deadline field that the date was not published. UKM publishes no award by that name. Its documented awards are the Vice-Chancellor''s Scholarship in Gold and Silver grades, recorded as id 705 with the actual monthly rates of MYR 3,200 and 2,200 for Gold and 2,000 and 1,500 for Silver, the MYR 300 accommodation allowance and the Q2 versus Q3 publication rule. A student who found this row would have been looking for a scholarship UKM does not advertise.'),
  (472, 'see id 805, the UTM International Doctoral Fellowship',
   'https://admission.utm.my/scholarship-and-financial-aid/',
   'RETIRED 2026-10-23 as a vague duplicate with fabricated content. The record was called "Universiti Teknologi Malaysia (UTM) International Excellence Scholarship", invented USD 5,000, claimed full tuition and said in its deadline field that the date was not published. UTM''s scholarship page lists its international awards explicitly - the International Doctoral Fellowship at MYR 2,000, the UTM ASCEND Scholarships with full tuition for up to six semesters and MYR 3,000 a month, the MTCP Scholarship and the Young Scholars Grant - and names no "International Excellence Scholarship". The International Doctoral Fellowship is recorded as id 805.'),
  (395, 'see id 776, the USM Graduate Scholarship',
   'https://admission.usm.my/index.php/postgraduate/financial-assistance',
   'RETIRED 2026-10-23 as a vague duplicate with fabricated content. The record was called "USM International Scholarship ISS", invented USD 12,000, claimed full tuition plus a monthly allowance, gave a "June 30 annually" deadline and pointed at www.usm.my/research/ - a page about research, not scholarships. USM publishes no "International Scholarship ISS". Its documented scheme is the Graduate Scholarship, which pays tuition for the first semester and can be extended to the second, with no monthly allowance at all, and which admits international candidates at doctoral level only; it is recorded as id 776 with the CGPA 3.33 floor, the Web of Science or Scopus publication requirement and the 1 September 2026 closing date. The old row''s promise of a monthly allowance was the most misleading part, because USM explicitly lists no stipend.')
) AS v(id, replacement, url, notes)
WHERE s.id = v.id;
