import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { setConfig } from "@/lib/config";
import { supabaseStorageUrl } from "@/lib/branding";

const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Upload a site logo or favicon to the private server-side storage integration. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const adminProfileId = form.get("adminProfileId");
    if (!(await isAdmin(typeof adminProfileId === "string" ? adminProfileId : null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const kind = form.get("kind");
    if (kind !== "logo" && kind !== "favicon") {
      return NextResponse.json({ error: "kind must be logo or favicon" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    const extension = ALLOWED.get(file.type);
    if (!extension) return NextResponse.json({ error: "Use PNG, JPG, WEBP or ICO" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });

    const supabaseUrl = (process.env.SUPABASE_URL || "https://llwrzitajdsnqzpvflnj.supabase.co").replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "Storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server." }, { status: 503 });
    }

    // Keep stable filenames so all pages use the latest asset. The timestamp
    // in the saved URL also avoids stale CDN/browser caches after replacement.
    const path = `${kind}.${extension}`;
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/LOGO/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!upload.ok) {
      const detail = await upload.text();
      console.error("Supabase branding upload failed:", detail);
      return NextResponse.json({ error: "Storage upload failed. Check that the LOGO bucket exists." }, { status: 502 });
    }

    const url = `${supabaseStorageUrl(path)}?v=${Date.now()}`;
    await setConfig(`branding_${kind}_url`, url, kind === "logo" ? "Site logo URL" : "Browser tab favicon URL");
    return NextResponse.json({ success: true, kind, url });
  } catch (error) {
    console.error("POST /api/admin/branding/upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
