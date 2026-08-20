/** Auth session types, the context object, and the consumer hook. */

import { createContext, useContext } from "react";

export interface AdminRoleInfo {
  code: string;
  label: string;
  system_scope: string;
}

export interface AdminSubjectGrant {
  subject_id: string;
  subject_name: string;
  exam_code: string;
}

export interface AdminInfo {
  id: string;
  email: string;
  roles: AdminRoleInfo[];
  subject_grants: AdminSubjectGrant[];
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  admin: AdminInfo | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
