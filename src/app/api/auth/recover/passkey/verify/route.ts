import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonError, parseJsonBody, setAuthSession } from "@/lib/api-helpers";
import { getBackupCodesStatus } from "@/lib/backup-code-status";
import { consumeChallenge } from "@/lib/auth-challenges";
import { requireRecoveryUserId } from "@/lib/recover-session";
import { insertPasskeyFromRegistration, userSessionActor } from "@/lib/passkeys-db";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { clearRecoveryCookie } from "@/lib/recovery-token";
import { recoverPasskeyVerifySchema } from "@/lib/schemas";
import { extractRegistrationChallenge, verifyRegistration } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "recover", AUTH_RATE_LIMITS.recover);
  if (limited) return limited;

  const userId = await requireRecoveryUserId(request);
  if (userId instanceof NextResponse) return userId;

  const parsed = await parseJsonBody(request, recoverPasskeyVerifySchema);
  if (parsed instanceof NextResponse) return parsed;

  const response = parsed.data.response as unknown as RegistrationResponseJSON;
  const challengeValue = extractRegistrationChallenge(response);
  if (!challengeValue) {
    return jsonError("Invalid passkey response", 400);
  }

  const challenge = await consumeChallenge(
    parsed.data.challengeId,
    "passkey_recover",
    challengeValue
  );
  if (!challenge || challenge.userId !== userId) {
    return jsonError("Recovery expired — try again", 400);
  }

  const verification = await verifyRegistration({
    request,
    response,
    expectedChallenge: challenge.challenge,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return jsonError("Passkey verification failed", 400);
  }

  await insertPasskeyFromRegistration({
    userId,
    credential: verification.registrationInfo.credential,
    deviceLabel: "Recovery passkey",
  });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return jsonError("Account not found", 404);
  }

  const session = userSessionActor(user);
  const status = await getBackupCodesStatus(userId);
  const res = NextResponse.json({
    displayName: user.name,
    ...status,
  });
  res.cookies.set(clearRecoveryCookie());
  return setAuthSession(res, session);
}
