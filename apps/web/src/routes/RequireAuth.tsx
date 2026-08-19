import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../features/auth/auth-context";

/**
 * Route guard for the /admin/* tree.
 *
 * While the silent refresh-on-load is in flight (status "loading") a
 * full-page spinner is shown instead of flashing the login page. Only a
 * definitively unauthenticated visitor is redirected to /login.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div
          role="status"
          aria-label="Loading session"
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400"
        />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
