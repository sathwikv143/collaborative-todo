import { randomUUID } from "crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "./db";
import { authChallenges } from "./db/schema";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type AuthChallengeFlow =
  | "passkey_register"
  | "passkey_login"
  | "passkey_recover"
  | "passkey_add"
  | "backup_regenerate";

export async function storeChallenge(params: {
  challenge: string;
  flow: AuthChallengeFlow;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  await cleanupExpiredChallenges();

  const id = randomUUID();
  await db.insert(authChallenges).values({
    id,
    challenge: params.challenge,
    flow: params.flow,
    userId: params.userId ?? null,
    metadata: params.metadata ?? {},
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
  return id;
}

export async function consumeChallenge(
  challengeId: string,
  flow: AuthChallengeFlow,
  expectedChallenge: string
) {
  await cleanupExpiredChallenges();

  const [row] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.id, challengeId));

  if (!row || row.flow !== flow) return null;
  if (row.expiresAt < new Date()) return null;
  if (row.challenge !== expectedChallenge) return null;

  await db.delete(authChallenges).where(eq(authChallenges.id, challengeId));
  return row;
}

async function cleanupExpiredChallenges() {
  await db.delete(authChallenges).where(lt(authChallenges.expiresAt, new Date()));
}
