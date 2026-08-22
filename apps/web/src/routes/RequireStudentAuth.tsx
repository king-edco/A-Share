import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useStudentAuth } from "../features/student/auth/student-auth";

/**
 * Route guard for the student app shell. While the silent refresh is in
 * flight it shows a loading spinner; only a definitively unauthenticated
 * visitor is sent to /onboarding.
 */
export function RequireStudentAuth({ children }: { children: ReactNode }) {
  const { status } = useStudentAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          role="status"
          aria-label="Chargement de la session"
          className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"
        />
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
