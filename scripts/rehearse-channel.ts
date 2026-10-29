/**
 * Channel publishing rehearsal — the whole send path, against a real Postgres
 * and a fake Telegram, with no network and no risk to the live channel.
 *
 *   node scripts/dev-db.mjs --start          (once)
 *   DATABASE_URL=postgresql://… npm run channel:rehearse
 *
 * `check-channel.ts` proves the *text*; this proves the *pipeline*: the same
 * `runDuePosts` the cron calls is run against rows in a real database, with
 * `TELEGRAM_API_BASE` pointed at `scripts/telegram-mock.mjs`. What it asserts:
 *
 *   1. mode `on`      — one due row produces exactly one sendMessage to the
 *                       channel chat, the post row ends `sent`, the plan row
 *                       ends `sent`;
 *   2. a second tick  — nothing is re-sent (the dedupe key holds);
 *   3. mode `approval`— the message goes to the admin chat with three buttons
 *                       and **nothing** reaches the channel; the post row is
 *                       `awaiting_approval`;
 *   4. approve        — the stored text is published to the channel and the row
 *                       ends `sent`;
 *   5. lint           — every message the mock received is clean.
 *
 * It refuses to run against a non-local database: this script writes rows.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { channelPlan, channelPosts, channelSettings, scholarships } from "@/db/schema";
import { ensureChannelTables } from "@/lib/channel/db";
import { seedChannelCountries } from "@/lib/channel/repo";
import { mergeChannelSettings, settingsRows } from "@/lib/channel/settings";
import { retireStalePlans } from "@/lib/channel/store";
import { approveApproval, duePlanRows, runDuePosts } from "@/lib/channel/send";
import { lintText } from "@/lib/channel/lint";
import { tashkentDay } from "@/lib/channel/config";
import { ensurePublisherWebhook, publisherWebhook, resetWebhookMemo } from "@/lib/channel/webhookStore";
import { handlePublisherUpdate } from "@/lib/telegram/publisher";

const SITE = "https://rehearsal.invalid";
const CHANNEL_ID = "-1009999999999";
const ADMIN_CHAT_ID = "424242";
const MARKER = "Rehearsal Award (local, not real)";

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name} — ${error instanceof Error ? error.message : String(error)}`);
    console.log(`  ✗ ${name}`);
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** A free loopback port for the mock. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForMock(base: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      // The mock, like Telegram, answers under /bot<token>/<method>.
      const res = await fetch(`${base}/bot${process.env.TELEGRAM_CHANNEL_BOT_TOKEN}/getMe`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("the Telegram mock did not start");
}

interface MockMessage {
  chat_id: string | number;
  text: string;
  reply_markup?: { inline_keyboard?: Array<Array<{ callback_data?: string }>> };
}

async function messagesTo(base: string, chatId: string): Promise<MockMessage[]> {
  const res = await fetch(`${base}/_messages?chat_id=${encodeURIComponent(chatId)}`);
  const body = (await res.json()) as { messages?: MockMessage[] };
  return body.messages ?? [];
}

/** "HH:MM" now, in Tashkent — the sender compares against the same clock. */
function nowHhmm(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!/127\.0\.0\.1|localhost/.test(databaseUrl)) {
    throw new Error("This rehearsal writes rows; point DATABASE_URL at the local dev database.");
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const mock: ChildProcess = spawn(process.execPath, ["scripts/telegram-mock.mjs"], {
    env: { ...process.env, TG_MOCK_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // The real client reads these; nothing here talks to api.telegram.org.
  process.env.TELEGRAM_API_BASE = base;
  // Telegram's shape: <5-12 digits>:<30-50 chars of [A-Za-z0-9_-]. Any other
  // shape is ignored by `pickChannelToken` and the publisher would look unconfigured.
  process.env.TELEGRAM_CHANNEL_BOT_TOKEN = "424242:rehearsal_token_ABCDEFGHIJKLMNOPQRSTUVWX";
  process.env.NEXT_PUBLIC_APP_URL = SITE;

  const cleanup: Array<() => Promise<void>> = [];
  try {
    await waitForMock(base);
    await ensureChannelTables();
    await seedChannelCountries();

    // --- fixtures ---------------------------------------------------------
    const [award] = await db
      .insert(scholarships)
      .values({
        title: MARKER,
        description: "A rehearsal row created by scripts/rehearse-channel.ts and deleted again.",
        provider: "Rehearsal Provider",
        country: "Germany",
        coverageType: "Full Tuition",
        degreeLevels: '["Master\'s"]',
        deadlineDate: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
        deadlineType: "fixed",
        requirements: "Bachelor's degree, motivation letter, English proficiency.",
        englishRequirements: "IELTS 6.5 or equivalent English test",
        tuitionCoverage: "Full tuition",
        websiteUrl: "https://example.com/award",
        applicationUrl: "https://example.com/apply",
        isActive: true,
        verificationStatus: "verified",
        lastVerifiedAt: new Date(),
        eligibleCountries: "[]",
      })
      .returning({ id: scholarships.id });
    cleanup.push(async () => {
      await db.delete(scholarships).where(eq(scholarships.id, award.id));
    });

    /**
     * `mergeChannelSettings` reads `siteUrl` at the top level and the writer
     * (`settingsRows`) nests it under `brand` — so the rehearsal builds the
     * object the panel would build, then persists it through the same writer.
     */
    const baseSettings = {
      siteUrl: SITE,
      brand: "Kanal",
      channelUsername: "rehearsal_channel",
      botUsername: "rehearsal_bot",
      connection: { channelId: CHANNEL_ID, adminChatId: ADMIN_CHAT_ID, mode: "on" as const, pausedUntil: null },
    };
    const settings = mergeChannelSettings(baseSettings);
    const persistSettings = async (next: typeof settings) => {
      for (const [key, value] of Object.entries(settingsRows(next))) {
        const json = JSON.stringify(value);
        await db
          .insert(channelSettings)
          .values({ key, value: json, updatedAt: new Date() })
          .onConflictDoUpdate({ target: channelSettings.key, set: { value: json, updatedAt: new Date() } });
      }
    };
    // Snapshot the raw rows, so the rehearsal leaves the table exactly as it
    // found it (a dev database may have none at all).
    const previousSettings = await db.select().from(channelSettings);
    await persistSettings(settings);
    cleanup.push(async () => {
      await db.delete(channelSettings);
      if (previousSettings.length) await db.insert(channelSettings).values(previousSettings);
    });

    const planRow = async (slot: number, kind: "scholarship_single" | "fully_funded") => {
      const [row] = await db
        .insert(channelPlan)
        .values({
          planDate: tashkentDay(new Date()),
          slot,
          sendAt: nowHhmm(),
          kind,
          lane: "editorial",
          origin: "rehearsal",
          scholarshipId: award.id,
          templateKey: kind === "scholarship_single" ? "single_v1" : "ff_v1",
          payload: "{}",
          dedupeKey: `rehearsal|${kind}|${award.id}|${slot}|${Date.now()}`,
          status: "planned",
          reason: "rehearsal",
        })
        .returning();
      cleanup.push(async () => {
        await db.delete(channelPlan).where(eq(channelPlan.id, row.id));
      });
      return row;
    };
    // Every post this run creates, so the rehearsal leaves the table as it was.
    cleanup.push(async () => {
      await db.delete(channelPosts).where(eq(channelPosts.scholarshipId, award.id));
    });

    // --- 1. mode `on`: one due row → one channel message -------------------
    console.log("\nmode on");
    await planRow(1, "scholarship_single");
    const due = await duePlanRows(new Date());
    await check("the due row is picked up", () => assert(due.length === 1, `${due.length} rows due`));

    const first = await runDuePosts(new Date());
    await check("the tick reports one sent post", () => {
      assert(first.length === 1, `${first.length} outcomes`);
      assert(first[0].status === "sent", `status ${first[0].status}: ${first[0].reason ?? ""}`);
      assert(first[0].chatId === CHANNEL_ID, `chat ${first[0].chatId}`);
    });

    const channelMessages = await messagesTo(base, CHANNEL_ID);
    await check("exactly one message reached the channel", () => assert(channelMessages.length === 1, `${channelMessages.length} messages`));
    await check("the message is the rendered Uzbek card", () => {
      const text = channelMessages[0]?.text ?? "";
      assert(text.includes(MARKER), "the title is missing");
      assert(text.includes("#grant"), "the hashtags are missing");
      assert(!/the|and|requirements/i.test(text.replace(/#[a-z0-9_]+/gi, "")), "English leaked into the post");
    });
    await check("the delivered message lints clean", () => {
      const issues = lintText(channelMessages[0]?.text ?? "", { allowUrgency: false });
      assert(issues.length === 0, JSON.stringify(issues));
    });
    await check("the post and plan rows both end `sent`", async () => {
      const [post] = await db.select().from(channelPosts).where(eq(channelPosts.scholarshipId, award.id));
      assert(post?.status === "sent", `post status ${post?.status}`);
      assert(typeof post.messageId === "number", "the telegram message id was not stored");
      const [plan] = await db.select().from(channelPlan).where(eq(channelPlan.scholarshipId, award.id));
      assert(plan?.status === "sent", `plan status ${plan?.status}`);
    });

    // --- 2. a second tick must not repeat itself --------------------------
    console.log("\na second tick");
    const again = await runDuePosts(new Date());
    const after = await messagesTo(base, CHANNEL_ID);
    await check("nothing is sent twice", () => {
      assert(after.length === 1, `${after.length} channel messages`);
      assert(again.every((outcome) => outcome.status !== "sent"), "a post was sent twice");
    });

    // --- 2b. a missed window still publishes later the same day -----------
    /**
     * The history this script exists to explain: a row was planned for 19:15,
     * the process was not running at 19:15, and the post was simply never sent.
     * `duePlanRows` asks "send_at <= now", not "now == send_at", so any tick
     * after the window still publishes it — as long as it is the same day.
     */
    console.log("\na missed window");
    const [late] = await db
      .insert(channelPlan)
      .values({
        planDate: tashkentDay(new Date()),
        slot: 9,
        sendAt: "00:01",
        kind: "scholarship_single",
        lane: "editorial",
        origin: "rehearsal",
        scholarshipId: award.id,
        templateKey: "single_v1",
        payload: "{}",
        dedupeKey: `rehearsal|late|${award.id}|9|${Date.now()}`,
        status: "planned",
        reason: "rehearsal: window missed by hours",
      })
      .returning();
    cleanup.push(async () => {
      await db.delete(channelPlan).where(eq(channelPlan.id, late.id));
    });
    const lateRun = await runDuePosts(new Date());
    await check("a row whose time passed is still published", async () => {
      assert(lateRun.length === 1, `${lateRun.length} outcomes`);
      assert(lateRun[0].status === "sent", `status ${lateRun[0].status}: ${lateRun[0].reason ?? ""}`);
      assert((await messagesTo(base, CHANNEL_ID)).length === 2, "the channel did not receive it");
    });

    // --- 2c. …but a day that was missed is retired, not posted late -------
    console.log("\na missed day");
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const [stale] = await db
      .insert(channelPlan)
      .values({
        planDate: yesterday,
        slot: 1,
        sendAt: "09:00",
        kind: "scholarship_single",
        lane: "editorial",
        origin: "rehearsal",
        scholarshipId: award.id,
        templateKey: "single_v1",
        payload: "{}",
        dedupeKey: `rehearsal|stale|${award.id}|1|${Date.now()}`,
        status: "planned",
        reason: "rehearsal: yesterday",
      })
      .returning();
    cleanup.push(async () => {
      await db.delete(channelPlan).where(eq(channelPlan.id, stale.id));
    });
    await check("yesterday's row is retired instead of published", async () => {
      const retired = await retireStalePlans(tashkentDay(new Date()));
      assert(retired >= 1, "nothing was retired");
      const [row] = await db.select().from(channelPlan).where(eq(channelPlan.id, stale.id));
      assert(row.status === "skipped", `status ${row.status}`);
      assert(row.skipReason === "date_passed", `skip reason ${row.skipReason}`);
      assert((await messagesTo(base, CHANNEL_ID)).length === 2, "an old row reached the channel");
    });

    // --- 3. mode `approval`: preview to the admin, silence in the channel --
    console.log("\nmode approval");
    await persistSettings(mergeChannelSettings({ ...baseSettings, connection: { ...baseSettings.connection, mode: "approval" } }));
    await planRow(2, "fully_funded");
    const approval = await runDuePosts(new Date());
    const adminMessages = await messagesTo(base, ADMIN_CHAT_ID);
    const channelAfterApproval = await messagesTo(base, CHANNEL_ID);

    await check("the preview goes to the admin chat, not the channel", () => {
      assert(approval.length === 1, `${approval.length} outcomes`);
      assert(approval[0].status === "approval", `status ${approval[0].status}: ${approval[0].reason ?? ""}`);
      assert(channelAfterApproval.length === 2, "the channel received a post before anyone approved it");
      assert(adminMessages.length >= 2, `only ${adminMessages.length} admin messages (header + preview)`);
    });
    await check("the preview carries exactly three actions", () => {
      // The keyboard is laid out over two rows (approve/reject, then edit) —
      // the requirement is three *actions*, not three rows.
      const actions = adminMessages
        .flatMap((message) => message.reply_markup?.inline_keyboard ?? [])
        .flat()
        .map((button) => String(button.callback_data ?? ""))
        .filter(Boolean);
      assert(actions.length === 3, `${actions.length} buttons, expected 3`);
      assert(new Set(actions).size === 3, `duplicate actions: ${JSON.stringify(actions)}`);
      // The three actions are the canonical ones (`ch:ok|no|ed:<postId>`), all
      // for the same post — nothing else may ever appear next to a preview.
      const parsed = actions.map((data) => /^ch:(ok|no|ed):(\d+)$/.exec(data));
      assert(parsed.every(Boolean), `unexpected callback data: ${JSON.stringify(actions)}`);
      const ids = new Set(parsed.map((match) => match?.[2]));
      assert(ids.size === 1, `the actions point at ${ids.size} different posts`);
    });
    await check("the post waits in the panel", async () => {
      const rows = await db.select().from(channelPosts).where(eq(channelPosts.scholarshipId, award.id));
      const waiting = rows.find((row) => row.status === "awaiting_approval");
      assert(waiting, `statuses: ${rows.map((row) => row.status).join(", ")}`);
    });

    // --- 4. approve publishes the stored text ----------------------------
    const pending = (
      await db.select().from(channelPosts).where(inArray(channelPosts.status, ["awaiting_approval", "editing"]))
    ).find((row) => row.scholarshipId === award.id);
    await check("the approved post reaches the channel", async () => {
      assert(pending, "no post was waiting for approval");
      const outcome = await approveApproval(pending.id, null);
      assert(outcome.ok, `approve failed: ${outcome.reason ?? ""}`);
      const delivered = await messagesTo(base, CHANNEL_ID);
      assert(delivered.length === 3, `${delivered.length} channel messages, expected 3`);
      assert((delivered[1]?.text ?? "").includes(MARKER), "the approved text was not the stored post");
      const [row] = await db.select().from(channelPosts).where(eq(channelPosts.id, pending.id));
      assert(row.status === "sent", `status ${row.status}`);
    });
    // --- 5. the approval buttons' transport (Phase O) --------------------
    // A press only reaches the app if the *publisher* bot's webhook exists.
    // The mock starts with none, exactly like a deployment that lost it.
    await check("a deployment with no webhook is reported as 'missing'", async () => {
      resetWebhookMemo();
      const before = await publisherWebhook({ memo: false });
      assert(before.state === "missing", `state ${before.state}`);
      assert(before.reconnect === true, "a missing webhook must ask for a repair");
      assert((before.expectedUrl ?? "").endsWith("/api/telegram/webhook"), `expected ${before.expectedUrl}`);
    });

    await check("the tick repairs the missing webhook by itself", async () => {
      const fixed = await ensurePublisherWebhook();
      assert(fixed.repaired === true, `repaired=${fixed.repaired} reason=${fixed.reason}`);
      assert(fixed.status.state === "ok", `state ${fixed.status.state}`);
      const info = (await (await fetch(`${base}/bot${process.env.TELEGRAM_CHANNEL_BOT_TOKEN}/getWebhookInfo`)).json()) as {
        result?: { url?: string };
      };
      assert(info.result?.url === fixed.status.expectedUrl, `mock url ${info.result?.url}`);
    });

    await check("a healthy webhook is not re-registered on every tick", async () => {
      resetWebhookMemo();
      const again = await ensurePublisherWebhook();
      assert(again.repaired === false, "the tick re-registered a healthy webhook");
      assert(again.reason === "ok", `reason ${again.reason}`);
    });

    await check("a dedicated publisher bot's approval press is answered by that bot", async () => {
      // The webhook route hands a publisher-bot update here; the toast must come
      // back through the publisher's own token, never the DM bot's.
      const result = await handlePublisherUpdate(
        {
          callback_query: {
            id: "rehearsal-cb-1",
            data: "ch:ok:999999",
            from: { id: 7292856664, is_bot: false },
            message: { message_id: 1, chat: { id: 7292856664, type: "private" } },
          },
        },
        process.env.TELEGRAM_CHANNEL_BOT_TOKEN!
      );
      assert(result.handled === "approval", `handled=${result.handled}`);
      const answers = (await (await fetch(`${base}/_answers`)).json()) as { answers?: Array<{ id: string; text: string }> };
      const answer = (answers.answers ?? []).find((row) => row.id === "rehearsal-cb-1");
      assert(answer, "the button was never answered — it would spin forever");
      assert(answer.text.length > 0, "the toast was empty, so the operator learns nothing");
    });

    await check("every message the mock received lints clean", async () => {
      const seen = [...(await messagesTo(base, CHANNEL_ID)), ...(await messagesTo(base, ADMIN_CHAT_ID))];
      const dirty = seen
        .map((message) => ({ text: message.text, issues: lintText(message.text, { allowUrgency: false }) }))
        .filter((entry) => entry.issues.length > 0);
      assert(dirty.length === 0, `${dirty.length} message(s) with issues: ${dirty[0]?.issues.map((i) => i.code).join(", ")}`);
    });
  } finally {
    for (const undo of cleanup.reverse()) {
      try {
        await undo();
      } catch (error) {
        console.error("  ! cleanup failed:", error instanceof Error ? error.message : error);
      }
    }
    mock.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
  process.exit(0);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
