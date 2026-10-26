/**
 * Runtime glue between the database and the pure planner/templates:
 *
 *  - settings and countries are read on every run, so an admin edit affects the
 *    very next plan with no restart;
 *  - `loadRenderData` assembles everything the renderer needs;
 *  - `simulatePreview` walks N days forward on a throwaway clock so an operator
 *    can see the next two weeks without writing a single plan row.
 *
 * Nothing here sends anything.
 */
import { channelConfig } from "./config";
import type { ChannelCountry } from "./countries";
import type { ScholarshipContent } from "./content";
import { buildDailyPlan, type PlannedItem, type PlanStory } from "./plan";
import { renderPlanItemWithReason, type RenderData } from "./render";
import { loadChannelCountries, loadChannelSettings, loadContentMap } from "./repo";
import type { ChannelSettings } from "./settings";
import { resolvedFooterMain, resolvedFooterSocial } from "./settings";
import { loadPlanInput, planDateFor } from "./store";
import type { Facts } from "./templates/facts";

export {
  loadChannelCountries,
  loadChannelSettings,
  loadContentMap,
  saveChannelSettingsBlock,
  seedChannelCountries,
  upsertChannelContent,
} from "./repo";

/** Verified, publishable scholarships for this run, with the scorer's topics. */
async function loadCandidates(now: Date, siteUrl: string) {
  const loaded = await loadPlanInput(planDateFor(now), now, siteUrl);
  return loaded;
}

export interface RenderDataOptions {
  settings?: ChannelSettings;
  countries?: readonly ChannelCountry[];
  factsById?: Map<number, Facts>;
  contentById?: Map<number, ScholarshipContent>;
  stories?: Map<number, { title: string; body: string; authorLabel?: string | null }>;
}

/** Everything the renderer needs for the scholarships referenced by `items`. */
export async function loadRenderData(items: PlannedItem[], now: Date, overrides: RenderDataOptions = {}): Promise<RenderData> {
  const settings = overrides.settings ?? (await loadChannelSettings());
  const siteUrl = settings.siteUrl || channelConfig().siteUrl;
  const countries = overrides.countries ?? (await loadChannelCountries());
  const factsById = overrides.factsById ?? (await loadCandidates(now, siteUrl)).candidates.reduce((map, candidate) => {
    map.set(candidate.facts.id, candidate.facts);
    return map;
  }, new Map<number, Facts>());

  const ids = new Set<number>();
  for (const item of items) {
    if (item.scholarshipId !== null) ids.add(item.scholarshipId);
    if (Array.isArray(item.payload.scholarshipIds)) {
      for (const id of item.payload.scholarshipIds) if (typeof id === "number") ids.add(id);
    }
  }
  const contentById = overrides.contentById ?? (await loadContentMap([...ids]));

  return {
    settings: { ...settings, siteUrl },
    footerMain: resolvedFooterMain(settings),
    footerSocial: resolvedFooterSocial(settings),
    factsById,
    contentById,
    countries,
    stories: overrides.stories ?? new Map(),
    siteUrl,
  };
}

/** Render every item, keeping the skip reason so the preview can explain gaps. */
export function renderAll(items: PlannedItem[], data: RenderData) {
  return items.map((item) => ({ item, ...renderPlanItemWithReason(item, data) }));
}

export interface PreviewItem {
  slot: number;
  sendAt: string;
  kind: string;
  lane: string;
  scholarshipId: number | null;
  title: string | null;
  parts: string[];
  /** Why this item produced no text (rendered as a gap, never sent). */
  skipped: string | null;
}

export interface PreviewDay {
  planDate: string;
  quiet: boolean;
  items: PreviewItem[];
}

export interface Preview {
  days: PreviewDay[];
  /** Posts per kind over the simulated window. */
  counts: Record<string, number>;
  /** Items that would have been skipped, per reason. */
  skips: Record<string, number>;
}

/**
 * Simulate `days` days of planning starting today (Asia/Tashkent).
 *
 * In memory only: no `channel_plan` row, no post, no Telegram call. The history
 * is the real history — plus each simulated day, appended as if it had
 * happened, so cooldowns and the weekly post behave as they will in production.
 */
export async function simulatePreview(
  now: Date,
  days = 14,
  opts: { settings?: ChannelSettings; discussionEnabled?: boolean } = {}
): Promise<Preview> {
  const settings = opts.settings ?? (await loadChannelSettings());
  const siteUrl = settings.siteUrl || channelConfig().siteUrl;
  const countries = await loadChannelCountries();
  const loaded = await loadCandidates(now, siteUrl);

  const factsById = new Map<number, Facts>();
  for (const candidate of loaded.candidates) factsById.set(candidate.facts.id, candidate.facts);
  const contentById = await loadContentMap([...factsById.keys()]);

  const data: RenderData = {
    settings: { ...settings, siteUrl },
    footerMain: resolvedFooterMain(settings),
    footerSocial: resolvedFooterSocial(settings),
    factsById,
    contentById,
    countries,
    stories: new Map(),
    siteUrl,
  };

  const history = [...loaded.history];
  let stories: PlanStory[] = loaded.stories;
  const counts: Record<string, number> = {};
  const skips: Record<string, number> = {};
  const out: PreviewDay[] = [];

  for (let offset = 0; offset < days; offset++) {
    const day = new Date(now.getTime() + offset * 86_400_000);
    const planDate = planDateFor(day);
    const items = buildDailyPlan({
      planDate,
      candidates: loaded.candidates,
      history,
      prefs: loaded.prefs,
      stories,
      discussionEnabled: opts.discussionEnabled ?? false,
      settings,
    });

    const rendered: PreviewItem[] = items.map((item) => {
      const outcome = renderPlanItemWithReason(item, data);
      counts[item.kind] = (counts[item.kind] ?? 0) + 1;
      if (outcome.reason) skips[outcome.reason] = (skips[outcome.reason] ?? 0) + 1;
      const facts = item.scholarshipId !== null ? factsById.get(item.scholarshipId) : null;
      return {
        slot: item.slot,
        sendAt: item.sendAt,
        kind: item.kind,
        lane: item.lane,
        scholarshipId: item.scholarshipId,
        title: facts?.title ?? null,
        parts: outcome.post?.parts ?? [],
        skipped: outcome.reason,
      };
    });

    out.push({ planDate, quiet: rendered.length === 0, items: rendered });

    for (const item of items) {
      history.push({
        planDate,
        kind: item.kind,
        scholarshipId: item.scholarshipId,
        templateKey: item.templateKey,
        topic: item.topic,
        pollType: item.pollType ?? null,
        pollKey: typeof item.payload.pollKey === "string" ? item.payload.pollKey : null,
        storyId: typeof item.payload.storyId === "number" ? item.payload.storyId : null,
      });
      if (item.kind === "story" && typeof item.payload.storyId === "number") {
        stories = stories.filter((story) => story.id !== item.payload.storyId);
      }
    }
  }

  return { days: out, counts, skips };
}
