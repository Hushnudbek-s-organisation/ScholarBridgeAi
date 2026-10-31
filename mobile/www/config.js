/**
 * Default server address for this build of the Android app.
 *
 * The APK is a window onto the ScholarBridge site: it opens the address below
 * over the internet and keeps nothing locally, so the account and every record
 * are the site's own — the same ones the laptop app and the browser show.
 * The session cookie is remembered by the WebView, so the password is asked
 * once, not on every launch.
 *
 * To ship a build that opens a different deployment (a fork, a staging site):
 *
 *   SCHOLARBRIDGE_DEFAULT_SERVER=https://your-domain npm run mobile:prepare
 *
 * A user can still change the address on the connect screen; it is stored on
 * the phone. The value is not a secret — it is the app's public address,
 * exactly like a bookmark.
 */
window.SCHOLARBRIDGE_DEFAULT_SERVER = "https://scholarbridgeai-9bmd.onrender.com";
