-- Scholarship rewrite pass 16 — 2026-10-23
-- Finishes the Türkiye cluster. Six rows: METU and ITU rewritten to the awards the
-- universities actually run; Boğaziçi, YTÜ and Istanbul University retired because
-- their own pages say no such award exists; Ankara University rewritten to the fee
-- discount its International Student Office does confirm.
--
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 623 — METU: the university's Senate-approved tuition discount / exemption.
-- Was: "Türkiye Bursları & METU International Merit Tuition Waiver" with three levels.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'METU International Undergraduate Tuition Discount / Exemption',
  provider = 'Middle East Technical University (METU)',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 2400,
  award_amount = 2400,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Academic-merit tuition discount or exemption',
  tuition_coverage = 'A discount exempts 50% of the semester tuition; an exemption covers the semester tuition in full. Valid for one academic year and re-evaluated each spring.',
  deadline = 'No scholarship application - new students are assessed on the exam and diploma documents they submit with the admission application',
  deadline_type = 'annual',
  deadline_date = NULL,
  expected_deadline_period = 'The award follows the admission calendar. METU took international undergraduate applications for 2026-2027 from 1 June to 12 July 2026, with an extra round on 26-28 August 2026; the 2027-2028 window is announced on iso.metu.edu.tr.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Middle East Technical University gives international undergraduates a tuition discount or a full tuition exemption on academic merit, and caps the whole scheme at ten percent of the international students registered in undergraduate programmes. There is no scholarship form for an applicant: newly admitted students are judged on the exams and diplomas they sent with the admission application, and the official notification arrives by e-mail. A discount removes half of the semester tuition and an exemption removes all of it, for one academic year at a time. Continuing students are re-evaluated every spring and need a CGPA of 3.00 for a discount or 3.50 for an exemption, and must still be inside the normal duration of the programme. Students whose tuition is paid by another institution, and students in the international joint degree programmes, are outside the scheme. Undergraduate tuition for international-quota students in 2026-2027 is USD 1,200 a semester in engineering, architecture and the science departments, and USD 800 a semester in the social science departments, economics and administrative sciences, and education, so a full exemption is worth USD 2,400 a year at most.',
  requirements = 'Register through the international student quota with a qualification METU accepts, and rank inside the top ten percent of the international undergraduate cohort on the strength of the submitted exams and diplomas. Continuing students need to be within the normal duration of the programme and hold a CGPA of at least 3.00 out of 4.00 at the end of the spring semester for a discount, or 3.50 for an exemption. Students whose tuition is covered by another institution and students enrolled in the international joint degree programmes cannot take part. Quotas are recalculated every year, distributed across faculties in proportion to the number of international students, and approved by the University Administrative Board, so meeting the CGPA is necessary but not sufficient.',
  required_documents = '["METU international undergraduate application with exam and diploma documents","High school diploma or a transitory graduation certificate","Full high school transcript","Accepted exam or diploma result used in the application","English proficiency evidence (TOEFL or PTE) or the METU English Proficiency Exam taken on arrival","No separate scholarship form and no application fee for the 2026-2027 cycle"]',
  english_requirements = 'The programme is taught in English. Admitted students without a qualifying TOEFL or PTE score sit the METU English Proficiency Exam; those who do not pass study a year in the Department of Basic English, where the same tuition rate applies.',
  website_url = 'https://iso.metu.edu.tr/en/scholarship-opportunities',
  source_url = 'https://oidb.metu.edu.tr/en/middle-east-technical-university-implementation-principles-regarding-ankara-campus-tuition',
  application_url = 'https://iso.metu.edu.tr/en/application-dates',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from METU''s own Senate decision of 26 April 2022 on tuition discounts and exemptions for international undergraduates, the International Students Office scholarship page and the 2026-2027 international tuition table (fetched 2026-10-23). CORRECTIONS: the imported record was called "Türkiye Bursları & METU International Merit Tuition Waiver" and treated a government programme and a university scheme as one award. Türkiye Bursları is the YTB national programme and is recorded as id 865; METU''s own scheme is the tuition discount or exemption described here. AMOUNT: the exemption equals one semester of tuition, so the annual ceiling is the published USD 1,200 a semester in engineering, architecture and the science departments (USD 800 a semester elsewhere), that is USD 2,400 a year; a discount is half of that. The figure is a published rate multiplied out, not a cash prize. IMPORTANT LIMIT: only ten percent of international undergraduates can hold the award at once, so it is a quota, not an entitlement. METU also offers meal, dormitory and Development Foundation scholarships to international students, applied for in person at the Scholarship and Tuition Fee Office in September-October or February-March, but those are need-based and have no published cash value, so they are described here rather than given a money column.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 623;

