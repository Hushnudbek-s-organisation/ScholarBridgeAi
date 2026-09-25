import { NextResponse } from "next/server";
import { db } from "@/db";
import { essayVersions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { readJsonBody, clampString } from "@/lib/request";
import { analyzeEssay, compareVersions, countWords, type EssayType } from "@/lib/essay";

/**
 * Essay versions + rubric (#8).
 *
 * The rubric numbers are computed by src/lib/essay.ts from the text itself —
 * never by a model. Two readers get the same score, and a student who improves
 * a draft can see the number move for a reason they can verify. `aiFeedback`
 * is the only field a model writes.
 */

const ESSAY_TYPES = ["sop", "personal_statement", "why_us", "supplemental", "scholarship"];
const MAX_CHARS = 60_000; // ~9k words, far above any real limit

function parseType(value: unknown): EssayType {
  return ESSAY_TYPES.includes(String(value)) ? (String(value) as EssayType) : "sop";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const type = searchParams.get("essayType");
    const rows = await db
      .select()
      .from(essayVersions)
      .where(
        type
          ? and(eq(essayVersions.profileId, profileId), eq(essayVersions.essayType, parseType(type)))
          : eq(essayVersions.profileId, profileId)
      )
      .orderBy(desc(essayVersions.versionNumber))
      .limit(50);

    return NextResponse.json({ versions: rows });
  } catch (error) {
    console.error("GET /api/essays error:", error);
    return NextResponse.json({ error: "Failed to load essays" }, { status: 500 });
  }
}

/** Save a new version. The score is computed here, not supplied by the client. */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req, 256 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const profileId = Number(body.profileId);
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const content = clampString(body.content, MAX_CHARS);
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Essay text is required" }, { status: 400 });
    }

    const essayType = parseType(body.essayType);
    const wordLimit = body.wordLimit ? Math.min(Number(body.wordLimit) || 0, 5000) : null;
    const targetName = clampString(body.targetName, 200) || null;

    // Score the text server-side. A client-supplied score would be worthless —
    // the whole point is that the rubric cannot be talked into a number.
    const feedback = analyzeEssay(content, {
      type: essayType,
      wordLimit,
      targetName,
    });

    const [last] = await db
      .select()
      .from(essayVersions)
      .where(and(eq(essayVersions.profileId, profileId), eq(essayVersions.essayType, essayType)))
      .orderBy(desc(essayVersions.versionNumber))
      .limit(1);

    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const [row] = await db
      .insert(essayVersions)
      .values({
        profileId,
        universityId: body.universityId ? Number(body.universityId) : null,
        essayType,
        title: clampString(body.title, 200) || `${essayType.replace(/_/g, " ")} v${versionNumber}`,
        content,
        wordCount: feedback.wordCount,
        charCount: content.length,
        versionNumber,
        rubricHook: feedback.scores.hook,
        rubricStructure: feedback.scores.structure,
        rubricSpecificity: feedback.scores.specificity,
        rubricLanguage: feedback.scores.language,
        rubricFit: feedback.scores.fit,
        rubricTotal: feedback.scores.total,
        aiFeedback: clampString(body.aiFeedback, 20_000) || null,
      })
      .returning();

    return NextResponse.json({
      version: row,
      feedback,
      // What changed against the previous draft, so the history is readable.
      comparison: last ? compareVersions(last.content, content) : null,
    });
  } catch (error) {
    console.error("POST /api/essays error:", error);
    return NextResponse.json({ error: "Failed to save essay" }, { status: 500 });
  }
}

/** Score a draft without saving it (the "check my essay" button). */
export async function PUT(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req, 256 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const content = clampString(body.content, MAX_CHARS);
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Essay text is required" }, { status: 400 });
    }

    const feedback = analyzeEssay(content, {
      type: parseType(body.essayType),
      wordLimit: body.wordLimit ? Math.min(Number(body.wordLimit) || 0, 5000) : null,
      targetName: clampString(body.targetName, 200) || null,
    });

    return NextResponse.json({ feedback, wordCount: countWords(content) });
  } catch (error) {
    console.error("PUT /api/essays error:", error);
    return NextResponse.json({ error: "Failed to score essay" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "essay id is required" }, { status: 400 });
    }

    // Row ids are guessable — confirm ownership before deleting (IDOR).
    const [target] = await db.select().from(essayVersions).where(eq(essayVersions.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    await db.delete(essayVersions).where(eq(essayVersions.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/essays error:", error);
    return NextResponse.json({ error: "Failed to delete essay" }, { status: 500 });
  }
}

/**
 * #24 — Peer review toggle.
 *
 * PATCH /api/essays { id, openForReview: boolean }
 *
 * Only the author can open (or close) their own version for peer review.
 * This is deliberately separate from the stateless PUT scorer above — a
 * review flag is persisted state, not a computation.
 */
export async function PATCH(req: Request) {
  try {
    const access = await requireProfileAccess(req, undefined);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const me = access.session.profile.id;
    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const id = Number(parsed.body.id);
    if (!id) {
      return NextResponse.json({ error: "essay id is required" }, { status: 400 });
    }
    const open = parsed.body.openForReview === true;

    const rows = await db
      .select()
      .from(essayVersions)
      .where(and(eq(essayVersions.id, id), eq(essayVersions.profileId, me)))
      .limit(1);
    if (!rows.length) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }
    await db
      .update(essayVersions)
      .set({ openForReview: open })
      .where(eq(essayVersions.id, id));
    return NextResponse.json({ id, openForReview: open });
  } catch (error) {
    console.error("PATCH /api/essays error:", error);
    return NextResponse.json({ error: "Failed to update essay" }, { status: 500 });
  }
}
