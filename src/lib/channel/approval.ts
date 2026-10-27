/**
 * Channel approval step — helpers for "read it before it goes public".
 *
 * Why this exists
 * ---------------
 * The publisher had two ends of one switch: `dryrun` (everything to the admin
 * chat, nothing ever reaches the channel) and `on` (straight to the channel).
 * An operator who wanted to *read each post first* had to keep the publisher
 * off and paste posts by hand. `mode = "approval"` is the missing middle: the
 * plan is built as usual, every post is sent to the admin chat with
 * [Approve] [Reject] [Edit] buttons, and the channel only receives what an
 * admin explicitly approved.
 *
 * This module is deliberately pure — no database, no network — so the rules
 * can be unit-tested without a connection, and so nothing here can accidentally
 * become a second place that publishes. The three halves live apart:
 *
 *   approval.ts       rules: statuses, callbacks, texts, expiry window  (pure)
 *   approvalStore.ts  the database reads/writes those rules need
 *   send.ts           publishing (approve / reject / edit)
 *   telegram/approval.ts  who may press a button
 *
 *   approval.ts ← approvalStore.ts ← send.ts ← telegram/approval.ts
 *
 * Nothing here is posted anywhere: only a verified admin — a Telegram user
 * linked to a profile with `is_admin` — can move a post forward.
 */
/* -------------------------------------------------------------------------- */
/* Status vocabulary                                                          */
/* -------------------------------------------------------------------------- */

/**
 * `channel_posts.status` values this feature adds. The existing pipeline keeps
 * `pending → sending → sent | failed | skipped`; an approval post detours
 * through `awaiting_approval`, and can end at `rejected` or `expired` instead
 * of `sent`. No new columns and no new tables: the row already carries the
 * rendered HTML, the target chat and the message id we need to answer with.
 */
export const APPROVAL_STATUS = {
  awaiting: "awaiting_approval",
  editing: "editing",
  rejected: "rejected",
  expired: "expired",
} as const;

/** Rows that are still waiting for a human. */
export const OPEN_APPROVAL_STATUSES = [APPROVAL_STATUS.awaiting, APPROVAL_STATUS.editing] as const;

/**
 * How the parts of a multi-part post are joined in `channel_posts.html`.
 *
 * The approximate operator must see exactly what the channel will receive, so
 * the approved body is stored byte-for-byte and split again on approval. The
 * separator is this project's own line, not Telegram markup.
 */
export const PARTS_SEPARATOR = "\n\n———\n\n";

