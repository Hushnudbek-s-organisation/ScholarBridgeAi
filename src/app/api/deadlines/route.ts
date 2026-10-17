import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { db } from "@/db";
import {
  universities,
  scholarships,
  savedUniversities,
  savedScholarships,
  applicationTasks,
  applications,
  applicationCycles,
  testBookings,
} from "@/db/schema";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { computeScholarshipStatus, statusLabel } from "@/lib/scholarshipStatus";
import { daysUntil } from "@/lib/nextActions";

/**
 * Unified deadline center (spec §21 + user request #10). Merges:
 *  - application deadlines (applications table); saved universities with no deadline on file
 *  - scholarship deadlines (with computed status)
 *  - test dates (IELTS / SAT / TOEFL / Duolingo / GRE)
 *  - user-created milestones (applicationTasks)
 * Each item carries date, type, source, status, days remaining and an urgency
 * bucket (🔴 critical ≤14d, 🟠 soon ≤45d, 🟡 planned) so the calendar can be
 * read at a glance.
 */

/** Urgency bucket from days remaining — the user asked for 🔴🟠🟡. */
function urgencyFor(daysRemaining: number | null): "critical" | "soon" | "planned" | "past" | "undated" {
  if (daysRemaining === null) return "undated";
  if (daysRemaining < 0) return "past";
  if (daysRemaining <= 14) return "critical";
  if (daysRemaining <= 45) return "soon";
  return "planned";
}
/**
 * Status line for a saved university: a future cycle date on file makes the
 * row OPEN; nothing on file stays honestly "NO DEADLINE ON FILE" — we never
 * fabricate an OPEN for a blank, and never invent a date.
 */
