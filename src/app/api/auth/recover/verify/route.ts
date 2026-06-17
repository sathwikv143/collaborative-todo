import { NextRequest, NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-helpers";
import { BACKUP_CODE_WARN_THRESHOLD } from "@/lib/backup-codes";
import { formatAccountId } from "@/lib/account-id";
import { consumeBackupCode, countUnusedBackupCodes, findUserByAccountId } from "@/lib/passkeys-db";
import {
  AUTH_RATE_LIMITS,
  enforceAccountRateLimit,
  enforceRateLimit,
} from "@/lib/rate-limit";
import { signRecoveryToken, recoveryCookieOptions } from "@/lib/recovery-token";
import { recoverVerifySchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "recover", AUTH_RATE_LIMITS.recover);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, recoverVerifySchema);
  if (parsed instanceof NextResponse) return parsed;

  const accountLimited = enforceAccountRateLimit(
    parsed.data.accountId,
    "recover",
    AUTH_RATE_LIMITS.recoverPerAccount
  );
  if (accountLimited) return accountLimited;

  const user = await findUserByAccountId(parsed.data.accountId);
  if (!user) {
    return jsonError("Invalid credentials", 401);
  }

  const ok = await consumeBackupCode(user.id, parsed.data.backupCode);
  if (!ok) {
    return jsonError("Invalid credentials", 401);
  }

  const remaining = await countUnusedBackupCodes(user.id);
  const recoveryToken = await signRecoveryToken(user.id);

  const response = NextResponse.json({
    accountId: user.accountId ? formatAccountId(user.accountId) : null,
    backupCodesRemaining: remaining,
    backupCodesLow: remaining < BACKUP_CODE_WARN_THRESHOLD,
  });
  response.cookies.set(recoveryCookieOptions(recoveryToken));
  return response;
}
