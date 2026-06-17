import type { TaskStatus } from "@/lib/task-status";
import type { TaskExternalLink } from "@/lib/external-links";

/**
 * Browser API client. Session JWTs are stored only in an httpOnly cookie (never localStorage).
 * Use credentials: "include" on every request; do not persist tokens from response bodies.
 */
export type { TaskStatus };
export type { TaskExternalLink };

const API = "";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export interface ListSummary {
  id: string;
  title: string;
  description: string | null;
  role: string;
  creatorName: string;
  isCreator: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  role: string;
  name: string;
  isGuest: boolean;
  joinedAt: string;
}

export interface Section {
  id: string;
  listId: string;
  title: string;
  sortOrder: number;
  createdByMemberId: string | null;
}

export interface Task {
  id: string;
  listId: string;
  sectionId: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  assigneeMemberId: string | null;
  dueDate: string | null;
  priority: "none" | "low" | "medium" | "high";
  sortOrder: number;
  completedAt: string | null;
  createdByMemberId: string | null;
  createdAt: string;
  updatedAt: string;
  externalLinks: TaskExternalLink[];
}

export interface Comment {
  id: string;
  taskId: string;
  authorMemberId: string;
  body: string;
  createdAt: string;
}

export interface ListEvent {
  id: string;
  listId: string;
  actorMemberId: string | null;
  action: string;
  itemType: string | null;
  itemId: string | null;
  summary: string;
  createdAt: string;
}

export interface ListData {
  memberId: string;
  role: string;
  members: Member[];
  sections: Section[];
  tasks: Task[];
  comments: Comment[];
  events: ListEvent[];
}

export interface InviteRecord {
  id: string;
  token: string;
  role: string;
  url: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  claimedByGuestId: string | null;
  claimedGuestName: string | null;
  claimedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: "active" | "revoked" | "expired" | "exhausted";
}

export interface InvitePreview {
  list: { id: string; title: string };
  role: string;
  status: string;
  listId: string;
  redirect?: boolean;
  canResume?: boolean;
  claimedGuest?: { id: string; name: string } | null;
}

export interface SecurityInfo {
  displayName: string | null;
  accountId: string | null;
  passkeys: { id: string; deviceLabel: string | null; createdAt: string }[];
  backupCodesRemaining: number;
  backupCodesLow: boolean;
}

