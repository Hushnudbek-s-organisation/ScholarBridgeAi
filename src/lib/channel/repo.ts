/**
 * Database accessors for the channel publisher's configuration: runtime
 * settings, the country table and the authored Uzbek copy.
 *
 * Every read falls back to the in-code defaults on a database error, so a
 * hiccup can never produce a half-configured post. Writes are validated by
 * `mergeChannelSettings`, which silently repairs anything out of range — the
 * admin UI shows the repaired value, so it is never a surprise.
 */
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  channelAudit,
  channelCountries,
  channelLinkClicks,
  channelLinks,
  channelSettings,
  scholarshipChannelContent,
} from "@/db/schema";
import { isSameOrigin, scholarshipLinkCode, siteLinkPath } from "./links";
import { CHANNEL_COUNTRIES, countryFromRow, type ChannelCountry } from "./countries";
import { contentFromRow, type ScholarshipContent } from "./content";
import { ensureChannelTables } from "./db";
import {
  DEFAULT_CHANNEL_SETTINGS,
  mergeChannelSettings,
  settingsFromRows,
  type ChannelSettings,
  type SettingsKey,
} from "./settings";

/** Settings for a run: stored rows when present, defaults otherwise. */
export async function loadChannelSettings(): Promise<ChannelSettings> {
  if (!(await ensureChannelTables())) return DEFAULT_CHANNEL_SETTINGS;
  try {
    const rows = await db.select({ key: channelSettings.key, value: channelSettings.value }).from(channelSettings);
    return settingsFromRows(rows);
  } catch (err) {
    console.error("[channel] settings read failed, using defaults:", err);
    return DEFAULT_CHANNEL_SETTINGS;
  }
}

/** One stored settings block, or null when it was never written. */
export async function readSettingsBlock(key: SettingsKey): Promise<unknown> {
  if (!(await ensureChannelTables())) return null;
  try {
    const rows = await db
      .select({ value: channelSettings.value })
      .from(channelSettings)
      .where(inArray(channelSettings.key, [key]))
      .limit(1);
    if (!rows.length) return null;
    return rows[0].value ? JSON.parse(rows[0].value) : null;
  } catch (err) {
    console.error("[channel] settings block read failed:", err);
    return null;
  }
}

/**
 * Validate and store one settings block. Returns the fully merged settings, so
 * the caller can echo exactly what the next run will use.
 */
export async function saveChannelSettingsBlock(
  key: SettingsKey,
  value: unknown,
  actorProfileId: number | null
): Promise<ChannelSettings> {
  const rows = await db.select({ key: channelSettings.key, value: channelSettings.value }).from(channelSettings);
  const next = settingsFromRows([
    ...rows.filter((row) => row.key !== key),
    { key, value: JSON.stringify(value ?? {}) },
  ]);
  await db
    .insert(channelSettings)
    .values({ key, value: JSON.stringify(value ?? {}), updatedBy: actorProfileId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: channelSettings.key,
      set: { value: JSON.stringify(value ?? {}), updatedBy: actorProfileId, updatedAt: new Date() },
    });
  return next;
}

/** Write the seeded countries once; existing (hand-edited) rows are kept. */
export async function seedChannelCountries(): Promise<number> {
  if (!(await ensureChannelTables())) return 0;
  const values = CHANNEL_COUNTRIES.map((country) => ({
    key: country.key,
    iso2: country.iso2 || null,
    flag: country.flag,
    nameUz: country.nameUz,
    nameUzLoc: country.nameUzLoc || null,
    hashtag: country.hashtag || null,
    aliases: JSON.stringify(country.aliases),
  }));
  const inserted = await db
    .insert(channelCountries)
    .values(values)
    .onConflictDoNothing()
    .returning({ key: channelCountries.key });
  return inserted.length;
}

/**
 * Country table for this run: the stored rows, or the in-code defaults.
 *
 * Missing keys are inserted, not just an empty table. Without that, adding a
 * country to `CHANNEL_COUNTRIES` did nothing on a deployment whose table
 * already held the first batch — the award kept its English country name, with
 * no flag and no locative form, and nothing in the panel said why. Operator
 * edits are never overwritten: only keys that do not exist yet are added.
 */
