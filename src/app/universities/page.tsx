import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, GraduationCap, MapPin, Trophy } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ITEMS_PER_PAGE, getRange, parsePage } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Universities",
  description: "Explore universities — 24 results per page.",
};

interface UniversityRow {
  id: number;
  name: string;
  country: string;
  city: string;
  flag_emoji: string;
  world_ranking: number;
  program_major: string;
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

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800">
          Supabase is not configured. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      </main>
    );
  }

  // 2. range(from, to) → exactly 24 rows. `count: "exact"` returns the total
  //    in the same request, so one round-trip gives rows + totalPages.
  const { from, to } = getRange(requestedPage);
  const { data, count, error } = await supabase
    .from("universities")
    .select(
      "id, name, country, city, flag_emoji, world_ranking, program_major, official_website_url",
      { count: "exact" },
    )
    .order("world_ranking", { ascending: true })
    .order("id", { ascending: true }) // stable tie-breaker → no duplicates across pages
    .range(from, to);

  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // 3. Out-of-range page (?page=999) → last valid page.
  //    (PostgREST returns a 416 error for offsets past the end, so check first.)
  if (requestedPage > totalPages && count !== null) {
    redirect(totalPages > 1 ? `/universities?page=${totalPages}` : "/universities");
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          Couldn&apos;t load universities: {error.message}
        </p>
      </main>
    );
  }

  const universities = (data ?? []) as UniversityRow[];
  const currentPage = requestedPage;

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
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200 ring-inset">
                  <Trophy className="h-3 w-3" aria-hidden />#{u.world_ranking}
                </span>
              </div>
              <h2 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 sm:text-base">
                {u.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{u.city}, {u.country}</span>
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">{u.program_major}</p>
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
    </main>
  );
}
