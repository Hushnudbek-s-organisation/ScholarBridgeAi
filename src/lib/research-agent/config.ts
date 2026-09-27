import { configuredAppUrl } from "@/lib/appUrl";
/**
 * Agent configuration (spec §21 — cost control, no hardcoded magic numbers in logic).
 */
export const AGENT_CONFIG = {
  /** Max pages fetched per university (cost control). */
  maxPagesDefault: 8,
  /** Fetch timeout per page (ms). */
  timeoutMs: 15000,
  /** Retry count for failed fetches (spec §18). */
  retries: 2,
  /** Delay between fetches to the same domain (ms) — rate limiting. */
  fetchDelayMs: 800,
  /** Delay between universities in batch mode (ms). */
  batchDelayMs: 1500,
  /** Max programs captured per university. */
  maxPrograms: 12,
  /** Course-hub pages crawled one level for program discovery (spec §7). */
  maxHubPages: 4,
  /** AI request budget per run (spec §17): classification + extraction per page, capped. */
  aiMaxCallsPerRun: 24,
  /** Max sitemap FILES parsed (nested index children count) (spec §3C). */
  maxSitemapFiles: 10,
  /** Max program/scholarship/requirements URLs added from sitemaps (spec §3C). */
  maxSitemapUrls: 100,
  /** Confidence threshold to auto-write (below → review_required). */
  writeConfidence: 0.7,
  /** Confidence threshold for "verified" status. */
  verifiedConfidence: 0.92,
  /** Allowed currencies (spec §7 — never convert). */
  allowedCurrencies: new Set([
    "USD", "GBP", "EUR", "CHF", "CAD", "AUD", "HKD", "SGD", "JPY", "KRW", "UZS", "NZD", "CNY", "INR",
  ]),
  /** Identifies the crawler; the contact URL is the deployment's own APP_URL. */
  get userAgent(): string {
    const site = configuredAppUrl();
    return `Mozilla/5.0 (compatible; ScholarBridgeResearchAgent/1.0${site ? `; +${site}` : ""})`;
  },
  /** Never follow links to these (third-party aggregators are discovery-only). */
  aggregatorDomains: ["topuniversities.com", "universityrankings", "4icu.org", "collegedunia", "edurank"],
};

export const DEFAULT_SCOPES = [
  "university",
  "programs",
  "requirements",
  "tuition",
  "living_costs",
  "application_cycles",
  "scholarships",
  "sources",
] as const;
