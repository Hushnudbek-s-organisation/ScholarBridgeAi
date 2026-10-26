import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { createOrUpdateLink, linksWithClicks, removeLink } from "@/lib/channel/admin";
import { isValidCustomCode } from "@/lib/channel/links";

export const dynamic = "force-dynamic";

/** Admin → Kanal → Qisqa havolalar: create, disable, delete, and the click
 *  totals for the last 7 and 30 days (aggregated per day, never per visitor). */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    const rows = await linksWithClicks();
    const url = new URL(req.url);
    if (url.searchParams.get("format") === "csv") {
      const header = "code,kind,scholarship_id,url,enabled,clicks_7d,clicks_30d,note\n";
      const body = rows
        .map((row) =>
          [
            row.code,
            row.kind,
            row.scholarshipId ?? "",
            row.url,
            row.enabled ? "1" : "0",
            row.clicks7,
            row.clicks30,
            (row.note ?? "").replace(/[",\n]/g, " "),
          ].join(",")
        )
        .join("\n");
      return new NextResponse(header + body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="channel-links.csv"',
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    return serverError("channel links", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  try {
    const result = await createOrUpdateLink(body.value, guard.value.profile.id);
    if (!result.ok) return jsonError(400, result.detail ?? result.error, result.error);
    return NextResponse.json({ ok: true, rows: await linksWithClicks() });
  } catch (error) {
    return serverError("channel link save", error);
  }
}

export async function DELETE(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const code = new URL(req.url).searchParams.get("code") ?? "";
  if (!isValidCustomCode(code)) return jsonError(400, "Invalid code", "bad_request");
  try {
    const deleted = await removeLink(code, guard.value.profile.id);
    if (!deleted) return jsonError(404, "Link not found", "not_found");
    return NextResponse.json({ ok: true, rows: await linksWithClicks() });
  } catch (error) {
    return serverError("channel link delete", error);
  }
}
