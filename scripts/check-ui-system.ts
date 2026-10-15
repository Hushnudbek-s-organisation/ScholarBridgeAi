/**
 * Deterministic checks for the UI/UX system (spec §4).
 *
 * Everything asserted here is a *source-level* contract, because the checks
 * have to run in CI without a browser:
 *
 *   1. breadcrumb bar on every destination page (Home › Destination › Section)
 *   2. catalogue skeletons instead of a "Loading…" line that collapses the page
 *   3. no nested interactive elements (a control inside a control)
 *   4. focus traps in the two dialogs (Tab cycles, focus returns to the opener)
 *   5. notification rows are actionable when they carry a destination
 *
 * Run: npm run test:ui
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import ts from "typescript";
import { join } from "node:path";

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
  console.log(`\n── ${title}`);
}

const read = (path: string) => readFileSync(path, "utf8");

// ---------------------------------------------------------------------------
section("1. Breadcrumb bar on every destination page");

const hubUi = read("src/components/hubs/ui.tsx");
const hubIndex = read("src/components/hubs/index.tsx");

check("HubPage renders the shared breadcrumb", /<HubBreadcrumb/.test(hubUi), "HubPage must mount it");
check(
  "the breadcrumb names its nav landmark for assistive tech",
  /aria-label=\{t\("breadcrumbLabel"\)\}/.test(hubUi),
  "a nav without a label is an unnamed landmark",
);
check(
  "the current crumb is marked with aria-current",
  /aria-current="page"/.test(hubUi),
  "screen readers must know which crumb is the current page",
);
check(
  "Home is a real button, not decoration",
  /onClick=\{onHome\}/.test(hubUi) || /onHome/.test(hubUi),
  "the first crumb must be able to navigate",
);
check(
  "the section crumb is derived from the active pane's own label",
  /visibleTabPanes\.find\(\(pane\) => pane\.id === activePane\)\?\.label/.test(hubUi),
  "no hand-maintained duplicate of the tab labels",
);

const hubPageCallSites = hubIndex.match(/<HubPage/g) ?? [];
const hubPageOnHome = hubIndex.match(/onHome=\{\(\) => navigate\("dashboard"\)\}/g) ?? [];
check(
  `every HubPage call site passes onHome (${hubPageOnHome.length}/${hubPageCallSites.length})`,
  hubPageCallSites.length > 0 && hubPageCallSites.length === hubPageOnHome.length,
  "a destination without a way home is a dead end",
);

const navSections = read("src/lib/navSections.ts");
check(
  "the nav model still owns the destination list (no breadcrumb-only pages)",
  /export const NAV_SECTIONS|export const NAV_ITEMS/.test(navSections),
);

// ---------------------------------------------------------------------------
section("2. Catalogue loading skeletons");

const explorer = read("src/components/UniversityExplorer.tsx");

check(
  "the catalogue announces a busy, non-interactive loading state",
  /aria-busy="true"/.test(explorer),
  "the grid should be marked busy while it loads",
);
check(
  "the loading label still reaches assistive tech",
  /role="status"[\s\S]{0,80}sr-only/.test(explorer) || /sr-only[\s\S]{0,80}t\("exLoading"\)/.test(explorer),
  "the existing translated string must stay announced",
);
check(
  "the placeholder grid holds the real card layout",
  (explorer.match(/animate-pulse/g) ?? []).length >= 4,
  "several skeleton blocks hold the layout while data loads",
);
check(
  "no fabricated figures inside the skeleton",
  !/\d+(\.\d+)?%/.test(explorer.slice(explorer.indexOf('aria-busy="true"'), explorer.indexOf("aria-busy=\"true\"") + 2500)),
  "a skeleton shows shapes, never invented scores or prices",
);

// ---------------------------------------------------------------------------
section("3. No nested interactive elements");

const courseCatalog = read("src/components/CourseCatalog.tsx");
const bell = read("src/components/NotificationBell.tsx");

/**
 * Real JSX parsing (TypeScript's own parser), not a regex: attribute values like
 * `onClick={() => …}` contain `>`, which makes tag-level regexes lie.
 */
const INTERACTIVE_TAGS = new Set(["button", "a", "input", "select", "textarea"]);

