"use client";

import React, { useEffect, useState } from "react";
import { Menu, Eye, EyeOff, Lock, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import {
  DEFAULT_HIDDEN_NAV_ITEMS,
  NAV_SECTIONS,
  parseHiddenNav,
} from "@/lib/navSections";

interface NavManagerProps {
  adminProfileId: number;
}

/**
 * Admin → Navigation.
 *
 * Turns each sidebar section on/off for ALL users. The value is stored in
 * `app_config.nav_hidden_items` (JSON array of hidden section ids) and read
 * by the Navbar through GET /api/config/nav — changes apply immediately,
 * no deploy needed.
 *
 * Sections hidden by default (My Profile, AI Advisor, Mentors, Opportunities,
 * Country Compare, Parents) start OFF and can be brought back here at any time.
 */
export function NavManager({ adminProfileId }: NavManagerProps) {
  const [hidden, setHidden] = useState<string[]>([...DEFAULT_HIDDEN_NAV_ITEMS]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/config?adminProfileId=${adminProfileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load navigation settings");
      const row = Array.isArray(data.config)
        ? data.config.find((r: { key: string; value: string }) => r.key === "nav_hidden_items")
        : null;
      setHidden(parseHiddenNav(row?.value));
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to load navigation settings",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- same load-on-mount pattern as every other admin manager
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfileId]);

  const persist = async (next: string[], id: string) => {
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminProfileId,
          key: "nav_hidden_items",
          value: JSON.stringify(next),
          description: "Sidebar sections hidden from users (JSON array of ids) — Admin → Navigation",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setHidden(next);
      // The open sidebar re-reads the config on this event — no reload needed.
      window.dispatchEvent(new Event("scholarbridge:nav-updated"));
      setMessage({ ok: true, text: "Sidebar navigation updated — applied immediately." });
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSavingId("");
    }
  };

  const toggle = (id: string) => {
    const next = hidden.includes(id)
      ? hidden.filter((x) => x !== id)
      : [...hidden, id];
    void persist(next, id);
  };

  const visibleCount = NAV_SECTIONS.filter((s) => !hidden.includes(s.id)).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Menu className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Sidebar navigation</h2>
          <p className="text-xs text-slate-500">
            {visibleCount} of {NAV_SECTIONS.length} sections visible to users. Changes apply
            immediately — no deploy needed.
          </p>
        </div>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            message.ok
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {NAV_SECTIONS.map((section) => {
              const visible = !hidden.includes(section.id);
              const saving = savingId === section.id;
              return (
                <li
                  key={section.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-800">
                        {section.label}
                      </span>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {section.id}
                      </code>
                      {section.locked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                          <Lock className="h-2.5 w-2.5" /> Always on
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {section.description}
                    </p>
                  </div>

                  {section.locked ? (
                    <span className="shrink-0 text-[11px] font-bold text-emerald-600">
                      Visible
                    </span>
                  ) : (
                    <button
                      onClick={() => toggle(section.id)}
                      disabled={saving || savingId !== ""}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                        visible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title={visible ? "Hide from the sidebar" : "Show in the sidebar"}
                    >
                      {saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {visible ? "Visible" : "Hidden"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && (
        <button
          onClick={() => void persist([...DEFAULT_HIDDEN_NAV_ITEMS], "defaults")}
          disabled={savingId !== ""}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {savingId === "defaults" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Restore default visibility
        </button>
      )}
    </div>
  );
}
