import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, GraduationCap, MapPin, Trophy } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { universities as universitiesTable } from "@/db/schema";
import { ITEMS_PER_PAGE, getRange, parsePage } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Universities",
  description: "Explore universities — 24 results per page.",
};

interface UniversityRow {
  id: number;
  name: string;
  country: string;
  city: string | null;
  flag_emoji: string | null;
  world_ranking: number | null;
  program_major: string | null;
  official_website_url: string | null;
}

// Next.js 15+: searchParams is a Promise.
interface UniversitiesPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function UniversitiesPage({
  searchParams,
}: UniversitiesPageProps) {
  // 1. Page from URL: /universities?page=2
  const requestedPage = parsePage((await searchParams).page);
  const { from } = getRange(requestedPage);

  // 2. Data comes from the app's OWN database (DATABASE_URL, Drizzle) — the
  //    same source every API route reads. This page used to require the
  //    optional Supabase env vars and rendered "Supabase is not configured"
  //    on a perfectly valid PostgreSQL (Render/self-hosted) deployment.
  let rows: UniversityRow[];
  let totalItems: number;
  try {
    const [countRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(universitiesTable);
    totalItems = Number(countRow?.n ?? 0);
    const lastPage = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (requestedPage > lastPage) {
      redirect(lastPage > 1 ? `/universities?page=${lastPage}` : "/universities");
    }
    const data = await db
      .select({
        id: universitiesTable.id,
        name: universitiesTable.name,
        country: universitiesTable.country,
        city: universitiesTable.city,
        flagEmoji: universitiesTable.flagEmoji,
        worldRanking: universitiesTable.worldRanking,
        programMajor: universitiesTable.programMajor,
        officialWebsiteUrl: universitiesTable.officialWebsiteUrl,
        websiteUrl: universitiesTable.websiteUrl,
      })
      .from(universitiesTable)
      .where(eq(universitiesTable.isActive, true))
      .orderBy(asc(universitiesTable.worldRanking), asc(universitiesTable.id))
      .limit(ITEMS_PER_PAGE)
      .offset(from);
    // Nullable columns stay null (never "" or 0) — the card renders nothing
    // rather than pretending a ranking/focus exists.
    rows = data.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      city: u.city,
      flag_emoji: u.flagEmoji,
      world_ranking: u.worldRanking,
      program_major: u.programMajor,
      official_website_url: u.officialWebsiteUrl || u.websiteUrl,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          Couldn&apos;t load universities: {message}
        </p>
      </main>
    );
  }

  const universities = rows;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <GraduationCap className="h-6 w-6 text-blue-600" aria-hidden />
          University Explorer
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Showing {totalItems === 0 ? 0 : from + 1}–{from + universities.length} of{" "}
          {totalItems} · Page {currentPage} of {totalPages}
        </p>
      </header>

      {universities.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
          No universities found.
        </p>
      ) : (
        // 2 cols on mobile, 3 cols from md → 24 items = exactly 8 rows.
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {universities.map((u) => (
            <article
              key={u.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl" aria-hidden>{u.flag_emoji}</span>
                {u.world_ranking != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 ring-inset">
                    <Trophy className="h-3 w-3" aria-hidden />#{u.world_ranking}
                  </span>
                )}
              </div>
              <h2 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 sm:text-base">
                {u.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{[u.city, u.country].filter(Boolean).join(", ")}</span>
              </p>
              {u.program_major && (
                <p className="mt-1 truncate text-xs text-slate-500">{u.program_major}</p>
              )}
              {u.official_website_url && (
                <Link
                  href={u.official_website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 sm:text-sm"
                >
                  Website <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} />

      {/* Independent guide: the figures on these cards are compiled and can
          age, so the list carries its own line — not only the Terms page. */}
      <p className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
        ScholarBridgeAI is an independent guide, not affiliated with any university or provider.
        Tuition, deadlines and requirement numbers are compiled from public sources and can be out of
        date — always confirm them on the official page before you apply.
      </p>
    </main>
  );
}
