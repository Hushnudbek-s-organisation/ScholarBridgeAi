"use client";

import React, { useEffect, useState } from "react";
import { Settings2, Loader2, RefreshCw, Save, Upload, Image as ImageIcon } from "lucide-react";

interface ConfigManagerProps {
  adminProfileId: number;
}

interface ConfigRow {
  key: string;
  value: string;
  description: string | null;
}

export function ConfigManager({ adminProfileId }: ConfigManagerProps) {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState<"logo" | "favicon" | "">("");
  const [branding, setBranding] = useState({ logo: "", favicon: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/config?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (res.ok && data.config) {
        setRows(data.config);
        setBranding({
          logo: data.config.find((r: ConfigRow) => r.key === "branding_logo_url")?.value || "",
          favicon: data.config.find((r: ConfigRow) => r.key === "branding_favicon_url")?.value || "",
        });
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const save = async (key: string, value: string) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId, key, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setMessage({ ok: true, text: `${key} updated` });
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, value } : r)));
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || "Failed to save" });
    } finally {
      setSavingKey("");
    }
  };

  const uploadBranding = async (kind: "logo" | "favicon", file: File) => {
    setUploading(kind);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("adminProfileId", String(adminProfileId));
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/admin/branding/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setBranding((prev) => ({ ...prev, [kind]: data.url }));
      setRows((prev) => prev.map((r) => r.key === `branding_${kind}_url` ? { ...r, value: data.url } : r));
      setMessage({ ok: true, text: `${kind === "logo" ? "Logo" : "Favicon"} successfully replaced` });
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || "Upload failed" });
    } finally {
      setUploading("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Settings2 className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Settings (App Config)</h2>
          <p className="text-xs text-slate-500">
            No hardcoded business values — prices, limits and schedules live here.
          </p>
        </div>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex items-start gap-3 mb-4">
          <ImageIcon className="h-5 w-5 text-indigo-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Site images</h3>
            <p className="text-xs text-slate-500 mt-0.5">Replace the logo and browser tab favicon across the platform. PNG, JPG, WEBP or ICO, up to 5 MB.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["logo", "favicon"] as const).map((kind) => (
            <div key={kind} className="flex items-center gap-3 rounded-xl border border-white bg-white p-3 shadow-xs">
              <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {branding[kind] ? <img src={branding[kind]} alt={`${kind} preview`} className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-700">{kind === "logo" ? "Site logo" : "Favicon"}</p>
                <p className="truncate text-[10px] text-slate-400">{branding[kind] ? "Custom image active" : "Default image active"}</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 has-[:disabled]:opacity-60">
                  {uploading === kind ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Upload and replace
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/x-icon" className="sr-only" disabled={uploading !== ""} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadBranding(kind, file); e.currentTarget.value = ""; }} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-xs font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">Key</th>
                  <th className="px-4 py-3 font-bold">Value</th>
                  <th className="px-4 py-3 font-bold">Description</th>
                  <th className="px-4 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{r.key}</td>
                    <td className="px-4 py-2.5">
                      <input
                        key={r.key + r.value}
                        defaultValue={r.value}
                        className="w-full max-w-[180px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.description || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          const input = (e.currentTarget.closest("tr") as HTMLElement)?.querySelector("input");
                          if (input) save(r.key, input.value);
                        }}
                        disabled={savingKey === r.key}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {savingKey === r.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
