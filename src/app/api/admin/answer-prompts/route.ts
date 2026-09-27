import { answerPrompts } from "@/db/schema";
import { clampString, optionalNumber } from "@/lib/request";
import { PROMPT_CATEGORIES } from "@/lib/growth/defaults";
import { bool, oneOf } from "@/lib/growth/api";
import { makeAdminCrud } from "@/lib/growth/adminCrud";

/** Admin → Growth tools → Answer Vault questions. */
export const { GET, POST, PUT, DELETE } = makeAdminCrud({
  table: answerPrompts,
  entity: "answer_prompt",
  label: (v) => String(v.question ?? ""),
  toValues: (b) => {
    const question = clampString(b.question, 300);
    if (!question) return { values: {}, error: "Question is required" };
    return {
      values: {
        category: oneOf(b.category, PROMPT_CATEGORIES, "general"),
        question,
        hint: clampString(b.hint, 400),
        wordLimit: optionalNumber(b.wordLimit, { min: 10, max: 5000, integer: true }) ?? null,
        isActive: bool(b.isActive, true),
        sortOrder: optionalNumber(b.sortOrder, { min: 0, max: 9999, integer: true }) ?? 0,
      },
    };
  },
});
