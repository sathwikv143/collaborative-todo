import { createHmac, randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "./password";

const CODE_COUNT = 10;
const CODE_LENGTH = 12;
const CODE_GROUP_SIZE = 4;
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const BACKUP_CODE_COUNT = CODE_COUNT;
export const BACKUP_CODE_LENGTH = CODE_LENGTH;
export const BACKUP_CODE_WARN_THRESHOLD = 3;
export const BACKUP_CODE_PLACEHOLDER = formatBackupCode("X".repeat(CODE_LENGTH));

const BACKUP_CODE_PATTERN = new RegExp(`^[A-Z0-9]{${CODE_LENGTH}}$`);

function lookupSecret(): string {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
  return secret;
}

export function formatBackupCode(raw: string): string {
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i += CODE_GROUP_SIZE) {
    parts.push(raw.slice(i, i + CODE_GROUP_SIZE));
  }
  return parts.join("-");
}

export function formatBackupCodeInput(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9]/g, "").slice(0, CODE_LENGTH).toUpperCase();
  return formatBackupCode(normalized);
}

export function normalizeBackupCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidBackupCodeFormat(input: string): boolean {
  return BACKUP_CODE_PATTERN.test(normalizeBackupCode(input));
}

export function computeBackupCodeLookup(code: string): string {
  const normalized = normalizeBackupCode(code);
  return createHmac("sha256", lookupSecret()).update(normalized).digest("hex");
}

export function generateBackupCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = "";
  for (let j = 0; j < CODE_LENGTH; j++) {
    raw += ALPHANUM[bytes[j]! % ALPHANUM.length];
  }
  return formatBackupCode(raw);
}

export async function hashBackupCode(code: string): Promise<string> {
  return hashPassword(normalizeBackupCode(code));
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return verifyPassword(normalizeBackupCode(code), hash);
}
