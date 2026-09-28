import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumCategories, forumThreads } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { seedForum } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { requireFeatureSession } from "@/lib/premium";
import { clampString, readJsonBody } from "@/lib/request";
import { isUniqueViolation } from "@/lib/db-errors";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(req: Request) {
  try {
    // Reading the forum is part of the Premium `forum` feature (not only the UI).
    const member = await requireFeatureSession(req, "forum");
    if (!member.ok) return member.response;
    await seedForum();
    const rows = await db
      .select({
        id: forumCategories.id,
        name: forumCategories.name,
        slug: forumCategories.slug,
        description: forumCategories.description,
        sortOrder: forumCategories.sortOrder,
        createdAt: forumCategories.createdAt,
        threadCount: sql<number>`count(${forumThreads.id})::int`,
      })
      .from(forumCategories)
      .leftJoin(forumThreads, eq(forumThreads.categoryId, forumCategories.id))
      .groupBy(forumCategories.id)
      .orderBy(forumCategories.sortOrder);

    return NextResponse.json({ categories: rows });
  } catch (error) {
    console.error("GET /api/forum/categories error:", error);
    return NextResponse.json({ error: "Failed to fetch forum categories" }, { status: 500 });
  }
}

/** Create a forum category — a moderation action, admin only. */
export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const parsed = await readJsonBody<Record<string, unknown>>(req, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const name = clampString(parsed.body.name, 120).trim();
    const slug = clampString(parsed.body.slug, 80).trim().toLowerCase();
    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "slug may contain only a-z, 0-9 and single hyphens" }, { status: 400 });
    }
    const order = Number(parsed.body.sortOrder);

    const [category] = await db
      .insert(forumCategories)
      .values({
        name,
        slug,
        description: clampString(parsed.body.description, 1000).trim(),
        sortOrder: Number.isFinite(order) ? Math.max(-10000, Math.min(10000, Math.trunc(order))) : 0,
      })
      .returning();

    return NextResponse.json({ category });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    }
    console.error("POST /api/forum/categories error:", error);
    return NextResponse.json({ error: "Failed to create forum category" }, { status: 500 });
  }
}
