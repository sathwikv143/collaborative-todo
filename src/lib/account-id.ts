import { randomBytes } from "crypto";
import { ACCOUNT_ID_LENGTH } from "./account-id-format";

const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateAccountId(): string {
  const bytes = randomBytes(ACCOUNT_ID_LENGTH);
  let id = "";
  for (let i = 0; i < ACCOUNT_ID_LENGTH; i++) {
    id += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return id;
}

export {
  ACCOUNT_ID_FORMATTED_MAX_LENGTH,
  ACCOUNT_ID_LENGTH,
  formatAccountId,
  formatAccountIdInput,
  normalizeAccountId,
} from "./account-id-format";
