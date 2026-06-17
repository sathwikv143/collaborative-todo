import type { Member } from "./api-client";

export function getMemberName(
  members: Member[],
  id: string | null | undefined,
  fallback: string | null = null
): string | null {
  if (!id) return fallback;
  return members.find((m) => m.id === id)?.name ?? fallback;
}

export function resolveUserDisplayName(
  name: string | null | undefined,
  fallback = "Member"
): string {
  return name ?? fallback;
}

export function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}
