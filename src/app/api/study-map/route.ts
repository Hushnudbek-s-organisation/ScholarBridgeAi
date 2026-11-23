import { createHash, randomUUID } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  applications, applicationTasks, savedScholarships, savedUniversities, scholarships, studentProfiles,
  savedPrograms, studentActivities, studyMapEntries, studyPlans, testPlans, testAttempts,
  lessonProgress, lessons, universities, universityPrograms,
} from "@/db/schema";
import { privateNoStoreJson as json } from "@/lib/apiResponse";
import { requireSession } from "@/lib/auth";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";
import { readJsonBody } from "@/lib/request";
import { MAX_API_JSON_BODY_BYTES } from "@/lib/security";
import { isStudyDate, nextStudyReview, serializeStudyNote, STUDY_BODY_LIMIT, STUDY_DAILY_FOLDER, STUDY_ENTRY_LIMIT, STUDY_IMPORT_LIMIT, STUDY_LINK_LIMIT, type StudyNode } from "@/lib/study-map";

const trashKinds = ["trash_note", "trash_card"] as const;

function validateEntry(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const { kind, title, text, links } = value as Record<string, unknown>;
  if ((kind !== "note" && kind !== "card") || typeof title !== "string" || !title.trim() || title.length > 120
    || typeof text !== "string" || !text.trim() || text.length > STUDY_BODY_LIMIT || !Array.isArray(links)
    || links.length > STUDY_LINK_LIMIT || !links.every(link => typeof link === "string" && /^[\w:-]{1,70}$/.test(link))) return null;
  return { kind, title: title.trim(), text: text.trim(), links: [...new Set<string>(links)], updatedAt: new Date() };
}

