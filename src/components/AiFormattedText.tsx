"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { normalizeAiReply } from "@/lib/ai/format-reply";

/**
 * Small, safe renderer for AI text (chat, SOP draft, SOP review, dashboard
 * audit).
 *
 * The text is first passed through normalizeAiReply() and everything is built
 * from React text nodes and elements — no raw-HTML injection API is used
 * anywhere in this component — so any leftover model HTML cannot be executed
 * or injected.
 *
 * Supported on purpose (kept small by design):
 *   headings, **bold**, *italic*, `code`, ordered/unordered lists
 *   (one nesting level), blockquotes, horizontal rules, paragraphs,
 *   and http(s) links only (target=_blank rel=noopener).
 *
 * Long words/URLs wrap (break-words) so mobile chat width never scrolls.
 */

// ---------------------------------------------------------------------------
// Inline parsing (code, bold, italic, links)
// ---------------------------------------------------------------------------

const INLINE_TOKEN =
  /(`[^`\n]+`)|(\*\*(?:(?!\*\*)[\s\S])+?\*\*)|(__[^\n]+?__)|(\*[^*\s](?:[^*\n]*[^*\s])?\*)|(\[[^\]\n]+\]\([^()\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  INLINE_TOKEN.lastIndex = 0;

  while ((match = INLINE_TOKEN.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const k = `${keyPrefix}-${key++}`;
    const [, code, bold, uBold, italic, link] = match;

    if (code !== undefined) {
      nodes.push(
        <code
          key={k}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-700"
        >
          {code.slice(1, -1)}
        </code>
      );
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={k} className="font-semibold text-slate-900">
          {renderInline(bold.slice(2, -2), `${k}-b`)}
        </strong>
      );
    } else if (uBold !== undefined) {
      nodes.push(
        <strong key={k} className="font-semibold text-slate-900">
          {renderInline(uBold.slice(2, -2), `${k}-b`)}
        </strong>
      );
    } else if (italic !== undefined) {
      nodes.push(
        <em key={k}>{renderInline(italic.slice(1, -1), `${k}-i`)}</em>
      );
    } else if (link !== undefined) {
      const m = link.match(/^\[([^\]\n]+)\]\(([^()\s]+)\)$/);
      const linkText = m ? m[1] : link;
      const href = m ? m[2] : "";
      if (/^https?:\/\//i.test(href)) {
        nodes.push(
          <a
            key={k}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800"
          >
            {renderInline(linkText, `${k}-l`)}
          </a>
        );
      } else {
        // Non-http(s) URL → render as plain text, never as a clickable link.
        nodes.push(renderInline(linkText, `${k}-l`));
      }
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ---------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------

interface ListLine {
  indent: number; // nesting level (0..3)
  text: string;
  ordered: boolean;
  number?: string;
}

interface Block {
  type: "heading" | "list" | "p" | "quote" | "hr";
  level?: number;
  text?: string;
  items?: ListLine[];
  ordered?: boolean;
}

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*)$/;
const HR_RE = /^\s{0,3}((-\s*){3,}|(\*\s*){3,}|(_\s*){3,})$/;
const QUOTE_RE = /^\s{0,3}>\s?(.*)$/;
const OL_RE = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/;
const UL_RE = /^\s{0,3}[-*+]\s+(.*)$/;

function isBlockStart(line: string): boolean {
  return (
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    OL_RE.test(line) ||
    UL_RE.test(line)
  );
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const h = line.match(HEADING_RE);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2].trim() });
      i += 1;
      continue;
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (OL_RE.test(line) || UL_RE.test(line)) {
      const items: ListLine[] = [];
      let ordered = OL_RE.test(line);
      while (i < lines.length) {
        const l = lines[i];
        const olm = l.match(OL_RE);
        const ulm = l.match(UL_RE);
        if (olm || ulm) {
          const indent = l.length - l.trimStart().length;
          items.push({
            indent: Math.min(Math.floor(indent / 2), 3),
            text: olm ? olm[2] : (ulm as RegExpExecArray)[1],
            ordered: Boolean(olm),
            number: olm ? olm[1] : undefined,
          });
          i += 1;
        } else if (l.trim() === "") {
          // A blank line ends the list unless the list clearly continues after it.
          const next = lines[i + 1];
          if (next && (OL_RE.test(next) || UL_RE.test(next))) {
            i += 1;
            continue;
          }
          break;
        } else if (items.length > 0) {
          // Continuation/wrap of the previous item.
          items[items.length - 1].text += ` ${l.trim()}`;
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const buf: string[] = [];
      while (i < lines.length) {
        const q = lines[i].match(QUOTE_RE);
        if (!q) break;
        buf.push(q[1].trim());
        i += 1;
      }
      blocks.push({ type: "quote", text: buf.join(" ") });
      continue;
    }

    // Plain paragraph: consecutive non-special lines.
    const buf: string[] = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      buf.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.type) {
    case "hr":
      return <hr key={key} className="border-slate-200" />;

    case "heading": {
      const isTop = (block.level ?? 1) <= 2;
      const Tag: "h2" | "h3" = isTop ? "h2" : "h3";
      return (
        <Tag
          key={key}
          className={`mt-1 font-bold text-slate-900 ${isTop ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
        >
          {renderInline(block.text ?? "", `h${key}`)}
        </Tag>
      );
    }

    case "list": {
      const ListTag: "ul" | "ol" = block.ordered ? "ol" : "ul";
      return (
        <ListTag key={key} className="space-y-1">
          {(block.items ?? []).map((item, j) => (
            <li
              key={j}
              style={{ paddingLeft: `${(item.indent + 1) * 1.15}rem` }}
              className={`list-inside leading-relaxed ${
                block.ordered
                  ? "list-decimal"
                  : item.indent === 0
                    ? "list-disc"
                    : "list-[circle]"
              }`}
            >
              {renderInline(item.text, `li${key}-${j}`)}
            </li>
          ))}
        </ListTag>
      );
    }

    case "quote":
      return (
        <blockquote key={key} className="border-l-2 border-slate-300 pl-3 text-slate-600">
          <p className="leading-relaxed">{renderInline(block.text ?? "", `q${key}`)}</p>
        </blockquote>
      );

    case "p":
    default:
      return (
        <p key={key} className="leading-relaxed">
          {renderInline(block.text ?? "", `p${key}`)}
        </p>
      );
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AiFormattedTextProps {
  /** Raw AI text (may still contain stray markdown/HTML — it is normalized here). */
  text: string;
  /** Extra classes for font size / color, e.g. "text-xs sm:text-sm text-slate-700". */
  className?: string;
}

export function AiFormattedText({ text, className = "" }: AiFormattedTextProps) {
  const blocks = useMemo(() => parseBlocks(normalizeAiReply(text)), [text]);
  return (
    <div className={`min-w-0 space-y-2 break-words ${className}`}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
