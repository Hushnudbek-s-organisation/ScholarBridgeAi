/**
 * Outbound email — a small SMTP client with no third-party dependency.
 *
 * Why hand-written: the rest of the server stack is dependency-light on purpose
 * (`scrypt` for passwords, `crypto` for sessions), and the only email the
 * product actually needs is one plain-text message: the password-reset link.
 * Pulling in a mail library for that would add a transitive tree to every
 * deploy for ~150 lines of protocol.
 *
 * Configuration is entirely by environment — no host, brand or credential is
 * in the source:
 *
 *   SMTP_HOST      required to send at all
 *   SMTP_PORT      default 587 (submission)
 *   SMTP_SECURE    "1"/"true" → implicit TLS; port 465 implies it; otherwise STARTTLS
 *   SMTP_USER      optional; when set, AUTH LOGIN is used
 *   SMTP_PASS      optional, required with SMTP_USER
 *   MAIL_FROM      required, e.g. "no-reply@your-domain" or "Name <addr>"
 *
 * Behaviour when it is not configured: `sendMail` returns
 * `{ ok: false, reason: "not_configured" }` and the caller decides what to tell
 * the user. Nothing throws, so an unconfigured deployment never breaks a page.
 *
 * The client is deliberately conservative: 10 s per command, 5 min total, a
 * 32 KB cap on any server reply, and STARTTLS is required whenever the server
 * advertises it (a server that cannot upgrade is refused rather than being
 * trusted with a credential over cleartext).
 */
import { createConnection, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
}

export type MailFailureReason =
  | "not_configured"
  | "connect_failed"
  | "timeout"
  | "smtp_error"
  | "tls_required"
  | "bad_recipient";

export type MailResult =
  | { ok: true }
  | { ok: false; reason: MailFailureReason; detail?: string };

/** Read the transport configuration from the environment. */
export function mailConfigFromEnv(env: Record<string, string | undefined> = process.env): MailConfig | null {
  const host = (env.SMTP_HOST ?? "").trim();
  const from = (env.MAIL_FROM ?? "").trim();
  if (!host || !from) return null;
  const port = Number((env.SMTP_PORT ?? "587").trim()) || 587;
  // 465 is the implicit-TLS submission port: TLS starts before the greeting, and
  // a plaintext client there just hangs. Treat the port as authoritative so a
  // deployment that sets SMTP_PORT=465 alone still works.
  const secure = port === 465 || ["1", "true", "yes"].includes((env.SMTP_SECURE ?? "").trim().toLowerCase());
  const user = (env.SMTP_USER ?? "").trim() || null;
  const pass = (env.SMTP_PASS ?? "").trim() || null;
  return { host, port, secure, user, pass, from };
}

export function mailConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return mailConfigFromEnv(env) !== null;
}

/** Where the deployment should be read from — used by admin diagnostics. */
export const MAIL_ENV_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"] as const;

/** Which required variable is missing (for the admin panel, never for users). */
export function missingMailEnv(env: Record<string, string | undefined> = process.env): string[] {
  const missing: string[] = [];
  if (!(env.SMTP_HOST ?? "").trim()) missing.push("SMTP_HOST");
  if (!(env.MAIL_FROM ?? "").trim()) missing.push("MAIL_FROM");
  const user = (env.SMTP_USER ?? "").trim();
  const pass = (env.SMTP_PASS ?? "").trim();
  if (user && !pass) missing.push("SMTP_PASS");
  if (pass && !user) missing.push("SMTP_USER");
  return missing;
}

/** RFC 5322 header injection guard — never let a newline into a header. */
function headerSafe(value: string): string {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  // Plain ASCII headers stay readable; anything else is MIME-encoded.
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Extract the bare address from `"Name <addr>"` or `addr`. */
export function bareAddress(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return (match ? match[1] : value).trim();
}

const COMMAND_TIMEOUT_MS = 10_000;
const MAX_REPLY_BYTES = 32 * 1024;

/** One SMTP conversation over an arbitrary socket. */
class SmtpSession {
  private buffer = "";
  private waiters: { resolve: (reply: string) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }[] = [];

  constructor(private readonly socket: Socket | TLSSocket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      if (this.buffer.length > MAX_REPLY_BYTES) {
        this.fail(new Error("SMTP reply exceeded the size limit"));
        return;
      }
      this.drain();
    });
    socket.on("error", (error: Error) => this.fail(error));
    socket.on("close", () => this.fail(new Error("SMTP connection closed")));
  }

  private fail(error: Error): void {
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  /**
   * A multi-line reply ends on `250 text` (a space after the code); `250-text`
   * continues. Waiting for a complete reply — not just any line — is what stops
   * the classic off-by-one where the client answers a continuation line.
   */
  private drain(): void {
    if (!this.waiters.length) return;
    const complete = /(?:^|\r?\n)(\d{3}) [^\r\n]*(?:\r?\n|$)$/.exec(this.buffer);
    if (!complete) return;
    const reply = this.buffer;
    this.buffer = "";
    const waiter = this.waiters.shift();
    if (!waiter) return;
    clearTimeout(waiter.timer);
    waiter.resolve(reply);
  }

  /** Read the next complete reply. */
  read(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.timer !== timer);
        reject(new Error("SMTP timeout"));
      }, COMMAND_TIMEOUT_MS);
      this.waiters.push({ resolve, reject, timer });
      this.drain();
    });
  }

  write(line: string): void {
    this.socket.write(line + "\r\n");
  }

  /** Send a command and require an expected reply code. */
  async command(line: string, expect: string[], label: string): Promise<string> {
    if (line) this.write(line);
    const reply = await this.read();
    const code = reply.slice(0, 3);
    if (!expect.includes(code)) {
      throw new Error(`${label}: expected ${expect.join("/")}, got ${headerSafe(reply.slice(0, 120))}`);
    }
    return reply;
  }

  async startTls(host: string): Promise<Socket | TLSSocket> {
    return new Promise((resolve, reject) => {
      const secured = tlsConnect({ socket: this.socket as Socket, servername: host }, () => resolve(secured));
      secured.on("error", reject);
    });
  }

  close(): void {
    try {
      this.socket.end();
    } catch {
      // already closed
    }
  }
}

