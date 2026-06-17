import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { guests, listMembers, sections, tasks, todoLists, users } from "./db/schema";
import type { Actor } from "./auth";
import { hasRole } from "./roles";
import { isListCreator } from "./permissions";

export interface Membership {
  id: string;
  listId: string;
  role: string;
  userId: string | null;
  guestId: string | null;
}

export async function getMembership(
  listId: string,
  actor: Actor
): Promise<Membership | null> {
  if (actor.type === "guest" && actor.listId !== listId) {
    return null;
  }

  const condition =
    actor.type === "user"
      ? and(eq(listMembers.listId, listId), eq(listMembers.userId, actor.id))
      : and(eq(listMembers.listId, listId), eq(listMembers.guestId, actor.id));

  const [row] = await db.select().from(listMembers).where(condition);
  return row ?? null;
}

export async function requireMembership(
  listId: string,
  actor: Actor,
  minRole = "viewer"
): Promise<Membership | null> {
  const membership = await getMembership(listId, actor);
  if (!membership || !hasRole(membership.role, minRole)) {
    return null;
  }
  return membership;
}

export async function requireListCreator(
  listId: string,
  actor: Actor
): Promise<Membership | null> {
  const membership = await getMembership(listId, actor);
  if (!membership) return null;

  const [list] = await db
    .select({ ownerId: todoLists.ownerId })
    .from(todoLists)
    .where(eq(todoLists.id, listId));

  if (!list || !isListCreator(actor, list.ownerId)) {
    return null;
  }
  return membership;
}

export async function memberBelongsToList(
  listId: string,
  memberId: string
): Promise<boolean> {
  const [row] = await db
    .select({ listId: listMembers.listId })
    .from(listMembers)
    .where(eq(listMembers.id, memberId));
  return row?.listId === listId;
}

export async function sectionBelongsToList(
  listId: string,
  sectionId: string
): Promise<boolean> {
  const [row] = await db
    .select({ listId: sections.listId })
    .from(sections)
    .where(eq(sections.id, sectionId));
  return row?.listId === listId;
}

export async function taskBelongsToList(
  listId: string,
  taskId: string
): Promise<boolean> {
  const [row] = await db
    .select({ listId: tasks.listId })
    .from(tasks)
    .where(eq(tasks.id, taskId));
  return row?.listId === listId;
}

export async function getMembersWithNames(listId: string) {
  return db
    .select({
      id: listMembers.id,
      role: listMembers.role,
      userId: listMembers.userId,
      guestId: listMembers.guestId,
      joinedAt: listMembers.joinedAt,
      userName: users.name,
      guestName: guests.displayName,
    })
    .from(listMembers)
    .leftJoin(users, eq(listMembers.userId, users.id))
    .leftJoin(guests, eq(listMembers.guestId, guests.id))
    .where(eq(listMembers.listId, listId));
}

export function displayName(row: {
  userName: string | null;
  guestName: string | null;
}): string {
  return row.userName ?? row.guestName ?? "Member";
}
