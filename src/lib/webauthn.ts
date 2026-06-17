import type { NextRequest } from "next/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { appUrl } from "./api-helpers";

const RP_NAME = "Collaborative ToDo";

export function getWebAuthnConfig(request?: NextRequest) {
  const origin = appUrl(request);
  const url = new URL(origin);
  const rpID = url.hostname === "localhost" ? "localhost" : url.hostname;

  return { rpName: RP_NAME, rpID, origin };
}

export async function createRegistrationOptions(params: {
  request?: NextRequest;
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentialIds?: string[];
}) {
  const { rpName, rpID } = getWebAuthnConfig(params.request);

  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: params.userName,
    userDisplayName: params.userDisplayName,
    userID: new TextEncoder().encode(params.userId),
    attestationType: "none",
    excludeCredentials: (params.excludeCredentialIds ?? []).map((id) => ({
      id,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(params: {
  request?: NextRequest;
  response: RegistrationResponseJSON;
  expectedChallenge: string;
}) {
  const { rpID, origin } = getWebAuthnConfig(params.request);

  return verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });
}

export async function createAuthenticationOptions(params: {
  request?: NextRequest;
  credentialIds: string[];
  allowCredentials?: { id: string; transports?: AuthenticatorTransportFuture[] }[];
}) {
  const { rpID } = getWebAuthnConfig(params.request);

  const allowCredentials =
    params.allowCredentials ??
    params.credentialIds.map((id) => ({
      id,
      type: "public-key" as const,
    }));

  return generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
  });
}

export async function verifyAuthentication(params: {
  request?: NextRequest;
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  credential: {
    id: string;
    publicKey: string;
    counter: number;
    transports?: AuthenticatorTransportFuture[];
  };
}) {
  const { rpID, origin } = getWebAuthnConfig(params.request);

  return verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
    credential: {
      id: params.credential.id,
      publicKey: Buffer.from(params.credential.publicKey, "base64url"),
      counter: params.credential.counter,
      transports: params.credential.transports,
    },
  });
}

export function extractRegistrationChallenge(
  response: RegistrationResponseJSON
): string | null {
  try {
    const clientDataJSON = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")
    ) as { challenge?: string };
    return clientDataJSON.challenge ?? null;
  } catch {
    return null;
  }
}

export function extractAuthenticationChallenge(
  response: AuthenticationResponseJSON
): string | null {
  try {
    const clientDataJSON = JSON.parse(
      Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")
    ) as { challenge?: string };
    return clientDataJSON.challenge ?? null;
  } catch {
    return null;
  }
}
