/**
 * Growth features — lazy, additive schema bootstrap + first-run seeding.
 *
 * Same pattern as `ensureAnalyticsTables` (src/lib/visits.ts): the DDL in
 * `supabase/add_growth_features.sql` is idempotent, so the app runs it once
 * per process on first use. A deploy therefore never breaks because somebody
 * forgot a manual migration. A failed attempt is retried at most once a
 * minute and the caller gets `false` (routes then answer 503 politely).
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { answerPrompts, checklistItems, goalTemplates } from "@/db/schema";
import { ensureRichPlatformDataSeeded } from "@/db/seedRichPlatformData";
import { growthStatements } from "./ddl";
import { SEED_ANSWER_PROMPTS, SEED_CHECKLIST_ITEMS, SEED_GOAL_TEMPLATES } from "./defaults";

let ready: boolean | null = null;
let lastAttempt = 0;
let inflight: Promise<boolean> | null = null;
const RETRY_MS = 60_000;

async function seedIfEmpty() {
  const existingGoals = await db.select({ title: goalTemplates.title }).from(goalTemplates);
  const goalTitles = new Set(existingGoals.map((g) => g.title));
  const missingGoals = SEED_GOAL_TEMPLATES.map((g, i) => ({
    ...g,
    steps: JSON.stringify(g.steps),
    sortOrder: i,
  })).filter((g) => !goalTitles.has(g.title));
  if (missingGoals.length > 0) {
    await db.insert(goalTemplates).values(missingGoals);
  }

  const existingPrompts = await db.select({ question: answerPrompts.question }).from(answerPrompts);
  const promptQuestions = new Set(existingPrompts.map((p) => p.question));
  const missingPrompts = SEED_ANSWER_PROMPTS.map((p, i) => ({
    ...p,
    sortOrder: i,
  })).filter((p) => !promptQuestions.has(p.question));
  if (missingPrompts.length > 0) {
    await db.insert(answerPrompts).values(missingPrompts);
  }

  const existingItems = await db.select({ title: checklistItems.title }).from(checklistItems);
  const itemTitles = new Set(existingItems.map((c) => c.title));
  const missingItems = SEED_CHECKLIST_ITEMS.map((c, i) => ({
    ...c,
    sortOrder: i,
  })).filter((c) => !itemTitles.has(c.title));
  if (missingItems.length > 0) {
    await db.insert(checklistItems).values(missingItems);
  }

  await ensureRichPlatformDataSeeded();
}

export async function ensureGrowthTables(): Promise<boolean> {
  if (ready === true) return true;
  if (inflight) return inflight;
  const now = Date.now();
  if (ready === false && now - lastAttempt < RETRY_MS) return false;
  lastAttempt = now;
  inflight = (async () => {
    try {
      for (const stmt of growthStatements()) {
        await db.execute(sql.raw(stmt));
      }
      await seedIfEmpty();
      ready = true;
    } catch (err) {
      console.error("[growth] schema bootstrap failed:", err);
      ready = false;
    } finally {
      inflight = null;
    }
    return ready === true;
  })();
  return inflight;
}

/** Standard 503 body when the tables could not be prepared. */
export const GROWTH_UNAVAILABLE = {
  error: "This feature is temporarily unavailable. Please try again in a minute.",
  code: "unavailable",
};
