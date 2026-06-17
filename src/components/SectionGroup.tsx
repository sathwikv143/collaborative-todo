"use client";

import { useEffect, useMemo, useState } from "react";
import { useSyncedState } from "@/hooks/useSyncedState";
import type { Comment, Member, Section, Task } from "@/lib/api-client";
import {
  canDeleteSection,
  canDeleteTask,
  canEditSection,
  canEditTask,
  canCreateContent,
} from "@/lib/permissions-client";
import { TaskRow } from "./TaskRow";
import { CreatorLabel } from "./CreatorLabel";
import { ChevronDownIcon } from "./NotificationIcons";

interface SectionGroupProps {
  section: Section;
  tasks: Task[];
  members: Member[];
  memberId: string;
  role: string;
  commentsByTask: Map<string, Comment[]>;
  hideSectionChrome?: boolean;
  onAddTask: (sectionId: string, title: string) => void;
  onUpdateSection: (section: Section, title: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onToggle: (task: Task) => void;
  onUpdate: (task: Task, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onComment: (taskId: string, body: string) => void;
}

function buildCollapsedState(taskIds: string[]) {
  return Object.fromEntries(taskIds.map((id) => [id, false]));
}

export function SectionGroup({
  section,
  tasks,
  members,
  memberId,
  role,
  commentsByTask,
  hideSectionChrome = false,
  onAddTask,
  onUpdateSection,
  onDeleteSection,
  onToggle,
  onUpdate,
  onDelete,
  onComment,
}: SectionGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingSection, setEditingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useSyncedState(section.title);
  const [tasksExpanded, setTasksExpanded] = useState<Record<string, boolean>>(() =>
    buildCollapsedState(tasks.map((t) => t.id))
  );

  const taskIds = useMemo(() => tasks.map((t) => t.id).join(","), [tasks]);

  useEffect(() => {
    const ids = taskIds.split(",").filter(Boolean);
    setTasksExpanded((prev) => {
      const next: Record<string, boolean> = {};
      for (const id of ids) {
        next[id] = prev[id] ?? false;
      }
      return next;
    });
  }, [taskIds]);

  const canManageSection = canEditSection(memberId, section);
  const canRemoveSection = canDeleteSection(memberId, section);
  const canAddTask = canCreateContent(role);

  const allTasksExpanded =
    tasks.length > 0 && tasks.every((task) => tasksExpanded[task.id] ?? false);

  function setTaskExpanded(taskId: string, expanded: boolean) {
    setTasksExpanded((prev) => ({ ...prev, [taskId]: expanded }));
  }

  function setAllTasksExpanded(expanded: boolean) {
    setTasksExpanded(Object.fromEntries(tasks.map((task) => [task.id, expanded])));
  }

  function toggleAllTasksExpanded() {
    setAllTasksExpanded(!allTasksExpanded);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    onAddTask(section.id, title);
    setNewTitle("");
  }

  function saveSectionTitle() {
    const trimmed = sectionTitle.trim();
    if (!trimmed || trimmed === section.title) {
      setSectionTitle(section.title);
      setEditingSection(false);
      return;
    }
    onUpdateSection(section, trimmed);
    setEditingSection(false);
  }

  return (
    <section className="section-group">
      {!hideSectionChrome && (
        <div className="section-header-row">
          <button
            type="button"
            className="section-header"
            onClick={() => setCollapsed((v) => !v)}
          >
            {editingSection && canManageSection ? (
              <input
                className="input input-sm section-title-input"
                value={sectionTitle}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setSectionTitle(e.target.value)}
                onBlur={saveSectionTitle}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") saveSectionTitle();
                  if (e.key === "Escape") {
                    setSectionTitle(section.title);
                    setEditingSection(false);
                  }
                }}
              />
            ) : (
              <span
                className="section-title"
                onDoubleClick={(e) => {
                  if (!canManageSection) return;
                  e.stopPropagation();
                  setEditingSection(true);
                }}
              >
                {section.title}
              </span>
            )}
            <span className="section-header-meta">
              <CreatorLabel
                members={members}
                memberId={section.createdByMemberId}
                currentMemberId={memberId}
                className="creator-label-compact"
              />
              <span className="section-count">{tasks.length}</span>
            </span>
          </button>

          {(tasks.length > 0 || (canManageSection && !editingSection)) && (
            <div className="section-header-actions">
              {tasks.length > 0 && (
                <button
                  type="button"
                  className={`section-tasks-toggle${allTasksExpanded ? " expanded" : ""}`}
                  onClick={toggleAllTasksExpanded}
                  aria-label={allTasksExpanded ? "Collapse all tasks" : "Expand all tasks"}
                  title={allTasksExpanded ? "Collapse all tasks" : "Expand all tasks"}
                >
                  <ChevronDownIcon />
                </button>
              )}
              {canManageSection && !editingSection && (
                <>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setEditingSection(true)}
                    aria-label="Rename section"
                  >
                    ✎
                  </button>
                  {canRemoveSection && (
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => onDeleteSection(section.id)}
                      aria-label="Delete section"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {(!collapsed || hideSectionChrome) && (
        <div className="section-body">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              comments={commentsByTask.get(task.id) ?? []}
              currentMemberId={memberId}
              canEdit={canEditTask(memberId, task)}
              canDelete={canDeleteTask(memberId, task)}
              expanded={tasksExpanded[task.id] ?? false}
              onExpandedChange={(expanded) => setTaskExpanded(task.id, expanded)}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onComment={onComment}
            />
          ))}

          {canAddTask && !hideSectionChrome && (
            <form className="quick-add" onSubmit={handleAdd}>
              <input
                className="input"
                placeholder="Add a task…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </form>
          )}
        </div>
      )}
    </section>
  );
}
