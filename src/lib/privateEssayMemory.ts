import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { essayVersions } from "@/db/schema";
import { analyzeEssay } from "@/lib/essay";

/**
 * Quietly retain essay material for private profile context. These rows use a
 * deliberately non-public essay type and are excluded from the student-facing
 * essay history API. The deterministic rubric score can inform chancing, but
 * the essay text and score are never returned by the chancing endpoint.
 */
export async function rememberEssayPrivately(input: {
  profileId: number;
  content: string;
  targetName?: string | null;
  prompt?: string | null;
  source: "draft" | "review" | "adaptation";
}) {
  const content = input.content.trim().slice(0, 60_000);
  if (content.length < 50) return;
  const feedback = analyzeEssay(content, { type: "sop", targetName: input.targetName, prompt: input.prompt });
  const [last] = await db.select({ versionNumber: essayVersions.versionNumber })
    .from(essayVersions)
    .where(and(eq(essayVersions.profileId, input.profileId), eq(essayVersions.essayType, "private_memory")))
    .orderBy(desc(essayVersions.versionNumber), desc(essayVersions.id)).limit(1);
  const versionNumber = (last?.versionNumber ?? 0) + 1;
  await db.insert(essayVersions).values({
    profileId: input.profileId,
    universityId: null,
    essayType: "private_memory",
    title: `Private essay memory (${input.source})`,
    content,
    prompt: input.prompt?.slice(0, 2_000) || null,
    targetName: input.targetName?.slice(0, 200) || null,
    wordLimit: null,
    wordCount: feedback.wordCount,
    charCount: content.length,
    versionNumber,
    rubricHook: feedback.scores.hook,
    rubricStructure: feedback.scores.structure,
    rubricSpecificity: feedback.scores.specificity,
    rubricLanguage: feedback.scores.language,
    rubricFit: feedback.scores.fit,
    rubricTotal: feedback.scores.total,
    openForReview: false,
  });
}
