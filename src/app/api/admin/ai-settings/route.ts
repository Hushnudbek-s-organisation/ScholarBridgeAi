/**
 * Admin AI settings API — global provider configuration (admins only;
 * students can never change it). Raw API keys are never returned, logged or
 * audited: they are encrypted at rest and only a masked hint leaves the server.
 *
 *   GET  /api/admin/ai-settings
 *        → providers (public view), task mapping with the EFFECTIVE provider
 *          and how it was chosen, default/fallback/disabled, encryption status
 *   PUT  /api/admin/ai-settings   (one change per request)
 *        { provider, apiKey?, model?, clearKey? }   credential (key rotation = save a new key)
 *        { provider, enabled: boolean }             enable / disable a provider
 *        { task, providerForTask }                  task mapping ("auto" clears it)
 *        { defaultProvider }                        global default ("auto" clears it)
 *        { fallbackProvider }                       explicit fallback ("none" clears it)
 *   POST /api/admin/ai-settings
 *        { provider, apiKey?, model?, deep? }       health check
 *        { action: "reencrypt" }                    re-encrypt keys after a secret rotation
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteConfig, getStoredConfig, setConfig } from "@/lib/config";
import { writeAudit } from "@/lib/audit";
import { LIMITS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import {
  AI_PROVIDERS,
  AI_TASKS,
  DEFAULT_PROVIDER_CONFIG_KEY,
  DISABLED_PROVIDERS_CONFIG_KEY,
  FALLBACK_PROVIDER_CONFIG_KEY,
  hasExplicitEncryptionSecret,
  isAIProviderId,
  isAITaskId,
  isChatProvider,
  parseDisabledProviders,
  previousEncryptionSecrets,
  resolveFallbackProvider,
  taskProviderConfigKey,
  validateApiKey,
  type AIProviderId,
} from "@/lib/ai/settings";
import {
  getPublicCredentials,
  reencryptStoredKeys,
  removeCredential,
  upsertCredential,
} from "@/lib/ai/credentials";
import { loadRuntimeAIConfig, resolveRuntimeProvider } from "@/lib/ai/index";
import { testProviderConnection } from "@/lib/ai/test";

function bad(error: string, code = "bad_request", status = 400) {
  return NextResponse.json({ error, code }, { status });
}

async function audit(fieldChanged: string, oldValue: unknown, newValue: unknown, actorId: number) {
  await writeAudit({
    entityType: "ai_provider",
    entityId: 0,
    fieldChanged,
    oldValue,
    newValue,
    source: `admin:${actorId}`,
    actor: "ADMIN",
  }).catch((err) => console.error("AI settings audit failed:", (err as Error)?.message));
}

async function currentDisabled(): Promise<AIProviderId[]> {
  return parseDisabledProviders(await getStoredConfig(DISABLED_PROVIDERS_CONFIG_KEY).catch(() => null));
}

async function snapshot() {
  const disabled = await currentDisabled();
  const providers = await getPublicCredentials(disabled);
  const tasks = await Promise.all(
    AI_TASKS.map(async (t) => {
      const cfg = await loadRuntimeAIConfig(t.id);
      const effective = await resolveRuntimeProvider(t.id, cfg);
      const stored = cfg.dbProviders[taskProviderConfigKey(t.id)];
      return {
        id: t.id,
        label: t.label,
        description: t.description,
        // What the admin saved for this task ("auto" when nothing).
        provider: stored && isAIProviderId(stored) ? stored : "auto",
        effectiveProvider: effective.name,
        selection: effective.selection,
        ready: Boolean(effective.apiKey) && !effective.disabled,
      };
    })
  );
  const storedDefault = await getStoredConfig(DEFAULT_PROVIDER_CONFIG_KEY).catch(() => null);
  const storedFallback = await getStoredConfig(FALLBACK_PROVIDER_CONFIG_KEY).catch(() => null);
  return {
    providers,
    tasks,
    defaults: {
      defaultProvider: storedDefault && isAIProviderId(storedDefault) ? storedDefault : "auto",
      envDefaultProvider: process.env.AI_PROVIDER_DEFAULT || null,
      fallbackProvider: resolveFallbackProvider(storedFallback) ?? "none",
      fallbackSource: storedFallback !== null ? "admin" : process.env.AI_PROVIDER_FALLBACK ? "env" : "none",
      disabled,
      encryption: {
        explicitSecret: hasExplicitEncryptionSecret(),
        previousSecrets: previousEncryptionSecrets().length,
      },
    },
  };
}

export async function GET(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/ai-settings error:", (error as Error)?.message);
    return NextResponse.json({ error: "Failed to load AI settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const actorId = access.session.profile.id;
    const limit = checkRateLimit(`admin-ai:${actorId}`, LIMITS.adminWrite);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);
    const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    if (!parsed.ok) return bad(parsed.error, parsed.code, parsed.status);
    const body = parsed.body;

    // --- Provider enable / disable ---
    if (body.provider !== undefined && typeof body.enabled === "boolean") {
      const provider = String(body.provider);
      if (!isAIProviderId(provider)) return bad(`Unknown provider: ${provider}`);
      const before = await currentDisabled();
      const after = body.enabled ? before.filter((p) => p !== provider) : Array.from(new Set([...before, provider]));
      await setConfig(DISABLED_PROVIDERS_CONFIG_KEY, JSON.stringify(after), "AI providers disabled by an admin");
      await audit(body.enabled ? "ai_provider_enabled" : "ai_provider_disabled", before, after, actorId);
      return NextResponse.json({ success: true, ...(await snapshot()) });
    }

    // --- Credential update (provider + apiKey/model) ---
    if (body.provider !== undefined) {
      const provider = String(body.provider);
      if (!isAIProviderId(provider)) return bad(`Unknown provider: ${provider}`);
      if (body.clearKey) {
        await removeCredential(provider);
        await audit("ai_provider_key_removed", provider, null, actorId);
        return NextResponse.json({ success: true, ...(await snapshot()) });
      }
      const model = body.model !== undefined ? String(body.model).trim().slice(0, 200) : undefined;
      if (model !== undefined && model && !/^[A-Za-z0-9._:/@+-]+$/.test(model)) {
        return bad("Model id contains unsupported characters");
      }
      if (body.apiKey !== undefined && body.apiKey !== null && String(body.apiKey) !== "") {
        const apiKey = String(body.apiKey).trim();
        if (!validateApiKey(apiKey)) {
          return bad("API key looks invalid — expected at least 16 non-space characters (see provider docs)");
        }
        await upsertCredential(provider, { apiKey, model });
        // The key itself is never audited — only that it was replaced.
        await audit("ai_provider_key_saved", provider, { provider, model: model || null }, actorId);
      } else if (model !== undefined) {
        await upsertCredential(provider, { model });
        await audit("ai_provider_model", provider, model, actorId);
      } else {
        return bad("Provide apiKey, model or clearKey for the provider");
      }
      return NextResponse.json({ success: true, ...(await snapshot()) });
    }

    // --- Task mapping update (task → provider | "auto") ---
    if (body.task !== undefined) {
      const task = String(body.task);
      const value = String(body.providerForTask ?? "");
      if (!isAITaskId(task)) return bad(`Unknown task: ${task}`);
      const key = taskProviderConfigKey(task);
      const before = await getStoredConfig(key).catch(() => null);
      if (value === "auto") {
        await deleteConfig(key);
      } else {
        if (!isAIProviderId(value)) return bad(`Unknown provider: ${value}`);
        if (!isChatProvider(value)) return bad(`${AI_PROVIDERS[value].label} has no chat API and cannot serve "${task}"`, "unsupported_capability");
        await setConfig(key, value, `AI provider for task "${task}" (managed via AI Settings)`);
      }
      await audit(`ai_provider_task_${task}`, before, value, actorId);
      return NextResponse.json({ success: true, task, provider: value, ...(await snapshot()) });
    }

    // --- Global default provider ---
    if (body.defaultProvider !== undefined) {
      const value = String(body.defaultProvider);
      const before = await getStoredConfig(DEFAULT_PROVIDER_CONFIG_KEY).catch(() => null);
      if (value === "auto") {
        await deleteConfig(DEFAULT_PROVIDER_CONFIG_KEY);
      } else {
        if (!isAIProviderId(value)) return bad(`Unknown provider: ${value}`);
        if (!isChatProvider(value)) return bad(`${AI_PROVIDERS[value].label} has no chat API`, "unsupported_capability");
        await setConfig(DEFAULT_PROVIDER_CONFIG_KEY, value, "Default AI provider (managed via AI Settings)");
      }
      await audit("ai_default_provider", before, value, actorId);
      return NextResponse.json({ success: true, ...(await snapshot()) });
    }

    // --- Explicit fallback provider ---
    if (body.fallbackProvider !== undefined) {
      const value = String(body.fallbackProvider);
      const before = await getStoredConfig(FALLBACK_PROVIDER_CONFIG_KEY).catch(() => null);
      if (value !== "none") {
        if (!isAIProviderId(value)) return bad(`Unknown provider: ${value}`);
        if (!isChatProvider(value)) return bad(`${AI_PROVIDERS[value].label} has no chat API`, "unsupported_capability");
      }
      // Saved even when "none" so an admin choice overrides AI_PROVIDER_FALLBACK.
      await setConfig(FALLBACK_PROVIDER_CONFIG_KEY, value, "Explicit AI fallback provider (managed via AI Settings)");
      await audit("ai_fallback_provider", before, value, actorId);
      return NextResponse.json({ success: true, ...(await snapshot()) });
    }

    return bad("Provide a provider credential, enabled flag, task mapping, default or fallback provider");
  } catch (error) {
    console.error("PUT /api/admin/ai-settings error:", (error as Error)?.message);
    return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const actorId = access.session.profile.id;
    const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    if (!parsed.ok) return bad(parsed.error, parsed.code, parsed.status);
    const body = parsed.body;

    if (body.action === "reencrypt") {
      const limit = checkRateLimit(`admin-ai:${actorId}`, LIMITS.adminWrite);
      if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);
      const result = await reencryptStoredKeys();
      await audit("ai_keys_reencrypted", null, result, actorId);
      return NextResponse.json({ success: true, ...result, ...(await snapshot()) });
    }

    // Health checks call the provider (and deep checks spend tokens).
    const limit = checkRateLimit(`admin-ai-test:${actorId}`, { limit: 20, windowMs: 10 * 60_000 });
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const provider = String(body.provider ?? "");
    if (!isAIProviderId(provider)) return bad(`Unknown provider: ${provider}`);

    // Optional: test a key the admin typed but has not saved yet.
    const apiKey = body.apiKey !== undefined && body.apiKey !== null ? String(body.apiKey).trim() : undefined;
    if (apiKey !== undefined && apiKey !== "" && !validateApiKey(apiKey)) {
      return bad("API key looks invalid — expected at least 16 non-space characters");
    }
    const model = body.model !== undefined ? String(body.model).trim().slice(0, 200) : undefined;
    const result = await testProviderConnection(provider, apiKey || undefined, { deep: body.deep === true, model });
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/ai-settings error:", (error as Error)?.message);
    return NextResponse.json({ error: "Connection test failed" }, { status: 500 });
  }
}
