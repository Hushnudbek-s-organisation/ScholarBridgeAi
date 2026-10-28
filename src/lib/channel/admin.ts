/**
 * Read/write helpers behind the admin panel. Everything here is called from a
 * route that has already passed `guardAdmin`, and every mutation is logged to
 * `channel_audit` by the caller.
 */
import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan, channelPosts, scholarshipChannelContent, scholarships } from "@/db/schema";
import {
  channelConfig,
  channelEnvChecklist,
  normalizeChannelIdentifier,
  resolveChannelRuntime,
  tashkentDay,
  type ChannelRuntime,
  type EnvCheckRow,
} from "./config";
import { countryDisplay, type ChannelCountry } from "./countries";
import { contentCompleteness, EMPTY_CONTENT, isRichContent, MAX_ABOUT_CHARS, MAX_BULLETS, MAX_TAGLINE_CHARS, type ScholarshipContent } from "./content";
import { ensureChannelTables } from "./db";
import {
  clickCounts,
  deleteChannelCountry,
  deleteChannelLink,
  ensureSiteLink,
  loadChannelCountries,
  loadChannelLinks,
  loadChannelSettings,
  saveChannelSettingsBlock,
  upsertChannelCountry,
  upsertChannelLink,
  writeChannelAudit,
} from "./repo";
import { loadContentMap, simulatePreview } from "./runtime";
import { renderPlanRow } from "./send";
import { approvalTtlHours } from "./approval";
import { expireStaleApprovals, pendingApprovals } from "./approvalStore";
import { buildFacts } from "./templates/facts";
import { renderScholarshipRich } from "./templates/rich.uz";
import { isSameOrigin, isValidCustomCode, scholarshipLinkCode, shortLinkView, unsafeDestinationReason } from "./links";
import {
  closePollLocally,
  deleteStory,
  listPolls,
  listPrefs,
  listStories,
  pollTarget,
  resetPrefs,
  setPref,
  setStoryApproved,
  upsertStory,
  applyPollResult,
  type PollRow,
  type PrefRow,
  type StoryRow,
} from "./engage";
import { optionSummary, parseStoredResults, pollSpecByKey, type PollResult } from "./polls";
import { getChannelBotToken } from "./token";
import { tgStopPoll } from "@/lib/telegram/api";
import {
  DEFAULT_CHANNEL_SETTINGS,
  isAllowedLinkUrl,
  isChannelMode,
  looksLikeChannelId,
  looksLikeChatId,
  parseDiscoveredChannel,
  type ChannelSettings,
  type LinkItem,
  type SettingsKey,
} from "./settings";
import { normalizeContentForPost } from "./content";

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export type BlockResult = { ok: true; settings: ChannelSettings } | { ok: false; error: string };

/**
 * Footer rows. External links must be public HTTPS; a link to our own site is
 * accepted on the origin the site runs on, so localhost and staging work the
 * same way `/go` site links do.
 */
function cleanLinks(raw: unknown, siteUrl = ""): LinkItem[] | null {
  if (!Array.isArray(raw)) return null;
  const out: LinkItem[] = [];
  for (const item of raw.slice(0, 10)) {
    if (!item || typeof item !== "object") return null;
    const label = String((item as Record<string, unknown>).label ?? "").trim().slice(0, 40);
    const url = String((item as Record<string, unknown>).url ?? "").trim();
    if (!label && !url) continue; // empty row = "removed"
    if (!label) return null;
    if (!isAllowedLinkUrl(url) && !(siteUrl && isSameOrigin(url, siteUrl))) return null;
    out.push({ label, url });
  }
  return out;
}

