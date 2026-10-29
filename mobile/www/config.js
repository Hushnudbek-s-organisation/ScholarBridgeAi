/**
 * Default server address for this build of the Android app.
 *
 * Left empty in the repository: the app then asks for the address on first
 * launch (type the one the laptop app shows, or scan its QR). To ship a build
 * that opens a hosted deployment directly, run:
 *
 *   SCHOLARBRIDGE_DEFAULT_SERVER=https://your-domain npm run mobile:prepare
 *
 * which rewrites this file. The value is not a secret — it is the app's public
 * address, exactly like a bookmark.
 */
window.SCHOLARBRIDGE_DEFAULT_SERVER = "";
