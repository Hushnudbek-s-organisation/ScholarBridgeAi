-- Read-only scholarship integration audit; every returned issue count should
-- be zero. Optional/unknown award amounts and dates are deliberately allowed.
-- This does not verify the truth of provider claims or link availability.
WITH active AS (SELECT * FROM public.scholarships WHERE is_active)
SELECT 'missing_core_text' AS issue, count(*) AS rows FROM active
WHERE coalesce(btrim(title),'')='' OR coalesce(btrim(provider),'')=''
   OR coalesce(btrim(country),'')='' OR coalesce(btrim(description),'')=''
   OR coalesce(btrim(requirements),'')='' OR coalesce(btrim(english_requirements),'')=''
   OR coalesce(btrim(funding_type),'')='' OR coalesce(btrim(tuition_coverage),'')=''
   OR coalesce(btrim(deadline),'')=''
UNION ALL
SELECT 'invalid_coverage', count(*) FROM active WHERE coverage_type IS NULL OR coverage_type NOT IN
  ('Full Tuition + Stipend','Full Tuition','Full Funding','Partial Tuition','Partial Funding','Living Stipend','Tuition Waiver','Unspecified')
UNION ALL
SELECT 'invalid_award_basis', count(*) FROM active WHERE award_basis IS NOT NULL AND award_basis NOT IN
  ('fixed','range','full_tuition','need_based','variable')
UNION ALL
SELECT 'invalid_award_period', count(*) FROM active WHERE award_period IS NOT NULL AND award_period NOT IN
  ('total','year','month','one_time','variable')
UNION ALL
SELECT 'missing_updated_at', count(*) FROM active WHERE last_updated_at IS NULL
UNION ALL
SELECT 'invalid_gpa_or_ielts', count(*) FROM active WHERE min_gpa<0 OR min_gpa>4 OR min_ielts<0 OR min_ielts>9
UNION ALL
SELECT 'negative_amount', count(*) FROM active WHERE award_amount<0 OR amount_usd_value<0
UNION ALL
SELECT 'reversed_dates', count(*) FROM active WHERE opening_date>deadline_date OR deadline_range_start>deadline_range_end
UNION ALL
SELECT 'missing_or_invalid_source_url', count(*) FROM active WHERE coalesce(source_url,'') !~ '^https?://'
UNION ALL
SELECT 'missing_or_invalid_website_url', count(*) FROM active WHERE coalesce(website_url,'') !~ '^https?://'
UNION ALL
SELECT 'invalid_application_url', count(*) FROM active WHERE application_url IS NOT NULL AND application_url !~ '^https?://'
UNION ALL
SELECT 'invalid_json', count(*) FROM active
WHERE NOT coalesce(pg_input_is_valid(degree_levels,'jsonb'),false)
   OR NOT coalesce(pg_input_is_valid(eligible_majors,'jsonb'),false)
   OR NOT coalesce(pg_input_is_valid(eligible_countries,'jsonb'),false)
   OR NOT coalesce(pg_input_is_valid(required_documents,'jsonb'),false)
   -- No round information is a valid NULL, not malformed JSON.
   OR (rounds IS NOT NULL AND NOT pg_input_is_valid(rounds,'jsonb'));
