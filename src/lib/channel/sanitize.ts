/**
 * Telegram HTML sanitizer.
 *
 * Admin-entered template bodies and per-post `text_override` are HTML, so they
 * are held to an explicit whitelist: the tags Telegram documents, nothing else,
 * and the only attribute we keep is an `href` on `<a>` — https or t.me only.
 *
 * Two entry points:
 *  - `sanitizeTelegramHtml()` repairs and escapes (used before rendering);
 *  - `validateTelegramHtml()` reports problems without changing anything
 *    (used by the admin editor, which rejects instead of silently fixing).
 */

export const TELEGRAM_ALLOWED_TAGS = [
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

export type TelegramTag = (typeof TELEGRAM_ALLOWED_TAGS)[number];

const ALLOWED = new Set<string>(TELEGRAM_ALLOWED_TAGS);

export interface SanitizeResult {
  html: string;
  /** Everything that was escaped, dropped or rewritten, for the audit log. */
  changes: string[];
}

export function isAllowedHref(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".")) return false;
    if (host === "localhost" || host.endsWith(".localhost")) return false;
    if (/^(?:10|127)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

const ENTITY = /^&(?:amp|lt|gt|quot|#\d{1,6}|#x[0-9a-fA-F]{1,6});/;

interface ParsedTag {
  closing: boolean;
  name: string;
  attrs: string;
  raw: string;
}

function parseTagAt(input: string, index: number): ParsedTag | null {
  const rest = input.slice(index);
  const match = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)>/.exec(rest);
  if (!match) return null;
  return { closing: match[1] === "/", name: match[2].toLowerCase(), attrs: match[3] ?? "", raw: match[0] };
}

function hrefOf(attrs: string): string | null {
  const match = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Keep only whitelisted tags, escape everything else, and close what the input
 * left open. Never returns raw `<` outside a whitelisted tag.
 */
export function sanitizeTelegramHtml(input: string): SanitizeResult {
  const changes: string[] = [];
  let out = "";
  const stack: string[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (ch === "<") {
      const tag = parseTagAt(input, i);
      if (tag && ALLOWED.has(tag.name)) {
        if (!tag.closing) {
          if (tag.name === "a") {
            const href = hrefOf(tag.attrs);
            if (href && isAllowedHref(href)) {
              out += `<a href="${href.replace(/"/g, "&quot;")}">`;
              stack.push("a");
            } else {
              changes.push(`anchor without an allowed href dropped`);
            }
          } else {
            out += `<${tag.name}>`;
            stack.push(tag.name);
          }
        } else {
          const at = stack.lastIndexOf(tag.name);
          if (at === -1) {
            changes.push(`stray </${tag.name}> dropped`);
          } else {
            // Close everything opened after it, so the output stays balanced.
            while (stack.length > at) out += `</${stack.pop()}>`;
          }
        }
        i += tag.raw.length;
        continue;
      }
      if (tag) {
        changes.push(`tag <${tag.name}> escaped`);
      } else {
        changes.push("stray '<' escaped");
      }
      out += "&lt;";
      i += 1;
      continue;
    }
    if (ch === "&") {
      const entity = ENTITY.exec(input.slice(i));
      if (entity) {
        out += entity[0];
        i += entity[0].length;
        continue;
      }
      out += "&amp;";
      i += 1;
      continue;
    }
    if (ch === ">") {
      out += "&gt;";
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }

  while (stack.length) out += `</${stack.pop()}>`;
  return { html: out, changes };
}

/**
 * Strict check for the admin editor: every tag must be whitelisted, balanced,
 * and every anchor must carry an allowed https/t.me href.
 */
export function validateTelegramHtml(input: string): string[] {
  const issues: string[] = [];
  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(input)) !== null) {
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    const attrs = match[3] ?? "";
    if (!ALLOWED.has(name)) {
      issues.push(`<${name}> is not allowed`);
      continue;
    }
    if (closing) {
      const open = stack.pop();
      if (open !== name) issues.push(`</${name}> does not match <${open ?? "nothing"}>`);
      continue;
    }
    if (name === "a") {
      const href = hrefOf(attrs);
      if (!href) issues.push("<a> without href");
      else if (!isAllowedHref(href)) issues.push(`href not allowed: ${href.slice(0, 60)}`);
    } else if (attrs.trim()) {
      issues.push(`<${name}> does not take attributes`);
    }
    stack.push(name);
  }
  for (const unclosed of stack) issues.push(`<${unclosed}> is not closed`);
  const stray = input.replace(tagRe, "").includes("<");
  if (stray) issues.push("unescaped '<' outside a tag");
  return issues;
}
