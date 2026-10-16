"use client";

/**
 * Renders a lesson's written notes as scannable content instead of a text wall.
 *
 * Instructors write notes as Markdown-ish plain text ("### Heading",
 * "- bullet", "1. step", "**Label:** value", bare URLs). Previously the whole
 * string was dumped into one `<p>` with `whitespace-pre-wrap`, so every
 * walkthrough read as one undifferentiated block and links were not clickable.
 *
 * Supported here (deliberately small and total — no Markdown dependency):
 *   ### / ## / #   → section heading
 *   - or * or •    → bullet
 *   1. 2) 3.       → numbered step
 *   **bold**       → emphasised inline
 *   https://…      → external link pill
 *   everything else → paragraph
 */
import React from "react";
import { ExternalLink } from "lucide-react";

const URL_RE = /(https?:\/\/[^\s<>()"[\]{}]+)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

/** Turn inline **bold** and URLs into React nodes. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  const pushPlain = (chunk: string) => {
    if (!chunk) return;
    // Split the plain chunk further on **bold** markers.
    let last = 0;
    let bolded: RegExpExecArray | null;
    BOLD_RE.lastIndex = 0;
    while ((bolded = BOLD_RE.exec(chunk)) !== null) {
      if (bolded.index > last) nodes.push(chunk.slice(last, bolded.index));
      nodes.push(
        <strong key={`${keyPrefix}-b${nodes.length}`} className="font-bold text-slate-900 dark:text-white">
          {bolded[1]}
        </strong>,
      );
      last = bolded.index + bolded[0].length;
    }
    if (last < chunk.length) nodes.push(chunk.slice(last));
  };

  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    pushPlain(text.slice(cursor, match.index));
    const href = match[1];
    nodes.push(
      <a
        key={`${keyPrefix}-u${nodes.length}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1 break-all rounded-lg border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        {href.replace(/^https?:\/\//, "")}
      </a>,
    );
    cursor = match.index + match[0].length;
  }
  pushPlain(text.slice(cursor));
  return nodes;
}

export function LessonNotes({ content, className = "" }: { content: string; className?: string }) {
  const lines = (content ?? "").split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const items = list.items;
    blocks.push(
      list.ordered ? (
        <ol key={`l${blocks.length}`} className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {i + 1}
              </span>
              <span className="min-w-0">{renderInline(item, `i${i}`)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul key={`l${blocks.length}`} className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <span className="min-w-0">{renderInline(item, `i${i}`)}</span>
            </li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      blocks.push(
        <h4
          key={`h${idx}`}
          className="mt-1 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-white"
        >
          <span className="h-3.5 w-1 rounded-full bg-indigo-500" />
          {renderInline(heading[2], `h${idx}`)}
        </h4>,
      );
      return;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (list && list.ordered) flushList();
      list = list ?? { ordered: false, items: [] };
      list.items.push(bullet[1]);
      return;
    }

    const step = line.match(/^(\d{1,2})[.)]\s+(.*)$/);
    if (step) {
      if (list && !list.ordered) flushList();
      list = list ?? { ordered: true, items: [] };
      list.items.push(step[2]);
      return;
    }

    flushList();
    blocks.push(
      <p key={`p${idx}`} className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInline(line, `p${idx}`)}
      </p>,
    );
  });

  flushList();

  if (blocks.length === 0) return null;

  return <div className={`space-y-2.5 ${className}`}>{blocks}</div>;
}
