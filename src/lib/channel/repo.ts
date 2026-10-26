/**
 * Database accessors for the channel publisher's configuration: runtime
 * settings, the country table and the authored Uzbek copy.
 *
 * Every read falls back to the in-code defaults on a database error, so a
 * hiccup can never produce a half-configured post. Writes are validated by
 * `mergeChannelSettings`, which silently repairs anything out of range — the
 * admin UI shows the repaired value, so it is never a surprise.
 */
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { channelCountries, channelSettings, scholarshipChannelContent } from "@/db/schema";
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

/** Country table for this run: the stored rows, or the in-code defaults. */
export async function loadChannelCountries(): Promise<readonly ChannelCountry[]> {
  if (!(await ensureChannelTables())) return CHANNEL_COUNTRIES;
  try {
    let rows = await db.select().from(channelCountries);
    if (!rows.length) {
      await seedChannelCountries();
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