-- ---------------------------------------------------------------------------
-- 828 — ITU: the only award an international student can actually hold is the
-- ITU Development Foundation bursary, and only after enrolling.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'ITU Development Foundation Learning Scholarship (in-study)',
  provider = 'ITU Development Foundation (ITU Vakfi) with Istanbul Technical University',
  coverage_type = 'Partial Funding',
  amount_usd_value = 0,
  award_amount = 4500,
  award_currency = 'TRY',
  award_period = 'year',
  award_basis = 'monthly',
  funding_type = 'Need-based cash bursary',
  tuition_coverage = 'No tuition waiver - a monthly cash bursary of TRY 500 paid for nine months of the academic year',
  deadline = 'Annual application through the ITU Development Foundation; the exact date is announced each year',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'The foundation announces the application window each academic year and evaluates the files, then informs winners by e-mail. Awards are made for that academic year only.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'The ITU Development Foundation (ITU Vakfi) pays a Learning Scholarship to ITU undergraduates who are both successful and in financial need. The award is TRY 500 a month for nine months of the academic year - TRY 4,500 in total - and it is a cash bursary, not a tuition waiver. It is open to students of any nationality, but there is a threshold that matters to applicants reading this from abroad: being a registered student of Istanbul Technical University is a prerequisite, so the award cannot be applied for before enrolling and cannot be used to fund the first year. Keep in mind that Istanbul Technical University itself does not run an entrance scholarship for international applicants; its own merit award is calculated from a placement in the Turkish national YKS examination, which is the route Turkish school leavers take. Applicants from abroad come in through the international quota, pay the international tuition of TRY 94,500 a year in engineering, architecture, mines, chemical-metallurgical and computer engineering and TRY 79,000 in arts and sciences for the 2026-2027 intake, and look to the national Türkiye Bursları programme - recorded separately as its own award - for full funding.',
  requirements = 'Be a registered ITU undergraduate who has started the programme, hold a GPA above 2.50 out of 4.00, have insufficient financial means to continue studying, have no disciplinary sanction beyond a warning, and have passed the ITU foreign language preparatory school within one year. The foundation scores the application form and the supporting documents, and scholarships are granted for one academic year at a time. A student who gives incorrect information in the application is referred to a disciplinary investigation.',
  required_documents = '["ITU Development Foundation online application form","Documentation of financial need","Current ITU transcript showing a GPA above 2.50","Student certificate proving registration at ITU"]',
  english_requirements = 'No English score is set by the scholarship. ITU requires the foreign language preparatory year to be completed successfully within one year before the award can be held.',
  website_url = 'https://www.itugvakif.org.tr/en/page/educational-scholarships',
  source_url = 'https://www.itugvakif.org.tr/en/page/educational-scholarships',
  application_url = 'https://www.itugvakif.org.tr/en/page/educational-scholarships',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from the ITU Development Foundation''s own educational-scholarships page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Türkiye Bursları & ITU Success Scholarship" and merged a government programme with an award that the university does not actually give to international applicants. The ITU Success Scholarship in the university''s scholarship directive is calculated from the applicant''s placement in the Turkish national YKS examination and is aimed at Turkish school leavers, so it cannot be presented as open to applicants from abroad. The Türkiye Bursları half of the title is the YTB national programme, recorded correctly as id 865. What genuinely exists, and is described here, is the ITU Development Foundation''s Learning Scholarship. AMOUNT: TRY 500 a month for nine months is TRY 4,500 a year, stated by the foundation; no USD figure is published so amount_usd_value is 0 instead of converting at a rate we would have to invent. LIMITATION: it is an in-study bursary for already-registered ITU students, not an entrance award, and the notes say so plainly so nobody applies expecting first-year funding.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 828;

