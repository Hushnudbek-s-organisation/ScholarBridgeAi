/**
 * AI provider connection test (admin panel "Test" button).
 *
 * Runs a minimal, authenticated request against each provider's API with the
 * stored (DB) key — or a key the admin typed without saving. The raw key is
 * never returned; only ok/message/latency are. All requests are server-side.
 */
import { AI_PROVIDERS, type AIProviderId } from "./settings";
import { resolveProviderCredential } from "./credentials";

export interface ConnectionTestResult {
  ok: boolean;
  provider: AIProviderId;
  message: string;
  latencyMs: number;
}

const TIMEOUT_MS = 10_000;

async function probe(url: string, init: RequestInit): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function describe(res: { status: number; body: string }): string {
  if (res.status === 401 || res.status === 403) {
    return `HTTP ${res.status} — API key rejected (check the key)`;
  }
  if (res.status >= 200 && res.status < 300) {
    return `HTTP ${res.status} — connection OK`;
  }
  const snippet = res.body.trim().replace(/\s+/g, " ").slice(0, 120);
  return `HTTP ${res.status}${snippet ? ` — ${snippet}` : ""}`;
}

/**
 * Test one provider. `apiKey` is optional — when omitted the stored DB key
 * (or env fallback) is used.
 */
export async function testProviderConnection(
  provider: AIProviderId,
  apiKey?: string
): Promise<ConnectionTestResult> {
  const started = Date.now();

  let key = apiKey?.trim();
  if (!key) {
    const cred = await resolveProviderCredential(provider);
    key = cred.apiKey;
    if (!key) {
      return {
        ok: false,
        provider,
        message: "No API key configured for this provider",
        latencyMs: Date.now() - started,
      };
    }
  }

  try {
    let res: { status: number; body: string };

    switch (provider) {
      case "openrouter": {
        res = await probe("https://openrouter.ai/api/v1/auth/key", {
          method: "GET",
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      }
      case "openai": {
        res = await probe("https://api.openai.com/v1/models", {
          method: "GET",
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      }
      case "anthropic": {
        res = await probe("https://api.anthropic.com/v1/models", {
          method: "GET",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
        });
        break;
      }
      case "groq": {
        res = await probe("https://api.groq.com/openai/v1/models", {
          method: "GET",
          headers: { Authorization: `Bearer ${key}` },
        });
        break;
      }
      default: {
        return { ok: false, provider, message: `Unknown provider: ${provider}`, latencyMs: Date.now() - started };
      }
    }

    const ok = res.status >= 200 && res.status < 300;
    return {
      ok,
      provider,
      message: describe(res),
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError"
      ? `Timeout after ${TIMEOUT_MS / 1000}s`
      : `Request failed: ${err instanceof Error ? err.message : String(err)}`;
    return { ok: false, provider, message, latencyMs: Date.now() - started };
  }
}

/** Default model labels used in the UI hint. */
export function providerLabel(provider: AIProviderId): string {
  return AI_PROVIDERS[provider].label;
}