function cleanTags(raw: unknown, max = 8): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") return null;
    const tag = value.trim().replace(/^#+/, "").replace(/\s+/g, "_");
    if (!tag) continue;
    if (!/^[A-Za-z0-9_]{1,40}$/.test(tag)) return null;
    if (!out.includes(tag)) out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

/** Validate one settings block coming from the UI. `null` = unusable. */
function cleanBlock(key: SettingsKey, value: unknown, siteUrl = ""): unknown | null {
  const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

  if (key === "connection") {
    if (!obj) return null;
    // Accept what the operator pastes (`t.me/name`, a bare username, `-100…`)
    // and store one canonical form. Without this a `https://t.me/…` link was
    // rejected with a bare "invalid value": the panel could not explain it.
    const normalized = normalizeChannelIdentifier(String(obj.channelId ?? ""));
    if (!normalized.ok && normalized.reason === "invite_link") return null;
    const channelId = normalized.ok ? normalized.value : "";
    const adminChatId = String(obj.adminChatId ?? "").trim();
    if (channelId && !looksLikeChannelId(channelId)) return null;
    if (adminChatId && !looksLikeChatId(adminChatId)) return null;
    const mode = obj.mode ?? "off";
    if (!isChannelMode(mode)) return null;
    const pausedUntil = String(obj.pausedUntil ?? "").trim();
    if (pausedUntil && !/^\d{4}-\d{2}-\d{2}$/.test(pausedUntil)) return null;
    // The panel edits the four visible fields. The discovery candidate is set by
    // the webhook; a form that does not send it back must not erase it (see
    // `updateSettingsBlock`, which merges the stored one in).
    return {
      channelId,
      adminChatId,
      mode,
      pausedUntil: pausedUntil || null,
      discoveredChannel: parseDiscoveredChannel(obj.discoveredChannel),
    };
  }

  if (key === "brand") {
    if (!obj) return null;
    const brand = String(obj.brand ?? "").trim().slice(0, 40);
    const siteUrl = String(obj.siteUrl ?? "").trim().replace(/\/+$/, "");
    if (siteUrl && !/^https?:\/\/[A-Za-z0-9.-]+/.test(siteUrl)) return null;
    const channelUsername = String(obj.channelUsername ?? "").trim().replace(/^@/, "").slice(0, 32);
    const botUsername = String(obj.botUsername ?? "").trim().replace(/^@/, "").slice(0, 32);
    if (channelUsername && !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(channelUsername)) return null;
    if (botUsername && !/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(botUsername)) return null;
    return { brand, siteUrl, channelUsername, botUsername };
  }

  if (key === "footer_main" || key === "footer_social") return cleanLinks(value, siteUrl);

  if (key === "hashtags") {
    if (!obj) return null;
    const kindsIn = (obj.kinds && typeof obj.kinds === "object" ? obj.kinds : {}) as Record<string, unknown>;
    const kinds: Record<string, string[]> = {};
    for (const [kind, list] of Object.entries(kindsIn)) {
      if (!/^[a-z_]{3,30}$/.test(kind)) return null;
      const tags = cleanTags(list);
      if (tags === null) return null;
      kinds[kind] = tags;
    }
    const countriesIn = (obj.countries && typeof obj.countries === "object" ? obj.countries : {}) as Record<string, unknown>;
    const countries: Record<string, string> = {};
    for (const [country, tag] of Object.entries(countriesIn)) {
      const clean = String(tag ?? "").trim().replace(/^#+/, "");
      if (!clean) continue;
      if (!/^[A-Za-z0-9_]{1,40}$/.test(clean)) return null;
      countries[country] = clean;
    }
    const levelsIn = (obj.levels && typeof obj.levels === "object" ? obj.levels : {}) as Record<string, unknown>;
    const levels: Record<string, string> = {};
    for (const level of ["bachelor", "master", "phd"]) {
      const clean = String(levelsIn[level] ?? "").trim().replace(/^#+/, "");
      if (clean && !/^[A-Za-z0-9_]{1,40}$/.test(clean)) return null;
      if (clean) levels[level] = clean;
    }
    const weekly = cleanTags(obj.weekly, 5);
    if (weekly === null) return null;
    return { kinds, countries, levels, weekly };
  }

  if (key === "link_preview" || key === "footer_enabled") {
    if (!obj) return null;
    const out: Record<string, boolean> = {};
    for (const [kind, flag] of Object.entries(obj)) {
      if (!/^[a-z_]{3,30}$/.test(kind)) return null;
      out[kind] = flag === true || flag === "true";
    }
    return out;
  }

  if (key === "plan") {
    if (!obj) return null;
    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const time = (v: unknown, fallback: string) =>
      typeof v === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v) ? v : fallback;
    return {
      dailyCap: num(obj.dailyCap, DEFAULT_CHANNEL_SETTINGS.plan.dailyCap),
      budgetMin: num(obj.budgetMin, DEFAULT_CHANNEL_SETTINGS.plan.budgetMin),
      budgetMax: num(obj.budgetMax, DEFAULT_CHANNEL_SETTINGS.plan.budgetMax),
      quietDayEnabled: obj.quietDayEnabled === true,
      morningWindow: {
        start: time((obj.morningWindow as Record<string, unknown>)?.start, DEFAULT_CHANNEL_SETTINGS.plan.morningWindow.start),
        end: time((obj.morningWindow as Record<string, unknown>)?.end, DEFAULT_CHANNEL_SETTINGS.plan.morningWindow.end),
      },
      eveningWindow: {
        start: time((obj.eveningWindow as Record<string, unknown>)?.start, DEFAULT_CHANNEL_SETTINGS.plan.eveningWindow.start),
        end: time((obj.eveningWindow as Record<string, unknown>)?.end, DEFAULT_CHANNEL_SETTINGS.plan.eveningWindow.end),
      },
      weeklyMinItems: num(obj.weeklyMinItems, DEFAULT_CHANNEL_SETTINGS.plan.weeklyMinItems),
      weeklyPin: obj.weeklyPin === true,
      digestEnabled: obj.digestEnabled === true,
      pollCadenceDays: num(obj.pollCadenceDays, DEFAULT_CHANNEL_SETTINGS.pollCadenceDays),
    };
  }

  return null;
}

export async function updateSettingsBlock(key: SettingsKey, raw: unknown, actorProfileId: number): Promise<BlockResult> {
  const before = await loadChannelSettings();
  let value = cleanBlock(key, raw, before.siteUrl);
  if (value === null) return { ok: false, error: "invalid_value" };
  if (key === "connection") {
    /**
     * The webhook owns `discoveredChannel`; the form only renders it. When the
     * submitted block has none (an older panel build, or a partial save) the
     * stored candidate is kept — otherwise every "Save" would erase the one
     * thing that lets the operator connect the channel with one click.
     */
    const connection = value as { discoveredChannel?: unknown };
    const stored = before.connection.discoveredChannel;
    if (!parseDiscoveredChannel(connection.discoveredChannel) && stored) {
      connection.discoveredChannel = stored;
    }
  }
  const settings = await saveChannelSettingsBlock(key, value, actorProfileId);
  await writeChannelAudit({
    actorProfileId,
    action: "settings_update",
    entity: "settings",
    entityId: key,
    before: (before as unknown as Record<string, unknown>)[key === "footer_main" ? "footerMain" : key === "footer_social" ? "footerSocial" : key] ?? null,
    after: value,
  });
  return { ok: true, settings };
}

/* ------------------------------------------------------------------ */
/* Overview                                                           */
/* ------------------------------------------------------------------ */

export interface PlanPreviewRow {
  id: number;
  sendAt: string;
  kind: string;
  lane: string;
  scholarshipId: number | null;
  title: string | null;
  status: string;
  reason: string | null;
  parts: string[];
  skipReason: string | null;
}

export async function todayQueue(day = tashkentDay()): Promise<PlanPreviewRow[]> {
  const rows = await db.select().from(channelPlan).where(eq(channelPlan.planDate, day)).orderBy(channelPlan.slot);
  // Scholarship titles for the queue labels (one extra query, not one per row).
  const ids = [...new Set(rows.map((row) => row.scholarshipId).filter((id): id is number => typeof id === "number"))];
  const titles = new Map<number, string>();
  if (ids.length) {
    const found = await db
      .select({ id: scholarships.id, title: scholarships.title })
      .from(scholarships)
      .where(inArray(scholarships.id, ids));
    for (const row of found) titles.set(row.id, row.title);
  }
  const out: PlanPreviewRow[] = [];
  for (const row of rows) {
    const rendered = await renderPlanRow(row);
    out.push({
      id: row.id,
      sendAt: row.sendAt,
      kind: row.kind,
      lane: row.lane ?? "editorial",
      scholarshipId: row.scholarshipId ?? null,
      title: row.scholarshipId ? titles.get(row.scholarshipId) ?? null : null,
      status: row.status,
      reason: row.reason,
      parts: rendered.parts,
      skipReason: rendered.reason,
    });
  }
  return out;
}

export async function recentPosts(limit = 20) {
  return db.select().from(channelPosts).orderBy(desc(channelPosts.createdAt)).limit(Math.min(100, limit));
}

export async function dashboardCounts() {
  const day = tashkentDay();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [plannedToday] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPlan)
    .where(eq(channelPlan.planDate, day));
  const [sentWeek] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, "sent"), gte(channelPosts.sentAt, weekAgo)));
  const [failedWeek] = await db
    .select({ count: sql<number>`count(*)` })
    .from(channelPosts)
    .where(and(eq(channelPosts.status, "failed"), gte(channelPosts.createdAt, weekAgo)));
  const [contentRows] = await db.select({ count: sql<number>`count(*)` }).from(scholarshipChannelContent);
  const links = await loadChannelLinks();
  const countries = await loadChannelCountries();
  return {
    plannedToday: Number(plannedToday?.count ?? 0),
    sentWeek: Number(sentWeek?.count ?? 0),
    failedWeek: Number(failedWeek?.count ?? 0),
    contentRows: Number(contentRows?.count ?? 0),
    links: links.length,
    countries: countries.length,
  };
}