-- ---------------------------------------------------------------------------
-- 837 — Ankara University: a fee discount the office does confirm, with no
-- published percentage. amount_usd_value stays 0 rather than being invented.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Ankara University International Student Tuition Discount',
  provider = 'Ankara University',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'TRY',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Merit-based tuition discount',
  tuition_coverage = 'A tuition fee discount for successful international students; the percentage is set by the university criteria and is not published on the office page',
  deadline = 'Assessed with the international admission application - no separate scholarship form',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Ankara University runs international admission in placement rounds announced by the Student Affairs Office; the 2026-2027 cycle included an additional placement round. The 2027-2028 calendar is published on isoidb.ankara.edu.tr.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Ankara University states plainly on its International Student Office page that it does not run a special scholarship programme for international students, but that successful international students do receive a discount on their fees according to published criteria, and that a meal scholarship is also available. The office page does not publish the percentage of that discount, so no dollar value is claimed here. The realistic route to full funding at Ankara University is the national Türkiye Bursları programme of the Presidency for Turks Abroad and Related Communities, which places its scholars at Turkish universities and pays tuition, a monthly stipend, dormitory, health insurance and flights; that programme is recorded separately in this catalogue. Graduate applicants and students already enrolled may also apply for Türkiye Bursları and for the TÜBİTAK international student programmes.',
  requirements = 'Apply through the international student quota with a qualification Ankara University accepts (the 2025-2026 call names the TR-YÖS result among the accepted evidence) and be selected for a programme; the fee discount is then granted to successful international students on the university criteria rather than on a separate application. Applicants who have completed secondary school in Türkiye or the TRNC, or who hold TRNC nationality, are outside the international quota except for the published exceptions, so an applicant from Uzbekistan must have completed high school outside Türkiye. Turkish citizens and people who lost Turkish citizenship cannot apply to Türkiye Bursları.',
  required_documents = '["Ankara University international undergraduate application","High school diploma and transcript","Accepted qualification result (TR-YÖS or an equivalent listed by the Student Affairs Office)","Passport","Turkish proficiency certificate, or the language year that follows admission"]',
  english_requirements = 'Much of the teaching is in Turkish and the university requires a Turkish proficiency certificate, with an additional year allowed to obtain it. No English score is published for the fee discount itself.',
  website_url = 'https://iso.ankara.edu.tr/en/scholarship/',
  source_url = 'https://iso.ankara.edu.tr/en/scholarship/',
  application_url = 'https://isoidb.ankara.edu.tr/en/mainpage/',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 8,
  notes = 'Rewritten from Ankara University''s own International Student Office scholarship page (fetched 2026-10-23), in both its English and Turkish versions, which say the same thing: "Ankara University does not run a special scholarship program for international students but there is discount on the fees for successful international students", plus a meal scholarship. CORRECTIONS: the imported record was called "Türkiye Bursları (Turkish Government Scholarship) (Ankara University)" and presented a national YTB programme as though the university awarded it. It also carried no verified value. The row now describes the one thing the university itself confirms - a merit-based fee discount with unpublished percentages - and the national programme stays where it belongs, in id 865. AMOUNT: deliberately 0, because Ankara University does not publish the discount rate on the page that describes it; inventing a figure would repeat exactly the fault this pass is fixing.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 837;

