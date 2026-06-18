"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackupCodeField } from "@/components/BackupCodeField";
import { api, getErrorMessage } from "@/lib/api-client";
import { createPasskey } from "@/lib/passkey-client";

export default function RecoverPage() {
  const router = useRouter();
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"code" | "passkey">("code");
  const [accountId, setAccountId] = useState<string | null>(null);

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api.recoverBackupCode(backupCode.trim(), true);
      setAccountId(result.accountId);
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
            <BackupCodeField value={backupCode} onChange={setBackupCode} autoFocus />
            {error && <div className="message message-error">{error}</div>}
            <button type="submit" className="btn btn-block" disabled={loading}>
              {loading ? "Verifying…" : "Verify backup code"}
            </button>
          </form>
        ) : (
          <div>
            <p className="muted-text">
              Backup code accepted
              {accountId ? ` for account ${accountId}` : ""}. Register a new passkey for this
              device. You can revoke old passkeys in Security settings.
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
          <Link href="/forgot-account-id">Forgot account ID?</Link>
          <span aria-hidden> · </span>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
