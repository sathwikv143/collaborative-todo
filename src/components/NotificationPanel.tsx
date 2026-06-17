"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { UserNotification } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/format-date";
import { BellIcon, NotificationActionIcon } from "./NotificationIcons";

export function NotificationPanel({ notifications }: { notifications: UserNotification[] }) {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [menuLayout, setMenuLayout] = useState<{ top: number; maxHeight: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const unread = notifications.filter((n) => !seenIds.has(n.id));

  useEffect(() => {
    if (!open) return;

    setSeenIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      return next;
    });
  }, [open, notifications]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuLayout(null);
      return;
    }

    function updateMenuLayout() {
      if (!bellRef.current) return;

      const mobile = window.matchMedia("(max-width: 720px)").matches;
      if (!mobile) {
        setMenuLayout(null);
        return;
      }

      const rect = bellRef.current.getBoundingClientRect();
      const inset = 12;
      const top = rect.bottom + 8;
      const maxHeight = Math.max(160, window.innerHeight - top - inset);
      setMenuLayout({ top, maxHeight });
    }

    updateMenuLayout();
    window.addEventListener("resize", updateMenuLayout);
    window.addEventListener("scroll", updateMenuLayout, true);
    return () => {
      window.removeEventListener("resize", updateMenuLayout);
      window.removeEventListener("scroll", updateMenuLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="notification-panel" ref={panelRef}>
      <button
        ref={bellRef}
        type="button"
        className={`icon-btn notification-bell${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
      >
        <span className="notification-bell-icon" aria-hidden>
          <BellIcon />
        </span>
        {unread.length > 0 && (
          <span className="notification-badge">{unread.length > 9 ? "9+" : unread.length}</span>
        )}
      </button>

      {open && (
        <>
          {menuLayout && (
            <button
              type="button"
              className="notification-backdrop"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            />
          )}
          <div
            className={`notification-dropdown${menuLayout ? " notification-dropdown-fixed" : ""}`}
            style={
              menuLayout
                ? { top: menuLayout.top, maxHeight: menuLayout.maxHeight }
                : undefined
            }
          >
          <div className="notification-dropdown-header">
            <h2 className="notification-dropdown-title">Notifications</h2>
            <span className="notification-dropdown-subtitle">For you only</span>
          </div>

          {notifications.length === 0 ? (
            <p className="notification-empty">Nothing new related to your tasks.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notification-item${seenIds.has(n.id) ? "" : " unread"}`}
                >
                  <span className="notification-icon">
                    <NotificationActionIcon action={n.action} />
                  </span>
                  <div className="notification-body">
                    <p className="notification-text">
                      <strong>{n.actorName}</strong> — {n.summary}
                    </p>
                    <time className="notification-time">{formatRelativeTime(n.createdAt)}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </>
      )}
    </div>
  );
}
