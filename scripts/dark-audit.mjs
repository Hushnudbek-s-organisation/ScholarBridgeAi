#!/usr/bin/env node
/**
 * Dark/light contrast audit for the Tailwind markup — replays the REAL cascade.
 *
 * `src/app/globals.css` re-themes the app at the token layer (it inverts the
 * slate ramp and turns the pale accent shades into washes under `.dark`) and
 * pins a set of classes to surface tiers inside `@layer utilities`. Earlier
 * versions of this script hand-copied those values into a table and resolved
 * `dark:bg-slate-900` like the pinned `bg-slate-900` — while the browser
 * actually painted the INVERTED token (near-white) — so it reported zero
 * problems over white-on-white screens. This version transcribes nothing:
 *
 *   1. it parses globals.css — the `:root` / `.dark` custom properties and
 *      every rule's selector, colour declarations, cascade layer and order;
 *   2. for every class string in the markup it replays the cascade the way
 *      the browser does: unlayered rules beat layered ones, then specificity,
 *      then source order. Tailwind utilities enter as layered candidates whose
 *      colour resolves through the `.dark` variable overrides — exactly how
 *      `var(--color-slate-900)` behaves at runtime;
 *   3. it reports
 *        • unreadable fill/ink pairs (< 3:1) in light and dark, per state;
 *        • inverted-ramp leaks: a `dark:` slate utility (or a dark scrim /
 *          a remapped accent token used as `dark:` text) that no pin in
 *          globals.css catches, so it resolves to the wrong end of the ramp;
 *        • state leaks: a hover/focus/disabled fill that flashes near-white in
 *          dark mode, or an accent hover ink that sinks into the card.
 *
 * It is a lint, not a renderer: fast, dependency-free, safe to run in CI.
 *
 *   node scripts/dark-audit.mjs                       # one line per distinct problem
 *   node scripts/dark-audit.mjs --all                 # every occurrence
 *   node scripts/dark-audit.mjs --explain "bg-white text-slate-500"   # resolve one element
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const CSS_FILE = join(SRC, "app", "globals.css");

/* ------------------------------------------------------------------ colour */

