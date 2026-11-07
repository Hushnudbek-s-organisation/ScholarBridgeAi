/**
 * Server-side official-source re-verification adapter.
 *
 * This is the concrete implementation that `refresh.ts` was missing. It does
 * NOT treat "HTTP 200" as verification. For each important catalogue fact it:
 *
 *   1. fetches the OFFICIAL page with SSRF protections (URL allowlist, DNS/IP
 *      resolution check, redirect re-validation, timeout, response-size cap);
 *   2. verifies ONE SPECIFIC FACT — the field label and its expected value must
 *      both appear, close together, on that page, at the expected official
 *      domain. A 200 with the wrong page, a parse error, a mismatched value or
 *      a different host is a FAILED check;
 *   3. returns an evidence-backed `OfficialSourceCheck` so `refresh.ts` may
 *      advance `last_verified_at` only when `mayRefreshVerifiedDate` allows it;
 *   4. persists the RESULT, the VERIFIED FACT and the SOURCE (never a secret,
 *      never a document body) for the admin review queue and audit log.
 *
 * Old verified values are never overwritten: this module only reports checks;
 * it never writes to universities/scholarships. `refresh.ts` writes the date.
 *
 * Everything network- or DB-facing is injectable, so the offline behavior
 * guard (`scripts/check-official-source-adapter.ts`) proves real parsing,
 * SSRF rejection and evidence rules without contacting any official site.
 */
import { lookup } from "node:dns/promises";
import {
  assertSafeOutboundUrl,
  assertPublicResolvedAddresses,
} from "@/lib/ssrf";
import type {
  OfficialSourceAdapter,
  OfficialSourceCheck,
} from "@/lib/refreshModes";

export interface OfficialSourceTarget {
  factId?: string;
  expectedVersion?:string;
  applicantScope?:string|null;
  unit?:string|null;
  currency?:string|null;
  period?:string|null;
  valueType?:string|null;
  entityType: "university" | "scholarship" | "program";
  entityId: number;
  /** The one field this check verifies, e.g. `min_ielts`. */
  fieldKey: string;
  /** The exact published value that must be present, e.g. `7.0`. */
  expectedValue: string;
  sourceUrl: string;
  /** Final host must be this domain or a subdomain of it. */
  officialDomain: string;
  admissionCycle?: string | null;
  programName?: string | null;
  degreeLevel?: string | null;
}

export interface OfficialSourceCheckResult extends OfficialSourceCheck {
  factId?: string;
  expectedVersion?:string;
  applicantScope?:string|null;
  unit?:string|null;
  currency?:string|null;
  period?:string|null;
  valueType?:string|null;
  factApplied?:boolean;
  programName?: string | null;
  degreeLevel?: string | null;
  fieldKey: string;
  verifiedFact: string | null;
  /** Bounded, HTML-escaped page excerpt proving the fact (no PII/secrets). */
  evidenceExcerpt: string | null;
  httpStatus: number | null;
  /** Safe, loggable reason (never a URL with credentials or a token). */
  reason: string | null;
  checkedAt: string;
  admissionCycle?: string | null;
}

export interface FetchPolicy {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
}

export const DEFAULT_FETCH_POLICY: FetchPolicy = {
  timeoutMs: 8_000,
  maxBytes: 512_000,
  maxRedirects: 2,
};

/** Minimal HTML → text that keeps finding a fact honest (no hidden text). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** A field key becomes a readable label we can search for on the page. */
export function fieldLabelTokens(fieldKey: string): string[] {
  const base = fieldKey
    .replace(/^min_|^max_/, "")
    .replace(/_/g, " ")
    .trim();
  const aliases: Record<string, string[]> = {
    ielts: ["ielts"],
    toefl: ["toefl"],
    gpa: ["gpa", "grade point average"],
    sat: ["sat"],
    act: ["act"],
    tuition: ["tuition", "fee"],
    deadline: ["deadline", "application"],
    amount: ["award", "scholarship", "stipend", "amount"],
    qs_rank: ["ranking", "qs"],
    acceptance_rate: ["acceptance rate", "admit rate"],
  };
  return aliases[base] ?? [base];
}

