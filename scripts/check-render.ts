/**
 * Render smoke test for the Phase 3–4 client components.
 *
 * `npm run build` proves these files COMPILE. It does not prove they RENDER:
 * a component can typecheck perfectly and still throw on first paint because
 * it called `.map` on undefined, read a property of a null object, or hit a
 * conditional branch that only exists when data is absent.
 *
 * These components fetch in useEffect, and effects do not run during
 * server rendering — so this exercises exactly the initial paint: the
 * no-profile state and the loading state. That is the path a user hits first,
 * and the one most likely to crash on a null activeProfile.
 *
 * Run: npm run test:render
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanningStudio } from "../src/components/PlanningStudio";
import { MentorMarketplace } from "../src/components/MentorMarketplace";
import { ParentDashboard } from "../src/components/ParentDashboard";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

/** The component prop shape. Only `id` is read by the fetch calls. */
const profile = { id: 7 } as any;

/** Render and return markup, or the thrown error as a string. */
function render(node: React.ReactElement): { html: string; error: string | null } {
  try {
    return { html: renderToStaticMarkup(node), error: null };
  } catch (e) {
    return { html: "", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

const components: [string, (p: any) => React.ReactElement][] = [
  ["PlanningStudio", (p) => React.createElement(PlanningStudio, { activeProfile: p })],
  ["MentorMarketplace", (p) => React.createElement(MentorMarketplace, { activeProfile: p })],
  ["ParentDashboard", (p) => React.createElement(ParentDashboard, { activeProfile: p })],
];

// ---------------------------------------------------------------------------
section("1. No component throws with no profile selected");

for (const [name, make] of components) {
  const { html, error } = render(make(null));
  check(`${name} renders without a profile`, error === null, error ?? "");
  check(`${name} produces markup`, html.length > 50, `only ${html.length} chars`);
}

section("2. No component throws with a profile selected");

for (const [name, make] of components) {
  const { html, error } = render(make(profile));
  check(`${name} renders with a profile`, error === null, error ?? "");
  check(`${name} produces markup`, html.length > 50, `only ${html.length} chars`);
}

section("3. Each component says what it is");

const planning = render(components[0][1](profile)).html;
check("PlanningStudio names the cost calculator", /cost/i.test(planning));
check("PlanningStudio offers a scholarship tab", /scholarship/i.test(planning));
check("PlanningStudio offers a CV tab", /\bCV\b/.test(planning));
check("PlanningStudio offers a comparison tab", /compar/i.test(planning));

const mentors = render(components[1][1](profile)).html;
check("MentorMarketplace explains the sorting", /sorted by how closely/i.test(mentors));
check("MentorMarketplace has a rate filter", /Max hourly rate/i.test(mentors));

const parent = render(components[2][1](profile)).html;
check("ParentDashboard offers the share toggle", /Share a read-only summary/i.test(parent));
check("ParentDashboard states what is withheld", /never see/i.test(parent));
check("ParentDashboard names essays as withheld", /essay drafts/i.test(parent));
check("ParentDashboard names passwords as withheld", /password/i.test(parent));

section("4. The no-profile state is handled, not crashed");

// The bug this guards against: a component that dereferences activeProfile.id
// during render instead of inside the effect.
const noProfile = render(components[0][1](null));
check("PlanningStudio survives a null profile", noProfile.error === null, noProfile.error ?? "");
// The actual copy is "Sign in to build your plan." — what matters is that it
// explains itself rather than rendering an empty cost table.
check(
  "PlanningStudio explains itself instead of rendering a table",
  /sign in to build your plan/i.test(noProfile.html),
  noProfile.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)
);
check(
  "PlanningStudio renders no cost rows without a profile",
  !/Estimated cost per year/i.test(noProfile.html)
);

section("5. Rendering is deterministic");

const a = render(components[0][1](profile)).html;
const b = render(components[0][1](profile)).html;
check("the same props give the same markup", a === b);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