-- ---------------------------------------------------------------------------
-- 838 — Boğaziçi: "Boğaziçi University does not have a particular scholarship
-- program for international students" (Scholarship Office, own words).
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false,
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - Boğaziçi offers no scholarship to international students',
  deadline = 'Retired 2026-10-23 - no award to apply for',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  website_url = 'https://bursofisi.bogazici.edu.tr/sites/bursofisi.boun.edu.tr/files/yabnci_uyruklu_ogrenciler_sayfasi.pdf',
  source_url = 'https://bursofisi.bogazici.edu.tr/sites/bursofisi.boun.edu.tr/files/yabnci_uyruklu_ogrenciler_sayfasi.pdf',
  notes = 'RETIRED 2026-10-23. The imported record was called "Türkiye Bursları & Boğaziçi Foundation Grants" and implied that Boğaziçi University runs its own grant for international undergraduates alongside the government programme. Two checks falsify it. First, the university''s own Scholarship Office document "Scholarships for Students with Foreign Citizenship" opens with the sentence: "Boğaziçi University does not have a particular scholarship program for international students", and then tells applicants that those seeking undergraduate funding should apply to Türkiye Bursları run by the Presidency for Turks Abroad and Related Communities. Second, the scholarship regulation the university does publish covers success and need scholarships for its own enrolled students, including dormitory, meal, book and summer-term awards, and those are in-kind support for students already registered, not an entrance award an applicant from Uzbekistan can apply for. The national programme is recorded separately and correctly as scholarship id 865 and still appears on Boğaziçi''s page through the same-country relevance rule, so retiring this row loses no information. Note for the record: Boğaziçi charges international-quota undergraduates USD 10,000 a year in engineering and economics and USD 8,000 elsewhere, and grants no discount or financial aid to them at all.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 838;

-- ---------------------------------------------------------------------------
-- 814 — YTÜ: "Yıldız Technical University (YTU) does not offer scholarships to
-- international students."
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false,
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - YTÜ offers no scholarship to international students',
  deadline = 'Retired 2026-10-23 - no award to apply for',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  website_url = 'http://www.admissions.yildiz.edu.tr/page/42/Turkiye-Scholarships-Program/145',
  source_url = 'https://sbe.yildiz.edu.tr/page/26/Scholarship-Programs/278',
  notes = 'RETIRED 2026-10-23. The imported record was called "Türkiye Bursları & YTÜ Success Grants" and implied that Yıldız Technical University awards its own grant to international applicants alongside the government programme. The university says the opposite in its own words. The Graduate School of Social Sciences scholarship page states: "Yıldız Technical University (YTU) does not offer scholarships to international students. YTU accepts international scholarship students through Türkiye Bursları Scholarship Program." The university''s scholarship directive adds that foreign nationals may apply for the meal scholarship only, and the 2026-2027 call for the university''s own need and meal scholarships is aimed at students already registered, applying through bursbasvuru.yildiz.edu.tr between 31 August and 5 October 2026. The "Success Grants" half of the title refers to the Yıldız Achievement Scholarships, which are calculated from a ranking in the Turkish national YKS examination (top 100, 500, 1,000 and 2,000) and therefore cannot be won by an applicant coming through the international quota. The national programme is recorded separately as id 865 and still appears on YTÜ''s page through the same-country relevance rule, so retiring this row loses no information.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 814;

-- ---------------------------------------------------------------------------
-- 813 — Istanbul University: the row carried nothing but the national programme.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false,
  coverage_type = 'Unspecified',
  amount_usd_value = 0,
  award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicate of the national Türkiye Bursları programme',
  deadline = 'Retired 2026-10-23 - the national programme has its own record',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  website_url = 'https://ebs.istanbul.edu.tr/home/universite?id=finans',
  source_url = 'https://ebs.istanbul.edu.tr/home/universite?id=finans',
  notes = 'RETIRED 2026-10-23. The imported record was nothing more than "Türkiye Bursları (Turkish Government Scholarship) (Istanbul University)": it named a national programme awarded by the Presidency for Turks Abroad and Related Communities, tagged with a university, and carried no university-specific information at all. The national programme is recorded once, correctly, as id 865, and it still surfaces on Istanbul University''s page through the same-country relevance rule, so nothing is lost. The one thing worth knowing about Istanbul University''s own money is recorded here so it is not lost either: its published financial support for students consists of an achievement bursary for entrants ranked in the top 500 of the Turkish national YKS examination, with a dormitory and meal bursary tied to the same ranking, and the Istanbul University Foundations bursaries, whose published conditions require Turkish citizenship. None of those is open to an applicant from Uzbekistan through the international quota, and the university publishes no entrance scholarship of its own for international students.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 813;

