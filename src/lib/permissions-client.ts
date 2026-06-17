import { hasRole } from "./roles";

/**
 * UI-only permission helpers. The browser never reads or trusts JWT claims for authorization.
 * All mutations are enforced server-side via requireAuth() + getMembership() on each API route.
 */

export {
  canDeleteSection,
  canDeleteTask,
  canEditSection,
  canEditTask,
} from "./permissions-core";

export function canCreateContent(role: string): boolean {
  return hasRole(role, "editor");
}
