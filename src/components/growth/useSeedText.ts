"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { SEED_ANSWER_PROMPTS, SEED_CHECKLIST_ITEMS, SEED_GOAL_TEMPLATES } from "@/lib/growth/defaults";

/**
 * The growth catalogues are seeded with English starter content. While an
 * item still carries that exact seed text, we show the translation from the
 * `growthSeed` namespace; once the admin edits it, their own text is shown
 * as written. So the defaults are localised, and admin changes always win.
 */
const SEED_KEYS: Map<string, string> = (() => {
  const m = new Map<string, string>();
  SEED_GOAL_TEMPLATES.forEach((g, i) => {
    m.set(g.title, `g${i}t`);
    m.set(g.description, `g${i}d`);
    g.steps.forEach((s, j) => m.set(s, `g${i}s${j}`));
  });
  SEED_ANSWER_PROMPTS.forEach((p, i) => {
    m.set(p.question, `p${i}q`);
    m.set(p.hint, `p${i}h`);
  });
  SEED_CHECKLIST_ITEMS.forEach((c, i) => {
    m.set(c.title, `c${i}t`);
    if (c.description) m.set(c.description, `c${i}d`);
  });
  return m;
})();

export function useSeedText(): (text: string | null | undefined) => string {
  const t = useTranslations("growthSeed");
  return useCallback(
    (text) => {
      if (!text) return "";
      const key = SEED_KEYS.get(text.trim());
      return key && t.has(key) ? t(key) : text;
    },
    [t]
  );
}
