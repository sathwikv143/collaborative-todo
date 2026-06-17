import type { Actor } from "./auth";
import type { Membership } from "./access";
import { hasRole } from "./roles";
import {
  canDeleteSection as coreCanDeleteSection,
  canDeleteTask as coreCanDeleteTask,
  canEditSection as coreCanEditSection,
  canEditTask as coreCanEditTask,
  type Ownable,
  type TaskPermissions,
} from "./permissions-core";

export function isListCreator(actor: Actor, ownerId: string): boolean {
  return actor.type === "user" && actor.id === ownerId;
}

export function canEditTask(membership: Membership, task: TaskPermissions): boolean {
  return coreCanEditTask(membership.id, task);
}

export function canDeleteTask(membership: Membership, task: Ownable): boolean {
  return coreCanDeleteTask(membership.id, task);
}

export function canEditSection(membership: Membership, section: Ownable): boolean {
  return coreCanEditSection(membership.id, section);
}

export function canDeleteSection(membership: Membership, section: Ownable): boolean {
  return coreCanDeleteSection(membership.id, section);
}

export function canCreateContent(membership: Membership): boolean {
  return hasRole(membership.role, "editor");
}
