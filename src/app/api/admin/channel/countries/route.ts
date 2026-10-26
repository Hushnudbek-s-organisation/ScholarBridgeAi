import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { countryList, removeCountry, saveCountry } from "@/lib/channel/admin";

export const dynamic = "force-dynamic";

/** Admin → Kanal → Davlatlar: the table that turns a stored country into a flag,
 *  an Uzbek name, a locative form and a hashtag. */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ ok: true, rows: await countryList() });
  } catch (error) {
    return serverError("channel countries", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  try {
    const result = await saveCountry(body.value, guard.value.profile.id);
    if (!result.ok) return jsonError(400, result.error, result.error);
    return NextResponse.json({ ok: true, rows: await countryList() });
  } catch (error) {
    return serverError("channel country save", error);
  }
}

export async function DELETE(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!/^[a-z][a-z0-9_]{2,30}$/.test(key)) return jsonError(400, "Invalid key", "bad_request");
  try {
    const deleted = await removeCountry(key, guard.value.profile.id);
    if (!deleted) return jsonError(404, "Country not found", "not_found");
    return NextResponse.json({ ok: true, rows: await countryList() });
  } catch (error) {
    return serverError("channel country delete", error);
  }
}