export interface OverviewPayload {
  settings: ChannelSettings;
  runtime: ChannelRuntime;
  counts: Awaited<ReturnType<typeof dashboardCounts>>;
  queue: PlanPreviewRow[];
  posts: Awaited<ReturnType<typeof recentPosts>>;
  /** Posts sitting in the admin chat waiting for Approve / Reject / Edit. */
  approvals: Awaited<ReturnType<typeof pendingApprovals>>;
  /** Approval window in hours, so the panel can say when a preview expires. */
  approvalTtlHours: number;
  /** How many stale previews this load retired. */
  expiredOnLoad: number;
  hasToken: boolean;
  /** Which bot publishes, without the secret (see `channel/token.ts`). */
  tokenSource: string;
  env: {
    killSwitch: boolean;
    autopost: "off" | "dryrun" | "on" | null;
    channelIdConfigured: boolean;
    discussionEnabled: boolean;
    checklist: EnvCheckRow[];
  };
}

export async function channelOverview(): Promise<OverviewPayload> {
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);
  const counts = await dashboardCounts();
  const queue = await todayQueue();
  const posts = await recentPosts(20);
  // Reading the approvals list is also the natural moment to retire the ones
  // nobody answered — the panel never shows a preview that can no longer post.
  const expired = await expireStaleApprovals().catch(() => 0);
  const approvals = await pendingApprovals(20).catch(() => []);
  const { token, source: tokenSource } = await getChannelBotToken();
  return {
    settings,
    runtime,
    counts,
    queue,
    posts,
    approvals,
    approvalTtlHours: approvalTtlHours(),
    expiredOnLoad: expired,
    hasToken: Boolean(token),
    tokenSource,
    env: {
      killSwitch: runtime.envKillSwitch,
      autopost: runtime.envAutopost,
      channelIdConfigured: Boolean(channelConfig().channelId),
      discussionEnabled: runtime.discussionEnabled,
      // Read-only checklist for the panel: what the deployment's environment
      // actually has, so nobody has to guess which Render variable is wrong.
      checklist: channelEnvChecklist(),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Scholarship content                                                */
/* ------------------------------------------------------------------ */

export interface ContentListRow {
  id: number;
  title: string;
  provider: string;
  country: string | null;
  deadlineDate: string | null;
  verificationStatus: string;
  rich: boolean;
  filled: number;
  total: number;
  missing: string[];
}

export async function listContent(query: string, limit = 50): Promise<ContentListRow[]> {
  const q = query.trim();
  const where = q
    ? and(
        eq(scholarships.isActive, true),
        or(ilike(scholarships.title, `%${q}%`), ilike(scholarships.provider, `%${q}%`), ilike(scholarships.country, `%${q}%`))
      )
    : eq(scholarships.isActive, true);
  const rows = await db
    .select({
      id: scholarships.id,
      title: scholarships.title,
      provider: scholarships.provider,
      country: scholarships.country,
      deadlineDate: scholarships.deadlineDate,
      verificationStatus: scholarships.verificationStatus,
    })
    .from(scholarships)
    .where(where)
    .orderBy(desc(scholarships.lastVerifiedAt))
    .limit(Math.min(200, Math.max(1, limit)));

  const content = await loadContentMap(rows.map((row) => row.id));
  return rows.map((row) => {
    const report = contentCompleteness(content.get(row.id) ?? null);
    return {
      id: row.id,
      title: row.title,
      provider: row.provider,
      country: row.country,
      deadlineDate: row.deadlineDate,
      verificationStatus: row.verificationStatus,
      rich: report.rich,
      filled: report.filled,
      total: report.total,
      missing: report.missing,
    };
  });
}

function cleanBullets(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") return null;
    const line = value.trim().replace(/\s+/g, " ");
    if (!line) continue;
    if (line.length > 200) return null;
    out.push(line);
    if (out.length > MAX_BULLETS) return null;
  }
  return out;
}

export interface ContentSaveResult {
  ok: boolean;
  error?: string;
  preview?: string | null;
}

export async function saveScholarshipContent(
  scholarshipId: number,
  raw: Record<string, unknown>,
  actorProfileId: number
): Promise<ContentSaveResult> {
  const eligibility = cleanBullets(raw.eligibilityUz);
  const benefits = cleanBullets(raw.benefitsUz);
  const extraHashtags = cleanTags(raw.extraHashtags, 5);
  if (eligibility === null || benefits === null || extraHashtags === null) return { ok: false, error: "invalid_bullets" };

  const text = (v: unknown, max: number) => {
    if (v === undefined || v === null) return null;
    const value = String(v).trim().replace(/\r\n/g, "\n");
    if (!value) return null;
    return value.slice(0, max);
  };

  const content: ScholarshipContent = normalizeContentForPost({
    scholarshipId,
    taglineUz: text(raw.taglineUz, MAX_TAGLINE_CHARS),
    fundingTypeUz: text(raw.fundingTypeUz, 120),
    languageReqUz: text(raw.languageReqUz, 120),
    eligibilityUz: eligibility,
    benefitsUz: benefits,
    aboutUz: text(raw.aboutUz, MAX_ABOUT_CHARS),
    extraHashtags,
  });

  const [row] = await db.select().from(scholarships).where(eq(scholarships.id, scholarshipId)).limit(1);
  if (!row) return { ok: false, error: "not_found" };

  const { upsertChannelContent } = await import("./repo");
  const before = await loadContentMap([scholarshipId]);
  await upsertChannelContent({ ...content, updatedBy: actorProfileId });
  await writeChannelAudit({
    actorProfileId,
    action: "content_update",
    entity: "content",
    entityId: String(scholarshipId),
    before: before.get(scholarshipId) ?? null,
    after: content,
  });

  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);
  const siteUrl = runtime.siteUrl || channelConfig().siteUrl;
  const facts = buildFacts(row, { now: new Date(), siteUrl });
  const country = countryDisplay(row.country, await loadChannelCountries()) as ReturnType<typeof countryDisplay>;
  // Use the real short code so the preview is exactly what will be posted.
  const previewCode = scholarshipLinkCode(scholarshipId, "site");
  await ensureSiteLink(scholarshipId, siteUrl);
  const rendered = isRichContent(content)
    ? renderScholarshipRich({
        facts,
        content,
        country,
        chrome: {
          siteUrl,
          shortLink: siteUrl ? shortLinkView(siteUrl, previewCode) : null,
          hashtags: content.extraHashtags,
          footer: [],
          variant: 0,
        },
      })
    : null;

  return { ok: true, preview: rendered?.html ?? null };
}

