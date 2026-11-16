import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schollyEvents, studentProfiles } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireProfileAccess } from "@/lib/auth";
import { awardPoints } from "@/lib/gamification";
import { readJsonBody } from "@/lib/request";
import { logSchollyEvent } from "@/lib/scholly-events";
import { currentSchollyDay } from "@/lib/scholly-mission-store.server";
import { gradeQuiz, publicQuiz, type QuizResult } from "@/lib/scholly-quiz.server";

type QuizReader = Pick<typeof db, "select">;

async function getResult(profileId: number, day: string, reader: QuizReader): Promise<QuizResult | null> {
  const [event] = await reader.select({ payload: schollyEvents.payload }).from(schollyEvents)
    .where(and(
      eq(schollyEvents.userId, profileId),
      eq(schollyEvents.type, "quiz_done"),
      sql`${schollyEvents.payload}->>'day' = ${day}`,
    )).limit(1);
  return (event?.payload as { result: QuizResult } | undefined)?.result ?? null;
}

function unavailable(error: unknown) {
  console.error("Scholly daily quiz error:", error);
  return privateNoStoreJson({ code: "quiz_unavailable" }, { status: 500 });
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const access = await requireProfileAccess(req, params.get("profileId"));
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    const profileId = access.session.profile.id;
    if (access.targetId !== profileId) return privateNoStoreJson({ code: "forbidden" }, { status: 403 });

    const requestedLocale = params.get("locale");
    const locale = requestedLocale && isLocale(requestedLocale) ? requestedLocale : "uz";
    const { day } = await currentSchollyDay(profileId);
    return privateNoStoreJson(publicQuiz(day, locale, await getResult(profileId, day, db)));
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 4096);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const access = await requireProfileAccess(req, parsed.body.profileId);
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    const profileId = access.session.profile.id;
    if (access.targetId !== profileId) return privateNoStoreJson({ code: "forbidden" }, { status: 403 });

    const locale = typeof parsed.body.locale === "string" && isLocale(parsed.body.locale) ? parsed.body.locale : "uz";
    return await db.transaction(async (tx) => {
      // Use the same lock as the shared points ledger so retries and concurrent
      // requests cannot grade or claim another reward for this profile/day.
      const [locked] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
        .where(eq(studentProfiles.id, profileId)).for("no key update").limit(1);
      if (!locked) return privateNoStoreJson({ code: "profile_not_found" }, { status: 404 });

      const { day } = await currentSchollyDay(profileId, new Date(), tx);
      if (parsed.body.day !== day) return privateNoStoreJson({ code: "quiz_day_changed" }, { status: 409 });

      const existing = await getResult(profileId, day, tx);
      if (existing) return privateNoStoreJson(publicQuiz(day, locale, existing));

      const result = gradeQuiz(day, parsed.body.answers);
      if (!result) return privateNoStoreJson({ code: "invalid_quiz_answers" }, { status: 400 });

      await awardPoints(profileId, result.points, "scholly_daily_quiz", Number(day.replace(/-/g, "")), tx);
      await logSchollyEvent(profileId, "quiz_done", { day, points: result.points, result }, tx);
      return privateNoStoreJson(publicQuiz(day, locale, result));
    });
  } catch (error) {
    return unavailable(error);
  }
}
