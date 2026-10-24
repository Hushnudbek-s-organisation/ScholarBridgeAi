-- Scholarship rewrite pass 21 — 2026-10-23
-- The South Korea cluster. Closes it: zero template descriptions remain among
-- active Korean rows.
--
-- Pattern broken here: four of the five template rows were third copies of awards
-- already recorded correctly, each welded to "& GKS" - the national Global Korea
-- Scholarship, which no Korean university awards. The fifth, UNIST, was a real
-- award described with an invented figure.
--
-- Also corrected: 451 carried a false level (it claimed a Samsung-funded full
-- scholarship "for top international postgraduates" when that award is for
-- undergraduates and the general scholarship is a 10-100% waiver with no stipend).
--
-- Rows: 709 UNIST · 668 SKKU Samsung · 451 SKKU admission/merit  → rewritten
--       585 Hanyang · 652 POSTECH · 819 KAIST                     → retired
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 709 — UNIST. Was: "UNIST International Undergraduate Scholarship", USD 31 500,
-- "Jan-Feb (Fall)". The award is automatic and graded, not a cash package.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'UNIST International Undergraduate Scholarship',
  provider = 'Ulsan National Institute of Science and Technology (UNIST)',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 630000,
  award_currency = 'KRW',
  award_period = 'month',
  award_basis = 'range',
  funding_type = 'Automatic university scholarship for international undergraduates',
  tuition_coverage = 'Tuition is fully waived in the first semester for every new international student; afterwards it is fully waived on 12 credits and a GPA of 2.7 or better, or half waived on 12 credits and a GPA of 2.0. On top of that comes a monthly living scholarship (Global Uni-Star Gold at KRW 630,000, Silver at 330,000, or Global Dream at 130,000), two meals a day in the dormitory cafeteria and national health insurance of KRW 75,000 a month, which UNIST refunds against proof of payment',
  deadline = 'Decided with the admission round - no separate scholarship application; the 2027 intake dates are published on the UNIST international admissions site',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'UNIST awards the scholarship automatically to every admitted international undergraduate, so it has no separate deadline of its own. The intake calendar for the next academic year is published on admu-intl.unist.ac.kr, and the type of living scholarship is decided by UNIST from the evaluation result at the point of acceptance.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'UNIST does not run a competition for its international undergraduates: every admitted student starts with a fully waived tuition in the first semester, and the scholarship is decided from the admission evaluation rather than from a separate application. From the second semester the tuition waiver follows performance - full on 12 credits and a GPA of 2.7 out of 4.3, half on 12 credits and a GPA of 2.0 - and a monthly living scholarship is added on top, in one of three grades: Global Uni-Star Gold at KRW 630,000 a month, Silver at KRW 330,000, or Global Dream at KRW 130,000, each with two meals a day from the dormitory cafeteria, where Halal, Korean and vegetarian options are available. National health insurance of KRW 75,000 a month is refunded by the university against proof of payment. Published tuition is KRW 3,316,500 a semester in the engineering field and KRW 2,795,500 in business, so a full waiver is worth roughly KRW 6.6 million a year in engineering, and the Gold living scholarship adds about KRW 7.6 million more. The catch worth noting is the credit floor: fewer than 12 credits in the previous term costs the waiver, so a student who drops courses can lose the funding.',
  requirements = 'Be admitted to a UNIST undergraduate programme through the international admissions track. No scholarship form exists and none is needed - the award is automatic and is stated with the admission result. To keep it, carry at least 12 credits in the previous term and hold a GPA of 2.7 out of 4.3 for the full tuition waiver and the Gold or Silver living scholarship, or a GPA of 2.0 for the half waiver and the Global Dream scholarship. The meal plan has no academic condition and applies to every international undergraduate. UNIST decides which living-scholarship grade to give from the evaluation result at acceptance, so a strong application file is what moves a student from Dream to Uni-Star Silver or Gold.',
  required_documents = '["UNIST international undergraduate application at admu-intl.unist.ac.kr","Passport","High school diploma or expected graduation certificate","Full high school transcripts","English proficiency evidence","Personal statement and study plan","Recommendation letters where the programme requests them","Financial documents and passport photograph as the admissions guide requires"]',
  english_requirements = 'UNIST publishes its own English proficiency expectation in the international admissions guide and teaches in English; the scholarship itself sets no separate score.',
  website_url = 'https://admu-intl.unist.ac.kr/admission-eng/life/scholarships.do',
  source_url = 'https://admu-intl.unist.ac.kr/admission-eng/life/scholarships.do',
  application_url = 'https://admu-intl.unist.ac.kr/admission-eng/admissions/admissions.do',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from UNIST''s own international admissions scholarship page (fetched 2026-10-23), which carries the whole table: tuition fully waived or half waived by GPA and credits, the three living scholarships at KRW 630,000 / 330,000 / 130,000 a month with meals, health insurance at KRW 75,000 a month refunded against proof, the two-meals-a-day plan, and the published tuition of KRW 3,316,500 in engineering and KRW 2,795,500 in business. CORRECTIONS: the imported record was called "UNIST International Undergraduate Scholarship", invented USD 31,500 and a "Jan-Feb (Fall)" deadline, and implied a fixed cash package. There is no cash package and no January-February window: the award is automatic on admission and is a tuition waiver plus a graded monthly living scholarship. AMOUNT: award_amount carries the highest published living-scholarship rate, KRW 630,000 a month, because that is the single most concrete figure UNIST publishes; amount_usd_value is 0 because no official USD conversion appears on the page, and converting Korean won at a rate of our own would be the same kind of invention this pass exists to remove. THE CATCH is recorded in the description: fewer than 12 credits in the previous term costs the tuition waiver, which is how a student who lightens their course load loses the funding without being told twice.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 709;

