/**
 * Channel text lint — the wording rules from the spec, as code.
 *
 * It runs over every rendered message in the test suite (every template × every
 * variant × partial data) and again in the sender before anything is posted, so
 * a forbidden promise cannot reach the channel even if a template is edited
 * carelessly later.
 *
 * Rules:
 *  - no "kafolat" / "100%" / "albatta olasiz" / "hech qanday talab yo'q";
 *  - no admission or win promise;
 *  - "shoshiling" only in the last-day message;
 *  - under Telegram's 4096-character limit (we keep a margin), balanced tags,
 *    no leftover `null` / `undefined` / `NaN` / `{placeholder}`.
 */

export const MAX_MESSAGE_CHARS = 4000;
export const TELEGRAM_MAX_CHARS = 4096;

export const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "a",
  "code",
  "pre",
  "blockquote",
  "tg-spoiler",
] as const;

export interface LintIssue {
  code: string;
  detail: string;
}

export interface LintOptions {
  /** True only for the last-day urgency post. */
  allowUrgency?: boolean;
}

interface ForbiddenRule {
  id: string;
  pattern: RegExp;
  why: string;
}

export const FORBIDDEN_PHRASES: readonly ForbiddenRule[] = [
  { id: "guarantee", pattern: /kafolat/iu, why: "a guarantee we cannot give" },
  { id: "hundred_percent", pattern: /100\s*%|100\s*foiz/iu, why: "an absolute claim" },
  { id: "sure_admission", pattern: /albatta\s+olasiz/iu, why: "admission promised" },
  { id: "no_requirements", pattern: /hech\s+qanday\s+talab\s+yo['\u2019\u02bb]?q/iu, why: "denies eligibility requirements" },
  { id: "win_promise", pattern: /g['\u2019\u02bb]olib\s+bo['\u2019\u02bb]lasiz|grantni\s+utasiz/iu, why: "win promised" },
  { id: "admitted_promise", pattern: /qabul\s+qilinasiz|kiritilasiz|admission\s+guarantee|guaranteed\s+admission/iu, why: "admission promised" },
  { id: "guaranteed_en", pattern: /\bguaranteed\b/iu, why: "a guarantee in English" },
  { id: "hurry", pattern: /shoshiling/iu, why: "urgency wording outside the last-day post" },
] as const;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

/** What the reader sees, as plain text. */
export function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""));
}

export function visibleLength(html: string): number {
  return [...plainText(html)].length;
}

/** Structural check: allowed tags only, every open tag closed. */
function tagIssues(html: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    if (!(ALLOWED_TAGS as readonly string[]).includes(name)) {
      issues.push({ code: "tag_not_allowed", detail: `<${name}>` });
      continue;
    }
    if (closing) {
      const open = stack.pop();
      if (open !== name) issues.push({ code: "tag_mismatch", detail: `</${name}> closes <${open ?? "nothing"}>` });
    } else {
      stack.push(name);
    }
  }
  for (const unclosed of stack) issues.push({ code: "tag_unclosed", detail: `<${unclosed}>` });
  // A raw "<" that is not a tag means unescaped data slipped through.
  const strayLt = html.replace(/<\/?[a-zA-Z][^>]*>/g, "").includes("<");
  if (strayLt) issues.push({ code: "unescaped_lt", detail: "raw '<' outside a tag" });
  return issues;
}

export function lintText(html: string, opts: LintOptions = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  const visible = plainText(html).trim();
  if (!visible) return [{ code: "empty", detail: "message has no visible text" }];

  const length = [...visible].length;
  if (length > MAX_MESSAGE_CHARS) {
    issues.push({ code: "too_long", detail: `${length} > ${MAX_MESSAGE_CHARS} characters` });
  }
  if (visible.length >= TELEGRAM_MAX_CHARS) {
    issues.push({ code: "telegram_limit", detail: "Telegram rejects messages of 4096+ characters" });
  }

  for (const rule of FORBIDDEN_PHRASES) {
    if (rule.id === "hurry" && opts.allowUrgency) continue;
    if (rule.pattern.test(visible)) issues.push({ code: `forbidden_${rule.id}`, detail: rule.why });
  }

  if (/\b(undefined|null|NaN)\b/.test(visible)) {
    issues.push({ code: "placeholder_value", detail: "a missing value leaked into the text" });
  }
  if (/\{\s*[a-zA-Z0-9_]+\s*\}/.test(visible)) {
    issues.push({ code: "unfilled_template", detail: "an unfilled {placeholder} is visible" });
  }
  if (/\[object Object\]/.test(visible)) {
    issues.push({ code: "object_stringified", detail: "an object was stringified into the text" });
  }

  issues.push(...tagIssues(html));
  return issues;
}

export function isClean(html: string, opts: LintOptions = {}): boolean {
  return lintText(html, opts).length === 0;
}
