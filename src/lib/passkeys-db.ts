import { and, eq, isNull } from "drizzle-orm";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { db } from "./db";
import { backupCodes, passkeys, users } from "./db/schema";
import { normalizeAccountId } from "./account-id";
import {
  BACKUP_CODE_COUNT,
  computeBackupCodeLookup,
  generateBackupCode,
  hashBackupCode,
  verifyBackupCode,
} from "./backup-codes";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

type BackupCodeOwner = {
  codeId: string;
  userId: string;
  accountId: string;
};

async function findBackupCodeOwner(rawCode: string): Promise<BackupCodeOwner | null> {
  const lookup = computeBackupCodeLookup(rawCode);
  const rows = await db
    .select({
      codeId: backupCodes.id,
      codeHash: backupCodes.codeHash,
      userId: backupCodes.userId,
      accountId: users.accountId,
    })
    .from(backupCodes)
    .innerJoin(users, eq(backupCodes.userId, users.id))
    .where(and(eq(backupCodes.codeLookup, lookup), isNull(backupCodes.usedAt)));

  if (rows.length !== 1) return null;

  const row = rows[0]!;
  if (!(await verifyBackupCode(rawCode, row.codeHash))) return null;
  if (!row.accountId) return null;

  return {
    codeId: row.codeId,
    userId: row.userId,
    accountId: row.accountId,
  };
}

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

export async function insertBackupCodesForUser(
  userId: string,
  count = BACKUP_CODE_COUNT
): Promise<string[]> {
  const codes: string[] = [];
  let attempts = 0;
  const maxAttempts = count * 20;

  while (codes.length < count) {
    if (attempts++ > maxAttempts) {
      throw new Error("Failed to generate unique backup codes");
    }

    const code = generateBackupCode();
    const lookup = computeBackupCodeLookup(code);

    try {
      await db.insert(backupCodes).values({
        userId,
        codeHash: await hashBackupCode(code),
        codeLookup: lookup,
      });
      codes.push(code);
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  return codes;
}

export async function resolveBackupCode(
  rawCode: string,
  { consume }: { consume: boolean }
): Promise<{ userId: string; accountId: string } | null> {
  const owner = await findBackupCodeOwner(rawCode);
  if (!owner) return null;

  if (consume) {
    await db
      .update(backupCodes)
      .set({ usedAt: new Date() })
      .where(eq(backupCodes.id, owner.codeId));
  }

  return { userId: owner.userId, accountId: owner.accountId };
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
