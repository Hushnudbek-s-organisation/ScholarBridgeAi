import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Blank (not delete) provider credentials so Next/dotenv cannot restore them
 * from .env.local. Read only key names; never log or copy file values. Local DB
 * and session values must be assigned by the caller after sanitization. */
export function isolatedServiceEnvironment(source: NodeJS.ProcessEnv, root: string): NodeJS.ProcessEnv {
  const env = { ...source };
  const keys = new Set(Object.keys(env));
  for (const name of readdirSync(root)) {
    if (!/^\.env(?:\.|$)/.test(name)) continue;
    const path = join(root, name);
    if (!statSync(path).isFile()) continue;
    for (const match of readFileSync(path, "utf8").matchAll(/^\s*(?:#\s*)?(?:export\s+)?([A-Za-z_]\w*)\s*=/gm)) keys.add(match[1]);
  }
  for (const key of keys) {
    if (/(^DATABASE_URL$|^POSTGRES.*URL$|API_KEY|APIKEY|TOKEN|SECRET|PASSWORD|PASS$|SMTP_|MAIL_FROM|SUPABASE_|TELEGRAM_|PAYME|CLICK_|STRIPE_)/.test(key)) env[key] = "";
  }
  return env;
}
