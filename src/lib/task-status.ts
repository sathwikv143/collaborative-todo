export const TASK_STATUS_IDS = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUS_IDS)[number];

/** Linear workflow: backlog → todo → in progress → in review → done */
export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "in_review", label: "In review" },
  { id: "done", label: "Done" },
];

const STATUS_ORDER = new Map(TASK_STATUSES.map((s, i) => [s.id, i]));

export function normalizeTaskStatus(status: string): TaskStatus {
  if (status === "open") return "todo";
  if (STATUS_ORDER.has(status as TaskStatus)) return status as TaskStatus;
  return "todo";
}

export function isDoneStatus(status: string): boolean {
  return normalizeTaskStatus(status) === "done";
}

export function isActiveStatus(status: string): boolean {
  return !isDoneStatus(status);
}

export function getStatusLabel(status: string): string {
  const id = normalizeTaskStatus(status);
  return TASK_STATUSES.find((s) => s.id === id)?.label ?? "To do";
}

export function applyCompletedAt(status: string, completedAt: Date | null = null) {
  return isDoneStatus(status) ? (completedAt ?? new Date()) : null;
}
