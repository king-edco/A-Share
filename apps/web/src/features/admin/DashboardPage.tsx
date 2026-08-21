import { roleKind } from "../auth/roles";
import { useAuth } from "../auth/auth-context";
import { ContributorDashboard } from "./ContributorDashboard";
import { FullAdminDashboard } from "./FullAdminDashboard";

/** Routes the dashboard to the correct role-specific rendering. */
export default function DashboardPage() {
  const { admin } = useAuth();
  const kind = roleKind(admin);

  if (kind === "contributor") {
    return <ContributorDashboard />;
  }
  return <FullAdminDashboard />;
}
