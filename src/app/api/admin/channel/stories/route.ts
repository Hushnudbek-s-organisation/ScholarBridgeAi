import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { approveStory, removeStory, saveStory, storyList } from "@/lib/channel/admin";

export const dynamic = "force-dynamic";

/**
 * Admin → Kanal → Hikoyalar.
 *
 * Curated, admin-written stories. There is deliberately no generator and no
 * import: the only text that can ever be posted is what an admin typed here and
 * then approved. Unapproved rows are invisible to the planner.
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ ok: true, rows: await storyList() });
  } catch (error) {
    return serverError("channel stories", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  try {
    const action = String(body.value.action ?? "save");
    if (action === "approve" || action === "unapprove") {
      const id = Number(body.value.id ?? 0);
      if (!Number.isInteger(id) || id <= 0) return jsonError(400, "Invalid id", "bad_id");
      const ok = await approveStory(id, action === "approve", guard.value.profile.id);
      if (!ok) return jsonError(404, "Story not found", "not_found");
      return NextResponse.json({ ok: true, rows: await storyList() });
    }
    if (action !== "save") return jsonError(400, "Unknown action", "bad_action");
    const result = await saveStory(body.value, guard.value.profile.id);
    if (!result.ok) return jsonError(400, result.error, result.error);
    return NextResponse.json({ ok: true, id: result.id, rows: await storyList() });
  } catch (error) {
    return serverError("channel story save", error);
  }
}

export async function DELETE(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const id = Number(new URL(req.url).searchParams.get("id") ?? 0);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "Invalid id", "bad_id");
  try {
    const ok = await removeStory(id, guard.value.profile.id);
    if (!ok) return jsonError(404, "Story not found", "not_found");
    return NextResponse.json({ ok: true, rows: await storyList() });
  } catch (error) {
    return serverError("channel story delete", error);
  }
}