-- ---------------------------------------------------------------------------
-- 668 — SKKU Samsung Global Sungkyun. NOT a duplicate: a real, separate award.
-- Was: "SKKU Samsung Global Scholarship & Foreign Student Grant", USD 18 000,
-- "Mar-Apr (Fall), Sep-Oct (Spring)", no conditions at all.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Samsung Global Sungkyun Scholarship for International Students (SKKU)',
  provider = 'Sungkyunkwan University (SKKU), funded by Samsung',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = 570000,
  award_currency = 'KRW',
  award_period = 'month',
  award_basis = 'fixed',
  funding_type = 'Corporate-funded full scholarship for nominated freshmen',
  tuition_coverage = 'Full dues including the entrance fee for four academic years (eight semesters), a living allowance of KRW 570,000 a month (KRW 3,400,000 a semester), priority in dormitory assignment with the dormitory fee paid in full if a place is assigned, a 1:1 mentoring programme and an exclusive counselling programme',
  deadline = 'Decided with the admission round - SKKU nominates from the strongest freshmen and notifies each nominee individually',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'There is no scholarship deadline because there is no scholarship application: SKKU nominates candidates from among the strongest freshmen on the admission evaluation result and tells each nominee after the second qualification announcement. SKKU''s 2027 spring undergraduate application window ran from 4 to 13 November 2026 with supporting documents due by 27 November 2026.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'This is the largest award SKKU offers an international undergraduate, and it does not come from the university budget - Samsung funds it. It pays the full dues including the entrance fee for the whole four years, adds a living allowance of KRW 570,000 a month, covers the dormitory fee outright for anyone assigned a place, and wraps mentoring and counselling around the scholar. There is no application form: SKKU nominates candidates from among the strongest freshmen on the admission evaluation result, sometimes with an interview, and tells the nominee individually after the second qualification announcement. Keeping it is the hard part. A holder must carry at least 12 credits a semester, nine of them in the seventh semester, keep a semester GPA of 3.7 or an overall GPA of 3.7 with no failing grade - and in the first and second semesters the bar is 3.5 rather than 3.7. Miss once and the allowance stops for the following semester; miss twice and the scholarship is gone for the rest of the programme. Note that this is an undergraduate award despite the Samsung name appearing on graduate-focused lists, and it is separate from SKKU''s own admission scholarship, which is recorded in this catalogue as SKKU''s admission and merit scholarship.',
  requirements = 'Be admitted to an SKKU undergraduate programme as an international freshman and be nominated from among the strongest candidates on the admission evaluation result - a separate application is neither required nor accepted. Some nominations involve an interview. To hold the award, take at least 12 credits each semester (9 in the seventh semester), keep a semester GPA of 3.7 or better, or an overall GPA of 3.7, with no F grade; the first two semesters use a 3.5 threshold. One failure suspends the allowance for the following semester and a second removes the scholarship permanently, following article 4 of the SKKU scholarship regulation. Apply to SKKU through the global admissions portal during the intake window and pay the application fee of KRW 100,000.',
  required_documents = '["SKKU global admissions application at admission-global.skku.edu","Passport and family documentation","Certified high school transcripts and diploma, with apostille or embassy legalisation","Proof of language proficiency","Statement of purpose and study plan","Recommendation letters where the department asks for them","Application fee of KRW 100,000"]',
  english_requirements = 'SKKU accepts English proficiency evidence for English-taught study and Korean proficiency (TOPIK) for Korean-taught programmes, and publishes separate language scholarships: TOPIK 6 or SLI level 6 earns a 100% tuition waiver and IELTS 8.0 or TOEFL iBT 110 earns the same, with 50% for TOPIK 5 or IELTS 7.0 / TOEFL 95.',
  website_url = 'https://admission-global.skku.edu/eng/grad/scholarship_undergrad.html',
  source_url = 'https://admission-global.skku.edu/eng/grad/scholarship_undergrad.html',
  application_url = 'https://admission-global.skku.edu/eng/',
  application_status = 'open',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from SKKU''s own international scholarship page (fetched 2026-10-23), which describes the Samsung Global Sungkyun Scholarship in detail: nomination from remarkable freshmen on the admission evaluation result, full dues for four academic years including the entrance fee, a living allowance of KRW 570,000 a month (KRW 3,400,000 a semester), priority dormitory assignment with fees paid, and the 12-credit and 3.7 GPA conditions with the twice-and-out rule. CORRECTIONS: the imported record was called "SKKU Samsung Global Scholarship & Foreign Student Grant", invented USD 18,000 and a "Mar-Apr (Fall), Sep-Oct (Spring)" deadline, pointed only at www.skku.edu, and carried no conditions at all - which for this award is the dangerous omission, since a scholar who drops below the GPA twice loses the money permanently. The "& Foreign Student Grant" half does not exist as a separate SKKU award on the university''s page. This row was checked against 451 before being rewritten and is NOT a duplicate of it: 451 is SKKU''s general 10-100% admission waiver with no stipend, while this one is the Samsung-funded full package. AMOUNT: award_amount carries the published monthly living allowance of KRW 570,000; amount_usd_value is 0 because SKKU publishes no USD equivalent.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 668;

