import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { db } from "@/db";
import {
  scholarships,
  savedScholarships,
  savedUniversities,
  universities,
  studentProfiles,
  essayVersions,
  applicationTasks,
  notifications,
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";
import { calculateScholarshipMatch } from "@/lib/matching";

/**
 * Deadline notification sweep (spec §20, §21).
 *
 * Checks saved scholarships + user milestones for deadlines within the next
 * N days (config: `notification_deadline_window_days`, default 14) and creates
 * in-app notifications. Idempotent: a notification with the same
 * (type, profile_id, link) is only created once per deadline.
 *
 * Called by the cron endpoint or lazily when the app loads.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = body.profileId ? Number(body.profileId) : null;
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    // Optional window override (default 14 days).
    const windowDays = Number(body.windowDays || 14);
    const now = new Date();
    const horizon = new Date(now.getTime() + windowDays * 86400000);

    let created = 0;

    // ---------- 1) Saved scholarships with upcoming deadlines ----------
    const savedSch = profileId
      ? await db
          .select()
          .from(savedScholarships)
          .where(eq(savedScholarships.profileId, profileId))
      : [];

    for (const s of savedSch) {
      if (!profileId) continue;
      const [sch] = await db
        .select()
        .from(scholarships)
        .where(eq(scholarships.id, s.scholarshipId));

      if (!sch) continue;
      const deadline = sch.deadlineDate ? new Date(sch.deadlineDate) : null;

      if (deadline && deadline >= now && deadline <= horizon) {
        const link = `/scholarships?id=${sch.id}`;
        // Idempotency: skip if an unread notification for this deadline exists.
        const [existing] = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.profileId, profileId),
              eq(notifications.type, "deadline_approaching"),
              eq(notifications.link, link)
            )
          );
        if (!existing) {
          const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
          await createNotification({
            profileId,
            type: "deadline_approaching",
            title: `Deadline approaching: ${sch.title}`,
            body: `The ${sch.title} scholarship deadline is in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${deadline.toLocaleDateString()}).`,
            link,
          });
          created += 1;
        }
      }
    }

    // ---------- 2) User milestones due soon ----------
    if (profileId) {
      const tasks = await db
        .select()
        .from(applicationTasks)
        .where(
          and(
            eq(applicationTasks.profileId, profileId),
            eq(applicationTasks.isCompleted, false)
          )
        );

      for (const t of tasks) {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        if (due && due >= now && due <= horizon) {
          const link = `/tasks`;
          const [existing] = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.profileId, profileId),
                eq(notifications.type, "milestone_due"),
                eq(notifications.link, link),
                eq(notifications.title, `Milestone due: ${t.title}`)
              )
            );
          if (!existing) {
            const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
            await createNotification({
              profileId,
              type: "milestone_due",
              title: `Milestone due: ${t.title}`,
              body: `Your task "${t.title}" is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${due.toLocaleDateString()}).`,
              link,
            });
            created += 1;
          }
        }
      }
    }

    // ---------- 3) Scholarships matching the profile (spec §25, 🟢) ----------
    if (profileId) {
      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, profileId));

      if (profile) {
        // The raw profile row satisfies StudentProfileData (the matcher only
        // reads the fields it declares) — same pattern as /api/scholarships.
        const profileData = profile;

        // --- 3a) A strong scholarship in a country of a saved university that
        // --- the student has not saved yet — "New scholarship matches you".
        const savedUnis = await db
          .select()
          .from(savedUniversities)
          .where(eq(savedUniversities.profileId, profileId));
        const uniRows =
          savedUnis.length > 0
            ? await db
                .select()
                .from(universities)
                .where(inArray(universities.id, savedUnis.map((s) => s.universityId)))
            : [];
        const countries = [...new Set(uniRows.map((u) => u.country))];

        const savedSchIds = new Set(
          (await db
            .select()
            .from(savedScholarships)
            .where(eq(savedScholarships.profileId, profileId))
          ).map((s) => s.scholarshipId)
        );

        if (countries.length > 0) {
          const candidates = await db
            .select()
            .from(scholarships)
            .where(inArray(scholarships.country, countries));

          let notified = 0;
          for (const sch of candidates) {
            if (notified >= 3) break; // never spam the bell in one sweep
            if (savedSchIds.has(sch.id)) continue;
            const match = calculateScholarshipMatch(profileData, sch);
            if (match.matchScore == null || match.matchScore < 60) continue;
            const link = `/scholarships?id=${sch.id}`;
            const [existing] = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.profileId, profileId),
                  eq(notifications.type, "scholarship_opened"),
                  eq(notifications.link, link)
                )
              );
            if (existing) continue;
            await createNotification({
              profileId,
              type: "scholarship_opened",
              title: `New scholarship matches your profile: ${sch.title}`,
              body: `${sch.title} (${sch.country}) scores ${match.matchScore}% fit against your profile.`,
              link,
            });
            created += 1;
            notified += 1;
          }
        }

        // --- 3b) Saved universities the student cannot meet yet (spec §25).
        const withMinIelts = uniRows.filter((u) => u.minIelts != null);
        if (withMinIelts.length > 0) {
          const missing =
            profile.ieltsScore == null
              ? withMinIelts.length
              : withMinIelts.filter((u) => (profile.ieltsScore as number) < (u.minIelts as number))
                  .length;
          if (missing > 0) {
            const link = "/profile?gap=ielts";
            const [existing] = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.profileId, profileId),
                  eq(notifications.type, "requirement_gap"),
                  eq(notifications.link, link)
                )
              );
            if (!existing) {
              const highest = Math.max(...withMinIelts.map((u) => u.minIelts as number));
              const body =
                profile.ieltsScore == null
                  ? `You have saved ${missing} universit${missing === 1 ? "y" : "ies"} that require IELTS, but your profile has no IELTS score yet (highest requirement: ${highest}).`
                  : `Your IELTS ${profile.ieltsScore} is below the requirement of ${missing} saved universit${missing === 1 ? "y" : "ies"} (highest requirement: ${highest}).`;
              await createNotification({
                profileId,
                type: "requirement_gap",
                title:
                  profile.ieltsScore == null
                    ? "IELTS score missing for your saved universities"
                    : "IELTS below the requirement of saved universities",
                body,
                link,
              });
              created += 1;
            }
          }
        }
      }
    }

    // ---------- 4) Essay improved between versions (spec §25, 🟢) ----------
    if (profileId) {
      const latestTwo = await db
        .select()
        .from(essayVersions)
        .where(eq(essayVersions.profileId, profileId))
        .orderBy(desc(essayVersions.id))
        .limit(2);

      if (latestTwo.length === 2) {
        const [latest, previous] = latestTwo;
        const prevTotal = previous.rubricTotal != null ? Number(previous.rubricTotal) : null;
        const lastTotal = latest.rubricTotal != null ? Number(latest.rubricTotal) : null;
        if (prevTotal != null && lastTotal != null && lastTotal >= prevTotal + 5) {
          const link = `/sop?version=${latest.id}`;
          const [existing] = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.profileId, profileId),
                eq(notifications.type, "essay_improved"),
                eq(notifications.link, link)
              )
            );
          if (!existing) {
            await createNotification({
              profileId,
              type: "essay_improved",
              title: `Your essay improved by ${lastTotal - prevTotal} points`,
              body: `Version ${latest.id} scored ${lastTotal} vs ${prevTotal} in version ${previous.id}. Keep going.`,
              link,
            });
            created += 1;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error("POST /api/notifications/sweep error:", error);
    return NextResponse.json({ error: "Notification sweep failed" }, { status: 500 });
  }
}
