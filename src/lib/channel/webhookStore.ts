/**
 * The Telegram half of "is the publisher bot's webhook connected?".
 *
 * Read it (`publisherWebhook`) to *show* the operator the truth, and heal it
 * (`ensurePublisherWebhook`) so a deployment that lost its webhook — a domain
 * move, a rotated `SESSION_SECRET`, a bot swapped in the environment — repairs
 * itself on the next channel tick instead of leaving the Approve button dead.
 *
 * Safety rules, because this really does call Telegram:
 *   • it only ever sets the webhook of the bot that publishes (`channel/token`),
 *     never a student-facing change;
 *   • it acts only on a definite verdict (`missing`, `wrong_url`, `error`) —
 *     `unknown` means Telegram did not answer, and re-registering on a guess
 *     could fight a working setup;
 *   • the DDL/DB is never touched here, so a failure cannot break a tick;
 *   • `drop_pending_updates` is false: a queued callback press must still be
 *     handled after the fix, not discarded.
 */
import { tgCall, type TgResult } from "@/lib/telegram/api";
import { webhookSecret } from "@/lib/telegram/settings";
import { getChannelBotToken } from "./token";
import { loadChannelSettings } from "./repo";
import { resolveChannelRuntime } from "./config";
import {
  ALLOWED_UPDATES,
  webhookAdvice,
  webhookUrlFor,
  webhookVerdict,
  type WebhookAdvice,
  type WebhookState,
} from "./webhook";

interface TgWebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
}

export interface PublisherWebhookStatus {
  /** The bot that publishes, and whether it is a dedicated publisher bot. */
  tokenSource: string;
  dedicated: boolean;
  /** What this deployment expects the webhook to be. */
  expectedUrl: string | null;
  registeredUrl: string | null;
  pending: number;
  lastError: string | null;
  lastErrorAt: string | null;
  state: WebhookState;
  advice: WebhookAdvice;
  /** True when `ensurePublisherWebhook()` would act. */
  reconnect: boolean;
}

/** How often a healthy webhook is re-checked. A broken one is not memoised. */
const CHECK_EVERY_MS = 10 * 60_000;
let lastCheck: { at: number; status: PublisherWebhookStatus } | null = null;

function emptyStatus(reason: WebhookState, expectedUrl: string | null, tokenSource = "none", dedicated = false): PublisherWebhookStatus {
  return {
    tokenSource,
    dedicated,
    expectedUrl,
    registeredUrl: null,
    pending: 0,
    lastError: null,
    lastErrorAt: null,
    state: reason,
    advice: webhookAdvice({ state: reason, reconnect: false }),
    reconnect: false,
  };
}

/** Ask Telegram what the publisher bot's webhook is right now. */
export async function publisherWebhook(options: { memo?: boolean } = {}): Promise<PublisherWebhookStatus> {
  if (options.memo !== false && lastCheck && Date.now() - lastCheck.at < CHECK_EVERY_MS && lastCheck.status.state === "ok") {
    return lastCheck.status;
  }

  const [settings, tokenInfo] = await Promise.all([
    loadChannelSettings().catch(() => null),
    getChannelBotToken().catch(() => ({ token: null, dedicated: false, source: "none" as const })),
  ]);
  const siteUrl = settings ? resolveChannelRuntime(settings).siteUrl : null;
  const expectedUrl = webhookUrlFor(siteUrl);

  if (!tokenInfo.token) return emptyStatus("unknown", expectedUrl);

  const res: TgResult<TgWebhookInfo> = await tgCall<TgWebhookInfo>(tokenInfo.token, "getWebhookInfo", {}).catch((err) => ({
    ok: false,
    description: err instanceof Error ? err.message : "getWebhookInfo failed",
  }));

  if (!res.ok || !res.result) {
    return { ...emptyStatus("unknown", expectedUrl, tokenInfo.source, tokenInfo.dedicated), lastError: res.description ?? null };
  }

  const info = res.result;
  const facts = {
    registeredUrl: info.url ?? "",
    expectedUrl,
    pending: Number(info.pending_update_count ?? 0),
    lastError: info.last_error_message ?? null,
  };
  const verdict = webhookVerdict(facts);
  const status: PublisherWebhookStatus = {
    tokenSource: tokenInfo.source,
    dedicated: tokenInfo.dedicated,
    expectedUrl,
    registeredUrl: facts.registeredUrl || null,
    pending: facts.pending,
    lastError: facts.lastError,
    lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
    state: verdict.state,
    advice: webhookAdvice(verdict, facts.pending),
    reconnect: verdict.reconnect,
  };
  // Only a healthy answer is memoised: a failure must be retried, not cached.
  lastCheck = status.state === "ok" ? { at: Date.now(), status } : null;
  return status;
}

