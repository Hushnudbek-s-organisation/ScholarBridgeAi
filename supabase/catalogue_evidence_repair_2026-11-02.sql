-- Transactional, reversible evidence repair. No fabricated replacements.
-- Five QS claims disagree with the repository's audited QS 2026 edition;
-- 324 rankings lack provenance; 1170 programmes cite only a homepage.
-- Apply via create_migration (transaction supplied by Supabase).
LOCK TABLE public.universities, public.university_rankings, public.programs,
  public.program_requirements, public.application_cycles IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS scholarbridge_maintenance;
REVOKE ALL ON SCHEMA scholarbridge_maintenance FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.catalogue_evidence_backup_20261102 (
  entity text NOT NULL, row_id integer NOT NULL, reason text NOT NULL,
  row_before jsonb NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(entity,row_id)
);
ALTER TABLE scholarbridge_maintenance.catalogue_evidence_backup_20261102 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE scholarbridge_maintenance.catalogue_evidence_backup_20261102 FROM PUBLIC, anon, authenticated;

INSERT INTO scholarbridge_maintenance.catalogue_evidence_backup_20261102(entity,row_id,reason,row_before)
SELECT 'universities',u.id,'QS 2026 claim absent from audited edition; preserve identity, remove unsupported position',to_jsonb(u)
FROM public.universities u WHERE u.id IN (37,208,298,341,342) AND (u.world_ranking IS NOT NULL OR u.qs_rank_year IS NOT NULL)
UNION ALL
SELECT 'university_rankings',r.id,'Missing source link or verification timestamp; pending publisher review',to_jsonb(r)
FROM public.university_rankings r WHERE r.verification_status='verified' AND (r.source_id IS NULL OR r.verified_at IS NULL)
UNION ALL
SELECT 'programs',p.id,'Homepage is not programme-specific evidence; retain discovery identity pending review',to_jsonb(p)
FROM public.programs p WHERE p.is_active AND p.verification_status='verified' AND p.source_url ~ '^https?://[^/]+/?$'
UNION ALL
SELECT 'program_requirements',r.id,'Only homepage evidence for programme requirements; pending review',to_jsonb(r)
FROM public.program_requirements r JOIN public.programs p ON p.id=r.program_id
WHERE p.is_active AND r.verification_status='verified' AND p.source_url ~ '^https?://[^/]+/?$' AND r.source_url ~ '^https?://[^/]+/?$'
UNION ALL
SELECT 'application_cycles',c.id,'Archived after deadline in the recorded timezone; verified historical fact retained',to_jsonb(c)
FROM public.application_cycles c
WHERE c.is_active AND c.verification_status='verified' AND c.deadline<DATE '2026-11-02'
  AND c.deadline < (now() AT TIME ZONE CASE WHEN EXISTS(SELECT 1 FROM pg_timezone_names z WHERE z.name=c.deadline_timezone) THEN c.deadline_timezone ELSE 'UTC' END)::date
ON CONFLICT(entity,row_id) DO NOTHING;

UPDATE public.universities u SET world_ranking=NULL,qs_rank_year=NULL
FROM scholarbridge_maintenance.catalogue_evidence_backup_20261102 b
WHERE b.entity='universities' AND b.row_id=u.id AND to_jsonb(u)=b.row_before;
UPDATE public.university_rankings r SET verification_status='unverified'
FROM scholarbridge_maintenance.catalogue_evidence_backup_20261102 b
WHERE b.entity='university_rankings' AND b.row_id=r.id AND to_jsonb(r)=b.row_before;
UPDATE public.programs p SET verification_status='unverified',is_verified=false
FROM scholarbridge_maintenance.catalogue_evidence_backup_20261102 b
WHERE b.entity='programs' AND b.row_id=p.id AND to_jsonb(p)=b.row_before;
UPDATE public.program_requirements r SET verification_status='unverified',is_verified=false
FROM scholarbridge_maintenance.catalogue_evidence_backup_20261102 b
WHERE b.entity='program_requirements' AND b.row_id=r.id AND to_jsonb(r)=b.row_before;
UPDATE public.application_cycles c SET is_active=false
FROM scholarbridge_maintenance.catalogue_evidence_backup_20261102 b
WHERE b.entity='application_cycles' AND b.row_id=c.id AND to_jsonb(c)=b.row_before;

-- Guard against re-importing provenance-free "verified" claims. A specific
-- HTTP(S) path is necessary, not sufficient, for programme verification.
-- Independently reading the cited page is still an operator responsibility.
DO $$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.university_rankings'::regclass AND conname='ranking_verified_requires_evidence') THEN
  ALTER TABLE public.university_rankings ADD CONSTRAINT ranking_verified_requires_evidence
  CHECK(verification_status<>'verified' OR (source_id IS NOT NULL AND verified_at IS NOT NULL)) NOT VALID;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.programs'::regclass AND conname='program_verified_requires_specific_evidence') THEN
  ALTER TABLE public.programs ADD CONSTRAINT program_verified_requires_specific_evidence
  CHECK(verification_status<>'verified' OR (is_verified AND source_url IS NOT NULL AND source_url ~ '^https?://[^/]+/[^/?#]+' AND last_verified_at IS NOT NULL)) NOT VALID;
END IF;
IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.program_requirements'::regclass AND conname='requirement_verified_requires_specific_evidence') THEN
  ALTER TABLE public.program_requirements ADD CONSTRAINT requirement_verified_requires_specific_evidence
  CHECK(verification_status<>'verified' OR (is_verified AND source_url IS NOT NULL AND source_url ~ '^https?://[^/]+/[^/?#]+' AND last_verified_at IS NOT NULL)) NOT VALID;
END IF;
END $$;
ALTER TABLE public.university_rankings VALIDATE CONSTRAINT ranking_verified_requires_evidence;
ALTER TABLE public.programs VALIDATE CONSTRAINT program_verified_requires_specific_evidence;
ALTER TABLE public.program_requirements VALIDATE CONSTRAINT requirement_verified_requires_specific_evidence;

-- Recovery: before-images preserve every original column. Restore ONLY the
-- fields changed above after reviewing later edits; ranking/program evidence
-- constraints must be deliberately removed before restoring unsupported flags.
-- Do not replace entire rows or delete programmes: saved references stay valid.
