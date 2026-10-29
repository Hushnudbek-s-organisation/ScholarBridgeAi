/**
 * The database half of the translation dictionary.
 *
 * The bundled JSON (`./index.ts`) is what the renderers read: it is synchronous,
 * offline-testable and cannot fail at send time. This module keeps the same
 * 12 732 rows **in the database** as well, for two reasons the operator asked
 * for:
 *
 *   1. the dictionary has to live *in the database* — it is reference data for
 *      the whole app, not just the channel;
 *   2. a gloss can be corrected without a deploy. Rows a human edits get
 *      `source = 'admin'`, and only those override the bundled copy — an import
 *      of a newer PDF can therefore never silently undo an operator's fix.
 *
 * Installation is idempotent and versioned: one row in `translation_lexicon_meta`
 * records which bundled version is installed, so a boot either does nothing or
 * imports once (~13 statements, chunked).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { translationLexicon, translationLexiconMeta } from "@/db/schema";
import { overlay, vocabulary, lexiconVersion } from "./index";

/** Rows per INSERT: large enough to be quick, small enough to stay one query. */
const CHUNK = 400;

export interface LexiconInstallResult {
  installed: boolean;
  /** Rows now in the table (0 when the import did not run). */
  size: number;
  version: string;
  error?: string;
}

export async function installedVersion(): Promise<string | null> {
  try {
    const [row] = await db
      .select({ value: translationLexiconMeta.value })
      .from(translationLexiconMeta)
      .where(eq(translationLexiconMeta.key, "version"))
      .limit(1);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Copy the bundled dictionary into `translation_lexicon` when the installed
 * version differs. Never deletes admin rows: the delete is scoped to
 * `source = 'pdf'`.
 */
export async function installLexicon(): Promise<LexiconInstallResult> {
  const version = lexiconVersion();
  try {
    const current = await installedVersion();
    if (current === version) {
      const [count] = await db.select({ n: sql<number>`count(*)` }).from(translationLexicon);
      return { installed: false, size: Number(count?.n ?? 0), version };
    }

    await db.delete(translationLexicon).where(eq(translationLexicon.source, "pdf"));
    const rows = vocabulary();
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.insert(translationLexicon).values(rows.slice(i, i + CHUNK));
    }
    await db
      .insert(translationLexiconMeta)
      .values({ key: "version", value: version })
      .onConflictDoUpdate({
        target: translationLexiconMeta.key,
        set: { value: version, updatedAt: new Date() },
      });
    const [count] = await db.select({ n: sql<number>`count(*)` }).from(translationLexicon);
    return { installed: true, size: Number(count?.n ?? 0), version };
  } catch (error) {
    // A missing dictionary is a degraded channel, never a broken one: the
    // bundled copy still translates.
    return {
      installed: false,
      size: 0,
      version,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Push the admin-edited glosses into the in-memory overlay the translator
 * reads. Called once per publisher tick (never per post), so an operator's fix
 * takes effect on the next message without a restart.
 */
export async function refreshOverlay(): Promise<number> {
  const rows = await loadLexiconOverrides();
  overlay(rows.map((row) => ({ key: row.key, en: row.en, uz: row.uz, ru: row.ru })));
  return rows.length;
}

/** Glosses a human edited in the database — the ones that win over the bundle. */
export async function loadLexiconOverrides(): Promise<
  Array<{ key: string; en: string; uz: string; ru: string | null }>
> {
  try {
    return await db
      .select({
        key: translationLexicon.key,
        en: translationLexicon.en,
        uz: translationLexicon.uz,
        ru: translationLexicon.ru,
      })
      .from(translationLexicon)
      .where(and(eq(translationLexicon.source, "admin"), sql`${translationLexicon.uz} <> ''`));
  } catch {
    return [];
  }
}
