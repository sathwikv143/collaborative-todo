"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { SharePanel } from "./SharePanel";
import { MemberChips } from "./MemberChips";
import { CreatorLabel } from "./CreatorLabel";
import { NotificationPanel } from "./NotificationPanel";
import type { Member } from "@/lib/api-client";
import type { UserNotification } from "@/lib/notifications";
import { canCreateContent } from "@/lib/permissions-client";

export type FilterId = "all" | "mine" | "today" | "done";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All open" },
  { id: "mine", label: "Assigned to me" },
  { id: "today", label: "Due today" },
  { id: "done", label: "Completed" },
];

interface ListStats {
  open: number;
  done: number;
  dueToday: number;
  total: number;
}

interface ListShellProps {
  listTitle: string;
  listId: string;
  role?: string;
  isListOwner?: boolean;
  listCreatorName?: string;
  members: Member[];
  stats?: ListStats;
  filter: FilterId;
  onFilterChange: (filter: FilterId) => void;
  onDelete?: () => void;
  onAddSection?: () => void;
  notifications?: UserNotification[];
  children: React.ReactNode;
}

export function ListShell({
  listTitle,
  listId,
  role,
  isListOwner,
  listCreatorName,
  members,
  stats,
  filter,
  onFilterChange,
  onDelete,
  onAddSection,
  notifications = [],
  children,
}: ListShellProps) {
  const canEdit = role ? canCreateContent(role) : false;
  const progress = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="list-layout">
      <header className="list-header">
        <div className="list-header-top">
          <Link href="/lists" className="back-link">
            ← All lists
          </Link>
          <div className="list-header-actions">
            <NotificationPanel notifications={notifications} />
            <ThemeToggle />
            <SharePanel listId={listId} isListOwner={isListOwner} />
          </div>
        </div>

        <div className="list-hero">
          <div>
            <p className="list-kicker">Shared list</p>
            <h1 className="list-title">{listTitle}</h1>
            {listCreatorName && (
              <CreatorLabel
                name={listCreatorName}
                displayAsYou={isListOwner}
                className="creator-label-list"
              />
            )}
            <MemberChips members={members} />
          </div>

          {stats && stats.total > 0 && (
            <div className="list-progress" aria-label={`${progress}% complete`}>
              <svg viewBox="0 0 36 36" className="progress-ring">
                <path
                  className="progress-ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-ring-fill"
                  strokeDasharray={`${progress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="progress-label">{progress}%</span>
            </div>
          )}
        </div>

        {stats && (
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-value">{stats.open}</span>
              <span className="stat-label">Open</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.dueToday}</span>
              <span className="stat-label">Due today</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.done}</span>
              <span className="stat-label">Done</span>
            </div>
          </div>
        )}

        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-chip${filter === f.id ? " active" : ""}`}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
          {canEdit && onAddSection && (
            <button type="button" className="filter-chip filter-chip-add" onClick={onAddSection}>
              + Section
            </button>
          )}
        </div>
      </header>

      <div className="list-content">
        <main className="list-main">{children}</main>
      </div>

      {onDelete && isListOwner && (
        <div className="danger-zone">
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Delete list
          </button>
        </div>
      )}
    </div>
  );
}
