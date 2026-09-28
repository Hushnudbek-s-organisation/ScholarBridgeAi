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
  decryptWithRotation,
  encryptApiKey,
  maskApiKey,
  providerBaseUrl,
  providerCapabilities,
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

/** Decrypt a stored payload (current secret, then AI_KEYS_ENCRYPTION_SECRET_PREVIOUS). */
export function decryptStoredKey(payload: string | null | undefined): string | null {
  return decryptWithRotation(payload).key ?? decryptApiKey(payload);
}

/**
 * Re-encrypt every stored key that only decrypts with a PREVIOUS secret
 * (after rotating AI_KEYS_ENCRYPTION_SECRET or moving hosts). Keys that
 * cannot be decrypted at all are reported, never guessed or dropped.
 */
export async function reencryptStoredKeys(): Promise<{ reencrypted: AIProviderId[]; undecryptable: AIProviderId[] }> {
  const rows = await getAllCredentials();
  const reencrypted: AIProviderId[] = [];
  const undecryptable: AIProviderId[] = [];
  for (const row of rows) {
    if (!row.apiKeyEnc) continue;
    const { key, rotated } = decryptWithRotation(row.apiKeyEnc);
    if (!key) {
      undecryptable.push(row.provider as AIProviderId);
      continue;
    }
    if (!rotated) continue;
    await db
      .update(aiProviderCredentials)
      .set({ apiKeyEnc: encryptApiKey(key), updatedAt: new Date() })
      .where(eq(aiProviderCredentials.id, row.id));
    reencrypted.push(row.provider as AIProviderId);
  }
  return { reencrypted, undecryptable };
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

/** Resolve every provider's key+model with a single DB read. */
export async function resolveAllProviderCredentials(): Promise<
  Record<AIProviderId, { apiKey: string | undefined; apiKeySource: "db" | "env" | "none"; model: string }>
> {
  const stored = await getAllCredentials();
  const out = {} as Record<AIProviderId, { apiKey: string | undefined; apiKeySource: "db" | "env" | "none"; model: string }>;
  for (const id of AI_PROVIDER_IDS) {
    out[id] = resolveCredential(id, stored.find((s) => s.provider === id) ?? null, process.env);
  }
  return out;
}

/**
 * Public (safe) view of all providers for the admin panel — raw keys never
 * leave the server.
 */
export async function getPublicCredentials(disabled: AIProviderId[] = []): Promise<PublicCredential[]> {
  const stored = await getAllCredentials();
  return AI_PROVIDER_IDS.map((id): PublicCredential => {
    const meta = AI_PROVIDERS[id];
    const row = stored.find((s) => s.provider === id);
    const common = {
      provider: id,
      label: meta.label,
      capabilities: providerCapabilities(id),
      protocol: meta.protocol,
      enabled: !disabled.includes(id),
      ...(meta.baseUrlEnvVar ? { baseUrlConfigured: Boolean(providerBaseUrl(id)) } : {}),
    };

    let undecryptable = false;
    if (row?.apiKeyEnc) {
      const { key, rotated } = decryptWithRotation(row.apiKeyEnc);
      if (key) {
        return {
          ...common,
          model: row.model?.trim() || process.env[meta.modelEnvVar] || meta.defaultModel,
          hasKey: true,
          keySource: "db",
          keyHint: maskApiKey(key),
          updatedAt: row.updatedAt.toISOString(),
          needsReencrypt: rotated,
        };
      }
      undecryptable = true;
    }

    const envKey = process.env[meta.keyEnvVar];
    if (envKey) {
      return {
        ...common,
        model: row?.model?.trim() || process.env[meta.modelEnvVar] || meta.defaultModel,
        hasKey: true,
        keySource: "env",
        keyHint: maskApiKey(envKey),
        updatedAt: null,
        undecryptable,
      };
    }

    return {
      ...common,
      model: row?.model?.trim() || process.env[meta.modelEnvVar] || meta.defaultModel,
      hasKey: false,
      keySource: "none",
      keyHint: "",
      updatedAt: null,
      undecryptable,
    };
  });
}
