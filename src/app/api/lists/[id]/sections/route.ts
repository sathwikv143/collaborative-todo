import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sections, tasks } from "@/lib/db/schema";
import { jsonError, parseJsonBody, resolveListAccess } from "@/lib/api-helpers";
import { createSectionSchema, sectionPatchSchema } from "@/lib/schemas";
import { emitSyncUpdate, logListEvent } from "@/lib/feed";
import { canCreateContent, canDeleteSection, canEditSection } from "@/lib/permissions";
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

  const parsed = await parseJsonBody(request, createSectionSchema);
  if (parsed instanceof NextResponse) return parsed;

  const existing = await db
    .select({ sortOrder: sections.sortOrder })
    .from(sections)
    .where(eq(sections.listId, listId));

  const [section] = await db
    .insert(sections)
    .values({
      listId,
      title: parsed.data.title,
      sortOrder: nextSortOrder(existing),
      createdByMemberId: membership.id,
    })
    .returning();

  await logListEvent({
    listId,
    actorMemberId: membership.id,
    action: "section.created",
    itemType: "section",
    itemId: section.id,
    summary: `Added section "${section.title}"`,
  });
  emitSyncUpdate(listId, "sections", section);

  return NextResponse.json(section, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: ListIdParams) {
  const { id: listId } = await params;
  const access = await resolveListAccess(request, listId, "viewer");
  if (access instanceof NextResponse) return access;

  const { membership } = access;

  const body = await request.json().catch(() => null);
  const sectionId = body?.id as string | undefined;
  if (!sectionId) {
    return jsonError("Section id required", 400);
  }

  const [existing] = await db
    .select()
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.listId, listId)));

  if (!existing) {
    return jsonError("Section not found", 404);
  }

  if (!canEditSection(membership, existing)) {
    return jsonError("Forbidden", 403);
  }

  const parsed = sectionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid input", 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

  const [updated] = await db
    .update(sections)
    .set(updates)
    .where(and(eq(sections.id, sectionId), eq(sections.listId, listId)))
    .returning();

  emitSyncUpdate(listId, "sections", updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: ListIdParams) {
  const { id: listId } = await params;
  const access = await resolveListAccess(request, listId, "viewer");
  if (access instanceof NextResponse) return access;

  const { membership } = access;

  const sectionId = request.nextUrl.searchParams.get("sectionId");
  if (!sectionId) {
    return jsonError("Section id required", 400);
  }

  const [existing] = await db
    .select()
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.listId, listId)));

  if (!existing) {
    return jsonError("Section not found", 404);
  }

  if (!canDeleteSection(membership, existing)) {
    return jsonError("Forbidden", 403);
  }

  const sectionTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.listId, listId), eq(tasks.sectionId, sectionId)));

  if (sectionTasks.length > 0) {
    return jsonError("Move or delete tasks in this section first", 400);
  }

  await db
    .delete(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.listId, listId)));

  emitSyncUpdate(listId, "sections", { deletedId: sectionId });
  return new NextResponse(null, { status: 204 });
}
