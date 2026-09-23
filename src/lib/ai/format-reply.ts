/**
 * AI reply normalization — turns raw model output into clean text for the UI
 * and for anything persisted to the database.
 *
 * Models frequently emit:
 *   - chain-of-thought blocks (<think>...</think>)
 *   - HTML entities (&amp; &lt; &gt; &quot; ...) and literal "\n" sequences
 *   - stray HTML tags (the model must NEVER be rendered as HTML — XSS)
 *   - wide markdown tables that overflow a narrow chat bubble
 *   - non-breaking / narrow no-break spaces and runaway blank lines
 *
 * normalizeAiReply() strips all of that so the reply can be displayed by the
 * small, safe markdown renderer in src/components/AiFormattedText.tsx.
 *
 * This module is PURE (no DB, no network) — it is imported by server routes
 * (callAI) and by client components (the SOP "Copy" button).
 */

// ---------------------------------------------------------------------------
// HTML entities
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  hairsp: " ",
  zwnj: "\u200C",
  zwj: "\u200D",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  lsquo: "\u2018",
  rsquo: "\u2019",
  sbquo: "\u201A",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bdquo: "\u201E",
  laquo: "\u00AB",
  raquo: "\u00BB",
  bull: "\u2022",
  middot: "\u00B7",
  times: "\u00D7",
  divide: "\u00F7",
  plusmn: "\u00B1",
  deg: "\u00B0",
  sup1: "\u00B9",
  sup2: "\u00B2",
  sup3: "\u00B3",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  sect: "\u00A7",
  para: "\u00B6",
  frac12: "\u00BD",
  frac14: "\u00BC",
  frac34: "\u00BE",
  lsqb: "[",
  rsqb: "]",
  infin: "\u221E",
  ne: "\u2260",
  le: "\u2264",
  ge: "\u2265",
  larr: "\u2190",
  rarr: "\u2192",
  uarr: "\u2191",
  darr: "\u2193",
  euro: "\u20AC",
  pound: "\u00A3",
  yen: "\u00A5",
  cent: "\u00A2",
  iexcl: "\u00A1",
  iquest: "\u00BF",
  prime: "\u2032",
  Prime: "\u2033",
  dagger: "\u2020",
  Dagger: "\u2021",
  szlig: "\u00DF",
  agrave: "\u00E0",
  aacute: "\u00E1",
  acirc: "\u00E2",
  atilde: "\u00E3",
  auml: "\u00E4",
  egrave: "\u00E8",
  eacute: "\u00E9",
  ecirc: "\u00EA",
  euml: "\u00EB",
  igrave: "\u00EC",
  iacute: "\u00ED",
  icirc: "\u00EE",
  iuml: "\u00EF",
  ograve: "\u00F2",
  oacute: "\u00F3",
  ocirc: "\u00F4",
  otilde: "\u00F5",
  ouml: "\u00F6",
  ugrave: "\u00F9",
  uacute: "\u00FA",
  ucirc: "\u00FB",
  uuml: "\u00FC",
  ccedil: "\u00E7",
  yuml: "\u00FF",
  oelig: "\u0153",
};

