import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_ACCOUNT_PAGE, adminViewer, listAdminAccounts } from "@/lib/adminAccounts";

export const dynamic = "force-dynamic";

/**
 * `GET /api/admin/accounts` — the account list support actually needs.
 *
 * Answers "what state is this account in?" without ever exposing a credential:
 * whether a password exists, when it was last set, how many devices are signed
 * in, whether Telegram is linked. The password hash is not selected into the
 * response at any point (`listAdminAccounts` reduces it to a boolean).
 *
 * Query: `q` (name or email, case-insensitive), `limit` (1-100, default 25).
 *
 * `viewer` is the signed-in administrator, with `hasPassword`,
 * `passwordChangedAt` and `passwordFormat`. The confirmation field asks for THIS
 * account's password, so the panel must be able to name it — and must be able to
 * tell "you typed it wrong" apart from "this account has no password yet" or
 * "its stored hash is in a format this build cannot check".
 */
export async function GET(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const [accounts, viewer] = await Promise.all([
      listAdminAccounts({
        q: searchParams.get("q") ?? "",
        limit: Number(searchParams.get("limit") ?? ADMIN_ACCOUNT_PAGE),
      }),
      adminViewer(access.session.profile.id),
    ]);

    return NextResponse.json(
      { accounts, count: accounts.length, limit: ADMIN_ACCOUNT_PAGE, viewer },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/accounts error:", error);
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
