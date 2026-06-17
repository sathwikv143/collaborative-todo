import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api-helpers";
import { BACKUP_CODE_WARN_THRESHOLD } from "@/lib/backup-codes";
import { formatAccountId } from "@/lib/account-id";
import { countUnusedBackupCodes } from "@/lib/passkeys-db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { actor } = auth;
  if (actor.type === "guest") {
    return NextResponse.json({
      type: "guest",
      id: actor.id,
      name: actor.name,
      listId: actor.listId,
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, actor.id));
  const remaining = user?.accountId ? await countUnusedBackupCodes(actor.id) : 0;

  return NextResponse.json({
    type: "user",
    id: actor.id,
    username: actor.username,
    name: actor.name ?? null,
    accountId: user?.accountId ? formatAccountId(user.accountId) : null,
    backupCodesRemaining: remaining,
    backupCodesLow: remaining > 0 && remaining < BACKUP_CODE_WARN_THRESHOLD,
  });
}
