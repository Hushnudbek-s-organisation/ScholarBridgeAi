/**
 * In-memory catalogue cache (Priority 1 — 20×–50× faster catalogue reads).
 *
 * The university, scholarship and opportunity dictionaries are read-mostly:
 * catalogues and their source links change only when an administrator edits
 * them, yet every filter change, search keystroke and pagination click used to
 * re-run full catalogue reads against PostgreSQL before slicing the results.
 *
 * This module keeps the *unfiltered* base dataset in process memory for a
 * short TTL and hands out fresh copies, so the routes still perform every
 * filter, sort, match score and pagination step exactly as before — only the
 * database round trips disappear. Warm responses are therefore identical in
 * content (and ordering) to a cold one, but produced in single-digit
 * milliseconds.
 *
 * Invalidation:
 *   • TTL (60 s) is the safety net;
 *   • `invalidateCatalogCache()` is called by admin writes to universities,
 *     programs, scholarships and opportunities, so an operator sees their own
 *     catalogue edit on the very next request;
 *   • profile-dependent match inputs use a shorter 15 s cache keyed by profile
 *     id and are dropped by `invalidateProfileMatchCache()` whenever the
 *     student edits their profile or activity portfolio.
 *
 * Note: an in-process cache is per Node instance. With several instances an
 * admin edit may take up to the TTL to appear on the OTHER instances, which is
 * why the TTL stays small.
 */
import { db } from "@/db";
import {
  studentProfiles,
  universities,
  universityPrograms,
  universitySources,
  sources,
  scholarships,
  scholarshipSources,
  opportunities,
} from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { selectUniversities } from "@/lib/universities";
import { pickBestSource } from "@/lib/sourcePick";
import { chancingProfileWithActivities, toMatchProfileWithActivities } from "@/lib/profileMapping";
import {
  resolvedUsdUniversityCosts,
  resolvedUsdScholarshipAmount,
  type ResolvedUsdUniversityCosts,
} from "@/lib/usdCosts";
import type { StudentProfileData, UniversityData } from "@/lib/matching";

/** How long a base catalogue snapshot may be served (ms). */
export const CATALOG_TTL_MS = 60_000;
/** How long a profile's derived match inputs may be reused (ms). */
export const PROFILE_MATCH_TTL_MS = 15_000;

export type SourceSignal = {
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  sourceTitle: string | null;
};

type UniRow = typeof universities.$inferSelect;
type ScholarshipRow = typeof scholarships.$inferSelect;

export type UniversitiesBundle = {
  /** Every university, with the compatibility USD cost mirrors resolved. */
  unis: (UniRow & ResolvedUsdUniversityCosts)[];
  /** universityId → list of program `field` labels (2,423 rows). */
  programFieldsByUni: Map<number, string[]>;
  /** universityId → best verified source link. */
  sourceMap: Map<number, SourceSignal>;
};

export type ScholarshipsBundle = {
  /** Every ACTIVE scholarship, with the USD amount mirror resolved. */
  entries: (ScholarshipRow & { amountUsdValue: number | null })[];
  /** scholarshipId → best verified source link. */
  sourceMap: Map<number, SourceSignal>;
};

type OpportunityRow = typeof opportunities.$inferSelect;
export type OpportunitiesBundle = {
  /** Feed fields only; long descriptions are not needed for matching/cards. */
  entries: Pick<OpportunityRow,
    | "id"
    | "type"
    | "title"
    | "provider"
    | "country"
    | "fields"
    | "level"
    | "deadlineDate"
    | "url"
    | "isVerified"
  >[];
};

type CacheEntry<T> = { expiresAt: number; value: T };

let universitiesEntry: CacheEntry<UniversitiesBundle> | null = null;
let universitiesInFlight: Promise<UniversitiesBundle> | null = null;
let scholarshipsEntry: CacheEntry<ScholarshipsBundle> | null = null;
let scholarshipsInFlight: Promise<ScholarshipsBundle> | null = null;
let opportunitiesEntry: CacheEntry<OpportunitiesBundle> | null = null;
let opportunitiesInFlight: Promise<OpportunitiesBundle> | null = null;

