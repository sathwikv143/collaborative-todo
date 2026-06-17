"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, getErrorMessage } from "@/lib/api-client";
import {
  ACCOUNT_ID_PLACEHOLDER,
  formatAccountIdInput,
  normalizeAccountId,
} from "@/lib/account-id-format";
import { createPasskey } from "@/lib/passkey-client";

export default function RecoverPage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"code" | "passkey">("code");

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalized = normalizeAccountId(accountId);
    if (!normalized) {
      setError("Enter a valid account ID");
      setLoading(false);
      return;
    }

    try {
      await api.recoverVerify(normalized, backupCode.trim());
      setStep("passkey");
    } catch (err) {
      setError(getErrorMessage(err, "Recovery failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePasskey() {
    setLoading(true);
    setError("");

    try {
      const { challengeId, options } = await api.recoverPasskeyOptions();
      const response = await createPasskey(options);
      await api.recoverPasskeyVerify(challengeId, response);
      router.replace("/settings/security");
    } catch (err) {
      setError(getErrorMessage(err, "Could not register passkey"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-center">
      <div className="page-corner">
        <ThemeToggle />
      </div>
      <div className="container login-card" style={{ maxWidth: 440 }}>
        <div className="login-brand">
          <span className="login-logo">✓</span>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: 22 }}>
              Recover account
            </h1>
            <p className="page-subtitle" style={{ margin: 0, fontSize: 14 }}>
              Use a backup code, then register a new passkey
            </p>
          </div>
        </div>

        {step === "code" ? (
          <form onSubmit={handleVerifyCode}>
            <div className="field">
              <label className="label" htmlFor="accountId">
                Account ID
              </label>
              <input
                id="accountId"
                type="text"
                className="input account-id-input"
                value={accountId}
                onChange={(e) => setAccountId(formatAccountIdInput(e.target.value))}
                placeholder={ACCOUNT_ID_PLACEHOLDER}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="backupCode">
                Backup code
              </label>
              <input
                id="backupCode"
                type="text"
                className="input"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                required
              />
            </div>
            {error && <div className="message message-error">{error}</div>}
            <button type="submit" className="btn btn-block" disabled={loading}>
              {loading ? "Verifying…" : "Verify backup code"}
            </button>
          </form>
        ) : (
          <div>
            <p className="muted-text">
              Backup code accepted. Register a new passkey for this device. You can revoke old
              passkeys manually in Security settings.
            </p>
            {error && <div className="message message-error">{error}</div>}
            <button
              type="button"
              className="btn btn-block"
              disabled={loading}
              onClick={handleCreatePasskey}
            >
              {loading ? "Waiting for passkey…" : "Register new passkey"}
            </button>
          </div>
        )}

        <p className="muted-text auth-alt-links">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
