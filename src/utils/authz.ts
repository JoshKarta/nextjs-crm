// Authorization is intentionally separate from authentication (PRD §5).
// Better Auth tells us *who* is making the request; this module decides
// *what* they're allowed to do. Swap `role` for a real column/table lookup
// (e.g. a `memberRole` on your org/user model) once roles are persisted —
// this shape is deliberately small so that wiring is a one-line change.

import { ForbiddenError } from "@/lib/errors";

export type Role = "admin" | "user";

export interface ActorContext {
  userId: string;
  role: Role;
}

export type Permission =
  | "contact:create"
  | "contact:update"
  | "contact:archive"
  | "contact:restore"
  | "contact:read"
  | "product:create"
  | "product:update"
  | "product:archive"
  | "product:restore"
  | "product:read"
  | "invoice:create"
  | "invoice:update"
  | "invoice:finalize"
  | "invoice:void"
  | "invoice:read"
  | "invoice_template:manage"
  | "invoice_template:read";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "contact:create",
    "contact:update",
    "contact:archive",
    "contact:restore",
    "contact:read",
    "product:create",
    "product:update",
    "product:archive",
    "product:restore",
    "product:read",
    "invoice:create",
    "invoice:update",
    "invoice:finalize",
    "invoice:void",
    "invoice:read",
    "invoice_template:manage",
    "invoice_template:read",
  ],
  user: [
    "contact:create",
    "contact:update",
    "contact:read",
    "product:read",
    "invoice:create",
    "invoice:update",
    "invoice:read",
    "invoice_template:read",
  ],
  // ACCOUNTING owns catalog/pricing in this model — adjust if your org draws
  // the line differently (e.g. a separate CATALOG role).
  // ACCOUNTING: [
  //   "contact:read",
  //   "product:create",
  //   "product:update",
  //   "product:archive",
  //   "product:restore",
  //   "product:read",
  //   "invoice:create",
  //   "invoice:update",
  //   "invoice:finalize",
  //   "invoice:void",
  //   "invoice:read",
  //   "invoice_template:manage",
  //   "invoice_template:read",
  // ],
};

export function can(actor: ActorContext, permission: Permission): boolean {
  return ROLE_PERMISSIONS[actor.role]?.includes(permission) ?? false;
}

export function assertCan(actor: ActorContext, permission: Permission): void {
  if (!can(actor, permission)) {
    throw new ForbiddenError(`Role "${actor.role}" cannot perform "${permission}"`);
  }
}