export async function getContent(scholarshipId: number) {
  const [row] = await db.select().from(scholarships).where(eq(scholarships.id, scholarshipId)).limit(1);
  if (!row) return null;
  const content = (await loadContentMap([scholarshipId])).get(scholarshipId) ?? EMPTY_CONTENT(scholarshipId);
  const report = contentCompleteness(content);
  return {
    scholarship: {
      id: row.id,
      title: row.title,
      provider: row.provider,
      country: row.country,
      deadlineDate: row.deadlineDate,
      verificationStatus: row.verificationStatus,
    },
    content,
    report,
  };
}

/* ------------------------------------------------------------------ */
/* Countries                                                          */
/* ------------------------------------------------------------------ */

export async function countryList(): Promise<ChannelCountry[]> {
  return [...(await loadChannelCountries())];
}

export async function saveCountry(raw: Record<string, unknown>, actorProfileId: number) {
  const key = String(raw.key ?? "").trim().toLowerCase();
  const nameUz = String(raw.nameUz ?? "").trim();
  if (!/^[a-z][a-z0-9_]{2,30}$/.test(key)) return { ok: false as const, error: "invalid_key" };
  if (!nameUz) return { ok: false as const, error: "invalid_name" };
  const flag = String(raw.flag ?? "").trim();
  const iso2 = String(raw.iso2 ?? "").trim().toUpperCase();
  const hashtag = String(raw.hashtag ?? "").trim().replace(/^#+/, "");
  const locative = String(raw.nameUzLoc ?? "").trim();
  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean).slice(0, 10)
    : [];
  if (iso2 && !/^[A-Z]{2}$/.test(iso2)) return { ok: false as const, error: "invalid_iso" };
  if (hashtag && !/^[A-Za-z0-9_]{1,40}$/.test(hashtag)) return { ok: false as const, error: "invalid_hashtag" };
  if (flag.length > 8) return { ok: false as const, error: "invalid_flag" };

  await upsertChannelCountry({
    key,
    iso2: iso2 || null,
    flag,
    nameUz,
    nameUzLoc: locative || null,
    hashtag: hashtag || null,
    aliases,
  });
  await writeChannelAudit({ actorProfileId, action: "country_update", entity: "country", entityId: key, after: raw });
  return { ok: true as const };
}

