"use client";

import { useState } from "react";

interface CredentialsRevealProps {
  accountId: string;
  backupCodes: string[];
  onConfirm: () => void;
}

export function CredentialsReveal({ accountId, backupCodes, onConfirm }: CredentialsRevealProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="credentials-reveal">
      <h2 className="credentials-title">Save your account credentials</h2>
      <p className="muted-text credentials-lead">
        Store these in a safe place. We cannot show them again. You need your account ID to sign
        in and backup codes if you lose your passkey.
      </p>

      <div className="credentials-block">
        <div className="credentials-block-header">
          <span className="credentials-label">Account ID</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => copyText("account", accountId.replace(/-/g, ""))}
          >
            {copied === "account" ? "Copied" : "Copy"}
          </button>
        </div>
        <code className="credentials-value">{accountId}</code>
      </div>

      <div className="credentials-block">
        <div className="credentials-block-header">
          <span className="credentials-label">Backup codes</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => copyText("codes", backupCodes.join("\n"))}
          >
            {copied === "codes" ? "Copied" : "Copy all"}
          </button>
        </div>
        <ol className="backup-code-list">
          {backupCodes.map((code) => (
            <li key={code}>
              <code>{code}</code>
            </li>
          ))}
        </ol>
      </div>

      <label className="credentials-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I have saved my account ID and backup codes in a safe place
      </label>

      <button
        type="button"
        className="btn btn-block"
        disabled={!confirmed}
        onClick={onConfirm}
      >
        Continue to my lists
      </button>
    </div>
  );
}
