import { NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  comments,
  listEvents,
  sections,
  tasks,
} from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { getMembership, getMembersWithNames, displayName } from "@/lib/access";

import type { ListIdParams } from "@/lib/api-types";

export async function GET(request: NextRequest, { params }: ListIdParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const membership = await getMembership(id, auth.actor);
  if (!membership) {
    return jsonError("List not found", 404);
  }

  const memberRows = await getMembersWithNames(id);
  const members = memberRows.map((r) => ({
    id: r.id,
    role: r.role,
    name: displayName(r),
    isGuest: !!r.guestId,
    joinedAt: r.joinedAt,
  }));

  const sectionRows = await db
    .select()
    .from(sections)
    .where(eq(sections.listId, id))
    .orderBy(sections.sortOrder);

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.listId, id))
    .orderBy(tasks.sortOrder);

  const taskIds = taskRows.map((t) => t.id);
  const commentRows =
    taskIds.length > 0
      ? await db.select().from(comments).where(inArray(comments.taskId, taskIds))
      : [];

  const events = await db
    .select()
    .from(listEvents)
    .where(eq(listEvents.listId, id))
    .orderBy(desc(listEvents.createdAt))
    .limit(50);

  return NextResponse.json({
    memberId: membership.id,
    role: membership.role,
    members,
    sections: sectionRows,
    tasks: taskRows,
    comments: commentRows,
    events,
  });
}
