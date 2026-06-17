import { db } from "./db";
import { listEvents } from "./db/schema";
import { emitListUpdate } from "./events";

export async function logListEvent(opts: {
  listId: string;
  actorMemberId?: string;
  action: string;
  itemType?: string;
  itemId?: string;
  summary: string;
}) {
  const [event] = await db
    .insert(listEvents)
    .values({
      listId: opts.listId,
      actorMemberId: opts.actorMemberId ?? null,
      action: opts.action,
      itemType: opts.itemType ?? null,
      itemId: opts.itemId ?? null,
      summary: opts.summary,
    })
    .returning();

  emitListUpdate(opts.listId, { type: "feed", event });
  return event;
}

export function emitSyncUpdate(listId: string, section?: string, data?: unknown) {
  emitListUpdate(listId, { type: "sync", section, data });
}