const rgba = (r, g, b, a = 1) => ({ r, g, b, a });
const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * Tailwind v4 ramps (oklch → sRGB), flattened from
 * `node_modules/tailwindcss/theme.css` for the installed Tailwind. The v4
 * palette is not the v3 one (red-500 is #fb2c36, not #ef4444), and the
 * contrast maths depends on the real values. Regenerate after an upgrade.
 */
const RAMP = {
  slate: [248, 250, 252, 241, 245, 249, 226, 232, 240, 202, 213, 226, 144, 161, 185, 98, 116, 142, 69, 85, 108, 49, 65, 88, 29, 41, 61, 15, 23, 43, 2, 6, 24],
  gray: [249, 250, 251, 243, 244, 246, 229, 231, 235, 209, 213, 220, 153, 161, 175, 106, 114, 130, 74, 85, 101, 54, 65, 83, 30, 41, 57, 16, 24, 40, 3, 7, 18],
  zinc: [250, 250, 250, 244, 244, 245, 228, 228, 231, 212, 212, 216, 159, 159, 169, 113, 113, 123, 82, 82, 92, 63, 63, 70, 39, 39, 42, 24, 24, 27, 9, 9, 11],
  neutral: [250, 250, 250, 245, 245, 245, 229, 229, 229, 212, 212, 212, 161, 161, 161, 115, 115, 115, 82, 82, 82, 64, 64, 64, 38, 38, 38, 23, 23, 23, 10, 10, 10],
  indigo: [238, 242, 255, 224, 231, 255, 198, 210, 255, 163, 179, 255, 124, 134, 255, 97, 95, 255, 79, 57, 246, 67, 45, 215, 55, 42, 172, 49, 44, 133, 30, 26, 77],
  violet: [245, 243, 255, 237, 233, 254, 221, 214, 255, 196, 180, 255, 166, 132, 255, 142, 81, 255, 127, 34, 254, 112, 8, 231, 93, 14, 192, 77, 23, 154, 47, 13, 104],
  purple: [250, 245, 255, 243, 232, 255, 233, 212, 255, 218, 178, 255, 194, 122, 255, 173, 70, 255, 152, 16, 250, 130, 0, 219, 110, 17, 176, 89, 22, 139, 60, 3, 102],
  blue: [239, 246, 255, 219, 234, 254, 190, 219, 255, 142, 197, 255, 81, 162, 255, 43, 127, 255, 21, 93, 252, 20, 71, 230, 25, 60, 184, 28, 57, 142, 22, 36, 86],
  sky: [240, 249, 255, 223, 242, 254, 184, 230, 254, 116, 212, 255, 0, 188, 255, 0, 166, 244, 0, 132, 209, 0, 105, 168, 0, 89, 138, 2, 74, 112, 5, 47, 74],
  emerald: [236, 253, 245, 208, 250, 229, 164, 244, 207, 94, 233, 181, 0, 212, 146, 0, 188, 125, 0, 153, 102, 0, 122, 85, 0, 96, 69, 0, 79, 59, 0, 44, 34],
  green: [240, 253, 244, 220, 252, 231, 185, 248, 207, 123, 241, 168, 5, 223, 114, 0, 201, 80, 0, 166, 62, 0, 130, 54, 1, 102, 48, 13, 84, 43, 3, 46, 21],
  teal: [240, 253, 250, 203, 251, 241, 150, 247, 228, 70, 236, 213, 0, 213, 190, 0, 187, 167, 0, 150, 137, 0, 120, 111, 0, 95, 90, 11, 79, 74, 2, 47, 46],
  amber: [255, 251, 235, 254, 243, 198, 254, 230, 133, 255, 210, 48, 255, 185, 0, 254, 154, 0, 225, 113, 0, 187, 77, 0, 151, 60, 0, 123, 51, 6, 70, 25, 1],
  yellow: [254, 252, 232, 254, 249, 194, 255, 240, 133, 255, 223, 32, 253, 199, 0, 240, 177, 0, 208, 135, 0, 166, 95, 0, 137, 75, 0, 115, 62, 10, 67, 32, 4],
  orange: [255, 247, 237, 255, 237, 212, 255, 214, 167, 255, 184, 106, 255, 137, 4, 255, 105, 0, 245, 73, 0, 202, 53, 0, 159, 45, 0, 126, 42, 12, 68, 19, 6],
  red: [254, 242, 242, 255, 226, 226, 255, 201, 201, 255, 162, 162, 255, 100, 103, 251, 44, 54, 231, 0, 11, 193, 0, 7, 159, 7, 18, 130, 24, 26, 70, 8, 9],
  rose: [255, 241, 242, 255, 228, 230, 255, 204, 211, 255, 161, 173, 255, 99, 126, 255, 32, 86, 236, 0, 63, 199, 0, 54, 165, 0, 54, 139, 8, 54, 77, 2, 24],
  pink: [253, 242, 248, 252, 231, 243, 252, 206, 232, 253, 165, 213, 251, 100, 182, 246, 51, 154, 230, 0, 118, 198, 0, 92, 163, 0, 76, 134, 16, 67, 81, 4, 36],
  fuchsia: [253, 244, 255, 250, 232, 255, 246, 207, 255, 244, 168, 255, 237, 106, 255, 225, 42, 251, 200, 0, 222, 168, 0, 183, 138, 1, 148, 114, 19, 120, 75, 0, 79],
  lime: [247, 254, 231, 236, 252, 202, 216, 249, 153, 187, 244, 81, 154, 230, 0, 124, 207, 0, 94, 165, 0, 73, 125, 0, 60, 99, 0, 53, 83, 14, 25, 46, 3],
  cyan: [236, 254, 255, 206, 250, 254, 162, 244, 253, 83, 234, 253, 0, 211, 242, 0, 184, 219, 0, 146, 184, 0, 117, 149, 0, 95, 120, 16, 78, 100, 5, 51, 69],
};
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const PALETTE = Object.fromEntries(
  Object.entries(RAMP).map(([name, v]) => [
    name,
    Object.fromEntries(SHADES.map((s, i) => [s, rgba(v[i * 3], v[i * 3 + 1], v[i * 3 + 2])])),
  ]),
);
const FAMILIES = Object.keys(PALETTE);
const ACCENTS = FAMILIES.filter((f) => !["slate", "gray", "zinc", "neutral"].includes(f));

function over(fg, bg) {
  const a = fg.a ?? 1;
  return rgba(fg.r * a + bg.r * (1 - a), fg.g * a + bg.g * (1 - a), fg.b * a + bg.b * (1 - a), 1);
}
function luminance({ r, g, b }) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ------------------------------------------------------- globals.css model */

/** Split on `sep` at nesting depth 0 (parentheses / brackets / quotes aware). */
function splitTop(str, sep) {
  const out = [];
  let depth = 0, quote = null, cur = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      cur += ch;
      if (ch === "\\") { cur += str[++i] ?? ""; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "\\") { cur += ch + (str[++i] ?? ""); continue; }
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && ch === sep) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** Parse the stylesheet into flat rules: { selectors, decls, layered, order, media }. */
function parseStylesheet(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const vars = { light: {}, dark: {} };
  let order = 0;
  function walk(text, ctx) {
    let i = 0;
    while (i < text.length) {
      // skip whitespace
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) break;
      // find the next `{` or `;` at depth 0
      let j = i, depth = 0, quote = null;
      for (; j < text.length; j++) {
        const ch = text[j];
        if (quote) { if (ch === "\\") j++; else if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === "\\") { j++; continue; }
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (depth === 0 && (ch === "{" || ch === ";")) break;
      }
      const prelude = text.slice(i, j).trim();
      if (text[j] === ";" || j >= text.length) { i = j + 1; continue; } // statement (@import, @custom-variant …)
      // matching close brace
      let k = j + 1; depth = 1; quote = null;
      for (; k < text.length && depth > 0; k++) {
        const ch = text[k];
        if (quote) { if (ch === "\\") k++; else if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      const body = text.slice(j + 1, k - 1);
      i = k;
      if (prelude.startsWith("@")) {
        const name = prelude.split(/[\s(]/)[0];
        if (name === "@layer") walk(body, { ...ctx, layered: true });
        else if (name === "@media") {
          if (/\bprint\b/.test(prelude)) continue;              // print styles never apply on screen
          walk(body, { ...ctx, media: prelude });
        } else if (name === "@supports") walk(body, ctx);
        // @keyframes, @theme, @font-face… carry no colour rules
        continue;
      }
      // style rule
      const decls = {};
      for (const d of splitTop(body, ";")) {
        const c = d.indexOf(":");
        if (c < 0) continue;
        const prop = d.slice(0, c).trim();
        let value = d.slice(c + 1).trim();
        const important = /!important\s*$/.test(value);
        value = value.replace(/!important\s*$/, "").trim();
        if (!prop) continue;
        decls[prop] = { value, important };
      }
      const selText = prelude;
      if (!ctx.media && !ctx.layered && (selText === ":root" || selText === ".dark")) {
        for (const [p, { value }] of Object.entries(decls)) {
          if (p.startsWith("--")) vars[selText === ":root" ? "light" : "dark"][p] = value;
        }
      }
      const selectors = splitTop(selText, ",").map((s) => s.trim()).filter(Boolean).map(parseSelector);
      rules.push({ selText, selectors, decls, layered: Boolean(ctx.layered), order: order++, media: ctx.media || null });
    }
  }
  walk(css, { layered: false, media: null });
  return { rules, vars };
}

/* ----------------------------------------------------- selector engine
   Supports exactly what globals.css uses: type, .class (escaped), [attr~=|^=|*=|=],
   :hover :focus :focus-visible :disabled :enabled :last-child :popover-open,
   :is() :where() :not(), ::pseudo-element, descendant and child combinators. */

function unescapeIdent(s) {
  return s.replace(/\\(.)/g, "$1");
}

function parseSelector(text) {
  // → { compounds: [{ combinator, parts: [...] }], pseudoElement }
  const compounds = [];
  let i = 0, pseudoElement = null;
  let combinator = null;
  let parts = [];
  const flush = () => {
    if (parts.length) compounds.push({ combinator, parts });
    parts = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch) || ch === ">" || ch === "~" || ch === "+") {
      // combinator: descendant ( ), child (>), sibling (~ +)
      let j = i, comb = " ";
      while (j < text.length && (/\s/.test(text[j]) || ">~+".includes(text[j]))) { if (">~+".includes(text[j])) comb = text[j]; j++; }
      if (parts.length) { flush(); combinator = comb; }
      i = j;
      continue;
    }
    if (ch === ".") {
      let j = i + 1, name = "";
      while (j < text.length && (/[\w-]/.test(text[j]) || text[j] === "\\")) {
        if (text[j] === "\\") { name += text[j + 1]; j += 2; } else { name += text[j]; j++; }
      }
      parts.push({ t: "class", v: name });
      i = j;
      continue;
    }
    if (ch === "[") {
      let j = i + 1, depth = 1, quote = null;
      for (; j < text.length; j++) {
        if (quote) { if (text[j] === quote) quote = null; continue; }
        if (text[j] === '"' || text[j] === "'") { quote = text[j]; continue; }
        if (text[j] === "]" && --depth === 0) break;
      }
      const inner = text.slice(i + 1, j);
      const m = inner.match(/^([\w-]+)\s*(?:([~^*$|]?=)\s*(["'])([\s\S]*)\3)?$/);
      if (!m) throw new Error(`dark-audit: unsupported attribute selector [${inner}]`);
      parts.push({ t: "attr", name: m[1], op: m[2] || null, v: m[4] ?? null });
      i = j + 1;
      continue;
    }
    if (ch === ":") {
      if (text[i + 1] === ":") {
        let j = i + 2, name = "";
        while (j < text.length && /[\w-]/.test(text[j])) name += text[j++];
        pseudoElement = name;
        i = j;
        continue;
      }
      let j = i + 1, name = "";
      while (j < text.length && /[\w-]/.test(text[j])) name += text[j++];
      if (text[j] === "(") {
        let depth = 1, k = j + 1;
        for (; k < text.length && depth > 0; k++) {
          if (text[k] === "(") depth++;
          else if (text[k] === ")") depth--;
        }
        const arg = text.slice(j + 1, k - 1);
        if (!["is", "where", "not"].includes(name)) throw new Error(`dark-audit: unsupported pseudo-class :${name}()`);
        parts.push({ t: name, list: splitTop(arg, ",").map((s) => s.trim()).filter(Boolean).map(parseSelector) });
        i = k;
        continue;
      }
      parts.push({ t: "pseudo", v: name });
      i = j;
      continue;
    }
    if (ch === "*") { parts.push({ t: "any" }); i++; continue; }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i, name = "";
      while (j < text.length && /[\w-]/.test(text[j])) name += text[j++];
      parts.push({ t: "type", v: name.toLowerCase() });
      i = j;
      continue;
    }
    throw new Error(`dark-audit: cannot parse selector near "${text.slice(i, i + 20)}" in "${text}"`);
  }
  flush();
  return { compounds, pseudoElement };
}

function specificity(sel) {
  let a = 0, b = 0, c = 0;
  for (const { parts } of sel.compounds) {
    for (const p of parts) {
      if (p.t === "class" || p.t === "attr" || p.t === "pseudo") b++;
      else if (p.t === "type") c++;
      else if (p.t === "is" || p.t === "not") {
        let best = [0, 0, 0];
        for (const s of p.list) {
          const sp = specificity(s);
          if (cmpSpec(sp, best) > 0) best = sp;
        }
        a += best[0]; b += best[1]; c += best[2];
      }
    }
  }
  if (sel.pseudoElement) c++;
  return [a, b, c];
}
const cmpSpec = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

function matchPart(p, el) {
  switch (p.t) {
    case "any": return true;
    case "type": return el.tag === p.v;
    case "class": return el.classes.has(p.v);
    case "attr": {
      if (p.name === "class") {
        const v = el.classAttr;
        if (!p.op) return true;
        if (p.op === "~=") return el.classes.has(p.v);
        if (p.op === "^=") return v.startsWith(p.v);
        if (p.op === "*=") return v.includes(p.v);
        if (p.op === "$=") return v.endsWith(p.v);
        if (p.op === "=") return v === p.v;
        return false;
      }
      const av = el.attrs?.[p.name];
      if (av === undefined) return false;
      if (!p.op) return true;
      if (p.op === "=") return av === p.v;
      return false;
    }
    case "pseudo": {
      const s = el.states;
      switch (p.v) {
        case "hover": return s.has("hover");
        case "focus": return s.has("focus");
        case "focus-visible": return s.has("focus-visible") || s.has("focus");
        case "focus-within": return s.has("focus-within") || s.has("focus");
        case "active": return s.has("active");
        case "disabled": return s.has("disabled");
        case "enabled": return !s.has("disabled");
        case "last-child": return Boolean(el.lastChild);
        case "popover-open": case "open": return false;
        default: return false;
      }
    }
    case "is": case "where": return p.list.some((s) => matches(s, el));
    case "not": return !p.list.some((s) => matches(s, el));
    default: return false;
  }
}

/** Does `sel` match element `el` (with `el.parent` chain)? Right-to-left. */
function matches(sel, el, wantPseudoElement = undefined) {
  if (wantPseudoElement !== undefined && (sel.pseudoElement ?? null) !== wantPseudoElement) return false;
  const cs = sel.compounds;
  const step = (idx, node) => {
    if (!node) return false;
    if (!cs[idx].parts.every((p) => matchPart(p, node))) return false;
    if (idx === 0) return true;
    const comb = cs[idx].combinator;
    if (comb === ">") return step(idx - 1, node.parent);
    // Sibling combinators: test against a plain virtual previous sibling.
    if (comb === "~" || comb === "+") return step(idx - 1, makeElement({ tag: "div", parent: node.parent }));
    for (let anc = node.parent; anc; anc = anc.parent) if (step(idx - 1, anc)) return true;
    return false;
  };
  return step(cs.length - 1, el);
}

/* ------------------------------------------------------ value resolution */

function parseColor(value, vars, depth = 0) {
  if (!value || depth > 8) return null;
  value = value.trim();
  const v = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (v) return parseColor(vars[v[1]] ?? v[2], vars, depth + 1);
  if (value === "transparent") return rgba(0, 0, 0, 0);
  let m = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
    return rgba(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
  }
  m = value.match(/^rgba?\(([\s\S]+)\)$/);
  if (m) {
    const inner = m[1].replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, n) => vars[n] ?? "");
    const [chan, alpha] = inner.includes("/") ? inner.split("/") : [inner, null];
    const nums = chan.split(/[\s,]+/).filter(Boolean).map(Number);
    let a = alpha != null ? Number(alpha) : 1;
    if (nums.length === 4 && alpha == null) a = nums[3];
    if (nums.length < 3 || nums.slice(0, 3).some(Number.isNaN)) return null;
    return rgba(nums[0], nums[1], nums[2], Number.isNaN(a) ? 1 : a);
  }
  m = value.match(/gradient\(([\s\S]+)\)/);
  if (m) {
    // first colour stop of a gradient (helper classes such as .sb-journey-hero)
    const stop = splitTop(m[1], ",").map((s) => s.trim()).find((s) => /#|rgb/.test(s));
    return stop ? parseColor(stop.split(/\s+(?=\d)/)[0], vars, depth + 1) : null;
  }
  return null;
}

/* ------------------------------------------------------- tailwind tokens */

const PROP_OF = {
  bg: "background-color", text: "color", border: "border-color", "border-x": "border-color", "border-y": "border-color",
  "border-t": "border-color", "border-r": "border-color", "border-b": "border-color", "border-l": "border-color",
  divide: "border-color", ring: "--tw-ring-color", "ring-offset": "--tw-ring-offset-color", from: "--tw-gradient-from",
  via: "--tw-gradient-via", to: "--tw-gradient-to", stroke: "stroke", fill: "fill", outline: "outline-color",
};
/** Variant → { state?, pseudoElement?, spec, rank, mode? } — mirrors how Tailwind 4 compiles it. */
const STATE_VARIANTS = {
  hover: { state: "hover", spec: 1, rank: 10 },
  "group-hover": { state: "hover", spec: 1, rank: 9 },
  focus: { state: "focus", spec: 1, rank: 11 },
  "focus-within": { state: "focus", spec: 1, rank: 12 },
  "focus-visible": { state: "focus", spec: 1, rank: 13 },
  active: { state: "active", spec: 1, rank: 14 },
  enabled: { state: "!disabled", spec: 1, rank: 15 },
  disabled: { state: "disabled", spec: 1, rank: 16 },
  open: { state: "open", spec: 1, rank: 8 },
};
const NEUTRAL_VARIANTS = /^(sm|md|lg|xl|2xl|max-[\w-]+|min-[\w-]+|motion-safe|motion-reduce|first|last|odd|even|only|print|ltr|rtl|landscape|portrait)$/;

/** Parse one class token into { variants, prefix, family, shade, alpha, prop } or null. */
function parseToken(token) {
  const parts = token.split(/:(?![^[]*\])/);
  const util = parts.pop();
  const m = util.match(/^(bg|text|border(?:-[xytrbl])?|divide|ring-offset|ring|from|via|to|stroke|fill|outline)-(white|black|transparent|([a-z]+)-(\d{2,3}))(?:\/(\d{1,3}))?$/);
  if (!m) return null;
  const family = m[3] ?? m[2];
  const shade = m[4] ? Number(m[4]) : null;
  if (m[3] && !PALETTE[family]) return null;
  if (shade != null && !SHADES.includes(shade)) return null;
  return { token, variants: parts, prefix: m[1], family, shade, alpha: m[5] ? Number(m[5]) / 100 : null, prop: PROP_OF[m[1]] };
}

/** Is the token's variant chain active in this mode/state? Returns { spec, rank, pseudoElement } or null. */
function variantInfo(tok, mode, state) {
  let spec = 0, rank = 0, pseudoElement = null;
  for (const v of tok.variants) {
    if (v === "dark") { if (mode !== "dark") return null; rank += 100; continue; }
    if (v === "placeholder") { pseudoElement = "placeholder"; continue; }
    const sv = STATE_VARIANTS[v];
    if (sv) {
      if (sv.state === "!disabled") { if (state === "disabled") return null; }
      else if (sv.state !== state) return null;
      spec += sv.spec; rank += sv.rank;
      continue;
    }
    if (NEUTRAL_VARIANTS.test(v)) { if (v === "print") return null; rank += 1; continue; }
    return null; // aria-*, data-*, peer-*, group-*: not modelled — skip rather than guess
  }
  return { spec, rank, pseudoElement };
}

function twValue(tok, mode, model) {
  const vars = mode === "dark" ? { ...model.vars.light, ...model.vars.dark } : model.vars.light;
  let c;
  if (tok.family === "white") c = parseColor(vars["--color-white"], vars) ?? rgba(255, 255, 255);
  else if (tok.family === "black") c = parseColor(vars["--color-black"], vars) ?? rgba(0, 0, 0);
  else if (tok.family === "transparent") c = rgba(0, 0, 0, 0);
  else {
    const name = `--color-${tok.family}-${tok.shade}`;
    c = vars[name] ? parseColor(vars[name], vars) : { ...PALETTE[tok.family][tok.shade] };
  }
  if (!c) return null;
  if (tok.alpha != null) c = { ...c, a: (c.a ?? 1) * tok.alpha };
  return c;
}

/* --------------------------------------------------------------- cascade */

function makeElement({ tag = "div", classAttr = "", states = [], parent = null, attrs = {} }) {
  const classes = new Set(classAttr.split(/\s+/).filter(Boolean));
  const all = { ...attrs };
  if (states.includes("open")) all.open = "";         // <details open>
  if (states.includes("disabled")) all.disabled = "";
  return { tag, classAttr, classes, states: new Set(states), parent, attrs: all };
}

/** Root chain: <html class="dark?"> <body class="bg-slate-50"> [context…] */
function chainFor(mode, context = []) {
  let node = makeElement({ tag: "html", classAttr: mode === "dark" ? "dark" : "" });
  node = makeElement({ tag: "body", classAttr: "bg-slate-50 text-slate-900", parent: node });
  for (const c of context) node = makeElement({ ...c, parent: node });
  return node;
}

/**
 * Resolve `prop` for `el` in `mode`. Returns { color, source } where source is
 * "tailwind:<token>" or "css:<selector>". Candidates compete like the browser:
 * !important first, then unlayered > layered, then specificity, then order.
 */
function resolveProp(el, prop, mode, model, tokens, state, pseudoElement = null) {
  const vars = mode === "dark" ? { ...model.vars.light, ...model.vars.dark } : model.vars.light;
  let best = null;
  const consider = (cand) => {
    if (!best) { best = cand; return; }
    const k = (x) => [x.important ? 1 : 0, x.layered ? 0 : 1];
    const [ia, la] = k(cand), [ib, lb] = k(best);
    if (ia !== ib) { if (ia > ib) best = cand; return; }
    if (la !== lb) { if (la > lb) best = cand; return; }
    const s = cmpSpec(cand.spec, best.spec);
    if (s > 0 || (s === 0 && cand.order >= best.order)) best = cand;
  };
  // Tailwind utilities (generated first inside @layer utilities)
  tokens.forEach((tok, idx) => {
    if (tok.prop !== prop && !(prop === "background-image" && false)) return;
    const vi = variantInfo(tok, mode, state);
    if (!vi || (vi.pseudoElement ?? null) !== pseudoElement) return;
    const color = twValue(tok, mode, model);
    if (!color) return;
    // `dark:` adds no specificity (it is `:where(.dark, .dark *)`); each state variant adds (0,1,0).
    consider({ color, layered: true, important: false, spec: [0, 1 + vi.spec, 0], order: vi.rank * 1000 + idx, source: `tailwind:${tok.token}` });
  });
  // globals.css rules (after Tailwind's generated block)
  for (const rule of model.rules) {
    const decl = rule.decls[prop] ?? (prop === "background-color" ? rule.decls["background-image"] ?? rule.decls.background : undefined);
    if (!decl) continue;
    if (rule.media && !/hover:\s*hover/.test(rule.media)) continue;
    for (const sel of rule.selectors) {
      if (!matches(sel, el, pseudoElement)) continue;
      const color = parseColor(decl.value, vars);
      if (!color) continue;
      consider({ color, layered: rule.layered, important: decl.important, spec: specificity(sel), order: 1e9 + rule.order, source: `css:${rule.selText.replace(/\s+/g, " ").slice(0, 90)}` });
    }
  }
  return best;
}

/* ------------------------------------------------------------- the markup */

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(p)) out.push(p);
  }
  return out;
}

