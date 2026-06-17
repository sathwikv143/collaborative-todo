"use client";

import { useEffect, useRef } from "react";

type SyncHandler = (payload: {
  type: string;
  section?: string;
  data?: unknown;
  event?: unknown;
}) => void;

export function useListSync(listId: string | null, onUpdate: SyncHandler) {
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;

  useEffect(() => {
    if (!listId) return;

    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      source = new EventSource(`/api/lists/${listId}/events`, {
        withCredentials: true,
      });

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "connected") return;
          handlerRef.current(payload);
        } catch {
          /* ignore malformed payloads */
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (!cancelled) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [listId]);
}
