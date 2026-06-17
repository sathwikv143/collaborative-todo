"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CredentialsReveal } from "@/components/CredentialsReveal";
import { api, getErrorMessage } from "@/lib/api-client";
import { createPasskey } from "@/lib/passkey-client";

type SavedCredentials = {
  accountId: string;
  backupCodes: string[];
};

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedCredentials | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { challengeId, options } = await api.passkeyRegisterOptions(displayName.trim());
      const response = await createPasskey(options);
      const result = await api.passkeyRegisterVerify(challengeId, response);
      setSaved({
        accountId: result.accountId,
        backupCodes: result.backupCodes,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Could not create account"));
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <main className="page-center">
        <div className="page-corner">
          <ThemeToggle />
        </div>
        <div className="container login-card" style={{ maxWidth: 520 }}>
          <CredentialsReveal
            accountId={saved.accountId}
            backupCodes={saved.backupCodes}
            onConfirm={() => router.replace("/lists")}
          />
        </div>
      </main>
    );
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
              Create account
            </h1>
            <p className="page-subtitle" style={{ margin: 0, fontSize: 14 }}>
              Choose a display name and create a passkey
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          {error && <div className="message message-error">{error}</div>}
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Creating passkey…" : "Create account with passkey"}
          </button>
        </form>

        <p className="muted-text auth-alt-links">
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
