import { SignJWT, jwtVerify } from "jose";
import { assertJwtSecret } from "./auth";

const RECOVERY_TTL = "10m";
const JWT_ISSUER = "collaborative-todo";
const JWT_AUDIENCE = "collaborative-todo-recovery";

export const RECOVERY_COOKIE = "todo_recovery";

const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(assertJwtSecret());
}

export async function signRecoveryToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: "recover", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(RECOVERY_TTL)
    .sign(secretKey());
}

export async function verifyRecoveryToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (payload.purpose !== "recover" || typeof payload.userId !== "string") return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export function recoveryCookieOptions(token: string) {
  return {
    name: RECOVERY_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/recover",
    maxAge: 60 * 10,
  };
}

export function clearRecoveryCookie() {
  return {
    name: RECOVERY_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/recover",
    maxAge: 0,
  };
}
