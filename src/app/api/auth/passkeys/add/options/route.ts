import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { storeChallenge } from "@/lib/auth-challenges";
import { getActivePasskeys } from "@/lib/passkeys-db";
import { createRegistrationOptions } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.actor.type === "guest") {
    return jsonError("Forbidden", 403);
  }

  const [user] = await db.select().from(users).where(eq(users.id, auth.actor.id));
  if (!user?.accountId) {
    return jsonError("Passkey accounts only", 400);
  }

  const existing = await getActivePasskeys(user.id);
  const options = await createRegistrationOptions({
    request,
    userId: user.id,
    userName: user.accountId,
    userDisplayName: user.name ?? "User",
    excludeCredentialIds: existing.map((p) => p.credentialId),
  });

  const challengeId = await storeChallenge({
    challenge: options.challenge,
    flow: "passkey_add",
    userId: user.id,
  });

  return NextResponse.json({ challengeId, options });
}
