import { createECDH, createHash, ECDH } from "node:crypto";
import { generateRequestDetails, type PushSubscription, type RequestOptions } from "web-push";

type PushKeys = NonNullable<PushSubscription["keys"]>;
export type SchollyVapidConfig = NonNullable<RequestOptions["vapidDetails"]>;

function binaryKey(value: unknown, bytes: number) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = Buffer.from(value, "base64url");
  return decoded.length === bytes && decoded.toString("base64url") === value ? decoded : null;
}

export function isSchollyPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || url.href !== value) return false;
    switch (url.hostname) {
      case "fcm.googleapis.com":
        return /^\/(?:fcm\/send|wp)\/.+/.test(url.pathname);
      case "updates.push.services.mozilla.com":
        return /^\/w?push\/v[12]\/.+/.test(url.pathname);
      case "web.push.apple.com":
        return url.pathname.length > 1;
      default:
        return /^[a-z\d-]+\.notify\.windows\.com$/.test(url.hostname) && url.pathname.startsWith("/w/");
    }
  } catch {
    return false;
  }
}

export function parseSchollyPushSubscription(value: unknown): (PushSubscription & { keys: PushKeys }) | null {
  if (!value || typeof value !== "object") return null;
  const { endpoint, keys } = value as { endpoint?: unknown; keys?: { auth?: unknown; p256dh?: unknown } };
  if (!isSchollyPushEndpoint(endpoint) || !keys || typeof keys !== "object") return null;
  const publicKey = binaryKey(keys.p256dh, 65);
  const auth = binaryKey(keys.auth, 16);
  if (!publicKey || publicKey[0] !== 4 || !auth) return null;
  try {
    ECDH.convertKey(publicKey, "prime256v1");
  } catch {
    return null;
  }
  return { endpoint, keys: { auth: auth.toString("base64url"), p256dh: publicKey.toString("base64url") } };
}

export function hashSchollyPushEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function getSchollyVapidConfig(env: NodeJS.ProcessEnv = process.env): SchollyVapidConfig | null {
  const subject = env.SCHOLLY_VAPID_SUBJECT?.trim();
  const publicKey = binaryKey(env.SCHOLLY_VAPID_PUBLIC_KEY?.trim(), 65);
  const privateKey = binaryKey(env.SCHOLLY_VAPID_PRIVATE_KEY?.trim(), 32);
  if (!subject || subject.length > 500 || !publicKey || !privateKey) return null;
  try {
    const contact = new URL(subject);
    if (!["mailto:", "https:"].includes(contact.protocol) || contact.username || contact.password) return null;
    if (contact.protocol === "mailto:" && !/^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(contact.pathname)) return null;
    const key = createECDH("prime256v1");
    key.setPrivateKey(privateKey);
    if (!publicKey.equals(key.getPublicKey())) return null;
    return { subject, publicKey: publicKey.toString("base64url"), privateKey: privateKey.toString("base64url") };
  } catch {
    return null;
  }
}

export type SchollyPushBody = { title: string; body: string; settingsLabel: string; deliveryId: string };

export async function sendSchollyWebPush(
  subscription: PushSubscription,
  payload: SchollyPushBody,
  config: SchollyVapidConfig,
  ttl: number,
  request: typeof fetch = fetch,
) {
  const safe = parseSchollyPushSubscription(subscription);
  if (!safe) return { sent: false, expired: true };
  // The library handles VAPID and RFC 8291 encryption. Reject redirects so a
  // browser-provided capability URL cannot redirect the sender elsewhere.
  const details = generateRequestDetails(safe, JSON.stringify(payload), {
    vapidDetails: config, TTL: ttl, urgency: "normal", contentEncoding: "aes128gcm",
  });
  if (details.endpoint !== safe.endpoint) return { sent: false, expired: false };
  const headers = Object.fromEntries(Object.entries(details.headers).map(([name, value]) => [name, String(value)]));
  const response = await request(safe.endpoint, {
    method: "POST", headers, body: details.body ? Uint8Array.from(details.body) : undefined,
    redirect: "error", signal: AbortSignal.timeout(8_000),
  });
  void response.body?.cancel().catch(() => {});
  return { sent: response.ok, expired: response.status === 404 || response.status === 410 };
}
