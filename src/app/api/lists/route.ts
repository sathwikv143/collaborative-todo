import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listMembers, sections, todoLists, users } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { createListSchema } from "@/lib/schemas";
import { resolveUserDisplayName } from "@/lib/member-display";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { actor } = auth;

  if (actor.type === "guest") {
    return jsonError("Guests cannot list all lists", 403);
  }

  const rows = await db
    .select({
      id: todoLists.id,
      title: todoLists.title,
      description: todoLists.description,
      role: listMembers.role,
      ownerId: todoLists.ownerId,
      creatorName: users.name,
      createdAt: todoLists.createdAt,
      updatedAt: todoLists.updatedAt,
    })
    .from(listMembers)
    .innerJoin(todoLists, eq(listMembers.listId, todoLists.id))
    .innerJoin(users, eq(todoLists.ownerId, users.id))
    .where(eq(listMembers.userId, actor.id))
    .orderBy(desc(todoLists.updatedAt));

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      role: row.role,
      creatorName: resolveUserDisplayName(row.creatorName),
      isCreator: row.ownerId === actor.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { actor } = auth;

  if (actor.type === "guest") {
    return jsonError("Guests cannot create lists", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Title is required", 400);
  }

  const [list] = await db
    .insert(todoLists)
    .values({
      ownerId: actor.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
    .returning();

  const [member] = await db
    .insert(listMembers)
    .values({
      listId: list.id,
      userId: actor.id,
      role: "owner",
    })
    .returning();

  await db.insert(sections).values({
    listId: list.id,
    title: "Inbox",
    sortOrder: 0,
    createdByMemberId: member.id,
  });

  return NextResponse.json(
    {
      id: list.id,
      title: list.title,
      description: list.description,
      role: "owner",
      creatorName: actor.name ?? actor.username,
      isCreator: true,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    },
    { status: 201 }
  );
}
