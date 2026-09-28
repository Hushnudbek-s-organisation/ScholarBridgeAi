"use client";

/**
 * Admin → Ownership. Shows the platform owner, the open transfer (with the
 * actions THIS admin may take), admin management (owner only), history and
 * the external handover checklist. Every action is re-authorised by the
 * server (/api/admin/ownership); the flags here only decide what to show.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Crown, Loader2, RefreshCw, ShieldAlert, UserCog, XCircle } from "lucide-react";

interface Person {
  id: number;
  name: string;
  email: string;
}

interface TransferView {
  id: number;
  status: "pending" | "accepted" | "completed" | "rejected" | "expired" | "cancelled";
  from: Person;
  to: Person;
  retainPreviousAdmin: boolean;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  decidedAt: string | null;
  canAccept: boolean;
  canReject: boolean;
  canCancel: boolean;
  canConfirm: boolean;
}

interface Overview {
  owner: (Person & { since: string; source: string }) | null;
  isOwner: boolean;
  openTransfer: TransferView | null;
  history: TransferView[];
  admins: (Person & { isOwner: boolean })[];
  checklist: { id: string; automatic: boolean; label: string; detail: string }[];
  ttlHours: number;
}

const PHRASE = "TRANSFER";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const btnDark =
  "flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50";
const btnLight =
  "flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50";
const btnDanger =
  "flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50";

const STATUS_CLS: Record<TransferView["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export function OwnershipManager() {
  const t = useTranslations("adminOwnership");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Start form
  const [targetEmail, setTargetEmail] = useState("");
  const [retainAdmin, setRetainAdmin] = useState(true);
  const [note, setNote] = useState("");
  const [phrase, setPhrase] = useState("");
  const [startPw, setStartPw] = useState("");
  // Open-transfer actions + admin management
  const [actionPw, setActionPw] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPw, setAdminPw] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ownership", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json as Overview);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const act = async (key: string, body: Record<string, unknown>, after?: () => void) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMsg({ ok: true, text: t("done") });
      after?.();
      await load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setBusy(null);
    }
  };

  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
  const checkText = (id: string, field: "label" | "detail", fallback: string) =>
    t.has(`check.${id}.${field}`) ? t(`check.${id}.${field}`) : fallback;

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
        <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
      </div>
    );
  }

  const open = data?.openTransfer ?? null;

  return (
    <div className="space-y-4">
      {/* Owner */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Crown className="h-5 w-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("owner")}</p>
          {data?.owner ? (
            <p className="truncate text-sm font-extrabold text-slate-800">
              {data.owner.name} <span className="font-semibold text-slate-500">· {data.owner.email}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-500">{t("noOwner")}</p>
          )}
          {data?.owner && (
            <p className="text-[11px] text-slate-400">
              {t("since")}: {when(data.owner.since)} · {data.isOwner ? t("youAreOwner") : t("notOwner")}
            </p>
          )}
        </div>
        <button onClick={() => void load()} className={btnLight}>
          <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
        </button>
      </div>

      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">{t("intro")}</p>

      {msg && (
        <div
          role={msg.ok ? "status" : "alert"}
          className={`rounded-2xl border p-3 text-xs font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </div>
      )}

      {/* Open transfer */}
      {open && (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-800">{t("openTitle")}</h3>
            <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[open.status]}`}>{t(`status.${open.status}`)}</span>
          </div>
          <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div><dt className="text-[10px] font-bold uppercase text-slate-400">{t("from")}</dt><dd className="font-semibold text-slate-700">{open.from.name} · {open.from.email}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase text-slate-400">{t("to")}</dt><dd className="font-semibold text-slate-700">{open.to.name} · {open.to.email}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase text-slate-400">{t("expires")}</dt><dd className="font-semibold text-slate-700">{when(open.expiresAt)}</dd></div>
          </dl>
          {open.note && <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">{open.note}</p>}
          <p className="text-xs text-slate-500">
            {open.canAccept ? t("acceptHint") : open.canConfirm ? t("confirmHint") : open.status === "pending" ? t("waitingTarget") : t("waitingOwner")}
          </p>
          {(open.canAccept || open.canConfirm) && (
            <div className="max-w-xs">
              <label htmlFor="own-action-pw" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("password")}</label>
              <input id="own-action-pw" type="password" autoComplete="current-password" value={actionPw} onChange={(e) => setActionPw(e.target.value)} className={inputCls} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {open.canAccept && (
              <button disabled={!!busy || !actionPw} onClick={() => void act("accept", { action: "accept", transferId: open.id, password: actionPw }, () => setActionPw(""))} className={btnDark}>
                {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {t("accept")}
              </button>
            )}
            {open.canConfirm && (
              <button disabled={!!busy || !actionPw} onClick={() => void act("confirm", { action: "confirm", transferId: open.id, password: actionPw }, () => setActionPw(""))} className={btnDark}>
                {busy === "confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />} {t("confirm")}
              </button>
            )}
            {open.canReject && (
              <button disabled={!!busy} onClick={() => void act("reject", { action: "reject", transferId: open.id })} className={btnDanger}>
                <XCircle className="h-3.5 w-3.5" /> {t("reject")}
              </button>
            )}
            {open.canCancel && (
              <button disabled={!!busy} onClick={() => void act("cancel", { action: "cancel", transferId: open.id })} className={btnDanger}>
                <XCircle className="h-3.5 w-3.5" /> {t("cancel")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Start transfer (owner, nothing open) */}
      {data?.isOwner && !open && (
        <form
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault();
            void act("start", { action: "start", targetEmail, retainAdmin, note, confirm: phrase, password: startPw }, () => {
              setStartPw("");
              setPhrase("");
            });
          }}
        >
          <h3 className="text-sm font-extrabold text-slate-800">{t("startTitle")}</h3>
          <p className="text-xs text-slate-500">{t("startIntro", { hours: data.ttlHours })}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="own-target" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("targetEmail")}</label>
              <input id="own-target" type="email" required value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="own-note" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("note")}</label>
              <input id="own-note" type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="own-phrase" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("typeConfirm", { phrase: PHRASE })}</label>
              <input id="own-phrase" type="text" autoComplete="off" value={phrase} onChange={(e) => setPhrase(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="own-start-pw" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("password")}</label>
              <input id="own-start-pw" type="password" autoComplete="current-password" value={startPw} onChange={(e) => setStartPw(e.target.value)} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={retainAdmin} onChange={(e) => setRetainAdmin(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            {t("retainAdmin")}
          </label>
          <button type="submit" disabled={!!busy || phrase !== PHRASE || !startPw || !targetEmail} className={btnDark}>
            {busy === "start" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />} {t("startBtn")}
          </button>
        </form>
      )}

      {/* Admins (owner only) */}
      {data?.isOwner && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-extrabold text-slate-800">{t("adminsTitle")}</h3>
          </div>
          <p className="text-xs text-slate-500">{t("adminsIntro")}</p>
          <ul className="divide-y divide-slate-100 text-xs">
            {data.admins.map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-2">
                <span className="font-semibold text-slate-700">{a.name}</span>
                <span className="truncate text-slate-400">{a.email}</span>
                {a.isOwner && <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{t("ownerBadge")}</span>}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <input aria-label={t("email")} placeholder={t("email")} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={inputCls} />
            <input aria-label={t("password")} placeholder={t("password")} type="password" autoComplete="current-password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} className={inputCls} />
            <button disabled={!!busy || !adminEmail || !adminPw} onClick={() => void act("grant", { action: "grantAdmin", email: adminEmail, password: adminPw }, () => setAdminPw(""))} className={btnDark}>
              {t("grant")}
            </button>
            <button disabled={!!busy || !adminEmail || !adminPw} onClick={() => void act("revoke", { action: "revokeAdmin", email: adminEmail, password: adminPw }, () => setAdminPw(""))} className={btnDanger}>
              {t("revoke")}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-800">{t("historyTitle")}</h3>
        {data?.history.length ? (
          <ul className="divide-y divide-slate-100 text-xs">
            {data.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[h.status]}`}>{t(`status.${h.status}`)}</span>
                <span className="text-slate-700">{h.from.name} → {h.to.name}</span>
                <span className="ml-auto text-slate-400">{when(h.decidedAt ?? h.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">{t("historyEmpty")}</p>
        )}
      </div>

      {/* Handover checklist */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-800">{t("checklistTitle")}</h3>
        <p className="text-xs text-slate-500">{t("checklistIntro")}</p>
        <ul className="space-y-2">
          {data?.checklist.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{checkText(c.id, "label", c.label)}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${c.automatic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {c.automatic ? t("automatic") : t("manual")}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{checkText(c.id, "detail", c.detail)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
