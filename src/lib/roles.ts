export const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(role: string, minRole: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}