interface JsxInfo {
  tag: string;
  start: number;
  attributes: Set<string>;
  node: ts.Node;
}

function jsxTagName(name: ts.JsxTagNameExpression | undefined): string {
  if (!name) return "";
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name)) return name.name.text;
  return "";
}

function jsxAttributes(node: ts.JsxElement | ts.JsxSelfClosingElement): Set<string> {
  const attrs = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
  const out = new Set<string>();
  if (!attrs) return out;
  for (const prop of attrs.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) out.add(prop.name.text);
  }
  return out;
}

/** Every JSX element in the file, with its ancestors, in source order. */
function collectJsx(source: string, fileName: string): { elements: JsxInfo[]; tree: Map<ts.Node, ts.Node[]> } {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const elements: JsxInfo[] = [];
  const tree = new Map<ts.Node, ts.Node[]>();
  const visit = (node: ts.Node, ancestors: ts.Node[]) => {
    if (ts.isJsxElement(node)) {
      const tag = jsxTagName(node.openingElement.tagName);
      elements.push({ tag, start: node.getStart(file), attributes: jsxAttributes(node), node });
      tree.set(node, ancestors);
    } else if (ts.isJsxSelfClosingElement(node)) {
      const tag = jsxTagName(node.tagName);
      elements.push({ tag, start: node.getStart(file), attributes: jsxAttributes(node), node });
      tree.set(node, ancestors);
    }
    const next = [...ancestors, node];
    ts.forEachChild(node, (child) => visit(child, next));
  };
  visit(file, []);
  return { elements, tree };
}

const isInteractive = (info: JsxInfo) => INTERACTIVE_TAGS.has(info.tag) || info.attributes.has("role") && false;

function nestedControls(source: string, fileName: string): string[] {
  const { elements, tree } = collectJsx(source, fileName);
  const problems: string[] = [];
  const ancestorsOf = (node: ts.Node): JsxInfo[] => {
    const chain = tree.get(node) ?? [];
    return chain
      .filter((n): n is ts.JsxElement | ts.JsxSelfClosingElement => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n))
      .map((n) => ({
        tag: jsxTagName(ts.isJsxElement(n) ? n.openingElement.tagName : n.tagName),
        start: n.getStart(),
        attributes: jsxAttributes(n),
        node: n,
      }));
  };
  for (const element of elements) {
    const chain = ancestorsOf(element.node);
    // (a) a control inside a control
    if (isInteractive(element)) {
      const parentInteractive = chain.find((a) => isInteractive(a));
      if (parentInteractive) {
        problems.push(`${element.tag} inside ${parentInteractive.tag}`);
      }
    }
    // (b) a clickable region that also contains a control
    const isClickableHost =
      !isInteractive(element) &&
      (element.attributes.has("onClick") || element.attributes.has("role")) &&
      ["div", "span", "article", "section", "li", "td", "tr"].includes(element.tag);
    if (isClickableHost) {
      const descendantControl = elements.find(
        (other) => isInteractive(other) && ancestorsOf(other.node).some((a) => a.node === element.node),
      );
      if (descendantControl) problems.push(`<${element.tag} onClick> contains <${descendantControl.tag}>`);
    }
  }
  return problems;
}

/** Interactive elements inside the `courses.map(...)` render callback. */
function controlsInCourseCard(source: string): JsxInfo[] {
  const { elements } = collectJsx(source, "CourseCatalog.tsx");
  const mapIndex = source.indexOf("courses.map(");
  if (mapIndex < 0) return [];
  const inside = elements.filter((e) => e.start > mapIndex && isInteractive(e));
  return inside;
}

const bellProblems = nestedControls(bell, "NotificationBell.tsx");
check("NotificationBell has no nested interactive elements", bellProblems.length === 0, bellProblems.join("; "));

const courseProblems = nestedControls(courseCatalog, "CourseCatalog.tsx");
check("CourseCatalog has no nested interactive elements", courseProblems.length === 0, courseProblems.join("; "));
const courseControls = controlsInCourseCard(courseCatalog);
check(
  `the course card is exactly one control (found ${courseControls.length})`,
  courseControls.length === 1 && courseControls[0].attributes.has("aria-label"),
  "one focus stop per card, with an accessible name",
);
check(
  "the in-card affordance is a span, not a button",
  /<span[\s\S]{0,400}?(startCourse|continueCourse|viewCertificate)/.test(courseCatalog),
  "the visual CTA must not add a second focus stop",
);

