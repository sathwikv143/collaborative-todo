import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  assertJwtSecret,
  normalizeActor,
  AUTH_COOKIE,
  type Actor,
} from "./auth";

const JWT_ISSUER = "collaborative-todo";
const JWT_AUDIENCE = "collaborative-todo-web";
const USER_SESSION_TTL = "30d";
const GUEST_SESSION_TTL = "7d";

const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(assertJwtSecret());
}

function sessionTtl(actor: Actor) {
  return actor.type === "guest" ? GUEST_SESSION_TTL : USER_SESSION_TTL;
}

/** Identity-only JWT — roles and permissions are resolved server-side from the database. */
export async function signToken(actor: Actor): Promise<string> {
  return new SignJWT({
    type: actor.type,
    id: actor.id,
    ...(actor.type === "user"
      ? { username: actor.username, name: actor.name ?? null }
      : { listId: actor.listId, name: actor.name }),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(actor.id)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(sessionTtl(actor))
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<Actor | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return normalizeActor(payload as Parameters<typeof normalizeActor>[0]);
  } catch {
    return null;
  }
}

/** Browser clients should rely on the httpOnly session cookie (see authCookieOptions). */
export async function getActorFromRequest(request: NextRequest): Promise<Actor | null> {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (!cookie) return null;
  return verifyToken(cookie);
}

export async function getActorFromCookies(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function authCookieOptions(token: string, actor?: Actor) {
  const maxAge =
    actor?.type === "guest" ? 60 * 60 * 24 * 7 : 60 * 60 * 24 * 30;
  return {
    name: AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function clearAuthCookie() {
  return {
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
