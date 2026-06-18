import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "./api-helpers";
import { RECOVERY_COOKIE, verifyRecoveryToken } from "./recovery-token";

export async function requireRecoveryUserId(
  request: NextRequest
): Promise<string | NextResponse> {
  const recoveryToken = request.cookies.get(RECOVERY_COOKIE)?.value;
  if (!recoveryToken) {
    return jsonError("Recovery session expired", 401);
  }

  const userId = await verifyRecoveryToken(recoveryToken);
  if (!userId) {
    return jsonError("Recovery session expired", 401);
  }

  return userId;
}
