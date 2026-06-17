import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonError, parseJsonBody } from "@/lib/api-helpers";
import { generateAccountId, formatAccountId } from "@/lib/account-id";
import { storeChallenge } from "@/lib/auth-challenges";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { passkeyRegisterOptionsSchema } from "@/lib/schemas";
import { createRegistrationOptions } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "passkey-register", AUTH_RATE_LIMITS.passkeyRegister);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, passkeyRegisterOptionsSchema);
  if (parsed instanceof NextResponse) return parsed;

  const accountId = generateAccountId();
  const displayName = parsed.data.displayName.trim();

  const [user] = await db
    .insert(users)
    .values({
      accountId,
      name: displayName,
    })
    .returning();

  const options = await createRegistrationOptions({
    request,
    userId: user.id,
    userName: accountId,
    userDisplayName: displayName,
  });

  const challengeId = await storeChallenge({
    challenge: options.challenge,
    flow: "passkey_register",
    userId: user.id,
    metadata: { accountId },
  });

  return NextResponse.json({
    challengeId,
    accountId: formatAccountId(accountId),
    options,
  });
}
