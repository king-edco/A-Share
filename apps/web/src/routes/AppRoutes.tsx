import { Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "../features/admin/AdminLayout";
import ComingSoonPage from "../features/admin/ComingSoonPage";
import DashboardPage from "../features/admin/DashboardPage";
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
        <Route
          path="exams"
          element={
            <ComingSoonPage
              title="Exam management"
              description="Create and edit exams (Bac, Probatoire, GCE, TVE) here once this screen ships."
            />
          }
        />
        <Route
          path="series"
          element={
            <ComingSoonPage
              title="Series management"
              description="Build the filière tree per exam here once this screen ships."
            />
          }
        />
        <Route
          path="subjects"
          element={
            <ComingSoonPage
              title="Subject management"
              description="Maintain exam subjects and attach them to series pools here once this screen ships."
            />
          }
        />
        <Route
          path="chapters"
          element={
            <ComingSoonPage
              title="Chapter management"
              description="Edit the syllabus chapter tree per subject here once this screen ships."
            />
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
