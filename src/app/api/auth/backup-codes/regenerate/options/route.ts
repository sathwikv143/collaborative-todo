import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth, jsonError } from "@/lib/api-helpers";
import { storeChallenge } from "@/lib/auth-challenges";
import { getActivePasskeys } from "@/lib/passkeys-db";
import { createAuthenticationOptions } from "@/lib/webauthn";

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

  const credentials = await getActivePasskeys(user.id);
  if (credentials.length === 0) {
    return jsonError("No passkeys registered", 400);
  }

  const options = await createAuthenticationOptions({
    request,
    credentialIds: credentials.map((c) => c.credentialId),
    allowCredentials: credentials.map((c) => ({
      id: c.credentialId,
      transports: (c.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
  });

  const challengeId = await storeChallenge({
    challenge: options.challenge,
    flow: "backup_regenerate",
    userId: user.id,
  });

  return NextResponse.json({ challengeId, options });
}
