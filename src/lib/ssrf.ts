/**
 * SSRF guard for outbound fetches made on behalf of a user/admin (research
 * agent, web-search fallback, webhook previews).
 *
 * Server-side fetchers must never be pointed at the app's own network:
 * localhost, the cloud metadata endpoint (169.254.169.254), link-local or
 * private ranges. `assertSafeOutboundUrl` rejects those before any request is
 * made and is called on every URL the research agent follows.
 */

/** Hosts that must never be fetched, whatever they resolve to. */
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "kubernetes.default.svc",
]);

/** Literal IP literals that are internal / reserved. */
function isInternalLiteralIp(hostname: string): boolean {
  // Strip IPv6 brackets.
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (host.includes(":")) {
    // IPv6 (possibly compressed).
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local
    if (host.startsWith("fe80")) return true; // link-local
    // IPv4-mapped (::ffff:127.0.0.1)
    const mapped = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host);
    if (mapped) return isInternalLiteralIp(mapped[1]);
    return false;
  }

  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a > 255 || b > 255) return false;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 0) return true; // "this network"
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Reason a URL must not be fetched, or null when it is safe to fetch. */
export function unsafeOutboundReason(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return "not a valid URL";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return `protocol not allowed (${url.protocol})`;
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname) return "missing host";
  if (BLOCKED_HOSTS.has(hostname)) return `blocked host (${hostname})`;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return `blocked host (${hostname})`;
  }
  if (isInternalLiteralIp(hostname)) return "internal/reserved IP address";
  // Decimal / hex encoded IPs (e.g. http://2130706433/) bypass dotted checks.
  if (/^\d+$/.test(hostname)) {
    const n = Number(hostname);
    if (Number.isFinite(n)) {
      const dotted = [
        (n >>> 24) & 255,
        (n >>> 16) & 255,
        (n >>> 8) & 255,
        n & 255,
      ].join(".");
      if (isInternalLiteralIp(dotted)) return "internal/reserved IP address";
    }
  }
  if (/^0x[0-9a-f]+$/i.test(hostname)) return "internal/reserved IP address";
  return null;
}

/** True when the URL is safe for a server-side fetch. */
export function isSafeOutboundUrl(rawUrl: string): boolean {
  return unsafeOutboundReason(rawUrl) === null;
}

/** Throw a descriptive Error for an unsafe URL (call sites that must abort). */
export function assertSafeOutboundUrl(rawUrl: string): URL {
  const reason = unsafeOutboundReason(rawUrl);
  if (reason) throw new Error(`Refusing to fetch ${rawUrl}: ${reason}`);
  return new URL(rawUrl);
}
