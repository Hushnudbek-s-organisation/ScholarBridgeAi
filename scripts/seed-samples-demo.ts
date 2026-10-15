/**
 * DEMO SEED for the gold-standard sample library (Phase 7).
 *
 * `npm run seed:samples:demo` creates (or refreshes) ONE clearly-marked demo
 * student built from the static exemplars, so an administrator can open every
 * authoring surface and see the structure the library teaches:
 *
 *   • profile fields extracted from `SAMPLE_ONBOARDING_CV_IELTS` using the same
 *     deterministic extractor the auto-fill feature uses (no AI, no invention);
 *   • an SOP draft from `SAMPLE_SOP_MASTERS_AI` (title prefixed with [SAMPLE]);
 *   • a scholarship essay from `SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING`;
 *   • five Answer-Vault style short answers from `SAMPLE_VAULT_SHORT_ANSWERS`.
 *
 * Idempotent: the same email is reused, and existing rows are updated in place
 * rather than duplicated. It NEVER touches a real student: the demo account is
 * identified by its email (`demo.samples@example.uz`) and its name carries the
 * `[DEMO]` marker. Never run this against a production database that has real
 * students with that address (the address is reserved for this purpose).
 *
 * Usage: DATABASE_URL=… npm run seed:samples:demo
 */
import "./lib/env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { essayVersions, studentProfiles, userDocuments } from "@/db/schema";
import { extractDeterministicProfileFacts } from "@/lib/profileExtractor";
import {
  SAMPLE_ONBOARDING_CV_IELTS,
  SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING,
  SAMPLE_SOP_MASTERS_AI,
  SAMPLE_VAULT_SHORT_ANSWERS,
} from "@/lib/samples/exemplars";

const DEMO_EMAIL = "demo.samples@example.uz";
const DEMO_NAME = "[DEMO] Sample Library Student";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

async function main() {
  const facts = extractDeterministicProfileFacts(SAMPLE_ONBOARDING_CV_IELTS.text);

  const values = {
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    country: facts.country ?? "Uzbekistan",
    degreeLevel: facts.degreeLevel ?? "Bachelor",
    targetMajor: facts.targetMajor ?? "Computer Science",
    gpa: facts.gpa ?? null,
    gpaScale: facts.gpaScale ?? null,
    ieltsScore: facts.ieltsScore ?? null,
    toeflScore: facts.toeflScore ?? null,
    satScore: facts.satScore ?? null,
    greScore: facts.greScore ?? null,
    researchPublications: facts.researchPublications ?? null,
    // The extractor returns lists; the profile column is free text.
    extracurriculars: [...(facts.leadership ?? []), ...(facts.extracurriculars ?? [])].join("\n") || null,
  };

  const [existing] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.email, DEMO_EMAIL))
    .limit(1);

  let profileId: number;
  if (existing) {
    await db.update(studentProfiles).set(values).where(eq(studentProfiles.id, existing.id));
    profileId = existing.id;
    console.log(`[samples:demo] refreshed profile #${profileId}`);
  } else {
    const [created] = await db.insert(studentProfiles).values(values).returning({ id: studentProfiles.id });
    profileId = created.id;
    console.log(`[samples:demo] created profile #${profileId}`);
  }

  // SOP + scholarship essay: stored as ordinary drafts the student can edit.
  const drafts = [
    { essayType: "sop", sample: SAMPLE_SOP_MASTERS_AI },
    { essayType: "scholarship", sample: SAMPLE_SCHOLARSHIP_ESSAY_EYUF_CHEVENING },
  ] as const;

  for (const { essayType, sample } of drafts) {
    const title = `[SAMPLE] ${sample.title.en}`;
    const rows = await db
      .select({ id: essayVersions.id, title: essayVersions.title })
      .from(essayVersions)
      .where(eq(essayVersions.profileId, profileId));
    const hit = rows.find((r) => r.title === title);
    const payload = {
      profileId,
      essayType,
      title,
      content: sample.text,
      wordCount: wordCount(sample.text),
      charCount: sample.text.length,
    };
    if (hit) {
      await db.update(essayVersions).set(payload).where(eq(essayVersions.id, hit.id));
      console.log(`[samples:demo] updated ${essayType} draft #${hit.id}`);
    } else {
      const [created] = await db.insert(essayVersions).values(payload).returning({ id: essayVersions.id });
      console.log(`[samples:demo] inserted ${essayType} draft #${created.id}`);
    }
  }

  // Vault short answers are stored as a DOCUMENT of type "other" whose note
  // holds the text, so nothing in the app mistakes them for a real upload.
  const docs = await db
    .select({ id: userDocuments.id, title: userDocuments.title })
    .from(userDocuments)
    .where(eq(userDocuments.profileId, profileId));
  const vaultTitle = "[SAMPLE] Answer Vault — five short answers";
  const existingDoc = docs.find((d) => d.title === vaultTitle);
  const docPayload = {
    profileId,
    title: vaultTitle,
    docType: "other",
    status: "needs_update" as const,
    verificationNote: SAMPLE_VAULT_SHORT_ANSWERS.text,
  };
  if (existingDoc) {
    await db.update(userDocuments).set(docPayload).where(eq(userDocuments.id, existingDoc.id));
    console.log(`[samples:demo] updated vault note #${existingDoc.id}`);
  } else {
    const [created] = await db.insert(userDocuments).values(docPayload).returning({ id: userDocuments.id });
    console.log(`[samples:demo] inserted vault note #${created.id}`);
  }

  console.log(`[samples:demo] done — sign in as ${DEMO_EMAIL} (demo data only, sample texts unchanged).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[samples:demo] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
