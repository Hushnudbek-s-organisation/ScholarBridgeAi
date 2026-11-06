import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The build identifier of the server process that is answering THIS request.
 *
 * A Render deploy swaps the running process while old browser tabs keep the
 * HTML (and the `/_next/static/...` URLs) of the previous build. When the old
 * chunks disappear, a dynamic import fails with "Loading chunk N failed". The
 * HTML carries this marker in a <meta> tag; `/api/config/build` reports the
 * marker of the *current* process. Comparing the two tells an old tab that a
 * new version exists — without guessing that every chunk error is "a cache
 * problem" and without an automatic reload loop.
 *
 * `.next/BUILD_ID` is written by `next build` and read at runtime. It is not a
 * secret: it is already part of every asset URL. In dev (no file) and in the
 * standalone desktop bundle we fall back to a stable, non-secret marker.
 */
export function currentBuildId(): string {
  try {
    const id = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
    if (id && /^[A-Za-z0-9_-]{1,128}$/.test(id)) return id;
  } catch {
    // No build artifact (next dev, or a relocated standalone output).
  }
  const commit = (process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "")
    .trim()
    .slice(0, 12);
  return /^[0-9a-f]{7,12}$/i.test(commit) ? `commit-${commit}` : "dev";
}
