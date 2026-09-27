/*
 * Roles stored in profiles.role:
 *   user       — regular member.
 *   moderator  — uses the admin area like an admin (create and
 *                edit content, moderation) but cannot delete
 *                anything or open the admin-only pages below.
 *   admin      — everything.
 * The database enforces the same rules (database/062_moderator_role.sql).
 */

export type Role = "user" | "moderator" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  user: "User",
  moderator: "Moderator",
  admin: "Admin",
};

// Pages under /admin that only admins may open. (Deduplicate is
// all about deleting prompts.)
export const ADMIN_ONLY_PATHS = [
  "/admin/settings",
  "/admin/prompts/deduplicate",
  "/admin/top-ten",
  "/admin/users",
  "/admin/audit-log",
];

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

// Whether this role may open the given /admin page.
export function canOpenAdminPath(
  role: string | null | undefined,
  pathname: string
): boolean {
  if (isAdminRole(role)) return true;
  return isStaffRole(role) && !isAdminOnlyPath(pathname);
}
