"use client";

import type { Task } from "@/lib/api-client";
import { MemberAvatar } from "../MemberAvatar";
import { CreatorLabel } from "../CreatorLabel";
import { formatDateTime } from "@/lib/format-date";
import { getMemberName } from "@/lib/member-display";
import { TASK_PRIORITIES } from "@/lib/task-priority";
import { getStatusLabel, TASK_STATUSES, type TaskStatus } from "@/lib/task-status";
import { TASK_DESCRIPTION_MAX, type TaskRowState } from "./useTaskRowState";
import { TaskExternalLinks } from "./TaskExternalLinks";
import { TaskProperty } from "./TaskProperty";
import type { TaskRowProps } from "./types";

interface TaskRowExpandedProps
  extends Pick<
    TaskRowProps,
    "task" | "members" | "comments" | "currentMemberId" | "canEdit" | "canDelete" | "onUpdate" | "onDelete"
  > {
  state: TaskRowState;
}

function TaskDescription({
  task,
  canEdit,
  notes,
  setNotes,
  saveNotes,
}: {
  task: Task;
  canEdit: boolean;
  notes: string;
  setNotes: (value: string) => void;
  saveNotes: () => void;
}) {
  if (!canEdit && !task.notes) return null;

  return (
    <div className="task-description">
      {canEdit ? (
        <div className="task-description-field">
          <textarea
            id={`task-desc-${task.id}`}
            className="input task-description-input"
            placeholder="Add a description…"
            value={notes}
            maxLength={TASK_DESCRIPTION_MAX}
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
          <span className="task-description-count" aria-live="polite">
            {notes.length}/{TASK_DESCRIPTION_MAX}
          </span>
        </div>
      ) : (
        <p className="task-description-text">{task.notes}</p>
      )}
    </div>
  );
}

function TaskProperties({
  task,
  members,
  canEdit,
  onUpdate,
  assignee,
  priorityLabel,
  status,
}: Pick<TaskRowExpandedProps, "task" | "members" | "canEdit" | "onUpdate"> & {
  assignee: string | null;
  priorityLabel: string;
  status: TaskStatus;
}) {
  return (
    <dl className="task-properties">
      <TaskProperty label="Assignee" canEdit={canEdit} readValue={assignee ?? "Unassigned"}>
        <select
          className="task-property-field task-property-control"
          value={task.assigneeMemberId ?? ""}
          onChange={(e) => onUpdate(task, { assigneeMemberId: e.target.value || null })}
          aria-label="Assignee"
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </TaskProperty>

      <TaskProperty label="Priority" canEdit={canEdit} readValue={priorityLabel}>
        <select
          className="task-property-field task-property-control"
          value={task.priority}
          onChange={(e) => onUpdate(task, { priority: e.target.value as Task["priority"] })}
          aria-label="Priority"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </TaskProperty>

      <TaskProperty label="Status" canEdit={canEdit} readValue={getStatusLabel(status)}>
        <select
          className="task-property-field task-property-control"
          value={status}
          onChange={(e) => onUpdate(task, { status: e.target.value as TaskStatus })}
          aria-label="Status"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </TaskProperty>

      <TaskProperty label="Due" canEdit={canEdit} readValue={task.dueDate ?? "—"}>
        <input
          type="date"
          className="task-property-field task-property-control"
          value={task.dueDate ?? ""}
          onChange={(e) => onUpdate(task, { dueDate: e.target.value || null })}
          aria-label="Due date"
        />
      </TaskProperty>
    </dl>
  );
}

function TaskComments({
  comments,
  members,
  state,
}: Pick<TaskRowExpandedProps, "comments" | "members"> & { state: TaskRowState }) {
  const { sortedComments, comment, setComment, posting, submitComment } = state;

  return (
    <>
      {sortedComments.length > 0 ? (
        <ul className="comment-list">
          {sortedComments.map((c) => {
            const author = getMemberName(members, c.authorMemberId, "Someone") ?? "Someone";
            return (
              <li key={c.id} className="comment-item">
                <MemberAvatar name={author} className="comment-avatar" />
                <div className="comment-content">
                  <div className="comment-header">
                    <strong>{author}</strong>
                    <time>{formatDateTime(c.createdAt)}</time>
                  </div>
                  <p>{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="comment-empty">No comments yet — start the conversation.</p>
      )}

      <div className="comment-form">
        <input
          className="input input-sm"
          placeholder="Write a comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitComment()}
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={submitComment}
          disabled={posting || !comment.trim()}
        >
          {posting ? "…" : "Post"}
        </button>
      </div>
    </>
  );
}

export function TaskRowExpanded(props: TaskRowExpandedProps) {
  const { task, members, currentMemberId, canEdit, canDelete, onUpdate, onDelete, comments, state } = props;
  const { notes, setNotes, saveNotes, assignee, priorityLabel, status } = state;

  return (
    <>
      <section className="task-issue-section">
        <div className="task-issue-section-header">
          <h3 className="task-issue-section-title">Details</h3>
          <div className="task-issue-section-header-actions">
            {task.createdByMemberId ? (
              <CreatorLabel
                members={members}
                memberId={task.createdByMemberId}
                currentMemberId={currentMemberId}
                className="creator-label-compact creator-label-header"
              />
            ) : (
              <span className="task-creator-unknown">Unknown creator</span>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn btn-sm btn-danger task-delete-btn"
                onClick={() => onDelete(task.id)}
              >
                Delete task
              </button>
            )}
          </div>
        </div>
        <TaskDescription
          task={task}
          canEdit={canEdit}
          notes={notes}
          setNotes={setNotes}
          saveNotes={saveNotes}
        />
        <TaskProperties
          task={task}
          members={members}
          canEdit={canEdit}
          onUpdate={onUpdate}
          assignee={assignee}
          priorityLabel={priorityLabel}
          status={status}
        />
        <TaskExternalLinks
          task={task}
          canEdit={canEdit}
          isAddingLink={state.isAddingLink}
          draftLink={state.draftLink}
          linkError={state.linkError}
          onStartAddLink={state.startAddLink}
          onCancelAddLink={state.cancelAddLink}
          onDraftLinkChange={state.updateDraftLink}
          onSaveNewLink={state.saveNewLink}
          onRemoveSavedLink={state.removeSavedLink}
        />
      </section>
      <section className="task-issue-section task-issue-activity">
        <h3 className="task-issue-section-title">
          Activity{comments.length > 0 ? ` (${comments.length})` : ""}
        </h3>
        <TaskComments comments={comments} members={members} state={state} />
      </section>
    </>
  );
}
