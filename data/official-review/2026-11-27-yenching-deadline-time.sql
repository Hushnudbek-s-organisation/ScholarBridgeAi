-- Official 2027 international application round:
-- https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm
-- Apply only after verifying the target instance and deploying exact-time support.
BEGIN;
DO $review$
DECLARE
  target_id integer;
  current_rounds text;
  reviewed_rounds text := '[{"name":"2027 international applicants","deadline":"2026-11-30","deadlineAt":"2026-11-30T01:00:00Z","timezone":"Asia/Shanghai","applicantScope":"international"}]';
BEGIN
  SELECT id, rounds INTO STRICT target_id, current_rounds
  FROM public.scholarships
  WHERE title ILIKE '%Yenching Academy Fellowship%'
    AND provider ILIKE '%Peking University%'
    AND source_url = 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm'
    AND deadline_date = DATE '2026-11-30'
    AND verification_status = 'verified'
  FOR UPDATE;
  IF current_rounds = reviewed_rounds THEN RETURN; END IF;
  IF current_rounds IS NOT NULL AND current_rounds <> '[]' THEN
    RAISE EXCEPTION 'The stored Yenching rounds changed and require review';
  END IF;
  UPDATE public.scholarships SET rounds = reviewed_rounds, last_updated_at = now()
  WHERE id = target_id;
END
$review$;
COMMIT;