function waitForConnect(socket: Socket, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SMTP connect timeout")), ms);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Send one plain-text message. Never throws: every failure is a return value,
 * because a password-reset request must not 500 when the mail server is down —
 * it must answer the same generic sentence it answers for an unknown address.
 */
export async function sendMail(
  message: { to: string; subject: string; text: string },
  config: MailConfig | null = mailConfigFromEnv()
): Promise<MailResult> {
  if (!config) return { ok: false, reason: "not_configured" };
  const to = bareAddress(message.to);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, reason: "bad_recipient" };

  let socket: Socket | TLSSocket | null = null;
  let session: SmtpSession | null = null;
  try {
    socket = config.secure
      ? tlsConnect({ host: config.host, port: config.port, servername: config.host })
      : createConnection({ host: config.host, port: config.port });
    if (config.secure) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("SMTP connect timeout")), COMMAND_TIMEOUT_MS);
        (socket as TLSSocket).once("secureConnect", () => {
          clearTimeout(timer);
          resolve();
        });
        (socket as TLSSocket).once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    } else {
      await waitForConnect(socket as Socket, COMMAND_TIMEOUT_MS);
    }

    session = new SmtpSession(socket);
    await session.command("", ["220"], "greeting");
    const features = await session.command(`EHLO ${config.host}`, ["250"], "EHLO");

    if (!config.secure) {
      if (/\bSTARTTLS\b/i.test(features)) {
        await session.command("STARTTLS", ["220"], "STARTTLS");
        const secured = await session.startTls(config.host);
        session = new SmtpSession(secured);
        socket = secured;
        await session.command(`EHLO ${config.host}`, ["250"], "EHLO (TLS)");
      } else if (config.user) {
        // A credential must never cross a cleartext link.
        return { ok: false, reason: "tls_required", detail: "server does not offer STARTTLS" };
      }
    }

    if (config.user && config.pass) {
      await session.command("AUTH LOGIN", ["334"], "AUTH LOGIN");
      await session.command(Buffer.from(config.user, "utf8").toString("base64"), ["334"], "AUTH user");
      await session.command(Buffer.from(config.pass, "utf8").toString("base64"), ["235"], "AUTH pass");
    }

    await session.command(`MAIL FROM:<${bareAddress(config.from)}>`, ["250"], "MAIL FROM");
    await session.command(`RCPT TO:<${to}>`, ["250", "251"], "RCPT TO");
    await session.command("DATA", ["354"], "DATA");

    const headers = [
      `From: ${headerSafe(config.from)}`,
      `To: ${headerSafe(to)}`,
      `Subject: ${encodeHeader(headerSafe(message.subject))}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      `Date: ${new Date().toUTCString()}`,
      "Auto-Submitted: auto-generated",
    ];
    // Dot-stuffing: a line starting with "." would end the message early.
    const body = message.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
    session.write(headers.join("\r\n") + "\r\n\r\n" + body + "\r\n.");
    await session.command("", ["250"], "message body");
    await session.command("QUIT", ["221"], "QUIT").catch(() => "");
    return { ok: true };
  } catch (error) {
    const message_ = error instanceof Error ? error.message : String(error);
    const reason: MailFailureReason = /timeout/i.test(message_)
      ? "timeout"
      : /connect|ECONN|ENOTFOUND|EHOSTUNREACH|closed/i.test(message_)
        ? "connect_failed"
        : "smtp_error";
    return { ok: false, reason, detail: message_.slice(0, 200) };
  } finally {
    session?.close();
  }
}
