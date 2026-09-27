"use client";

/**
 * Admin AI Settings — global AI provider configuration (admins only).
 *
 *  - provider cards: encrypted key (only a masked hint comes back), model,
 *    capabilities, enable/disable, health check (quick or deep)
 *  - routing: global default ("auto" = first provider with a key), explicit
 *    fallback (never implicit), per-task mapping with the EFFECTIVE provider
 *  - security: encryption-secret status and re-encryption after a rotation
 *
 * Keys are typed here but NEVER returned by the API.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  KeyRound,
  Loader2,
  Power,
  RefreshCw,
  Save,
  ShieldCheck,
  Stethoscope,
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
  capabilities?: string[];
  protocol?: "openai" | "anthropic" | "live";
  enabled?: boolean;
  baseUrlConfigured?: boolean;
  undecryptable?: boolean;
  needsReencrypt?: boolean;
}

interface TaskView {
  id: string;
  label: string;
  description: string;
  provider: string;
  effectiveProvider: string;
  selection: "admin" | "env" | "auto" | "default";
  ready: boolean;
}

interface SettingsPayload {
  providers: ProviderView[];
  tasks: TaskView[];
  defaults: {
    defaultProvider: string;
    envDefaultProvider: string | null;
    fallbackProvider: string;
    fallbackSource: "admin" | "env" | "none";
    disabled: string[];
    encryption: { explicitSecret: boolean; previousSecrets: number };
  };
}

interface HealthStep {
  name: string;
  status: "ok" | "failed" | "skipped";
  detail: string;
}

type Msg = { ok: boolean; text: string };

const SELECTION_LABEL: Record<TaskView["selection"], string> = {
  admin: "set here",
  env: "from env",
  auto: "auto (first provider with a key)",
  default: "default",
};

async function send(method: "PUT" | "POST", body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch("/api/admin/ai-settings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(json.error || `Request failed (${res.status})`));
  return json;
}

const errText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export function AiSettingsManager({ adminProfileId }: AiSettingsManagerProps) {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, Msg>>({});
  const [testResults, setTestResults] = useState<Record<string, Msg & { steps?: HealthStep[] }>>({});
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [defaultDraft, setDefaultDraft] = useState("auto");
  const [fallbackDraft, setFallbackDraft] = useState("none");

  const apply = useCallback((json: SettingsPayload) => {
    setData(json);
    const models: Record<string, string> = {};
    for (const p of json.providers) models[p.provider] = p.model;
    setModelDrafts(models);
    const tasks: Record<string, string> = {};
    for (const t of json.tasks) tasks[t.id] = t.provider;
    setTaskDrafts(tasks);
    setDefaultDraft(json.defaults.defaultProvider);
    setFallbackDraft(json.defaults.fallbackProvider);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load AI settings");
      apply(json as SettingsPayload);
      setKeyDrafts({});
    } catch (err) {
      setError(errText(err, "Failed to load AI settings"));
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load, adminProfileId]);

  const run = async (key: string, fn: () => Promise<Record<string, unknown>>, okText: string) => {
    setBusy((b) => ({ ...b, [key]: true }));
    setMessages((m) => ({ ...m, [key]: { ok: true, text: "Saving…" } }));
    try {
      const json = await fn();
      if (json.providers) apply(json as unknown as SettingsPayload);
      setMessages((m) => ({ ...m, [key]: { ok: true, text: okText } }));
      return json;
    } catch (err) {
      setMessages((m) => ({ ...m, [key]: { ok: false, text: errText(err, "Failed") } }));
      return null;
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  const saveProvider = (provider: string) => {
    const body: Record<string, unknown> = { provider };
    if (keyDrafts[provider]?.trim()) body.apiKey = keyDrafts[provider].trim();
    if (modelDrafts[provider]?.trim()) body.model = modelDrafts[provider].trim();
    if (!body.apiKey && !body.model) {
      setMessages((m) => ({ ...m, [provider]: { ok: false, text: "Nothing to save — type a key and/or model first" } }));
      return;
    }
    void run(provider, () => send("PUT", body), body.apiKey ? "Key saved (encrypted)" : "Model saved").then((ok) => {
      if (ok) setKeyDrafts((d) => ({ ...d, [provider]: "" }));
    });
  };

  const clearProviderKey = (provider: string) => {
    if (!window.confirm(`Remove the stored API key for ${provider}? (an env key, if any, still applies)`)) return;
    void run(provider, () => send("PUT", { provider, clearKey: true }), "Key removed");
  };

  const toggleProvider = (provider: string, enabled: boolean) =>
    void run(provider, () => send("PUT", { provider, enabled }), enabled ? "Provider enabled" : "Provider disabled");

  const testProvider = async (provider: string, deep: boolean) => {
    const key = `test:${provider}`;
    setBusy((b) => ({ ...b, [key]: true }));
    setTestResults((r) => ({ ...r, [provider]: { ok: true, text: deep ? "Running full check…" : "Testing…" } }));
    try {
      const body: Record<string, unknown> = { provider, deep };
      if (keyDrafts[provider]?.trim()) body.apiKey = keyDrafts[provider].trim();
      if (modelDrafts[provider]?.trim()) body.model = modelDrafts[provider].trim();
      const json = await send("POST", body);
      const latency = json.latencyMs !== undefined ? ` (${json.latencyMs} ms)` : "";
      setTestResults((r) => ({
        ...r,
        [provider]: { ok: Boolean(json.ok), text: `${json.ok ? "Connected ✓" : "Connection failed"} — ${String(json.message ?? "")}${latency}`, steps: (json.checks as HealthStep[]) ?? [] },
      }));
    } catch (err) {
      setTestResults((r) => ({ ...r, [provider]: { ok: false, text: errText(err, "Test failed") } }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
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
  const chatProviders = providerList.filter((p) => p.protocol !== "live");
  const taskList: TaskView[] = data?.tasks ?? [];
  const labelOf = (id: string) => providerList.find((p) => p.provider === id)?.label ?? id;
  const needsReencrypt = providerList.some((p) => p.needsReencrypt);
  const undecryptable = providerList.filter((p) => p.undecryptable);
  const selectCls = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const msgLine = (k: string) =>
    messages[k] ? <p className={`text-[11px] font-semibold ${messages[k].ok ? "text-emerald-600" : "text-red-600"}`}>{messages[k].text}</p> : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <KeyRound className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">AI Settings (Providers &amp; API Keys)</h2>
          <p className="text-xs text-slate-500">
            One AI layer for the website, the Telegram bot and the Mini App. Pick a provider, paste its key, test it.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {undecryptable.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Stored keys for <b>{undecryptable.map((p) => p.label).join(", ")}</b> cannot be decrypted with the current
            encryption secret (it changed, e.g. after a host move). Add the old secret to
            AI_KEYS_ENCRYPTION_SECRET_PREVIOUS and re-encrypt, or paste the keys again.
          </p>
        </div>
      )}

      {/* --- Routing: default + explicit fallback --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Zap className="h-4 w-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Routing</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ai-default" className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Default provider</label>
            <div className="flex gap-2">
              <select id="ai-default" value={defaultDraft} onChange={(e) => setDefaultDraft(e.target.value)} className={`${selectCls} flex-1`}>
                <option value="auto">Auto — first provider with a key{data?.defaults.envDefaultProvider ? ` (env: ${data.defaults.envDefaultProvider})` : ""}</option>
                {chatProviders.map((p) => <option key={p.provider} value={p.provider}>{p.label}</option>)}
              </select>
              <button
                onClick={() => void run("default", () => send("PUT", { defaultProvider: defaultDraft }), "Default saved")}
                disabled={busy.default}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {busy.default ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </button>
            </div>
            {msgLine("default")}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ai-fallback" className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Fallback provider (explicit)</label>
            <div className="flex gap-2">
              <select id="ai-fallback" value={fallbackDraft} onChange={(e) => setFallbackDraft(e.target.value)} className={`${selectCls} flex-1`}>
                <option value="none">None — never switch providers automatically</option>
                {chatProviders.map((p) => <option key={p.provider} value={p.provider}>{p.label}</option>)}
              </select>
              <button
                onClick={() => void run("fallback", () => send("PUT", { fallbackProvider: fallbackDraft }), "Fallback saved")}
                disabled={busy.fallback}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {busy.fallback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Used only when the main provider fails; it may cost differently. Answers are logged as “provider:fallback”.
              {data?.defaults.fallbackSource === "env" ? " Currently set from AI_PROVIDER_FALLBACK." : ""}
            </p>
            {msgLine("fallback")}
          </div>
        </div>
      </div>

      {/* --- Provider credentials --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providerList.map((p) => {
          const test = testResults[p.provider];
          const enabled = p.enabled !== false;
          const status = !enabled
            ? { label: "Disabled", cls: "bg-slate-100 text-slate-500 border-slate-200" }
            : p.keySource === "db"
            ? { label: "Configured · panel", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
            : p.keySource === "env"
            ? { label: "Configured · env", cls: "bg-sky-50 text-sky-700 border-sky-200" }
            : { label: "Not configured", cls: "bg-slate-100 text-slate-500 border-slate-200" };
          const keyId = `ai-key-${p.provider}`;
          const modelId = `ai-model-${p.provider}`;

          return (
            <div key={p.provider} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 ${enabled ? "" : "opacity-75"}`}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="font-extrabold text-sm text-slate-800">{p.label}</div>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>{status.label}</span>
                <button
                  onClick={() => toggleProvider(p.provider, !enabled)}
                  disabled={busy[p.provider]}
                  aria-pressed={enabled}
                  aria-label={enabled ? `Disable ${p.label}` : `Enable ${p.label}`}
                  title={enabled ? "Disable provider" : "Enable provider"}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border ${enabled ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>

              {p.capabilities && p.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.capabilities.map((c) => (
                    <span key={c} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{c}</span>
                  ))}
                  {p.protocol === "live" && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">voice interview only</span>}
                </div>
              )}
              {p.baseUrlConfigured === false && (
                <p className="text-[11px] font-semibold text-amber-700">Set AI_CUSTOM_BASE_URL on the server to use this provider (the base URL is deployment configuration, not editable here).</p>
              )}
              {p.needsReencrypt && <p className="text-[11px] font-semibold text-amber-700">Encrypted with a previous secret — use “Re-encrypt keys” below.</p>}

              <div className="space-y-2">
                <div>
                  <label htmlFor={keyId} className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                    API key {p.keyHint && <span className="normal-case tracking-normal text-slate-400">— saved: {p.keyHint}</span>}
                  </label>
                  <input
                    id={keyId}
                    type="password"
                    value={keyDrafts[p.provider] ?? ""}
                    onChange={(e) => setKeyDrafts((d) => ({ ...d, [p.provider]: e.target.value }))}
                    placeholder={p.hasKey ? "Type a new key to replace (rotate)…" : "Enter API key"}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label htmlFor={modelId} className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Model</label>
                  <input
                    id={modelId}
                    type="text"
                    value={modelDrafts[p.provider] ?? ""}
                    onChange={(e) => setModelDrafts((d) => ({ ...d, [p.provider]: e.target.value }))}
                    placeholder="model id"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => saveProvider(p.provider)}
                  disabled={busy[p.provider]}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {busy[p.provider] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </button>
                <button
                  onClick={() => void testProvider(p.provider, false)}
                  disabled={busy[`test:${p.provider}`]}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy[`test:${p.provider}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Test
                </button>
                {p.protocol !== "live" && (
                  <button
                    onClick={() => void testProvider(p.provider, true)}
                    disabled={busy[`test:${p.provider}`]}
                    title="Also sends a tiny chat request and, if supported, a JSON-mode request (uses a few tokens)"
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Stethoscope className="h-3.5 w-3.5" /> Full check
                  </button>
                )}
                {p.keySource === "db" && (
                  <button
                    onClick={() => clearProviderKey(p.provider)}
                    disabled={busy[p.provider]}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>

              {msgLine(p.provider)}
              {test && (
                <div aria-live="polite" className="space-y-1">
                  <p className={`text-[11px] font-semibold ${test.ok ? "text-emerald-600" : "text-red-600"}`}>{test.text}</p>
                  {test.steps && test.steps.length > 0 && (
                    <ul className="space-y-0.5">
                      {test.steps.map((s) => (
                        <li key={s.name} className="text-[10px] text-slate-500">
                          <span className={s.status === "ok" ? "text-emerald-600" : s.status === "failed" ? "text-red-600" : "text-slate-400"}>
                            {s.status === "ok" ? "✓" : s.status === "failed" ? "✗" : "–"}
                          </span>{" "}
                          <b>{s.name}</b>: {s.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {p.updatedAt && <p className="text-[10px] text-slate-400">Last updated: {new Date(p.updatedAt).toLocaleString()}</p>}
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
        </div>
        <p className="text-xs text-slate-500">
          “Auto” follows the default provider. The visa interview keeps Groq unless you map it explicitly.
        </p>

        <div className="divide-y divide-slate-100">
          {taskList.map((t) => (
            <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5">
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-700">{t.label}</div>
                <div className="text-[11px] text-slate-400">{t.description}</div>
                <div className={`text-[11px] font-semibold ${t.ready ? "text-emerald-600" : "text-amber-700"}`}>
                  Now: {labelOf(t.effectiveProvider)} · {SELECTION_LABEL[t.selection]}{t.ready ? "" : " · not ready (no key or disabled)"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Provider for ${t.label}`}
                  value={taskDrafts[t.id] ?? t.provider}
                  onChange={(e) => setTaskDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                  className={selectCls}
                >
                  <option value="auto">Auto</option>
                  {chatProviders.map((p) => <option key={p.provider} value={p.provider}>{p.label}</option>)}
                </select>
                <button
                  onClick={() => void run(`task:${t.id}`, () => send("PUT", { task: t.id, providerForTask: taskDrafts[t.id] ?? t.provider }), "Mapping saved")}
                  disabled={busy[`task:${t.id}`]}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {busy[`task:${t.id}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </button>
              </div>
              {msgLine(`task:${t.id}`)}
            </div>
          ))}
        </div>
      </div>

      {/* --- Security --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-[11px] text-slate-500 leading-relaxed space-y-2">
          <p className="font-bold text-slate-600">Security</p>
          <p>
            API keys are encrypted at rest (AES-256-GCM) and never returned to the browser — only the last 4 characters
            are shown. Priority: admin panel → environment variables → auto.
            {data?.defaults?.encryption?.explicitSecret
              ? " Encryption secret: AI_KEYS_ENCRYPTION_SECRET."
              : " Encryption secret is derived from DATABASE_URL — set AI_KEYS_ENCRYPTION_SECRET before moving hosts, or saved keys stop decrypting."}
            {data?.defaults?.encryption?.previousSecrets ? ` Previous secrets configured: ${data.defaults.encryption.previousSecrets}.` : ""}
          </p>
          {(needsReencrypt || (data?.defaults?.encryption?.previousSecrets ?? 0) > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void run("reencrypt", () => send("POST", { action: "reencrypt" }), "Keys re-encrypted with the current secret")}
                disabled={busy.reencrypt}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy.reencrypt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Re-encrypt keys
              </button>
              {msgLine("reencrypt")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