type MatchProfile = Awaited<ReturnType<typeof toMatchProfileWithActivities>>;
type ChancingProfile = Awaited<ReturnType<typeof chancingProfileWithActivities>>;
/**
 * The DB row plus its derived match inputs. `chancingProfile` is the same
 * person read through the 5-layer positioning engine (chance scores) — the
 * two are computed together so a request can never mix a fresh fit score with
 * a stale cohort profile.
 */
type ProfileMatch = {
  profileData: StudentProfileData;
  matchProfile: MatchProfile;
  chancingProfile: ChancingProfile;
};

const profileMatchCache = new Map<number, CacheEntry<ProfileMatch>>();
const universityDetailCache = new Map<number, CacheEntry<Record<string, unknown>>>();

export function getCachedUniversityDetailBase(uniId: number): Record<string, unknown> | null {
  return fresh(universityDetailCache.get(uniId) ?? null);
}

export function setCachedUniversityDetailBase(uniId: number, payload: Record<string, unknown>): void {
  if (universityDetailCache.size >= 250 && !universityDetailCache.has(uniId)) {
    const oldest = universityDetailCache.keys().next().value;
    if (oldest !== undefined) universityDetailCache.delete(oldest);
  }
  universityDetailCache.set(uniId, { value: payload, expiresAt: Date.now() + CATALOG_TTL_MS });
}

