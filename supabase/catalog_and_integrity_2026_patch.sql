-- Phase 9: catalog provenance and conservative template-verification cleanup
-- Reviewed against src/db/schema.ts, supabase/full_schema.sql, and
-- supabase/university_schema_v2.sql. Phases 9–11 share one outer
-- transaction and one terminal COMMIT; no phase adds nested delimiters.
-- Do not run against production until the preview counts/rows and live schema
-- have been reviewed. Phase 9 adds metadata and cleans narrowly targeted rows.

BEGIN;

-- Idempotent provenance/effective-period columns. Existing canonical columns
-- are retained: universities.qs_rank_year/data_source/tuition_period and
-- programs.official_url/source_url/last_verified_at/tuition_period already
-- provide their respective facts; do not create duplicate aliases for them.
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS ranking_source text,
  ADD COLUMN IF NOT EXISTS data_version text,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS data_version text,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date;

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS data_version text,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS uzbekistan_quota_notes text;

-- PREVIEW (read-only): inspect the exact programme rows that the conservative
-- cleanup below would downgrade. This is deliberately narrower than merely
-- matching the bulk timestamp: both programme URL and provenance URL must be
-- the institution's homepage, and the record must carry the bulk-import stamp.
-- Deep-linked programme rows, including rows with a deep official_url or a
-- deep source_url, are excluded and remain untouched.
SELECT
  p.id,
  p.university_id,
  p.name,
  p.official_url,
  p.source_url,
  u.official_website_url,
  u.website_url,
  p.last_verified_at,
  p.verification_status,
  p.is_verified
FROM public.programs AS p
JOIN public.universities AS u ON u.id = p.university_id
WHERE p.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00'
  AND p.last_verified_at <  TIMESTAMP '2026-10-18 00:00:00'
  AND p.verification_status = 'verified'
  AND p.is_verified IS TRUE
  AND p.official_url IS NOT NULL
  AND p.source_url IS NOT NULL
  AND lower(regexp_replace(rtrim(p.official_url), '/+$', '')) IN (
    lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
    lower(regexp_replace(rtrim(u.website_url), '/+$', ''))
  )
  AND lower(regexp_replace(rtrim(p.source_url), '/+$', '')) IN (
    lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
    lower(regexp_replace(rtrim(u.website_url), '/+$', ''))
  )
ORDER BY p.university_id, p.id;

-- Apply only after reviewing the preview. Keep source URLs and active status;
-- this changes verification claims, not catalogue availability or programme
-- identity. last_verified_at is the canonical column (there is no verified_at
-- column on programs in the shipped schema).
UPDATE public.programs AS p
SET verification_status = 'unverified',
    is_verified = false,
    last_verified_at = NULL,
    source_type = COALESCE(p.source_type, 'bulk_template_unverified')
FROM public.universities AS u
WHERE u.id = p.university_id
  AND p.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00'
  AND p.last_verified_at <  TIMESTAMP '2026-10-18 00:00:00'
  AND p.verification_status = 'verified'
  AND p.is_verified IS TRUE
  AND p.official_url IS NOT NULL
  AND p.source_url IS NOT NULL
  AND lower(regexp_replace(rtrim(p.official_url), '/+$', '')) IN (
    lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
    lower(regexp_replace(rtrim(u.website_url), '/+$', ''))
  )
  AND lower(regexp_replace(rtrim(p.source_url), '/+$', '')) IN (
    lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
    lower(regexp_replace(rtrim(u.website_url), '/+$', ''))
  );

-- PREVIEW (read-only): application_cycles uses deadline (date), source_url,
-- and last_verified_at. The fixed placeholder deadline is considered only
-- alongside the same bulk stamp and a source URL that is exactly the
-- university homepage. Cycles with deep-linked sources are not selected.
SELECT
  c.id,
  c.university_id,
  c.program_id,
  c.academic_year,
  c.deadline,
  c.source_url,
  u.official_website_url,
  u.website_url,
  c.last_verified_at,
  c.verification_status
FROM public.application_cycles AS c
JOIN public.universities AS u ON u.id = c.university_id
WHERE c.deadline = DATE '2027-03-01'
  AND c.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00'
  AND c.last_verified_at <  TIMESTAMP '2026-10-18 00:00:00'
  AND c.verification_status = 'verified'
  AND c.source_url IS NOT NULL
  AND lower(regexp_replace(rtrim(c.source_url), '/+$', '')) IN (
    lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
    lower(regexp_replace(rtrim(u.website_url), '/+$', ''))
  )
ORDER BY c.university_id, c.id;

UPDATE public.application_cycles AS c
SET verification_status = 'unverified',
    last_verified_at = NULL
FROM public.universities AS u
WHERE u.id = c.university_id
  AND c.deadline = DATE '2027-03-01'
  AND c.last_verified_at >= TIMESTAMP '2026-10-17 00:00:00'
  AND c.last_verified_at <  TIMESTAMP '2026-10-18 00:00:00'
  AND c.verification_status = 'verified'
  AND c.source_url IS NOT NULL
  AND lower(regexp_replace(rtrim(c.source_url), '/+$', '')) IN (
    lower(regexp_replace(rtrim(u.official_website_url), '/+$', '')),
    lower(regexp_replace(rtrim(u.website_url), '/+$', ''))
  );

-- Phase 9 recovery: before applying, export the rows returned by the two Phase
-- 9 previews (including original verification_status, is_verified, and
-- last_verified_at). ROLLBACK before the outer COMMIT restores all changes in
-- this transaction. After commit, restore from that export; do not infer prior
-- verification metadata.

-- Phase 10: QS 2027 ranking evidence, TUM tuition provenance, and identity-only
-- regional university additions. The values below use actual columns/keys from
-- src/db/schema.ts and supabase/full_schema.sql. No institution-level
-- verification status is promoted by these field-specific ranking updates.