export async function loadChannelCountries(): Promise<readonly ChannelCountry[]> {
  if (!(await ensureChannelTables())) return CHANNEL_COUNTRIES;
  try {
    let rows = await db.select().from(channelCountries);
    const known = new Set(rows.map((row) => row.key));
    const missing = CHANNEL_COUNTRIES.filter((country) => !known.has(country.key));
    if (missing.length) {
      const values = missing.map((country) => ({
        key: country.key,
        iso2: country.iso2 || null,
        flag: country.flag,
        nameUz: country.nameUz,
        nameUzLoc: country.nameUzLoc || null,
        hashtag: country.hashtag || null,
        aliases: JSON.stringify(country.aliases),
      }));
      await db.insert(channelCountries).values(values).onConflictDoNothing();
      rows = await db.select().from(channelCountries);
    }
    return rows.length ? rows.map(countryFromRow) : CHANNEL_COUNTRIES;
  } catch (err) {
    console.error("[channel] country read failed, using defaults:", err);
    return CHANNEL_COUNTRIES;
  }
}

/** Authored copy for the given scholarships. Missing rows produce no key. */
export async function loadContentMap(ids: number[]): Promise<Map<number, ScholarshipContent>> {
  const out = new Map<number, ScholarshipContent>();
  const unique = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  if (!unique.length) return out;
  try {
    const rows = await db
      .select()
      .from(scholarshipChannelContent)
      .where(inArray(scholarshipChannelContent.scholarshipId, unique));
    for (const row of rows) out.set(row.scholarshipId, contentFromRow(row));
  } catch (err) {
    console.error("[channel] content read failed:", err);
  }
  return out;
}

/** Insert or replace the authored copy for one scholarship. */
export async function upsertChannelContent(
  content: ScholarshipContent & { updatedBy?: number | null }
): Promise<void> {
  const values = {
    scholarshipId: content.scholarshipId,
    taglineUz: content.taglineUz,
    fundingTypeUz: content.fundingTypeUz,
    languageReqUz: content.languageReqUz,
    eligibilityUz: JSON.stringify(content.eligibilityUz),
    benefitsUz: JSON.stringify(content.benefitsUz),
    aboutUz: content.aboutUz,
    extraHashtags: JSON.stringify(content.extraHashtags),
    updatedBy: content.updatedBy ?? null,
    updatedAt: new Date(),
  };
  await db
    .insert(scholarshipChannelContent)
    .values(values)
    .onConflictDoUpdate({ target: scholarshipChannelContent.scholarshipId, set: values });
}

/* ----------------------------------------------------------------- */
/* Audit trail (channel_audit — append only)                          */
/* ----------------------------------------------------------------- */

