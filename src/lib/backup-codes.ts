import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "./password";

const CODE_COUNT = 10;
const CODE_LENGTH = 8;
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const BACKUP_CODE_COUNT = CODE_COUNT;
export const BACKUP_CODE_WARN_THRESHOLD = 3;

export function generateBackupCodes(count = CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(CODE_LENGTH);
    let raw = "";
    for (let j = 0; j < CODE_LENGTH; j++) {
      raw += ALPHANUM[bytes[j] % ALPHANUM.length];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

export function normalizeBackupCode(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}

export async function hashBackupCode(code: string): Promise<string> {
  return hashPassword(normalizeBackupCode(code));
}

export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return verifyPassword(normalizeBackupCode(code), hash);
}
