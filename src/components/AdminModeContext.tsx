"use client";

/**
 * ADMIN VIEW MODE (Pillar 8 — "god mode").
 *
 * Root cause it fixes: the operator of the site could not see their own
 * product. Sections whose ids sit in the hidden-navigation config were hidden
 * from EVERYONE (admin included), and every client-side entitlement check
 * treated an admin with no paid subscription row as a free user.
 *
 * Three modes, one switch:
 *   admin_all  (default for admins) — every destination, pane and premium
 *               section renders; ids that regular users cannot see are marked
 *               with a "hidden for users" badge so the admin can still tell
 *               them apart.
 *   pro_user   — preview exactly what a Premium student sees.
 *   free_user  — preview exactly what a free student sees (locks and all).
 *
 * The mode is presentation-only: the server keeps `premiumGate` on every
 * Premium API, and an admin session is authorised by its own role. No mode
 * grants a non-admin anything, and switching modes never changes stored data.
 */
import React, { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

export type AdminViewMode = "admin_all" | "pro_user" | "free_user";

export const ADMIN_VIEW_MODES: readonly AdminViewMode[] = ["admin_all", "pro_user", "free_user"];
export const ADMIN_VIEW_STORAGE_KEY = "sb_admin_view_mode";

export function isAdminViewMode(v: unknown): v is AdminViewMode {
  return typeof v === "string" && (ADMIN_VIEW_MODES as readonly string[]).includes(v);
}

interface AdminModeValue {
  /** True only for an admin session on admin_all. */
  unlocked: boolean;
  mode: AdminViewMode;
  setMode: (mode: AdminViewMode) => void;
  /** Whether the signed-in profile is an admin at all (switcher visibility). */
  isAdminSession: boolean;
  /** Ids that regular users cannot see — badged while unlocked. */
  hiddenForUsers: string[];
}

const Ctx = createContext<AdminModeValue>({
  unlocked: false,
  mode: "free_user",
  setMode: () => undefined,
  isAdminSession: false,
  hiddenForUsers: [],
});

/**
 * Controlled provider: the shell (HomeClient) owns the state so it can also
 * compute the effective hidden-navigation list for every hub it renders. The
 * provider only persists the choice and republishes it to consumers.
 */
export function AdminModeProvider({
  isAdminSession,
  hiddenForUsers = [],
  mode,
  onModeChange,
  children,
}: {
  isAdminSession: boolean;
  hiddenForUsers?: string[];
  mode: AdminViewMode;
  onModeChange: (mode: AdminViewMode) => void;
  children: ReactNode;
}) {
  const setMode = useCallback(
    (next: AdminViewMode) => {
      if (!isAdminSession) return;
      onModeChange(next);
      try {
        window.localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, next);
      } catch {
        // storage disabled — the mode still applies for this session
      }
    },
    [isAdminSession, onModeChange]
  );

  const value = useMemo<AdminModeValue>(
    () => ({
      unlocked: isAdminSession && mode === "admin_all",
      mode: isAdminSession ? mode : "free_user",
      setMode,
      isAdminSession,
      hiddenForUsers,
    }),
    [isAdminSession, mode, setMode, hiddenForUsers]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminMode(): AdminModeValue {
  return useContext(Ctx);
}

/** Mode labels/descriptions — keys live in the `adminMode` i18n namespace. */
export const ADMIN_MODE_LABEL_KEY: Record<AdminViewMode, string> = {
  admin_all: "modeAdminAll",
  pro_user: "modePro",
  free_user: "modeFree",
};

export const ADMIN_MODE_HINT_KEY: Record<AdminViewMode, string> = {
  admin_all: "modeAdminAllHint",
  pro_user: "modeProHint",
  free_user: "modeFreeHint",
};