/** Escape a bounded excerpt so it is safe to store/log and render. */
function safeExcerpt(text: string, max = 240): string {
  const clean = text.slice(0, max);
  return clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Verify ONE specific fact on the fetched page. HTTP status alone is never
 * sufficient: the field label AND its value must co-occur within a bounded
 * window, at the expected official host.
 */
export function verifyFactOnPage(input: {
  html: string;
  status: number;
  finalUrl: string;
  target: OfficialSourceTarget;
}): Omit<
  OfficialSourceCheckResult,
  "entityType" | "entityId" | "sourceUrl" | "fieldKey" | "admissionCycle"
> {
  const { html, status, finalUrl, target } = input;
  const base = {
    officialPageReRead: false,
    verificationSucceeded: false,
    evidencePresent: false,
    verifiedFact: null as string | null,
    evidenceExcerpt: null as string | null,
    httpStatus: status,
    reason: null as string | null,
    checkedAt: new Date(0).toISOString(),
  };

  if (status < 200 || status >= 300) {
    return { ...base, reason: `official page returned HTTP ${status}` };
  }

  // Source mismatch: the final host must be the declared official domain.
  let host: string;
  try {
    host = new URL(finalUrl).hostname.toLowerCase();
  } catch {
    return { ...base, reason: "final URL could not be parsed" };
  }
  const expected = target.officialDomain.toLowerCase().replace(/^www\./, "");
  const hostOk = host === expected || host === `www.${expected}` || host.endsWith(`.${expected}`);
  if (!hostOk) {
    return { ...base, reason: "final host does not match the official source domain" };
  }

  // A 200 is NOT fact confirmation. Parse the page and find the specific fact.
  const text = htmlToText(html);
  if (!text) {
    return { ...base, officialPageReRead: true, reason: "official page had no readable content (parse error)" };
  }
  const lower = text.toLowerCase();
  const value = target.expectedValue.trim();
  if (!value) {
    return { ...base, officialPageReRead: true, reason: "no expected value recorded for this fact" };
  }
  const labels = fieldLabelTokens(target.fieldKey);
  const valueIndex = lower.indexOf(value.toLowerCase());
  const labelIndex = labels
    .map((label) => ({ label, at: lower.indexOf(label) }))
    .filter((entry) => entry.at >= 0)
    .sort((a, b) => a.at - b.at)[0];

  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const numeric = /^\d+(?:\.\d+)?$/.test(value);
  const exact = new RegExp(`(?<![\\w.])${escape(value)}(?![\\w.])`, "i");
  const sentences = text.split(/(?<=[.!?;])\s+(?=[A-Z])/);
  const candidates = sentences.filter(part => labels.some(label => new RegExp(`\\b${escape(label)}\\b`,"i").test(part)) && exact.test(part));
  const conflicts = /not\s+required|not\s+necessary|recommend|optional|waiv|another\s+program|other\s+program/i;
  const scoped = (part: string) => [target.admissionCycle, target.programName, target.degreeLevel].every(v=>!v || part.toLowerCase().includes(v.toLowerCase()));
  const minimum = /minimum|min\.?\s|at least|no less than|required|requirement/i;
  const isScore = /^(min_|max_)/.test(target.fieldKey);
  // Unsupported extractors remain review-needed, not guessed verified.
  const supported = isScore && /ielts|toefl|gpa|sat|act|det/.test(target.fieldKey);
  const factFound = supported && numeric && candidates.length === 1 && scoped(candidates[0]) && !conflicts.test(text) && minimum.test(candidates[0]);
  if (!factFound) {
    return {
      ...base,
      officialPageReRead: true,
      reason: "specific fact (field label + published value) not found on the official page",
    };
  }

  const start = Math.max(0, Math.min(valueIndex, labelIndex.at) - 40);
  return {
    officialPageReRead: true,
    verificationSucceeded: true,
    evidencePresent: true,
    verifiedFact: `${target.fieldKey}=${value}`,
    evidenceExcerpt: safeExcerpt(text.slice(start, start + 240)),
    httpStatus: status,
    reason: null,
    checkedAt: new Date(0).toISOString(),
  };
}

export interface FetchDeps {
  fetchImpl?: (url: string, init: { signal: AbortSignal; redirect: "manual" }) => Promise<{
    status: number;
    headers: { get(name: string): string | null };
    text(): Promise<string>;
    body?: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> } } | null;
  }>;
  lookupImpl?: (hostname: string) => Promise<{ address: string }[]>;
}

