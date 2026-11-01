#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import colors from "tailwindcss/colors";

/** Tailwind 4 palettes are OKLCH; convert them to linear sRGB luminance. */
function contrastWithWhite(oklch) {
  const match = oklch.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return null;
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const hue = Number(match[3]) * Math.PI / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((value) => Math.max(0, Math.min(1, value)));
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return 1.05 / (luminance + 0.05);
}

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
});
const failures = [];
const fail = (path, message) => failures.push(`${path}: ${message}`);
const BODY_TEXT_TAGS = new Set(["p", "li", "ul", "ol", "input", "textarea", "select", "label", "blockquote"]);
let dynamicGeometryStyles = 0;

for (const path of files("src")) {
  const source = readFileSync(path, "utf8");
  if (/(?:^|[^\w-])(?:[\w-]+:)*text-\[(?:[0-9]|1[01])px\]/.test(source)) fail(path, "text below the 12px minimum");
  if (/(?:^|[^\w-])(?:[\w-]+:)*rounded-(?:sm|md|lg|xl|2xl|3xl)\b/.test(source)) fail(path, "legacy radius utility; use control/surface/overlay");
  if (/rounded-\[[^\]]+\]/.test(source)) fail(path, "arbitrary radius; use a semantic radius token");
  if (/\bred-\d/.test(source)) fail(path, "red danger palette; rose is the single error/danger palette");
  if (/(?:bg|text|border|ring|from|via|to|outline|shadow|stroke|fill|divide|placeholder|ring-offset)-\[#[0-9a-fA-F]{3,8}\]/.test(source)) fail(path, "arbitrary hex colour class");

  // A slate-400 token is valid only when its complete variant chain is dark.
  for (const match of source.matchAll(/(?<![\w-])((?:[A-Za-z0-9_@-]+:)*)text-slate-400\b/g)) {
    if (!match[1].includes("dark:")) fail(path, "low-contrast light-mode text-slate-400");
  }

  const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && BODY_TEXT_TAGS.has(node.tagName.getText(sf))) {
      const className = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sf) === "className");
      if (className?.initializer && /(?<![:\w-])text-xs\b/.test(className.initializer.getText(sf))) {
        fail(path, `${node.tagName.getText(sf)} body/control copy must use text-sm (14px), not text-xs`);
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxClosingElement(node)) &&
        ["button", "motion.button"].includes(node.tagName.getText(sf)) && path !== "src/components/ui/Button.tsx") {
      fail(path, "native button outside ui/Button.tsx");
    }
    if (ts.isStringLiteralLike(node) || [ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind)) {
      if (/^#[0-9a-fA-F]{3,8}$/.test(node.text)) fail(path, `hex literal ${node.text}; use a colour token`);
      // These semantic helpers deliberately replace the white utility with
      // dark ink on bright fills; the dark audit replays that actual cascade.
      const hasSemanticInkOverride = /sb-ink-on-(?:bright|warm)/.test(node.text);
      if (!hasSemanticInkOverride && /(?<![:\w-])text-white(?![\w/-])/.test(node.text)) {
        for (const match of node.text.matchAll(/(?<![:\w-])bg-([a-z]+)-(\d00)\b/g)) {
          const value = colors[match[1]]?.[match[2]];
          const ratio = value ? contrastWithWhite(value) : null;
          if (ratio !== null && ratio < 4.5) {
            fail(path, `${match[0]} with white text is ${ratio.toFixed(2)}:1; WCAG requires 4.5:1`);
          }
        }
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        ["Button", "MotionButton"].includes(node.tagName.getText(sf))) {
      const opening = node.getText(sf);
      if (/(?<!:)bg-indigo-(?:500|700|800)\b/.test(opening) || /(?<!:)hover:bg-indigo-(?:500|600|800)\b/.test(opening)) {
        fail(path, "primary button must use indigo-600 with indigo-700 hover");
      }
    }
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === "style" && node.initializer && ts.isJsxExpression(node.initializer)) {
      const expression = node.initializer.expression;
      if (expression && ts.isObjectLiteralExpression(expression)) {
        for (const property of expression.properties) {
          if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property) && !ts.isSpreadAssignment(property)) continue;
          const name = ts.isSpreadAssignment(property) ? "" : property.name.getText(sf).replace(/["']/g, "");
          if (["color", "background", "backgroundColor", "borderColor", "fill", "stroke"].includes(name)) {
            fail(path, `inline paint style \`${name}\`; use a semantic class`);
          }
        }
        dynamicGeometryStyles += 1;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

const layout = readFileSync("src/app/layout.tsx", "utf8");
if (!layout.includes('from "next/font/local"') || !layout.includes("font-sans") || !layout.includes("text-sm")) {
  fail("src/app/layout.tsx", "self-hosted next/font and the 14px body default are required");
}
for (const legacy of ["src/components/journey/ui.tsx", "src/components/growth/ui.tsx", "src/components/hubs/ui.tsx"]) {
  if (existsSync(legacy)) fail(legacy, "legacy UI-library location still exists");
}

if (failures.length) {
  console.error(`\nDesign-system audit failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`\nDesign-system audit passed: font, type, contrast, buttons, radii, semantic colours and tokens.`);
console.log(`${dynamicGeometryStyles} runtime geometry style objects; no inline paint styles or TSX hex literals.`);
