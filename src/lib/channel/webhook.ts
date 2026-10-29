/**
 * Is the *publisher* bot's webhook actually connected?
 *
 * Approve / Reject / Edit are inline buttons. Telegram delivers a button press
 * as a `callback_query` **to the webhook of the bot that sent the message** —
 * so a preview sent by a bot whose webhook is missing (or still pointing at an
 * old deployment) produces a button that visibly does nothing: no error in our
 * logs, no row in the database, no post in the channel. That was the
 * 2026-10-29 report, and it is invisible unless something asks Telegram.
 *
 * This module holds the rules only: no database, no network, no `@/db` import,
 * so `scripts/check-channel.ts` can test it offline. The Telegram calls live in
 * `webhookStore.ts`.
 */

/**
 * Updates the bot must receive. `callback_query` is the one the approval
 * buttons need; `channel_post` and `my_chat_member` are how the bot learns
 * which channel it was added to; `poll`/`poll_answer` keep the polls honest.
 */
export const ALLOWED_UPDATES = ["message", "callback_query", "my_chat_member", "channel_post", "poll", "poll_answer"] as const;

/** The one endpoint both the DM bot and a dedicated publisher bot talk to. */
export function webhookUrlFor(siteUrl: string | null | undefined): string | null {
  const base = (siteUrl ?? "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[^\s/]+/i.test(base)) return null;
  return `${base}/api/telegram/webhook`;
}

export type WebhookState = "ok" | "missing" | "wrong_url" | "error" | "unknown";

export interface WebhookFacts {
  /** `url` from getWebhookInfo (`""` when no webhook is set). */
  registeredUrl: string;
  /** What this deployment expects, from its own site URL. */
  expectedUrl: string | null;
  /** `pending_update_count` — updates Telegram has queued and not delivered. */
  pending: number;
  /** `last_error_message` from getWebhookInfo, if any. */
  lastError: string | null;
  /** The getWebhookInfo call itself failed. */
  unreachable?: boolean;
}

export interface WebhookVerdict {
  state: WebhookState;
  /** True when re-registering the webhook is the fix. */
  reconnect: boolean;
}

const sameUrl = (a: string, b: string) => a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();

/**
 * Read the state of a webhook.
 *
 * `error` (Telegram reports a non-empty `last_error_message`) wins over
 * `wrong_url`: a registered-but-failing webhook is the more dangerous case,
 * because a pending queue keeps growing while the button looks alive.
 * `unknown` is never treated as "broken" — it is a Telegram (or network)
 * problem, and re-registering on a guess could fight a working setup.
 */
export function webhookVerdict(facts: WebhookFacts): WebhookVerdict {
  if (facts.unreachable) return { state: "unknown", reconnect: false };
  const registered = (facts.registeredUrl ?? "").trim();
  if (!registered) return { state: "missing", reconnect: true };
  if (facts.expectedUrl && !sameUrl(registered, facts.expectedUrl)) return { state: "wrong_url", reconnect: true };
  if ((facts.lastError ?? "").trim()) return { state: "error", reconnect: true };
  return { state: "ok", reconnect: false };
}

/** One sentence for the panel — a translated key, never a raw Telegram string. */
export type WebhookAdvice = "none" | "connect" | "move" | "retry" | "checkTeam";

export function webhookAdvice(verdict: WebhookVerdict, pending = 0): WebhookAdvice {
  switch (verdict.state) {
    case "ok":
      // A permanently busy queue behind a healthy webhook is not a webhook
      // fault — it usually means the endpoint answers slowly.
      return pending > 100 ? "retry" : "none";
    case "missing":
      return "connect";
    case "wrong_url":
      return "move";
    case "error":
      return "retry";
    default:
      return "checkTeam";
  }
}
