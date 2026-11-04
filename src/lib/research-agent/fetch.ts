/**
 * Fetching with retries, caching, same-domain protection and PDF handling
 * (spec §3D, §18, §21, §23).
 */
import { BodyLimitError, cancelBody, readBoundedBytes } from "@/lib/boundedBody";
import { AGENT_CONFIG } from "./config";
import { isSameDomain } from "./domain";
import { isResearchContentType } from "./urlFilter";
import { unsafeOutboundReason } from "@/lib/ssrf";

const cache = new Map<string, { html: string; at: number; bytes: number }>();
const inFlight = new Map<string, Promise<string | null>>();
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
let cacheBytes = 0;
class UnsafeFetchError extends Error {}

function storePage(url: string, html: string) {
  const old = cache.get(url);
  if (old) cacheBytes -= old.bytes;
  cache.delete(url);
  const bytes = Buffer.byteLength(html, "utf8");
  cache.set(url, { html, at: Date.now(), bytes }); cacheBytes += bytes;
  while (cache.size > 64 || cacheBytes > MAX_CACHE_BYTES) {
    const first = cache.keys().next().value;
    if (first === undefined) break;
    cacheBytes -= cache.get(first)!.bytes; cache.delete(first);
  }
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Redirect statuses the agent will follow manually. */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
/** Browser-equivalent cap, so a redirect loop cannot pin the worker. */
const MAX_REDIRECTS = 5;

/**
 * `fetch` with the SSRF guard applied to EVERY hop, not just the first URL.
 *
 * `redirect: "follow"` hands control of the destination to the remote server:
 * a public page that answers `302 Location: http://169.254.169.254/…` walks
 * straight into the cloud metadata endpoint, and the guard in
 * `fetchPageText` never sees that URL because it only checked the one the
 * caller passed in. Following redirects by hand keeps the ordinary
 * http→https / apex→www behaviour working while re-checking each target.
 *
 * Exported for tests — the redirect chain is the part that cannot be reasoned
 * about from the call site alone.
 */
export async function fetchGuarded(url: string, init: RequestInit): Promise<Response> {
  let current = url;
  let options = { ...init, headers: new Headers(init.headers) };
  const initialUnsafe = unsafeOutboundReason(current);
  if (initialUnsafe) throw new UnsafeFetchError(`refusing to fetch ${current}: ${initialUnsafe}`);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { ...options, redirect: "manual" });
    if (!REDIRECT_STATUSES.has(res.status)) return res;

    cancelBody(res.body); // even a redirect may stream forever
    const location = res.headers.get("location");
    if (!location) throw new Error(`HTTP ${res.status} without a Location header`);

    let next: string;
    try {
      // Location may be relative ("…/admissions") or protocol-relative.
      next = new URL(location, current).toString();
    } catch {
      throw new Error(`HTTP ${res.status} with an unparsable Location: ${location}`);
    }
    const unsafe = unsafeOutboundReason(next);
    if (unsafe) {
      // Deliberately not a retryable error message: the target is refused, so
      // retrying the same chain would only repeat the refusal.
      throw new UnsafeFetchError(`refusing to follow redirect to ${next}: ${unsafe}`);
    }
    if (new URL(current).origin !== new URL(next).origin) {
      const headers = new Headers(options.headers);
      for (const name of ["authorization", "cookie", "proxy-authorization", "host"]) headers.delete(name);
      options = { ...options, headers };
    }
    current = next;
  }
  throw new Error(`too many redirects (>${MAX_REDIRECTS}) from ${url}`);
}

/** Fetch a page's text content with retries. Returns null on final failure. */
export async function fetchPageText(url: string): Promise<string | null> {
  // SSRF guard: the agent follows URLs taken from web content and admin input,
  // so it must never be steered at localhost, the cloud metadata endpoint or
  // any private network address.
  const unsafe = unsafeOutboundReason(url);
  if (unsafe) {
    console.warn(`[research-agent] refused to fetch ${url}: ${unsafe}`);
    return null;
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    cache.delete(url); cache.set(url, cached);
    return cached.html;
  }
  if (cached) { cache.delete(url); cacheBytes -= cached.bytes; }
  const pending = inFlight.get(url);
  if (pending) return pending;
  // Bounded concurrent crawls: don't let one admin batch exhaust the app heap.
  if (inFlight.size >= 8) return null;
  const run = loadPage(url).finally(() => { inFlight.delete(url); });
  inFlight.set(url, run);
  return run;
}

