import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passkeys } from "@/lib/db/schema";
import { requireAuth, jsonError, parseJsonBody } from "@/lib/api-helpers";
import { passkeyRevokeSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.actor.type === "guest") {
    return jsonError("Forbidden", 403);
  }

  const parsed = await parseJsonBody(request, passkeyRevokeSchema);
  if (parsed instanceof NextResponse) return parsed;

  const active = await db
    .select({ id: passkeys.id })
    .from(passkeys)
    .where(and(eq(passkeys.userId, auth.actor.id), isNull(passkeys.revokedAt)));

  const target = active.find((p) => p.id === parsed.data.passkeyId);
  if (!target) {
    return jsonError("Passkey not found", 404);
  }

  if (active.length <= 1) {
    return jsonError("Keep at least one active passkey", 400);
  }

  await db
    .update(passkeys)
    .set({ revokedAt: new Date() })
    .where(eq(passkeys.id, parsed.data.passkeyId));

  return NextResponse.json({ ok: true });
}