/* One class attribute may wrap over several lines and hold ternaries
   (`a ? "bg-x text-y" : "bg-z"`), so whole quoted strings are read at once.
   Only template literals may span lines, though: an apostrophe in a comment
   or in JSX prose ("student's", "Don't") is not a string delimiter, and
   pairing it with the next one used to swallow kilobytes of markup into a
   single fake "class list" — hiding the real classNames inside it. A '…' or
   "…" span that crosses a line break is therefore re-scanned one character
   later. (No class attribute in src/ uses a multi-line '…' or "…" string.) */
function* quotedChunks(src) {
  const re = /(["'`])(?:(?!\1)[\s\S])*?\1/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] !== "`" && m[0].includes("\n")) {
      re.lastIndex = m.index + 1;
      continue;
    }
    const body = m[0].slice(1, -1);
    if (!/\b(?:text|bg|border|from|ring|divide|stroke)-[a-z]/.test(body)) continue;
    yield { body, index: m.index, line: src.slice(0, m.index).split("\n").length };
  }
}

/** Best-effort JSX tag for a className string (`<button className="…">`). */
function tagFor(src, index) {
  const before = src.slice(Math.max(0, index - 700), index).replace(/=>/g, "");
  const m = [...before.matchAll(/<([a-z][a-z0-9]*)\b/g)].pop();
  if (!m) return "div";
  const tail = before.slice(m.index);
  return /[>]/.test(tail.replace(/\{[^{}]*\}/g, "")) ? "div" : m[1];
}

/** Split a class string into one branch per ternary arm. */
function branchesOf(body) {
  const out = [];
  for (const arm of body.split(/\s+\?\s+|\s+:\s+/)) {
    const tokens = [];
    for (const raw of arm.split(/\s+/)) {
      const t = raw.replace(/^[`'"]+|[`'"]+$/g, "").replace(/[${}]/g, " ").trim();
      if (t) tokens.push(...t.split(/\s+/));
    }
    if (tokens.length) out.push(tokens);
  }
  return out;
}

