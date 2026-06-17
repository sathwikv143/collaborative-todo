type SsePayload = { type: string; section?: string; data?: unknown; event?: unknown };

type Subscriber = {
  send: (data: string) => void;
  close: () => void;
};

type SseGlobal = {
  channels: Map<string, Set<Subscriber>>;
};

const globalKey = Symbol.for("collaborative-todo.sse");

function getStore(): SseGlobal {
  const g = globalThis as typeof globalThis & { [globalKey]?: SseGlobal };
  if (!g[globalKey]) {
    g[globalKey] = { channels: new Map() };
  }
  return g[globalKey];
}

export function subscribeList(listId: string, subscriber: Subscriber): () => void {
  const { channels } = getStore();
  let set = channels.get(listId);
  if (!set) {
    set = new Set();
    channels.set(listId, set);
  }
  set.add(subscriber);
  return () => {
    set!.delete(subscriber);
    if (set!.size === 0) {
      channels.delete(listId);
    }
  };
}

export function emitListUpdate(listId: string, payload: SsePayload) {
  const set = getStore().channels.get(listId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const sub of set) {
    try {
      sub.send(data);
    } catch {
      sub.close();
      set.delete(sub);
    }
  }
}
