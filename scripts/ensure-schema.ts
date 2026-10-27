/**
 * Apply every additive schema repair the app knows about, from the command line.
 *
 * WHY THIS EXISTS
 * ---------------
 * With `SCHEMA_AUTO_REPAIR=off` (the recommended production setting) a web
 * request never runs DDL — it only verifies that the tables exist, because a
 * `CREATE TABLE` takes an ACCESS EXCLUSIVE lock and can queue behind a long
 * transaction, turning a first page load after a deploy into a timeout. The DDL
 * still has to be applied by someone, and this is that someone:
 *
 *   npm run db:schema            # core, journey, growth, ownership, telegram, channel
 *
 * It prints one line per area and exits non-zero if any area could not be
 * repaired, so it can be used in a deploy hook. It is idempotent: every
 * statement is `CREATE … IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
 *
 * Production equivalent without a shell: Admin → Diagnostics → "Retry", which
 * calls the same forced repairs (POST /api/admin/diagnostics { action: "retry" }).
 */
import "./lib/env";

// The whole point of a CLI run is to apply the DDL, so ignore any
// "requests must not repair" setting inherited from the server environment.
process.env.SCHEMA_AUTO_REPAIR = "auto";

import { forceCoreSchemaRepair } from "@/lib/core/db";
import { forceJourneyRepair } from "@/lib/journey/db";
import { forceGrowthRepair } from "@/lib/growth/db";
import { forceOwnershipRepair } from "@/lib/ownership/db";
import { forceTelegramRepair } from "@/lib/telegram/db";
import { forceChannelRepair } from "@/lib/channel/db";

if (!process.env.DATABASE_URL) {
  console.error("[schema] DATABASE_URL is required.");
  process.exit(2);
}

const AREAS: { name: string; run: () => Promise<boolean> }[] = [
  { name: "core", run: forceCoreSchemaRepair },
  { name: "journey", run: forceJourneyRepair },
  { name: "growth", run: forceGrowthRepair },
  { name: "ownership", run: forceOwnershipRepair },
  { name: "telegram", run: forceTelegramRepair },
  { name: "channel", run: forceChannelRepair },
];

async function main() {
  const failed: string[] = [];
  for (const area of AREAS) {
    const ok = await area.run();
    console.log(`[schema] ${ok ? "ok  " : "FAIL"} ${area.name}`);
    if (!ok) failed.push(area.name);
  }
  if (failed.length) {
    console.error(`[schema] ${failed.length} area(s) failed: ${failed.join(", ")} — see the log above.`);
    process.exitCode = 1;
    return;
  }
  console.log("[schema] all areas repaired (idempotent — nothing changed where it was already correct).");
}

main()
  .catch((err) => {
    console.error("[schema] failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    // The pg pool keeps the event loop alive; exit explicitly.
    process.exit(process.exitCode ?? 0);
  });
