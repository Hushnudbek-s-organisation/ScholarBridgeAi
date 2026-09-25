"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

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

  const computePanel = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8; // keep a small gutter from the viewport edge
    const desired = Math.min(320, vw - margin * 2); // w-80 (320px)
    const fitsLeft = rect.left + desired <= vw - margin;
    const fitsRight = rect.right - desired >= margin;
    let nextAnchor: "left" | "right";
    if (fitsLeft && fitsRight) nextAnchor = rect.left < vw / 2 ? "left" : "right";
    else if (fitsLeft) nextAnchor = "left";
    else if (fitsRight) nextAnchor = "right";
    else {
      // Neither side fits the full width (very narrow screens) — use the
      // roomier side and shrink the panel to fit.
      const roomLeft = vw - margin - rect.left;
      const roomRight = rect.right - margin;
      nextAnchor = roomLeft >= roomRight ? "left" : "right";
    }
    const room = nextAnchor === "left" ? vw - margin - rect.left : rect.right - margin;
    const nextWidth = Math.min(desired, room);
    setAnchor(nextAnchor);
    setPanelWidth(nextWidth < 320 ? Math.round(nextWidth) : null);
  }, []);

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
        title="Notifications"
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
          // Vertical: `placement="up"` opens above the bell (sidebar footer),
          // "down" opens below it (mobile top header).
          // Horizontal: `left-0` / `right-0` chosen by `computePanel` from the
          // bell's viewport position, so the panel stays fully on screen.
          className={`absolute ${
            placement === "up" ? "bottom-full mb-2" : "top-full mt-1"
          } ${anchor === "left" ? "left-0" : "right-0"} w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl z-50`}
          style={panelWidth ? { width: panelWidth } : undefined}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-extrabold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((n) => (
                <div key={n.id} className={`px-4 py-3 ${n.isRead ? "" : "bg-indigo-50/40"}`}>
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
