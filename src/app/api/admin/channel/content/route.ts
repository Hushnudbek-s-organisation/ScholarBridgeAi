import { NextResponse } from "next/server";
import { guardAdmin, idParam, jsonError, readBody, serverError } from "@/lib/growth/api";
import { getContent, listContent, saveScholarshipContent } from "@/lib/channel/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin → Kanal → Kontent: the authored Uzbek copy for one scholarship.
 *   GET ?q=…        → searchable list with a completeness badge
 *   GET ?id=…       → one scholarship with its copy, report and live preview
 *   PUT { id, … }   → save (validated, audited, preview returned)
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    const url = new URL(req.url);
    const id = idParam(req, "id");
    if (id) {
      const item = await getContent(id);
      if (!item) return jsonError(404, "Scholarship not found", "not_found");
      return NextResponse.json({ ok: true, item });
    }
    const rows = await listContent(url.searchParams.get("q") ?? "");
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    return serverError("channel content list", error);
  }
}

export async function PUT(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const id = Number(body.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const result = await saveScholarshipContent(id, body.value, guard.value.profile.id);
    if (!result.ok) return jsonError(400, result.error ?? "invalid_value", result.error ?? "invalid_value");
    return NextResponse.json({ ok: true, preview: result.preview });
  } catch (error) {
    return serverError("channel content save", error);
  }
}