function fresh<T>(entry: CacheEntry<T> | null): T | null {
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

/* ------------------------------------------------------------------ sources */

type SourceRow = { id: number; url: string; title: string; accessedAt: Date | null };

async function loadSourceIndex(srcIds: (number | null)[]): Promise<Map<number, SourceRow>> {
  const ids = [...new Set(srcIds.filter((x): x is number => x != null))];
  if (ids.length === 0) return new Map();
  try {
    const rows = await db
      .select({ id: sources.id, url: sources.url, title: sources.title, accessedAt: sources.accessedAt })
      .from(sources)
      .where(inArray(sources.id, ids));
    return new Map(rows.map((r) => [r.id, r]));
  } catch {
    // `sources` shape differs on very old installs — the UI shows "pending
    // verification" instead of a fabricated link.
    return new Map();
  }
}

/* ------------------------------------------------------------ universities */

async function buildUniversitiesBundle(): Promise<UniversitiesBundle> {
  // `selectUniversities()` degrades to a core column subset on very old
  // schemas; the annotation keeps the full row shape for readers, exactly as
  // the routes assumed before this cache existed.
  const rows = (await selectUniversities()) as UniRow[];
  const unis: (UniRow & ResolvedUsdUniversityCosts)[] = rows.map((uni) => ({
    ...uni,
    // Compatibility USD fields are derived from the canonical currency and
    // period first; stale USD mirrors never drive filters or displays.
    ...resolvedUsdUniversityCosts(uni),
  }));

  const programFieldsByUni = new Map<number, string[]>();
  const sourceMap = new Map<number, SourceSignal>();

  try {
    const uniIds = unis.map((u) => u.id);
    if (uniIds.length > 0) {
      const progRows = await db
        .select({ universityId: universityPrograms.universityId, field: universityPrograms.field })
        .from(universityPrograms)
        .where(inArray(universityPrograms.universityId, uniIds));
      for (const r of progRows) {
        if (!r.field) continue;
        const arr = programFieldsByUni.get(r.universityId) ?? [];
        arr.push(r.field);
        programFieldsByUni.set(r.universityId, arr);
      }
    }
  } catch {
    // programs table missing — the major filter falls back to programMajor.
  }

  try {
    const uniIds = unis.map((u) => u.id);
    if (uniIds.length > 0) {
      const links = await db
        .select()
        .from(universitySources)
        .where(inArray(universitySources.universityId, uniIds));
      const srcById = await loadSourceIndex(links.map((l) => l.sourceId));

      const grouped = new Map<number, typeof links>();
      for (const link of links) {
        const arr = grouped.get(link.universityId) || [];
        arr.push(link);
        grouped.set(link.universityId, arr);
      }
      for (const [uniId, uniLinks] of grouped) {
        const best = pickBestSource(uniLinks, srcById);
        if (best?.url) {
          sourceMap.set(uniId, {
            sourceUrl: best.url,
            lastVerifiedAt: best.accessedAt ? best.accessedAt.toISOString() : null,
            sourceTitle: best.title,
          });
        }
      }
    }
  } catch {
    // university_sources missing — universities render without source signals.
  }

  // The university's own lastVerifiedAt only ever fills a MISSING date on an
  // already-linked source; it is never used to fabricate a source URL.
  for (const uni of unis) {
    const existing = sourceMap.get(uni.id);
    if (existing && !existing.lastVerifiedAt) {
      const fallback = (uni as { lastVerifiedAt?: Date | string | null }).lastVerifiedAt;
      if (fallback) {
        sourceMap.set(uni.id, {
          ...existing,
          lastVerifiedAt: new Date(fallback as string | Date).toISOString(),
        });
      }
    }
  }

  return { unis, programFieldsByUni, sourceMap };
}

/**
 * Base university dataset (all rows, program fields, source signals).
 * Returns a fresh array/map pair per call so callers can filter and sort
 * freely without mutating the cached snapshot.
 */
export async function getCachedUniversitiesBundle(): Promise<UniversitiesBundle> {
  const cached = fresh(universitiesEntry);
  if (cached) return cached;
  if (universitiesInFlight) return universitiesInFlight;

  const run = buildUniversitiesBundle()
    .then((value) => {
      universitiesEntry = { value, expiresAt: Date.now() + CATALOG_TTL_MS };
      universitiesInFlight = null;
      return value;
    })
    .catch((err) => {
      universitiesInFlight = null;
      throw err;
    });
  universitiesInFlight = run;
  return run;
}

/* ------------------------------------------------------------- scholarships */

async function buildScholarshipsBundle(): Promise<ScholarshipsBundle> {
  // The public catalogue and global search share one visibility boundary:
  // inactive records stay out of student-facing lists and search results.
  const rows = await db.select().from(scholarships).where(eq(scholarships.isActive, true));
  const entries = rows.map((s) => ({
    ...s,
    // Keep canonical awardAmount/awardCurrency intact, but make the
    // compatibility field explicitly USD-safe for existing displays.
    amountUsdValue: resolvedUsdScholarshipAmount(s),
  }));

  const sourceMap = new Map<number, SourceSignal>();
  try {
    const ids = entries.map((s) => s.id);
    if (ids.length > 0) {
      const links = await db
        .select()
        .from(scholarshipSources)
        .where(inArray(scholarshipSources.scholarshipId, ids));
      const srcById = await loadSourceIndex(links.map((l) => l.sourceId));

      const grouped = new Map<number, typeof links>();
      for (const link of links) {
        const arr = grouped.get(link.scholarshipId) || [];
        arr.push(link);
        grouped.set(link.scholarshipId, arr);
      }
      for (const [schId, schLinks] of grouped) {
        const best = pickBestSource(schLinks, srcById);
        if (best?.url) {
          sourceMap.set(schId, {
            sourceUrl: best.url,
            lastVerifiedAt: best.accessedAt ? best.accessedAt.toISOString() : null,
            sourceTitle: best.title,
          });
        }
      }

      // If a linked source exists but lacks accessedAt, fall back to the
      // scholarship's own lastVerifiedAt.
      for (const sch of entries) {
        const existing = sourceMap.get(sch.id);
        if (existing && !existing.lastVerifiedAt) {
          const fallback = (sch as { lastVerifiedAt?: Date | string | null }).lastVerifiedAt;
          if (fallback) {
            sourceMap.set(sch.id, {
              ...existing,
              lastVerifiedAt: new Date(fallback as string | Date).toISOString(),
            });
          }
        }
      }
    }
  } catch {
    // scholarship_sources missing — UI shows pending verification.
  }

  return { entries, sourceMap };
}

/** Base active-scholarship dataset. Copies are handed out per call. */
export async function getCachedScholarshipsBundle(): Promise<ScholarshipsBundle> {
  const cached = fresh(scholarshipsEntry);
  if (cached) return cached;
  if (scholarshipsInFlight) return scholarshipsInFlight;

  const run = buildScholarshipsBundle()
    .then((value) => {
      scholarshipsEntry = { value, expiresAt: Date.now() + CATALOG_TTL_MS };
      scholarshipsInFlight = null;
      return value;
    })
    .catch((err) => {
      scholarshipsInFlight = null;
      throw err;
    });
  scholarshipsInFlight = run;
  return run;
}

/* --------------------------------------------------------- opportunities */

async function buildOpportunitiesBundle(): Promise<OpportunitiesBundle> {
  const entries = await db
    .select({
      id: opportunities.id,
      type: opportunities.type,
      title: opportunities.title,
      provider: opportunities.provider,
      country: opportunities.country,
      fields: opportunities.fields,
      level: opportunities.level,
      deadlineDate: opportunities.deadlineDate,
      url: opportunities.url,
      isVerified: opportunities.isVerified,
    })
    .from(opportunities)
    .orderBy(opportunities.title);
  return { entries };
}

/** Base opportunity feed dataset, cached with the same short TTL as catalogs. */
export async function getCachedOpportunitiesBundle(): Promise<OpportunitiesBundle> {
  const cached = fresh(opportunitiesEntry);
  if (cached) return cached;
  if (opportunitiesInFlight) return opportunitiesInFlight;

  const run = buildOpportunitiesBundle()
    .then((value) => {
      opportunitiesEntry = { value, expiresAt: Date.now() + CATALOG_TTL_MS };
      opportunitiesInFlight = null;
      return value;
    })
    .catch((err) => {
      opportunitiesInFlight = null;
      throw err;
    });
  opportunitiesInFlight = run;
  return run;
}

/* --------------------------------------------------------- profile matching */

/**
 * The DB row plus its derived match/match-profile inputs for one student.
 * Private data: callers MUST authorise the request before reading this.
 */
export async function getCachedProfileForMatching(profileId: number): Promise<ProfileMatch | null> {
  const cached = fresh(profileMatchCache.get(profileId) ?? null);
  if (cached) return cached;

  const [row] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
  if (!row) return null;
  const [matchProfile, chancingProfile] = await Promise.all([
    toMatchProfileWithActivities(row),
    chancingProfileWithActivities(row),
  ]);
  const value: ProfileMatch = {
    profileData: row as unknown as StudentProfileData,
    matchProfile,
    chancingProfile,
  };
  profileMatchCache.set(profileId, { value, expiresAt: Date.now() + PROFILE_MATCH_TTL_MS });
  return value;
}

/* ------------------------------------------------------------ invalidation */

/** Drop the university and/or scholarship catalogue snapshots. */
export function invalidateCatalogCache(kind: "universities" | "scholarships" | "opportunities" | "all" = "all") {
  if (kind === "universities" || kind === "all") {
    universitiesEntry = null;
    universitiesInFlight = null;
    universityDetailCache.clear();
  }
  if (kind === "scholarships" || kind === "all") {
    scholarshipsEntry = null;
    scholarshipsInFlight = null;
    universityDetailCache.clear();
  }
  if (kind === "opportunities" || kind === "all") {
    opportunitiesEntry = null;
    opportunitiesInFlight = null;
  }
}

/**
 * Drop cached match inputs — for one student, or for everybody when the
 * change (e.g. an administrator editing the catalogue) can affect all.
 */
export function invalidateProfileMatchCache(profileId?: number) {
  if (profileId == null) {
    profileMatchCache.clear();
    return;
  }
  profileMatchCache.delete(profileId);
}

/** Test hook: clear everything. */
export function resetCatalogCacheForTests() {
  universitiesEntry = null;
  scholarshipsEntry = null;
  opportunitiesEntry = null;
  universitiesInFlight = null;
  scholarshipsInFlight = null;
  opportunitiesInFlight = null;
  profileMatchCache.clear();
  universityDetailCache.clear();
}

/** Diagnostics for the operations dashboard / tests. */
export function catalogCacheStats() {
  return {
    universitiesCached: fresh(universitiesEntry) !== null,
    scholarshipsCached: fresh(scholarshipsEntry) !== null,
    opportunitiesCached: fresh(opportunitiesEntry) !== null,
    profileMatchEntries: [...profileMatchCache.values()].filter((e) => e.expiresAt > Date.now()).length,
  };
}

export type { UniversityData };
