"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Copy, Check, Link2 } from "lucide-react";
import { absolutizeLink } from "@/lib/clientUrl";
import { Button } from "@/components/ui/Button";

interface ReferralShareCardProps {
  code: string;
  link: string;
  onApplyCode: (code: string) => Promise<boolean>;
}

export function ReferralShareCard({ code, link: rawLink, onApplyCode }: ReferralShareCardProps) {
  const link = absolutizeLink(rawLink);
  const t = useTranslations("rewards");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [applyValue, setApplyValue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyValue.trim()) return;
    setBusy(true);
    const ok = await onApplyCode(applyValue.trim());
    setMessage(ok ? { ok: true, text: t("codeApplied") } : { ok: false, text: t("codeInvalid") });
    setBusy(false);
    if (ok) setApplyValue("");
  };

  return (
    <div className="bg-white rounded-overlay border border-slate-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-emerald-500" />
        <h3 className="font-bold text-slate-900 text-sm">{t("referral")}</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{t("referralDescription")}</p>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-slate-500 font-semibold uppercase mb-1">{t("referralCode")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-surface font-mono text-sm font-bold text-slate-800 tracking-widest">
              {code}
            </div>
            <Button variant="unstyled"
              onClick={() => copy(code, "code")}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-surface bg-indigo-600 text-white transition-colors hover:bg-indigo-700"
            >
              {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm text-slate-500 font-semibold uppercase mb-1">{t("referralLink")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 break-all rounded-surface border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-mono text-slate-600">
              {link}
            </div>
            <Button variant="unstyled"
              onClick={() => copy(link, "link")}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-surface bg-emerald-700 text-white transition-colors hover:bg-emerald-800"
            >
              {copied === "link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleApply} className="pt-2 border-t border-slate-100">
        <p className="text-sm text-slate-500 font-semibold uppercase mb-1">{t("enterReferralCode")}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={applyValue}
            onChange={(e) => setApplyValue(e.target.value)}
            placeholder={t("referralCode")}
            className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-surface focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <Button variant="unstyled"
            type="submit"
            disabled={!applyValue.trim() || busy}
            className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-surface text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t("applyCode")}
          </Button>
        </div>
        {message && (
          <p className={`text-sm mt-2 font-semibold ${message.ok ? "text-emerald-600" : "text-rose-500"}`}>{message.text}</p>
        )}
      </form>
    </div>
  );
}
