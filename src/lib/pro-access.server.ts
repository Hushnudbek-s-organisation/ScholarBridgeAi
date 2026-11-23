import { requireSession } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { findActiveSubscription, subscriptionIsActive } from "@/lib/payments";

export async function hasProSubscription(profileId: number) {
  return subscriptionIsActive(await findActiveSubscription(profileId));
}

export async function requireProSession(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return { ok: false as const, response: privateNoStoreJson({ code: auth.code }, { status: auth.status }) };
  const id = auth.session.profile.id;
  if (!await hasProSubscription(id)) {
    return { ok: false as const, response: privateNoStoreJson({ code: "premium_required" }, { status: 403 }) };
  }
  return { ok: true as const, id };
}