function savedUniStatusLabel(upcoming: string | null): string {
  return upcoming ? "OPEN" : "NO DEADLINE ON FILE";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const items: any[] = [];
    const now = new Date();

    // --- Scholarships (all active, with computed status) ---
    const savedSchRows = await db
      .select()
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    const savedSchIds = savedSchRows.map((s) => s.scholarshipId);

    const allScholarships = await db.select().from(scholarships).where(eq(scholarships.isActive, true));
    for (const s of allScholarships) {
      const status = computeScholarshipStatus(s);
      let date: Date | null = null;
      if (s.deadlineDate) date = new Date(s.deadlineDate);
      else if (s.deadlineRangeEnd) date = new Date(s.deadlineRangeEnd);
      else if (s.deadlineRangeStart) date = new Date(s.deadlineRangeStart);

      if (date && date.getTime() > now.getTime() - 365 * 86400000) {
        items.push({
          id: `sch-${s.id}`,
          type: "scholarship",
          title: s.title,
          subtitle: s.provider,
          date: date.toISOString(),
          status: statusLabel(status),
          daysRemaining: daysUntil(now, date.toISOString()),
          source: s.sourceUrl || s.websiteUrl || null,
          saved: savedSchIds.includes(s.id),
        });
      }
    }

    // --- Saved universities (real deadlines come from the verified cycles
    //     catalogue — one batched query, never a per-university loop) ---
    const savedUnis = await db
      .select()
      .from(savedUniversities)
      .where(eq(savedUniversities.profileId, profileId));
    if (savedUnis.length > 0) {
      const savedUniIds = savedUnis.map((u) => u.universityId);
      const [uniRows, cycleRows] = await Promise.all([
        db
          .select()
          .from(universities)
          .where(inArray(universities.id, savedUniIds)),
        // Nearest UPCOMING deadline per university. Ordered ascending by
        // deadline, so the first row seen for a university is its soonest.
        db
          .select({
            universityId: applicationCycles.universityId,
            deadline: applicationCycles.deadline,
          })
          .from(applicationCycles)
          .where(
            and(
              inArray(applicationCycles.universityId, savedUniIds),
              gte(applicationCycles.deadline, new Date().toISOString().slice(0, 10))
            )
          )
          .orderBy(asc(applicationCycles.deadline)),
      ]);
      const upcomingDeadlineByUni = new Map<number, string>();
      for (const c of cycleRows) {
        if (c.deadline && !upcomingDeadlineByUni.has(c.universityId)) {
          const d = new Date(c.deadline);
          upcomingDeadlineByUni.set(
            c.universityId,
            Number.isNaN(d.getTime()) ? String(c.deadline).slice(0, 10) : d.toISOString().slice(0, 10)
          );
        }
      }
      for (const u of uniRows) {
        const deadline = upcomingDeadlineByUni.get(u.id) ?? null;
        if (!deadline) {
          // Nothing on file → no invented countdown either: NULL stays NULL
          // and the row reads "NO DEADLINE ON FILE" (check-journey pins this).
          items.push({
            id: `uni-${u.id}`,
            type: "university",
            title: u.name,
            subtitle: `${u.country} · ${u.programMajor}`,
            date: null,
            status: "NO DEADLINE ON FILE",
            daysRemaining: null,
            source: u.websiteUrl || null,
            saved: true,
          });
          continue;
        }
        items.push({
          id: `uni-${u.id}`,
          type: "university",
          title: u.name,
          subtitle: `${u.country} · ${u.programMajor}`,
          date: deadline,
          status: savedUniStatusLabel(deadline),
          daysRemaining: daysUntil(now, deadline),
          source: u.websiteUrl || null,
          saved: true,
        });
      }
    }

    // --- User milestones ---
    const tasks = await db
      .select()
      .from(applicationTasks)
      .where(eq(applicationTasks.profileId, profileId));
    for (const t of tasks) {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      items.push({
        id: `task-${t.id}`,
        type: "milestone",
        title: t.title,
        subtitle: t.category,
        date: due ? due.toISOString() : null,
        status: t.isCompleted ? "COMPLETED" : "PENDING",
        daysRemaining: due ? daysUntil(now, due.toISOString()) : null,
        source: null,
        saved: false,
      });
    }

    // --- Application deadlines (from the universal tracker) ---
    const apps = await db
      .select()
      .from(applications)
      .where(eq(applications.profileId, profileId));
    for (const a of apps) {
      if (a.status === "withdrawn") continue;
      const due = a.deadline ? new Date(a.deadline) : null;
      items.push({
        id: `app-${a.id}`,
        type: "application",
        title: `${a.universityName}${a.programName ? ` — ${a.programName}` : ""}`,
        subtitle: [a.applicationRound, a.intakeTerm].filter(Boolean).join(" · "),
        date: due ? due.toISOString() : null,
        status: a.status,
        daysRemaining: due ? daysUntil(now, due.toISOString()) : null,
        source: a.portalUrl || null,
        saved: true,
      });
    }

    // --- Test dates (IELTS / SAT / TOEFL / Duolingo / GRE) ---
    const bookings = await db
      .select()
      .from(testBookings)
      .where(eq(testBookings.profileId, profileId));
    for (const b of bookings) {
      const testDay = new Date(b.testDate);
      items.push({
        id: `test-${b.id}`,
        type: "test",
        title: `${b.testType.toUpperCase()} test${b.location ? ` — ${b.location}` : ""}`,
        subtitle: b.registered ? "Registered" : "Not registered yet",
        testType: b.testType,
        testLocation: b.location,
        testRegistered: b.registered,
        date: testDay.toISOString(),
        status: b.registered ? "REGISTERED" : "PENDING",
        daysRemaining: daysUntil(now, testDay.toISOString()),
        source: null,
        saved: true,
      });
    }

    // Sort: items with dates first, nearest first; items without dates last.
    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Urgency buckets: 🔴 critical (≤14d) · 🟠 soon (≤45d) · 🟡 planned
    const withUrgency = items.map((item) => ({ ...item, urgency: urgencyFor(item.daysRemaining) }));
    const critical = withUrgency.filter((i) => i.urgency === "critical").length;
    const soon = withUrgency.filter((i) => i.urgency === "soon").length;

    return NextResponse.json({ items: withUrgency, summary: { critical, soon, total: withUrgency.length } });
  } catch (error) {
    console.error("GET /api/deadlines error:", error);
    return NextResponse.json({ error: "Failed to load deadlines" }, { status: 500 });
  }
}
