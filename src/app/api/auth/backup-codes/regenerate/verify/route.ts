import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { backupCodes, passkeys } from "@/lib/db/schema";
import { requireAuth, jsonError, parseJsonBody } from "@/lib/api-helpers";
import {
  BACKUP_CODE_COUNT,
  BACKUP_CODE_WARN_THRESHOLD,
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/backup-codes";
import { consumeChallenge } from "@/lib/auth-challenges";
import { getPasskeyByCredentialId } from "@/lib/passkeys-db";
import { backupRegenerateVerifySchema } from "@/lib/schemas";
import { extractAuthenticationChallenge, verifyAuthentication } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.actor.type === "guest") {
    return jsonError("Forbidden", 403);
  }

  const parsed = await parseJsonBody(request, backupRegenerateVerifySchema);
  if (parsed instanceof NextResponse) return parsed;

  const response = parsed.data.response as unknown as AuthenticationResponseJSON;
  const challengeValue = extractAuthenticationChallenge(response);
  if (!challengeValue) {
    return jsonError("Invalid passkey response", 400);
  }

  const challenge = await consumeChallenge(
    parsed.data.challengeId,
    "backup_regenerate",
    challengeValue
  );
  if (!challenge || challenge.userId !== auth.actor.id) {
    return jsonError("Request expired — try again", 400);
  }

  const credential = await getPasskeyByCredentialId(response.id);
  if (!credential || credential.userId !== auth.actor.id) {
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
    return jsonError("Passkey verification failed", 401);
  }

  await db
    .update(passkeys)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeys.id, credential.id));

  await db.delete(backupCodes).where(eq(backupCodes.userId, auth.actor.id));

  const codes = generateBackupCodes(BACKUP_CODE_COUNT);
  for (const code of codes) {
    await db.insert(backupCodes).values({
      userId: auth.actor.id,
      codeHash: await hashBackupCode(code),
    });
  }

  return NextResponse.json({
    backupCodes: codes,
    backupCodesRemaining: codes.length,
    backupCodesLow: codes.length < BACKUP_CODE_WARN_THRESHOLD,
  });
}