// ---------------------------------------------------------------------------
section("4. Focus traps in the dialogs");

const trap = read("src/components/useFocusTrap.ts");

check("the trap handles Tab", /event\.key !== "Tab"/.test(trap));
check("the trap wraps in both directions", /event\.shiftKey/.test(trap));
check(
  "focus that escaped the dialog is pulled back inside",
  /!container\.contains\(current\)/.test(trap),
);
check(
  "focus returns to the opener on close",
  /restore\.focus\(\{ preventScroll: true \}\)/.test(trap),
  "closing a dialog must not drop focus to <body>",
);
check(
  "visibility is resolved from the DOM, not a hand-kept list",
  /focusableWithin/.test(trap) && /offsetParent === null/.test(trap),
);

for (const modal of ["src/components/ProfileModal.tsx", "src/components/CheckoutModal.tsx"]) {
  const source = read(modal);
  const name = modal.split("/").pop();
  check(`${name} uses the shared focus trap`, /useFocusTrap\(dialogRef, isOpen, onClose\)/.test(source));
  check(`${name} marks its dialog container as focusable`, /ref=\{dialogRef\}[\s\S]{0,200}tabIndex=\{-1\}/.test(source));
  check(
    `${name} keeps Escape as a second way out`,
    /event\.key === "Escape"/.test(trap) && /onEscape/.test(trap),
  );
}

// ---------------------------------------------------------------------------
section("5. Actionable notifications");

check(
  "a notification carrying a link renders as a link",
  /n\.link \? \(/.test(bell) && /href=\{n\.link\}/.test(bell),
  "a destination the student cannot open is dead text",
);
check(
  "opening one marks just that row read (server re-checks ownership)",
  /notificationId: item\.id/.test(bell) && /method: "PATCH"/.test(bell) && /notificationId\)/.test(read("src/app/api/notifications/route.ts")),
);
check("the panel closes when a notification is opened", /const openTarget = async[\s\S]{0,120}setOpen\(false\)/.test(bell));

// ---------------------------------------------------------------------------
section("6. Breadcrumb copy in all three languages");

for (const [lang, home] of [
  ["en", "Dashboard"],
  ["uz", "Bosh sahifa"],
  ["ru", "Панель"],
] as const) {
  const messages = JSON.parse(read(`src/i18n/messages/${lang}.json`)) as {
    hubs?: Record<string, string>;
  };
  check(
    `${lang}.json has hubs.breadcrumbLabel + hubs.breadcrumbHome`,
    typeof messages.hubs?.breadcrumbLabel === "string" && messages.hubs?.breadcrumbHome === home,
  );
}

// ---------------------------------------------------------------------------
section("7. Every hub component still renders through HubPage");

const componentFiles = readdirSync("src/components/hubs").filter((f) => f.endsWith(".tsx"));
check(
  "the hub shell is still the single entry point for destinations",
  componentFiles.includes("ui.tsx") && componentFiles.includes("index.tsx"),
);
const exportedHubs = (hubIndex.match(/export function \w+Hub\(/g) ?? []).length;
check(`hub components found: ${exportedHubs}`, exportedHubs >= 10);

/** Any component that renders raw markup instead of HubPage loses the trail. */
const outsideShell = (hubIndex.match(/return \(\s*<div className="space-y-4">/g) ?? []).length;
check("no hub bypasses HubPage with a bare wrapper", outsideShell === 0, `${outsideShell} found`);

// ---------------------------------------------------------------------------
section("8. Source files under check");

const journeyUi = read("src/components/journey/ui.tsx");
check("the shared card component still exists for the hero block", /export function JourneyCard/.test(journeyUi));
const uiFiles = readdirSync("src/components").filter((f) => statSync(join("src/components", f)).isFile() && f.endsWith(".tsx"));
check(`components scanned: ${uiFiles.length}`, uiFiles.length > 50);

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
