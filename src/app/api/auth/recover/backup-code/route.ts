import { NextRequest, NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-helpers";
import { getBackupCodesStatus } from "@/lib/backup-code-status";
import { formatAccountId } from "@/lib/account-id";
import { resolveBackupCode } from "@/lib/passkeys-db";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { signRecoveryToken, recoveryCookieOptions } from "@/lib/recovery-token";
import { recoverBackupCodeSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, recoverBackupCodeSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { backupCode, consume } = parsed.data;
  const rateLimit = consume ? AUTH_RATE_LIMITS.recover : AUTH_RATE_LIMITS.recoverAccountId;
  const scope = consume ? "recover" : "recover-account-id";
  const limited = enforceRateLimit(request, scope, rateLimit);
  if (limited) return limited;

  const resolved = await resolveBackupCode(backupCode, { consume });
  if (!resolved) {
    return jsonError("Invalid credentials", 401);
  }

  const payload: {
    accountId: string;
    backupCodesRemaining?: number;
    backupCodesLow?: boolean;
  } = {
    accountId: formatAccountId(resolved.accountId),
  };

  if (consume) {
    const status = await getBackupCodesStatus(resolved.userId);
    payload.backupCodesRemaining = status.backupCodesRemaining;
    payload.backupCodesLow = status.backupCodesLow;

    const response = NextResponse.json(payload);
    const recoveryToken = await signRecoveryToken(resolved.userId);
    response.cookies.set(recoveryCookieOptions(recoveryToken));
    return response;
  }

  return NextResponse.json(payload);
}