/** Split a stored approval body back into the messages it was rendered as. */
export function splitApprovalParts(html: string | null | undefined): string[] {
  if (!html) return [];
  return html
    .split(PARTS_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * How long a post may wait for a human before it is retired (hours).
 *
 * A scholarship post is only useful on the day it is planned: approving
 * yesterday's deadline reminder the next morning would publish stale news. Six
 * hours covers a working day; `CHANNEL_APPROVAL_TTL_HOURS` tunes it (1–48).
 */
export function approvalTtlHours(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.CHANNEL_APPROVAL_TTL_HOURS ?? 6);
  if (!Number.isFinite(raw)) return 6;
  return Math.min(48, Math.max(1, Math.round(raw)));
}

/* -------------------------------------------------------------------------- */
/* Operator texts (Uzbek — the channel's language)                            */
/* -------------------------------------------------------------------------- */

/**
 * Every word the operator sees in Telegram, in one reviewable block. No AI, no
 * invented claims: these are instructions, not marketing copy.
 */
export const APPROVAL_TEXTS = {
  header: "🔔 <b>Tasdiqlash kerak</b>",
  headerHint: "Pastdagi matn kanalga chiqadi. Tasdiqlasangiz darhol yuboriladi.",
  partsHint: (n: number) => `Bu post ${n} qismda yuboriladi.`,
  pollNote: "Bu so'rovnoma (poll). Tasdiqlangandan keyin kanalda so'rovnoma sifatida chiqadi.",
  edited: "✏️ <b>Tahrirlandi</b> — yangi matnni tasdiqlang yoki yana tahrirlang.",
  editPrompt:
    "✏️ <b>Tahrirlash</b>\nYubormoqchi bo'lgan to'liq matnni bitta xabar qilib yuboring (Telegram HTML teglari bilan bo'lishi mumkin).\n\nBekor qilish uchun /bekor yozing.",
  editTooLong: (max: number) => `Matn juda uzun — ${max} belgidan oshmasin.`,
  editEmpty: "Matn bo'sh. Qaytadan yuboring yoki /bekor yozing.",
  editCancelled: "Tahrirlash bekor qilindi.",
  editSaved: "✅ Matn yangilandi — tasdiqlang yoki yana tahrirlang.",
  approved: "✅ Kanalga yuborildi",
  approvedDry: "✅ Tasdiqlandi, lekin kanal sozlanmagan — hech narsa yuborilmadi",
  rejected: "❌ Rad etildi",
  rejectedAlready: "Bu post allaqachon yopilgan",
  editing: "✏️ Matnni yuboring",
  alreadySent: "Bu post allaqachon yuborilgan",
  expired: "⌛ Vaqti o'tdi — bu post endi yuborilmaydi",
  notAdmin: "⛔ Faqat admin tasdiqlay oladi",
  unknownPost: "Post topilmadi",
  sendFailed: "Yuborilmadi — sabab jurnalda",
  privateOnly: "Bu tugmalar faqat shaxsiy chatda ishlaydi",
  killSwitch: "⛔ CHANNEL_AUTOPOST o'chirilgan — tasdiq ham yubormaydi",
  buttons: {
    approve: "✅ Tasdiqlash",
    reject: "❌ Rad etish",
    edit: "✏️ Tahrirlash",
  },
} as const;

/** One-line label for a post kind, used in the approval header. */
const KIND_LABELS: Record<string, string> = {
  scholarship_rich: "Grant (batafsil)",
  scholarship_single: "Grant",
  fully_funded: "To'liq moliyalashtirilgan grant",
  deadline_digest: "Muddat eslatmasi",
  country_spotlight: "Davlat tanishtiruvi",
  tip: "Maslahat",
  checklist: "Ro'yxat",
  qa: "Savol-javob",
  story: "Tajriba",
  poll: "So'rovnoma",
  weekly: "Haftalik",
};

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

/* -------------------------------------------------------------------------- */
/* Callback format                                                            */
/* -------------------------------------------------------------------------- */

export type ApprovalAction = "approve" | "reject" | "edit";

export interface ApprovalCallback {
  action: ApprovalAction;
  postId: number;
}

/** `ch:ok:12` / `ch:no:12` / `ch:ed:12` — short enough for Telegram's 64 bytes. */
const CALLBACK_RE = /^ch:(ok|no|ed):([1-9]\d{0,8})$/;
const ACTION_TO_CODE: Record<ApprovalAction, string> = { approve: "ok", reject: "no", edit: "ed" };
const CODE_TO_ACTION: Record<string, ApprovalAction> = { ok: "approve", no: "reject", ed: "edit" };

export function approvalCallbackData(action: ApprovalAction, postId: number): string {
  return `ch:${ACTION_TO_CODE[action]}:${postId}`;
}

export function isApprovalCallback(data: string | null | undefined): boolean {
  return typeof data === "string" && CALLBACK_RE.test(data);
}

/** Strict parse: anything unexpected (extra text, a negative id) is `null`. */
export function parseApprovalCallback(data: string | null | undefined): ApprovalCallback | null {
  const match = CALLBACK_RE.exec(typeof data === "string" ? data : "");
  if (!match) return null;
  const action = CODE_TO_ACTION[match[1]];
  if (!action) return null;
  return { action, postId: Number(match[2]) };
}

/** The three buttons, in the order an operator reads them. */
export function approvalKeyboard(postId: number): { text: string; callback_data: string }[][] {
  return [
    [
      { text: APPROVAL_TEXTS.buttons.approve, callback_data: approvalCallbackData("approve", postId) },
      { text: APPROVAL_TEXTS.buttons.reject, callback_data: approvalCallbackData("reject", postId) },
    ],
    [{ text: APPROVAL_TEXTS.buttons.edit, callback_data: approvalCallbackData("edit", postId) }],
  ];
}

/**
 * The header that precedes a preview. Kept separate from the post body so the
 * body stays byte-identical to what the channel will receive.
 */
export function approvalHeader(input: {
  kind: string;
  slot: number | null;
  partCount: number;
  ttlHours: number;
}): string {
  const lines = [
    APPROVAL_TEXTS.header,
    `<b>${kindLabel(input.kind)}</b>${input.slot != null ? ` · slot ${input.slot}` : ""}`,
    APPROVAL_TEXTS.headerHint,
  ];
  if (input.kind === "poll") lines.push(APPROVAL_TEXTS.pollNote);
  else if (input.partCount > 1) lines.push(APPROVAL_TEXTS.partsHint(input.partCount));
  lines.push(`⌛ ${input.ttlHours} soat ichida javob berilmasa bekor bo'ladi.`);
  return lines.join("\n");
}