/* ------------------------------------------------------------------ audit */

const MIN = 3;          // below this a fill/ink pair is unreadable
const ALL = process.argv.includes("--all");
const model = parseStylesheet(readFileSync(CSS_FILE, "utf8"));
const darkVars = { ...model.vars.light, ...model.vars.dark };
const SURFACE = {
  light: rgba(255, 255, 255),
  dark: parseColor(darkVars["--sb-surface"], darkVars) ?? rgba(17, 26, 46),
};
const BRIGHT_INK_HELPERS = ["sb-ink-on-bright", "sb-ink-on-warm"];

/**
 * Patterns the audit deliberately ignores. Each one is a design decision, not
 * a bug — listing them keeps the report short enough to act on.
 */
function isNoise(bgTok, txTok, mode) {
  const t = txTok, b = bgTok;
  // `text-transparent` has no ink to measure: gradient-clipped headline text
  // (`bg-clip-text`) or a checkbox glyph hidden until it is ticked.
  if (/(^|:)text-transparent$/.test(t)) return true;
  // Faded copy (`text-white/45`) on a translucent overlay is decorative.
  if (/^text-white\/([0-6]\d)$/.test(t)) return true;
  // `text-slate-300` is the light theme's "barely there" affordance (chevrons, rules).
  if (mode === "light" && /(^|:)text-slate-300$/.test(t)) return true;
  // A translucent white/black wash with no ink of its own — the fill is the
  // subject (image scrim, progress track), not a background for text.
  if (/^bg-(white|black)\/[0-8]\d$/.test(b) && /^text-(white|black)$/.test(t)) return true;
  // In light mode a translucent white wash is always painted over something
  // darker (a hero image, a dark banner), so the ink inside it is fine.
  if (mode === "light" && /^bg-white\/[0-8]\d$/.test(b)) return true;
  return false;
}

