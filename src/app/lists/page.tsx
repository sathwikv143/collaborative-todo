"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreatorLabel } from "@/components/CreatorLabel";
import { api, getErrorMessage, type ListSummary } from "@/lib/api-client";

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [backupCodesLow, setBackupCodesLow] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);

  useEffect(() => {
    api
      .me()
      .then((me) => {
        if (me.type === "guest") {
          router.replace(`/lists/${me.listId}`);
          return;
        }
        setUsername(me.name ?? me.username);
        setBackupCodesLow(me.backupCodesLow);
        setBackupCodesRemaining(me.backupCodesRemaining);
        return api.getLists().then(setLists);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      const list = await api.createList(trimmed);
      router.push(`/lists/${list.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create list"));
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="page-center">
        <p className="page-subtitle">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="list-kicker">Your workspace</p>
          <h1 className="page-title">Lists</h1>
        </div>
        <div className="page-header-actions">
          {username && <span className="muted-text">Hi, {username}</span>}
          <Link href="/settings/security" className="btn btn-ghost btn-sm">
            Security
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="container">
        {backupCodesLow && (
          <div className="message message-warn">
            Only {backupCodesRemaining} backup codes left.{" "}
            <Link href="/settings/security">Regenerate in Security settings</Link>.
          </div>
        )}
        <form className="create-form" onSubmit={handleCreate}>
          <input
            className="input"
            placeholder="New list name…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {error && <div className="message message-error">{error}</div>}

        <ul className="list-cards">
          {lists.map((list) => (
            <li key={list.id}>
              <Link href={`/lists/${list.id}`} className="list-card">
                <span className="list-card-title">{list.title}</span>
                <span className="list-card-meta">
                  <CreatorLabel
                    name={list.creatorName}
                    displayAsYou={list.isCreator}
                    className="creator-label-compact"
                  />
                  <span className="list-card-role">{list.role}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {lists.length === 0 && (
          <p className="muted-text">No lists yet. Create one above.</p>
        )}
      </div>
    </main>
  );
}
