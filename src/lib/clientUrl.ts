/**
 * Client-side counterpart of appUrl.ts: the server returns app-relative
 * links ("/?ref=X") when no canonical APP_URL is configured, and the browser
 * completes them with the origin it is actually running on.
 */
export function absolutizeLink(link: string): string {
  if (typeof window === "undefined") return link;
  if (link.startsWith("/") && !link.startsWith("//")) return `${window.location.origin}${link}`;
  return link;
}
