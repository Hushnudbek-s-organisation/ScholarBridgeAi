#!/usr/bin/env node
/** Whole-repository inventory and narrow static completeness checks.
 * Never equate an inventoried file or rendered button with a tested workflow.
 * No remote services, secrets, migrations or fixture writes are used here.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname } from "node:path";
import ts from "typescript";
import yaml from "js-yaml";

const output = process.argv[2] ?? "test-results/full-audit/file-inventory.json";
const paths = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean))]
  .filter((path) => existsSync(path) && statSync(path).isFile() && path !== output && !path.startsWith("data/site-audit/"));
const routes = paths.filter((p) => /^src\/app\/(?:.*\/)?(?:page|route)\.tsx?$/.test(p))
  .map((p) => p.replace(/^src\/app/, "").replace(/\/(?:page|route)\.tsx?$/, "") || "/");
const findings = [];
const reviewCandidates = [];
const inventory = [];
const counters = { sourceSyntax: 0, jsonSyntax: 0, yamlSyntax: 0, literalInternalLinks: 0, buttonDeclarations: 0, pageFiles: 0, apiFiles: 0 };
function knownPath(path) {
  return routes.some((route) => new RegExp(`^${route.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+")}/?$`).test(path)) || (existsSync(`public${path}`) && statSync(`public${path}`).isFile());
}
for (const path of paths.sort()) {
  const bytes = readFileSync(path);
  const text = bytes.toString("utf8");
  let check = "inventory_only";
  if (/\.(?:[cm]?[jt]sx?)$/.test(path)) {
    const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : path.endsWith(".jsx") ? ts.ScriptKind.JSX : path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
    for (const d of source.parseDiagnostics) findings.push({ path, line: source.getLineAndCharacterOfPosition(d.start ?? 0).line + 1, issue: ts.flattenDiagnosticMessageText(d.messageText, " ") });
    check = "source_syntax_checked"; counters.sourceSyntax++;
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        const attrs = node.attributes.properties;
        const attr = (name) => attrs.find((a) => ts.isJsxAttribute(a) && a.name.getText(source) === name);
        const href = attr("href")?.initializer;
        const line = source.getLineAndCharacterOfPosition(node.pos).line + 1;
        if (href && ts.isStringLiteral(href)) {
          const url = href.text;
          if (url === "" || url === "#") findings.push({ path, line, issue: "Empty/inert literal link" });
          if (url.startsWith("/") && !url.startsWith("//")) {
            counters.literalInternalLinks++;
            if (!knownPath(url.split(/[?#]/)[0])) findings.push({ path, line, issue: `Unresolved literal internal link: ${url}` });
          }
        }
        if (["button", "Button", "MotionButton", "motion.button"].includes(tag)) {
          counters.buttonDeclarations++;
          const onClick = attr("onClick")?.initializer;
          const expression = onClick && ts.isJsxExpression(onClick) ? onClick.expression : undefined;
          if (expression && (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) && ts.isBlock(expression.body) && expression.body.statements.length === 0) findings.push({ path, line, issue: "Empty click handler" });
          const type = attr("type")?.initializer;
          const formAction = type && ts.isStringLiteral(type) && ["submit", "reset"].includes(type.text);
          if (!onClick && !formAction && !attr("onKeyDown") && !attr("onPointerDown") && !attr("onMouseDown") && !attr("disabled") && !attrs.some(ts.isJsxSpreadAttribute) && path !== "src/components/ui/Button.tsx") {
            reviewCandidates.push({ path, line, issue: "Button without a directly declared action; inspect parent event delegation/form/component contract" });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  } else if (extname(path) === ".json") {
    try {
      if (path.endsWith("tsconfig.json")) {
        const parsed = ts.parseConfigFileTextToJson(path, text); if (parsed.error) throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, " "));
      } else JSON.parse(text);
      counters.jsonSyntax++; check = "json_syntax_checked";
    } catch (error) { findings.push({ path, issue: `JSON syntax: ${error.message}` }); }
  } else if (/\.ya?ml$/.test(path)) {
    try { yaml.loadAll(text); counters.yamlSyntax++; check = "yaml_syntax_checked"; }
    catch (error) { findings.push({ path, issue: `YAML syntax: ${error.message}` }); }
  }
  if (/^src\/app\/(?:.*\/)?page\.tsx$/.test(path)) counters.pageFiles++;
  if (/src\/app\/api\/.*\/route\.ts$/.test(path)) counters.apiFiles++;
  inventory.push({ path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), check });
}
const report = { generatedAt: new Date().toISOString(), scope: "Tracked and non-ignored working files, excluding this output and generated site-audit artefacts. Syntax/link inventory is NOT proof of runtime, visual, factual or every-button behavior coverage.", files: inventory.length, counters, findings, reviewCandidates, inventory };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ files: report.files, counters, findings, reviewCandidates, report: output }, null, 2));
process.exitCode = findings.length ? 1 : 0;
