export type UserActor = { type: "user"; id: string; username: string; name?: string | null };
export type GuestActor = { type: "guest"; id: string; listId: string; name: string };
export type Actor = UserActor | GuestActor;

type UnknownPayload = {
  sub?: string;
  id?: string;
  username?: string;
  name?: string | null;
  type?: string;
  listId?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

/** Parse verified JWT payload into an actor identity (no roles or permissions). */
export function normalizeActor(payload: UnknownPayload): Actor | null {
  const id = isNonEmptyString(payload.id) ? payload.id : payload.sub;
  if (!isNonEmptyString(id)) return null;

  if (payload.type === "guest") {
    if (!isNonEmptyString(payload.listId) || !isNonEmptyString(payload.name)) return null;
    return { type: "guest", id, listId: payload.listId, name: payload.name };
  }

  if (payload.type === "user") {
    if (!isNonEmptyString(payload.username)) return null;
    return {
      type: "user",
      id,
      username: payload.username,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  }

  return null;
}

export function assertJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
  if (process.env.NODE_ENV === "production" && secret === "dev-secret-change-in-production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  return secret;
}

export const AUTH_COOKIE = "todo_token";
