/**
 * "Window onto the site" mode — the desktop app's default.
 *
 * The app does not keep its own copy of anything: it opens the hosted
 * ScholarBridge site over the internet, so every profile, application and
 * message is the one in the site's database, shared with the phone and the
 * browser. The bundled database is still shipped, but only as an explicit
 * fallback for when the site cannot be reached (Server → Use offline copy).
 *
 * This module holds the decisions so they can be tested without Electron
 * (`scripts/check-remote-mode.mjs`): which address to open, whether a given
 * address answers, and what to tell the user when it does not.
 */
import { DEFAULT_SERVER_URL } from "./server-default.mjs";

/** The address a build opens unless the user or the environment says otherwise. */
export const BUILT_IN_SERVER_URL = DEFAULT_SERVER_URL;

/**
 * Turn whatever a person typed into a usable address, or "" when it cannot be
 * one. `scholarbridge-ai.onrender.com`, `https://x/` and `http://1.2.3.4:4310`
 * are all accepted; anything with another scheme is not.
 */
export function normaliseServerUrl(raw) {
  let value = String(raw ?? "").trim();
  if (!value) return "";
  // A pasted address often carries these.
  value = value.replace(/^[<"'\s]+|[>"'\s]+$/g, "");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    // No scheme typed. A public host name gets https; a machine on the local
    // network (an IP, localhost, or a bare name like "myserver:4310") gets
    // http, because that is the only thing a laptop on the same Wi-Fi serves.
    const hostOnly = value.split("/")[0];
    const isLocal =
      /^(localhost|127\.0\.0\.1|\[?::1\]?|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/i.test(hostOnly) ||
      !hostOnly.includes(".");
    value = `${isLocal ? "http" : "https"}://${value}`;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  if (!url.hostname) return "";
  // Keep a base path (a deployment behind /app), drop the trailing slash so
  // `${base}/api/health` never doubles it.
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

/**
 * Which server should this launch use?
 *
 * Priority: an explicit "I want the offline copy" choice wins, then the
 * environment variable (support / testing), then the address saved by the
 * user, then the one baked into the build. `null` means "start the bundled
 * engine".
 *
 * @param {{envUrl?: string, config?: {serverUrl?: string, offline?: boolean}, builtInUrl?: string}} options
 * @returns {{mode: "remote", url: string, source: string} | {mode: "local", reason: string}}
 */
export function resolveTarget(options = {}) {
  const { envUrl = "", config = {}, builtInUrl = BUILT_IN_SERVER_URL } = options;

  if (config.offline === true) {
    return { mode: "local", reason: "offline-copy-chosen" };
  }
  const candidates = [
    ["env", envUrl],
    ["config", config.serverUrl],
    ["built-in", builtInUrl],
  ];
  for (const [source, raw] of candidates) {
    const url = normaliseServerUrl(raw);
    if (url) return { mode: "remote", url, source };
  }
  return { mode: "local", reason: "no-address" };
}

/**
 * Ask an address whether the site is there.
 *
 * `/api/health` answers 200 when the app and its database are both ready, and
 * 503 when the app is up but the database is not — both prove that the site is
 * reachable, and the difference is worth telling the user about, so it is
 * reported instead of being flattened into "down".
 *
 * A free-tier host puts the app to sleep when nobody uses it; waking it up can
 * take a minute, and the first request is the one that waits. Hence the long
 * default timeout and a second attempt: reporting "unreachable" after 5 seconds
 * would be wrong.
 *
 * @returns {Promise<{ok: boolean, status: number, kind: "ready"|"not_ready"|"unreachable", ms: number, detail: string}>}
 */
export async function probeServer(url, options = {}) {
  const { timeoutMs = 60_000, attempts = 2, fetchImpl = globalThis.fetch, log = () => {} } = options;
  const base = normaliseServerUrl(url);
  if (!base) {
    return { ok: false, status: 0, kind: "unreachable", ms: 0, detail: "the address is not valid" };
  }
  const target = `${base}/api/health`;
  const started = Date.now();
  let detail = "";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchImpl(target, {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        headers: { accept: "application/json", "user-agent": "ScholarBridge-desktop" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const ms = Date.now() - started;
      // Any HTTP answer proves the site is reachable. 200 = app + database
      // ready; 503 = the app is up, its database is not; anything else = a
      // wrong address, a captive portal or a proxy answering for it.
      if (res.status === 200) return { ok: true, status: 200, kind: "ready", ms, detail: "" };
      if (res.status === 503) {
        return {
          ok: true,
          status: 503,
          kind: "not_ready",
          ms,
          detail: "the site answered, but its database is not ready",
        };
      }
      detail = `HTTP ${res.status}`;
      log(`[remote] ${target} → ${detail} (attempt ${attempt}/${attempts})`);
    } catch (err) {
      detail = err?.name === "TimeoutError" ? `no answer within ${Math.round(timeoutMs / 1000)}s` : (err?.message ?? String(err));
      log(`[remote] ${target} failed (attempt ${attempt}/${attempts}): ${detail}`);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { ok: false, status: 0, kind: "unreachable", ms: Date.now() - started, detail };
}

/** One sentence for the splash screen / error dialog. */
export function describeTarget(target) {
  if (target.mode === "local") {
    return target.reason === "offline-copy-chosen"
      ? "Using the offline copy stored on this computer"
      : "Starting the offline copy stored on this computer";
  }
  const host = (() => {
    try {
      return new URL(target.url).host;
    } catch {
      return target.url;
    }
  })();
  return `Connecting to ${host}`;
}
