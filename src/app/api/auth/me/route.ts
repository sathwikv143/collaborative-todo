import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api-helpers";
import { getBackupCodesStatus, backupCodesStatusFromCount } from "@/lib/backup-code-status";
import { formatAccountId } from "@/lib/account-id";

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
  const status = user?.accountId ? await getBackupCodesStatus(actor.id) : backupCodesStatusFromCount(0);

  return NextResponse.json({
    type: "user",
    id: actor.id,
    username: actor.username,
    name: actor.name ?? null,
    accountId: user?.accountId ? formatAccountId(user.accountId) : null,
    ...status,
  });
}
