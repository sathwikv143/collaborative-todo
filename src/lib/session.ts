import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { guests, listMembers, users } from "./db/schema";
import type { Actor } from "./auth";
import { requireMembership, type Membership } from "./access";
import { getActorFromRequest } from "./jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Confirms the JWT identity still exists in the database.
 * Permissions (role, ownership) are always loaded separately via getMembership().
 */
export async function validateActor(actor: Actor): Promise<Actor | null> {
  if (actor.type === "user") {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, actor.id));
    return user ? actor : null;
  }

  const [guest] = await db
    .select({ id: guests.id })
    .from(guests)
    .where(eq(guests.id, actor.id));
  if (!guest) return null;

  const [member] = await db
    .select({ id: listMembers.id })
    .from(listMembers)
    .where(
      and(eq(listMembers.guestId, actor.id), eq(listMembers.listId, actor.listId))
    );
  return member ? actor : null;
}

export async function getValidatedActorFromRequest(
  request: NextRequest
): Promise<Actor | null> {
  const actor = await getActorFromRequest(request);
  if (!actor) return null;
  return validateActor(actor);
}

export interface ListAccess {
  actor: Actor;
  membership: Membership;
}

/**
 * Resolve list permissions from JWT identity + database membership (never from JWT claims).
 */
export async function resolveListAccess(
  request: NextRequest,
  listId: string,
  minRole = "viewer"
): Promise<ListAccess | NextResponse> {
  const actor = await getValidatedActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await requireMembership(listId, actor, minRole);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { actor, membership };
}
