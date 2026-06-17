export const TASK_PRIORITIES = [
  { value: "none", label: "No priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function getPriorityLabel(priority: string): string {
  const match = TASK_PRIORITIES.find((p) => p.value === priority);
  if (match) return match.value === "none" ? "None" : match.label;
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}
