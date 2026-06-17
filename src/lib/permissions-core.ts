export type Ownable = { createdByMemberId: string | null };

export type TaskPermissions = Ownable & { assigneeMemberId: string | null };

export function isItemCreator(
  memberId: string,
  createdByMemberId: string | null | undefined
): boolean {
  return !!createdByMemberId && createdByMemberId === memberId;
}

export function isTaskAssignee(
  memberId: string,
  assigneeMemberId: string | null | undefined
): boolean {
  return !!assigneeMemberId && assigneeMemberId === memberId;
}

export function canEditTask(memberId: string, task: TaskPermissions): boolean {
  if (isItemCreator(memberId, task.createdByMemberId)) return true;
  return isTaskAssignee(memberId, task.assigneeMemberId);
}

export function canDeleteTask(memberId: string, task: Ownable): boolean {
  return isItemCreator(memberId, task.createdByMemberId);
}

export function canEditSection(memberId: string, section: Ownable): boolean {
  return isItemCreator(memberId, section.createdByMemberId);
}

export function canDeleteSection(memberId: string, section: Ownable): boolean {
  return isItemCreator(memberId, section.createdByMemberId);
}
