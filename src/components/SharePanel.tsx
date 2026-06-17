"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage, type InviteRecord } from "@/lib/api-client";
import { formatShortDate } from "@/lib/format-date";

export function SharePanel({
  listId,
  isListOwner,
}: {
  listId: string;
  isListOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canInvite = !!isListOwner;

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api.listInvites(listId);
      setInvites(rows);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load invites"));
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    if (open && canInvite) {
      loadInvites();
    }
  }, [open, canInvite, loadInvites]);

  async function createInvite() {
    setCreating(true);
    setError("");
    try {
      const inv = await api.createInvite(listId);
      setInvites((prev) => [inv, ...prev]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create invite"));
    } finally {
      setCreating(false);
    }
  }

  async function copyUrl(invite: InviteRecord) {
    await navigator.clipboard.writeText(invite.url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function revokeInvite(invite: InviteRecord) {
    if (!confirm("Revoke this invite link? It will stop working immediately.")) return;
    try {
      await api.revokeInvite(listId, invite.id);
      setInvites((prev) =>
        prev.map((i) =>
          i.id === invite.id ? { ...i, status: "revoked" as const, revokedAt: new Date().toISOString() } : i
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not revoke invite"));
    }
  }

  if (!canInvite) return null;

  return (
    <div className="share-panel">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide invites" : "Invite links"}
      </button>

      {open && (
        <div className="invite-manager">
          <div className="invite-manager-header">
            <h3 className="invite-manager-title">Invite links</h3>
            <button
              type="button"
              className="btn btn-sm"
              onClick={createInvite}
              disabled={creating}
            >
              {creating ? "Creating…" : "+ New link"}
            </button>
          </div>

          {error && <div className="message message-error">{error}</div>}

          {loading ? (
            <p className="muted-text">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="muted-text">No invite links yet. Create one to share with guests.</p>
          ) : (
            <ul className="invite-list">
              {invites.map((invite) => (
                <li key={invite.id} className={`invite-item invite-${invite.status}`}>
                  <div className="invite-item-top">
                    <span className={`invite-status invite-status-${invite.status}`}>
                      {invite.status}
                    </span>
                    <span className="invite-role">{invite.role}</span>
                  </div>
                  <input className="input input-sm invite-url" readOnly value={invite.url} />
                  <div className="invite-meta">
                    {invite.claimedGuestName ? (
                      <span>Guest: {invite.claimedGuestName}</span>
                    ) : (
                      <span>Unclaimed</span>
                    )}
                    <span>{formatShortDate(invite.createdAt)}</span>
                  </div>
                  <div className="invite-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => copyUrl(invite)}
                      disabled={invite.status !== "active"}
                    >
                      {copiedId === invite.id ? "Copied" : "Copy"}
                    </button>
                    {invite.status === "active" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => revokeInvite(invite)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
