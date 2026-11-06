/**
 * Rendered-copy regression guard (not just translation-key parity).
 *
 * Checks UZ/RU/EN values for a few known mixed strings, the year formatter,
 * and the university detail surfaces that display calendar years.
 *
 * Run: npm run test:rendered-copy
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatYear } from "../src/lib/format";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectStrings(item, out);
  return out;
}

console.log("\nRendered copy — UZ/RU/EN guard");

check("calendar years are never grouped as 2,026 / 1,861", () => {
  assert.equal(formatYear(2026), "2026");
  assert.equal(formatYear(1861), "1861");
  assert.equal(formatYear("2027"), "2027");
  assert.equal(formatYear(null, { placeholder: "—" }), "—");
  assert.equal(formatYear(2026.5, { placeholder: "—" }), "—");
  assert.equal(formatYear(26, { placeholder: "—" }), "—");
  for (const locale of ["en", "uz", "ru"]) {
    assert.doesNotMatch(read(`src/i18n/messages/${locale}.json`), /2,026|1,861/);
  }
});

check("UniversityDetail uses formatYear for QS edition and founding year", () => {
  const source = read("src/components/UniversityDetail.tsx");
  assert.match(source, /formatYear\(uni\.qsRankYear\)/);
  assert.match(source, /formatYear\(uni\.foundedYear/);
  assert.doesNotMatch(source, /foundedYear\)\.toLocaleString|foundedYear.*Intl\.NumberFormat/);
});

check("no mixed 'All Countries' capitalization remains in EN messages", () => {
  const en = read("src/i18n/messages/en.json");
  assert.doesNotMatch(en, /All Countries/);
  assert.match(en, /All countries \(\{count\}\)/);
});

check("UZ/RU do not render English 'days left' or 'All Countries' strings", () => {
  for (const locale of ["uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`)) as Record<string, unknown>;
    const strings = collectStrings(messages).join("\n");
    assert.doesNotMatch(strings, /\bdays left\b/i);
    assert.doesNotMatch(strings, /All Countries/i);
    assert.doesNotMatch(strings, /25 days left/i);
  }
});

check("known day-left / country labels are translated, not bare English in UZ/RU", () => {
  const uz = JSON.parse(read("src/i18n/messages/uz.json")) as any;
  const ru = JSON.parse(read("src/i18n/messages/ru.json")) as any;
  assert.match(uz.journey.daysLeft, /kun qoldi/);
  assert.match(ru.journey.daysLeft, /Осталось/);
  assert.match(uz.chancing.filterAll, /Barcha davlatlar/);
  assert.match(ru.chancing.filterAll, /Все страны/);
});

check("public features copy stays honest in all three locales", () => {
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`)) as any;
    const strings = collectStrings(messages.publicFeatures).join("\n");
    assert.doesNotMatch(
      strings,
      /(?<!We do not )estimate your admission chance|(?<!We do not )show a personal admission probability|qabul ehtimolini hisoblaydi|оценивает шанс поступления/i
    );
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
