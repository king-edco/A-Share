/** Queries and mutations for admin account management and invitations. */

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useOptimisticListMutation } from "@/lib/optimistic";

export interface AdminRoleAssignment {
  role_code: string;
  system_scope: string;
}

export interface AdminSubjectGrantRead {
  subject_id: string;
  subject_name: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  is_active: boolean;
  roles: AdminRoleAssignment[];
  subject_grants: AdminSubjectGrantRead[];
}

export interface Invitation {
  id: string;
  email: string;
  role_code: string;
  system_scope: string | null;
  subject_ids: string[] | null;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitationCreatedResponse {
  invitation: Invitation;
  raw_token: string;
  invite_url: string;
}

export interface PublicInvitation {
  email: string;
  role_code: string;
}

export const accountKeys = {
  admins: () => ["admin", "accounts"] as const,
  invitations: () => ["admin", "invitations"] as const,
};

export function useAdminsQuery() {
  return useQuery({
    queryKey: accountKeys.admins(),
    queryFn: () => apiFetch<AdminAccount[]>("/api/v1/admin/admins"),
  });
}

export function useInvitationsQuery() {
  return useQuery({
    queryKey: accountKeys.invitations(),
    queryFn: () => apiFetch<Invitation[]>("/api/v1/admin/invitations"),
  });
}

export function useToggleAdmin() {
  return useOptimisticListMutation<
    AdminAccount,
    AdminAccount,
    { id: string; is_active: boolean }
  >({
    queryKey: accountKeys.admins(),
    mutationFn: ({ id, is_active }) =>
      apiFetch<AdminAccount>(`/api/v1/admin/admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    optimisticApply: (prev, { id, is_active }) =>
      prev.map((a) => (a.id === id ? { ...a, is_active } : a)),
    successMessage: "Admin updated",
    errorMessage: () => "Could not update the admin account.",
  });
}

export interface CreateInvitationVars {
  email: string;
  role_code: "super_admin" | "content_manager" | "contributor";
  system_scope?: string | null;
  subject_ids?: string[] | null;
}

export function useCreateInvitation() {
  return useOptimisticListMutation<
    InvitationCreatedResponse,
    Invitation,
    CreateInvitationVars
  >({
    queryKey: accountKeys.invitations(),
    mutationFn: (vars) =>
      apiFetch<InvitationCreatedResponse>("/api/v1/admin/invitations", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    optimisticApply: (prev, vars) => [
      {
        id: `temp-${vars.email}`,
        email: vars.email,
        role_code: vars.role_code,
        system_scope: vars.system_scope ?? null,
        subject_ids: vars.subject_ids ?? null,
        status: "pending" as const,
        expires_at: "",
        accepted_at: null,
        created_at: "",
      },
      ...prev,
    ],
    successMessage: "Invitation created",
    errorMessage: () => "Could not create the invitation.",
  });
}
