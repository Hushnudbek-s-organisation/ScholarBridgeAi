/**
 * Admin AI settings API (spec §12, §16).
 *
 *   GET  /api/admin/ai-settings?adminProfileId=N
 *       → providers (public view: hasKey, keyHint, model, source) + task mapping
 *   PUT  /api/admin/ai-settings
 *       body: { adminProfileId, provider?, apiKey?, model?, clearKey? }  (credential)
 *       body: { adminProfileId, task?, providerForTask? }               (task mapping)
 *   POST /api/admin/ai-settings/test
 *       body: { adminProfileId, provider, apiKey? } → live connection check
 *
 * Raw API keys are never returned or logged — only encrypted at rest and
 * masked in responses.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConfig, setConfig } from "@/lib/config";
import {
  AI_TASKS,
  isAIProviderId,
  isAITaskId,
  taskProviderConfigKey,
  validateApiKey,
} from "@/lib/ai/settings";
import {
  getPublicCredentials,
  removeCredential,
  upsertCredential,
} from "@/lib/ai/credentials";
import { testProviderConnection } from "@/lib/ai/test";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function getDefaultProvider(): Promise<string> {
  const raw = await getConfig("ai_default_provider");
  return isAIProviderId(raw) ? raw : "openrouter";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const providers = await getPublicCredentials();
    const defaultProvider = await getDefaultProvider();
    const tasks = await Promise.all(
      AI_TASKS.map(async (t) => {
        const raw = await getConfig(taskProviderConfigKey(t.id));
        return {
          id: t.id,
          label: t.label,
          description: t.description,
          provider: isAIProviderId(raw) ? raw : defaultProvider,
        };
      })
    );

    return NextResponse.json({
      providers,
      tasks,
      defaults: {
        defaultProvider,
        encryption: {
          explicitSecret: process.env.AI_KEYS_ENCRYPTION_SECRET
            ? process.env.AI_KEYS_ENCRYPTION_SECRET.length >= 16
            : false,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/admin/ai-settings error:", error);
    return NextResponse.json({ error: "Failed to load AI settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    // --- Credential update (provider + apiKey/model) ---
    if (body.provider) {
      const provider = String(body.provider);
      if (!isAIProviderId(provider)) {
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
      }
      if (body.clearKey) {
        await removeCredential(provider);
        return NextResponse.json({ success: true, providers: await getPublicCredentials() });
      }
      if (body.apiKey !== undefined && body.apiKey !== null && String(body.apiKey) !== "") {
        const apiKey = String(body.apiKey).trim();
        if (!validateApiKey(apiKey)) {
          return NextResponse.json(
            {
              error:
                "API key looks invalid — expected at least 16 non-space characters (see provider docs)",
            },
            { status: 400 }
          );
        }
        await upsertCredential(provider, {
          apiKey,
          model: body.model !== undefined ? String(body.model) : undefined,
        });
      } else if (body.model !== undefined) {
        await upsertCredential(provider, { model: String(body.model) });
      } else {
        return NextResponse.json(
          { error: "Provide apiKey, model or clearKey for the provider" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, providers: await getPublicCredentials() });
    }

    // --- Task mapping update (task → provider) ---
    if (body.task) {
      const task = String(body.task);
      const providerForTask = String(body.providerForTask ?? "");
      if (!isAITaskId(task)) {
        return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
      }
      if (!isAIProviderId(providerForTask)) {
        return NextResponse.json(
          { error: `Unknown provider: ${providerForTask}` },
          { status: 400 }
        );
      }
      await setConfig(
        taskProviderConfigKey(task),
        providerForTask,
        `AI provider for task "${task}" (managed via AI Settings)`
      );
      return NextResponse.json({ success: true, task, provider: providerForTask });
    }

    return NextResponse.json(
      { error: "Provide either a provider credential or a task mapping" },
      { status: 400 }
    );
  } catch (error) {
    console.error("PUT /api/admin/ai-settings error:", error);
    return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const provider = String(body.provider ?? "");
    if (!isAIProviderId(provider)) {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    // Optional: test a key the admin typed but has not saved yet.
    const apiKey = body.apiKey !== undefined && body.apiKey !== null
      ? String(body.apiKey).trim()
      : undefined;
    if (apiKey !== undefined && !validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: "API key looks invalid — expected at least 16 non-space characters" },
        { status: 400 }
      );
    }

    const result = await testProviderConnection(provider, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/admin/ai-settings/test error:", error);
    return NextResponse.json({ error: "Connection test failed" }, { status: 500 });
  }
}
