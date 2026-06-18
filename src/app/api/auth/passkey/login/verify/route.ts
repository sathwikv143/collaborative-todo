import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { passkeys, users } from "@/lib/db/schema";
import { jsonError, parseJsonBody, setAuthSession } from "@/lib/api-helpers";
import { getBackupCodesStatus } from "@/lib/backup-code-status";
import { consumeChallenge } from "@/lib/auth-challenges";
import {
  findUserByAccountId,
  getPasskeyByCredentialId,
  userSessionActor,
} from "@/lib/passkeys-db";
import {
  AUTH_RATE_LIMITS,
  enforceAccountRateLimit,
  enforceRateLimit,
} from "@/lib/rate-limit";
import { passkeyLoginVerifySchema } from "@/lib/schemas";
import { extractAuthenticationChallenge, verifyAuthentication } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "passkey-login", AUTH_RATE_LIMITS.passkeyLogin);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, passkeyLoginVerifySchema);
  if (parsed instanceof NextResponse) return parsed;

  const accountLimited = enforceAccountRateLimit(
    parsed.data.accountId,
    "passkey-login",
    AUTH_RATE_LIMITS.passkeyLoginPerAccount
  );
  if (accountLimited) return accountLimited;

  const user = await findUserByAccountId(parsed.data.accountId);
  if (!user) {
    return jsonError("Invalid credentials", 401);
  }

  const response = parsed.data.response as unknown as AuthenticationResponseJSON;
  const challengeValue = extractAuthenticationChallenge(response);
  if (!challengeValue) {
    return jsonError("Invalid passkey response", 400);
  }

  const challenge = await consumeChallenge(
    parsed.data.challengeId,
    "passkey_login",
    challengeValue
  );
  if (!challenge || challenge.userId !== user.id) {
    return jsonError("Sign-in expired — try again", 400);
  }

  const credential = await getPasskeyByCredentialId(response.id);
  if (!credential || credential.userId !== user.id) {
    return jsonError("Invalid credentials", 401);
  }

  const verification = await verifyAuthentication({
    request,
    response,
    expectedChallenge: challenge.challenge,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: (credential.transports as never) ?? undefined,
    },
  });

  if (!verification.verified) {
    return jsonError("Invalid credentials", 401);
  }

  await db
    .update(passkeys)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeys.id, credential.id));

  const status = await getBackupCodesStatus(user.id);
  const session = userSessionActor(user);
  const res = NextResponse.json({
    displayName: user.name,
    ...status,
  });
  return setAuthSession(res, session);
}
