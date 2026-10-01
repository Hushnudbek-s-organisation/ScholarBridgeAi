-- READ-ONLY DATA AUDIT. Run after university_schema_preflight.sql.
-- Each check is dynamically executed only if its relation and required columns
-- exist. Results are XML and contain only conflicting/orphan rows, not changes.

WITH checks(check_name, ready, query_text) AS (
  VALUES
  ('duplicate university names',
   to_regclass('public.universities') IS NOT NULL AND
   (SELECT count(*) = 2 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='universities' AND column_name IN ('id','name')),
   $q$SELECT lower(btrim(name)) AS normalized_name, count(*) AS row_count,
             array_agg(id ORDER BY id) AS ids
      FROM public.universities GROUP BY lower(btrim(name)) HAVING count(*) > 1
      ORDER BY row_count DESC, normalized_name$q$),
  ('duplicate canonical program identity',
   to_regclass('public.programs') IS NOT NULL AND
   (SELECT count(*) = 4 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs'
      AND column_name IN ('id','university_id','name','degree_level')),
   $q$SELECT university_id, lower(btrim(name)) AS normalized_name,
             lower(btrim(coalesce(degree_level, ''))) AS normalized_degree,
             count(*) AS row_count, array_agg(id ORDER BY id) AS ids
      FROM public.programs
      GROUP BY university_id, lower(btrim(name)), lower(btrim(coalesce(degree_level, '')))
      HAVING count(*) > 1 ORDER BY row_count DESC, university_id, normalized_name$q$),
  ('duplicate program requirements per year',
   to_regclass('public.program_requirements') IS NOT NULL AND
   (SELECT count(*) = 3 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='program_requirements'
      AND column_name IN ('id','program_id','academic_year')),
   $q$SELECT program_id, academic_year, count(*) AS row_count,
             array_agg(id ORDER BY id) AS ids
      FROM public.program_requirements WHERE academic_year IS NOT NULL
      GROUP BY program_id, academic_year HAVING count(*) > 1
      ORDER BY row_count DESC, program_id, academic_year$q$),
  ('duplicate saved universities',
   to_regclass('public.saved_universities') IS NOT NULL AND
   (SELECT count(*) = 3 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='saved_universities'
      AND column_name IN ('id','profile_id','university_id')),
   $q$SELECT profile_id, university_id, count(*) AS row_count,
             array_agg(id ORDER BY id) AS ids
      FROM public.saved_universities GROUP BY profile_id, university_id
      HAVING count(*) > 1 ORDER BY row_count DESC$q$),
  ('duplicate saved programs',
   to_regclass('public.saved_programs') IS NOT NULL AND
   (SELECT count(*) = 3 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='saved_programs'
      AND column_name IN ('id','profile_id','program_id')),
   $q$SELECT profile_id, program_id, count(*) AS row_count,
             array_agg(id ORDER BY id) AS ids
      FROM public.saved_programs GROUP BY profile_id, program_id
      HAVING count(*) > 1 ORDER BY row_count DESC$q$),
  ('duplicate saved scholarships',
   to_regclass('public.saved_scholarships') IS NOT NULL AND
   (SELECT count(*) = 3 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='saved_scholarships'
      AND column_name IN ('id','profile_id','scholarship_id')),
   $q$SELECT profile_id, scholarship_id, count(*) AS row_count,
             array_agg(id ORDER BY id) AS ids
      FROM public.saved_scholarships GROUP BY profile_id, scholarship_id
      HAVING count(*) > 1 ORDER BY row_count DESC$q$),
  ('duplicate source URLs',
   to_regclass('public.sources') IS NOT NULL AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sources' AND column_name='url'),
   $q$SELECT url, count(*) AS row_count FROM public.sources
      GROUP BY url HAVING count(*) > 1 ORDER BY row_count DESC$q$),
  ('duplicate ranking editions',
   to_regclass('public.university_rankings') IS NOT NULL AND
   (SELECT count(*) = 4 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='university_rankings'
      AND column_name IN ('university_id','ranking_provider','ranking_name','ranking_year')),
   $q$SELECT university_id, ranking_provider, ranking_name, ranking_year,
             count(*) AS row_count, array_agg(id ORDER BY id) AS ids
      FROM public.university_rankings
      GROUP BY university_id, ranking_provider, ranking_name, ranking_year
      HAVING count(*) > 1 ORDER BY row_count DESC$q$),
  ('orphan program university references',
   to_regclass('public.programs') IS NOT NULL AND to_regclass('public.universities') IS NOT NULL AND
   (SELECT count(*) = 2 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs' AND column_name IN ('id','university_id')) AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='universities' AND column_name='id'),
   $q$SELECT p.id AS program_id, p.university_id FROM public.programs p
      LEFT JOIN public.universities u ON u.id = p.university_id WHERE u.id IS NULL$q$),
  ('orphan requirement program references',
   to_regclass('public.program_requirements') IS NOT NULL AND to_regclass('public.programs') IS NOT NULL AND
   (SELECT count(*) = 2 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='program_requirements' AND column_name IN ('id','program_id')) AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs' AND column_name='id'),
   $q$SELECT r.id AS requirement_id, r.program_id FROM public.program_requirements r
      LEFT JOIN public.programs p ON p.id = r.program_id WHERE p.id IS NULL$q$),
  ('orphan application-cycle program references',
   to_regclass('public.application_cycles') IS NOT NULL AND to_regclass('public.programs') IS NOT NULL AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='application_cycles' AND column_name='program_id') AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs' AND column_name='id'),
   $q$SELECT c.id AS cycle_id, c.program_id FROM public.application_cycles c
      LEFT JOIN public.programs p ON p.id = c.program_id
      WHERE c.program_id IS NOT NULL AND p.id IS NULL$q$),
  ('application-cycle program/university mismatch',
   to_regclass('public.application_cycles') IS NOT NULL AND to_regclass('public.programs') IS NOT NULL AND
   (SELECT count(*) = 2 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='application_cycles' AND column_name IN ('program_id','university_id')) AND
   (SELECT count(*) = 2 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs' AND column_name IN ('id','university_id')),
   $q$SELECT c.id AS cycle_id, c.program_id, c.university_id AS cycle_university_id,
             p.university_id AS program_university_id
      FROM public.application_cycles c JOIN public.programs p ON p.id=c.program_id
      WHERE c.program_id IS NOT NULL AND c.university_id <> p.university_id$q$),
  ('orphan saved program references',
   to_regclass('public.saved_programs') IS NOT NULL AND to_regclass('public.programs') IS NOT NULL AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='saved_programs' AND column_name='program_id') AND
   (SELECT count(*) = 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='programs' AND column_name='id'),
   $q$SELECT s.id AS saved_id, s.program_id FROM public.saved_programs s
      LEFT JOIN public.programs p ON p.id=s.program_id WHERE p.id IS NULL$q$)
)
SELECT check_name, ready,
       CASE WHEN ready THEN query_to_xml(query_text, false, true, '') END AS conflicting_rows
FROM checks
ORDER BY check_name;
