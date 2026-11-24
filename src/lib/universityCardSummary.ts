import { supportsDegreeLevel } from "./degreeLevels";
import { subjectAffinity } from "./subjectAffinity";

export type VerifiedCardProgramme = {
  id: number;
  universityId: number;
  name: string;
  field: string | null;
  degreeLevel: string | null;
  sourceUrl: string;
  tuition: { amount: number; currency: string; sourceUrl: string; sourceTitle: string | null; period: "year" | "semester" | "total" } | null;
};

export type PublishedCardDeadline = {
  universityId: number;
  programmeId: number | null;
  programmeName: string | null;
  degreeLevel: string | null;
  date: string;
  category: string;
  sourceUrl: string;
};

export type UniversityCardSummary = {
  programme: VerifiedCardProgramme | null;
  deadline: PublishedCardDeadline | null;
  admissionsUrl: string | null;
};

export function safeAcademicLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function selectUniversityCardSummary(
  university: { internationalAdmissionsUrl?: string | null; admissionsUrl?: string | null; officialWebsiteUrl?: string | null; websiteUrl?: string | null },
  programmes: VerifiedCardProgramme[],
  deadlines: PublishedCardDeadline[],
  preferences: { degreeLevel?: string | null; targetMajor?: string | null } | null,
  today = new Date().toISOString().slice(0, 10),
): UniversityCardSummary {
  const matchesDegree = programmes.filter(item => supportsDegreeLevel(item.degreeLevel, preferences?.degreeLevel));
  const eligible = matchesDegree.length ? matchesDegree : programmes;
  const majors = preferences?.targetMajor ? [preferences.targetMajor] : [];
  const programme = eligible.map(item => ({
    item, affinity: subjectAffinity(majors, item.field ?? item.name).score,
  })).sort((a, b) => b.affinity - a.affinity || a.item.id - b.item.id)[0]?.item ?? null;
  const upcoming = deadlines.filter(item => item.date >= today);
  const deadline = upcoming.find(item => programme && item.programmeId === programme.id)
    ?? upcoming.find(item => item.programmeId == null)
    ?? upcoming.find(item => !preferences?.degreeLevel || supportsDegreeLevel(item.degreeLevel, preferences.degreeLevel))
    ?? null;
  return {
    programme,
    deadline,
    admissionsUrl: safeAcademicLink(university.internationalAdmissionsUrl) ?? safeAcademicLink(university.admissionsUrl)
      ?? programme?.sourceUrl ?? safeAcademicLink(university.officialWebsiteUrl) ?? safeAcademicLink(university.websiteUrl),
  };
}
