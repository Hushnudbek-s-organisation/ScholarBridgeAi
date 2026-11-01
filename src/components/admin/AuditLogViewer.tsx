"use client";

import React, { useCallback, useEffect, useState } from "react";
import { History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AdminAuditViewerProps {
  adminProfileId: number;
}

interface AuditRow {
  id: number;
  entityType: string;
  entityId: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  actor: string;
  verificationStatus: string;
  createdAt: string;
}

export function AuditLogViewer({ adminProfileId }: AdminAuditViewerProps) {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");

  const load = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ adminProfileId: String(adminProfileId) });
      if (type) qs.set("entityType", type);
      const res = await fetch(`/api/admin/audit?${qs}`);
      const data = await res.json();
      if (res.ok && data.logs) setLogs(data.logs);
    } catch (err) {
      console.error("Failed to load audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [adminProfileId]);

  useEffect(() => {
    void Promise.resolve().then(() => load(""));
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="rounded-overlay border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-surface bg-slate-900 flex items-center justify-center">
          <History className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Change History / Audit Log</h2>
          <p className="text-sm text-slate-500">Every important change is recorded with old/new values and the actor.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              load(e.target.value);
            }}
            className="rounded-surface border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
          >
            <option value="">All types</option>
            <option value="university">Universities</option>
            <option value="scholarship">Scholarships</option>
          </select>
          <Button variant="unstyled"
            onClick={() => load(entityType)}
            className="flex items-center gap-1.5 rounded-surface border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-overlay border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-500">No changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Entity</th>
                  <th className="px-4 py-3 font-bold">Field</th>
                  <th className="px-4 py-3 font-bold">Old → New</th>
                  <th className="px-4 py-3 font-bold">Actor</th>
                  <th className="px-4 py-3 font-bold">Verification</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-slate-700">{l.entityType}</span>
                      <span className="text-slate-500"> #{l.entityId}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{l.fieldChanged}</td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <span className="text-rose-600 line-through decoration-rose-300">{l.oldValue ?? "—"}</span>
                      <span className="mx-1 text-slate-500">→</span>
                      <span className="text-emerald-700">{l.newValue ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${l.actor === "ADMIN" ? "bg-slate-900 text-white" : "bg-indigo-50 text-indigo-700"}`}>
                        {l.actor}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{l.verificationStatus}</td>
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
