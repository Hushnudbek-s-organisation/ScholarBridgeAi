-- Read-only live catalogue audit. No user/profile tables are read or changed.
-- structural_error = technical inconsistency; review = not proof of bad facts.
-- Pass a different as_of date explicitly when replaying this historical audit.
WITH clock AS (SELECT DATE '2026-11-02' AS as_of), checks AS (
SELECT 'structural_error' AS severity, 'university_missing_identity_or_description' AS issue, count(*) AS rows
FROM public.universities WHERE is_active AND
  (coalesce(btrim(name),'')='' OR coalesce(btrim(country),'')='' OR coalesce(btrim(description),'')='')
UNION ALL SELECT 'structural_error','university_invalid_numeric_values',count(*) FROM public.universities WHERE is_active AND
  (min_gpa<0 OR min_gpa>4 OR min_ielts<0 OR min_ielts>9 OR min_sat<400 OR min_sat>1600 OR
   acceptance_rate<0 OR acceptance_rate>100 OR international_students_percentage<0 OR international_students_percentage>100 OR
   annual_tuition<0 OR annual_living_est<0 OR accommodation_cost<0 OR world_ranking<=0)
UNION ALL SELECT 'structural_error','program_orphan_university',count(*) FROM public.programs p
  WHERE NOT EXISTS(SELECT 1 FROM public.universities u WHERE u.id=p.university_id)
UNION ALL SELECT 'structural_error','program_missing_core_fields',count(*) FROM public.programs WHERE is_active AND
  (coalesce(btrim(name),'')='' OR coalesce(btrim(field),'')='' OR coalesce(btrim(degree_level),'')='' OR
   coalesce(btrim(description),'')='' OR coalesce(official_url,'') !~ '^https?://' OR coalesce(source_url,'') !~ '^https?://')
UNION ALL SELECT 'structural_error','program_verification_flag_mismatch',count(*) FROM public.programs
  WHERE is_verified IS DISTINCT FROM (verification_status='verified')
UNION ALL SELECT 'structural_error','program_negative_tuition_or_invalid_duration',count(*) FROM public.programs
  WHERE annual_tuition<0 OR duration<=0
UNION ALL SELECT 'structural_error','requirement_orphan_program',count(*) FROM public.program_requirements r
  WHERE NOT EXISTS(SELECT 1 FROM public.programs p WHERE p.id=r.program_id)
UNION ALL SELECT 'structural_error','requirement_invalid_scores',count(*) FROM public.program_requirements WHERE
  min_gpa<0 OR min_gpa>4 OR min_ielts<0 OR min_ielts>9 OR min_toefl<0 OR min_toefl>120 OR
  min_det<10 OR min_det>160 OR min_sat<400 OR min_sat>1600 OR min_act<1 OR min_act>36
UNION ALL SELECT 'structural_error','cycle_wrong_program_university',count(*) FROM public.application_cycles c
  WHERE c.program_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.programs p WHERE p.id=c.program_id AND p.university_id=c.university_id)
UNION ALL SELECT 'structural_error','cycle_reversed_dates',count(*) FROM public.application_cycles WHERE opening_date>deadline
UNION ALL SELECT 'structural_error','cycle_verified_flag_mismatch',count(*) FROM public.application_cycles
  WHERE is_verified IS DISTINCT FROM (verification_status='verified')
UNION ALL SELECT 'structural_error','cycle_estimated_flag_mismatch',count(*) FROM public.application_cycles
  WHERE is_estimated IS DISTINCT FROM (verification_status<>'verified')
UNION ALL SELECT 'review','active_verified_cycle_past_calendar_deadline',count(*) FROM public.application_cycles, clock
  WHERE is_active AND verification_status='verified' AND deadline<clock.as_of
UNION ALL SELECT 'review','verified_ranking_missing_source_link',count(*) FROM public.university_rankings
  WHERE verification_status='verified' AND source_id IS NULL
UNION ALL SELECT 'review','verified_ranking_missing_verification_timestamp',count(*) FROM public.university_rankings
  WHERE verification_status='verified' AND verified_at IS NULL
UNION ALL SELECT 'review','unsourced_the_rank_exactly_qs_plus_20',count(*) FROM public.university_rankings r
  JOIN public.universities u ON u.id=r.university_id
  WHERE r.ranking_provider='Times Higher Education' AND r.source_id IS NULL AND r.rank=u.world_ranking+20
UNION ALL SELECT 'review','program_source_is_homepage',count(*) FROM public.programs
  WHERE is_active AND source_url ~ '^https?://[^/]+/?$'
UNION ALL SELECT 'review','legacy_program_tuition_differs',count(*) FROM public.programs
  WHERE is_active AND tuition_amount IS NOT NULL AND tuition_amount<>annual_tuition
)
SELECT * FROM checks ORDER BY severity,issue;

-- Evidence queue: do not attach a guessed source or verification timestamp.
SELECT r.id, u.name, r.ranking_provider, r.ranking_name, r.ranking_year,
       r.rank, r.rank_label, r.source_id, r.verified_at
FROM public.university_rankings r JOIN public.universities u ON u.id=r.university_id
WHERE r.verification_status='verified' AND (r.source_id IS NULL OR r.verified_at IS NULL)
ORDER BY r.ranking_provider,r.id;

-- Calendar-expired does NOT mean factually unverified. Preserve the recorded
-- deadline and verification; review archive/status display, accounting for the
-- provider's deadline timezone, rather than fabricating next year's deadline.
SELECT c.id,u.name,c.program_id,c.deadline,c.deadline_timezone,c.application_type,c.source_url
FROM public.application_cycles c JOIN public.universities u ON u.id=c.university_id
WHERE c.is_active AND c.verification_status='verified' AND c.deadline<DATE '2026-11-02'
ORDER BY c.deadline,c.id;
