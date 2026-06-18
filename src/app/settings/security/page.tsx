"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CredentialsReveal } from "@/components/CredentialsReveal";
import { api, getErrorMessage, type SecurityInfo } from "@/lib/api-client";
import { formatDateTimeWithSeconds } from "@/lib/format-date";
import { createPasskey, usePasskey } from "@/lib/passkey-client";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayNameSaved, setDisplayNameSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setInfo(await api.getSecurity());
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [router]);

  useEffect(() => {
    setDisplayName(info?.displayName ?? "");
  }, [info?.displayName]);

  async function handleUpdateDisplayName(e: FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Display name is required");
      return;
    }

    setBusy(true);
    setError("");
    setDisplayNameSaved(false);
    try {
      const result = await api.updateDisplayName(trimmed);
      setInfo((prev) => (prev ? { ...prev, displayName: result.displayName } : prev));
      setDisplayNameSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update display name"));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPasskey() {
    setBusy(true);
    setError("");
    try {
      const { challengeId, options } = await api.passkeyAddOptions();
      const response = await createPasskey(options);
      await api.passkeyAddVerify(challengeId, response);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add passkey"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(passkeyId: string) {
    if (!confirm("Revoke this passkey? You can only sign in with your remaining passkeys.")) return;
    setBusy(true);
    setError("");
    try {
      await api.passkeyRevoke(passkeyId);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not revoke passkey"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateCodes() {
    if (!confirm("This invalidates all existing backup codes. Continue?")) return;
    setBusy(true);
    setError("");
    try {
      const { challengeId, options } = await api.backupCodesRegenerateOptions();
      const response = await usePasskey(options);
      const result = await api.backupCodesRegenerateVerify(challengeId, response);
      setNewCodes(result.backupCodes);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not regenerate codes"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = confirm(
      "Delete your account permanently? This removes all your lists, passkeys, and backup codes. This cannot be undone."
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      const { challengeId, options } = await api.accountDeleteOptions();
      const response = await usePasskey(options);
      await api.accountDeleteVerify(challengeId, response);
      router.replace("/login");
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete account"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !info) {
    return (
      <main className="page-center">
        <p className="page-subtitle">Loading…</p>
      </main>
    );
  }

  if (newCodes) {
    return (
      <main className="page-center">
        <div className="page-corner">
          <ThemeToggle />
        </div>
        <div className="container login-card" style={{ maxWidth: 520 }}>
          <CredentialsReveal
            accountId={info.accountId ?? ""}
            backupCodes={newCodes}
            onConfirm={() => setNewCodes(null)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="list-kicker">Account</p>
          <h1 className="page-title">Security</h1>
        </div>
        <div className="page-header-actions">
          <Link href="/lists" className="btn btn-ghost btn-sm">
            ← Back to lists
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container">
        <section className="security-section">
          <h2 className="security-section-title">Display name</h2>
          <p className="muted-text">Shown to other members on shared lists.</p>
          <form className="display-name-form" onSubmit={handleUpdateDisplayName}>
            <input
              id="displayName"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setDisplayNameSaved(false);
              }}
              maxLength={80}
              required
            />
            <button type="submit" className="btn btn-sm" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </form>
          {displayNameSaved && (
            <p className="muted-text" style={{ marginTop: 8 }}>
              Display name updated.
            </p>
          )}
        </section>

        {info.accountId && (
          <section className="security-section">
            <h2 className="security-section-title">Account ID</h2>
            <code className="credentials-value">{info.accountId}</code>
            <p className="muted-text">Required to sign in on new devices.</p>
          </section>
        )}

        {info.backupCodesLow && (
          <div className="message message-warn">
            Only {info.backupCodesRemaining} backup codes remaining. Regenerate a new set below.
          </div>
        )}

        {error && <div className="message message-error">{error}</div>}

        <section className="security-section">
          <div className="security-section-header">
            <h2 className="security-section-title">Passkeys</h2>
            <button type="button" className="btn btn-sm" onClick={handleAddPasskey} disabled={busy}>
              Add passkey
            </button>
          </div>
          {info.passkeys.length === 0 ? (
            <p className="muted-text">No passkeys registered.</p>
          ) : (
            <ul className="passkey-list">
              {info.passkeys.map((key) => (
                <li key={key.id} className="passkey-list-item">
                  <div>
                    <strong>{key.deviceLabel ?? "Passkey"}</strong>
                    <p className="muted-text">
                      Added {formatDateTimeWithSeconds(key.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost btn-danger-text"
                    disabled={busy || info.passkeys.length <= 1}
                    onClick={() => handleRevoke(key.id)}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {info.accountId && (
          <section className="security-section">
            <div className="security-section-header">
              <h2 className="security-section-title">Backup codes</h2>
              <span className="muted-text">{info.backupCodesRemaining} unused</span>
            </div>
            <p className="muted-text">
              Use a backup code to recover your account if you lose access to your passkeys.
            </p>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleRegenerateCodes}
              disabled={busy}
            >
              Regenerate backup codes
            </button>
          </section>
        )}

        {info.accountId && (
          <section className="danger-zone">
            <h2 className="security-section-title">Delete account</h2>
            <p className="muted-text">
              Permanently delete your account, passkeys, backup codes, and any lists you own.
              You will be removed from lists shared by others.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleDeleteAccount}
              disabled={busy}
            >
              Delete account
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
