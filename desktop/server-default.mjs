/**
 * The ScholarBridge site this build opens.
 *
 * The desktop and Android apps are windows onto the hosted site: every piece
 * of data lives in the site's own database, so signing in on the laptop shows
 * exactly what the phone shows. `desktop/remote.mjs` reads this value; the
 * build can rewrite it with
 *
 *   SCHOLARBRIDGE_SERVER_URL=https://my-domain.example node scripts/build-desktop.mjs
 *
 * which is how a fork ships its own address. A user can always override it in
 * the app (Server menu) — the value is not a secret, it is a bookmark.
 */
export const DEFAULT_SERVER_URL = "https://scholarbridgeai-9bmd.onrender.com";
