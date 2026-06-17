export const ACCOUNT_ID_LENGTH = 26;
export const ACCOUNT_ID_GROUP_SIZE = 4;

/** Max formatted length: 26 chars + 6 hyphens (every 4 chars). */
export const ACCOUNT_ID_FORMATTED_MAX_LENGTH =
  ACCOUNT_ID_LENGTH + Math.floor((ACCOUNT_ID_LENGTH - 1) / ACCOUNT_ID_GROUP_SIZE);

const ACCOUNT_ID_PATTERN = new RegExp(`^[A-Za-z0-9]{${ACCOUNT_ID_LENGTH}}$`);

export function normalizeAccountId(input: string): string | null {
  const normalized = input.replace(/[\s-]/g, "");
  if (!ACCOUNT_ID_PATTERN.test(normalized)) return null;
  return normalized;
}

export function formatAccountId(accountId: string): string {
  const parts: string[] = [];
  for (let i = 0; i < accountId.length; i += ACCOUNT_ID_GROUP_SIZE) {
    parts.push(accountId.slice(i, i + ACCOUNT_ID_GROUP_SIZE));
  }
  return parts.join("-");
}

/** Example grouped display for empty account ID fields. */
export const ACCOUNT_ID_PLACEHOLDER = formatAccountId("X".repeat(ACCOUNT_ID_LENGTH));

export function formatAccountIdInput(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9]/g, "").slice(0, ACCOUNT_ID_LENGTH);
  return formatAccountId(normalized);
}
