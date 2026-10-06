/**
 * Client-side counterpart of appUrl.ts: the server returns app-relative
 * links ("/?ref=X") when no canonical APP_URL is configured, and the browser
 * completes them with the origin it is actually running on.
 */

/** Origins that only mean something to the machine running the server. */
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127(\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)(:\d+)?$/i;

export function absolutizeLink(link: string): string {
  if (typeof window === "undefined") return link;
  // Relative link → the origin the browser is really on.
  if (link.startsWith("/") && !link.startsWith("//")) return `${window.location.origin}${link}`;

  // A link the server built from its OWN loopback address (APP_URL=http://
  // localhost:3000 by default in .env.local) is useless to whoever you send it
  // to, and plain wrong the moment the app is opened through a tunnel, a
  // preview host or the production domain. If we are not ON loopback, rewrite
  // it to the origin we are on — the page you are sharing is the page it links
  // to, by construction.
  try {
    const url = new URL(link);
    const browserIsLoopback = /^(localhost|127(\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i.test(
      window.location.hostname
    );
    if (LOOPBACK_ORIGIN.test(url.origin) && !browserIsLoopback) {
      return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Not an absolute URL — nothing to rewrite.
  }
  return link;
}
