/**
 * Environment loading for standalone scripts (`npm run test:*`, `db:*`).
 *
 * Why this exists: Next.js loads `.env.local` automatically, but a plain
 * `tsx scripts/…` does not — and the README's local setup puts DATABASE_URL
 * in `.env.local`. Without this, `npm run test:provenance` (and friends)
 * failed locally with a bare "ERROR" while CI (which exports DATABASE_URL)
 * passed. Scripts import this module instead of `dotenv/config`.
 *
 * Order: `.env.local` first (local override), then `.env`. Values already
 * present in the real environment are NEVER overwritten, so CI exports and
 * one-off `DATABASE_URL=… npm run …` invocations keep winning.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
