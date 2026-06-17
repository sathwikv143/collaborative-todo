import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireAuth, jsonError, parseJsonBody } from "@/lib/api-helpers";
import { consumeChallenge } from "@/lib/auth-challenges";
import { insertPasskeyFromRegistration } from "@/lib/passkeys-db";
import { passkeyAddVerifySchema } from "@/lib/schemas";
import { extractRegistrationChallenge, verifyRegistration } from "@/lib/webauthn";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.actor.type === "guest") {
    return jsonError("Forbidden", 403);
  }

  const parsed = await parseJsonBody(request, passkeyAddVerifySchema);
  if (parsed instanceof NextResponse) return parsed;

  const response = parsed.data.response as unknown as RegistrationResponseJSON;
  const challengeValue = extractRegistrationChallenge(response);
  if (!challengeValue) {
    return jsonError("Invalid passkey response", 400);
  }

  const challenge = await consumeChallenge(
    parsed.data.challengeId,
    "passkey_add",
    challengeValue
  );
  if (!challenge || challenge.userId !== auth.actor.id) {
    return jsonError("Request expired — try again", 400);
  }

  const verification = await verifyRegistration({
    request,
    response,
    expectedChallenge: challenge.challenge,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return jsonError("Passkey verification failed", 400);
  }

  const passkey = await insertPasskeyFromRegistration({
    userId: auth.actor.id,
    credential: verification.registrationInfo.credential,
    deviceLabel: parsed.data.deviceLabel?.trim() || "Passkey",
  });

  return NextResponse.json({ passkey });
}
