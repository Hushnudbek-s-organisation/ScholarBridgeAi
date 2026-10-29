/**
 * The database half of the channel self-check: read the dictionary's state out
 * of `translation_lexicon`, without ever creating anything.
 *
 * Read-only on purpose. If the table is missing (an older deployment, or a
 * database that has not been bootstrapped yet) the answer is honestly
 * "unavailable" — this function must not turn a status page into a migration.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { translationLexicon } from "@/db/schema";
import { lexiconSize, lexiconVersion } from "./lexicon";
import { installedVersion } from "./lexicon/store";
import { dictionaryStatusOf, type DictionaryStatus } from "./selfcheck";

/** What the panel shows: the rules plus what this deployment actually has. */
export async function dictionaryStatus(): Promise<DictionaryStatus> {
  const bundledVersion = lexiconVersion();
  const bundledTerms = lexiconSize();
  try {
    const [row] = await db
      .select({
        n: sql<number>`count(*)`,
        // "How much of this is a human's work?" — admin rows are never
        // overwritten by an import, so the count is worth showing.
        edited: sql<number>`count(*) filter (where source = 'admin')`,
      })
      .from(translationLexicon);
    return dictionaryStatusOf({
      rows: Number(row?.n ?? 0),
      adminRows: Number(row?.edited ?? 0),
      installedVersion: await installedVersion(),
      bundledVersion,
      bundledTerms,
    });
  } catch {
    return dictionaryStatusOf({
      rows: 0,
      adminRows: 0,
      installedVersion: null,
      bundledVersion,
      bundledTerms,
      readFailed: true,
    });
  }
}
