/**
 * Planned item → the actual message(s).
 *
 * This is the single renderer used by the dry-run preview, the admin "Preview"
 * button and the sender, so what an operator sees is byte-for-byte what goes
 * out. It is pure: everything it needs (facts, authored copy, settings,
 * countries, stories) is passed in.
 */
import { countryDisplay, type ChannelCountry } from "./countries";
import type { ScholarshipContent } from "./content";
import { scholarshipLinkCode, shortLinkView } from "./links";
import type { PlanKind, PlannedItem } from "./plan";
import { footerEnabledFor, linkPreviewFor, type ChannelSettings, type LinkItem } from "./settings";
import type { PostChrome } from "./templates/chrome";
import type { Facts } from "./templates/facts";
import { formatDayWithWeekdayUz, hashtags as buildHashtags, formatDateUz } from "./templates/format";
import { renderScholarshipRich } from "./templates/rich.uz";
import {
  CHECKLIST_BANK,
  QA_BANK,
  TIP_BANK,
  renderChecklist,
  renderCountrySpotlight,
  renderDeadlineDigest,
  renderFullyFunded,
  renderQa,
  renderScholarshipSingle,
  renderStory,
  renderTip,
  renderUrgency,
} from "./templates/templates.uz";
import { renderWeeklyDeadlines, type WeeklyItem } from "./templates/weekly.uz";

export interface RenderData {
  settings: ChannelSettings;
  /** Resolved main footer (admin configuration + Kanal/Bot defaults). */
  footerMain: LinkItem[];
  /** Resolved social footer for the weekly post. */
  footerSocial: LinkItem[];
  factsById: Map<number, Facts>;
  contentById: Map<number, ScholarshipContent>;
  countries: readonly ChannelCountry[];
  stories?: Map<number, { title: string; body: string; authorLabel?: string | null }>;
  siteUrl: string;
}

export interface RenderedPost {
  key: string;
  parts: string[];
}

/** Why a planned item produced nothing (shown by the preview/admin). */
export type RenderSkipReason = "missing_facts" | "not_rich" | "too_long" | "empty";

export interface RenderOutcome {
  post: RenderedPost | null;
  reason: RenderSkipReason | null;
}

function levelTag(facts: Facts, settings: ChannelSettings): string | null {
  const degrees = (facts.degrees ?? "").toLowerCase();
  if (degrees.includes("bakalavr")) return settings.hashtags.levels.bachelor ?? null;
  if (degrees.includes("magistratura")) return settings.hashtags.levels.master ?? null;
  if (degrees.includes("phd") || degrees.includes("doktorantura")) return settings.hashtags.levels.phd ?? null;
  return null;
}

/** Kind tags + country + level + editor's extras, de-duplicated, max five. */
export function hashtagsFor(
  kind: PlanKind,
  data: RenderData,
  facts: Facts | null,
  content: ScholarshipContent | null
): string[] {
  const country = facts ? countryDisplay(facts.countryRaw ?? null, data.countries) : null;
  const countryTag = country?.key ? (data.settings.hashtags.countries[country.key] ?? country.hashtag) : null;
  const kindTags = data.settings.hashtags.kinds[kind as string] ?? [];
  // The reference post ends with a funding tag. It is chosen by stored data,
  // never by the editor: `to'liq_moliyalashtiriladi` only appears on an award
  // the database calls fully funded.
  const fundingTag = facts
    ? facts.fullyFunded
      ? data.settings.hashtags.funding.full
      : data.settings.hashtags.funding.partial
    : null;
  return buildHashtags([
    ...kindTags,
    countryTag,
    fundingTag,
    facts ? levelTag(facts, data.settings) : null,
    ...(content?.extraHashtags ?? []),
  ]);
}

function chromeFor(item: PlannedItem, data: RenderData, facts: Facts | null): PostChrome {
  const shortLink =
    item.scholarshipId !== null
      ? shortLinkView(data.siteUrl, scholarshipLinkCode(item.scholarshipId, "site"))
      : null;
  return {
    siteUrl: data.siteUrl,
    shortLink,
    hashtags: [],
    footer: footerEnabledFor(data.settings, item.kind) ? data.footerMain : [],
    variant: Number(item.payload.variant ?? 0),
  };
}

function weeklyItem(facts: Facts, data: RenderData): WeeklyItem | null {
  if (!facts.deadline.date) return null;
  const dayText = formatDayWithWeekdayUz(facts.deadline.date);
  if (!dayText) return null;
  const country = countryDisplay(facts.countryRaw ?? null, data.countries);
  return {
    flag: country?.flag ?? "",
    title: facts.title,
    tagline: data.contentById.get(facts.id)?.taglineUz ?? null,
    deadlineDayText: dayText,
    shortLink: shortLinkView(data.siteUrl, scholarshipLinkCode(facts.id, "site")),
  };
}

