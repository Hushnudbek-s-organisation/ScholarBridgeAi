import { authenticate } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { checkRateLimit, LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { getSchollyRanking, setSchollyRanking } from "@/lib/scholly-ranking.server";

export async function GET(req: Request) {
  const access = await authenticate(req);
  if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
  return privateNoStoreJson(await getSchollyRanking(access.session.profile.id));
}

export async function PUT(req: Request) {
  const access = await authenticate(req);
  if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
  const id = access.session.profile.id;
  const rate = checkRateLimit(`scholly:ranking:${id}`, LIMITS.userWrite);
  if (!rate.ok) return rateLimitedResponse(rate.retryAfterSec);
  const body = await readJsonBody<Record<string, unknown>>(req, 512);
  if (!body.ok) return privateNoStoreJson({ code: body.code }, { status: body.status });
  if (typeof body.body.joined !== "boolean") return privateNoStoreJson({ code: "invalid_preference" }, { status: 400 });
  const ranking = await setSchollyRanking(id, body.body.joined);
  return ranking ? privateNoStoreJson(ranking) : privateNoStoreJson({ code: "region_unavailable" }, { status: 409 });
}
