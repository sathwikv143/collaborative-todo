import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passkeys, users } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { BACKUP_CODE_WARN_THRESHOLD } from "@/lib/backup-codes";
import { formatAccountId } from "@/lib/account-id";
import { countUnusedBackupCodes } from "@/lib/passkeys-db";

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

  const remaining = user.accountId ? await countUnusedBackupCodes(user.id) : 0;

  return NextResponse.json({
    displayName: user.name,
    accountId: user.accountId ? formatAccountId(user.accountId) : null,
    passkeys: keys,
    backupCodesRemaining: remaining,
    backupCodesLow: remaining > 0 && remaining < BACKUP_CODE_WARN_THRESHOLD,
  });
}