-- ---------------------------------------------------------------------------
-- university_scholarships cards (ids 184, 333, 338, 308, 337, 336)
-- ---------------------------------------------------------------------------
UPDATE university_scholarships AS us SET
  scholarship_name = v.name,
  max_scholarship = v.max_award,
  valued_aspect = v.aspect,
  availability_status = v.availability,
  funding_type = v.funding,
  covers_tuition = v.covers_tuition,
  covers_living_expenses = v.living,
  official_url = v.url,
  source_url = v.url,
  eligibility_notes = v.elig,
  last_verified_at = NOW()
FROM (VALUES
  (184, 'METU International Undergraduate Tuition Discount / Exemption',
        'Full exemption of one semester tuition (USD 2,400 a year at most) or a 50% discount',
        'No application - new students judged on the exams sent with the admission file',
        'Yes', 'Merit-based', true, false,
        'https://iso.metu.edu.tr/en/scholarship-opportunities',
        'Capped at ten percent of international undergraduates, so it is a quota, not an entitlement. Continuing students need CGPA 3.00 for a discount or 3.50 for an exemption. International-quota tuition is USD 1,200 a semester in engineering, architecture and the science departments and USD 800 elsewhere.'),
  (333, 'ITU Development Foundation Learning Scholarship (in-study)',
        'TRY 500 a month for nine months (TRY 4,500 a year) - a cash bursary, not a tuition waiver',
        'Only for already-registered ITU undergraduates with a GPA above 2.50 and financial need',
        'Yes', 'Need-based', false, true,
        'https://www.itugvakif.org.tr/en/page/educational-scholarships',
        'Being a registered ITU student is a prerequisite, so it cannot fund the first year. ITU itself awards no entrance scholarship to international applicants; its merit award is calculated from the Turkish national YKS placement.'),
  (338, 'Ankara University International Student Tuition Discount',
        'A tuition fee discount for successful international students; the percentage is not published',
        'Granted on university criteria, with a meal scholarship alongside',
        'Yes', 'Merit-based', true, false,
        'https://iso.ankara.edu.tr/en/scholarship/',
        'Ankara University states that it runs no special scholarship programme for international students but does discount the fees of successful ones; the rate is not published, so no cash value is claimed.'),
  (308, 'Türkiye Bursları & Boğaziçi Foundation Grants',
        'No award to apply for', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'https://bursofisi.bogazici.edu.tr/sites/bursofisi.boun.edu.tr/files/yabnci_uyruklu_ogrenciler_sayfasi.pdf',
        'Boğaziçi University''s own Scholarship Office states that it has no scholarship programme for international students, and directs applicants to Türkiye Bursları, which is recorded separately as scholarship id 865.'),
  (337, 'Türkiye Bursları & YTÜ Success Grants',
        'No university award to apply for', 'Retired 2026-10-23',
        'No', 'None', false, false,
        'http://www.admissions.yildiz.edu.tr/page/42/Turkiye-Scholarships-Program/145',
        'YTÜ states that it does not offer scholarships to international students; foreign nationals may apply for the meal scholarship only, and the Yıldız Achievement Scholarships depend on a YKS ranking the international quota cannot produce.'),
  (336, 'Türkiye Bursları (Turkish Government Scholarship) (Istanbul University)',
        'No university award to apply for', 'Retired 2026-10-23 - the national programme is recorded as id 865',
        'No', 'None', false, false,
        'https://ebs.istanbul.edu.tr/home/universite?id=finans',
        'Istanbul University''s own bursaries are tied to a top-500 YKS ranking or require Turkish citizenship, so none is open to an applicant from the international quota.')
) AS v(id, name, max_award, aspect, availability, funding, covers_tuition, living, url, elig)
WHERE us.id = v.id;
