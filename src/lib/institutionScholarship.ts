import { countriesMatch } from "./countries";

type Institution = {
  id: number;
  name: string;
  canonicalName?: string | null;
  shortName?: string | null;
  country: string;
};

type Award = {
  universityId?: number | null;
  provider?: string | null;
  country?: string | null;
};

function normalized(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** A detail page lists institution-specific awards, not a country-wide search.
 * A different explicit university id always wins over name or country hints.
 * Never use shared words like "science" or "technology" to infer a provider.
 */
export function institutionScholarshipMatch(award: Award, university: Institution): boolean {
  if (award.universityId != null) return award.universityId === university.id;
  if (!countriesMatch(award.country, university.country)) return false;
  const provider = normalized(award.provider);
  if (!provider) return false;
  const aliases = [university.name, university.canonicalName, university.shortName]
    .flatMap((name) => [normalized(name), normalized(name?.replace(/\s*\([^()]+\)\s*$/, ""))])
    .filter(Boolean);
  return aliases.includes(provider);
}
