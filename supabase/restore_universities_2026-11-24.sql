begin;

-- Reuse the original catalogue IDs from the documented 2026-10-25 removal.
-- Store checked institutional facts and leave programme-dependent fees and
-- requirements to the official pages.
insert into public.universities (
  id, name, canonical_name, country, country_code, city, flag_emoji,
  university_type, description, website_url, official_website_url, admissions_url,
  international_admissions_url, undergraduate_admissions_url, application_url,
  source_url, last_verified_at, verification_status, data_source
) values
  (237, 'Tel Aviv University', 'Tel Aviv University', 'Israel', 'IL', 'Tel Aviv', '🇮🇱',
   'Public', 'Tel Aviv University offers degrees taught in English through the Lowy International School. Check the individual programme for admission requirements and deadlines.',
   'https://english.tau.ac.il/', 'https://english.tau.ac.il/', 'https://international.tau.ac.il/Degree_Programs',
   'https://international.tau.ac.il/Degree_Programs', 'https://international.tau.ac.il/undergraduate_degrees_overview',
   'https://international.tau.ac.il/apply-to-international-programs-at-tel-aviv-university',
   'https://international.tau.ac.il/Degree_Programs', now(), 'verified', 'official_source_review'),
  (287, 'The Hebrew University of Jerusalem', 'The Hebrew University of Jerusalem', 'Israel', 'IL', 'Jerusalem', '🇮🇱',
   'Public', 'The Hebrew University of Jerusalem publishes application guidance through its Overseas Admissions office. The Rothberg International School offers an international bachelor’s degree.',
   'https://en.huji.ac.il/', 'https://en.huji.ac.il/', 'https://info-overseas.huji.ac.il/',
   'https://info-overseas.huji.ac.il/', 'https://info-overseas.huji.ac.il/admission-requirements-bachelor%E2%80%99s-degrees',
   'https://info-overseas.huji.ac.il/application-process', 'https://info-overseas.huji.ac.il/',
   now(), 'verified', 'official_source_review')
on conflict do nothing;

insert into public.sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
values
  ('https://www.topuniversities.com/universities/tel-aviv-university', 'Tel Aviv University — QS World University Rankings', 'www.topuniversities.com', 'official_ranking', now(), true, true),
  ('https://www.topuniversities.com/universities/hebrew-university-jerusalem', 'The Hebrew University of Jerusalem — QS World University Rankings', 'www.topuniversities.com', 'official_ranking', now(), true, true),
  ('https://international.tau.ac.il/undergraduate_degrees_overview', 'Tel Aviv University — Undergraduate Degrees in English', 'international.tau.ac.il', 'official_admissions', now(), true, true),
  ('https://info-overseas.huji.ac.il/', 'The Hebrew University of Jerusalem — Overseas Admission', 'info-overseas.huji.ac.il', 'official_admissions', now(), true, true),
  ('https://liberal-arts.tau.ac.il/admissions', 'Tel Aviv University — International B.A. in Liberal Arts admission', 'liberal-arts.tau.ac.il', 'official_program', now(), true, true),
  ('https://overseas.huji.ac.il/BA/', 'The Hebrew University of Jerusalem — International bachelor’s degree', 'overseas.huji.ac.il', 'official_program', now(), true, true)
on conflict (url) do update
set accessed_at = excluded.accessed_at, is_official = true, is_verified = true;

with restored (id, name, rank, label, url) as (values
  (237, 'Tel Aviv University', 208, '#208', 'https://www.topuniversities.com/universities/tel-aviv-university'),
  (287, 'The Hebrew University of Jerusalem', 218, '#=218', 'https://www.topuniversities.com/universities/hebrew-university-jerusalem')
)
insert into public.university_rankings (
  university_id, ranking_provider, ranking_name, ranking_year, rank, rank_label, source_id, verified_at, verification_status
)
select u.id, 'QS Quacquarelli Symonds', 'QS World University Rankings', 2027, r.rank, r.label, s.id, now(), 'verified'
from restored r
join public.universities u on u.id = r.id and u.canonical_name = r.name
join public.sources s on s.url = r.url
on conflict (university_id, ranking_provider, ranking_name, ranking_year) do update
set rank = excluded.rank, rank_label = excluded.rank_label, source_id = excluded.source_id,
    verified_at = excluded.verified_at, verification_status = excluded.verification_status;

with restored (id, name, url) as (values
  (237, 'Tel Aviv University', 'https://international.tau.ac.il/undergraduate_degrees_overview'),
  (287, 'The Hebrew University of Jerusalem', 'https://info-overseas.huji.ac.il/')
)
insert into public.university_sources (university_id, source_id, source_type)
select u.id, s.id, 'official_admissions'
from restored r
join public.universities u on u.id = r.id and u.canonical_name = r.name
join public.sources s on s.url = r.url
where not exists (
  select 1 from public.university_sources l where l.university_id = u.id and l.source_id = s.id
);

with restored (id, institution, name, field, url, apply_url) as (values
  (237, 'Tel Aviv University', 'International B.A. in Liberal Arts', 'Liberal Arts', 'https://liberal-arts.tau.ac.il/admissions', 'https://international.tau.ac.il/apply-to-international-programs-at-tel-aviv-university'),
  (287, 'The Hebrew University of Jerusalem', 'International Bachelor’s Degree Program', null, 'https://overseas.huji.ac.il/BA/', 'https://overseas.huji.ac.il/BA/')
)
insert into public.programs (university_id, name, field, degree_level, official_url, application_url, is_verified, verification_status, source_url, last_verified_at)
select u.id, r.name, r.field, 'Bachelor''s', r.url, r.apply_url, true, 'verified', r.url, now()
from restored r
join public.universities u on u.id = r.id and u.canonical_name = r.institution
on conflict do nothing;

insert into public.cache_revisions (scope, revision, reason, updated_at)
values ('catalogue', 2, 'Restored two universities from official sources', now())
on conflict (scope) do update
set revision = public.cache_revisions.revision + 1, reason = excluded.reason, updated_at = now();

commit;
