import { Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "../features/admin/AdminLayout";
import ChaptersPage from "../features/admin/chapters/ChaptersPage";
import DashboardPage from "../features/admin/DashboardPage";
import ExamsPage from "../features/admin/exams/ExamsPage";
import SeriesPage from "../features/admin/series/SeriesPage";
import SubjectsPage from "../features/admin/subjects/SubjectsPage";
import LoginPage from "../features/auth/LoginPage";
import { RequireAuth } from "./RequireAuth";

/** Route tree; mounted inside a router context by App (or tests). */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
        <Route path="exams" element={<ExamsPage />} />
        <Route path="series" element={<SeriesPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="chapters" element={<ChaptersPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
