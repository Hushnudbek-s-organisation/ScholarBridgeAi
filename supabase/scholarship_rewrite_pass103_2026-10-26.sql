-- ScholarBridge AI - Scholarship Rewrite Pass 103 - 2026-10-26
-- China rel4 cluster closed (7 records): rewrote 153 (SJTU Scholarship for
-- International Graduate Students) from official pages fetched 2026-10-26;
-- retired 118 (PKU: no President Scholarship published), 143 (Fudan:
-- government-schemes directory), 307 (ZJU: invalid notices column /
-- directory), 322 (USTC: duplicate of verified record 778), 358 (Wuhan:
-- generic title, stored URL redirects to homepage), 478 (NJU: no
-- International Excellence Scholarship in the official menu).
-- Side tables: 7 sources repointed; 5 university_scholarships rows
-- withdrawn, 1 synced (568). Statements below replay the exact executed
-- SQL (RETURNING omitted). NOTE: the first sources UPDATE attempt failed
-- on the idx_sources_url unique constraint (the intended NJU URL
-- https://hwxy.nju.edu.cn/en/ already exists as source 1054) and rolled
-- back in full; the corrected, executed version (source 908 -> the
-- institute scholarships index) is what is replayed here.
-- See docs/SCHOLARSHIP_REWRITE_PASS_103_2026-10-26.md.

-- 153 SJTU -> SJTU Scholarship for International Graduate Students (tiered)
UPDATE scholarships SET
  title = 'SJTU Scholarship for International Graduate Students',
  provider = 'Shanghai Jiao Tong University (Graduate School)',
  coverage_type = 'Tuition Waiver + Monthly Stipend (tiered)',
  amount_usd_value = 0,
  deadline = $dl$Annual, admission-linked: select 'apply for scholarship through SJTU' in the online application (apply.sjtu.edu.cn) and complete it by the cycle's scholarship deadline - in the most recent fetched admissions notice (2025 entry) applications opened 1 October and the SJTU Scholarship deadline was 31 March, with September enrolment. Dates for the next cycle must be confirmed in the latest SJTU International Graduate Admissions notice.$dl$,
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["All SJTU international graduate programmes (100+ programmes taught in English or Chinese across 34 schools/departments); some schools/colleges additionally offer their own School/College Scholarships"]$json$,
  eligible_countries = $json$["All countries - applicants must be non-Chinese citizens holding a valid ordinary passport"]$json$,
  min_gpa = NULL, min_ielts = NULL,
  financial_need_based = false, merit_based = true,
  description = $desc$The SJTU Scholarship is Shanghai Jiao Tong University's own scholarship scheme for incoming international graduate students, applied for through the university's online application system when applying for admission (choose 'apply for scholarship through SJTU'; SJTU agency code 10248). At doctoral level, SJTU scholarships comprise a monthly stipend, tuition waiver, group comprehensive medical insurance in China and an accommodation subsidy covering part of accommodation expenses (SJTU does not provide free dormitories). At master's level the SJTU Scholarship includes a monthly stipend, a standard tuition waiver, group comprehensive insurance and an accommodation subsidy; a separate Tuition Waiver Scholarship (standard tuition waiver plus insurance) and School/College Scholarships are also awarded through the same channel. The SJTU Scholarship, Tuition Waiver Scholarship and School/College Scholarships may cover full or partial tuition depending on the award tier and school - the Graduate School advises applicants to consult the relevant school in advance, and the exact stipend and subsidy amounts for an applicant are confirmed in the scholarship instructions inside the application system (no single cash figure is published for all graduate students). Scholarship duration follows the standard programme length (master's 2-3 years, doctoral typically 4 years) and generally cannot be extended; all recipients must pass the university's annual scholarship review (April/May), which determines their status for the following academic year. Applicants must choose one scholarship channel only - through SJTU or through Chinese embassies/consulates - as duplicate applications are not permitted. (The Chinese Government Scholarship/CGS and Shanghai Government Scholarship/SGS routes to SJTU, and the doctoral SJTU Fellowship listed alongside this scheme, are separate awards and are not part of this record.)$desc$,
  requirements = $req$Be a non-Chinese citizen with a valid passport, in good physical and mental health and of good character (no criminal record; willing to comply with Chinese law and SJTU regulations). Hold a Bachelor's degree (or recognised equivalent) for master's admission, or a Master's degree for doctoral admission (certain schools may accept Bachelor's holders for direct doctoral entry). Apply online for admission and select 'apply for scholarship through SJTU', completing the scholarship procedures before the cycle deadline (application fee RMB 800); only one scholarship channel may be used (through SJTU or through a Chinese embassy/consulate). The sooner a complete application is submitted, the sooner admission and scholarship results are issued. Recipients must take part in the annual scholarship review each April/May.$req$,
  funding_type = 'University scholarship (tiered by level and school): monthly stipend, full or partial tuition waiver, group comprehensive medical insurance and accommodation subsidy - amounts confirmed in the SJTU application system',
  tuition_coverage = $tc$The SJTU Scholarship can cover full or partial tuition depending on the award tier and the school (the Graduate School advises consulting the school in advance). For scale, standard tuition in the fetched 2025 admissions notice was RMB 45,500 per year for doctoral programmes, with master's tuition varying by programme.$tc$,
  living_allowance = NULL,
  english_requirements = 'Set out in SJTU''s Language Requirements for International Graduate Programs: English proficiency (e.g. TOEFL/IELTS) for English-taught programmes and Chinese proficiency (HSK) for Chinese-taught programmes; no single score applies across all programmes, so none is stored.',
  required_documents = $json$["Online application at apply.sjtu.edu.cn selecting 'apply for scholarship through SJTU', with the RMB 800 application fee","Scanned degree certificates (or official expected-graduation letter if not yet graduated)","Transcripts (undergraduate for master's applicants; undergraduate and graduate for doctoral applicants)","Proof of language proficiency per the SJTU graduate language requirements","Scanned copy of passport (ordinary passport) and passport-size photo","Personal statement and study plan","Two academic recommendation letters from associate professors or above (or senior professionals in a related field)","Supervisor acceptance letter where the admitting school requires prior supervisor contact (specified schools/programmes); certified translations for documents not in English or Chinese"]$json$,
  website_url = 'https://global.sjtu.edu.cn/en/study-sjtu/prospective/scholarships/62',
  source_url = 'https://global.sjtu.edu.cn/en/study-sjtu/prospective/scholarships/62',
  application_url = 'http://apply.sjtu.edu.cn/',
  deadline_date = NULL, deadline_type = 'not_published', deadline_range_start = NULL, deadline_range_end = NULL,
  rounds = $json$[{"cycle":"2025 entry (most recent admissions notice read)","opens":"2024-10-01","sjtu_scholarship_deadline":"2025-03-31","self_supported_deadline":"2025-05-31","enrolment":"September 2025","status":"closed"},{"pattern":"Annual: applications open in autumn with a spring (31 March in the notice read) scholarship deadline and September enrolment - confirm the current cycle's dates in the latest SJTU International Graduate Admissions notice"}]$json$,
  recurrence = 'annual',
  expected_opening_period = $exp$Autumn (1 October in the 2025-cycle notice read).$exp$,
  expected_deadline_period = $exp$Annual graduate admission cycle; the SJTU Scholarship deadline in the fetched 2025 notice was 31 March, ahead of the 31 May self-supported deadline and September enrolment.$exp$,
  application_status = 'closed',
  verification_status = 'verified', source_reliability = 9, is_active = true,
  last_verified_at = now(), last_updated_at = now(),
  notes = $note$REWRITTEN 2026-10-26 (cleanup pass 103) from two official SJTU pages fetched the same day: the Study@SJTU 'SJTU Scholarship' page (standing scheme description - doctoral: monthly stipend, tuition waiver, group comprehensive insurance, partial accommodation subsidy; master's SJTU Scholarship and separate Tuition Waiver Scholarship; school/college scholarships per prospectus; amounts confirmed in the application system) and the Graduate School's 2025 International Graduate Admissions notice (non-Chinese-citizen eligibility and degree requirements; one-channel rule via apply.sjtu.edu.cn, agency code 10248; SJTU Scholarship deadline 31 March 2025; full-or-partial tuition note; no free dormitories; annual April/May review; materials list and RMB 800 fee; doctoral tuition RMB 45,500/year). The previously stored ISC URL now returns an ASP.NET HTTP 404. award_amount is NULL (variable): SJTU does not publish one graduate stipend figure - tier/school-specific amounts are given in the application system; older school-page tier tables seen in search results were deliberately not stored as they were not read as current first-hand terms. Reliability 9 (not 10): the most recent admissions notice read is the 2025-entry cycle, so deadline_date is NULL/'not_published' with status closed and the annual pattern recorded for re-verification against the next notice. min_gpa/min_ielts NULL (no single official figures; language evidence is per the graduate language-requirements document). Previous record held this scheme at reliability 4 with no values read. university_scholarships row 568 synced; source 2615 repointed from the bare domain to the Study@SJTU scholarship page.$note$,
  university_id = 41,
  award_amount = NULL, award_currency = 'CNY', award_period = 'year', award_basis = 'variable'
WHERE id = 153;

-- 6 retirements: invented names / directories / duplicate
UPDATE scholarships SET title='Peking University President Scholarship (retired: no such named award published)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 103): Peking University's International Students Division site (fetched 2026-10-26) publishes five scholarship categories - Chinese Government Scholarship, Beijing Government Scholarship for International Students, CLEC (Chinese language) scholarship, the Peking University Scholarship for International Students, and donor-funded scholarships - and no 'President Scholarship' for international students appears among them. The stored URL is the division homepage, and no award of this name could be verified, so the record is retired rather than kept under an invented name. The university's real institutional scheme, the Peking University Scholarship for International Students, is a differently named award and a candidate for a future additions batch after its own verification; Peking University coverage meanwhile remains via records 894 (Yenching Academy, rel 10), 31 and 849 (CSC). university_scholarships row 641 withdrawn; linked source 2589 repointed from the bare domain to the fetched ISD site.$rn$ WHERE id=118;
UPDATE scholarships SET title='Fudan University International Graduate Scholarship (retired: funding directory, not a named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 103): Fudan International Students Office's Scholarships page (fetched 2026-10-26) explains that Fudan international students are supported by the Chinese Government Scholarship, Shanghai Government Scholarship and Confucius Institute Scholarship - government schemes administered through the university - and publishes no Fudan 'International Graduate Scholarship'. The stored URL is the ISO homepage. Retired as a generic directory record rather than shown as a single university award; Fudan coverage remains via records 44 and 554 (CSC at Fudan, rel 9). university_scholarships row 540 withdrawn; linked source 2527 repointed from the bare domain to the fetched ISO scholarships page.$rn$ WHERE id=143;
UPDATE scholarships SET title='Zhejiang University International Postgraduate Scholarship (retired: funding directory, not a named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 103): the stored International College URL is now an invalid column address (fetched 2026-10-26: 'column 54 not found'), and Zhejiang University's official international-admissions pages list its funding routes as the Chinese Government Scholarship (Type A/Bilateral, Type B/Chinese University Program, Youth of Excellence Scheme), the Zhejiang (Provincial) Government Scholarship, and school-level schemes (e.g. China-ASEAN Oceanic Scholarship, ZIBS Hai Scholarship, ZJU-ISM Master's Freshman Scholarship) - not a single award named 'Zhejiang University International Postgraduate Scholarship'. Retired as a directory record; Zhejiang University coverage remains via record 846 (Zhejiang Provincial Government Scholarship at ZJU, rel 9) and the central CSC record 866. university_scholarships row 35 withdrawn (its legacy max_scholarship claim 'Full Ride' replaced); linked source 2777 repointed from the bare domain to the fetched invalid URL.$rn$ WHERE id=307;
UPDATE scholarships SET title='USTC Fellowship for International Students (retired: duplicate of record 778)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 103): duplicate - the USTC Fellowship for international students is already catalogued as verified record 778 ('USTC Fellowship for International Students (Levels A, B and C)', reliability 9, same university 186). The stored bulletin-list URL now redirects to the International College admissions hub (fetched 2026-10-26), which presents the same USTC Fellowship by programme level (undergraduate/master's/doctoral/non-degree). This unverified rel-4 copy held no values and is retired so the scheme appears once. university_scholarships row 574 withdrawn; linked source 2681 repointed from the bare domain to the fetched (redirecting) stored URL.$rn$ WHERE id=322;
UPDATE scholarships SET title='Wuhan University International Student Scholarship (retired: funding directory, not a named scholarship)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 103): the stored URL (whu.edu.cn/en/scholarships/) no longer resolves to any scholarships page - when fetched on 2026-10-26 it redirects to the Wuhan University homepage - and the title names no specific award (a generic 'International Student Scholarship') with no values, eligibility or deadline ever read. Retired as a directory record rather than rewritten into an unstated scheme; Wuhan University coverage remains via record 792 (Academic Freshman Scholarship, rel 9) and the central CSC record 866. Linked source 2699 repointed from the bare domain to the fetched (redirecting) stored URL.$rn$ WHERE id=358;
UPDATE scholarships SET title='Nanjing University International Excellence Scholarship (retired: no such named award published)', is_active=false, application_status='closed', source_reliability=9, deadline_date=NULL, deadline_type='not_published', last_verified_at=now(), last_updated_at=now(), notes = notes || $rn$ RETIRED 2026-10-26 (cleanup pass 103): the Institute for International Students' official site (fetched 2026-10-26; the stored /en/ address resolves to the institute homepage) lists exactly four scholarship schemes in its scholarship menu - Chinese Government Scholarship, Nanjing Municipal Government Scholarship, International Chinese Language Teachers Scholarship, and the Confucius China Studies Program scholarship - and no 'International Excellence Scholarship'. No award of this name could be verified, so the record is retired rather than kept under an invented name; Nanjing University coverage remains via record 631 (CSC Silk Road Program at NJU). The Nanjing Municipal Government Scholarship published in the same menu is a differently structured government scheme and a possible future additions candidate after its own verification. university_scholarships row 497 withdrawn; linked source 908 repointed from the bare EN domain to the fetched institute site.$rn$ WHERE id=478;

-- Sources repointed from bare domains (rewrite -> live award page;
-- retirements -> fetched pages/URLs; 908 -> institute scholarships index
-- because the /en/ URL already exists as source 1054)
UPDATE sources SET
  url = CASE id
    WHEN 2589 THEN 'https://www.isd.pku.edu.cn/'
    WHEN 2527 THEN 'https://iso.fudan.edu.cn/isoenglish/16210/list.htm'
    WHEN 2615 THEN 'https://global.sjtu.edu.cn/en/study-sjtu/prospective/scholarships/62'
    WHEN 2777 THEN 'https://iczu.zju.edu.cn/iczuen/54/list.htm'
    WHEN 2681 THEN 'https://ic.ustc.edu.cn/en/v7info.php?Nav_Action=bulletin_list&s_id=64'
    WHEN 2699 THEN 'https://whu.edu.cn/en/scholarships/'
    WHEN 908 THEN 'https://hwxy.nju.edu.cn/lxnd/zsxx/jxj/index.html'
  END,
  domain = CASE id
    WHEN 2589 THEN 'isd.pku.edu.cn'
    WHEN 2527 THEN 'iso.fudan.edu.cn'
    WHEN 2615 THEN 'global.sjtu.edu.cn'
    WHEN 2777 THEN 'iczu.zju.edu.cn'
    WHEN 2681 THEN 'ic.ustc.edu.cn'
    WHEN 2699 THEN 'whu.edu.cn'
    WHEN 908 THEN 'hwxy.nju.edu.cn'
  END,
  title = CASE id
    WHEN 2589 THEN 'Peking University International Students Division Official Site (fetched 2026-10-26)'
    WHEN 2527 THEN 'Fudan University ISO Scholarships Page (fetched 2026-10-26)'
    WHEN 2615 THEN 'SJTU Scholarship Official Page (Study@SJTU)'
    WHEN 2777 THEN 'Zhejiang University International College Stored URL (fetched 2026-10-26; invalid column)'
    WHEN 2681 THEN 'USTC International College Stored URL (fetched 2026-10-26; redirects to Admissions hub)'
    WHEN 2699 THEN 'Wuhan University Stored Scholarships URL (fetched 2026-10-26; redirects to homepage)'
    WHEN 908 THEN 'Nanjing University Institute for International Students - Scholarships Index (via institute site fetched 2026-10-26)'
  END,
  accessed_at = now()
WHERE id IN (2589, 2527, 2615, 2777, 2681, 2699, 908);

-- university_scholarships: 5 withdrawals + 1 sync (568 SJTU)
UPDATE university_scholarships SET
  scholarship_name = CASE id
    WHEN 641 THEN 'Peking University President Scholarship (retired: no such named award published)'
    WHEN 540 THEN 'Fudan University International Graduate Scholarship (retired: funding directory, not a named scholarship)'
    WHEN 568 THEN 'SJTU Scholarship for International Graduate Students'
    WHEN 35 THEN 'Zhejiang University International Postgraduate Scholarship (retired: funding directory, not a named scholarship)'
    WHEN 574 THEN 'USTC Fellowship for International Students (retired: duplicate of record 778)'
    WHEN 497 THEN 'Nanjing University International Excellence Scholarship (retired: no such named award published)'
  END,
  availability_status = CASE WHEN id = 568 THEN availability_status ELSE 'No' END,
  max_scholarship = CASE id
    WHEN 641 THEN 'No confirmed award: PKU''s International Students Division publishes no President Scholarship (its university scheme carries a different name)'
    WHEN 540 THEN 'No confirmed award: Fudan ISO lists government scholarships only, not a university graduate scholarship'
    WHEN 568 THEN 'Monthly stipend, tuition waiver (full or partial), insurance and accommodation subsidy by tier - amounts confirmed in the SJTU application system'
    WHEN 35 THEN 'No confirmed award: the stored page is an invalid notices column; ZJU instead publishes CSC, provincial-government and school-level schemes'
    WHEN 574 THEN 'Duplicate: the USTC Fellowship is catalogued as scholarship record 778'
    WHEN 497 THEN 'No confirmed award: the institute''s scholarship menu lists CSC, municipal government, language-teacher and Confucius schemes, not this award'
  END,
  last_verified_at = now()
WHERE id IN (641, 540, 568, 35, 574, 497);