export async function removeCountry(key: string, actorProfileId: number) {
  const deleted = await deleteChannelCountry(key);
  if (deleted) await writeChannelAudit({ actorProfileId, action: "country_delete", entity: "country", entityId: key });
  return deleted;
}

/* ------------------------------------------------------------------ */
/* Short links                                                        */
/* ------------------------------------------------------------------ */

export async function linksWithClicks() {
  const links = await loadChannelLinks();
  const [week, month] = await Promise.all([clickCounts(7), clickCounts(30)]);
  return links.map((link) => ({
    ...link,
    clicks7: week[link.code] ?? 0,
    clicks30: month[link.code] ?? 0,
  }));
}

export async function createOrUpdateLink(raw: Record<string, unknown>, actorProfileId: number) {
  const code = String(raw.code ?? "").trim().toLowerCase();
  const url = String(raw.url ?? "").trim();
  const kind = String(raw.kind ?? "custom");
  const note = String(raw.note ?? "").trim().slice(0, 200) || null;
  const enabled = raw.enabled !== false;
  const scholarshipId = Number(raw.scholarshipId ?? 0);

  if (!isValidCustomCode(code)) return { ok: false as const, error: "invalid_code" };
  if (!["site", "official", "custom"].includes(kind)) return { ok: false as const, error: "invalid_kind" };
  const reason = unsafeDestinationReason(url);
  if (reason) return { ok: false as const, error: "invalid_url", detail: reason };

  await upsertChannelLink({
    code,
    kind: kind as "site" | "official" | "custom",
    scholarshipId: Number.isInteger(scholarshipId) && scholarshipId > 0 ? scholarshipId : null,
    url,
    enabled,
    note,
  });
  await writeChannelAudit({ actorProfileId, action: "link_save", entity: "link", entityId: code, after: { url, kind, enabled, note } });
  return { ok: true as const };
}