-- PREVIEW: see which existing institution rows the five ranking facts resolve
-- to before applying. Review name collisions/aliases against live row counts.
WITH ranking_facts (canonical_key, aliases, rank_value, rank_label, profile_url) AS (
  VALUES
    ('Massachusetts Institute of Technology', ARRAY['Massachusetts Institute of Technology','Massachusetts Institute of Technology (MIT)','MIT'], 1, '1', 'https://www.topuniversities.com/universities/massachusetts-institute-technology-mit'),
    ('University of Oxford', ARRAY['University of Oxford'], 4, '4', 'https://www.topuniversities.com/universities/university-oxford'),
    ('Technical University of Munich', ARRAY['Technical University of Munich','Technical University of Munich (TUM)','TUM'], 25, '25', 'https://www.topuniversities.com/universities/technical-university-munich'),
    ('University of Toronto', ARRAY['University of Toronto','The University of Toronto','U of T'], 32, '32', 'https://www.topuniversities.com/universities/university-toronto'),
    ('EPFL – École polytechnique fédérale de Lausanne', ARRAY['EPFL','EPFL (École Polytechnique Fédérale de Lausanne)','École Polytechnique Fédérale de Lausanne','Ecole Polytechnique Federale de Lausanne'], 22, '=22', 'https://www.topuniversities.com/universities/epfl-ecole-polytechnique-federale-de-lausanne')
)
SELECT f.canonical_key, f.rank_value, f.rank_label, f.profile_url,
       u.id, u.name, u.canonical_name, u.world_ranking, u.qs_rank_year,
       count(u.id) OVER (PARTITION BY f.canonical_key) AS matching_university_rows
FROM ranking_facts AS f
LEFT JOIN public.universities AS u
  ON lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
  OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
  OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
ORDER BY f.canonical_key, u.id;

-- The QS profiles are official field-level ranking sources. Sources are
-- upserted on the schema's unique URL key; current date is the migration audit
-- date, not a claim that unrelated university fields were verified then.
WITH ranking_facts (canonical_key, aliases, rank_value, rank_label, profile_url) AS (
  VALUES
    ('Massachusetts Institute of Technology', ARRAY['Massachusetts Institute of Technology','Massachusetts Institute of Technology (MIT)','MIT'], 1, '1', 'https://www.topuniversities.com/universities/massachusetts-institute-technology-mit'),
    ('University of Oxford', ARRAY['University of Oxford'], 4, '4', 'https://www.topuniversities.com/universities/university-oxford'),
    ('Technical University of Munich', ARRAY['Technical University of Munich','Technical University of Munich (TUM)','TUM'], 25, '25', 'https://www.topuniversities.com/universities/technical-university-munich'),
    ('University of Toronto', ARRAY['University of Toronto','The University of Toronto','U of T'], 32, '32', 'https://www.topuniversities.com/universities/university-toronto'),
    ('EPFL – École polytechnique fédérale de Lausanne', ARRAY['EPFL','EPFL (École Polytechnique Fédérale de Lausanne)','École Polytechnique Fédérale de Lausanne','Ecole Polytechnique Federale de Lausanne'], 22, '=22', 'https://www.topuniversities.com/universities/epfl-ecole-polytechnique-federale-de-lausanne')
), qs_sources AS (
  INSERT INTO public.sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
  SELECT f.profile_url, 'QS World University Rankings 2027 — ' || f.canonical_key,
         'www.topuniversities.com', 'ranking', TIMESTAMP '2026-10-22 00:00:00', true, true
  FROM ranking_facts AS f
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    domain = EXCLUDED.domain,
    source_type = EXCLUDED.source_type,
    accessed_at = EXCLUDED.accessed_at,
    is_official = true,
    is_verified = true
  RETURNING id, url
), matched AS (
  SELECT DISTINCT ON (u.id) u.id AS university_id, f.rank_value, f.rank_label,
         f.profile_url, s.id AS source_id
  FROM ranking_facts AS f
  JOIN public.universities AS u
    ON lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
    OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
    OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
  JOIN qs_sources AS s ON s.url = f.profile_url
  ORDER BY u.id, f.canonical_key
)
INSERT INTO public.university_rankings (
  university_id, ranking_provider, ranking_name, ranking_year,
  rank, rank_label, source_id, verified_at, verification_status
)
SELECT university_id, 'QS', 'World University Rankings', 2027,
       rank_value, rank_label, source_id, TIMESTAMP '2026-10-22 00:00:00', 'verified'
FROM matched
ON CONFLICT (university_id, ranking_provider, ranking_name, ranking_year)
DO UPDATE SET rank = EXCLUDED.rank,
              rank_label = EXCLUDED.rank_label,
              source_id = EXCLUDED.source_id,
              verified_at = EXCLUDED.verified_at,
              verification_status = 'verified';

-- Update the legacy QS summary fields from the cited 2027 QS edition. Do not
-- alter the university's overall verification flag, source_url, tuition,
-- admissions data, or last_verified_at.
WITH ranking_facts (aliases, rank_value, rank_label, profile_url) AS (
  VALUES
    (ARRAY['Massachusetts Institute of Technology','Massachusetts Institute of Technology (MIT)','MIT'], 1, '1', 'https://www.topuniversities.com/universities/massachusetts-institute-technology-mit'),
    (ARRAY['University of Oxford'], 4, '4', 'https://www.topuniversities.com/universities/university-oxford'),
    (ARRAY['Technical University of Munich','Technical University of Munich (TUM)','TUM'], 25, '25', 'https://www.topuniversities.com/universities/technical-university-munich'),
    (ARRAY['University of Toronto','The University of Toronto','U of T'], 32, '32', 'https://www.topuniversities.com/universities/university-toronto'),
    (ARRAY['EPFL','EPFL (École Polytechnique Fédérale de Lausanne)','École Polytechnique Fédérale de Lausanne','Ecole Polytechnique Federale de Lausanne'], 22, '=22', 'https://www.topuniversities.com/universities/epfl-ecole-polytechnique-federale-de-lausanne')
)
UPDATE public.universities AS u
SET world_ranking = f.rank_value,
    qs_rank_year = 2027,
    ranking_source = f.profile_url
FROM ranking_facts AS f
WHERE (lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
    OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name))
    OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(f.aliases) AS a(alias_name)))
;

-- Tuition is programme-specific and quoted in EUR per semester for applicable
-- non-EU/EEA entrants. There is no valid single annual USD amount to store in
-- universities. Keep annual_tuition_usd/annual_tuition unchanged; attach the
-- official TUM fee source and refresh only two known synthetic legacy
-- descriptions, leaving curated descriptions and the overall verification
-- status untouched.
SELECT u.id, u.name, u.canonical_name, u.annual_tuition_usd,
       u.annual_tuition, u.tuition_currency, u.tuition_period, u.description
FROM public.universities AS u
WHERE (lower(btrim(coalesce(u.canonical_name, ''))) IN ('technical university of munich', 'tum')
    OR lower(btrim(u.name)) IN ('technical university of munich', 'technical university of munich (tum)', 'tum'))
  AND (u.description LIKE 'Institution record; current programme%'
    OR u.description LIKE 'Europe''s leading technical university with virtually free/low tuition%');

