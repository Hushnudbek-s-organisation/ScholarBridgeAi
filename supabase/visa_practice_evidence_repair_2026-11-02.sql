-- 75 catalogue entries are NOT 75 independently verified consular rules.
-- Preserve the 20 Q&A prompts but remove fabricated model responses and badges.
LOCK TABLE public.visa_requirements IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS scholarbridge_maintenance;
REVOKE ALL ON SCHEMA scholarbridge_maintenance FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.visa_practice_backup_20261102(
 id integer PRIMARY KEY,row_before jsonb NOT NULL,captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scholarbridge_maintenance.visa_practice_backup_20261102 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scholarbridge_maintenance.visa_practice_backup_20261102 FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.visa_requirements WHERE id BETWEEN 56 AND 75
 AND country='Uzbekistan' AND visa_type='Student Visa Interview Q&A' AND title LIKE 'Interview Q&A %')<>20
 THEN RAISE EXCEPTION 'Visa practice identity drift'; END IF;
END $$;
INSERT INTO scholarbridge_maintenance.visa_practice_backup_20261102(id,row_before)
SELECT id,to_jsonb(v) FROM public.visa_requirements v WHERE id BETWEEN 56 AND 75
ON CONFLICT(id) DO NOTHING;
UPDATE public.visa_requirements v SET
 instructions=split_part(replace(v.instructions,chr(92)||'n',chr(10)),chr(10),1)||chr(10)||chr(10)||
 'Practice prompt for applicants from Uzbekistan; not a requirement for a destination country. Use only your own truthful circumstances and documents. Do not memorize invented income, relatives, language scores, job offers, return plans or academic achievements. Explain what you know, distinguish estimates from confirmed arrangements, and say when something is unknown. Check current destination-specific government guidance; no model answer or family tie guarantees a visa. This material is educational, not a consular assessment or legal advice.',
 is_required=false,source_url=NULL,source_name='ScholarBridge practice prompts (not official consular guidance)',
 source_type='teaching_material',verification_status='needs_review',last_verified_at=NULL,updated_at=now()
FROM scholarbridge_maintenance.visa_practice_backup_20261102 b
WHERE v.id=b.id AND to_jsonb(v)=b.row_before;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.visa_requirements WHERE id BETWEEN 56 AND 75
 AND source_type='teaching_material' AND verification_status='needs_review' AND NOT is_required
 AND source_url IS NULL AND last_verified_at IS NULL AND instructions NOT LIKE '%Verified Model Response%')<>20
 THEN RAISE EXCEPTION 'Visa practice repair postcondition failed'; END IF;
END $$;
-- No deletions, invented government URLs, country reassignment or changes to
-- the other 55 visa entries. Recovery requires reviewing the private before-images.
