import { NextResponse } from "next/server";
import type { invites } from "./db/schema";
import { jsonError } from "./api-helpers";

type InviteRow = typeof invites.$inferSelect;

export function inviteStatus(invite: InviteRow): "active" | "revoked" | "expired" | "exhausted" {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && invite.expiresAt < new Date()) return "expired";
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) return "exhausted";
  return "active";
}

export function inviteValidationError(invite: InviteRow | null): NextResponse | null {
  if (!invite) {
    return jsonError("Invite not found", 404);
  }

  const status = inviteStatus(invite);
  if (status === "revoked") {
    return jsonError("Invite revoked", 410);
  }
  if (status === "expired") {
    return jsonError("Invite expired", 410);
  }
  if (status === "exhausted") {
    return jsonError("Invite fully used", 410);
  }

  return null;
}