-- ---------------------------------------------------------------------------
-- 451 — SKKU. Was: "SKKU Superior Global Scholarship" described as a Samsung-funded
-- full waiver "for top international postgraduates". Wrong name, wrong level, and
-- the general award pays no stipend at all.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'SKKU International Admission Scholarship and Merit Scholarship',
  provider = 'Sungkyunkwan University (SKKU)',
  coverage_type = 'Tuition Waiver',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'KRW',
  award_period = 'year',
  award_basis = 'range',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = 'The admission scholarship waives 10 to 100 percent of dues including the entrance fee for the first semester; from the second semester a merit scholarship waives 70, 50 or 30 percent of tuition depending on the student''s rank in the previous semester. Neither includes a living allowance',
  deadline = 'Decided with the admission round - no separate scholarship application',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'SKKU awards the first-semester scholarship automatically on the admission evaluation and publishes the nomination result with the admission announcement, so there is no scholarship deadline of its own. SKKU''s 2027 spring undergraduate application window ran from 4 to 13 November 2026 with supporting documents due by 27 November 2026, and the autumn round follows the same pattern.',
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'SKKU''s own money works in two stages, and neither stage has an application form. At admission, every successful international freshman is ranked on the admission evaluation and receives a first-semester waiver of 10 to 100 percent of dues, entrance fee included; the result appears with the admission announcement, so an applicant finds out what they got at the same moment they find out they were admitted. From the second semester the award becomes a ranking competition inside the university: the top 6 percent of the previous semester earn 70 percent, the band from 6 to 18 percent earns 50 and the band from 18 to 30 percent earns 30, with freshmen and continuing students ranked separately. To be counted a student needs at least 12 credits in the previous semester, nine in the seventh semester, and no failing grade. Separate language scholarships sit alongside and can be worth more: TOPIK level 6 or completion of level 6 at SKKU''s language institute earns a full tuition waiver for the first semester, and IELTS 8.0 or TOEFL iBT 110 earns the same, with half for TOPIK 5 or IELTS 7.0 and TOEFL 95. This row covers the admission and merit ladder only; the far larger Samsung-funded award is a separate record.',
  requirements = 'Be admitted to an SKKU undergraduate programme as an international freshman, and be ranked highly enough on the admission evaluation to receive a first-semester waiver - the ladder runs from 10 percent at the tenth to fifty-fifth percentile of successful candidates up to 100 percent at the top 2 percent in SKKU''s own published table. No separate scholarship application is made or accepted. To hold a merit scholarship from the second semester, complete at least 12 credits in the previous semester, nine before the final semester, without any failing grade, and rank in the top 30 percent of the cohort; the top 6 percent earn 70 percent, 6 to 18 percent earn 50 and 18 to 30 percent earn 30. Language scholarships require the specific TOPIK or IELTS or TOEFL score and are granted even if the score arrives after admission but before the semester begins.',
  required_documents = '["SKKU global admissions application at admission-global.skku.edu","Passport and family documentation","Certified high school transcripts and diploma with apostille or embassy legalisation","TOPIK, IELTS or TOEFL certificate","Statement of purpose and study plan","Recommendation letters where the department asks for them","Application fee of KRW 100,000"]',
  english_requirements = 'English-taught study requires IELTS or TOEFL evidence, and English proficiency doubles as a scholarship trigger: IELTS 8.0 or TOEFL iBT 110 earns a full first-semester tuition waiver and IELTS 7.0 or TOEFL 95 earns half. Korean-taught programmes require TOPIK, where level 6 earns the full waiver and level 5 half.',
  website_url = 'https://admission-global.skku.edu/eng/grad/scholarship_undergrad.html',
  source_url = 'https://admission-global.skku.edu/eng/grad/scholarship_undergrad.html',
  application_url = 'https://admission-global.skku.edu/eng/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from SKKU''s own international scholarship page (fetched 2026-10-23). CORRECTIONS, and this row was actively misleading: the imported record was called "SKKU Superior Global Scholarship" and described "full 100% tuition waiver and living stipend funded in partnership with Samsung for top international POSTGRADUATES". Three things were wrong. The name is not one SKKU uses. The Samsung award it gestures at is for UNDERGRADUATES, not postgraduates, and it now has its own record. And SKKU''s general admission scholarship is not a full waiver with a stipend - it is a 10 to 100 percent first-semester waiver, followed by 30 to 70 percent merit waivers, with no stipend at all, which is the opposite of what a student budgeting on the old row would have expected. The invented USD 22,000 is gone. AMOUNT: deliberately 0 with no single figure, because the award runs from a 10 percent waiver to a full one and then to a ranking-based 30 to 70 percent, and no one number describes it honestly. STATUS: closed, because the 2027 spring round that SKKU published (4-13 November 2026) has passed as this record is written; the autumn round is the next opportunity.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 451;

