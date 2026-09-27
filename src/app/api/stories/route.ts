import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, successStories } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { guardStudent, guardTables, idParam, jsonError, readBody, serverError } from "@/lib/growth/api";
import { parseList, twinScore, type TwinProfile } from "@/lib/growth/logic";
import { publicStory, storyValues } from "@/lib/growth/stories";

export const dynamic = "force-dynamic";

/**
 * Admitted-student stories (idea from AdmitYogi / AdmitSee, adapted):
 * real students share what got them in — stats, activities, an essay extract
 * and advice. Everything is moderated: a submission stays private ("pending")
 * until an admin approves it, and only approved stories are public.
 *
 * GET  /api/stories?q=&country=&degree=&sort=twin|recent|featured
 *      → approved stories; when signed in each gets a "twin" similarity score.
 * GET  /api/stories?id=12   → one approved story (+1 view)
 * GET  /api/stories?mine=1  → the caller's own submissions (any status)
 * POST /api/stories         → submit a story (signed in, pending review)
 * DELETE /api/stories?id=   → withdraw your own story
 */
export async function GET(req: Request) {
  const t = await guardTables();
  if (t) return t;
  try {
    const url = new URL(req.url);
    const auth = await authenticate(req);
    const me = auth.ok ? auth.session.profile : null;

    if (url.searchParams.get("mine") === "1") {
      if (!me) return jsonError(401, "Sign-in required.", "unauthorized");
      const rows = await db
        .select()
        .from(successStories)
        .where(eq(successStories.profileId, me.id))
        .orderBy(desc(successStories.createdAt));
      return NextResponse.json({ items: rows.map((r) => publicStory(r, { mine: true })) });
    }

    const id = idParam(req);
    if (id) {
      const [row] = await db
        .select()
        .from(successStories)
        .where(and(eq(successStories.id, id), eq(successStories.status, "approved")))
        .limit(1);
      if (!row) return jsonError(404, "Story not found", "not_found");
      await db
        .update(successStories)
        .set({ views: sql`${successStories.views} + 1` })
        .where(eq(successStories.id, id));
      return NextResponse.json({ story: publicStory({ ...row, views: row.views + 1 }) });
    }

    const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 80);
    const country = (url.searchParams.get("country") || "").trim();
    const degree = (url.searchParams.get("degree") || "").trim();
    const sort = url.searchParams.get("sort") || (me ? "twin" : "featured");

    let rows = await db.select().from(successStories).where(eq(successStories.status, "approved"));
    if (country) rows = rows.filter((r) => (r.admittedCountry || "").toLowerCase() === country.toLowerCase());
    if (degree) rows = rows.filter((r) => (r.degreeLevel || "") === degree);
    if (q) {
      rows = rows.filter((r) =>
        [r.admittedUniversity, r.major, r.admittedCountry, r.displayName, r.essayTitle, r.otherAdmits]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    let twinOf: TwinProfile | null = null;
    if (me) {
      const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, me.id)).limit(1);
      if (p) {
        twinOf = {
          major: p.targetMajor,
          degreeLevel: p.degreeLevel,
          gpa: p.gpa,
          gpaScale: p.gpaScale,
          ielts: p.ieltsScore,
          sat: p.satScore,
          homeCountry: p.country,
          preferredCountries: parseList(p.preferredCountries),
        };
      }
    }

    const items = rows.map((r) => {
      const t = twinOf
        ? twinScore(twinOf, {
            major: r.major,
            degreeLevel: r.degreeLevel,
            gpa: r.gpa,
            gpaScale: r.gpaScale,
            ielts: r.ielts,
            sat: r.sat,
            homeCountry: r.homeCountry,
            admittedCountry: r.admittedCountry,
          })
        : null;
      return publicStory(r, { twin: t?.score ?? null, reasons: t?.reasons ?? [] });
    });

    const byDate = (a: { createdAt: Date }, b: { createdAt: Date }) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "twin" && twinOf) items.sort((a, b) => (b.twin ?? 0) - (a.twin ?? 0) || byDate(a, b));
    else if (sort === "recent") items.sort(byDate);
    else items.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.isVerified) - Number(a.isVerified) || byDate(a, b));

    const countries = [...new Set(rows.map((r) => r.admittedCountry).filter((c): c is string => !!c))].sort();
    return NextResponse.json({ items: items.slice(0, 100), total: items.length, countries, personalised: !!twinOf });
  } catch (err) {
    return serverError("stories GET", err);
  }
}

export async function POST(req: Request) {
  const g = await guardStudent(req, null);
  if (!g.ok) return g.response;
  const rl = checkRateLimit(`story:${g.value.session.profile.id}`, LIMITS.storySubmit);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec, "You have submitted several stories recently. Please try again later.");
  const b = await readBody(req);
  if (!b.ok) return b.response;
  try {
    const values = storyValues(b.value);
    if (!values.admittedUniversity) return jsonError(400, "Please enter the university that admitted you.", "validation");
    if (!values.advice && !values.essayExcerpt) {
      return jsonError(400, "Please add at least one piece of advice or an essay extract.", "validation");
    }
    if (b.value.consent !== true) {
      return jsonError(400, "Please confirm that the story is yours and may be published.", "validation");
    }
    const [row] = await db
      .insert(successStories)
      .values({ ...values, profileId: g.value.profileId, status: "pending" })
      .returning({ id: successStories.id });
    return NextResponse.json({ id: row.id, status: "pending" }, { status: 201 });
  } catch (err) {
    return serverError("stories POST", err);
  }
}

export async function DELETE(req: Request) {
  const g = await guardStudent(req, null, { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db.select().from(successStories).where(eq(successStories.id, id)).limit(1);
    if (!row) return jsonError(404, "Story not found", "not_found");
    if (row.profileId !== g.value.session.profile.id && !g.value.session.isAdmin) {
      return jsonError(403, "You can only withdraw your own story.", "forbidden");
    }
    await db.delete(successStories).where(eq(successStories.id, id));
    return NextResponse.json({ deleted: id });
  } catch (err) {
    return serverError("stories DELETE", err);
  }
}