/**
 * SSRF-safe fetch. Every hop (including redirects) is re-validated: the URL
 * allowlist, DNS resolution to public IPs, a hard timeout, and a streaming
 * response-size cap. `redirect: "manual"` prevents an implicit hop to an
 * internal address (e.g. 169.254.169.254) that a plain fetch would follow.
 */
export async function fetchOfficialPage(
  rawUrl: string,
  policy: FetchPolicy = DEFAULT_FETCH_POLICY,
  deps: FetchDeps = {},
): Promise<{
  status: number;
  finalUrl: string;
  html: string;
  reason: string | null;
}> {
  const fetchImpl = deps.fetchImpl ?? (globalThis.fetch as unknown as FetchDeps["fetchImpl"]);
  const lookupImpl = deps.lookupImpl ?? (async (hostname: string) =>
    lookup(hostname, { all: true, verbatim: true }) as Promise<{ address: string }[]>);

  let url = rawUrl;
  for (let hop = 0; hop <= policy.maxRedirects; hop++) {
    let parsed: URL;
    try {
      parsed = assertSafeOutboundUrl(url); // protocol + literal-IP + host blocklist
    } catch (err) {
      return { status: 0, finalUrl: url, html: "", reason: (err as Error).message };
    }
    if (parsed.protocol !== "https:") {
      return { status: 0, finalUrl: url, html: "", reason: "official sources must use https" };
    }
    // DNS rebinding guard: EVERY resolved address must be public.
    try {
      const addresses = await lookupImpl(parsed.hostname);
      assertPublicResolvedAddresses(addresses);
    } catch (err) {
      return { status: 0, finalUrl: url, html: "", reason: (err as Error).message };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
    try {
      const response = await fetchImpl!(url, { signal: controller.signal, redirect: "manual" });
      const status = response.status;
      const location = response.headers.get("location");
      if (status >= 300 && status < 400 && location) {
        if (hop >= policy.maxRedirects) {
          return { status, finalUrl: url, html: "", reason: "too many redirects" };
        }
        const next = new URL(location, url).toString();
        // Reject a redirect that leaves https or the public internet BEFORE the
        // next iteration re-validates DNS. A relative/internal redirect is
        // refused here so it can never reach the fetch call.
        const nextReason = (() => {
          try {
            const u = new URL(next);
            return u.protocol !== "https:" ? "redirect left https" : null;
          } catch {
            return "invalid redirect target";
          }
        })();
        if (nextReason) return { status, finalUrl: url, html: "", reason: nextReason };
        url = next;
        continue;
      }

      // Streaming size cap: stop reading (and cancel) once the limit is hit.
      let html = "";
      const reader = response.body?.getReader?.();
      if (reader) {
        const decoder = new TextDecoder();
        let bytes = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value?.byteLength ?? 0;
          if (bytes > policy.maxBytes) {
            await reader.cancel().catch(() => {});
            return { status, finalUrl: url, html: "", reason: "official page exceeded the response-size cap" };
          }
          html += decoder.decode(value, { stream: true });
        }
      } else {
        const text = await response.text();
        if (text.length > policy.maxBytes) {
          return { status, finalUrl: url, html: "", reason: "official page exceeded the response-size cap" };
        }
        html = text;
      }
      return { status, finalUrl: url, html, reason: null };
    } catch (err) {
      const message = (err as Error)?.name === "AbortError"
        ? "official page request timed out"
        : "official page request failed";
      return { status: 0, finalUrl: url, html: "", reason: message };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 0, finalUrl: url, html: "", reason: "too many redirects" };
}

export interface OfficialSourceAdapterOptions {
  /** Targets to check. In production, `loadOfficialSourceTargets` supplies them. */
  targets: OfficialSourceTarget[] | ((scope: string) => Promise<OfficialSourceTarget[]>);
  policy?: Partial<FetchPolicy>;
  deps?: FetchDeps;
  /** Persist the result + verified fact + source. Injected in tests. */
  persist?: (result: OfficialSourceCheckResult) => Promise<void> | void;
  now?: () => Date;
}

/**
 * Build the `OfficialSourceAdapter` consumed by `runRefresh`. A failed check
 * yields `officialPageReRead=false` or `evidencePresent=false`, so
 * `mayRefreshVerifiedDate` refuses to move any verified date.
 */
export function createOfficialSourceAdapter(
  options: OfficialSourceAdapterOptions,
): OfficialSourceAdapter {
  const policy: FetchPolicy = { ...DEFAULT_FETCH_POLICY, ...options.policy };
  const now = options.now ?? (() => new Date());

  return async (scope: "all" | "scholarships" | "universities") => {
    const targets = typeof options.targets === "function"
      ? await options.targets(scope)
      : options.targets;
    const scoped = targets.filter((t) =>
      scope === "all" ||
      (scope === "scholarships" && t.entityType === "scholarship") ||
      (scope === "universities" && (t.entityType === "university" || t.entityType === "program")),
    );

    const results: OfficialSourceCheckResult[] = [];
    const pages = new Map<string, ReturnType<typeof fetchOfficialPage>>();
    for (const target of scoped) {
      if(!pages.has(target.sourceUrl)) pages.set(target.sourceUrl,fetchOfficialPage(target.sourceUrl, policy, options.deps));
      const page = await pages.get(target.sourceUrl)!;
      let outcome: Omit<OfficialSourceCheckResult, "entityType" | "entityId" | "sourceUrl" | "fieldKey" | "admissionCycle">;
      if (page.reason) {
        outcome = {
          officialPageReRead: false,
          verificationSucceeded: false,
          evidencePresent: false,
          verifiedFact: null,
          evidenceExcerpt: null,
          httpStatus: page.status || null,
          reason: page.reason,
          checkedAt: now().toISOString(),
        };
      } else {
        outcome = {
          ...verifyFactOnPage({ html: page.html, status: page.status, finalUrl: page.finalUrl, target }),
          checkedAt: now().toISOString(),
        };
      }
      const result: OfficialSourceCheckResult = {
        factId: target.factId,
        expectedVersion:target.expectedVersion,
        applicantScope:target.applicantScope??null,
        unit:target.unit??null,currency:target.currency??null,period:target.period??null,valueType:target.valueType??null,
        programName: target.programName ?? null,
        degreeLevel: target.degreeLevel ?? null,
        entityType: target.entityType,
        entityId: target.entityId,
        sourceUrl: target.sourceUrl,
        fieldKey: target.fieldKey,
        admissionCycle: target.admissionCycle ?? null,
        ...outcome,
      };
      // Persist result + verified fact + source BEFORE returning; a storage
      // failure must not turn into a "verified" claim.
      try {
        await options.persist?.(result);
      } catch {
        result.evidencePresent = false;
        result.verificationSucceeded = false;
        result.reason = "verification result could not be persisted";
      }
      results.push(result);
    }
    return results;
  };
}
