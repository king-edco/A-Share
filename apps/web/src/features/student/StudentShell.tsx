import { NavLink, Outlet } from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  LineChart,
  User,
} from "lucide-react";

import { useStudentAuth } from "./auth/student-auth";

const TABS = [
  { to: "/", label: "Accueil", icon: LayoutDashboard },
  { to: "/subjects", label: "Matières", icon: BookOpen },
  { to: "/progress", label: "Progression", icon: LineChart },
  { to: "/profile", label: "Profil", icon: User },
] as const;

/** The student four-tab app shell with the route guard. */
export default function StudentShell() {
  const { student } = useStudentAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      <header className="border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15">
            <span className="text-sm font-bold text-sky-500">A</span>
          </div>
          <p className="text-sm font-semibold">
            Bonjour {student?.full_name.split(" ")[0] ?? "étudiant"} 👋
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-medium transition ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
