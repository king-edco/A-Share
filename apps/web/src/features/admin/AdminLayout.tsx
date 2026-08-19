import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";

/**
 * Protected shell for the admin area: sidebar navigation, top bar with the
 * current admin's identity (email + role/scope badges) and logout, and the
 * routed page body. Exam/Series/Subject/Chapter items are visible but
 * disabled placeholders until those management screens land.
 */

const PLACEHOLDER_ITEMS = [
  { to: "/admin/exams", label: "Exams" },
  { to: "/admin/series", label: "Series" },
  { to: "/admin/subjects", label: "Subjects" },
  { to: "/admin/chapters", label: "Chapters" },
] as const;

function BackendStatus() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiUrl: string = import.meta.env.VITE_API_URL ?? "";
    fetch(`${apiUrl}/health`)
      .then(async (res) => {
        if (cancelled) return;
        const body: unknown = await res.json().catch(() => null);
        setOk(
          res.ok &&
            typeof body === "object" &&
            body !== null &&
            (body as { status?: unknown }).status === "ok",
        );
      })
      .catch(() => {
        if (!cancelled) setOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (ok === null) return null;
  return (
    <span
      title={ok ? "Backend: ok" : "Backend: unreachable"}
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
        ok
          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
          : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`}
      />
      {ok ? "API" : "API down"}
    </span>
  );
}

function RoleBadge({ code, scope }: { code: string; scope: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700">
      {code}
      <span className="rounded-full bg-sky-500/15 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
        {scope}
      </span>
    </span>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    // logout() already navigates; this is a defensive fallback.
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-slate-950 text-slate-300">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/30">
            <span className="text-base font-bold text-sky-400">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">A-Share</p>
            <p className="text-xs text-slate-500">Admin console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin sections">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`
            }
          >
            Dashboard
          </NavLink>

          {PLACEHOLDER_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-800/60 text-slate-200"
                    : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
                }`
              }
            >
              <span className="opacity-60">{item.label}</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400 ring-1 ring-amber-500/30">
                Soon
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-600">
          Exam-prep platform · Cameroon
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
          <BackendStatus />
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              {admin?.roles.map((role) => (
                <RoleBadge
                  key={role.code}
                  code={role.code}
                  scope={role.system_scope}
                />
              ))}
            </div>
            <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {admin?.email.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700">
                {admin?.email}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