function weeklyItemsFor(item: PlannedItem, data: RenderData): WeeklyItem[] {
  const ids = Array.isArray(item.payload.scholarshipIds) ? (item.payload.scholarshipIds as number[]) : [];
  const out: WeeklyItem[] = [];
  for (const id of ids) {
    const facts = data.factsById.get(id);
    if (!facts) continue;
    const entry = weeklyItem(facts, data);
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * Render one planned item. `null` means "skip this item" — never an empty
 * message and never a half-filled one.
 */
export function renderPlanItemWithReason(item: PlannedItem, data: RenderData): RenderOutcome {
  const facts = item.scholarshipId !== null ? data.factsById.get(item.scholarshipId) ?? null : null;
  const content = item.scholarshipId !== null ? data.contentById.get(item.scholarshipId) ?? null : null;
  const variant = Number(item.payload.variant ?? 0);
  const chrome = chromeFor(item, data, facts);

  const single = (html: string | null, key: string): RenderOutcome =>
    html ? { post: { key, parts: [html] }, reason: null } : { post: null, reason: "empty" };

  switch (item.kind) {
    case "scholarship_rich": {
      if (!facts) return { post: null, reason: "missing_facts" };
      if (!content) return { post: null, reason: "not_rich" };
      chrome.hashtags = hashtagsFor(item.kind, data, facts, content);
      const country = countryDisplay(facts.countryRaw ?? null, data.countries);
      const out = renderScholarshipRich({ facts, content, country, chrome });
      return out ? { post: { key: out.key, parts: [out.html] }, reason: null } : { post: null, reason: "too_long" };
    }
    case "scholarship_single": {
      if (!facts) return { post: null, reason: "missing_facts" };
      // Authored copy (Admin → Kanal → Kontent) replaces the structured
      // sections when it exists; the country adds the flag to the headline.
      chrome.hashtags = hashtagsFor(item.kind, data, facts, content ?? null);
      const country = countryDisplay(facts.countryRaw ?? null, data.countries);
      const html = renderScholarshipSingle(facts, variant, chrome, { content, country })?.html ?? null;
      return single(html, `single_v${(variant % 3) + 1}`);
    }
    case "fully_funded": {
      if (!facts) return { post: null, reason: "missing_facts" };
      chrome.hashtags = hashtagsFor(item.kind, data, facts, content ?? null);
      const country = countryDisplay(facts.countryRaw ?? null, data.countries);
      const html = renderFullyFunded(facts, variant, chrome, { content, country })?.html ?? null;
      return single(html, `ff_v${(variant % 3) + 1}`);
    }
    case "urgency": {
      if (!facts) return { post: null, reason: "missing_facts" };
      const html = renderUrgency(facts, item.rung ?? 3, variant, chrome)?.html ?? null;
      return single(html, `urgency_v${(variant % 4) + 1}`);
    }
    case "deadline_digest": {
      const ids = Array.isArray(item.payload.scholarshipIds) ? (item.payload.scholarshipIds as number[]) : [];
      const pool = ids.length ? ids : item.scholarshipId !== null ? [item.scholarshipId] : [];
      const list = pool.map((id) => data.factsById.get(id)).filter((f): f is Facts => Boolean(f));
      const out = renderDeadlineDigest(list, variant, {
        siteUrl: data.siteUrl,
        shortLink: chrome.shortLink,
      });
      return out ? { post: { key: out.key, parts: [out.html] }, reason: null } : { post: null, reason: "empty" };
    }
    case "country_spotlight": {
      const ids = Array.isArray(item.payload.scholarshipIds) ? (item.payload.scholarshipIds as number[]) : [];
      const items = ids.map((id) => data.factsById.get(id)).filter((f): f is Facts => Boolean(f));
      if (items.length < 2) return { post: null, reason: "empty" };
      const label = countryDisplay(items[0].countryRaw ?? null, data.countries)?.name ?? "";
      const html = renderCountrySpotlight(label, items, variant, {
        siteUrl: data.siteUrl,
        footer: chrome.footer,
      })?.html ?? null;
      return single(html, `spotlight_v${(variant % 3) + 1}`);
    }
    case "tip": {
      const entry = TIP_BANK.find((e) => e.key === item.templateKey) ?? TIP_BANK[0];
      return single(renderTip(entry, { siteUrl: data.siteUrl })?.html ?? null, entry.key);
    }
    case "checklist": {
      const entry = CHECKLIST_BANK.find((e) => e.key === item.templateKey) ?? CHECKLIST_BANK[0];
      return single(renderChecklist(entry, { siteUrl: data.siteUrl })?.html ?? null, entry.key);
    }
    case "qa": {
      const entry = QA_BANK.find((e) => e.key === item.templateKey) ?? QA_BANK[0];
      const html = renderQa(entry, variant, { siteUrl: data.siteUrl, discussionUrl: null })?.html ?? null;
      return single(html, entry.key);
    }
    case "story": {
      const id = Number(item.payload.storyId ?? 0);
      const story = data.stories?.get(id);
      if (!story) return { post: null, reason: "empty" };
      return single(renderStory(story, variant)?.html ?? null, `story_v${(variant % 2) + 1}`);
    }
    case "weekly_deadlines": {
      const items = weeklyItemsFor(item, data);
      const out = renderWeeklyDeadlines({
        items,
        botUsername: data.settings.botUsername,
        hashtags: data.settings.hashtags.weekly,
        footerSocial: data.footerSocial,
        variant,
        minItems: data.settings.plan.weeklyMinItems,
      });
      return out ? { post: { key: out.key, parts: out.parts }, reason: null } : { post: null, reason: "empty" };
    }
    case "poll":
      // Polls are sent by the sender from the deck, not rendered as text.
      return { post: null, reason: "empty" };
    default:
      return { post: null, reason: "empty" };
  }
}

export function renderPlanItem(item: PlannedItem, data: RenderData): RenderedPost | null {
  return renderPlanItemWithReason(item, data).post;
}

/** Link-preview policy for a planned item (default: previews off). */
export function linkPreviewDisabled(item: PlannedItem, settings: ChannelSettings): boolean {
  return !linkPreviewFor(settings, item.kind);
}

/** Display helper for previews: the deadline label a post will print. */
export function deadlineLabel(facts: Facts): string | null {
  if (facts.deadline.quality !== "exact" || !facts.deadline.date) return null;
  return formatDateUz(facts.deadline.date);
}
