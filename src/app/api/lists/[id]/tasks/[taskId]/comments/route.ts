import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, tasks } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { requireMembership, taskBelongsToList } from "@/lib/access";
import { commentSchema } from "@/lib/schemas";
import { emitSyncUpdate, logListEvent } from "@/lib/feed";
import type { TaskCommentParams } from "@/lib/api-types";

export async function POST(request: NextRequest, { params }: TaskCommentParams) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: listId, taskId } = await params;

  const membership = await requireMembership(listId, auth.actor, "viewer");
  if (!membership) {
    return jsonError("Forbidden", 403);
  }

  if (!(await taskBelongsToList(listId, taskId))) {
    return jsonError("Task not found", 404);
  }

  const body = await request.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid comment", 400);
  }

  const [comment] = await db
    .insert(comments)
    .values({
      taskId,
      authorMemberId: membership.id,
      body: parsed.data.body,
    })
    .returning();

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  await logListEvent({
    listId,
    actorMemberId: membership.id,
    action: "comment.added",
    itemType: "task",
    itemId: taskId,
    summary: `Comment on "${task?.title ?? "task"}"`,
  });
  emitSyncUpdate(listId, "comments", comment);

  return NextResponse.json(comment, { status: 201 });
}