export interface ChannelAuditEntry {
  actorProfileId: number | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

export async function writeChannelAudit(entry: ChannelAuditEntry): Promise<void> {
  try {
    await db.insert(channelAudit).values({
      actorProfileId: entry.actorProfileId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
    });
  } catch (err) {
    // Never fail a mutation because the log write failed.
    console.error("[channel] audit write failed:", err);
  }
}

export async function recentChannelAudit(limit = 100) {
  try {
    return await db.select().from(channelAudit).orderBy(desc(channelAudit.createdAt)).limit(Math.min(500, limit));
  } catch (err) {
    console.error("[channel] audit read failed:", err);
    return [];
  }
}

/* ----------------------------------------------------------------- */
/* Countries                                                          */
/* ----------------------------------------------------------------- */

export async function upsertChannelCountry(row: {
  key: string;
  iso2: string | null;
  flag: string;
  nameUz: string;
  nameUzLoc: string | null;
  hashtag: string | null;
  aliases: string[];
}): Promise<void> {
  const values = {
    key: row.key,
    iso2: row.iso2,
    flag: row.flag,
    nameUz: row.nameUz,
    nameUzLoc: row.nameUzLoc,
    hashtag: row.hashtag,
    aliases: JSON.stringify(row.aliases),
    updatedAt: new Date(),
  };
  await db.insert(channelCountries).values(values).onConflictDoUpdate({ target: channelCountries.key, set: values });
}

export async function deleteChannelCountry(key: string): Promise<boolean> {
  const rows = await db.delete(channelCountries).where(eq(channelCountries.key, key)).returning({ key: channelCountries.key });
  return rows.length > 0;
}

/* ----------------------------------------------------------------- */
/* Short links                                                        */
/* ----------------------------------------------------------------- */

export interface ChannelLinkRow {
  code: string;
  kind: string;
  scholarshipId: number | null;
  url: string;
  enabled: boolean;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export async function loadChannelLinks(): Promise<ChannelLinkRow[]> {
  if (!(await ensureChannelTables())) return [];
  try {
    return await db.select().from(channelLinks).orderBy(desc(channelLinks.createdAt)).limit(1000);
  } catch (err) {
    console.error("[channel] link read failed:", err);
    return [];
  }
}

/**
 * Create (or refresh) the stable "site" link for a scholarship. The URL is
 * never taken from a request: it is rebuilt from the configured origin and the
 * scholarship id, so a poisoned row cannot become an open redirect.
 */
/**
 * A "site" link always points at our own origin — it is built here, never taken
 * from a request — so the rule is "same origin as the configured site", not the
 * public-HTTPS test that external destinations must pass. That keeps local and
 * staging deployments (http://localhost) working without weakening `/go`.
 */
export async function ensureSiteLink(scholarshipId: number, siteUrl: string): Promise<string | null> {
  if (!siteUrl || !Number.isInteger(scholarshipId) || scholarshipId <= 0) return null;
  const code = scholarshipLinkCode(scholarshipId, "site");
  const url = `${siteUrl.replace(/\/+$/, "")}${siteLinkPath(scholarshipId)}`;
  if (!isSameOrigin(url, siteUrl)) return null;
  try {
    await db
      .insert(channelLinks)
      .values({ code, kind: "site", scholarshipId, url })
      .onConflictDoUpdate({ target: channelLinks.code, set: { url, updatedAt: new Date() } });
    return code;
  } catch (err) {
    console.error("[channel] link upsert failed:", err);
    return null;
  }
}

/** Refresh every "site" link after the origin changed. */
export async function syncSiteLinks(siteUrl: string): Promise<number> {
  if (!siteUrl) return 0;
  const rows = await db.select({ code: channelLinks.code, scholarshipId: channelLinks.scholarshipId }).from(channelLinks).where(eq(channelLinks.kind, "site"));
  let updated = 0;
  for (const row of rows) {
    if (row.scholarshipId === null) continue;
    const url = `${siteUrl.replace(/\/+$/, "")}${siteLinkPath(row.scholarshipId)}`;
    if (!isSameOrigin(url, siteUrl)) continue;
    await db.update(channelLinks).set({ url, updatedAt: new Date() }).where(eq(channelLinks.code, row.code));
    updated++;
  }
  return updated;
}

export async function upsertChannelLink(row: {
  code: string;
  kind: "site" | "official" | "custom";
  scholarshipId: number | null;
  url: string;
  enabled: boolean;
  note: string | null;
}): Promise<void> {
  const values = {
    code: row.code,
    kind: row.kind,
    scholarshipId: row.scholarshipId,
    url: row.url,
    enabled: row.enabled,
    note: row.note,
    updatedAt: new Date(),
  };
  await db.insert(channelLinks).values(values).onConflictDoUpdate({ target: channelLinks.code, set: values });
}

export async function setChannelLinkEnabled(code: string, enabled: boolean): Promise<boolean> {
  const rows = await db
    .update(channelLinks)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(channelLinks.code, code))
    .returning({ code: channelLinks.code });
  return rows.length > 0;
}

export async function deleteChannelLink(code: string): Promise<boolean> {
  const rows = await db.delete(channelLinks).where(eq(channelLinks.code, code)).returning({ code: channelLinks.code });
  return rows.length > 0;
}

/** One visit: aggregate per (code, day). Telegram's crawler and HEAD are skipped. */
export async function recordClick(code: string, day: string): Promise<void> {
  await db
    .insert(channelLinkClicks)
    .values({ code, day, count: 1 })
    .onConflictDoUpdate({
      target: [channelLinkClicks.code, channelLinkClicks.day],
      set: { count: sql`${channelLinkClicks.count} + 1` },
    });
}

/** Clicks per code over the last `days` days. */
export async function clickCounts(days = 30): Promise<Record<string, number>> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  try {
    const rows = await db
      .select({ code: channelLinkClicks.code, total: sql<number>`sum(${channelLinkClicks.count})` })
      .from(channelLinkClicks)
      .where(gte(channelLinkClicks.day, since))
      .groupBy(channelLinkClicks.code);
    const out: Record<string, number> = {};
    for (const row of rows) out[row.code] = Number(row.total ?? 0);
    return out;
  } catch (err) {
    console.error("[channel] click read failed:", err);
    return {};
  }
}
