import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Scholarships",
  description:
    "Browse scholarships with server-side pagination — 24 results per page.",
};

// ---------------------------------------------------------------------------
// Page size: 8 rows × 3 columns (the `md:grid-cols-3` layout below).
// On smaller screens the same 24 items simply reflow into 2 columns.
// ---------------------------------------------------------------------------
const ROWS_PER_PAGE = 8;
const COLUMNS_PER_ROW = 3;
const ITEMS_PER_PAGE = ROWS_PER_PAGE * COLUMNS_PER_ROW; // 24

/** Subset of `scholarships` columns selected below (snake_case from Supabase). */
interface ScholarshipRow {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverage_type: string;
  amount_usd_value: number | null;
  deadline: string | null;
  website_url: string | null;
}

// NOTE (Next.js 15+): `searchParams` is async and must be awaited.
interface ScholarshipsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ScholarshipsPage({
  searchParams,
}: ScholarshipsPageProps) {
  // --- 1. Current page from the URL: /scholarships?page=2 ------------------
  const { page: rawPage } = await searchParams;
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  const requestedPage =
    Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;

  // --- 2. Supabase client (server-only) --------------------------------------
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="text-lg font-bold text-amber-900">
            Supabase is not configured
          </h1>
          <p className="mt-2 text-sm text-amber-800">
            Set <code className="font-mono">SUPABASE_URL</code> and{" "}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in
            your environment to enable server-side pagination.
          </p>
        </div>
      </main>
    );
  }

  // --- 3. Exact total (head-only query — transfers no rows) ------------------
  // IMPORTANT: apply the SAME filters here as in the data query below,
  // otherwise `totalPages` won't match the listed rows.
  const { count } = await supabase
    .from("scholarships")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // --- 4. Out-of-range ?page= → bounce to the last valid page ---------------
  if (requestedPage > totalPages) {
    redirect(
      totalPages > 1 ? `/scholarships?page=${totalPages}` : "/scholarships",
    );
  }
  const currentPage = requestedPage;

  // --- 5. range(from, to) — INCLUSIVE on both ends ---------------------------
  // Page 1 → range(0, 23) · Page 2 → range(24, 47) · Page N → …
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const { data, error } = await supabase
    .from("scholarships")
    .select(
      "id, title, provider, country, coverage_type, amount_usd_value, deadline, website_url",
    )
    .eq("is_active", true)
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-lg font-bold text-red-900">
            Couldn&apos;t load scholarships
          </h1>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
        </div>
      </main>
    );
  }

  const scholarships = (data ?? []) as ScholarshipRow[];
  const showingFrom = totalItems === 0 ? 0 : from + 1;
  const showingTo = from + scholarships.length;

  // --- 6. Render grid + pagination --------------------------------------------
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Award className="h-6 w-6 text-amber-500" aria-hidden />
          Scholarships
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {showingFrom}–{showingTo}
          </span>{" "}
          of <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
          scholarships · Page {currentPage} of {totalPages}
        </p>
      </header>

      {scholarships.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            No scholarships found.
          </p>
        </div>
      ) : (
        // 2 columns on small screens, 3 columns from `md` up.
        // 24 items fill exactly 8 rows at the 3-column breakpoint.
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {scholarships.map((s) => (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:p-5"
            >
              <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 ring-inset">
                {s.coverage_type || "Scholarship"}
              </span>

              <h2 className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 sm:text-base">
                {s.title}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                {s.provider}
              </p>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <MapPin
                    className="h-3.5 w-3.5 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <span className="truncate">{s.country}</span>
                </p>
                {s.deadline && (
                  <p className="flex items-center gap-1.5">
                    <CalendarDays
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      aria-hidden
                    />
                    <span className="truncate">{s.deadline}</span>
                  </p>
                )}
                {typeof s.amount_usd_value === "number" && (
                  <p className="font-semibold text-emerald-700">
                    ${s.amount_usd_value.toLocaleString("en-US")}
                  </p>
                )}
              </div>

              {s.website_url && (
                <Link
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 sm:text-sm"
                >
                  View details
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
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
