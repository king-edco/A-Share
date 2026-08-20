import type { AdminInfo } from "./auth-context";

export type RoleKind = "super_admin" | "content_manager" | "contributor";

/** Derive the effective role from the admin's role assignments. */
export function roleKind(admin: AdminInfo | null): RoleKind | null {
  if (!admin) return null;
  const codes = admin.roles.map((r) => r.code);
  if (codes.includes("super_admin")) return "super_admin";
  if (codes.includes("content_manager")) return "content_manager";
  if (codes.includes("contributor")) return "contributor";
  return null;
}

export function isSuperAdmin(admin: AdminInfo | null): boolean {
  return roleKind(admin) === "super_admin";
}

export function isContributor(admin: AdminInfo | null): boolean {
  return roleKind(admin) === "contributor";
}
