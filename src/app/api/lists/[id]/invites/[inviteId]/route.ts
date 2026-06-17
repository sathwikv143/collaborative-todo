import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { requireListCreator } from "@/lib/access";
import { emitSyncUpdate, logListEvent } from "@/lib/feed";

import type { InviteIdParams } from "@/lib/api-types";

export async function DELETE(request: NextRequest, { params }: InviteIdParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: listId, inviteId } = await params;

  const membership = await requireListCreator(listId, auth.actor);
  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.listId, listId)));

  if (!invite) {
    return jsonError("Invite not found", 404);
  }

  if (invite.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(eq(invites.id, inviteId));

  await logListEvent({
    listId,
    actorMemberId: membership.id,
    action: "invite.revoked",
    itemType: "invite",
    itemId: inviteId,
    summary: "An invite link was revoked",
  });

  emitSyncUpdate(listId, "invites");

  return NextResponse.json({ ok: true });
}