WITH tum AS (
  SELECT id FROM public.universities
  WHERE lower(btrim(coalesce(canonical_name, ''))) IN ('technical university of munich', 'tum')
     OR lower(btrim(name)) IN ('technical university of munich', 'technical university of munich (tum)', 'tum')
), fee_source AS (
  INSERT INTO public.sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
  VALUES (
    'https://www.tum.de/en/studies/fees/tuition',
    'TUM tuition fees for non-EU/EEA students',
    'www.tum.de', 'tuition', TIMESTAMP '2026-10-22 00:00:00', true, true
  )
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    domain = EXCLUDED.domain,
    source_type = EXCLUDED.source_type,
    accessed_at = EXCLUDED.accessed_at,
    is_official = true,
    is_verified = true
  RETURNING id
)
INSERT INTO public.university_sources (university_id, source_id, source_type)
SELECT tum.id, fee_source.id, 'tuition'
FROM tum CROSS JOIN fee_source
WHERE NOT EXISTS (
  SELECT 1 FROM public.university_sources AS us
  WHERE us.university_id = tum.id AND us.source_id = fee_source.id AND us.source_type = 'tuition'
);

UPDATE public.universities AS u
SET description = 'For newly enrolling non-EU/EEA students in eligible Bachelor''s and Master''s programs, TUM tuition is program-specific and generally €2,000 or €3,000 per semester for Bachelor''s and €4,000 or €6,000 per semester for Master''s programs. TUM has announced higher fee bands for new entrants from winter semester 2027/28. A single annual USD tuition value is not stated because the amount depends on the program and semester count; consult the official TUM tuition page and the selected program details.'
WHERE (lower(btrim(coalesce(u.canonical_name, ''))) IN ('technical university of munich', 'tum')
    OR lower(btrim(u.name)) IN ('technical university of munich', 'technical university of munich (tum)', 'tum'))
  AND (u.description LIKE 'Institution record; current programme%'
    OR u.description LIKE 'Europe''s leading technical university with virtually free/low tuition%');

-- PREVIEW: regional additions are identity-only. Review this result against the
-- live catalog before running the INSERT. All rank, cost, admission, language,
-- program and scholarship fields remain NULL; verification_status remains
-- unverified. Homepage URL records identity provenance only, not verification
-- of admissions, fees, ranking or other university attributes.
WITH regional (name, canonical_name, short_name, country, country_code, city, flag_emoji, website_url, source_url, aliases) AS (
  VALUES
    ('Middle East Technical University (METU)', 'Middle East Technical University', 'METU', 'Turkey', 'TR', 'Ankara', '🇹🇷', 'https://www.metu.edu.tr/en', 'https://www.metu.edu.tr/contact-info', ARRAY['Middle East Technical University','Middle East Technical University (METU)','METU','ODTÜ','ODTU']),
    ('Koç University', 'Koç University', 'Koç', 'Turkey', 'TR', 'Istanbul', '🇹🇷', 'https://www.ku.edu.tr/en/', 'https://international.ku.edu.tr/', ARRAY['Koç University','Koc University']),
    ('Boğaziçi University', 'Boğaziçi University', 'Boğaziçi', 'Turkey', 'TR', 'Istanbul', '🇹🇷', 'https://www.bogazici.edu.tr/en', 'https://bogazici.edu.tr/en/pages/our-university/194', ARRAY['Boğaziçi University','Bogazici University']),
    ('Sabancı University', 'Sabancı University', 'Sabancı', 'Turkey', 'TR', 'Istanbul', '🇹🇷', 'https://www.sabanciuniv.edu/en', 'https://www.sabanciuniv.edu/en/communication/communication/phone-and-addresses', ARRAY['Sabancı University','Sabanci University']),
    ('Eötvös Loránd University (ELTE)', 'Eötvös Loránd University', 'ELTE', 'Hungary', 'HU', 'Budapest', '🇭🇺', 'https://www.elte.hu/en/', 'https://www.elte.hu/en/prospective-students', ARRAY['Eötvös Loránd University','Eötvös Loránd University (ELTE)','Eotvos Lorand University','ELTE']),
    ('Budapest University of Technology and Economics (BME)', 'Budapest University of Technology and Economics', 'BME', 'Hungary', 'HU', 'Budapest', '🇭🇺', 'https://www.bme.hu/en', 'https://www.bme.hu/en/about', ARRAY['Budapest University of Technology and Economics','Budapest University of Technology and Economics (BME)','BME']),
    ('University of Debrecen', 'University of Debrecen', 'Debrecen', 'Hungary', 'HU', 'Debrecen', '🇭🇺', 'https://unideb.hu/en', 'https://edu.unideb.hu/p/contacts', ARRAY['University of Debrecen']),
    ('Nazarbayev University', 'Nazarbayev University', 'NU', 'Kazakhstan', 'KZ', 'Astana', '🇰🇿', 'https://nu.edu.kz/', 'https://nu.edu.kz/about/', ARRAY['Nazarbayev University','NU']),
    ('Al-Farabi Kazakh National University (KazNU)', 'Al-Farabi Kazakh National University', 'KazNU', 'Kazakhstan', 'KZ', 'Almaty', '🇰🇿', 'https://welcome.kaznu.kz/en/', 'https://welcome.kaznu.kz/en/146/page', ARRAY['Al-Farabi Kazakh National University','Al-Farabi Kazakh National University (KazNU)','KazNU']),
    ('University of Warsaw', 'University of Warsaw', 'UW', 'Poland', 'PL', 'Warsaw', '🇵🇱', 'https://en.uw.edu.pl/', 'https://en.uw.edu.pl/contacts/', ARRAY['University of Warsaw','Warsaw University']),
    ('Jagiellonian University', 'Jagiellonian University', 'UJ', 'Poland', 'PL', 'Kraków', '🇵🇱', 'https://en.uj.edu.pl/', 'https://welcome.uj.edu.pl/en_GB/more/about-ju', ARRAY['Jagiellonian University']),
    ('Charles University', 'Charles University', 'CU', 'Czechia', 'CZ', 'Prague', '🇨🇿', 'https://cuni.cz/UKEN-1.html', 'https://cuni.cz/UKEN-10.html', ARRAY['Charles University']),
    ('Czech Technical University in Prague (CTU)', 'Czech Technical University in Prague', 'CTU', 'Czechia', 'CZ', 'Prague', '🇨🇿', 'https://www.cvut.cz/en', 'https://www.cvut.cz/en/contacts', ARRAY['Czech Technical University in Prague','Czech Technical University in Prague (CTU)','CTU','ČVUT']),
    ('Westminster International University in Tashkent (WIUT)', 'Westminster International University in Tashkent', 'WIUT', 'Uzbekistan', 'UZ', 'Tashkent', '🇺🇿', 'https://www.wiut.uz/', 'https://www.wiut.uz/our-university', ARRAY['Westminster International University in Tashkent','Westminster International University in Tashkent (WIUT)','WIUT']),
    ('Inha University in Tashkent (IUT)', 'Inha University in Tashkent', 'IUT', 'Uzbekistan', 'UZ', 'Tashkent', '🇺🇿', 'https://inha.uz/', 'https://inha.uz/about/introduction/', ARRAY['Inha University in Tashkent','Inha University in Tashkent (IUT)','IUT']),
    ('New Uzbekistan University', 'New Uzbekistan University', 'NewUU', 'Uzbekistan', 'UZ', 'Tashkent', '🇺🇿', 'https://newuu.uz/en', 'https://newuu.uz/en/doc/text/resolution-on-the-establishment-of-the-university-new-uzbekistan', ARRAY['New Uzbekistan University','NewUU'])
)
SELECT r.name, r.country, r.city, r.website_url, r.source_url,
       EXISTS (
         SELECT 1 FROM public.universities AS u
         WHERE lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(r.aliases) AS a(alias_name))
            OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(r.aliases) AS a(alias_name))
            OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(r.aliases) AS a(alias_name))
       ) AS already_present,
       (SELECT count(*) FROM regional AS rr
        WHERE NOT EXISTS (
          SELECT 1 FROM public.universities AS u
          WHERE lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(rr.aliases) AS a(alias_name))
             OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(rr.aliases) AS a(alias_name))
             OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(rr.aliases) AS a(alias_name))
        )) AS candidate_insert_count
