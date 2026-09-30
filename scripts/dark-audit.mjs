#!/usr/bin/env node
/**
 * Dark/light contrast audit for the Tailwind markup.
 *
 * `globals.css` re-themes the app at the *token* layer: it inverts the neutral
 * slate ramp and remaps a hand-picked set of accent chips under `.dark`, so
 * almost every existing component follows along. Classes that are in neither
 * list keep their light-mode value — and that is where the "my text turned
 * black / disappeared" reports come from: a `bg-white/70` chip keeps its 70%
 * white wash, or a `bg-amber-400` button keeps its bright amber, while the copy
 * sitting on it was flipped to a light slate value.
 *
 * This script resolves every `bg-*` / `text-*` pair that appears in the markup
 * (light theme and dark theme, including hover/focus/disabled states) and
 * reports the pairs that are too close in luminance to read. It is a lint, not
 * a renderer: fast, dependency-free, safe to run in CI.
 *
 *   node scripts/dark-audit.mjs            # one line per distinct problem
 *   node scripts/dark-audit.mjs --all      # every occurrence
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

/* ------------------------------------------------------------------ colour */

const rgb = (r, g, b) => ({ r, g, b });
const hex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

/**
 * Tailwind v4 ramps, exactly the shades this codebase can reach.
 * Flattened from `node_modules/tailwindcss/theme.css` (oklch → sRGB) for the
 * installed Tailwind. Regenerate with:
 *   grep --color=never "oklch" node_modules/tailwindcss/theme.css
 * after a Tailwind upgrade — the v4 palette is not the v3 one (red-500 is
 * #fb2c36, not #ef4444), and the contrast maths depends on the real values.
 */
const RAMP = {
  slate: [248, 250, 252, 241, 245, 249, 226, 232, 240, 202, 213, 226, 144, 161, 185, 98, 116, 142, 69, 85, 108, 49, 65, 88, 29, 41, 61, 15, 23, 43, 2, 6, 24],
  gray: [249, 250, 251, 243, 244, 246, 229, 231, 235, 209, 213, 220, 153, 161, 175, 106, 114, 130, 74, 85, 101, 54, 65, 83, 30, 41, 57, 16, 24, 40, 3, 7, 18],
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
  lime: [247, 254, 231, 236, 252, 202, 216, 249, 153, 187, 244, 81, 154, 230, 0, 124, 207, 0, 94, 165, 0, 73, 125, 0, 60, 99, 0, 53, 83, 14, 25, 46, 3],
  cyan: [236, 254, 255, 206, 250, 254, 162, 244, 253, 83, 234, 253, 0, 211, 242, 0, 184, 219, 0, 146, 184, 0, 117, 149, 0, 95, 120, 16, 78, 100, 5, 51, 69],
};
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const PALETTE = Object.fromEntries(
  Object.entries(RAMP).map(([name, v]) => [
    name,
    Object.fromEntries(SHADES.map((s, i) => [s, rgb(v[i * 3], v[i * 3 + 1], v[i * 3 + 2])])),
  ]),
);
const ACCENTS = Object.keys(PALETTE).filter((k) => k !== "slate" && k !== "gray");

/* --- the values globals.css installs under `.dark`, transcribed -----------
   (RAMP above is generated from node_modules/tailwindcss/theme.css)          */
const DARK = {
  /* the inverted neutral ramp */
  slate: { 50: rgb(11, 18, 32), 100: rgb(17, 26, 46), 200: rgb(34, 48, 77), 300: rgb(51, 66, 95), 400: rgb(132, 150, 179), 500: rgb(163, 177, 201), 600: rgb(203, 213, 225), 700: rgb(221, 229, 239), 800: rgb(234, 240, 248), 900: rgb(245, 248, 252), 950: rgb(255, 255, 255) },
  /* "this is a deliberately dark panel" — pinned back */
  darkPanel: { 600: rgb(61, 77, 109), 700: rgb(51, 66, 95), 800: rgb(22, 33, 58), 900: rgb(13, 20, 36), 950: rgb(6, 11, 22) },
  card: rgb(19, 28, 49),
  page: rgb(11, 18, 32),
  /* light copy pinned for the dark panels */
  lightCopy: { 100: rgb(238, 242, 247), 200: rgb(213, 221, 232), 300: rgb(180, 192, 211) },
  /* accent inks + the translucent wash their 50/100 chips become */
  ink: {
    indigo: rgb(165, 180, 252), violet: rgb(196, 181, 253), purple: rgb(216, 180, 254),
    blue: rgb(147, 197, 253), sky: rgb(125, 211, 252), emerald: rgb(110, 231, 183),
    green: rgb(134, 239, 172), teal: rgb(94, 234, 212), amber: rgb(252, 211, 77),
    yellow: rgb(253, 224, 71), orange: rgb(253, 186, 116), red: rgb(252, 165, 165),
    rose: rgb(253, 164, 175),
  },
  wash: {
    indigo: rgb(99, 102, 241), violet: rgb(139, 92, 246), purple: rgb(168, 85, 247),
    blue: rgb(59, 130, 246), sky: rgb(14, 165, 233), emerald: rgb(16, 185, 129),
    green: rgb(34, 197, 94), teal: rgb(20, 184, 166), amber: rgb(245, 158, 11),
    yellow: rgb(234, 179, 8), orange: rgb(249, 115, 22), red: rgb(239, 68, 68),
    rose: rgb(244, 63, 94),
  },
  washAlpha: 0.16,
};

