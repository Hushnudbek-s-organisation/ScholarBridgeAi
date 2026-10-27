/**
 * Should a **web request** be allowed to seed / maintain the catalogue?
 *
 * Seeding is a deployment step, not a page render. Before this module the
 * answer was "yes, always": `seedDatabase()` ran from `GET /api/universities`
 * and `GET /api/scholarships`, and the "database already has data" branch then
 * fired the whole catalogue top-up (regional universities, verified facts,
 * program catalogue, scholarship cycles, opportunities, growth/journey DDL, rich
 * platform data, forum, courses, gamification) in the background of a student's
 * request. On a small Render instance that is exactly the workload that makes
 * the first page after a deploy look broken.
 *
 * Policy (`SEED_ON_REQUEST`):
 *
 *   auto  (default) — CLI / tests / local development may seed from a request;
 *                     a production server may not. Production data comes from
 *                     `scripts/seed-db.ts`, `POST /api/admin/refresh` or the
 *                     seed button in the admin panel.
 *   on              — always allowed (a small self-hosted install that wants the
 *                     old behaviour can set this).
 *   off             — never, in any environment.
 *
 * `seedDatabase({ force: true })` and the admin endpoints bypass this gate: they
 * are explicit operator actions, not user traffic.
 */

export type RequestSeedingPolicy = "auto" | "on" | "off";

export function requestSeedingPolicy(env: Record<string, string | undefined> = process.env): RequestSeedingPolicy {
  const raw = (env.SEED_ON_REQUEST ?? "").trim().toLowerCase();
  if (raw === "on" || raw === "1" || raw === "true") return "on";
  if (raw === "off" || raw === "0" || raw === "false") return "off";
  return "auto";
}

/** True when the current environment allows seeding from a normal request. */
export function requestPathSeedingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const policy = requestSeedingPolicy(env);
  if (policy === "on") return true;
  if (policy === "off") return false;
  // `auto`: everything except a production server. Tests and `next dev` keep
  // working unchanged, which is what the integration suites rely on.
  return env.NODE_ENV !== "production";
}
