import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guests, invites } from "@/lib/db/schema";
import { requireAuth, jsonError, appUrl } from "@/lib/api-helpers";
import { requireListCreator } from "@/lib/access";
import { createInviteSchema } from "@/lib/schemas";
import { inviteStatus } from "@/lib/invites";
import { emitSyncUpdate } from "@/lib/feed";

import type { ListIdParams } from "@/lib/api-types";

async function enrichInvites(listId: string, request: NextRequest) {
  const rows = await db.select().from(invites).where(eq(invites.listId, listId));
  const base = appUrl(request);

  return Promise.all(
    rows.map(async (inv) => {
      let claimedGuestName: string | null = null;
      if (inv.claimedByGuestId) {
        const [guest] = await db
          .select({ displayName: guests.displayName })
          .from(guests)
          .where(eq(guests.id, inv.claimedByGuestId));
        claimedGuestName = guest?.displayName ?? null;
      }

      return {
        id: inv.id,
        token: inv.token,
        role: inv.role,
        url: `${base}/join/${inv.token}`,
        expiresAt: inv.expiresAt,
        maxUses: inv.maxUses,
        useCount: inv.useCount,
        claimedByGuestId: inv.claimedByGuestId,
        claimedGuestName,
        claimedAt: inv.claimedAt,
        revokedAt: inv.revokedAt,
        createdAt: inv.createdAt,
        status: inviteStatus(inv),
      };
    })
  );
}

export async function GET(request: NextRequest, { params }: ListIdParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: listId } = await params;

  const membership = await requireListCreator(listId, auth.actor);
  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  const enriched = await enrichInvites(listId, request);
  enriched.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest, { params }: ListIdParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: listId } = await params;

  const membership = await requireListCreator(listId, auth.actor);
  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid input", 400);
  }

  const { randomUUID } = await import("crypto");
  const token = randomUUID();
  const expiresAt = parsed.data.expiresInHours
    ? new Date(Date.now() + parsed.data.expiresInHours * 3600 * 1000)
    : null;

  const [invite] = await db
    .insert(invites)
    .values({
      listId,
      token,
      role: parsed.data.role ?? "editor",
      maxUses: parsed.data.maxUses ?? null,
      expiresAt,
      createdBy: auth.actor.type === "user" ? auth.actor.id : null,
    })
    .returning();

  emitSyncUpdate(listId, "invites");

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    role: invite.role,
    url: `${appUrl(request)}/join/${token}`,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    claimedByGuestId: null,
    claimedGuestName: null,
    claimedAt: null,
    revokedAt: null,
    createdAt: invite.createdAt,
    status: "active" as const,
  });
}
