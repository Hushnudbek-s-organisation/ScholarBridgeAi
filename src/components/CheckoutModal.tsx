"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, CreditCard, ArrowRight } from "lucide-react";
import { AppNote } from "@/components/AppNote";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  onPaid: () => void;
  /** monthly | season | yearly — sent to /api/payments/initiate */
  packageId?: "monthly" | "season" | "yearly";
  packageMeta?: { label?: string; labelUz?: string; priceUzs?: number; days?: number } | null;
}

export function CheckoutModal({
  isOpen,
  onClose,
  profileId,
  onPaid,
  packageId = "monthly",
  packageMeta,
}: CheckoutModalProps) {
  const t = useTranslations("payments");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes the dialog. Keyboard-only users had no way out except
  // tabbing to the small × button, and assistive tech could not tell this was
  // a dialog at all (no role/aria-modal).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const price = packageMeta?.priceUzs ?? 59000;
  const days = packageMeta?.days ?? 30;
  const label = packageMeta?.labelUz || packageMeta?.label || t("planPremium");

  const startCheckout = async (provider: "payme" | "click") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, provider, package: packageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("checkoutFailed"));
        setLoading(false);
        return;
      }
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      // Poll shortly after opening the gateway to reflect any paid status.
      setTimeout(() => {
        onPaid();
        setLoading(false);
      }, 4000);
    } catch (err) {
      console.error(err);
      setError(t("checkoutFailed"));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 id="checkout-modal-title" className="font-bold text-slate-900 text-lg">{t("checkout")}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("cancel")}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">
              {t("planLabel")}: {label}
            </span>
            <span className="text-lg font-extrabold text-indigo-900">
              {price.toLocaleString("uz-UZ")} UZS
            </span>
          </div>
          <p className="text-[11px] text-indigo-600 mt-1">/ {days} days</p>
        </div>

        <p className="text-xs font-semibold text-slate-600">{t("chooseProvider")}</p>

        <div className="space-y-2">
          {(["payme", "click"] as const).map((provider) => (
            <button
              key={provider}
              onClick={() => startCheckout(provider)}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r text-white font-bold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              style={{
                backgroundImage: `linear-gradient(to right, ${
                  provider === "payme" ? "#2563eb, #1d4ed8" : "#7c3aed, #9333ea"
                })`,
              }}
            >
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {provider === "payme" ? "Payme" : "Click"}
              </span>
              <span className="text-xs opacity-80">
                {t("payWith")} {provider === "payme" ? "Payme" : "Click"}
              </span>
            </button>
          ))}
        </div>

        {loading && <p className="text-xs text-slate-500 text-center">{t("redirecting")}...</p>}
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1"
        >
          {t("cancel")} <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        </button>
      </div>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="thirdParty" className="mt-2" />
    </div>
  );
}
