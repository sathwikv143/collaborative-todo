import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { jsonError, parseJsonBody, resolveListAccess } from "@/lib/api-helpers";
import { memberBelongsToList, sectionBelongsToList } from "@/lib/access";
import { createTaskSchema, taskPatchSchema } from "@/lib/schemas";
import { normalizeExternalLinks } from "@/lib/external-links";
import { emitSyncUpdate, logListEvent } from "@/lib/feed";
import { canCreateContent, canDeleteTask, canEditTask } from "@/lib/permissions";
import { applyCompletedAt, normalizeTaskStatus } from "@/lib/task-status";
import { nextSortOrder } from "@/lib/sort-order";
import type { ListIdParams } from "@/lib/api-types";

export async function POST(request: NextRequest, { params }: ListIdParams) {
  const { id: listId } = await params;
  const access = await resolveListAccess(request, listId, "viewer");
  if (access instanceof NextResponse) return access;

  const { membership } = access;
  if (!canCreateContent(membership)) {
    return jsonError("Forbidden", 403);
  }

  const parsed = await parseJsonBody(request, createTaskSchema);
  if (parsed instanceof NextResponse) return parsed;

  if (!(await sectionBelongsToList(listId, parsed.data.sectionId))) {
    return jsonError("Invalid section", 400);
  }

  if (
    parsed.data.assigneeMemberId &&
    !(await memberBelongsToList(listId, parsed.data.assigneeMemberId))
  ) {
    return jsonError("Invalid assignee", 400);
  }

  const existing = await db
    .select({ sortOrder: tasks.sortOrder })
    .from(tasks)
    .where(and(eq(tasks.listId, listId), eq(tasks.sectionId, parsed.data.sectionId)));

  const [task] = await db
    .insert(tasks)
    .values({
      listId,
      sectionId: parsed.data.sectionId,
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      assigneeMemberId: parsed.data.assigneeMemberId ?? null,
      dueDate: parsed.data.dueDate ?? null,
      priority: parsed.data.priority ?? "none",
      status: parsed.data.status ?? "todo",
      sortOrder: nextSortOrder(existing),
      createdByMemberId: membership.id,
      externalLinks: parsed.data.externalLinks
        ? normalizeExternalLinks(parsed.data.externalLinks)
        : [],
    })
    .returning();

  await logListEvent({
    listId,
    actorMemberId: membership.id,
    action: "task.created",
    itemType: "task",
    itemId: task.id,
    summary: `Added task "${task.title}"`,
  });
  emitSyncUpdate(listId, "tasks", task);

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: ListIdParams) {
  const { id: listId } = await params;
  const access = await resolveListAccess(request, listId, "viewer");
  if (access instanceof NextResponse) return access;

  const { membership } = access;

  const body = await request.json().catch(() => null);
  const taskId = body?.id as string | undefined;
  if (!taskId) {
    return jsonError("Task id required", 400);
  }

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.listId, listId)));

  if (!existing) {
    return jsonError("Task not found", 404);
  }

  if (!canEditTask(membership, existing)) {
    return jsonError("Forbidden", 403);
  }

  const parsed = taskPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid input", 400);
  }

  if (
    parsed.data.sectionId &&
    !(await sectionBelongsToList(listId, parsed.data.sectionId))
  ) {
    return jsonError("Invalid section", 400);
  }

  if (
    parsed.data.assigneeMemberId &&
    !(await memberBelongsToList(listId, parsed.data.assigneeMemberId))
  ) {
    return jsonError("Invalid assignee", 400);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.sectionId !== undefined) updates.sectionId = parsed.data.sectionId;
  if (parsed.data.assigneeMemberId !== undefined) {
    updates.assigneeMemberId = parsed.data.assigneeMemberId;
  }
  if (parsed.data.dueDate !== undefined) updates.dueDate = parsed.data.dueDate;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
  if (parsed.data.externalLinks !== undefined) {
    updates.externalLinks = normalizeExternalLinks(parsed.data.externalLinks);
  }

  if (parsed.data.status !== undefined) {
    const status = normalizeTaskStatus(parsed.data.status);
    updates.status = status;
    updates.completedAt = applyCompletedAt(
      status,
      existing.completedAt ? new Date(existing.completedAt) : null
    );
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, taskId), eq(tasks.listId, listId)))
    .returning();

  await logListEvent({
    listId,
    actorMemberId: membership.id,
    action: "task.updated",
    itemType: "task",
    itemId: updated.id,
    summary: `Updated task "${updated.title}"`,
  });
  emitSyncUpdate(listId, "tasks", updated);

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: ListIdParams) {
  const { id: listId } = await params;
  const access = await resolveListAccess(request, listId, "viewer");
  if (access instanceof NextResponse) return access;

  const { membership } = access;

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return jsonError("Task id required", 400);
  }

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.listId, listId)));

  if (!existing) {
    return jsonError("Task not found", 404);
  }

  if (!canDeleteTask(membership, existing)) {
    return jsonError("Forbidden", 403);
  }

  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.listId, listId)))
    .returning();

  await logListEvent({
    listId,
    actorMemberId: membership.id,
    action: "task.deleted",
    itemType: "task",
    itemId: deleted.id,
    summary: `Deleted task "${deleted.title}"`,
  });
  emitSyncUpdate(listId, "tasks", { deletedId: taskId });

  return new NextResponse(null, { status: 204 });
}
