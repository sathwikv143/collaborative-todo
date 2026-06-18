"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackupCodeField } from "@/components/BackupCodeField";
import { api, getErrorMessage } from "@/lib/api-client";

export default function ForgotAccountIdPage() {
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAccountId(null);

    try {
      const result = await api.recoverBackupCode(backupCode.trim(), false);
      setAccountId(result.accountId);
    } catch (err) {
      setError(getErrorMessage(err, "Could not look up account ID"));
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
              Forgot account ID
            </h1>
            <p className="page-subtitle" style={{ margin: 0, fontSize: 14 }}>
              Enter one of your backup codes to reveal your account ID
            </p>
          </div>
        </div>

        {accountId ? (
          <div>
            <p className="muted-text">
              Your account ID is shown below. This backup code was not used — you can still sign in
              or recover with it later.
            </p>
            <div className="field">
              <label className="label">Account ID</label>
              <output className="input account-id-input" style={{ display: "block" }}>
                {accountId}
              </output>
            </div>
            <Link href="/login" className="btn btn-block" style={{ textAlign: "center" }}>
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <BackupCodeField value={backupCode} onChange={setBackupCode} autoFocus />
            {error && <div className="message message-error">{error}</div>}
            <button type="submit" className="btn btn-block" disabled={loading}>
              {loading ? "Looking up…" : "Show account ID"}
            </button>
          </form>
        )}

        <p className="muted-text auth-alt-links">
          <Link href="/login">Back to sign in</Link>
          <span aria-hidden> · </span>
          <Link href="/recover">Recover with backup code</Link>
        </p>
      </div>
    </main>
  );
}
