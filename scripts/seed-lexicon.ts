/**
 * Put the translation dictionary into the database, on demand.
 *
 * The channel bootstrap already does this on its first tick (`ensureChannelTables`
 * → `installLexicon`), so this script exists for the cases where an operator
 * wants it *now*: a fresh environment, a re-import after the bundled asset
 * changed, or a check that the table really is populated.
 *
 *   npm run lexicon:seed          # import / re-import when the version differs
 *   npm run lexicon:seed -- --status
 *
 * Requires DATABASE_URL, like every other DB script here.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { translationLexicon } from "@/db/schema";
import { lexiconSize, lexiconVersion } from "@/lib/channel/lexicon";
import { installLexicon, installedVersion, loadLexiconOverrides } from "@/lib/channel/lexicon/store";

async function main() {
  const statusOnly = process.argv.includes("--status");
  console.log(`bundled: ${lexiconSize()} terms, version ${lexiconVersion()}`);
  const current = await installedVersion();
  console.log(`installed: ${current ?? "(nothing)"}`);

  if (statusOnly) {
    const [count] = await db.select({ n: sql<number>`count(*)` }).from(translationLexicon);
    const [edited] = await db
      .select({ n: sql<number>`count(*)` })
      .from(translationLexicon)
      .where(eq(translationLexicon.source, "admin"));
    console.log(`rows: ${Number(count?.n ?? 0)} (admin-edited: ${Number(edited?.n ?? 0)})`);
    return;
  }

  const result = await installLexicon();
  if (result.error) {
    console.error(`import failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }
  const edited = await loadLexiconOverrides();
  console.log(
    result.installed
      ? `imported ${result.size} rows (version ${result.version})`
      : `already current (${result.size} rows, version ${result.version})`
  );
  console.log(`admin overrides in effect: ${edited.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
