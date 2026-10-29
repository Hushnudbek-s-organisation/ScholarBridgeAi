import { NextResponse } from "next/server";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { db } from "@/db";
import { translationLexicon } from "@/db/schema";
import { bundledGloss, lexiconSize, lexiconVersion, LEXICON_META } from "@/lib/channel/lexicon";
import { checkGloss, installedVersion, installLexicon, refreshOverlay } from "@/lib/channel/lexicon/store";
import { writeChannelAudit } from "@/lib/channel/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin → Kanal → Lug'at.
 *
 * The channel translates English database text with the academic dictionary
 * (`src/lib/channel/lexicon`). That dictionary is bundled *and* stored in
 * `translation_lexicon`, and this endpoint is how an operator uses it:
 *
 *   GET  ?q=          search the table (headword or gloss), first 40 rows
 *   POST {action}     install | save | reset
 *
 * A row an operator edits is written with `source = 'admin'`, which makes it
 * override the bundled gloss at render time (the publisher reloads those rows
 * once per tick). `reset` deletes that row, so the bundled text is back.
 * Nothing here can add a *wrong* translation to a post: the translator only
 * emits a gloss that is on file, and an admin row is by definition on file.
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") ?? "").trim();
    const meta = {
      bundled: lexiconSize(),
      version: lexiconVersion(),
      installed: await installedVersion(),
      pages: LEXICON_META.pages,
      source: LEXICON_META.source,
    };
    let rows: Array<{ key: string; en: string; uz: string; ru: string | null; source: string }> = [];
    let total = 0;
    let edited = 0;
    try {
      const [count] = await db.select({ n: sql<number>`count(*)` }).from(translationLexicon);
      total = Number(count?.n ?? 0);
      const [edits] = await db
        .select({ n: sql<number>`count(*)` })
        .from(translationLexicon)
        .where(eq(translationLexicon.source, "admin"));
      edited = Number(edits?.n ?? 0);
      if (q) {
        const pattern = `%${q.replace(/[%_]/g, "")}%`;
        rows = await db
          .select({
            key: translationLexicon.key,
            en: translationLexicon.en,
            uz: translationLexicon.uz,
            ru: translationLexicon.ru,
            source: translationLexicon.source,
          })
          .from(translationLexicon)
          .where(or(ilike(translationLexicon.en, pattern), ilike(translationLexicon.uz, pattern)))
          /**
           * The term you searched for comes first, then the ones that start with
           * it, then operator edits, then the rest: searching "tuition" used to
           * bury `tuition` itself under a page of longer phrases.
           */
          .orderBy(
            sql`case when ${translationLexicon.key} = ${q.toLowerCase()} then 0
                     when ${translationLexicon.key} like ${q.toLowerCase() + "%"} then 1
                     when ${translationLexicon.source} = 'admin' then 2 else 3 end`,
            asc(translationLexicon.en)
          )
          .limit(40);
      } else {
        rows = await db
          .select({
            key: translationLexicon.key,
            en: translationLexicon.en,
            uz: translationLexicon.uz,
            ru: translationLexicon.ru,
            source: translationLexicon.source,
          })
          .from(translationLexicon)
          .where(eq(translationLexicon.source, "admin"))
          .orderBy(asc(translationLexicon.en))
          .limit(40);
      }
    } catch {
      // A database without the table yet is a normal first-boot state.
    }
    return NextResponse.json({ ok: true, meta, rows, total, edited, query: q });
  } catch (error) {
    return serverError("channel lexicon", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const action = String(body.value.action ?? "");
  if (action !== "install" && action !== "save" && action !== "reset") {
    return jsonError(400, "Unknown action", "bad_action");
  }
  try {
    if (action === "install") {
      const result = await installLexicon();
      if (result.error) return jsonError(500, result.error, "install_failed");
      await refreshOverlay();
      await writeChannelAudit({
        actorProfileId: guard.value.profile.id,
        action: "lexicon_install",
        entity: "settings",
        entityId: "translation_lexicon",
        after: { size: result.size, version: result.version, installed: result.installed },
      });
      return NextResponse.json({ ok: true, result });
    }

    const key = String(body.value.key ?? "").trim().toLowerCase().slice(0, 120);
    if (!key) return jsonError(400, "key is required", "bad_key");

    if (action === "reset") {
      /**
       * "Restore original" puts the dictionary's own gloss back. It deletes the
       * row only when the dictionary has never heard of the headword (an entry
       * the operator added themselves) — otherwise the term would vanish from
       * the table while the bundled copy still translated it, which is the kind
       * of half-state nobody can reason about later.
       */
      const bundled = bundledGloss(key);
      if (bundled) {
        await db
          .insert(translationLexicon)
          .values({
            key,
            en: bundled.en,
            uz: bundled.uz,
            ru: bundled.ru ?? null,
            source: "pdf",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: translationLexicon.key,
            set: { en: bundled.en, uz: bundled.uz, ru: bundled.ru ?? null, source: "pdf", updatedAt: new Date() },
          });
      } else {
        await db
          .delete(translationLexicon)
          .where(and(eq(translationLexicon.key, key), eq(translationLexicon.source, "admin")));
      }
      await refreshOverlay();
      await writeChannelAudit({
        actorProfileId: guard.value.profile.id,
        action: "lexicon_reset",
        entity: "settings",
        entityId: key,
        after: { restored: Boolean(bundled), removed: bundled ? 0 : 1 },
      });
      return NextResponse.json({ ok: true, restored: Boolean(bundled), removed: bundled ? 0 : 1 });
    }

    // `uz` is what the post will say, so it is validated here rather than
    // trusted — with the renderer's own rule (`checkGloss`).
    const gloss = checkGloss(body.value.uz);
    if (!gloss.ok) {
      const message =
        gloss.error === "bad_gloss_english"
          ? "The gloss still looks like English"
          : gloss.error === "bad_gloss_letters"
            ? "The gloss must contain words"
            : "The Uzbek gloss cannot be empty";
      return jsonError(400, message, gloss.error);
    }
    const uz = gloss.uz;
    const en = String(body.value.en ?? key).slice(0, 160);
    const ru = String(body.value.ru ?? "").replace(/\s+/g, " ").trim().slice(0, 160) || null;

    await db
      .insert(translationLexicon)
      .values({ key, en, uz, ru, source: "admin", updatedAt: new Date() })
      .onConflictDoUpdate({
        target: translationLexicon.key,
        set: { en, uz, ru, source: "admin", updatedAt: new Date() },
      });
    await refreshOverlay();
    await writeChannelAudit({
      actorProfileId: guard.value.profile.id,
      action: "lexicon_save",
      entity: "settings",
      entityId: key,
      after: { en, uz },
    });
    return NextResponse.json({ ok: true, key, uz });
  } catch (error) {
    return serverError("channel lexicon save", error);
  }
}
