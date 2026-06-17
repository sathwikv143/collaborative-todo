import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { signToken, authCookieOptions } from "./jwt";
import type { Actor } from "./auth";
import { getValidatedActorFromRequest, resolveListAccess } from "./session";

export { resolveListAccess };

export async function requireAuth(
  request: NextRequest
): Promise<{ actor: Actor } | NextResponse> {
  const actor = await getValidatedActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { actor };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T> } | NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid input", 400);
  }
  return { data: parsed.data };
}

export async function setAuthSession(response: NextResponse, actor: Actor) {
  const token = await signToken(actor);
  response.cookies.set(authCookieOptions(token, actor));
  return response;
}

export function appUrl(request?: NextRequest): string {
  if (request && process.env.NODE_ENV !== "production") {
    const origin = request.headers.get("origin");
    if (origin) {
      return origin.replace(/\/$/, "");
    }

    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    if (host) {
      return `${proto}://${host}`;
    }
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}
