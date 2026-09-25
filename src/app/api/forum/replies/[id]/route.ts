import { NextResponse } from "next/server";
import { db } from "@/db";
import { forumReplies, studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const replyId = parseInt(id, 10);
    // Authenticate the requester from the signed session cookie — the
    // `requesterId` query parameter was forgeable and is ignored.
    const auth = await authenticate(req);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status }
      );
    }
    const requester = { id: auth.session.profile.id, isAdmin: auth.session.isAdmin };

    // Only the reply author or an admin may delete the reply.
    const [reply] = await db
      .select({ id: forumReplies.id, authorId: forumReplies.authorId })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId));

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }
    if (reply.authorId !== requester.id && !requester.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: only the reply author or an admin can delete this reply" },
        { status: 403 }
      );
    }

    await db.delete(forumReplies).where(eq(forumReplies.id, replyId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/forum/replies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
  }
}
