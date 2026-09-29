"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, Crown, Sparkles, Users, Infinity as InfinityIcon, FileText, MessageSquare, Plane } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";
import { PaymentHistory, PaymentItem } from "./PaymentHistory";
import { CheckoutModal } from "./CheckoutModal";

interface PaymentsSectionProps {
  activeProfile: StudentProfile | null;
}

interface PlanPackage {
  id: "monthly" | "season" | "yearly";
  label: string;
  labelUz?: string;
  priceUzs: number;
  days: number;
  currency: string;
  badge?: string;
}

const FREE_FEATURES = [
  { icon: Sparkles, text: "Universitet va stipendiya qidiruvi + moslik bahosi" },
  { icon: Check, text: "10 tagacha universitet va 10 tagacha stipendiya saqlash" },
  { icon: Check, text: "Mening o'qish rejam va asosiy yo'l xaritasi" },
  { icon: Check, text: "Asosiy deadline eslatmalari (Telegram)" },
  { icon: Check, text: "Test rejalashtiruvchi va hujjatlar checklisti" },
  { icon: MessageSquare, text: "AI yordamchi: kuniga 3–5 savol" },
  { icon: Check, text: "Forumni o'qish, kurslarning kirish darslari" },
  { icon: Check, text: "1 ta ariza ish maydoni" },
];

const PRO_FEATURES = [
  { icon: FileText, text: "SOP/inshoni AI bilan yozish, tahlil va versiyalar" },
  { icon: Sparkles, text: "Profil auditi va chuqur qabul imkoniyati tahlili" },
  { icon: InfinityIcon, text: "Cheksiz ariza ish maydoni va cheksiz saqlash" },
  { icon: Check, text: "Barcha muddatlar markazi + kengaytirilgan eslatmalar (3/7/14 kun)" },
  { icon: Plane, text: "Cheksiz viza suhbati mashqi va viza markazi" },
  { icon: MessageSquare, text: "Cheksiz AI yordamchi" },
  { icon: FileText, text: "Tavsiyanoma ombori va fayl yuklash (hujjatlar ombori)" },
  { icon: Users, text: "Ota-ona kuzatuv paneli" },
  { icon: Check, text: "Forumda yozish va kurslarning to'liq versiyasi" },
];

function formatUzs(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

export function PaymentsSection({ activeProfile }: PaymentsSectionProps) {
  const t = useTranslations("payments");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PlanPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PlanPackage["id"]>("season");
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const [payRes, statusRes] = await Promise.all([
        fetch(`/api/payments?profileId=${activeProfile.id}`),
        fetch(`/api/premium/status?profileId=${activeProfile.id}`),
      ]);
      const payData = await payRes.json();
      const statusData = await statusRes.json();
      if (payData.payments) setPayments(payData.payments);
      setIsPremium(!!(payData.isPremium || statusData.isPremium));
      if (Array.isArray(statusData.packages) && statusData.packages.length) {
        setPackages(statusData.packages);
        // Prefer season package for applicants (seasonal need).
        if (statusData.packages.some((p: PlanPackage) => p.id === "season")) {
          setSelectedPackage("season");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!activeProfile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center">
        <p className="text-sm text-slate-500">{t("noSubscription")}</p>
      </div>
    );
  }

  const selected = packages.find((p) => p.id === selectedPackage) ?? packages[0];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{t("title")}</h1>
              <p className="text-xs text-slate-800 mt-0.5">
                Bepul — ishni boshlash uchun. Pro — vaqt tejash, sifat va cheksizlik.
              </p>
            </div>
          </div>
          <SubscriptionStatusBadge isPremium={isPremium} />
        </div>
      </div>

      {/* Free vs Pro comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Bepul</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">0 so&apos;m</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Haqiqiy foyda beradi — ishni tugatish uchun yetmaydi.</p>
          <ul className="mt-4 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2 text-sm text-slate-700">
                <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-extrabold text-slate-900">
              <Crown className="h-4 w-4 text-amber-500" /> Pro
            </h2>
            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white">Tavsiya</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Deadline yaqin, insho yozilayotganda, viza oldidan — shu paytda kerak.</p>
          <ul className="mt-4 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2 text-sm text-slate-800">
                <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!isPremium && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Pro paketini tanlang</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Talabaning ehtiyoji mavsumiy — shuning uchun qisqa (3 oy) va yillik variantlar ham bor.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(packages.length
              ? packages
              : [
                  { id: "monthly" as const, label: "Monthly", labelUz: "Oylik", priceUzs: 59000, days: 30, currency: "UZS" },
                  { id: "season" as const, label: "Season", labelUz: "Ariza mavsumi", priceUzs: 149000, days: 90, currency: "UZS", badge: "Best" },
                  { id: "yearly" as const, label: "Yearly", labelUz: "Yillik", priceUzs: 499000, days: 365, currency: "UZS" },
                ]
            ).map((pack) => {
              const active = selectedPackage === pack.id;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackage(pack.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition ${
                    active
                      ? "border-amber-500 bg-amber-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  {pack.badge && (
                    <span className="absolute -top-2 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {pack.badge}
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {pack.labelUz || pack.label}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">{formatUzs(pack.priceUzs)}</p>
                  <p className="text-[11px] text-slate-500">{pack.days} kun</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                {selected ? formatUzs(selected.priceUzs) : "—"}{" "}
                <span className="text-xs font-medium text-slate-500">
                  / {selected?.days ?? 30} kun
                </span>
              </p>
              <p className="text-[11px] text-slate-500">Ota-onalar ham to&apos;lashi mumkin — oila qaror va pulni boshqaradi.</p>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              {t("upgrade")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
          <p className="text-sm text-slate-500">{t("loading")}</p>
        </div>
      ) : (
        <PaymentHistory payments={payments} />
      )}

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        profileId={activeProfile.id}
        packageId={selectedPackage}
        packageMeta={selected}
        onPaid={() => {
          setShowCheckout(false);
          loadData();
        }}
      />
    </div>
  );
}
