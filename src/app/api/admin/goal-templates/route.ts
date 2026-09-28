import { goalTemplates } from "@/db/schema";
import { clampString, optionalNumber } from "@/lib/request";
import { GOAL_LEVELS, GOAL_PILLARS } from "@/lib/growth/defaults";
import { bool, oneOf } from "@/lib/growth/api";
import { makeAdminCrud } from "@/lib/growth/adminCrud";
import { parseSteps } from "@/lib/growth/logic";

/** Admin → Growth tools → Goal library (used by the student Goal planner). */
export const { GET, POST, PUT, DELETE } = makeAdminCrud({
  table: goalTemplates,
  entity: "goal_template",
  label: (v) => String(v.title ?? ""),
  toValues: (b) => {
    const title = clampString(b.title, 120);
    if (!title) return { values: {}, error: "Title is required" };
    const steps = parseSteps(b.steps).map((s) => s.text);
    if (!steps.length) return { values: {}, error: "Add at least one step" };
    return {
      values: {
        pillar: oneOf(b.pillar, GOAL_PILLARS, "academic"),
        title,
        description: clampString(b.description, 600),
        steps: JSON.stringify(steps),
        level: oneOf(b.level, GOAL_LEVELS, "any"),
        estWeeks: optionalNumber(b.estWeeks, { min: 1, max: 104, integer: true }) ?? null,
        isActive: bool(b.isActive, true),
        sortOrder: optionalNumber(b.sortOrder, { min: 0, max: 9999, integer: true }) ?? 0,
      },
    };
  },
  shape: (r) => ({ ...r, steps: parseSteps(r.steps).map((s) => s.text) }),
});