/** Translucent fill + ink both light (or both dark): only makes sense on a panel
 *  of the opposite tone, which a single-element model cannot see. */
function needsDarkAncestor(bgOut, fgOut) {
  const l1 = luminance(bgOut), l2 = luminance(fgOut);
  return (l1 > 0.55 && l2 > 0.55) || (l1 < 0.12 && l2 < 0.12);
}

/** Resolve the background (worst gradient stop, else fill) and ink of one element. */
function evaluate(classAttr, tag, mode, state, context = []) {
  const parent = chainFor(mode, context);
  const el = makeElement({ tag, classAttr, states: state === "base" ? [] : [state], parent });
  const tokens = classAttr.split(/\s+/).map(parseToken).filter(Boolean);
  const base = context.length ? SURFACE[mode] : SURFACE[mode];
  const bg = resolveProp(el, "background-color", mode, model, tokens, state);
  const tx = resolveProp(el, "color", mode, model, tokens, state);
  const stops = ["--tw-gradient-from", "--tw-gradient-via", "--tw-gradient-to"]
    .map((p) => resolveProp(el, p, mode, model, tokens, state))
    .filter(Boolean);
  const hasGradient = tokens.some((t) => ["from", "via", "to"].includes(t.prefix) && variantInfo(t, mode, state));
  const fills = hasGradient && stops.length ? stops : bg ? [bg] : [];
  return { el, tokens, fills, tx, base };
}