-- ---------------------------------------------------------------------------
-- 585 — Hanyang → retired. Duplicate of id 452, and "HIEA" is an invented name.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicate of the Hanyang International Scholarship Program (id 452)',
  deadline = 'Retired 2026-10-23 - see id 452',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://oia.hanyang.ac.kr/scholarships',
  source_url = 'https://oia.hanyang.ac.kr/scholarships',
  notes = 'RETIRED 2026-10-23 as a duplicate with fabricated content. The record was called "Hanyang International Excellence Awards (HIEA) & GKS", invented USD 21,000, gave an "Apr (Fall), Oct (Spring)" deadline and pointed only at the university home page. Two separate faults. First, it duplicates the Hanyang International Scholarship Program already recorded as id 452, which describes the same 100 percent and 70 percent tuition waivers for incoming international students. Second, the "& GKS" half is the Global Korea Scholarship, a national programme that Hanyang does not award; it is recorded as id 863 and should be applied for through the Korean embassy in Tashkent or through NIIED, not through Hanyang. The "HIEA" name also does not appear on Hanyang''s own international office scholarship page, so the name was an importer invention. Nothing is lost by retiring this row: the Hanyang award stays in the catalogue as id 452 and GKS stays as id 863.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 585;

-- ---------------------------------------------------------------------------
-- 652 — POSTECH → retired. Duplicate of ids 453 and 493; no "POSTECH Global
-- Scholarship" exists by that name.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicate of the POSTECH records (ids 453 and 493)',
  deadline = 'Retired 2026-10-23 - see ids 453 and 493',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://adm-iu.postech.ac.kr/user/comm/menu/e2afb97fa1b8f43c574be0dabef78f87/content/index.do',
  source_url = 'https://adm-iu.postech.ac.kr/user/comm/menu/e2afb97fa1b8f43c574be0dabef78f87/content/index.do',
  notes = 'RETIRED 2026-10-23 as a duplicate with fabricated content. The record was called "POSTECH Global Scholarship & GKS", invented USD 32,000, gave a "Mar-Apr (Fall)" deadline and pointed only at the POSTECH home page. POSTECH is already represented twice and correctly: id 453 for the graduate fellowship and id 493 for the international undergraduate scholarship. Retiring this third copy also removes a name that does not exist on POSTECH''s site - there is no "POSTECH Global Scholarship" - and the "& GKS" half is the national Global Korea Scholarship, recorded as id 863, which POSTECH lists as an embassy-track route rather than as its own award. The verified POSTECH figures, read on the university''s own undergraduate scholarship page on 2026-10-23, are worth keeping in the record even though the row is retired: a full tuition waiver for the first semester for every admitted undergraduate, continued for up to eight semesters on a GPA of 3.0 out of 4.3; a Pathfinder voucher of KRW 2,500,000 a year for four years; an arrival scholarship reimbursing one-way economy airfare up to KRW 2,500,000; a living allowance of KRW 500,000 a month with no GPA condition for all international undergraduates; and a one-off KRW 300,000 for reaching TOPIK level 4. Those figures belong in id 493, which is the surviving undergraduate record.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 652;

