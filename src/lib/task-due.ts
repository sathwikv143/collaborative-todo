import type { Task } from "@/lib/api-client";
import { todayIso } from "@/lib/format-date";
import { isDoneStatus } from "@/lib/task-status";

export function isTaskOverdue(task: Pick<Task, "dueDate" | "status">): boolean {
  if (!task.dueDate || isDoneStatus(task.status)) return false;
  return task.dueDate < todayIso();
}