function explain(classAttr) {
  for (const mode of ["light", "dark"]) {
    for (const context of [[], [{ classAttr: "bg-white" }]]) {
      const r = evaluate(classAttr, "div", mode, "base", context);
      const bg = r.fills[0] ? over(r.fills[0].color, r.base) : null;
      const fg = r.tx && bg ? over(r.tx.color, bg) : null;
      console.log(`${mode.padEnd(5)} ${context.length ? "in card" : "on page"}  bg ${bg ? hex(bg) : "—"} (${r.fills[0]?.source ?? "none"})  ink ${fg ? hex(fg) : "—"} (${r.tx?.source ?? "none"})${bg && fg ? `  ${contrast(fg, bg).toFixed(2)}:1` : ""}`);
    }
  }
}

const explainIdx = process.argv.indexOf("--explain");
if (explainIdx > -1) {
  explain(process.argv[explainIdx + 1] ?? "");
  process.exit(0);
}

const findings = [];
const leaks = [];
const seenLeak = new Set();

function checkPair(file, line, classAttr, tag, mode, state, context) {
  const r = evaluate(classAttr, tag, mode, state, context);
  if (!r.fills.length || !r.tx) return;
  // Only judge pairs this element actually declares (both halves present).
  const declares = (prop) => r.tokens.some((t) => (t.prop === prop || (prop === "background-color" && ["from", "via", "to"].includes(t.prefix))) && variantInfo(t, mode, state));
  const helper = BRIGHT_INK_HELPERS.find((h) => r.el.classes.has(h));
  if (!declares("background-color") && !r.fills.some((f) => f.source.startsWith("css:"))) return;
  if (!declares("color") && !helper) return;
  for (const fill of r.fills) {
    const bgOut = over(fill.color, r.base);
    const fgOut = over(r.tx.color, bgOut);
    const ratio = contrast(fgOut, bgOut);
    if (ratio >= MIN) continue;
    const bgTok = fill.source.replace(/^tailwind:/, "");
    const txTok = r.tx.source.replace(/^tailwind:/, "");
    if (isNoise(bgTok, txTok, mode)) continue;
    if ((fill.color.a ?? 1) < 1 && needsDarkAncestor(bgOut, fgOut)) continue;
    findings.push({ file, line, mode, state: state === "base" ? "" : state, text: txTok, bg: bgTok, ratio, fg: hex(fgOut), bgc: hex(bgOut), ctx: context.length ? "in card" : "" });
    return;
  }
}

