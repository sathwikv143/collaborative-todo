import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { backupCodes, users } from "@/lib/db/schema";
import { jsonError, parseJsonBody, setAuthSession } from "@/lib/api-helpers";
import { consumeChallenge } from "@/lib/auth-challenges";
import {
  BACKUP_CODE_COUNT,
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/backup-codes";
import { formatAccountId } from "@/lib/account-id";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { passkeyRegisterVerifySchema } from "@/lib/schemas";
import { insertPasskeyFromRegistration, userSessionActor } from "@/lib/passkeys-db";
import { extractRegistrationChallenge, verifyRegistration } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "passkey-register", AUTH_RATE_LIMITS.passkeyRegister);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, passkeyRegisterVerifySchema);
  if (parsed instanceof NextResponse) return parsed;

  const response = parsed.data.response as unknown as RegistrationResponseJSON;
  const challengeValue = extractRegistrationChallenge(response);
  if (!challengeValue) {
    return jsonError("Invalid passkey response", 400);
  }

  const challenge = await consumeChallenge(
    parsed.data.challengeId,
    "passkey_register",
    challengeValue
  );
  if (!challenge?.userId) {
    return jsonError("Registration expired — try again", 400);
  }

  const verification = await verifyRegistration({
    request,
    response,
    expectedChallenge: challenge.challenge,
  });

  if (!verification.verified || !verification.registrationInfo) {
    await db.delete(users).where(eq(users.id, challenge.userId));
    return jsonError("Passkey verification failed", 400);
  }

  await insertPasskeyFromRegistration({
    userId: challenge.userId,
    credential: verification.registrationInfo.credential,
    deviceLabel: "Primary passkey",
  });

  const codes = generateBackupCodes(BACKUP_CODE_COUNT);
  for (const code of codes) {
    await db.insert(backupCodes).values({
      userId: challenge.userId,
      codeHash: await hashBackupCode(code),
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, challenge.userId));
  if (!user?.accountId) {
    return jsonError("Account setup failed", 500);
  }

  const session = userSessionActor(user);
  const res = NextResponse.json({
    accountId: formatAccountId(user.accountId),
    displayName: user.name,
    backupCodes: codes,
    backupCodesRemaining: codes.length,
    backupCodesLow: false,
  });
  return setAuthSession(res, session);
}
