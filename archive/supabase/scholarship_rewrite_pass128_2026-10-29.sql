-- Pass 128 (2026-10-29): audit of inactive high-reliability rows + identification of the
-- 8 externally deactivated records (counter drift 544->536 between Pass 127 and Batch 34).
-- Findings: all 18 inactive rel 9/10 "look-live" rows are legitimate retirements with
-- documented 2026-10-23/26/27 rationales (duplicates of surviving records 13/22/11/32/537 -
-- verified active; fabricated "International Excellence" family; withdrawn/suspended awards
-- 473/448; domestic-only 439). None restored. Hygiene only: status -> closed, deadline_date
-- cleared (5 rows still carried open status + future dates). The 8 drift rows are the
-- catalogue's only inactive rows with NO retirement rationale: 551, 718, 735, 745, 747, 756,
-- 762, 781 - informational "no university-wide aid" records corrected on 2026-10-23 but left
-- active, toggled off externally since. The deactivation is confirmed correct and formalised
-- here (closed + rationale appended), NOT reversed. No pages fetched this pass; no counters
-- change (rows were already inactive). Notes appends are replay-once.
-- Catalogue census at pass open (live, parallel session writing): 748 total, 543 active /
-- 205 retired; active rel10=244, rel9=189, rel8=104, rel<=7=6; 453 university-linked vs 90
-- scheme-wide active, of which 46 are national government programmes (+3 multilateral).

-- 1) The 18 audited retirements: normalise live-cycle fields
UPDATE scholarships SET application_status = 'closed', deadline_date = NULL, last_updated_at = '2026-10-29 20:00:00+05', notes = COALESCE(notes, '') || ' PASS 128 AUDIT 2026-10-29: this retirement was re-audited and stands (see the 2026-10-23/26/27 rationale recorded above); application_status normalised to closed and any stored deadline_date cleared so the inactive row no longer carries live-cycle fields. No terms, titles or reliability changed.' WHERE id IN (26,106,109,111,124,374,395,399,439,448,461,463,468,469,471,472,473,496) AND NOT is_active;

-- 2) The 8 externally deactivated "no-aid" rows: formalise, do not restore
UPDATE scholarships SET application_status = 'closed', deadline_date = NULL, last_updated_at = '2026-10-29 20:00:00+05', notes = COALESCE(notes, '') || ' PASS 128 AUDIT 2026-10-29: found deactivated without a recorded rationale — one of exactly eight inactive rows in the catalogue with no retirement note (toggled off outside this pass series between Pass 127 and Enrichment Batch 34; the set size and its two future deadline dates match the observed counter drift exactly). The deactivation is confirmed correct and is formalised here rather than reversed: this row''s verified content is that the university offers no university-wide aid to international applicants, so it must not display as an open opportunity. Status set to closed; content retained for audit.' WHERE id IN (551,718,735,745,747,756,762,781) AND NOT is_active;