export async function removeLink(code: string, actorProfileId: number) {
  const deleted = await deleteChannelLink(code);
  if (deleted) await writeChannelAudit({ actorProfileId, action: "link_delete", entity: "link", entityId: code });
  return deleted;
}

/** Ensure the "site" link exists for the scholarships in today's plan. */
export async function ensurePlanLinks(): Promise<number> {
  const settings = await loadChannelSettings();
  const runtime = resolveChannelRuntime(settings);
  const rows = await db
    .select({ scholarshipId: channelPlan.scholarshipId, payload: channelPlan.payload })
    .from(channelPlan)
    .where(eq(channelPlan.planDate, tashkentDay()));
  const ids = new Set<number>();
  for (const row of rows) {
    if (row.scholarshipId) ids.add(row.scholarshipId);
    try {
      const payload = row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : {};
      if (Array.isArray(payload.scholarshipIds)) {
        for (const id of payload.scholarshipIds) if (typeof id === "number") ids.add(id);
      }
    } catch {
      // ignore
    }
  }
  let created = 0;
  for (const id of ids) {
    const code = await ensureSiteLink(id, runtime.siteUrl || channelConfig().siteUrl);
    if (code) created++;
  }
  return created;
}

/* ------------------------------------------------------------------ */
/* Preview                                                            */
/* ------------------------------------------------------------------ */

