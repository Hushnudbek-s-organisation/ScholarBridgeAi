/**
 * Which bot token publishes to the channel.
 *
 * There used to be exactly one source — `getBotToken()` in
 * `src/lib/telegram/settings.ts` — which is right for the default deployment:
 * the same bot talks to students in DM and posts to the channel, so an
 * operator who has already connected the bot in **Admin → Telegram** must not
 * be asked for the token again in **Admin → Kanal**. That fallback is what
 * this module keeps.
 *
 * What it adds is one deliberate override: `TELEGRAM_CHANNEL_BOT_TOKEN`. A
 * deployment may want a *separate* bot for the channel (a "publisher" bot whose
 * DM inbox is irrelevant, so a student writing to it cannot confuse the
 * support flow). The override lives in the environment only — never in the
 * channel settings, never in the channel panel — because the project rule is
 * that a bot token is never entered, stored or shown in the channel UI.
 *
 * Order (every step trimmed, empty strings skipped):
 *   1. `TELEGRAM_CHANNEL_BOT_TOKEN` — the channel-only publisher bot;
 *   2. the main bot token from Admin → Telegram (encrypted in `app_config`);
 *   3. `TELEGRAM_BOT_TOKEN` from the environment.
 *
 * Steps 2 and 3 are inside `getBotToken()`, which is also what the webhook
 * uses — so the two can never disagree about which bot exists.
 */
import { looksLikeBotToken } from "@/lib/telegram/core";

/** Where the token came from. Shown in the connection report, never the token. */
export type ChannelTokenSource = "channel_env" | "admin" | "env" | "none";

export interface ChannelToken {
  token: string | null;
  /** `true` when the publisher uses a different bot than the DM bot. */
  dedicated: boolean;
  source: ChannelTokenSource;
}

type Env = Record<string, string | undefined>;

/**
 * The token the publisher should use, or null.
 *
 * `channel_env` is checked first and must *look* like a token
 * (`<digits>:<secret>`); a typo there falls through to the main bot instead of
 * silently disabling posting — the same forgiving rule the rest of the channel
 * configuration uses, and the panel reports which source won.
 */
export function pickChannelToken(input: {
  /** `TELEGRAM_CHANNEL_BOT_TOKEN`, if any (raw, may be blank or a typo). */
  channelEnv?: string | null;
  /** What Admin → Telegram resolved to. */
  main: { token: string | null; source: "admin" | "env" | "none" };
}): ChannelToken {
  const dedicated = (input.channelEnv ?? "").trim();
  if (dedicated && looksLikeBotToken(dedicated)) {
    return { token: dedicated, dedicated: true, source: "channel_env" };
  }
  if (input.main.token) return { token: input.main.token, dedicated: false, source: input.main.source };
  return { token: null, dedicated: false, source: "none" };
}

/**
 * The token the publisher uses right now.
 *
 * `@/lib/telegram/settings` is imported lazily so this module stays importable
 * by the offline checks (which have no DATABASE_URL) and by the pure helpers
 * above — the same reason `approval.ts` is split from `approvalStore.ts`.
 */
export async function getChannelBotToken(env: Env = process.env): Promise<ChannelToken> {
  const { getBotToken } = await import("@/lib/telegram/settings");
  return pickChannelToken({ channelEnv: env.TELEGRAM_CHANNEL_BOT_TOKEN, main: await getBotToken() });
}

/** One line for the admin panel: which bot publishes, without the secret. */
export function describeChannelTokenSource(source: ChannelTokenSource): string {
  switch (source) {
    case "channel_env":
      return "TELEGRAM_CHANNEL_BOT_TOKEN (kanal uchun alohida bot)";
    case "admin":
      return "Admin → Telegram (saqlangan token)";
    case "env":
      return "TELEGRAM_BOT_TOKEN (muhit o'zgaruvchisi)";
    default:
      return "Token topilmadi";
  }
}
