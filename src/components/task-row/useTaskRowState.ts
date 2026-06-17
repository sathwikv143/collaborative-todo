"use client";

import { useEffect, useState } from "react";
import type { Comment, Task } from "@/lib/api-client";
import { useSyncedState } from "@/hooks/useSyncedState";
import { getMemberName } from "@/lib/member-display";
import { getPriorityLabel } from "@/lib/task-priority";
import { normalizeTaskStatus } from "@/lib/task-status";
import type { TaskRowProps } from "./types";
import {
  buildExternalLinkFromDraft,
  EMPTY_DRAFT_LINK,
  type DraftExternalLink,
} from "./task-external-links-state";
import { MAX_EXTERNAL_LINKS } from "@/lib/external-links";

export const TASK_DESCRIPTION_MAX = 1200;

export function useTaskRowState({
  task,
  members,
  comments,
  currentMemberId,
  canEdit,
  onUpdate,
  onComment,
}: Pick<
  TaskRowProps,
  "task" | "members" | "comments" | "currentMemberId" | "canEdit" | "onUpdate" | "onComment"
>) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useSyncedState(task.title);
  const [notes, setNotes] = useSyncedState(task.notes ?? "");
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [draftLink, setDraftLink] = useState<DraftExternalLink>(EMPTY_DRAFT_LINK);
  const [linkError, setLinkError] = useState<string | null>(null);

  function resetLinkComposer() {
    setIsAddingLink(false);
    setDraftLink(EMPTY_DRAFT_LINK);
    setLinkError(null);
  }

  useEffect(() => {
    resetLinkComposer();
  }, [task.id, task.externalLinks]);

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    onUpdate(task, { title: trimmed });
    setEditing(false);
  }

  function saveNotes() {
    const trimmed = notes.trim();
    const next = trimmed || null;
    if (next === (task.notes ?? null)) return;
    onUpdate(task, { notes: next });
  }

  function startAddLink() {
    const savedCount = task.externalLinks?.length ?? 0;
    if (savedCount >= MAX_EXTERNAL_LINKS) return;
    setDraftLink(EMPTY_DRAFT_LINK);
    setLinkError(null);
    setIsAddingLink(true);
  }

  function cancelAddLink() {
    resetLinkComposer();
  }

  function updateDraftLink(patch: Partial<DraftExternalLink>) {
    setDraftLink((current) => ({ ...current, ...patch }));
    if (linkError) setLinkError(null);
  }

  function saveNewLink() {
    try {
      const nextLink = buildExternalLinkFromDraft(draftLink);
      const externalLinks = [...(task.externalLinks ?? []), nextLink];
      onUpdate(task, { externalLinks });
      resetLinkComposer();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Invalid link");
    }
  }

  function removeSavedLink(index: number) {
    const externalLinks = (task.externalLinks ?? []).filter((_, i) => i !== index);
    onUpdate(task, { externalLinks });
    setLinkError(null);
  }

  async function submitComment() {
    const body = comment.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      await onComment(task.id, body);
      setComment("");
    } finally {
      setPosting(false);
    }
  }

  const assignee = getMemberName(members, task.assigneeMemberId);
  const creator = getMemberName(members, task.createdByMemberId);
  const creatorLabel =
    task.createdByMemberId && task.createdByMemberId === currentMemberId
      ? "you"
      : creator ?? "someone";
  const status = normalizeTaskStatus(task.status);
  const priorityLabel = getPriorityLabel(task.priority);
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const issueSubtitleParts = [
    `opened by ${creatorLabel}`,
    task.dueDate ? `due ${task.dueDate}` : null,
    assignee ? `assigned to ${assignee}` : null,
  ].filter(Boolean);

  return {
    editing,
    setEditing,
    title,
    setTitle,
    notes,
    setNotes,
    comment,
    setComment,
    posting,
    isAddingLink,
    draftLink,
    linkError,
    assignee,
    creatorLabel,
    status,
    priorityLabel,
    sortedComments,
    issueSubtitle: issueSubtitleParts.join(" · "),
    saveTitle,
    saveNotes,
    startAddLink,
    cancelAddLink,
    updateDraftLink,
    saveNewLink,
    removeSavedLink,
    submitComment,
  };
}

export type TaskRowState = ReturnType<typeof useTaskRowState>;
