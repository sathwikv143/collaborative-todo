import { NextRequest, NextResponse } from "next/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { jsonError, parseJsonBody } from "@/lib/api-helpers";
import { storeChallenge } from "@/lib/auth-challenges";
import { findUserByAccountId, getActivePasskeys } from "@/lib/passkeys-db";
import {
  AUTH_RATE_LIMITS,
  enforceAccountRateLimit,
  enforceRateLimit,
} from "@/lib/rate-limit";
import { passkeyLoginOptionsSchema } from "@/lib/schemas";
import { createAuthenticationOptions } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "passkey-login", AUTH_RATE_LIMITS.passkeyLogin);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, passkeyLoginOptionsSchema);
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

  const credentials = await getActivePasskeys(user.id);
  if (credentials.length === 0) {
    return jsonError("Invalid credentials", 401);
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
    flow: "passkey_login",
    userId: user.id,
  });

  return NextResponse.json({ challengeId, options });
}
