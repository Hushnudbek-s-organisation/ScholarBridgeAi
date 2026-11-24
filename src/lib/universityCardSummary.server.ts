import { sql } from "drizzle-orm";
import { db } from "@/db";
import { safeAcademicLink, type PublishedCardDeadline, type VerifiedCardProgramme } from "./universityCardSummary";

type ProgrammeRow = Omit<VerifiedCardProgramme, "tuition"> & {
  amount: string | number | null;
  currency: string;
  period: string;
  tuitionUrl: string | null;
  tuitionTitle: string | null;
};

export async function loadUniversityCardEvidence(ids: number[]) {
  const programmes = new Map<number, VerifiedCardProgramme[]>();
  const deadlines = new Map<number, PublishedCardDeadline[]>();
  if (!ids.length) return { programmes, deadlines };

  const universityIds = sql.join(ids.map(id => sql`${id}`), sql`,`);
  const [programmeRows, cycleRows] = await Promise.allSettled([
    db.execute<ProgrammeRow>(sql`
      with linked as (
        select distinct on (ps.program_id, (ps.source_type = 'tuition'))
          ps.program_id, ps.source_type = 'tuition' as is_fee, s.url, s.title
        from public.program_sources ps join public.sources s on s.id = ps.source_id
        where s.is_official and s.is_verified and ps.source_type <> 'admission_requirement'
        order by ps.program_id, (ps.source_type = 'tuition'), s.accessed_at desc nulls last, s.id
      )
      select p.id, p.university_id as "universityId", p.name, p.field, p.degree_level as "degreeLevel",
        coalesce(official.url, programme_source.url) as "sourceUrl", p.annual_tuition as amount,
        p.tuition_currency as currency, p.tuition_period as period, fees.url as "tuitionUrl", fees.title as "tuitionTitle"
      from public.programs p
      left join public.sources official on official.url = p.source_url and official.is_official and official.is_verified
      left join linked programme_source on programme_source.program_id = p.id and not programme_source.is_fee
      left join linked fees on fees.program_id = p.id and fees.is_fee and p.annual_tuition is not null
      where p.university_id in (${universityIds}) and p.is_active and p.is_verified
        and p.verification_status = 'verified' and p.last_verified_at is not null
        and coalesce(official.url, programme_source.url) is not null
      order by p.id
    `),
    db.execute<PublishedCardDeadline>(sql`
      select a.university_id as "universityId", a.program_id as "programmeId", p.name as "programmeName",
        p.degree_level as "degreeLevel", a.deadline::text as date,
        coalesce(nullif(btrim(a.application_type), ''), nullif(btrim(a.deadline_type), ''), a.academic_year) as category,
        a.source_url as "sourceUrl"
      from public.application_cycles a
      left join public.programs p on p.id = a.program_id and p.university_id = a.university_id and p.is_active
      left join public.sources exact on exact.url = a.source_url and exact.is_official and exact.is_verified
      left join public.sources linked on linked.id = a.source_id and linked.is_official and linked.is_verified
      left join public.sources publisher on publisher.id = a.official_source_id and publisher.is_official and publisher.is_verified
      where a.university_id in (${universityIds}) and a.is_active and a.is_verified and not a.is_estimated
        and a.verification_status = 'verified' and a.deadline >= current_date - 1
        and a.last_verified_at is not null and (a.program_id is null or p.id is not null)
        and a.source_url ~ '^https://[^/]+/[^/?#]'
        and coalesce(exact.id, linked.id, publisher.id) is not null
      order by a.deadline, a.id
    `),
  ]);

  if (programmeRows.status === "rejected") console.warn("Verified catalogue programmes unavailable", programmeRows.reason?.name);
  if (cycleRows.status === "rejected") console.warn("Verified catalogue deadlines unavailable", cycleRows.reason?.name);

  for (const { amount, currency, period, tuitionUrl, tuitionTitle, ...row } of programmeRows.status === "fulfilled" ? programmeRows.value.rows : []) {
    const sourceUrl = safeAcademicLink(row.sourceUrl);
    if (!sourceUrl) continue;
    const feeLink = safeAcademicLink(tuitionUrl);
    const tuition: VerifiedCardProgramme["tuition"] = amount != null && Number.isFinite(Number(amount)) && Number(amount) >= 0
      && /^[A-Z]{3}$/.test(currency) && (period === "year" || period === "semester" || period === "total")
      && feeLink
      ? { amount: Number(amount), currency, period, sourceUrl: feeLink, sourceTitle: tuitionTitle } : null;
    const entries = programmes.get(row.universityId) ?? [];
    entries.push({ ...row, sourceUrl, tuition });
    programmes.set(row.universityId, entries);
  }

  for (const row of cycleRows.status === "fulfilled" ? cycleRows.value.rows : []) {
    const sourceUrl = safeAcademicLink(row.sourceUrl);
    if (!sourceUrl || !row.category || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    const entries = deadlines.get(row.universityId) ?? [];
    entries.push({ ...row, sourceUrl });
    deadlines.set(row.universityId, entries);
  }

  return { programmes, deadlines };
}
