import { runSchollyPushReminders } from "@/lib/scholly-push-reminders.server";
import { runSchollyTelegramReminders } from "@/lib/scholly-telegram-reminders.server";

export async function runSchollyReminderSweep() {
  const { pausedUsers, ...push } = await runSchollyPushReminders();
  const telegram = await runSchollyTelegramReminders(undefined, pausedUsers);
  return {
    candidates: push.candidates + telegram.candidates,
    sent: push.sent + telegram.sent,
    failed: push.failed + telegram.failed,
    push, telegram,
  };
}
