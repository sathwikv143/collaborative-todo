"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, getErrorMessage } from "@/lib/api-client";
import {
  ACCOUNT_ID_LENGTH,
  ACCOUNT_ID_PLACEHOLDER,
  formatAccountIdInput,
  normalizeAccountId,
} from "@/lib/account-id-format";
import { usePasskey } from "@/lib/passkey-client";

export default function LoginPage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupWarning, setBackupWarning] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid") {
      setError("Session expired. Sign in again.");
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBackupWarning(null);

    const normalized = normalizeAccountId(accountId);
    if (!normalized) {
      setError(`Enter a valid ${ACCOUNT_ID_LENGTH}-character account ID`);
      setLoading(false);
      return;
    }

    try {
      const { challengeId, options } = await api.passkeyLoginOptions(normalized);
      const response = await usePasskey(options);
      const result = await api.passkeyLoginVerify(challengeId, normalized, response);
      if (result.backupCodesLow) {
        setBackupWarning(
          `Only ${result.backupCodesRemaining} backup codes left. Regenerate them in Security settings.`
        );
      }
      router.replace("/lists");
    } catch (err) {
      setError(getErrorMessage(err, "Could not sign in"));
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
              Collaborative ToDo
            </h1>
            <p className="page-subtitle" style={{ margin: 0, fontSize: 14 }}>
              Sign in with your account ID and passkey
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
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
              autoComplete="username"
              spellCheck={false}
              required
              autoFocus
            />
          </div>
          {error && <div className="message message-error">{error}</div>}
          {backupWarning && <div className="message message-warn">{backupWarning}</div>}
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Waiting for passkey…" : "Sign in with passkey"}
          </button>
        </form>

        <p className="muted-text auth-alt-links">
          <Link href="/forgot-account-id">Forgot account ID?</Link>
          <span aria-hidden> · </span>
          <Link href="/recover">Recover with a backup code</Link>
          <span aria-hidden> · </span>
          <Link href="/register">Create account</Link>
        </p>
      </div>
    </main>
  );
}
