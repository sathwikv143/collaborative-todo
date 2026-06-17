import { NextRequest } from "next/server";
import { getValidatedActorFromRequest } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { subscribeList } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import type { ListIdParams } from "@/lib/api-types";

export async function GET(request: NextRequest, { params }: ListIdParams) {
  const { id: listId } = await params;
  const actor = await getValidatedActorFromRequest(request);
  if (!actor) {
    return new Response("Unauthorized", { status: 401 });
  }

  const membership = await getMembership(listId, actor);
  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (data: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send(JSON.stringify({ type: "connected" }));

      const unsubscribe = subscribeList(listId, { send, close });

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
