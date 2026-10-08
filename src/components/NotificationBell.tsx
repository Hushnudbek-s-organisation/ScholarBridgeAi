"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck, Loader2, Settings2 } from "lucide-react";
import { computePanelGeometry } from "@/lib/panelPlacement";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  profileId: number | null;
  /**
   * Which way the dropdown opens. Use "up" when the bell sits at the BOTTOM
   * of the screen (desktop sidebar footer) so the panel isn't clipped by the
   * viewport edge; "down" (default) for top headers.
   */
  placement?: "up" | "down";
}

export function NotificationBell({ profileId, placement = "down" }: NotificationBellProps) {
  const t = useTranslations("bell");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Horizontal anchor + optional width clamp, derived from the bell's viewport
  // position so the panel is never pushed off-screen on either side.
  // (e.g. the desktop sidebar bell sits near the LEFT edge, so the panel must
  // open to the right of it instead of 320px to the left of it.)
  const [anchor, setAnchor] = useState<"left" | "right">(placement === "up" ? "left" : "right");
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  // Vertical: which way the panel actually opens (may differ from the requested
  // `placement` when that side does not have room) and how tall it may be.
  const [openUp, setOpenUp] = useState(placement === "up");
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  // The geometry is a pure function (src/lib/panelPlacement.ts) so the
  // placement rules are unit-testable without a browser.
  const computePanel = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const g = computePanelGeometry(
      { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
      { width: window.innerWidth, height: window.innerHeight },
      placement === "up"
    );
    setAnchor(g.anchor);
    setOpenUp(g.openUp);
    setPanelWidth(g.width);
    setMaxHeight(g.maxHeight);
  }, [placement]);

  const toggle = () => {
    if (!open) computePanel(); // anchor before first paint of the panel
    setOpen((o) => !o);
  };

  // Re-measure while open so window resizes / orientation changes stay in view.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", computePanel);
    return () => window.removeEventListener("resize", computePanel);
  }, [open, computePanel]);

  const load = async (unreadOnly = false) => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?profileId=${profileId}&limit=20${unreadOnly ? "&unreadOnly=true" : ""}`
      );
      const data = await res.json();
      if (res.ok && data.notifications) setItems(data.notifications);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = async () => {
    if (!profileId) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, all: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
        title={t("title")}
        aria-label={t("title")}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          // Vertical: opens above the bell when it sits near the bottom of the
          // screen (desktop sidebar footer) and below it in a top header —
          // `computePanel` picks the direction with enough room and clamps the
          // height, so the panel is always fully on screen.
          // Horizontal: `left-0` / `right-0` chosen by `computePanel` from the
          // bell's viewport position, so the panel stays fully on screen.
          className={`absolute ${
            openUp ? "bottom-full mb-2" : "top-full mt-1"
          } ${anchor === "left" ? "left-0" : "right-0"} w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl z-50`}
          style={{
            ...(panelWidth ? { width: panelWidth } : null),
            ...(maxHeight ? { maxHeight: maxHeight } : null),
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-extrabold text-slate-800">{t("title")}</p>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <CheckCheck className="h-3 w-3" /> {t("markAll")}
                </button>
              )}
              {/* Telegram & notification settings (hash deep-link → tab) */}
              <a
                href="#notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:text-sky-800"
                title={t("settings")}
              >
                <Settings2 className="h-3 w-3" /> {t("settings")}
              </a>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-slate-400">{t("empty")}</p>
              <a href="#notifications" onClick={() => setOpen(false)} className="mt-2 inline-block text-[11px] font-bold text-sky-600 hover:text-sky-800">
                {t("emptyTelegram")}
              </a>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((n) => (
                <div key={n.id} className={`px-4 py-3 ${n.isRead ? "" : "bg-indigo-50"}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