export interface EnsureResult {
  /** True when this call actually sent setWebhook. */
  repaired: boolean;
  /** Why it did or did not act — a stable code, safe to log and display. */
  reason: "ok" | "repaired" | "no_token" | "no_site_url" | "unreachable" | "failed" | "throttled";
  status: PublisherWebhookStatus;
}

/**
 * Re-register the publisher's webhook when — and only when — it is broken.
 *
 * `force` is the operator's explicit "fix it now" button: it skips the memo and
 * re-registers even if the last check looked healthy (the case where Telegram
 * lost the webhook without telling us).
 */
export async function ensurePublisherWebhook(options: { force?: boolean } = {}): Promise<EnsureResult> {
  const status = await publisherWebhook({ memo: !options.force });
  if (!options.force && !status.reconnect) return { repaired: false, reason: "ok", status };
  if (!status.expectedUrl) return { repaired: false, reason: "no_site_url", status };

  const tokenInfo = await getChannelBotToken().catch(() => ({ token: null, dedicated: false, source: "none" as const }));
  if (!tokenInfo.token) return { repaired: false, reason: "no_token", status };
  if (status.state === "unknown") return { repaired: false, reason: "unreachable", status };

  const res = await tgCall(tokenInfo.token, "setWebhook", {
    url: status.expectedUrl,
    secret_token: webhookSecret(tokenInfo.token),
    allowed_updates: [...ALLOWED_UPDATES],
    // A queued press is still a valid decision: deliver it, do not drop it.
    drop_pending_updates: false,
  }).catch((err) => ({ ok: false, description: err instanceof Error ? err.message : "setWebhook failed" }));

  const after = await publisherWebhook({ memo: false });
  if (!res.ok) return { repaired: false, reason: "failed", status: after };
  return { repaired: true, reason: "repaired", status: after };
}

/**
 * The one call every tick makes.
 *
 * `ensurePublisherWebhook` is the fix; this is the *tick-shaped* wrapper: it
 * never throws (a tick must not die because Telegram was slow), it reports one
 * compact line for the audit heartbeat, and after a real repair it tells the
 * admin chat that the buttons work again — an operator who was told "the button
 * is dead" otherwise has no reason to press it a second time.
 */
export async function maintainPublisherTransport(
  options: { notifyChatId?: string | null } = {}
): Promise<{ state: WebhookState; repaired: boolean; reason: EnsureResult["reason"] }> {
  try {
    const result = await ensurePublisherWebhook();
    if (result.repaired && options.notifyChatId) {
      const { token } = await getChannelBotToken().catch(() => ({ token: null }));
      if (token) {
        const { tgSendMessage } = await import("@/lib/telegram/api");
        const { APPROVAL_TEXTS } = await import("./approval");
        await tgSendMessage(token, options.notifyChatId, APPROVAL_TEXTS.webhookRepaired).catch(() => undefined);
      }
    }
    return { state: result.status.state, repaired: result.repaired, reason: result.reason };
  } catch {
    return { state: "unknown", repaired: false, reason: "unreachable" };
  }
}

/** Test seam: forget the memo (the integration checks call this). */
export function resetWebhookMemo(): void {
  lastCheck = null;
}