function dailyEntryId(profileId: number, day: string) {
  const hex = createHash("sha256").update(`study-map:${profileId}:${day}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return json({ code: auth.code }, { status: auth.status });
    const { id } = auth.session.profile;
    if (!subscriptionIsActive(await findActiveSubscription(id))) return json({ code: "premium_required" }, { status: 403 });
    const [profiles, schools, programs, awards, apps, exams, attempts, learning, plans, activities, todos, entries] = await Promise.all([
      db.select({
        major: studentProfiles.targetMajor, countries: studentProfiles.preferredCountries,
        degree: studentProfiles.degreeLevel, interests: studentProfiles.studyInterests, ielts: studentProfiles.ieltsScore,
        sat: studentProfiles.satScore, toefl: studentProfiles.toeflScore, gre: studentProfiles.greScore,
      }).from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1),
      db.select({ id: universities.id, title: universities.name, detail: universities.country })
        .from(savedUniversities).innerJoin(universities, eq(universities.id, savedUniversities.universityId))
        .where(eq(savedUniversities.profileId, id)).orderBy(desc(savedUniversities.createdAt), desc(savedUniversities.id)).limit(25),
      db.select({ id: universityPrograms.id, title: universityPrograms.name, universityId: universities.id, detail: universities.name })
        .from(savedPrograms).innerJoin(universityPrograms, eq(universityPrograms.id, savedPrograms.programId))
        .innerJoin(universities, eq(universities.id, universityPrograms.universityId))
        .where(eq(savedPrograms.profileId, id)).orderBy(desc(savedPrograms.id)).limit(25),
      db.select({ id: scholarships.id, title: scholarships.title })
        .from(savedScholarships).innerJoin(scholarships, eq(scholarships.id, savedScholarships.scholarshipId))
        .where(eq(savedScholarships.profileId, id)).orderBy(desc(savedScholarships.createdAt), desc(savedScholarships.id)).limit(25),
      db.select({ id: applications.id, title: applications.universityName, universityId: applications.universityId,
        detail: applications.programName, date: applications.deadline, status: applications.status })
        .from(applications).where(eq(applications.profileId, id)).orderBy(desc(applications.updatedAt), desc(applications.id)).limit(30),
      db.select({ id: testPlans.id, title: testPlans.testType, target: testPlans.targetScore, date: testPlans.targetDate })
        .from(testPlans).where(and(eq(testPlans.profileId, id), eq(testPlans.isActive, true))).orderBy(desc(testPlans.id)).limit(18),
      db.select({ id: testAttempts.id, examId: testPlans.id, test: testPlans.testType, date: testAttempts.testDate,
        score: testAttempts.score, resultLabel: testAttempts.resultLabel })
        .from(testAttempts).innerJoin(testPlans, eq(testPlans.id, testAttempts.testPlanId))
        .where(eq(testPlans.profileId, id)).orderBy(desc(testAttempts.testDate), desc(testAttempts.id)).limit(25),
      db.select({ id: lessons.id, title: lessons.title, done: lessonProgress.isCompleted })
        .from(lessonProgress).innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(eq(lessonProgress.profileId, id)).orderBy(desc(lessonProgress.updatedAt), desc(lessonProgress.id)).limit(30),
      db.select({ id: studyPlans.id, title: studyPlans.title, status: studyPlans.status })
        .from(studyPlans).where(eq(studyPlans.profileId, id)).orderBy(desc(studyPlans.updatedAt), desc(studyPlans.id)).limit(20),
      db.select({ id: studentActivities.id, title: studentActivities.title, detail: studentActivities.organization })
        .from(studentActivities).where(eq(studentActivities.profileId, id)).orderBy(desc(studentActivities.updatedAt), desc(studentActivities.id)).limit(30),
      db.select({ id: applicationTasks.id, title: applicationTasks.title, date: applicationTasks.dueDate,
        done: applicationTasks.isCompleted, universityId: applicationTasks.universityId })
        .from(applicationTasks).where(eq(applicationTasks.profileId, id)).orderBy(desc(applicationTasks.createdAt), desc(applicationTasks.id)).limit(30),
      db.select().from(studyMapEntries).where(eq(studyMapEntries.profileId, id)).orderBy(desc(studyMapEntries.updatedAt)).limit(STUDY_ENTRY_LIMIT),
    ]);
    const profile = profiles[0];
    const profileNodes: StudyNode[] = [];
    if (profile?.major) profileNodes.push({ id: "profile:major", group: "profile", title: profile.major, route: "profile" });
    if (profile?.degree) profileNodes.push({ id: "profile:degree", group: "profile", title: profile.degree, route: "profile" });
    if (profile?.countries) profileNodes.push({ id: "profile:countries", group: "profile", title: profile.countries, route: "profile" });
    if (profile?.interests) profileNodes.push({ id: "profile:interests", group: "skills", title: profile.interests, route: "profile" });
    for (const [name, score] of Object.entries({ IELTS: profile?.ielts, SAT: profile?.sat, TOEFL: profile?.toefl, GRE: profile?.gre })) {
      if (score != null) profileNodes.push({ id: `profile:${name.toLowerCase()}`, group: "skills", title: `${name} · ${score}`, route: "study-plan/tests" });
    }
    const schoolLink = (id: number | null) => id && schools.some(school => school.id === id) ? `school:${id}` : undefined;
    const nodes: StudyNode[] = [
      ...profileNodes,
      ...schools.map(row => ({ id: `school:${row.id}`, group: "schools" as const, title: row.title, detail: row.detail ?? undefined, route: "universities" })),
      ...programs.map(row => ({ id: `program:${row.id}`, group: "schools" as const, title: row.title, detail: row.detail,
        route: "universities", relatedId: schoolLink(row.universityId) })),
      ...awards.map(row => ({ id: `award:${row.id}`, group: "funding" as const, title: row.title, route: "scholarships" })),
      ...apps.map(row => ({ id: `app:${row.id}`, group: "applications" as const, title: row.title || row.detail || `#${row.id}`,
        detail: [row.detail, row.status.replaceAll("_", " ")].filter(Boolean).join(" · "), date: row.date ?? undefined,
        route: "applications", relatedId: schoolLink(row.universityId) })),
      ...exams.map(row => ({ id: `exam:${row.id}`, group: "skills" as const,
        title: row.title.toUpperCase(), detail: row.target == null ? undefined : String(row.target), date: row.date ?? undefined, route: "study-plan" })),
      ...attempts.map(row => ({ id: `attempt:${row.id}`, group: "skills" as const,
        title: [row.test.toUpperCase(), row.score ?? row.resultLabel].filter(value => value != null).join(" · "),
        date: row.date, route: "study-plan/tests", relatedId: `exam:${row.examId}` })),
      ...[...new Map(learning.slice().reverse().map(row => [row.id, row])).values()].reverse().map(row =>
        ({ id: `lesson:${row.id}`, group: "skills" as const, title: row.title, done: row.done, route: "community/courses" })),
      ...plans.map(row => ({ id: `plan:${row.id}`, group: "skills" as const, title: row.title,
        detail: row.status.replaceAll("_", " "), route: "study-plan", done: row.status === "completed" })),
      ...activities.map(row => ({ id: `activity:${row.id}`, group: "skills" as const, title: row.title,
        detail: row.detail ?? undefined, route: "profile/activities" })),
      ...todos.map(row => ({ id: `task:${row.id}`, group: "applications" as const, title: row.title,
        date: row.date, route: "tasks", done: row.done, relatedId: schoolLink(row.universityId) })),
    ];
    const ownedEntries = entries.map(({ profileId: _owner, updatedAt: _updated, ...entry }) => entry);
    return json({
      nodes,
      entries: ownedEntries.filter(entry => entry.kind === "note" || entry.kind === "card"),
      trash: ownedEntries.flatMap(entry => entry.kind === "trash_note" || entry.kind === "trash_card"
        ? [{ ...entry, kind: entry.kind === "trash_note" ? "note" : "card" }] : []),
    });
  } catch (error) {
    console.error("Study map read failed", error instanceof Error ? error.name : "Error");
    return json({ code: "study_map_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return json({ code: auth.code }, { status: auth.status });
    const profileId = auth.session.profile.id;
    if (!subscriptionIsActive(await findActiveSubscription(profileId))) return json({ code: "premium_required" }, { status: 403 });
    const parsed = await readJsonBody<Record<string, unknown>>(req, MAX_API_JSON_BODY_BYTES);
    if (!parsed.ok) return json({ code: parsed.code }, { status: parsed.status });
    const { id, action, remembered, day, items } = parsed.body;
    const validId = typeof id === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id) ? id : null;
    if (id !== undefined && !validId) return json({ code: "invalid_entry" }, { status: 400 });
    const where = and(eq(studyMapEntries.profileId, profileId), eq(studyMapEntries.id, validId ?? ""));
    if (validId && (action === "delete" || action === "restore" || action === "purge")) {
      return await db.transaction(async tx => {
        const [entry] = await tx.select({ kind: studyMapEntries.kind }).from(studyMapEntries).where(where).for("update");
        const activeKind = entry?.kind === "note" || entry?.kind === "card";
        const removedKind = entry?.kind === trashKinds[0] || entry?.kind === trashKinds[1];
        if (!entry || (action === "delete" ? !activeKind : !removedKind)) return json({ code: "missing_entry" }, { status: 404 });
        if (action === "purge") await tx.delete(studyMapEntries).where(where);
        else await tx.update(studyMapEntries).set({
          kind: action === "delete" ? `trash_${entry.kind}` : entry.kind === trashKinds[0] ? "note" : "card",
          updatedAt: new Date(),
        }).where(where);
        return json(action === "restore" ? { id: validId } : { ok: true });
      });
    }
    if (action === "import" && !validId) {
      if (!Array.isArray(items) || !items.length || items.length > STUDY_IMPORT_LIMIT) return json({ code: "invalid_entry" }, { status: 400 });
      const values = items.map(validateEntry).filter(item => item !== null && item.kind === "note");
      if (values.length !== items.length) return json({ code: "invalid_entry" }, { status: 400 });
      return await db.transaction(async tx => {
        await tx.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.id, profileId)).for("no key update");
        const [total] = await tx.select({ value: count() }).from(studyMapEntries).where(eq(studyMapEntries.profileId, profileId));
        if (total.value + values.length > STUDY_ENTRY_LIMIT) return json({ code: "entry_limit" }, { status: 409 });
        const entries = await tx.insert(studyMapEntries).values(values.map(value => ({ ...value, id: randomUUID(), profileId })))
          .returning({ id: studyMapEntries.id });
        return json({ id: entries[0].id }, { status: 201 });
      });
    }
    if (action === "review" && validId && typeof remembered === "boolean") {
      return await db.transaction(async tx => {
        const [card] = await tx.select().from(studyMapEntries).where(where).for("update");
        if (card?.kind !== "card") return json({ code: "missing_entry" }, { status: 404 });
        const now = new Date();
        if (card.dueAt > now) return json({ ok: true });
        await tx.update(studyMapEntries).set({ ...nextStudyReview(card.interval, remembered, now), updatedAt: now }).where(where);
        return json({ ok: true });
      });
    }
    const dailyId = action === "daily" && isStudyDate(day) ? dailyEntryId(profileId, day) : null;
    const values = dailyId && typeof day === "string"
      ? { kind: "note", title: day, text: serializeStudyNote({ body: `# ${day}`, folder: STUDY_DAILY_FOLDER, pinned: false, date: day, strokes: [] }), links: [], updatedAt: new Date() }
      : action === "save" ? validateEntry(parsed.body) : null;
    if (!values || dailyId && validId) return json({ code: "invalid_entry" }, { status: 400 });
    if (validId) {
      const [updated] = await db.update(studyMapEntries).set(values)
        .where(and(where, eq(studyMapEntries.kind, values.kind))).returning({ id: studyMapEntries.id });
      return updated ? json(updated) : json({ code: "missing_entry" }, { status: 404 });
    }
    return await db.transaction(async tx => {
      await tx.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.id, profileId)).for("no key update");
      if (dailyId) {
        const dailyWhere = and(eq(studyMapEntries.id, dailyId), eq(studyMapEntries.profileId, profileId));
        const [existing] = await tx.select({ kind: studyMapEntries.kind }).from(studyMapEntries).where(dailyWhere).for("update");
        if (existing) {
          if (existing.kind === "trash_note") await tx.update(studyMapEntries).set({ kind: "note", updatedAt: new Date() })
            .where(dailyWhere);
          return json({ id: dailyId });
        }
      }
      const [total] = await tx.select({ value: count() }).from(studyMapEntries).where(eq(studyMapEntries.profileId, profileId));
      if (total.value >= STUDY_ENTRY_LIMIT) return json({ code: "entry_limit" }, { status: 409 });
      const [inserted] = await tx.insert(studyMapEntries).values({ ...values, id: dailyId ?? randomUUID(), profileId: profileId })
        .returning({ id: studyMapEntries.id });
      return json(inserted, { status: 201 });
    });
  } catch (error) {
    console.error("Study map write failed", error instanceof Error ? error.name : "Error");
    return json({ code: "study_map_unavailable" }, { status: 503 });
  }
}
