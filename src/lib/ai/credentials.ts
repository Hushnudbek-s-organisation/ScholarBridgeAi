/**
 * AI provider credential persistence (spec §12, §16).
 *
 * Keys are encrypted at rest (see ./settings.ts) and NEVER exposed through
 * any API — the public views expose only hasKey + a masked hint.
 * Resolution priority: DB (admin panel) → env vars → defaults.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiProviderCredentials } from "@/db/schema";
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  type AIProviderId,
  type PublicCredential,
  decryptApiKey,
  encryptApiKey,
  maskApiKey,
  resolveCredential,
} from "./settings";

export interface StoredCredential {
  id: number;
  provider: string;
  apiKeyEnc: string | null;
  model: string | null;
  updatedAt: Date;
}

/** Warn once per process when the DB is unreachable (keeps logs quiet on the hot path). */
let dbWarningShown = false;
function warnDbUnavailable(operation: string, err: unknown): void {
  if (dbWarningShown) return;
  dbWarningShown = true;
  console.warn(`AI credentials: ${operation} skipped (DB unavailable) — using env fallback:`, (err as Error)?.message);
}

export async function getAllCredentials(): Promise<StoredCredential[]> {
  try {
    const rows = await db.select().from(aiProviderCredentials);
    return rows as StoredCredential[];
  } catch (err) {
    warnDbUnavailable("getAllCredentials", err);
    return [];
  }
}

export async function getCredential(provider: AIProviderId): Promise<StoredCredential | null> {
  try {
    const [row] = await db
      .select()
      .from(aiProviderCredentials)
      .where(eq(aiProviderCredentials.provider, provider));
    return (row as StoredCredential | undefined) ?? null;
  } catch (err) {
    warnDbUnavailable("getCredential", err);
    return null;
  }
}

/** Insert or update a provider credential (apiKey and/or model). */
export async function upsertCredential(
  provider: AIProviderId,
  opts: { apiKey?: string; model?: string }
): Promise<void> {
  const existing = await getCredential(provider);
  const apiKeyEnc = opts.apiKey ? encryptApiKey(opts.apiKey) : (existing?.apiKeyEnc ?? null);
  const model = (opts.model?.trim() || existing?.model) ?? null;

  if (existing) {
    await db
      .update(aiProviderCredentials)
      .set({ apiKeyEnc, model, updatedAt: new Date() })
      .where(eq(aiProviderCredentials.provider, provider));
  } else {
    await db.insert(aiProviderCredentials).values({ provider, apiKeyEnc, model });
  }
}

/** Remove a stored credential (admin cleared the key → env fallback only). */
export async function removeCredential(provider: AIProviderId): Promise<void> {
  await db.delete(aiProviderCredentials).where(eq(aiProviderCredentials.provider, provider));
}

/** Decrypt a stored payload using the runtime secret. */
export function decryptStoredKey(payload: string | null | undefined): string | null {
  return decryptApiKey(payload);
}

/**
 * Resolve a provider's runtime key+model (DB → env) — used by the AI router.
 */
export async function resolveProviderCredential(
  provider: AIProviderId
): Promise<{ apiKey: string | undefined; apiKeySource: "db" | "env" | "none"; model: string }> {
  const stored = await getCredential(provider);
  return resolveCredential(provider, stored, process.env);
}

/**
 * Public (safe) view of all providers for the admin panel — raw keys never
 * leave the server.
 */
export async function getPublicCredentials(): Promise<PublicCredential[]> {
  const stored = await getAllCredentials();
  return AI_PROVIDER_IDS.map((id) => {
    const meta = AI_PROVIDERS[id];
    const row = stored.find((s) => s.provider === id);

    if (row?.apiKeyEnc) {
      const decrypted = decryptStoredKey(row.apiKeyEnc);
      if (decrypted) {
        return {
          provider: id,
          label: meta.label,
          model: row.model?.trim() || process.env[meta.modelEnvVar] || meta.defaultModel,
          hasKey: true,
          keySource: "db",
          keyHint: maskApiKey(decrypted),
          updatedAt: row.updatedAt.toISOString(),
        };
      }
    }

    const envKey = process.env[meta.keyEnvVar];
    if (envKey) {
      return {
        provider: id,
        label: meta.label,
        model: process.env[meta.modelEnvVar] || meta.defaultModel,
        hasKey: true,
        keySource: "env",
        keyHint: maskApiKey(envKey),
        updatedAt: null,
      };
    }

    return {
      provider: id,
      label: meta.label,
      model: process.env[meta.modelEnvVar] || meta.defaultModel,
      hasKey: false,
      keySource: "none",
      keyHint: "",
      updatedAt: null,
    };
  });
}
