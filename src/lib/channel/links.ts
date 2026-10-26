/**
 * Short tracked links (`/go/<code>`).
 *
 * Codes are 5–7 characters from an alphabet without look-alikes
 * (no 0/1/i/l/o), derived deterministically from what the link points at — so
 * one scholarship always gets the same "site" code and the same "official" code
 * in every post, without a lookup race. The row in `channel_links` is still the
 * only source of the destination: the route never reads a URL from the request.
 */
import { createHash } from "crypto";
import { unsafeOutboundReason } from "@/lib/ssrf";

/**
 * Lower-case base32 alphabet, exactly 32 symbols so every 5-bit chunk maps onto
 * one character. `0`, `1`, `l` and `o` are excluded: they are the classic
 * look-alike set (0/O, 1/l/I). `i` stays, because a standalone `1` cannot occur.
 */
export const SHORT_LINK_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
export const MIN_CODE_LENGTH = 5;
export const MAX_CODE_LENGTH = 7;
export const DEFAULT_CODE_LENGTH = 6;

export type LinkKind = "site" | "official" | "custom";

export function toBaseAlphabet(bytes: Buffer, length: number): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += SHORT_LINK_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= length) break;
  }
  return out;
}

function hashCode(seed: string, length: number): string {
  const digest = createHash("sha256").update(`channel-link|${seed}`).digest();
  return toBaseAlphabet(digest, Math.min(MAX_CODE_LENGTH, Math.max(MIN_CODE_LENGTH, length)));
}

/**
 * The stable code for one (scholarship, kind) pair. Deterministic on purpose:
 * every post about the same scholarship reuses the same link, and the
 * Phase 1 preview prints exactly the code Phase 2 will store.
 */
export function scholarshipLinkCode(scholarshipId: number, kind: Exclude<LinkKind, "custom">, length = DEFAULT_CODE_LENGTH): string {
  return hashCode(`${kind}:${scholarshipId}`, length);
}

/** Custom codes must look like ours; anything else is rejected at creation. */
export function isValidCustomCode(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (value.length < MIN_CODE_LENGTH || value.length > MAX_CODE_LENGTH) return false;
  for (const ch of value) if (!SHORT_LINK_ALPHABET.includes(ch)) return false;
  return true;
}

/**
 * Redirect destinations: HTTPS only, and not a loopback / private / link-local
 * target (the same rules the SSRF guard applies to outbound fetches).
 */
export function unsafeDestinationReason(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return "missing URL";
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "not a valid URL";
  }
  if (url.protocol !== "https:") return `protocol not allowed (${url.protocol})`;
  if (!url.hostname.includes(".")) return "host is not a public domain";
  const reason = unsafeOutboundReason(url.toString());
  return reason;
}

export function isSafeDestination(raw: unknown): boolean {
  return unsafeDestinationReason(raw) === null;
}

/** The internal path a "site" link points at. */
export function siteLinkPath(scholarshipId: number): string {
  return `/scholarships/${scholarshipId}`;
}

export interface ShortLinkView {
  /** Absolute https URL used in the anchor. */
  url: string;
  /** What the reader sees — no scheme, no "https://". */
  visible: string;
}

/** `<a href="https://SITE/go/CODE">SITE/go/CODE</a>` inputs. */
export function shortLinkView(siteUrl: string, code: string): ShortLinkView | null {
  if (!isValidCustomCode(code)) return null;
  const base = (siteUrl || "").replace(/\/+$/, "");
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url: `${base}/go/${code}`, visible: `${base.replace(/^https?:\/\//, "")}/go/${code}` };
}

/** Visible form used in the compact templates ("batafsil: SITE/go/CODE"). */
export function shortLinkLine(view: ShortLinkView | null): string | null {
  if (!view) return null;
  return `<a href="${view.url.replace(/"/g, "&quot;")}">${view.visible}</a>`;
}