export async function previewDays(days = 14) {
  return simulatePreview(new Date(), Math.min(30, Math.max(1, days)));
}


/* ------------------------------------------------------------------ */
/* Polls                                                              */
/* ------------------------------------------------------------------ */

export interface PollAdminRow {
  id: number;
  pollId: string | null;
  pollType: string;
  pollKey: string;
  topic: string | null;
  question: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  totalVoters: number;
  /** Deck text, so the table reads correctly even if the deck entry changed. */
  options: { key: string; text: string; voters: number; share: number }[];
  /** True when the deck entry still exists and is sendable. */
  deckKnown: boolean;
}

function pollAdminRow(row: PollRow): PollAdminRow {
  const stored = parseStoredResults(row.results);
  const spec = pollSpecByKey(row.pollKey);
  const result: PollResult = {
    options: stored.length
      ? stored
      : (spec?.options ?? []).map((option) => ({ key: option.key, text: option.text, voters: 0 })),
    totalVoters: row.totalVoters ?? 0,
    closed: row.status === "closed",
  };
  return {
    id: row.id,
    pollId: row.pollId,
    pollType: row.pollType,
    pollKey: row.pollKey,
    topic: row.topic,
    question: row.question,
    status: row.status,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    totalVoters: result.totalVoters,
    options: optionSummary(result),
    deckKnown: Boolean(spec),
  };
}

export async function pollList(): Promise<PollAdminRow[]> {
  return (await listPolls(100)).map(pollAdminRow);
}

/**
 * Close a poll and store its final numbers.
 *
 * `stopPoll` is the only way to read a channel poll's aggregate; it returns
 * counters, never voters. If Telegram refuses (bot no longer in the channel,
 * poll already closed, no token) the row is still closed locally so the admin
 * is not stuck with a poll the panel calls "open" forever.
 */
export async function closePoll(id: number, actorProfileId: number): Promise<{ ok: boolean; error?: string; reason?: string }> {
  const target = await pollTarget(id);
  if (!target) return { ok: false, error: "not_found" };
  if (target.poll.status === "closed") return { ok: false, error: "already_closed" };

  const { token } = await getChannelBotToken();
  let reason: string | undefined;
  if (!token) {
    reason = "no_token";
  } else if (!target.chatId || !target.messageId) {
    reason = "no_message";
  } else {
    const res = await tgStopPoll(token, target.chatId, target.messageId);
    if (res.ok && res.result && target.poll.pollId) {
      await applyPollResult({
        pollId: target.poll.pollId,
        poll: { ...res.result, is_closed: true },
      });
    } else {
      reason = res.description ?? "stop_failed";
    }
  }
  await closePollLocally(id);
  await writeChannelAudit({
    actorProfileId,
    action: "poll_close",
    entity: "poll",
    entityId: String(id),
    after: { reason: reason ?? "stopped" },
  });
  return { ok: true, reason };
}

