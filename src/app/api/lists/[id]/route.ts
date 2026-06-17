import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { todoLists, users } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { getMembership } from "@/lib/access";
import { emitSyncUpdate } from "@/lib/feed";
import { isListCreator } from "@/lib/permissions";
import { resolveUserDisplayName } from "@/lib/member-display";
import type { ListIdParams } from "@/lib/api-types";

export async function GET(request: NextRequest, { params }: ListIdParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const membership = await getMembership(id, auth.actor);
  if (!membership) {
    return jsonError("List not found", 404);
  }

  const [list] = await db
    .select({
      id: todoLists.id,
      title: todoLists.title,
      description: todoLists.description,
      settings: todoLists.settings,
      ownerId: todoLists.ownerId,
      creatorName: users.name,
      createdAt: todoLists.createdAt,
      updatedAt: todoLists.updatedAt,
    })
    .from(todoLists)
    .innerJoin(users, eq(todoLists.ownerId, users.id))
    .where(eq(todoLists.id, id));
  if (!list) {
    return jsonError("List not found", 404);
  }

  return NextResponse.json({
    id: list.id,
    title: list.title,
    description: list.description,
    settings: list.settings,
    role: membership.role,
    memberId: membership.id,
    isListOwner: isListCreator(auth.actor, list.ownerId),
    creatorName: resolveUserDisplayName(list.creatorName),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  });
}

export async function DELETE(request: NextRequest, { params }: ListIdParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const [list] = await db.select().from(todoLists).where(eq(todoLists.id, id));
  if (!list) {
    return jsonError("List not found", 404);
  }

  if (!isListCreator(auth.actor, list.ownerId)) {
    return jsonError("Only the list creator can delete this list", 403);
  }

  await db.delete(todoLists).where(eq(todoLists.id, id));
  return new NextResponse(null, { status: 204 });
}
