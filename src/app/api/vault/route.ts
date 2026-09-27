import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { answerPrompts, answerVault } from "@/db/schema";
import { clampString } from "@/lib/request";
import { guardStudent, jsonError, readBody, serverError } from "@/lib/growth/api";
import { wordCount } from "@/lib/growth/logic";

export const dynamic = "force-dynamic";

const MAX_ANSWER = 6000;

/**
 * Answer Vault ("write once, reuse everywhere") — ScholarshipOwl's universal
 * application idea, adapted: most scholarship and university forms ask the
 * same 6–8 questions. The student answers each once here (with word counts
 * and hints) and copies the answer into any official form.
 *
 * GET /api/vault?profileId=  → active prompts + the student's answers
 * PUT /api/vault { profileId, promptId, answer }  → save (empty = delete)
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  try {
    const [prompts, answers] = await Promise.all([
      db.select().from(answerPrompts).where(eq(answerPrompts.isActive, true)).orderBy(asc(answerPrompts.sortOrder), asc(answerPrompts.id)),
      db.select().from(answerVault).where(eq(answerVault.profileId, g.value.profileId)),
    ]);
    const byPrompt = new Map(answers.map((a) => [a.promptId, a]));
    const items = prompts.map((p) => {
      const a = byPrompt.get(p.id);
      return {
        promptId: p.id,
        category: p.category,
        question: p.question,
        hint: p.hint,
        wordLimit: p.wordLimit,
        answer: a?.answer ?? "",
        words: wordCount(a?.answer),
        updatedAt: a?.updatedAt ?? null,
      };
    });
    return NextResponse.json({ items, answered: items.filter((i) => i.answer.trim()).length, total: items.length });
  } catch (err) {
    return serverError("vault GET", err);
  }
}

export async function PUT(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const promptId = Number(b.value.promptId);
  if (!Number.isInteger(promptId) || promptId <= 0) return jsonError(400, "promptId is required", "bad_request");
  const answer = clampString(b.value.answer, MAX_ANSWER);
  try {
    const [prompt] = await db.select({ id: answerPrompts.id }).from(answerPrompts).where(eq(answerPrompts.id, promptId)).limit(1);
    if (!prompt) return jsonError(404, "Question not found", "not_found");
    const { profileId } = g.value;
    if (!answer) {
      await db.delete(answerVault).where(and(eq(answerVault.profileId, profileId), eq(answerVault.promptId, promptId)));
      return NextResponse.json({ ok: true, promptId, words: 0 });
    }
    const now = new Date();
    await db
      .insert(answerVault)
      .values({ profileId, promptId, answer, updatedAt: now })
      .onConflictDoUpdate({ target: [answerVault.profileId, answerVault.promptId], set: { answer, updatedAt: now } });
    return NextResponse.json({ ok: true, promptId, words: wordCount(answer), updatedAt: now });
  } catch (err) {
    return serverError("vault PUT", err);
  }
}