FROM regional AS r
ORDER BY r.country, r.name;

-- Duplicate-safe, identity-only additions. Existing aliases are retained as-is;
-- canonical_name's case-insensitive unique index plus untargeted ON CONFLICT
-- DO NOTHING protects concurrent/repeated application. No candidate fact from
-- the supplied draft is promoted to a verified ranking, tuition or scholarship.
WITH regional (name, canonical_name, short_name, country, country_code, city, flag_emoji, website_url, source_url, aliases) AS (
  VALUES
    ('Middle East Technical University (METU)', 'Middle East Technical University', 'METU', 'Turkey', 'TR', 'Ankara', '🇹🇷', 'https://www.metu.edu.tr/en', 'https://www.metu.edu.tr/contact-info', ARRAY['Middle East Technical University','Middle East Technical University (METU)','METU','ODTÜ','ODTU']),
    ('Koç University', 'Koç University', 'Koç', 'Turkey', 'TR', 'Istanbul', '🇹🇷', 'https://www.ku.edu.tr/en/', 'https://international.ku.edu.tr/', ARRAY['Koç University','Koc University']),
    ('Boğaziçi University', 'Boğaziçi University', 'Boğaziçi', 'Turkey', 'TR', 'Istanbul', '🇹🇷', 'https://www.bogazici.edu.tr/en', 'https://bogazici.edu.tr/en/pages/our-university/194', ARRAY['Boğaziçi University','Bogazici University']),
    ('Sabancı University', 'Sabancı University', 'Sabancı', 'Turkey', 'TR', 'Istanbul', '🇹🇷', 'https://www.sabanciuniv.edu/en', 'https://www.sabanciuniv.edu/en/communication/communication/phone-and-addresses', ARRAY['Sabancı University','Sabanci University']),
    ('Eötvös Loránd University (ELTE)', 'Eötvös Loránd University', 'ELTE', 'Hungary', 'HU', 'Budapest', '🇭🇺', 'https://www.elte.hu/en/', 'https://www.elte.hu/en/prospective-students', ARRAY['Eötvös Loránd University','Eötvös Loránd University (ELTE)','Eotvos Lorand University','ELTE']),
    ('Budapest University of Technology and Economics (BME)', 'Budapest University of Technology and Economics', 'BME', 'Hungary', 'HU', 'Budapest', '🇭🇺', 'https://www.bme.hu/en', 'https://www.bme.hu/en/about', ARRAY['Budapest University of Technology and Economics','Budapest University of Technology and Economics (BME)','BME']),
    ('University of Debrecen', 'University of Debrecen', 'Debrecen', 'Hungary', 'HU', 'Debrecen', '🇭🇺', 'https://unideb.hu/en', 'https://edu.unideb.hu/p/contacts', ARRAY['University of Debrecen']),
    ('Nazarbayev University', 'Nazarbayev University', 'NU', 'Kazakhstan', 'KZ', 'Astana', '🇰🇿', 'https://nu.edu.kz/', 'https://nu.edu.kz/about/', ARRAY['Nazarbayev University','NU']),
    ('Al-Farabi Kazakh National University (KazNU)', 'Al-Farabi Kazakh National University', 'KazNU', 'Kazakhstan', 'KZ', 'Almaty', '🇰🇿', 'https://welcome.kaznu.kz/en/', 'https://welcome.kaznu.kz/en/146/page', ARRAY['Al-Farabi Kazakh National University','Al-Farabi Kazakh National University (KazNU)','KazNU']),
    ('University of Warsaw', 'University of Warsaw', 'UW', 'Poland', 'PL', 'Warsaw', '🇵🇱', 'https://en.uw.edu.pl/', 'https://en.uw.edu.pl/contacts/', ARRAY['University of Warsaw','Warsaw University']),
    ('Jagiellonian University', 'Jagiellonian University', 'UJ', 'Poland', 'PL', 'Kraków', '🇵🇱', 'https://en.uj.edu.pl/', 'https://welcome.uj.edu.pl/en_GB/more/about-ju', ARRAY['Jagiellonian University']),
    ('Charles University', 'Charles University', 'CU', 'Czechia', 'CZ', 'Prague', '🇨🇿', 'https://cuni.cz/UKEN-1.html', 'https://cuni.cz/UKEN-10.html', ARRAY['Charles University']),
    ('Czech Technical University in Prague (CTU)', 'Czech Technical University in Prague', 'CTU', 'Czechia', 'CZ', 'Prague', '🇨🇿', 'https://www.cvut.cz/en', 'https://www.cvut.cz/en/contacts', ARRAY['Czech Technical University in Prague','Czech Technical University in Prague (CTU)','CTU','ČVUT']),
    ('Westminster International University in Tashkent (WIUT)', 'Westminster International University in Tashkent', 'WIUT', 'Uzbekistan', 'UZ', 'Tashkent', '🇺🇿', 'https://www.wiut.uz/', 'https://www.wiut.uz/our-university', ARRAY['Westminster International University in Tashkent','Westminster International University in Tashkent (WIUT)','WIUT']),
    ('Inha University in Tashkent (IUT)', 'Inha University in Tashkent', 'IUT', 'Uzbekistan', 'UZ', 'Tashkent', '🇺🇿', 'https://inha.uz/', 'https://inha.uz/about/introduction/', ARRAY['Inha University in Tashkent','Inha University in Tashkent (IUT)','IUT']),
    ('New Uzbekistan University', 'New Uzbekistan University', 'NewUU', 'Uzbekistan', 'UZ', 'Tashkent', '🇺🇿', 'https://newuu.uz/en', 'https://newuu.uz/en/doc/text/resolution-on-the-establishment-of-the-university-new-uzbekistan', ARRAY['New Uzbekistan University','NewUU'])
)
INSERT INTO public.universities (
  name, canonical_name, short_name, country, country_code, city, flag_emoji,
  degree_level, description, highlights, website_url, official_website_url,
  source_url, data_source, verification_status, is_active
)
SELECT r.name, r.canonical_name, r.short_name, r.country, r.country_code, r.city,
       r.flag_emoji, 'All',
       'Identity-only catalog seed. Programs, rankings, tuition, admissions requirements, acceptance rates, and scholarship eligibility have not been verified in this record.',
       '[]', r.website_url, r.website_url, r.source_url,
       'Official institution website; identity seed only; other attributes unverified',
       'unverified', true
