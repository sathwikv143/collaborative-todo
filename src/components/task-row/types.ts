import type { Comment, Member, Task } from "@/lib/api-client";

export interface TaskRowProps {
  task: Task;
  members: Member[];
  comments: Comment[];
  currentMemberId: string;
  canEdit: boolean;
  canDelete: boolean;
  onToggle: (task: Task) => void;
  onUpdate: (task: Task, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onComment: (taskId: string, body: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}
