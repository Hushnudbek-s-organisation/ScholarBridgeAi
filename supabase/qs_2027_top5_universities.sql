-- ScholarBridgeAI — QS World University Rankings 2027 top five
-- Supabase SQL Editor uchun. Bu faqat `universities` jadvaliga QS 2027 ranki
-- va quyida manbasi ko'rsatilgan asosiy identifikatsiya ma'lumotlarini yozadi.
-- Bu to'liq dasturlar/grantlar importi EMAS.
-- QS rasmiy natijasi (2026-06-18):
-- https://www.qs.com/insights/qs-world-university-rankings
-- Imperial va Stanford teng #2.
-- Xavfsizlik: mavjud qatorlardagi narx, talablar, tasdiq va boshqa maydonlarni
-- NULL bilan bosib ketmaydi. Yangi qatorlar default bo'yicha unverified bo'ladi.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      (
        'Massachusetts Institute of Technology', 'United States', 'Cambridge', '🇺🇸', 1,
        'MIT', 1861, 'Private research university',
        'A private research university in Cambridge, Massachusetts, offering education and research across science, engineering, computing, architecture, management, humanities, arts, and social sciences.',
        '["QS World University Rankings 2027: #1","Founded 1861","Cambridge, Massachusetts"]',
        'https://www.mit.edu/', 'https://mitadmissions.org/',
        'https://www.qs.com/insights/qs-world-university-rankings; https://oge.mit.edu/graduate-admissions/about-mit/'
      ),
      (
        'Imperial College London', 'United Kingdom', 'London', '🇬🇧', 2,
        'Imperial', 1907, 'Public research university',
        'A London-based university focused on science, engineering, medicine, and business; its main campus is in South Kensington.',
        '["QS World University Rankings 2027: joint #2","Founded 1907","South Kensington, London"]',
        'https://www.imperial.ac.uk/', 'https://www.imperial.ac.uk/study/',
        'https://www.qs.com/insights/qs-world-university-rankings; https://www.imperial.ac.uk/about/; https://www.imperial.ac.uk/visit/campuses/south-kensington/'
      ),
      (
        'Stanford University', 'United States', 'Stanford', '🇺🇸', 2,
        'Stanford', 1885, 'Private research university',
        'A private research university in Stanford, California, with academic programs and research across seven schools, research institutes, the arts, and athletics.',
        '["QS World University Rankings 2027: joint #2","Founded 1885; opened 1891","Stanford, California"]',
        'https://www.stanford.edu/', 'https://admission.stanford.edu/',
        'https://www.qs.com/insights/qs-world-university-rankings; https://facts.stanford.edu/; https://www.stanford.edu/about/history/'
      ),
      (
        'University of Oxford', 'United Kingdom', 'Oxford', '🇬🇧', 4,
        'Oxford', 1096, 'Public collegiate research university',
        'A collegiate research university in Oxford, England. Oxford traces teaching at the institution to at least 1096.',
        '["QS World University Rankings 2027: #4","Teaching existed by 1096","Oxford, England"]',
        'https://www.ox.ac.uk/', 'https://www.ox.ac.uk/admissions/undergraduate',
        'https://www.qs.com/insights/qs-world-university-rankings; https://www.ox.ac.uk/about/organisation/history; https://www.ox.ac.uk/admissions/undergraduate'
      ),
      (
        'Harvard University', 'United States', 'Cambridge', '🇺🇸', 5,
        'Harvard', 1636, 'Private research university',
        'A private research university founded in 1636, with its principal Harvard Yard campus in Cambridge, Massachusetts, and additional campuses in Boston.',
        '["QS World University Rankings 2027: #5","Founded 1636","Cambridge and Boston, Massachusetts"]',
        'https://www.harvard.edu/', 'https://college.harvard.edu/admissions',
        'https://www.qs.com/insights/qs-world-university-rankings; https://www.harvard.edu/about/history/; https://college.harvard.edu/admissions'
      )
    ) AS v(
      canonical_name, country, city, flag_emoji, qs_rank,
      short_name, founded_year, university_type, description, highlights,
      official_website_url, admissions_url, data_source
    )
  LOOP
    UPDATE public.universities AS u
    SET name = r.canonical_name,
        country = r.country,
        city = r.city,
        flag_emoji = r.flag_emoji,
        world_ranking = r.qs_rank,
        degree_level = 'All',
        program_major = 'Multiple disciplines',
        founded_year = r.founded_year,
        university_type = r.university_type,
        official_website_url = r.official_website_url,
        admissions_url = r.admissions_url,
        undergraduate_admissions_url = r.admissions_url,
        description = r.description,
        highlights = r.highlights,
        website_url = r.official_website_url,
        source_url = 'https://www.qs.com/insights/qs-world-university-rankings',
        short_name = r.short_name,
        qs_rank_year = 2027,
        canonical_name = r.canonical_name,
        data_source = r.data_source
    WHERE lower(trim(coalesce(u.canonical_name, ''))) = lower(r.canonical_name)
       OR lower(trim(u.name)) = lower(r.canonical_name);

    IF NOT FOUND THEN
      INSERT INTO public.universities (
        name, country, city, flag_emoji, world_ranking, degree_level,
        program_major, founded_year, university_type,
        official_website_url, admissions_url, undergraduate_admissions_url,
        description, highlights, website_url, source_url,
        short_name, qs_rank_year, canonical_name, data_source
      ) VALUES (
        r.canonical_name, r.country, r.city, r.flag_emoji, r.qs_rank, 'All',
        'Multiple disciplines', r.founded_year, r.university_type,
        r.official_website_url, r.admissions_url, r.admissions_url,
        r.description, r.highlights, r.official_website_url,
        'https://www.qs.com/insights/qs-world-university-rankings',
        r.short_name, 2027, r.canonical_name, r.data_source
      );
    END IF;
  END LOOP;
END $$;

-- Kutilgan natija: 5 ta universitet; #2 o'rin ikkita universitetga tegishli.
SELECT canonical_name, country, city, world_ranking AS qs_rank, qs_rank_year,
       founded_year, university_type, verification_status, source_url
FROM public.universities
WHERE canonical_name IN (
  'Massachusetts Institute of Technology',
  'Imperial College London',
  'Stanford University',
  'University of Oxford',
  'Harvard University'
)
ORDER BY world_ranking, canonical_name;
