"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListShell, type FilterId } from "@/components/ListShell";
import { SectionGroup } from "@/components/SectionGroup";
import { api, getErrorMessage, type Comment, type ListData, type Section, type Task } from "@/lib/api-client";
import { getUserNotifications } from "@/lib/notifications";
import { isActiveStatus, isDoneStatus } from "@/lib/task-status";
import { todayIso } from "@/lib/format-date";
import { canCreateContent } from "@/lib/permissions-client";
import { useListSync } from "@/lib/sse";

function filterTasks(tasks: Task[], filter: FilterId, memberId: string) {
  switch (filter) {
    case "mine":
      return tasks.filter((t) => t.assigneeMemberId === memberId && isActiveStatus(t.status));
    case "today":
      return tasks.filter((t) => t.dueDate === todayIso() && isActiveStatus(t.status));
    case "done":
      return tasks.filter((t) => isDoneStatus(t.status));
    default:
      return tasks.filter((t) => isActiveStatus(t.status));
  }
}

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [listId, setListId] = useState<string | null>(null);
  const [listTitle, setListTitle] = useState("");
  const [listCreatorName, setListCreatorName] = useState("");
  const [isListOwner, setIsListOwner] = useState(false);
  const [role, setRole] = useState<string>("viewer");
  const [memberId, setMemberId] = useState("");
  const [data, setData] = useState<ListData | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async (id: string) => {
    const [meta, snapshot] = await Promise.all([api.getList(id), api.getListData(id)]);
    setListTitle(meta.title);
    setRole(meta.role);
    setIsListOwner(meta.isListOwner);
    setListCreatorName(meta.creatorName);
    setMemberId(snapshot.memberId);
    setData(snapshot);
  }, []);

  useEffect(() => {
    params.then(({ id }) => {
      setListId(id);
      loadData(id)
        .catch((err) => {
          setError(getErrorMessage(err, "Could not load list"));
          router.replace("/login");
        })
        .finally(() => setLoading(false));
    });
  }, [params, loadData, router]);

  useListSync(listId, (payload) => {
    if (!listId) return;
    if (payload.type === "sync") {
      loadData(listId).catch(() => undefined);
      return;
    }
    if (payload.type === "feed" && payload.event) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              events: [payload.event as ListData["events"][0], ...prev.events].slice(0, 50),
            }
          : prev
      );
    }
  });


  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return filterTasks(data.tasks, filter, memberId);
  }, [data, filter, memberId]);

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const section of data?.sections ?? []) {
      map.set(section.id, []);
    }
    for (const task of filteredTasks) {
      const list = map.get(task.sectionId);
      if (list) list.push(task);
      else map.set(task.sectionId, [task]);
    }
    for (const [, tasks] of map) {
      tasks.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [data, filteredTasks]);

  const commentsByTask = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of data?.comments ?? []) {
      const list = map.get(c.taskId) ?? [];
      list.push(c);
      map.set(c.taskId, list);
    }
    return map;
  }, [data?.comments]);

  const stats = useMemo(() => {
    const all = data?.tasks ?? [];
    const done = all.filter((t) => isDoneStatus(t.status)).length;
    const open = all.length - done;
    const dueToday = all.filter(
      (t) => t.dueDate === todayIso() && isActiveStatus(t.status)
    ).length;
    return { open, done, dueToday, total: all.length };
  }, [data?.tasks]);

  const notifications = useMemo(() => {
    if (!data || !memberId) return [];
    return getUserNotifications(
      data.events,
      memberId,
      data.tasks,
      data.comments,
      data.members
    );
  }, [data, memberId]);

  async function handleAddTask(sectionId: string, title: string) {
    if (!listId) return;
    await api.createTask(listId, { sectionId, title });
    await loadData(listId);
  }

  async function handleToggle(task: Task) {
    if (!listId) return;
    await api.updateTask(listId, {
      id: task.id,
      status: isDoneStatus(task.status) ? "todo" : "done",
    });
    await loadData(listId);
  }

  async function handleUpdate(task: Task, patch: Partial<Task>) {
    if (!listId) return;
    await api.updateTask(listId, { id: task.id, ...patch });
    await loadData(listId);
  }

  async function handleDelete(taskId: string) {
    if (!listId || !confirm("Delete this task?")) return;
    await api.deleteTask(listId, taskId);
    await loadData(listId);
  }

  async function handleComment(taskId: string, body: string) {
    if (!listId) return;
    await api.addComment(listId, taskId, body);
    await loadData(listId);
  }

  async function handleAddSection() {
    if (!listId) return;
    const title = prompt("Section name");
    if (!title?.trim()) return;
    await api.createSection(listId, title.trim());
    await loadData(listId);
  }

  async function handleUpdateSection(section: Section, title: string) {
    if (!listId) return;
    await api.updateSection(listId, { id: section.id, title });
    await loadData(listId);
  }

  async function handleDeleteSection(sectionId: string) {
    if (!listId || !confirm("Delete this section? It must be empty first.")) return;
    try {
      await api.deleteSection(listId, sectionId);
      await loadData(listId);
    } catch (err) {
      alert(getErrorMessage(err, "Could not delete section"));
    }
  }

  async function handleDeleteList() {
    if (!listId || !confirm("Delete this list permanently?")) return;
    await api.deleteList(listId);
    router.push("/lists");
  }

  if (loading || !data || !listId) {
    return (
      <main className="page-center">
        <p className="page-subtitle">{error || "Loading…"}</p>
      </main>
    );
  }

  const canCreate = canCreateContent(role);

  return (
    <ListShell
      listTitle={listTitle}
      listId={listId}
      role={role}
      isListOwner={isListOwner}
      listCreatorName={listCreatorName}
      members={data.members}
      stats={stats}
      filter={filter}
      onFilterChange={setFilter}
      onDelete={isListOwner ? handleDeleteList : undefined}
      onAddSection={canCreate ? handleAddSection : undefined}
      notifications={notifications}
    >
      {filter === "done" ? (
        filteredTasks.length === 0 ? (
          <p className="muted-text">No completed tasks.</p>
        ) : (
          <SectionGroup
            section={{
              id: "done",
              title: "Completed",
              sortOrder: 0,
              listId,
              createdByMemberId: null,
            }}
            tasks={filteredTasks}
            members={data.members}
            memberId={memberId}
            role={role}
            commentsByTask={commentsByTask}
            hideSectionChrome
            onAddTask={handleAddTask}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onComment={handleComment}
          />
        )
      ) : (
        data.sections.map((section) => {
          const tasks = tasksBySection.get(section.id) ?? [];
          if (tasks.length === 0 && filter !== "all") return null;
          return (
            <SectionGroup
              key={section.id}
              section={section}
              tasks={tasks}
              members={data.members}
              memberId={memberId}
              role={role}
              commentsByTask={commentsByTask}
              onAddTask={handleAddTask}
              onUpdateSection={handleUpdateSection}
              onDeleteSection={handleDeleteSection}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onComment={handleComment}
            />
          );
        })
      )}
    </ListShell>
  );
}