async function loadPage(url: string): Promise<string | null> {
  for (let attempt = 0; attempt <= AGENT_CONFIG.retries; attempt++) {
    try {
      const signal = AbortSignal.timeout(AGENT_CONFIG.timeoutMs);
      const res = await fetchGuarded(url, {
        headers: { "User-Agent": AGENT_CONFIG.userAgent, Accept: "text/html,application/pdf,*/*" }, signal,
      });
      if (!res.ok) {
        cancelBody(res.body);
        // Permanent 4xx are not healed by repeating the same request.
        if (res.status >= 400 && res.status < 500 && ![408, 429].includes(res.status)) return null;
        throw new Error(`HTTP ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!isResearchContentType(contentType)) { cancelBody(res.body); return null; }
      // PDF extraction is still unsupported: don't download an unbounded PDF.
      if (contentType.includes("application/pdf")) { cancelBody(res.body); return ""; }
      const declared = Number(res.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > MAX_PAGE_BYTES) { cancelBody(res.body); return null; }
      let text = new TextDecoder().decode(await readBoundedBytes(res.body, MAX_PAGE_BYTES, signal));
      text = text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
      storePage(url, text);
      return text;
    } catch (err) {
      if (err instanceof UnsafeFetchError || err instanceof BodyLimitError) return null;
      // Metadata only: upstream errors/URLs may contain access tokens.
      console.warn(`[research-agent] fetch failed (${attempt + 1}/${AGENT_CONFIG.retries + 1})`);
      if (attempt < AGENT_CONFIG.retries) await sleep(600 * (attempt + 1));
    }
  }
  return null;
}

/**
 * Fetch the homepage of a domain, trying both bare and www variants.
 * Many official sites (e.g. imperial.ac.uk) only serve HTTPS on www — the
 * agent must tolerate both. Returns the working URL together with the HTML.
 */
export async function fetchHomepage(
  domain: string
): Promise<{ url: string; html: string } | null> {
  const candidates = domain.startsWith("www.")
    ? [domain, domain.replace(/^www\./, "")]
    : [domain, `www.${domain}`];
  for (const d of candidates) {
    const url = `https://${d}/`;
    const html = await fetchPageText(url);
    if (html) return { url, html };
  }
  return null;
}

/** Extract same-domain absolute URLs from HTML. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  const base = new URL(baseUrl);
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      const url = new URL(href, base).toString();
      // Same-domain only, www/bare tolerant (spec §3D).
      if (isSameDomain(url, base.host)) out.add(url);
    } catch {
      // ignore malformed
    }
  }
  return [...out];
}

/** Strip HTML tags → plain text (keeps tables readable line by line). */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h1|h2|h3|h4|td|th)>/gi, "\n")
    .replace(/<t[dh][^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Text of the first <main> or <article> region, else body without nav/footer/header/aside/form. */
export function extractMainText(html: string): { text: string; textNoLinks: string; hasMainRegion: boolean } {
  const mainMatch = /<main[\s>][\s\S]*?<\/main>/i.exec(html) || /<article[\s>][\s\S]*?<\/article>/i.exec(html);
  if (mainMatch) {
    const region = mainMatch[0];
    return {
      text: htmlToText(region),
      // Link labels are mini-navigation ("Tuition fees", "How to apply",
      // "Scholarships") — they must never weigh like main content.
      textNoLinks: htmlToText(region.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ")),
      hasMainRegion: true,
    };
  }
  // Fallback: cleaned body — site-wide menus/footers are removed so their
  // keywords ("scholarship", "study", ...) never weigh like main content.
  const cleaned = html
    .replace(/<nav[\s>][\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s>][\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s>][\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s>][\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s>][\s\S]*?<\/form>/gi, " ")
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, " ");
  const text = htmlToText(cleaned);
  return {
    text,
    textNoLinks: htmlToText(cleaned.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ")),
    hasMainRegion: false,
  };
}

/** Structured view of a fetched page: title, H1/H2 headings, main content. */
export interface PageStructure {
  title: string;
  h1: string[];
  h2: string[];
  mainText: string;
  /** Main content with link labels removed — nav-like text never weighs as content. */
  mainTextNoLinks: string;
  fullText: string;
  hasMainRegion: boolean;
}

/** Extract title/H1/H2/main-content from raw HTML (regex-based, no deps). */
export function extractPageStructure(html: string): PageStructure {
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleM ? stripTags(titleM[1]) : "";
  const h1: string[] = [];
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let m1: RegExpExecArray | null;
  while ((m1 = h1Re.exec(html)) !== null) {
    const t = stripTags(m1[1]);
    if (t) h1.push(t);
  }
  const h2: string[] = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m2: RegExpExecArray | null;
  while ((m2 = h2Re.exec(html)) !== null) {
    const t = stripTags(m2[1]);
    if (t) h2.push(t);
  }
  const { text: mainText, textNoLinks, hasMainRegion } = extractMainText(html);
  const fullText = htmlToText(html.replace(/<script[\s>][\s\S]*?<\/script>/gi, " ").replace(/<style[\s>][\s\S]*?<\/style>/gi, " "));
  return { title, h1, h2, mainText, mainTextNoLinks: textNoLinks, fullText, hasMainRegion };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
