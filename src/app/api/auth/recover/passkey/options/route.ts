import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonError } from "@/lib/api-helpers";
import { storeChallenge } from "@/lib/auth-challenges";
import { requireRecoveryUserId } from "@/lib/recover-session";
import { getActivePasskeys } from "@/lib/passkeys-db";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { createRegistrationOptions } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "recover", AUTH_RATE_LIMITS.recover);
  if (limited) return limited;

  const userId = await requireRecoveryUserId(request);
  if (userId instanceof NextResponse) return userId;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return jsonError("Account not found", 404);
  }

  const existing = await getActivePasskeys(user.id);

  const options = await createRegistrationOptions({
    request,
    userId: user.id,
    userName: user.accountId ?? user.id,
    userDisplayName: user.name ?? "User",
    excludeCredentialIds: existing.map((p) => p.credentialId),
  });

  const challengeId = await storeChallenge({
    challenge: options.challenge,
    flow: "passkey_recover",
    userId: user.id,
  });

  return NextResponse.json({ challengeId, options });
}
