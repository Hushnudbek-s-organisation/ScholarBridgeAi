/**
 * REGIONAL SUPER POWERS — Central Asian scholarship blueprints (Pillar 5.3).
 *
 * The generic catalogues tell a Tashkent student almost nothing about the two
 * things that actually decide their case: WHICH programme they are eligible
 * for as a citizen of Uzbekistan, and WHICH extra document that programme
 * demands (return-service contract, apostille, APS certificate, sending-partner
 * registration). This module is the structural half — ids, official URLs,
 * degree levels and the i18n key layout — while every human-readable line
 * lives in the `regionalScholarships` namespace of en/uz/ru so the guidance is
 * translated rather than half-English.
 *
 * HONESTY RULES
 *  • No deadlines, quotas or "chance" numbers are stored here: they change
 *    every cycle, so the UI links the official page instead.
 *  • No claim that any applicant will be selected. The notes describe
 *    requirements and the commitments a student takes on.
 */
import type { DegreeLevel } from "@/lib/degreeLevels";

export type RegionalScholarshipId =
  | "eyuf"
  | "gks"
  | "hungaricum"
  | "daad"
  | "turkiye"
  | "chevening"
  | "fulbright"
  | "erasmus";

export interface RegionalScholarshipPack {
  id: RegionalScholarshipId;
  /** Official application portal — the only place a deadline is authoritative. */
  url: string;
  /** Degree levels the programme is normally open to. */
  degrees: DegreeLevel[];
  /** Counts of the i18n keys that must exist for this pack (checked by test:regional). */
  docs: number;
  essays: number;
  milestones: number;
  /** Country/region best known for the award, used for the flag row in the UI. */
  region: "UZ" | "KR" | "HU" | "DE" | "TR" | "UK" | "US" | "EU";
}

export const REGIONAL_SCHOLARSHIP_PACKS: readonly RegionalScholarshipPack[] = [
  { id: "eyuf", url: "https://eyuf.uz", degrees: ["Bachelor", "Master", "PhD"], docs: 5, essays: 3, milestones: 3, region: "UZ" },
  { id: "gks", url: "https://www.studyinkorea.go.kr", degrees: ["Bachelor", "Master", "PhD"], docs: 5, essays: 3, milestones: 3, region: "KR" },
  { id: "hungaricum", url: "https://stipendiumhungaricum.hu", degrees: ["Bachelor", "Master", "PhD"], docs: 5, essays: 3, milestones: 3, region: "HU" },
  { id: "daad", url: "https://www.daad.de/en/", degrees: ["Master", "PhD"], docs: 5, essays: 3, milestones: 3, region: "DE" },
  { id: "turkiye", url: "https://turkiyeburslari.gov.tr", degrees: ["Bachelor", "Master", "PhD"], docs: 5, essays: 3, milestones: 3, region: "TR" },
  { id: "chevening", url: "https://www.chevening.org", degrees: ["Master"], docs: 5, essays: 3, milestones: 3, region: "UK" },
  { id: "fulbright", url: "https://uz.usembassy.gov", degrees: ["Master", "PhD"], docs: 5, essays: 3, milestones: 3, region: "US" },
  { id: "erasmus", url: "https://erasmus-plus.ec.europa.eu", degrees: ["Master"], docs: 5, essays: 3, milestones: 3, region: "EU" },
] as const;

export const REGIONAL_SCHOLARSHIP_IDS: readonly RegionalScholarshipId[] =
  REGIONAL_SCHOLARSHIP_PACKS.map((p) => p.id);

const BY_ID = new Map<RegionalScholarshipId, RegionalScholarshipPack>(
  REGIONAL_SCHOLARSHIP_PACKS.map((p) => [p.id, p])
);

export function regionalScholarshipPack(id: string | null | undefined): RegionalScholarshipPack | null {
  if (!id) return null;
  return BY_ID.get(id as RegionalScholarshipId) ?? null;
}

/**
 * Packs open to a degree level. `null`/`undefined` (unknown level) returns the
 * full list rather than an empty one — we never hide an option because the
 * student has not answered yet.
 */
export function regionalScholarshipsForDegree(
  level: string | null | undefined
): readonly RegionalScholarshipPack[] {
  if (!level) return REGIONAL_SCHOLARSHIP_PACKS;
  return REGIONAL_SCHOLARSHIP_PACKS.filter((p) => p.degrees.includes(level as DegreeLevel));
}

/** i18n key inside the `regionalScholarships` namespace, e.g. `eyuf.doc0`. */
export function regionalScholarshipKey(
  id: RegionalScholarshipId,
  field: "name" | "provider" | "note" | `doc${number}` | `essay${number}` | `milestone${number}`
): string {
  return `${id}.${field}`;
}

/** Indexed keys for a pack's repeated blocks (documents, essays, milestones). */
export function regionalScholarshipListKeys(
  id: RegionalScholarshipId,
  kind: "doc" | "essay" | "milestone",
  count: number
): string[] {
  return Array.from({ length: count }, (_, i) => regionalScholarshipKey(id, `${kind}${i}` as `doc${number}`));
}
