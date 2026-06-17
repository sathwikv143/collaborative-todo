import type { Comment, ListEvent, Member, Task } from "./api-client";
import { getMemberName } from "./member-display";

export interface UserNotification {
  id: string;
  action: string;
  summary: string;
  actorName: string;
  createdAt: string;
  taskId: string | null;
}

function taskIdForEvent(event: ListEvent): string | null {
  if (event.itemType === "task" && event.itemId) return event.itemId;
  if (
    (event.action === "comment.added" || event.action === "comment.replied") &&
    event.itemId
  ) {
    return event.itemId;
  }
  return null;
}

function userOwnsTask(task: Task, memberId: string): boolean {
  return task.assigneeMemberId === memberId || task.createdByMemberId === memberId;
}

function isNotificationForUser(
  event: ListEvent,
  memberId: string,
  tasks: Task[],
  _comments: Comment[]
): boolean {
  if (event.actorMemberId === memberId) return false;

  const taskId = taskIdForEvent(event);
  if (!taskId) return false;

  const task = tasks.find((t) => t.id === taskId);
  if (task) return userOwnsTask(task, memberId);

  return event.action === "task.deleted";
}

export function getUserNotifications(
  events: ListEvent[],
  memberId: string,
  tasks: Task[],
  comments: Comment[],
  members: Member[]
): UserNotification[] {
  return events
    .filter((event) => isNotificationForUser(event, memberId, tasks, comments))
    .map((event) => ({
      id: event.id,
      action: event.action,
      summary: event.summary,
      actorName: getMemberName(members, event.actorMemberId, "Someone") ?? "Someone",
      createdAt: event.createdAt,
      taskId: taskIdForEvent(event),
    }));
}
