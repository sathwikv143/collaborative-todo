"use client";

import { ChevronDownIcon } from "./NotificationIcons";
import { getStatusLabel, isDoneStatus } from "@/lib/task-status";
import { TaskRowExpanded } from "./task-row/TaskRowExpanded";
import { isTaskOverdue } from "@/lib/task-due";
import { useTaskRowState } from "./task-row/useTaskRowState";
import type { TaskRowProps } from "./task-row/types";

export function TaskRow(props: TaskRowProps) {
  const {
    task,
    members,
    comments,
    currentMemberId,
    canEdit,
    canDelete,
    expanded,
    onExpandedChange,
    onToggle,
    onUpdate,
    onDelete,
    onComment,
  } = props;

  const state = useTaskRowState({
    task,
    members,
    comments,
    currentMemberId,
    canEdit,
    onUpdate,
    onComment,
  });

  const { editing, setEditing, title, setTitle, saveTitle, status, issueSubtitle } = state;

  return (
    <div
      className={`task-row task-row-issue task-row-status-${status}${expanded ? "" : " collapsed"}${isDoneStatus(task.status) ? " task-done" : ""}${isTaskOverdue(task) ? " task-overdue" : ""}`}
    >
      <div className={`task-issue-card${expanded ? " expanded" : ""}`}>
        <div
          className="task-issue-header"
          onClick={() => {
            if (!expanded) onExpandedChange(true);
          }}
          onKeyDown={(e) => {
            if (!expanded && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onExpandedChange(true);
            }
          }}
          role={!expanded ? "button" : undefined}
          tabIndex={!expanded ? 0 : undefined}
          aria-label={!expanded ? `Expand task: ${task.title}` : undefined}
        >
          <label className="task-check-wrap" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="task-check"
              checked={isDoneStatus(task.status)}
              disabled={!canEdit}
              onChange={() => onToggle(task)}
            />
            <span className="task-check-ui" aria-hidden />
          </label>

          <button
            type="button"
            className="task-collapse"
            onClick={(e) => {
              e.stopPropagation();
              onExpandedChange(!expanded);
            }}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse task" : "Expand task"}
          >
            <span className="task-collapse-icon" aria-hidden>
              <ChevronDownIcon />
            </span>
          </button>

          <div className="task-issue-heading">
            {task.priority !== "none" && (
              <span
                className={`priority-dot priority-${task.priority}`}
                title={`${task.priority} priority`}
              />
            )}

            {editing && canEdit ? (
              <input
                className="input task-title-input"
                value={title}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setTitle(task.title);
                    setEditing(false);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="task-title task-issue-title"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!expanded) {
                    onExpandedChange(true);
                    return;
                  }
                  if (canEdit) setEditing(true);
                }}
                disabled={expanded && !canEdit}
              >
                {task.title}
              </button>
            )}

            <span className="task-issue-subtitle">
              <span className={`status-pill status-pill-${status} status-pill-inline`}>
                {getStatusLabel(status)}
              </span>
              <span className="task-issue-subtitle-text">{issueSubtitle}</span>
            </span>
          </div>
        </div>

        {expanded && (
          <div className="task-issue-body">
            <TaskRowExpanded
              task={task}
              members={members}
              comments={comments}
              currentMemberId={currentMemberId}
              canEdit={canEdit}
              canDelete={canDelete}
              onUpdate={onUpdate}
              onDelete={onDelete}
              state={state}
            />
          </div>
        )}
      </div>
    </div>
  );
}