/** A `dark:` slate utility must be caught by a pin; otherwise it reads the inverted ramp. */
function checkLeak(file, line, tok, tag) {
  const key = tok.token;
  const mode = "dark";
  const state = tok.variants.map((v) => STATE_VARIANTS[v]?.state).find((s) => s && s !== "!disabled") ?? "base";
  const isDivide = tok.prefix === "divide";
  let el;
  const parent = chainFor(mode, []);
  if (isDivide) {
    const holder = makeElement({ tag: "div", classAttr: tok.token, parent });
    el = makeElement({ tag: "div", classAttr: "", parent: holder });
  } else {
    el = makeElement({ tag, classAttr: tok.token, states: state === "base" ? [] : [state], parent });
  }
  const pseudo = tok.variants.includes("placeholder") ? "placeholder" : null;
  const winner = resolveProp(el, tok.prop, mode, model, isDivide ? [] : [tok], state, pseudo);
  const tokenWins = isDivide ? !winner || winner.source.startsWith("tailwind:") : winner?.source === `tailwind:${tok.token}`;
  if (!tokenWins) return;
  const value = twValue(tok, mode, model);
  const k = `${key}`;
  if (seenLeak.has(k) && !ALL) return;
  seenLeak.add(k);
  leaks.push({ file, line, token: key, value: value ? hex(over(value, SURFACE.dark)) + (value.a < 1 ? `@${value.a.toFixed(2)}` : "") : "?", why: tok.why });
}

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  for (const chunk of quotedChunks(src)) {
    const tag = tagFor(src, chunk.index);
    for (const tokensList of branchesOf(chunk.body)) {
      const classAttr = tokensList.join(" ");
      const tokens = tokensList.map(parseToken).filter(Boolean);
      if (!tokens.length) continue;

      // 1. leaks
      for (const tok of tokens) {
        const dark = tok.variants.includes("dark");
        if (dark && tok.family === "slate") { tok.why = "dark: slate utility not pinned — resolves to the inverted token"; checkLeak(rel, chunk.line, tok, tag); continue; }
        if (dark && ACCENTS.includes(tok.family) && (tok.shade === 50 || tok.shade === 100) && tok.prefix === "text") {
          tok.why = "dark: text on a remapped wash token — renders translucent"; checkLeak(rel, chunk.line, tok, tag); continue;
        }
        if (!dark && tok.prefix === "bg" && tok.family === "slate" && tok.shade >= 600 && tok.alpha != null && !tok.variants.length) {
          tok.why = "dark scrim/panel alpha variant not pinned — resolves to the inverted (light) token"; checkLeak(rel, chunk.line, tok, tag); continue;
        }
        // State fills that flash near-white on a dark card
        const st = tok.variants.map((v) => STATE_VARIANTS[v]?.state).find((s) => s && s !== "!disabled");
        if (!dark && st && tok.prefix === "bg" && (tok.family === "white" || ["slate", "gray", "zinc", "neutral"].includes(tok.family) || (ACCENTS.includes(tok.family) && tok.shade <= 100))) {
          const el = makeElement({ tag, classAttr: tok.token, states: [st], parent: chainFor("dark", [{ classAttr: "bg-white" }]) });
          const w = resolveProp(el, "background-color", "dark", model, [tok], st);
          if (w) {
            const out = over(w.color, SURFACE.dark);
            if (luminance(out) > 0.45 && !seenLeak.has(tok.token)) {
              seenLeak.add(tok.token);
              leaks.push({ file: rel, line: chunk.line, token: tok.token, value: hex(out), why: "state fill flashes near-white on a dark card" });
            }
          }
        }
        if (!dark && st === "hover" && tok.prefix === "text" && ACCENTS.includes(tok.family) && tok.shade >= 500) {
          const el = makeElement({ tag, classAttr: tok.token, states: ["hover"], parent: chainFor("dark", [{ classAttr: "bg-white" }]) });
          const w = resolveProp(el, "color", "dark", model, [tok], "hover");
          if (w && contrast(over(w.color, SURFACE.dark), SURFACE.dark) < 4.5 && !seenLeak.has(tok.token)) {
            seenLeak.add(tok.token);
            leaks.push({ file: rel, line: chunk.line, token: tok.token, value: hex(over(w.color, SURFACE.dark)), why: "hover ink sinks into the dark card (< 4.5:1)" });
          }
        }
      }

      // 2. fill/ink pairs, per mode and interaction state
      const states = new Set(["base"]);
      for (const t of tokens) for (const v of t.variants) { const s = STATE_VARIANTS[v]?.state; if (s && s !== "!disabled") states.add(s); }
      for (const mode of ["light", "dark"]) {
        for (const state of states) {
          checkPair(rel, chunk.line, classAttr, tag, mode, state, []);
          // A `bg-slate-50` well is canvas on the page but Tier 2 inside a card:
          // judge it in both places.
          if (mode === "dark" && /(^|\s)bg-slate-50(\s|$)/.test(classAttr)) checkPair(rel, chunk.line, classAttr, tag, mode, state, [{ classAttr: "bg-white" }]);
        }
      }
    }
  }
}