-- ---------------------------------------------------------------------------
-- 819 — KAIST → retired. Duplicate of id 310.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false, coverage_type = 'Unspecified', amount_usd_value = 0, award_amount = NULL,
  award_basis = 'variable',
  tuition_coverage = 'Retired 2026-10-23 - duplicate of the KAIST record (id 310)',
  deadline = 'Retired 2026-10-23 - see id 310',
  deadline_type = 'not_published', deadline_date = NULL, expected_deadline_period = NULL,
  website_url = 'https://admission.kaist.ac.kr/intl-graduate/sub0302',
  source_url = 'https://admission.kaist.ac.kr/intl-graduate/sub0302',
  notes = 'RETIRED 2026-10-23 as a duplicate with fabricated content. The record was called "KAIST International Student Scholarship", invented USD 36,000, gave a "Jan (Fall), Sep (Spring) / Oct (Early)" deadline and pointed only at the KAIST home page. KAIST''s own international scholarship is already recorded as id 310, "KAIST International Student Full Scholarship", which describes the same full tuition waiver, national health insurance and monthly living stipend awarded to admitted foreign students. Two reward records for one award make the catalogue look as though KAIST runs two separate schemes, and the invented USD 36,000 was more than the row it duplicates. The deadline was also unreliable: it mixed two different intake calendars into one string. Nothing is lost by retiring this row - the award stays as id 310, and the Global Korea Scholarship that people confuse with it is id 863.',
  last_verified_at = NOW(), last_updated_at = NOW()
WHERE id = 819;
