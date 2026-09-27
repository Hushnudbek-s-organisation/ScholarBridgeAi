/**
 * Platform ownership transfer — pure rules (no DB), shared by the service,
 * the API route and the tests.
 *
 * State machine (terminal states never move again; nothing returns to
 * "pending"):
 *
 *   pending  ──accept (target)──▶ accepted ──confirm (owner)──▶ completed
 *      │                            │
 *      ├─reject (target)──▶ rejected ◀─reject (target)─┤
 *      ├─cancel (owner)───▶ cancelled ◀─cancel (owner)─┤
 *      └─expire (system)──▶ expired   ◀─expire (system)┘
 *
 * "accepted" means the target agreed; ownership changes only when the
 * CURRENT owner confirms (both steps re-verify the account password).
 */

export const OWNERSHIP_STATUSES = ["pending", "accepted", "completed", "rejected", "expired", "cancelled"] as const;
export type OwnershipStatus = (typeof OWNERSHIP_STATUSES)[number];

export const OPEN_STATUSES: readonly OwnershipStatus[] = ["pending", "accepted"];
export const TERMINAL_STATUSES: readonly OwnershipStatus[] = ["completed", "rejected", "expired", "cancelled"];

export type OwnershipAction = "accept" | "confirm" | "reject" | "cancel" | "expire";
export type OwnershipRole = "owner" | "target" | "system";

const TRANSITIONS: Record<OwnershipStatus, Partial<Record<OwnershipAction, { to: OwnershipStatus; by: OwnershipRole }>>> = {
  pending: {
    accept: { to: "accepted", by: "target" },
    reject: { to: "rejected", by: "target" },
    cancel: { to: "cancelled", by: "owner" },
    expire: { to: "expired", by: "system" },
  },
  accepted: {
    confirm: { to: "completed", by: "owner" },
    reject: { to: "rejected", by: "target" },
    cancel: { to: "cancelled", by: "owner" },
    expire: { to: "expired", by: "system" },
  },
  completed: {},
  rejected: {},
  expired: {},
  cancelled: {},
};

export function isOwnershipStatus(value: unknown): value is OwnershipStatus {
  return typeof value === "string" && (OWNERSHIP_STATUSES as readonly string[]).includes(value);
}

/**
 * The next status for `action` performed by `role`, or null when the
 * transition is not allowed (wrong state or wrong party).
 */
export function nextOwnershipStatus(current: OwnershipStatus, action: OwnershipAction, role: OwnershipRole): OwnershipStatus | null {
  const t = TRANSITIONS[current]?.[action];
  if (!t || t.by !== role) return null;
  return t.to;
}

/** Statuses from which `action` is allowed (used in conditional UPDATEs). */
export function statusesAllowing(action: OwnershipAction): OwnershipStatus[] {
  return OWNERSHIP_STATUSES.filter((s) => Boolean(TRANSITIONS[s][action]));
}

export const DEFAULT_TRANSFER_TTL_HOURS = 72;

/** OWNERSHIP_TRANSFER_TTL_HOURS, clamped to 1..168 (default 72). */
export function transferTtlHours(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(String(env.OWNERSHIP_TRANSFER_TTL_HOURS ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_TRANSFER_TTL_HOURS;
  return Math.min(168, Math.max(1, n));
}

export function transferExpiresAt(now: Date = new Date(), env: Record<string, string | undefined> = process.env): Date {
  return new Date(now.getTime() + transferTtlHours(env) * 3_600_000);
}

/** The typed confirmation phrase required to start a transfer. */
export const TRANSFER_CONFIRM_PHRASE = "TRANSFER";

/**
 * What changes hands inside the app vs. what must be moved manually. The
 * app never pretends to transfer third-party accounts.
 */
export const HANDOVER_CHECKLIST: { id: string; automatic: boolean; label: string; detail: string }[] = [
  { id: "app_owner", automatic: true, label: "Platform owner role", detail: "Moves to the new owner when the transfer is confirmed." },
  { id: "admin_access", automatic: true, label: "Admin access", detail: "The new owner is (and stays) an admin; the previous owner keeps admin only if chosen." },
  { id: "ai_keys", automatic: false, label: "AI provider accounts & billing", detail: "Keys saved in Admin → AI keep working but belong to the previous owner's provider accounts. The new owner should create their own keys and replace them (rotation), then the old ones should be revoked at the provider." },
  { id: "telegram_bot", automatic: false, label: "Telegram bot", detail: "Manual Telegram ownership transfer may be required: in @BotFather use /mybots → Bot Settings → Transfer Ownership (Telegram requirements apply), or create a new bot and replace TELEGRAM_BOT_TOKEN." },
  { id: "hosting", automatic: false, label: "Hosting (e.g. Render/Vercel)", detail: "Transfer the service/project or redeploy under the new owner's account and copy the environment variables." },
  { id: "database", automatic: false, label: "Database / Supabase project", detail: "Transfer the project to the new owner's organisation (or migrate the data)." },
  { id: "domain", automatic: false, label: "Domain & DNS", detail: "Move the domain registrar account or update DNS; then set APP_URL and re-register the Telegram webhook." },
  { id: "payments", automatic: false, label: "Payment merchant accounts", detail: "Payme/Click merchant contracts are legal agreements and are not transferred by the app." },
  { id: "secrets", automatic: false, label: "Secrets", detail: "Rotate SESSION_SECRET (signs everyone out), CRON_SECRET, TELEGRAM_WEBHOOK_SECRET and AI_KEYS_ENCRYPTION_SECRET (keep the old one in AI_KEYS_ENCRYPTION_SECRET_PREVIOUS, then re-encrypt keys)." },
  { id: "search_console", automatic: false, label: "Google Search Console", detail: "Add the new owner as an owner of the property; update GOOGLE_SITE_VERIFICATION if needed." },
];
