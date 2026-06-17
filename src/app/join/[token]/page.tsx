"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, getErrorMessage, type InvitePreview } from "@/lib/api-client";

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(async ({ token: t }) => {
      setToken(t);
      try {
        const preview = await api.getInvite(t);
        setInvite(preview);

        if (preview.redirect && preview.listId) {
          router.replace(`/lists/${preview.listId}`);
          return;
        }

        if (preview.claimedGuest?.name) {
          setDisplayName(preview.claimedGuest.name);
        }
      } catch (err) {
        setError(getErrorMessage(err, "Invalid invite"));
      } finally {
        setLoading(false);
      }
    });
  }, [params, router]);

  async function goToList(listId: string) {
    router.push(`/lists/${listId}`);
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setJoining(true);
    setError("");
    try {
      const res = await api.joinInvite(token, { displayName: displayName.trim() });
      await goToList(res.listId);
    } catch (err) {
      setError(getErrorMessage(err, "Could not join"));
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main className="page-center">
        <p className="page-subtitle">Loading invite…</p>
      </main>
    );
  }

  const isClaimed = !!invite?.claimedGuest;
  const listTitle = invite?.list.title ?? "Unknown list";
  const listId = invite?.listId ?? invite?.list.id;

  return (
    <main className="page-center">
      <div className="page-corner">
        <ThemeToggle />
      </div>
      <div className="container login-card" style={{ maxWidth: 420 }}>
        <h1 className="page-title" style={{ fontSize: 24 }}>
          {isClaimed ? "Welcome back" : "Join list"}
        </h1>
        <p className="page-subtitle">
          {listTitle}
          {isClaimed && invite?.claimedGuest
            ? ` · continuing as ${invite.claimedGuest.name}`
            : ""}
        </p>

        {isClaimed ? (
          <div>
            <p className="muted-text" style={{ marginBottom: 16 }}>
              {invite?.canResume
                ? "This invite link is yours. Reopen it anytime to return to your tasks."
                : "This invite was already used. Open the link in the same browser where you first joined, or ask the list owner for a new invite."}
            </p>
            {invite?.canResume && (
              <button
                type="button"
                className="btn btn-block"
                onClick={() => listId && goToList(listId)}
                disabled={joining}
              >
                Go to my list
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="field">
              <label className="label" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should others see you?"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-block" disabled={joining}>
              {joining ? "Joining…" : "Join as guest"}
            </button>
            <p className="muted-text" style={{ marginTop: 12, fontSize: 13 }}>
              This link will be tied to you after joining.
            </p>
          </form>
        )}

        {error && <div className="message message-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>
    </main>
  );
}
