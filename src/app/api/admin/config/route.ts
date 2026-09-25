import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllConfig, setConfig } from "@/lib/config";

/** GET: list all config (admin). PUT: update a single value. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const config = await getAllConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("GET /api/admin/config error:", error);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const { key, value, description } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    await setConfig(String(key), String(value), description);
    return NextResponse.json({ success: true, key, value: String(value) });
  } catch (error) {
    console.error("PUT /api/admin/config error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