function over(fg, bg, alpha) {
  return rgb(
    Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  );
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

/**
 * Resolve `prop-family-shade` to a colour.
 * Returns `{ color, alpha, surface }`; `surface` is what a translucent colour
 * is painted *on*, which globals.css relies on for the accent chips.
 */
function resolve(prop, family, shade, alpha, dark) {
  const a = alpha === undefined ? 1 : alpha;

  if (family === "white" || family === "black") {
    const c = family === "white" ? rgb(255, 255, 255) : rgb(0, 0, 0);
    if (prop === "text") return { color: c, alpha: a, surface: null };
    if (!dark) return { color: c, alpha: a, surface: null };
    // `.dark .bg-white` is the card colour; `/95 /90 /85` follow it.
    if (family === "white" && (a === 1 || a >= 0.85)) {
      return { color: DARK.card, alpha: a >= 1 ? 1 : a, surface: null };
    }
    return { color: c, alpha: a, surface: null };
  }

  if (family === "slate") {
    if (!dark) return { color: PALETTE.slate[shade], alpha: a, surface: null };
    if (prop === "text") {
      if (DARK.lightCopy[shade]) return { color: DARK.lightCopy[shade], alpha: a, surface: null };
      return { color: DARK.slate[shade], alpha: a, surface: null };
    }
    if (DARK.darkPanel[shade]) return { color: DARK.darkPanel[shade], alpha: 1, surface: null };
    return { color: DARK.slate[shade], alpha: a, surface: null };
  }

  if (family === "gray") return { color: PALETTE.gray[shade], alpha: a, surface: null };

  if (ACCENTS.includes(family)) {
    if (!dark) return { color: PALETTE[family][shade], alpha: a, surface: null };
    if (prop === "text") {
      if (shade <= 400) return { color: PALETTE[family][shade], alpha: a, surface: null };
      return { color: DARK.ink[family], alpha: a, surface: null };
    }
    if (shade === 50 || shade === 100) {
      return { color: DARK.wash[family], alpha: a * DARK.washAlpha, surface: DARK.card };
    }
    return { color: PALETTE[family][shade], alpha: a, surface: null };
  }
  return null;
}

/* ------------------------------------------------------------ source walk */

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
   (`a ? "bg-x text-y" : "bg-z"`), so whole quoted strings are read at once. */
function* quotedChunks(src) {
  const re = /(["'`])(?:(?!\1)[\s\S])*?\1/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[0].slice(1, -1);
    if (!/\b(?:text|bg)-[a-z]/.test(body)) continue;
    yield { body, line: src.slice(0, m.index).split("\n").length };
  }
}

const STATE = /^(dark|hover|focus|focus-visible|active|group-hover|disabled|enabled)$/;

/** Split a class string into one branch per ternary arm, then per state. */
function branchesOf(body) {
  const out = [];
  for (const arm of body.split(/\s+\?\s+|\s+:\s+/)) {
    let cur = { mods: [], tokens: [] };
    for (const raw of arm.split(/\s+/)) {
      const t = raw.replace(/^[`'"]+|[`'"]+$/g, "").replace(/[${}]/g, " ").trim();
      if (!t) continue;
      const parts = t.split(":");
      const cls = parts[parts.length - 1];
      const mods = parts.slice(0, -1);
      // `dark:` tokens stay in the same branch: they *override* the base
      // declaration rather than forming a pair of their own. Every other state
      // (hover, focus, active, disabled) is judged as its own combination.
      const state = mods.some((m) => STATE.test(m) && m !== "dark");
      if (state && cur.tokens.length) {
        out.push(cur);
        cur = { mods: [], tokens: [] };
      }
      if (state) cur.mods = mods;
      cur.tokens.push({ token: t, cls, mods });
    }
    if (cur.tokens.length) out.push(cur);
  }
  return out;
}

function parse(tokens) {
  const bgs = [];
  const texts = [];
  const frac = (a) => (a ? +a / 100 : undefined);
  for (const { token, cls, mods } of tokens) {
    // `from-/via-/to-*` are gradient STOPS, i.e. part of the element's own
    // background: judge them with the ink sitting on the element.
    const g = cls.match(/^(from|via|to)-([a-z]+)-(\d{2,3})(?:\/(\d{1,3}))?$/);
    if (g) {
      bgs.push({ token, cls, fam: g[2], shade: +g[3], alpha: frac(g[4]), mods, stop: true });
      continue;
    }
    const m = cls.match(/^(text|bg)-([a-z]+)-(\d{2,3})(?:\/(\d{1,3}))?$/);
    if (m) {
      const hit = { token, cls, fam: m[2], shade: +m[3], alpha: frac(m[4]), mods };
      (m[1] === "bg" ? bgs : texts).push(hit);
      continue;
    }
    const w = cls.match(/^(text|bg)-(white|black)(?:\/(\d{1,3}))?$/);
    if (w) {
      const hit = { token, cls, fam: w[2], shade: null, alpha: frac(w[3]), mods };
      (w[1] === "bg" ? bgs : texts).push(hit);
    }
  }
  return { bgs, texts };
}

/* ------------------------------------------------------------------ audit */

const findings = [];
const MIN = 3;          // below this a fill/ink pair is unreadable
const ALL = process.argv.includes("--all");

/**
 * Patterns the audit deliberately ignores. Each one is a design decision, not
 * a bug — listing them here keeps the report short enough to act on.
 */
function isNoise(bg, tx, mode) {
  const t = tx.cls, b = bg.cls;
  // Faded copy (`text-white/45`, `text-white/10`) on a translucent overlay is
  // decorative: it sits on a deliberately dark panel (the AI console, a hero).
  if (/^text-white\/([0-6]\d)$/.test(t)) return true;
  // `text-slate-300` is the app's "barely there" affordance (chevrons, rules).
  if (mode === "light" && t === "text-slate-300") return true;
  // In light mode `text-slate-400/500` on a white card is the app-wide muted
  // copy style; the dark ramp flips those same classes to accessible values.
  if (mode === "light" && (t === "text-slate-400" || t === "placeholder:text-slate-400" || t === "text-slate-500" || t === "placeholder:text-slate-500")) {
    if (/^bg-(white|slate-(50|100|200))$/.test(b)) return true;
  }
  // A translucent white/black wash with no ink of its own — the fill is the
  // subject (image scrim, progress track), not a background for text.
  if (/^bg-(white|black)\/[0-8]\d$/.test(b) && /^text-(white|black)$/.test(t)) return true;
  // In light mode a translucent white wash is always painted over something
  // darker (a hero image, a dark banner), so the ink inside it is fine.
  if (mode === "light" && /^bg-white\/[0-8]\d$/.test(b)) return true;
  return false;
}

/** True when a translucent fill and its ink are both light (or both dark):
 *  the pair only makes sense on a panel of the opposite tone, which this
 *  single-element model cannot see (e.g. a cyan chip inside the dark AI
 *  console). Judging those here would bury the real findings in noise. */
function needsDarkAncestor(bgOut, fgOut) {
  const l1 = luminance(bgOut), l2 = luminance(fgOut);
  return (l1 > 0.55 && l2 > 0.55) || (l1 < 0.12 && l2 < 0.12);
}

/** `.sb-ink-on-bright` / `.sb-ink-on-warm` (globals.css) pin a dark ink onto a
 *  deliberately bright fill in BOTH themes — see the note in globals.css. */
const BRIGHT_INK = {
  "sb-ink-on-bright": { light: rgb(11, 18, 32), dark: rgb(11, 18, 32) },
  "sb-ink-on-warm": { light: rgb(36, 23, 4), dark: rgb(11, 18, 32) },
};

function check(file, line, bg, tx, mode, label, tokens, stops) {
  // A gradient is only as readable as its lightest stop, so judge the whole
  // set against the worst one rather than each stop in isolation.
  if (stops?.length) {
    let worst = null;
    for (const stop of stops) {
      const before = findings.length;
      check(file, line, stop, tx, mode, label, tokens, null);
      if (findings.length > before) worst = worst ?? stop;
    }
    if (!worst) {
      // none of the individual stops failed on their own — that is the answer
      for (const stop of stops) {
        const r = resolve("bg", stop.fam, stop.shade, stop.alpha, mode === "dark");
        if (!r?.color) continue;
        const base = r.surface || (mode === "dark" ? DARK.page : rgb(248, 250, 252));
        const out = r.alpha < 1 ? over(r.color, base, r.alpha) : r.color;
        if (!worst || luminance(out) > luminance(worst.out)) worst = { ...stop, out };
      }
    }
    return worst ? check(file, line, worst, tx, mode, label, tokens, null) : undefined;
  }
  const rBg = resolve("bg", bg.fam, bg.shade, bg.alpha, mode === "dark");
  const helper = tokens.map((t) => t.cls).find((c) => BRIGHT_INK[c]);
  const rTx = helper
    ? { color: BRIGHT_INK[helper][mode], alpha: 1, surface: null }
    : resolve("text", tx.fam, tx.shade, tx.alpha, mode === "dark");
  if (!rBg?.color || !rTx?.color) return;
  const base = rBg.surface || (mode === "dark" ? DARK.page : rgb(248, 250, 252));
  const bgOut = rBg.alpha < 1 ? over(rBg.color, base, rBg.alpha) : rBg.color;
  const fgOut = rTx.alpha < 1 ? over(rTx.color, bgOut, rTx.alpha) : rTx.color;
  const ratio = contrast(fgOut, bgOut);
  if (ratio >= MIN) return;
  if (isNoise(bg, tx, mode)) return;
  if ((bg.alpha ?? 1) < 1 && needsDarkAncestor(bgOut, fgOut)) return;
  findings.push({
    file: relative(ROOT, file),
    line,
    mode,
    state: label,
    text: tx.token,
    bg: bg.token,
    ratio,
    fg: hex(fgOut),
    bgc: hex(bgOut),
  });
}

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  for (const chunk of quotedChunks(src)) {
    for (const branch of branchesOf(chunk.body)) {
      const { bgs, texts } = parse(branch.tokens);
      if (!bgs.length || !texts.length) continue;

      const key = (t) => t.mods.find((m) => STATE.test(m)) || "base";
      const last = (list) => {
        const out = {};
        for (const t of list) out[key(t)] = t;    // last declaration wins, as in CSS
        return out;
      };
      const gBg = last(bgs);
      const gTx = last(texts);
      const states = new Set([...bgs, ...texts].map(key));

      const stops = bgs.filter((b) => b.stop);
      for (const mode of ["light", "dark"]) {
        for (const st of states) {
          if (mode === "dark" && st !== "base" && st !== "dark") continue;
          if (mode === "light" && st === "dark") continue;
          // In dark mode a `dark:` declaration always wins, and an element
          // usually declares only one half of the pair, so the other half
          // falls back to the base rule.
          const useBg = mode === "dark" ? gBg.dark || gBg[st] || gBg.base : gBg[st];
          const useTx = mode === "dark" ? gTx.dark || gTx[st] || gTx.base : gTx[st];
          if (!useBg || !useTx) continue;
          check(file, chunk.line, useBg, useTx, mode, st === "base" ? "" : st, branch.tokens, useBg.stop ? stops : null);
        }
      }
    }
  }
}

findings.sort((a, b) => a.ratio - b.ratio);
const seen = new Set();
for (const f of findings) {
  const k = `${f.text}|${f.bg}|${f.state}`;
  if (!ALL) {
    if (seen.has(k)) continue;
    seen.add(k);
  }
  const where = `${f.file}:${f.line}`;
  const state = f.state ? ` [${f.state}]` : "";
  console.log(
    `${f.mode === "dark" ? "dark " : "light"} ${f.ratio.toFixed(2).padStart(5)}:1  ` +
      `${f.text} on ${f.bg}${state}`.padEnd(52) +
      ` ${f.fg} on ${f.bgc}  ${where}`,
  );
}
console.log(`\n${findings.length} unreadable pairs, ${seen.size} distinct.`);
process.exit(findings.length ? 1 : 0);
