import { and, eq, isNull } from "drizzle-orm";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { db } from "./db";
import { backupCodes, passkeys, users } from "./db/schema";
import { normalizeAccountId } from "./account-id";
import { verifyBackupCode } from "./backup-codes";

export async function findUserByAccountId(rawAccountId: string) {
  const accountId = normalizeAccountId(rawAccountId);
  if (!accountId) return null;

  const [user] = await db.select().from(users).where(eq(users.accountId, accountId));
  return user ?? null;
}

export async function getActivePasskeys(userId: string) {
  return db
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.userId, userId), isNull(passkeys.revokedAt)));
}

export async function getPasskeyByCredentialId(credentialId: string) {
  const [row] = await db
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.credentialId, credentialId), isNull(passkeys.revokedAt)));
  return row ?? null;
}

export async function countUnusedBackupCodes(userId: string): Promise<number> {
  const rows = await db
    .select({ id: backupCodes.id })
    .from(backupCodes)
    .where(and(eq(backupCodes.userId, userId), isNull(backupCodes.usedAt)));
  return rows.length;
}

export async function consumeBackupCode(userId: string, rawCode: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(backupCodes)
    .where(and(eq(backupCodes.userId, userId), isNull(backupCodes.usedAt)));

  for (const row of rows) {
    if (await verifyBackupCode(rawCode, row.codeHash)) {
      await db
        .update(backupCodes)
        .set({ usedAt: new Date() })
        .where(eq(backupCodes.id, row.id));
      return true;
    }
  }
  return false;
}

export function userSessionActor(user: { id: string; name: string | null }) {
  const display = user.name ?? "User";
  return {
    type: "user" as const,
    id: user.id,
    username: display,
    name: user.name,
  };
}

export async function insertPasskeyFromRegistration(params: {
  userId: string;
  credential: {
    id: string;
    publicKey: Uint8Array | ArrayBuffer;
    counter: number;
    transports?: AuthenticatorTransportFuture[] | null;
  };
  deviceLabel: string;
}) {
  const { credential, userId, deviceLabel } = params;
  const publicKeyBytes =
    credential.publicKey instanceof ArrayBuffer
      ? new Uint8Array(credential.publicKey)
      : credential.publicKey;
  const [created] = await db
    .insert(passkeys)
    .values({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(publicKeyBytes).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? null,
      deviceLabel,
    })
    .returning({
      id: passkeys.id,
      deviceLabel: passkeys.deviceLabel,
      createdAt: passkeys.createdAt,
    });
  return created;
}
