/**
 * The app shell's boot configuration, fetched **once**.
 *
 * Branding, the hidden-navigation list and the section help copy all live in
 * `app_config` and are all needed at boot, but they used to be three separate
 * fetches from three different components (Navbar, BrandingImage, SectionIntro)
 * — three round trips, and on a cold phone connection three chances to be the
 * request that delays the first useful paint.
 *
 * `loadBootConfig()` returns one shared promise, so however many components ask
 * (and however many times they re-render), the network sees exactly one request
 * to `GET /api/config/boot`. A failed load resolves to defaults rather than
 * rejecting: configuration must never break the page.
 *
 * Admin saves dispatch their existing events (`scholarbridge:nav-updated`,
 * `scholarbridge:help-updated`, `scholarbridge:branding-updated`); each one
 * clears the cache, so the next ask re-fetches and the open screen updates.
 */
import { DEFAULT_HIDDEN_NAV_ITEMS, parseHiddenNav } from "@/lib/navSections";
import { parseSectionHelp, type SectionHelpOverride } from "@/lib/growth/defaults";

export interface BootConfig {
  branding: { logo: string | null; favicon: string | null };
  nav: string[];
  guide: Record<string, SectionHelpOverride>;
}

export const EMPTY_BOOT_CONFIG: BootConfig = {
  branding: { logo: null, favicon: null },
  nav: DEFAULT_HIDDEN_NAV_ITEMS,
  guide: {},
};

let cache: BootConfig | null = null;
let inflight: Promise<BootConfig> | null = null;

/** Fetch (or reuse) the boot configuration. Never rejects. */
export function loadBootConfig(): Promise<BootConfig> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/api/config/boot")
    .then((res) => (res.ok ? res.json() : null))
    .then((data): BootConfig => {
      const next: BootConfig = {
        branding: {
          logo: typeof data?.branding?.logo === "string" ? data.branding.logo : null,
          favicon: typeof data?.branding?.favicon === "string" ? data.branding.favicon : null,
        },
        nav: Array.isArray(data?.nav?.hidden)
          ? parseHiddenNav(JSON.stringify(data.nav.hidden))
          : DEFAULT_HIDDEN_NAV_ITEMS,
        guide: data?.guide?.help && typeof data.guide.help === "object" ? data.guide.help : {},
      };
      cache = next;
      return next;
    })
    .catch(() => EMPTY_BOOT_CONFIG)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Forget the cached snapshot — the next `loadBootConfig()` re-fetches. */
export function invalidateBootConfig(): void {
  cache = null;
  inflight = null;
}

/** Test seam. */
export function resetBootConfigForTests(): void {
  invalidateBootConfig();
}
