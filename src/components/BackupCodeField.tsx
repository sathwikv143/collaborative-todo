"use client";

import { BACKUP_CODE_PLACEHOLDER, formatBackupCodeInput } from "@/lib/backup-codes";

type BackupCodeFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

export function BackupCodeField({
  id = "backupCode",
  value,
  onChange,
  autoFocus,
}: BackupCodeFieldProps) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        Backup code
      </label>
      <input
        id={id}
        type="text"
        className="input"
        value={value}
        onChange={(e) => onChange(formatBackupCodeInput(e.target.value))}
        placeholder={BACKUP_CODE_PLACEHOLDER}
        autoComplete="off"
        spellCheck={false}
        required
        autoFocus={autoFocus}
      />
    </div>
  );
}
