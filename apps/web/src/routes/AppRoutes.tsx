import { Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "../features/admin/AdminLayout";
import AdminAccountsPage from "../features/admin/accounts/AdminAccountsPage";
import ChaptersPage from "../features/admin/chapters/ChaptersPage";
import DashboardPage from "../features/admin/DashboardPage";
import ExamsPage from "../features/admin/exams/ExamsPage";
import SeriesPage from "../features/admin/series/SeriesPage";
import SubjectsPage from "../features/admin/subjects/SubjectsPage";
import LoginPage from "../features/auth/LoginPage";
import { RequireAuth } from "./RequireAuth";
import OnboardingWizard from "../features/student/onboarding/OnboardingWizard";
import StudentShell from "../features/student/StudentShell";
import { StudentAuthProvider } from "../features/student/auth/StudentAuthProvider";
import { RequireStudentAuth } from "./RequireStudentAuth";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Contenu disponible prochainement.
      </p>
    </div>
  );
}

/** Route tree; mounted inside a router context by App (or tests). */
export default function AppRoutes() {
  return (
    <StudentAuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="series" element={<SeriesPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="chapters" element={<ChaptersPage />} />
      </Route>

      <Route
        path="/"
        element={
          <RequireStudentAuth>
            <StudentShell />
          </RequireStudentAuth>
        }
      >
        <Route index element={<PlaceholderPage title="Accueil" />} />
        <Route path="subjects" element={<PlaceholderPage title="Matières" />} />
        <Route path="progress" element={<PlaceholderPage title="Progression" />} />
        <Route path="profile" element={<PlaceholderPage title="Profil" />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StudentAuthProvider>
  );
}
