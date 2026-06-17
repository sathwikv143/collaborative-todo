import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guests,
  invites,
  listMembers,
  todoLists,
} from "@/lib/db/schema";
import { jsonError, setAuthSession } from "@/lib/api-helpers";
import { guestJoinSchema } from "@/lib/schemas";
import { logListEvent } from "@/lib/feed";
import { getValidatedActorFromRequest } from "@/lib/session";
import { type Actor, type UserActor } from "@/lib/auth";
import { inviteStatus, inviteValidationError } from "@/lib/invites";
import { getMembership } from "@/lib/access";
import type { JoinTokenParams } from "@/lib/api-types";

async function issueGuestSession(
  guestId: string,
  listId: string,
  name: string,
  memberId: string
) {
  const guestActor: Actor = {
    type: "guest",
    id: guestId,
    listId,
    name,
  };
  const response = NextResponse.json({
    listId,
    memberId,
    actorType: "guest",
    guest: { id: guestId, name },
  });
  return setAuthSession(response, guestActor);
}

async function loadInvite(token: string) {
  const [invite] = await db.select().from(invites).where(eq(invites.token, token));
  return invite ?? null;
}

async function resumeClaimedGuest(invite: typeof invites.$inferSelect, guestId: string) {
  const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
  if (!guest) return null;

  const [member] = await db
    .select()
    .from(listMembers)
    .where(and(eq(listMembers.listId, invite.listId), eq(listMembers.guestId, guestId)));

  if (!member) return null;

  return issueGuestSession(guest.id, invite.listId, guest.displayName, member.id);
}

export async function GET(request: NextRequest, { params }: JoinTokenParams) {
  const { token } = await params;
  const invite = await loadInvite(token);
  const validationError = inviteValidationError(invite);
  if (validationError) return validationError;

  const status = inviteStatus(invite!);
  const [list] = await db
    .select({ id: todoLists.id, title: todoLists.title })
    .from(todoLists)
    .where(eq(todoLists.id, invite!.listId));

  const actor = await getValidatedActorFromRequest(request);
  let claimedGuest: { id: string; name: string } | null = null;

  if (invite.claimedByGuestId) {
    const [guest] = await db
      .select({ id: guests.id, displayName: guests.displayName })
      .from(guests)
      .where(eq(guests.id, invite.claimedByGuestId));
    if (guest) {
      claimedGuest = { id: guest.id, name: guest.displayName };
    }
  }

  const canResume =
    !!claimedGuest && actor?.type === "guest" && actor.id === claimedGuest.id;

  const shouldRedirect = canResume || (actor?.type === "guest" && actor.listId === invite.listId);

  return NextResponse.json({
    list,
    role: invite.role,
    status,
    claimedGuest,
    canResume,
    redirect: shouldRedirect,
    listId: invite.listId,
  });
}

export async function POST(request: NextRequest, { params }: JoinTokenParams) {
  const { token } = await params;
  const invite = await loadInvite(token);
  const validationError = inviteValidationError(invite);
  if (validationError) return validationError;

  const actor = await getValidatedActorFromRequest(request);
  const body = await request.json().catch(() => ({}));
  const parsed = guestJoinSchema.safeParse(body);

  // Resume a claimed invite — requires existing guest session cookie
  if (invite.claimedByGuestId) {
    if (actor?.type === "guest" && actor.id === invite.claimedByGuestId) {
      const resumed = await resumeClaimedGuest(invite, actor.id);
      if (resumed) return resumed;
    }

    return jsonError("This invite link is already assigned. Open it in the browser where you first joined.", 403);
  }

  let userActor: UserActor | null = null;
  if (actor?.type === "user") {
    userActor = actor;
  }

  if (userActor) {
    const existing = await getMembership(invite.listId, userActor);
    if (existing) {
      const response = NextResponse.json({
        listId: invite.listId,
        memberId: existing.id,
        actorType: "user",
      });
      return setAuthSession(response, userActor);
    }

    const [member] = await db
      .insert(listMembers)
      .values({
        listId: invite.listId,
        userId: userActor.id,
        role: invite.role,
      })
      .returning();

    await db
      .update(invites)
      .set({ useCount: sql`${invites.useCount} + 1` })
      .where(eq(invites.id, invite.id));

    await logListEvent({
      listId: invite.listId,
      actorMemberId: member.id,
      action: "member.joined",
      summary: "A member joined via invite",
    });

    const response = NextResponse.json({
      listId: invite.listId,
      memberId: member.id,
      actorType: "user",
    });
    return setAuthSession(response, userActor);
  }

  if (!parsed.success || !parsed.data.displayName) {
    return jsonError("Display name required for guest join", 400);
  }

  const displayName = parsed.data.displayName.trim();

  // Re-use existing guest membership on same list (same session, different invite)
  if (actor?.type === "guest") {
    const [existingMember] = await db
      .select()
      .from(listMembers)
      .where(
        and(eq(listMembers.listId, invite.listId), eq(listMembers.guestId, actor.id))
      );

    if (existingMember) {
      if (displayName !== actor.name) {
        await db.update(guests).set({ displayName }).where(eq(guests.id, actor.id));
      }
      await db
        .update(invites)
        .set({
          claimedByGuestId: actor.id,
          claimedAt: new Date(),
        })
        .where(eq(invites.id, invite.id));
      return issueGuestSession(actor.id, invite.listId, displayName, existingMember.id);
    }
  }

  const [guest] = await db.insert(guests).values({ displayName }).returning();
  const [member] = await db
    .insert(listMembers)
    .values({
      listId: invite.listId,
      guestId: guest.id,
      role: invite.role,
    })
    .returning();

  await db
    .update(invites)
    .set({
      useCount: sql`${invites.useCount} + 1`,
      claimedByGuestId: guest.id,
      claimedAt: new Date(),
    })
    .where(eq(invites.id, invite.id));

  await logListEvent({
    listId: invite.listId,
    actorMemberId: member.id,
    action: "member.joined",
    summary: `${displayName} joined as guest`,
  });

  return issueGuestSession(guest.id, invite.listId, displayName, member.id);
}
