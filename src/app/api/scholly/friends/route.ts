import { authenticate } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { changeSchollyFriend, getSchollyFriendState } from "@/lib/scholly-friends.server";

export async function GET(req: Request) {
  const access = await authenticate(req);
  if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
  return privateNoStoreJson(await getSchollyFriendState(access.session.profile.id));
}

export async function POST(req: Request) {
  const access = await authenticate(req);
  if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
  const id = access.session.profile.id;
  const limit = checkRateLimit(`scholly:friend:${id}`, LIMITS.userWrite);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);
  const body = await readJsonBody<Record<string, unknown>>(req, 512);
  if (!body.ok) return privateNoStoreJson({ code: body.code }, { status: body.status });
  const { action, code } = body.body;
  if (action !== "invite" && action !== "accept" && action !== "leave") {
    return privateNoStoreJson({ code: "invalid_action" }, { status: 400 });
  }
  const result = await changeSchollyFriend(id, action, typeof code === "string" ? code : undefined);
  return result ? privateNoStoreJson(result) : privateNoStoreJson({ code: "invite_unavailable" }, { status: 409 });
}