/* ------------------------------------------------------------------ */
/* Preference weights                                                 */
/* ------------------------------------------------------------------ */

export async function prefList() {
  const rows: PrefRow[] = await listPrefs();
  return rows.map((row) => ({
    topic: row.topic,
    family: row.topic.split(":")[0] ?? "",
    weight: Number(row.weight.toFixed(4)),
    samples: row.samples,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function savePref(topic: string, weight: number, actorProfileId: number) {
  if (!/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/.test(topic.trim())) return { ok: false as const, error: "invalid_topic" };
  if (!Number.isFinite(weight) || weight < 0.5 || weight > 2) return { ok: false as const, error: "invalid_weight" };
  const saved = await setPref(topic.trim(), weight);
  if (!saved) return { ok: false as const, error: "invalid_topic" };
  await writeChannelAudit({
    actorProfileId,
    action: "pref_update",
    entity: "pref",
    entityId: topic.trim(),
    after: { weight },
  });
  return { ok: true as const };
}

export async function resetAllPrefs(actorProfileId: number) {
  const count = await resetPrefs();
  await writeChannelAudit({ actorProfileId, action: "pref_reset", entity: "pref", after: { count } });
  return count;
}

/* ------------------------------------------------------------------ */
/* Stories                                                            */
/* ------------------------------------------------------------------ */

const STORY_LIMITS = { title: 120, body: 1200, author: 60 };

function storyRowView(row: StoryRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    authorLabel: row.authorLabel,
    sourceUrl: row.sourceUrl,
    approved: row.approved,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function storyList() {
  return (await listStories(200)).map(storyRowView);
}

/**
 * Create or update a story. Nothing here is generated: a story is whatever the
 * admin typed, and it stays unpublishable until `approved` is set — the planner
 * only ever sees approved rows.
 */
export async function saveStory(raw: Record<string, unknown>, actorProfileId: number) {
  const title = String(raw.title ?? "").trim();
  const body = String(raw.body ?? "").trim();
  const authorLabel = String(raw.authorLabel ?? "").trim().slice(0, STORY_LIMITS.author) || null;
  const sourceUrl = String(raw.sourceUrl ?? "").trim() || null;
  const approved = raw.approved === true;
  const id = Number(raw.id ?? 0);

  if (!title) return { ok: false as const, error: "invalid_title" };
  if (title.length > STORY_LIMITS.title) return { ok: false as const, error: "title_too_long" };
  if (!body) return { ok: false as const, error: "invalid_body" };
  if (body.length > STORY_LIMITS.body) return { ok: false as const, error: "body_too_long" };
  if (sourceUrl && !isAllowedLinkUrl(sourceUrl)) return { ok: false as const, error: "invalid_url" };

  const savedId = await upsertStory({
    id: Number.isInteger(id) && id > 0 ? id : null,
    title,
    body,
    authorLabel,
    sourceUrl,
    approved,
    actorProfileId,
  });
  if (!savedId) return { ok: false as const, error: "save_failed" };
  await writeChannelAudit({
    actorProfileId,
    action: id > 0 ? "story_update" : "story_create",
    entity: "story",
    entityId: String(savedId),
    after: { title, approved },
  });
  return { ok: true as const, id: savedId };
}

export async function approveStory(id: number, approved: boolean, actorProfileId: number) {
  const ok = await setStoryApproved(id, approved, actorProfileId);
  if (!ok) return false;
  await writeChannelAudit({
    actorProfileId,
    action: approved ? "story_approve" : "story_unapprove",
    entity: "story",
    entityId: String(id),
  });
  return true;
}

export async function removeStory(id: number, actorProfileId: number) {
  const ok = await deleteStory(id);
  if (ok) await writeChannelAudit({ actorProfileId, action: "story_delete", entity: "story", entityId: String(id) });
  return ok;
}
