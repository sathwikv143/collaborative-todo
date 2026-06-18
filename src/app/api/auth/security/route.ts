import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passkeys, users } from "@/lib/db/schema";
import { requireAuth, jsonError, parseJsonBody, setAuthSession } from "@/lib/api-helpers";
import { getBackupCodesStatus, backupCodesStatusFromCount } from "@/lib/backup-code-status";
import { formatAccountId } from "@/lib/account-id";
import { userSessionActor } from "@/lib/passkeys-db";
import { updateDisplayNameSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.actor.type === "guest") {
    return jsonError("Guests cannot access security settings", 403);
  }

  const [user] = await db.select().from(users).where(eq(users.id, auth.actor.id));
  if (!user) {
    return jsonError("User not found", 404);
  }

  const keys = await db
    .select({
      id: passkeys.id,
      deviceLabel: passkeys.deviceLabel,
      createdAt: passkeys.createdAt,
      revokedAt: passkeys.revokedAt,
    })
    .from(passkeys)
    .where(and(eq(passkeys.userId, user.id), isNull(passkeys.revokedAt)))
    .orderBy(passkeys.createdAt);

  const status = user.accountId ? await getBackupCodesStatus(user.id) : backupCodesStatusFromCount(0);

  return NextResponse.json({
    displayName: user.name,
    accountId: user.accountId ? formatAccountId(user.accountId) : null,
    passkeys: keys,
    ...status,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.actor.type === "guest") {
    return jsonError("Guests cannot update profile", 403);
  }

  const parsed = await parseJsonBody(request, updateDisplayNameSchema);
  if (parsed instanceof NextResponse) return parsed;

  const displayName = parsed.data.displayName.trim();

  const [user] = await db
    .update(users)
    .set({ name: displayName })
    .where(eq(users.id, auth.actor.id))
    .returning();

  if (!user) {
    return jsonError("User not found", 404);
  }

  const res = NextResponse.json({ displayName: user.name });
  return setAuthSession(res, userSessionActor(user));
}
