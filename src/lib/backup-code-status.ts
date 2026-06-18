import { BACKUP_CODE_WARN_THRESHOLD } from "./backup-codes";
import { countUnusedBackupCodes } from "./passkeys-db";

export function backupCodesStatusFromCount(remaining: number) {
  return {
    backupCodesRemaining: remaining,
    backupCodesLow: remaining < BACKUP_CODE_WARN_THRESHOLD,
  };
}

export async function getBackupCodesStatus(userId: string) {
  const remaining = await countUnusedBackupCodes(userId);
  return backupCodesStatusFromCount(remaining);
}
