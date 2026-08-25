"use client";

/**
 * Admin AI Settings — manage AI providers, their API keys/models and the
 * per-task provider mapping straight from the admin panel.
 *
 * Security: API keys are typed here but NEVER returned by the API — the
 * server stores them encrypted and only reports hasKey/keyHint. The "Test"
 * button verifies the saved (or freshly typed) key with a live request.
 */
import React, { useEffect, useState } from "react";
import {
  Bot,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";

interface AiSettingsManagerProps {
  adminProfileId: number;
}

interface ProviderView {
  provider: string;
  label: string;
  model: string;
  hasKey: boolean;
  keySource: "db" | "env" | "none";
  keyHint: string;
  updatedAt: string | null;
}

interface TaskView {
  id: string;
  label: string;
  description: string;
  provider: string;
}

interface SettingsPayload {
  providers: ProviderView[];
  tasks: TaskView[];
  defaults: { defaultProvider: string; encryption: { explicitSecret: boolean } };
}

const PROVIDER_OPTIONS = ["openrouter", "openai", "anthropic", "gemini"];

export function AiSettingsManager({ adminProfileId }: AiSettingsManagerProps) {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-provider draft inputs (key + model) and UI state.
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [savingTask, setSavingTask] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-settings?adminProfileId=${adminProfileId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load AI settings");
      setData(json);
      setKeyDrafts({});
      const models: Record<string, string> = {};
      for (const p of json.providers) models[p.provider] = p.model;
      setModelDrafts(models);
      const tasks: Record<string, string> = {};
      for (const t of json.tasks) tasks[t.id] = t.provider;
      setTaskDrafts(tasks);
    } catch (err: any) {
      setError(err.message || "Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const saveProvider = async (provider: string) => {
    setSaving((s) => ({ ...s, [provider]: true }));
    setMessages((m) => ({ ...m, [provider]: { ok: true, text: "Saving…" } }));
    try {
      const body: Record<string, unknown> = { adminProfileId, provider };
      if (keyDrafts[provider]?.trim()) body.apiKey = keyDrafts[provider].trim();
      if (modelDrafts[provider]?.trim()) body.model = modelDrafts[provider].trim();
      if (!body.apiKey && !body.model) {
        setMessages((m) => ({ ...m, [provider]: { ok: false, text: "Nothing to save — type a key and/or model first" } }));
        return;
      }
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setMessages((m) => ({
        ...m,
        [provider]: { ok: true, text: json.providers ? "Saved" : "Saved" },
      }));
      setKeyDrafts((d) => ({ ...d, [provider]: "" }));
      await load();
    } catch (err: any) {
      setMessages((m) => ({ ...m, [provider]: { ok: false, text: err.message || "Failed to save" } }));
    } finally {
      setSaving((s) => ({ ...s, [provider]: false }));
    }
  };

  const clearProviderKey = async (provider: string) => {
    if (!window.confirm(`Remove the stored API key for ${provider}? (env fallback still applies)`)) return;
    setSaving((s) => ({ ...s, [provider]: true }));
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, provider, clearKey: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to clear key");
      setMessages((m) => ({ ...m, [provider]: { ok: true, text: "Key removed" } }));
      await load();
    } catch (err: any) {
      setMessages((m) => ({ ...m, [provider]: { ok: false, text: err.message || "Failed to clear key" } }));
    } finally {
      setSaving((s) => ({ ...s, [provider]: false }));
    }
  };

  const testProvider = async (provider: string) => {
    setTesting((t) => ({ ...t, [provider]: true }));
    setTestResults((r) => ({ ...r, [provider]: { ok: true, text: "Testing…" } }));
    try {
      const body: Record<string, unknown> = { adminProfileId, provider };
      if (keyDrafts[provider]?.trim()) body.apiKey = keyDrafts[provider].trim();
      const res = await fetch("/api/admin/ai-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test failed");
      const latency = json.latencyMs !== undefined ? ` (${json.latencyMs} ms)` : "";
      setTestResults((r) => ({ ...r, [provider]: { ok: json.ok, text: `${json.message}${latency}` } }));
    } catch (err: any) {
      setTestResults((r) => ({ ...r, [provider]: { ok: false, text: err.message || "Test failed" } }));
    } finally {
      setTesting((t) => ({ ...t, [provider]: false }));
    }
  };

  const saveTaskMapping = async (task: string) => {
    setSavingTask(task);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, task, providerForTask: taskDrafts[task] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save mapping");
      setMessages((m) => ({ ...m, [`task:${task}`]: { ok: true, text: "Mapping saved" } }));
      await load();
    } catch (err: any) {
      setMessages((m) => ({ ...m, [`task:${task}`]: { ok: false, text: err.message || "Failed to save" } }));
    } finally {
      setSavingTask(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading AI settings…
      </div>
    );
  }

  const providerList: ProviderView[] = data?.providers ?? [];
  const taskList: TaskView[] = data?.tasks ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <KeyRound className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">AI Settings (Providers &amp; API Keys)</h2>
          <p className="text-xs text-slate-500">
            Manage AI providers, encrypted API keys and the per-task provider mapping.
          </p>
        </div>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* --- Provider credentials --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providerList.map((p) => {
          const msg = messages[p.provider];
          const test = testResults[p.provider];
          const status =
            p.keySource === "db"
              ? { label: "Configured · DB", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
              : p.keySource === "env"
              ? { label: "Configured · env", cls: "bg-sky-50 text-sky-700 border-sky-200" }
              : { label: "Not configured", cls: "bg-slate-100 text-slate-500 border-slate-200" };

          return (
            <div key={p.provider} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="font-extrabold text-sm text-slate-800">{p.label}</div>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>
                  {status.label}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                    API key {p.keyHint && <span className="normal-case tracking-normal text-slate-400">— saved: {p.keyHint}</span>}
                  </label>
                  <input
                    type="password"
                    value={keyDrafts[p.provider] ?? ""}
                    onChange={(e) => setKeyDrafts((d) => ({ ...d, [p.provider]: e.target.value }))}
                    placeholder={p.hasKey ? "Type a new key to replace…" : "Enter API key"}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={modelDrafts[p.provider] ?? ""}
                    onChange={(e) => setModelDrafts((d) => ({ ...d, [p.provider]: e.target.value }))}
                    placeholder="default"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveProvider(p.provider)}
                  disabled={saving[p.provider]}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving[p.provider] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button
                  onClick={() => testProvider(p.provider)}
                  disabled={testing[p.provider]}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {testing[p.provider] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Test
                </button>
                {p.keySource === "db" && (
                  <button
                    onClick={() => clearProviderKey(p.provider)}
                    disabled={saving[p.provider]}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>

              {msg && (
                <p className={`text-[11px] font-semibold ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>
              )}
              {test && (
                <p className={`text-[11px] font-semibold ${test.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {test.ok ? "✓ " : "✗ "}{test.text}
                </p>
              )}
              {p.updatedAt && (
                <p className="text-[10px] text-slate-400">Last updated: {new Date(p.updatedAt).toLocaleString()}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Task → provider mapping --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Task → Provider mapping</h3>
          <span className="ml-auto text-[10px] font-semibold text-slate-400">
            Default: {data?.defaults?.defaultProvider ?? "openrouter"}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Choose which AI provider serves each task. Values set here override the
          AI_PROVIDER_* environment variables.
        </p>

        <div className="divide-y divide-slate-100">
          {taskList.map((t) => {
            const msg = messages[`task:${t.id}`];
            return (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5">
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-700">{t.label}</div>
                  <div className="text-[11px] text-slate-400">{t.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={taskDrafts[t.id] ?? t.provider}
                    onChange={(e) => setTaskDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {PROVIDER_OPTIONS.map((pid) => (
                      <option key={pid} value={pid}>
                        {providerList.find((p) => p.provider === pid)?.label ?? pid}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => saveTaskMapping(t.id)}
                    disabled={savingTask === t.id}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {savingTask === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
                {msg && (
                  <p className={`text-[11px] font-semibold ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Security note --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-600">Security</p>
          <p>
            API keys are encrypted at rest (AES-256-GCM) and never returned to the browser — only the last 4
            characters are shown. Resolution priority: admin panel → environment variables → defaults.
            {data?.defaults?.encryption?.explicitSecret
              ? " Encryption secret: AI_KEYS_ENCRYPTION_SECRET."
              : " Encryption secret is derived from DATABASE_URL — set AI_KEYS_ENCRYPTION_SECRET in production."}
          </p>
        </div>
      </div>
    </div>
  );
}