const ENTITY_RE = /&(#[xX][0-9a-fA-F]{1,8}|#[0-9]{1,8}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;

function decodeNumericEntity(body: string): string {
  // body is the entity body WITHOUT surrounding "&…;", e.g. "#65" or "#x42".
  const spec = body.startsWith("#") ? body.slice(1) : body;
  const isHex = spec.startsWith("x") || spec.startsWith("X");
  const value = isHex ? parseInt(spec.slice(1), 16) : parseInt(spec, 10);
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return "";
  // Control characters and zero-width code points are useless in display text.
  if (value < 0x20 && value !== 0x09) return " ";
  return String.fromCodePoint(value);
}

/** Decode named + numeric entities, repeatedly, so nested ones (&amp;lt;) also resolve. */
function decodeEntities(text: string): string {
  let prev = "";
  let cur = text;
  for (let i = 0; i < 6 && cur !== prev; i += 1) {
    prev = cur;
    cur = cur.replace(ENTITY_RE, (match) => {
      const body = match.slice(1, -1);
      if (body.startsWith("#")) return decodeNumericEntity(body);
      return NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? match;
    });
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Markdown tables → narrow-chat bullets
// ---------------------------------------------------------------------------

function isTableLine(line: string): boolean {
  return line.trimStart().startsWith("|");
}

function splitTableLine(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t
    .split("|")
    .map((cell) => cell.replace(/\\\|/g, "|").trim())
    .filter((cell, idx, arr) => !(cell === "" && idx === arr.length - 1));
}

function isSeparatorCells(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => c === "" || /^:?-+:?$/.test(c));
}

/**
 * Format one table row as bullet(s):
 *   - 1 column          →  "- value"
 *   - 2 columns         →  "- **key:** value"
 *   - 3+ columns        →  "- **key**" plus one indented "- Label: value" per column
 * The indented form keeps wide tables readable in a narrow chat bubble
 * (no horizontal scroll, no wide HTML table).
 */
function formatTableRow(cells: string[], header: string[] | null): string[] {
  const first = (cells[0] ?? "").trim();
  const rest = cells.slice(1).filter((c) => c.trim() !== "");

  if (!first || rest.length === 0) {
    return first ? [`- ${first}`] : [];
  }

  if (header && header.length >= 3) {
    const out = [`- **${first}**`];
    rest.forEach((cell, i) => {
      const label = i + 1 < header.length ? (header[i + 1] ?? "").trim() : "";
      out.push(label ? `  - ${label}: ${cell}` : `  - ${cell}`);
    });
    return out;
  }

  return [`- **${first}:** ${rest.join(" · ")}`];
}

function formatTableBlock(block: string[]): string[] {
  const rows = block.map(splitTableLine).filter((cells) => cells.some((c) => c !== ""));
  if (rows.length === 0) return [];

  const sepIdx = rows.findIndex((cells) => isSeparatorCells(cells));
  let header: string[] | null = null;
  let data: string[][];

  if (sepIdx === 0) {
    // separator on the first line → no header
    data = rows.slice(1);
  } else if (sepIdx === 1) {
    // classic markdown table: header, separator, data
    header = rows[0];
    data = rows.slice(2);
  } else if (sepIdx > 1) {
    // malformed (separator mid-table) → drop the separator row, treat the rest as data
    data = rows.filter((_, idx) => idx !== sepIdx);
  } else if (rows.length > 1) {
    // no separator row at all → first row is the header
    header = rows[0];
    data = rows.slice(1);
  } else {
    data = rows;
  }

  const out: string[] = [];
  for (const cells of data) out.push(...formatTableRow(cells, header));
  return out;
}

function convertMarkdownTables(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isTableLine(lines[i])) {
      const block: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        block.push(lines[i]);
        i += 1;
      }
      out.push(...formatTableBlock(block));
    } else {
      out.push(lines[i]);
      i += 1;
    }
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize a raw AI reply into clean display text.
 *
 * Guarantees:
 *   - no <think> content, no HTML tags (model HTML is stripped, never rendered)
 *   - no HTML entities, no literal "\n" sequences
 *   - no markdown tables (converted to bullets)
 *   - no non-breaking/narrow spaces, at most one blank line between blocks
 *   - empty/whitespace input stays empty; plain text passes through unchanged
 */
export function normalizeAiReply(text: string): string {
  if (typeof text !== "string") return "";
  let out = text;
  if (!out.trim()) return "";

  // Single newline code for the rest of the pipeline.
  out = out.replace(/\r\n?/g, "\n");

  // 1) Chain-of-thought: drop full <think>…</think> blocks. An opening
  //    <think> with no closing tag means "everything after is reasoning" →
  //    truncate. Any leftover stray think tags are removed as well.
  out = out.replace(/<\s*think\b[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi, "");
  out = out.replace(/<\s*think\b[^>]*>[\s\S]*$/i, "");
  out = out.replace(/<\s*\/\s*think\s*>/gi, "");

  // 2) Decode HTML entities (nested ones included).
  out = decodeEntities(out);

  // 3) Literal "\n" / "\r" sequences the model sometimes writes instead of newlines.
  out = out.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n");

  // 4) Strip HTML. <br> means a line break → real newline (so words never
  //    glue together), script/style/iframe blocks go away WITH their content,
  //    then every remaining tag is removed. The model's HTML is NEVER executed
  //    or injected (no dangerouslySetInnerHTML anywhere in the app).
  out = out.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|link|meta|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  out = out.replace(/<\s*(script|style|iframe|object|embed|link|meta|form)\b[^>]*\/?\s*>/gi, "");
  out = out.replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*?)?\/?\s*>/g, "");

  // 5) Markdown tables → bullets/sections that fit a narrow chat.
  out = convertMarkdownTables(out);

  // 6) Special whitespace: nbsp / thin / narrow no-break → normal space,
  //    zero-width characters removed.
  out = out
    .replace(/[\u00A0\u2009\u2007\u202F]/g, " ")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");

  // 7) Squeeze runs of inner spaces to one (keeps leading indentation),
  //    trim trailing spaces per line, collapse 3+ newlines to 2, trim ends.
  out = out
    .replace(/(\S) +(?=\S)/g, "$1 ")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}

/**
 * Plain-text version for the clipboard (SOP "Copy" button): the normalized
 * reply with markdown markers removed (headings, bold, italic, code, links).
 * Line structure and bullet markers are kept so pasted text stays readable —
 * but never raw "**", "###" or HTML.
 */
export function toPlainText(text: string): string {
  const normalized = normalizeAiReply(text);
  return normalized
    .replace(/`{3}[\s\S]*?`{3}/g, (fence) => fence.replace(/`{3}/g, ""))
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*((?:[^*]|\*(?!\*))+?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\s](?:[^*\n]*[^*\s])?)\*/g, "$1")
    .replace(
      /(^|[\s\-–—(])_([^\s_](?:[^_\n]*[^\s_])?)_(?=$|[\s).,!?:;–—])/gm,
      "$1$2"
    )
    .replace(/\[([^\]\n]+)\]\((?:https?:\/\/)?[^\s)]+\)/g, "$1")
    .replace(/^(\s{0,3})[-*+]\s+/gm, (match, indent: string) => (indent.length >= 2 ? "  " : "") + "- ")
    .replace(/^\s{0,3}([-*_])(\s*\1){2,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