export const api = {
  passkeyRegisterOptions: (displayName: string) =>
    request<{
      challengeId: string;
      accountId: string;
      options: import("@simplewebauthn/browser").PublicKeyCredentialCreationOptionsJSON;
    }>("/api/auth/passkey/register/options", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    }),

  passkeyRegisterVerify: (challengeId: string, response: unknown) =>
    request<{
      accountId: string;
      displayName: string | null;
      backupCodes: string[];
      backupCodesRemaining: number;
      backupCodesLow: boolean;
    }>("/api/auth/passkey/register/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, response }),
    }),

  passkeyLoginOptions: (accountId: string) =>
    request<{
      challengeId: string;
      options: import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON;
    }>("/api/auth/passkey/login/options", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    }),

  passkeyLoginVerify: (challengeId: string, accountId: string, response: unknown) =>
    request<{
      displayName: string | null;
      backupCodesRemaining: number;
      backupCodesLow: boolean;
    }>("/api/auth/passkey/login/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, accountId, response }),
    }),

  recoverVerify: (accountId: string, backupCode: string) =>
    request<{
      accountId: string | null;
      backupCodesRemaining: number;
      backupCodesLow: boolean;
    }>("/api/auth/recover/verify", {
      method: "POST",
      body: JSON.stringify({ accountId, backupCode }),
    }),

  recoverPasskeyOptions: () =>
    request<{
      challengeId: string;
      options: import("@simplewebauthn/browser").PublicKeyCredentialCreationOptionsJSON;
    }>("/api/auth/recover/passkey/options", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  recoverPasskeyVerify: (challengeId: string, response: unknown) =>
    request<{
      displayName: string | null;
      backupCodesRemaining: number;
      backupCodesLow: boolean;
    }>("/api/auth/recover/passkey/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, response }),
    }),

  getSecurity: () => request<SecurityInfo>("/api/auth/security"),

  passkeyAddOptions: () =>
    request<{
      challengeId: string;
      options: import("@simplewebauthn/browser").PublicKeyCredentialCreationOptionsJSON;
    }>("/api/auth/passkeys/add/options", { method: "POST", body: "{}" }),

  passkeyAddVerify: (challengeId: string, response: unknown, deviceLabel?: string) =>
    request<{ passkey: { id: string; deviceLabel: string | null; createdAt: string } }>(
      "/api/auth/passkeys/add/verify",
      {
        method: "POST",
        body: JSON.stringify({ challengeId, response, deviceLabel }),
      }
    ),

  passkeyRevoke: (passkeyId: string) =>
    request<{ ok: boolean }>("/api/auth/passkeys/revoke", {
      method: "POST",
      body: JSON.stringify({ passkeyId }),
    }),

  backupCodesRegenerateOptions: () =>
    request<{
      challengeId: string;
      options: import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON;
    }>("/api/auth/backup-codes/regenerate/options", { method: "POST", body: "{}" }),

  backupCodesRegenerateVerify: (challengeId: string, response: unknown) =>
    request<{
      backupCodes: string[];
      backupCodesRemaining: number;
      backupCodesLow: boolean;
    }>("/api/auth/backup-codes/regenerate/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, response }),
    }),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () =>
    request<
      | {
          type: "user";
          id: string;
          username: string;
          name: string | null;
          accountId: string | null;
          backupCodesRemaining: number;
          backupCodesLow: boolean;
        }
      | { type: "guest"; id: string; name: string; listId: string }
    >("/api/auth/me"),

  getLists: () => request<ListSummary[]>("/api/lists"),

  createList: (title: string, description?: string) =>
    request<ListSummary>("/api/lists", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    }),

  getList: (id: string) =>
    request<{
      id: string;
      title: string;
      description: string | null;
      role: string;
      memberId: string;
      isListOwner: boolean;
      creatorName: string;
    }>(`/api/lists/${id}`),

  deleteList: (id: string) =>
    request<void>(`/api/lists/${id}`, { method: "DELETE" }),

  getListData: (id: string) => request<ListData>(`/api/lists/${id}/data`),

  createTask: (
    listId: string,
    data: {
      sectionId: string;
      title: string;
      assigneeMemberId?: string | null;
      dueDate?: string | null;
      priority?: Task["priority"];
    }
  ) =>
    request<Task>(`/api/lists/${listId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTask: (listId: string, data: Partial<Task> & { id: string }) =>
    request<Task>(`/api/lists/${listId}/tasks`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteTask: (listId: string, taskId: string) =>
    request<void>(`/api/lists/${listId}/tasks?taskId=${taskId}`, { method: "DELETE" }),

  createSection: (listId: string, title: string) =>
    request<Section>(`/api/lists/${listId}/sections`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  updateSection: (listId: string, data: { id: string; title?: string }) =>
    request<Section>(`/api/lists/${listId}/sections`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteSection: (listId: string, sectionId: string) =>
    request<void>(`/api/lists/${listId}/sections?sectionId=${sectionId}`, {
      method: "DELETE",
    }),

  createInvite: (listId: string) =>
    request<InviteRecord>(`/api/lists/${listId}/invites`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  listInvites: (listId: string) =>
    request<InviteRecord[]>(`/api/lists/${listId}/invites`),

  revokeInvite: (listId: string, inviteId: string) =>
    request<{ ok: boolean }>(`/api/lists/${listId}/invites/${inviteId}`, {
      method: "DELETE",
    }),

  getInvite: (token: string) => request<InvitePreview>(`/api/join/${token}`),

  joinInvite: (token: string, opts?: { displayName?: string }) =>
    request<{ listId: string; memberId: string; actorType: string }>(
      `/api/join/${token}`,
      {
        method: "POST",
        body: JSON.stringify(opts?.displayName ? { displayName: opts.displayName } : {}),
      }
    ),

  addComment: (listId: string, taskId: string, body: string) =>
    request<Comment>(`/api/lists/${listId}/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};
