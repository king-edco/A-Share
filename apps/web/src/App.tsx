import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "./lib/query-client";
import { applyTheme, getInitialTheme } from "./lib/theme";
import { AuthProvider } from "./features/auth/AuthProvider";
import AppRoutes from "./routes/AppRoutes";

// Apply the persisted/OS theme before first paint to avoid a flash.
applyTheme(getInitialTheme());

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary fallback={<Navigate to="/onboarding" replace />}>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
