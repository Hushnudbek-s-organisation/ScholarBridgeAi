/**
 * §3 — the premium design system exists as SHARED, verifiable primitives,
 * not a pile of per-page inline styles. Static guard + real rendered proof.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusPill } from "../src/components/ui/StatusPill";
import { ActionBar } from "../src/components/ui/ActionBar";
import { DESIGN_SYSTEM, TYPOGRAPHY_TOKENS, MOTION_TOKENS, UI_COLORS } from "../src/components/ui/tokens";

const read = (p: string) => readFileSync(p, "utf8");
let passed = 0; const failures: string[] = [];
const check = (n: string, f: () => void) => {
  try { f(); passed++; console.log(`  ✓ ${n}`); }
  catch (e) { failures.push(`${n}: ${(e as Error).message}`); console.log(`  ✗ ${n}`); }
};
const css = read("src/app/globals.css");

console.log("\n§3 Shared design system");
check("all colour roles + surface tiers + text ramp are tokenised", () => {
  for (const k of ["canvas", "surface", "well", "control", "border", "focus", "primary", "success", "warning", "danger", "display", "heading", "body", "muted"]) {
    assert.ok((UI_COLORS as Record<string, string>)[k], `missing UI_COLORS.${k}`);
  }
  assert.deepEqual([...DESIGN_SYSTEM.surfaces], ["canvas", "surface", "well", "control"]);
  assert.equal(DESIGN_SYSTEM.containerMaxPx, 1200);
});
check("typography scale, weights and line-heights are shared tokens", () => {
  for (const k of ["display", "h1", "h2", "h3", "h4", "body", "caption", "eyebrow"]) {
    assert.match((TYPOGRAPHY_TOKENS as Record<string, string>)[k], /sb-type-/);
  }
  assert.ok(MOTION_TOKENS.duration.fast < MOTION_TOKENS.duration.page);
});
check("focus is globally visible and never changes layout (outline, not border)", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--sb-focus\)/);
  assert.match(css, /outline-offset:\s*2px/);
});
check("reduced motion is a global ZERO-SPECIFICITY catch-all, not only two components", () => {
  // `:where(...)` keeps the catch-all at zero specificity so longstanding
  // component rules (e.g. the campus marquee) still win. A bare universal
  // selector overrode them and broke lazy image loading in E2E.
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*:where\(\*, \*::before, \*::after\)/);
  assert.match(css, /scroll-behavior:\s*auto\s*!important/);
});
check("blur has a solid fallback and is gated by @supports", () => {
  assert.match(css, /\.sb-glass\s*\{\s*background-color:\s*var\(--sb-surface\)/);
  assert.match(css, /@supports \(backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /backdrop-filter: blur\(12px\)/);
});
check("hover uses transform only (no layout shift) and disabled/reduced-motion are safe", () => {
  const block = css.slice(css.indexOf(".sb-hover-lift"));
  assert.match(block, /transition: transform/);
  assert.match(block, /:hover \{ transform: translateY\(-2px\); \}/);
  assert.match(block, /:disabled[^}]*cursor: not-allowed/);
  assert.match(block, /prefers-reduced-motion: reduce\)[\s\S]{0,300}transform: none/);
});
check("one container width, safe area and sticky primary clearance on mobile", () => {
  assert.match(css, /\.sb-container \{[\s\S]*?max-width: 1200px/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /\.sb-primary-sticky/);
});
check("status is never colour alone — rendered pill has visible label AND icon", () => {
  for (const tone of ["success", "warning", "error", "info", "pending"] as const) {
    const html = renderToStaticMarkup(React.createElement(StatusPill, { tone, label: "Hujjat kutilmoqda" }));
    assert.match(html, /Hujjat kutilmoqda/, `${tone} must show words`);
    assert.match(html, /aria-hidden="true"[^>]*>[^<]+<\/span>/, `${tone} must show an icon`);
    assert.match(html, new RegExp(`data-status-tone="${tone}"`));
    assert.match(html, /sb-status/);
  }
});
check("ActionBar renders exactly ONE primary plus all secondary actions", () => {
  const html = renderToStaticMarkup(React.createElement(ActionBar, {
    label: "Keyingi qadam",
    primary: { id: "next", label: "Davom etish", onClick: () => {} },
    secondary: [
      { id: "save", label: "Saqlash", onClick: () => {} },
      { id: "compare", label: "Solishtirish", onClick: () => {} },
    ],
  }));
  assert.equal((html.match(/data-action="primary"/g) ?? []).length, 1);
  assert.equal((html.match(/data-action="secondary"/g) ?? []).length, 2);
  assert.match(html, /aria-label="Keyingi qadam"/);
  assert.match(html, /Solishtirish/, "secondary actions stay discoverable");
  assert.match(html, /sb-hover-lift/);
});
check("shared components are exported from the ui barrel", () => {
  const barrel = read("src/components/ui/index.ts");
  assert.match(barrel, /export \{ StatusPill \}/);
  assert.match(barrel, /export \{ ActionBar \}/);
  assert.match(barrel, /DESIGN_SYSTEM/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
