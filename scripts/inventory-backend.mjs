/** Read every backend/shared source file; report syntax/coverage, never secret values. */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import ts from "typescript";

const roots = ["src/app/api", "src/lib", "src/db", "supabase", "archive/supabase"];
const entrypoints = ["src/proxy.ts", "src/instrumentation.ts", "next.config.ts", "drizzle.config.ts"];
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(`${dir}/${entry.name}`) : /\.(?:ts|tsx|js|mjs|json|sql)$/.test(entry.name) ? [`${dir}/${entry.name}`] : []);
}
const paths = roots.flatMap(files).concat(entrypoints).sort();
const indicators = {
  directRequestReader: /\b(?:req|request)\.(?:json|text|arrayBuffer|formData)\(/,
  directFetch: /\bfetch\(/,
  rawSql: /sql\.raw\(/,
  processLocalMap: /new Map\b/,
  detachedTask: /\bvoid\s*\(async|\bvoid\s+[\w.]+\(/,
  todoOrStub: /\bTODO\b|\bFIXME\b|not implemented/i,
};
const inventory = paths.map((path) => {
  const text = readFileSync(path, "utf8");
  const language = path.endsWith(".sql") ? "sql" : path.endsWith(".json") ? "json" : "typescript";
  const category = path.startsWith("archive/") ? "archived-sql-not-replayed" : path.startsWith("supabase/") ? "active-database-sql" : path.startsWith("src/app/api/") ? "api" : path.startsWith("src/db/") ? "database" : entrypoints.includes(path) ? "runtime-entrypoint-or-config" : "shared-library-including-browser-utilities";
  const base = { path, category, language, lines: text.split("\n").length, bytes: Buffer.byteLength(text), sha256: createHash("sha256").update(text).digest("hex") };
  if (language !== "typescript") {
    let syntaxErrors = null;
    if (language === "json") { try { JSON.parse(text); syntaxErrors = 0; } catch { syntaxErrors = 1; } }
    return { ...base, syntaxErrors, imports: [], handlers: [], reviewIndicators: {}, syntaxMethod: language === "sql" ? "separate optional pglast gate; inventory never executes SQL" : "JSON.parse" };
  }
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const readers = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const call = node.expression;
      if (/^(?:req|request)$/.test(call.expression.getText(ast)) && /^(?:json|text|arrayBuffer|formData)$/.test(call.name.text)) readers.push(ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const imports = ast.statements.filter(ts.isImportDeclaration).map((node) => node.moduleSpecifier.text);
  const handlers = path.startsWith("src/app/api/") ? [...text.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((m) => m[1]) : [];
  const hits = Object.fromEntries(Object.entries(indicators).map(([key, pattern]) => [key, text.split("\n").flatMap((line, index) => pattern.test(line) ? [index + 1] : [])]).filter(([, value]) => value.length));
  if (readers.length) hits.directRequestReader = readers; else delete hits.directRequestReader;
  return { ...base, syntaxErrors: ast.parseDiagnostics.length, imports, handlers, reviewIndicators: hits, syntaxMethod: "TypeScript AST" };
});
const summary = { files: inventory.length, typescriptFiles: inventory.filter((f) => f.language === "typescript").length, jsonFiles: inventory.filter((f) => f.language === "json").length, sqlFiles: inventory.filter((f) => f.language === "sql").length, activeSqlFiles: inventory.filter((f) => f.category === "active-database-sql").length, archivedSqlFiles: inventory.filter((f) => f.category === "archived-sql-not-replayed").length, lines: inventory.reduce((n, f) => n + f.lines, 0), apiRouteFiles: inventory.filter((f) => f.path.endsWith("/route.ts")).length, handlers: inventory.reduce((n, f) => n + f.handlers.length, 0), syntaxErrors: inventory.reduce((n, f) => n + (f.syntaxErrors ?? 0), 0), directRequestReaderFiles: inventory.filter((f) => f.reviewIndicators.directRequestReader).map((f) => f.path) };
const output = process.argv[2] ?? "test-results/backend/backend-file-inventory.json";
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), scope: roots.concat(entrypoints), method: "All scoped files read and hashed. TS/JS parsed with TypeScript, JSON with JSON.parse; SQL requires the separate optional pglast gate (inventory syntaxErrors:null means not parsed here). Indicators are review aids, not proof of bugs or manual line-by-line verification. tsc verifies imports/types; regression suites verify behavior. Archived SQL is inventoried only, never replayed.", summary, files: inventory }, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (summary.syntaxErrors || summary.directRequestReaderFiles.length) process.exitCode = 1;
