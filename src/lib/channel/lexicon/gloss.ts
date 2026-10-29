/**
 * What an operator may type into the dictionary.
 *
 * A gloss is the text a post will literally print, so it is validated with the
 * same rule the renderer applies to anything it emits: a short phrase in
 * Uzbek/Russian letters that does not still read as an English sentence.
 *
 * This lives in its own module, *not* in `store.ts`, because `store.ts` imports
 * the database: putting the rule there made the offline channel checks require
 * a `DATABASE_URL`, which is exactly what "offline and deterministic" forbids.
 */
import { looksEnglish } from "./index";

const GLOSS_MAX = 120;

export function checkGloss(
  raw: unknown
): { ok: true; uz: string } | { ok: false; error: "bad_gloss_empty" | "bad_gloss_letters" | "bad_gloss_english" } {
  const uz = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, GLOSS_MAX);
  if (!uz) return { ok: false, error: "bad_gloss_empty" };
  if (!/[A-Za-z\u0400-\u04FF]/.test(uz)) return { ok: false, error: "bad_gloss_letters" };
  if (looksEnglish(uz)) return { ok: false, error: "bad_gloss_english" };
  return { ok: true, uz };
}