FROM regional AS r
WHERE NOT EXISTS (
  SELECT 1 FROM public.universities AS u
  WHERE lower(btrim(coalesce(u.name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(r.aliases) AS a(alias_name))
     OR lower(btrim(coalesce(u.canonical_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(r.aliases) AS a(alias_name))
     OR lower(btrim(coalesce(u.short_name, ''))) = ANY (SELECT lower(a.alias_name) FROM unnest(r.aliases) AS a(alias_name))
)
ON CONFLICT DO NOTHING;

-- Phase 10 recovery: before applying, export all matched ranking identities,
-- original university summary fields, existing ranking rows, TUM descriptions,
-- source/link rows, and the regional preview. ROLLBACK before this COMMIT fully
-- restores this transaction. After commit, use those exports for reviewed
-- restoration; do not guess prior university values or delete linked sources.
-- One outer transaction only; all phases are included before its single
-- terminal COMMIT. No nested transaction delimiters belong here.
-- Phase 11: scholarship-cycle corrections, identity-only missing scholarship
-- rows, and a narrow correction to the old seeded Chevening forum sentence.
-- Schema checked against src/db/schema.ts and supabase/full_schema.sql:
-- scholarships.deadline is text; deadline_date/ranges are DATE (not timestamptz);
-- last_verified_at is the timestamp column (there is no scholarships.verified_at);
-- there is no separate scholarship_cycles table or scholarship title unique key.
-- This migration changes cycle metadata only when an exact known legacy/draft
-- date matches. It does not overwrite current/manual dates or award/eligibility
-- terms. In particular, Stipendium 2027/28, GKS Graduate, and CSC have no
-- universal future deadline; DAAD/Erasmus dates depend on course/consortium.

-- Before applying this file to staging/production, run the PREFLIGHT SELECTs
-- below separately, read-only, against that target and review the real counts;
-- this migration cannot substitute for that human review. No live DB was used.
-- PREFLIGHT 11A: exact seeded titles, legacy/draft dates, and duplicate count.
-- candidate_rows is the number eligible for correction only if title_matches=1;
-- duplicates are reported and the UPDATE below skips every duplicate title.
WITH targets (title, legacy_dates) AS (
  VALUES
    ('Chevening Scholarship', ARRAY['2025-11-04','2027-10-05']::text[]),
    ('Stipendium Hungaricum', ARRAY['2026-01-15','2027-01-15']::text[]),
    ('Türkiye Bursları Scholarship', ARRAY['2027-02-20']::text[]),
    ('Gates Cambridge Scholarship', ARRAY['2025-12-03','2027-01-07']::text[]),
    ('DAAD Development-Related Postgraduate Courses (EPOS)', ARRAY['2025-09-30','2026-11-15']::text[]),
    ('Fulbright Foreign Student Program', ARRAY['2025-10-15','2027-05-15']::text[]),
    ('Global Korea Scholarship (GKS Graduate 2027)', ARRAY['2027-03-15']::text[]),
    ('Erasmus Mundus Joint Master Degrees (EMJMD)', ARRAY['2026-01-15','2027-02-15']::text[]),
    ('Chinese Government Scholarship (CSC 2027/28)', ARRAY['2027-02-28']::text[]),
    ('France Excellence Eiffel Scholarship', ARRAY['2027-01-08']::text[]),
    ('Australia Awards Scholarships', ARRAY['2027-04-30']::text[])
)
SELECT t.title,
       count(s.id) AS title_matches,
       count(s.id) FILTER (
         WHERE (s.deadline = ANY (t.legacy_dates)
             OR s.deadline_date::text = ANY (t.legacy_dates))
           AND (t.title <> 'Türkiye Bursları Scholarship'
             OR (s.deadline_type = 'exact' AND s.verification_status = 'verified'
               AND s.deadline_range_start = DATE '2027-01-10'
               AND s.deadline_range_end = DATE '2027-02-20'))
       ) AS legacy_date_candidates,
       CASE WHEN count(s.id) = 1 THEN count(s.id) FILTER (
         WHERE (s.deadline = ANY (t.legacy_dates)
             OR s.deadline_date::text = ANY (t.legacy_dates))
           AND (t.title <> 'Türkiye Bursları Scholarship'
             OR (s.deadline_type = 'exact' AND s.verification_status = 'verified'
               AND s.deadline_range_start = DATE '2027-01-10'
               AND s.deadline_range_end = DATE '2027-02-20'))
       ) ELSE 0 END AS rows_eligible_for_auto_correction,
       count(s.id) FILTER (
         WHERE t.title = 'Stipendium Hungaricum'
           AND s.uzbekistan_quota_notes ILIKE '%110 nafar talaba%'
           AND s.uzbekistan_quota_notes ILIKE '%200%'
       ) AS unsupported_quota_note_candidates
FROM targets AS t
LEFT JOIN public.scholarships AS s
  ON lower(btrim(s.title)) = lower(btrim(t.title))
GROUP BY t.title, t.legacy_dates
ORDER BY t.title;

-- PREFLIGHT 11B: the annual Türkiye calendar supports an estimated recurring
-- window, not a separately published 2027 call. Only a row incorrectly marked
-- exact+verified with the draft's exact window is a candidate for demotion.
SELECT id, title, opening_date, deadline, deadline_date,
       deadline_range_start, deadline_range_end, deadline_type,
       application_status, verification_status, source_url,
       count(*) OVER (PARTITION BY lower(btrim(title))) AS title_matches
FROM public.scholarships
WHERE lower(btrim(title)) = lower('Türkiye Bursları Scholarship')
ORDER BY id;

-- PREFLIGHT 11C: missing identity-only records. Matches include close title
-- variants; >1 match is surfaced and suppresses insertion, since scholarships
-- has no unique title constraint and must not be resolved by arbitrary choice.
WITH candidates (title, match_pattern, source_url) AS (
  VALUES
    ('Chinese Government Scholarship (CSC 2027/28)', '%chinese government scholarship%', 'https://www.campuschina.org/content/details27_100758.html'),
    ('France Excellence Eiffel Scholarship', '%eiffel%', 'https://www.campusfrance.org/en/actu/call-for-france-excellence-eiffel-applications-2027'),
    ('Australia Awards Scholarships', '%australia awards%', 'https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries')
)
SELECT c.title, c.source_url, count(s.id) AS matching_scholarship_rows,
       (count(s.id) = 0) AS would_insert,
       (count(s.id) > 1) AS ambiguous_multiple_matches
FROM candidates AS c
LEFT JOIN public.scholarships AS s ON lower(btrim(s.title)) LIKE c.match_pattern
GROUP BY c.title, c.source_url
ORDER BY c.title;

-- PREFLIGHT 11D: Australia Awards is not currently offered to Uzbekistan in
-- DFAT's participating-country list. Deactivation applies only to an active,
-- unverified, country-unspecified row; verified/manual rows are surfaced for
-- human review instead of being overwritten.
SELECT id, title, is_active, verification_status, eligible_countries,
       source_url,
       count(*) OVER (PARTITION BY lower(btrim(title))) AS title_matches,
       CASE WHEN is_active
              AND verification_status <> 'verified'
              AND coalesce(eligible_countries, '[]') IN ('[]', '')
              AND count(*) OVER (PARTITION BY lower(btrim(title))) = 1
            THEN 1 ELSE 0 END AS rows_eligible_for_safe_deactivation
FROM public.scholarships
WHERE lower(btrim(title)) = lower('Australia Awards Scholarships');

-- PREFLIGHT 11E: forum correction is limited to the legacy seeded calendar
-- thread and one exact false phrase. Current repository seed text is already
-- corrected, so this should normally preview zero rows.
SELECT id, title, left(body, 600) AS current_body,
       count(*) OVER () AS matching_rows
FROM public.forum_threads
WHERE title = 'Complete Calendar of Fully Funded Scholarships for Uzbek Students (2026–2027 Cycle)'
  AND body ILIKE '%Chevening closes in early November%';

-- Correct only exact stale seed/draft dates and only when the exact title is
-- unique. The affected values are based on legacy seed data and the draft
-- claims, not on broad title-only matching. Date-only changes do not promote
-- the whole scholarship record to verified. Notes specify that remaining award
-- terms still require their own review.
WITH cycle_fixes (
  title, old_deadline, new_deadline, new_deadline_date, new_opening_date,
  new_range_start, new_range_end, new_deadline_type, new_application_status,
  new_verification_status, source_url, review_note
) AS (
  VALUES
    ('Chevening Scholarship', '2025-11-04', '2026-10-06', DATE '2026-10-06', NULL::date, NULL::date, NULL::date, 'exact', 'closed', NULL::text, 'https://www.chevening.org/scholarship/uzbekistan/', 'Uzbekistan 2027/28 deadline verified as 6 October 2026 at 11:00 UTC; cycle closed. No next-cycle date was published on the country page as checked 2026-10-22. Other award details not verified by this date correction.'),
    ('Chevening Scholarship', '2027-10-05', '2026-10-06', DATE '2026-10-06', NULL::date, NULL::date, NULL::date, 'exact', 'closed', 'unverified', 'https://www.chevening.org/scholarship/uzbekistan/', 'Removed the unsupported 2028/29 future deadline. Uzbekistan 2027/28 closed 6 October 2026 at 11:00 UTC; no next-cycle date published as checked 2026-10-22.'),
    ('Stipendium Hungaricum', '2026-01-15', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://stipendiumhungaricum.hu/apply/', 'The official call page lists 2026/27 with a 15 January 2026 deadline; no 2027/28 call/deadline or Uzbekistan quota of 200 was published as checked 2026-10-22.'),
    ('Stipendium Hungaricum', '2027-01-15', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://stipendiumhungaricum.hu/apply/', 'Removed an unannounced 2027/28 deadline. Official page still lists the 2026/27 call; no 2027/28 date or Uzbekistan quota of 200 was published as checked 2026-10-22.'),
    ('Gates Cambridge Scholarship', '2025-12-03', '2027-01-06', DATE '2027-01-06', DATE '2026-09-11', DATE '2026-12-08', DATE '2027-01-06', 'range', 'open', NULL::text, 'https://www.gatescambridge.org/apply/timeline/', 'For 2027/28 entry, the official timeline gives 8 December 2026 or 6 January 2027 depending on course for applicants outside the US-resident round; use the course directory for the individual date.'),
    ('Gates Cambridge Scholarship', '2027-01-07', '2027-01-06', DATE '2027-01-06', DATE '2026-09-11', DATE '2026-12-08', DATE '2027-01-06', 'range', 'open', NULL::text, 'https://www.gatescambridge.org/apply/timeline/', 'Corrected the future date to the official course-dependent deadline range: 8 December 2026 or 6 January 2027.'),
    ('DAAD Development-Related Postgraduate Courses (EPOS)', '2025-09-30', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777', 'EPOS deadlines are set by the individual course; no single programme-wide deadline is asserted. Check the official course list.'),
    ('DAAD Development-Related Postgraduate Courses (EPOS)', '2026-11-15', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777', 'Removed an unsupported universal 15 November deadline. EPOS deadlines are course-specific; the official course list is authoritative.'),
    ('Fulbright Foreign Student Program', '2025-10-15', '2026-06-30', DATE '2026-06-30', NULL::date, NULL::date, NULL::date, 'exact', 'closed', NULL::text, 'https://uz.usembassy.gov/fulbright-foreign-student-program/', 'U.S. Embassy in Uzbekistan lists 30 June 2026 for the 2027/28 Foreign Student cycle; the cycle is closed. This records the deadline only.'),
    ('Fulbright Foreign Student Program', '2027-05-15', '2026-06-30', DATE '2026-06-30', NULL::date, NULL::date, NULL::date, 'exact', 'closed', 'unverified', 'https://uz.usembassy.gov/fulbright-foreign-student-program/', 'Corrected the unsupported May 2027 date: Uzbekistan 2027/28 deadline was 30 June 2026 and is closed.'),
    ('Global Korea Scholarship (GKS Graduate 2027)', '2027-03-15', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://www.studyinkorea.go.kr/en/plan/scholarship.do', 'Graduate deadlines are set by the first-round embassy or university; no universal 15 March 2027 deadline was published as checked 2026-10-22.'),
    ('Erasmus Mundus Joint Master Degrees (EMJMD)', '2026-01-15', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters', 'Application dates are set by each joint master; the Commission says most applications run October–January. No catalogue-wide date is asserted.'),
    ('Erasmus Mundus Joint Master Degrees (EMJMD)', '2027-02-15', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters', 'Removed an unsupported universal 15 February deadline; each joint master publishes its own deadline.'),
    ('Chinese Government Scholarship (CSC 2027/28)', '2027-02-28', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://www.campuschina.org/content/details27_100758.html', 'CSC guidance describes an early-January to early-April application period and directs applicants to the receiving agency for the specific deadline; no universal 28 February date is asserted.'),
    ('France Excellence Eiffel Scholarship', '2027-01-08', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://www.campusfrance.org/en/actu/call-for-france-excellence-eiffel-applications-2027', 'No deadline stored: the official 2027 Campus France notice has conflicting 6 January/8 January text; confirm the institutional nomination deadline with the host university.'),
    ('Australia Awards Scholarships', '2027-04-30', NULL, NULL::date, NULL::date, NULL::date, NULL::date, 'unknown', 'unknown', 'unverified', 'https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries', 'No Uzbekistan cycle stored: Uzbekistan is not listed on DFAT current participating-country page; this award is inactive for Uzbek applicants unless eligibility changes.')
)
UPDATE public.scholarships AS s
SET deadline = f.new_deadline,
    deadline_date = f.new_deadline_date,
    opening_date = f.new_opening_date,
    deadline_range_start = f.new_range_start,
    deadline_range_end = f.new_range_end,
    deadline_type = f.new_deadline_type,
    application_status = f.new_application_status,
    verification_status = coalesce(f.new_verification_status, s.verification_status),
    source_url = f.source_url,
    last_verified_at = TIMESTAMP '2026-10-22 00:00:00',
    notes = concat_ws(E'\n', nullif(btrim(s.notes), ''), f.review_note),
    is_active = CASE WHEN f.title = 'Australia Awards Scholarships' THEN false ELSE s.is_active END,
    uzbekistan_quota_notes = CASE
      WHEN f.title = 'Stipendium Hungaricum'
       AND s.uzbekistan_quota_notes ILIKE '%110 nafar talaba%'
       AND s.uzbekistan_quota_notes ILIKE '%200%'
      THEN NULL
      ELSE s.uzbekistan_quota_notes
    END
FROM cycle_fixes AS f
WHERE lower(btrim(s.title)) = lower(btrim(f.title))
  AND (s.deadline = f.old_deadline OR s.deadline_date = f.old_deadline::date)
  AND (SELECT count(*) FROM public.scholarships AS same_title
       WHERE lower(btrim(same_title.title)) = lower(btrim(f.title))) = 1;

-- Demote only the draft's falsely exact Türkiye dates. The official calendar
-- publishes a recurring Jan 10–Feb 20 general window, not confirmed 2027 cycle
-- dates; preserve the dates as an explicitly estimated window.
UPDATE public.scholarships AS s
SET opening_date = DATE '2027-01-10',
    deadline = '2027-02-20',
    deadline_date = DATE '2027-02-20',
    deadline_range_start = DATE '2027-01-10',
    deadline_range_end = DATE '2027-02-20',
    deadline_type = 'estimated',
    application_status = 'upcoming',
    verification_status = 'estimated',
    source_url = 'https://www.turkiyeburslari.gov.tr/calendar',
    last_verified_at = TIMESTAMP '2026-10-22 00:00:00',
    notes = concat_ws(E'\n', nullif(btrim(s.notes), ''), 'Official calendar describes the recurring 10 January–20 February period; exact dates for the 2027 cycle were not separately announced as checked 2026-10-22. This date window is estimated, not a confirmed call.')
WHERE lower(btrim(s.title)) = lower('Türkiye Bursları Scholarship')
  AND s.deadline = '2027-02-20'
  AND s.deadline_date = DATE '2027-02-20'
  AND s.deadline_range_start = DATE '2027-01-10'
  AND s.deadline_range_end = DATE '2027-02-20'
  AND s.deadline_type = 'exact'
  AND s.verification_status = 'verified'
  AND (SELECT count(*) FROM public.scholarships AS same_title
       WHERE lower(btrim(same_title.title)) = lower('Türkiye Bursları Scholarship')) = 1;

-- Deactivate only a single active, unverified, country-unspecified Australia
-- Awards identity. Preserve any verified/manual row for explicit review.
UPDATE public.scholarships AS s
SET opening_date = NULL,
    deadline = NULL,
    deadline_date = NULL,
    deadline_range_start = NULL,
    deadline_range_end = NULL,
    deadline_type = 'unknown',
    application_status = 'unknown',
    verification_status = 'unverified',
    is_active = false,
    source_url = 'https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries',
    last_verified_at = TIMESTAMP '2026-10-22 00:00:00',
    notes = concat_ws(E'\n', nullif(btrim(s.notes), ''), 'DFAT participating-country list does not include Uzbekistan as checked 2026-10-22. Deactivated for Uzbek applicants; no country-specific cycle dates or award terms are asserted.')
WHERE lower(btrim(s.title)) = lower('Australia Awards Scholarships')
  AND s.is_active
  AND s.verification_status <> 'verified'
  AND coalesce(s.eligible_countries, '[]') IN ('[]', '')
  AND (SELECT count(*) FROM public.scholarships AS same_title
       WHERE lower(btrim(same_title.title)) = lower('Australia Awards Scholarships')) = 1;

-- Attach the official source and use an advisory transaction lock shared with
-- the app's seedAdditionalScholarshipIdentities() before the title-checked
-- inserts. The title column itself has no unique constraint.
SELECT pg_advisory_xact_lock(hashtext('scholarbridge:seed:scholarship-identities'));
WITH candidates (
  title, match_pattern, provider, country, website_url, source_url,
  description, requirements, application_status, is_active, notes
) AS (
  VALUES
    ('Chinese Government Scholarship (CSC 2027/28)', '%chinese government scholarship%', 'China Scholarship Council', 'China', 'https://www.campuschina.org/', 'https://www.campuschina.org/content/details27_100758.html',
     'Chinese Government Scholarship identity record. The programme has multiple tracks; coverage, eligibility and deadlines depend on the receiving authority or institution.',
     'Check the official CSC notice and the applicant''s receiving authority for current country eligibility, track requirements, award terms and deadlines.',
     'unknown', true, 'Official CSC guidance describes an early-January to early-April window and instructs applicants to consult the receiving agency for a specific deadline. No universal 2027 date or Uzbekistan-specific eligibility is asserted.'),
    ('France Excellence Eiffel Scholarship', '%eiffel%', 'French Ministry for Europe and Foreign Affairs / Campus France', 'France', 'https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence', 'https://www.campusfrance.org/en/actu/call-for-france-excellence-eiffel-applications-2027',
     'France Excellence Eiffel identity record. Applications are submitted by French higher-education institutions; cycle dates and internal nomination cutoffs must be confirmed with the host institution.',
     'Confirm the current call, host-university nomination, programme eligibility and deadline directly with the French institution and Campus France.',
     'unknown', true, 'The official 2027 Campus France notice contains inconsistent 6 January / 8 January deadline text; no exact deadline is stored pending confirmation.'),
    ('Australia Awards Scholarships', '%australia awards%', 'Australian Department of Foreign Affairs and Trade', 'Australia', 'https://www.dfat.gov.au/people-to-people/australia-awards/', 'https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries',
     'Australia Awards identity record only. Country participation and eligibility are determined by DFAT; Uzbekistan is not listed on the current participating-country page.',
     'Check DFAT''s current participating-country list and country-specific intake rules. Do not present this award as available to Uzbek applicants while Uzbekistan is not listed.',
     'unknown', false, 'Inactive for Uzbek applicants as of 2026-10-22: DFAT''s participating-country list does not include Uzbekistan. No deadline, amount or eligibility claim is stored.')
), resolved AS (
  SELECT c.*,
         (SELECT count(*) FROM public.scholarships AS s
          WHERE lower(btrim(s.title)) LIKE c.match_pattern) AS matching_rows
  FROM candidates AS c
)
INSERT INTO public.scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  award_amount, award_currency, award_period, award_basis,
  deadline, deadline_date, deadline_type, deadline_range_start,
  deadline_range_end, degree_levels, eligible_majors, eligible_countries,
  description, requirements, website_url, source_url, opening_date,
  application_status, verification_status, last_verified_at, notes, is_active
)
SELECT r.title, r.provider, r.country, 'Unspecified', NULL,
       NULL, NULL, NULL, NULL,
       NULL, NULL, 'unknown', NULL, NULL, '[]', '[]', '[]',
       r.description, r.requirements, r.website_url, r.source_url, NULL,
       r.application_status, 'unverified', NULL, r.notes, r.is_active
FROM resolved AS r
WHERE r.matching_rows = 0
ON CONFLICT DO NOTHING;

-- Final review of duplicate title groups after any corrections/inserts. This
-- does not resolve them; names with >1 row require a human choice before using
-- title-based selectors in later data maintenance.
SELECT lower(btrim(title)) AS normalized_title,
       count(*) AS matching_rows,
       array_agg(id ORDER BY id) AS scholarship_ids
FROM public.scholarships
WHERE lower(btrim(title)) IN (
  'chevening scholarship', 'stipendium hungaricum',
  lower('Türkiye Bursları Scholarship'), 'gates cambridge scholarship',
  'daad development-related postgraduate courses (epos)',
  'fulbright foreign student program',
  'global korea scholarship (gks graduate 2027)',
  'erasmus mundus joint master degrees (emjmd)',
  'chinese government scholarship (csc 2027/28)',
  'france excellence eiffel scholarship', 'australia awards scholarships'
)
GROUP BY lower(btrim(title))
HAVING count(*) > 1
ORDER BY normalized_title;

-- PREVIEW / correction: this is the exact legacy seed post and exact stale
-- phrase only. Current source seed text is already accurate. Do not rewrite any
-- other user-created forum discussion or globally replace a phrase.
UPDATE public.forum_threads AS f
SET body = replace(
      f.body,
      'Chevening closes in early November — start your 4 essays now',
      'Chevening Uzbekistan 2027/28 closed on 6 October 2026 at 11:00 UTC; no next-cycle date has been published on the official Uzbekistan page.'
    ),
    updated_at = TIMESTAMP '2026-10-22 00:00:00'
WHERE f.title = 'Complete Calendar of Fully Funded Scholarships for Uzbek Students (2026–2027 Cycle)'
  AND f.body ILIKE '%Chevening closes in early November%'
  AND (SELECT count(*) FROM public.forum_threads AS same_post
       WHERE same_post.title = 'Complete Calendar of Fully Funded Scholarships for Uzbek Students (2026–2027 Cycle)'
         AND same_post.body ILIKE '%Chevening closes in early November%') = 1;

-- Recovery / counts: compare each PostgreSQL UPDATE/INSERT row count with the
-- PREFLIGHT results and export all affected scholarship and forum rows before
-- committing. ROLLBACK before the single terminal COMMIT restores this patch;
-- after commit, recover from that export. Do not delete inserted scholarships
-- after commit without checking saved_scholarships and other foreign-key refs.


COMMIT;