findings.sort((a, b) => a.ratio - b.ratio);
const seen = new Set();
for (const f of findings) {
  const k = `${f.text}|${f.bg}|${f.state}|${f.mode}`;
  if (!ALL) {
    if (seen.has(k)) continue;
    seen.add(k);
  }
  const where = `${f.file}:${f.line}`;
  const state = f.state ? ` [${f.state}]` : "";
  console.log(
    `${f.mode === "dark" ? "dark " : "light"} ${f.ratio.toFixed(2).padStart(5)}:1  ` +
      `${f.text} on ${f.bg}${state}${f.ctx ? ` (${f.ctx})` : ""}`.padEnd(60) +
      ` ${f.fg} on ${f.bgc}  ${where}`,
  );
}
for (const l of leaks) {
  console.log(`leak  ${l.token.padEnd(34)} → ${l.value.padEnd(14)} ${l.why}  ${l.file}:${l.line}`);
}
console.log(`\n${model.rules.length} rules parsed from src/app/globals.css (${Object.keys(model.vars.dark).length} dark tokens).`);
console.log(`${leaks.length} inverted-ramp / state leaks.`);
console.log(`${findings.length} unreadable pairs, ${seen.size} distinct.`);
process.exit(findings.length || leaks.length ? 1 : 0);
