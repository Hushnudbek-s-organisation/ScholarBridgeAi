-- ============================================================================
--  Merge the six duplicate university records
--  Date: 2026-10-23   ·   Project: zkguzbdopfedkffsatk
--
--  WHY
--    Two PDF imports created a second row for six institutions. Both rows
--    carried the same QS world ranking, the same country and a different name
--    variant, so the explorer listed each institution twice and a scholarship
--    linked to one row never appeared on the other.
--
--      keep 77  Universiti Malaya (UM)              <- drop 187 UM (UM International)
--      keep 87  POSTECH (… Science and Technology)  <- drop 170 POSTECH (… Graduate/BSc)
--      keep 89  Pontificia UC de Chile (UC Chile)   <- drop 174 UC (UC Santiago)
--      keep 91  UNAM (Universidad Nacional …)       <- drop 176 UNAM (… - CU)
--      keep 114 Technical University of Denmark     <- drop 143 DTU International
--      keep 116 University of Lausanne (UNIL)       <- drop 135 UNIL - HEC & Sciences
--
--  HOW
--    Every child row is re-pointed at the keeper BEFORE the duplicate is
--    deleted, so no programme, cycle, deadline, scholarship, source, image or
--    application is lost. Where the keeper already has an equivalent row in a
--    uniquely-indexed table (university_programs.name,
--    university_rankings(provider, name, year),
--    university_scholarships.scholarship_name,
--    saved_universities(profile_id)), the duplicate's copy is removed first.
--
--    application_cycles carries a composite foreign key
--    (program_id, university_id) -> programs(id, university_id) that is not
--    deferrable, so it is dropped for the duration of the move and recreated
--    afterwards — both tables end up pointing at the keeper, so the recreated
--    constraint validates.
--
--  RESULT (executed 2026-10-23)
--    universities 364 -> 358; no scholarships, deadlines or programmes lost.
-- ============================================================================

DO $$
DECLARE
  m text[] := ARRAY['77:187', '87:170', '89:174', '91:176', '114:143', '116:135'];
  e text;
  k int;
  d int;
BEGIN
  -- (program_id, university_id) is not deferrable; both sides move together.
  EXECUTE 'ALTER TABLE application_cycles DROP CONSTRAINT IF EXISTS application_cycles_program_university_fkey';

  FOREACH e IN ARRAY m LOOP
    k := split_part(e, ':', 1)::int;
    d := split_part(e, ':', 2)::int;

    -- 1. Programmes first (ids are preserved, so program_requirements,
    --    program_sources, saved_programs and requirement_templates stay valid).
    EXECUTE format('UPDATE programs SET university_id = %s WHERE university_id = %s', k, d);

    -- 2. Cycles: the composite FK is gone, so this cannot deadlock against
    --    the programme move above.
    EXECUTE format('UPDATE application_cycles SET university_id = %s WHERE university_id = %s', k, d);

    -- 3. Student data.
    EXECUTE format('UPDATE applications        SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format('UPDATE application_outcomes SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format('UPDATE application_tasks   SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format('UPDATE essay_versions      SET university_id = %s WHERE university_id = %s', k, d);

    -- 4. Catalogue children without a unique key.
    EXECUTE format('UPDATE campuses             SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format('UPDATE requirement_templates SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format('UPDATE university_images    SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format('UPDATE scholarships         SET university_id = %s WHERE university_id = %s', k, d);

    -- 5. Uniquely-indexed children: drop the duplicate's copy when the keeper
    --    already holds the same key, then move the rest.
    EXECUTE format(
      'DELETE FROM university_programs x USING university_programs y
        WHERE x.university_id = %s AND y.university_id = %s AND y.name = x.name', d, k);
    EXECUTE format('UPDATE university_programs SET university_id = %s WHERE university_id = %s', k, d);

    EXECUTE format(
      'DELETE FROM university_rankings x USING university_rankings y
        WHERE x.university_id = %s AND y.university_id = %s
          AND y.ranking_provider IS NOT DISTINCT FROM x.ranking_provider
          AND y.ranking_name     IS NOT DISTINCT FROM x.ranking_name
          AND y.ranking_year     IS NOT DISTINCT FROM x.ranking_year', d, k);
    EXECUTE format('UPDATE university_rankings SET university_id = %s WHERE university_id = %s', k, d);

    EXECUTE format(
      'DELETE FROM university_scholarships x USING university_scholarships y
        WHERE x.university_id = %s AND y.university_id = %s AND y.scholarship_name = x.scholarship_name', d, k);
    EXECUTE format('UPDATE university_scholarships SET university_id = %s WHERE university_id = %s', k, d);

    EXECUTE format(
      'DELETE FROM saved_universities x USING saved_universities y
        WHERE x.university_id = %s AND y.university_id = %s AND y.profile_id = x.profile_id', d, k);
    EXECUTE format('UPDATE saved_universities SET university_id = %s WHERE university_id = %s', k, d);

    -- 6. Sources: move, then collapse any pair the merge made identical.
    EXECUTE format('UPDATE university_sources SET university_id = %s WHERE university_id = %s', k, d);
    EXECUTE format(
      'DELETE FROM university_sources a USING university_sources b
        WHERE a.university_id = b.university_id AND a.source_id = b.source_id AND a.id > b.id
          AND a.university_id = %s', k);

    -- 7. The duplicate can now go.
    EXECUTE format('DELETE FROM universities WHERE id = %s', d);
  END LOOP;

  EXECUTE 'ALTER TABLE application_cycles
             ADD CONSTRAINT application_cycles_program_university_fkey
             FOREIGN KEY (program_id, university_id)
             REFERENCES programs(id, university_id) ON DELETE CASCADE';
END $$;

-- Result
SELECT (SELECT COUNT(*) FROM universities)                                        AS universities,
       (SELECT COUNT(*) FROM programs)                                            AS programmes,
       (SELECT COUNT(*) FROM application_cycles)                                  AS cycles,
       (SELECT COUNT(*) FROM application_cycles WHERE verification_status = 'verified') AS verified_cycles,
       (SELECT COUNT(*) FROM scholarships)                                        AS scholarships,
       (SELECT COUNT(*) FROM university_scholarships)                             AS scholarship_links,
       (SELECT COUNT(*) FROM university_sources)                                  AS source_links,
       (SELECT COUNT(*) FROM applications)                                        AS applications;
