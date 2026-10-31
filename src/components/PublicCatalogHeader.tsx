"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Small, shared navigation and appearance controls for public catalogue pages. */
export function PublicCatalogHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const meta = useTranslations("meta");
  const nav = useTranslations("nav");
  const catalog = useTranslations("publicCatalog");
  const features = useTranslations("publicFeatures");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-base font-extrabold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {meta("appName")}
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher compact onLocaleChange={() => router.refresh()} />
          <ThemeToggle />
        </div>

        <nav
          aria-label={catalog("catalogNavigation")}
          className="order-3 flex w-full items-center gap-2 overflow-x-auto sm:order-none sm:w-auto"
        >
          <Link
            href="/universities"
            aria-current={pathname === "/universities" ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${pathname === "/universities" ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            {nav("universities")}
          </Link>
          <Link
            href="/scholarships"
            aria-current={pathname === "/scholarships" ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${pathname === "/scholarships" ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            {nav("scholarships")}
          </Link>
          {/*
            The site's own product was unreachable from the catalogue: a reader
            arriving from a channel post saw scholarships and universities and
            nothing else. This link is on every public page by construction.
          */}
          <Link
            href="/features"
            aria-current={pathname === "/features" ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${pathname === "/features" ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            {features("navLabel")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
